import { Task, Subtask, Milestone, Stakeholder, Feature, Epic } from '../types';
import { getTaskEffectiveValues } from './taskCalculations';

export interface MemberMetrics {
  stakeholder: Stakeholder;
  totalAssignedTasks: number;
  completedTasksCount: number;
  inProgressTasksCount: number;
  todoTasksCount: number;
  blockedTasksCount: number;
  reviewTasksCount: number;
  
  totalEstimatedHours: number;
  totalActualHours: number;
  earnedHours: number;
  utilizationPercent: number;
  workEfficiencyPercent: number; // (earnedHours / actualHours) * 100
  
  individualPV: number; // Planned Value ($)
  individualEV: number; // Earned Value ($)
  individualAC: number; // Actual Cost ($)
  individualSPI: number; // EV / PV
  individualCPI: number; // EV / AC
  
  taskCompletionPercent: number; // (completedTasks / totalAssignedTasks) * 100
  
  reportCardScore: number; // 0 - 100
  reportCardGrade: string; // 'A+', 'A', 'B+', 'B', 'C', etc.
  performanceSummary: string;
  
  assignedMilestones: {
    milestone: Milestone;
    assignedTaskCount: number;
    completedTaskCount: number;
    progressPercent: number;
  }[];
  
  assignedTasks: Task[];
}

