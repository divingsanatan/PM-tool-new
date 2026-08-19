import React, { useState } from 'react';
import { CrossProjectPMPerformance, ManagedProjectSummary } from '../../utils/portfolioAndLeaveUtils';
import { UserProfile, ProjectData, MemberLeave } from '../../types';
import {
  X,
  Building2,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Briefcase,
  Shield,
  ShieldAlert,
  Award,
  ChevronRight,
  ExternalLink,
  Users,
  Activity,
  Layers,
  Calendar,
  Check,
  Send,
  Sparkles,
  Plane,
  AlertCircle,
  BarChart3,
  Target,
  PieChart as PieChartIcon
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie
} from 'recharts';

interface PMExecutiveDossierModalProps {
  pm: CrossProjectPMPerformance | null;
  isOpen: boolean;
  onClose: () => void;
  onSwitchToProject: (projectId: string) => void;
}

export const PMExecutiveDossierModal: React.FC<PMExecutiveDossierModalProps> = ({
  pm,
  isOpen,
  onClose,
  onSwitchToProject
}) => {
  const [activeTab, setActiveTab] = useState<'projects' | 'analytics' | 'tasks' | 'risks' | 'reviews'>('projects');
  const [reviewNote, setReviewNote] = useState('');
  const [savedNotes, setSavedNotes] = useState<{ id: string; date: string; author: string; text: string; rating: string }[]>([
    {
      id: 'rev-1',
      date: '2026-08-10',
      author: 'Sophia Martinez (COO)',
      text: 'Exemplary schedule adherence on core deliverable milestones. SPI maintained above 1.05 consistently across sprint cycles.',
      rating: 'Exceeds Expectations'
    }
  ]);

  if (!isOpen || !pm) return null;

  const handleAddReviewNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewNote.trim()) return;
    setSavedNotes([
      {
        id: 'rev-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        author: 'Executive PMO Reviewer',
        text: reviewNote.trim(),
        rating: 'Positive Oversight'
      },
      ...savedNotes
    ]);
    setReviewNote('');
  };

  const projectComparisonData = pm.managedProjects.map(p => ({
    name: p.projectCode || p.projectName.slice(0, 10),
    fullName: p.projectName,
    SPI: p.spi,
    CPI: p.cpi,
    budgetK: Math.round(p.budget / 1000),
    completion: p.completionPercent
  }));

  // 360° Radar Data for this PM
  const radarData = [
    { subject: 'Schedule Index (SPI)', value: Math.min(100, Math.round(pm.aggregateSPI * 100)), fullMark: 100 },
    { subject: 'Cost Efficiency (CPI)', value: Math.min(100, Math.round(pm.aggregateCPI * 100)), fullMark: 100 },
    { subject: 'Task Velocity %', value: pm.taskCompletionRate, fullMark: 100 },
    { subject: 'Milestone Delivery %', value: pm.milestoneSuccessRate, fullMark: 100 },
    { subject: 'Risk Control Score', value: Math.max(0, 100 - (pm.criticalRisks * 25 + pm.openIssues * 5)), fullMark: 100 }
  ];

  // EVM Financials
  const evmChartData = [
    { name: 'Planned Value (PV)', value: pm.totalPlannedValue, fill: '#38bdf8' },
    { name: 'Earned Value (EV)', value: pm.totalEarnedValue, fill: '#818cf8' },
    { name: 'Actual Cost (AC)', value: pm.totalActualCost, fill: pm.totalActualCost > pm.totalEarnedValue ? '#f43f5e' : '#34d399' },
    { name: 'EAC Projection', value: pm.totalEAC, fill: '#f59e0b' }
  ];

  // Hours Comparison Data
  const hoursComparisonData = [
    { name: 'Estimated Effort', hours: pm.totalEstimatedHours, fill: '#6366f1' },
    { name: 'Actual Hours Logged', hours: pm.totalActualHours, fill: '#a855f7' },
    { name: 'Earned Hours Value', hours: pm.totalEarnedHours, fill: '#10b981' }
  ];

  // Task Status Pie
  const taskStatusPieData = [
    { name: 'Completed', value: pm.completedTasksManaged, color: '#10b981' },
    { name: 'In Progress', value: pm.inProgressTasksManaged, color: '#6366f1' },
    { name: 'Under Review', value: pm.reviewTasksManaged || 0, color: '#a855f7' },
    { name: 'Blocked', value: pm.blockedTasksManaged, color: '#f43f5e' },
    { name: 'To Do', value: pm.todoTasksManaged || 0, color: '#64748b' }
  ].filter(d => d.value > 0);

  const getHealthBadge = (health: 'on_track' | 'at_risk' | 'critical') => {
    if (health === 'on_track') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          On Track
        </span>
      );
    }
    if (health === 'at_risk') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3.5 h-3.5" />
          At Risk
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
        <ShieldAlert className="w-3.5 h-3.5" />
        Critical
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-900/90 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              <img
                src={pm.avatar}
                alt={pm.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-md"
              />
              {pm.isOnLeave && (
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-slate-950 border border-slate-900">
                  LEAVE
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                  {pm.name}
                </h3>
                {getHealthBadge(pm.overallStatus)}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {pm.department}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                {pm.title} • <span className="text-slate-300 font-mono">${pm.hourlyRate}/hr standard</span> • {pm.managedProjects.length} Projects Led
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {pm.skills.slice(0, 4).map(skill => (
                  <span key={skill} className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors shrink-0"
            title="Close dossier"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PM Scorecard Metric Strips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3 p-4 sm:p-5 bg-slate-950/50 border-b border-slate-800/80">
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Health Index</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-xl font-black ${pm.compositeHealthScore >= 85 ? 'text-emerald-400' : pm.compositeHealthScore >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                {pm.compositeHealthScore}
              </span>
              <span className="text-xs text-slate-500">/ 100</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Composite SPI</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-xl font-black ${pm.aggregateSPI >= 1.0 ? 'text-emerald-400' : pm.aggregateSPI >= 0.9 ? 'text-amber-400' : 'text-rose-400'}`}>
                {pm.aggregateSPI.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500">Target 1.0</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Composite CPI</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-xl font-black ${pm.aggregateCPI >= 1.0 ? 'text-emerald-400' : pm.aggregateCPI >= 0.9 ? 'text-amber-400' : 'text-rose-400'}`}>
                {pm.aggregateCPI.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500">Cost Eff.</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Portfolio Capital</span>
            <div className="text-xl font-black text-slate-100 mt-1">
              ${(pm.totalBudgetManaged / 1000).toFixed(0)}k
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Task Completion</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black text-indigo-400">
                {pm.taskCompletionRate}%
              </span>
              <span className="text-[10px] text-slate-500">({pm.completedTasksManaged}/{pm.totalTasksManaged})</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Critical Risks</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-xl font-black ${pm.criticalRisks === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {pm.criticalRisks}
              </span>
              <span className="text-[10px] text-slate-500">/ {pm.totalRisks} total</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800 bg-slate-900/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('projects')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'projects'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Projects Managed ({pm.managedProjects.length})
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-purple-400" />
            Performance &amp; Visual Analytics
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'tasks'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Delivery Velocity & WBS
          </button>

          <button
            onClick={() => setActiveTab('risks')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'risks'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            RAID & Escalations ({pm.totalRisks})
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'reviews'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            Executive Reviews & Notes
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: Projects Managed */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              {/* Project Comparison Chart */}
              {pm.managedProjects.length > 1 && (
                <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                    Cross-Project Efficiency Comparison (SPI vs CPI)
                  </h4>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={projectComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} domain={[0.5, 1.5]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                        <Bar dataKey="SPI" fill="#10b981" radius={[4, 4, 0, 0]} name="Schedule Index (SPI)" />
                        <Bar dataKey="CPI" fill="#6366f1" radius={[4, 4, 0, 0]} name="Cost Index (CPI)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Projects List */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Project Portfolio Directory
                </h4>
                {pm.managedProjects.map(project => (
                  <div
                    key={project.projectId}
                    className="p-4 sm:p-5 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-800/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {project.projectCode}
                        </span>
                        <h5 className="text-base font-bold text-white truncate">
                          {project.projectName}
                        </h5>
                        {getHealthBadge(project.health)}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {project.description || 'Enterprise project under active delivery and governance.'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
                        <span>Budget: <strong className="text-white">${project.budget.toLocaleString()}</strong></span>
                        <span>EAC: <strong className="text-slate-200">${project.evm.eac.toLocaleString()}</strong></span>
                        <span>Team: <strong className="text-slate-200">{project.teamSize} members</strong></span>
                        <span>Tasks: <strong className="text-slate-200">{project.completedTasks}/{project.totalTasks} Done</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                      <div className="text-right">
                        <div className="text-xs text-slate-400 font-medium">SPI / CPI</div>
                        <div className="text-sm font-bold font-mono text-slate-100">
                          <span className={project.spi >= 1.0 ? 'text-emerald-400' : 'text-amber-400'}>{project.spi.toFixed(2)}</span>
                          <span className="text-slate-600 mx-1">/</span>
                          <span className={project.cpi >= 1.0 ? 'text-emerald-400' : 'text-amber-400'}>{project.cpi.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="w-24">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>Progress</span>
                          <span>{project.completionPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${project.completionPercent}%` }} />
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onSwitchToProject(project.projectId);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        Inspect
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Performance & Visual Analytics (Merged from Report Cards) */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Top Row: Radar & Task Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 360° Radar Profile */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-purple-400" />
                      360° PM Leadership Radar
                    </h4>
                    <span className="text-xs font-mono font-bold text-emerald-400">{pm.compositeHealthScore}/100 Score</span>
                  </div>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 9, fill: '#cbd5e1' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={{ fontSize: 8 }} />
                        <Radar name={pm.name} dataKey="value" stroke="#818cf8" fill="#6366f1" fillOpacity={0.5} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Task Distribution Pie */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <PieChartIcon className="w-4 h-4 text-rose-400" />
                    Task Status Breakdown ({pm.totalTasksManaged} Total Tasks)
                  </h4>
                  <div className="h-56 w-full flex items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={taskStatusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {taskStatusPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Effort Hours & EVM Financials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hours Comparison */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Portfolio Effort &amp; Hours (Est vs Actual vs Earned)
                  </h4>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hoursComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={v => `${v}h`} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                        <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                          {hoursComparisonData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* EVM Financials */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    EVM Capital Financials ($ PV vs EV vs AC vs EAC)
                  </h4>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={evmChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={v => `$${Math.round(v / 1000)}k`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                          formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Amount']}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {evmChartData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Delivery Velocity & WBS */}
          {activeTab === 'tasks' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                  <div className="text-xs text-slate-400 font-medium">Completed Tasks</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">{pm.completedTasksManaged}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Across all managed projects</div>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                  <div className="text-xs text-slate-400 font-medium">In-Flight / In Progress</div>
                  <div className="text-2xl font-bold text-indigo-400 mt-1">{pm.inProgressTasksManaged}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Active execution</div>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                  <div className="text-xs text-slate-400 font-medium">Blocked / Overdue</div>
                  <div className="text-2xl font-bold text-rose-400 mt-1">{pm.blockedTasksManaged + pm.overdueTasksManaged}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Requires executive clearing</div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
                <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Milestone Governance Track Record
                </h5>
                <div className="flex items-center justify-between text-sm py-2 border-b border-slate-800">
                  <span className="text-slate-400">Total Milestones Governed:</span>
                  <span className="font-bold text-slate-200">{pm.totalMilestones}</span>
                </div>
                <div className="flex items-center justify-between text-sm py-2 border-b border-slate-800">
                  <span className="text-slate-400">Milestones Achieved on Time:</span>
                  <span className="font-bold text-emerald-400">{pm.achievedMilestones} ({pm.milestoneSuccessRate}%)</span>
                </div>
                <div className="flex items-center justify-between text-sm py-2">
                  <span className="text-slate-400">Delayed Milestones:</span>
                  <span className={`font-bold ${pm.delayedMilestones > 0 ? 'text-rose-400' : 'text-slate-400'}`}>{pm.delayedMilestones}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RAID & Escalations */}
          {activeTab === 'risks' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10">
                  <div className="text-xs text-rose-300 font-medium">Critical / High Risks</div>
                  <div className="text-2xl font-black text-rose-400 mt-1">{pm.criticalRisks}</div>
                  <div className="text-[11px] text-rose-300/70 mt-1">Threatens budget/schedule</div>
                </div>

                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
                  <div className="text-xs text-amber-300 font-medium">Active Open Issues</div>
                  <div className="text-2xl font-black text-amber-400 mt-1">{pm.openIssues}</div>
                  <div className="text-[11px] text-amber-300/70 mt-1">Under mitigation</div>
                </div>

                <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10">
                  <div className="text-xs text-indigo-300 font-medium">Pending Scope CRs</div>
                  <div className="text-2xl font-black text-indigo-400 mt-1">{pm.pendingChangeRequests}</div>
                  <div className="text-[11px] text-indigo-300/70 mt-1">Awaiting CCB decision</div>
                </div>
              </div>

              {pm.criticalRisks === 0 ? (
                <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-center space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h5 className="text-sm font-bold text-emerald-300">Clean Risk Register</h5>
                  <p className="text-xs text-slate-400">No unmitigated high or critical severity risks reported under this PM's portfolio.</p>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Action Required by PM
                  </div>
                  <p className="text-xs text-slate-300">
                    Review and update mitigation action plans for critical risk items across projects to prevent SPI slippage.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Executive Reviews & Notes */}
          {activeTab === 'reviews' && (
            <div className="space-y-5">
              <form onSubmit={handleAddReviewNote} className="space-y-3 p-4 rounded-xl border border-slate-800 bg-slate-950/50">
                <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Add Executive 1-on-1 Observation / Review Note
                </h5>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder={`Write executive feedback, coaching items, or performance remarks for ${pm.name}...`}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!reviewNote.trim()}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Record Observation
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Past Executive Reviews
                </h5>
                {savedNotes.map(note => (
                  <div key={note.id} className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/30 space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-indigo-400">{note.author}</span>
                      <span>{note.date}</span>
                    </div>
                    <p className="text-sm text-slate-200">{note.text}</p>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {note.rating}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Cross-project audit synchronized across {pm.managedProjects.length} active initiatives.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
