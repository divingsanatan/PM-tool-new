import { AppRole, APP_ROLES, UserProfile, Stakeholder } from '../types';

export { APP_ROLES };
export type { AppRole };

/**
 * Normalizes any legacy or custom role string to one of the 5 canonical system roles.
 */
export function normalizeToAppRole(rawRole?: string): AppRole {
  if (!rawRole) return 'Developer (Team member)';
  const str = rawRole.trim().toLowerCase();

  // 1. Admin
  if (
    str === 'admin' ||
    str.includes('admin') ||
    str.includes('portfolio administrator') ||
    str.includes('executive pmo') ||
    str.includes('governance director')
  ) {
    return 'Admin';
  }

  // 2. Project Manager
  if (
    str === 'pm' ||
    str.includes('project manager') ||
    str.includes('scrum master') ||
    str.includes('agile lead') ||
    str.includes('delivery lead') ||
    str.includes('technical pm')
  ) {
    return 'Project Manager';
  }

  // 3. Tester (Team Member)
  if (
    str.includes('tester') ||
    str.includes('qa') ||
    str.includes('quality') ||
    str.includes('sdet') ||
    str.includes('automation test')
  ) {
    return 'Tester (Team Member)';
  }

  // 4. UI/UX Dev (Team Member)
  if (
    str.includes('ui/ux') ||
    str.includes('ui / ux') ||
    str.includes('ui-ux') ||
    str.includes('designer') ||
    str.includes('design systems') ||
    str.includes('product design')
  ) {
    return 'UI/UX Dev (Team Member)';
  }

  // 5. Developer (Team member)
  return 'Developer (Team member)';
}

/**
 * Checks if a user or stakeholder has Executive Admin permissions.
 */
export function isUserAdmin(
  target?: UserProfile | Stakeholder | { role?: string; appRole?: string; title?: string } | string | null
): boolean {
  if (!target) return false;
  if (typeof target === 'string') {
    const s = target.toLowerCase();
    return s === 'admin' || s === 'executive admin' || s.includes('portfolio administrator');
  }
  const roleStr = ((target as any).role || (target as any).appRole || (target as any).title || '').toLowerCase();
  return roleStr === 'admin' || roleStr.includes('portfolio administrator') || roleStr.includes('executive admin');
}

/**
 * Checks if a user has Project Manager authority.
 * Includes Admins, designated Project Managers, and Developers with granted PM Access (Dual Role).
 */
export function isUserPM(
  target?: UserProfile | Stakeholder | { role?: string; appRole?: string; title?: string; isDualPMDev?: boolean; hasPMAccess?: boolean } | string | null
): boolean {
  if (!target) return false;
  if (isUserAdmin(target as any)) return true;
  if (typeof target === 'string') {
    const s = target.toLowerCase();
    return s === 'pm' || s.includes('project manager') || s.includes('scrum master');
  }
  if ((target as any).isDualPMDev || (target as any).hasPMAccess) return true;
  const roleStr = ((target as any).role || (target as any).appRole || (target as any).title || '').toLowerCase();
  return roleStr === 'pm' || roleStr.includes('project manager') || roleStr.includes('scrum master');
}

/**
 * Checks if a user can access PM-level actions and views.
 */
export function canAccessPMActions(
  target?: UserProfile | Stakeholder | { role?: string; appRole?: string; title?: string; isDualPMDev?: boolean; hasPMAccess?: boolean } | string | null
): boolean {
  return isUserPM(target);
}

/**
 * Checks if a person holds a Developer role or is a dual Developer + PM.
 */
export function isUserDeveloper(
  target?: UserProfile | Stakeholder | { role?: string; appRole?: string; title?: string; isDualPMDev?: boolean } | string | null
): boolean {
  if (!target) return false;
  if (typeof target === 'string') {
    const s = target.toLowerCase();
    return s.includes('developer') || s.includes('engineer') || s.includes('architect');
  }
  if ((target as any).isDualPMDev) return true;
  const roleStr = ((target as any).role || (target as any).appRole || (target as any).title || '').toLowerCase();
  return roleStr.includes('developer') || roleStr.includes('engineer') || roleStr.includes('architect') || roleStr.includes('dev');
}

