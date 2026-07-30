import { Task, Subtask, EVMMetrics, Stakeholder, StakeholderWorkload } from '../types';
import { getTaskEffectiveValues, getTaskAllAssigneeIds } from './taskCalculations';

export function calculateEVMMetrics(
  tasks: Task[],
  projectBudget: number,
  subtasks: Subtask[] = [],
  stakeholders: Stakeholder[] = []
): EVMMetrics {
  const today = new Date().toISOString().split('T')[0];

  let totalPV = 0;
  let totalEV = 0;
  let totalAC = 0;

  tasks.forEach((task) => {
    const eff = getTaskEffectiveValues(task, subtasks, stakeholders);

    // 1. Planned Value (PV)
    // If task start date is past today, compute prorated planned value based on schedule
    const start = new Date(task.startDate).getTime();
    const due = new Date(task.dueDate).getTime();
    const current = new Date(today).getTime();

    let scheduleProgress = 0;
    if (current >= due) {
      scheduleProgress = 1.0;
    } else if (current <= start) {
      scheduleProgress = 0;
    } else {
      const totalDuration = Math.max(due - start, 1);
      const elapsed = current - start;
      scheduleProgress = Math.min(Math.max(elapsed / totalDuration, 0), 1.0);
    }

    const taskPV = eff.plannedCost * scheduleProgress;
    totalPV += taskPV;

    // 2. Earned Value (EV)
    const taskEV = eff.plannedCost * ((eff.completionPercent || 0) / 100);
    totalEV += taskEV;

    // 3. Actual Cost (AC)
    totalAC += eff.actualCost || 0;
  });

  const BAC = projectBudget || tasks.reduce((sum, t) => sum + getTaskEffectiveValues(t, subtasks, stakeholders).plannedCost, 0) || 100000;

  // Avoid division by zero
  const safePV = totalPV <= 0 ? 1 : totalPV;
  const safeAC = totalAC <= 0 ? 1 : totalAC;

  const spi = Number((totalEV / safePV).toFixed(2));
  const cpi = Number((totalEV / safeAC).toFixed(2));
  const scheduleVariance = Math.round(totalEV - totalPV);
  const costVariance = Math.round(totalEV - totalAC);

  const safeCPI = cpi <= 0 ? 1 : cpi;
  const eac = Math.round(BAC / safeCPI);
  const etc = Math.max(0, eac - totalAC);

  return {
    plannedValue: Math.round(totalPV),
    earnedValue: Math.round(totalEV),
    actualCost: Math.round(totalAC),
    budgetAtCompletion: BAC,
    scheduleVariance,
    costVariance,
    spi,
    cpi,
    eac,
    etc
  };
}

export function calculateStakeholderWorkloads(
  stakeholders: Stakeholder[],
  tasks: Task[],
  subtasks: Subtask[] = []
): StakeholderWorkload[] {
  return stakeholders.map((sh) => {
    // Filter active tasks assigned to this stakeholder (via task.assigneeIds or subtask.assigneeId)
    const assignedTasks = tasks.filter((t) => {
      if (t.status === 'done') return false;
      const isTaskAssignee = t.assigneeIds && t.assigneeIds.includes(sh.id);
      const isSubtaskAssignee = subtasks.some(st => st.taskId === t.id && st.assigneeId === sh.id);
      return isTaskAssignee || isSubtaskAssignee;
    });

    const assignedHours = assignedTasks.reduce((sum, t) => {
      const taskSubtasks = subtasks.filter(st => st.taskId === t.id);
      const shSubtasks = taskSubtasks.filter(st => st.assigneeId === sh.id);

      if (taskSubtasks.length > 0 && shSubtasks.length > 0) {
        // If subtasks exist and this stakeholder is assigned to specific subtasks, use their subtasks' estimated hours
        const subtaskHours = shSubtasks.reduce((s, st) => s + (st.estimatedHours || 0), 0);
        return sum + subtaskHours;
      } else {
        const allAssignees = getTaskAllAssigneeIds(t, subtasks);
        const share = allAssignees.length > 0 ? t.estimatedHours / allAssignees.length : t.estimatedHours;
        return sum + share;
      }
    }, 0);

    const capacityHours = sh.weeklyCapacityHours || 40;
    const utilizationPercent = Math.round((assignedHours / capacityHours) * 100);

    return {
      stakeholder: sh,
      assignedHours: Math.round(assignedHours),
      capacityHours,
      utilizationPercent,
      taskCount: assignedTasks.length,
      overloaded: utilizationPercent > 100
    };
  });
}
