import React, { useState, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  calculate4WeekCapacityHeatmap,
  Member4WeekHeatmap,
  MemberWeeklyLoad,
  WeekSlot,
  RebalancingSuggestion
} from '../../utils/workloadHeatmapUtils';
import {
  Users,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  User,
  Zap,
  Info,
  CalendarDays,
  ExternalLink,
  ShieldAlert,
  Percent,
  Hash,
  Scale,
  X,
  Check,
  Palmtree,
  ArrowUpRight,
  UserMinus
} from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { Stakeholder } from '../../types';

interface WorkloadHeatmapProps {
  onOpenTaskModal?: (taskId: string) => void;
  onOpenStakeholderModal?: (stakeholderId: string) => void;
}

export const WorkloadHeatmap: React.FC<WorkloadHeatmapProps> = ({
  onOpenTaskModal,
  onOpenStakeholderModal
}) => {
  const { projectData, saveTask, leaves, deleteStakeholder, currentUser } = useProject();
  const isAdmin = currentUser?.role === 'admin';
  const isPM = currentUser?.role === 'pm' || isAdmin;
  const isPrivileged = isPM || isAdmin;

  // Member removal modal & feedback state
  const [memberToRemove, setMemberToRemove] = useState<Stakeholder | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    const name = memberToRemove.name;
    await deleteStakeholder(memberToRemove.id);
    setMemberToRemove(null);
    triggerHaptic('success');
    setToastMessage(`✓ ${name} removed from project and returned to organization bench.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Anchor date state for week window navigation
  const [anchorDate, setAnchorDate] = useState<Date>(() => {
    // Default to current date or active sprint start date if available
    const activeSprint = projectData.sprints?.find(s => s.status === 'active');
    if (activeSprint?.startDate) {
      const d = new Date(activeSprint.startDate);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  // Display & Filter states
  const [displayMode, setDisplayMode] = useState<'percent' | 'hours' | 'variance'>('percent');
  const [bottleneckFilter, setBottleneckFilter] = useState<'all' | 'bottlenecks' | 'heavy' | 'available' | 'leave'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cell Inspector Modal state
  const [selectedCell, setSelectedCell] = useState<{
    member: Member4WeekHeatmap;
    weekLoad: MemberWeeklyLoad;
  } | null>(null);

  // Quick rebalance state
  const [rebalancingSuccessId, setRebalancingSuccessId] = useState<string | null>(null);

  // Compute 4-week heatmap data
  const heatmapData = useMemo(() => {
    return calculate4WeekCapacityHeatmap(projectData, leaves || [], anchorDate);
  }, [projectData, leaves, anchorDate]);

  // Unique roles for filter dropdown
  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    projectData.stakeholders.forEach(s => {
      if (s.role) roles.add(s.role);
    });
    return Array.from(roles);
  }, [projectData.stakeholders]);

  // Filter members based on user controls
  const filteredMembers = useMemo(() => {
    return heatmapData.members.filter(m => {
      // Role filter
      if (roleFilter !== 'all' && m.stakeholder.role !== roleFilter) {
        return false;
      }

      // Bottleneck filter
      if (bottleneckFilter === 'bottlenecks' && !m.hasBottleneck) {
        return false;
      }
      if (bottleneckFilter === 'heavy') {
        const hasHeavy = m.weeklyLoads.some(w => w.loadLevel === 'heavy' || w.loadLevel === 'overloaded' || w.loadLevel === 'critical');
        if (!hasHeavy) return false;
      }
      if (bottleneckFilter === 'available') {
        const isAvailable = m.averageUtilization < 70;
        if (!isAvailable) return false;
      }
      if (bottleneckFilter === 'leave') {
        const hasLeave = m.weeklyLoads.some(w => w.blockedLeaveHours > 0);
        if (!hasLeave) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = m.stakeholder.name.toLowerCase().includes(q);
        const matchesRole = m.stakeholder.role.toLowerCase().includes(q);
        const matchesSkills = (m.stakeholder.skills || []).some(s => s.toLowerCase().includes(q));
        const matchesTasks = m.weeklyLoads.some(w => 
          w.taskAllocations.some(t => t.taskTitle.toLowerCase().includes(q))
        );
        return matchesName || matchesRole || matchesSkills || matchesTasks;
      }

      return true;
    });
  }, [heatmapData.members, roleFilter, bottleneckFilter, searchQuery]);

  // Navigation handlers
  const handlePrev4Weeks = () => {
    const prev = new Date(anchorDate);
    prev.setDate(prev.getDate() - 28);
    setAnchorDate(prev);
    triggerHaptic('selection');
  };

  const handleNext4Weeks = () => {
    const next = new Date(anchorDate);
    next.setDate(next.getDate() + 28);
    setAnchorDate(next);
    triggerHaptic('selection');
  };

  const handleResetToToday = () => {
    setAnchorDate(new Date());
    triggerHaptic('selection');
  };

  const handleSprintSelect = (sprintId: string) => {
    const sprint = projectData.sprints?.find(s => s.id === sprintId);
    if (sprint?.startDate) {
      const d = new Date(sprint.startDate);
      if (!isNaN(d.getTime())) {
        setAnchorDate(d);
        triggerHaptic('selection');
      }
    }
  };

  // Rebalance execution handler
  const handleApplyRebalance = (suggestion: RebalancingSuggestion) => {
    const task = projectData.tasks.find(t => t.id === suggestion.taskId);
    if (!task) return;

    // Replace or add the new assignee
    let newAssignees = [...(task.assigneeIds || [])];
    // If fromMember is direct assignee, replace with toMember
    if (newAssignees.includes(suggestion.fromMemberId)) {
      newAssignees = newAssignees.filter(id => id !== suggestion.fromMemberId);
      if (!newAssignees.includes(suggestion.toMemberId)) {
        newAssignees.push(suggestion.toMemberId);
      }
    } else {
      newAssignees.push(suggestion.toMemberId);
    }

    saveTask({
      ...task,
      assigneeIds: newAssignees
    });

    setRebalancingSuccessId(suggestion.id);
    triggerHaptic('success');
    setTimeout(() => setRebalancingSuccessId(null), 3000);
  };

  // Cell style generator
  const getCellStyling = (load: MemberWeeklyLoad) => {
    switch (load.loadLevel) {
      case 'critical':
        return {
          container: 'bg-rose-950/70 border-rose-500/60 text-rose-100 hover:border-rose-400 shadow-sm shadow-rose-950/50',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          bar: 'bg-rose-500'
        };
      case 'overloaded':
        return {
          container: 'bg-amber-950/60 border-amber-500/50 text-amber-100 hover:border-amber-400 shadow-sm shadow-amber-950/50',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          bar: 'bg-amber-500'
        };
      case 'heavy':
        return {
          container: 'bg-amber-900/30 border-amber-700/40 text-amber-200 hover:border-amber-600/60',
          badge: 'bg-amber-600/20 text-amber-300 border-amber-600/30',
          bar: 'bg-amber-400'
        };
      case 'optimal':
        return {
          container: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-100 hover:border-emerald-500/50',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          bar: 'bg-emerald-500'
        };
      case 'light':
        return {
          container: 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700',
          badge: 'bg-slate-800 text-slate-400 border-slate-700',
          bar: 'bg-indigo-400'
        };
      case 'leave':
        return {
          container: 'bg-purple-950/50 border-purple-500/40 text-purple-200 hover:border-purple-400',
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          bar: 'bg-purple-500'
        };
      default:
        return {
          container: 'bg-slate-950/60 border-slate-800/60 text-slate-500 hover:border-slate-700',
          badge: 'bg-slate-900 text-slate-500 border-slate-800',
          bar: 'bg-slate-700'
        };
    }
  };

  const renderCellMetric = (load: MemberWeeklyLoad) => {
    if (load.loadLevel === 'leave') {
      return (
        <div className="flex flex-col items-center justify-center text-center">
          <span className="flex items-center gap-1 text-[11px] font-bold text-purple-300">
            <Palmtree className="w-3.5 h-3.5" />
            <span>On Leave</span>
          </span>
          <span className="text-[10px] text-purple-400/80 mt-0.5">
            {load.blockedLeaveHours}h blocked
          </span>
        </div>
      );
    }

    if (load.assignedHours === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-xs font-semibold text-slate-500">0%</span>
          <span className="text-[10px] text-slate-600 mt-0.5">0h / {load.effectiveCapacityHours}h</span>
        </div>
      );
    }

    if (displayMode === 'percent') {
      return (
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1">
            <span className="text-sm font-black font-mono tracking-tight">
              {load.utilizationPercent}%
            </span>
            {load.isBottleneck && (
              <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse shrink-0" />
            )}
          </div>
          <span className="text-[10px] opacity-75 mt-0.5">
            {load.assignedHours}h / {load.effectiveCapacityHours}h
          </span>
        </div>
      );
    }

    if (displayMode === 'hours') {
      return (
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1">
            <span className="text-sm font-black font-mono tracking-tight">
              {load.assignedHours}h
            </span>
            {load.isBottleneck && (
              <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
            )}
          </div>
          <span className="text-[10px] opacity-75 mt-0.5">
            Cap: {load.effectiveCapacityHours}h
          </span>
        </div>
      );
    }

    // Variance mode
    const isOver = load.varianceHours > 0;
    return (
      <div className="flex flex-col items-center justify-center text-center">
        <span className={`text-xs font-black font-mono ${isOver ? 'text-rose-300' : 'text-emerald-300'}`}>
          {isOver ? `+${load.varianceHours}h Over` : `${Math.abs(load.varianceHours)}h Avail`}
        </span>
        <span className="text-[10px] opacity-75 mt-0.5">
          {load.utilizationPercent}% utilized
        </span>
      </div>
    );
  };

  return (
    <div id="workload-4week-heatmap" className="space-y-5">
      {/* 1. TOP TELEMETRY / BOTTLENECK KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: 4-Week Team Utilization */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              4-Week Team Utilization
            </span>
            <Scale className="w-4 h-4 text-teal-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-slate-100">
              {heatmapData.overallTeamUtilization}%
            </span>
            <span className="text-xs text-slate-400">across 4 weeks</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                heatmapData.overallTeamUtilization > 100
                  ? 'bg-rose-500'
                  : heatmapData.overallTeamUtilization >= 80
                  ? 'bg-amber-500'
                  : 'bg-teal-500'
              }`}
              style={{ width: `${Math.min(100, heatmapData.overallTeamUtilization)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Bottleneck Members Flagged */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Bottleneck Members
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-rose-300">
              {heatmapData.totalBottleneckMembersCount}
            </span>
            <span className="text-xs text-slate-400">
              of {heatmapData.members.length} team members
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {heatmapData.totalBottleneckMembersCount > 0
              ? 'Exceeding 100% capacity in 1+ weeks'
              : 'All members within safe capacity'}
          </p>
        </div>

        {/* Card 3: Most Constrained Week */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Peak Bottleneck Window
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-amber-300 truncate">
              {heatmapData.mostConstrainedWeek
                ? heatmapData.mostConstrainedWeek.shortLabel
                : 'Balanced Load'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {heatmapData.mostConstrainedWeek
              ? `Highest concentration of overallocations`
              : 'No critical capacity pinch points'}
          </p>
        </div>

        {/* Card 4: Quick Anchor / Sprint Sync */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Timeline Window
            </span>
            <CalendarDays className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrev4Weeks}
              title="Previous 4 Weeks"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetToToday}
              className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1 truncate transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-teal-400" />
              <span>Current Week</span>
            </button>
            <button
              onClick={handleNext4Weeks}
              title="Next 4 Weeks"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="text-[10px] text-slate-400 text-center truncate">
            {heatmapData.weekSlots[0]?.startDate} → {heatmapData.weekSlots[3]?.endDate}
          </div>
        </div>
      </div>

      {/* 2. PROACTIVE REBALANCING ALERT (When bottlenecks exist) */}
      {heatmapData.rebalancingSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-indigo-950/30 border border-rose-500/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0">
                <Flame className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>Proactive Capacity Rebalancing Recommendations</span>
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    {heatmapData.rebalancingSuggestions.length} Bottlenecks Identified
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  Pre-empt task delays by shifting workload from overloaded members to available peers
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {heatmapData.rebalancingSuggestions.map(sug => (
              <div
                key={sug.id}
                className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-semibold text-slate-300 font-mono">
                      {sug.weekLabel}
                    </span>
                    <span className="text-xs font-semibold text-amber-300">
                      Shift {sug.hoursToMove} Hours
                    </span>
                  </div>
                  <h5 className="font-bold text-xs text-slate-200 line-clamp-1">
                    Task: {sug.taskTitle}
                  </h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {sug.reason}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                    <span className="font-semibold text-rose-300">{sug.fromMemberName}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span className="font-semibold text-emerald-300">{sug.toMemberName}</span>
                  </div>

                  <button
                    onClick={() => handleApplyRebalance(sug)}
                    className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-[11px] flex items-center gap-1 transition-all shadow-sm"
                  >
                    {rebalancingSuccessId === sug.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-200" />
                        <span>Rebalanced!</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3" />
                        <span>1-Click Rebalance</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. HEATMAP CONTROLS BAR */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
        {/* Left: Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </span>

          <button
            onClick={() => {
              setBottleneckFilter('all');
              triggerHaptic('selection');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              bottleneckFilter === 'all'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All ({heatmapData.members.length})
          </button>

          <button
            onClick={() => {
              setBottleneckFilter('bottlenecks');
              triggerHaptic('selection');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
              bottleneckFilter === 'bottlenecks'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-950 text-rose-400 hover:text-rose-300 border border-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Bottlenecks ({heatmapData.totalBottleneckMembersCount})</span>
          </button>

          <button
            onClick={() => {
              setBottleneckFilter('heavy');
              triggerHaptic('selection');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              bottleneckFilter === 'heavy'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Heavy Load (&gt;85%)
          </button>

          <button
            onClick={() => {
              setBottleneckFilter('available');
              triggerHaptic('selection');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              bottleneckFilter === 'available'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Available (&lt;70%)
          </button>

          {/* Role Dropdown */}
          <select
            value={roleFilter}
            onChange={e => {
              setRoleFilter(e.target.value);
              triggerHaptic('selection');
            }}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 outline-none focus:border-teal-500"
          >
            <option value="all">All Roles</option>
            {uniqueRoles.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Right: Display Mode & Sprint Anchor */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sprint Anchor Selector */}
          {projectData.sprints && projectData.sprints.length > 0 && (
            <select
              onChange={e => handleSprintSelect(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 outline-none focus:border-teal-500"
              defaultValue=""
            >
              <option value="" disabled>Anchor to Sprint...</option>
              {projectData.sprints.map(sp => (
                <option key={sp.id} value={sp.id}>
                  {sp.name} ({sp.status})
                </option>
              ))}
            </select>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search member, skill, task..."
              className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 w-44 sm:w-52"
            />
          </div>

          {/* Metric Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setDisplayMode('percent');
                triggerHaptic('selection');
              }}
              title="Show Utilization %"
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                displayMode === 'percent'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setDisplayMode('hours');
                triggerHaptic('selection');
              }}
              title="Show Assigned Hours / Capacity"
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                displayMode === 'hours'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setDisplayMode('variance');
                triggerHaptic('selection');
              }}
              title="Show Hours Variance (+Over / -Avail)"
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                displayMode === 'variance'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. VISUAL 4-WEEK CAPACITY HEATMAP MATRIX */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Heatmap Legend */}
        <div className="bg-slate-950/70 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-300">
            <Flame className="w-4 h-4 text-rose-400" />
            <span>4-Week Team Capacity Heatmap Matrix</span>
            <span className="text-[11px] text-slate-500 font-normal">
              (Click any cell to inspect scheduled tasks & rebalance)
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-3 rounded-sm bg-rose-600 border border-rose-400" />
              <span>Critical (&gt;120%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-3 rounded-sm bg-amber-600 border border-amber-400" />
              <span>Overloaded (101-120%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-3 rounded-sm bg-amber-500/40 border border-amber-500/60" />
              <span>Heavy (85-100%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-3 rounded-sm bg-emerald-600/60 border border-emerald-400/80" />
              <span>Optimal (50-84%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-3 rounded-sm bg-slate-800 border border-slate-700" />
              <span>Light (&lt;50%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-3 rounded-sm bg-purple-900 border border-purple-500" />
              <span>Leave / PTO</span>
            </span>
          </div>
        </div>

        {/* Heatmap Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4 w-72">Team Member</th>
                {heatmapData.weekSlots.map((slot, idx) => (
                  <th key={idx} className="py-3 px-3 text-center min-w-[130px]">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1">
                        <span>{slot.label.split('(')[0]}</span>
                        {slot.isCurrentWeek && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                            Current
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {slot.startDate.slice(5)} → {slot.endDate.slice(5)}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="py-3 px-4 text-center w-36">4-Wk Avg Load</th>
                <th className="py-3 px-3 text-center w-28">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {filteredMembers.map(member => (
                <tr key={member.stakeholder.id} className="hover:bg-slate-950/40 transition-colors">
                  {/* Member Profile */}
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={member.stakeholder.avatar}
                            alt={member.stakeholder.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-700"
                          />
                          {member.hasBottleneck && (
                            <span
                              title="Bottleneck Warning"
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-slate-900 flex items-center justify-center text-[9px] text-white font-bold"
                            >
                              !
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <button
                              onClick={() => onOpenStakeholderModal?.(member.stakeholder.id)}
                              className="font-bold text-slate-100 hover:text-teal-400 transition-colors truncate text-xs text-left"
                            >
                              {member.stakeholder.name}
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {member.stakeholder.role}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-500 font-mono">
                            <span>Cap: {member.stakeholder.weeklyCapacityHours || 40}h/wk</span>
                            {member.stakeholder.skills && member.stakeholder.skills.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[100px] text-slate-400">
                                  {member.stakeholder.skills[0]}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Compact Quick Remove Button next to member info */}
                      {isPrivileged && (
                        <button
                          onClick={() => setMemberToRemove(member.stakeholder)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                          title={`Unassign ${member.stakeholder.name} and return to bench`}
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* 4 Week Heatmap Cells */}
                  {member.weeklyLoads.map((load, wIdx) => {
                    const styling = getCellStyling(load);
                    return (
                      <td key={wIdx} className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => {
                            setSelectedCell({ member, weekLoad: load });
                            triggerHaptic('selection');
                          }}
                          className={`w-full py-2 px-1.5 rounded-xl border transition-all cursor-pointer group flex flex-col items-center justify-center relative overflow-hidden ${styling.container}`}
                          title={`Click to inspect ${load.taskAllocations.length} tasks in ${load.weekSlot.label}`}
                        >
                          {/* Mini Progress Bar Underlay */}
                          <div className="w-full bg-slate-950/40 h-1 rounded-full overflow-hidden mb-1.5">
                            <div
                              className={`h-full ${styling.bar}`}
                              style={{ width: `${Math.min(100, load.utilizationPercent)}%` }}
                            />
                          </div>

                          {renderCellMetric(load)}

                          {/* Task Count Chip */}
                          {load.taskAllocations.length > 0 && (
                            <span className="text-[9px] text-slate-400/90 mt-1 flex items-center gap-0.5 group-hover:text-slate-200">
                              <span>{load.taskAllocations.length} {load.taskAllocations.length === 1 ? 'task' : 'tasks'}</span>
                              <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}

                  {/* 4-Week Average Column */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-xs font-black font-mono ${
                        member.averageUtilization > 100
                          ? 'text-rose-300'
                          : member.averageUtilization >= 80
                          ? 'text-amber-300'
                          : 'text-slate-200'
                      }`}>
                        {member.averageUtilization}%
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {member.totalAssignedHours}h / {member.totalEffectiveCapacity}h
                      </span>

                      {member.hasBottleneck ? (
                        <span className="mt-1 px-2 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {member.bottleneckWeeksCount} Wk Over
                        </span>
                      ) : member.averageUtilization < 60 ? (
                        <span className="mt-1 px-2 py-0.2 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Available
                        </span>
                      ) : (
                        <span className="mt-1 px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Optimal
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions Column */}
                  <td className="py-3 px-3 text-center">
                    {isPrivileged ? (
                      <button
                        onClick={() => setMemberToRemove(member.stakeholder)}
                        title={`Remove ${member.stakeholder.name} from project & return to bench`}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500/50 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 mx-auto group shadow-sm"
                      >
                        <UserMinus className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">—</span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-300">No matching team members found</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your filter criteria or search query.</p>
                  </td>
                </tr>
              )}
            </tbody>

            {/* SUMMARY FOOTER ROW */}
            <tfoot>
              <tr className="bg-slate-950 border-t-2 border-slate-800 text-slate-200 text-xs font-bold">
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-400" />
                    <span>Team Weekly Aggregate Demand</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                    Total Effort vs Available Capacity
                  </span>
                </td>

                {heatmapData.teamWeeklyTotals.map((tot, idx) => (
                  <td key={idx} className="py-3 px-3 text-center">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-black font-mono ${
                          tot.averageUtilization > 100
                            ? 'text-rose-300'
                            : tot.averageUtilization >= 80
                            ? 'text-amber-300'
                            : 'text-emerald-300'
                        }`}>
                          {tot.averageUtilization}% Utilized
                        </span>
                        {tot.isTeamOverCapacity && (
                          <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {tot.totalAssignedHours}h / {tot.totalEffectiveCapacity}h
                      </span>

                      {tot.bottleneckMembersCount > 0 ? (
                        <span className="mt-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          {tot.bottleneckMembersCount} Overloaded
                        </span>
                      ) : (
                        <span className="mt-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Balanced
                        </span>
                      )}
                    </div>
                  </td>
                ))}

                <td className="py-3.5 px-4 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-black font-mono text-teal-300">
                      {heatmapData.overallTeamUtilization}% Total
                    </span>
                    <span className="text-[10px] text-slate-400">
                      4-Wk Net Balance
                    </span>
                  </div>
                </td>

                <td className="py-3.5 px-3 text-center text-slate-500 font-mono text-[10px]">
                  —
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. CELL TASK INSPECTOR & REBALANCE MODAL / DRAWER */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 bg-slate-950/80">
              <div className="flex items-center gap-3">
                <img
                  src={selectedCell.member.stakeholder.avatar}
                  alt={selectedCell.member.stakeholder.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-700"
                />
                <div>
                  <h3 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
                    <span>{selectedCell.member.stakeholder.name}</span>
                    <span className="text-xs font-normal text-slate-400">
                      • {selectedCell.member.stakeholder.role}
                    </span>
                  </h3>
                  <p className="text-xs text-teal-400 font-medium">
                    {selectedCell.weekLoad.weekSlot.label}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCell(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Capacity Telemetry Pill */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Workload</span>
                  <span className="text-lg font-black font-mono text-slate-100">
                    {selectedCell.weekLoad.assignedHours} Hours
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Effective Cap</span>
                  <span className="text-lg font-black font-mono text-slate-100">
                    {selectedCell.weekLoad.effectiveCapacityHours} Hours
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Utilization</span>
                  <span className={`text-lg font-black font-mono ${
                    selectedCell.weekLoad.utilizationPercent > 100 ? 'text-rose-300' : 'text-emerald-300'
                  }`}>
                    {selectedCell.weekLoad.utilizationPercent}%
                  </span>
                </div>
              </div>

              {/* Leave Notices if any */}
              {selectedCell.weekLoad.leavesInWeek.length > 0 && (
                <div className="bg-purple-950/40 border border-purple-500/30 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-purple-300 font-bold">
                    <Palmtree className="w-4 h-4" />
                    <span>Scheduled Leave in this Window</span>
                  </div>
                  {selectedCell.weekLoad.leavesInWeek.map((l, i) => (
                    <div key={i} className="flex items-center justify-between text-slate-300 text-[11px]">
                      <span>{l.type.toUpperCase()}: {l.reason || 'Personal / PTO'}</span>
                      <span className="font-mono text-purple-300">{l.startDate} → {l.endDate} ({l.hoursCount || 40}h)</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tasks Scheduled in This Week */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                    Assigned Tasks Active in this Week ({selectedCell.weekLoad.taskAllocations.length})
                  </h4>
                  <span className="text-xs text-slate-500">
                    Distributed proportionally across working days
                  </span>
                </div>

                {selectedCell.weekLoad.taskAllocations.length === 0 ? (
                  <div className="p-6 text-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-xs text-slate-400">
                    No tasks scheduled for this team member in {selectedCell.weekLoad.weekSlot.label}.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedCell.weekLoad.taskAllocations.map(taskAlloc => {
                      const taskObj = projectData.tasks.find(t => t.id === taskAlloc.taskId);
                      return (
                        <div
                          key={taskAlloc.taskId}
                          className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-2 hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-slate-200">
                                  {taskAlloc.taskTitle}
                                </span>
                                {taskAlloc.sprintName && (
                                  <span className="px-2 py-0.2 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                                    {taskAlloc.sprintName}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span>Timeline: {taskAlloc.taskStartDate} → {taskAlloc.taskDueDate}</span>
                                <span>•</span>
                                <span>Status: {taskAlloc.taskStatus}</span>
                                <span>•</span>
                                <span>Priority: {taskAlloc.taskPriority}</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-black font-mono text-teal-300 block">
                                {taskAlloc.allocatedHoursThisWeek}h
                              </span>
                              <span className="text-[9px] text-slate-500">
                                of {taskAlloc.totalTaskHours}h total
                              </span>
                            </div>
                          </div>

                          {/* Quick Actions for this task */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
                            <button
                              onClick={() => {
                                setSelectedCell(null);
                                onOpenTaskModal?.(taskAlloc.taskId);
                              }}
                              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View Task Details</span>
                            </button>

                            {/* Quick Reassign Dropdown */}
                            {taskObj && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500">Reassign to:</span>
                                <select
                                  onChange={e => {
                                    const targetMemberId = e.target.value;
                                    if (!targetMemberId) return;
                                    const newAssignees = (taskObj.assigneeIds || [])
                                      .filter(id => id !== selectedCell.member.stakeholder.id);
                                    if (!newAssignees.includes(targetMemberId)) {
                                      newAssignees.push(targetMemberId);
                                    }
                                    saveTask({
                                      ...taskObj,
                                      assigneeIds: newAssignees
                                    });
                                    triggerHaptic('success');
                                  }}
                                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-[11px] text-slate-200 outline-none focus:border-teal-500"
                                  defaultValue=""
                                >
                                  <option value="" disabled>Choose team member...</option>
                                  {projectData.stakeholders
                                    .filter(s => s.id !== selectedCell.member.stakeholder.id)
                                    .map(s => (
                                      <option key={s.id} value={s.id}>
                                        {s.name} ({s.role})
                                      </option>
                                    ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-800 p-4 bg-slate-950/80 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-slate-400">
                {selectedCell.weekLoad.isBottleneck ? (
                  <span className="text-rose-400 font-semibold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" />
                    Bottleneck: {selectedCell.weekLoad.varianceHours}h over capacity
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Within safe capacity threshold
                  </span>
                )}
              </span>

              <div className="flex items-center gap-2">
                {isPrivileged && (
                  <button
                    onClick={() => {
                      const sh = selectedCell.member.stakeholder;
                      setSelectedCell(null);
                      setMemberToRemove(sh);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>Unassign & Return to Bench</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedCell(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. REMOVE MEMBER & RETURN TO BENCH CONFIRMATION MODAL */}
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
                <li>The member's profile will be removed from this project's capacity matrix.</li>
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
