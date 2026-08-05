import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { SprintFilter } from '../common/SprintFilter';
import { FileText, Sparkles, Download, Copy, Check, Printer, Layers, Calendar, CheckCircle, Clock } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { projectData, metrics, customAiConfig } = useProject();
  const [reportText, setReportText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedSprintIds, setSelectedSprintIds] = useState<string[]>([]);

  const sprints = projectData.sprints || [];
  const isSprintFiltered = selectedSprintIds.length > 0 && selectedSprintIds.length < sprints.length;

  const filteredTasks = isSprintFiltered
    ? projectData.tasks.filter(t => t.sprintId && selectedSprintIds.includes(t.sprintId))
    : projectData.tasks;

  const filteredFeatures = isSprintFiltered
    ? projectData.features.filter(f =>
        (f.sprintId && selectedSprintIds.includes(f.sprintId)) ||
        filteredTasks.some(t => t.featureId === f.id)
      )
    : projectData.features;

  // Compute sprint scoped metrics
  const completedTasks = filteredTasks.filter(t => t.status === 'done');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
  const taskCompletionRate = filteredTasks.length > 0 ? Math.round((completedTasks.length / filteredTasks.length) * 100) : 0;

  const sprintPlannedCost = filteredTasks.reduce((sum, t) => sum + (t.plannedCost || 0), 0);
  const sprintActualCost = filteredTasks.reduce((sum, t) => sum + (t.actualCost || 0), 0);
  const sprintEarnedValue = filteredTasks.reduce((sum, t) => sum + ((t.plannedCost || 0) * (t.completionPercent || 0) / 100), 0);

  const sprintSpi = sprintPlannedCost > 0 ? Number((sprintEarnedValue / sprintPlannedCost).toFixed(2)) : metrics.spi;
  const sprintCpi = sprintActualCost > 0 ? Number((sprintEarnedValue / sprintActualCost).toFixed(2)) : metrics.cpi;

  const selectedSprintNames = selectedSprintIds.map(id => sprints.find(s => s.id === id)?.name).filter(Boolean) as string[];

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const activeMetrics = isSprintFiltered
        ? {
            ...metrics,
            spi: sprintSpi,
            cpi: sprintCpi,
            plannedValue: sprintPlannedCost,
            actualCost: sprintActualCost,
            earnedValue: sprintEarnedValue
          }
        : metrics;

      const filteredProject = isSprintFiltered
        ? {
            ...projectData,
            tasks: filteredTasks,
            features: filteredFeatures
          }
        : projectData;

      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: activeMetrics,
          project: filteredProject,
          customAiConfig,
          selectedSprintNames: selectedSprintNames.length > 0 ? selectedSprintNames : ['Entire Project'],
          sprintData: {
            taskCount: filteredTasks.length,
            completedTaskCount: completedTasks.length,
            completionPercent: taskCompletionRate,
            plannedCost: sprintPlannedCost,
            actualCost: sprintActualCost,
            earnedValue: sprintEarnedValue
          }
        })
      });
      const data = await res.json();
      if (data.success && data.report) {
        setReportText(data.report);
      } else {
        alert(data.error || 'Failed to generate report');
      }
    } catch (e: any) {
      alert('Report generation error: ' + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="reports-view" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-100">Automated AI Executive Reporting Suite</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Generate C-level status reports, SPI/CPI trend commentary, and export shareable project briefs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SprintFilter
            sprints={sprints}
            selectedSprintIds={selectedSprintIds}
            onChange={setSelectedSprintIds}
          />

          <button
            onClick={generateReport}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-purple-500/20 transition-all hover:scale-105"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{isGenerating ? 'Analyzing with Gemini...' : 'Generate New Status Report'}</span>
          </button>
        </div>
      </div>

      {/* Filtered Scope Summary Bar */}
      {isSprintFiltered && (
        <div className="bg-purple-950/40 border border-purple-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 text-purple-300 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-200">Sprint Filter Active:</span>
                <span className="text-xs font-semibold text-white bg-purple-900/60 border border-purple-500/30 px-2 py-0.5 rounded">
                  {selectedSprintNames.join(', ')}
                </span>
              </div>
              <p className="text-[11px] text-purple-300/80 mt-0.5">
                Executive analytics and AI commentary are dynamically scoped to the selected sprint deliverables.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <div className="text-[10px] text-purple-300/70 uppercase tracking-wider">Tasks</div>
              <div className="font-bold text-white">{completedTasks.length} / {filteredTasks.length} ({taskCompletionRate}%)</div>
            </div>
            <div className="h-8 w-px bg-purple-500/30" />
            <div className="text-right">
              <div className="text-[10px] text-purple-300/70 uppercase tracking-wider">Sprint SPI / CPI</div>
              <div className="font-bold text-emerald-400">{sprintSpi} / {sprintCpi}</div>
            </div>
          </div>
        </div>
      )}

      {/* Report Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-slate-100 text-base">
              {isSprintFiltered ? `Sprint Status Brief: ${selectedSprintNames.join(', ')}` : 'Project Status & EVM Executive Brief'}
            </h3>
            <p className="text-xs text-slate-400">Generated on {new Date().toLocaleDateString()}</p>
          </div>

          {reportText && (
            <div className="flex items-center gap-2">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF</span>
              </button>
            </div>
          )}
        </div>

        {reportText ? (
          <div className="prose prose-invert prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap font-sans bg-slate-950/70 p-5 rounded-xl border border-slate-800">
            {reportText}
          </div>
        ) : (
          <div className="text-center py-12 space-y-3 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
            <Sparkles className="w-8 h-8 text-indigo-400 mx-auto animate-pulse" />
            <h4 className="font-bold text-slate-200 text-sm">No Report Generated Yet</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Click the button above to have Gemini AI analyze your current Earned Value Management metrics, active tasks, and RAID risks into an executive summary report.
            </p>
            <button
              onClick={generateReport}
              disabled={isGenerating}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30"
            >
              Generate Executive Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

