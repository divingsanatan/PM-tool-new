import React, { useState, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Stakeholder, Task, ProjectData, UserProfile } from '../../types';
import { calculateMemberMetrics, MemberMetrics } from '../../utils/memberMetrics';
import { PMAiBriefingModal } from './PMAiBriefingModal';
import { ProjectForecastModal } from './ProjectForecastModal';
import { ProjectForecastSection } from './ProjectForecastSection';
import { calculateProjectForecast, formatFriendlyDate } from '../../utils/forecastUtils';
import {
  getEVMCardClass,
  getEVMBadgeClass,
  getEVMTextColorClass,
  getEVMStatusLabel
} from '../../utils/scorecardFormatting';
import { EVMScorecardBadge } from '../common/EVMScorecardBadge';
import { ResponsiveSelect } from '../common/ResponsiveSelect';
import {
  Users,
  Building2,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Briefcase,
  Shield,
  ShieldAlert,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Layers,
  Award,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw,
  Edit3,
  UserCheck,
  UserPlus,
  FileSpreadsheet,
  Check,
  LayoutGrid,
  List,
  Calendar,
  AlertCircle,
  HelpCircle,
  Target,
  Activity,
  Zap,
  CheckSquare,
  Plane,
  X
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
  Cell,
  ReferenceLine,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie
} from 'recharts';

interface PMTeamExecutiveDashboardProps {
  onNavigate: (view: any) => void;
  onOpenAiReportModal?: () => void;
  onOpenTaskModal?: (task?: Task) => void;
  onOpenRaidModal?: () => void;
  targetPmId?: string; // Optional for admin to view specific PM team
}

