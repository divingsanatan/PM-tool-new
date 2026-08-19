import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes stale time for smooth non-blocking cache hits
      gcTime: 1000 * 60 * 15, // 15 minutes garbage collection cache time
      refetchOnWindowFocus: false, // Prevent unwanted background refetches
      refetchOnReconnect: true, // Auto-refresh when coming back online
      retry: 1, // Single retry on transient network errors
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  all: ['apex_pm'] as const,
  projects: ['apex_pm', 'projects'] as const,
  projectsList: ['apex_pm', 'projects', 'list'] as const,
  allProjectsFull: ['apex_pm', 'projects', 'all_full'] as const,
  project: (id?: string) => ['apex_pm', 'project', id || 'active'] as const,
  supabaseHealth: ['apex_pm', 'supabase', 'health'] as const,
  supabaseTable: (tableName: string) => ['apex_pm', 'supabase', 'table', tableName] as const,
  tasks: (projectId?: string) => ['apex_pm', 'tasks', projectId || 'active'] as const,
  raid: (projectId?: string) => ['apex_pm', 'raid', projectId || 'active'] as const,
  stakeholders: (projectId?: string) => ['apex_pm', 'stakeholders', projectId || 'active'] as const,
};
