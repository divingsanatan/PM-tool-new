import { Task, Subtask, Milestone, Stakeholder, Feature, Epic, TaskStatus } from '../types';
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
  isPMProjectScope?: boolean;
}

export function calculateMemberMetrics(
  stakeholderId: string,
  stakeholders: Stakeholder[],
  tasks: Task[],
  subtasks: Subtask[] = [],
  milestones: Milestone[] = [],
  statusPercentages?: Partial<Record<TaskStatus, number>>,
  isProjectManagerScope: boolean = false
): MemberMetrics {
  const currentStakeholder = stakeholders.find(s => s.id === stakeholderId) || {
    id: stakeholderId,
    name: isProjectManagerScope ? 'Project Manager' : 'Team Contributor',
    email: 'member@apex.io',
    role: isProjectManagerScope ? 'Project Manager' : 'Engineer / Contributor',
    category: 'internal',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    hourlyRate: 100,
    weeklyCapacityHours: 40,
    skills: ['Engineering'],
    status: 'active'
  } as Stakeholder;

  // If this is PM Project Scope, evaluate ALL tasks belonging to the project(s) managed by the PM.
  // Otherwise, filter strictly by individual assignee ID.
  const assignedTasks = isProjectManagerScope
    ? (tasks || [])
    : (tasks || []).filter(t => t && t.assigneeIds && t.assigneeIds.includes(stakeholderId));

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

  // Exclude 'on_hold' tasks for performance and SPI/CPI timeline calculations
  const activeAssignedTasks = assignedTasks.filter(t => t.status !== 'on_hold');

  activeAssignedTasks.forEach((task) => {
    const eff = getTaskEffectiveValues(task, subtasks, stakeholders, statusPercentages);
    const assigneesCount = isProjectManagerScope ? 1 : Math.max(1, (task.assigneeIds || []).length);
    
    // Member's or Project's share of hours
    const taskEstHours = eff.estimatedHours / assigneesCount;
    const taskActHours = eff.actualHours / assigneesCount;
    const taskCompletion = (eff.completionPercent || 0) / 100;

    totalEstimatedHours += taskEstHours;
    totalActualHours += taskActHours;
    earnedHours += taskEstHours * taskCompletion;

    // Cost calculations
    const taskPlannedCost = (eff.plannedCost || (taskEstHours * (currentStakeholder.hourlyRate || 100))) / assigneesCount;
    const taskActualCost = (eff.actualCost || (taskActHours * (currentStakeholder.hourlyRate || 100))) / assigneesCount;

    // Prorated Schedule Progress for PV
    const start = task.startDate ? new Date(task.startDate).getTime() : new Date().getTime();
    const due = task.dueDate ? new Date(task.dueDate).getTime() : start + 7 * 86400000;
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

    const taskPV = taskPlannedCost * scheduleProgress;
    const taskEV = taskPlannedCost * taskCompletion;

    individualPV += taskPV;
    individualEV += taskEV;
    individualAC += taskActualCost;
  });

  // Calculate SPI, CPI, Efficiency
  const safePV = individualPV <= 0 ? (individualEV > 0 ? individualEV : 100) : individualPV;
  const safeAC = individualAC <= 0 ? (individualEV > 0 ? individualEV * 0.9 : 100) : individualAC;

  const individualSPI = activeAssignedTasks.length === 0 ? 1.0 : Number((individualEV / safePV).toFixed(2));
  const individualCPI = activeAssignedTasks.length === 0 ? 1.0 : Number((individualEV / safeAC).toFixed(2));

  const workEfficiencyPercent = totalActualHours <= 0
    ? (earnedHours > 0 ? 100 : 100)
    : Math.round((earnedHours / totalActualHours) * 100);

  const capacityHours = isProjectManagerScope 
    ? (totalEstimatedHours > 0 ? totalEstimatedHours : (currentStakeholder.weeklyCapacityHours || 40))
    : (currentStakeholder.weeklyCapacityHours || 40);
  
  const utilizationPercent = Math.round((totalActualHours / Math.max(1, capacityHours)) * 100);
  const taskCompletionPercent = activeAssignedTasks.length === 0 ? 100 : Math.round((completedTasksCount / activeAssignedTasks.length) * 100);

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

  let performanceSummary = isProjectManagerScope
    ? `[PM Governance] ${currentStakeholder.name} is governing the project deliverables at an ${reportCardGrade} level (${reportCardScore}/100) with a project SPI of ${individualSPI} and CPI of ${individualCPI}.`
    : `${currentStakeholder.name} is performing at an ${reportCardGrade} level (${reportCardScore}/100) with an SPI of ${individualSPI} and CPI of ${individualCPI}.`;
    
  if (individualSPI >= 1.0 && individualCPI >= 1.0) {
    performanceSummary = isProjectManagerScope
      ? `Outstanding Project Delivery! Projects managed by ${currentStakeholder.name} are ahead of schedule (SPI ${individualSPI}) and under budget (CPI ${individualCPI}) with ${workEfficiencyPercent}% work efficiency across ${totalAssignedTasks} deliverables.`
      : `Outstanding performance! ${currentStakeholder.name} is ahead of schedule (SPI ${individualSPI}) and under budget (CPI ${individualCPI}) with ${workEfficiencyPercent}% work efficiency.`;
  } else if (individualSPI < 1.0 && individualCPI < 1.0) {
    performanceSummary = isProjectManagerScope
      ? `Attention needed: Deliverables under ${currentStakeholder.name}'s project governance require schedule and cost optimization (SPI ${individualSPI}, CPI ${individualCPI}).`
      : `Attention needed: ${currentStakeholder.name}'s tasks require schedule and cost optimization (SPI ${individualSPI}, CPI ${individualCPI}).`;
  } else if (individualSPI >= 1.0) {
    performanceSummary = isProjectManagerScope
      ? `Excellent schedule velocity! Projects under ${currentStakeholder.name} are tracking ahead of milestone target timelines (SPI ${individualSPI}).`
      : `Excellent schedule speed! ${currentStakeholder.name} is exceeding timeline targets (SPI ${individualSPI}).`;
  } else if (individualCPI >= 1.0) {
    performanceSummary = isProjectManagerScope
      ? `Great financial governance! Project deliverables under ${currentStakeholder.name} are executing under budget baseline (CPI ${individualCPI}).`
      : `Great cost discipline! ${currentStakeholder.name} is delivering tasks under budget baseline (CPI ${individualCPI}).`;
  }

  // Assigned Milestones calculation
  const milestoneListToProcess = isProjectManagerScope && milestones.length > 0
    ? milestones
    : Array.from(new Set(assignedTasks.map(t => t.milestoneId).filter(Boolean))).map(mId => 
        milestones.find(m => m.id === mId) || {
          id: mId as string,
          title: 'Project Milestone',
          description: '',
          dueDate: todayStr,
          status: 'in_progress',
          baselineCost: 50000,
          actualCost: 40000
        } as Milestone
      );

  const assignedMilestones = milestoneListToProcess.map(milestone => {
    const mTasks = assignedTasks.filter(t => t.milestoneId === milestone.id);
    const mDone = mTasks.filter(t => t.status === 'done').length;
    const progressPercent = mTasks.length > 0 ? Math.round((mDone / mTasks.length) * 100) : (milestone.status === 'achieved' ? 100 : 50);

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
    assignedTasks,
    isPMProjectScope: isProjectManagerScope
  };
}
