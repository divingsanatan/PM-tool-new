import {
  ProjectData,
  Task,
  Stakeholder,
  UserProfile,
  MemberLeave,
  StandardRateCard,
  OrganizationSettings,
  ProjectCommercials,
  PortfolioInsight
} from '../types';
import { calculateEVMMetrics } from './evm';

export const DEFAULT_RATE_CARDS: StandardRateCard[] = [
  {
    id: 'rc-exec',
    role: 'Executive / Program Director',
    seniority: 'executive',
    standardHourlyRate: 180,
    minHourlyRate: 150,
    maxHourlyRate: 250,
    currency: 'USD'
  },
  {
    id: 'rc-pm-lead',
    role: 'Project Manager & Scrum Master',
    seniority: 'lead',
    standardHourlyRate: 120,
    minHourlyRate: 95,
    maxHourlyRate: 150,
    currency: 'USD'
  },
  {
    id: 'rc-arch-prin',
    role: 'Principal Software Architect',
    seniority: 'principal',
    standardHourlyRate: 145,
    minHourlyRate: 120,
    maxHourlyRate: 190,
    currency: 'USD'
  },
  {
    id: 'rc-eng-sr',
    role: 'Senior Full Stack Engineer',
    seniority: 'senior',
    standardHourlyRate: 110,
    minHourlyRate: 90,
    maxHourlyRate: 135,
    currency: 'USD'
  },
  {
    id: 'rc-des-lead',
    role: 'Lead UI/UX Product Designer',
    seniority: 'lead',
    standardHourlyRate: 95,
    minHourlyRate: 75,
    maxHourlyRate: 120,
    currency: 'USD'
  },
  {
    id: 'rc-qa-sr',
    role: 'DevOps & QA Automation Engineer',
    seniority: 'senior',
    standardHourlyRate: 90,
    minHourlyRate: 70,
    maxHourlyRate: 115,
    currency: 'USD'
  }
];

export const DEFAULT_ORG_SETTINGS: OrganizationSettings = {
  companyName: 'Apex Enterprise PMO Solutions',
  standardWeeklyHours: 40,
  annualLeaveDaysAllowance: 25,
  autoApproveLeavesUnderDays: 2,
  rateCards: DEFAULT_RATE_CARDS,
  fiscalYearStartMonth: 1,
  targetMarginPercent: 35,
  autoBlockAvailabilityOnLeave: true
};

export const INITIAL_LEAVES: MemberLeave[] = [
  {
    id: 'leave-1',
    userId: 'user-sh-3', // Marcus Vance
    userName: 'Marcus Vance',
    userEmail: 'marcus.v@apex.io',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    role: 'Senior Full Stack Engineer',
    leaveType: 'vacation',
    durationType: 'days',
    startDate: '2026-08-20',
    endDate: '2026-08-26',
    daysCount: 5,
    hoursCount: 40,
    status: 'approved',
    applicantRole: 'stakeholder',
    approverRoleRequired: 'pm',
    reason: 'Annual family summer vacation trip.',
    substituteUserId: 'user-sh-2',
    substituteUserName: 'Dr. Elena Rostova',
    impactedProjectIds: ['proj-1', 'proj-3'],
    createdAt: '2026-08-01T10:00:00Z',
    approvedBy: 'Sophia Martinez',
    approvedAt: '2026-08-02T14:30:00Z'
  },
  {
    id: 'leave-2',
    userId: 'user-sh-4', // Priya Sharma
    userName: 'Priya Sharma',
    userEmail: 'priya.s@apex.io',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
    role: 'Lead UI/UX Designer',
    leaveType: 'conference',
    durationType: 'days',
    startDate: '2026-08-28',
    endDate: '2026-08-30',
    daysCount: 3,
    hoursCount: 24,
    status: 'approved',
    applicantRole: 'stakeholder',
    approverRoleRequired: 'pm',
    reason: 'Keynote Speaker at Design Systems Global Summit 2026.',
    impactedProjectIds: ['proj-1'],
    createdAt: '2026-08-05T09:15:00Z',
    approvedBy: 'Sophia Martinez',
    approvedAt: '2026-08-06T11:00:00Z'
  },
  {
    id: 'leave-3',
    userId: 'user-pm-1', // Alex Morgan (PM requesting leave to Admin)
    userName: 'Alex Morgan',
    userEmail: 'alex.m@apex.io',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    role: 'Project Manager & Scrum Master',
    leaveType: 'training',
    durationType: 'days',
    startDate: '2026-09-10',
    endDate: '2026-09-12',
    daysCount: 3,
    hoursCount: 24,
    status: 'pending',
    applicantRole: 'pm',
    approverRoleRequired: 'admin',
    reason: 'Advanced PMI-ACP Agile Certified Practitioner Leadership Workshop.',
    substituteUserId: 'user-admin-1',
    substituteUserName: 'Sophia Martinez',
    impactedProjectIds: ['proj-1', 'proj-2'],
    createdAt: '2026-08-10T16:40:00Z'
  },
  {
    id: 'leave-4',
    userId: 'user-sh-5', // David Chen (Hourly leave)
    userName: 'David Chen',
    userEmail: 'david.c@apex.io',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    role: 'DevOps & QA Specialist',
    leaveType: 'sick',
    durationType: 'hours',
    timeRange: '10:00 AM - 01:00 PM',
    startDate: '2026-08-18',
    endDate: '2026-08-18',
    daysCount: 0.38,
    hoursCount: 3,
    status: 'approved',
    applicantRole: 'stakeholder',
    approverRoleRequired: 'pm',
    reason: 'Medical recovery & dental procedure (3 hours off).',
    impactedProjectIds: ['proj-1', 'proj-2', 'proj-3'],
    createdAt: '2026-08-13T08:00:00Z',
    approvedBy: 'Alex Morgan',
    approvedAt: '2026-08-13T08:30:00Z'
  },
  {
    id: 'leave-5',
    userId: 'user-pm-1', // Alex Morgan (PM applying for couple of hours off to Admin)
    userName: 'Alex Morgan',
    userEmail: 'alex.m@apex.io',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    role: 'Project Manager & Scrum Master',
    leaveType: 'vacation',
    durationType: 'hours',
    timeRange: '02:00 PM - 04:30 PM',
    startDate: '2026-08-19',
    endDate: '2026-08-19',
    daysCount: 0.31,
    hoursCount: 2.5,
    status: 'pending',
    applicantRole: 'pm',
    approverRoleRequired: 'admin',
    reason: 'School orientation & personal errand (2.5 hours off). Request submitted to Executive Admin.',
    substituteUserId: 'user-admin-1',
    substituteUserName: 'Sophia Martinez',
    impactedProjectIds: ['proj-1', 'proj-2'],
    createdAt: '2026-08-17T08:00:00Z'
  }
];

