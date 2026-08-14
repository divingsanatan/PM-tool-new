import { Task, Subtask, Stakeholder, Feature, Milestone, Epic, TaskStatus } from '../types';

export const DEFAULT_STATUS_PERCENTAGES: Record<TaskStatus, number> = {
  todo: 0,
  in_progress: 40,
  on_hold: 0,
  blocked: 50,
  demoable: 80,
  review: 80,
  done: 100
};

/**
 * Returns completion percentage based on status and configurable PM thresholds:
 * - todo (Not Started): 0%
 * - in_progress: 40%
 * - on_hold: 0%
 * - blocked: 50%
 * - demoable (Demo-able): 80%
 * - review (In Testing/Review): 80%
 * - done (Completed): 100%
 */
export function getStatusProgress(
  status: TaskStatus,
  customPercentages?: Partial<Record<TaskStatus, number>>
): number {
  if (customPercentages && typeof customPercentages[status] === 'number') {
    return customPercentages[status]!;
  }
  return DEFAULT_STATUS_PERCENTAGES[status] ?? 0;
}

/**
 * Gets all unique assignee/stakeholder IDs for a single task including its subtasks
 */
export function getTaskAllAssigneeIds(task: Task, subtasks: Subtask[] = []): string[] {
  const taskSubtasks = subtasks.filter(st => st.taskId === task.id);
  const subtaskAssignees = taskSubtasks
    .map(st => st.assigneeId)
    .filter((id): id is string => Boolean(id));
  return Array.from(new Set([...(task.assigneeIds || []), ...subtaskAssignees]));
}

/**
 * Gets all unique assignee/stakeholder IDs for a feature including all child tasks and subtasks
 */
export function getFeatureAllAssigneeIds(
  featureOrId: Feature | string,
  tasks: Task[],
  subtasks: Subtask[] = []
): string[] {
  const fId = typeof featureOrId === 'string' ? featureOrId : featureOrId.id;
  const featureTasks = tasks.filter(t => t.featureId === fId);
  const ids: string[] = [];
  featureTasks.forEach(task => {
    ids.push(...getTaskAllAssigneeIds(task, subtasks));
  });
  return Array.from(new Set(ids));
}

/**
 * Gets all unique assignee/stakeholder IDs for an epic including all features, child tasks, and subtasks
 */
export function getEpicAllAssigneeIds(
  epicOrId: Epic | string,
  features: Feature[] = [],
  tasks: Task[],
  subtasks: Subtask[] = []
): string[] {
  const eId = typeof epicOrId === 'string' ? epicOrId : epicOrId.id;
  const epicFeatureIds = new Set(features.filter(f => f.epicId === eId).map(f => f.id));
  const epicTasks = tasks.filter(t => t.epicId === eId || (t.featureId && epicFeatureIds.has(t.featureId)));
  const ids: string[] = [];
  epicTasks.forEach(task => {
    ids.push(...getTaskAllAssigneeIds(task, subtasks));
  });
  return Array.from(new Set(ids));
}

/**
 * Gets all unique assignee/stakeholder IDs for a milestone including all epics, features, child tasks, and subtasks
 */
export function getMilestoneAllAssigneeIds(
  milestoneOrId: Milestone | string,
  epics: Epic[] = [],
  features: Feature[] = [],
  tasks: Task[],
  subtasks: Subtask[] = []
): string[] {
  const mId = typeof milestoneOrId === 'string' ? milestoneOrId : milestoneOrId.id;
  const milestoneEpicIds = new Set((epics || []).filter(e => e.milestoneId === mId).map(e => e.id));
  const milestoneFeatureIds = new Set(
    features.filter(f => f.milestoneId === mId || (f.epicId && milestoneEpicIds.has(f.epicId))).map(f => f.id)
  );

  const milestoneTasks = tasks.filter(
    t => t.milestoneId === mId ||
      (t.epicId && milestoneEpicIds.has(t.epicId)) ||
      (t.featureId && milestoneFeatureIds.has(t.featureId))
  );

  const ids: string[] = [];
  milestoneTasks.forEach(task => {
    ids.push(...getTaskAllAssigneeIds(task, subtasks));
  });
  return Array.from(new Set(ids));
}

/**
 * Gets all unique assignee/stakeholder IDs for the whole project across all tasks & subtasks
 */
