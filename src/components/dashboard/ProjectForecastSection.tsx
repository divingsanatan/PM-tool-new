import React, { useState, useMemo } from 'react';
import { ProjectData } from '../../types';
import {
  calculateProjectForecast,
  calculatePortfolioForecasts,
  formatFriendlyDate,
  ProjectForecastResult,
  addDaysToDate,
  daysBetween
} from '../../utils/forecastUtils';
import {
  getEVMCardClass,
  getEVMBadgeClass,
  getEVMTextColorClass,
  getEVMStatusLabel
} from '../../utils/scorecardFormatting';
import {
  Calendar,
  Clock,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Sliders,
  BarChart3,
  Layers,
  Search,
  Filter,
  ArrowRight,
  Target,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  ComposedChart,
  BarChart,
  Bar
} from 'recharts';

interface ProjectForecastSectionProps {
  projects: ProjectData[];
  userRole?: 'pm' | 'admin' | 'stakeholder';
  onOpenForecastModal?: (projectId: string) => void;
  onSelectProject?: (projectId: string) => void;
}

export const ProjectForecastSection: React.FC<ProjectForecastSectionProps> = ({
  projects,
  userRole = 'pm',
  onOpenForecastModal,
  onSelectProject
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'delayed' | 'on_track' | 'ahead'>('all');
  const [activeChartMode, setActiveChartMode] = useState<'scurve' | 'indices' | 'comparison'>('comparison');
  const [simulatedSPIBonus, setSimulatedSPIBonus] = useState<number>(0);

  // Portfolio calculations
  const portfolioForecasts = useMemo(() => {
    return calculatePortfolioForecasts(projects);
  }, [projects]);

  // Selected single project forecast
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  const baseForecast = useMemo(() => {
    if (!selectedProject) return null;
    return calculateProjectForecast(selectedProject);
  }, [selectedProject]);

  // Live forecast with What-If slider
  const liveForecast = useMemo(() => {
    if (!baseForecast) return null;
    if (simulatedSPIBonus === 0) return baseForecast;

    const newSPI = Math.max(0.4, Number((baseForecast.currentSPI + simulatedSPIBonus).toFixed(2)));
    const newTotalDuration = Math.round(baseForecast.plannedDurationDays / newSPI);
    const newForecastDate = addDaysToDate(baseForecast.startDate, newTotalDuration);
    const newVarianceDays = daysBetween(baseForecast.targetEndDate, newForecastDate);

    let status: 'ahead' | 'on_track' | 'at_risk' | 'critical' = 'on_track';
    if (newVarianceDays <= -5) status = 'ahead';
    else if (newVarianceDays <= 5) status = 'on_track';
    else if (newVarianceDays <= 21) status = 'at_risk';
    else status = 'critical';

    return {
      ...baseForecast,
      currentSPI: newSPI,
      forecastCompletionDate: newForecastDate,
      scheduleVarianceDays: newVarianceDays,
      deliveryStatus: status,
      isSimulated: true
    };
  }, [baseForecast, simulatedSPIBonus]);

  // Filtered project forecast list
  const filteredForecasts = useMemo(() => {
    return portfolioForecasts.projectForecasts.filter(f => {
      if (statusFilter === 'delayed') return f.scheduleVarianceDays > 5;
      if (statusFilter === 'on_track') return f.scheduleVarianceDays >= -5 && f.scheduleVarianceDays <= 5;
      if (statusFilter === 'ahead') return f.scheduleVarianceDays < -5;
      return true;
    });
  }, [portfolioForecasts, statusFilter]);

  // Cross-project comparison chart data
  const comparisonBarData = useMemo(() => {
    return portfolioForecasts.projectForecasts.map(f => ({
      name: f.projectCode || f.projectName.substring(0, 10),
      fullName: f.projectName,
      projectId: f.projectId,
      varianceDays: f.scheduleVarianceDays,
      plannedDays: f.plannedDurationDays,
      spi: f.currentSPI,
      cpi: f.currentCPI,
      confidence: f.confidenceScore,
      targetDate: formatFriendlyDate(f.targetEndDate),
      forecastDate: formatFriendlyDate(f.forecastCompletionDate)
    }));
  }, [portfolioForecasts]);

  if (!baseForecast || !liveForecast) return null;

  return (
    <div className="space-y-6">
      
      {/* 🌟 Portfolio Forecast Executive Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Metric 1: Portfolio Forecast Finish */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Portfolio Target Finish
            </span>
            <span className="text-[10px] font-mono text-indigo-300 font-bold bg-indigo-500/10 px-2 py-0.5 rounded">
              {projects.length} Projects
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {formatFriendlyDate(portfolioForecasts.portfolioForecastDate)}
          </p>
          <p className="text-[11px] text-slate-500 truncate">
            Latest delivery milestone across active project roadmap
          </p>
        </div>

        {/* Metric 2: Average Portfolio SPI */}
        <div className={`p-4 rounded-2xl space-y-1 ${getEVMCardClass(portfolioForecasts.avgPortfolioSPI, 0.9)}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Mean Schedule Index (SPI)
            </span>
            {portfolioForecasts.avgPortfolioSPI < 0.9 ? (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500 text-white uppercase animate-pulse">Alert &lt; 0.9</span>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono">Target: 1.00</span>
            )}
          </div>
          <p className={`text-xl sm:text-2xl font-black font-mono ${getEVMTextColorClass(portfolioForecasts.avgPortfolioSPI, 0.9)}`}>
            {portfolioForecasts.avgPortfolioSPI.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-500 truncate">
            {portfolioForecasts.avgPortfolioSPI < 0.9
              ? '🚨 Critical portfolio schedule delay (< 0.9)'
              : portfolioForecasts.avgPortfolioSPI >= 1.0
              ? 'Portfolio velocity is on/ahead of schedule'
              : 'Historical schedule drag detected across sprints'}
          </p>
        </div>

        {/* Metric 3: Delivery Risk Split */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Schedule Health Split
            </span>
            <span className="text-[10px] text-emerald-400 font-bold">
              {portfolioForecasts.totalAheadProjects} On Track
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
              {portfolioForecasts.totalAtRiskProjects + portfolioForecasts.totalCriticalProjects}
            </p>
            <span className="text-xs text-slate-400">Delayed / At Risk</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            {portfolioForecasts.totalCriticalProjects > 0 ? `${portfolioForecasts.totalCriticalProjects} critical delay requiring intervention` : 'No severe critical project delays'}
          </p>
        </div>

        {/* Metric 4: Max Projected Slippage */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              Max Schedule Variance
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Worst-case</span>
          </div>
          <p className={`text-xl sm:text-2xl font-black font-mono ${portfolioForecasts.maxSlippageDays > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {portfolioForecasts.maxSlippageDays > 0 ? `+${portfolioForecasts.maxSlippageDays} Days` : '0 Days'}
          </p>
          <p className="text-[11px] text-slate-500 truncate">
            Longest critical path slip before mitigation
          </p>
        </div>
      </div>

      {/* 📊 Visual Multi-Graph Container */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-4">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Project Completion Date Projections &amp; Trend Extrapolations
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Statistical forecast curves derived from actual Earned Value (EV), Planned Value (PV), and historical SPI/CPI performance.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Chart Mode Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveChartMode('comparison')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  activeChartMode === 'comparison'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Project Slippage (Days)
              </button>
              <button
                onClick={() => setActiveChartMode('scurve')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  activeChartMode === 'scurve'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                S-Curve Extrapolation
              </button>
              <button
                onClick={() => setActiveChartMode('indices')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  activeChartMode === 'indices'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                SPI / CPI Historical
              </button>
            </div>

            {/* Project Selector for S-Curve / Indices */}
            {activeChartMode !== 'comparison' && (
              <select
                value={selectedProjectId}
                onChange={e => {
                  setSelectedProjectId(e.target.value);
                  setSimulatedSPIBonus(0);
                }}
                className="bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.projectName} ({p.projectCode})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Render Active Chart */}
        <div className="h-72 sm:h-80 md:h-96 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {activeChartMode === 'comparison' ? (
              <BarChart data={comparisonBarData} margin={{ top: 15, right: 15, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Variance (Days)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                <Tooltip
                  wrapperStyle={{ zIndex: 50, pointerEvents: 'none' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5">
                          <p className="font-bold text-white text-sm">{d.fullName} ({d.name})</p>
                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                            <div>
                              <span className="text-slate-400 block">Target Baseline:</span>
                              <span className="font-mono text-slate-200 font-bold">{d.targetDate}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Forecast Date:</span>
                              <span className="font-mono text-indigo-300 font-bold">{d.forecastDate}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-[11px]">
                            <span className="text-slate-400">Schedule Variance:</span>
                            <span className={`font-mono font-bold ${d.varianceDays > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {d.varianceDays > 0 ? `+${d.varianceDays}d Delay` : `${Math.abs(d.varianceDays)}d Ahead`}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-400">Current SPI / CPI:</span>
                            <span className="font-mono text-slate-200">{d.spi.toFixed(2)} / {d.cpi.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
                <Bar
                  dataKey="varianceDays"
                  name="Schedule Variance (Days)"
                  radius={[4, 4, 0, 0]}
                  fill="#6366f1"
                  onClick={(data: any) => {
                    if (data && data.projectId && onOpenForecastModal) {
                      onOpenForecastModal(data.projectId);
                    }
                  }}
                  cursor="pointer"
                />
              </BarChart>
            ) : activeChartMode === 'scurve' ? (
              <ComposedChart data={baseForecast.trendTimeline} margin={{ top: 15, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="period" stroke="#64748b" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={v => `$${Math.round(v / 1000)}k`} />
                <Tooltip
                  wrapperStyle={{ zIndex: 50, pointerEvents: 'none' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                  formatter={(val: any) => val ? [`$${Number(val).toLocaleString()}`, ''] : ['N/A', '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Line type="monotone" name="Planned Baseline (PV)" dataKey="plannedValue" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" name="Actual Earned Value (EV)" dataKey="earnedValue" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: '#10b981' }} />
                <Line type="monotone" name="Projected EV (Likely)" dataKey="projectedEVLikely" stroke="#6366f1" strokeWidth={2.5} strokeDasharray="3 3" dot={false} />
                <Line type="monotone" name="Projected EV (Risk Drag)" dataKey="projectedEVPessimistic" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="2 2" dot={false} />
              </ComposedChart>
            ) : (
              <LineChart data={baseForecast.trendTimeline.filter(t => !t.isProjected)} margin={{ top: 15, right: 20, left: -15, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="period" stroke="#64748b" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 9, fill: '#94a3b8' }} domain={[0.4, 1.8]} />
                <Tooltip
                  wrapperStyle={{ zIndex: 50, pointerEvents: 'none' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <ReferenceLine y={1.0} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Target 1.0', fill: '#f59e0b', fontSize: 10 }} />
                <Line type="monotone" name="Schedule Index (SPI)" dataKey="spi" stroke="#818cf8" strokeWidth={2.5} dot={{ r: 3, fill: '#818cf8' }} />
                <Line type="monotone" name="Cost Index (CPI)" dataKey="cpi" stroke="#a855f7" strokeWidth={2} dot={{ r: 3, fill: '#a855f7' }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 📋 Project-Wise Forecast Cards Grid */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            Project-Wise Completion Forecasts ({filteredForecasts.length})
          </h3>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Projects ({portfolioForecasts.projectForecasts.length})</option>
              <option value="delayed">⚠️ Delayed / At Risk ({portfolioForecasts.totalAtRiskProjects + portfolioForecasts.totalCriticalProjects})</option>
              <option value="on_track">🟢 On Target Baseline ({portfolioForecasts.totalAheadProjects})</option>
              <option value="ahead">🚀 Ahead of Schedule</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredForecasts.map(projForecast => {
            const isSelected = projForecast.projectId === selectedProjectId;

            return (
              <div
                key={projForecast.projectId}
                className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-all space-y-4 shadow-sm flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-500 ring-1 ring-indigo-500/50 bg-slate-900/90'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {projForecast.projectCode}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1 truncate">
                      {projForecast.projectName}
                    </h4>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono border shrink-0 ${
                      projForecast.deliveryStatus === 'ahead' || projForecast.deliveryStatus === 'on_track'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : projForecast.deliveryStatus === 'at_risk'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {projForecast.scheduleVarianceDays > 0
                      ? `+${projForecast.scheduleVarianceDays}d Delay`
                      : projForecast.scheduleVarianceDays < 0
                      ? `${Math.abs(projForecast.scheduleVarianceDays)}d Ahead`
                      : 'On Baseline'}
                  </span>
                </div>

                {/* Forecast Completion Highlight */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Forecast Completion:</span>
                    <span>Target Baseline:</span>
                  </div>
                  <div className="flex justify-between items-baseline font-mono">
                    <span className="text-base font-black text-white">
                      {formatFriendlyDate(projForecast.forecastCompletionDate)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatFriendlyDate(projForecast.baselineEndDate)}
                    </span>
                  </div>
                </div>

                {/* SPI / CPI & Confidence Strip */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center text-xs">
                  <div className={`rounded-lg p-1 transition-all ${projForecast.currentSPI < 0.9 ? 'bg-rose-500/15 border border-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.25)]' : ''}`}>
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                      SPI {projForecast.currentSPI < 0.9 && <span className="text-rose-400 font-bold text-[9px]">(&lt;0.9)</span>}
                    </span>
                    <span className={`font-bold font-mono ${getEVMTextColorClass(projForecast.currentSPI, 0.9)}`}>
                      {projForecast.currentSPI.toFixed(2)}
                    </span>
                  </div>
                  <div className={`rounded-lg p-1 transition-all ${projForecast.currentCPI < 0.9 ? 'bg-rose-500/15 border border-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.25)]' : ''}`}>
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                      CPI {projForecast.currentCPI < 0.9 && <span className="text-rose-400 font-bold text-[9px]">(&lt;0.9)</span>}
                    </span>
                    <span className={`font-bold font-mono ${getEVMTextColorClass(projForecast.currentCPI, 0.9)}`}>
                      {projForecast.currentCPI.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-1">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Confidence</span>
                    <span className="font-bold text-indigo-400 font-mono">
                      {projForecast.confidenceScore}%
                    </span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      setSelectedProjectId(projForecast.projectId);
                      if (onSelectProject) onSelectProject(projForecast.projectId);
                    }}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Select in Chart
                  </button>

                  <button
                    onClick={() => {
                      if (onOpenForecastModal) {
                        onOpenForecastModal(projForecast.projectId);
                      }
                    }}
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                  >
                    Full Forecast Dossier <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
