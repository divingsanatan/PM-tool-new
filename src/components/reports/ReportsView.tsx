import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { FileText, Sparkles, Download, Copy, Check, Printer } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { projectData, metrics } = useProject();
  const [reportText, setReportText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics, project: projectData })
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-100">Automated AI Executive Reporting Suite</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Generate C-level status reports, SPI/CPI trend commentary, and export shareable project briefs.
          </p>
        </div>

        <button
          onClick={generateReport}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-purple-500/20 transition-all hover:scale-105"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{isGenerating ? 'Analyzing with Gemini...' : 'Generate New Status Report'}</span>
        </button>
      </div>

      {/* Report Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-slate-100 text-base">Project Status & EVM Executive Brief</h3>
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
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
            >
              Generate Executive Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
