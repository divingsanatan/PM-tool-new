import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { RaidItem } from '../../types';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Edit3,
  Save,
  MessageSquare,
  TrendingUp,
  Filter,
  Info,
  Shield,
  User
} from 'lucide-react';

export const RiskMatrixWidget: React.FC<{ onNavigate?: (view: any) => void }> = ({ onNavigate }) => {
  const { projectData } = useProject();
  const [selectedCell, setSelectedCell] = useState<{ prob: string; impact: string } | null>(null);
  const [isEditingComment, setIsEditingComment] = useState(false);
  
  // Custom executive comment state
  const [customComment, setCustomComment] = useState<string>('');

  const raidItems = projectData.raidItems || [];
  // Filter for risks and issues (or all logged items)
  const risks = raidItems.filter(item => item.type === 'risk' || item.type === 'issue' || item.probability || item.impact);

  // Helper to map probability and impact strings to matrix keys ('low', 'medium', 'high')
  const normalizeLevel = (val?: string): 'low' | 'medium' | 'high' => {
    if (!val) return 'medium';
    const lower = val.toLowerCase();
    if (lower === 'critical' || lower === 'high') return 'high';
    if (lower === 'low') return 'low';
    return 'medium';
  };

  // Matrix data structure: prob x impact
  const matrixProbabilities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
  const matrixImpacts: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

  const getCellRisks = (prob: 'high' | 'medium' | 'low', impact: 'low' | 'medium' | 'high') => {
    return risks.filter(r => {
      const p = normalizeLevel(r.probability || r.severity);
      const i = normalizeLevel(r.impact || r.severity);
      return p === prob && i === impact;
    });
  };

  // Counts across zones
  let criticalZoneCount = 0; // High Prob & High Impact
  let highZoneCount = 0;     // High/Med & High/Med
  let totalActiveRisks = 0;

  risks.forEach(r => {
    if (r.status !== 'closed' && r.status !== 'resolved') {
      totalActiveRisks++;
      const p = normalizeLevel(r.probability || r.severity);
      const i = normalizeLevel(r.impact || r.severity);
      if (p === 'high' && i === 'high') criticalZoneCount++;
      else if ((p === 'high' && i === 'medium') || (p === 'medium' && i === 'high')) highZoneCount++;
    }
  });

  // Cell styling function
  const getCellBgClass = (prob: string, impact: string, isSelected: boolean) => {
    let base = '';
    if (prob === 'high' && impact === 'high') {
      base = 'bg-rose-950/60 border-rose-500/40 text-rose-200 hover:bg-rose-900/60';
    } else if ((prob === 'high' && impact === 'medium') || (prob === 'medium' && impact === 'high')) {
      base = 'bg-amber-950/50 border-amber-500/40 text-amber-200 hover:bg-amber-900/50';
    } else if (prob === 'medium' && impact === 'medium') {
      base = 'bg-yellow-950/40 border-yellow-500/30 text-yellow-200 hover:bg-yellow-900/40';
    } else if ((prob === 'high' && impact === 'low') || (prob === 'low' && impact === 'high')) {
      base = 'bg-slate-900/90 border-slate-700/60 text-slate-300 hover:bg-slate-800/60';
    } else {
      base = 'bg-slate-950/80 border-slate-800/80 text-slate-400 hover:bg-slate-900/80';
    }

    if (isSelected) {
      base += ' ring-2 ring-indigo-400 shadow-lg scale-[1.02]';
    }
    return base;
  };

  // Filtered risks list for display
  const displayedRisks = selectedCell
    ? getCellRisks(selectedCell.prob as any, selectedCell.impact as any)
    : risks;

  // Generate dynamic executive summary comment if custom comment is empty
  const defaultExecutiveComment = (() => {
    if (risks.length === 0) {
      return "No active risks or issues logged in the project registry. Risk exposure is optimal.";
    }
    if (criticalZoneCount > 0) {
      return `Critical Exposure Alert: ${criticalZoneCount} risk(s) reside in the High-Probability / High-Impact Red Zone. Immediate executive oversight and contingency plans are required to mitigate potential schedule and budget variance.`;
    }
    if (highZoneCount > 0) {
      return `Elevated Risk Profile: ${highZoneCount} risk(s) identified with high probability or severe impact. Active monitoring and resource buffer allocation recommended for upcoming sprint deliverables.`;
    }
    return `Balanced Risk Status: Total ${risks.length} logged risk items are contained within manageable low/medium tolerance thresholds. Standard monitoring controls are in place.`;
  })();

  const activeCommentText = customComment.trim() ? customComment : defaultExecutiveComment;

  // Get owner name helper
  const getOwnerName = (ownerId?: string) => {
    const owner = (projectData.stakeholders || []).find(s => s.id === ownerId);
    return owner ? owner.name : 'Unassigned';
  };

  return (
    <div className="bg-slate-900 border border-slate-800/80 p-4 sm:p-5 rounded-2xl shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
            <ShieldAlert className="w-5 h-5 text-rose-300" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                Risk Probability & Impact Matrix
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap">
                3x3 Heatmap
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Quantitative likelihood vs impact matrix coupled with executive commentary.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {selectedCell && (
            <button
              onClick={() => setSelectedCell(null)}
              className="text-xs text-slate-400 hover:text-slate-200 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1"
            >
              <Filter className="w-3 h-3" />
              <span>Clear Filter</span>
            </button>
          )}
          {onNavigate && (
            <button
              onClick={() => onNavigate('raid')}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium bg-slate-950/60 px-3 py-1 rounded-lg border border-slate-800/80 transition-colors"
            >
              <span>Full RAID Log</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid + Commentary Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT / TOP: 3x3 Heatmap Matrix (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Likelihood vs Impact Heatmap</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Click cell to filter items
            </span>
          </div>

          {/* Matrix Box */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            {/* Y-axis Label & Matrix Grid */}
            <div className="flex gap-2">
              {/* Y-axis Probability Header */}
              <div className="flex flex-col justify-between py-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-5 shrink-0 text-center">
                <span className="rotate-[-90deg] origin-center translate-y-2">High</span>
                <span className="rotate-[-90deg] origin-center">Med</span>
                <span className="rotate-[-90deg] origin-center -translate-y-2">Low</span>
              </div>

              {/* 3x3 Grid Cells */}
              <div className="flex-1 grid grid-cols-3 gap-2">
                {matrixProbabilities.map((prob) =>
                  matrixImpacts.map((impact) => {
                    const cellItems = getCellRisks(prob, impact);
                    const isSelected = selectedCell?.prob === prob && selectedCell?.impact === impact;
                    const cellBg = getCellBgClass(prob, impact, isSelected);

                    return (
                      <div
                        key={`${prob}-${impact}`}
                        onClick={() => {
                          if (isSelected) setSelectedCell(null);
                          else setSelectedCell({ prob, impact });
                        }}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer min-h-[72px] flex flex-col justify-between ${cellBg}`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-semibold opacity-90">
                          <span className="capitalize">{prob[0].toUpperCase() + prob.slice(1)} Prob</span>
                          <span className="font-mono font-bold">{cellItems.length}</span>
                        </div>

                        <div className="my-1 flex flex-wrap gap-1">
                          {cellItems.slice(0, 3).map((item) => (
                            <span
                              key={item.id}
                              className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-900/80 border border-slate-700/80 truncate max-w-[90px]"
                              title={item.title}
                            >
                              {item.id.replace('raid-', 'R-')}
                            </span>
                          ))}
                          {cellItems.length > 3 && (
                            <span className="text-[9px] font-mono opacity-80 self-center">
                              +{cellItems.length - 3}
                            </span>
                          )}
                        </div>

                        <div className="text-[9px] font-medium opacity-70 text-right capitalize">
                          {impact} Imp
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* X-axis Impact Header */}
            <div className="flex justify-between pl-7 pr-1 pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
              <span className="w-1/3">Low Impact</span>
              <span className="w-1/3">Med Impact</span>
              <span className="w-1/3">High Impact</span>
            </div>
          </div>

          {/* Matrix Legend */}
          <div className="flex flex-wrap items-center justify-between text-[11px] gap-2 pt-1 text-slate-400 px-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-500/80 inline-block shrink-0" />
                <span>Critical Red</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-500/80 inline-block shrink-0" />
                <span>High Orange</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-yellow-500/70 inline-block shrink-0" />
                <span>Moderate Yellow</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-slate-700 inline-block shrink-0" />
                <span>Low Tolerance</span>
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT / BOTTOM: Executive Commentary Box (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 flex-1 flex flex-col justify-between">
            <div>
              {/* Commentary Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                  <h4 className="font-bold text-slate-100 text-xs sm:text-sm">
                    Executive Risk Commentary
                  </h4>
                </div>
                <button
                  onClick={() => {
                    if (isEditingComment) {
                      setIsEditingComment(false);
                    } else {
                      setCustomComment(activeCommentText);
                      setIsEditingComment(true);
                    }
                  }}
                  className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition-colors"
                >
                  {isEditingComment ? (
                    <>
                      <Save className="w-3 h-3" />
                      <span>Done</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3 h-3" />
                      <span>Edit Note</span>
                    </>
                  )}
                </button>
              </div>

              {/* Exposure Badge */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border uppercase tracking-wide ${
                    criticalZoneCount > 0
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : highZoneCount > 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {criticalZoneCount > 0
                    ? 'Critical Red Exposure'
                    : highZoneCount > 0
                    ? 'Elevated Risk Profile'
                    : 'Low Risk Tolerance'}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {totalActiveRisks} Active Risks
                </span>
              </div>

              {/* Comment Content / Editor */}
              {isEditingComment ? (
                <div className="space-y-2">
                  <textarea
                    value={customComment}
                    onChange={(e) => setCustomComment(e.target.value)}
                    placeholder="Enter custom executive risk assessment commentary..."
                    className="w-full h-28 p-2.5 rounded-xl bg-slate-900 border border-indigo-500/40 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setCustomComment('')}
                      className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                    >
                      Reset to AI Default
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-2">
                  <p>{activeCommentText}</p>
                </div>
              )}
            </div>

            {/* Quick Action / Highlighted Risk */}
            <div className="pt-3 border-t border-slate-800/80 text-xs space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Top Priority Active Item
              </span>
              {risks.length > 0 ? (
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-200 truncate text-xs">
                      {risks[0].title}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Owner: {getOwnerName(risks[0].ownerId)}</span>
                      <span>•</span>
                      <span className="capitalize text-amber-400 font-mono">
                        {risks[0].impact || 'High'} Imp / {risks[0].probability || 'Med'} Prob
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 italic">No risks logged.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FILTERED RISK TABLE BELOW MATRIX */}
      <div className="pt-2 border-t border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
          <span className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {selectedCell
                ? `Risks in ${selectedCell.prob.toUpperCase()} Probability / ${selectedCell.impact.toUpperCase()} Impact Zone (${displayedRisks.length})`
                : `All Logged Project Risks & Issues (${displayedRisks.length})`}
            </span>
          </span>
          {selectedCell && (
            <button
              onClick={() => setSelectedCell(null)}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
            >
              Show All ({risks.length})
            </button>
          )}
        </div>

        {displayedRisks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 min-w-0">
            {displayedRisks.map((item) => {
              const prob = normalizeLevel(item.probability || item.severity);
              const imp = normalizeLevel(item.impact || item.severity);

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between space-y-2.5 shadow-inner min-w-0 overflow-hidden"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase shrink-0 whitespace-nowrap">
                        {item.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 whitespace-nowrap ${
                          prob === 'high' && imp === 'high'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : prob === 'high' || imp === 'high'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {item.status || 'Active'}
                      </span>
                    </div>

                    <h5 className="font-bold text-xs text-slate-100 line-clamp-2 leading-snug">
                      {item.title}
                    </h5>

                    {item.mitigationStrategy && (
                      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60 min-w-0 overflow-hidden">
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          <strong className="text-slate-300 font-medium">Mitigation: </strong>
                          {item.mitigationStrategy}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-800/60 min-w-0">
                    <span className="flex items-center gap-1 font-mono text-slate-300 min-w-0 truncate">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{getOwnerName(item.ownerId)}</span>
                    </span>

                    <span className="font-mono text-slate-300 shrink-0 whitespace-nowrap">
                      Score: <strong className="text-indigo-400">{item.riskScore || 6}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center text-xs text-slate-400">
            No risks found in the selected matrix cell quadrant.
          </div>
        )}
      </div>
    </div>
  );
};
