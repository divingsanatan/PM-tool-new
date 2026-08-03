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
const STORE_FILE = path.join(process.cwd(), 'data_store.json');

app.use(express.json({ limit: '10mb' }));

// Helper to load persistent state from disk
function loadStoreFromDisk() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const content = fs.readFileSync(STORE_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (data && data.allProjectsMap && Object.keys(data.allProjectsMap).length > 0) {
        return {
          allProjectsMap: data.allProjectsMap as Record<string, ProjectData>,
          activeProjectId: (data.activeProjectId as string) || Object.keys(data.allProjectsMap)[0] || 'proj-1'
        };
      }
    }
  } catch (err) {
    console.error('Failed to read data_store.json from disk:', err);
  }
  return {
    allProjectsMap: { ...defaultProjectsMap },
    activeProjectId: 'proj-1'
  };
}

const initialStore = loadStoreFromDisk();
let allProjectsMap: Record<string, ProjectData> = initialStore.allProjectsMap;
let activeProjectId: string = initialStore.activeProjectId;
let isSupabaseConnected = false;

// Async initial hydration from Supabase
async function initSupabaseHydration() {
  try {
    const { data, error } = await supabase.from('app_projects').select('*');
    if (!error && data && data.length > 0) {
      isSupabaseConnected = true;
      const loadedMap: Record<string, ProjectData> = {};
      data.forEach((row: any) => {
        if (row.id && row.data) {
          loadedMap[row.id] = row.data;
        }
      });
      if (Object.keys(loadedMap).length > 0) {
        allProjectsMap = loadedMap;
        if (!allProjectsMap[activeProjectId]) {
          activeProjectId = Object.keys(allProjectsMap)[0];
        }
        console.log(`[Supabase] Hydrated ${data.length} project(s) from Supabase database.`);
      }
    } else if (error) {
      console.warn('[Supabase] Initial query notice:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Connection notice:', err.message || err);
  }
}

initSupabaseHydration();

// Helper to save current state to disk & Supabase
function saveStoreToDisk() {
  try {
    const payload = JSON.stringify({
      allProjectsMap,
      activeProjectId,
      updatedAt: new Date().toISOString()
    }, null, 2);
    fs.writeFileSync(STORE_FILE, payload, 'utf-8');
  } catch (err) {
    console.error('Failed to write data_store.json to disk:', err);
  }

  // Background sync to Supabase
  syncToSupabase().catch(err => console.warn('[Supabase] Background sync warning:', err.message || err));
}

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
    } else {
      console.warn('[Supabase] Upsert warning:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Upsert exception:', err.message || err);
  }
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

// Helper to broadcast state changes to all connected clients and save to disk
function broadcastDataChange(senderWs?: WebSocket) {
  saveStoreToDisk();
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
    timestamp: new Date().toISOString()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
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
        broadcastDataChange(ws);
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
      connected: true,
      url: SUPABASE_URL,
      tableExists,
      projectCount,
      activeProjectsInMemory: Object.keys(allProjectsMap).length,
      errorMessage: error ? error.message : null,
      sqlScript: `CREATE TABLE IF NOT EXISTS public.app_projects (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (optional) or allow public read/write for applet
ALTER TABLE public.app_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public full access" ON public.app_projects;
CREATE POLICY "Allow public full access" ON public.app_projects FOR ALL USING (true) WITH CHECK (true);`
    });
  } catch (err: any) {
    res.json({
      success: false,
      connected: false,
      url: SUPABASE_URL,
      tableExists: false,
      errorMessage: err.message || 'Supabase host unreachable',
      sqlScript: `CREATE TABLE IF NOT EXISTS public.app_projects (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`
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

app.post('/api/projects/switch', (req, res) => {
  const { projectId } = req.body;
  if (projectId && allProjectsMap[projectId]) {
    activeProjectId = projectId;
    broadcastDataChange();
    res.json({ success: true, activeProjectId, data: allProjectsMap[projectId] });
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
    broadcastDataChange();
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
  broadcastDataChange();
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

  broadcastDataChange();
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

  broadcastDataChange();
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

  broadcastDataChange();
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

  broadcastDataChange();
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

  broadcastDataChange();
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
    model: 'gemini-3.6-flash',
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
    const { metrics, project, customAiConfig } = req.body;

    const prompt = `
You are an expert Chief Project Officer and EVM Project Management Advisor.
Analyze the following project status data and generate an executive status report.

Project Name: ${project?.projectName || 'Cloud Portal'}
Budget: $${project?.budget?.toLocaleString() || '250,000'}
EVM Metrics:
- Schedule Performance Index (SPI): ${metrics?.spi} (${metrics?.spi >= 1 ? 'On/Ahead of Schedule' : 'Behind Schedule'})
- Cost Performance Index (CPI): ${metrics?.cpi} (${metrics?.cpi >= 1 ? 'On/Under Budget' : 'Over Budget'})
- Planned Value (PV): $${metrics?.plannedValue?.toLocaleString()}
- Earned Value (EV): $${metrics?.earnedValue?.toLocaleString()}
- Actual Cost (AC): $${metrics?.actualCost?.toLocaleString()}
- Estimate at Completion (EAC): $${metrics?.eac?.toLocaleString()}
- Schedule Variance (SV): $${metrics?.scheduleVariance?.toLocaleString()}
- Cost Variance (CV): $${metrics?.costVariance?.toLocaleString()}

Active Tasks Count: ${project?.tasks?.length || 0}
Active Risks & Issues Count: ${project?.raidItems?.length || 0}
Top RAID Risks:
${project?.raidItems?.slice(0, 4).map((r: any) => `- [${r.type.toUpperCase()}] ${r.title} (Severity: ${r.severity || r.impact || 'Medium'}, Status: ${r.status})`).join('\n') || 'None'}

Please format the response in clean Markdown with the following sections:
1. Executive Summary & Health Rating (Green / Amber / Red)
2. EVM Cost & Schedule Assessment (Explain SPI/CPI in plain business terms)
3. Key Accomplishments & Progress
4. RAID Risk Mitigation Recommendations
5. Strategic Action Items for Next Sprint
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
