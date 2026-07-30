import { Task, Feature, Epic, Milestone, RaciMatrix, RaciRole } from '../types';

export interface ItemRaciInfo {
  responsible: string[];
  accountable: string[];
  consulted: string[];
  informed: string[];
}

/**
 * Get RACI matrix for a single task. Fallback to assigneeIds as Responsible if not set.
 */
export function getTaskRaci(task: Task): ItemRaciInfo {
  const r = task.raci?.responsible && task.raci.responsible.length > 0
    ? task.raci.responsible
    : (task.assigneeIds || []);
  const a = task.raci?.accountable || [];
  const c = task.raci?.consulted || [];
  const i = task.raci?.informed || [];

  return {
    responsible: Array.from(new Set(r)),
    accountable: Array.from(new Set(a)),
    consulted: Array.from(new Set(c)),
    informed: Array.from(new Set(i))
  };
}

/**
 * Get all tasks belonging to a Feature
 */
export function getFeatureChildTasks(featureId: string, tasks: Task[]): Task[] {
  return tasks.filter(t => t.featureId === featureId);
}

/**
 * Get all tasks belonging to an Epic (directly or through features in the epic)
 */
export function getEpicChildTasks(epicId: string, features: Feature[], tasks: Task[]): Task[] {
  const epicFeatureIds = features.filter(f => f.epicId === epicId).map(f => f.id);
  return tasks.filter(t => t.epicId === epicId || (t.featureId && epicFeatureIds.includes(t.featureId)));
}

/**
 * Get all tasks belonging to a Milestone (directly or through epics/features in the milestone)
 */
export function getMilestoneChildTasks(
  milestoneId: string,
  epics: Epic[],
  features: Feature[],
  tasks: Task[]
): Task[] {
  const milestoneEpicIds = epics.filter(e => e.milestoneId === milestoneId).map(e => e.id);
  const milestoneFeatureIds = features
    .filter(f => f.milestoneId === milestoneId || (f.epicId && milestoneEpicIds.includes(f.epicId)))
    .map(f => f.id);

  return tasks.filter(t =>
    t.milestoneId === milestoneId ||
    (t.epicId && milestoneEpicIds.includes(t.epicId)) ||
    (t.featureId && milestoneFeatureIds.includes(t.featureId))
  );
}

/**
 * Aggregate RACI matrix for any level of the hierarchy (Task, Feature, Epic, Milestone)
 */
export function aggregateRaciForHierarchy(
  itemType: 'milestone' | 'epic' | 'feature' | 'task',
  itemId: string,
  data: {
    milestones: Milestone[];
    epics: Epic[];
    features: Feature[];
    tasks: Task[];
  }
): ItemRaciInfo {
  let childTasks: Task[] = [];

  if (itemType === 'task') {
    const task = data.tasks.find(t => t.id === itemId);
    return task ? getTaskRaci(task) : { responsible: [], accountable: [], consulted: [], informed: [] };
  } else if (itemType === 'feature') {
    childTasks = getFeatureChildTasks(itemId, data.tasks);
  } else if (itemType === 'epic') {
    childTasks = getEpicChildTasks(itemId, data.features, data.tasks);
  } else if (itemType === 'milestone') {
    childTasks = getMilestoneChildTasks(itemId, data.epics, data.features, data.tasks);
  }

  const rSet = new Set<string>();
  const aSet = new Set<string>();
  const cSet = new Set<string>();
  const iSet = new Set<string>();

  childTasks.forEach(task => {
    const raci = getTaskRaci(task);
    raci.responsible.forEach(id => rSet.add(id));
    raci.accountable.forEach(id => aSet.add(id));
    raci.consulted.forEach(id => cSet.add(id));
    raci.informed.forEach(id => iSet.add(id));
  });

  return {
    responsible: Array.from(rSet),
    accountable: Array.from(aSet),
    consulted: Array.from(cSet),
    informed: Array.from(iSet)
  };
}

/**
 * Helper to check if a stakeholder has a specific RACI role for a given item's RACI info
 */
export function hasRaciRole(raciInfo: ItemRaciInfo, stakeholderId: string, role: RaciRole): boolean {
  if (role === 'R') return raciInfo.responsible.includes(stakeholderId);
  if (role === 'A') return raciInfo.accountable.includes(stakeholderId);
  if (role === 'C') return raciInfo.consulted.includes(stakeholderId);
  if (role === 'I') return raciInfo.informed.includes(stakeholderId);
  return false;
}
