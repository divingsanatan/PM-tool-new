import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { X, Sparkles, Copy, Check, Key } from 'lucide-react';

interface AiReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAiSettingsModal?: () => void;
}

export const AiReportModal: React.FC<AiReportModalProps> = ({ isOpen, onClose, onOpenAiSettingsModal }) => {
  const { projectData, metrics, customAiConfig } = useProject();
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics, project: projectData, customAiConfig })
      });
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
      } else {
        alert(data.error || 'Failed to generate report');
      }
    } catch (e: any) {
      alert('AI Report error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const isCustomKeyActive = customAiConfig?.enabled && customAiConfig?.apiKey;
  const activeProviderLabel = isCustomKeyActive
    ? `${customAiConfig.provider.toUpperCase()} (${customAiConfig.model || 'Custom Model'})`
    : 'Google Gemini 3.6 Flash (System Default)';

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl h-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <h3 className="font-bold text-slate-100 text-base sm:text-lg">
              Executive AI Report Generator
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">

        {/* AI Key Status Badge */}
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">Active Engine:</span>
            <span className="font-mono font-bold text-slate-200">{activeProviderLabel}</span>
            {isCustomKeyActive && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Custom Key
              </span>
            )}
          </div>
          {onOpenAiSettingsModal && (
            <button
              onClick={() => {
                onClose();
                onOpenAiSettingsModal();
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Manage API Key</span>
            </button>
          )}
        </div>

        {!report && !loading && (
          <div className="text-center py-8 space-y-3">
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Click below to generate a comprehensive status report based on your live SPI ({metrics.spi}), CPI ({metrics.cpi}), active tasks, and RAID risks.
            </p>
            <button
              onClick={handleGenerate}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-500/20"
            >
              Generate Executive Report Now
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-12 space-y-3">
            <Sparkles className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-indigo-300">
              Analyzing project EVM indices & RAID log with Gemini...
            </p>
          </div>
        )}

        {report && !loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Generated Markdown Executive Brief</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleGenerate}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Regenerate
                </button>
              </div>
            </div>

            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
              {report}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