export function getProjectAllAssigneeIds(tasks: Task[], subtasks: Subtask[] = []): string[] {
  const ids: string[] = [];
  tasks.forEach(task => {
    ids.push(...getTaskAllAssigneeIds(task, subtasks));
  });
  return Array.from(new Set(ids));
}

/**
 * Calculates average hourly rate for a set of assignee IDs given stakeholder data
 */
export function getAvgHourlyRate(assigneeIds: string[], stakeholders: Stakeholder[]): number {
  if (!assigneeIds || assigneeIds.length === 0) {
    if (stakeholders && stakeholders.length > 0) {
      const total = stakeholders.reduce((sum, sh) => sum + (sh.hourlyRate || 80), 0);
      return Math.round(total / stakeholders.length);
    }
    return 80; // default rate if no stakeholders exist
  }

  const assigned = stakeholders.filter(sh => assigneeIds.includes(sh.id));
  if (assigned.length === 0) return 80;

  const total = assigned.reduce((sum, sh) => sum + (sh.hourlyRate || 80), 0);
  return Math.round(total / assigned.length);
}

export interface TaskEffectiveValues {
  estimatedHours: number;
  actualHours: number;
  plannedCost: number;
  actualCost: number;
  completionPercent: number;
  avgHourlyRate: number;
  hasSubtasks: boolean;
  subtasksCount: number;
  completedSubtasksCount: number;
  assigneeIds: string[];
}

/**
 * Computes effective task values including subtask aggregation & stakeholder-based costs
 */
export function getTaskEffectiveValues(
  task: Task,
  subtasks: Subtask[] = [],
  stakeholders: Stakeholder[] = [],
  statusPercentages?: Partial<Record<TaskStatus, number>>
): TaskEffectiveValues {
  const taskSubtasks = subtasks.filter(st => st.taskId === task.id);
  const allAssigneeIds = getTaskAllAssigneeIds(task, taskSubtasks);
  const avgHourlyRate = getAvgHourlyRate(allAssigneeIds, stakeholders);

  if (taskSubtasks.length > 0) {
    let totalEstHours = 0;
    let totalActHours = 0;
    let totalPlannedCost = 0;
    let totalActualCost = 0;
    let completedCount = 0;

    taskSubtasks.forEach(st => {
      let stRate = avgHourlyRate;
      if (st.assigneeId) {
        const sh = stakeholders.find(s => s.id === st.assigneeId);
        if (sh && sh.hourlyRate) stRate = sh.hourlyRate;
      }

      const estH = st.estimatedHours || 0;
      const actH = st.actualHours || 0;

      totalEstHours += estH;
      totalActHours += actH;
      totalPlannedCost += estH * stRate;
      totalActualCost += actH * stRate;

      if (st.completed) completedCount++;
    });

    let completionPercent = 0;
    if (task.status === 'done') {
      completionPercent = getStatusProgress('done', statusPercentages);
    } else if (task.status === 'todo') {
      completionPercent = getStatusProgress('todo', statusPercentages);
    } else {
      const subtaskPct = Math.round((completedCount / taskSubtasks.length) * 100);
      const statusPct = getStatusProgress(task.status, statusPercentages);
      completionPercent = Math.max(subtaskPct, statusPct);
    }

    return {
      estimatedHours: Math.round(totalEstHours * 100) / 100,
      actualHours: Math.round(totalActHours * 100) / 100,
      plannedCost: Math.round(totalPlannedCost),
      actualCost: Math.round(totalActualCost),
      completionPercent,
      avgHourlyRate,
      hasSubtasks: true,
      subtasksCount: taskSubtasks.length,
      completedSubtasksCount: completedCount,
      assigneeIds: allAssigneeIds
    };
  } else {
    const estH = task.estimatedHours || 0;
    const actH = task.actualHours || 0;
    const plannedCost = Math.round(estH * avgHourlyRate);
    const actualCost = Math.round(actH * avgHourlyRate);
    const completionPercent = getStatusProgress(task.status, statusPercentages);

    return {
      estimatedHours: Math.round(estH * 100) / 100,
      actualHours: Math.round(actH * 100) / 100,
      plannedCost,
      actualCost,
      completionPercent,
      avgHourlyRate,
      hasSubtasks: false,
      subtasksCount: 0,
      completedSubtasksCount: 0,
      assigneeIds: allAssigneeIds
    };
  }
}