export function calculateMemberMetrics(
  stakeholderId: string,
  stakeholders: Stakeholder[],
  tasks: Task[],
  subtasks: Subtask[] = [],
  milestones: Milestone[] = []
): MemberMetrics {
  const currentStakeholder = stakeholders.find(s => s.id === stakeholderId) || {
    id: stakeholderId,
    name: 'Team Contributor',
    email: 'member@apex.io',
    role: 'Engineer / Contributor',
    category: 'internal',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    hourlyRate: 100,
    weeklyCapacityHours: 40,
    skills: ['Engineering'],
    status: 'active'
  } as Stakeholder;

  // Filter tasks assigned to this stakeholder
  const assignedTasks = tasks.filter(t => t.assigneeIds && t.assigneeIds.includes(stakeholderId));

  const totalAssignedTasks = assignedTasks.length;
  const completedTasksCount = assignedTasks.filter(t => t.status === 'done').length;
  const inProgressTasksCount = assignedTasks.filter(t => t.status === 'in_progress').length;
  const todoTasksCount = assignedTasks.filter(t => t.status === 'todo').length;
  const blockedTasksCount = assignedTasks.filter(t => t.status === 'blocked').length;
  const reviewTasksCount = assignedTasks.filter(t => t.status === 'review').length;

  const todayStr = new Date().toISOString().split('T')[0];

  let totalEstimatedHours = 0;
  let totalActualHours = 0;
  let earnedHours = 0;

  let individualPV = 0;
  let individualEV = 0;
  let individualAC = 0;

  assignedTasks.forEach((task) => {
    const eff = getTaskEffectiveValues(task, subtasks, stakeholders);
    const assigneesCount = Math.max(1, task.assigneeIds.length);
    
    // Member's share of hours
    const memberEstHours = eff.estimatedHours / assigneesCount;
    const memberActHours = eff.actualHours / assigneesCount;
    const memberCompletion = (eff.completionPercent || 0) / 100;

    totalEstimatedHours += memberEstHours;
    totalActualHours += memberActHours;
    earnedHours += memberEstHours * memberCompletion;

    // Cost calculations
    const memberPlannedCost = (eff.plannedCost || (memberEstHours * (currentStakeholder.hourlyRate || 100))) / assigneesCount;
    const memberActualCost = (eff.actualCost || (memberActHours * (currentStakeholder.hourlyRate || 100))) / assigneesCount;

    // Prorated Schedule Progress for PV
    const start = new Date(task.startDate).getTime();
    const due = new Date(task.dueDate).getTime();
    const current = new Date(todayStr).getTime();

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

    const taskPV = memberPlannedCost * scheduleProgress;
    const taskEV = memberPlannedCost * memberCompletion;

    individualPV += taskPV;
    individualEV += taskEV;
    individualAC += memberActualCost;
  });

  // Calculate SPI, CPI, Efficiency
  const safePV = individualPV <= 0 ? (individualEV > 0 ? individualEV : 100) : individualPV;
  const safeAC = individualAC <= 0 ? (individualEV > 0 ? individualEV * 0.9 : 100) : individualAC;

  const individualSPI = totalAssignedTasks === 0 ? 1.0 : Number((individualEV / safePV).toFixed(2));
  const individualCPI = totalAssignedTasks === 0 ? 1.0 : Number((individualEV / safeAC).toFixed(2));

  const workEfficiencyPercent = totalActualHours <= 0
    ? (earnedHours > 0 ? 100 : 100)
    : Math.round((earnedHours / totalActualHours) * 100);

  const capacityHours = currentStakeholder.weeklyCapacityHours || 40;
  const utilizationPercent = Math.round((totalActualHours / capacityHours) * 100);
  const taskCompletionPercent = totalAssignedTasks === 0 ? 100 : Math.round((completedTasksCount / totalAssignedTasks) * 100);

  // Compute Report Card Grade (0 to 100)
  // Weights: SPI (25%), CPI (25%), Task Completion % (30%), Work Efficiency % (20%)
  const spiScore = Math.min(100, Math.max(40, individualSPI * 85));
  const cpiScore = Math.min(100, Math.max(40, individualCPI * 85));
  const compScore = taskCompletionPercent;
  const effScore = Math.min(100, Math.max(40, workEfficiencyPercent));

  let reportCardScore = Math.round(spiScore * 0.25 + cpiScore * 0.25 + compScore * 0.30 + effScore * 0.20);
  if (totalAssignedTasks === 0) reportCardScore = 95;

  let reportCardGrade = 'A+';
  if (reportCardScore >= 93) reportCardGrade = 'A+';
  else if (reportCardScore >= 88) reportCardGrade = 'A';
  else if (reportCardScore >= 82) reportCardGrade = 'B+';
  else if (reportCardScore >= 75) reportCardGrade = 'B';
  else if (reportCardScore >= 68) reportCardGrade = 'C+';
  else reportCardGrade = 'C';

  let performanceSummary = `${currentStakeholder.name} is performing at an ${reportCardGrade} level (${reportCardScore}/100) with an SPI of ${individualSPI} and CPI of ${individualCPI}.`;
  if (individualSPI >= 1.0 && individualCPI >= 1.0) {
    performanceSummary = `Outstanding performance! ${currentStakeholder.name} is ahead of schedule (SPI ${individualSPI}) and under budget (CPI ${individualCPI}) with ${workEfficiencyPercent}% work efficiency.`;
  } else if (individualSPI < 1.0 && individualCPI < 1.0) {
    performanceSummary = `Attention needed: ${currentStakeholder.name}'s tasks require schedule and cost optimization (SPI ${individualSPI}, CPI ${individualCPI}).`;
  } else if (individualSPI >= 1.0) {
    performanceSummary = `Excellent schedule speed! ${currentStakeholder.name} is exceeding timeline targets (SPI ${individualSPI}).`;
  } else if (individualCPI >= 1.0) {
    performanceSummary = `Great cost discipline! ${currentStakeholder.name} is delivering tasks under budget baseline (CPI ${individualCPI}).`;
  }

  // Assigned Milestones calculation
  const assignedMilestoneIds = Array.from(new Set(assignedTasks.map(t => t.milestoneId).filter(Boolean))) as string[];
  const assignedMilestones = assignedMilestoneIds.map(mId => {
    const milestone = milestones.find(m => m.id === mId) || {
      id: mId,
      title: 'Project Milestone',
      description: '',
      dueDate: todayStr,
      status: 'in_progress',
      baselineCost: 50000,
      actualCost: 40000
    } as Milestone;

    const mTasks = assignedTasks.filter(t => t.milestoneId === mId);
    const mDone = mTasks.filter(t => t.status === 'done').length;
    const progressPercent = mTasks.length > 0 ? Math.round((mDone / mTasks.length) * 100) : 0;

    return {
      milestone,
      assignedTaskCount: mTasks.length,
      completedTaskCount: mDone,
      progressPercent
    };
  });

  return {
    stakeholder: currentStakeholder,
    totalAssignedTasks,
    completedTasksCount,
    inProgressTasksCount,
    todoTasksCount,
    blockedTasksCount,
    reviewTasksCount,
    totalEstimatedHours: Math.round(totalEstimatedHours * 10) / 10,
    totalActualHours: Math.round(totalActualHours * 10) / 10,
    earnedHours: Math.round(earnedHours * 10) / 10,
    utilizationPercent,
    workEfficiencyPercent,
    individualPV: Math.round(individualPV),
    individualEV: Math.round(individualEV),
    individualAC: Math.round(individualAC),
    individualSPI,
    individualCPI,
    taskCompletionPercent,
    reportCardScore,
    reportCardGrade,
    performanceSummary,
    assignedMilestones,
    assignedTasks
  };
}
