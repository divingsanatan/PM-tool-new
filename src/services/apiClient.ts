import { ProjectData, ProjectMeta, Task, RaidItem, Stakeholder } from '../types';
import { supabase } from '../lib/supabase';

// Direct Supabase table fetcher with fallback
export async function fetchSupabaseTableData<T = any>(table: string): Promise<T[]> {
  try {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.warn(`[Supabase Service] Table ${table} fetch warning:`, error.message);
      return [];
    }
    return (data as T[]) || [];
  } catch (err) {
    console.warn(`[Supabase Service] Table ${table} direct fetch error:`, err);
    return [];
  }
}

// Fetch Active Project Data
export async function fetchActiveProject(): Promise<{ activeProjectId: string; data: ProjectData }> {
  const res = await fetch('/api/project');
  if (!res.ok) {
    throw new Error(`Failed to fetch active project (status ${res.status})`);
  }
  const json = await res.json();
  return {
    activeProjectId: json.activeProjectId,
    data: json.data,
  };
}

// Fetch Projects List Metadata
export async function fetchProjectsList(): Promise<{ activeProjectId: string; projects: ProjectMeta[] }> {
  const res = await fetch('/api/projects');
  if (!res.ok) {
    throw new Error(`Failed to fetch projects list (status ${res.status})`);
  }
  const json = await res.json();
  return {
    activeProjectId: json.activeProjectId,
    projects: json.projects || [],
  };
}

// Fetch All Full Projects (Admin / Executive Portfolio)
export async function fetchAllProjectsFull(): Promise<{
  activeProjectId: string;
  projects: ProjectData[];
  projectsMap: Record<string, ProjectData>;
}> {
  const res = await fetch('/api/projects/all');
  if (!res.ok) {
    throw new Error(`Failed to fetch all full projects (status ${res.status})`);
  }
  const json = await res.json();
  return {
    activeProjectId: json.activeProjectId,
    projects: json.projects || [],
    projectsMap: json.projectsMap || {},
  };
}

// Switch Active Project
export async function switchProjectApi(projectId: string): Promise<{
  activeProjectId: string;
  data: ProjectData;
}> {
  const res = await fetch('/api/projects/switch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to switch project (status ${res.status})`);
  }
  const json = await res.json();
  return {
    activeProjectId: json.activeProjectId,
    data: json.data,
  };
}

// Update / Sync Project Data
export async function updateProjectApi(
  data: ProjectData,
  senderClientId?: string
): Promise<{ success: boolean; data: ProjectData }> {
  const res = await fetch('/api/project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, senderClientId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to save project (status ${res.status})`);
  }
  return await res.json();
}

// Create New Project
export async function createProjectApi(
  newProject: ProjectData,
  senderClientId?: string
): Promise<{ success: boolean; activeProjectId: string; data: ProjectData }> {
  const res = await fetch('/api/projects/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...newProject, senderClientId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create project (status ${res.status})`);
  }
  return await res.json();
}

// Delete Project
export async function deleteProjectApi(
  projectId: string
): Promise<{ success: boolean; activeProjectId: string; data: ProjectData }> {
  const res = await fetch(`/api/projects/${projectId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete project (status ${res.status})`);
  }
  return await res.json();
}

// Save Task
export async function saveTaskApi(
  task: Partial<Task>,
  senderClientId?: string,
  updatedBy?: string
): Promise<{ success: boolean; task: Task }> {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...task, senderClientId, updatedBy }),
  });
  if (!res.ok) {
    throw new Error(`Failed to save task (status ${res.status})`);
  }
  return await res.json();
}

// Delete Task
export async function deleteTaskApi(
  taskId: string,
  senderClientId?: string
): Promise<{ success: boolean; deletedId: string }> {
  const query = senderClientId ? `?senderClientId=${encodeURIComponent(senderClientId)}` : '';
  const res = await fetch(`/api/tasks/${taskId}${query}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete task (status ${res.status})`);
  }
  return await res.json();
}

// Save RAID Item
export async function saveRaidApi(
  raidItem: Partial<RaidItem>,
  senderClientId?: string
): Promise<{ success: boolean; raidItem: RaidItem }> {
  const res = await fetch('/api/raid', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...raidItem, senderClientId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to save RAID item (status ${res.status})`);
  }
  return await res.json();
}

// Delete RAID Item
export async function deleteRaidApi(
  id: string,
  senderClientId?: string
): Promise<{ success: boolean; deletedId: string }> {
  const query = senderClientId ? `?senderClientId=${encodeURIComponent(senderClientId)}` : '';
  const res = await fetch(`/api/raid/${id}${query}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete RAID item (status ${res.status})`);
  }
  return await res.json();
}

// Save Stakeholder
export async function saveStakeholderApi(
  stakeholder: Partial<Stakeholder>,
  senderClientId?: string
): Promise<{ success: boolean; stakeholder: Stakeholder }> {
  const res = await fetch('/api/stakeholders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...stakeholder, senderClientId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to save stakeholder (status ${res.status})`);
  }
  return await res.json();
}

// Reset Project
export async function resetProjectApi(): Promise<{ success: boolean; activeProjectId: string; data: ProjectData }> {
  const res = await fetch('/api/reset', {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(`Failed to reset project (status ${res.status})`);
  }
  return await res.json();
}
