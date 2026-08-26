import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { initialProjectData, defaultProjectsMap } from './src/data/initialData.js';
import { ProjectData } from './src/types.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://icvuibdumunumdztxbbq.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_Q95HY1AG_Xo4T5HU7M0UKA_oMnitXJy';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const currentFilename = typeof __filename !== 'undefined'
  ? __filename
  : (typeof import.meta !== 'undefined' && import.meta.url ? fileURLToPath(import.meta.url) : '');
const currentDirname = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(currentFilename || process.cwd());

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const STORE_PATH = path.join(process.cwd(), 'projects_store.json');

function loadProjectsFromDisk(): Record<string, ProjectData> {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Disk Store] Failed to load projects from disk:', e);
  }
  return {};
}

let diskSaveDebounceTimer: NodeJS.Timeout | null = null;

function saveProjectsToDisk(projects: Record<string, ProjectData>) {
  if (diskSaveDebounceTimer) {
    clearTimeout(diskSaveDebounceTimer);
  }
  diskSaveDebounceTimer = setTimeout(() => {
    try {
      fs.writeFile(STORE_PATH, JSON.stringify(projects), 'utf-8', (err) => {
        if (err) console.warn('[Disk Store] Async save warning:', err);
      });
    } catch (e) {
      console.warn('[Disk Store] Failed to save projects:', e);
    }
  }, 1000);
}

const diskProjects = loadProjectsFromDisk();
let allProjectsMap: Record<string, ProjectData> = { ...defaultProjectsMap, ...diskProjects };
let activeProjectId: string = Object.keys(allProjectsMap)[0] || 'proj-1';
let isSupabaseConnected = false;
let lastLocalStateHash = '';
let lastSupabaseErrorLogged = '';
let isSyncInProgress = false;
let syncDebounceTimer: NodeJS.Timeout | null = null;

// Helper to compute quick hash of current in-memory data state
function getProjectsStateHash(): string {
  try {
    return JSON.stringify(allProjectsMap);
  } catch {
    return '';
  }
}

// Async initial hydration and continuous sync from Supabase
async function initSupabaseHydration(shouldBroadcast: boolean = false) {
  if (isSyncInProgress) return;
  isSyncInProgress = true;
  try {
    const { data, error } = await supabase.from('app_projects').select('*');
    if (!error && data && data.length > 0) {
      isSupabaseConnected = true;
      lastSupabaseErrorLogged = '';
      const loadedMap: Record<string, ProjectData> = {};
      data.forEach((row: any) => {
        if (row.id && row.data) {
          loadedMap[row.id] = row.data;
        }
      });

      if (Object.keys(loadedMap).length > 0) {
        // Preserve any in-memory/disk created projects so they are never lost if Supabase is missing them
        allProjectsMap = { ...defaultProjectsMap, ...loadedMap, ...allProjectsMap };
        saveProjectsToDisk(allProjectsMap);

        const newHash = JSON.stringify(allProjectsMap);
        if (newHash !== lastLocalStateHash) {
          lastLocalStateHash = newHash;
          if (!allProjectsMap[activeProjectId]) {
            activeProjectId = Object.keys(allProjectsMap)[0];
          }
          console.log(`[Supabase Auto-Sync] Hydrated & merged ${data.length} project(s) from Supabase database.`);
          if (shouldBroadcast) {
            broadcastDataChange(undefined, false);
          }
        }
      }
    } else if (!error) {
      isSupabaseConnected = true;
      lastSupabaseErrorLogged = '';
    } else if (error) {
      isSupabaseConnected = false;
      if (lastSupabaseErrorLogged !== error.message) {
        lastSupabaseErrorLogged = error.message;
        console.info(`[Supabase Notice] Local disk persistence active. Remote sync notice: ${error.message}`);
      }
    }
  } catch (err: any) {
    isSupabaseConnected = false;
    const msg = err.message || String(err);
    if (lastSupabaseErrorLogged !== msg) {
      lastSupabaseErrorLogged = msg;
      console.info(`[Supabase Notice] Local disk persistence active. Remote connection notice: ${msg}`);
    }
  } finally {
    isSyncInProgress = false;
  }
}

