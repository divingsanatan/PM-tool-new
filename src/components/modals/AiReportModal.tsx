import React, { useState, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  X,
  Sparkles,
  Copy,
  Check,
  Key,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  Clock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  FileText,
  Download,
  Filter,
  Search,
  CheckCircle2,
  RefreshCw,
  Zap,
  HelpCircle,
  Link as LinkIcon,
  User,
  Activity
} from 'lucide-react';
import { calculatePredictiveRisks, PredictedBlocker } from '../../utils/predictiveRiskUtils';
import { triggerHaptic } from '../../utils/haptics';

interface AiReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAiSettingsModal?: () => void;
}

export const AiReportModal: React.FC<AiReportModalProps> = ({
  isOpen,
  onClose,
  onOpenAiSettingsModal
}) => {
  const { projectData, metrics, customAiConfig } = useProject();
  const [activeTab, setActiveTab] = useState<'brief' | 'predictive' | 'trends'>('predictive');
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null);

  // Filter states for predictive risk radar
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'immediate' | 'upcoming' | 'monitored'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'dependency' | 'issue' | 'risk' | 'assumption' | 'schedule'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate live predictive risk indicators from RAID items & EVM indices
  const predictiveSummary = useMemo(() => {
    return calculatePredictiveRisks(projectData, metrics);
  }, [projectData, metrics]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    triggerHaptic('impact');
    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics,
          project: projectData,
          customAiConfig,
          predictiveData: {
            exposureScore: predictiveSummary.exposureScore,
            threatLevel: predictiveSummary.threatLevel,
            trendDirection: predictiveSummary.trendDirection,
            blockerCount: predictiveSummary.blockerCount
          }
        })
      });
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
        setActiveTab('brief');
        triggerHaptic('success');
      } else {
        alert(data.error || 'Failed to generate report');
        triggerHaptic('warning');
      }
    } catch (e: any) {
      alert('AI Report error: ' + e.message);
      triggerHaptic('warning');
    } finally {
      setLoading(false);
    }
  };

  const isCustomKeyActive = customAiConfig?.enabled && customAiConfig?.apiKey;
  const activeProviderLabel = isCustomKeyActive
    ? `${customAiConfig.provider.toUpperCase()} (${customAiConfig.model || 'Custom Model'})`
    : 'Google Gemini 3.7 Flash (System Default)';

  const handleCopyReport = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    triggerHaptic('selection');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReport = () => {
    const element = document.createElement('a');
    const content = report || `# Predictive Risk & Project Status Report\n\nGenerated: ${new Date().toISOString()}\nThreat Level: ${predictiveSummary.threatLevel}\nExposure Score: ${predictiveSummary.exposureScore}/100\n\n## Key Recommendations\n${predictiveSummary.keyRecommendations.map(r => `- ${r}`).join('\n')}`;
    const file = new Blob([content], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${projectData.projectName.replace(/\s+/g, '_')}_Predictive_Risk_Report_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    triggerHaptic('selection');
  };

  const handleCopyAction = (actionText: string, id: string) => {
    navigator.clipboard.writeText(actionText);
    setCopiedActionId(id);
    triggerHaptic('selection');
    setTimeout(() => setCopiedActionId(null), 2000);
  };

  // Filter predicted blockers
  const filteredBlockers = predictiveSummary.predictedBlockers.filter(blocker => {
    if (urgencyFilter !== 'all' && blocker.urgency !== urgencyFilter) return false;
    if (typeFilter !== 'all' && blocker.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        blocker.title.toLowerCase().includes(q) ||
        blocker.description.toLowerCase().includes(q) ||
        blocker.affectedScope.toLowerCase().includes(q) ||
        blocker.preventativeAction.toLowerCase().includes(q) ||
        (blocker.ownerName && blocker.ownerName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getThreatBadge = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'Elevated':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Moderate':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'dependency':
        return <LinkIcon className="w-3.5 h-3.5 text-purple-400" />;
      case 'issue':
        return <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />;
      case 'risk':
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />;
      case 'assumption':
        return <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl h-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 via-indigo-500/20 to-purple-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-base sm:text-lg">
                  Executive AI Report & Predictive Risk Forecaster
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getThreatBadge(predictiveSummary.threatLevel)}`}>
                  {predictiveSummary.threatLevel} Blocker Risk
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AI Synthesis with proactive RAID trend analysis & early blocker mitigation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadReport}
              title="Download Report as Markdown"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SUBHEADER: AI ENGINE STATUS & NAVIGATION TABS */}
        <div className="bg-slate-950/40 border-b border-slate-800/80 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setActiveTab('predictive');
                triggerHaptic('selection');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'predictive'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Predictive Risk Radar</span>
              {predictiveSummary.blockerCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-slate-900/80 text-[10px] flex items-center justify-center text-amber-200 font-mono">
                  {predictiveSummary.blockerCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('brief');
                triggerHaptic('selection');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'brief'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>AI Executive Synthesis</span>
              {report && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('trends');
                triggerHaptic('selection');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'trends'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>RAID Trend Matrix</span>
            </button>
          </div>

          {/* Engine & Settings */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] text-slate-400">Engine:</span>
              <span className="font-mono text-[11px] text-slate-200 font-semibold">{activeProviderLabel}</span>
            </div>
            {onOpenAiSettingsModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAiSettingsModal();
                }}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium hover:underline"
              >
                Configure
              </button>
            )}
          </div>
        </div>

        {/* MAIN BODY AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-slate-900/50">
          
          {/* TAB 1: PREDICTIVE RISK RADAR */}
          {activeTab === 'predictive' && (
            <div className="space-y-6">
              {/* TOP KPI CARDS FOR PREDICTIVE RISK */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Exposure Score */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Predictive Risk Score
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getThreatBadge(predictiveSummary.threatLevel)}`}>
                      {predictiveSummary.threatLevel}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black font-mono text-slate-100">
                      {predictiveSummary.exposureScore}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">/ 100</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        predictiveSummary.exposureScore >= 75
                          ? 'bg-rose-500'
                          : predictiveSummary.exposureScore >= 50
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${predictiveSummary.exposureScore}%` }}
                    />
                  </div>
                </div>

                {/* 2. Earliest Blocker Horizon */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Earliest Blocker Horizon
                    </span>
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-amber-300">
                      {predictiveSummary.earliestBlockerHorizonDays !== null
                        ? `~${predictiveSummary.earliestBlockerHorizonDays} Days`
                        : 'None Projected'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {predictiveSummary.earliestBlockerHorizonDays !== null && predictiveSummary.earliestBlockerHorizonDays <= 3
                      ? 'Immediate proactive action required'
                      : 'Monitoring active RAID trend triggers'}
                  </p>
                </div>

                {/* 3. Potential Bottlenecks */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Predicted Blockers
                    </span>
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black font-mono text-slate-100">
                      {predictiveSummary.blockerCount}
                    </span>
                    <span className="text-[11px] text-slate-400">items flagged</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="text-purple-300 font-medium">{predictiveSummary.criticalDependenciesCount} Deps</span>
                    <span>•</span>
                    <span className="text-rose-300 font-medium">{predictiveSummary.openIssuesCount} Issues</span>
                    <span>•</span>
                    <span className="text-amber-300 font-medium">{predictiveSummary.highRisksCount} Risks</span>
                  </div>
                </div>

                {/* 4. Risk Trend Direction */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Trend Direction
                    </span>
                    {predictiveSummary.trendDirection === 'deteriorating' ? (
                      <TrendingDown className="w-4 h-4 text-rose-400" />
                    ) : predictiveSummary.trendDirection === 'improving' ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Activity className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-lg font-bold capitalize ${
                        predictiveSummary.trendDirection === 'deteriorating'
                          ? 'text-rose-400'
                          : predictiveSummary.trendDirection === 'improving'
                          ? 'text-emerald-400'
                          : 'text-blue-400'
                      }`}
                    >
                      {predictiveSummary.trendDirection === 'deteriorating'
                        ? 'Escalating Threat'
                        : predictiveSummary.trendDirection === 'improving'
                        ? 'Stabilized & Mitigated'
                        : 'Stable Baseline'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Based on SPI {metrics.spi} and RAID resolution rate
                  </p>
                </div>
              </div>

              {/* AI EARLY INTERVENTIONS PLAYBOOK */}
              <div className="bg-gradient-to-br from-indigo-950/40 via-slate-950/70 to-slate-950/90 border border-indigo-500/20 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Proactive Mitigation Playbook (Early Interventions)
                    </h4>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-md"
                  >
                    {loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span>{loading ? 'Synthesizing...' : 'Generate Full Executive Brief'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                  {predictiveSummary.keyRecommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-300"
                    >
                      <div className="w-5 h-5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="leading-relaxed">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* PREDICTIVE BLOCKERS RADAR STREAM */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <span>Live Blocker Radar & Predicted Bottlenecks</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-mono">
                        {filteredBlockers.length}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Items trending toward milestone blockage with pre-emptive mitigation actions
                    </p>
                  </div>

                  {/* Filter Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Urgency Filter */}
                    <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                      {(['all', 'immediate', 'upcoming', 'monitored'] as const).map(u => (
                        <button
                          key={u}
                          onClick={() => {
                            setUrgencyFilter(u);
                            triggerHaptic('selection');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] capitalize font-medium transition-all ${
                            urgencyFilter === u
                              ? 'bg-slate-800 text-slate-100 shadow-sm'
                              : 'text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          {u === 'immediate' ? '🚨 Immediate' : u}
                        </button>
                      ))}
                    </div>

                    {/* Search */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Filter blockers..."
                        className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-36 sm:w-44"
                      />
                    </div>
                  </div>
                </div>

                {filteredBlockers.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-200">No Blockers Projected</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      All active RAID items are within safe tolerance limits or no items match your current filter parameters.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3.5">
                    {filteredBlockers.map(blocker => (
                      <div
                        key={blocker.id}
                        className={`bg-slate-950/80 border rounded-2xl p-4 sm:p-5 space-y-3.5 transition-all hover:border-slate-700 ${
                          blocker.urgency === 'immediate'
                            ? 'border-rose-500/40 bg-rose-950/10'
                            : blocker.urgency === 'upcoming'
                            ? 'border-amber-500/30 bg-amber-950/10'
                            : 'border-slate-800/80'
                        }`}
                      >
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 text-slate-200 uppercase tracking-wider">
                              {getTypeIcon(blocker.type)}
                              <span>{blocker.type}</span>
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                                blocker.severity === 'critical'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : blocker.severity === 'high'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              }`}
                            >
                              {blocker.severity} Severity
                            </span>

                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              {blocker.probability}% Blocker Probability
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Projected Horizon:</span>
                            <span className="font-semibold text-amber-300">
                              {blocker.predictedHorizonDays} {blocker.predictedHorizonDays === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h5 className="font-bold text-slate-100 text-sm">{blocker.title}</h5>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            {blocker.description}
                          </p>
                        </div>

                        {/* Leading Indicator & Scope Impact */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Leading Indicator / Trend Trigger
                            </span>
                            <p className="text-slate-300 text-[11px]">{blocker.leadingIndicator}</p>
                          </div>

                          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Vulnerable Scope / Deliverable
                            </span>
                            <p className="text-slate-300 text-[11px] font-medium text-amber-300/90 truncate">
                              {blocker.affectedScope}
                            </p>
                          </div>
                        </div>

                        {/* Preventative Action Box */}
                        <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 p-3 rounded-xl border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                              Recommended Pre-Emptive Mitigation
                            </span>
                            <p className="text-slate-200 text-xs leading-relaxed">
                              {blocker.preventativeAction}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {blocker.ownerName && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                                <User className="w-3 h-3 text-slate-500" />
                                <span className="truncate max-w-[100px]">{blocker.ownerName}</span>
                              </div>
                            )}

                            <button
                              onClick={() => handleCopyAction(blocker.preventativeAction, blocker.id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1 border border-slate-700 transition-colors"
                              title="Copy preventative action plan"
                            >
                              {copiedActionId === blocker.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-300">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Action</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AI EXECUTIVE SYNTHESIS (MARKDOWN REPORT) */}
          {activeTab === 'brief' && (
            <div className="space-y-5">
              {!report && !loading && (
                <div className="text-center py-12 space-y-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 p-8">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-slate-100">Ready to Generate Executive Brief</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Gemini will analyze your live EVM metrics (SPI: {metrics.spi}, CPI: {metrics.cpi}), active tasks, and RAID trend trajectory into a formal status & predictive risk brief.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerate}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-indigo-600 to-purple-600 hover:opacity-90 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 mx-auto"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Generate Executive AI Brief Now</span>
                  </button>
                </div>
              )}

              {loading && (
                <div className="text-center py-16 space-y-4 bg-slate-950/60 rounded-2xl border border-slate-800 p-8">
                  <Sparkles className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-indigo-300">
                      Synthesizing Project EVM Indices & RAID Predictive Trends...
                    </p>
                    <p className="text-xs text-slate-500">
                      Evaluating schedule variance, dependency bottlenecks, and early risk horizons
                    </p>
                  </div>
                </div>
              )}

              {report && !loading && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-300">Generated Executive Brief</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Live Analysis Ready
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyReport}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={handleDownloadReport}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export .md</span>
                      </button>
                      <button
                        onClick={handleGenerate}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Regenerate</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto custom-scrollbar select-text">
                    {report}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RAID TREND MATRIX */}
          {activeTab === 'trends' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">RAID Trend Inventory Breakdown</h4>
                    <p className="text-xs text-slate-400">
                      Detailed risk exposure scores and dependency linkages across all registered items
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                    {projectData.raidItems?.length || 0} Total Logged
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Title</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Severity / Impact</th>
                        <th className="py-2.5 px-3">Risk Score</th>
                        <th className="py-2.5 px-3">Blocker Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {(projectData.raidItems || []).map((item, idx) => {
                        const isResolved = item.status.toLowerCase().includes('resolved') || item.status.toLowerCase().includes('closed') || item.status.toLowerCase().includes('mitigated');
                        const isHigh = (item.severity || item.impact || '').toLowerCase() === 'high' || (item.severity || item.impact || '').toLowerCase() === 'critical';
                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-900/60 transition-colors">
                            <td className="py-3 px-3">
                              <span className="flex items-center gap-1.5 font-bold uppercase text-[10px]">
                                {getTypeIcon(item.type)}
                                <span>{item.type}</span>
                              </span>
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-200 max-w-xs truncate">
                              {item.title}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                  isResolved
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                  isHigh
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {item.severity || item.impact || 'Medium'}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono">
                              {item.riskScore || (isHigh ? '12' : '6')}
                            </td>
                            <td className="py-3 px-3">
                              {!isResolved && (item.type === 'dependency' || item.type === 'issue' || isHigh) ? (
                                <span className="text-amber-400 font-semibold text-[11px] flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                                  Potential Blocker
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">Low Probability</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-950/80 border-t border-slate-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>SPI: <strong className="text-slate-200">{metrics.spi}</strong></span>
            <span>•</span>
            <span>CPI: <strong className="text-slate-200">{metrics.cpi}</strong></span>
            <span>•</span>
            <span>Predictive Blocker Exposure: <strong className="text-amber-300">{predictiveSummary.exposureScore}/100</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 via-indigo-600 to-purple-600 hover:opacity-90 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>{loading ? 'Synthesizing...' : 'Generate AI Brief'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
