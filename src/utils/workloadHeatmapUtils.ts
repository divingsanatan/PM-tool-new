import { Task, Subtask, Stakeholder, MemberLeave, ProjectData, Sprint } from '../types';

export interface WeekSlot {
  weekIndex: number; // 0, 1, 2, 3
  weekNumber: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;     // e.g. "Aug 25 - Aug 31"
  shortLabel: string; // e.g. "W1: Aug 25-31"
  isCurrentWeek: boolean;
}

export type CapacityLoadLevel = 
  | 'critical'   // > 120%
  | 'overloaded' // 101% - 120%
  | 'heavy'      // 85% - 100%
  | 'optimal'    // 50% - 84%
  | 'light'      // 1% - 49%
  | 'empty'      // 0%
  | 'leave';     // Effective capacity = 0 due to leave

export interface TaskAllocationItem {
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  taskPriority: string;
  sprintName?: string;
  allocatedHoursThisWeek: number;
  totalTaskHours: number;
  taskStartDate: string;
  taskDueDate: string;
}

export interface MemberWeeklyLoad {
  weekIndex: number;
  weekSlot: WeekSlot;
  baseCapacityHours: number;
  blockedLeaveHours: number;
  effectiveCapacityHours: number;
  assignedHours: number;
  utilizationPercent: number;
  varianceHours: number; // assigned - effectiveCapacity (positive = over, negative = surplus)
  isBottleneck: boolean;
  loadLevel: CapacityLoadLevel;
  taskAllocations: TaskAllocationItem[];
  leavesInWeek: MemberLeave[];
}

export interface Member4WeekHeatmap {
  stakeholder: Stakeholder;
  weeklyLoads: MemberWeeklyLoad[];
  totalAssignedHours: number;
  totalEffectiveCapacity: number;
  averageUtilization: number;
  peakUtilization: number;
  peakWeekIndex: number;
  hasBottleneck: boolean;
  bottleneckWeeksCount: number;
}

export interface RebalancingSuggestion {
  id: string;
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  taskId: string;
  taskTitle: string;
  weekIndex: number;
  weekLabel: string;
  hoursToMove: number;
  fromOldUtil: number;
  fromNewUtil: number;
  toOldUtil: number;
  toNewUtil: number;
  reason: string;
}

export interface TeamHeatmapSummary {
  weekSlots: WeekSlot[];
  members: Member4WeekHeatmap[];
  teamWeeklyTotals: Array<{
    weekSlot: WeekSlot;
    totalAssignedHours: number;
    totalEffectiveCapacity: number;
    averageUtilization: number;
    bottleneckMembersCount: number;
    overallocatedHours: number;
    isTeamOverCapacity: boolean;
  }>;
  totalBottleneckMembersCount: number;
  mostConstrainedWeek: WeekSlot | null;
  overallTeamUtilization: number;
  rebalancingSuggestions: RebalancingSuggestion[];
}

/**
 * Helper: Formats Date to YYYY-MM-DD in local time
 */
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper: Computes the start of the week (Monday) for a given date
 */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Helper: Computes ISO week number
 */