/**
 * Checks if a user is a dual PM + Developer.
 */
export function isDualPMAndDeveloper(
  target?: UserProfile | Stakeholder | { role?: string; appRole?: string; title?: string; isDualPMDev?: boolean; hasPMAccess?: boolean } | null
): boolean {
  if (!target) return false;
  if ((target as any).isDualPMDev || (target as any).hasPMAccess) return true;
  const roleStr = ((target as any).role || (target as any).appRole || (target as any).title || '').toLowerCase();
  const hasPM = roleStr === 'pm' || roleStr.includes('project manager') || roleStr.includes('scrum master');
  const hasDev = roleStr.includes('developer') || roleStr.includes('engineer') || roleStr.includes('architect');
  return hasPM && hasDev;
}

/**
 * Access Control Gate: Only PM and Admin roles are authorized to manage roles,
 * promote members to PM, grant dual Developer+PM access, or assign permissions.
 */
export function canManageRolesAndTeam(currentUser?: UserProfile | null): boolean {
  if (!currentUser) return false;
  return isUserAdmin(currentUser) || isUserPM(currentUser);
}

/**
 * Visual styling and iconography metadata for each of the 6 roles.
 */
export function getAppRoleBadge(roleStr: string, isDualPMDev?: boolean) {
  const normalized = normalizeToAppRole(roleStr);

  if (isDualPMDev) {
    return {
      label: 'PM & Developer',
      sublabel: 'Dual PM + Dev Access',
      badgeClass: 'bg-gradient-to-r from-teal-500/20 to-indigo-500/20 text-teal-300 border border-teal-500/40 font-bold',
      pillClass: 'bg-teal-600 text-white',
      dotColor: 'bg-teal-400',
      iconName: 'Zap'
    };
  }

  switch (normalized) {
    case 'Admin':
      return {
        label: 'Admin',
        sublabel: 'Executive Governance',
        badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold',
        pillClass: 'bg-amber-600 text-white',
        dotColor: 'bg-amber-400',
        iconName: 'ShieldCheck'
      };
    case 'Project Manager':
      return {
        label: 'Project Manager',
        sublabel: 'PMO & Workload Lead',
        badgeClass: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold',
        pillClass: 'bg-indigo-600 text-white',
        dotColor: 'bg-indigo-400',
        iconName: 'Briefcase'
      };
    case 'Developer (Team member)':
      return {
        label: 'Developer (Team member)',
        sublabel: 'Engineering Contributor & Technical Delivery',
        badgeClass: 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold',
        pillClass: 'bg-teal-600 text-white',
        dotColor: 'bg-teal-400',
        iconName: 'Code'
      };
    case 'Tester (Team Member)':
      return {
        label: 'Tester (Team Member)',
        sublabel: 'QA & Test Automation',
        badgeClass: 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-medium',
        pillClass: 'bg-purple-600 text-white',
        dotColor: 'bg-purple-400',
        iconName: 'Bug'
      };
    case 'UI/UX Dev (Team Member)':
      return {
        label: 'UI/UX Dev (Team Member)',
        sublabel: 'UI/UX & Product Design',
        badgeClass: 'bg-pink-500/20 text-pink-300 border border-pink-500/40 font-medium',
        pillClass: 'bg-pink-600 text-white',
        dotColor: 'bg-pink-400',
        iconName: 'LayoutGrid'
      };
    default:
      return {
        label: normalized,
        sublabel: 'Team Contributor',
        badgeClass: 'bg-slate-500/20 text-slate-300 border border-slate-700 font-medium',
        pillClass: 'bg-slate-700 text-white',
        dotColor: 'bg-slate-400',
        iconName: 'User'
      };
  }
}