/**
 * Calculates task actual hours based on status timestamps:
 * - inProgressAt: when status moved to 'in_progress'
 * - demoableAt: when status moved to 'demoable' (or completed)
 */
export function calculateTimestampActualHours(
  task: Partial<Task>,
  existingTask?: Task
): { actualHours: number; inProgressAt?: string; demoableAt?: string } {
  let inProgressAt = task.inProgressAt || existingTask?.inProgressAt;
  let demoableAt = task.demoableAt || existingTask?.demoableAt;
  const status = task.status || existingTask?.status || 'todo';

  const isNowInProgress = status === 'in_progress';
  const isNowDemoableOrPast = status === 'demoable' || status === 'review' || status === 'done';

  // Record timestamp when status changes to in_progress
  if (isNowInProgress && !inProgressAt) {
    inProgressAt = new Date().toISOString();
  }

  // Record timestamp when status changes to demoable or beyond
  if (isNowDemoableOrPast && !demoableAt) {
    demoableAt = new Date().toISOString();
    if (!inProgressAt) {
      if (existingTask?.startDate) {
        inProgressAt = new Date(existingTask.startDate + 'T09:00:00').toISOString();
      } else if (task.startDate) {
        inProgressAt = new Date(task.startDate + 'T09:00:00').toISOString();
      } else {
        const estH = task.estimatedHours || existingTask?.estimatedHours || 8;
        inProgressAt = new Date(Date.now() - estH * 3600000).toISOString();
      }
    }
  }

  let actualHours = task.actualHours ?? existingTask?.actualHours ?? 0;

  if (inProgressAt && demoableAt) {
    const startMs = new Date(inProgressAt).getTime();
    const endMs = new Date(demoableAt).getTime();
    if (!isNaN(startMs) && !isNaN(endMs) && endMs >= startMs) {
      const diffHours = (endMs - startMs) / (1000 * 60 * 60);
      actualHours = Math.max(0.1, Math.round(diffHours * 10) / 10);
    }
  } else if (inProgressAt && isNowInProgress) {
    const startMs = new Date(inProgressAt).getTime();
    const nowMs = Date.now();
    if (!isNaN(startMs) && nowMs >= startMs) {
      const diffHours = (nowMs - startMs) / (1000 * 60 * 60);
      actualHours = Math.max(0.1, Math.round(diffHours * 10) / 10);
    }
  } else if (status === 'todo' && task.actualHours === undefined && !existingTask?.actualHours) {
    actualHours = 0;
  }

  return { actualHours, inProgressAt, demoableAt };
}

/**
 * Computes Epic Effective Values by aggregating its child features and tasks
 */
export function getEpicEffectiveValues(
  epicOrId: Epic | string,
  features: Feature[],
  tasks: Task[],
  subtasks: Subtask[],
  stakeholders: Stakeholder[],
  statusPercentages?: Partial<Record<TaskStatus, number>>
) {
  const eId = typeof epicOrId === 'string' ? epicOrId : epicOrId.id;
  const epicFeatureIds = new Set(features.filter(f => f.epicId === eId).map(f => f.id));
  const epicTasks = tasks.filter(t => t.epicId === eId || (t.featureId && epicFeatureIds.has(t.featureId)));
  const allAssigneeIds = getEpicAllAssigneeIds(eId, features, tasks, subtasks);

  let totalEstHours = 0;
  let totalActHours = 0;
  let totalPlannedCost = 0;
  let totalActualCost = 0;
  let sumCompletion = 0;

  epicTasks.forEach(task => {
    const eff = getTaskEffectiveValues(task, subtasks, stakeholders, statusPercentages);
    totalEstHours += eff.estimatedHours;
    totalActHours += eff.actualHours;
    totalPlannedCost += eff.plannedCost;
    totalActualCost += eff.actualCost;
    sumCompletion += eff.completionPercent;
  });

  const completion = epicTasks.length > 0 ? Math.round(sumCompletion / epicTasks.length) : 0;

  return {
    taskCount: epicTasks.length,
    totalTasks: epicTasks.length,
    estimatedHours: Math.round(totalEstHours * 100) / 100,
    actualHours: Math.round(totalActHours * 100) / 100,
    plannedCost: totalPlannedCost,
    actualCost: totalActualCost,
    completionPercent: completion,
    assigneeIds: allAssigneeIds
  };
}

