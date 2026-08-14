import React, { useState, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Task, Stakeholder, UserProfile } from '../../types';
import { calculateMemberMetrics } from '../../utils/memberMetrics';
import { getStatusProgress } from '../../utils/taskCalculations';
import {
  User,
  CheckCircle2,
  Clock,
  TrendingUp,
  Award,
  AlertTriangle,
  Zap,
  BarChart2,
  Calendar,
  Layers,
  ListTodo,
  CheckSquare,
  Square,
  Edit2,
  Plus,
  ShieldAlert,
  Briefcase,
  Mail,
  Building2,
  Bug,
  DollarSign,
  UserCheck,
  ArrowRight,
  Sparkles,
  Filter,
  Search,
  ChevronDown,
  RefreshCw,
  PieChart as PieChartIcon,
  Activity,
  BarChart3,
  Target,
  List
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  Line
} from 'recharts';

interface TeamMemberDashboardProps {
  onOpenTaskModal: (task?: Task) => void;
}

export const TeamMemberDashboard: React.FC<TeamMemberDashboardProps> = ({ onOpenTaskModal }) => {
  const {
    projectData,
    currentUser,
    allUsers,
    loginAsUser,
    saveTask,
    saveSubtask
  } = useProject();

  // Selected stakeholder report card to view
  const [selectedMemberId, setSelectedMemberId] = useState<string>(() => {
    // Default to matching stakeholder ID for currentUser, or first stakeholder
    const matched = projectData.stakeholders.find(s => s.email.toLowerCase() === currentUser.email.toLowerCase());
    return matched ? matched.id : projectData.stakeholders[0]?.id || 'sh-3';
  });

  // Task Filter state inside report card
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Hours logging inline state
  const [loggingTaskId, setLoggingTaskId] = useState<string | null>(null);
  const [logHoursInput, setLogHoursInput] = useState<number>(0);

  // Active Stakeholder details & calculated metrics
  const selectedStakeholder = useMemo(() => {
    return projectData.stakeholders.find(s => s.id === selectedMemberId) || projectData.stakeholders[0];
  }, [projectData.stakeholders, selectedMemberId]);

  const metrics = useMemo(() => {
    if (!selectedStakeholder) return null;
    return calculateMemberMetrics(
      selectedStakeholder.id,
      projectData.stakeholders,
      projectData.tasks,
      projectData.subtasks,
      projectData.milestones,
      projectData.statusPercentages
    );
  }, [selectedStakeholder, projectData.stakeholders, projectData.tasks, projectData.subtasks, projectData.milestones, projectData.statusPercentages]);

  if (!selectedStakeholder || !metrics) {
    return (
      <div className="p-8 text-center text-slate-400 font-medium">
        No team member data found.
      </div>
    );
  }

  // Filter tasks assigned to selected member
  const filteredAssignedTasks = metrics.assignedTasks.filter(task => {
    if (taskStatusFilter !== 'all' && task.status !== taskStatusFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return task.title.toLowerCase().includes(q) || (task.description && task.description.toLowerCase().includes(q));
    }
    return true;
  });

  // RAID Risks owned by this member
  const memberOwnedRisks = projectData.raidItems.filter(r => r.ownerId === selectedStakeholder.id || r.ownerId === selectedStakeholder.name);

  // Switch active user session to selected member
  const handleSwitchToMemberRole = (stakeholder: Stakeholder) => {
    const matchedUser = allUsers.find(u => u.email.toLowerCase() === stakeholder.email.toLowerCase()) || {
      id: 'user-' + stakeholder.id,
      name: stakeholder.name,
      email: stakeholder.email,
      role: 'stakeholder' as const,
      title: stakeholder.role,
      avatar: stakeholder.avatar,
      department: stakeholder.category === 'internal' ? 'Engineering' : 'External Consultant'
    };

    loginAsUser(matchedUser);
  };

  // Quick Status Handler
  const handleQuickStatusChange = async (task: Task, newStatus: Task['status']) => {
    const newCompletion = getStatusProgress(newStatus, projectData.statusPercentages);
    await saveTask({
      ...task,
      status: newStatus,
      completionPercent: newCompletion
    });
  };

  // Quick Hours Logging Handler
  const handleSaveLoggedHours = async (task: Task) => {
    if (logHoursInput < 0) return;
    await saveTask({
      ...task,
      actualHours: logHoursInput
    });
    setLoggingTaskId(null);
  };

  // Quick Subtask Toggle
  const handleToggleSubtask = async (subtaskId: string, currentCompleted: boolean) => {
    await saveSubtask({
      id: subtaskId,
      completed: !currentCompleted
    });
  };

  const isPM = currentUser.role === 'pm';
  const isViewingSelf = currentUser.email.toLowerCase() === selectedStakeholder.email.toLowerCase();

  // Prepare Data for Visual Analytics Graphs
  // 1. Radar Chart Data
  const radarData = [
    { subject: 'SPI (Schedule)', value: Math.min(100, Math.round(metrics.individualSPI * 100)), fullMark: 100 },
    { subject: 'CPI (Cost)', value: Math.min(100, Math.round(metrics.individualCPI * 100)), fullMark: 100 },
    { subject: 'Efficiency %', value: metrics.workEfficiencyPercent, fullMark: 100 },
    { subject: 'Completion %', value: metrics.taskCompletionPercent, fullMark: 100 },
    { subject: 'Capacity Load %', value: Math.min(100, metrics.utilizationPercent), fullMark: 100 }
  ];

  // 2. Task Hours Comparison Data
  const taskHoursChartData = metrics.assignedTasks.map(t => ({
    name: t.title.length > 16 ? t.title.substring(0, 14) + '...' : t.title,
    fullName: t.title,
    Estimated: t.estimatedHours || 0,
    Actual: t.actualHours || 0,
    Earned: Math.round((t.estimatedHours || 0) * ((t.completionPercent || 0) / 100) * 10) / 10,
    Completion: t.completionPercent || 0
  }));

  // 3. EVM Value Comparison Data ($)
  const evmChartData = [
    {
      name: 'Planned Value (PV)',
      value: metrics.individualPV,
      fill: '#38bdf8'
    },
    {
      name: 'Earned Value (EV)',
      value: metrics.individualEV,
      fill: '#818cf8'
    },
    {
      name: 'Actual Cost (AC)',
      value: metrics.individualAC,
      fill: metrics.individualAC > metrics.individualEV ? '#f43f5e' : '#34d399'
    }
  ];

  // 4. Task Status Distribution Pie Data
  const taskStatusPieData = [
    { name: 'Completed', value: metrics.completedTasksCount, color: '#10b981' },
    { name: 'In Progress', value: metrics.inProgressTasksCount, color: '#6366f1' },
    { name: 'Under Review', value: metrics.reviewTasksCount, color: '#a855f7' },
    { name: 'Blocked', value: metrics.blockedTasksCount, color: '#f43f5e' },
    { name: 'To Do', value: metrics.todoTasksCount, color: '#64748b' }
  ].filter(d => d.value > 0);

  // 5. Milestone Progress Bar Data
  const milestoneChartData = metrics.assignedMilestones.map(m => ({
    name: m.milestone.title.length > 18 ? m.milestone.title.substring(0, 16) + '...' : m.milestone.title,
    fullName: m.milestone.title,
    Progress: m.progressPercent,
    Tasks: m.assignedTaskCount
  }));

  return (
    <div id="team-member-dashboard" className="space-y-6 min-w-0">
      {/* Top Banner & Team Member Switcher Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 sm:p-4 md:p-5 rounded-2xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-w-0">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0 mt-0.5 sm:mt-0">
            <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-100 tracking-tight">
                {isPM ? "Team Member Report Cards & Performance" : "My Work Dashboard & Performance Report Card"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] sm:text-[11px] font-bold whitespace-nowrap">
                Real-Time Work Analytics
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 sm:line-clamp-none">
              Personalized task queue, SPI/CPI graphs, hours logged vs earned, capacity utilization, and milestone tracking.
            </p>
          </div>
        </div>

        {/* Member Selector & Role Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full lg:w-auto">
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-950 px-3 py-2 sm:py-1.5 rounded-xl border border-slate-800 text-xs text-slate-200 min-h-[40px] sm:min-h-0 flex-1 sm:flex-none">
            <div className="flex items-center gap-2 shrink-0">
              <User className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-slate-400 font-medium text-xs">Member:</span>
            </div>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="bg-transparent text-slate-100 font-semibold outline-none cursor-pointer text-xs truncate max-w-[200px] sm:max-w-[180px] text-right sm:text-left"
            >
              {projectData.stakeholders.map(s => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-slate-100">
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>

          {/* Role Switcher Action for PM */}
          {isPM && !isViewingSelf && (
            <button
              onClick={() => handleSwitchToMemberRole(selectedStakeholder)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/20 shrink-0 min-h-[40px] sm:min-h-0 w-full sm:w-auto"
              title={`Switch session role to act as ${selectedStakeholder.name}`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="whitespace-nowrap">Act as {selectedStakeholder.name.split(' ')[0]}</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Overdrive Notification Banner */}
      {!isPM && (
        <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/30 p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200 shadow-sm">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5 sm:mt-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-amber-100 block sm:inline mr-2">Member Workspace Active:</span>
              <span className="text-amber-300/90">
                You are logged in as <strong>{currentUser.name}</strong> ({currentUser.title}). You are viewing your personalized work card, performance graphs, and assigned project deliverables.
              </span>
            </div>
          </div>

          {/* Switch back to PM Alex Morgan */}
          {allUsers.some(u => u.role === 'pm') && (
            <button
              onClick={() => {
                const pmUser = allUsers.find(u => u.role === 'pm') || allUsers[0];
                loginAsUser(pmUser);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-xs transition-all shrink-0 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
              <span>Switch Back to PM</span>
            </button>
          )}
        </div>
      )}

      {/* Member Persona Card & Performance Report Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start gap-4">
              <img
                src={selectedStakeholder.avatar}
                alt={selectedStakeholder.name}
                className="w-16 h-16 rounded-2xl border-2 border-indigo-500/80 object-cover shrink-0 shadow-md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-100 truncate">{selectedStakeholder.name}</h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 uppercase">
                    {selectedStakeholder.category}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-0.5">{selectedStakeholder.role}</p>

                <div className="mt-2 space-y-1 text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{selectedStakeholder.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <strong className="text-slate-200">${selectedStakeholder.hourlyRate}</strong>/hr
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Skills Pills */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Skills & Competencies</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedStakeholder.skills.map((skill, idx) => (
                  <span key={idx} className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Status:</span>
            </span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] border ${
              selectedStakeholder.status === 'active'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}>
              {selectedStakeholder.status}
            </span>
          </div>
        </div>

        {/* Real-time Report Card Grade Banner */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-4 min-w-0">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 min-w-0">
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Performance Score Card</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                Performance Rating: <span className="text-emerald-400">{metrics.reportCardGrade} Grade</span> ({metrics.reportCardScore}/100)
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                {metrics.performanceSummary}
              </p>
            </div>

            {/* Score Wheel / Badge */}
            <div className="flex items-center gap-3 shrink-0 self-start xl:self-auto bg-slate-950/80 p-3.5 rounded-2xl border border-indigo-500/30 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex flex-col items-center justify-center text-white shadow-lg shadow-indigo-600/30 shrink-0">
                <span className="text-xl font-black leading-none">{metrics.reportCardGrade}</span>
                <span className="text-[9px] font-mono opacity-80 mt-0.5">{metrics.reportCardScore}%</span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-200">Efficiency Grade</div>
                <div className="text-[11px] text-indigo-300 font-mono whitespace-nowrap">{metrics.workEfficiencyPercent}% Efficiency Index</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">{metrics.completedTasksCount} of {metrics.totalAssignedTasks} Tasks Done</div>
              </div>
            </div>
          </div>

          {/* Quick Progress Breakdown Bar */}
          <div className="space-y-2 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Assigned Work Progress</span>
              <span className="text-slate-200 font-mono font-bold">{metrics.taskCompletionPercent}% Complete</span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 flex">
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${(metrics.completedTasksCount / Math.max(1, metrics.totalAssignedTasks)) * 100}%` }}
                title={`${metrics.completedTasksCount} Completed`}
              />
              <div
                className="bg-indigo-500 transition-all duration-500"
                style={{ width: `${(metrics.inProgressTasksCount / Math.max(1, metrics.totalAssignedTasks)) * 100}%` }}
                title={`${metrics.inProgressTasksCount} In Progress`}
              />
              <div
                className="bg-purple-500 transition-all duration-500"
                style={{ width: `${(metrics.reviewTasksCount / Math.max(1, metrics.totalAssignedTasks)) * 100}%` }}
                title={`${metrics.reviewTasksCount} Under Review`}
              />
              <div
                className="bg-rose-500 transition-all duration-500"
                style={{ width: `${(metrics.blockedTasksCount / Math.max(1, metrics.totalAssignedTasks)) * 100}%` }}
                title={`${metrics.blockedTasksCount} Blocked`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-mono pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed ({metrics.completedTasksCount})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> In Progress ({metrics.inProgressTasksCount})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Review ({metrics.reviewTasksCount})
              </span>
              {metrics.blockedTasksCount > 0 && (
                <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Blocked ({metrics.blockedTasksCount})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics Grid (Individual SPI, CPI, Efficiency, Hours Logged) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Individual SPI */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Individual SPI</span>
            <span className={`px-2 py-0.5 rounded-full font-bold font-mono text-[10px] ${
              metrics.individualSPI >= 1.0
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {metrics.individualSPI >= 1.0 ? 'Ahead of Schedule' : 'Schedule Delay'}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
              metrics.individualSPI >= 1.0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {metrics.individualSPI}
            </span>
            <span className="text-xs text-slate-400 font-mono">EV/PV Ratio</span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span>EV: ${metrics.individualEV.toLocaleString()}</span>
            <span>PV: ${metrics.individualPV.toLocaleString()}</span>
          </div>
        </div>

        {/* KPI 2: Individual CPI */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Individual CPI</span>
            <span className={`px-2 py-0.5 rounded-full font-bold font-mono text-[10px] ${
              metrics.individualCPI >= 1.0
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {metrics.individualCPI >= 1.0 ? 'Under Budget' : 'Over Cost'}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
              metrics.individualCPI >= 1.0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {metrics.individualCPI}
            </span>
            <span className="text-xs text-slate-400 font-mono">EV/AC Ratio</span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span>EV: ${metrics.individualEV.toLocaleString()}</span>
            <span>AC: ${metrics.individualAC.toLocaleString()}</span>
          </div>
        </div>

        {/* KPI 3: Work Efficiency */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Work Efficiency</span>
            <span className="px-2 py-0.5 rounded-full font-bold font-mono text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {metrics.workEfficiencyPercent}% Index
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-indigo-400 font-mono tracking-tight">
              {metrics.workEfficiencyPercent}%
            </span>
            <span className="text-xs text-slate-400 font-mono">Earned/Actual</span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span>Earned: {metrics.earnedHours}h</span>
            <span>Logged: {metrics.totalActualHours}h</span>
          </div>
        </div>

        {/* KPI 4: Hours Logged */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Hours Logged</span>
            <span className="px-2 py-0.5 rounded-full font-bold font-mono text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Active Log
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-100 font-mono tracking-tight">
              {metrics.totalActualHours}
            </span>
            <span className="text-xs text-slate-400 font-mono">logged hours</span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span>Est Total: {metrics.totalEstimatedHours}h</span>
            <span className="text-emerald-400 font-semibold">Tracked</span>
          </div>
        </div>
      </div>

      {/* MULTI-GRAPH ANALYTICS SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 sm:space-y-4 min-w-0">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-100">Individual Performance Visual Analytics</h2>
              <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-2 sm:line-clamp-none">Detailed metric graphs: Hours comparison, EVM financials, & 360° competence radar</p>
            </div>
          </div>

          {/* Header Title */}
        </div>

        {/* GRAPHS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 min-w-0">
          {/* GRAPH 1: Hours Comparison (Estimated vs Actual vs Earned) */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="truncate">Task Hours Breakdown (Est vs Logged vs Earned)</span>
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">Comparing estimated effort against logged actual hours per task</p>
                </div>
                <span className="text-[10px] sm:text-[11px] font-mono text-indigo-300 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 shrink-0">
                  {metrics.totalActualHours}h Logged
                </span>
              </div>

              <div className="h-56 sm:h-64 w-full">
                {taskHoursChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskHoursChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" />
                      <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                        formatter={(value: any, name: any) => [`${value} hours`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }} />
                      <Bar dataKey="Estimated" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Actual" fill="#a855f7" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Earned" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                    No task hours logged yet for this member.
                  </div>
                )}
              </div>
            </div>

          {/* GRAPH 2: 360° Performance Competency Radar */}
          <div className="p-3 sm:p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="truncate">360° Performance Radar Profile</span>
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400">Multidimensional score across schedule, cost, efficiency, completion & capacity</p>
              </div>
              <span className="text-[10px] sm:text-[11px] font-mono text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                Grade {metrics.reportCardGrade}
              </span>
            </div>

            <div className="h-56 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 9, fill: '#cbd5e1' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={{ fontSize: 8 }} />
                  <Radar name={selectedStakeholder.name} dataKey="value" stroke="#818cf8" fill="#6366f1" fillOpacity={0.45} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                    formatter={(value: any) => [`${value}%`, 'Score']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRAPH 3: EVM Value Financials Comparison (PV vs EV vs AC) */}
          <div className="p-3 sm:p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">Individual EVM Value Breakdown ($)</span>
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">Planned Value (PV) vs Earned Value (EV) vs Actual Cost (AC)</p>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] sm:text-[11px] shrink-0">
                  <span className="text-slate-400">SPI: <strong className={metrics.individualSPI >= 1 ? 'text-emerald-400' : 'text-rose-400'}>{metrics.individualSPI}</strong></span>
                  <span className="text-slate-400">CPI: <strong className={metrics.individualCPI >= 1 ? 'text-emerald-400' : 'text-rose-400'}>{metrics.individualCPI}</strong></span>
                </div>
              </div>

              <div className="h-56 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evmChartData} margin={{ top: 15, right: 10, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 9 }} tickFormatter={v => `$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                      formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Amount']}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {evmChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
        </div>
      </div>

      {/* Status of Milestones (Put to this member) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 sm:space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold text-slate-100 truncate">Milestones Assigned To {selectedStakeholder.name}</h2>
              <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-1">Status of major project milestones containing deliverables owned by this member</p>
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-mono text-slate-400 shrink-0 self-start sm:self-auto">
            Total Milestones: <strong className="text-purple-300">{metrics.assignedMilestones.length}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0">
          {metrics.assignedMilestones.map(({ milestone, assignedTaskCount, completedTaskCount, progressPercent }) => (
            <div
              key={milestone.id}
              className="p-3.5 sm:p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-3 min-w-0 flex flex-col justify-between"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-100 leading-snug min-w-0 flex-1">{milestone.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 border whitespace-nowrap ${
                    milestone.status === 'achieved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                    milestone.status === 'in_progress' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                    milestone.status === 'delayed' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                    'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {milestone.status.replace(/_/g, ' ')}
                  </span>
                </div>
                {milestone.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{milestone.description}</p>
                )}
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-mono">
                  <span>Member Tasks Done</span>
                  <span className="font-bold text-slate-200">{completedTaskCount} / {assignedTaskCount} ({progressPercent}%)</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-purple-500 h-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800/80">
                <span className="flex items-center gap-1 shrink-0">
                  <Calendar className="w-3 h-3 text-slate-400" /> Due: {milestone.dueDate}
                </span>
                <span className="shrink-0 font-semibold text-slate-400">Baseline: ${milestone.baselineCost.toLocaleString()}</span>
              </div>
            </div>
          ))}

          {metrics.assignedMilestones.length === 0 && (
            <div className="col-span-full p-6 text-center text-xs text-slate-500 italic bg-slate-950/50 rounded-xl border border-slate-800">
              No milestones currently mapped to tasks assigned to this team member.
            </div>
          )}
        </div>
      </div>

      {/* Assigned Tasks & Interactive Status / Hours Logging Area */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 sm:space-y-4 min-w-0">
        {/* Header Controls for Tasks */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
              <ListTodo className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-100 truncate">Assigned Work List ({filteredAssignedTasks.length})</h2>
              <p className="text-xs text-slate-400 line-clamp-1">Interactive task status updates, progress adjustment, and hours logging</p>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {/* Search Input */}
            <div className="relative flex items-center min-w-[140px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none"
              />
            </div>

            {/* Status Filter */}
            <select
              value={taskStatusFilter}
              onChange={e => setTaskStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none cursor-pointer shrink-0"
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="demoable">Demo-able</option>
              <option value="review">Under Review</option>
              <option value="on_hold">On Hold</option>
              <option value="blocked">Blocked</option>
              <option value="done">Completed</option>
            </select>

            {/* Quick Add Task */}
            <button
              onClick={() => onOpenTaskModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Task Cards Display - LIST VIEW */}
        <div className="space-y-3">
          {filteredAssignedTasks.map((task) => {
              const taskSubtasks = projectData.subtasks.filter(st => st.taskId === task.id);
              const isLoggingHours = loggingTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-4 min-w-0 shadow-sm"
                >
                  {/* Top Header: Title, Priority & Edit Action */}
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 border whitespace-nowrap ${
                          task.priority === 'urgent' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                          task.priority === 'high' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                          'bg-slate-800/80 text-slate-300 border-slate-700'
                        }`}>
                          {task.priority}
                        </span>

                        {task.type === 'bug' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                            <Bug className="w-3 h-3 text-rose-400" />
                            <span>BUG</span>
                          </span>
                        )}

                        {task.linkedBugIds && task.linkedBugIds.length > 0 && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1 cursor-pointer hover:bg-purple-500/30"
                            onClick={() => onOpenTaskModal(task)}
                            title={`${task.linkedBugIds.length} linked bug(s)`}
                          >
                            <Bug className="w-3 h-3 text-purple-400" />
                            <span>{task.linkedBugIds.length} Linked Bug{task.linkedBugIds.length !== 1 ? 's' : ''}</span>
                          </span>
                        )}

                        <h3 className="font-bold text-sm sm:text-base text-slate-100 hover:text-indigo-300 transition-colors leading-snug">
                          {task.title}
                        </h3>
                      </div>

                      {/* Full Edit Modal Trigger */}
                      <button
                        onClick={() => onOpenTaskModal(task)}
                        className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-white transition-colors shrink-0"
                        title="Edit task details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-400 leading-relaxed">{task.description}</p>
                    )}
                  </div>

                  {/* Toolbar & Metadata Strip */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/60 min-w-0">
                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400 min-w-0">
                      <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800/80 px-2.5 py-1 rounded-lg shrink-0">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{task.startDate} → {task.dueDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800/80 px-2.5 py-1 rounded-lg shrink-0">
                        <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span>Est: <strong className="text-indigo-300">{task.estimatedHours}h</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800/80 px-2.5 py-1 rounded-lg shrink-0">
                        <CheckSquare className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Actual: <strong className="text-emerald-300">{task.actualHours}h</strong></span>
                      </div>
                    </div>

                    {/* Right Action Controls: Status Switcher & Log Hours */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                      {/* Status Switcher */}
                      <select
                        value={task.status}
                        onChange={(e) => handleQuickStatusChange(task, e.target.value as Task['status'])}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer transition-colors ${
                          task.status === 'done' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                          task.status === 'in_progress' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' :
                          task.status === 'demoable' ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' :
                          task.status === 'review' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                          task.status === 'on_hold' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                          task.status === 'blocked' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                          'bg-slate-900 text-slate-300 border-slate-700'
                        }`}
                      >
                        <option value="todo" className="bg-slate-900 text-slate-200">To Do</option>
                        <option value="in_progress" className="bg-slate-900 text-slate-200">In Progress</option>
                        <option value="demoable" className="bg-slate-900 text-slate-200">Demo-able</option>
                        <option value="review" className="bg-slate-900 text-slate-200">Under Review</option>
                        <option value="on_hold" className="bg-slate-900 text-slate-200">On Hold</option>
                        <option value="blocked" className="bg-slate-900 text-slate-200">Blocked</option>
                        <option value="done" className="bg-slate-900 text-slate-200">Completed</option>
                      </select>

                      {/* Time Capture Status Badge / Audit Toggle */}
                      <button
                        onClick={() => {
                          setLoggingTaskId(isLoggingHours ? null : task.id);
                          setLogHoursInput(task.actualHours);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                        title="View auto-captured actual hours & status timestamps"
                      >
                        <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{task.actualHours || 0}h Auto-Captured</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Time Capture Audit Controls */}
                  {isLoggingHours && (
                    <div className="p-3 rounded-xl bg-slate-900 border border-indigo-500/30 space-y-2 text-xs animate-fade-in">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-400" />
                          <span className="font-semibold text-slate-200">Status Transition Time Capture Audit</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Actual Hours: {task.actualHours || 0} hrs
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-1">
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-500 block text-[10px] uppercase font-sans">In Progress Timestamp:</span>
                          <span className="text-indigo-300 font-semibold">{task.inProgressAt ? new Date(task.inProgressAt).toLocaleString() : 'Not recorded (Pending transition to In Progress)'}</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-500 block text-[10px] uppercase font-sans">Demo-able Timestamp:</span>
                          <span className="text-teal-300 font-semibold">{task.demoableAt ? new Date(task.demoableAt).toLocaleString() : 'Not recorded (Pending transition to Demo-able)'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400">
                          ⚡ Actual time is auto-calculated between "In Progress" and "Demo-able" status transitions.
                        </span>
                        <button
                          onClick={() => setLoggingTaskId(null)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
                        >
                          Close Audit
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Task Completion Progress Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Task Completion Progress</span>
                      <span className="font-bold text-slate-200">{task.completionPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${
                          task.status === 'done' ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${task.completionPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Subtasks Checklist */}
                  {taskSubtasks.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Subtasks Checklist ({taskSubtasks.filter(st => st.completed).length}/{taskSubtasks.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {taskSubtasks.map(subtask => (
                          <div
                            key={subtask.id}
                            onClick={() => handleToggleSubtask(subtask.id, subtask.completed)}
                            className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:bg-slate-900 transition-colors text-xs"
                          >
                            {subtask.completed ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-500 shrink-0" />
                            )}
                            <span className={`truncate ${subtask.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                              {subtask.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredAssignedTasks.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500 italic bg-slate-950/40 rounded-xl border border-slate-800">
                No tasks matched the selected filter query for {selectedStakeholder.name}.
              </div>
            )}
          </div>
        </div>

      {/* Owned Risks & RAID items */}
      {memberOwnedRisks.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 sm:space-y-4 min-w-0">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800/80">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100">RAID Risks & Issues Owned ({memberOwnedRisks.length})</h2>
              <p className="text-xs text-slate-400">Risk items assigned to this member for monitoring or mitigation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {memberOwnedRisks.map(risk => (
              <div key={risk.id} className="p-3.5 sm:p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-xs text-slate-200 truncate">{risk.title}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 border whitespace-nowrap ${
                    risk.type === 'risk' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                    risk.type === 'issue' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                    'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  }`}>
                    {risk.type}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">{risk.description}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800/80">
                  <span>Status: <strong className="text-slate-300">{risk.status}</strong></span>
                  {risk.riskScore && <span>Risk Score: <strong className="text-amber-400">{risk.riskScore}/16</strong></span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
