import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { calculateStakeholderWorkloads } from '../../utils/evm';
import { Stakeholder, StakeholderCategory, AppRole, APP_ROLES } from '../../types';
import {
  Users,
  BarChart3,
  Plus,
  Mail,
  Clock,
  DollarSign,
  Edit2,
  Trash2,
  Zap,
  Building2,
  Globe,
  Filter,
  Lock,
  Search,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Briefcase,
  ChevronRight,
  UserCheck,
  CalendarOff,
  CalendarDays,
  Award,
  Flame,
  LayoutGrid,
  Table as TableIcon,
  UserMinus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  RotateCcw,
  Check,
  ShieldCheck,
  Code,
  Laptop,
  Bug,
  Palmtree
} from 'lucide-react';
import { EmptyState } from '../common/EmptyState';
import { IndividualReportCardModal } from '../modals/IndividualReportCardModal';
import { WorkloadHeatmap } from './WorkloadHeatmap';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  isUserOnLeave,
  checkTaskLeaveConflict,
  calculateEffectiveWeeklyCapacity
} from '../../utils/portfolioAndLeaveUtils';
import {
  normalizeToAppRole,
  isUserAdmin,
  isUserPM,
  canManageRolesAndTeam,
  getAppRoleBadge,
  isDualPMAndDeveloper
} from '../../utils/roleUtils';

interface StakeholdersViewProps {
  onOpenStakeholderModal: (stakeholder?: Stakeholder) => void;
  onOpenInviteModal?: (dataOrEmail?: string | { email?: string; name?: string; role?: string; category?: StakeholderCategory; stakeholderId?: string }) => void;
  onOpenTaskModal?: (taskId: string) => void;
  initialTab?: 'directory' | 'workload';
}

