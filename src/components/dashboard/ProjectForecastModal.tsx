import React, { useState, useMemo } from 'react';
import { ProjectData } from '../../types';
import {
  calculateProjectForecast,
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
  X,
  Layers,
  BarChart3,
  Info,
  ArrowRight,
  Zap,
  Target,
  FileSpreadsheet
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
  Area,
  ComposedChart
} from 'recharts';

interface ProjectForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectData[];
  initialProjectId?: string;
}

export const ProjectForecastModal: React.FC<ProjectForecastModalProps> = ({
  isOpen,
  onClose,
  projects,
  initialProjectId
}) => {
  if (!isOpen) return null;

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId || projects[0]?.id || ''
  );
  const [selectedScenario, setSelectedScenario] = useState<'most_likely' | 'optimistic' | 'pessimistic'>('most_likely');
  const [activeVisualMode, setActiveVisualMode] = useState<'scurve' | 'indices'>('scurve');

  // What-If Simulator state
  const [simulatedSPIBonus, setSimulatedSPIBonus] = useState<number>(0); // -0.3 to +0.5

  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  const baseForecast = useMemo(() => {
    if (!selectedProject) return null;
    return calculateProjectForecast(selectedProject);
  }, [selectedProject]);

  // Simulated live forecast when what-if slider is adjusted
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

  if (!baseForecast || !liveForecast || !selectedProject) return null;

  const activeScenarioData = baseForecast.scenarios[
    selectedScenario === 'most_likely' ? 'mostLikely' : selectedScenario
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-start sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 sm:mt-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  EVM Completion Date Forecasting
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono font-bold bg-indigo-100 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 shrink-0">
                  Historical SPI/CPI Engine
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Statistical trajectory modeling, Monte-Carlo schedule simulation &amp; risk-adjusted completion dates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Project Selector */}
            {projects.length > 1 && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Project:</span>
                <select
                  value={selectedProjectId}
                  onChange={e => {
                    setSelectedProjectId(e.target.value);
                    setSimulatedSPIBonus(0);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.projectName} ({p.projectCode})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">
          
          {/* Mobile Project Selector */}
          {projects.length > 1 && (
            <div className="sm:hidden flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">Active Project:</span>
              <select
                value={selectedProjectId}
                onChange={e => {
                  setSelectedProjectId(e.target.value);
                  setSimulatedSPIBonus(0);
                }}
                className="w-full xs:w-auto flex-1 max-w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 truncate"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.projectName} ({p.projectCode})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 🌟 1. Primary Highlight Hero Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            
            {/* Forecast Completion Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 space-y-2.5 sm:space-y-3 relative overflow-hidden shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="text-[11px] uppercase font-bold text-indigo-700 dark:text-indigo-300 tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Forecast Completion Date
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border shrink-0 ${
                    liveForecast.deliveryStatus === 'ahead' || liveForecast.deliveryStatus === 'on_track'
                      ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                      : liveForecast.deliveryStatus === 'at_risk'
                      ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
                      : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
                  }`}
                >
                  {liveForecast.scheduleVarianceDays > 0
                    ? `+${liveForecast.scheduleVarianceDays}d Delay`
                    : liveForecast.scheduleVarianceDays < 0
                    ? `${Math.abs(liveForecast.scheduleVarianceDays)}d Ahead`
                    : 'On Baseline'}
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight break-words">
                  {formatFriendlyDate(liveForecast.forecastCompletionDate)}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span>Target Baseline:</span>
                  <strong className="text-slate-700 dark:text-slate-200 font-mono">
                    {formatFriendlyDate(liveForecast.baselineEndDate)}
                  </strong>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Slippage %:</span>
                  <span className={`font-mono font-bold ${liveForecast.slippagePercent > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {liveForecast.slippagePercent > 0 ? `+${liveForecast.slippagePercent}%` : `${liveForecast.slippagePercent}%`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Req. Catch-up SPI:</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-300">
                    {liveForecast.requiredSPIForTarget.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* EVM Trend Efficiency Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                  EVM Trend Indices
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  CR: <strong className="text-slate-900 dark:text-white">{liveForecast.criticalRatio.toFixed(2)}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className={`p-2.5 sm:p-3 rounded-xl transition-all flex flex-col justify-between ${getEVMCardClass(liveForecast.currentSPI, 0.9)}`}>
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Schedule (SPI)</span>
                      {liveForecast.currentSPI < 0.9 && (
                        <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-rose-500 text-white uppercase animate-pulse shrink-0">Alert</span>
                      )}
                    </div>
                    <p className={`text-lg sm:text-xl font-black font-mono mt-0.5 sm:mt-1 ${getEVMTextColorClass(liveForecast.currentSPI, 0.9)}`}>
                      {liveForecast.currentSPI.toFixed(2)}
                    </p>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-400 block leading-tight mt-1">
                    {liveForecast.currentSPI < 0.9 ? '🚨 Critical Schedule Lag' : liveForecast.currentSPI >= 1.0 ? 'Velocity Optimal' : 'Schedule Dragging'}
                  </span>
                </div>

                <div className={`p-2.5 sm:p-3 rounded-xl transition-all flex flex-col justify-between ${getEVMCardClass(liveForecast.currentCPI, 0.9)}`}>
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Cost (CPI)</span>
                      {liveForecast.currentCPI < 0.9 && (
                        <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-rose-500 text-white uppercase animate-pulse shrink-0">Alert</span>
                      )}
                    </div>
                    <p className={`text-lg sm:text-xl font-black font-mono mt-0.5 sm:mt-1 ${getEVMTextColorClass(liveForecast.currentCPI, 0.9)}`}>
                      {liveForecast.currentCPI.toFixed(2)}
                    </p>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-400 block leading-tight mt-1">
                    {liveForecast.currentCPI < 0.9 ? '🚨 Critical Cost Variance' : liveForecast.currentCPI >= 1.0 ? 'Within Budget' : 'Cost Variance'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 pt-1 gap-1">
                <span>Progress: <strong className="text-slate-800 dark:text-slate-200">{liveForecast.progressPercent}%</strong></span>
                <span>Elapsed: <strong className="text-slate-800 dark:text-slate-200">{liveForecast.elapsedDays}d / {liveForecast.plannedDurationDays}d</strong></span>
              </div>
            </div>

            {/* Forecast Confidence & Reliability */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5 sm:space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    Forecast Confidence
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                      liveForecast.confidenceLevel === 'High'
                        ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                        : liveForecast.confidenceLevel === 'Medium'
                        ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                        : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                    }`}
                  >
                    {liveForecast.confidenceLevel} ({liveForecast.confidenceScore}%)
                  </span>
                </div>

                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden my-2">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      liveForecast.confidenceScore >= 75
                        ? 'bg-emerald-500 dark:bg-emerald-400'
                        : liveForecast.confidenceScore >= 55
                        ? 'bg-amber-500 dark:bg-amber-400'
                        : 'bg-rose-500 dark:bg-rose-400'
                    }`}
                    style={{ width: `${liveForecast.confidenceScore}%` }}
                  />
                </div>

                <div className="space-y-1 pt-1 text-[10px] text-slate-500 dark:text-slate-400">
                  {liveForecast.confidenceFactors.map((f, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="truncate pr-2">{f.label}:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 shrink-0">{f.score}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Projected EAC:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  ${liveForecast.estimateAtCompletion.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* 🎛️ 2. Interactive What-If Velocity & SPI Simulator */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Interactive What-If Schedule Simulator
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono">
                  Live Recalculation
                </span>
              </div>

              {simulatedSPIBonus !== 0 && (
                <button
                  onClick={() => setSimulatedSPIBonus(0)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 self-start sm:self-auto font-semibold"
                >
                  Reset to Actual SPI ({baseForecast.currentSPI.toFixed(2)})
                </button>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500 dark:text-slate-400">Simulate Sprint Delivery Velocity (SPI):</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {liveForecast.currentSPI.toFixed(2)}{' '}
                  {simulatedSPIBonus > 0 ? `(+${simulatedSPIBonus.toFixed(2)})` : simulatedSPIBonus < 0 ? `(${simulatedSPIBonus.toFixed(2)})` : ''}
                </span>
              </div>
              <input
                type="range"
                min="-0.30"
                max="0.50"
                step="0.05"
                value={simulatedSPIBonus}
                onChange={e => setSimulatedSPIBonus(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-0.30 (Drag)</span>
                <span>Baseline ({baseForecast.currentSPI.toFixed(2)})</span>
                <span>+0.50 (Accelerated)</span>
              </div>
            </div>
          </div>

          {/* 📊 3. Visual Trajectory Chart (S-Curve & SPI/CPI Trends) */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                  {activeVisualMode === 'scurve' ? 'EVM S-Curve Delivery & Extrapolation' : 'Historical SPI vs CPI Trendlines'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeVisualMode === 'scurve'
                    ? 'Cumulative Planned Value (PV) vs Actual Earned Value (EV) and Projected Extrapolations'
                    : 'Period-by-period efficiency indices tracked against standard 1.0 baseline'}
                </p>
              </div>

              {/* View Switcher */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto shadow-xs">
                <button
                  onClick={() => setActiveVisualMode('scurve')}
                  className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    activeVisualMode === 'scurve'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  S-Curve Trajectory
                </button>
                <button
                  onClick={() => setActiveVisualMode('indices')}
                  className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    activeVisualMode === 'indices'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  SPI/CPI Trends
                </button>
              </div>
            </div>

            {/* Chart Container */}
            <div className="h-60 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {activeVisualMode === 'scurve' ? (
                  <ComposedChart data={baseForecast.trendTimeline} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="period" stroke="#64748b" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={v => `$${Math.round(v / 1000)}k`} />
                    <Tooltip
                      wrapperStyle={{ zIndex: 50, pointerEvents: 'none' }}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px', color: '#f8fafc' }}
                      formatter={(val: any) => val ? [`$${Number(val).toLocaleString()}`, ''] : ['N/A', '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} iconSize={8} />
                    <Line
                      type="monotone"
                      name="Planned Value (PV)"
                      dataKey="plannedValue"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      name="Actual Earned Value (EV)"
                      dataKey="earnedValue"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 3, fill: '#10b981' }}
                    />
                    <Line
                      type="monotone"
                      name="Projected EV (Likely)"
                      dataKey="projectedEVLikely"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      name="Projected EV (Pessimistic)"
                      dataKey="projectedEVPessimistic"
                      stroke="#f43f5e"
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                      dot={false}
                    />
                  </ComposedChart>
                ) : (
                  <LineChart data={baseForecast.trendTimeline.filter(t => !t.isProjected)} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="period" stroke="#64748b" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 9, fill: '#94a3b8' }} domain={[0.4, 1.8]} />
                    <Tooltip
                      wrapperStyle={{ zIndex: 50, pointerEvents: 'none' }}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px', color: '#f8fafc' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} iconSize={8} />
                    <ReferenceLine y={1.0} stroke="#64748b" strokeDasharray="3 3" label={{ value: 'Target 1.0', fill: '#64748b', fontSize: 10 }} />
                    <Line
                      type="monotone"
                      name="Schedule Index (SPI)"
                      dataKey="spi"
                      stroke="#818cf8"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#818cf8' }}
                    />
                    <Line
                      type="monotone"
                      name="Cost Index (CPI)"
                      dataKey="cpi"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#a855f7' }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* 🎯 4. Tri-Factor Scenarios Comparison */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Tri-Factor Scenario Modeling
              </h4>
              <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono">Statistical Confidence Range</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              
              {/* Scenario 1: Optimistic */}
              <div
                onClick={() => setSelectedScenario('optimistic')}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedScenario === 'optimistic'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 shadow-sm scale-[1.01]'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Optimistic (Recovery)</span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold">SPI 1.0</span>
                </div>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                  {formatFriendlyDate(baseForecast.scenarios.optimistic.forecastDate)}
                </p>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                  <span>Variance:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {baseForecast.scenarios.optimistic.varianceDays <= 0
                      ? `${Math.abs(baseForecast.scenarios.optimistic.varianceDays)}d Ahead`
                      : `+${baseForecast.scenarios.optimistic.varianceDays}d Delay`}
                  </strong>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 leading-tight">
                  {baseForecast.scenarios.optimistic.description}
                </p>
              </div>

              {/* Scenario 2: Most Likely */}
              <div
                onClick={() => setSelectedScenario('most_likely')}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedScenario === 'most_likely'
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500 shadow-sm scale-[1.01]'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Most Likely (SPI Trend)</span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold">
                    SPI {baseForecast.currentSPI.toFixed(2)}
                  </span>
                </div>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                  {formatFriendlyDate(baseForecast.scenarios.mostLikely.forecastDate)}
                </p>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                  <span>Variance:</span>
                  <strong className={baseForecast.scenarios.mostLikely.varianceDays > 0 ? 'text-amber-600 dark:text-amber-400 font-mono' : 'text-emerald-600 dark:text-emerald-400 font-mono'}>
                    {baseForecast.scenarios.mostLikely.varianceDays > 0
                      ? `+${baseForecast.scenarios.mostLikely.varianceDays}d Delay`
                      : `${Math.abs(baseForecast.scenarios.mostLikely.varianceDays)}d Ahead`}
                  </strong>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 leading-tight">
                  {baseForecast.scenarios.mostLikely.description}
                </p>
              </div>

              {/* Scenario 3: Pessimistic */}
              <div
                onClick={() => setSelectedScenario('pessimistic')}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedScenario === 'pessimistic'
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 shadow-sm scale-[1.01]'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400">Pessimistic (Risk Drag)</span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold">
                    CR {baseForecast.criticalRatio.toFixed(2)}
                  </span>
                </div>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                  {formatFriendlyDate(baseForecast.scenarios.pessimistic.forecastDate)}
                </p>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                  <span>Variance:</span>
                  <strong className="text-rose-600 dark:text-rose-400 font-mono">
                    +{baseForecast.scenarios.pessimistic.varianceDays}d Delay
                  </strong>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 leading-tight">
                  {baseForecast.scenarios.pessimistic.description}
                </p>
              </div>
            </div>
          </div>

          {/* 💡 5. AI Narrative & Governance Recommendations */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/30 space-y-3">
            <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Predictive Governance &amp; Recovery Plan
              </h4>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
              {baseForecast.executiveSummary}
            </p>

            {baseForecast.recommendations.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-indigo-200 dark:border-indigo-500/20">
                <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-200">Recommended PM Actions:</span>
                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {baseForecast.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between gap-3">
          <span className="text-[11px] sm:text-xs text-slate-500 font-mono truncate flex-1 min-w-0">
            {selectedProject.projectName} • {selectedProject.projectCode}
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors shrink-0"
          >
            Close Forecast View
          </button>
        </div>
      </div>
    </div>
  );
};