export const PMTeamExecutiveDashboard: React.FC<PMTeamExecutiveDashboardProps> = ({
  onNavigate,
  onOpenAiReportModal,
  onOpenTaskModal,
  onOpenRaidModal,
  targetPmId
}) => {
  const {
    allProjectsMap,
    projectData,
    allUsers,
    leaves,
    currentUser,
    switchProject
  } = useProject();

  // Determine current active PM
  const activePMUser: UserProfile = useMemo(() => {
    if (targetPmId) {
      const found = allUsers.find(u => u.id === targetPmId);
      if (found) return found;
    }
    return currentUser || {
      id: 'user-pm-1',
      name: 'Project Manager',
      email: 'pm@apex.io',
      role: 'pm',
      title: 'Project Manager',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
      skills: ['Agile', 'Scrum']
    };
  }, [allUsers, currentUser, targetPmId]);

  // Convert allProjectsMap to array
  const allProjects = useMemo(() => {
    return Object.values(allProjectsMap || {});
  }, [allProjectsMap]);

  // Filter projects managed by this PM
  const managedProjects = useMemo(() => {
    const pmEmail = (activePMUser?.email || '').toLowerCase();
    const pmId = activePMUser?.id || '';

    const matched = allProjects.filter(p => {
      if (!p) return false;
      const isLeadOnProject = (p.stakeholders || []).some(
        s => (s.id === pmId || s.email?.toLowerCase() === pmEmail) &&
             (s.role?.toLowerCase().includes('manager') || s.role?.toLowerCase().includes('master') || s.role?.toLowerCase().includes('lead') || s.role?.toLowerCase().includes('director') || s.role?.toLowerCase().includes('pm'))
      );
      const isStakeholder = (p.stakeholders || []).some(
        s => s.id === pmId || s.email?.toLowerCase() === pmEmail
      );
      const pmObj = (p as any).projectManager;
      const matchesPmObj = pmObj && (pmObj.id === pmId || pmObj.email?.toLowerCase() === pmEmail || pmObj.userId === pmId);
      return isLeadOnProject || isStakeholder || Boolean(matchesPmObj);
    });

    // If no project explicitly matches PM metadata, fallback to current projectData or allProjects
    if (matched.length === 0) {
      if (allProjects.length > 0) return allProjects;
      return projectData ? [projectData] : [];
    }
    return matched;
  }, [allProjects, activePMUser, projectData]);

  // Selected project filter for the dashboard ('all' or specific project ID)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // Filtered project list based on selection
  const scopedProjects = useMemo(() => {
    if (selectedProjectId === 'all') return managedProjects;
    return managedProjects.filter(p => p.id === selectedProjectId);
  }, [managedProjects, selectedProjectId]);

  // UI state for tabs and filters
  const [activeTab, setActiveTab] = useState<'analytics' | 'roster' | 'projects' | 'raid' | 'leaves'>('analytics');
  const [activeAnalyticsView, setActiveAnalyticsView] = useState<'workload' | 'radar' | 'hours' | 'status' | 'financials' | 'forecast'>('workload');
  const [searchQuery, setSearchQuery] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState<'all' | 'active' | 'overallocated' | 'on_leave' | 'blocked'>('all');
  const [memberSortBy, setMemberSortBy] = useState<'score' | 'workload' | 'tasks' | 'hours'>('score');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedMemberForDossier, setSelectedMemberForDossier] = useState<MemberMetrics | null>(null);
  const [isAiBriefingModalOpen, setIsAiBriefingModalOpen] = useState(false);
  const [isForecastModalOpen, setIsForecastModalOpen] = useState(false);
  const [forecastModalProjectId, setForecastModalProjectId] = useState<string>('');
  const [selectedRadarMemberId, setSelectedRadarMemberId] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Aggregate all unique team members / stakeholders across scoped projects
  const teamMembersMetrics = useMemo(() => {
    const stakeholderMap = new Map<string, Stakeholder>();
    const allScopedTasks: Task[] = [];
    const allScopedSubtasks: any[] = [];
    const allScopedMilestones: any[] = [];

    const adminEmails = new Set(
      allUsers
        .filter(u => u.role === 'admin')
        .map(u => u.email.toLowerCase())
    );

    scopedProjects.forEach(proj => {
      (proj.stakeholders || []).forEach(sh => {
        const emailLower = (sh.email || '').toLowerCase();
        // Exclude Admin from team roster
        if (adminEmails.has(emailLower) || sh.id === 'sh-admin' || (sh.role || '').toLowerCase().includes('portfolio administrator') || (sh.role || '').toLowerCase().includes('executive admin')) {
          return;
        }
        // Exclude external stakeholders from team roster
        if (sh.category === 'external') {
          return;
        }
        if (!stakeholderMap.has(sh.id)) {
          stakeholderMap.set(sh.id, sh);
        }
      });
      allScopedTasks.push(...(proj.tasks || []));
      allScopedSubtasks.push(...(proj.subtasks || []));
      allScopedMilestones.push(...(proj.milestones || []));
    });

    const members = Array.from(stakeholderMap.values());

    return members.map(sh => {
      return calculateMemberMetrics(
        sh.id,
        members,
        allScopedTasks,
        allScopedSubtasks,
        allScopedMilestones
      );
    });
  }, [scopedProjects]);

  // Collect team leaves
  const teamLeaves = useMemo(() => {
    const memberEmails = new Set(teamMembersMetrics.map(m => m.stakeholder.email.toLowerCase()));
    const memberIds = new Set(teamMembersMetrics.map(m => m.stakeholder.id));

    return (leaves || []).filter(l => {
      return (
        (memberIds.has(l.userId) || memberEmails.has(l.userEmail.toLowerCase())) &&
        l.status === 'approved'
      );
    });
  }, [leaves, teamMembersMetrics]);

  // Filtered & Sorted Team Members
  const filteredMembers = useMemo(() => {
    return teamMembersMetrics
      .filter(m => {
        const matchesSearch =
          m.stakeholder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.stakeholder.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.stakeholder.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.stakeholder.skills || []).some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        const isMemberOnLeave = teamLeaves.some(l => 
          (l.userId === m.stakeholder.id || l.userEmail.toLowerCase() === m.stakeholder.email.toLowerCase()) &&
          todayStr >= l.startDate && todayStr <= l.endDate
        );

        if (memberStatusFilter === 'on_leave') return isMemberOnLeave;
        if (memberStatusFilter === 'overallocated') return m.utilizationPercent > 100;
        if (memberStatusFilter === 'blocked') return m.blockedTasksCount > 0;
        if (memberStatusFilter === 'active') return !isMemberOnLeave && m.totalAssignedTasks > 0;

        return true;
      })
      .sort((a, b) => {
        if (memberSortBy === 'score') return b.reportCardScore - a.reportCardScore;
        if (memberSortBy === 'workload') return b.utilizationPercent - a.utilizationPercent;
        if (memberSortBy === 'tasks') return b.totalAssignedTasks - a.totalAssignedTasks;
        if (memberSortBy === 'hours') return b.totalActualHours - a.totalActualHours;
        return 0;
      });
  }, [teamMembersMetrics, searchQuery, memberStatusFilter, memberSortBy, teamLeaves, todayStr]);

  // Aggregate Metrics for PM's Team
  const teamAggregateMetrics = useMemo(() => {
    const totalMembers = teamMembersMetrics.length;
    const activeContributors = teamMembersMetrics.filter(m => m.totalAssignedTasks > 0).length;
    const totalAssignedTasks = teamMembersMetrics.reduce((sum, m) => sum + m.totalAssignedTasks, 0);
    const totalCompletedTasks = teamMembersMetrics.reduce((sum, m) => sum + m.completedTasksCount, 0);
    const totalInProgressTasks = teamMembersMetrics.reduce((sum, m) => sum + m.inProgressTasksCount, 0);
    const totalBlockedTasks = teamMembersMetrics.reduce((sum, m) => sum + m.blockedTasksCount, 0);
    const totalReviewTasks = teamMembersMetrics.reduce((sum, m) => sum + m.reviewTasksCount, 0);
    const totalTodoTasks = teamMembersMetrics.reduce((sum, m) => sum + m.todoTasksCount, 0);

    const totalEstHours = teamMembersMetrics.reduce((sum, m) => sum + m.totalEstimatedHours, 0);
    const totalActHours = teamMembersMetrics.reduce((sum, m) => sum + m.totalActualHours, 0);
    const totalEarnedHours = teamMembersMetrics.reduce((sum, m) => sum + m.earnedHours, 0);

    const avgScore = totalMembers > 0
      ? Math.round(teamMembersMetrics.reduce((sum, m) => sum + m.reportCardScore, 0) / totalMembers)
      : 85;

    const avgUtilization = totalMembers > 0
      ? Math.round(teamMembersMetrics.reduce((sum, m) => sum + m.utilizationPercent, 0) / totalMembers)
      : 0;

    const totalBudget = scopedProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalPV = scopedProjects.reduce((sum, p) => sum + (p.evm?.plannedValue || 0), 0);
    const totalEV = scopedProjects.reduce((sum, p) => sum + (p.evm?.earnedValue || 0), 0);
    const totalAC = scopedProjects.reduce((sum, p) => sum + (p.evm?.actualCost || 0), 0);
    const totalEAC = scopedProjects.reduce((sum, p) => sum + (p.evm?.eac || 0), 0);

    const teamSPI = totalPV > 0 ? Math.round((totalEV / totalPV) * 100) / 100 : 1.0;
    const teamCPI = totalAC > 0 ? Math.round((totalEV / totalAC) * 100) / 100 : 1.0;

    const totalMilestones = scopedProjects.reduce((sum, p) => sum + (p.milestones || []).length, 0);
    const achievedMilestones = scopedProjects.reduce((sum, p) => sum + (p.milestones || []).filter(m => m.status === 'achieved').length, 0);

    const membersOnLeaveCount = teamMembersMetrics.filter(m => 
      teamLeaves.some(l => 
        (l.userId === m.stakeholder.id || l.userEmail.toLowerCase() === m.stakeholder.email.toLowerCase()) &&
        todayStr >= l.startDate && todayStr <= l.endDate
      )
    ).length;

    // All RAID items in scope
    const scopedRaid = scopedProjects.flatMap(p => (p.raidItems || []).map(r => ({ ...r, projectName: p.projectName || (p as any).name || p.projectCode || p.id })));
    const openRisks = scopedRaid.filter(r => r.type === 'risk' && r.status !== 'closed');
    const openIssues = scopedRaid.filter(r => r.type === 'issue' && r.status !== 'closed');
    const criticalBlockers = scopedRaid.filter(r => (r.severity === 'critical' || r.impact === 'critical') && r.status !== 'closed');

    return {
      totalMembers,
      activeContributors,
      totalAssignedTasks,
      totalCompletedTasks,
      totalInProgressTasks,
      totalBlockedTasks,
      totalReviewTasks,
      totalTodoTasks,
      taskCompletionRate: totalAssignedTasks > 0 ? Math.round((totalCompletedTasks / totalAssignedTasks) * 100) : 0,
      totalEstHours,
      totalActHours,
      totalEarnedHours,
      avgScore,
      avgUtilization,
      totalBudget,
      totalPV,
      totalEV,
      totalAC,
      totalEAC,
      teamSPI,
      teamCPI,
      totalMilestones,
      achievedMilestones,
      milestoneRate: totalMilestones > 0 ? Math.round((achievedMilestones / totalMilestones) * 100) : 100,
      membersOnLeaveCount,
      openRisks,
      openIssues,
      criticalBlockers,
      scopedRaid
    };
  }, [teamMembersMetrics, scopedProjects, teamLeaves, todayStr]);

  // Radar Data for Team / Selected Member
  const activeRadarMember = useMemo(() => {
    if (selectedRadarMemberId) {
      return teamMembersMetrics.find(m => m.stakeholder.id === selectedRadarMemberId) || teamMembersMetrics[0];
    }
    return teamMembersMetrics[0];
  }, [teamMembersMetrics, selectedRadarMemberId]);

  const teamRadarData = useMemo(() => {
    if (activeRadarMember) {
      return [
        { subject: 'Task Velocity', value: Math.min(100, activeRadarMember.taskCompletionPercent), fullMark: 100 },
        { subject: 'Efficiency %', value: Math.min(100, activeRadarMember.workEfficiencyPercent), fullMark: 100 },
        { subject: 'Schedule Index (SPI)', value: Math.min(100, Math.round(activeRadarMember.individualSPI * 100)), fullMark: 100 },
        { subject: 'Cost Efficiency (CPI)', value: Math.min(100, Math.round(activeRadarMember.individualCPI * 100)), fullMark: 100 },
        { subject: 'Capacity Utilization', value: Math.min(100, activeRadarMember.utilizationPercent), fullMark: 100 }
      ];
    }
    return [
      { subject: 'Task Velocity', value: teamAggregateMetrics.taskCompletionRate, fullMark: 100 },
      { subject: 'Schedule SPI', value: Math.min(100, Math.round(teamAggregateMetrics.teamSPI * 100)), fullMark: 100 },
      { subject: 'Cost CPI', value: Math.min(100, Math.round(teamAggregateMetrics.teamCPI * 100)), fullMark: 100 },
      { subject: 'Milestone Delivery', value: teamAggregateMetrics.milestoneRate, fullMark: 100 },
      { subject: 'Risk Mitigation', value: Math.max(0, 100 - (teamAggregateMetrics.criticalBlockers.length * 20)), fullMark: 100 }
    ];
  }, [activeRadarMember, teamAggregateMetrics]);

  // Chart 1: Team Member Workload Bar Data
  const workloadChartData = useMemo(() => {
    return teamMembersMetrics.map(m => ({
      name: m.stakeholder?.name ? m.stakeholder.name.split(' ')[0] : 'Member',
      fullName: m.stakeholder?.name || 'Member',
      allocatedHours: m.totalEstimatedHours,
      capacityHours: m.stakeholder?.weeklyCapacityHours || 40,
      utilization: m.utilizationPercent,
      score: m.reportCardScore
    }));
  }, [teamMembersMetrics]);

  // Chart 2: Hours Breakdown Data (Est vs Act vs EV)
  const hoursChartData = useMemo(() => {
    return teamMembersMetrics.map(m => ({
      name: m.stakeholder?.name ? m.stakeholder.name.split(' ')[0] : 'Member',
      fullName: m.stakeholder?.name || 'Member',
      Estimated: Math.round(m.totalEstimatedHours),
      Actual: Math.round(m.totalActualHours),
      Earned: Math.round(m.earnedHours)
    }));
  }, [teamMembersMetrics]);

  // Chart 3: Status Distribution Pie
  const taskStatusPieData = useMemo(() => {
    return [
      { name: 'Completed', value: teamAggregateMetrics.totalCompletedTasks, color: '#10b981' },
      { name: 'In Progress', value: teamAggregateMetrics.totalInProgressTasks, color: '#6366f1' },
      { name: 'Under Review', value: teamAggregateMetrics.totalReviewTasks, color: '#a855f7' },
      { name: 'Blocked', value: teamAggregateMetrics.totalBlockedTasks, color: '#f43f5e' },
      { name: 'To Do', value: teamAggregateMetrics.totalTodoTasks, color: '#64748b' }
    ].filter(d => d.value > 0);
  }, [teamAggregateMetrics]);

  // Chart 4: EVM Financials by Project
  const evmProjectChartData = useMemo(() => {
    return scopedProjects.map(p => {
      const pName = p.projectName || (p as any).name || p.projectCode || p.id || 'Project';
      return {
        name: pName.length > 15 ? pName.substring(0, 15) + '...' : pName,
        fullName: pName,
        PlannedValue: Math.round((p.evm?.plannedValue || 0) / 1000),
        EarnedValue: Math.round((p.evm?.earnedValue || 0) / 1000),
        ActualCost: Math.round((p.evm?.actualCost || 0) / 1000),
        EAC: Math.round((p.evm?.eac || 0) / 1000)
      };
    });
  }, [scopedProjects]);

  const handleExportCSV = () => {
    const headers = [
      'Member Name',
      'Role',
      'Department',
      'Email',
      'Assigned Tasks',
      'Completed Tasks',
      'Blocked Tasks',
      'Estimated Hours',
      'Actual Hours Logged',
      'Earned Hours',
      'Utilization %',
      'Efficiency %',
      'Performance Score',
      'Grade'
    ];

    const rows = teamMembersMetrics.map(m => [
      `"${m.stakeholder.name}"`,
      `"${m.stakeholder.role}"`,
      `"${m.stakeholder.department || 'Engineering'}"`,
      `"${m.stakeholder.email}"`,
      m.totalAssignedTasks,
      m.completedTasksCount,
      m.blockedTasksCount,
      m.totalEstimatedHours,
      m.totalActualHours,
      m.earnedHours,
      `${m.utilizationPercent}%`,
      `${m.workEfficiencyPercent}%`,
      m.reportCardScore,
      `"${m.reportCardGrade}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PM_Team_Performance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="pm-team-executive-dashboard" className="space-y-6 animate-in fade-in duration-200">
      
      {/* 🌟 1. Executive PM & Team Command Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <img
              src={activePMUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
              alt={activePMUser.name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-500/30 shadow-md shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                  {activePMUser.name} — Team Command Center
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
                  Project Manager Executive
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Team Health: {teamAggregateMetrics.avgScore}/100
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 truncate">
                Leading <span className="font-semibold text-slate-200">{managedProjects.length} Initiatives</span> • {teamAggregateMetrics.totalMembers} Assigned Team Members • {teamAggregateMetrics.totalAssignedTasks} Live Deliverables
              </p>
            </div>
          </div>

          {/* Quick Filter & Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Project Scope Filter (Visible exclusively to Admin role) */}
            {currentUser?.role === 'admin' && (
              <ResponsiveSelect
                value={selectedProjectId}
                onChange={setSelectedProjectId}
                icon={<Building2 className="w-3.5 h-3.5 text-indigo-400" />}
                label="Scope:"
                options={[
                  {
                    value: 'all',
                    label: `All Managed Projects (${managedProjects.length})`,
                    icon: <span className="text-sm">🌐</span>
                  },
                  ...managedProjects.map(p => ({
                    value: p.id,
                    label: `[${p.projectCode || 'PRJ'}] ${p.projectName || (p as any).name || p.id}`,
                    sublabel: p.description,
                    icon: <span className="text-sm">📁</span>
                  }))
                ]}
                align="auto"
                className="border-slate-800 text-white"
              />
            )}

            {/* Forecast Completion Dates Button */}
            <button
              onClick={() => {
                setForecastModalProjectId(scopedProjects[0]?.id || '');
                setIsForecastModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all shadow-sm"
              title="Predictive completion date forecast & EVM trend extrapolation"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Forecast Dates
            </button>

            {/* AI Briefing Button */}
            <button
              onClick={() => setIsAiBriefingModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/30 hover:to-indigo-600/30 text-purple-300 border border-purple-500/30 text-xs font-medium transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              AI Team Briefing
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* 📊 2. High-Impact KPI Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Total Team Size */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Team Capacity</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{teamAggregateMetrics.totalMembers}</span>
            <span className="text-xs text-slate-400">members</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">{teamAggregateMetrics.activeContributors} active</span> • {teamAggregateMetrics.membersOnLeaveCount} on leave
          </div>
        </div>

        {/* Metric 2: Delivery Velocity */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Task Velocity</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{teamAggregateMetrics.taskCompletionRate}%</span>
            <span className="text-xs text-slate-400">done</span>
          </div>
          <div className="text-[10px] text-slate-400">
            {teamAggregateMetrics.totalCompletedTasks}/{teamAggregateMetrics.totalAssignedTasks} tasks completed
          </div>
        </div>

        {/* Metric 3: Schedule Efficiency (SPI) */}
        <div className={`p-4 rounded-xl space-y-1 ${getEVMCardClass(teamAggregateMetrics.teamSPI, 0.9)}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Schedule SPI</span>
            {teamAggregateMetrics.teamSPI < 0.9 ? (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500 text-white uppercase animate-pulse">Alert &lt; 0.9</span>
            ) : (
              <TrendingUp className={`w-4 h-4 ${teamAggregateMetrics.teamSPI >= 1.0 ? 'text-emerald-400' : 'text-amber-400'}`} />
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black ${getEVMTextColorClass(teamAggregateMetrics.teamSPI, 0.9)}`}>
              {teamAggregateMetrics.teamSPI.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">target 1.0</span>
          </div>
          <div className="text-[10px] text-slate-400">
            {teamAggregateMetrics.teamSPI < 0.9
              ? '🚨 Critical Schedule Lag (<0.9)'
              : teamAggregateMetrics.teamSPI >= 1.0
              ? 'Ahead / On Schedule'
              : 'Schedule Attention Needed'}
          </div>
        </div>

        {/* Metric 4: Cost Efficiency (CPI) */}
        <div className={`p-4 rounded-xl space-y-1 ${getEVMCardClass(teamAggregateMetrics.teamCPI, 0.9)}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cost CPI</span>
            {teamAggregateMetrics.teamCPI < 0.9 ? (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500 text-white uppercase animate-pulse">Alert &lt; 0.9</span>
            ) : (
              <DollarSign className={`w-4 h-4 ${teamAggregateMetrics.teamCPI >= 1.0 ? 'text-emerald-400' : 'text-rose-400'}`} />
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black ${getEVMTextColorClass(teamAggregateMetrics.teamCPI, 0.9)}`}>
              {teamAggregateMetrics.teamCPI.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">target 1.0</span>
          </div>
          <div className="text-[10px] text-slate-400">
            {teamAggregateMetrics.teamCPI < 0.9
              ? '🚨 Critical Cost Overrun (<0.9)'
              : teamAggregateMetrics.teamCPI >= 1.0
              ? 'Within Budget Limits'
              : 'Cost Variance Detected'}
          </div>
        </div>

        {/* Metric 5: Team Effort Hours */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Effort Hours</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{Math.round(teamAggregateMetrics.totalActHours)}h</span>
            <span className="text-xs text-slate-400">logged</span>
          </div>
          <div className="text-[10px] text-slate-400">
            {Math.round(teamAggregateMetrics.totalEstHours)}h est • {Math.round(teamAggregateMetrics.totalEarnedHours)}h earned
          </div>
        </div>

        {/* Metric 6: Blockers & High Risks */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Blockers &amp; RAID</span>
            <ShieldAlert className={`w-4 h-4 ${teamAggregateMetrics.totalBlockedTasks > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black ${teamAggregateMetrics.totalBlockedTasks > 0 ? 'text-rose-400' : 'text-white'}`}>
              {teamAggregateMetrics.totalBlockedTasks}
            </span>
            <span className="text-xs text-slate-400">blocked</span>
          </div>
          <div className="text-[10px] text-slate-400">
            {teamAggregateMetrics.openRisks.length} open risks • {teamAggregateMetrics.openIssues.length} issues
          </div>
        </div>
      </div>

      {/* 🧭 3. Navigation Tabs for the PM */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-purple-400" />
          Team Visual Analytics
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'roster'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-400" />
          Team Members Roster ({filteredMembers.length})
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'projects'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4 text-teal-400" />
          Managed Projects ({managedProjects.length})
        </button>

        <button
          onClick={() => setActiveTab('raid')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'raid'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          Team Blockers &amp; RAID ({teamAggregateMetrics.totalBlockedTasks + teamAggregateMetrics.openRisks.length})
        </button>

        <button
          onClick={() => setActiveTab('leaves')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'leaves'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Plane className="w-4 h-4 text-emerald-400" />
          Availability &amp; Leave ({teamLeaves.length})
        </button>
      </div>

      {/* 📈 TAB 1: Team Visual Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Sub-Tabs for Analytics with Responsive Scrolling and Single-line Pills */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="w-full sm:w-auto overflow-x-auto no-scrollbar py-0.5">
              <div className="inline-flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/90 shadow-inner min-w-full sm:min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveAnalyticsView('workload')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    activeAnalyticsView === 'workload'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>Workload &amp; Capacity</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAnalyticsView('radar')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    activeAnalyticsView === 'radar'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Target className="w-3.5 h-3.5 shrink-0" />
                  <span>360° Team Radar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAnalyticsView('hours')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    activeAnalyticsView === 'hours'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Effort &amp; Hours Log</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAnalyticsView('status')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    activeAnalyticsView === 'status'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <PieChartIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Task Status Breakdown</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAnalyticsView('financials')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    activeAnalyticsView === 'financials'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                  <span>EVM Capital ($k)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAnalyticsView('forecast')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    activeAnalyticsView === 'forecast'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>Forecast Dates</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW 1: Workload & Capacity */}
          {activeAnalyticsView === 'workload' && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    Team Member Weekly Workload &amp; Capacity (Hours Assigned vs 40h Baseline)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Evaluates individual workload distribution across active sprints to prevent burnout or under-allocation.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Overallocated (&gt;100%)
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Optimal (70-100%)
                    </span>
                    <span className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Available (&lt;70%)
                    </span>
                  </div>
                  <button
                    onClick={() => onNavigate('workload')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-lg text-xs font-semibold transition-all"
                  >
                    <span>4-Week Heatmap & Rebalance</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadChartData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v}h`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(value: any, name: string) => [`${value} hrs`, name === 'allocatedHours' ? 'Allocated Effort' : 'Weekly Capacity']}
                      labelFormatter={(label) => {
                        const item = workloadChartData.find(d => d.name === label);
                        return item ? `${item.fullName} (Utilization: ${item.utilization}%)` : label;
                      }}
                    />
                    <ReferenceLine y={40} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: '40h Standard Cap', fill: '#f43f5e', fontSize: 10, position: 'top' }} />
                    <Bar dataKey="allocatedHours" radius={[6, 6, 0, 0]}>
                      {workloadChartData.map((entry, index) => {
                        let fill = '#6366f1';
                        if (entry.utilization > 100) fill = '#f43f5e';
                        else if (entry.utilization >= 70) fill = '#10b981';
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* VIEW 2: 360° Radar */}
          {activeAnalyticsView === 'radar' && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-400" />
                    360° Delivery &amp; Performance Competency Radar
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Multi-axis performance analysis across velocity, schedule index, cost index, and capacity utilization.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Inspect Member:</span>
                  <select
                    value={selectedRadarMemberId}
                    onChange={(e) => setSelectedRadarMemberId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    {teamMembersMetrics.map(m => (
                      <option key={m.stakeholder.id} value={m.stakeholder.id}>
                        {m.stakeholder.name} ({m.reportCardScore}/100)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="h-80 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={teamRadarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#cbd5e1' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={{ fontSize: 9 }} />
                    <Radar
                      name={activeRadarMember?.stakeholder.name || 'Team Benchmark'}
                      dataKey="value"
                      stroke="#818cf8"
                      fill="#6366f1"
                      fillOpacity={0.5}
                    />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* VIEW 3: Hours Log */}
          {activeAnalyticsView === 'hours' && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  Effort Comparison: Estimated vs Actual Logged vs Earned Hours Value
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tracks labor effort variance across team contributors to ensure accurate work estimation and velocity.
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hoursChartData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v}h`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Estimated" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Actual" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Earned" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* VIEW 4: Status Breakdown */}
          {activeAnalyticsView === 'status' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-rose-400" />
                  Live Team Deliverables Breakdown ({teamAggregateMetrics.totalAssignedTasks} Total Tasks)
                </h3>
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskStatusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {taskStatusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 flex flex-col justify-center">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status Proportions</h4>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="font-semibold text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Completed Tasks
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {teamAggregateMetrics.totalCompletedTasks} ({teamAggregateMetrics.taskCompletionRate}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <span className="font-semibold text-indigo-300 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-400" /> In Progress
                    </span>
                    <span className="font-mono font-bold text-indigo-400">{teamAggregateMetrics.totalInProgressTasks}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <span className="font-semibold text-purple-300 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-400" /> Under Review
                    </span>
                    <span className="font-mono font-bold text-purple-400">{teamAggregateMetrics.totalReviewTasks}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <span className="font-semibold text-rose-300 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400" /> Blocked Deliverables
                    </span>
                    <span className="font-mono font-bold text-rose-400">{teamAggregateMetrics.totalBlockedTasks}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 5: Financials */}
          {activeAnalyticsView === 'financials' && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  EVM Financial Capital ($k Planned Value vs Earned Value vs Actual Cost)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Total capital across projects: ${Math.round(teamAggregateMetrics.totalBudget / 1000)}k • EAC Projection: ${Math.round(teamAggregateMetrics.totalEAC / 1000)}k
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evmProjectChartData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(val: any) => [`$${Number(val).toLocaleString()}k`, 'Capital']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="PlannedValue" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="EarnedValue" fill="#818cf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ActualCost" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="EAC" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* VIEW 6: Project Completion Forecasts & SPI/CPI Trends */}
          {activeAnalyticsView === 'forecast' && (
            <div className="animate-in fade-in duration-200">
              <ProjectForecastSection
                projects={scopedProjects}
                userRole="pm"
                onOpenForecastModal={(pid) => {
                  setForecastModalProjectId(pid);
                  setIsForecastModalOpen(true);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* 👥 TAB 2: Team Members Command Roster */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search team members by name, role, email, skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              {/* Status Filter */}
              <select
                value={memberStatusFilter}
                onChange={(e) => setMemberStatusFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Members ({teamMembersMetrics.length})</option>
                <option value="active">Active Contributors</option>
                <option value="overallocated">Overallocated (&gt;100%)</option>
                <option value="on_leave">On Leave</option>
                <option value="blocked">Has Blocked Tasks</option>
              </select>

              {/* Sort Filter */}
              <select
                value={memberSortBy}
                onChange={(e) => setMemberSortBy(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
              >
                <option value="score">Sort: Performance Score</option>
                <option value="workload">Sort: Workload %</option>
                <option value="tasks">Sort: Task Count</option>
                <option value="hours">Sort: Hours Logged</option>
              </select>

              {/* View Toggle */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'cards' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Members Cards Grid */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map(member => {
                const isMemberOnLeave = teamLeaves.some(l => 
                  (l.userId === member.stakeholder.id || l.userEmail.toLowerCase() === member.stakeholder.email.toLowerCase()) &&
                  todayStr >= l.startDate && todayStr <= l.endDate
                );

                return (
                  <div
                    key={member.stakeholder.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition-all flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md"
                  >
                    {/* Header: Avatar, Name, Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={member.stakeholder.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                            alt={member.stakeholder.name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                            referrerPolicy="no-referrer"
                          />
                          {isMemberOnLeave && (
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 border-2 border-slate-900 flex items-center justify-center text-[9px] text-slate-950 font-bold" title="On Leave">
                              ✈️
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">{member.stakeholder.name}</h4>
                          <p className="text-xs text-slate-400 truncate">{member.stakeholder.role}</p>
                          <p className="text-[11px] text-slate-500 truncate">{member.stakeholder.email}</p>
                        </div>
                      </div>

                      {/* Performance Score Badge */}
                      <div className="flex flex-col items-end shrink-0">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                          {member.reportCardScore}/100
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">{member.reportCardGrade} Rating</span>
                      </div>
                    </div>

                    {/* Workload Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          Capacity Utilization
                        </span>
                        <span className={`font-mono font-bold ${member.utilizationPercent > 100 ? 'text-rose-400' : member.utilizationPercent >= 70 ? 'text-emerald-400' : 'text-indigo-400'}`}>
                          {member.utilizationPercent}% ({Math.round(member.totalEstimatedHours)}h / {member.stakeholder.weeklyCapacityHours || 40}h)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${member.utilizationPercent > 100 ? 'bg-rose-500' : member.utilizationPercent >= 70 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${Math.min(100, member.utilizationPercent)}%` }}
                        />
                      </div>
                    </div>

                    {/* Task & Hour Metrics */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Tasks</span>
                        <span className="text-xs font-bold text-white">{member.completedTasksCount}/{member.totalAssignedTasks}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Logged</span>
                        <span className="text-xs font-bold text-purple-400">{Math.round(member.totalActualHours)}h</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Efficiency</span>
                        <span className="text-xs font-bold text-emerald-400">{member.workEfficiencyPercent}%</span>
                      </div>
                    </div>

                    {/* Skills Tags */}
                    {(member.stakeholder.skills || []).length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {member.stakeholder.skills.slice(0, 3).map((sk, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-medium">
                            {sk}
                          </span>
                        ))}
                        {member.stakeholder.skills.length > 3 && (
                          <span className="text-[10px] text-slate-500">+{member.stakeholder.skills.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedMemberForDossier(member)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Inspect Dossier
                      </button>
                      <button
                        onClick={() => {
                          if (onOpenTaskModal) onOpenTaskModal();
                        }}
                        className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                        title="Assign new task"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Member</th>
                      <th className="py-3.5 px-4">Role &amp; Dept</th>
                      <th className="py-3.5 px-4">Utilization</th>
                      <th className="py-3.5 px-4">Tasks Done</th>
                      <th className="py-3.5 px-4">Hours Logged</th>
                      <th className="py-3.5 px-4">Score</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {filteredMembers.map(member => (
                      <tr key={member.stakeholder.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 flex items-center gap-3">
                          <img
                            src={member.stakeholder.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                            alt={member.stakeholder.name}
                            className="w-8 h-8 rounded-lg object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="font-semibold text-white block">{member.stakeholder.name}</span>
                            <span className="text-[11px] text-slate-400">{member.stakeholder.email}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-300 block">{member.stakeholder.role}</span>
                          <span className="text-[10px] text-slate-500">{member.stakeholder.department || 'Engineering'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-mono font-bold ${member.utilizationPercent > 100 ? 'text-rose-400' : member.utilizationPercent >= 70 ? 'text-emerald-400' : 'text-indigo-400'}`}>
                            {member.utilizationPercent}%
                          </span>
                          <span className="text-[10px] text-slate-500 block">{Math.round(member.totalEstimatedHours)}h / 40h</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold">{member.completedTasksCount}/{member.totalAssignedTasks}</span>
                          <span className="text-[10px] text-slate-500 block">{member.taskCompletionPercent}% rate</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-purple-400">{Math.round(member.totalActualHours)}h</span>
                          <span className="text-[10px] text-slate-500 block">{Math.round(member.earnedHours)}h EV</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                            {member.reportCardScore}/100 ({member.reportCardGrade})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedMemberForDossier(member)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-xs font-semibold transition-colors"
                          >
                            Dossier
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 📁 TAB 3: Managed Projects */}
      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {managedProjects.map(proj => {
            const projTasks = proj.tasks || [];
            const completedCount = projTasks.filter(t => t.status === 'done').length;
            const progress = projTasks.length > 0 ? Math.round((completedCount / projTasks.length) * 100) : 0;
            const spi = proj.evm?.spi || 1.0;
            const cpi = proj.evm?.cpi || 1.0;
            const pCode = proj.projectCode || (proj as any).code || 'PROJ';
            const pName = proj.projectName || (proj as any).name || pCode;
            const forecast = calculateProjectForecast(proj);

            return (
              <div
                key={proj.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition-all space-y-4 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider font-semibold">{pCode}</span>
                      <h4 className="text-base font-bold text-white mt-0.5">{pName}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{proj.description}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                      {progress}% Done
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }} />
                  </div>

                  {/* Forecast Completion Date Highlight */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-indigo-500/20 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-indigo-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        Forecast Finish
                      </span>
                      <p className="text-xs font-bold text-white font-mono truncate mt-0.5">
                        {formatFriendlyDate(forecast.forecastCompletionDate)}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono border shrink-0 ${
                        forecast.scheduleVarianceDays <= 0
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : forecast.scheduleVarianceDays <= 14
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {forecast.scheduleVarianceDays > 0
                        ? `+${forecast.scheduleVarianceDays}d Delay`
                        : forecast.scheduleVarianceDays < 0
                        ? `${Math.abs(forecast.scheduleVarianceDays)}d Ahead`
                        : 'On Baseline'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Budget</span>
                      <span className="font-bold text-white">${Math.round((proj.budget || 0) / 1000)}k</span>
                    </div>
                    <div className={`rounded-lg p-1 transition-all ${spi < 0.9 ? 'bg-rose-500/15 border border-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.25)]' : ''}`}>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                        SPI {spi < 0.9 && <span className="text-rose-400 font-bold text-[9px]">(&lt;0.9)</span>}
                      </span>
                      <span className={`font-bold font-mono ${getEVMTextColorClass(spi, 0.9)}`}>
                        {spi.toFixed(2)}
                      </span>
                    </div>
                    <div className={`rounded-lg p-1 transition-all ${cpi < 0.9 ? 'bg-rose-500/15 border border-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.25)]' : ''}`}>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                        CPI {cpi < 0.9 && <span className="text-rose-400 font-bold text-[9px]">(&lt;0.9)</span>}
                      </span>
                      <span className={`font-bold font-mono ${getEVMTextColorClass(cpi, 0.9)}`}>
                        {cpi.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setForecastModalProjectId(proj.id);
                      setIsForecastModalOpen(true);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors flex items-center gap-1"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Forecast Dossier
                  </button>

                  <button
                    onClick={async () => {
                      await switchProject(proj.id);
                      onNavigate('project_board');
                    }}
                    className="flex items-center gap-1 text-slate-300 hover:text-white font-semibold transition-colors"
                  >
                    Project Board <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ⚠️ TAB 4: Team RAID & Blockers */}
      {activeTab === 'raid' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Active Team Blockers, Critical Risks &amp; Delivery Hazards
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Issues requiring PM executive attention and resolution to maintain sprint momentum.
              </p>
            </div>
            <button
              onClick={() => onOpenRaidModal && onOpenRaidModal()}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Log RAID Item
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blocked Deliverables */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                Blocked Tasks ({teamAggregateMetrics.totalBlockedTasks})
              </h4>
              <div className="space-y-2">
                {scopedProjects.flatMap(p => (p.tasks || []).filter(t => t.status === 'blocked')).length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-slate-500">
                    🎉 No blocked tasks across your team!
                  </div>
                ) : (
                  scopedProjects.flatMap(p => (p.tasks || []).filter(t => t.status === 'blocked').map(t => ({ ...t, projectName: p.projectName || (p as any).name || p.projectCode || p.id }))).map(task => (
                    <div key={task.id} className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-300">{task.title}</span>
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-mono">Blocked</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{task.description || 'Deliverable is obstructed by dependencies.'}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span>Project: {task.projectName}</span>
                        <button
                          onClick={() => onOpenTaskModal && onOpenTaskModal(task)}
                          className="text-indigo-400 hover:underline font-semibold"
                        >
                          Resolve in Task View
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Critical Open Risks */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Open RAID Risks &amp; Issues ({teamAggregateMetrics.openRisks.length + teamAggregateMetrics.openIssues.length})
              </h4>
              <div className="space-y-2">
                {teamAggregateMetrics.scopedRaid.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-slate-500">
                    No active risks logged.
                  </div>
                ) : (
                  teamAggregateMetrics.scopedRaid.slice(0, 5).map(item => (
                    <div key={item.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{item.title}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${item.severity === 'critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {item.type.toUpperCase()} • {item.severity || 'Medium'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{item.description}</p>
                      <div className="text-[10px] text-slate-500 pt-1">Project: {item.projectName}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✈️ TAB 5: Availability & Leave */}
      {activeTab === 'leaves' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plane className="w-4 h-4 text-emerald-400" />
              Team Availability &amp; Scheduled Leave Registry
            </h3>
            <p className="text-xs text-slate-400">
              Overview of upcoming time-off across your managed project contributors to avoid scheduling roadblocks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamLeaves.length === 0 ? (
              <div className="col-span-full p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                No active or scheduled leaves recorded for your team.
              </div>
            ) : (
              teamLeaves.map(leave => {
                const isActive = todayStr >= leave.startDate && todayStr <= leave.endDate;

                return (
                  <div
                    key={leave.id}
                    className={`p-4 rounded-2xl border transition-all space-y-2 ${
                      isActive ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{leave.userName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {isActive ? 'Currently On Leave' : 'Upcoming'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{leave.reason || 'Approved Scheduled Leave'}</p>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                      <span>{leave.startDate} → {leave.endDate}</span>
                      <span className="font-bold text-indigo-400">{leave.daysCount} Days</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 📄 Modal: Detailed Team Member Dossier */}
      {selectedMemberForDossier && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedMemberForDossier.stakeholder.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                  alt={selectedMemberForDossier.stakeholder.name}
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-700"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="text-lg font-black text-white">{selectedMemberForDossier.stakeholder.name}</h3>
                  <p className="text-xs text-slate-400">{selectedMemberForDossier.stakeholder.role} • {selectedMemberForDossier.stakeholder.department || 'Engineering'}</p>
                  <span className="text-[11px] font-mono text-indigo-400">{selectedMemberForDossier.stakeholder.email}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedMemberForDossier(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score & Health Summary */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Performance Score</span>
                <span className="text-xl font-black text-emerald-400">{selectedMemberForDossier.reportCardScore}/100</span>
                <span className="text-[10px] text-slate-400 block font-bold">{selectedMemberForDossier.reportCardGrade} Rating</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Capacity Utilization</span>
                <span className={`text-xl font-black ${selectedMemberForDossier.utilizationPercent > 100 ? 'text-rose-400' : 'text-indigo-400'}`}>
                  {selectedMemberForDossier.utilizationPercent}%
                </span>
                <span className="text-[10px] text-slate-400 block">{Math.round(selectedMemberForDossier.totalEstimatedHours)}h / {selectedMemberForDossier.stakeholder.weeklyCapacityHours || 40}h</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Task Velocity</span>
                <span className="text-xl font-black text-purple-400">{selectedMemberForDossier.taskCompletionPercent}%</span>
                <span className="text-[10px] text-slate-400 block">{selectedMemberForDossier.completedTasksCount}/{selectedMemberForDossier.totalAssignedTasks} tasks</span>
              </div>
            </div>

            {/* Assigned Tasks List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Assigned Deliverables ({selectedMemberForDossier.assignedTasks.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedMemberForDossier.assignedTasks.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950 text-center text-xs text-slate-500">
                    No active tasks assigned to this contributor.
                  </div>
                ) : (
                  selectedMemberForDossier.assignedTasks.map(task => (
                    <div key={task.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between gap-3">
                      <div>
                        <span className="font-semibold text-white block">{task.title}</span>
                        <span className="text-[10px] text-slate-400">{task.estimatedHours || 0}h est • {task.actualHours || 0}h logged • {task.completionPercent || 0}% complete</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        task.status === 'done' ? 'bg-emerald-500/20 text-emerald-400' :
                        task.status === 'in_progress' ? 'bg-indigo-500/20 text-indigo-400' :
                        task.status === 'blocked' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedMemberForDossier(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🤖 Modal: AI Briefing Modal */}
      {isAiBriefingModalOpen && (
        <PMAiBriefingModal
          isOpen={isAiBriefingModalOpen}
          onClose={() => setIsAiBriefingModalOpen(false)}
          allProjects={managedProjects}
          pmList={[{
            pmId: activePMUser.id,
            name: activePMUser.name,
            email: activePMUser.email,
            avatar: activePMUser.avatar || '',
            title: activePMUser.title || 'Project Manager',
            department: activePMUser.department || 'Engineering',
            totalProjectsCount: managedProjects.length,
            totalBudgetManaged: teamAggregateMetrics.totalBudget,
            totalPlannedValue: teamAggregateMetrics.totalPV,
            totalEarnedValue: teamAggregateMetrics.totalEV,
            totalActualCost: teamAggregateMetrics.totalAC,
            totalEAC: teamAggregateMetrics.totalEAC,
            aggregateSPI: teamAggregateMetrics.teamSPI,
            aggregateCPI: teamAggregateMetrics.teamCPI,
            totalTasksManaged: teamAggregateMetrics.totalAssignedTasks,
            completedTasksManaged: teamAggregateMetrics.totalCompletedTasks,
            inProgressTasksManaged: teamAggregateMetrics.totalInProgressTasks,
            blockedTasksManaged: teamAggregateMetrics.totalBlockedTasks,
            overdueTasksManaged: 0,
            taskCompletionRate: teamAggregateMetrics.taskCompletionRate,
            totalEstimatedHours: teamAggregateMetrics.totalEstHours,
            totalActualHours: teamAggregateMetrics.totalActHours,
            totalEarnedHours: teamAggregateMetrics.totalEarnedHours,
            todoTasksManaged: teamAggregateMetrics.totalTodoTasks,
            reviewTasksManaged: teamAggregateMetrics.totalReviewTasks,
            totalMilestones: teamAggregateMetrics.totalMilestones,
            achievedMilestones: teamAggregateMetrics.achievedMilestones,
            delayedMilestones: 0,
            milestoneSuccessRate: teamAggregateMetrics.milestoneRate,
            totalRisks: teamAggregateMetrics.openRisks.length,
            criticalRisks: teamAggregateMetrics.criticalBlockers.length,
            openIssues: teamAggregateMetrics.openIssues.length,
            pendingChangeRequests: 0,
            compositeHealthScore: teamAggregateMetrics.avgScore,
            overallStatus: teamAggregateMetrics.avgScore >= 80 ? 'on_track' : 'at_risk',
            isOnLeave: false,
            managedProjects: managedProjects.map(p => ({
              projectId: p.id,
              projectName: p.projectName || (p as any).name || p.projectCode || 'Project',
              projectCode: p.projectCode || (p as any).code || 'PROJ',
              budget: p.budget || 0,
              evm: (p as any).evm || { plannedValue: 0, earnedValue: 0, actualCost: 0, spi: 1, cpi: 1, eac: 0, etc: 0, vac: 0, tcpi: 1 },
              status: (p as any).status || 'active',
              health: 'on_track',
              completionPercent: 50,
              totalTasks: (p.tasks || []).length,
              completedTasks: (p.tasks || []).filter(t => t.status === 'done').length,
              inProgressTasks: (p.tasks || []).filter(t => t.status === 'in_progress').length,
              blockedTasks: (p.tasks || []).filter(t => t.status === 'blocked').length,
              overdueTasks: 0,
              openRisksCount: 0,
              criticalRisksCount: 0,
              openIssuesCount: 0,
              pendingCRsCount: 0,
              milestonesTotal: (p.milestones || []).length,
              milestonesAchieved: (p.milestones || []).filter(m => m.status === 'achieved').length,
              milestonesDelayed: 0,
              teamSize: (p.stakeholders || []).length
            }))
          }]}
        />
      )}

      {/* 🔮 Predictive Completion Date & SPI/CPI Trend Forecast Modal */}
      {isForecastModalOpen && (
        <ProjectForecastModal
          isOpen={isForecastModalOpen}
          onClose={() => setIsForecastModalOpen(false)}
          projects={scopedProjects}
          initialProjectId={forecastModalProjectId || scopedProjects[0]?.id}
        />
      )}
    </div>
  );
};