// Initial hydration on server start
initSupabaseHydration(false);

// Background reconciliation heartbeat (every 30 seconds, non-blocking) to keep Live and Dev containers synchronized
setInterval(() => {
  initSupabaseHydration(true).catch(() => {});
}, 30000);

// Supabase Real-Time Listener
try {
  supabase
    .channel('public:app_projects')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_projects' },
      (payload) => {
        if (payload.new && (payload.new as any).id && (payload.new as any).data) {
          const row = payload.new as any;
          allProjectsMap[row.id] = row.data;
          lastLocalStateHash = getProjectsStateHash();
          console.log(`[Supabase Realtime] Received live update for project ${row.id}`);
          broadcastDataChange(undefined, false);
        }
      }
    )
    .subscribe();
} catch (_err) {
  // Silent fallback
}

// Background sync to Supabase with debounce to batch high-frequency edits
async function syncToSupabase() {
  try {
    const rows = Object.values(allProjectsMap).map(p => ({
      id: p.id || 'proj-1',
      data: p,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('app_projects').upsert(rows, { onConflict: 'id' });
    if (!error) {
      isSupabaseConnected = true;
      lastSupabaseErrorLogged = '';
      lastLocalStateHash = getProjectsStateHash();
    } else {
      if (lastSupabaseErrorLogged !== error.message) {
        lastSupabaseErrorLogged = error.message;
        console.info('[Supabase Upsert Notice]', error.message);
      }
    }
  } catch (err: any) {
    const msg = err.message || String(err);
    if (lastSupabaseErrorLogged !== msg) {
      lastSupabaseErrorLogged = msg;
      console.info('[Supabase Upsert Notice]', msg);
    }
  }
}

function debouncedSyncToSupabase(delayMs: number = 600) {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }
  syncDebounceTimer = setTimeout(() => {
    syncToSupabase().catch(err => console.warn('[Supabase] Sync notice:', err));
  }, delayMs);
}

// Helper to get active project data
function getActiveProject(): ProjectData {
  if (!allProjectsMap[activeProjectId]) {
    activeProjectId = Object.keys(allProjectsMap)[0] || "proj-1";
    if (!allProjectsMap[activeProjectId]) {
      allProjectsMap["proj-1"] = { ...initialProjectData, id: "proj-1" };
    }
  }
  return allProjectsMap[activeProjectId];
}

// Helper to broadcast state changes to all connected clients and save to Supabase
function broadcastDataChange(senderWs?: WebSocket, syncToRemote: boolean = true, senderClientId?: string) {
  saveProjectsToDisk(allProjectsMap);
  if (syncToRemote) {
    debouncedSyncToSupabase(600);
  }
  const currentData = getActiveProject();
  const projectsList = Object.values(allProjectsMap).map(p => ({
    id: p.id || 'proj-1',
    projectName: p.projectName,
    projectCode: p.projectCode,
    description: p.description,
    budget: p.budget,
    startDate: p.startDate,
    targetEndDate: p.targetEndDate,
    taskCount: p.tasks.length
  }));

  const payload = JSON.stringify({
    type: 'DATA_UPDATED',
    activeProjectId,
    projects: projectsList,
    data: currentData,
    senderClientId,
    timestamp: new Date().toISOString()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== senderWs) {
      client.send(payload);
    }
  });
}

// WebSocket Connection Handler
wss.on('connection', (ws) => {
  const currentData = getActiveProject();
  const projectsList = Object.values(allProjectsMap).map(p => ({
    id: p.id || 'proj-1',
    projectName: p.projectName,
    projectCode: p.projectCode,
    description: p.description,
    budget: p.budget,
    startDate: p.startDate,
    targetEndDate: p.targetEndDate,
    taskCount: p.tasks.length
  }));

  ws.send(JSON.stringify({
    type: 'INIT_STATE',
    activeProjectId,
    projects: projectsList,
    data: currentData,
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.type === 'SYNC_STATE' && parsed.data) {
        if (parsed.data.id) {
          allProjectsMap[parsed.data.id] = parsed.data;
        } else {
          allProjectsMap[activeProjectId] = parsed.data;
        }
        broadcastDataChange(ws, true, parsed.senderClientId);
      }
    } catch (err) {
      console.error('Error handling WS message:', err);
    }
  });
});

