import React, { useState, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  MemberLeave,
  LeaveType,
  LeaveStatus,
  ProjectData,
  UserProfile,
  Stakeholder
} from '../../types';
import {
  isUserOnLeave,
  getUserLeaves,
  doDateRangesOverlap,
  checkTaskLeaveConflict
} from '../../utils/portfolioAndLeaveUtils';
import { LeaveRequestModal } from './LeaveRequestModal';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  X,
  Plane,
  HeartPulse,
  BookOpen,
  Coffee,
  HelpCircle,
  UserCheck,
  AlertTriangle,
  Users,
  Shield,
  ShieldCheck,
  Building2,
  Briefcase,
  Layers,
  ArrowRight,
  Info,
  CalendarDays,
  LayoutList,
  Sparkles,
  RefreshCw,
  Check,
  FileSpreadsheet,
  Download,
  Trash2
} from 'lucide-react';

interface LeaveManagementProps {
  onNavigateToProject?: (projectId: string) => void;
}

export const LeaveManagement: React.FC<LeaveManagementProps> = ({ onNavigateToProject }) => {
  const {
    allProjectsMap,
    allUsers,
    currentUser,
    leaves,
    orgSettings,
    saveLeave,
    deleteLeave,
    updateLeaveStatus
  } = useProject();

  const isAdmin = currentUser.role === 'admin';
  const isPM = currentUser.role === 'pm';
  const isPrivileged = isAdmin || isPM;

  // View state: 'calendar' | 'timeline' | 'table'
  const [viewFormat, setViewFormat] = useState<'calendar' | 'timeline' | 'table'>('calendar');

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Role Scope View Segment:
  // Admin: 'all' | 'pm_leaves' | 'team_leaves'
  // PM: 'team_requests' | 'my_requests'
  const [roleScopeTab, setRoleScopeTab] = useState<'all' | 'pm_leaves' | 'team_leaves' | 'team_requests' | 'my_requests'>(() => {
    if (isAdmin) return 'all';
    if (isPM) return 'team_requests';
    return 'my_requests';
  });

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LeaveStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | LeaveType>('all');
  const [durationFilter, setDurationFilter] = useState<'all' | 'days' | 'hours'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'pm' | 'stakeholder'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // Modals & Selected Leave inspection
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedUserForLeave, setSelectedUserForLeave] = useState<string | undefined>(undefined);
  const [inspectingLeave, setInspectingLeave] = useState<MemberLeave | null>(null);

  // Projects list
  const projectsList = useMemo(() => {
    return Object.values(allProjectsMap) as ProjectData[];
  }, [allProjectsMap]);

  // Current year & month numbers
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Format month title (e.g. "August 2026")
  const monthTitle = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // 1. Role-Scoped Base Leaves:
  // - Admin: All leaves across the entire portfolio (including PM leaves requiring admin sign-off and all team member leaves)
  // - PM: ONLY Team Members' requests + PM's OWN submitted leave requests (other PMs' leaves are strictly hidden)
  // - Member: ONLY their own leave requests
  const roleScopedLeaves = useMemo(() => {
    const currentEmail = (currentUser?.email || '').toLowerCase();
    const currentId = currentUser?.id || '';

    if (isAdmin) {
      // Admin sees all leaves
      return leaves;
    }

    if (isPM) {
      // PM sees:
      // 1. Team Members' requests (non-PM applicants)
      // 2. Their OWN leave requests (to track their personal status with Admin)
      // Other PMs' leaves or Admin leaves are strictly hidden
      return leaves.filter(l => {
        const isSelf = l.userId === currentId || (l.userEmail || '').toLowerCase() === currentEmail;
        if (isSelf) return true;

        const isApplicantPM = l.applicantRole === 'pm' || 
          (l.role || '').toLowerCase().includes('pm') || 
          (l.role || '').toLowerCase().includes('project manager');

        const isApplicantAdmin = l.applicantRole === 'admin' || 
          (l.role || '').toLowerCase().includes('admin');

        // Hide other PMs and Admins
        if (isApplicantPM || isApplicantAdmin) return false;

        // Include team members' requests
        return true;
      });
    }

    // Regular Team Member / Contributor: Only own leaves
    return leaves.filter(l => {
      return l.userId === currentId || (l.userEmail || '').toLowerCase() === currentEmail;
    });
  }, [leaves, currentUser, isAdmin, isPM]);

  // 2. Filtered leaves with UI controls
  const filteredLeaves = useMemo(() => {
    const currentEmail = (currentUser?.email || '').toLowerCase();
    const currentId = currentUser?.id || '';

    return roleScopedLeaves.filter(l => {
      const isSelf = l.userId === currentId || (l.userEmail || '').toLowerCase() === currentEmail;
      const isPMApplicant = l.applicantRole === 'pm' || 
        (l.role || '').toLowerCase().includes('pm') || 
        (l.role || '').toLowerCase().includes('project manager');

      // Tab segment filtering
      if (isAdmin) {
        if (roleScopeTab === 'pm_leaves' && !isPMApplicant) return false;
        if (roleScopeTab === 'team_leaves' && isPMApplicant) return false;
      } else if (isPM) {
        if (roleScopeTab === 'team_requests' && isSelf) return false;
        if (roleScopeTab === 'my_requests' && !isSelf) return false;
      }

      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (typeFilter !== 'all' && l.leaveType !== typeFilter) return false;
      if (durationFilter !== 'all') {
        const itemDurationType = l.durationType || 'days';
        if (itemDurationType !== durationFilter) return false;
      }
      if (roleFilter !== 'all') {
        if (roleFilter === 'pm' && !isPMApplicant) return false;
        if (roleFilter === 'stakeholder' && isPMApplicant) return false;
      }
      if (projectFilter !== 'all' && !(l.impactedProjectIds || []).includes(projectFilter)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = l.userName.toLowerCase().includes(q);
        const matchReason = (l.reason || '').toLowerCase().includes(q);
        const matchRole = (l.role || '').toLowerCase().includes(q);
        if (!matchName && !matchReason && !matchRole) return false;
      }
      return true;
    });
  }, [roleScopedLeaves, roleScopeTab, statusFilter, typeFilter, durationFilter, roleFilter, projectFilter, searchQuery, isAdmin, isPM, currentUser]);

  // Key KPI metrics scoped to user's permissions
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const approvedLeaves = roleScopedLeaves.filter(l => l.status === 'approved');
    const pendingLeaves = roleScopedLeaves.filter(l => l.status === 'pending');

    // Pending PM leaves specifically (Admin sign-off required)
    const pendingPmLeaves = roleScopedLeaves.filter(l => l.status === 'pending' && l.applicantRole === 'pm');
    // Pending team member leaves
    const pendingTeamLeaves = roleScopedLeaves.filter(l => l.status === 'pending' && l.applicantRole !== 'pm');

    // Currently on leave today
    const currentlyOnLeave = approvedLeaves.filter(l => todayStr >= l.startDate && todayStr <= l.endDate);

    // Upcoming in next 30 days
    const nextMonthDate = new Date();
    nextMonthDate.setDate(nextMonthDate.getDate() + 30);
    const nextMonthStr = nextMonthDate.toISOString().split('T')[0];
    const upcomingLeaves = approvedLeaves.filter(l => l.startDate > todayStr && l.startDate <= nextMonthStr);

    // Total days & hours blocked
    const totalBlockedDays = approvedLeaves.reduce((acc, l) => acc + (l.daysCount || 0), 0);
    const totalBlockedHours = approvedLeaves.reduce((acc, l) => acc + (l.hoursCount || 0), 0);

    return {
      currentlyOnLeave,
      pendingLeaves,
      pendingPmLeaves,
      pendingTeamLeaves,
      upcomingLeaves,
      totalBlockedDays,
      totalBlockedHours
    };
  }, [roleScopedLeaves]);

  // Leave Type Config Map
  const leaveTypeConfig: Record<LeaveType, { label: string; icon: React.ReactNode; color: string; bg: string; border: string; text: string }> = {
    vacation: {
      label: 'Vacation',
      icon: <Plane className="w-3.5 h-3.5" />,
      color: '#38bdf8',
      bg: 'bg-sky-500/15',
      border: 'border-sky-500/30',
      text: 'text-sky-300'
    },
    sick: {
      label: 'Sick / Medical',
      icon: <HeartPulse className="w-3.5 h-3.5" />,
      color: '#f43f5e',
      bg: 'bg-rose-500/15',
      border: 'border-rose-500/30',
      text: 'text-rose-300'
    },
    conference: {
      label: 'Conference',
      icon: <UserCheck className="w-3.5 h-3.5" />,
      color: '#c084fc',
      bg: 'bg-purple-500/15',
      border: 'border-purple-500/30',
      text: 'text-purple-300'
    },
    training: {
      label: 'Training & Cert',
      icon: <BookOpen className="w-3.5 h-3.5" />,
      color: '#34d399',
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-500/30',
      text: 'text-emerald-300'
    },
    parental: {
      label: 'Parental',
      icon: <Coffee className="w-3.5 h-3.5" />,
      color: '#fbbf24',
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/30',
      text: 'text-amber-300'
    },
    unpaid: {
      label: 'Unpaid / Other',
      icon: <HelpCircle className="w-3.5 h-3.5" />,
      color: '#94a3b8',
      bg: 'bg-slate-500/15',
      border: 'border-slate-500/30',
      text: 'text-slate-300'
    },
    other: {
      label: 'Other',
      icon: <HelpCircle className="w-3.5 h-3.5" />,
      color: '#94a3b8',
      bg: 'bg-slate-500/15',
      border: 'border-slate-500/30',
      text: 'text-slate-300'
    }
  };

  // Build Calendar Matrix for Monthly View
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon, ...
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // Days from previous month to fill the first row
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    const days: {
      date: Date;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      leaves: MemberLeave[];
    }[] = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month padding days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
      const dateStr = d.toISOString().split('T')[0];
      const activeLeaves = filteredLeaves.filter(l => {
        return dateStr >= l.startDate && dateStr <= l.endDate;
      });
      days.push({
        date: d,
        dateStr,
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        leaves: activeLeaves
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(currentYear, currentMonth, i);
      const dateStr = d.toISOString().split('T')[0];
      const activeLeaves = filteredLeaves.filter(l => {
        return dateStr >= l.startDate && dateStr <= l.endDate;
      });
      days.push({
        date: d,
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        leaves: activeLeaves
      });
    }

    // Next month padding days to complete 35 or 42 grid cells
    const remainingCells = 42 - days.length;
    if (remainingCells < 7 || days.length <= 35) {
      const targetLength = days.length <= 35 ? 35 : 42;
      const countToAdd = targetLength - days.length;
      for (let i = 1; i <= countToAdd; i++) {
        const d = new Date(currentYear, currentMonth + 1, i);
        const dateStr = d.toISOString().split('T')[0];
        const activeLeaves = filteredLeaves.filter(l => {
          return dateStr >= l.startDate && dateStr <= l.endDate;
        });
        days.push({
          date: d,
          dateStr,
          dayNumber: i,
          isCurrentMonth: false,
          isToday: dateStr === todayStr,
          leaves: activeLeaves
        });
      }
    }

    return days;
  }, [currentYear, currentMonth, filteredLeaves]);

  // Days in month for horizontal timeline view
  const timelineDays = useMemo(() => {
    const daysCount = new Date(currentYear, currentMonth + 1, 0).getDate();
    const result: { dateStr: string; dayNumber: number; dayName: string; isToday: boolean; isWeekend: boolean }[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 1; i <= daysCount; i++) {
      const d = new Date(currentYear, currentMonth, i);
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      result.push({
        dateStr,
        dayNumber: i,
        dayName: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        isToday: dateStr === todayStr,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });
    }
    return result;
  }, [currentYear, currentMonth]);

  // Find all task conflicts for an inspected leave
  const inspectedLeaveConflicts = useMemo(() => {
    if (!inspectingLeave) return [];
    const conflicts: { project: ProjectData; task: any }[] = [];

    projectsList.forEach(proj => {
      (proj.tasks || []).forEach(task => {
        if (task.status === 'done') return;
        const isAssignee = (task.assigneeIds || []).some(
          id => id === inspectingLeave.userId || (proj.stakeholders || []).some(s => s.id === id && s.email.toLowerCase() === inspectingLeave.userEmail.toLowerCase())
        );
        if (isAssignee && doDateRangesOverlap(task.startDate, task.dueDate, inspectingLeave.startDate, inspectingLeave.endDate)) {
          conflicts.push({ project: proj, task });
        }
      });
    });

    return conflicts;
  }, [inspectingLeave, projectsList]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Overview Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-inner">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Team Leave & Availability Calendar</h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold">
                PMO Governance
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Organizational overview of time-off, capacity blocks, and automated scheduling conflict safeguards.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Format Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setViewFormat('calendar')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewFormat === 'calendar'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Monthly Grid</span>
            </button>
            <button
              onClick={() => setViewFormat('timeline')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewFormat === 'timeline'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Timeline</span>
            </button>
            <button
              onClick={() => setViewFormat('table')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewFormat === 'table'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List & Approvals</span>
              {stats.pendingLeaves.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px]">
                  {stats.pendingLeaves.length}
                </span>
              )}
            </button>
          </div>

          {/* New Leave Request Button */}
          {isPrivileged && (
            <button
              onClick={() => {
                setSelectedUserForLeave(undefined);
                setIsLeaveModalOpen(true);
              }}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isAdmin ? 'Log / Grant Leave' : 'Request Time Off / Leave'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Role-Based Governance Scope Segment Switcher */}
      <div className="bg-slate-900 border border-slate-800 p-2 sm:p-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={() => setRoleScopeTab('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  roleScopeTab === 'all'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>All Organization Leaves ({roleScopedLeaves.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setRoleScopeTab('pm_leaves')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  roleScopeTab === 'pm_leaves'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>PM Leave Requests • Admin Sign-Off</span>
                {stats.pendingPmLeaves.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-mono text-[10px] font-black">
                    {stats.pendingPmLeaves.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setRoleScopeTab('team_leaves')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  roleScopeTab === 'team_leaves'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>Team Member Leaves</span>
              </button>
            </>
          ) : isPM ? (
            <>
              <button
                type="button"
                onClick={() => setRoleScopeTab('team_requests')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  roleScopeTab === 'team_requests'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>Team Member Leave Requests (Review &amp; Approve)</span>
                {stats.pendingTeamLeaves.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-mono text-[10px] font-black">
                    {stats.pendingTeamLeaves.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setRoleScopeTab('my_requests')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  roleScopeTab === 'my_requests'
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>My PM Leave Submissions (Routes to Admin)</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold px-2">
              <UserCheck className="w-4 h-4 text-indigo-400" />
              <span>My Submitted Time Off &amp; Availability Requests</span>
            </div>
          )}
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 px-2">
          {isAdmin && (
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold">
              👑 Executive Admin View: Direct PM Sign-Off Authority
            </span>
          )}
          {isPM && (
            <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold">
              ⚡ PM View: Managing Team Availability (PM Leaves Route to Admin)
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: On Leave Today */}
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold block">Currently On Leave Today</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-sky-400 font-mono">
                {stats.currentlyOnLeave.length}
              </span>
              <span className="text-xs text-slate-500">members</span>
            </div>
            <div className="flex -space-x-1.5 overflow-hidden pt-1">
              {stats.currentlyOnLeave.slice(0, 4).map(l => (
                <img
                  key={l.id}
                  src={l.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={l.userName}
                  title={`${l.userName} (${l.leaveType})`}
                  className="w-6 h-6 rounded-full border border-slate-800 object-cover"
                />
              ))}
              {stats.currentlyOnLeave.length === 0 && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Full team present
                </span>
              )}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Plane className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Pending Approvals */}
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold block">Pending Approvals</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono ${stats.pendingLeaves.length > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {stats.pendingLeaves.length}
              </span>
              <span className="text-xs text-slate-500">requests</span>
            </div>
            <span className="text-[11px] text-slate-400 block pt-1">
              {isAdmin ? 'Admin sign-off required' : 'Submitted to Executive PMO'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Upcoming in 30 days */}
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold block">Upcoming in 30 Days</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-400 font-mono">
                {stats.upcomingLeaves.length}
              </span>
              <span className="text-xs text-slate-500">planned leaves</span>
            </div>
            <span className="text-[11px] text-slate-400 block pt-1">
              Auto-flagged in Gantt & Workload
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Total Blocked Hours */}
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold block">Capacity Blocked</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {stats.totalBlockedHours}h
              </span>
              <span className="text-xs text-slate-500">({stats.totalBlockedDays} days)</span>
            </div>
            <span className="text-[11px] text-slate-400 block pt-1">
              {orgSettings.annualLeaveDaysAllowance}d annual allowance per member
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Month Navigation Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-3xl">
        {/* Month Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-950 rounded-2xl border border-slate-800 p-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3.5 py-1 text-sm font-bold text-slate-100 min-w-[140px] text-center font-mono">
              {monthTitle}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold transition-colors"
          >
            Today
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses ({leaves.length})</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending Approval</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Duration Unit Filter (Full Day vs Hourly) */}
          <select
            value={durationFilter}
            onChange={e => setDurationFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Durations (Days &amp; Hours)</option>
            <option value="days">📅 Full Day(s) Only</option>
            <option value="hours">⏱️ Hourly Off Only</option>
          </select>

          {/* Role Routing Filter */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Applicant Roles</option>
            <option value="pm">👑 PM Leaves (To Admin)</option>
            <option value="stakeholder">👥 Team Member Leaves</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Leave Types</option>
            <option value="vacation">🏖️ Vacation</option>
            <option value="sick">🏥 Sick / Medical</option>
            <option value="conference">🎤 Conference</option>
            <option value="training">📚 Training</option>
            <option value="parental">👶 Parental</option>
            <option value="unpaid">⏳ Unpaid / Sabbatical</option>
          </select>

          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Projects</option>
            {projectsList.map(p => (
              <option key={p.id} value={p.id}>
                {p.projectCode} - {p.projectName}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search member or reason..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MONTHLY CALENDAR GRID VIEW */}
      {/* ========================================================================= */}
      {viewFormat === 'calendar' && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/80 text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-3">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Grid Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-800/60 bg-slate-950/30">
            {calendarDays.map((cell, idx) => {
              const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors group relative ${
                    cell.isCurrentMonth ? 'bg-slate-900/40' : 'bg-slate-950/60 opacity-60'
                  } ${cell.isToday ? 'ring-1 ring-inset ring-indigo-500/80 bg-indigo-950/20' : ''} ${
                    isWeekend ? 'bg-slate-950/40' : ''
                  }`}
                >
                  {/* Top Bar: Day Number & Add Action */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        cell.isToday
                          ? 'bg-indigo-600 text-white font-black shadow'
                          : cell.isCurrentMonth
                          ? 'text-slate-300'
                          : 'text-slate-600'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Quick Add Leave on this day */}
                    {isPM && cell.isCurrentMonth && (
                      <button
                        onClick={() => {
                          setSelectedUserForLeave(undefined);
                          setIsLeaveModalOpen(true);
                        }}
                        title={`Log leave on ${cell.dateStr}`}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-slate-800 text-slate-400 hover:text-white transition-all text-[10px]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Day's Leaves Stack */}
                  <div className="mt-1 space-y-1 overflow-y-auto max-h-[85px] custom-scrollbar">
                    {cell.leaves.map(l => {
                      const cfg = leaveTypeConfig[l.leaveType] || leaveTypeConfig.other;
                      const isPending = l.status === 'pending';

                      return (
                        <div
                          key={l.id}
                          onClick={() => setInspectingLeave(l)}
                          className={`px-1.5 py-1 rounded-lg text-[10px] font-semibold border flex items-center justify-between gap-1 cursor-pointer transition-transform hover:scale-[1.02] ${
                            isPending
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                              : `${cfg.bg} ${cfg.border} ${cfg.text}`
                          }`}
                          title={`${l.userName} - ${cfg.label} (${l.startDate} to ${l.endDate})\nStatus: ${l.status.toUpperCase()}\nReason: ${l.reason}`}
                        >
                          <div className="flex items-center gap-1 min-w-0 truncate">
                            <span className="shrink-0">{cfg.icon}</span>
                            <span className="truncate font-bold">{l.userName.split(' ')[0]}</span>
                          </div>
                          {isPending && (
                            <span className="text-[9px] px-1 rounded bg-amber-400/20 text-amber-300 shrink-0 font-mono">
                              Pending
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. HORIZONTAL TIMELINE VIEW */}
      {/* ========================================================================= */}
      {viewFormat === 'timeline' && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Team Member Schedule Timeline</h3>
              <p className="text-xs text-slate-400">Horizontal monthly allocation map showing blocked leave periods.</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" /> Vacation
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Sick / Medical
              </span>
              <span className="flex items-center gap-1.5 text-purple-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" /> Conference
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Pending
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Header Days */}
              <div className="flex border-b border-slate-800 bg-slate-950 text-slate-400 text-xs font-mono">
                <div className="w-64 p-3 font-semibold text-slate-300 shrink-0 border-r border-slate-800">
                  Team Member
                </div>
                <div className="flex-1 flex">
                  {timelineDays.map(d => (
                    <div
                      key={d.dateStr}
                      className={`flex-1 text-center py-2 border-r border-slate-800/80 shrink-0 min-w-[28px] ${
                        d.isToday
                          ? 'bg-indigo-950/80 text-indigo-300 font-bold'
                          : d.isWeekend
                          ? 'bg-slate-950/80 text-slate-600'
                          : ''
                      }`}
                    >
                      <div className="text-[10px]">{d.dayNumber}</div>
                      <div className="text-[8px] uppercase">{d.dayName}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Members Rows */}
              <div className="divide-y divide-slate-800/60">
                {allUsers.map(user => {
                  const userLeaves = filteredLeaves.filter(
                    l => l.userId === user.id || l.userEmail.toLowerCase() === user.email.toLowerCase()
                  );

                  return (
                    <div key={user.id} className="flex hover:bg-slate-850/40 transition-colors items-center">
                      {/* Member Info */}
                      <div className="w-64 p-3 border-r border-slate-800 flex items-center gap-2.5 shrink-0">
                        <img
                          src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                          alt={user.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-100 truncate">{user.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{user.title || user.role}</div>
                        </div>
                      </div>

                      {/* Timeline Cells */}
                      <div className="flex-1 flex relative h-12 items-center">
                        {timelineDays.map(d => {
                          const activeLeaveOnDay = userLeaves.find(
                            l => d.dateStr >= l.startDate && d.dateStr <= l.endDate
                          );

                          const cfg = activeLeaveOnDay
                            ? leaveTypeConfig[activeLeaveOnDay.leaveType] || leaveTypeConfig.other
                            : null;

                          return (
                            <div
                              key={d.dateStr}
                              className={`flex-1 h-full border-r border-slate-800/40 shrink-0 min-w-[28px] flex items-center justify-center p-0.5 ${
                                d.isToday ? 'bg-indigo-950/20' : d.isWeekend ? 'bg-slate-950/30' : ''
                              }`}
                            >
                              {activeLeaveOnDay && (
                                <div
                                  onClick={() => setInspectingLeave(activeLeaveOnDay)}
                                  className={`w-full h-7 rounded-md cursor-pointer transition-all hover:scale-105 flex items-center justify-center text-[10px] font-bold ${
                                    activeLeaveOnDay.status === 'pending'
                                      ? 'bg-amber-500/30 border border-amber-500/60 text-amber-300'
                                      : `${cfg?.bg} border ${cfg?.border} ${cfg?.text}`
                                  }`}
                                  title={`${user.name} on ${activeLeaveOnDay.leaveType.toUpperCase()}\n${activeLeaveOnDay.startDate} to ${activeLeaveOnDay.endDate}\n${activeLeaveOnDay.reason}`}
                                >
                                  {d.dateStr === activeLeaveOnDay.startDate && (
                                    <span className="truncate px-1 text-[9px]">
                                      {activeLeaveOnDay.leaveType.slice(0, 3)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. LEAVE REQUESTS & APPROVALS TABLE */}
      {/* ========================================================================= */}
      {viewFormat === 'table' && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Leave Requests & Governance Approvals</h3>
              <p className="text-xs text-slate-400">
                Review submitted time-off, approve availability blocks, and manage task delegations.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[950px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold">
                  <th className="py-3.5 px-4 min-w-[200px]">Member</th>
                  <th className="py-3.5 px-3 min-w-[120px]">Type</th>
                  <th className="py-3.5 px-3 min-w-[160px]">Date Range</th>
                  <th className="py-3.5 px-3 min-w-[130px]">Duration & Hours</th>
                  <th className="py-3.5 px-3 min-w-[180px]">Reason / Details</th>
                  <th className="py-3.5 px-3 min-w-[140px]">Designated Substitute</th>
                  <th className="py-3.5 px-3 min-w-[140px]">Impacted Projects</th>
                  <th className="py-3.5 px-3 min-w-[120px]">Status</th>
                  <th className="py-3.5 px-4 min-w-[120px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-500 italic">
                      No leave requests found matching the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeaves.map(leave => {
                    const cfg = leaveTypeConfig[leave.leaveType] || leaveTypeConfig.other;
                    const isPending = leave.status === 'pending';

                    return (
                      <tr key={leave.id} className="hover:bg-slate-850/40 transition-colors">
                        {/* Member */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={leave.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                              alt={leave.userName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-100 whitespace-nowrap">{leave.userName}</span>
                                {leave.applicantRole === 'pm' && (
                                  <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-bold shrink-0 whitespace-nowrap">
                                    PM
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block whitespace-nowrap">{leave.role}</span>
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${cfg.bg} ${cfg.border} ${cfg.text} border shrink-0`}
                          >
                            {cfg.icon}
                            <span>{cfg.label}</span>
                          </span>
                        </td>

                        {/* Date Range & Schedule */}
                        <td className="py-3.5 px-3 font-mono whitespace-nowrap">
                          <div className="text-slate-200 font-semibold">
                            {leave.startDate === leave.endDate ? leave.startDate : `${leave.startDate} → ${leave.endDate}`}
                          </div>
                          {leave.timeRange && (
                            <div className="text-[10px] text-indigo-400 font-medium font-sans">
                              {leave.timeRange}
                            </div>
                          )}
                        </td>

                        {/* Duration */}
                        <td className="py-3.5 px-3 font-mono whitespace-nowrap">
                          {leave.durationType === 'hours' ? (
                            <div>
                              <span className="font-bold text-amber-400 block">
                                {leave.hoursCount}h Time Off
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-sans font-semibold inline-block">
                                Partial Day
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="font-bold text-indigo-300 block">
                                {leave.daysCount} day{leave.daysCount !== 1 ? 's' : ''}
                              </span>
                              <span className="text-[10px] text-slate-400 font-sans">
                                ({leave.hoursCount}h capacity)
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Reason */}
                        <td className="py-3.5 px-3 max-w-[200px]">
                          <p className="truncate text-slate-300" title={leave.reason}>
                            {leave.reason || 'No specific details provided'}
                          </p>
                        </td>

                        {/* Substitute */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {leave.substituteUserName ? (
                            <span className="text-indigo-400 font-medium text-xs flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-indigo-400 shrink-0" />
                              <span>{leave.substituteUserName}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">None assigned</span>
                          )}
                        </td>

                        {/* Impacted Projects */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {(leave.impactedProjectIds || []).map(pId => {
                              const proj = projectsList.find(p => p.id === pId);
                              return (
                                <span
                                  key={pId}
                                  className="px-1.5 py-0.2 rounded bg-slate-800 text-[9px] font-mono text-slate-300 border border-slate-700 shrink-0 whitespace-nowrap"
                                >
                                  {proj?.projectCode || pId}
                                </span>
                              );
                            })}
                            {(!leave.impactedProjectIds || leave.impactedProjectIds.length === 0) && (
                              <span className="text-slate-500 text-[11px]">--</span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                              leave.status === 'approved'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : leave.status === 'pending'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {leave.status === 'approved' && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                            {leave.status === 'pending' && <Clock className="w-3 h-3 shrink-0" />}
                            {leave.status === 'rejected' && <X className="w-3 h-3 shrink-0" />}
                            <span>{leave.status}</span>
                          </span>
                          {leave.status === 'pending' && leave.applicantRole === 'pm' && (
                            <span className="text-[9px] text-amber-400 block mt-0.5 font-semibold whitespace-nowrap">
                              Admin Sign-off Required
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Inspect */}
                            <button
                              type="button"
                              onClick={() => setInspectingLeave(leave)}
                              title="Inspect Details & Conflicts"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0"
                            >
                              <Info className="w-3.5 h-3.5 shrink-0" />
                            </button>

                            {/* Approve / Reject logic: Admin can approve all; PM can approve team member leaves only */}
                            {isPending && (isAdmin || (isPM && leave.applicantRole !== 'pm' && leave.userId !== currentUser.id)) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => updateLeaveStatus(leave.id, 'approved', currentUser.name)}
                                  title="Approve Leave"
                                  className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white transition-all shrink-0"
                                >
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateLeaveStatus(leave.id, 'rejected', currentUser.name)}
                                  title="Reject Leave"
                                  className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white transition-all shrink-0"
                                >
                                  <X className="w-3.5 h-3.5 shrink-0" />
                                </button>
                              </>
                            )}

                            {/* Self or PM leave awaiting Admin sign-off indicator for PM */}
                            {isPending && isPM && (leave.applicantRole === 'pm' || leave.userId === currentUser.id) && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium shrink-0 whitespace-nowrap">
                                Awaiting Admin
                              </span>
                            )}

                            {/* Delete */}
                            {(isAdmin || leave.userId === currentUser.id) && (
                              <button
                                type="button"
                                onClick={() => deleteLeave(leave.id)}
                                title="Delete Leave Record"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INSPECT LEAVE DETAILS & CONFLICTS MODAL */}
      {/* ========================================================================= */}
      {inspectingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[86vh]">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                  <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">Leave Allocation Details</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate">{inspectingLeave.userName} • {inspectingLeave.role}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectingLeave(null)}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-3.5 sm:p-4 space-y-3 text-xs overflow-y-auto custom-scrollbar flex-1 min-h-0">
              {/* Governance & Routing Banner */}
              {inspectingLeave.applicantRole === 'pm' ? (
                <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-1.5 py-0.5 rounded-md bg-indigo-600/30 text-indigo-300 font-bold text-[10px]">PM</span>
                    <div className="min-w-0">
                      <span className="font-bold text-white block text-xs truncate">Project Manager Leave Request</span>
                      <span className="text-[10px] text-indigo-300 block truncate">Requires Executive Admin Sign-Off</span>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 font-bold shrink-0">
                    Admin Tier
                  </span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold text-[10px]">Team</span>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-200 block text-xs truncate">Team Member Availability Request</span>
                      <span className="text-[10px] text-slate-400 block truncate">Reviewable by Project Manager or Executive Admin</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Leave Meta Details (Responsive 2 to 4 columns) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Leave Type</span>
                  <span className="font-bold text-indigo-300 capitalize text-xs">{inspectingLeave.leaveType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Approval Status</span>
                  <span
                    className={`font-bold capitalize text-xs ${
                      inspectingLeave.status === 'approved'
                        ? 'text-emerald-400'
                        : inspectingLeave.status === 'pending'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {inspectingLeave.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Duration & Unit</span>
                  <span className="font-mono font-bold text-slate-200 text-xs">
                    {inspectingLeave.durationType === 'hours' 
                      ? `${inspectingLeave.hoursCount}h (Partial)`
                      : `${inspectingLeave.daysCount}d (${inspectingLeave.hoursCount}h)`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    {inspectingLeave.durationType === 'hours' ? 'Date & Time' : 'Date Span'}
                  </span>
                  <span className="font-mono text-slate-300 block text-[11px] truncate">
                    {inspectingLeave.startDate === inspectingLeave.endDate
                      ? inspectingLeave.startDate
                      : `${inspectingLeave.startDate} → ${inspectingLeave.endDate}`}
                  </span>
                  {inspectingLeave.timeRange && (
                    <span className="text-[10px] text-indigo-400 font-sans font-medium block truncate">
                      {inspectingLeave.timeRange}
                    </span>
                  )}
                </div>
              </div>

              {/* Reason & Substitute in responsive 2-column or stacked */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <span className="text-slate-400 font-semibold block mb-1 text-[11px]">Reason & Context:</span>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 leading-relaxed text-xs h-[64px] overflow-y-auto custom-scrollbar">
                    {inspectingLeave.reason || 'No detailed reason provided.'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block mb-1 text-[11px]">Designated Substitute / Handover:</span>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2 h-[64px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="font-bold text-slate-200 truncate text-xs">
                        {inspectingLeave.substituteUserName || 'No substitute assigned'}
                      </span>
                    </div>
                    {inspectingLeave.substituteUserName && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0">
                        Stand-In
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Scheduling Conflicts Safeguard */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Active Task Schedule Conflicts ({inspectedLeaveConflicts.length})</span>
                  </span>
                </div>
                {inspectedLeaveConflicts.length === 0 ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>No conflicting project tasks scheduled during this leave window.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                    {inspectedLeaveConflicts.map((c, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-bold block truncate">{c.task.title}</span>
                          <span className="text-[10px] text-amber-300/80 font-mono">
                            {c.project.projectCode} • {c.task.startDate} to {c.task.dueDate}
                          </span>
                        </div>
                        {onNavigateToProject && (
                          <button
                            onClick={() => {
                              onNavigateToProject(c.project.id);
                              setInspectingLeave(null);
                            }}
                            className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-bold shrink-0 transition-colors"
                          >
                            Open Project
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions Sticky Footer */}
            <div className="p-3 sm:p-3.5 border-t border-slate-800 bg-slate-950/80 shrink-0 flex items-center justify-between gap-2">
              <div className="text-[10px] sm:text-[11px] truncate">
                {inspectingLeave.status === 'pending' ? (
                  isAdmin ? (
                    <span className="text-amber-400 font-medium">Executive Admin Final Decision</span>
                  ) : isPM && (inspectingLeave.applicantRole === 'pm' || inspectingLeave.userId === currentUser.id) ? (
                    <span className="text-amber-300/80 italic">Awaiting Executive Admin Sign-off</span>
                  ) : isPM ? (
                    <span className="text-indigo-300 font-medium">PM Availability Review</span>
                  ) : (
                    <span className="text-slate-400">Request Pending Review</span>
                  )
                ) : (
                  <span className="text-slate-400">
                    Record is <span className="capitalize font-semibold text-slate-200">{inspectingLeave.status}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {inspectingLeave.status === 'pending' && (isAdmin || (isPM && inspectingLeave.applicantRole !== 'pm' && inspectingLeave.userId !== currentUser.id)) ? (
                  <>
                    <button
                      onClick={() => {
                        updateLeaveStatus(inspectingLeave.id, 'rejected', currentUser.name);
                        setInspectingLeave(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-semibold transition-all text-xs"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        updateLeaveStatus(inspectingLeave.id, 'approved', currentUser.name);
                        setInspectingLeave(null);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md shadow-emerald-600/20 text-xs"
                    >
                      {isAdmin && inspectingLeave.applicantRole === 'pm' ? 'Approve PM Leave' : 'Approve'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setInspectingLeave(null)}
                    className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold transition-all text-xs"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Request Modal */}
      <LeaveRequestModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        defaultUserId={selectedUserForLeave}
      />
    </div>
  );
};
