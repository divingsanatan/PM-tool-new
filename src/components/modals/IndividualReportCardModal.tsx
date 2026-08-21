import React, { useState, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Stakeholder, ProjectData, Task, MemberLeave, LeaveType } from '../../types';
import { calculateMemberMetrics } from '../../utils/memberMetrics';
import { ResponsiveSelect } from '../common/ResponsiveSelect';
import { SwipeableCard } from '../common/SwipeableCard';
import {
  X,
  Award,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Briefcase,
  Layers,
  Sparkles,
  TrendingUp,
  DollarSign,
  User,
  Shield,
  Star,
  Send,
  MessageSquare,
  Plane,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  Target,
  CalendarDays,
  CalendarCheck,
  HeartPulse,
  GraduationCap,
  Info,
  Check,
  AlertCircle,
  Building2,
  PieChart as PieChartIcon,
  Activity,
  CheckCheck,
  Zap,
  CheckSquare,
  Maximize2,
  Minimize2
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface IndividualReportCardModalProps {
  stakeholder: Stakeholder | null;
  isOpen: boolean;
  onClose: () => void;
  initialProjectId?: string;
  onNavigateToProject?: (projectId: string) => void;
}

export const IndividualReportCardModal: React.FC<IndividualReportCardModalProps> = ({
  stakeholder,
  isOpen,
  onClose,
  initialProjectId,
  onNavigateToProject
}) => {
  const { allProjectsMap, allUsers, leaves, currentUser, saveTask } = useProject();
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'analytics' | 'leaves' | 'reviews'>('overview');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedScopeProjectId, setSelectedScopeProjectId] = useState<string>(initialProjectId || 'all');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState('Exceeds Expectations');
  const [reviewsList, setReviewsList] = useState([
    {
      id: 'rev-1',
      author: 'Executive Leadership & PMO',
      role: 'Project Manager',
      date: '2026-08-14',
      rating: 'Exceeds Expectations',
      comment: 'Consistently completes high-complexity deliverables ahead of schedule with high engineering rigor and proactive communication.'
    }
  ]);

  // Mini-calendar state (defaulting to August 2026 or active date)
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date(2026, 7, 1));
  const [selectedCalendarDateStr, setSelectedCalendarDateStr] = useState<string>('2026-08-17');

  // Find user profile if matched
  const matchedUser = useMemo(() => {
    if (!stakeholder) return null;
    return allUsers.find(
      u => u.id === stakeholder.id || u.email.toLowerCase() === (stakeholder.email || '').toLowerCase()
    );
  }, [allUsers, stakeholder]);

  // Find all projects where this stakeholder participates
  const allProjects = useMemo(() => Object.values(allProjectsMap || {}) as ProjectData[], [allProjectsMap]);

  // Check if stakeholder is a Project Manager
  const isStakeholderPM = useMemo(() => {
    if (!stakeholder) return false;
    if (matchedUser?.role === 'pm') return true;
    const roleLower = (stakeholder.role || '').toLowerCase();
    if (roleLower.includes('project manager') || roleLower.includes('pm')) return true;
    const targetEmail = (stakeholder.email || '').toLowerCase();
    return allProjects.some(
      p => p.projectManagerId === stakeholder.id ||
           (p.projectManagerEmail && p.projectManagerEmail.toLowerCase() === targetEmail)
    );
  }, [stakeholder, matchedUser, allProjects]);

  const userProjects = useMemo(() => {
    if (!stakeholder) return [];
    const targetEmail = (stakeholder.email || '').toLowerCase();
    const targetId = stakeholder.id;

    if (isStakeholderPM) {
      const pmProjects = allProjects.filter(p => {
        const isAssignedPM = p.projectManagerId === targetId ||
          (p.projectManagerEmail && p.projectManagerEmail.toLowerCase() === targetEmail);
        const isStakeholderInProj = (p.stakeholders || []).some(
          s => s.id === targetId || (s.email && s.email.toLowerCase() === targetEmail)
        );
        return isAssignedPM || isStakeholderInProj;
      });
      return pmProjects.length > 0 ? pmProjects : allProjects;
    }

    const assignedProjects = allProjects.filter(p => {
      const isStakeholder = (p.stakeholders || []).some(
        s => s.id === targetId || (s.email && s.email.toLowerCase() === targetEmail)
      );
      const hasAssignedTask = (p.tasks || []).some(
        t => (t.assigneeIds || []).includes(targetId)
      );
      return isStakeholder || hasAssignedTask;
    });

    return assignedProjects.length > 0 ? assignedProjects : allProjects;
  }, [allProjects, stakeholder, isStakeholderPM]);

  // Determine active scoped projects based on user selection
  const activeScopedProjects = useMemo(() => {
    if (selectedScopeProjectId === 'all') {
      return userProjects.length > 0 ? userProjects : allProjects;
    }
    const found = allProjects.find(p => p.id === selectedScopeProjectId);
    return found ? [found] : (userProjects.length > 0 ? userProjects : allProjects);
  }, [selectedScopeProjectId, userProjects, allProjects]);

  // Aggregate tasks and metrics across active scoped projects
  const { allScopedTasks, allScopedSubtasks, allScopedMilestones, allScopedStakeholders } = useMemo(() => {
    if (!stakeholder) {
      return { allScopedTasks: [], allScopedSubtasks: [], allScopedMilestones: [], allScopedStakeholders: [] };
    }
    const tasks: Task[] = [];
    const subtasks: any[] = [];
    const milestones: any[] = [];
    const stakeholders: Stakeholder[] = [stakeholder];

    activeScopedProjects.forEach(proj => {
      tasks.push(...(proj.tasks || []));
      subtasks.push(...(proj.subtasks || []));
      milestones.push(...(proj.milestones || []));
      (proj.stakeholders || []).forEach(sh => {
        if (!stakeholders.some(s => s.id === sh.id)) {
          stakeholders.push(sh);
        }
      });
    });

    return { allScopedTasks: tasks, allScopedSubtasks: subtasks, allScopedMilestones: milestones, allScopedStakeholders: stakeholders };
  }, [activeScopedProjects, stakeholder]);

  // Calculate comprehensive metrics (using isProjectManagerScope for PMs)
  const metrics = useMemo(() => {
    if (!stakeholder) return null;
    return calculateMemberMetrics(
      stakeholder.id,
      allScopedStakeholders,
      allScopedTasks,
      allScopedSubtasks,
      allScopedMilestones,
      undefined,
      isStakeholderPM
    );
  }, [stakeholder, allScopedStakeholders, allScopedTasks, allScopedSubtasks, allScopedMilestones, isStakeholderPM]);

  // Leaves for this stakeholder
  const memberLeaves: MemberLeave[] = useMemo(() => {
    if (!stakeholder) return [];
    return (leaves || []).filter(
      l => l.userId === stakeholder.id || l.userEmail.toLowerCase() === (stakeholder.email || '').toLowerCase()
    );
  }, [leaves, stakeholder]);

  // Approved and Pending leaves
  const approvedLeaves = useMemo(() => memberLeaves.filter(l => l.status === 'approved'), [memberLeaves]);
  const pendingLeaves = useMemo(() => memberLeaves.filter(l => l.status === 'pending'), [memberLeaves]);

  // Mini-Calendar Navigation & Grid computation
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth(); // 0-indexed
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calYear, calMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(calYear, calMonth + 1, 1));
  };

  const handleCurrentMonth = () => {
    setCalendarDate(new Date(2026, 7, 1));
    setSelectedCalendarDateStr('2026-08-17');
  };

  // Calendar cells generation
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun
  const totalDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const prevMonthTotalDays = new Date(calYear, calMonth, 0).getDate();

  // Helper to check leave on date
  const getLeaveOnDate = (dateStr: string) => {
    const approved = approvedLeaves.find(l => dateStr >= l.startDate && dateStr <= l.endDate);
    if (approved) return { leave: approved, type: 'approved' as const };
    const pending = pendingLeaves.find(l => dateStr >= l.startDate && dateStr <= l.endDate);
    if (pending) return { leave: pending, type: 'pending' as const };
    return null;
  };

  // Month Statistics for Member Availability
  const monthStats = useMemo(() => {
    let workingDays = 0;
    let approvedLeaveHoursInMonth = 0;
    let pendingLeaveHoursInMonth = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(calYear, calMonth, day);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const dStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      if (!isWeekend) {
        workingDays++;
        const leaveData = getLeaveOnDate(dStr);
        if (leaveData?.type === 'approved') {
          const lHours = leaveData.leave.durationType === 'hours' ? leaveData.leave.hoursCount : 8;
          approvedLeaveHoursInMonth += lHours;
        } else if (leaveData?.type === 'pending') {
          const lHours = leaveData.leave.durationType === 'hours' ? leaveData.leave.hoursCount : 8;
          pendingLeaveHoursInMonth += lHours;
        }
      }
    }

    const totalPotentialHours = workingDays * 8;
    const capacityHours = Math.max(0, totalPotentialHours - approvedLeaveHoursInMonth);
    const availableWorkDays = Math.round((capacityHours / 8) * 10) / 10;
    const approvedLeaveDaysInMonth = Math.round((approvedLeaveHoursInMonth / 8) * 10) / 10;
    const pendingLeaveDaysInMonth = Math.round((pendingLeaveHoursInMonth / 8) * 10) / 10;
    const availabilityRate = totalPotentialHours > 0 ? Math.round((capacityHours / totalPotentialHours) * 100) : 100;

    return {
      workingDays,
      approvedLeaveDaysInMonth,
      pendingLeaveDaysInMonth,
      availableWorkDays,
      availabilityRate,
      capacityHours
    };
  }, [calYear, calMonth, totalDaysInMonth, approvedLeaves, pendingLeaves]);

  // Selected date inspector details
  const selectedDateLeaveInfo = useMemo(() => {
    if (!selectedCalendarDateStr) return null;
    const leaveData = getLeaveOnDate(selectedCalendarDateStr);
    const parts = selectedCalendarDateStr.split('-');
    const parsedDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const isWeekend = parsedDate.getDay() === 0 || parsedDate.getDay() === 6;

    return {
      dateStr: selectedCalendarDateStr,
      formattedDate: parsedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
      isWeekend,
      leaveData
    };
  }, [selectedCalendarDateStr, approvedLeaves, pendingLeaves]);

  const getLeaveTypeBadge = (type: LeaveType) => {
    switch (type) {
      case 'vacation':
        return {
          label: 'Vacation / PTO',
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          dot: 'bg-emerald-400',
          icon: Plane
        };
      case 'sick':
        return {
          label: 'Sick Leave',
          bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          dot: 'bg-rose-400',
          icon: HeartPulse
        };
      case 'parental':
        return {
          label: 'Parental Leave',
          bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          dot: 'bg-purple-400',
          icon: User
        };
      case 'training':
      case 'conference':
        return {
          label: 'Training / Conf',
          bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          dot: 'bg-indigo-400',
          icon: GraduationCap
        };
      default:
        return {
          label: 'Special Leave',
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          dot: 'bg-amber-400',
          icon: Calendar
        };
    }
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) return;
    setReviewsList([
      {
        id: 'rev-' + Date.now(),
        author: currentUser.name || 'Executive PMO',
        role: currentUser.role === 'admin' ? 'Executive Admin' : 'Project Manager',
        date: new Date().toISOString().split('T')[0],
        rating: reviewRating,
        comment: reviewText.trim()
      },
      ...reviewsList
    ]);
    setReviewText('');
  };

  if (!isOpen || !stakeholder || !metrics) return null;

  // Radar competencies
  const radarData = [
    { subject: 'Task Velocity', value: Math.min(100, Math.round(metrics.taskCompletionPercent || 85)), fullMark: 100 },
    { subject: 'Schedule (SPI)', value: Math.min(100, Math.round((metrics.individualSPI || 1.0) * 100)), fullMark: 100 },
    { subject: 'Cost (CPI)', value: Math.min(100, Math.round((metrics.individualCPI || 1.0) * 100)), fullMark: 100 },
    { subject: 'Efficiency', value: Math.min(100, Math.round(metrics.workEfficiencyPercent || 90)), fullMark: 100 },
    { subject: 'Reliability', value: metrics.blockedTasksCount > 0 ? 75 : 98, fullMark: 100 }
  ];

  // Task breakdown chart data
  const taskStatusData = [
    { name: 'Completed', value: metrics.completedTasksCount, color: '#10b981' },
    { name: 'In Progress', value: metrics.inProgressTasksCount, color: '#6366f1' },
    { name: 'Review', value: metrics.reviewTasksCount, color: '#a855f7' },
    { name: 'Blocked', value: metrics.blockedTasksCount, color: '#f43f5e' },
    { name: 'To Do', value: metrics.todoTasksCount, color: '#64748b' }
  ].filter(d => d.value > 0);

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (grade.startsWith('B')) return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
    if (grade.startsWith('C')) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 md:p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-150">
      <div className={`relative w-full bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
        isExpanded
          ? 'h-[97vh] max-h-[97vh] max-w-[98vw]'
          : 'h-[92vh] max-h-[92vh] max-w-5xl md:max-w-6xl'
      }`}>
        
        {/* ========================================================================= */}
        {/* MODAL HEADER - COMPACT, RESPONSIVE, SMART */}
        {/* ========================================================================= */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/25 to-slate-900 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            
            {/* User Profile & Project Scope Selector */}
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              <div className="relative shrink-0">
                <img
                  src={stakeholder.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stakeholder.email || stakeholder.name}`}
                  alt={stakeholder.name}
                  className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-lg bg-slate-950"
                />
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                  <Check className="w-2 h-2 text-slate-950 stroke-[3]" />
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                    {stakeholder.name}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase shrink-0 ${
                      matchedUser?.role === 'admin'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : isStakeholderPM || matchedUser?.role === 'pm'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {matchedUser?.role === 'admin' ? 'Executive Admin' : isStakeholderPM || matchedUser?.role === 'pm' ? 'Project Manager' : 'Team Member'}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-slate-800/90 text-slate-300 text-[10px] sm:text-[11px] font-medium shrink-0">
                    {stakeholder.role}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="truncate max-w-[200px] sm:max-w-xs">{stakeholder.email}</span>
                  <span className="text-slate-600 hidden sm:inline">•</span>
                  <span className="font-mono text-emerald-400 font-semibold">${stakeholder.hourlyRate || 85}/hr</span>
                  <span className="text-slate-600 hidden sm:inline">•</span>
                  <span className="text-slate-300 font-mono">{stakeholder.weeklyCapacityHours || 40}h/wk cap</span>
                </div>

                {/* Scorecard Project Scope Selector */}
                <div className="mt-1.5 flex items-center gap-2 max-w-full">
                  <ResponsiveSelect
                    value={selectedScopeProjectId}
                    onChange={setSelectedScopeProjectId}
                    icon={<Building2 className="w-3.5 h-3.5 text-emerald-400" />}
                    label="Scope:"
                    options={[
                      {
                        value: 'all',
                        label: `All Projects (${userProjects.length} Assigned)`,
                        icon: <span className="text-sm">🌐</span>
                      },
                      ...userProjects.map(p => ({
                        value: p.id,
                        label: `[${p.projectCode}] ${p.projectName}`,
                        sublabel: p.description,
                        icon: <span className="text-sm">📁</span>
                      }))
                    ]}
                    align="auto"
                    className="border-slate-800 hover:border-slate-700 text-emerald-300 text-[11px] py-1 px-2.5"
                  />
                </div>
              </div>
            </div>

            {/* Right: Grade Badge & Action Buttons */}
            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
              {/* Grade Badge */}
              <div className={`px-3 py-1 sm:py-1.5 rounded-2xl border flex items-center gap-2 shadow-md ${getGradeColor(metrics.reportCardGrade || 'A')}`}>
                <div className="text-center">
                  <span className="text-[9px] uppercase font-bold tracking-wider opacity-80 block leading-none">Grade</span>
                  <span className="text-base sm:text-lg font-black block leading-tight">{metrics.reportCardGrade || 'A'}</span>
                </div>
                <div className="h-5 w-px bg-current opacity-30" />
                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold block">{metrics.reportCardScore || 95}/100</span>
                  <span className="text-[8px] font-semibold opacity-80 block whitespace-nowrap">Overall Index</span>
                </div>
              </div>

              {/* Maximize / Restore Toggle */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700 shrink-0"
                title={isExpanded ? 'Restore Normal View' : 'Maximize Fullscreen'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700 shrink-0"
                title="Close Scorecard"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* RESPONSIVE SCROLLABLE TAB NAVIGATION */}
        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* HORIZONTAL TAB NAVIGATION (Clickable Segmented Control) */}
        {/* ========================================================================= */}
        <div className="px-3.5 sm:px-6 py-2.5 border-b border-slate-800 bg-slate-950/90 shrink-0">
          <div
            role="tablist"
            aria-label="Modal Views"
            className="flex items-center gap-1.5 overflow-x-auto p-1 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-inner no-scrollbar overscroll-x-contain"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer select-none ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40 scale-[1.01]'
                  : 'bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'overview' ? 'text-indigo-200' : 'text-indigo-400'}`} />
              <span className="whitespace-nowrap">Overview</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'projects'}
              onClick={() => setActiveTab('projects')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer select-none ${
                activeTab === 'projects'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40 scale-[1.01]'
                  : 'bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <Layers className={`w-3.5 h-3.5 ${activeTab === 'projects' ? 'text-indigo-200' : 'text-indigo-400'}`} />
              <span className="whitespace-nowrap">Projects &amp; Tasks</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold border ${
                  activeTab === 'projects'
                    ? 'bg-indigo-800/80 text-indigo-100 border-indigo-400/30'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                {metrics.totalAssignedTasks}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'analytics'}
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer select-none ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40 scale-[1.01]'
                  : 'bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <BarChart3 className={`w-3.5 h-3.5 ${activeTab === 'analytics' ? 'text-indigo-200' : 'text-sky-400'}`} />
              <span className="whitespace-nowrap">EVM &amp; Analytics</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'leaves'}
              onClick={() => setActiveTab('leaves')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer select-none ${
                activeTab === 'leaves'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40 scale-[1.01]'
                  : 'bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <CalendarCheck className={`w-3.5 h-3.5 ${activeTab === 'leaves' ? 'text-emerald-300' : 'text-emerald-400'}`} />
              <span className="whitespace-nowrap">Availability &amp; Calendar</span>
              {approvedLeaves.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold border ${
                    activeTab === 'leaves'
                      ? 'bg-emerald-700/80 text-white border-emerald-400/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {approvedLeaves.length}
                </span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'reviews'}
              onClick={() => setActiveTab('reviews')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer select-none ${
                activeTab === 'reviews'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40 scale-[1.01]'
                  : 'bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${activeTab === 'reviews' ? 'text-amber-300' : 'text-amber-400'}`} />
              <span className="whitespace-nowrap">PMO Reviews</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold border ${
                  activeTab === 'reviews'
                    ? 'bg-indigo-800/80 text-indigo-100 border-indigo-400/30'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                {reviewsList.length}
              </span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL SCROLLABLE BODY (min-h-0 is essential for proper flex scrolling) */}
        {/* ========================================================================= */}
        <div className="p-3.5 sm:p-5 overflow-y-auto min-h-0 flex-1 space-y-3.5 sm:space-y-4 scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-600 scrollbar-track-slate-900/50">
          
          {/* ================= TAB 1: OVERVIEW ================= */}
          {activeTab === 'overview' && (
            <div className="space-y-3.5 sm:space-y-4">
              {/* Top Key Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Deliverables</span>
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <p className="text-base sm:text-lg font-black text-white font-mono">{metrics.totalAssignedTasks}</p>
                  <span className="text-[10px] text-emerald-400 font-semibold mt-0.5 block truncate">
                    {metrics.completedTasksCount} done ({Math.round(metrics.taskCompletionPercent)}%)
                  </span>
                </div>

                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Schedule (SPI)</span>
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <p className={`text-base sm:text-lg font-black font-mono ${metrics.individualSPI >= 1.0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {metrics.individualSPI.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                    {metrics.individualSPI >= 1.0 ? 'Ahead / On Schedule' : 'Schedule Variance'}
                  </span>
                </div>

                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Cost (CPI)</span>
                    <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <p className={`text-base sm:text-lg font-black font-mono ${metrics.individualCPI >= 1.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {metrics.individualCPI.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                    {metrics.individualCPI >= 1.0 ? 'Under Budget' : 'Cost Variance'}
                  </span>
                </div>

                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Utilization</span>
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <p className={`text-base sm:text-lg font-black font-mono ${metrics.utilizationPercent > 100 ? 'text-rose-400' : 'text-indigo-300'}`}>
                    {metrics.utilizationPercent}%
                  </p>
                  <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                    {metrics.totalActualHours}h logged / {stakeholder.weeklyCapacityHours || 40}h cap
                  </span>
                </div>
              </div>

              {/* Quick Availability & Approved Leave Highlight Banner */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/30 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-200">Personal Availability &amp; Leave Status</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold">
                        {monthStats.availabilityRate}% Available in {monthNames[calMonth]}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {approvedLeaves.length > 0
                        ? `${approvedLeaves.length} approved leave record(s). Working capacity and schedules are fully synchronized.`
                        : 'No active approved leaves recorded. Full sprint capacity available.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('leaves')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>View Calendar</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Skills & Tech Expertise Badges */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-200 block uppercase tracking-wider">
                  Technical Expertise &amp; Core Competencies
                </span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {(stakeholder.skills || ['Full-Stack', 'Engineering', 'Agile Architecture']).map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Visual Delivery Charts (Radar & Breakdown) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* 360 Competency Radar */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-bold text-slate-200">360° Capability Index</h3>
                    <span className="text-[10px] text-slate-500 font-mono">Weighted Competencies</span>
                  </div>
                  <div className="w-full h-44 sm:h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={{ fill: '#64748b', fontSize: 9 }} />
                        <Radar name={stakeholder.name} dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Task Distribution Donut */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-bold text-slate-200">Task Status Distribution</h3>
                    <span className="text-[10px] text-slate-500 font-mono">{metrics.totalAssignedTasks} Deliverables</span>
                  </div>
                  <div className="w-full h-44 sm:h-52 flex items-center justify-center">
                    {taskStatusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={taskStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={68}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {taskStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <span className="text-xs text-slate-500 italic">No active deliverables in this scope.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: PROJECTS & TASKS ================= */}
          {activeTab === 'projects' && (
            <div className="space-y-4 sm:space-y-5 text-xs">
              {/* Project Engagements */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-100">Assigned Project Engagements</h3>
                  <span className="text-slate-400 text-xs font-mono">{userProjects.length} Active Projects</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {userProjects.map(p => {
                    const projectTasks = (p.tasks || []).filter(t => (t.assigneeIds || []).includes(stakeholder.id));
                    const completedTasks = projectTasks.filter(t => t.status === 'done').length;

                    return (
                      <div key={p.id} className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5 hover:border-slate-700 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 font-mono font-bold text-[10px] border border-indigo-500/20">
                            {p.projectCode}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">{completedTasks}/{projectTasks.length} Done</span>
                        </div>
                        
                        <h4 className="font-bold text-slate-100 text-xs sm:text-sm truncate">{p.projectName}</h4>
                        
                        {/* Mini progress bar */}
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0}%` }}
                          />
                        </div>

                        {onNavigateToProject && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateToProject(p.id);
                              onClose();
                            }}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 text-[11px] pt-1"
                          >
                            <span>Open Project Workspace</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Assigned Deliverables List */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-100">Assigned Deliverables ({metrics.assignedTasks.length})</h3>
                  <span className="text-slate-500 text-[11px]">Scoped tasks</span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {metrics.assignedTasks.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                      No deliverables currently assigned in this scope.
                    </div>
                  ) : (
                    metrics.assignedTasks.map((task, idx) => (
                      <SwipeableCard
                        key={task.id}
                        onSwipeRight={() => {
                          const newStatus = task.status === 'done' ? 'todo' : 'done';
                          saveTask({ ...task, status: newStatus, completionPercent: newStatus === 'done' ? 100 : 0 });
                        }}
                        swipeRightLabel={task.status === 'done' ? 'Reopen' : 'Complete'}
                        isCompleted={task.status === 'done'}
                        showFirstTimeHint={idx === 0}
                        hintStorageKey="pmo_modal_deliverable_swipe_hint"
                      >
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3 hover:bg-slate-850/40 transition-colors">
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-slate-200 block truncate">{task.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                              Est: {task.estimatedHours || 8}h • Act: {task.actualHours || 0}h • Due: {task.dueDate || 'No date'}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase shrink-0 ${
                              task.status === 'done'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : task.status === 'in_progress'
                                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                                : task.status === 'blocked'
                                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>
                      </SwipeableCard>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: EVM ANALYTICS ================= */}
          {activeTab === 'analytics' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Planned Value (PV)</span>
                  <p className="text-lg sm:text-xl font-black text-sky-400 font-mono">${Math.round(metrics.individualPV).toLocaleString()}</p>
                </div>
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Earned Value (EV)</span>
                  <p className="text-lg sm:text-xl font-black text-indigo-400 font-mono">${Math.round(metrics.individualEV).toLocaleString()}</p>
                </div>
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Actual Cost (AC)</span>
                  <p className="text-lg sm:text-xl font-black text-rose-400 font-mono">${Math.round(metrics.individualAC).toLocaleString()}</p>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h3 className="font-bold text-slate-200 text-xs sm:text-sm">Hours &amp; Velocity Performance</h3>
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Total Est. Hours</span>
                    <span className="text-sm sm:text-base font-bold font-mono text-slate-200 mt-1 block">{metrics.totalEstimatedHours}h</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Actual Logged</span>
                    <span className="text-sm sm:text-base font-bold font-mono text-slate-200 mt-1 block">{metrics.totalActualHours}h</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Earned Hours</span>
                    <span className="text-sm sm:text-base font-bold font-mono text-emerald-400 mt-1 block">{Math.round(metrics.earnedHours)}h</span>
                  </div>
                </div>
              </div>

              {/* Variance Analysis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Schedule Variance (SV = EV - PV)</span>
                  <p className={`text-base sm:text-lg font-black font-mono ${metrics.individualEV >= metrics.individualPV ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {metrics.individualEV >= metrics.individualPV ? '+' : ''}${Math.round(metrics.individualEV - metrics.individualPV).toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-1 block">Positive indicates progress ahead of timeline baseline.</span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Cost Variance (CV = EV - AC)</span>
                  <p className={`text-base sm:text-lg font-black font-mono ${metrics.individualEV >= metrics.individualAC ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {metrics.individualEV >= metrics.individualAC ? '+' : ''}${Math.round(metrics.individualEV - metrics.individualAC).toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-1 block">Positive indicates delivery achieved under baseline budget.</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: LEAVES & AVAILABILITY CALENDAR ================= */}
          {activeTab === 'leaves' && (
            <div className="space-y-4 sm:space-y-5 text-xs">
              {/* Header & Quick Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3.5 sm:p-4 rounded-2xl border border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-slate-100 text-xs sm:text-sm">Personal Availability &amp; Leave Calendar</h3>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-mono font-bold">
                      Read-Only
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Visual day-by-day availability calendar for <strong className="text-slate-200">{stakeholder.name}</strong> showing PTO schedule, leave approvals, and active sprint capacity.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                    {approvedLeaves.length} Approved
                  </span>
                  {pendingLeaves.length > 0 && (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                      {pendingLeaves.length} Pending
                    </span>
                  )}
                </div>
              </div>

              {/* Month Selector Bar & Capacity KPI Cards */}
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between bg-slate-950 p-2 sm:p-2.5 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
                      title="Previous Month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-bold text-slate-100 text-xs sm:text-sm px-1.5 sm:px-2">
                      {monthNames[calMonth]} {calYear}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
                      title="Next Month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCurrentMonth}
                    className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-semibold transition-colors"
                  >
                    August 2026 (Active)
                  </button>
                </div>

                {/* Capacity & Availability Metrics for Selected Month */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Working Days</span>
                    <span className="text-sm sm:text-base font-bold font-mono text-slate-200">{monthStats.workingDays}d</span>
                    <span className="text-[10px] text-slate-500 block truncate">Weekdays in month</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Approved Leaves</span>
                    <span className="text-sm sm:text-base font-bold font-mono text-emerald-400">{monthStats.approvedLeaveDaysInMonth}d</span>
                    <span className="text-[10px] text-emerald-500/80 block truncate">Capacity adjusted</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Available Days</span>
                    <span className="text-sm sm:text-base font-bold font-mono text-indigo-300">{monthStats.availableWorkDays}d</span>
                    <span className="text-[10px] text-slate-500 block truncate">({monthStats.capacityHours}h capacity)</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Availability</span>
                    <span className={`text-sm sm:text-base font-bold font-mono ${monthStats.availabilityRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {monthStats.availabilityRate}%
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">Sprint Availability</span>
                  </div>
                </div>
              </div>

              {/* READ-ONLY MINI-CALENDAR GRID */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-slate-200 text-xs">
                      {monthNames[calMonth]} {calYear} Availability Grid
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-slate-400">
                    Click day to inspect
                  </span>
                </div>

                {/* Weekday Column Headers */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                    <div
                      key={d}
                      className={`py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-lg ${
                        i === 0 || i === 6 ? 'text-slate-500 bg-slate-900/40' : 'text-slate-400 bg-slate-900/80'
                      }`}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar Day Matrix */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {/* Previous month overflow days */}
                  {Array.from({ length: firstDayOfWeek }).map((_, idx) => {
                    const prevDayNum = prevMonthTotalDays - firstDayOfWeek + 1 + idx;
                    return (
                      <div
                        key={`prev-${idx}`}
                        className="h-12 sm:h-14 md:h-16 p-1 sm:p-1.5 rounded-xl bg-slate-950/30 border border-slate-900/60 opacity-30 flex flex-col justify-between"
                      >
                        <span className="text-[10px] font-mono text-slate-600">{prevDayNum}</span>
                      </div>
                    );
                  })}

                  {/* Current month days */}
                  {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const leaveOnDate = getLeaveOnDate(dateStr);
                    const isToday = dateStr === '2026-08-17';
                    const isSelected = dateStr === selectedCalendarDateStr;
                    const dateObj = new Date(calYear, calMonth, dayNum);
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                    let cellBg = isWeekend ? 'bg-slate-950/40 border-slate-900' : 'bg-slate-900/80 border-slate-800/80';
                    let badgeInfo = null;

                    if (leaveOnDate?.type === 'approved') {
                      badgeInfo = getLeaveTypeBadge(leaveOnDate.leave.leaveType);
                      cellBg = `${badgeInfo.bg} shadow-sm`;
                    } else if (leaveOnDate?.type === 'pending') {
                      cellBg = 'bg-amber-500/10 border-dashed border-amber-500/50 text-amber-300';
                    }

                    return (
                      <button
                        type="button"
                        key={`curr-${dayNum}`}
                        onClick={() => setSelectedCalendarDateStr(dateStr)}
                        className={`h-12 sm:h-14 md:h-16 p-1 sm:p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all relative overflow-hidden group ${cellBg} ${
                          isSelected ? 'ring-2 ring-indigo-400 ring-offset-1 sm:ring-offset-2 ring-offset-slate-950 z-10 scale-[1.02]' : 'hover:border-slate-700'
                        }`}
                      >
                        {/* Day Number and Today Indicator */}
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`text-[11px] sm:text-xs font-mono font-bold ${
                              isToday
                                ? 'w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center -ml-0.5 -mt-0.5 shadow-sm text-[10px]'
                                : leaveOnDate?.type === 'approved'
                                ? 'text-white'
                                : isWeekend
                                ? 'text-slate-500'
                                : 'text-slate-300'
                            }`}
                          >
                            {dayNum}
                          </span>

                          {isToday && (
                            <span className="text-[7px] sm:text-[8px] font-mono uppercase px-0.5 sm:px-1 rounded bg-indigo-500/30 text-indigo-200 font-bold hidden sm:inline">
                              Today
                            </span>
                          )}
                        </div>

                        {/* Leave Type Label or Status */}
                        {leaveOnDate?.type === 'approved' && badgeInfo && (
                          <div className="w-full">
                            <span className="text-[8px] sm:text-[9px] font-bold truncate block px-0.5 sm:px-1 py-0.5 rounded bg-slate-950/60 text-white leading-tight">
                              {leaveOnDate.leave.durationType === 'hours' 
                                ? `${leaveOnDate.leave.hoursCount}h`
                                : badgeInfo.label.split('/')[0].trim()}
                            </span>
                          </div>
                        )}

                        {leaveOnDate?.type === 'pending' && (
                          <div className="w-full">
                            <span className="text-[8px] sm:text-[9px] font-bold truncate block px-0.5 sm:px-1 py-0.5 rounded bg-amber-950/80 text-amber-300 leading-tight">
                              {leaveOnDate.leave.durationType === 'hours' ? `${leaveOnDate.leave.hoursCount}h (P)` : 'Pend'}
                            </span>
                          </div>
                        )}

                        {!leaveOnDate && !isWeekend && (
                          <div className="w-full opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                            <span className="text-[8px] text-slate-400 font-mono">8h</span>
                          </div>
                        )}

                        {isWeekend && !leaveOnDate && (
                          <div className="w-full text-right hidden sm:block">
                            <span className="text-[8px] text-slate-600 font-mono">Off</span>
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* Next month overflow days */}
                  {Array.from({
                    length: (7 - ((firstDayOfWeek + totalDaysInMonth) % 7)) % 7
                  }).map((_, idx) => (
                    <div
                      key={`next-${idx}`}
                      className="h-12 sm:h-14 md:h-16 p-1 sm:p-1.5 rounded-xl bg-slate-950/30 border border-slate-900/60 opacity-30 flex flex-col justify-between"
                    >
                      <span className="text-[10px] font-mono text-slate-600">{idx + 1}</span>
                    </div>
                  ))}
                </div>

                {/* Calendar Legend */}
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-2 border-t border-slate-800 text-[10px] sm:text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Vacation / PTO</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Sick Leave</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>Training</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 border border-dashed border-amber-300" />
                    <span>Pending PM Review</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                    <span>Regular Work Day (8h)</span>
                  </div>
                </div>
              </div>

              {/* Selected Day Inspector Card */}
              {selectedDateLeaveInfo && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-indigo-500/30 space-y-2.5 sm:space-y-3 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Date Inspector</span>
                      <h4 className="text-xs sm:text-sm font-bold text-white">{selectedDateLeaveInfo.formattedDate}</h4>
                    </div>

                    <div>
                      {selectedDateLeaveInfo.leaveData?.type === 'approved' ? (
                        <span className="px-2.5 py-0.5 sm:py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>Approved Time Off</span>
                        </span>
                      ) : selectedDateLeaveInfo.leaveData?.type === 'pending' ? (
                        <span className="px-2.5 py-0.5 sm:py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Pending PM Approval</span>
                        </span>
                      ) : selectedDateLeaveInfo.isWeekend ? (
                        <span className="px-2.5 py-0.5 sm:py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 font-bold text-xs">
                          Weekend Rest Day
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 sm:py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Fully Available (8.0h Cap)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedDateLeaveInfo.leaveData ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                      <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Leave Category</span>
                        <span className="font-bold text-slate-100 text-xs capitalize block">
                          {selectedDateLeaveInfo.leaveData.leave.leaveType} Leave
                        </span>
                        {selectedDateLeaveInfo.leaveData.leave.durationType === 'hours' ? (
                          <span className="text-[10px] text-amber-400 font-medium">Hourly Off ({selectedDateLeaveInfo.leaveData.leave.hoursCount}h)</span>
                        ) : (
                          <span className="text-[10px] text-indigo-400 font-medium">Full Day Off ({selectedDateLeaveInfo.leaveData.leave.daysCount}d)</span>
                        )}
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Schedule Span</span>
                        <span className="font-bold text-slate-100 text-xs font-mono block truncate">
                          {selectedDateLeaveInfo.leaveData.leave.startDate === selectedDateLeaveInfo.leaveData.leave.endDate
                            ? selectedDateLeaveInfo.leaveData.leave.startDate
                            : `${selectedDateLeaveInfo.leaveData.leave.startDate} to ${selectedDateLeaveInfo.leaveData.leave.endDate}`}
                        </span>
                        {selectedDateLeaveInfo.leaveData.leave.timeRange ? (
                          <span className="text-[10px] text-indigo-300 font-medium">{selectedDateLeaveInfo.leaveData.leave.timeRange}</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">{selectedDateLeaveInfo.leaveData.leave.hoursCount}h blocked</span>
                        )}
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Authorization</span>
                        <span className="font-bold text-slate-100 text-xs block truncate">
                          {selectedDateLeaveInfo.leaveData.leave.approvedBy
                            ? `Approved by ${selectedDateLeaveInfo.leaveData.leave.approvedBy}`
                            : 'Pending PM / Admin Sign-off'}
                        </span>
                      </div>
                      <div className="sm:col-span-3 p-2.5 sm:p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2">
                        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-slate-400 block">Reason &amp; Deliverable Impact</span>
                          <p className="text-slate-200 text-xs mt-0.5">
                            {selectedDateLeaveInfo.leaveData.leave.reason || 'Personal scheduled time off.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-xs">
                      {selectedDateLeaveInfo.isWeekend
                        ? 'Standard weekend non-working rest day. No project deliverables or capacity are scheduled.'
                        : 'Standard working day with 100% active capacity (8.0 hours). Deliverable tasks and sprint assignments are fully active on this date.'}
                    </p>
                  )}
                </div>
              )}

              {/* Complete Leave History Records List */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-200 text-xs">All Leave Applications &amp; History ({memberLeaves.length})</h4>
                  <span className="text-slate-500 text-[11px]">Dossier Records</span>
                </div>

                {memberLeaves.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-slate-500">
                    No leave requests recorded for this member.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {memberLeaves.map(l => {
                      const badge = getLeaveTypeBadge(l.leaveType);
                      return (
                        <div
                          key={l.id}
                          className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border capitalize ${badge.bg}`}>
                                {l.leaveType} Leave
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  l.status === 'approved'
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                    : l.status === 'pending'
                                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                }`}
                              >
                                {l.status}
                              </span>
                              {l.durationType === 'hours' ? (
                                <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                  {l.hoursCount}h Hourly Off
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono text-slate-300 font-bold">
                                  {l.daysCount}d ({l.hoursCount}h)
                                </span>
                              )}
                            </div>

                            <p className="text-slate-300 text-xs">{l.reason || 'Personal Time Off'}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                              <span>Schedule: {l.startDate === l.endDate ? l.startDate : `${l.startDate} to ${l.endDate}`}</span>
                              {l.timeRange && <span className="text-indigo-400 font-sans font-medium">({l.timeRange})</span>}
                            </div>
                          </div>

                          {l.approvedBy && (
                            <div className="text-left sm:text-right text-[10px] text-slate-400 shrink-0 bg-slate-900/60 px-2.5 py-1 rounded-xl border border-slate-800">
                              <span>Approved by</span>
                              <span className="font-semibold text-slate-200 block">{l.approvedBy}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 5: REVIEWS ================= */}
          {activeTab === 'reviews' && (
            <div className="space-y-4 text-xs">
              <form onSubmit={handleAddReview} className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <span className="font-bold text-slate-200 block text-xs sm:text-sm">Add Executive PMO / Supervisor Performance Note</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Write evaluation feedback or commendation..."
                      value={reviewText}
                      onChange={e => setReviewText(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={reviewRating}
                      onChange={e => setReviewRating(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 flex-1 text-xs"
                    >
                      <option value="Exceeds Expectations">Exceeds Expectations</option>
                      <option value="Meets High Standard">Meets High Standard</option>
                      <option value="Needs Coaching">Needs Coaching</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shrink-0 shadow-md transition-all flex items-center justify-center"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </form>

              <div className="space-y-2.5">
                {reviewsList.map(rev => (
                  <div key={rev.id} className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100">{rev.author} <span className="text-slate-400 font-normal">({rev.role})</span></span>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold text-[10px]">
                        {rev.rating}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-xs">{rev.comment}</p>
                    <span className="text-[10px] text-slate-500 font-mono block pt-0.5">{rev.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER */}
        {/* ========================================================================= */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-mono text-[10px] sm:text-[11px]">ID: {stakeholder.id}</span>
            <span className="hidden sm:inline-block text-slate-700">•</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Shield className="w-3 h-3 text-indigo-400" />
              <span>360° Verified PMO Dossier</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors text-xs"
          >
            Close Report Card
          </button>
        </div>

      </div>
    </div>
  );
};