// Supabase Status & Database Health Endpoints
app.get('/api/supabase/status', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('app_projects').select('id, updated_at').limit(50);
    const tableExists = !error;
    const projectCount = data ? data.length : 0;

    res.json({
      success: true,
      connected: !error || error.code !== 'PGRST301',
      url: SUPABASE_URL,
      tableExists,
      projectCount,
      activeProjectsInMemory: Object.keys(allProjectsMap).length,
      errorMessage: error ? error.message : null,
      errorCode: error ? error.code : null,
      sqlScript: `-- 1. Create table for shared project data
CREATE TABLE IF NOT EXISTS public.app_projects (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Grant privileges for anon and authenticated users
GRANT ALL ON TABLE public.app_projects TO anon, authenticated, service_role;

-- 3. Configure Row Level Security (RLS) policies for full access
ALTER TABLE public.app_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public full access" ON public.app_projects;
CREATE POLICY "Allow public full access" ON public.app_projects FOR ALL USING (true) WITH CHECK (true);

-- 4. Enable Supabase Realtime for instant Live & Dev multi-environment sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_projects;`
    });
  } catch (err: any) {
    res.json({
      success: false,
      connected: false,
      url: SUPABASE_URL,
      tableExists: false,
      errorMessage: err.message || 'Supabase host unreachable',
      sqlScript: `-- 1. Create table for shared project data
CREATE TABLE IF NOT EXISTS public.app_projects (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Grant privileges for anon and authenticated users
GRANT ALL ON TABLE public.app_projects TO anon, authenticated, service_role;

-- 3. Configure Row Level Security (RLS) policies for full access
ALTER TABLE public.app_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public full access" ON public.app_projects;
CREATE POLICY "Allow public full access" ON public.app_projects FOR ALL USING (true) WITH CHECK (true);

-- 4. Enable Supabase Realtime for instant Live & Dev multi-environment sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_projects;`
    });
  }
});

app.post('/api/supabase/sync-push', async (_req, res) => {
  try {
    await syncToSupabase();
    res.json({ success: true, message: 'Local project data pushed to Supabase app_projects table successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Push to Supabase failed' });
  }
});

app.post('/api/supabase/sync-pull', async (_req, res) => {
  try {
    await initSupabaseHydration();
    broadcastDataChange();
    res.json({ success: true, message: 'Pulled latest state from Supabase database.', activeProjectId, data: getActiveProject() });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Pull from Supabase failed' });
  }
});

// REST Endpoints
app.get('/api/projects', (_req, res) => {
  const projectsList = Object.values(allProjectsMap).map(p => ({
    id: p.id || 'proj-1',
    projectName: p.projectName,
    projectCode: p.projectCode,
    description: p.description,
    budget: p.budget,
    startDate: p.startDate,
    targetEndDate: p.targetEndDate,
    taskCount: p.tasks.length
  }));
  res.json({ success: true, activeProjectId, projects: projectsList });
});

// All Projects Full Data (for Admin / Executive Portfolio)
app.get('/api/projects/all', (_req, res) => {
  res.json({
    success: true,
    activeProjectId,
    projects: Object.values(allProjectsMap),
    projectsMap: allProjectsMap
  });
});

app.post('/api/projects/switch', (req, res) => {
  const { projectId } = req.body;
  if (!projectId) {
    return res.status(400).json({ error: 'Missing projectId' });
  }

  let project = allProjectsMap[projectId];
  if (!project && defaultProjectsMap[projectId]) {
    project = defaultProjectsMap[projectId];
    allProjectsMap[projectId] = project;
  }

  if (project) {
    activeProjectId = projectId;
    broadcastDataChange();
    res.json({ success: true, activeProjectId, data: project });
  } else {
    res.status(404).json({ error: 'Project not found' });
  }
});

app.get('/api/project', (_req, res) => {
  res.json({ success: true, activeProjectId, data: getActiveProject() });
});

