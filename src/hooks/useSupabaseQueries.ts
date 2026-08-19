import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import {
  fetchActiveProject,
  fetchProjectsList,
  fetchAllProjectsFull,
  fetchSupabaseTableData,
  switchProjectApi,
  updateProjectApi,
  createProjectApi,
  deleteProjectApi,
  saveTaskApi,
  deleteTaskApi,
  saveRaidApi,
  deleteRaidApi,
  saveStakeholderApi,
  resetProjectApi,
} from '../services/apiClient';
import { ProjectData, Task, RaidItem, Stakeholder } from '../types';

// Query for Active Project Data with TanStack caching
export function useActiveProjectQuery() {
  return useQuery({
    queryKey: queryKeys.project('active'),
    queryFn: fetchActiveProject,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Query for Projects List (Metadata)
export function useProjectsListQuery() {
  return useQuery({
    queryKey: queryKeys.projectsList,
    queryFn: fetchProjectsList,
    staleTime: 1000 * 60 * 2,
  });
}

// Query for All Full Projects (Admin / Executive view)
export function useAllProjectsFullQuery() {
  return useQuery({
    queryKey: queryKeys.allProjectsFull,
    queryFn: fetchAllProjectsFull,
    staleTime: 1000 * 60 * 2,
  });
}

// Query for direct Supabase Table data
export function useSupabaseTableQuery<T = any>(table: string) {
  return useQuery({
    queryKey: queryKeys.supabaseTable(table),
    queryFn: () => fetchSupabaseTableData<T>(table),
    staleTime: 1000 * 60 * 5, // 5 minutes cache for direct DB table reads
  });
}

// Mutation: Switch Active Project
export function useSwitchProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => switchProjectApi(projectId),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.project('active'), data);
      queryClient.setQueryData(queryKeys.project(data.activeProjectId), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.projectsList });
    },
  });
}

// Mutation: Update Project
export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, senderClientId }: { data: ProjectData; senderClientId?: string }) =>
      updateProjectApi(data, senderClientId),
    onMutate: async ({ data }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.project(data.id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.project('active') });

      // Snapshot previous value
      const prevData = queryClient.getQueryData(queryKeys.project('active'));

      // Optimistically update cache
      queryClient.setQueryData(queryKeys.project('active'), {
        activeProjectId: data.id,
        data,
      });

      return { prevData };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevData) {
        queryClient.setQueryData(queryKeys.project('active'), context.prevData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectsList });
    },
  });
}

// Mutation: Create Project
export function useCreateProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ project, senderClientId }: { project: ProjectData; senderClientId?: string }) =>
      createProjectApi(project, senderClientId),
    onSuccess: (res) => {
      queryClient.setQueryData(queryKeys.project('active'), res);
      queryClient.setQueryData(queryKeys.project(res.activeProjectId), res);
      queryClient.invalidateQueries({ queryKey: queryKeys.projectsList });
      queryClient.invalidateQueries({ queryKey: queryKeys.allProjectsFull });
    },
  });
}

// Mutation: Delete Project
export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => deleteProjectApi(projectId),
    onSuccess: (res) => {
      queryClient.setQueryData(queryKeys.project('active'), res);
      queryClient.invalidateQueries({ queryKey: queryKeys.projectsList });
      queryClient.invalidateQueries({ queryKey: queryKeys.allProjectsFull });
    },
  });
}

// Mutation: Save Task
export function useSaveTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      task,
      senderClientId,
      updatedBy,
    }: {
      task: Partial<Task>;
      senderClientId?: string;
      updatedBy?: string;
    }) => saveTaskApi(task, senderClientId, updatedBy),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectsList });
    },
  });
}

// Mutation: Delete Task
export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, senderClientId }: { taskId: string; senderClientId?: string }) =>
      deleteTaskApi(taskId, senderClientId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectsList });
    },
  });
}

// Mutation: Save RAID Item
export function useSaveRaidMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ raidItem, senderClientId }: { raidItem: Partial<RaidItem>; senderClientId?: string }) =>
      saveRaidApi(raidItem, senderClientId),
  });
}

// Mutation: Delete RAID Item
export function useDeleteRaidMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, senderClientId }: { id: string; senderClientId?: string }) =>
      deleteRaidApi(id, senderClientId),
  });
}

// Mutation: Save Stakeholder
export function useSaveStakeholderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stakeholder, senderClientId }: { stakeholder: Partial<Stakeholder>; senderClientId?: string }) =>
      saveStakeholderApi(stakeholder, senderClientId),
  });
}

// Mutation: Reset Project
export function useResetProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resetProjectApi,
    onSuccess: (res) => {
      queryClient.setQueryData(queryKeys.project('active'), res);
      queryClient.invalidateQueries({ queryKey: queryKeys.projectsList });
      queryClient.invalidateQueries({ queryKey: queryKeys.allProjectsFull });
    },
  });
}
