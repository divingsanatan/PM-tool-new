import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { ShieldCheck, User, Users, CheckCircle2, AlertTriangle, ChevronRight, BarChart3, PieChart, Layers, Target, CheckSquare } from 'lucide-react';
import { aggregateRaciForHierarchy, getTaskRaci } from '../../utils/raciUtils';

export const RaciChartWidget: React.FC = () => {
  const { projectData } = useProject();
  const [selectedView, setSelectedView] = useState<'stakeholders' | 'hierarchy'>('stakeholders');

  const stakeholders = projectData.stakeholders || [];
  const tasks = projectData.tasks || [];

  // Compute RACI counts per stakeholder across all tasks
  const stakeholderRaciStats = stakeholders.map(s => {
    let rCount = 0;
    let aCount = 0;
    let cCount = 0;
    let iCount = 0;

    tasks.forEach(t => {
      const raci = getTaskRaci(t);
      if (raci.responsible.includes(s.id)) rCount++;
      if (raci.accountable.includes(s.id)) aCount++;
      if (raci.consulted.includes(s.id)) cCount++;
      if (raci.informed.includes(s.id)) iCount++;
    });

    const totalInvolvements = rCount + aCount + cCount + iCount;

    return {
      stakeholder: s,
      rCount,
      aCount,
      cCount,
      iCount,
      totalInvolvements
    };
  });

  const totalTasks = tasks.length;
  const tasksWithoutAccountable = tasks.filter(t => getTaskRaci(t).accountable.length === 0);

  // Total role counts overall
  const totalR = stakeholderRaciStats.reduce((acc, curr) => acc + curr.rCount, 0);
  const totalA = stakeholderRaciStats.reduce((acc, curr) => acc + curr.aCount, 0);
  const totalC = stakeholderRaciStats.reduce((acc, curr) => acc + curr.cCount, 0);
  const totalI = stakeholderRaciStats.reduce((acc, curr) => acc + curr.iCount, 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-5">
      {/* Widget Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4 min-w-0">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-slate-100 leading-snug">RACI Governance Overview</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 whitespace-nowrap shrink-0">
                Live Distribution Graph
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Graphical breakdown of stakeholder assignments across Responsible, Accountable, Consulted, and Informed roles.
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0 self-start lg:self-auto flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setSelectedView('stakeholders')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedView === 'stakeholders' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>By Stakeholder</span>
          </button>
          <button
            onClick={() => setSelectedView('hierarchy')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedView === 'hierarchy' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>Hierarchy Rollover</span>
          </button>
        </div>
      </div>

      {/* 4 RACI Graphical Role Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Responsible (R) Card */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              [R] Responsible
            </span>
            <span className="text-lg font-extrabold text-emerald-400 font-mono">{totalR}</span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-1">Executes the work</p>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (totalR / (totalTasks || 1)) * 100)}%` }}></div>
          </div>
        </div>

        {/* Accountable (A) Card */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-purple-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
              [A] Accountable
            </span>
            <span className="text-lg font-extrabold text-purple-400 font-mono">{totalA}</span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-1">Approves & owns outcome</p>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.min(100, (totalA / (totalTasks || 1)) * 100)}%` }}></div>
          </div>
        </div>

        {/* Consulted (C) Card */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-blue-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-500/40">
              [C] Consulted
            </span>
            <span className="text-lg font-extrabold text-blue-400 font-mono">{totalC}</span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-1">2-way input & guidance</p>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (totalC / (totalTasks || 1)) * 100)}%` }}></div>
          </div>
        </div>

        {/* Informed (I) Card */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded text-xs font-black bg-slate-500/20 text-slate-300 border border-slate-500/40">
              [I] Informed
            </span>
            <span className="text-lg font-extrabold text-slate-300 font-mono">{totalI}</span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-1">Kept updated on progress</p>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div className="bg-slate-400 h-full rounded-full" style={{ width: `${Math.min(100, (totalI / (totalTasks || 1)) * 100)}%` }}></div>
          </div>
        </div>
      </div>

      {tasksWithoutAccountable.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Governance Alert: {tasksWithoutAccountable.length} tasks have no Accountable owner assigned [A]. Use the WBS list view to tag RACI roles.</span>
        </div>
      )}

      {/* VIEW 1: STAKEHOLDER GRAPHICAL BREAKDOWN */}
      {selectedView === 'stakeholders' && (
        <div className="space-y-4 pt-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
            Stakeholder RACI Role Distribution Chart
          </h4>

          <div className="space-y-3">
            {stakeholderRaciStats.map(({ stakeholder: s, rCount, aCount, cCount, iCount, totalInvolvements }) => {
              const maxVal = Math.max(1, totalTasks);
              const rPct = Math.round((rCount / maxVal) * 100);
              const aPct = Math.round((aCount / maxVal) * 100);
              const cPct = Math.round((cCount / maxVal) * 100);
              const iPct = Math.round((iCount / maxVal) * 100);

              return (
                <div key={s.id} className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <img src={s.avatar} className="w-7 h-7 rounded-full border border-slate-700 shrink-0" alt="" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-100">{s.name}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                            {s.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Role Pill Counters */}
                    <div className="flex items-center gap-1.5 text-xs shrink-0">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-[11px]" title="Responsible Tasks">
                        R: {rCount}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold text-[11px]" title="Accountable Tasks">
                        A: {aCount}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold text-[11px]" title="Consulted Tasks">
                        C: {cCount}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-500/15 text-slate-300 border border-slate-500/30 font-bold text-[11px]" title="Informed Tasks">
                        I: {iCount}
                      </span>
                    </div>
                  </div>

                  {/* Graphical Multi-Segment Stacked Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden flex">
                      {rCount > 0 && (
                        <div
                          className="bg-emerald-500 h-full border-r border-slate-950"
                          style={{ width: `${rPct}%` }}
                          title={`Responsible: ${rCount} tasks (${rPct}%)`}
                        />
                      )}
                      {aCount > 0 && (
                        <div
                          className="bg-purple-500 h-full border-r border-slate-950"
                          style={{ width: `${aPct}%` }}
                          title={`Accountable: ${aCount} tasks (${aPct}%)`}
                        />
                      )}
                      {cCount > 0 && (
                        <div
                          className="bg-blue-500 h-full border-r border-slate-950"
                          style={{ width: `${cPct}%` }}
                          title={`Consulted: ${cCount} tasks (${cPct}%)`}
                        />
                      )}
                      {iCount > 0 && (
                        <div
                          className="bg-slate-400 h-full"
                          style={{ width: `${iPct}%` }}
                          title={`Informed: ${iCount} tasks (${iPct}%)`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: HIERARCHY ROLLOVER DISTRIBUTION */}
      {selectedView === 'hierarchy' && (
        <div className="space-y-4 pt-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
            Rolled-Over RACI Governance by Milestone & Epic
          </h4>

          <div className="space-y-3">
            {projectData.milestones.map(milestone => {
              const mRaci = aggregateRaciForHierarchy('milestone', milestone.id, projectData);
              const milestoneEpics = projectData.epics.filter(e => e.milestoneId === milestone.id);

              return (
                <div key={milestone.id} className="bg-slate-950/80 rounded-xl border border-amber-500/30 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-slate-100 text-sm">{milestone.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Milestone
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                        R: {mRaci.responsible.length}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 font-bold border border-purple-500/30">
                        A: {mRaci.accountable.length}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 font-bold border border-blue-500/30">
                        C: {mRaci.consulted.length}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-500/15 text-slate-300 font-bold border border-slate-500/30">
                        I: {mRaci.informed.length}
                      </span>
                    </div>
                  </div>

                  {/* Epic Rollover Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-0 sm:pl-2">
                    {milestoneEpics.map(epic => {
                      const eRaci = aggregateRaciForHierarchy('epic', epic.id, projectData);

                      return (
                        <div key={epic.id} className="bg-slate-900/90 p-2.5 rounded-lg border border-purple-500/20 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span className="font-semibold text-xs text-slate-200 truncate">{epic.title}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 text-[10px] font-black">
                            {eRaci.responsible.length > 0 && <span className="text-emerald-400">R:{eRaci.responsible.length}</span>}
                            {eRaci.accountable.length > 0 && <span className="text-purple-400">A:{eRaci.accountable.length}</span>}
                            {eRaci.consulted.length > 0 && <span className="text-blue-400">C:{eRaci.consulted.length}</span>}
                            {eRaci.informed.length > 0 && <span className="text-slate-400">I:{eRaci.informed.length}</span>}
                          </div>
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
    </div>
  );
};
