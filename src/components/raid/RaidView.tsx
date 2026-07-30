import React, { useState, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { RaidItem, RaidType, RaidSeverity } from '../../types';
import {
  ShieldAlert,
  AlertTriangle,
  Plus,
  Sparkles,
  Edit2,
  Trash2,
  Filter,
  CheckCircle2,
  HelpCircle,
  Link,
  Lock,
  Eye
} from 'lucide-react';

interface RaidViewProps {
  onOpenRaidModal: (item?: RaidItem) => void;
}

export const RaidView: React.FC<RaidViewProps> = ({ onOpenRaidModal }) => {
  const { projectData, saveRaidItem, deleteRaidItem, currentUser, customAiConfig } = useProject();

  const isPM = currentUser?.role === 'pm';

  const currentStakeholder = useMemo(() => {
    return projectData.stakeholders.find(
      s => s.email.toLowerCase() === currentUser?.email.toLowerCase()
    );
  }, [projectData.stakeholders, currentUser?.email]);

  const canEditRaidItem = (item: RaidItem) => {
    if (isPM) return true;
    if (item.createdBy && item.createdBy === currentUser?.id) return true;
    if (item.createdByEmail && item.createdByEmail.toLowerCase() === currentUser?.email.toLowerCase()) return true;
    if (item.ownerId && currentStakeholder && item.ownerId === currentStakeholder.id) return true;
    if (item.ownerId && item.ownerId === currentUser?.id) return true;
    return false;
  };

  const [activeTab, setActiveTab] = useState<RaidType | 'all'>('all');
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{ id: string; text: string } | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState<string | null>(null);

  const filteredItems = projectData.raidItems.filter(
    item => activeTab === 'all' ? true : item.type === activeTab
  );

  // Trigger Gemini AI Risk Advisor
  const analyzeRiskWithAi = async (item: RaidItem) => {
    setIsLoadingAi(item.id);
    try {
      const res = await fetch('/api/ai/risk-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raidItem: item, project: projectData, customAiConfig })
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setAiAnalysisResult({ id: item.id, text: data.analysis });
      } else {
        alert(data.error || 'Failed to generate AI risk mitigation analysis');
      }
    } catch (e: any) {
      alert('Error calling AI Risk Advisor: ' + e.message);
    } finally {
      setIsLoadingAi(null);
    }
  };

  return (
    <div id="raid-view" className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <h2 className="text-base sm:text-xl font-bold text-slate-100 truncate">RAID Management & Risk Mitigation Suite</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Tracking Risks, Assumptions, Issues, and Dependencies with 4x4 matrix scoring and Gemini AI mitigation analysis.
          </p>
        </div>

        <button
          onClick={() => onOpenRaidModal()}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-md shadow-rose-600/20 shrink-0 self-start sm:self-auto whitespace-nowrap"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Log RAID Item</span>
        </button>
      </div>

      {/* Filter Tabs - Responsive Grid without horizontal scroll */}
      <div className="grid grid-cols-5 w-full bg-slate-900 border border-slate-800 p-1 sm:p-1.5 rounded-xl text-[11px] sm:text-xs min-w-0">
        {(['all', 'risk', 'assumption', 'issue', 'dependency'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-1.5 sm:py-2 px-1 text-center font-bold capitalize transition-colors rounded-lg truncate ${
              activeTab === tab
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'all' ? (
              <>
                <span className="hidden sm:inline">All Items</span>
                <span className="sm:hidden">All</span>
              </>
            ) : tab === 'dependency' ? (
              <>
                <span className="hidden sm:inline">Dependencies</span>
                <span className="sm:hidden">Deps</span>
              </>
            ) : tab === 'assumption' ? (
              <>
                <span className="hidden sm:inline">Assumptions</span>
                <span className="sm:hidden">Assump.</span>
              </>
            ) : (
              `${tab}s`
            )}
          </button>
        ))}
      </div>

      {/* RAID Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-800/80">
          {filteredItems.map(item => {
            const owner = projectData.stakeholders.find(s => s.id === item.ownerId);
            const isAnalyzing = isLoadingAi === item.id;
            const hasAiResult = aiAnalysisResult?.id === item.id;

            return (
              <div key={item.id} className="p-4 sm:p-5 space-y-3 transition-colors min-w-0 overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider shrink-0 ${
                      item.type === 'risk' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      item.type === 'issue' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      item.type === 'assumption' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                      'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    }`}>
                      {item.type}
                    </span>
                    <h3 className="font-bold text-slate-100 text-sm truncate">{item.title}</h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 text-xs shrink-0">
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                      Status: {item.status}
                    </span>

                    {item.type === 'risk' && (
                      <span className="font-mono font-bold text-rose-400">
                        Score: {item.riskScore || 6} (Imp: {item.impact} / Prob: {item.probability})
                      </span>
                    )}

                    {/* AI Advisor Button */}
                    <button
                      onClick={() => analyzeRiskWithAi(item)}
                      disabled={isAnalyzing}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isAnalyzing ? 'Analyzing...' : 'AI Mitigation Advisor'}</span>
                    </button>

                    {canEditRaidItem(item) ? (
                      <>
                        <button
                          onClick={() => onOpenRaidModal(item)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                          title="Edit RAID Item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteRaidItem(item.id)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300"
                          title="Delete RAID Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => onOpenRaidModal(item)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1 border border-slate-700"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5 text-teal-400" />
                          <span>View</span>
                        </button>
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-semibold text-slate-500 flex items-center gap-1" title="Read-only: Logged by another user">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>Read-Only</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  {item.description}
                </p>

                {/* Mitigation & Contingency Strategy */}
                {(item.mitigationStrategy || item.contingencyPlan) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {item.mitigationStrategy && (
                      <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
                        <span className="font-bold text-emerald-400">Mitigation Strategy:</span>
                        <p className="text-slate-300 mt-1">{item.mitigationStrategy}</p>
                      </div>
                    )}
                    {item.contingencyPlan && (
                      <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
                        <span className="font-bold text-amber-400">Contingency Plan:</span>
                        <p className="text-slate-300 mt-1">{item.contingencyPlan}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Advice Output Display */}
                {hasAiResult && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/60 to-slate-950 border border-purple-500/40 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-purple-300 font-bold">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Gemini AI Mitigation Recommendation</span>
                    </div>
                    <div className="prose prose-invert prose-xs max-w-none text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                      {aiAnalysisResult.text}
                    </div>
                  </div>
                )}

                {/* Owner & Target Date Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 text-[11px] text-slate-400 pt-1">
                  <span className="truncate">Owner: {owner?.name || 'Unassigned'} ({owner?.role || 'Stakeholder'})</span>
                  <span className="shrink-0">Target Resolution: {item.targetResolutionDate || 'TBD'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