// Helper: Check if dates overlap
export function doDateRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  if (!startA || !endA || !startB || !endB) return false;
  return startA <= endB && endA >= startB;
}

// Helper: Check task vs leaves conflict
export interface TaskLeaveConflict {
  hasConflict: boolean;
  conflicts: {
    memberId: string;
    memberName: string;
    memberEmail?: string;
    leave: MemberLeave;
  }[];
}

export function checkTaskLeaveConflict(
  task: Partial<Task>,
  leaves: MemberLeave[] = [],
  stakeholders: Stakeholder[] = []
): TaskLeaveConflict {
  if (!task || !task.startDate || !task.dueDate || !task.assigneeIds || task.assigneeIds.length === 0) {
    return { hasConflict: false, conflicts: [] };
  }

  const approvedLeaves = leaves.filter(l => l.status === 'approved');
  const conflicts: TaskLeaveConflict['conflicts'] = [];

  task.assigneeIds.forEach(assigneeId => {
    // Find matching stakeholder or user
    const stakeholder = stakeholders.find(
      s => s.id === assigneeId || s.email?.toLowerCase() === assigneeId.toLowerCase()
    );
    const assigneeEmail = stakeholder?.email?.toLowerCase();
    const assigneeName = stakeholder?.name || assigneeId;

    // Find overlapping leaves
    const matchingLeaves = approvedLeaves.filter(leave => {
      const matchId = leave.userId === assigneeId || (assigneeEmail && leave.userEmail.toLowerCase() === assigneeEmail);
      if (!matchId) return false;
      return doDateRangesOverlap(task.startDate!, task.dueDate!, leave.startDate, leave.endDate);
    });

    matchingLeaves.forEach(leave => {
      conflicts.push({
        memberId: assigneeId,
        memberName: assigneeName,
        memberEmail: assigneeEmail,
        leave
      });
    });
  });

  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
}

// Helper: Check if user is on leave on a given date (YYYY-MM-DD or today)
export function isUserOnLeave(
  userIdOrEmail: string,
  leaves: MemberLeave[] = [],
  targetDate: string = new Date().toISOString().split('T')[0]
): MemberLeave | null {
  if (!userIdOrEmail) return null;
  const lower = userIdOrEmail.toLowerCase();
  const found = leaves.find(l => {
    if (l.status !== 'approved') return false;
    const matchUser = l.userId === userIdOrEmail || l.userEmail.toLowerCase() === lower;
    if (!matchUser) return false;
    return targetDate >= l.startDate && targetDate <= l.endDate;
  });
  return found || null;
}

// Helper: Get user's upcoming & active leaves
export function getUserLeaves(
  userIdOrEmail: string,
  leaves: MemberLeave[] = []
): MemberLeave[] {
  if (!userIdOrEmail) return [];
  const lower = userIdOrEmail.toLowerCase();
  return leaves.filter(
    l => l.userId === userIdOrEmail || l.userEmail.toLowerCase() === lower
  );
}

// Helper: Compute effective capacity deducting active leaves
export function calculateEffectiveWeeklyCapacity(
  baseCapacity: number,
  userIdOrEmail: string,
  leaves: MemberLeave[] = [],
  referenceWeekStart: string = new Date().toISOString().split('T')[0]
): { effectiveCapacity: number; blockedHours: number; activeLeave: MemberLeave | null } {
  const activeLeave = isUserOnLeave(userIdOrEmail, leaves, referenceWeekStart);
  if (!activeLeave) {
    return { effectiveCapacity: baseCapacity, blockedHours: 0, activeLeave: null };
  }

  // Deduct proportional hours for this leave
  const blockedHours = Math.min(baseCapacity, activeLeave.hoursCount > 0 ? activeLeave.hoursCount : 40);
  const effectiveCapacity = Math.max(0, baseCapacity - blockedHours);
  return {
    effectiveCapacity,
    blockedHours,
    activeLeave
  };
}

