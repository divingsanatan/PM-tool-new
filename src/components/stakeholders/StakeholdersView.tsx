import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { calculateStakeholderWorkloads } from '../../utils/evm';
import { Stakeholder, StakeholderCategory } from '../../types';
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
  UserMinus
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

interface StakeholdersViewProps {
  onOpenStakeholderModal: (stakeholder?: Stakeholder) => void;
  onOpenInviteModal?: (email?: string) => void;
  onOpenTaskModal?: (taskId: string) => void;
  initialTab?: 'directory' | 'workload';
}

export const StakeholdersView: React.FC<StakeholdersViewProps> = ({
  onOpenStakeholderModal,
  onOpenInviteModal,
  onOpenTaskModal,
  initialTab = 'directory'
}) => {
  const { projectData, saveStakeholder, deleteStakeholder, currentUser, leaves } = useProject();
  const isAdmin = currentUser?.role === 'admin';
  const isPM = currentUser?.role === 'pm' || isAdmin;

  const [activeTab, setActiveTab] = useState<'directory' | 'workload'>(initialTab);
  const [workloadSubView, setWorkloadSubView] = useState<'heatmap' | 'chart' | 'cards'>('heatmap');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'internal' | 'external'>('all');
  const [workloadFilter, setWorkloadFilter] = useState<'all' | 'overloaded' | 'active'>('all');
  const [selectedStakeholderForReport, setSelectedStakeholderForReport] = useState<Stakeholder | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<Stakeholder | null>(null);

  // Quick Add State
  const [quickName, setQuickName] = useState('');
  const [quickRole, setQuickRole] = useState('Contributor');
  const [quickCategory, setQuickCategory] = useState<StakeholderCategory>('internal');
  const [quickRate, setQuickRate] = useState(85);
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
    if (isPM) return true;
    if (sh.id === currentUser?.id) return true;
    if (sh.email && sh.email.toLowerCase() === currentUser?.email.toLowerCase()) return true;
    return false;
  };

  const handleQuickAddStakeholder = () => {
    if (!quickName.trim()) return;

    // Enforce role: If internal, only admin can set a custom role. Otherwise defaults to Contributor.
    const resolvedRole = quickCategory === 'internal' && !isAdmin ? 'Contributor' : (quickRole.trim() || 'Contributor');

    const newSh: Stakeholder = {
      id: `sh-${Date.now()}`,
      name: quickName.trim(),
      email: `${quickName.trim().toLowerCase().replace(/\s+/g, '.')}@company.com`,
      role: resolvedRole,
      category: quickCategory,
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80`,
      hourlyRate: Number(quickRate) || 85,
      weeklyCapacityHours: 40,
      skills: [resolvedRole, 'Agile'],
      status: 'active',
      createdBy: currentUser?.id,
      createdByEmail: currentUser?.email
    };

    saveStakeholder(newSh);
    setQuickName('');
    if (quickCategory === 'internal' && !isAdmin) {
      setQuickRole('Contributor');
    }
    setToastMessage(`⚡ ${quickCategory === 'external' ? 'External' : 'Internal'} team member "${quickName.trim()}" added!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Workload calculations
  const allWorkloads = useMemo(() => {
    return calculateStakeholderWorkloads(
      projectData.stakeholders,
      projectData.tasks,
      projectData.subtasks
    );
  }, [projectData.stakeholders, projectData.tasks, projectData.subtasks]);

  // Filtered Stakeholders
  const filteredStakeholders = useMemo(() => {
    return projectData.stakeholders.filter(sh => {
      // Category filter
      if (categoryFilter !== 'all' && (sh.category || 'internal') !== categoryFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = sh.name.toLowerCase().includes(q);
        const matchesRole = sh.role.toLowerCase().includes(q);
        const matchesEmail = sh.email.toLowerCase().includes(q);
        const matchesSkill = sh.skills?.some(s => s.toLowerCase().includes(q));
        if (!matchesName && !matchesRole && !matchesEmail && !matchesSkill) {
          return false;
        }
      }
      return true;
    });
  }, [projectData.stakeholders, categoryFilter, searchQuery]);

  // Filtered Workloads
  const filteredWorkloads = useMemo(() => {
    return allWorkloads.filter(wl => {
      const sh = wl.stakeholder;
      // Category filter
      if (categoryFilter !== 'all' && (sh.category || 'internal') !== categoryFilter) {
        return false;
      }
      // Workload status filter
      if (workloadFilter === 'overloaded' && !wl.overloaded) {
        return false;
      }
      if (workloadFilter === 'active' && wl.taskCount === 0) {
        return false;
      }
      // Search query
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
  const activeLeavesCount = projectData.stakeholders.filter(s => isUserOnLeave(s.id, leaves || [])).length;
  const totalAssignedHours = allWorkloads.reduce((sum, w) => sum + w.assignedHours, 0);
  const totalCapacityHours = allWorkloads.reduce((sum, w) => {
    const { effectiveCapacity } = calculateEffectiveWeeklyCapacity(w.stakeholder.weeklyCapacityHours || 40, w.stakeholder.id, leaves || []);
    return sum + effectiveCapacity;
  }, 0);
  const overloadedCount = allWorkloads.filter(w => {
    const { effectiveCapacity } = calculateEffectiveWeeklyCapacity(w.stakeholder.weeklyCapacityHours || 40, w.stakeholder.id, leaves || []);
    return w.assignedHours > effectiveCapacity;
  }).length;
  const avgHourlyRate = totalStakeholders > 0
    ? Math.round(projectData.stakeholders.reduce((sum, s) => sum + (s.hourlyRate || 80), 0) / totalStakeholders)
    : 80;

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
                  Team & Workload Management
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Project directory, role assignments, hourly rates, and capacity balancing.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions (PM & Team) */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {isPM && onOpenInviteModal && (
              <button
                onClick={() => onOpenInviteModal()}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold text-xs transition-colors shadow-sm flex-1 sm:flex-none whitespace-nowrap"
              >
                <Mail className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Invite Member</span>
              </button>
            )}
            {isPM && (
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
                  <span>{overloadedCount} Over-limit</span>
                </span>
              ) : (
                <span className="text-base sm:text-lg font-bold font-mono text-emerald-400 flex items-center gap-1">
                  <span>100% Balanced</span>
                </span>
              )}
              <span className="text-[10px] text-slate-500 block truncate">
                {overloadedCount > 0 ? 'Workload rebalance advised' : 'All members within limits'}
              </span>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              overloadedCount > 0
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}>
              {overloadedCount > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 font-medium block truncate">Avg. Blended Rate</span>
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-400">${avgHourlyRate}/hr</span>
              <span className="text-[10px] text-slate-500 block truncate">Standard billing metric</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* 🎛️ Unified Tab Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-2 sm:p-2.5 rounded-2xl">
        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'directory'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Directory</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'directory' ? 'bg-teal-700 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {projectData.stakeholders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('workload')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'workload'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Workload & Capacity</span>
            {overloadedCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" title={`${overloadedCount} overloaded`} />
            )}
          </button>
        </div>

        {/* Global Search & Filters within View */}
        <div className="flex items-center gap-2 flex-1 sm:flex-none sm:min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'directory' ? "Search team, roles, skills..." : "Filter workload by name..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 👥 TEAM DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Quick Add Stakeholder Bar (PM Only) */}
          {isPM ? (
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
                  className="flex-1 min-w-[220px] bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none shadow-inner min-h-[40px]"
                />

                <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
                  {/* Category Dropdown */}
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-xl min-h-[40px]">
                    <select
                      value={quickCategory}
                      onChange={(e) => {
                        const cat = e.target.value as StakeholderCategory;
                        setQuickCategory(cat);
                        if (cat === 'internal' && !isAdmin) {
                          setQuickRole('Contributor');
                        }
                      }}
                      className="bg-transparent text-slate-200 text-xs font-semibold outline-none cursor-pointer"
                      title="Select Stakeholder Type"
                    >
                      <option value="internal" className="bg-slate-900 text-slate-100">🏢 Internal</option>
                      <option value="external" className="bg-slate-900 text-slate-100">🌐 External</option>
                    </select>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      disabled={quickCategory === 'internal' && !isAdmin}
                      placeholder={quickCategory === 'internal' && !isAdmin ? "Role: Contributor (Admin Set)" : "Role (e.g. Lead Designer)"}
                      value={quickCategory === 'internal' && !isAdmin ? "Contributor (Admin Managed)" : quickRole}
                      onChange={(e) => setQuickRole(e.target.value)}
                      title={quickCategory === 'internal' && !isAdmin ? "Only Organization Administrators can assign custom roles for internal stakeholders." : "Role / Title"}
                      className={`bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl outline-none text-xs w-48 min-h-[40px] ${
                        quickCategory === 'internal' && !isAdmin
                          ? 'text-slate-400 bg-slate-950/80 cursor-not-allowed border-dashed'
                          : 'text-teal-300 focus:border-teal-500'
                      }`}
                    />
                    {quickCategory === 'internal' && !isAdmin && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-400 text-[10px] flex items-center gap-0.5 pointer-events-none" title="Admin role lock">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </div>

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
              <span>Team members can view roster details and update their own profile. Only Project Managers can add or modify other team members.</span>
            </div>
          )}

          {/* Category Filter Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400 flex-wrap">
              <Filter className="w-4 h-4 text-teal-400 shrink-0" />
              <span className="font-semibold text-slate-300">Filter View:</span>
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                    categoryFilter === 'all' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({projectData.stakeholders.length})
                </button>
                <button
                  onClick={() => setCategoryFilter('internal')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                    categoryFilter === 'internal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Building2 className="w-3 h-3" />
                  <span>Internal ({internalCount})</span>
                </button>
                <button
                  onClick={() => setCategoryFilter('external')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                    categoryFilter === 'external' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  <span>External ({externalCount})</span>
                </button>
              </div>
            </div>

            {searchQuery && (
              <span className="text-[11px] text-slate-400">
                Found <strong>{filteredStakeholders.length}</strong> matching members
              </span>
            )}
          </div>

          {/* Stakeholders Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 min-w-0">
            {filteredStakeholders.map((sh) => {
              const assignedTasks = projectData.tasks.filter(
                t => t.assigneeIds.includes(sh.id) || projectData.subtasks.some(st => st.taskId === t.id && st.assigneeId === sh.id)
              );
              const isExternal = sh.category === 'external';
              const wl = allWorkloads.find(w => w.stakeholder.id === sh.id);

              return (
                <div
                  key={sh.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 sm:p-5 rounded-2xl space-y-3.5 shadow-sm flex flex-col justify-between transition-all min-w-0 overflow-hidden"
                >
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={sh.avatar}
                          alt={sh.name}
                          className="w-11 h-11 rounded-full object-cover border-2 border-teal-500/30 shrink-0"
                        />
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-100 text-sm truncate">
                            {sh.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 min-w-0">
                            <span className="text-xs text-teal-400 font-medium truncate">{sh.role}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border flex items-center gap-1 shrink-0 ${
                              isExternal
                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                                : 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                            }`}>
                              {isExternal ? <Globe className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
                              <span>{isExternal ? 'External' : 'Internal'}</span>
                            </span>

                            {/* Leave Status Badge */}
                            {isUserOnLeave(sh.id, leaves || []) ? (
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 flex items-center gap-1 shrink-0 animate-pulse">
                                <span>🏖️ On Leave Now</span>
                              </span>
                            ) : (
                              (leaves || []).filter(l => l.userId === sh.id && l.status === 'approved').length > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1 shrink-0">
                                  <span>🏖️ Leave Scheduled</span>
                                </span>
                              )
                            )}

                            {/* Status Badges */}
                            {(sh.isPlaceholder || sh.status === 'placeholder') && (
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center gap-1 shrink-0">
                                <span>Dummy / Unassigned</span>
                              </span>
                            )}
                            {sh.status === 'invited' && (
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1 shrink-0">
                                <span>Invite Pending</span>
                              </span>
                            )}
                            {sh.status === 'active' && !sh.isPlaceholder && (
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1 shrink-0">
                                <span>✓ Active</span>
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
                        {canEditStakeholder(sh) ? (
                          <>
                            <button
                              onClick={() => onOpenStakeholderModal(sh)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                              title="Edit Stakeholder"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setMemberToRemove(sh)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition-colors"
                              title="Remove from project & return to bench"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-semibold text-slate-500 flex items-center gap-1" title="Read-only">
                            <Lock className="w-3 h-3 text-slate-500" />
                            <span>Read-Only</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contact & Rates Details */}
                    <div className="mt-3.5 space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-3 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-slate-400 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 truncate">
                          <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate">
                            {sh.isPlaceholder || sh.email.includes('@placeholder')
                              ? <em className="text-purple-300 font-sans font-medium">No email assigned</em>
                              : sh.email}
                          </span>
                        </div>
                        {isPM && (
                          sh.isPlaceholder || sh.email.includes('@placeholder') ? (
                            <button
                              onClick={() => onOpenStakeholderModal(sh)}
                              className="px-2 py-0.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-[10px] font-bold transition-colors shrink-0 flex items-center gap-1"
                            >
                              <Mail className="w-2.5 h-2.5 text-purple-300" />
                              <span>Assign Email</span>
                            </button>
                          ) : (
                            onOpenInviteModal && (
                              <button
                                onClick={() => onOpenInviteModal(sh.email)}
                                className="px-2 py-0.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold transition-colors shrink-0 flex items-center gap-1"
                              >
                                <Mail className="w-2.5 h-2.5" />
                                <span>{sh.status === 'invited' ? 'Resend Invite' : 'Send Invite'}</span>
                              </button>
                            )
                          )
                        )}
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

          {filteredStakeholders.length === 0 && (
            <EmptyState
              preset="users"
              title={searchQuery || categoryFilter !== 'all' ? 'No matching team members' : 'No stakeholders added yet'}
              description={
                searchQuery || categoryFilter !== 'all'
                  ? 'No project team members or stakeholders match your search and category filters.'
                  : 'Add project stakeholders, contributors, or team members to manage workload and assign tasks.'
              }
              action={
                isAdmin
                  ? {
                      label: 'Add Stakeholder',
                      onClick: () => onOpenStakeholderModal(),
                      icon: Plus,
                      variant: 'emerald'
                    }
                  : undefined
              }
              secondaryAction={
                searchQuery || categoryFilter !== 'all'
                  ? {
                      label: 'Clear Filters',
                      onClick: () => {
                        setSearchQuery('');
                        setCategoryFilter('all');
                      }
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