function getWeekNumber(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

/**
 * Generates 4 consecutive week slots starting from a given anchor date
 */
export function generate4WeekSlots(anchorDate: Date = new Date()): WeekSlot[] {
  const monday = getMonday(anchorDate);
  const todayStr = formatDate(new Date());
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const slots: WeekSlot[] = [];

  for (let i = 0; i < 4; i++) {
    const start = new Date(monday);
    start.setDate(monday.getDate() + (i * 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startStr = formatDate(start);
    const endStr = formatDate(end);
    const isCurrent = todayStr >= startStr && todayStr <= endStr;

    const startMonth = monthNames[start.getMonth()];
    const endMonth = monthNames[end.getMonth()];
    const dateRangeLabel = startMonth === endMonth
      ? `${startMonth} ${start.getDate()} - ${end.getDate()}`
      : `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`;

    slots.push({
      weekIndex: i,
      weekNumber: getWeekNumber(start),
      startDate: startStr,
      endDate: endStr,
      label: `Week ${i + 1} (${dateRangeLabel})`,
      shortLabel: `W${i + 1}: ${startMonth} ${start.getDate()}–${end.getDate()}`,
      isCurrentWeek: isCurrent
    });
  }

  return slots;
}

/**
 * Distributes active task hours across a specific week slot for a team member
 */
function calculateTaskHoursForMemberInWeek(
  task: Task,
  memberId: string,
  weekSlot: WeekSlot,
  subtasks: Subtask[] = [],
  sprints: Sprint[] = []
): number {
  // If task is completed or archived, no upcoming workload
  if (task.status === 'done' || (task as any).status === 'cancelled') {
    return 0;
  }

  // Check if member is assigned directly or via subtasks
  const isDirectAssignee = task.assigneeIds && task.assigneeIds.includes(memberId);
  const memberSubtasks = subtasks.filter(st => st.taskId === task.id && st.assigneeId === memberId && !st.completed);
  const taskSubtasks = subtasks.filter(st => st.taskId === task.id && !st.completed);

  if (!isDirectAssignee && memberSubtasks.length === 0) {
    return 0;
  }

  // Determine remaining total hours for this member on this task
  let memberRemainingHours = 0;
  if (memberSubtasks.length > 0) {
    memberRemainingHours = memberSubtasks.reduce((sum, st) => sum + (st.estimatedHours || 4), 0);
  } else if (isDirectAssignee) {
    const totalEst = task.estimatedHours || 8;
    const completionRatio = Math.min(1, Math.max(0, (task.completionPercent || 0) / 100));
    const remainingTaskHours = totalEst * (1 - completionRatio);
    const totalAssigneeCount = Math.max(1, task.assigneeIds?.length || 1);
    memberRemainingHours = remainingTaskHours / totalAssigneeCount;
  }

  if (memberRemainingHours <= 0) return 0;

  // Determine effective task start & due dates
  let taskStart = task.startDate;
  let taskEnd = task.dueDate;

  // Fallback to sprint dates if task dates are blank
  if ((!taskStart || !taskEnd) && task.sprintId) {
    const sprint = sprints.find(s => s.id === task.sprintId);
    if (sprint) {
      taskStart = taskStart || sprint.startDate;
      taskEnd = taskEnd || sprint.endDate;
    }
  }

  // If still missing, assume current week / week 1
  if (!taskStart || !taskEnd) {
    return weekSlot.weekIndex === 0 ? memberRemainingHours : 0;
  }

  // Check date overlap between [taskStart, taskEnd] and [weekSlot.startDate, weekSlot.endDate]
  const tStart = new Date(taskStart).getTime();
  const tEnd = new Date(taskEnd).getTime();
  const wStart = new Date(weekSlot.startDate).getTime();
  const wEnd = new Date(weekSlot.endDate).getTime();

  // If task finishes before this week starts, or starts after this week ends
  if (tEnd < wStart || tStart > wEnd) {
    return 0;
  }

  // Calculate task span in days
  const oneDay = 24 * 60 * 60 * 1000;
  const taskTotalDays = Math.max(1, Math.round((tEnd - tStart) / oneDay) + 1);

  // Overlap span in days
  const overlapStart = Math.max(tStart, wStart);
  const overlapEnd = Math.min(tEnd, wEnd);
  const overlapDays = Math.max(1, Math.round((overlapEnd - overlapStart) / oneDay) + 1);

  // Proportional effort allocation
  const proportion = Math.min(1, overlapDays / taskTotalDays);
  return Math.round(memberRemainingHours * proportion * 10) / 10;
}

/**
 * Calculates blocked leave hours for a stakeholder in a given week
 */
function getBlockedLeaveHoursInWeek(
  stakeholderId: string,
  weekSlot: WeekSlot,
  leaves: MemberLeave[] = []
): { blockedHours: number; matchingLeaves: MemberLeave[] } {
  const userLeaves = leaves.filter(
    l => (l.userId === stakeholderId || (l as any).userEmail === stakeholderId) && 
         (l.status === 'approved' || l.status === 'pending')
  );

  const wStart = new Date(weekSlot.startDate).getTime();
  const wEnd = new Date(weekSlot.endDate).getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  let blockedHours = 0;
  const matchingLeaves: MemberLeave[] = [];

  userLeaves.forEach(leave => {
    const lStart = new Date(leave.startDate).getTime();
    const lEnd = new Date(leave.endDate).getTime();

    // Check if overlap exists
    if (lEnd >= wStart && lStart <= wEnd) {
      matchingLeaves.push(leave);
      const overlapStart = Math.max(lStart, wStart);
      const overlapEnd = Math.min(lEnd, wEnd);
      const days = Math.max(1, Math.round((overlapEnd - overlapStart) / oneDay) + 1);
      // Assume 8 working hours per day, max 40h per week
      blockedHours += Math.min(40, days * 8);
    }
  });

  return {
    blockedHours: Math.min(40, blockedHours),
    matchingLeaves
  };
}

/**
 * Determines capacity load level categorization
 */
function getCapacityLoadLevel(
  assignedHours: number,
  effectiveCapacity: number,
  blockedLeaveHours: number
): CapacityLoadLevel {
  if (effectiveCapacity === 0 && blockedLeaveHours > 0) {
    return 'leave';
  }
  if (assignedHours === 0) {
    return 'empty';
  }
  if (effectiveCapacity === 0 && assignedHours > 0) {
    return 'critical';
  }
  const util = Math.round((assignedHours / effectiveCapacity) * 100);
  if (util >= 120) return 'critical';
  if (util > 100) return 'overloaded';
  if (util >= 85) return 'heavy';
  if (util >= 50) return 'optimal';
  return 'light';
}

/**
 * Main calculation: Generates the 4-Week Team Capacity Heatmap & Bottleneck Analysis
 */
export function calculate4WeekCapacityHeatmap(
  projectData: ProjectData,
  leaves: MemberLeave[] = [],
  anchorDate: Date = new Date()
): TeamHeatmapSummary {
  const stakeholders = projectData.stakeholders || [];
  const tasks = projectData.tasks || [];
  const subtasks = projectData.subtasks || [];
  const sprints = projectData.sprints || [];

  const weekSlots = generate4WeekSlots(anchorDate);

  const members: Member4WeekHeatmap[] = stakeholders.map(sh => {
    const baseCap = sh.weeklyCapacityHours || 40;
    const weeklyLoads: MemberWeeklyLoad[] = [];

    let totalAssigned = 0;
    let totalCap = 0;
    let bottleneckCount = 0;
    let peakUtil = 0;
    let peakWeek = 0;

    weekSlots.forEach((slot, wIdx) => {
      const { blockedHours, matchingLeaves } = getBlockedLeaveHoursInWeek(sh.id, slot, leaves);
      const effectiveCap = Math.max(0, baseCap - blockedHours);

      // Collect task allocations for this member in this week
      const taskAllocations: TaskAllocationItem[] = [];
      let weekAssignedHours = 0;

      tasks.forEach(task => {
        const allocated = calculateTaskHoursForMemberInWeek(task, sh.id, slot, subtasks, sprints);
        if (allocated > 0) {
          weekAssignedHours += allocated;
          const sprint = sprints.find(s => s.id === task.sprintId);
          taskAllocations.push({
            taskId: task.id,
            taskTitle: task.title,
            taskStatus: task.status,
            taskPriority: task.priority,
            sprintName: sprint?.name,
            allocatedHoursThisWeek: allocated,
            totalTaskHours: task.estimatedHours || allocated,
            taskStartDate: task.startDate,
            taskDueDate: task.dueDate
          });
        }
      });

      weekAssignedHours = Math.round(weekAssignedHours * 10) / 10;
      const utilPercent = effectiveCap > 0 
        ? Math.round((weekAssignedHours / effectiveCap) * 100)
        : (weekAssignedHours > 0 ? 999 : 0);

      const isBottleneck = utilPercent > 100 || (effectiveCap === 0 && weekAssignedHours > 0);
      const loadLevel = getCapacityLoadLevel(weekAssignedHours, effectiveCap, blockedHours);

      if (isBottleneck) bottleneckCount++;
      if (utilPercent > peakUtil) {
        peakUtil = utilPercent;
        peakWeek = wIdx;
      }

      totalAssigned += weekAssignedHours;
      totalCap += effectiveCap;

      weeklyLoads.push({
        weekIndex: wIdx,
        weekSlot: slot,
        baseCapacityHours: baseCap,
        blockedLeaveHours: blockedHours,
        effectiveCapacityHours: effectiveCap,
        assignedHours: weekAssignedHours,
        utilizationPercent: utilPercent,
        varianceHours: Math.round((weekAssignedHours - effectiveCap) * 10) / 10,
        isBottleneck,
        loadLevel,
        taskAllocations,
        leavesInWeek: matchingLeaves
      });
    });

    const avgUtil = totalCap > 0 ? Math.round((totalAssigned / totalCap) * 100) : 0;

    return {
      stakeholder: sh,
      weeklyLoads,
      totalAssignedHours: Math.round(totalAssigned * 10) / 10,
      totalEffectiveCapacity: totalCap,
      averageUtilization: avgUtil,
      peakUtilization: peakUtil,
      peakWeekIndex: peakWeek,
      hasBottleneck: bottleneckCount > 0,
      bottleneckWeeksCount: bottleneckCount
    };
  });

  // Calculate Team Weekly Totals
  const teamWeeklyTotals = weekSlots.map((slot, wIdx) => {
    let weekTotalAssigned = 0;
    let weekTotalCap = 0;
    let bottlenecks = 0;
    let overallocatedHours = 0;

    members.forEach(m => {
      const load = m.weeklyLoads[wIdx];
      weekTotalAssigned += load.assignedHours;
      weekTotalCap += load.effectiveCapacityHours;
      if (load.isBottleneck) {
        bottlenecks++;
        overallocatedHours += Math.max(0, load.assignedHours - load.effectiveCapacityHours);
      }
    });

    const avgUtil = weekTotalCap > 0 ? Math.round((weekTotalAssigned / weekTotalCap) * 100) : 0;

    return {
      weekSlot: slot,
      totalAssignedHours: Math.round(weekTotalAssigned * 10) / 10,
      totalEffectiveCapacity: weekTotalCap,
      averageUtilization: avgUtil,
      bottleneckMembersCount: bottlenecks,
      overallocatedHours: Math.round(overallocatedHours * 10) / 10,
      isTeamOverCapacity: avgUtil > 100
    };
  });

  // Identify most constrained week
  let maxBottlenecks = -1;
  let mostConstrainedWeek: WeekSlot | null = null;
  teamWeeklyTotals.forEach(tot => {
    if (tot.bottleneckMembersCount > maxBottlenecks && tot.bottleneckMembersCount > 0) {
      maxBottlenecks = tot.bottleneckMembersCount;
      mostConstrainedWeek = tot.weekSlot;
    }
  });

  const totalBottleneckMembersCount = members.filter(m => m.hasBottleneck).length;

  const grandTotalAssigned = members.reduce((sum, m) => sum + m.totalAssignedHours, 0);
  const grandTotalCap = members.reduce((sum, m) => sum + m.totalEffectiveCapacity, 0);
  const overallTeamUtilization = grandTotalCap > 0 ? Math.round((grandTotalAssigned / grandTotalCap) * 100) : 0;

  // Generate intelligent rebalancing suggestions
  const rebalancingSuggestions: RebalancingSuggestion[] = [];

  members.forEach(overloadedMember => {
    overloadedMember.weeklyLoads.forEach((weekLoad, wIdx) => {
      if (weekLoad.isBottleneck && weekLoad.taskAllocations.length > 0) {
        const excessHours = weekLoad.assignedHours - weekLoad.effectiveCapacityHours;

        // Find available peers with same or compatible skill in that week (< 75% utilized)
        const availablePeers = members.filter(other => {
          if (other.stakeholder.id === overloadedMember.stakeholder.id) return false;
          const otherWeekLoad = other.weeklyLoads[wIdx];
          if (otherWeekLoad.utilizationPercent >= 80) return false;
          if (otherWeekLoad.effectiveCapacityHours <= 0) return false;

          // Check role / skills compatibility
          const mySkills = overloadedMember.stakeholder.skills || [];
          const otherSkills = other.stakeholder.skills || [];
          const hasCommonSkill = mySkills.some(s => otherSkills.includes(s));
          const sameCategory = (other.stakeholder.category || 'internal') === (overloadedMember.stakeholder.category || 'internal');

          return hasCommonSkill || sameCategory || other.stakeholder.role === overloadedMember.stakeholder.role;
        });

        if (availablePeers.length > 0) {
          // Pick the most available peer
          availablePeers.sort((a, b) => a.weeklyLoads[wIdx].utilizationPercent - b.weeklyLoads[wIdx].utilizationPercent);
          const bestPeer = availablePeers[0];
          const bestPeerWeekLoad = bestPeer.weeklyLoads[wIdx];

          // Pick candidate task to move
          const candidateTaskAlloc = weekLoad.taskAllocations[0];
          const taskObj = tasks.find(t => t.id === candidateTaskAlloc.taskId);

          if (taskObj) {
            const hoursToShift = Math.min(candidateTaskAlloc.allocatedHoursThisWeek, Math.max(4, Math.round(excessHours)));
            const fromOldUtil = weekLoad.utilizationPercent;
            const fromNewUtil = Math.round(((weekLoad.assignedHours - hoursToShift) / weekLoad.effectiveCapacityHours) * 100);
            const toOldUtil = bestPeerWeekLoad.utilizationPercent;
            const toNewUtil = Math.round(((bestPeerWeekLoad.assignedHours + hoursToShift) / bestPeerWeekLoad.effectiveCapacityHours) * 100);

            rebalancingSuggestions.push({
              id: `rebal-${overloadedMember.stakeholder.id}-${bestPeer.stakeholder.id}-${wIdx}-${taskObj.id}`,
              fromMemberId: overloadedMember.stakeholder.id,
              fromMemberName: overloadedMember.stakeholder.name,
              toMemberId: bestPeer.stakeholder.id,
              toMemberName: bestPeer.stakeholder.name,
              taskId: taskObj.id,
              taskTitle: taskObj.title,
              weekIndex: wIdx,
              weekLabel: weekLoad.weekSlot.shortLabel,
              hoursToMove: hoursToShift,
              fromOldUtil,
              fromNewUtil,
              toOldUtil,
              toNewUtil,
              reason: `${overloadedMember.stakeholder.name} is at ${fromOldUtil}% capacity in ${weekLoad.weekSlot.shortLabel}. Reassigning ${hoursToShift}h to ${bestPeer.stakeholder.name} (${toOldUtil}% utilized) balances capacity.`
            });
          }
        }
      }
    });
  });

  return {
    weekSlots,
    members,
    teamWeeklyTotals,
    totalBottleneckMembersCount,
    mostConstrainedWeek,
    overallTeamUtilization,
    rebalancingSuggestions: rebalancingSuggestions.slice(0, 5)
  };
}
