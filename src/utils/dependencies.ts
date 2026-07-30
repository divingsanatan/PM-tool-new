import { Task } from '../types';

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface TaskDependency {
  targetTaskId: string;
  type: DependencyType;
}

export const DEPENDENCY_TYPE_LABELS: Record<DependencyType, { label: string; shortLabel: string; description: string }> = {
  FS: {
    label: 'Finish-to-Start (FS)',
    shortLabel: 'FS',
    description: 'Predecessor must finish before this task can start.'
  },
  SS: {
    label: 'Start-to-Start (SS)',
    shortLabel: 'SS',
    description: 'Predecessor must start before this task can start.'
  },
  FF: {
    label: 'Finish-to-Finish (FF)',
    shortLabel: 'FF',
    description: 'Predecessor must finish before this task can finish.'
  },
  SF: {
    label: 'Start-to-Finish (SF)',
    shortLabel: 'SF',
    description: 'Predecessor must start before this task can finish.'
  }
};

/**
 * Parses raw dependency string (e.g. "task-101" or "task-101:SS") into structured object
 */
export function parseDependency(depStr: string): TaskDependency {
  if (!depStr) return { targetTaskId: '', type: 'FS' };
  if (depStr.includes(':')) {
    const [targetTaskId, type] = depStr.split(':');
    return {
      targetTaskId,
      type: (type as DependencyType) || 'FS'
    };
  }
  return {
    targetTaskId: depStr,
    type: 'FS'
  };
}

/**
 * Formats targetTaskId and DependencyType into string for storing in task.dependencies array
 */
export function formatDependency(targetTaskId: string, type: DependencyType): string {
  return `${targetTaskId}:${type}`;
}

/**
 * Gets all parsed dependencies for a task
 */
export function getTaskDependencies(task: Partial<Task>): TaskDependency[] {
  if (!task.dependencies) return [];
  return task.dependencies.map(parseDependency).filter(d => Boolean(d.targetTaskId));
}

/**
 * Check if a task has a schedule conflict with a predecessor based on dependency type
 */
export function checkDependencyConflict(
  task: { startDate?: string; dueDate?: string },
  dep: TaskDependency,
  allTasks: Task[]
): { hasConflict: boolean; reason?: string; predecessor?: Task } {
  const predecessor = allTasks.find(t => t.id === dep.targetTaskId);
  if (!predecessor || !task.startDate || !task.dueDate) return { hasConflict: false };

  const taskStart = new Date(task.startDate).getTime();
  const taskDue = new Date(task.dueDate).getTime();
  const predStart = new Date(predecessor.startDate).getTime();
  const predDue = new Date(predecessor.dueDate).getTime();

  if (dep.type === 'FS') {
    // Finish-to-Start: Task start date should be >= Predecessor due date
    if (taskStart < predDue) {
      return {
        hasConflict: true,
        reason: `Starts (${task.startDate}) before predecessor finishes (${predecessor.dueDate})`,
        predecessor
      };
    }
  } else if (dep.type === 'SS') {
    // Start-to-Start: Task start date should be >= Predecessor start date
    if (taskStart < predStart) {
      return {
        hasConflict: true,
        reason: `Starts (${task.startDate}) before predecessor starts (${predecessor.startDate})`,
        predecessor
      };
    }
  } else if (dep.type === 'FF') {
    // Finish-to-Finish: Task due date should be >= Predecessor due date
    if (taskDue < predDue) {
      return {
        hasConflict: true,
        reason: `Finishes (${task.dueDate}) before predecessor finishes (${predecessor.dueDate})`,
        predecessor
      };
    }
  } else if (dep.type === 'SF') {
    // Start-to-Finish: Task due date should be >= Predecessor start date
    if (taskDue < predStart) {
      return {
        hasConflict: true,
        reason: `Finishes (${task.dueDate}) before predecessor starts (${predecessor.startDate})`,
        predecessor
      };
    }
  }

  return { hasConflict: false, predecessor };
}

/**
 * Get predecessor task objects for a task
 */
export function getTaskPredecessors(task: Task, allTasks: Task[]) {
  const deps = getTaskDependencies(task);
  return deps.map(dep => {
    const predecessor = allTasks.find(t => t.id === dep.targetTaskId);
    const conflict = checkDependencyConflict(task, dep, allTasks);
    return {
      dep,
      predecessor,
      depType: dep.type,
      hasConflict: conflict.hasConflict,
      reason: conflict.reason
    };
  }).filter(item => Boolean(item.predecessor));
}

/**
 * Get successor tasks that depend on this task
 */
export function getTaskSuccessors(task: Task, allTasks: Task[]) {
  const successors: { successor: Task; depType: DependencyType; hasConflict: boolean; reason?: string }[] = [];

  allTasks.forEach(otherTask => {
    if (otherTask.id === task.id) return;
    const deps = getTaskDependencies(otherTask);
    const matchingDep = deps.find(d => d.targetTaskId === task.id);
    if (matchingDep) {
      const conflict = checkDependencyConflict(otherTask, matchingDep, allTasks);
      successors.push({
        successor: otherTask,
        depType: matchingDep.type,
        hasConflict: conflict.hasConflict,
        reason: conflict.reason
      });
    }
  });

  return successors;
}
