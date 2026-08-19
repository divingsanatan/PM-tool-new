import React, { useState } from 'react';
import { CrossProjectPMPerformance } from '../../utils/portfolioAndLeaveUtils';
import { X, Sparkles, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Download, Copy, Check } from 'lucide-react';

interface PMAiBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pmsList: CrossProjectPMPerformance[];
}

export const PMAiBriefingModal: React.FC<PMAiBriefingModalProps> = ({
  isOpen,
  onClose,
  pmsList
}) => {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const totalCapital = pmsList.reduce((sum, p) => sum + p.totalBudgetManaged, 0);
  const avgSPI = pmsList.length > 0
    ? (pmsList.reduce((sum, p) => sum + p.aggregateSPI, 0) / pmsList.length).toFixed(2)
    : '1.00';
  const avgCPI = pmsList.length > 0
    ? (pmsList.reduce((sum, p) => sum + p.aggregateCPI, 0) / pmsList.length).toFixed(2)
    : '1.00';
  const criticalPMs = pmsList.filter(p => p.overallStatus === 'critical' || p.criticalRisks > 0);
  const topPM = [...pmsList].sort((a, b) => b.compositeHealthScore - a.compositeHealthScore)[0];

  const executiveSynthesis = `EXECUTIVE PMO LEADERSHIP SYNTHESIS
Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
Target Focus: Project Managers (PMs) Delivery Performance Across Portfolio

1. EXECUTIVE SUMMARY & PORTFOLIO HEALTH
The organization currently deploys ${pmsList.length} Project Managers governing a combined capital allocation of $${(totalCapital / 1000).toFixed(0)}k across ${pmsList.reduce((sum, p) => sum + p.managedProjects.length, 0)} active initiatives.
• Portfolio Schedule Index (SPI): ${avgSPI} (Baseline: 1.0)
• Portfolio Cost Index (CPI): ${avgCPI} (Cost Efficiency: Strong)
• Overall PM Delivery Reliability: ${topPM ? `${topPM.name} leads organizational benchmark with ${topPM.compositeHealthScore}/100 Health Rating` : 'Stable'}

2. PM PERFORMANCE BREAKDOWN
${pmsList.map(pm => `• ${pm.name} (${pm.title}):
  - Projects: ${pm.managedProjects.map(pr => `${pr.projectCode} (${pr.projectName})`).join(', ')}
  - Metrics: SPI ${pm.aggregateSPI.toFixed(2)} | CPI ${pm.aggregateCPI.toFixed(2)} | Health Score: ${pm.compositeHealthScore}/100
  - Execution: ${pm.completedTasksManaged}/${pm.totalTasksManaged} Tasks Completed (${pm.taskCompletionRate}%), ${pm.achievedMilestones} Milestones Achieved
  - Risk Status: ${pm.criticalRisks > 0 ? `${pm.criticalRisks} Critical Risks under watch` : 'Zero unmitigated critical risks'}
  - Availability: ${pm.isOnLeave ? 'Currently on Approved Leave (Substitute active)' : 'Active Duty'}`).join('\n\n')}

3. STRATEGIC EXECUTIVE RECOMMENDATIONS
${criticalPMs.length > 0 
  ? `• Provide immediate PMO triage support on projects led by ${criticalPMs.map(c => c.name).join(', ')} to alleviate critical risk blockers and maintain schedule baseline.`
  : '• PM leadership across all active streams is operating within approved governance tolerances. Proceed with planned quarterly release gates.'}
• Ensure cross-project knowledge sharing of Agile and EVM tracking best practices from top-performing PMs.
• Review upcoming planned leaves to ensure seamless substitute PM handover and uninterrupted sprint velocity.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(executiveSynthesis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([executiveSynthesis], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Executive_PM_Briefing_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">AI Executive PM Leadership Briefing</h3>
              <p className="text-xs text-slate-400">Automated executive digest on Project Managers across all projects</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 font-sans">
          <div className="bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap selection:bg-indigo-500 selection:text-white">
            {executiveSynthesis}
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Briefing
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
          >
            Close Briefing
          </button>
        </div>
      </div>
    </div>
  );
};