app.post('/api/project', (req, res) => {
  if (req.body.data) {
    const projId = req.body.data.id || activeProjectId;
    allProjectsMap[projId] = { ...req.body.data, id: projId };
    broadcastDataChange(undefined, true, req.body.senderClientId);
    res.json({ success: true, data: allProjectsMap[projId] });
  } else {
    res.status(400).json({ error: 'Missing data payload' });
  }
});

// Create new project
app.post('/api/projects/create', (req, res) => {
  const newProj: ProjectData = req.body;
  if (!newProj.id) {
    newProj.id = 'proj-' + Date.now();
  }
  allProjectsMap[newProj.id] = newProj;
  activeProjectId = newProj.id;
  broadcastDataChange(undefined, true, req.body?.senderClientId);
  res.json({ success: true, activeProjectId, data: newProj });
});

// Delete project
app.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  if (Object.keys(allProjectsMap).length <= 1) {
    return res.status(400).json({ error: 'Cannot delete the only remaining project' });
  }
  delete allProjectsMap[id];
  if (activeProjectId === id) {
    activeProjectId = Object.keys(allProjectsMap)[0];
  }
  Promise.resolve(supabase.from('app_projects').delete().eq('id', id)).catch(() => {});
  broadcastDataChange();
  res.json({ success: true, activeProjectId, data: getActiveProject() });
});

// Reset project to default
app.post('/api/reset', (_req, res) => {
  allProjectsMap = JSON.parse(JSON.stringify(defaultProjectsMap));
  activeProjectId = "proj-1";
  broadcastDataChange();
  res.json({ success: true, activeProjectId, data: getActiveProject() });
});

// Tasks Endpoints
app.post('/api/tasks', (req, res) => {
  const currentProjectData = getActiveProject();
  const task = req.body;
  if (!task.id) {
    task.id = 'task-' + Date.now();
  }
  const existingIdx = currentProjectData.tasks.findIndex(t => t.id === task.id);
  if (existingIdx >= 0) {
    currentProjectData.tasks[existingIdx] = task;
  } else {
    currentProjectData.tasks.push(task);
  }

  // Add activity log
  currentProjectData.activities.unshift({
    id: 'act-' + Date.now(),
    timestamp: new Date().toISOString(),
    user: req.body.updatedBy || 'Current User',
    action: existingIdx >= 0 ? 'Updated Task' : 'Created Task',
    details: `${task.title} (${task.status.toUpperCase()})`
  });

  broadcastDataChange(undefined, true, req.body?.senderClientId);
  res.json({ success: true, task });
});

app.delete('/api/tasks/:id', (req, res) => {
  const currentProjectData = getActiveProject();
  const { id } = req.params;
  const task = currentProjectData.tasks.find(t => t.id === id);
  currentProjectData.tasks = currentProjectData.tasks.filter(t => t.id !== id);
  currentProjectData.subtasks = currentProjectData.subtasks.filter(st => st.taskId !== id);

  if (task) {
    currentProjectData.activities.unshift({
      id: 'act-' + Date.now(),
      timestamp: new Date().toISOString(),
      user: 'Current User',
      action: 'Deleted Task',
      details: task.title
    });
  }

  broadcastDataChange(undefined, true, (req.query?.senderClientId as string) || (req.body?.senderClientId as string));
  res.json({ success: true, deletedId: id });
});

// RAID Endpoints
app.post('/api/raid', (req, res) => {
  const currentProjectData = getActiveProject();
  const raidItem = req.body;
  if (!raidItem.id) {
    raidItem.id = 'raid-' + Date.now();
  }
  const existingIdx = currentProjectData.raidItems.findIndex(r => r.id === raidItem.id);
  if (existingIdx >= 0) {
    currentProjectData.raidItems[existingIdx] = raidItem;
  } else {
    currentProjectData.raidItems.push(raidItem);
  }

  currentProjectData.activities.unshift({
    id: 'act-' + Date.now(),
    timestamp: new Date().toISOString(),
    user: 'Current User',
    action: existingIdx >= 0 ? 'Updated RAID Item' : 'Logged RAID Item',
    details: `[${raidItem.type.toUpperCase()}] ${raidItem.title}`
  });

  broadcastDataChange(undefined, true, req.body?.senderClientId);
  res.json({ success: true, raidItem });
});