// Commercial Calculations per Project
export function calculateProjectCommercials(
  project: ProjectData,
  rateCards: StandardRateCard[] = DEFAULT_RATE_CARDS
): ProjectCommercials {
  const metrics = calculateEVMMetrics(
    project.tasks || [],
    project.budget || 200000,
    project.subtasks || [],
    project.stakeholders || []
  );

  const contractValue = project.budget || 200000;
  const plannedCost = metrics.plannedValue;
  const actualCost = metrics.actualCost;
  const earnedValue = metrics.earnedValue;
  const projectedCost = metrics.eac > 0 ? metrics.eac : actualCost;

  // Margin = (Contract - Projected Cost) or (EV - AC)
  const grossMarginDollars = Math.round(contractValue - projectedCost);
  const grossMarginPercent = contractValue > 0 ? Math.round((grossMarginDollars / contractValue) * 1000) / 10 : 0;

  // Calculate billable realization vs standard rate
  let totalBilledStandard = 0;
  let totalBilledActual = 0;

  (project.stakeholders || []).forEach(sh => {
    const matchingRateCard = rateCards.find(
      rc => rc.role.toLowerCase().includes(sh.role.toLowerCase()) || sh.role.toLowerCase().includes(rc.role.toLowerCase())
    );
    const standardRate = matchingRateCard?.standardHourlyRate || 100;
    const actualRate = sh.hourlyRate || 95;
    totalBilledStandard += standardRate;
    totalBilledActual += actualRate;
  });

  const billableRealizationRate = totalBilledStandard > 0
    ? Math.round((totalBilledActual / totalBilledStandard) * 100)
    : 100;

  // Find PM
  const pmStakeholder = (project.stakeholders || []).find(
    s => s.role.toLowerCase().includes('pm') || s.role.toLowerCase().includes('project manager') || s.role.toLowerCase().includes('scrum')
  );

  let profitabilityStatus: ProjectCommercials['profitabilityStatus'] = 'healthy';
  if (grossMarginPercent < 15 || metrics.cpi < 0.85) {
    profitabilityStatus = 'critical';
  } else if (grossMarginPercent < 25 || metrics.cpi < 0.95) {
    profitabilityStatus = 'at_risk';
  }

  return {
    projectId: project.id,
    projectName: project.projectName,
    projectCode: project.projectCode,
    pmName: pmStakeholder?.name || 'Assigned PM',
    pmAvatar: pmStakeholder?.avatar,
    contractValue,
    plannedCost,
    actualCost,
    earnedValue,
    projectedCost,
    grossMarginDollars,
    grossMarginPercent,
    billableRealizationRate,
    costEfficiencyIndex: metrics.cpi,
    scheduleEfficiencyIndex: metrics.spi,
    profitabilityStatus
  };
}

// Portfolio Aggregation across all projects
export function calculatePortfolioCommercials(
  projects: ProjectData[],
  rateCards: StandardRateCard[] = DEFAULT_RATE_CARDS
) {
  let totalContract = 0;
  let totalPlanned = 0;
  let totalActual = 0;
  let totalEarned = 0;
  let totalEAC = 0;
  let activeTasksCount = 0;
  let openRisksCount = 0;
  let delayedMilestonesCount = 0;
  let weightedSPI = 0;
  let weightedCPI = 0;

  const projectCommercialsList = projects.map(p => calculateProjectCommercials(p, rateCards));

  projects.forEach(p => {
    const comm = calculateProjectCommercials(p, rateCards);
    totalContract += comm.contractValue;
    totalPlanned += comm.plannedCost;
    totalActual += comm.actualCost;
    totalEarned += comm.earnedValue;
    totalEAC += comm.projectedCost;

    activeTasksCount += (p.tasks || []).filter(t => t.status !== 'done').length;
    openRisksCount += (p.raidItems || []).filter(r => r.type === 'risk' && r.status !== 'closed' && r.status !== 'mitigated').length;
    delayedMilestonesCount += (p.milestones || []).filter(m => m.status === 'delayed').length;
  });

  const portfolioMarginDollars = totalContract - totalEAC;
  const portfolioMarginPercent = totalContract > 0 ? Math.round((portfolioMarginDollars / totalContract) * 1000) / 10 : 0;
  const portfolioSPI = totalPlanned > 0 ? Math.round((totalEarned / totalPlanned) * 100) / 100 : 1.0;
  const portfolioCPI = totalActual > 0 ? Math.round((totalEarned / totalActual) * 100) / 100 : 1.0;

  return {
    totalContract,
    totalPlanned,
    totalActual,
    totalEarned,
    totalEAC,
    portfolioMarginDollars,
    portfolioMarginPercent,
    portfolioSPI,
    portfolioCPI,
    projectsCount: projects.length,
    activeTasksCount,
    openRisksCount,
    delayedMilestonesCount,
    projectCommercialsList
  };
}

// Cross-Project Member Workload & Performance Aggregation
export interface CrossProjectMemberWorkload {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  department?: string;
  standardCapacityHours: number;
  effectiveCapacityHours: number;
  blockedLeaveHours: number;
  totalAssignedHours: number;
  totalCompletedHours: number;
  assignedProjects: {
    projectId: string;
    projectName: string;
    projectCode: string;
    assignedHours: number;
    taskCount: number;
  }[];
  activeTasksCount: number;
  completedTasksCount: number;
  overdueTasksCount: number;
  onTimeDeliveryRate: number; // %
  utilizationPercent: number; // Total Assigned / Effective Capacity
  isOverallocated: boolean;
  activeLeave: MemberLeave | null;
  upcomingLeaves: MemberLeave[];
  conflictingTasksCount: number;
}

