import { UserProfile, ProjectData, Stakeholder } from '../types';

export type BenchAllocationStatus = 'bench' | 'partially_allocated' | 'fully_allocated' | 'overallocated';
export type TalentRoleCategory = 'pm' | 'engineering' | 'architecture' | 'design' | 'devops' | 'qa' | 'admin' | 'business' | 'other';

export interface TalentBenchCandidate {
  user: UserProfile;
  allocationStatus: BenchAllocationStatus;
  totalAssignedHours: number;
  weeklyCapacity: number;
  availableHours: number;
  utilizationPercent: number;
  activeProjects: {
    id: string;
    name: string;
    code: string;
    hours: number;
    isCurrent: boolean;
  }[];
  isInCurrentProject: boolean;
  currentProjectStakeholder?: Stakeholder;
  roleCategory: TalentRoleCategory;
}

export function categorizeRole(roleOrTitle: string = '', userRole?: string): TalentRoleCategory {
  const lower = roleOrTitle.toLowerCase();
  if (userRole === 'admin' || lower.includes('portfolio') || lower.includes('executive admin') || lower.includes('governance')) {
    return 'admin';
  }
  if (userRole === 'pm' || lower.includes('project manager') || lower.includes('scrum master') || lower.includes('agile lead') || lower.includes('delivery lead') || lower === 'pm') {
    return 'pm';
  }
  if (lower.includes('architect') || lower.includes('architecture') || lower.includes('principal')) {
    return 'architecture';
  }
  if (lower.includes('designer') || lower.includes('ui/ux') || lower.includes('figma') || lower.includes('product design')) {
    return 'design';
  }
  if (lower.includes('devops') || lower.includes('sre') || lower.includes('infrastructure') || lower.includes('cloud engineer') || lower.includes('ci/cd')) {
    return 'devops';
  }
  if (lower.includes('qa') || lower.includes('tester') || lower.includes('sdet') || lower.includes('quality') || lower.includes('automation qa')) {
    return 'qa';
  }
  if (lower.includes('business') || lower.includes('product owner') || lower.includes('analyst') || lower.includes('po')) {
    return 'business';
  }
  if (lower.includes('engineer') || lower.includes('developer') || lower.includes('full stack') || lower.includes('frontend') || lower.includes('backend') || lower.includes('react') || lower.includes('node') || lower.includes('python')) {
    return 'engineering';
  }
  return 'other';
}

/**
 * Calculates real-time cross-project capacity, bench status, and allocation across all projects
 */
export function getTalentBenchPool(
  allUsers: UserProfile[],
  allProjectsMap: Record<string, ProjectData>,
  currentProjectId: string
): TalentBenchCandidate[] {
  const projects = Object.values(allProjectsMap || {});
  const currentProject = allProjectsMap[currentProjectId];
  const currentStakeholders = currentProject?.stakeholders || [];

  return allUsers.map(user => {
    const userEmail = (user.email || '').toLowerCase();
    const userId = user.id;
    const weeklyCapacity = user.weeklyCapacityHours || 40;

    let totalAssignedHours = 0;
    const activeProjects: { id: string; name: string; code: string; hours: number; isCurrent: boolean }[] = [];

    projects.forEach(proj => {
      if (!proj) return;
      const sh = (proj.stakeholders || []).find(
        s => s.id === userId || (s.email && s.email.toLowerCase() === userEmail)
      );

      // Find active (non-done) tasks assigned to this user
      const assignedTasks = (proj.tasks || []).filter(t => {
        if (t.status === 'done') return false;
        if (sh && t.assigneeIds && t.assigneeIds.includes(sh.id)) return true;
        if (t.assigneeIds && t.assigneeIds.includes(userId)) return true;
        return false;
      });

      const projHours = assignedTasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);

      // Check if user is either a stakeholder in project or has assigned tasks
      if (sh || projHours > 0) {
        totalAssignedHours += projHours;
        activeProjects.push({
          id: proj.id,
          name: proj.projectName,
          code: proj.projectCode,
          hours: projHours,
          isCurrent: proj.id === currentProjectId
        });
      }
    });

    const isCurrent = currentStakeholders.some(
      s => s.id === userId || (s.email && s.email.toLowerCase() === userEmail)
    );
    const currentSh = currentStakeholders.find(
      s => s.id === userId || (s.email && s.email.toLowerCase() === userEmail)
    );

    const availableHours = Math.max(0, weeklyCapacity - totalAssignedHours);
    const utilizationPercent = weeklyCapacity > 0 ? Math.round((totalAssignedHours / weeklyCapacity) * 100) : 0;

    let allocationStatus: BenchAllocationStatus = 'bench';
    if (totalAssignedHours === 0) {
      allocationStatus = 'bench';
    } else if (totalAssignedHours > weeklyCapacity) {
      allocationStatus = 'overallocated';
    } else if (totalAssignedHours >= weeklyCapacity) {
      allocationStatus = 'fully_allocated';
    } else {
      allocationStatus = 'partially_allocated';
    }

    const roleCategory = categorizeRole(user.title || user.role, user.role);

    return {
      user,
      allocationStatus,
      totalAssignedHours,
      weeklyCapacity,
      availableHours,
      utilizationPercent,
      activeProjects,
      isInCurrentProject: isCurrent,
      currentProjectStakeholder: currentSh,
      roleCategory
    };
  });
}