app.delete('/api/raid/:id', (req, res) => {
  const currentProjectData = getActiveProject();
  const { id } = req.params;
  const item = currentProjectData.raidItems.find(r => r.id === id);
  currentProjectData.raidItems = currentProjectData.raidItems.filter(r => r.id !== id);

  if (item) {
    currentProjectData.activities.unshift({
      id: 'act-' + Date.now(),
      timestamp: new Date().toISOString(),
      user: 'Current User',
      action: 'Deleted RAID Item',
      details: item.title
    });
  }

  broadcastDataChange(undefined, true, (req.query?.senderClientId as string) || (req.body?.senderClientId as string));
  res.json({ success: true, deletedId: id });
});

// Stakeholders Endpoints
app.post('/api/stakeholders', (req, res) => {
  const currentProjectData = getActiveProject();
  const stakeholder = req.body;
  if (!stakeholder.id) {
    stakeholder.id = 'sh-' + Date.now();
  }
  const existingIdx = currentProjectData.stakeholders.findIndex(s => s.id === stakeholder.id);
  if (existingIdx >= 0) {
    currentProjectData.stakeholders[existingIdx] = stakeholder;
  } else {
    currentProjectData.stakeholders.push(stakeholder);
  }

  currentProjectData.activities.unshift({
    id: 'act-' + Date.now(),
    timestamp: new Date().toISOString(),
    user: 'Current User',
    action: existingIdx >= 0 ? 'Updated Stakeholder' : 'Added Stakeholder',
    details: `${stakeholder.name} (${stakeholder.role})`
  });

  broadcastDataChange(undefined, true, req.body?.senderClientId);
  res.json({ success: true, stakeholder });
});

// Helper for AI execution (supports custom API keys & default Gemini)
interface CustomAiConfigPayload {
  enabled?: boolean;
  provider?: 'gemini' | 'openai' | 'anthropic' | 'groq' | 'deepseek' | 'custom';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

async function executeAiCall(
  prompt: string,
  customConfig?: CustomAiConfigPayload,
  systemInstruction?: string
): Promise<string> {
  const isCustom = customConfig && customConfig.enabled && customConfig.apiKey && customConfig.apiKey.trim() !== '';

  if (isCustom) {
    const provider = customConfig.provider || 'gemini';
    const apiKey = customConfig.apiKey!.trim();

    if (provider === 'gemini') {
      const modelName = customConfig.model?.trim() || 'gemini-3.6-flash';
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined
      });
      return response.text || '';
    }

