import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { calculateStakeholderWorkloads } from '../../utils/evm';
import { getTaskPredecessors } from '../../utils/dependencies';
import { RaciChartWidget } from './RaciChartWidget';
import { RiskMatrixWidget } from './RiskMatrixWidget';
import { SprintFilter } from '../common/SprintFilter';
import { SprintModal } from '../modals/SprintModal';
import { Sprint } from '../../types';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  GanttChart,
  Users,
  ShieldAlert,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  Target,
  Lightbulb,
  ArrowRight,
  Zap,
  Check,
  Layers,
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
  Award,
  FileText,
  Calendar,
  Scale,
  Flame,
  Shield,
  Briefcase,
  CheckSquare,
  HelpCircle,
  History
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';

interface DashboardViewProps {
  onNavigate: (view: any) => void;
  onOpenAiReportModal: () => void;
  onOpenTaskModal: () => void;
  onOpenRaidModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenAiReportModal,
  onOpenTaskModal,
  onOpenRaidModal
}) => {
  const { projectData, metrics, updateWidgets, currentUser, saveTask } = useProject();
  const [showWidgetConfig, setShowWidgetConfig] = useState(false);
  const [suggestionCategory, setSuggestionCategory] = useState<'all' | 'schedule' | 'cost' | 'scope' | 'resource'>('all');
  const [performanceTab, setPerformanceTab] = useState<'features' | 'milestones'>('features');
  const [selectedSprintIds, setSelectedSprintIds] = useState<string[]>([]);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

  const sprints = projectData.sprints || [];
  const isSprintFiltered = selectedSprintIds.length > 0 && selectedSprintIds.length < sprints.length;

  const displayTasks = isSprintFiltered
    ? projectData.tasks.filter(t => t.sprintId && selectedSprintIds.includes(t.sprintId))
    : projectData.tasks;

  const displayFeatures = isSprintFiltered
    ? projectData.features.filter(f =>
        (f.sprintId && selectedSprintIds.includes(f.sprintId)) ||
        displayTasks.some(t => t.featureId === f.id)
      )
    : projectData.features;

  // User Personalization & Role Metrics
  const isPM = currentUser.role === 'pm';
  const myStakeholderRecord = projectData.stakeholders.find(
    s => s.id === currentUser.id || s.email.toLowerCase() === currentUser.email.toLowerCase()
  );

  const myTasks = displayTasks.filter(t =>
    t.assigneeIds.includes(currentUser.id) ||
    (myStakeholderRecord && t.assigneeIds.includes(myStakeholderRecord.id))
  );

  const myCompletedTasks = myTasks.filter(t => t.status === 'done');
  const myInProgressTasks = myTasks.filter(t => t.status === 'in_progress');
  const myPendingTasks = myTasks.filter(t => t.status === 'todo' || t.status === 'review' || t.status === 'blocked' || t.status === 'in_progress');

  const myTotalAssignedHours = Math.round(myTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0) * 100) / 100;
  const myTotalActualHours = Math.round(myTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0) * 100) / 100;
  const myCompletionRate = myTasks.length > 0 ? Math.round((myCompletedTasks.length / myTasks.length) * 100) : 0;

  const myCapacityHours = myStakeholderRecord?.weeklyCapacityHours || 40;
  const myWorkloadPct = Math.round((myTotalAssignedHours / myCapacityHours) * 100);

  const myOwnedRisks = projectData.raidItems.filter(r =>
    r.ownerId === currentUser.id ||
    (myStakeholderRecord && r.ownerId === myStakeholderRecord.id)
  );

  const workloads = calculateStakeholderWorkloads(projectData.stakeholders, displayTasks, projectData.subtasks);

  // Status counts based on displayTasks
  const totalTasks = displayTasks.length;
  const completedTasks = displayTasks.filter(t => t.status === 'done').length;
  const inProgressTasks = displayTasks.filter(t => t.status === 'in_progress').length;
  const reviewTasks = displayTasks.filter(t => t.status === 'review').length;
  const todoTasks = displayTasks.filter(t => t.status === 'todo').length;
  const blockedTasks = displayTasks.filter(t => t.status === 'blocked').length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalFeatures = displayFeatures.length;
  const completedFeatures = displayFeatures.filter(f => f.status === 'completed').length;

  const totalMilestones = projectData.milestones.length;

  // Compact currency formatters (e.g., $125K, $1.2M, +$15K)
  const formatCompactCurrency = (val: number): string => {
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (abs >= 1_000_000) {
      const formatted = (abs / 1_000_000).toFixed(1).replace(/\.0$/, '');
      return `${sign}$${formatted}M`;
    }
    if (abs >= 1_000) {
      const formatted = (abs / 1_000).toFixed(1).replace(/\.0$/, '');
      return `${sign}$${formatted}K`;
    }
    return `${sign}$${abs.toLocaleString()}`;
  };

  const formatCompactSignedCurrency = (val: number): string => {
    const prefix = val >= 0 ? '+' : '-';
    const abs = Math.abs(val);
    if (abs >= 1_000_000) {
      const formatted = (abs / 1_000_000).toFixed(1).replace(/\.0$/, '');
      return `${prefix}$${formatted}M`;
    }
    if (abs >= 1_000) {
      const formatted = (abs / 1_000).toFixed(1).replace(/\.0$/, '');
      return `${prefix}$${formatted}K`;
    }
    return `${prefix}$${abs.toLocaleString()}`;
  };
  const achievedMilestones = projectData.milestones.filter(m => m.status === 'achieved').length;

  // 1. Calculate Effort / SP Ratio (excluding 'on_hold' tasks)
  const activeTasksForEffort = projectData.tasks.filter(t => t.status !== 'on_hold');
  const activeTaskIds = new Set(activeTasksForEffort.map(t => t.id));
  const activeSubtasksForEffort = projectData.subtasks.filter(st => activeTaskIds.has(st.taskId));

  const totalEstimatedHours = Math.round((activeTasksForEffort.reduce((sum, t) => sum + (t.estimatedHours || 0), 0) +
    activeSubtasksForEffort.reduce((sum, st) => sum + (st.estimatedHours || 0), 0)) * 100) / 100;
  const totalActualHours = Math.round((activeTasksForEffort.reduce((sum, t) => sum + (t.actualHours || 0), 0) +
    activeSubtasksForEffort.reduce((sum, st) => sum + (st.actualHours || 0), 0)) * 100) / 100;
  const effortRatio = totalEstimatedHours > 0 ? totalActualHours / totalEstimatedHours : 1.0;

  // 2. Identify Dependency Schedule Conflicts
  const tasksWithConflicts = projectData.tasks.filter(t => {
    const preds = getTaskPredecessors(t, projectData.tasks);
    return preds.some(p => p.hasConflict);
  });

  // 3. Identify Stakeholder Over-allocations
  const overAllocatedStakeholders = workloads.filter(w => w.utilizationPercent > 100);

  // 4. Identify High-Impact RAID Risks
  const highRiskItems = projectData.raidItems.filter(r =>
    r.status !== 'closed' && r.status !== 'mitigated' &&
    (r.impact === 'high' || r.impact === 'critical' || r.severity === 'high' || r.severity === 'critical' || (r.riskScore && r.riskScore >= 9))
  );

  // 5. Identify Blocked Tasks
  const blockedTasksList = projectData.tasks.filter(t => t.status === 'blocked');

  // --- Extended EVM Metrics for Bottom Performance Overview ---
  const BAC = metrics.budgetAtCompletion || projectData.budget || 250000;
  const EV = metrics.earnedValue;
  const AC = metrics.actualCost;
  const PV = metrics.plannedValue;
  const EAC = metrics.eac;

  const remainingWork = Math.max(0, BAC - EV);
  const remainingBudget = BAC - AC;
  const remainingEACBudget = EAC - AC;

  // To-Complete Performance Index (TCPI)
  const tcpiBAC = remainingBudget > 0 ? Number((remainingWork / remainingBudget).toFixed(2)) : 1.0;
  const tcpiEAC = remainingEACBudget > 0 ? Number((remainingWork / remainingEACBudget).toFixed(2)) : 1.0;

  // Variance at Completion (VAC)
  const vac = Math.round(BAC - EAC);

  // Independent Estimate at Completion (IEAC)
  const safeCPI = metrics.cpi > 0 ? metrics.cpi : 1.0;
  const safeSPI = metrics.spi > 0 ? metrics.spi : 1.0;
  const ieac = Math.round(AC + remainingWork / (safeCPI * safeSPI));

  // Variance percentages
  const cvPercent = EV > 0 ? Number(((metrics.costVariance / EV) * 100).toFixed(1)) : 0;
  const svPercent = PV > 0 ? Number(((metrics.scheduleVariance / PV) * 100).toFixed(1)) : 0;

  // --- Feature-Level EVM Metrics ---
  const featurePerformanceList = projectData.features.map(feature => {
    const featureTasks = projectData.tasks.filter(t => t.featureId === feature.id && t.status !== 'on_hold');
    const featureBAC = featureTasks.reduce((sum, t) => sum + (t.plannedCost || 0), 0);
    const featureAC = featureTasks.reduce((sum, t) => sum + (t.actualCost || 0), 0);
    const featureEV = featureTasks.reduce((sum, t) => sum + ((t.plannedCost || 0) * ((t.completionPercent || 0) / 100)), 0);
    
    // Feature PV (based on overall task schedule)
    const featurePV = featureTasks.reduce((sum, t) => sum + (t.plannedCost || 0) * (t.status === 'done' ? 1.0 : t.status === 'in_progress' ? 0.5 : 0), 0);

    const fSPI = featurePV > 0 ? Number((featureEV / featurePV).toFixed(2)) : 1.0;
    const fCPI = featureAC > 0 ? Number((featureEV / featureAC).toFixed(2)) : 1.0;
    const completedTaskCount = featureTasks.filter(t => t.status === 'done').length;
    const completionPct = featureTasks.length > 0 ? Math.round((completedTaskCount / featureTasks.length) * 100) : 0;

    return {
      feature,
      taskCount: featureTasks.length,
      completedTaskCount,
      completionPct,
      bac: featureBAC,
      ev: Math.round(featureEV),
      ac: featureAC,
      pv: Math.round(featurePV),
      spi: fSPI,
      cpi: fCPI,
      costVariance: Math.round(featureEV - featureAC),
      scheduleVariance: Math.round(featureEV - featurePV)
    };
  });

  // --- Chart Data Collections ---

  // 1. EVM Trend Data
  const evmTrendData = [
    { period: 'Jun W1', PV: 15000, EV: 15000, AC: 14200, EAC: BAC },
    { period: 'Jun W3', PV: 35000, EV: 34000, AC: 32000, EAC: BAC },
    { period: 'Jul W1', PV: 60000, EV: 58000, AC: 54000, EAC: EAC },
    { period: 'Jul W3', PV: metrics.plannedValue, EV: metrics.earnedValue, AC: metrics.actualCost, EAC: EAC },
    { period: 'Aug W2 (Proj)', PV: Math.round(BAC * 0.75), EV: Math.round(EAC * 0.7), AC: Math.round(EAC * 0.72), EAC: EAC },
    { period: 'Sep Target', PV: BAC, EV: BAC, AC: EAC, EAC: EAC }
  ];

  // 2. Task Status Donut Data
  const taskStatusData = [
    { name: 'Done', value: completedTasks, color: '#10b981' },
    { name: 'In Progress', value: inProgressTasks, color: '#6366f1' },
    { name: 'In Review', value: reviewTasks, color: '#8b5cf6' },
    { name: 'Blocked', value: blockedTasks, color: '#f43f5e' },
    { name: 'To Do', value: todoTasks, color: '#64748b' }
  ].filter(d => d.value > 0);

  // 3. Task Priority Breakdown Data
  const urgentCount = projectData.tasks.filter(t => t.priority === 'urgent').length;
  const highCount = projectData.tasks.filter(t => t.priority === 'high').length;
  const normalCount = projectData.tasks.filter(t => t.priority === 'normal').length;
  const lowCount = projectData.tasks.filter(t => t.priority === 'low').length;

  const taskPriorityData = [
    { name: 'Urgent', count: urgentCount, fill: '#f43f5e' },
    { name: 'High', count: highCount, fill: '#f59e0b' },
    { name: 'Normal', count: normalCount, fill: '#3b82f6' },
    { name: 'Low', count: lowCount, fill: '#64748b' }
  ];

  // 4. Feature EVM Cost Breakdown Data
  const featureChartData = featurePerformanceList.map(item => ({
    name: item.feature.title.length > 18 ? item.feature.title.slice(0, 16) + '...' : item.feature.title,
    BAC: item.bac,
    EV: item.ev,
    AC: item.ac
  }));

  // 5. Sprint Velocity / Story Point Burndown Data
  const velocityData = [
    { sprint: 'Sprint 1', plannedPts: 30, completedPts: 28, hoursLogged: 120 },
    { sprint: 'Sprint 2', plannedPts: 40, completedPts: 42, hoursLogged: 165 },
    { sprint: 'Sprint 3', plannedPts: 45, completedPts: 38, hoursLogged: 150 },
    { sprint: 'Sprint 4 (Current)', plannedPts: 50, completedPts: 35, hoursLogged: 140 },
    { sprint: 'Sprint 5 (Forecast)', plannedPts: 45, completedPts: 45, hoursLogged: 160 }
  ];

  // 6. Stakeholder Workload Chart Data
  const workloadChartData = workloads.map(w => ({
    name: w.stakeholder.name.split(' ')[0],
    assigned: w.assignedHours,
    capacity: w.capacityHours,
    utilization: w.utilizationPercent
  }));

  // 7. RAID Risk Severity & Type Distribution Data
  const raidDistributionData = [
    {
      category: 'Risks',
      Critical: projectData.raidItems.filter(r => r.type === 'risk' && (r.severity === 'critical' || r.impact === 'critical')).length,
      High: projectData.raidItems.filter(r => r.type === 'risk' && (r.severity === 'high' || r.impact === 'high')).length,
      Medium: projectData.raidItems.filter(r => r.type === 'risk' && (r.severity === 'medium' || r.impact === 'medium')).length,
      Low: projectData.raidItems.filter(r => r.type === 'risk' && (r.severity === 'low' || r.impact === 'low')).length,
    },
    {
      category: 'Issues',
      Critical: projectData.raidItems.filter(r => r.type === 'issue' && r.severity === 'critical').length,
      High: projectData.raidItems.filter(r => r.type === 'issue' && r.severity === 'high').length,
      Medium: projectData.raidItems.filter(r => r.type === 'issue' && r.severity === 'medium').length,
      Low: projectData.raidItems.filter(r => r.type === 'issue' && r.severity === 'low').length,
    },
    {
      category: 'Assumptions',
      Critical: projectData.raidItems.filter(r => r.type === 'assumption' && r.severity === 'critical').length,
      High: projectData.raidItems.filter(r => r.type === 'assumption' && r.severity === 'high').length,
      Medium: projectData.raidItems.filter(r => r.type === 'assumption' && r.severity === 'medium').length,
      Low: projectData.raidItems.filter(r => r.type === 'assumption' && r.severity === 'low').length,
    },
    {
      category: 'Dependencies',
      Critical: projectData.raidItems.filter(r => r.type === 'dependency' && r.severity === 'critical').length,
      High: projectData.raidItems.filter(r => r.type === 'dependency' && r.severity === 'high').length,
      Medium: projectData.raidItems.filter(r => r.type === 'dependency' && r.severity === 'medium').length,
      Low: projectData.raidItems.filter(r => r.type === 'dependency' && r.severity === 'low').length,
    }
  ];

  // 8. Multi-Dimension Health Radar Data
  const healthRadarData = [
    { metric: 'Schedule (SPI)', score: Math.min(100, Math.round(metrics.spi * 100)), fullMark: 100 },
    { metric: 'Cost (CPI)', score: Math.min(100, Math.round(metrics.cpi * 100)), fullMark: 100 },
    { metric: 'Task Progress', score: taskCompletionRate, fullMark: 100 },
    { metric: 'Scope Predictability', score: Math.max(0, Math.min(100, Math.round((2 - effortRatio) * 100))), fullMark: 100 },
    { metric: 'Capacity Health', score: Math.max(0, Math.min(100, 100 - Math.round((overAllocatedStakeholders.length / (workloads.length || 1)) * 100))), fullMark: 100 },
    { metric: 'Risk Oversight', score: Math.max(0, Math.min(100, 100 - (highRiskItems.length * 12))), fullMark: 100 }
  ];

  // Dynamic Suggestions Engine
  const suggestions: {
    id: string;
    category: 'schedule' | 'cost' | 'scope' | 'resource';
    severity: 'critical' | 'warning' | 'info';
    title: string;
    metricLabel: string;
    metricValue: string;
    diagnosis: string;
    recommendations: string[];
    actionText: string;
    onAction: () => void;
  }[] = [];

  // SPI Suggestion
  if (metrics.spi < 1.0 || metrics.scheduleVariance < 0) {
    suggestions.push({
      id: 'sug-spi',
      category: 'schedule',
      severity: metrics.spi < 0.85 ? 'critical' : 'warning',
      title: `Schedule Slippage Alert (SPI: ${metrics.spi.toFixed(2)})`,
      metricLabel: 'Schedule Performance Index (SPI)',
      metricValue: `${metrics.spi.toFixed(2)} (${metrics.scheduleVariance < 0 ? '-' : ''}$${Math.abs(metrics.scheduleVariance).toLocaleString()} SV)`,
      diagnosis: `Earned Value ($${metrics.earnedValue.toLocaleString()}) is lagging behind Planned Value ($${metrics.plannedValue.toLocaleString()}). Project execution is behind schedule timeline.`,
      recommendations: [
        'Fast-track critical path tasks by running non-dependent subtasks concurrently.',
        'Reallocate under-utilized team members to behind-schedule tasks.',
        'De-scope non-essential backlog features to safeguard baseline milestone target dates.'
      ],
      actionText: 'Optimize Gantt Schedule',
      onAction: () => onNavigate('gantt')
    });
  }

  // CPI Suggestion
  if (metrics.cpi < 1.0 || metrics.costVariance < 0) {
    suggestions.push({
      id: 'sug-cpi',
      category: 'cost',
      severity: metrics.cpi < 0.85 ? 'critical' : 'warning',
      title: `Cost Overrun Risk (CPI: ${metrics.cpi.toFixed(2)})`,
      metricLabel: 'Cost Performance Index (CPI)',
      metricValue: `${metrics.cpi.toFixed(2)} (-$${Math.abs(metrics.costVariance).toLocaleString()} CV)`,
      diagnosis: `Actual Costs ($${metrics.actualCost.toLocaleString()}) exceed Earned Value ($${metrics.earnedValue.toLocaleString()}). Forecast EAC is $${metrics.eac.toLocaleString()} vs $${metrics.budgetAtCompletion.toLocaleString()} BAC.`,
      recommendations: [
        'Audit high hourly rate stakeholder logs and limit unbudgeted overtime.',
        'Freeze optional feature enhancements until CPI recovers above 0.95.',
        'Re-negotiate vendor deliverables or assign standard-rate resources.'
      ],
      actionText: 'Inspect EVM & Tasks',
      onAction: () => onNavigate('wbs')
    });
  }

  // Effort Ratio Suggestion
  if (effortRatio > 1.15) {
    suggestions.push({
      id: 'sug-effort',
      category: 'scope',
      severity: effortRatio > 1.3 ? 'critical' : 'warning',
      title: `Scope Effort & SP Ratio Expansion (${effortRatio.toFixed(2)}x)`,
      metricLabel: 'Actual vs Estimated Effort Ratio',
      metricValue: `${effortRatio.toFixed(2)}x (${totalActualHours}h spent vs ${totalEstimatedHours}h estimated)`,
      diagnosis: `Work packages are consuming ${(effortRatio * 100 - 100).toFixed(0)}% more effort than initial estimates, indicating estimation drift or scope creep.`,
      recommendations: [
        'Decompose complex tasks into 4-8 hour timeboxed subtasks in WBS view.',
        'Apply a +20% buffer to upcoming sprint story point and feature estimates.',
        'Enforce a strict Scope Freeze before accepting new backlog stories.'
      ],
      actionText: 'Inspect WBS Scope',
      onAction: () => onNavigate('wbs')
    });
  }

  // Dependency Violations Suggestion
  if (tasksWithConflicts.length > 0) {
    suggestions.push({
      id: 'sug-dep',
      category: 'schedule',
      severity: 'critical',
      title: `Dependency Schedule Violations (${tasksWithConflicts.length} Task${tasksWithConflicts.length > 1 ? 's' : ''})`,
      metricLabel: 'Schedule Overlaps',
      metricValue: `${tasksWithConflicts.length} Overlapping Tasks`,
      diagnosis: `Task start/due dates violate Finish-to-Start (FS) or Start-to-Start (SS) predecessor constraints, causing cascade delays.`,
      recommendations: [
        'Shift successor task start dates past predecessor completion dates.',
        'Convert strict Finish-to-Start (FS) links to Start-to-Start (SS) with lead time where safe.',
        'Resolve predecessor bottlenecks before commencing downstream work packages.'
      ],
      actionText: 'Resolve In Task Board',
      onAction: () => onNavigate('wbs')
    });
  }

  // Over-allocation Suggestion
  if (overAllocatedStakeholders.length > 0) {
    suggestions.push({
      id: 'sug-capacity',
      category: 'resource',
      severity: 'warning',
      title: `Stakeholder Capacity Over-Allocation (${overAllocatedStakeholders.length} Member${overAllocatedStakeholders.length > 1 ? 's' : ''})`,
      metricLabel: 'Capacity Utilization',
      metricValue: overAllocatedStakeholders.map(s => `${s.stakeholder.name.split(' ')[0]} (${s.utilizationPercent}%)`).join(', '),
      diagnosis: `Team members are assigned workload exceeding 100% capacity, creating burnout risk and delivery delays.`,
      recommendations: [
        'Rebalance task assignments to team members with available capacity hours.',
        'Extend task due dates or split large work packages across multiple assignees.'
      ],
      actionText: 'Balance Workloads',
      onAction: () => onNavigate('workload')
    });
  }

  // High RAID Risks Suggestion
  if (highRiskItems.length > 0) {
    suggestions.push({
      id: 'sug-raid',
      category: 'resource',
      severity: 'critical',
      title: `Active High-Impact RAID Risks (${highRiskItems.length} Open)`,
      metricLabel: 'Critical RAID Log',
      metricValue: `${highRiskItems.length} High Risk Items`,
      diagnosis: `High-severity risks or issues are unmitigated and require immediate owner intervention.`,
      recommendations: [
        'Assign designated risk owners to execute predefined contingency strategies.',
        'Convert critical RAID items into trackable mitigation tasks in the task board.'
      ],
      actionText: 'Manage RAID Log',
      onAction: () => onNavigate('raid')
    });
  }

  // Blocked Tasks Suggestion
  if (blockedTasksList.length > 0) {
    suggestions.push({
      id: 'sug-blocked',
      category: 'schedule',
      severity: 'warning',
      title: `Blocked Work Packages (${blockedTasksList.length} Task${blockedTasksList.length > 1 ? 's' : ''})`,
      metricLabel: 'Work Impediments',
      metricValue: `${blockedTasksList.length} Blocked Tasks`,
      diagnosis: `${blockedTasksList.length} task(s) are stuck in blocked status waiting for resolutions.`,
      recommendations: [
        'Hold an immediate blocker-clearing standup to resolve external impediments.',
        'Temporarily reassign blocked team members to unblock or active work items.'
      ],
      actionText: 'View Blocked Tasks',
      onAction: () => onNavigate('wbs')
    });
  }

  const filteredSuggestions = suggestions.filter(s => {
    if (suggestionCategory === 'all') return true;
    return s.category === suggestionCategory;
  });

  // Toggle widget visibility
  const toggleWidget = (widgetId: string) => {
    const updated = projectData.widgets.map(w =>
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    );
    updateWidgets(updated);
  };

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 bg-slate-900 border border-slate-800/80 p-4 sm:p-5 rounded-2xl shadow-sm min-w-0">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <Activity className="w-5 h-5 text-indigo-400 shrink-0 hidden sm:block" />
            <h2 className="text-sm sm:text-lg md:text-xl font-bold text-slate-100 truncate">
              Project Executive Dashboard
            </h2>
            <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0 whitespace-nowrap">
              Live EVM & Analytics
            </span>
          </div>
          <p className="hidden sm:block text-xs text-slate-400 leading-relaxed truncate">
            Real-time Earned Value indices, schedule distribution, velocity burndown, and stakeholder load heatmaps.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap min-w-0 max-w-full">
          <SprintFilter
            sprints={sprints}
            selectedSprintIds={selectedSprintIds}
            onChange={setSelectedSprintIds}
          />

          <button
            id="btn-generate-report"
            onClick={onOpenAiReportModal}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors shrink-0 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 hidden sm:inline-block" />
            <span>AI Executive Brief</span>
          </button>

          <button
            id="btn-customize-dashboard"
            onClick={() => setShowWidgetConfig(!showWidgetConfig)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors shrink-0 whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0 hidden sm:inline-block" />
            <span>Customize</span>
          </button>
        </div>
      </div>

      {/* Widget Layout Customizer Panel */}
      {showWidgetConfig && (
        <div id="widget-config-panel" className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-semibold text-slate-200">Visible Dashboard Modules</span>
            <button onClick={() => setShowWidgetConfig(false)} className="text-xs text-slate-400 hover:text-white">
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {projectData.widgets.map(w => (
              <label key={w.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-950/60 hover:bg-slate-950 transition-colors">
                <input
                  type="checkbox"
                  checked={w.enabled}
                  onChange={() => toggleWidget(w.id)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-slate-300">{w.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Role-Based Personalized Workstation Banner */}
      <div id="user-workstation-banner" className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4 min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-indigo-500 object-cover shadow-md shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <h3 className="font-bold text-sm sm:text-base md:text-lg text-slate-100 truncate">
                  Welcome back, {currentUser.name}!
                </h3>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 min-w-0 truncate">
                <span className="truncate">{currentUser.title}</span>
                <span className="text-slate-600 shrink-0">•</span>
                <span className="text-indigo-400 font-semibold shrink-0">{currentUser.department}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 flex-wrap pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
            <div className="text-left sm:text-right">
              <p className="text-[11px] text-slate-400 font-mono">My Allocated Workload</p>
              <p className="text-xs font-bold text-slate-200 font-mono">
                {myTotalAssignedHours}h ({myTasks.length} Work Items)
              </p>
            </div>
            <button
              onClick={() => onNavigate('wbs')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all shrink-0"
            >
              <span>View My Tasks ({myTasks.length})</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 hidden sm:inline-block" />
            </button>
          </div>
        </div>

        {/* Personalized Metrics Grid for the Current User */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-2 min-w-0">
          {/* Stat 1: Assigned Tasks & Completion Rate */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-2.5 shadow-inner min-w-0 overflow-hidden h-full">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-400 min-w-0">
              <span className="font-medium flex items-center gap-1.5 min-w-0 truncate">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0 hidden sm:inline-block" />
                <span className="truncate">My Assigned Work</span>
              </span>
              <span className="text-[10px] font-mono text-indigo-300 font-bold shrink-0 whitespace-nowrap">{myCompletionRate}% Done</span>
            </div>
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="text-xl font-extrabold text-slate-100 font-mono">{myTasks.length}</span>
              <span className="text-xs text-slate-400">({myCompletedTasks.length} done)</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${myCompletionRate}%` }} />
            </div>
          </div>

          {/* Stat 2: Hours Logged vs Estimated */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-2.5 shadow-inner min-w-0 overflow-hidden h-full">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-400 min-w-0">
              <span className="font-medium flex items-center gap-1.5 min-w-0 truncate">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 hidden sm:inline-block" />
                <span className="truncate">Hours Logged</span>
              </span>
              <span className="text-[10px] font-mono text-amber-300 font-bold shrink-0 whitespace-nowrap">{myTotalActualHours}h Logged</span>
            </div>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-xl font-extrabold text-slate-100 font-mono">{myTotalActualHours}h</span>
              <span className="text-xs text-slate-400">/ {myTotalAssignedHours}h Est.</span>
            </div>
            <p className="hidden sm:block text-[10px] text-slate-400 truncate">
              {myTotalAssignedHours > 0 ? `${Math.round((myTotalActualHours / myTotalAssignedHours) * 100)}% of effort spent` : 'No hours allocated'}
            </p>
          </div>

          {/* Stat 3: Assigned Workload */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-2.5 shadow-inner min-w-0 overflow-hidden h-full">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-400 min-w-0">
              <span className="font-medium flex items-center gap-1.5 min-w-0 truncate">
                <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0 hidden sm:inline-block" />
                <span className="truncate">Assigned Workload</span>
              </span>
              <span className="text-[10px] font-mono font-bold shrink-0 whitespace-nowrap text-emerald-300">
                Active
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-xl font-extrabold text-slate-100 font-mono">{myTotalAssignedHours}h</span>
              <span className="text-xs text-slate-400">assigned</span>
            </div>
            <p className="hidden sm:block text-[10px] text-slate-400 truncate">
              Total effort assigned to work items
            </p>
          </div>

          {/* Stat 4: My Owned RAID Risks */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-2.5 shadow-inner min-w-0 overflow-hidden h-full">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-400 min-w-0">
              <span className="font-medium flex items-center gap-1.5 min-w-0 truncate">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 hidden sm:inline-block" />
                <span className="truncate">My Owned RAID</span>
              </span>
              <span className="text-[10px] font-mono text-rose-300 font-bold shrink-0 whitespace-nowrap">{myOwnedRisks.length} Items</span>
            </div>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-xl font-extrabold text-slate-100 font-mono">{myOwnedRisks.length}</span>
              <span className="text-xs text-slate-400">owned risks</span>
            </div>
            <p className="hidden sm:block text-[10px] text-slate-400 truncate">
              {myOwnedRisks.filter(r => r.status !== 'closed' && r.status !== 'mitigated').length} active items
            </p>
          </div>
        </div>

        {/* Quick Task Progress Update Bar */}
        {myPendingTasks.length > 0 && (
          <div className="pt-2 border-t border-slate-800 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 min-w-0 truncate">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 hidden sm:inline-block" />
                <span className="truncate">Quick Status Updates</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                Update status directly in 1-click
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 min-w-0">
              {myPendingTasks.slice(0, 3).map(task => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col justify-between gap-2 hover:border-slate-700 transition-all shadow-sm min-w-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                        task.priority === 'urgent' ? 'bg-rose-500/20 text-rose-300' :
                        task.priority === 'high' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-indigo-500/20 text-indigo-300'
                      }`}>
                        {task.priority}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">{task.dueDate}</span>
                    </div>
                    <p className="font-semibold text-xs text-slate-200 mt-1 truncate">{task.title}</p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80 min-w-0">
                    <div className="text-[10px] text-slate-400 font-mono shrink-0 whitespace-nowrap">
                      <span>{task.actualHours}h / {task.estimatedHours}h</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {task.status !== 'in_progress' && (
                        <button
                          onClick={() => saveTask({ ...task, status: 'in_progress' })}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 transition-all whitespace-nowrap"
                        >
                          Start
                        </button>
                      )}
                      {task.status !== 'done' && (
                        <button
                          onClick={() => saveTask({ ...task, status: 'done', completionPercent: 100 })}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 transition-all whitespace-nowrap"
                        >
                          Mark Done
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 1. Core EVM & Health Metric Cards Grid */}
      <div id="evm-cards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {/* SPI Card */}
        <div className="bg-slate-900 border border-slate-800/80 p-3.5 sm:p-4 rounded-2xl relative shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate min-w-0" title="Schedule (SPI)">
              Schedule (SPI)
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap ${
                metrics.spi >= 1.0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {metrics.spi >= 1.0 ? <TrendingUp className="w-3 h-3 shrink-0 hidden sm:inline-block" /> : <TrendingDown className="w-3 h-3 shrink-0 hidden sm:inline-block" />}
              <span>{metrics.spi >= 1.0 ? 'On Schedule' : 'Delayed'}</span>
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between gap-1.5 min-w-0">
            <span className={`text-xl sm:text-2xl xl:text-3xl font-extrabold font-mono truncate ${metrics.spi >= 1.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {metrics.spi.toFixed(2)}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500 font-mono shrink-0 whitespace-nowrap">Target 1.0</span>
          </div>

          <div className="mt-3 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2.5 min-w-0 gap-1.5">
            <span className="truncate text-[11px] sm:text-xs">Schedule Var:</span>
            <span className={`font-mono font-semibold shrink-0 whitespace-nowrap ${metrics.scheduleVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCompactSignedCurrency(metrics.scheduleVariance)}
            </span>
          </div>
        </div>

        {/* CPI Card */}
        <div className="bg-slate-900 border border-slate-800/80 p-3.5 sm:p-4 rounded-2xl relative shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate min-w-0" title="Cost Efficiency (CPI)">
              Cost Efficiency (CPI)
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap ${
                metrics.cpi >= 1.0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {metrics.cpi >= 1.0 ? <TrendingUp className="w-3 h-3 shrink-0 hidden sm:inline-block" /> : <TrendingDown className="w-3 h-3 shrink-0 hidden sm:inline-block" />}
              <span>{metrics.cpi >= 1.0 ? 'Under Budget' : 'Over Budget'}</span>
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between gap-1.5 min-w-0">
            <span className={`text-xl sm:text-2xl xl:text-3xl font-extrabold font-mono truncate ${metrics.cpi >= 1.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {metrics.cpi.toFixed(2)}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500 font-mono shrink-0 whitespace-nowrap">Target 1.0</span>
          </div>

          <div className="mt-3 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2.5 min-w-0 gap-1.5">
            <span className="truncate text-[11px] sm:text-xs">Cost Var:</span>
            <span className={`font-mono font-semibold shrink-0 whitespace-nowrap ${metrics.costVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCompactSignedCurrency(metrics.costVariance)}
            </span>
          </div>
        </div>

        {/* SP / Effort Ratio Card */}
        <div className="bg-slate-900 border border-slate-800/80 p-3.5 sm:p-4 rounded-2xl relative shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate min-w-0" title="Effort / SP Ratio">
              Effort / SP Ratio
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap ${
                effortRatio <= 1.15
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              <Layers className="w-3 h-3 shrink-0 hidden sm:inline-block" />
              <span>{effortRatio <= 1.15 ? 'Aligned' : 'Scope Drift'}</span>
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between gap-1.5 min-w-0">
            <span className={`text-xl sm:text-2xl xl:text-3xl font-extrabold font-mono truncate ${effortRatio <= 1.15 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {effortRatio.toFixed(2)}x
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500 font-mono shrink-0 whitespace-nowrap">Act / Est</span>
          </div>

          <div className="mt-3 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2.5 min-w-0 gap-1.5">
            <span className="truncate text-[11px] sm:text-xs">Hours (Act/Est):</span>
            <span className="font-mono text-slate-300 font-semibold shrink-0 whitespace-nowrap">{totalActualHours}h / {totalEstimatedHours}h</span>
          </div>
        </div>

        {/* Earned Value vs Planned Value */}
        <div className="bg-slate-900 border border-slate-800/80 p-3.5 sm:p-4 rounded-2xl shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 gap-1 min-w-0">
            <span className="font-semibold uppercase tracking-wider text-[11px] truncate min-w-0" title="Earned Value (EV)">Earned Value (EV)</span>
            <DollarSign className="w-4 h-4 text-indigo-400 shrink-0 hidden sm:block" />
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-1.5 min-w-0">
            <span className="text-xl sm:text-2xl xl:text-3xl font-extrabold font-mono text-indigo-400 truncate">
              {formatCompactCurrency(metrics.earnedValue)}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500 font-mono shrink-0 whitespace-nowrap">Actual</span>
          </div>
          <div className="mt-3 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2.5 min-w-0 gap-1.5">
            <span className="truncate text-[11px] sm:text-xs">Planned Value:</span>
            <span className="font-mono text-slate-300 font-semibold shrink-0 whitespace-nowrap">{formatCompactCurrency(metrics.plannedValue)}</span>
          </div>
        </div>

        {/* Estimate at Completion (EAC) */}
        <div className="bg-slate-900 border border-slate-800/80 p-3.5 sm:p-4 rounded-2xl shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 gap-1 min-w-0">
            <span className="font-semibold uppercase tracking-wider text-[11px] truncate min-w-0" title="Forecast EAC">Forecast EAC</span>
            <Clock className="w-4 h-4 text-purple-400 shrink-0 hidden sm:block" />
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-1.5 min-w-0">
            <span className="text-xl sm:text-2xl xl:text-3xl font-extrabold font-mono text-purple-300 truncate">
              {formatCompactCurrency(metrics.eac)}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500 font-mono shrink-0 whitespace-nowrap">Forecast</span>
          </div>
          <div className="mt-3 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2.5 min-w-0 gap-1.5">
            <span className="truncate text-[11px] sm:text-xs">Budget (BAC):</span>
            <span className="font-mono text-slate-300 font-semibold shrink-0 whitespace-nowrap">{formatCompactCurrency(metrics.budgetAtCompletion)}</span>
          </div>
        </div>
      </div>

      {/* GRAPH ROW 1: EVM Cumulative S-Curve & Task Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph 1: EVM Cumulative S-Curve Performance */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800/80 p-4 sm:p-5 rounded-2xl shadow-sm space-y-3 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <BarChart3 className="w-4 h-4 text-indigo-400 shrink-0" />
                <h3 className="font-bold text-slate-100 text-sm truncate">Earned Value S-Curve & Cost Forecast Trend</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Comparison of Planned Value (PV), Earned Value (EV), Actual Cost (AC), and Forecast EAC projection.
              </p>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 text-indigo-300 border border-slate-800 font-mono self-start sm:self-auto shrink-0 whitespace-nowrap">
              S-Curve Live
            </span>
          </div>

          <div className="h-64 w-full pt-1 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={evmTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                />
                <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />
                <Area type="monotone" dataKey="PV" name="Planned Value (PV)" fill="#3b82f6" fillOpacity={0.1} stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="EV" name="Earned Value (EV)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="AC" name="Actual Cost (AC)" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="EAC" name="Forecast EAC" stroke="#a855f7" strokeWidth={1.5} strokeDasharray="2 2" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Task Status & Priority Breakdown Chart */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-sm">Task Status & Priority</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {totalTasks} Total Tasks
              </span>
            </div>

            {/* Donut Chart */}
            <div className="h-44 w-full relative my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', color: '#f8fafc', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold font-mono text-slate-100">{taskCompletionRate}%</span>
                <span className="text-[10px] text-slate-400">Completed</span>
              </div>
            </div>

            {/* Status Legend Pills */}
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/40 border border-slate-800/50">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Done</span>
                </span>
                <span className="font-bold font-mono text-emerald-400">{completedTasks}</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/40 border border-slate-800/50">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  <span>In Progress</span>
                </span>
                <span className="font-bold font-mono text-indigo-400">{inProgressTasks}</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/40 border border-slate-800/50">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  <span>Review</span>
                </span>
                <span className="font-bold font-mono text-purple-400">{reviewTasks}</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/40 border border-slate-800/50">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span>Blocked</span>
                </span>
                <span className="font-bold font-mono text-rose-400">{blockedTasks}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('tasks')}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-indigo-300 border border-slate-700/60 font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Inspect All Work Items</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* GRAPH ROW 2: Feature EVM Cost Breakdown & Sprint Velocity Burndown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 3: Feature Budget vs EV vs Actual Cost */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-slate-100 text-sm">Feature EVM Cost Breakdown</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Budget vs EV vs AC
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Compare planned budget (BAC), earned value (EV), and actual cost incurred per feature package.
          </p>

          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '11px' }}
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                />
                <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />
                <Bar dataKey="BAC" name="Planned Budget (BAC)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="EV" name="Earned Value (EV)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="AC" name="Actual Cost (AC)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 4: Sprint Velocity & Story Point Burndown */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-slate-100 text-sm">Sprint Velocity & Work Burndown</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Planned vs Delivered
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Sprint story point delivery velocity alongside logged engineering hours.
          </p>

          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={velocityData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="sprint" stroke="#94a3b8" fontSize={11} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} unit=" pts" />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} unit="h" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />
                <Bar yAxisId="left" dataKey="plannedPts" name="Planned Points" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="completedPts" name="Completed Points" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="hoursLogged" name="Hours Logged" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* GRAPH ROW 3: Stakeholder Workload Heatmap & RAID Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 5: Stakeholder Workload Distribution */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-400" />
              <h3 className="font-bold text-slate-100 text-sm">Stakeholder Workload Distribution</h3>
            </div>
            <button
              onClick={() => onNavigate('workload')}
              className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium"
            >
              <span>Workload View</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={workloadChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} unit="h" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '11px' }}
                />
                <Bar dataKey="assigned" name="Assigned Hours" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 6: RAID Risk Type & Severity Distribution Chart */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h3 className="font-bold text-slate-100 text-sm">RAID Risk & Severity Distribution</h3>
            </div>
            <button
              onClick={() => onNavigate('raid')}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
            >
              <span>Full RAID Log</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={raidDistributionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />
                <Bar dataKey="Critical" fill="#f43f5e" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="High" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Medium" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Low" fill="#64748b" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* RACI Responsibility Assignment Matrix Module */}
      <RaciChartWidget />

      {/* Risk Probability & Impact Matrix Module */}
      <RiskMatrixWidget onNavigate={onNavigate} />

      {/* Risk & Performance Recovery Advisor Panel */}
      <div id="risk-advisor-panel" className="bg-slate-900 border border-slate-800/80 p-3.5 sm:p-5 rounded-2xl shadow-sm space-y-4 min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 hidden sm:block">
              <Lightbulb className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h3 className="font-bold text-slate-100 text-sm sm:text-base truncate">
                  Risk & Performance Recovery Advisor
                </h3>
                {suggestions.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap shrink-0">
                    {suggestions.length} Risk Factor{suggestions.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="hidden sm:block text-xs text-slate-400 mt-0.5">
                Actionable mitigation guidance for metrics at risk (SPI, CPI, SP Effort Ratio, Dependencies, Over-allocations).
              </p>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 sm:gap-1.5 text-xs bg-slate-950/60 p-1 rounded-xl border border-slate-800/60 max-w-full overflow-x-auto shrink-0 no-scrollbar">
            <button
              onClick={() => setSuggestionCategory('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap text-[11px] sm:text-xs ${
                suggestionCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({suggestions.length})
            </button>
            <button
              onClick={() => setSuggestionCategory('schedule')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap text-[11px] sm:text-xs ${
                suggestionCategory === 'schedule'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Schedule ({suggestions.filter(s => s.category === 'schedule').length})
            </button>
            <button
              onClick={() => setSuggestionCategory('cost')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap text-[11px] sm:text-xs ${
                suggestionCategory === 'cost'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cost & CPI ({suggestions.filter(s => s.category === 'cost').length})
            </button>
            <button
              onClick={() => setSuggestionCategory('scope')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap text-[11px] sm:text-xs ${
                suggestionCategory === 'scope'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Scope & SP ({suggestions.filter(s => s.category === 'scope').length})
            </button>
            <button
              onClick={() => setSuggestionCategory('resource')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap text-[11px] sm:text-xs ${
                suggestionCategory === 'resource'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Resource & RAID ({suggestions.filter(s => s.category === 'resource').length})
            </button>
          </div>
        </div>

        {/* Suggestion Cards Grid */}
        {filteredSuggestions.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredSuggestions.map((sug) => (
              <div
                key={sug.id}
                className={`p-4 rounded-xl bg-slate-950/60 border flex flex-col justify-between gap-3 shadow-sm transition-all ${
                  sug.severity === 'critical'
                    ? 'border-rose-500/40 hover:border-rose-500/60'
                    : sug.severity === 'warning'
                    ? 'border-amber-500/40 hover:border-amber-500/60'
                    : 'border-indigo-500/40 hover:border-indigo-500/60'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 border whitespace-nowrap shrink-0 ${
                        sug.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : sug.severity === 'warning'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{sug.severity} Risk</span>
                    </span>

                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider bg-slate-900 px-2 py-0.5 rounded border border-slate-800 whitespace-nowrap shrink-0">
                      {sug.category}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs sm:text-sm text-slate-100 leading-snug">
                    {sug.title}
                  </h4>

                  {/* Diagnosis & Metric Callout */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-xs space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1 font-mono text-[11px] text-slate-300 min-w-0">
                      <span className="text-slate-400 font-medium shrink-0 whitespace-nowrap">{sug.metricLabel}:</span>
                      <span className="font-bold text-indigo-300 truncate max-w-full">{sug.metricValue}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-800/60 break-words">
                      {sug.diagnosis}
                    </p>
                  </div>

                  {/* Recommendations Action List */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>Recommended Management Actions:</span>
                    </span>
                    <ul className="space-y-1 text-[11px] text-slate-300">
                      {sug.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 leading-tight">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={sug.onAction}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span>{sug.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={onOpenAiReportModal}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 text-xs transition-colors"
                    title="Generate AI Recovery Report"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 inline" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-emerald-200">
                All Performance Indicators Are Within Target Limits!
              </span>
              <p className="text-[11px] text-emerald-400/80 mt-0.5">
                SPI and CPI are at or above 1.00, effort estimates are well-aligned (SP Ratio ~ 1.0x), zero dependency conflicts detected, and stakeholder capacities are balanced.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Gantt Quick View & AI Assistant Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Gantt Quick View */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <GanttChart className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-slate-100 text-sm">Gantt Schedule Overview</h3>
            </div>
            <button
              onClick={() => onNavigate('gantt')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              <span>Full Gantt</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {projectData.tasks.slice(0, 5).map(task => {
              const assigneeNames = task.assigneeIds
                .map(id => projectData.stakeholders.find(s => s.id === id)?.name.split(' ')[0])
                .filter(Boolean)
                .join(', ');

              return (
                <div key={task.id} className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 truncate max-w-xs">{task.title}</span>
                    <span className="text-slate-400 font-mono text-[11px]">{task.startDate} → {task.dueDate}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full"
                      style={{ width: `${task.completionPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>Assignee: {assigneeNames || 'Unassigned'}</span>
                    <span className="font-mono text-indigo-300">{task.completionPercent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Assistant Executive Card */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800/80">
              <div className="p-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Gemini AI Executive Advisor</h3>
                <p className="text-[11px] text-slate-400">Automated SPI/CPI commentary & mitigation generator</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60 mt-2">
              Current project SPI is <span className="text-emerald-400 font-bold font-mono">{metrics.spi}</span> and CPI is <span className="text-emerald-400 font-bold font-mono">{metrics.cpi}</span>. Forecast Estimate at Completion is <span className="text-purple-300 font-bold font-mono">{formatCompactCurrency(metrics.eac)}</span>. Generate a full AI executive status report or trigger an automated risk audit.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={onOpenAiReportModal}
              className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Generate AI Report</span>
            </button>
            <button
              onClick={onOpenRaidModal}
              className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 font-medium text-xs transition-colors"
            >
              Log New Risk
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM SECTION: COMPREHENSIVE PROJECT PERFORMANCE OVERVIEW & EVM MATRIX */}
      {/* ========================================================================= */}
      <div id="project-performance-overview-bottom" className="bg-slate-900 border border-slate-800/90 rounded-2xl p-6 shadow-md space-y-6">
        {/* Section Title Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                <Award className="w-5 h-5 text-indigo-300" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                  Comprehensive Project Performance Overview & EVM Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Detailed Earned Value indices, To-Complete Performance Indices (TCPI), Independent EAC forecasts, and Feature WBS variance table.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Status Indicators */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border whitespace-nowrap ${
              metrics.spi >= 1.0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>SPI {metrics.spi >= 1.0 ? 'On Track' : 'Lagging'} ({metrics.spi.toFixed(2)})</span>
            </span>

            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border whitespace-nowrap ${
              metrics.cpi >= 1.0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              <DollarSign className="w-3.5 h-3.5 shrink-0" />
              <span>CPI {metrics.cpi >= 1.0 ? 'Favorable' : 'Overrun'} ({metrics.cpi.toFixed(2)})</span>
            </span>

            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-indigo-300 border border-slate-700 flex items-center gap-1.5 whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{taskCompletionRate}% Complete</span>
            </span>
          </div>
        </div>

        {/* Extended Performance Index Grid (TCPI, VAC, IEAC, CV%, SV%) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* TCPI (BAC) */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span title="To-Complete Performance Index (BAC)">TCPI (BAC Target)</span>
              <Scale className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className={`text-xl font-extrabold font-mono ${tcpiBAC <= 1.0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {tcpiBAC.toFixed(2)}
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              {tcpiBAC <= 1.0 ? 'Feasible performance rate to meet budget' : 'Requires higher cost efficiency'}
            </p>
          </div>

          {/* TCPI (EAC) */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span title="To-Complete Performance Index (EAC)">TCPI (EAC Target)</span>
              <Target className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-extrabold font-mono text-purple-300">
              {tcpiEAC.toFixed(2)}
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Required efficiency for revised {formatCompactCurrency(EAC)} forecast
            </p>
          </div>

          {/* Variance at Completion (VAC) */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Variance at Finish (VAC)</span>
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className={`text-xl font-extrabold font-mono ${vac >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCompactSignedCurrency(vac)}
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              {vac >= 0 ? 'Projected budget surplus at completion' : 'Projected budget deficit at completion'}
            </p>
          </div>

          {/* Independent EAC (IEAC) */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span title="Independent EAC (Combined SPI & CPI)">Independent EAC</span>
              <Activity className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="text-xl font-extrabold font-mono text-teal-300">
              {formatCompactCurrency(ieac)}
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Composite SPI x CPI cost forecast
            </p>
          </div>

          {/* Cost Variance % */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Cost Variance %</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className={`text-xl font-extrabold font-mono ${cvPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {cvPercent >= 0 ? '+' : ''}{cvPercent}%
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Cost efficiency percentage relative to EV
            </p>
          </div>

          {/* Schedule Variance % */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Schedule Variance %</span>
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className={`text-xl font-extrabold font-mono ${svPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {svPercent >= 0 ? '+' : ''}{svPercent}%
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Timeline progress variance relative to PV
            </p>
          </div>
        </div>

        {/* Multi-Dimension Project Health 360 Radar & Key Operational KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Radar Chart: Project Performance 360 Spectrum */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-2 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Project Health 360° Radar</span>
              </span>
              <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20 font-bold">
                Normalized Indices
              </span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={healthRadarData} outerRadius="75%">
                  <PolarGrid stroke="currentColor" className="text-slate-300 dark:text-slate-700" opacity={0.6} />
                  <PolarAngleAxis dataKey="metric" stroke="currentColor" className="text-slate-700 dark:text-slate-300 font-medium" fontSize={10} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="currentColor" className="text-slate-400 dark:text-slate-500" fontSize={9} />
                  <Radar name="Project Performance" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', color: '#f8fafc', fontSize: '11px', fontWeight: '600' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Key Operational KPIs Summary Grid */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 min-w-0">
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold truncate">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">Work Delivery Rate</span>
              </div>
              <div className="text-base sm:text-lg xl:text-xl font-bold font-mono text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">
                {completedTasks} / {totalTasks} <span className="text-sm font-sans font-semibold">Tasks</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${taskCompletionRate}%` }} />
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate">{taskCompletionRate}% work packages completed</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold truncate">
                <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                <span className="truncate">Milestone Execution</span>
              </div>
              <div className="text-base sm:text-lg xl:text-xl font-bold font-mono text-purple-700 dark:text-purple-300 whitespace-nowrap truncate">
                {achievedMilestones} / {totalMilestones} <span className="text-sm font-sans font-semibold">Milestones</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${totalMilestones > 0 ? (achievedMilestones / totalMilestones) * 100 : 0}%` }} />
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate">{totalMilestones - achievedMilestones} remaining milestones</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold truncate">
                <Shield className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="truncate">RAID Risk Exposure</span>
              </div>
              <div className="text-base sm:text-lg xl:text-xl font-bold font-mono text-rose-700 dark:text-rose-300 whitespace-nowrap truncate">
                {highRiskItems.length} <span className="text-sm font-sans font-semibold">High Risks</span>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium pt-1 border-t border-slate-200 dark:border-slate-800 truncate">
                {projectData.raidItems.length} total items logged across project
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold truncate">
                <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="truncate">Team Over-allocation</span>
              </div>
              <div className="text-base sm:text-lg xl:text-xl font-bold font-mono text-teal-700 dark:text-teal-300 whitespace-nowrap truncate">
                {overAllocatedStakeholders.length} <span className="text-sm font-sans font-semibold">Stakeholders</span>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium pt-1 border-t border-slate-200 dark:border-slate-800 truncate">
                {overAllocatedStakeholders.length > 0 ? 'Rebalance required in Workload View' : 'All members within capacity limit'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold truncate">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">Dependency Conflicts</span>
              </div>
              <div className="text-base sm:text-lg xl:text-xl font-bold font-mono text-amber-700 dark:text-amber-300 whitespace-nowrap truncate">
                {tasksWithConflicts.length} <span className="text-sm font-sans font-semibold">Conflicts</span>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium pt-1 border-t border-slate-200 dark:border-slate-800 truncate">
                {tasksWithConflicts.length > 0 ? 'Finish-to-Start constraint overlaps' : 'No predecessor constraint conflicts'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold truncate">
                <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="truncate">Effort SP Estimation Ratio</span>
              </div>
              <div className="text-base sm:text-lg xl:text-xl font-bold font-mono text-indigo-700 dark:text-indigo-300 whitespace-nowrap truncate">
                {effortRatio.toFixed(2)}x <span className="text-sm font-sans font-semibold">Ratio</span>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium pt-1 border-t border-slate-200 dark:border-slate-800 truncate">
                {totalActualHours}h logged vs {totalEstimatedHours}h estimated
              </p>
            </div>
          </div>
        </div>

        {/* Feature & Milestone EVM Performance Detailed Table */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="font-bold text-slate-100 text-sm truncate">Feature & Milestone EVM Performance Breakdown</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 self-start sm:self-auto">
              <button
                onClick={() => setPerformanceTab('features')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  performanceTab === 'features' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Features ({featurePerformanceList.length})
              </button>
              <button
                onClick={() => setPerformanceTab('milestones')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  performanceTab === 'milestones' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Milestones ({projectData.milestones.length})
              </button>
            </div>
          </div>

          {/* Features Table */}
          {performanceTab === 'features' ? (
            <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/80 shadow-sm custom-scrollbar">
              <table className="w-full min-w-[780px] text-left text-xs text-slate-800 dark:text-slate-200">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 uppercase text-[11px] font-mono tracking-wider border-b border-slate-300 dark:border-slate-800">
                  <tr>
                    <th className="p-3 font-bold whitespace-nowrap">Feature Module</th>
                    <th className="p-3 font-bold whitespace-nowrap">Status</th>
                    <th className="p-3 font-bold whitespace-nowrap">Tasks / Progress</th>
                    <th className="p-3 text-right font-bold whitespace-nowrap">Budget (BAC)</th>
                    <th className="p-3 text-right font-bold whitespace-nowrap">Earned Value (EV)</th>
                    <th className="p-3 text-right font-bold whitespace-nowrap">Actual Cost (AC)</th>
                    <th className="p-3 text-center font-bold whitespace-nowrap">SPI</th>
                    <th className="p-3 text-center font-bold whitespace-nowrap">CPI</th>
                    <th className="p-3 text-right font-bold whitespace-nowrap">Cost Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-mono">
                  {featurePerformanceList.map((item) => (
                    <tr key={item.feature.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                      <td className="p-3 font-sans min-w-[180px]">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.feature.color }} />
                          <span>{item.feature.title}</span>
                        </div>
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 font-sans line-clamp-1 mt-0.5">{item.feature.description}</span>
                      </td>

                      <td className="p-3 font-sans whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          item.feature.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' :
                          item.feature.status === 'in_progress' ? 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30' :
                          'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}>
                          {item.feature.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="p-3 font-sans min-w-[130px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                            <span>{item.completedTaskCount}/{item.taskCount} Tasks</span>
                            <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">{item.completionPct}%</span>
                          </div>
                          <div className="w-24 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full" style={{ width: `${item.completionPct}%` }} />
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">{formatCompactCurrency(item.bac)}</td>
                      <td className="p-3 text-right font-bold text-indigo-700 dark:text-indigo-400 whitespace-nowrap">{formatCompactCurrency(item.ev)}</td>
                      <td className="p-3 text-right font-bold text-purple-700 dark:text-purple-300 whitespace-nowrap">{formatCompactCurrency(item.ac)}</td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border inline-block ${
                          item.spi >= 1.0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                        }`}>
                          {item.spi.toFixed(2)}
                        </span>
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border inline-block ${
                          item.cpi >= 1.0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                        }`}>
                          {item.cpi.toFixed(2)}
                        </span>
                      </td>

                      <td className={`p-3 text-right font-bold whitespace-nowrap ${item.costVariance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        {formatCompactSignedCurrency(item.costVariance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Milestones Table */
            <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/80 shadow-sm custom-scrollbar">
              <table className="w-full min-w-[650px] text-left text-xs text-slate-800 dark:text-slate-200">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 uppercase text-[11px] font-mono tracking-wider border-b border-slate-300 dark:border-slate-800">
                  <tr>
                    <th className="p-3 font-bold whitespace-nowrap">Milestone Deliverable</th>
                    <th className="p-3 font-bold whitespace-nowrap">Target Due Date</th>
                    <th className="p-3 font-bold whitespace-nowrap">Status</th>
                    <th className="p-3 text-right font-bold whitespace-nowrap">Baseline Cost</th>
                    <th className="p-3 text-right font-bold whitespace-nowrap">Actual Cost Logged</th>
                    <th className="p-3 text-right font-bold whitespace-nowrap">Cost Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-mono">
                  {projectData.milestones.map((m) => {
                    const costVar = m.baselineCost - m.actualCost;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                        <td className="p-3 font-sans min-w-[180px]">
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Target className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                            <span>{m.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{m.description}</p>
                        </td>

                        <td className="p-3 text-slate-800 dark:text-slate-200 font-bold whitespace-nowrap">{m.dueDate}</td>

                        <td className="p-3 font-sans whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            m.status === 'achieved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' :
                            m.status === 'in_progress' ? 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30' :
                            'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}>
                            {m.status}
                          </span>
                        </td>

                        <td className="p-3 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">{formatCompactCurrency(m.baselineCost)}</td>
                        <td className="p-3 text-right font-bold text-purple-700 dark:text-purple-300 whitespace-nowrap">{formatCompactCurrency(m.actualCost)}</td>
                        <td className={`p-3 text-right font-bold whitespace-nowrap ${costVar >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                          {formatCompactSignedCurrency(costVar)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Executive Takeaways & Mitigation Summary */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-indigo-400" />
            <span>Executive Performance Takeaways & Strategic Summary</span>
          </span>
          <p className="text-slate-400 leading-relaxed">
            Project <span className="text-slate-200 font-semibold">{projectData.projectName} ({projectData.projectCode})</span> is currently tracking with an Earned Value of <span className="text-indigo-300 font-mono font-semibold">{formatCompactCurrency(metrics.earnedValue)}</span> against a Planned Value of <span className="text-indigo-300 font-mono font-semibold">{formatCompactCurrency(metrics.plannedValue)}</span>. Overall SPI stands at <span className="text-emerald-400 font-mono font-bold">{metrics.spi.toFixed(2)}</span> and CPI stands at <span className="text-emerald-400 font-mono font-bold">{metrics.cpi.toFixed(2)}</span> <span className="text-slate-500 font-normal text-[11px]">(Note: "On Hold" work items are excluded from schedule/EVM performance metrics to prevent timeline distortion)</span>. To ensure on-time delivery by <span className="text-slate-200 font-mono">{projectData.targetEndDate}</span>, monitor active RAID items and project milestones in the dedicated view modules.
          </p>
        </div>

        {/* Recent Audit Trail & User Activity Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                <History className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-slate-100 truncate">Recent Audit Trail Activity</h3>
                <p className="text-[11px] text-slate-400 truncate">Recorded user edits, scope changes, and authenticated logins</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('audit')}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline shrink-0 self-start sm:self-auto"
            >
              <span>View Full Audit Trail</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 min-w-0">
            {(projectData.activities || []).slice(0, 4).map((act) => (
              <div
                key={act.id}
                onClick={() => onNavigate('audit')}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 group min-w-0"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {act.userAvatar ? (
                    <img src={act.userAvatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {act.user.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="font-bold text-xs text-slate-200 group-hover:text-indigo-300 transition-colors truncate">{act.user}</span>
                      <span className="text-[10px] text-indigo-300 font-semibold font-mono">[{act.action}]</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{act.details}</p>
                  </div>
                </div>

                <span className="text-[10px] text-slate-500 font-mono shrink-0 self-start sm:self-auto">
                  {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sprint Modal */}
      <SprintModal
        isOpen={isSprintModalOpen}
        onClose={() => setIsSprintModalOpen(false)}
        sprintToEdit={editingSprint}
      />
    </div>
  );
};