export function calculateCrossProjectWorkloads(
  projects: ProjectData[],
  allUsers: UserProfile[],
  leaves: MemberLeave[] = []
): CrossProjectMemberWorkload[] {
  const usersMap: Record<string, CrossProjectMemberWorkload> = {};

  // Initialize from all users + any unique stakeholders
  const masterUsers: { id: string; name: string; email: string; avatar: string; role: string; department?: string; capacity: number }[] = [];

  allUsers.forEach(u => {
    masterUsers.push({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      role: u.title || (u.role === 'admin' ? 'Executive Admin' : u.role === 'pm' ? 'Project Manager' : 'Team Member'),
      department: u.department || 'Engineering',
      capacity: u.weeklyCapacityHours || 40
    });
  });

  projects.forEach(p => {
    (p.stakeholders || []).forEach(sh => {
      const emailLower = sh.email?.toLowerCase();
      if (!masterUsers.some(u => u.id === sh.id || (emailLower && u.email.toLowerCase() === emailLower))) {
        masterUsers.push({
          id: sh.id,
          name: sh.name,
          email: sh.email,
          avatar: sh.avatar,
          role: sh.role,
          department: sh.category === 'internal' ? 'Engineering' : 'External Consultant',
          capacity: sh.weeklyCapacityHours || 40
        });
      }
    });
  });

  masterUsers.forEach(u => {
    const { effectiveCapacity, blockedHours, activeLeave } = calculateEffectiveWeeklyCapacity(
      u.capacity,
      u.id,
      leaves
    );
    const userAllLeaves = getUserLeaves(u.id, leaves);

    usersMap[u.id] = {
      userId: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      role: u.role,
      department: u.department,
      standardCapacityHours: u.capacity,
      effectiveCapacityHours: effectiveCapacity,
      blockedLeaveHours: blockedHours,
      totalAssignedHours: 0,
      totalCompletedHours: 0,
      assignedProjects: [],
      activeTasksCount: 0,
      completedTasksCount: 0,
      overdueTasksCount: 0,
      onTimeDeliveryRate: 100,
      utilizationPercent: 0,
      isOverallocated: false,
      activeLeave,
      upcomingLeaves: userAllLeaves.filter(l => l.status === 'approved' && l.startDate > new Date().toISOString().split('T')[0]),
      conflictingTasksCount: 0
    };
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // Aggregate across all projects
  projects.forEach(p => {
    const pStakeholders = p.stakeholders || [];
    const pTasks = p.tasks || [];

    // Map project hours per user
    const projUserHours: Record<string, { hours: number; count: number }> = {};

    pTasks.forEach(task => {
      const assignees = task.assigneeIds || [];
      const conflictCheck = checkTaskLeaveConflict(task, leaves, pStakeholders);
      const isOverdue = task.status !== 'done' && task.dueDate < todayStr;
      const isDone = task.status === 'done';

      assignees.forEach(assigneeId => {
        // Find matching master user
        const matchingSh = pStakeholders.find(s => s.id === assigneeId || s.email?.toLowerCase() === assigneeId.toLowerCase());
        const email = matchingSh?.email?.toLowerCase();

        const targetUserEntry = Object.values(usersMap).find(
          u => u.userId === assigneeId || (email && u.email.toLowerCase() === email)
        );

        if (targetUserEntry) {
          const hours = task.estimatedHours || 8;
          targetUserEntry.totalAssignedHours += hours;
          if (isDone) {
            targetUserEntry.totalCompletedHours += (task.actualHours || hours);
            targetUserEntry.completedTasksCount += 1;
          } else {
            targetUserEntry.activeTasksCount += 1;
          }
          if (isOverdue) {
            targetUserEntry.overdueTasksCount += 1;
          }
          if (conflictCheck.hasConflict) {
            targetUserEntry.conflictingTasksCount += 1;
          }

          if (!projUserHours[targetUserEntry.userId]) {
            projUserHours[targetUserEntry.userId] = { hours: 0, count: 0 };
          }
          projUserHours[targetUserEntry.userId].hours += hours;
          projUserHours[targetUserEntry.userId].count += 1;
        }
      });
    });

    Object.entries(projUserHours).forEach(([userId, data]) => {
      if (usersMap[userId]) {
        usersMap[userId].assignedProjects.push({
          projectId: p.id,
          projectName: p.projectName,
          projectCode: p.projectCode,
          assignedHours: data.hours,
          taskCount: data.count
        });
      }
    });
  });

  // Calculate final utilization & on-time delivery rate
  return Object.values(usersMap).map(member => {
    const effectiveCap = member.effectiveCapacityHours > 0 ? member.effectiveCapacityHours : 1;
    const utilization = Math.round((member.totalAssignedHours / effectiveCap) * 100);
    const totalTasks = member.completedTasksCount + member.activeTasksCount;
    const onTimeRate = totalTasks > 0
      ? Math.max(0, Math.round(((totalTasks - member.overdueTasksCount) / totalTasks) * 100))
      : 100;

    return {
      ...member,
      utilizationPercent: utilization,
      isOverallocated: utilization > 105,
      onTimeDeliveryRate: onTimeRate
    };
  });
}

// AI Auto-Suggestions & Operational Improvements Generator
export function generatePortfolioInsights(
  projects: ProjectData[],
  allUsers: UserProfile[],
  leaves: MemberLeave[] = []
): PortfolioInsight[] {
  const insights: PortfolioInsight[] = [];
  const workloads = calculateCrossProjectWorkloads(projects, allUsers, leaves);
  const portfolioComm = calculatePortfolioCommercials(projects);

  // 1. Cross-Project Over-Allocation Bottlenecks
  workloads.forEach(member => {
    if (member.isOverallocated && member.assignedProjects.length > 1) {
      insights.push({
        id: `ins-overalloc-${member.userId}`,
        type: 'resource_bottleneck',
        severity: member.utilizationPercent > 130 ? 'critical' : 'warning',
        title: `Cross-Project Over-Allocation: ${member.name}`,
        description: `${member.name} is assigned ${member.totalAssignedHours}h across ${member.assignedProjects.length} active projects (${member.assignedProjects.map(p => p.projectCode).join(', ')}), operating at ${member.utilizationPercent}% capacity.`,
        recommendation: `Rebalance non-critical tasks from ${member.assignedProjects[0]?.projectCode || 'active project'} to under-utilized team members to prevent delivery burnout.`,
        impactMetric: `${member.utilizationPercent}% Capacity Utilization (${member.totalAssignedHours}h / ${member.effectiveCapacityHours}h)`,
        affectedMemberId: member.userId,
        affectedMemberName: member.name,
        actionType: 'rebalance_workload',
        createdAt: new Date().toISOString()
      });
    }

    // 2. Availability & Leave Conflicts
    if (member.conflictingTasksCount > 0 && member.activeLeave) {
      insights.push({
        id: `ins-leave-conf-${member.userId}`,
        type: 'availability_conflict',
        severity: 'critical',
        title: `Active Leave Task Conflict: ${member.name}`,
        description: `${member.name} has ${member.conflictingTasksCount} task(s) scheduled during approved ${member.activeLeave.leaveType} (${member.activeLeave.startDate} to ${member.activeLeave.endDate}).`,
        recommendation: `Automatically reassign conflicting tasks to designated substitute (${member.activeLeave.substituteUserName || 'an available peer'}) or shift schedule baseline.`,
        impactMetric: `${member.conflictingTasksCount} Conflicting Tasks Blocked`,
        affectedMemberId: member.userId,
        affectedMemberName: member.name,
        actionType: 'reassign_task',
        actionPayload: { memberId: member.userId, leave: member.activeLeave },
        createdAt: new Date().toISOString()
      });
    }
  });

  // 3. Project Commercial & Margin Slips
  portfolioComm.projectCommercialsList.forEach(comm => {
    if (comm.costEfficiencyIndex < 0.90 && comm.actualCost > 5000) {
      insights.push({
        id: `ins-cost-slip-${comm.projectId}`,
        type: 'cost_overrun',
        severity: comm.costEfficiencyIndex < 0.80 ? 'critical' : 'warning',
        title: `Cost Variance Warning: ${comm.projectName}`,
        description: `${comm.projectName} (${comm.projectCode}) is running at a CPI of ${comm.costEfficiencyIndex.toFixed(2)}, projecting an EAC of $${comm.projectedCost.toLocaleString()} against contracted budget of $${comm.contractValue.toLocaleString()}.`,
        recommendation: `Conduct an immediate CCB budget review, freeze unapproved scope changes, and review external billing rates.`,
        impactMetric: `-$${Math.abs(comm.grossMarginDollars).toLocaleString()} Profit Variance (CPI: ${comm.costEfficiencyIndex.toFixed(2)})`,
        affectedProjectId: comm.projectId,
        affectedProjectName: comm.projectName,
        actionType: 'hedge_budget',
        createdAt: new Date().toISOString()
      });
    }

    if (comm.scheduleEfficiencyIndex < 0.88) {
      insights.push({
        id: `ins-sched-slip-${comm.projectId}`,
        type: 'schedule_delay',
        severity: comm.scheduleEfficiencyIndex < 0.80 ? 'critical' : 'warning',
        title: `Schedule Slippage Detected: ${comm.projectName}`,
        description: `SPI has dropped to ${comm.scheduleEfficiencyIndex.toFixed(2)} in ${comm.projectCode}. Planned Earned Value is lagging behind schedule baseline.`,
        recommendation: `Fast-track critical path tasks, activate sprint scope buffer, and review dependency blockers in Gantt view.`,
        impactMetric: `SPI ${comm.scheduleEfficiencyIndex.toFixed(2)} (Schedule Variance: Lagging)`,
        affectedProjectId: comm.projectId,
        affectedProjectName: comm.projectName,
        actionType: 'schedule_catchup',
        createdAt: new Date().toISOString()
      });
    }
  });

  // 4. Commercial Opportunity: Healthy Projects with Margin Headroom
  portfolioComm.projectCommercialsList.forEach(comm => {
    if (comm.costEfficiencyIndex >= 1.05 && comm.scheduleEfficiencyIndex >= 1.0) {
      insights.push({
        id: `ins-comm-opp-${comm.projectId}`,
        type: 'commercial_opportunity',
        severity: 'success',
        title: `High Profitability Margin: ${comm.projectName}`,
        description: `${comm.projectCode} is operating at peak commercial efficiency (CPI ${comm.costEfficiencyIndex.toFixed(2)}, SPI ${comm.scheduleEfficiencyIndex.toFixed(2)}) with projected margin of ${comm.grossMarginPercent}%.`,
        recommendation: `Template this execution model for future SOWs and consider deploying senior contributors as mentors to lagging initiatives.`,
        impactMetric: `+${comm.grossMarginPercent}% Gross Margin Realized ($${comm.grossMarginDollars.toLocaleString()})`,
        affectedProjectId: comm.projectId,
        affectedProjectName: comm.projectName,
        createdAt: new Date().toISOString()
      });
    }
  });

  return insights;
}

// ---------------------------------------------------------------------------
// 👔 EXECUTIVE PM PERFORMANCE & CROSS-PROJECT ACCOUNTABILITY
// ---------------------------------------------------------------------------

export interface ManagedProjectSummary {
  projectId: string;
  projectName: string;
  projectCode: string;
  description: string;
  budget: number;
  startDate: string;
  targetEndDate: string;
  health: 'on_track' | 'at_risk' | 'critical';
  spi: number;
  cpi: number;
  evm: {
    plannedValue: number;
    earnedValue: number;
    actualCost: number;
    eac: number;
  };
  completionPercent: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  openRisksCount: number;
  criticalRisksCount: number;
  openIssuesCount: number;
  pendingCRsCount: number;
  milestonesTotal: number;
  milestonesAchieved: number;
  milestonesDelayed: number;
  teamSize: number;
}

export interface CrossProjectPMPerformance {
  pmId: string;
  name: string;
  email: string;
  avatar: string;
  title: string;
  department: string;
  role: 'pm' | 'admin';
  hourlyRate: number;
  weeklyCapacityHours: number;
  skills: string[];

  // Projects Managed
  managedProjects: ManagedProjectSummary[];

  // Aggregates
  totalProjectsCount: number;
  totalBudgetManaged: number;
  totalTeamMembersCount: number;

  // Aggregate EVM & Composite Health
  aggregateSPI: number;
  aggregateCPI: number;
  totalPlannedValue: number;
  totalEarnedValue: number;
  totalActualCost: number;
  totalEAC: number;
  compositeHealthScore: number; // 0 - 100
  overallStatus: 'on_track' | 'at_risk' | 'critical';

  // Task & Delivery Velocity
  totalTasksManaged: number;
  completedTasksManaged: number;
  inProgressTasksManaged: number;
  reviewTasksManaged: number;
  todoTasksManaged: number;
  blockedTasksManaged: number;
  overdueTasksManaged: number;
  taskCompletionRate: number; // %
  totalEstimatedHours: number;
  totalActualHours: number;
  totalEarnedHours: number;

  // Milestones & Governance
  totalMilestones: number;
  achievedMilestones: number;
  delayedMilestones: number;
  milestoneSuccessRate: number; // %

  // Risk Exposure & Escalations
  totalRisks: number;
  criticalRisks: number;
  openIssues: number;
  pendingChangeRequests: number;

  // Leave & Availability
  isOnLeave: boolean;
  activeLeave: MemberLeave | null;
  upcomingLeaves: MemberLeave[];
}

export function calculateCrossProjectPMPerformance(
  projects: ProjectData[],
  allUsers: UserProfile[],
  leaves: MemberLeave[] = []
): CrossProjectPMPerformance[] {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Identify all PMs in the organization (strictly exclude Admin users)
  const adminEmails = new Set(
    allUsers.filter(u => u.role === 'admin').map(u => u.email.toLowerCase())
  );
  adminEmails.add('admin@apex.io');
  adminEmails.add('sarah.c@apex.io');

  const pmUsersList: UserProfile[] = [];
  const seenIds = new Set<string>();

  // Add only users with explicit PM role (never Admin)
  allUsers.forEach(u => {
    if (u.role === 'pm' && !seenIds.has(u.id) && !adminEmails.has(u.email.toLowerCase())) {
      seenIds.add(u.id);
      pmUsersList.push(u);
    }
  });

  // Also scan project stakeholders for any PM roles if not in allUsers
  projects.forEach(p => {
    (p.stakeholders || []).forEach(sh => {
      const emailLower = (sh.email || '').toLowerCase();
      if (adminEmails.has(emailLower) || sh.id === 'sh-admin' || (sh.role || '').toLowerCase().includes('admin')) {
        return;
      }

      const isPMRole = sh.role.toLowerCase().includes('project manager') ||
        sh.role.toLowerCase().includes('scrum master') ||
        sh.role.toLowerCase().includes('lead pm') ||
        sh.role.toLowerCase().includes('program director');
      if (isPMRole && !seenIds.has(sh.id)) {
        seenIds.add(sh.id);
        pmUsersList.push({
          id: sh.id,
          name: sh.name,
          email: sh.email,
          role: 'pm',
          title: sh.role,
          avatar: sh.avatar,
          department: 'PMO',
          hourlyRate: sh.hourlyRate || 95,
          weeklyCapacityHours: sh.weeklyCapacityHours || 40,
          skills: sh.skills || ['Agile', 'Scrum', 'Risk Management']
        });
      }
    });
  });

  // Fallback if no PM found: add Alex Morgan and Carlos Santana
  if (pmUsersList.length === 0) {
    pmUsersList.push({
      id: 'user-pm-1',
      name: 'Alex Morgan',
      email: 'alex.m@apex.io',
      role: 'pm',
      title: 'Project Manager & Scrum Master',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
      department: 'PMO',
      hourlyRate: 95,
      weeklyCapacityHours: 40,
      skills: ['Agile', 'Scrum', 'EVM']
    });
  }

  // 2. Map Projects to PMs
  return pmUsersList.map(pm => {
    const isUserAdmin = pm.role === 'admin';

    // Find projects managed by this PM
    // A project is managed by PM if:
    // a) Stakeholder list has PM user as lead/pm
    // b) Or if admin, they oversee projects (or specific projects mapped)
    const managedProjects: ManagedProjectSummary[] = [];
    const uniqueTeamMemberIds = new Set<string>();

    projects.forEach((proj, idx) => {
      const isLeadOnProject = (proj.stakeholders || []).some(
        s => (s.id === pm.id || s.email.toLowerCase() === pm.email.toLowerCase()) &&
             (s.role.toLowerCase().includes('manager') || s.role.toLowerCase().includes('master') || s.role.toLowerCase().includes('lead') || s.role.toLowerCase().includes('director') || s.role.toLowerCase().includes('pm'))
      );

      // If PM is explicit lead, OR if fallback round-robin assignment based on PM count
      let shouldInclude = isLeadOnProject;
      if (!shouldInclude && !isUserAdmin) {
        // If this PM has no projects yet and this project has no other PM, map it
        const hasOtherExplicitPM = (proj.stakeholders || []).some(
          s => s.id !== pm.id && s.email.toLowerCase() !== pm.email.toLowerCase() &&
               (s.role.toLowerCase().includes('manager') || s.role.toLowerCase().includes('master') || s.role.toLowerCase().includes('pm'))
        );
        if (!hasOtherExplicitPM && idx % pmUsersList.length === pmUsersList.indexOf(pm)) {
          shouldInclude = true;
        }
      }

      // For admin (e.g. Sophia Martinez), if they oversee governance across projects or specific flag
      if (isUserAdmin && projects.length > 0) {
        // Admin oversees all or assigned projects
        shouldInclude = isLeadOnProject || idx === 0 || idx === 2;
      }

      if (shouldInclude) {
        const evm = calculateEVMMetrics(
          proj.tasks || [],
          proj.budget || 200000,
          proj.subtasks || [],
          proj.stakeholders || []
        );

        const tasks = proj.tasks || [];
        const completedTasks = tasks.filter(t => t.status === 'done').length;
        const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
        const blockedTasks = tasks.filter(t => t.status === 'blocked').length;
        const overdueTasks = tasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < todayStr).length;
        const completionPct = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

        const raidItems = proj.raidItems || [];
        const openRisks = raidItems.filter(r => r.type === 'risk' && r.status !== 'closed');
        const criticalRisks = openRisks.filter(r => r.severity === 'critical' || (r.riskScore && r.riskScore >= 12)).length;
        const openIssues = raidItems.filter(r => r.type === 'issue' && r.status !== 'closed').length;
        const pendingCRs = (proj.changeRequests || []).filter(c => c.status === 'submitted' || c.status === 'under_review').length;

        const milestones = proj.milestones || [];
        const achievedMs = milestones.filter(m => m.status === 'achieved').length;
        const delayedMs = milestones.filter(m => m.status === 'delayed' || (m.status !== 'achieved' && m.dueDate && m.dueDate < todayStr)).length;

        (proj.stakeholders || []).forEach(s => uniqueTeamMemberIds.add(s.id));

        // Determine project health
        let health: 'on_track' | 'at_risk' | 'critical' = 'on_track';
        if (evm.spi < 0.85 || evm.cpi < 0.85 || criticalRisks > 1 || blockedTasks > 2) {
          health = 'critical';
        } else if (evm.spi < 0.95 || evm.cpi < 0.92 || criticalRisks > 0 || delayedMs > 0) {
          health = 'at_risk';
        }

        managedProjects.push({
          projectId: proj.id,
          projectName: proj.projectName,
          projectCode: proj.projectCode,
          description: proj.description,
          budget: proj.budget,
          startDate: proj.startDate,
          targetEndDate: proj.targetEndDate,
          health,
          spi: evm.spi,
          cpi: evm.cpi,
          evm: {
            plannedValue: evm.plannedValue,
            earnedValue: evm.earnedValue,
            actualCost: evm.actualCost,
            eac: evm.eac
          },
          completionPercent: completionPct,
          totalTasks: tasks.length,
          completedTasks,
          inProgressTasks,
          blockedTasks,
          overdueTasks,
          openRisksCount: openRisks.length,
          criticalRisksCount: criticalRisks,
          openIssuesCount: openIssues,
          pendingCRsCount: pendingCRs,
          milestonesTotal: milestones.length,
          milestonesAchieved: achievedMs,
          milestonesDelayed: delayedMs,
          teamSize: (proj.stakeholders || []).length
        });
      }
    });

    // If PM has no assigned projects yet, assign the primary project as default view
    if (managedProjects.length === 0 && projects.length > 0) {
      const defaultProj = projects[0];
      const evm = calculateEVMMetrics(defaultProj.tasks || [], defaultProj.budget || 200000, defaultProj.subtasks || [], defaultProj.stakeholders || []);
      const tasks = defaultProj.tasks || [];
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      managedProjects.push({
        projectId: defaultProj.id,
        projectName: defaultProj.projectName,
        projectCode: defaultProj.projectCode,
        description: defaultProj.description,
        budget: defaultProj.budget,
        startDate: defaultProj.startDate,
        targetEndDate: defaultProj.targetEndDate,
        health: 'on_track',
        spi: evm.spi,
        cpi: evm.cpi,
        evm: {
          plannedValue: evm.plannedValue,
          earnedValue: evm.earnedValue,
          actualCost: evm.actualCost,
          eac: evm.eac
        },
        completionPercent: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
        totalTasks: tasks.length,
        completedTasks,
        inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
        blockedTasks: tasks.filter(t => t.status === 'blocked').length,
        overdueTasks: tasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < todayStr).length,
        openRisksCount: (defaultProj.raidItems || []).filter(r => r.type === 'risk').length,
        criticalRisksCount: 0,
        openIssuesCount: (defaultProj.raidItems || []).filter(r => r.type === 'issue').length,
        pendingCRsCount: (defaultProj.changeRequests || []).filter(c => c.status === 'submitted').length,
        milestonesTotal: (defaultProj.milestones || []).length,
        milestonesAchieved: (defaultProj.milestones || []).filter(m => m.status === 'achieved').length,
        milestonesDelayed: 0,
        teamSize: (defaultProj.stakeholders || []).length
      });
    }

    // Combined PM Metrics
    const totalProjectsCount = managedProjects.length;
    const totalBudgetManaged = managedProjects.reduce((sum, p) => sum + p.budget, 0);
    const totalPlannedValue = managedProjects.reduce((sum, p) => sum + p.evm.plannedValue, 0);
    const totalEarnedValue = managedProjects.reduce((sum, p) => sum + p.evm.earnedValue, 0);
    const totalActualCost = managedProjects.reduce((sum, p) => sum + p.evm.actualCost, 0);
    const totalEAC = managedProjects.reduce((sum, p) => sum + p.evm.eac, 0);

    const aggregateSPI = totalPlannedValue > 0 ? Math.round((totalEarnedValue / totalPlannedValue) * 100) / 100 : 1.0;
    const aggregateCPI = totalActualCost > 0 ? Math.round((totalEarnedValue / totalActualCost) * 100) / 100 : 1.0;

    const totalTasksManaged = managedProjects.reduce((sum, p) => sum + p.totalTasks, 0);
    const completedTasksManaged = managedProjects.reduce((sum, p) => sum + p.completedTasks, 0);
    const inProgressTasksManaged = managedProjects.reduce((sum, p) => sum + p.inProgressTasks, 0);
    const blockedTasksManaged = managedProjects.reduce((sum, p) => sum + p.blockedTasks, 0);
    const overdueTasksManaged = managedProjects.reduce((sum, p) => sum + p.overdueTasks, 0);
    const taskCompletionRate = totalTasksManaged > 0 ? Math.round((completedTasksManaged / totalTasksManaged) * 100) : 0;

    // Collect all tasks across this PM's managed projects to compute hours & statuses
    let pmEstimatedHours = 0;
    let pmActualHours = 0;
    let pmEarnedHours = 0;
    let pmTodoTasks = 0;
    let pmReviewTasks = 0;

    projects.forEach(proj => {
      const isManagedByThisPM = managedProjects.some(mp => mp.projectId === proj.id);
      if (isManagedByThisPM) {
        (proj.tasks || []).forEach(t => {
          const est = t.estimatedHours || 0;
          const act = t.actualHours || 0;
          const comp = (t.completionPercent || 0) / 100;
          pmEstimatedHours += est;
          pmActualHours += act;
          pmEarnedHours += Math.round(est * comp * 10) / 10;

          if (t.status === 'todo') pmTodoTasks++;
          if (t.status === 'review') pmReviewTasks++;
        });
      }
    });

    const totalMilestones = managedProjects.reduce((sum, p) => sum + p.milestonesTotal, 0);
    const achievedMilestones = managedProjects.reduce((sum, p) => sum + p.milestonesAchieved, 0);
    const delayedMilestones = managedProjects.reduce((sum, p) => sum + p.milestonesDelayed, 0);
    const milestoneSuccessRate = totalMilestones > 0 ? Math.round((achievedMilestones / totalMilestones) * 100) : 100;

    const totalRisks = managedProjects.reduce((sum, p) => sum + p.openRisksCount, 0);
    const criticalRisks = managedProjects.reduce((sum, p) => sum + p.criticalRisksCount, 0);
    const openIssues = managedProjects.reduce((sum, p) => sum + p.openIssuesCount, 0);
    const pendingChangeRequests = managedProjects.reduce((sum, p) => sum + p.pendingCRsCount, 0);

    // Compute composite PM Health Score (0 - 100)
    // 30% SPI, 30% CPI, 20% Task Completion, 10% Milestone Success, -5% per critical risk/blocker
    let spiScore = Math.min(100, Math.max(0, aggregateSPI * 100));
    let cpiScore = Math.min(100, Math.max(0, aggregateCPI * 100));
    let composite = Math.round(
      spiScore * 0.30 +
      cpiScore * 0.30 +
      taskCompletionRate * 0.20 +
      milestoneSuccessRate * 0.20 -
      (criticalRisks * 5) -
      (blockedTasksManaged * 4) -
      (overdueTasksManaged * 3)
    );
    composite = Math.max(20, Math.min(100, composite));

    let overallStatus: 'on_track' | 'at_risk' | 'critical' = 'on_track';
    if (composite < 65 || aggregateSPI < 0.85 || aggregateCPI < 0.85 || criticalRisks > 2) {
      overallStatus = 'critical';
    } else if (composite < 80 || aggregateSPI < 0.94 || aggregateCPI < 0.92 || criticalRisks > 0 || delayedMilestones > 0) {
      overallStatus = 'at_risk';
    }

    // Leaves for PM
    const userLeaves = leaves.filter(l => (l.userId === pm.id || l.userEmail.toLowerCase() === pm.email.toLowerCase()) && l.status === 'approved');
    const activeLeave = userLeaves.find(l => todayStr >= l.startDate && todayStr <= l.endDate) || null;
    const upcomingLeaves = userLeaves.filter(l => l.startDate > todayStr);

    return {
      pmId: pm.id,
      name: pm.name,
      email: pm.email,
      avatar: pm.avatar,
      title: pm.title,
      department: pm.department || 'PMO',
      role: pm.role as 'pm' | 'admin',
      hourlyRate: pm.hourlyRate || 95,
      weeklyCapacityHours: pm.weeklyCapacityHours || 40,
      skills: pm.skills || ['Agile', 'Scrum', 'Leadership'],
      managedProjects,
      totalProjectsCount,
      totalBudgetManaged,
      totalTeamMembersCount: uniqueTeamMemberIds.size,
      aggregateSPI,
      aggregateCPI,
      totalPlannedValue,
      totalEarnedValue,
      totalActualCost,
      totalEAC,
      compositeHealthScore: composite,
      overallStatus,
      totalTasksManaged,
      completedTasksManaged,
      inProgressTasksManaged,
      reviewTasksManaged: pmReviewTasks,
      todoTasksManaged: pmTodoTasks,
      blockedTasksManaged,
      overdueTasksManaged,
      taskCompletionRate,
      totalEstimatedHours: pmEstimatedHours,
      totalActualHours: pmActualHours,
      totalEarnedHours: pmEarnedHours,
      totalMilestones,
      achievedMilestones,
      delayedMilestones,
      milestoneSuccessRate,
      totalRisks,
      criticalRisks,
      openIssues,
      pendingChangeRequests,
      isOnLeave: !!activeLeave,
      activeLeave,
      upcomingLeaves
    };
  });
}