/**
 * Computes Feature Effective Values by aggregating its child tasks
 */
export function getFeatureEffectiveValues(
  featureOrId: Feature | string,
  tasks: Task[],
  subtasks: Subtask[],
  stakeholders: Stakeholder[],
  statusPercentages?: Partial<Record<TaskStatus, number>>
) {
  const fId = typeof featureOrId === 'string' ? featureOrId : featureOrId.id;
  const featureTasks = tasks.filter(t => t.featureId === fId);
  const allAssigneeIds = getFeatureAllAssigneeIds(fId, tasks, subtasks);

  let totalEstHours = 0;
  let totalActHours = 0;
  let totalPlannedCost = 0;
  let totalActualCost = 0;
  let sumCompletion = 0;

  featureTasks.forEach(task => {
    const eff = getTaskEffectiveValues(task, subtasks, stakeholders, statusPercentages);
    totalEstHours += eff.estimatedHours;
    totalActHours += eff.actualHours;
    totalPlannedCost += eff.plannedCost;
    totalActualCost += eff.actualCost;
    sumCompletion += eff.completionPercent;
  });

  const completion = featureTasks.length > 0 ? Math.round(sumCompletion / featureTasks.length) : 0;

  return {
    taskCount: featureTasks.length,
    totalTasks: featureTasks.length,
    estimatedHours: Math.round(totalEstHours * 100) / 100,
    actualHours: Math.round(totalActHours * 100) / 100,
    plannedCost: totalPlannedCost,
    actualCost: totalActualCost,
    completionPercent: completion,
    assigneeIds: allAssigneeIds
  };
}

/**
 * Computes Milestone Effective Values by aggregating its child tasks
 */
export function getMilestoneEffectiveValues(
  milestoneOrId: Milestone | string,
  tasks: Task[],
  subtasks: Subtask[],
  stakeholders: Stakeholder[],
  epics: Epic[] = [],
  features: Feature[] = [],
  statusPercentages?: Partial<Record<TaskStatus, number>>
) {
  const mId = typeof milestoneOrId === 'string' ? milestoneOrId : milestoneOrId.id;
  const milestoneEpicIds = new Set((epics || []).filter(e => e.milestoneId === mId).map(e => e.id));
  const milestoneFeatureIds = new Set(
    features.filter(f => f.milestoneId === mId || (f.epicId && milestoneEpicIds.has(f.epicId))).map(f => f.id)
  );

  const milestoneTasks = tasks.filter(
    t => t.milestoneId === mId ||
      (t.epicId && milestoneEpicIds.has(t.epicId)) ||
      (t.featureId && milestoneFeatureIds.has(t.featureId))
  );
  const allAssigneeIds = getMilestoneAllAssigneeIds(mId, epics, features, tasks, subtasks);

  let totalEstHours = 0;
  let totalActHours = 0;
  let totalPlannedCost = 0;
  let totalActualCost = 0;
  let sumCompletion = 0;

  milestoneTasks.forEach(task => {
    const eff = getTaskEffectiveValues(task, subtasks, stakeholders, statusPercentages);
    totalEstHours += eff.estimatedHours;
    totalActHours += eff.actualHours;
    totalPlannedCost += eff.plannedCost;
    totalActualCost += eff.actualCost;
    sumCompletion += eff.completionPercent;
  });

  const completion = milestoneTasks.length > 0 ? Math.round(sumCompletion / milestoneTasks.length) : 0;

  return {
    taskCount: milestoneTasks.length,
    totalTasks: milestoneTasks.length,
    estimatedHours: Math.round(totalEstHours * 100) / 100,
    actualHours: Math.round(totalActHours * 100) / 100,
    plannedCost: totalPlannedCost,
    actualCost: totalActualCost,
    completionPercent: completion,
    assigneeIds: allAssigneeIds
  };
}

/**
 * Computes Project Effective Values across all tasks
 */
