import React, { useState, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  calculateCrossProjectPMPerformance,
  CrossProjectPMPerformance
} from '../../utils/portfolioAndLeaveUtils';
import { PMExecutiveDossierModal } from './PMExecutiveDossierModal';
import { PMAssignProjectModal } from './PMAssignProjectModal';
import { PMAiBriefingModal } from './PMAiBriefingModal';
import { PMTeamExecutiveDashboard } from './PMTeamExecutiveDashboard';
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
  Zap
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

interface DashboardViewProps {
  onNavigate: (view: any) => void;
  onOpenAiReportModal?: () => void;
  onOpenTaskModal?: () => void;
  onOpenRaidModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenAiReportModal,
  onOpenTaskModal,
  onOpenRaidModal
}) => {
  const {
    allProjectsMap,
    projectsList,
    allUsers,
    leaves,
    currentUser,
    switchProject,
    assignProjectManager
  } = useProject();

  // Convert allProjectsMap to array of ProjectData
  const allProjects = useMemo(() => {
    return Object.values(allProjectsMap || {});
  }, [allProjectsMap]);

  // Calculate all PMs performance across projects
  const pmsList = useMemo(() => {
    return calculateCrossProjectPMPerformance(allProjects, allUsers, leaves || []);
  }, [allProjects, allUsers, leaves]);

  // UI States & Filters
  const [adminSelectedPMTeamId, setAdminSelectedPMTeamId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_track' | 'at_risk' | 'critical' | 'on_leave'>('all');
  const [sortBy, setSortBy] = useState<'health' | 'budget' | 'projects' | 'spi' | 'cpi'>('health');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'efficiency' | 'radar' | 'hours' | 'evm' | 'distribution' | 'workload'>('efficiency');
  const [selectedRadarPMId, setSelectedRadarPMId] = useState<string>('');

  // Modals
  const [selectedPMForDossier, setSelectedPMForDossier] = useState<CrossProjectPMPerformance | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [preselectedPMId, setPreselectedPMId] = useState<string | undefined>(undefined);
  const [isAiBriefingModalOpen, setIsAiBriefingModalOpen] = useState(false);

  // Default radar PM
  const activeRadarPM = useMemo(() => {
    if (selectedRadarPMId) {
      return pmsList.find(p => p.pmId === selectedRadarPMId) || pmsList[0];
    }
    return pmsList[0];
  }, [pmsList, selectedRadarPMId]);

  // Filtered & Sorted PMs
  const filteredPMs = useMemo(() => {
    return pmsList
      .filter(pm => {
        const matchesSearch =
          pm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pm.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pm.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pm.managedProjects.some(p =>
            p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.projectCode.toLowerCase().includes(searchQuery.toLowerCase())
          );

        if (!matchesSearch) return false;

        if (statusFilter === 'on_track') return pm.overallStatus === 'on_track';
        if (statusFilter === 'at_risk') return pm.overallStatus === 'at_risk';
        if (statusFilter === 'critical') return pm.overallStatus === 'critical';
        if (statusFilter === 'on_leave') return pm.isOnLeave;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'health') return b.compositeHealthScore - a.compositeHealthScore;
        if (sortBy === 'budget') return b.totalBudgetManaged - a.totalBudgetManaged;
        if (sortBy === 'projects') return b.totalProjectsCount - a.totalProjectsCount;
        if (sortBy === 'spi') return b.aggregateSPI - a.aggregateSPI;
        if (sortBy === 'cpi') return b.aggregateCPI - a.aggregateCPI;
        return 0;
      });
  }, [pmsList, searchQuery, statusFilter, sortBy]);

  // Executive High-Level KPI Aggregates
  const totalPMsCount = pmsList.length;
  const totalPortfolioCapital = pmsList.reduce((sum, p) => sum + p.totalBudgetManaged, 0);
  const avgPortfolioSPI = totalPMsCount > 0
    ? (pmsList.reduce((sum, p) => sum + p.aggregateSPI, 0) / totalPMsCount).toFixed(2)
    : '1.00';
  const avgPortfolioCPI = totalPMsCount > 0
    ? (pmsList.reduce((sum, p) => sum + p.aggregateCPI, 0) / totalPMsCount).toFixed(2)
    : '1.00';
  const totalMilestonesDelivered = pmsList.reduce((sum, p) => sum + p.achievedMilestones, 0);
  const totalMilestonesCount = pmsList.reduce((sum, p) => sum + p.totalMilestones, 0);
  const milestoneTrackRecord = totalMilestonesCount > 0
    ? Math.round((totalMilestonesDelivered / totalMilestonesCount) * 100)
    : 100;
  const criticalPMsCount = pmsList.filter(p => p.overallStatus === 'critical' || p.criticalRisks > 0).length;
  const onLeavePMsCount = pmsList.filter(p => p.isOnLeave).length;

  // Chart Data Calculations
  // 1. Efficiency Chart (SPI vs CPI)
  const pmEfficiencyData = useMemo(() => {
    return pmsList.map(pm => ({
      name: pm.name.split(' ')[0],
      fullName: pm.name,
      SPI: pm.aggregateSPI,
      CPI: pm.aggregateCPI,
      budgetK: Math.round(pm.totalBudgetManaged / 1000),
      health: pm.compositeHealthScore
    }));
  }, [pmsList]);

  // 2. 360° Radar Profile Data
  const radarChartData = useMemo(() => {
    if (!activeRadarPM) return [];
    return [
      { subject: 'Schedule Index (SPI)', value: Math.min(100, Math.round(activeRadarPM.aggregateSPI * 100)), fullMark: 100 },
      { subject: 'Cost Efficiency (CPI)', value: Math.min(100, Math.round(activeRadarPM.aggregateCPI * 100)), fullMark: 100 },
      { subject: 'Task Velocity %', value: activeRadarPM.taskCompletionRate, fullMark: 100 },
      { subject: 'Milestone Delivery %', value: activeRadarPM.milestoneSuccessRate, fullMark: 100 },
      { subject: 'Risk Control Score', value: Math.max(0, 100 - (activeRadarPM.criticalRisks * 25 + activeRadarPM.openIssues * 5)), fullMark: 100 }
    ];
  }, [activeRadarPM]);

  // 3. Task Hours Breakdown Data (Estimated vs Actual vs Earned)
  const pmHoursChartData = useMemo(() => {
    return pmsList.map(pm => ({
      name: pm.name.split(' ')[0],
      fullName: pm.name,
      Estimated: pm.totalEstimatedHours,
      Actual: pm.totalActualHours,
      Earned: pm.totalEarnedHours,
      Efficiency: pm.totalActualHours > 0 ? Math.round((pm.totalEarnedHours / pm.totalActualHours) * 100) : 100
    }));
  }, [pmsList]);

  // 4. EVM Financials Comparison Data ($k PV vs EV vs AC)
  const pmEvmChartData = useMemo(() => {
    return pmsList.map(pm => ({
      name: pm.name.split(' ')[0],
      fullName: pm.name,
      PlannedValue: Math.round(pm.totalPlannedValue / 1000),
      EarnedValue: Math.round(pm.totalEarnedValue / 1000),
      ActualCost: Math.round(pm.totalActualCost / 1000),
      EAC: Math.round(pm.totalEAC / 1000)
    }));
  }, [pmsList]);

  // 5. Global Task Status Distribution Pie Data
  const globalStatusPieData = useMemo(() => {
    const completed = pmsList.reduce((sum, p) => sum + p.completedTasksManaged, 0);
    const inProgress = pmsList.reduce((sum, p) => sum + p.inProgressTasksManaged, 0);
    const review = pmsList.reduce((sum, p) => sum + p.reviewTasksManaged, 0);
    const blocked = pmsList.reduce((sum, p) => sum + p.blockedTasksManaged, 0);
    const todo = pmsList.reduce((sum, p) => sum + p.todoTasksManaged, 0);

    return [
      { name: 'Completed', value: completed, color: '#10b981' },
      { name: 'In Progress', value: inProgress, color: '#6366f1' },
      { name: 'Under Review', value: review, color: '#a855f7' },
      { name: 'Blocked', value: blocked, color: '#f43f5e' },
      { name: 'To Do', value: todo, color: '#64748b' }
    ].filter(d => d.value > 0);
  }, [pmsList]);

  // 6. Workload & Capital Distribution Data
  const pmWorkloadBarData = useMemo(() => {
    return pmsList.map(pm => ({
      name: pm.name.split(' ')[0],
      fullName: pm.name,
      budgetK: Math.round(pm.totalBudgetManaged / 1000),
      teamSize: pm.totalTeamMembersCount,
      projects: pm.totalProjectsCount,
      tasks: pm.totalTasksManaged
    }));
  }, [pmsList]);

  const handleInspectProject = async (projectId: string) => {
    await switchProject(projectId);
    onNavigate(currentUser?.role === 'admin' ? 'project_board' : 'wbs');
  };

  const handleOpenAssignModal = (pmId?: string) => {
    setPreselectedPMId(pmId);
    setIsAssignModalOpen(true);
  };

  const handleExportCSV = () => {
    const headers = [
      'PM Name',
      'Title',
      'Department',
      'Projects Led',
      'Total Budget ($)',
      'Composite SPI',
      'Composite CPI',
      'Health Score (100)',
      'Overall Status',
      'Estimated Hours',
      'Actual Hours Logged',
      'Earned Hours',
      'Tasks Done',
      'Total Tasks',
      'Completion Rate (%)',
      'Milestones Achieved',
      'Critical Risks',
      'Leave Status'
    ];

    const rows = pmsList.map(pm => [
      `"${pm.name}"`,
      `"${pm.title}"`,
      `"${pm.department}"`,
      pm.totalProjectsCount,
      pm.totalBudgetManaged,
      pm.aggregateSPI.toFixed(2),
      pm.aggregateCPI.toFixed(2),
      pm.compositeHealthScore,
      `"${pm.overallStatus}"`,
      pm.totalEstimatedHours,
      pm.totalActualHours,
      pm.totalEarnedHours,
      pm.completedTasksManaged,
      pm.totalTasksManaged,
      `${pm.taskCompletionRate}%`,
      `${pm.achievedMilestones}/${pm.totalMilestones}`,
      pm.criticalRisks,
      pm.isOnLeave ? '"On Leave"' : '"Active"'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Executive_PM_Performance_Matrix_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: 'on_track' | 'at_risk' | 'critical', score: number) => {
    if (status === 'on_track') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Optimal ({score}/100)
        </span>
      );
    }
    if (status === 'at_risk') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3.5 h-3.5" />
          At Risk ({score}/100)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
        <ShieldAlert className="w-3.5 h-3.5" />
        Critical ({score}/100)
      </span>
    );
  };

  // If logged in as PM, render their dedicated Executive Team Command Center
  if (currentUser?.role === 'pm') {
    return (
      <PMTeamExecutiveDashboard
        onNavigate={onNavigate}
        onOpenAiReportModal={onOpenAiReportModal}
        onOpenTaskModal={onOpenTaskModal}
        onOpenRaidModal={onOpenRaidModal}
      />
    );
  }

  // If Admin has selected a specific PM's team command center to inspect
  if (adminSelectedPMTeamId) {
    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <button
            onClick={() => setAdminSelectedPMTeamId(null)}
            className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            ← Back to Executive PM Leadership Matrix
          </button>
          <span className="text-xs text-slate-400 font-mono">Admin Delegation View</span>
        </div>
        <PMTeamExecutiveDashboard
          targetPmId={adminSelectedPMTeamId}
          onNavigate={onNavigate}
          onOpenAiReportModal={onOpenAiReportModal}
          onOpenTaskModal={onOpenTaskModal}
          onOpenRaidModal={onOpenRaidModal}
        />
      </div>
    );
  }

  return (
    <div id="executive-pm-dashboard" className="space-y-6 animate-in fade-in duration-200">
      
      {/* 🌟 1. Executive PM Command Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                  Executive PM Leadership Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Cross-Project PM Performance, Portfolio Accountability &amp; Multi-Graph Delivery Governance
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => setIsAiBriefingModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center gap-2 shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              AI PM Briefing
            </button>

            <button
              onClick={() => handleOpenAssignModal()}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Assign Project
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 transition-colors"
              title="Export Cross-PM Matrix to CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Export CSV
            </button>
          </div>
        </div>

        {/* 🌟 2. Top Executive KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          
          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active PMs</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{totalPMsCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across {allProjects.length} projects</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">PM Capital</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              ${(totalPortfolioCapital / 1000).toFixed(0)}k
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Total managed budget</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Schedule SPI</span>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <div className={`text-2xl font-black mt-1 ${parseFloat(avgPortfolioSPI) >= 1.0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {avgPortfolioSPI}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Baseline: 1.00</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Cost CPI</span>
              <BarChart3 className="w-4 h-4 text-teal-400" />
            </div>
            <div className={`text-2xl font-black mt-1 ${parseFloat(avgPortfolioCPI) >= 1.0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {avgPortfolioCPI}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Budget efficiency</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Milestones On Time</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">{milestoneTrackRecord}%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">({totalMilestonesDelivered}/{totalMilestonesCount} done)</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Escalations</span>
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-black mt-1 ${criticalPMsCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {criticalPMsCount} PMs
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{onLeavePMsCount > 0 ? `${onLeavePMsCount} on leave` : 'All PMs available'}</div>
          </div>

        </div>
      </div>

      {/* 🌟 3. Executive PM Multi-Graph Visual Analytics Suite */}
      <div id="executive-analytics-suite" className="bg-slate-900 border border-slate-800 p-4 sm:p-5 md:p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Executive PM Multi-Graph Analytics Suite</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Portfolio cross-analysis: 360° Competency Radar, Hours Logged vs Earned, EVM Capital ($), and Status Distribution
            </p>
          </div>

          {/* Mobile Select Dropdown for screens < md */}
          <div className="block md:hidden w-full">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
              Select Analytics Graph:
            </label>
            <div className="relative">
              <select
                value={activeAnalyticsTab}
                onChange={(e) => setActiveAnalyticsTab(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 appearance-none pr-9 shadow-inner"
              >
                <option value="efficiency">📈 Schedule vs Cost Index (SPI / CPI)</option>
                <option value="radar">🎯 360° PM Competency Radar</option>
                <option value="hours">⏱️ Effort &amp; Hours (Est vs Act vs EV)</option>
                <option value="evm">💲 EVM Financials ($ Valuation)</option>
                <option value="distribution">📊 Task Status Distribution</option>
                <option value="workload">👥 Workload &amp; Capital Allocation</option>
              </select>
              <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
            </div>
          </div>

          {/* Smart Desktop & Tablet Pill Tabs for screens >= md */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 flex-wrap shrink-0">
            <button
              onClick={() => setActiveAnalyticsTab('efficiency')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeAnalyticsTab === 'efficiency'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>SPI vs CPI</span>
            </button>

            <button
              onClick={() => setActiveAnalyticsTab('radar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeAnalyticsTab === 'radar'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-purple-400" />
              <span>360° PM Radar</span>
            </button>

            <button
              onClick={() => setActiveAnalyticsTab('hours')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeAnalyticsTab === 'hours'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Effort &amp; Hours</span>
            </button>

            <button
              onClick={() => setActiveAnalyticsTab('evm')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeAnalyticsTab === 'evm'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>EVM Financials</span>
            </button>

            <button
              onClick={() => setActiveAnalyticsTab('distribution')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeAnalyticsTab === 'distribution'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5 text-rose-400" />
              <span>Task Distribution</span>
            </button>

            <button
              onClick={() => setActiveAnalyticsTab('workload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeAnalyticsTab === 'workload'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Workload &amp; Team</span>
            </button>
          </div>
        </div>

        {/* Dynamic Chart Display Container with Smooth Responsive Heights */}
        <div className="mt-3">
          
          {/* TAB 1: Efficiency Chart (SPI vs CPI) */}
          {activeAnalyticsTab === 'efficiency' && (
            <div className="space-y-2.5 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-400 px-1">
                <span>Schedule Performance Index (SPI) vs Cost Performance Index (CPI) per PM</span>
                <span className="text-amber-400 font-mono text-[11px]">Baseline Benchmark: 1.00</span>
              </div>
              <div className="h-72 sm:h-80 md:h-96 w-full bg-slate-950/40 rounded-xl p-3 border border-slate-800/80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pmEfficiencyData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="fullName" stroke="#94a3b8" fontSize={11} interval={0} tick={{ fill: '#cbd5e1' }} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={[0.6, 1.4]} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1 z-50">
                              <p className="font-bold text-white text-sm">{data.fullName}</p>
                              <p className="text-emerald-400">Schedule Index (SPI): <strong>{data.SPI.toFixed(2)}</strong></p>
                              <p className="text-indigo-400">Cost Index (CPI): <strong>{data.CPI.toFixed(2)}</strong></p>
                              <p className="text-slate-300">Managed Capital: <strong>${data.budgetK}k</strong></p>
                              <p className="text-amber-400">Composite Health: <strong>{data.health}/100</strong></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <ReferenceLine y={1.0} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Target 1.0', fill: '#f59e0b', fontSize: 10, position: 'right' }} />
                    <Bar dataKey="SPI" fill="#10b981" radius={[4, 4, 0, 0]} name="Schedule Index (SPI)" />
                    <Bar dataKey="CPI" fill="#6366f1" radius={[4, 4, 0, 0]} name="Cost Index (CPI)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB 2: 360° PM Leadership Competency Radar */}
          {activeAnalyticsTab === 'radar' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="text-slate-400">
                  Multidimensional competency profile: SPI, CPI, Task Velocity, Milestone Delivery, &amp; Risk Control
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-slate-400 font-medium">Select PM:</span>
                  <select
                    value={selectedRadarPMId || pmsList[0]?.pmId}
                    onChange={(e) => setSelectedRadarPMId(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    {pmsList.map(pm => (
                      <option key={pm.pmId} value={pm.pmId}>
                        {pm.name} ({pm.compositeHealthScore}/100 Score)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-slate-950/40 rounded-xl p-3 sm:p-4 border border-slate-800/80 items-stretch">
                <div className="lg:col-span-2 h-72 sm:h-80 md:h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarChartData}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#cbd5e1' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={{ fontSize: 8 }} />
                      <Radar
                        name={activeRadarPM?.name || 'Project Manager'}
                        dataKey="value"
                        stroke="#818cf8"
                        fill="#6366f1"
                        fillOpacity={0.5}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px', zIndex: 50 }}
                        formatter={(value: any) => [`${value}% / Score`, 'Rating']}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Radar Breakdown Insights */}
                {activeRadarPM && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
                        <img
                          src={activeRadarPM.avatar}
                          alt={activeRadarPM.name}
                          className="w-9 h-9 rounded-xl object-cover border border-indigo-500/40 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-sm truncate">{activeRadarPM.name}</h4>
                          <span className="text-[11px] text-slate-400 block truncate">{activeRadarPM.title}</span>
                        </div>
                      </div>

                      <div className="space-y-2 mt-3">
                        <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                          <span className="text-slate-400">Health Rating:</span>
                          <span className="font-bold text-emerald-400">{activeRadarPM.compositeHealthScore}/100</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                          <span className="text-slate-400">Schedule SPI:</span>
                          <span className="font-mono font-bold text-slate-200">{activeRadarPM.aggregateSPI.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                          <span className="text-slate-400">Cost CPI:</span>
                          <span className="font-mono font-bold text-slate-200">{activeRadarPM.aggregateCPI.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                          <span className="text-slate-400">Task Velocity:</span>
                          <span className="font-bold text-indigo-400">{activeRadarPM.taskCompletionRate}%</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-400">Milestones Done:</span>
                          <span className="font-bold text-amber-400">{activeRadarPM.milestoneSuccessRate}%</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedPMForDossier(activeRadarPM)}
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-center transition-colors shadow-sm mt-3"
                    >
                      Open Full PM Dossier
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Task Hours Breakdown (Estimated vs Logged vs Earned Hours) */}
          {activeAnalyticsTab === 'hours' && (
            <div className="space-y-2.5 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-400 px-1">
                <span>Planned Estimated Effort vs Actual Logged Hours vs Earned Hours across PM portfolios</span>
                <span className="text-indigo-400 font-mono text-[11px]">Work Tracking Breakdown</span>
              </div>
              <div className="h-72 sm:h-80 md:h-96 w-full bg-slate-950/40 rounded-xl p-3 border border-slate-800/80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pmHoursChartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="fullName" stroke="#94a3b8" fontSize={11} interval={0} tick={{ fill: '#cbd5e1' }} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => `${v}h`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px', zIndex: 50 }}
                      formatter={(value: any, name: any) => [`${value} hours`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="Estimated" fill="#6366f1" radius={[4, 4, 0, 0]} name="Planned / Estimated Hours" />
                    <Bar dataKey="Actual" fill="#a855f7" radius={[4, 4, 0, 0]} name="Actual Logged Hours" />
                    <Bar dataKey="Earned" fill="#10b981" radius={[4, 4, 0, 0]} name="Earned Hours (EV)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB 4: EVM Financials Breakdown ($ PV vs EV vs AC) */}
          {activeAnalyticsTab === 'evm' && (
            <div className="space-y-2.5 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-400 px-1">
                <span>Portfolio Financial Valuation: Planned Value (PV) vs Earned Value (EV) vs Actual Cost (AC) in $k</span>
                <span className="text-emerald-400 font-mono text-[11px]">EVM Commercial Index</span>
              </div>
              <div className="h-72 sm:h-80 md:h-96 w-full bg-slate-950/40 rounded-xl p-3 border border-slate-800/80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pmEvmChartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="fullName" stroke="#94a3b8" fontSize={11} interval={0} tick={{ fill: '#cbd5e1' }} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => `$${v}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px', zIndex: 50 }}
                      formatter={(value: any, name: any) => [`$${value}k`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="PlannedValue" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Planned Value ($k)" />
                    <Bar dataKey="EarnedValue" fill="#818cf8" radius={[4, 4, 0, 0]} name="Earned Value ($k)" />
                    <Bar dataKey="ActualCost" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Actual Cost ($k)" />
                    <Bar dataKey="EAC" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Estimate At Completion ($k)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB 5: Task Status Distribution (Pie & Breakdown) */}
          {activeAnalyticsTab === 'distribution' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-slate-950/40 rounded-xl p-4 border border-slate-800/80 items-center animate-in fade-in duration-200">
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={globalStatusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {globalStatusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px', zIndex: 50 }}
                      formatter={(value: any, name: any) => [`${value} tasks`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3 p-2 sm:p-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Portfolio-Wide Execution Status Distribution
                </h4>
                <div className="space-y-2 text-xs">
                  {globalStatusPieData.map(item => (
                    <div key={item.name} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-200 font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold text-white font-mono">{item.value} tasks</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Capital & Workload Allocation */}
          {activeAnalyticsTab === 'workload' && (
            <div className="space-y-2.5 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-400 px-1">
                <span>Managed Capital, Total Tasks, and Team Size per Project Manager</span>
                <span className="text-blue-400 font-mono text-[11px]">Resource &amp; Capital Density</span>
              </div>
              <div className="h-72 sm:h-80 md:h-96 w-full bg-slate-950/40 rounded-xl p-3 border border-slate-800/80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pmWorkloadBarData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="fullName" stroke="#94a3b8" fontSize={11} interval={0} tick={{ fill: '#cbd5e1' }} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px', zIndex: 50 }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="budgetK" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Budget Managed ($k)" />
                    <Bar dataKey="tasks" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Total Tasks Managed" />
                    <Bar dataKey="teamSize" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Team Size" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 🌟 4. PM Directory & Search Controls */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PMs by name, email, department, or project code..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Filters & View Modes */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Statuses ({pmsList.length})</option>
              <option value="on_track">🟢 Optimal / On Track</option>
              <option value="at_risk">🟡 At Risk</option>
              <option value="critical">🔴 Critical Escalations</option>
              <option value="on_leave">🏖️ Currently On Leave</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="health">Sort: Highest Health Score</option>
              <option value="budget">Sort: Largest Portfolio Budget</option>
              <option value="projects">Sort: Most Projects Led</option>
              <option value="spi">Sort: Schedule Index (SPI)</option>
              <option value="cpi">Sort: Cost Efficiency (CPI)</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'cards' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 🌟 5. PM Leadership Cards Grid View */}
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredPMs.map(pm => (
              <div
                key={pm.pmId}
                className={`bg-slate-900 border rounded-2xl p-5 sm:p-6 transition-all shadow-sm flex flex-col justify-between space-y-5 ${
                  pm.overallStatus === 'critical'
                    ? 'border-rose-500/40 bg-gradient-to-b from-rose-950/10 to-slate-900'
                    : pm.overallStatus === 'at_risk'
                    ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/10 to-slate-900'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* PM Profile Header */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={pm.avatar}
                          alt={pm.name}
                          className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-sm"
                        />
                        {pm.isOnLeave && (
                          <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-slate-950 border border-slate-900">
                            LEAVE
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-bold text-white truncate">
                            {pm.name}
                          </h3>
                          {getStatusBadge(pm.overallStatus, pm.compositeHealthScore)}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {pm.title} • <span className="text-slate-300">{pm.department}</span>
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {pm.skills.slice(0, 3).map(skill => (
                            <span key={skill} className="px-2 py-0.5 rounded text-[10px] bg-slate-950 text-slate-300 border border-slate-800">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedPMForDossier(pm)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      Dossier
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* High-Level Scorecard Strips */}
                  <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Capital</span>
                      <span className="text-sm font-black text-slate-100 mt-0.5 block">
                        ${(pm.totalBudgetManaged / 1000).toFixed(0)}k
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">SPI / CPI</span>
                      <span className="text-sm font-black font-mono mt-0.5 block">
                        <span className={pm.aggregateSPI >= 1.0 ? 'text-emerald-400' : 'text-amber-400'}>{pm.aggregateSPI.toFixed(2)}</span>
                        <span className="text-slate-600 mx-0.5">/</span>
                        <span className={pm.aggregateCPI >= 1.0 ? 'text-emerald-400' : 'text-amber-400'}>{pm.aggregateCPI.toFixed(2)}</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Tasks Done</span>
                      <span className="text-sm font-black text-indigo-400 mt-0.5 block">
                        {pm.taskCompletionRate}%
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Risks</span>
                      <span className={`text-sm font-black mt-0.5 block ${pm.criticalRisks === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {pm.criticalRisks} crit.
                      </span>
                    </div>
                  </div>

                  {/* Projects Portfolio Managed by this PM */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                      <span className="uppercase tracking-wider">Projects Under Leadership ({pm.managedProjects.length})</span>
                      <button
                        onClick={() => handleOpenAssignModal(pm.pmId)}
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px] font-medium"
                      >
                        <Plus className="w-3 h-3" />
                        Assign Project
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {pm.managedProjects.map(proj => (
                        <div
                          key={proj.projectId}
                          className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                              {proj.projectCode}
                            </span>
                            <span className="font-semibold text-slate-200 truncate">{proj.projectName}</span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-slate-400 font-mono hidden sm:inline">
                              SPI: <strong className={proj.spi >= 1.0 ? 'text-emerald-400' : 'text-amber-400'}>{proj.spi.toFixed(2)}</strong>
                            </span>
                            <span className="text-slate-400 hidden sm:inline">${(proj.budget / 1000).toFixed(0)}k</span>
                            
                            <button
                              onClick={() => handleInspectProject(proj.projectId)}
                              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                              title="Inspect Project Workspace"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Team: <strong className="text-slate-200">{pm.totalTeamMembersCount} members</strong> across {pm.totalProjectsCount} projects
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAdminSelectedPMTeamId(pm.pmId)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors"
                      title="Inspect PM Team Command Center"
                    >
                      Team Command
                    </button>
                    <button
                      onClick={() => setSelectedPMForDossier(pm)}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                    >
                      Dossier
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* 🌟 6. PM Leadership Matrix Table View */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="p-3.5 pl-5">Project Manager</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Health Grade</th>
                    <th className="p-3.5">Projects Led</th>
                    <th className="p-3.5">Capital ($k)</th>
                    <th className="p-3.5">Hours (Act / Est)</th>
                    <th className="p-3.5">SPI</th>
                    <th className="p-3.5">CPI</th>
                    <th className="p-3.5">Task Velocity</th>
                    <th className="p-3.5">Critical Risks</th>
                    <th className="p-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredPMs.map(pm => (
                    <tr key={pm.pmId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-3">
                          <img
                            src={pm.avatar}
                            alt={pm.name}
                            className="w-8 h-8 rounded-xl object-cover border border-slate-700 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-white block">{pm.name}</span>
                            <span className="text-[11px] text-slate-400">{pm.title}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-slate-950 text-slate-300 border border-slate-800">
                          {pm.department}
                        </span>
                      </td>

                      <td className="p-3.5">
                        {getStatusBadge(pm.overallStatus, pm.compositeHealthScore)}
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-slate-100">{pm.totalProjectsCount} projects</span>
                      </td>

                      <td className="p-3.5 font-bold text-slate-100">
                        ${(pm.totalBudgetManaged / 1000).toFixed(0)}k
                      </td>

                      <td className="p-3.5 font-mono text-slate-300">
                        <span>{pm.totalActualHours}h</span> / <span className="text-slate-500">{pm.totalEstimatedHours}h</span>
                      </td>

                      <td className="p-3.5 font-mono font-bold">
                        <span className={pm.aggregateSPI >= 1.0 ? 'text-emerald-400' : 'text-amber-400'}>
                          {pm.aggregateSPI.toFixed(2)}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono font-bold">
                        <span className={pm.aggregateCPI >= 1.0 ? 'text-emerald-400' : 'text-amber-400'}>
                          {pm.aggregateCPI.toFixed(2)}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${pm.taskCompletionRate}%` }} />
                          </div>
                          <span className="font-bold text-indigo-400">{pm.taskCompletionRate}%</span>
                        </div>
                      </td>

                      <td className="p-3.5 font-bold">
                        <span className={pm.criticalRisks === 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {pm.criticalRisks} crit.
                        </span>
                      </td>

                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setAdminSelectedPMTeamId(pm.pmId)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors"
                            title="Inspect PM Team Command Center"
                          >
                            Team
                          </button>
                          <button
                            onClick={() => setSelectedPMForDossier(pm)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                          >
                            Dossier
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 🌟 7. Modals */}
      <PMExecutiveDossierModal
        pm={selectedPMForDossier}
        isOpen={!!selectedPMForDossier}
        onClose={() => setSelectedPMForDossier(null)}
        onSwitchToProject={handleInspectProject}
      />

      <PMAssignProjectModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        pmsList={pmsList}
        projectsList={projectsList}
        onAssignPM={assignProjectManager}
        preselectedPMId={preselectedPMId}
      />

      <PMAiBriefingModal
        isOpen={isAiBriefingModalOpen}
        onClose={() => setIsAiBriefingModalOpen(false)}
        pmsList={pmsList}
      />

    </div>
  );
};
