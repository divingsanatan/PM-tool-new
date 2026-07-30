import { Task, Subtask, Stakeholder, Feature, Milestone, Epic, TaskStatus } from '../types';

/**
 * Returns completion percentage based strictly on status:
 * - todo (Not Started): 0%
 * - in_progress: 40%
 * - blocked: 20%
 * - review (In Testing/Review): 80%
 * - done (Completed): 100%
 */
export function getStatusProgress(status: TaskStatus): number {
  switch (status) {
    case 'todo':
      return 0;
    case 'blocked':
      return 20;
    case 'in_progress':
      return 40;
    case 'review':
      return 80;
    case 'done':
      return 100;
    default:
      return 0;
  }
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
  stakeholders: Stakeholder[] = []
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
      completionPercent = 100;
    } else if (task.status === 'todo') {
      completionPercent = 0;
    } else {
      completionPercent = Math.round((completedCount / taskSubtasks.length) * 100);
    }

    return {
      estimatedHours: totalEstHours,
      actualHours: totalActHours,
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
    const completionPercent = getStatusProgress(task.status);

    return {
      estimatedHours: estH,
      actualHours: actH,
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
 * Computes Feature Effective Values by aggregating its child tasks
 */
export function getFeatureEffectiveValues(
  featureOrId: Feature | string,
  tasks: Task[],
  subtasks: Subtask[],
  stakeholders: Stakeholder[]
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
    const eff = getTaskEffectiveValues(task, subtasks, stakeholders);
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
    estimatedHours: totalEstHours,
    actualHours: totalActHours,
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
  features: Feature[] = []
) {
  const mId = typeof milestoneOrId === 'string' ? milestoneOrId : milestoneOrId.id;
  const milestoneTasks = tasks.filter(t => t.milestoneId === mId);
  const allAssigneeIds = getMilestoneAllAssigneeIds(mId, epics, features, tasks, subtasks);

  let totalEstHours = 0;
  let totalActHours = 0;
  let totalPlannedCost = 0;
  let totalActualCost = 0;
  let sumCompletion = 0;

  milestoneTasks.forEach(task => {
    const eff = getTaskEffectiveValues(task, subtasks, stakeholders);
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
    estimatedHours: totalEstHours,
    actualHours: totalActHours,
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
  stakeholders: Stakeholder[]
) {
  let totalEstHours = 0;
  let totalActHours = 0;
  let totalPlannedCost = 0;
  let totalActualCost = 0;
  let sumCompletion = 0;
  let completedTasksCount = 0;
  const allAssigneeIds = getProjectAllAssigneeIds(tasks, subtasks);

  tasks.forEach(task => {
    const eff = getTaskEffectiveValues(task, subtasks, stakeholders);
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
    estimatedHours: totalEstHours,
    actualHours: totalActHours,
    plannedCost: totalPlannedCost,
    actualCost: totalActualCost,
    completionPercent: completion,
    assigneeIds: allAssigneeIds
  };
}