export function getProjectEffectiveValues(
  tasks: Task[],
  subtasks: Subtask[],
  stakeholders: Stakeholder[],
  statusPercentages?: Partial<Record<TaskStatus, number>>
) {
  let totalEstHours = 0;
  let totalActHours = 0;
  let totalPlannedCost = 0;
  let totalActualCost = 0;
  let sumCompletion = 0;
  let completedTasksCount = 0;
  const allAssigneeIds = getProjectAllAssigneeIds(tasks, subtasks);

  tasks.forEach(task => {
    const eff = getTaskEffectiveValues(task, subtasks, stakeholders, statusPercentages);
    totalEstHours += eff.estimatedHours;
    totalActHours += eff.actualHours;
    totalPlannedCost += eff.plannedCost;
    totalActualCost += eff.actualCost;
    sumCompletion += eff.completionPercent;
    if (eff.completionPercent === 100 || task.status === 'done') {
      completedTasksCount++;
    }
  });

  const completion = tasks.length > 0 ? Math.round(sumCompletion / tasks.length) : 0;

  return {
    totalTasks: tasks.length,
    completedTasksCount,
    estimatedHours: Math.round(totalEstHours * 100) / 100,
    actualHours: Math.round(totalActHours * 100) / 100,
    plannedCost: totalPlannedCost,
    actualCost: totalActualCost,
    completionPercent: completion,
    assigneeIds: allAssigneeIds
  };
}

/**
 * Calculates total project budget auto-computed from WBS tasks & subtasks planned costs
 */
export function calculateWbsTotalBudget(
  tasks: Task[],
  subtasks: Subtask[] = [],
  stakeholders: Stakeholder[] = [],
  statusPercentages?: Partial<Record<TaskStatus, number>>
): number {
  if (!tasks || tasks.length === 0) return 0;
  return tasks.reduce((sum, task) => {
    const eff = getTaskEffectiveValues(task, subtasks, stakeholders, statusPercentages);
    return sum + eff.plannedCost;
  }, 0);
}

/**
 * Calculates project end date based on timeline estimated in WBS and user-marked start date
 */
export function calculateWbsProjectEndDate(startDate: string, tasks: Task[]): string {
  const baseStartStr = startDate || new Date().toISOString().split('T')[0];
  const baseStartMs = new Date(baseStartStr).getTime();

  if (!tasks || tasks.length === 0) {
    const d = new Date(baseStartMs);
    d.setDate(d.getDate() + 60);
    return d.toISOString().split('T')[0];
  }

  let latestDueDateMs = baseStartMs;

  tasks.forEach(task => {
    if (task.dueDate) {
      const dueMs = new Date(task.dueDate).getTime();
      if (!isNaN(dueMs) && dueMs > latestDueDateMs) {
        latestDueDateMs = dueMs;
      }
    }
  });

  if (latestDueDateMs <= baseStartMs) {
    const totalEstHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 10), 0);
    const workDays = Math.max(14, Math.ceil(totalEstHours / 8));
    const calendarDays = Math.ceil(workDays * 1.4);
    const d = new Date(baseStartMs);
    d.setDate(d.getDate() + calendarDays);
    return d.toISOString().split('T')[0];
  }

  return new Date(latestDueDateMs).toISOString().split('T')[0];
}

/**
 * Calculates start and end dates for a sprint based on assigned tasks and features
 */
export function calculateSprintDates(
  sprintId: string,
  tasks: Task[] = [],
  features: Feature[] = []
): { startDate: string; endDate: string } | null {
  const assignedTasks = tasks.filter(t => t.sprintId === sprintId);
  const assignedFeatures = features.filter(f => f.sprintId === sprintId);

  const startDates: string[] = [];
  const endDates: string[] = [];

  assignedTasks.forEach(t => {
    if (t.startDate) startDates.push(t.startDate);
    if (t.dueDate) endDates.push(t.dueDate);
  });

  assignedFeatures.forEach(f => {
    if (f.targetReleaseDate) {
      startDates.push(f.targetReleaseDate);
      endDates.push(f.targetReleaseDate);
    }
  });

  if (startDates.length === 0 && endDates.length === 0) {
    return null;
  }

  startDates.sort();
  endDates.sort();

  const minStart = startDates[0] || endDates[0];
  const maxEnd = endDates[endDates.length - 1] || startDates[startDates.length - 1];

  return { startDate: minStart, endDate: maxEnd };
}