    if (provider === 'openai' || provider === 'deepseek' || provider === 'groq' || provider === 'custom') {
      let baseUrl = customConfig.baseUrl?.trim() || 'https://api.openai.com/v1';
      if (provider === 'deepseek' && (!customConfig.baseUrl || !customConfig.baseUrl.trim())) {
        baseUrl = 'https://api.deepseek.com';
      }
      if (provider === 'groq' && (!customConfig.baseUrl || !customConfig.baseUrl.trim())) {
        baseUrl = 'https://api.groq.com/openai/v1';
      }

      baseUrl = baseUrl.replace(/\/$/, '');

      let modelName = customConfig.model?.trim();
      if (!modelName) {
        if (provider === 'openai') modelName = 'gpt-4o-mini';
        else if (provider === 'deepseek') modelName = 'deepseek-chat';
        else if (provider === 'groq') modelName = 'llama-3.3-70b-versatile';
        else modelName = 'gpt-3.5-turbo';
      }

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorMsg = `HTTP ${res.status}`;
        try {
          const errObj = JSON.parse(errorText);
          errorMsg = errObj.error?.message || errObj.message || errorMsg;
        } catch {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(`[${provider.toUpperCase()} API Error] ${errorMsg}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    }

    if (provider === 'anthropic') {
      const modelName = customConfig.model?.trim() || 'claude-3-5-sonnet-20241022';
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: 2048,
          system: systemInstruction || undefined,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorMsg = `HTTP ${res.status}`;
        try {
          const errObj = JSON.parse(errorText);
          errorMsg = errObj.error?.message || errObj.message || errorMsg;
        } catch {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(`[Anthropic API Error] ${errorMsg}`);
      }

      const data = await res.json();
      return data.content?.[0]?.text || '';
    }
  }

  // Fallback to server GEMINI_API_KEY
  const defaultApiKey = process.env.GEMINI_API_KEY;
  if (!defaultApiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured on server and no custom AI key was provided.');
  }

  const ai = new GoogleGenAI({
    apiKey: defaultApiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents: prompt,
    config: systemInstruction ? { systemInstruction } : undefined
  });

  return response.text || '';
}

// AI Assistant Endpoints
app.post('/api/ai/test-connection', async (req, res) => {
  try {
    const { customConfig } = req.body;
    const testPrompt = "Respond with 'API Key Connection Success' if you receive this message.";
    const responseText = await executeAiCall(testPrompt, customConfig);
    res.json({ success: true, message: responseText });
  } catch (error: any) {
    console.error('Error testing AI connection:', error);
    res.status(400).json({ error: error.message || 'Failed to connect to AI provider.' });
  }
});

app.post('/api/ai/generate', async (req, res) => {
  try {
    const { prompt, customAiConfig, systemInstruction } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }
    const resultText = await executeAiCall(prompt, customAiConfig, systemInstruction);
    res.json({ success: true, response: resultText });
  } catch (error: any) {
    console.error('Error in general AI generation:', error);
    res.status(500).json({ error: error.message || 'Failed to generate AI response' });
  }
});

app.post('/api/ai/report', async (req, res) => {
  try {
    const { metrics, project, customAiConfig, selectedSprintNames, sprintData, predictiveData } = req.body;

    const sprintContextText = selectedSprintNames && selectedSprintNames.length > 0
      ? `\nSprint Scope Filter Applied: ${selectedSprintNames.join(', ')}\nSprint Specific Highlights:\n${sprintData ? JSON.stringify(sprintData, null, 2) : 'Active Sprint Tasks filtered'}\n`
      : '\nSprint Scope: Entire Project (All Sprints)\n';

    // Format comprehensive RAID items breakdown for predictive trend detection
    const allRaidItems = project?.raidItems || [];
    const risks = allRaidItems.filter((r: any) => r.type === 'risk');
    const issues = allRaidItems.filter((r: any) => r.type === 'issue');
    const assumptions = allRaidItems.filter((r: any) => r.type === 'assumption');
    const dependencies = allRaidItems.filter((r: any) => r.type === 'dependency');

    const raidBreakdownText = `
RAID Log Inventory (${allRaidItems.length} Total Items):
- Risks (${risks.length}): ${risks.map((r: any) => `"${r.title}" (Prob: ${r.probability || 'Med'}, Impact: ${r.impact || r.severity || 'Med'}, Status: ${r.status})`).join('; ') || 'None'}
- Issues (${issues.length} active): ${issues.map((i: any) => `"${i.title}" (Severity: ${i.severity || i.impact || 'High'}, Status: ${i.status})`).join('; ') || 'None'}
- Dependencies (${dependencies.length}): ${dependencies.map((d: any) => `"${d.title}" (Status: ${d.status}, Impact: ${d.impact || d.severity || 'High'})`).join('; ') || 'None'}
- Assumptions (${assumptions.length}): ${assumptions.map((a: any) => `"${a.title}" (Status: ${a.status})`).join('; ') || 'None'}
`;

    const predictiveContext = predictiveData
      ? `\nPre-calculated Predictive Exposure: Score ${predictiveData.exposureScore}/100, Threat Level: ${predictiveData.threatLevel}, Direction: ${predictiveData.trendDirection}.\nPredicted Blockers Identified: ${predictiveData.blockerCount}\n`
      : '';

    const prompt = `
You are an expert Chief Project Officer and EVM Risk Analytics Advisor.
Analyze the following live project execution data and generate an executive status brief featuring an advanced PREDICTIVE RISK & BLOCKER FORECAST.

Project Name: ${project?.projectName || 'Cloud Portal'}
Budget: $${project?.budget?.toLocaleString() || '250,000'}
${sprintContextText}
EVM Performance Indices:
- Schedule Performance Index (SPI): ${metrics?.spi} (${metrics?.spi >= 1 ? 'On/Ahead of Schedule' : 'Behind Schedule'})
- Cost Performance Index (CPI): ${metrics?.cpi} (${metrics?.cpi >= 1 ? 'On/Under Budget' : 'Over Budget'})
- Planned Value (PV): $${metrics?.plannedValue?.toLocaleString()}
- Earned Value (EV): $${metrics?.earnedValue?.toLocaleString()}
- Actual Cost (AC): $${metrics?.actualCost?.toLocaleString()}
- Estimate at Completion (EAC): $${metrics?.eac?.toLocaleString()}
- Schedule Variance (SV): $${metrics?.scheduleVariance?.toLocaleString()}
- Cost Variance (CV): $${metrics?.costVariance?.toLocaleString()}

Active Tasks Count: ${project?.tasks?.length || 0}
${raidBreakdownText}
${predictiveContext}

Please format the response in clean, executive-ready Markdown with the following specific sections:
# Executive Project Status & Predictive Risk Intelligence

1. ## Executive Summary & Health Rating
   - Overall Project Health: [Green / Amber / Red]
   - Core delivery confidence summary

2. ## EVM Cost & Schedule Health Assessment
   - Plain-language analysis of SPI (${metrics?.spi}) and CPI (${metrics?.cpi})
   - Variance breakdown (SV: $${metrics?.scheduleVariance?.toLocaleString()}, CV: $${metrics?.costVariance?.toLocaleString()})
   - Financial forecast at completion (EAC)

3. ## Predictive Risk Radar & Early Blocker Forecast (Trend Analysis)
   - **Emerging Blocker Trends**: Analyze current RAID items to predict which items are trending toward becoming critical delivery blockers before they occur.
   - **High-Risk Bottlenecks & Critical Dependencies**: Identify specific unmitigated dependencies or unresolved issues that threaten upcoming milestones.
   - **Leading Risk Indicators**: Signals to watch over the next 1-2 sprint cycles (e.g. velocity degradation, dependency lag, unvalidated assumptions).
   - **Pre-emptive Interventions**: Specific proactive actions to neutralize predicted blockers before workstream stoppage occurs.

4. ## RAID Register Action Plan
   - Immediate mitigations for top Risks, Issues, Assumptions, and Dependencies
   - Ownership and target resolution priorities

5. ## Strategic Recommendations for Next Iteration
   - Top 3-4 concrete executive directives for the project team
`;

    const reportText = await executeAiCall(prompt, customAiConfig);
    res.json({ success: true, report: reportText });
  } catch (error: any) {
    console.error('Error generating AI report:', error);
    res.status(500).json({ error: error.message || 'Failed to generate AI report' });
  }
});

app.post('/api/ai/risk-analysis', async (req, res) => {
  try {
    const { raidItem, project, customAiConfig } = req.body;

    const prompt = `
You are a Senior Risk Management Consultant.
Provide actionable mitigation strategies and a contingency plan for the following project risk/issue:

Title: ${raidItem.title}
Type: ${raidItem.type}
Description: ${raidItem.description}
Current Status: ${raidItem.status}
Impact: ${raidItem.impact || raidItem.severity || 'High'}
Probability: ${raidItem.probability || 'Medium'}

Project Context: ${project?.projectName || 'Enterprise Portal'}

Please provide:
1. Proposed Primary Mitigation Strategy (Concrete steps to reduce probability or impact)
2. Contingency Plan (What to do if the risk materializes)
3. Owner Assignment Recommendation
4. Estimated Effort to Mitigate
`;

    const analysisText = await executeAiCall(prompt, customAiConfig);
    res.json({ success: true, analysis: analysisText });
  } catch (error: any) {
    console.error('Error analyzing risk:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze risk' });
  }
});

app.post('/api/ai/parse-sow', async (req, res) => {
  try {
    const { sowText, targetBudget, startDate, customAiConfig } = req.body;
    if (!sowText || typeof sowText !== 'string' || !sowText.trim()) {
      return res.status(400).json({ error: 'SOW / Document content is required.' });
    }

    const systemInstruction = "You are an expert Chief Project Officer and PMI Agile/EVM Project Architect. Analyze the provided Statement of Work (SOW), Project Brief, or Charter and extract a complete, production-ready project plan in strict JSON format.";

    const prompt = `
Analyze the following Statement of Work (SOW) / Project Brief / Charter and generate a detailed structured project structure.

--- SOW / DOCUMENT CONTENT ---
${sowText.slice(0, 20000)}
--- END SOW CONTENT ---

Optional Target Guidance:
- Target Budget: ${targetBudget ? '$' + targetBudget : 'Infer from SOW or default to $200,000 baseline'}
- Target Start Date: ${startDate || new Date().toISOString().split('T')[0]}

Return ONLY valid JSON without conversational commentary or markdown block wrappers. The JSON must match this structure:
{
  "projectName": "Name of project extracted or synthesized",
  "projectCode": "3-5 letter uppercase code e.g. CLOUD or APEX",
  "description": "2-3 sentence executive project summary",
  "startDate": "YYYY-MM-DD",
  "targetEndDate": "YYYY-MM-DD",
  "budget": 200000,
  "scopeDetails": "Comprehensive project scope summary based on SOW objectives",
  "stakeholders": [
    {
      "name": "Full Name",
      "email": "email@example.com",
      "role": "Project Manager / Senior Engineer / Lead Architect / QA Specialist / Client Sponsor",
      "category": "internal",
      "hourlyRate": 120,
      "weeklyCapacityHours": 40,
      "skills": ["Project Management", "Agile"]
    }
  ],
  "milestones": [
    {
      "title": "Milestone Title",
      "targetDate": "YYYY-MM-DD",
      "description": "Milestone deliverable objective"
    }
  ],
  "epics": [
    {
      "title": "Epic Title",
      "description": "Epic description",
      "milestoneIndex": 0
    }
  ],
  "features": [
    {
      "title": "Feature Title",
      "description": "Feature description",
      "epicIndex": 0,
      "milestoneIndex": 0
    }
  ],
  "tasks": [
    {
      "title": "Task Title",
      "description": "Detailed task requirements and acceptance guidelines",
      "featureIndex": 0,
      "epicIndex": 0,
      "priority": "high",
      "estimatedHours": 24,
      "baselineCost": 2880,
      "status": "todo",
      "acceptanceCriteria": [
        { "id": "ac-1", "text": "Acceptance criterion text", "validated": false }
      ]
    }
  ],
  "subtasks": [
    {
      "title": "Subtask title",
      "estimatedHours": 8,
      "taskIndex": 0
    }
  ],
  "raidItems": [
    {
      "type": "risk",
      "title": "RAID item title",
      "description": "Detailed risk description and mitigation plan",
      "severity": "medium",
      "status": "identified"
    }
  ],
  "dorCriteria": [
    "User story / requirement clearly defined with acceptance criteria",
    "Technical dependencies identified and mapped"
  ],
  "dodCriteria": [
    "Code peer reviewed and passed unit tests",
    "QA validation complete and accepted by PM"
  ]
}
`;

    const rawResponse = await executeAiCall(prompt, customAiConfig, systemInstruction);
    
    let cleanedJson = rawResponse.trim();
    if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    }

    try {
      const proposal = JSON.parse(cleanedJson);
      res.json({ success: true, proposal });
    } catch (parseErr) {
      console.error('Failed to parse AI JSON response:', parseErr, rawResponse);
      res.status(422).json({ 
        error: 'AI output was not valid JSON. Please try refining or resubmitting the SOW text.',
        rawText: rawResponse 
      });
    }
  } catch (err: any) {
    console.error('Error in parse-sow endpoint:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze SOW document.' });
  }
});

// Vite Middleware integration for development / production static serving
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ApexPM Server running at http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic();