export const StakeholdersView: React.FC<StakeholdersViewProps> = ({
  onOpenStakeholderModal,
  onOpenInviteModal,
  onOpenTaskModal,
  initialTab = 'directory'
}) => {
  const { projectData, saveStakeholder, deleteStakeholder, updateUserRole, currentUser, leaves } = useProject();
  const isAdmin = isUserAdmin(currentUser);
  const isPM = isUserPM(currentUser);
  const canManageRoles = canManageRolesAndTeam(currentUser);

  const [activeTab, setActiveTab] = useState<'directory' | 'workload'>(initialTab);
  const [workloadSubView, setWorkloadSubView] = useState<'heatmap' | 'chart' | 'cards'>('heatmap');
  
  // Layout mode for directory: default to 'table' (Tabular View)
  const [layoutMode, setLayoutMode] = useState<'table' | 'cards'>('table');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole | 'dual_pm_dev'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'internal' | 'external'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'invited' | 'placeholder' | 'on_leave' | 'overloaded'>('all');
  const [workloadFilter, setWorkloadFilter] = useState<'all' | 'overloaded' | 'active'>('all');

  // Sorting State
  const [sortField, setSortField] = useState<'name' | 'role' | 'category' | 'status' | 'utilization' | 'tasks' | 'rate'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [selectedStakeholderForReport, setSelectedStakeholderForReport] = useState<Stakeholder | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<Stakeholder | null>(null);

  // Quick Add State with Canonical Roles
  const [quickName, setQuickName] = useState('');
  const [quickRole, setQuickRole] = useState<AppRole>('Developer (Team member)');
  const [quickIsDualPMDev, setQuickIsDualPMDev] = useState(false);
  const [quickCategory, setQuickCategory] = useState<StakeholderCategory>('internal');
  const [quickRate, setQuickRate] = useState(100);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    const name = memberToRemove.name;
    await deleteStakeholder(memberToRemove.id);
    setMemberToRemove(null);
    setToastMessage(`✓ ${name} removed from project and returned to organization bench.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync tab if initialTab prop changes externally
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const canEditStakeholder = (sh: Stakeholder) => {
    if (canManageRoles) return true;
    if (sh.id === currentUser?.id) return true;
    if (sh.email && sh.email.toLowerCase() === currentUser?.email.toLowerCase()) return true;
    return false;
  };

  const handleQuickAddStakeholder = async () => {
    if (!quickName.trim()) return;

    const normalizedRole = normalizeToAppRole(quickRole);
    const hasDualPM = quickIsDualPMDev || normalizedRole === 'Project Manager' || normalizedRole === 'Admin';

    const newSh: Stakeholder = {
      id: `sh-${Date.now()}`,
      name: quickName.trim(),
      email: `unassigned.${quickName.trim().toLowerCase().replace(/[^a-z0-9]/g, '.')}@placeholder.local`,
      role: normalizedRole,
      appRole: normalizedRole,
      isDualPMDev: quickIsDualPMDev,
      hasPMAccess: hasDualPM,
      category: quickCategory,
      avatar: undefined,
      hourlyRate: Number(quickRate) || (normalizedRole === 'Admin' ? 175 : normalizedRole === 'Project Manager' ? 120 : 110),
      weeklyCapacityHours: 40,
      skills: [normalizedRole, 'Agile'],
      status: 'placeholder',
      isPlaceholder: true,
      createdBy: currentUser?.id,
      createdByEmail: currentUser?.email
    };

    await saveStakeholder(newSh);
    setQuickName('');
    setQuickIsDualPMDev(false);
    setToastMessage(`✓ Created member profile "${quickName.trim()}" (${normalizedRole}${quickIsDualPMDev ? ' + PM Dual Role' : ''}).`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Workload calculations
  const allWorkloads = useMemo(() => {
    return calculateStakeholderWorkloads(
      projectData.stakeholders,
      projectData.tasks,
      projectData.subtasks
    );
  }, [projectData.stakeholders, projectData.tasks, projectData.subtasks]);

  // Filtered & Sorted Stakeholders
  const filteredStakeholders = useMemo(() => {
    return projectData.stakeholders
      .filter(sh => {
        const normRole = normalizeToAppRole(sh.appRole || sh.role);
        const isDual = Boolean(sh.isDualPMDev || (sh.role && sh.role.toLowerCase().includes('pm') && sh.role.toLowerCase().includes('dev')));
        const wl = allWorkloads.find(w => w.stakeholder.id === sh.id);
        const onLeave = isUserOnLeave(sh.id, leaves || []);
        const { effectiveCapacity } = calculateEffectiveWeeklyCapacity(sh.weeklyCapacityHours || 40, sh.id, leaves || []);
        const isOverloaded = wl ? wl.assignedHours > effectiveCapacity : false;

        // Role Filter
        if (roleFilter !== 'all') {
          if (roleFilter === 'dual_pm_dev') {
            if (!isDual) return false;
          } else if (normRole !== roleFilter) {
            return false;
          }
        }

        // Category Filter
        if (categoryFilter !== 'all' && (sh.category || 'internal') !== categoryFilter) {
          return false;
        }

        // Status Filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'on_leave' && !onLeave) return false;
          if (statusFilter === 'overloaded' && !isOverloaded) return false;
          if (statusFilter === 'active' && (sh.status !== 'active' || sh.isPlaceholder)) return false;
          if (statusFilter === 'invited' && sh.status !== 'invited') return false;
          if (statusFilter === 'placeholder' && !sh.isPlaceholder && sh.status !== 'placeholder') return false;
        }

        // Search query (multi-field matching)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = sh.name.toLowerCase().includes(q);
          const matchesRole = (sh.role || '').toLowerCase().includes(q) || normRole.toLowerCase().includes(q);
          const matchesEmail = (sh.email || '').toLowerCase().includes(q);
          const matchesSkill = sh.skills?.some(s => s.toLowerCase().includes(q));
          const assignedTasks = projectData.tasks.filter(
            t => t.assigneeIds.includes(sh.id) || projectData.subtasks.some(st => st.taskId === t.id && st.assigneeId === sh.id)
          );
          const matchesTask = assignedTasks.some(t => t.title.toLowerCase().includes(q));

          if (!matchesName && !matchesRole && !matchesEmail && !matchesSkill && !matchesTask) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        const wlA = allWorkloads.find(w => w.stakeholder.id === a.id);
        const wlB = allWorkloads.find(w => w.stakeholder.id === b.id);
        const tasksA = projectData.tasks.filter(t => t.assigneeIds.includes(a.id)).length;
        const tasksB = projectData.tasks.filter(t => t.assigneeIds.includes(b.id)).length;

        if (sortField === 'name') {
          comp = a.name.localeCompare(b.name);
        } else if (sortField === 'role') {
          comp = (a.role || '').localeCompare(b.role || '');
        } else if (sortField === 'category') {
          comp = (a.category || 'internal').localeCompare(b.category || 'internal');
        } else if (sortField === 'status') {
          comp = (a.status || '').localeCompare(b.status || '');
        } else if (sortField === 'utilization') {
          const utilA = wlA && wlA.capacityHours > 0 ? (wlA.assignedHours / wlA.capacityHours) : 0;
          const utilB = wlB && wlB.capacityHours > 0 ? (wlB.assignedHours / wlB.capacityHours) : 0;
          comp = utilA - utilB;
        } else if (sortField === 'tasks') {
          comp = tasksA - tasksB;
        } else if (sortField === 'rate') {
          comp = (a.hourlyRate || 0) - (b.hourlyRate || 0);
        }

        return sortDirection === 'asc' ? comp : -comp;
      });
  }, [projectData.stakeholders, projectData.tasks, projectData.subtasks, allWorkloads, roleFilter, categoryFilter, statusFilter, searchQuery, sortField, sortDirection, leaves]);

  // Toggle Sort handler
  const handleToggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const hasActiveFilters = searchQuery !== '' || roleFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  // Quick Role Change / Dual Role Toggle for PM & Admin
  const handleQuickRoleChange = async (stakeholder: Stakeholder, newRole: AppRole) => {
    if (!canManageRoles) return;
    const shouldKeepDual = newRole === 'Developer (Team member)' && stakeholder.isDualPMDev;
    await updateUserRole(stakeholder.id, newRole, shouldKeepDual);
    setToastMessage(`✓ Updated ${stakeholder.name}'s role to ${newRole}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleDualPMDev = async (stakeholder: Stakeholder) => {
    if (!canManageRoles) return;
    const currentDual = Boolean(stakeholder.isDualPMDev);
    const newDual = !currentDual;
    const norm = normalizeToAppRole(stakeholder.appRole || stakeholder.role);
    await updateUserRole(stakeholder.id, norm, newDual);
    setToastMessage(newDual ? `✓ Granted Dual PM & Developer access to ${stakeholder.name}` : `✓ Removed Dual PM access from ${stakeholder.name}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered Workloads for Heatmap/Charts tab
  const filteredWorkloads = useMemo(() => {
    return allWorkloads.filter(wl => {
      const sh = wl.stakeholder;
      if (categoryFilter !== 'all' && (sh.category || 'internal') !== categoryFilter) {
        return false;
      }
      if (workloadFilter === 'overloaded' && !wl.overloaded) {
        return false;
      }
      if (workloadFilter === 'active' && wl.taskCount === 0) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = sh.name.toLowerCase().includes(q);
        const matchesRole = sh.role.toLowerCase().includes(q);
        if (!matchesName && !matchesRole) {
          return false;
        }
      }
      return true;
    });
  }, [allWorkloads, categoryFilter, workloadFilter, searchQuery]);

  // High-Level KPIs
  const totalStakeholders = projectData.stakeholders.length;
  const internalCount = projectData.stakeholders.filter(s => (s.category || 'internal') === 'internal').length;
  const externalCount = projectData.stakeholders.filter(s => s.category === 'external').length;
  const totalAssignedHours = allWorkloads.reduce((sum, w) => sum + w.assignedHours, 0);
  const totalCapacityHours = allWorkloads.reduce((sum, w) => {
    const { effectiveCapacity } = calculateEffectiveWeeklyCapacity(w.stakeholder.weeklyCapacityHours || 40, w.stakeholder.id, leaves || []);
    return sum + effectiveCapacity;
  }, 0);
  const overloadedCount = allWorkloads.filter(w => {
    const { effectiveCapacity } = calculateEffectiveWeeklyCapacity(w.stakeholder.weeklyCapacityHours || 40, w.stakeholder.id, leaves || []);
    return w.assignedHours > effectiveCapacity;
  }).length;
  const dualPMDevCount = projectData.stakeholders.filter(s => s.isDualPMDev || (s.role && s.role.toLowerCase().includes('pm') && s.role.toLowerCase().includes('dev'))).length;

  // Chart Data with effective capacity adjusted for approved leaves
  const chartData = allWorkloads.map(w => {
    const { effectiveCapacity } = calculateEffectiveWeeklyCapacity(w.stakeholder.weeklyCapacityHours || 40, w.stakeholder.id, leaves || []);
    const onLeave = isUserOnLeave(w.stakeholder.id, leaves || []);
    return {
      name: w.stakeholder.name + (onLeave ? ' 🏖️' : ''),
      role: w.stakeholder.role,
      Assigned: w.assignedHours,
      Capacity: effectiveCapacity,
      utilization: effectiveCapacity > 0 ? Math.round((w.assignedHours / effectiveCapacity) * 100) : 100
    };
  });

  return (
    <div id="team-workload-view" className="space-y-5">
      {/* 🌟 Header Section */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-slate-100 truncate">
                  Team & Stakeholder Roster
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Standardized canonical roles, dual PM & Developer hybrid permissions, tabular metrics, and capacity tracking.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions (PM & Admin) */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {canManageRoles && onOpenInviteModal && (
              <button
                onClick={() => onOpenInviteModal()}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold text-xs transition-colors shadow-sm flex-1 sm:flex-none whitespace-nowrap"
              >
                <Mail className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Invite Member</span>
              </button>
            )}
            {canManageRoles && (
              <button
                onClick={() => onOpenStakeholderModal()}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-colors shadow-md shadow-teal-600/20 flex-1 sm:flex-none whitespace-nowrap"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Add Stakeholder</span>
              </button>
            )}
          </div>
        </div>

        {/* 📊 Summary KPI Metric Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 font-medium block truncate">Team Roster</span>
              <span className="text-base sm:text-lg font-bold font-mono text-slate-100">{totalStakeholders} Members</span>
              <span className="text-[10px] text-slate-500 block truncate">{internalCount} Internal • {externalCount} External</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 font-medium block truncate">Assigned Workload</span>
              <span className="text-base sm:text-lg font-bold font-mono text-teal-300">{totalAssignedHours}h</span>
              <span className="text-[10px] text-slate-500 block truncate">of {totalCapacityHours}h Weekly Cap.</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 font-medium block truncate">Capacity Health</span>
              {overloadedCount > 0 ? (
                <span className="text-base sm:text-lg font-bold font-mono text-rose-400 flex items-center gap-1">
                  <span>{overloadedCount} Overloaded</span>
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
              ) : (
                <span className="text-base sm:text-lg font-bold font-mono text-emerald-400 flex items-center gap-1">
                  <span>100% Balanced</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              )}
              <span className="text-[10px] text-slate-500 block truncate">
                {overloadedCount > 0 ? 'Requires task re-balancing' : 'All members within limits'}
              </span>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              overloadedCount > 0
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}>
              <Flame className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 font-medium block truncate">Hybrid PM & Devs</span>
              <span className="text-base sm:text-lg font-bold font-mono text-amber-300 flex items-center gap-1">
                <span>{dualPMDevCount} Hybrid Roles</span>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                Full PM access + Task ownership
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* 🧭 Tabs Navigation & Live Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'directory'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Roster & Roles</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'directory' ? 'bg-teal-700 text-teal-100' : 'bg-slate-800 text-slate-400'
            }`}>
              {projectData.stakeholders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('workload')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'workload'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Workload & Capacity</span>
          </button>
        </div>

        {/* Search & View Switcher */}
        <div className="flex items-center gap-2">
          {activeTab === 'directory' && (
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
              <button
                onClick={() => setLayoutMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  layoutMode === 'table'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tabular View (Comprehensive Matrix)"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table View</span>
              </button>
              <button
                onClick={() => setLayoutMode('cards')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  layoutMode === 'cards'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Card Grid</span>
              </button>
            </div>
          )}

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, role, skill, task..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-teal-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 👥 TEAM DIRECTORY (TABULAR & CARD VIEWS) */}
      {/* ========================================================================= */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Quick Add Stakeholder Bar (PM & Admin) */}
          {canManageRoles ? (
            <div id="quick-stakeholder-bar" className="bg-slate-900 border border-teal-500/40 p-3.5 rounded-2xl shadow-lg relative space-y-2.5">
              {toastMessage && (
                <div className="absolute top-2 right-4 bg-emerald-500 text-slate-950 font-bold px-3 py-1 rounded-full text-xs shadow-md animate-bounce flex items-center gap-1 z-20">
                  <Zap className="w-3.5 h-3.5" />
                  <span>{toastMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-400">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Quick Add Team Member (Press Enter ↵)</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  Select from the 5 canonical roles
                </span>
              </div>

              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
                <input
                  type="text"
                  placeholder="Full Name and press Enter... (e.g. Alex Morgan)"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickAddStakeholder();
                    }
                  }}
                  className="flex-1 min-w-[200px] bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none shadow-inner min-h-[40px]"
                />

                <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
                  {/* Canonical Role Dropdown */}
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-xl min-h-[40px]">
                    <select
                      value={quickRole}
                      onChange={(e) => {
                        const sel = e.target.value as AppRole;
                        setQuickRole(sel);
                        if (sel !== 'Developer (Team member)') {
                          setQuickIsDualPMDev(false);
                        }
                        if (sel === 'Admin') setQuickRate(175);
                        else if (sel === 'Project Manager') setQuickRate(120);
                        else if (sel === 'Developer (Team member)') setQuickRate(100);
                        else if (sel === 'Tester (Team Member)') setQuickRate(90);
                        else if (sel === 'UI/UX Dev (Team Member)') setQuickRate(95);
                      }}
                      className="bg-transparent text-teal-300 text-xs font-semibold outline-none cursor-pointer"
                      title="Select Canonical Role"
                    >
                      {APP_ROLES.map(r => (
                        <option key={r} value={r} className="bg-slate-900 text-slate-100">
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dual PM & Dev Checkbox */}
                  {quickRole === 'Developer (Team member)' && (
                    <label className="flex items-center gap-1.5 bg-amber-950/30 border border-amber-500/40 px-2.5 py-1.5 rounded-xl min-h-[40px] cursor-pointer text-[11px] text-amber-200 font-semibold" title="Grants full PM access while maintaining developer task assignments">
                      <input
                        type="checkbox"
                        checked={quickIsDualPMDev}
                        onChange={(e) => setQuickIsDualPMDev(e.target.checked)}
                        className="w-3.5 h-3.5 accent-amber-500 rounded"
                      />
                      <span>⚡ Dual PM + Dev</span>
                    </label>
                  )}

                  {/* Category Dropdown */}
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-xl min-h-[40px]">
                    <select
                      value={quickCategory}
                      onChange={(e) => setQuickCategory(e.target.value as StakeholderCategory)}
                      className="bg-transparent text-slate-200 text-xs font-semibold outline-none cursor-pointer"
                      title="Select Stakeholder Type"
                    >
                      <option value="internal" className="bg-slate-900 text-slate-100">🏢 Internal</option>
                      <option value="external" className="bg-slate-900 text-slate-100">🌐 External</option>
                    </select>
                  </div>

                  {/* Rate */}
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-xl min-h-[40px]">
                    <span className="text-[10px] text-slate-500 font-mono">$</span>
                    <input
                      type="number"
                      title="Hourly Billing Rate"
                      value={quickRate}
                      onChange={(e) => setQuickRate(Number(e.target.value))}
                      className="w-12 bg-transparent text-emerald-400 font-mono text-xs outline-none"
                    />
                    <span className="text-[10px] text-slate-500 font-mono">/hr</span>
                  </div>

                  <button
                    onClick={handleQuickAddStakeholder}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors shadow-sm shrink-0 min-h-[40px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Member</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Team members can view roster details and update their own profile. Role management and dual PM access are handled by PM and Admin roles only.</span>
            </div>
          )}

          {/* 🎛️ Comprehensive Filter & Sorting Toolbar */}
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold mr-1">
                  <Filter className="w-3.5 h-3.5 text-teal-400" />
                  <span>Filters:</span>
                </div>

                {/* 1. Canonical Role Filter */}
                <div className="relative">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="all">All Roles ({projectData.stakeholders.length})</option>
                    <option value="Admin">Admin</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Developer (Team member)">Developer (Team member)</option>
                    <option value="Tester (Team Member)">Tester (Team Member)</option>
                    <option value="UI/UX Dev (Team Member)">UI/UX Dev (Team Member)</option>
                    <option value="dual_pm_dev">⚡ Dual PM & Dev ({dualPMDevCount})</option>
                  </select>
                </div>

                {/* 2. Category Filter */}
                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="all">All Types</option>
                    <option value="internal">🏢 Internal ({internalCount})</option>
                    <option value="external">🌐 External ({externalCount})</option>
                  </select>
                </div>

                {/* 3. Status & Availability Filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">✓ Active Members</option>
                    <option value="on_leave">🏖️ On Leave</option>
                    <option value="overloaded">⚠️ Overloaded</option>
                    <option value="invited">✉️ Pending Invite</option>
                    <option value="placeholder">🧩 Dummy / Unassigned</option>
                  </select>
                </div>

                {/* Reset Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    <RotateCcw className="w-3 h-3 text-teal-400" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>Showing <strong>{filteredStakeholders.length}</strong> of {projectData.stakeholders.length} members</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TABULAR VIEW (TABLE) */}
          {/* ========================================================================= */}
          {layoutMode === 'table' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto custom-scrollbar-horizontal">
                <table className="w-full text-left text-xs border-collapse min-w-[860px]">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold select-none">
                      <th
                        onClick={() => handleToggleSort('name')}
                        className="py-3 px-4 cursor-pointer hover:text-slate-200 transition-colors whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Team Member</span>
                          {sortField === 'name' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-400" /> : <ArrowDown className="w-3 h-3 text-teal-400" />)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleToggleSort('role')}
                        className="py-3 px-3 cursor-pointer hover:text-slate-200 transition-colors whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Canonical Role</span>
                          {sortField === 'role' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-400" /> : <ArrowDown className="w-3 h-3 text-teal-400" />)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleToggleSort('category')}
                        className="py-3 px-3 cursor-pointer hover:text-slate-200 transition-colors whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Type</span>
                          {sortField === 'category' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-400" /> : <ArrowDown className="w-3 h-3 text-teal-400" />)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleToggleSort('status')}
                        className="py-3 px-3 cursor-pointer hover:text-slate-200 transition-colors whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Status & Leave</span>
                          {sortField === 'status' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-400" /> : <ArrowDown className="w-3 h-3 text-teal-400" />)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleToggleSort('utilization')}
                        className="py-3 px-3 cursor-pointer hover:text-slate-200 transition-colors whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Capacity & Workload</span>
                          {sortField === 'utilization' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-400" /> : <ArrowDown className="w-3 h-3 text-teal-400" />)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleToggleSort('tasks')}
                        className="py-3 px-3 cursor-pointer hover:text-slate-200 transition-colors whitespace-nowrap text-center"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>Tasks</span>
                          {sortField === 'tasks' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-400" /> : <ArrowDown className="w-3 h-3 text-teal-400" />)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleToggleSort('rate')}
                        className="py-3 px-3 cursor-pointer hover:text-slate-200 transition-colors whitespace-nowrap text-right"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Rate</span>
                          {sortField === 'rate' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-400" /> : <ArrowDown className="w-3 h-3 text-teal-400" />)}
                        </div>
                      </th>
                      <th className="py-3 px-3 whitespace-nowrap">Skills</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredStakeholders.map((sh) => {
                      const assignedTasks = projectData.tasks.filter(
                        t => t.assigneeIds.includes(sh.id) || projectData.subtasks.some(st => st.taskId === t.id && st.assigneeId === sh.id)
                      );
                      const isExternal = sh.category === 'external';
                      const wl = allWorkloads.find(w => w.stakeholder.id === sh.id);
                      const normRole = normalizeToAppRole(sh.appRole || sh.role);
                      const roleBadge = getAppRoleBadge(sh.appRole || sh.role, sh.isDualPMDev);
                      const onLeave = isUserOnLeave(sh.id, leaves || []);
                      const { effectiveCapacity } = calculateEffectiveWeeklyCapacity(sh.weeklyCapacityHours || 40, sh.id, leaves || []);
                      const assignedHours = wl ? wl.assignedHours : 0;
                      const utilPercent = effectiveCapacity > 0 ? Math.round((assignedHours / effectiveCapacity) * 100) : 0;
                      const isOverloaded = assignedHours > effectiveCapacity;

                      return (
                        <tr
                          key={sh.id}
                          className="hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* 1. Member / Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                <img
                                  src={sh.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sh.name)}`}
                                  alt={sh.name}
                                  className="w-9 h-9 rounded-full object-cover border border-slate-700 shadow-sm"
                                />
                                {onLeave && (
                                  <span className="absolute -bottom-1 -right-1 text-xs" title="Currently on approved leave">
                                    🏖️
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-100 text-xs truncate">{sh.name}</span>
                                  {sh.isDualPMDev && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0" title="Dual Role: Project Manager & Developer">
                                      ⚡ PM & Dev
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                  {sh.isPlaceholder || (sh.email && sh.email.includes('@placeholder')) ? (
                                    <span className="text-purple-300 italic">Unassigned (Dummy)</span>
                                  ) : (
                                    sh.email
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* 2. Canonical Role */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {canManageRoles ? (
                                <select
                                  value={normRole}
                                  onChange={(e) => handleQuickRoleChange(sh, e.target.value as AppRole)}
                                  className={`text-xs font-semibold rounded-lg px-2 py-1 outline-none cursor-pointer border ${roleBadge.badgeClass} bg-slate-950/80`}
                                  title="Change Canonical Role"
                                >
                                  {APP_ROLES.map(r => (
                                    <option key={r} value={r} className="bg-slate-900 text-slate-100">
                                      {r}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${roleBadge.badgeClass}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${roleBadge.dotColor}`} />
                                  <span>{normRole}</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. Category */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                              isExternal
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                            }`}>
                              {isExternal ? <Globe className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
                              <span>{isExternal ? 'External' : 'Internal'}</span>
                            </span>
                          </td>

                          {/* 4. Status & Leave */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {onLeave ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 animate-pulse">
                                <span>🏖️ On Leave</span>
                              </span>
                            ) : (sh.isPlaceholder || sh.status === 'placeholder') ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300">
                                <span>Dummy</span>
                              </span>
                            ) : sh.status === 'invited' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                                <span>Invited</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Active</span>
                              </span>
                            )}
                          </td>

                          {/* 5. Capacity & Workload */}
                          <td className="py-3 px-3 min-w-[160px]">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-mono">
                                <span className={isOverloaded ? 'text-rose-300 font-bold' : 'text-slate-300'}>
                                  {assignedHours}h / {effectiveCapacity}h
                                </span>
                                <span className={`font-bold ${
                                  isOverloaded ? 'text-rose-400' : utilPercent > 80 ? 'text-amber-400' : 'text-teal-400'
                                }`}>
                                  {utilPercent}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isOverloaded ? 'bg-rose-500' : utilPercent > 80 ? 'bg-amber-500' : 'bg-teal-500'
                                  }`}
                                  style={{ width: `${Math.min(utilPercent, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* 6. Tasks */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-indigo-300 font-mono font-bold text-xs">
                              {assignedTasks.length}
                            </span>
                          </td>

                          {/* 7. Rate */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <span className="font-mono font-bold text-emerald-400 text-xs">
                              ${sh.hourlyRate}/hr
                            </span>
                          </td>

                          {/* 8. Skills */}
                          <td className="py-3 px-3 max-w-[200px]">
                            <div className="flex flex-wrap gap-1">
                              {sh.skills && sh.skills.length > 0 ? (
                                <>
                                  {sh.skills.slice(0, 2).map((skill, idx) => (
                                    <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/80 text-[10px] text-slate-300 truncate max-w-[90px]">
                                      {skill}
                                    </span>
                                  ))}
                                  {sh.skills.length > 2 && (
                                    <span className="px-1 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                                      +{sh.skills.length - 2}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-500 text-[10px] italic">—</span>
                              )}
                            </div>
                          </td>

                          {/* 9. Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Individual Report Card */}
                              <button
                                onClick={() => setSelectedStakeholderForReport(sh)}
                                className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all"
                                title="View Performance & EVM Report Card"
                              >
                                <Award className="w-3.5 h-3.5" />
                              </button>

                              {/* Toggle Dual PM & Developer (PM / Admin only for Developers) */}
                              {canManageRoles && (normRole === 'Developer (Team member)' || sh.isDualPMDev) && (
                                <button
                                  onClick={() => handleToggleDualPMDev(sh)}
                                  className={`p-1.5 rounded-lg border transition-all ${
                                    sh.isDualPMDev
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-amber-300'
                                  }`}
                                  title={sh.isDualPMDev ? "Dual PM access active (Click to revoke PM privileges)" : "Enable Dual PM + Developer access (Grants full PM authority)"}
                                >
                                  <Zap className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Invite button if pending or dummy */}
                              {canManageRoles && (sh.isPlaceholder || sh.status === 'invited') && onOpenInviteModal && (
                                <button
                                  onClick={() => onOpenInviteModal({
                                    email: sh.email,
                                    name: sh.name,
                                    role: sh.role,
                                    category: sh.category,
                                    stakeholderId: sh.id
                                  })}
                                  className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30 transition-colors"
                                  title="Send Email Invitation"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Edit Modal */}
                              {canEditStakeholder(sh) && (
                                <button
                                  onClick={() => onOpenStakeholderModal(sh)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                  title="Edit Stakeholder"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Remove / Return to bench */}
                              {canManageRoles && (
                                <button
                                  onClick={() => setMemberToRemove(sh)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition-colors"
                                  title="Remove from project & return to bench"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* CARD GRID VIEW (ALTERNATIVE VIEW) */
            /* ========================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 min-w-0">
              {filteredStakeholders.map((sh) => {
                const assignedTasks = projectData.tasks.filter(
                  t => t.assigneeIds.includes(sh.id) || projectData.subtasks.some(st => st.taskId === t.id && st.assigneeId === sh.id)
                );
                const isExternal = sh.category === 'external';
                const wl = allWorkloads.find(w => w.stakeholder.id === sh.id);
                const normRole = normalizeToAppRole(sh.appRole || sh.role);
                const roleBadge = getAppRoleBadge(sh.appRole || sh.role, sh.isDualPMDev);
                const onLeave = isUserOnLeave(sh.id, leaves || []);

                return (
                  <div
                    key={sh.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 sm:p-5 rounded-2xl space-y-3.5 shadow-sm flex flex-col justify-between transition-all min-w-0 overflow-hidden"
                  >
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={sh.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sh.name)}`}
                            alt={sh.name}
                            className="w-11 h-11 rounded-full object-cover border-2 border-teal-500/30 shrink-0"
                          />
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-100 text-sm truncate">
                              {sh.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5 min-w-0">
                              <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${roleBadge.badgeClass}`}>
                                {normRole}
                              </span>
                              {sh.isDualPMDev && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  ⚡ Dual PM & Dev
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border flex items-center gap-1 shrink-0 ${
                                isExternal
                                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                                  : 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                              }`}>
                                {isExternal ? <Globe className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
                                <span>{isExternal ? 'External' : 'Internal'}</span>
                              </span>

                              {onLeave && (
                                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 flex items-center gap-1 shrink-0 animate-pulse">
                                  <span>🏖️ On Leave Now</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Edit / Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setSelectedStakeholderForReport(sh)}
                            className="px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[10px] font-bold transition-all flex items-center gap-1"
                            title="View Individual Report Card"
                          >
                            <Award className="w-3 h-3" />
                            <span>Report</span>
                          </button>
                          {canEditStakeholder(sh) && (
                            <button
                              onClick={() => onOpenStakeholderModal(sh)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                              title="Edit Stakeholder"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canManageRoles && (
                            <button
                              onClick={() => setMemberToRemove(sh)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition-colors"
                              title="Remove from project & return to bench"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Contact & Rates Details */}
                      <div className="mt-3.5 space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-3 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-slate-400 min-w-0">
                          <div className="flex items-center gap-2 min-w-0 truncate">
                            <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="truncate">
                              {sh.isPlaceholder || (sh.email && sh.email.includes('@placeholder'))
                                ? <em className="text-purple-300 font-sans font-medium">No email assigned</em>
                                : sh.email}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Billing Rate:</span>
                          </span>
                          <span className="font-mono font-bold text-emerald-400">${sh.hourlyRate}/hr</span>
                        </div>
                      </div>

                      {/* Skills Tags */}
                      <div className="mt-3">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Skills
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {sh.skills && sh.skills.length > 0 ? (
                            sh.skills.map((skill, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/80 text-[11px] text-slate-300">
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 text-[11px] italic">No skills listed</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Task & Workload Capacity Summary Footer */}
                    <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                        <span>Assigned Tasks:</span>
                        <strong className="text-indigo-300 font-mono ml-0.5">{assignedTasks.length}</strong>
                      </span>

                      {wl && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                          wl.overloaded
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            : 'bg-teal-500/10 border-teal-500/30 text-teal-300'
                        }`}>
                          {wl.assignedHours}h / {wl.capacityHours}h
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredStakeholders.length === 0 && (
            <EmptyState
              preset="users"
              title={hasActiveFilters ? 'No matching team members' : 'No stakeholders added yet'}
              description={
                hasActiveFilters
                  ? 'No project team members or stakeholders match your current role, status, or search filters.'
                  : 'Add project stakeholders, contributors, or team members to manage workload and assign tasks.'
              }
              action={
                hasActiveFilters
                  ? {
                      label: 'Clear All Filters',
                      onClick: handleResetFilters,
                      icon: RotateCcw,
                      variant: 'emerald'
                    }
                  : canManageRoles
                  ? {
                      label: 'Add Stakeholder',
                      onClick: () => onOpenStakeholderModal(),
                      icon: Plus,
                      variant: 'emerald'
                    }
                  : undefined
              }
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 📊 WORKLOAD & CAPACITY */}
      {/* ========================================================================= */}
      {activeTab === 'workload' && (
        <div className="space-y-5">
          {/* Workload Sub-View Switcher Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-2.5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 self-start sm:self-auto overflow-x-auto">
              <button
                onClick={() => setWorkloadSubView('heatmap')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  workloadSubView === 'heatmap'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>4-Week Capacity Heatmap</span>
              </button>

              <button
                onClick={() => setWorkloadSubView('chart')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  workloadSubView === 'chart'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Workload Distribution Chart</span>
              </button>

              <button
                onClick={() => setWorkloadSubView('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  workloadSubView === 'cards'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Member Capacity Cards</span>
              </button>
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-2 px-2">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span>
                {workloadSubView === 'heatmap' 
                  ? 'Forecasting 4-week capacity bottlenecks & leaf conflicts'
                  : `${allWorkloads.length} team members evaluated`}
              </span>
            </div>
          </div>

          {/* SUB-VIEW 1: 🔥 4-WEEK CAPACITY HEATMAP */}
          {workloadSubView === 'heatmap' && (
            <WorkloadHeatmap
              onOpenTaskModal={onOpenTaskModal}
              onOpenStakeholderModal={(shId) => {
                const sh = projectData.stakeholders.find(s => s.id === shId);
                if (sh) onOpenStakeholderModal(sh);
              }}
            />
          )}

          {/* SUB-VIEW 2: 📊 WORKLOAD DISTRIBUTION BAR CHART */}
          {workloadSubView === 'chart' && (
            <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm sm:text-base truncate">
                    Assigned Workload vs Weekly Capacity
                  </h3>
                  <p className="text-xs text-slate-400">
                    Active assigned task hours compared across team members
                  </p>
                </div>

                {/* Workload Status Filter */}
                <div className="flex items-center gap-1.5 text-xs bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                  <button
                    onClick={() => setWorkloadFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      workloadFilter === 'all' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All ({allWorkloads.length})
                  </button>
                  <button
                    onClick={() => setWorkloadFilter('overloaded')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
                      workloadFilter === 'overloaded' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Over-limit ({overloadedCount})</span>
                  </button>
                  <button
                    onClick={() => setWorkloadFilter('active')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      workloadFilter === 'active' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Active Tasks Only
                  </button>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" fontSize={11} unit="h" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '12px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Bar dataKey="Assigned" name="Assigned Workload (Hours)" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Capacity" name="Weekly Capacity (Hours)" fill="#6366f1" opacity={0.5} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* SUB-VIEW 3: 👥 DETAILED WORKLOAD CARDS GRID */}
          {workloadSubView === 'cards' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-100 text-sm">Individual Member Capacity Profiles</h3>
                <div className="flex items-center gap-1.5 text-xs bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setWorkloadFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      workloadFilter === 'all' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All ({allWorkloads.length})
                  </button>
                  <button
                    onClick={() => setWorkloadFilter('overloaded')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
                      workloadFilter === 'overloaded' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Overloaded ({overloadedCount})</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
                {filteredWorkloads.map((wl) => {
                  const sh = wl.stakeholder;
                  const assignedTasks = projectData.tasks.filter(
                    t => t.assigneeIds.includes(sh.id) && t.status !== 'done'
                  );
                  
                  // Effective capacity calculation
                  const baseCapacity = sh.weeklyCapacityHours || 40;
                  const capInfo = calculateEffectiveWeeklyCapacity(baseCapacity, sh.id, leaves || []);
                  const effectiveCapacity = capInfo.effectiveCapacity;
                  const blockedLeaveHours = capInfo.blockedHours;
                  const isOverloaded = effectiveCapacity > 0 ? wl.assignedHours > effectiveCapacity : wl.assignedHours > 0;
                  const effectiveUtilPercent = effectiveCapacity > 0 ? Math.round((wl.assignedHours / effectiveCapacity) * 100) : (wl.assignedHours > 0 ? 999 : 0);
                  const progressPct = Math.min(effectiveUtilPercent, 100);

                  // Check if member is on leave or has approved leaves
                  const onLeaveNow = isUserOnLeave(sh.id, leaves || []);
                  const userLeaves = (leaves || []).filter(l => l.userId === sh.id && l.status === 'approved');

                  // Check for tasks with leave conflicts
                  const conflictingTasks = assignedTasks.filter(t => {
                    const conflict = checkTaskLeaveConflict(
                      { startDate: t.startDate, dueDate: t.dueDate, assigneeIds: [sh.id] },
                      leaves || [],
                      projectData.stakeholders
                    );
                    return conflict.hasConflict;
                  });

                  return (
                    <div
                      key={sh.id}
                      className={`p-4 sm:p-5 rounded-2xl border bg-slate-900 transition-all min-w-0 overflow-hidden flex flex-col justify-between ${
                        isOverloaded || conflictingTasks.length > 0 ? 'border-amber-500/40 shadow-sm' : 'border-slate-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={sh.avatar}
                                alt={sh.name}
                                className="w-10 h-10 rounded-full object-cover border border-slate-700"
                              />
                              {onLeaveNow && (
                                <span className="absolute -bottom-1 -right-1 text-xs bg-slate-950 p-0.5 rounded-full" title="Currently on leave">
                                  🏖️
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <h4 className="font-bold text-slate-100 text-sm truncate">{sh.name}</h4>
                                {onLeaveNow && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40 shrink-0">
                                    On Leave
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 truncate">{sh.role}</p>
                            </div>
                          </div>

                          {canEditStakeholder(sh) ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => onOpenStakeholderModal(sh)}
                                className="text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors"
                              >
                                Edit
                              </button>
                              {isPM && (
                                <button
                                  onClick={() => setMemberToRemove(sh)}
                                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1"
                                  title={`Remove ${sh.name} & return to bench`}
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                  <span>Remove</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0" title="Read-only">
                              <Lock className="w-3 h-3 text-slate-500" />
                              <span>Read-Only</span>
                            </span>
                          )}
                        </div>

                        {/* Approved Leaves Banner if any */}
                        {userLeaves.length > 0 && (
                          <div className="mt-3 p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-[11px] text-amber-300">
                            <div className="flex items-center gap-1.5 truncate">
                              <span>🏖️</span>
                              <span className="truncate">
                                {userLeaves[0].leaveType}: {userLeaves[0].startDate} → {userLeaves[0].endDate}
                              </span>
                            </div>
                            {blockedLeaveHours > 0 && (
                              <span className="font-mono font-bold shrink-0 bg-amber-500/20 px-1.5 py-0.2 rounded">
                                -{blockedLeaveHours}h cap
                              </span>
                            )}
                          </div>
                        )}

                        {/* Workload Capacity Meter */}
                        <div className="mt-3.5 space-y-1.5">
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span className="text-slate-400 shrink-0">Effective Capacity</span>
                            <span className={`font-bold font-mono ${
                              isOverloaded ? 'text-rose-400' : effectiveUtilPercent > 80 ? 'text-amber-400' : 'text-teal-400'
                            }`}>
                              {wl.assignedHours}h / {effectiveCapacity}h ({effectiveUtilPercent}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isOverloaded
                                  ? 'bg-rose-500'
                                  : effectiveUtilPercent > 80
                                  ? 'bg-amber-500'
                                  : 'bg-teal-500'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          {blockedLeaveHours > 0 && (
                            <div className="text-[10px] text-slate-500 flex items-center justify-between font-mono">
                              <span>Base: {baseCapacity}h/wk</span>
                              <span className="text-amber-400/80">Blocked for leave: {blockedLeaveHours}h</span>
                            </div>
                          )}
                        </div>

                        {/* Financial & Task Metadata */}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400 border-t border-slate-800 pt-3 min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">Rate: ${sh.hourlyRate}/h</span>
                          </div>
                          <div className="flex items-center gap-1 min-w-0">
                            <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="truncate">Active: {wl.taskCount} tasks</span>
                          </div>
                        </div>

                        {/* Leave Availability Warning Banner */}
                        {conflictingTasks.length > 0 && (
                          <div className="mt-3 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span className="text-[11px] leading-tight">
                              <strong>{conflictingTasks.length} task(s)</strong> scheduled during approved leave periods!
                            </span>
                          </div>
                        )}

                        {/* Active Assigned Tasks List */}
                        <div className="mt-3 pt-2 space-y-1.5 min-w-0">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Assigned Work Items ({assignedTasks.length})
                          </span>
                          {assignedTasks.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">No active tasks assigned.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                              {assignedTasks.map(t => {
                                const isConflict = conflictingTasks.some(ct => ct.id === t.id);
                                return (
                                  <div
                                    key={t.id}
                                    className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 min-w-0 ${
                                      isConflict
                                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                                        : 'bg-slate-950/60 border-slate-800/60 text-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                                      {isConflict && <span title="Scheduled during approved leave">⚠️</span>}
                                      <span className="truncate">{t.title}</span>
                                    </div>
                                    <span className="text-slate-400 font-mono text-[10px] shrink-0 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                      {t.estimatedHours}h
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredWorkloads.length === 0 && (
            <EmptyState
              preset="chart"
              title="No workload records match this filter"
              description="Try resetting your capacity status filter or search keyword to view team allocation."
            />
          )}
        </div>
      )}

      {/* Individual Report Card Modal */}
      {selectedStakeholderForReport && (
        <IndividualReportCardModal
          stakeholder={selectedStakeholderForReport}
          isOpen={!!selectedStakeholderForReport}
          onClose={() => setSelectedStakeholderForReport(null)}
        />
      )}

      {/* Remove Member & Return to Bench Confirmation Modal */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <UserMinus className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-100">
                  Remove Member from Project?
                </h3>
                <p className="text-xs text-slate-400">
                  Unassign <strong className="text-slate-200">{memberToRemove.name}</strong> ({memberToRemove.role}) and return them to the organization's Bench pool.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-[11px]">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Workload & Assignment Impact:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 pl-1">
                <li>Active tasks will be unassigned so they can be re-allocated.</li>
                <li>The member's profile will be removed from this project's team directory & capacity matrix.</li>
                <li>They remain preserved on the organization Bench for future assignment.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveMember}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-950 flex items-center gap-1.5"
              >
                <UserMinus className="w-4 h-4" />
                <span>Remove & Return to Bench</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-emerald-500/40 text-emerald-300 text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl shadow-slate-950/60 flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
