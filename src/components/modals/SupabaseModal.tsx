import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Copy, Check, Server, ArrowUpRight, ArrowDownLeft, Code2, ExternalLink, ShieldCheck, Zap } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    connected: boolean;
    url: string;
    tableExists: boolean;
    projectCount: number;
    activeProjectsInMemory: number;
    errorMessage?: string;
    sqlScript: string;
  } | null>(null);

  const [copiedSql, setCopiedSql] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/supabase/status');
      const data = await res.json();
      setStatus(data);
    } catch (err: any) {
      setStatus({
        connected: false,
        url: 'https://icvuibdumunumdztxbbq.supabase.co',
        tableExists: false,
        projectCount: 0,
        activeProjectsInMemory: 1,
        errorMessage: err.message || 'Failed to reach server endpoint',
        sqlScript: `CREATE TABLE IF NOT EXISTS public.app_projects (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySql = () => {
    if (status?.sqlScript) {
      navigator.clipboard.writeText(status.sqlScript);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    }
  };

  const handlePushSync = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/supabase/sync-push', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionMessage('✅ Successfully pushed all local projects into Supabase database!');
        await fetchStatus();
      } else {
        setActionMessage(`❌ Push failed: ${data.error}`);
      }
    } catch (err: any) {
      setActionMessage(`❌ Push error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePullSync = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/supabase/sync-pull', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionMessage('✅ Successfully pulled latest projects from Supabase database!');
        await fetchStatus();
      } else {
        setActionMessage(`❌ Pull failed: ${data.error}`);
      }
    } catch (err: any) {
      setActionMessage(`❌ Pull error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-100 flex items-center gap-2">
                <span>Supabase Cloud Integration</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LIVE DB
                </span>
              </h2>
              <p className="text-xs text-slate-400">Database synchronization & table schema management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Connection Status Banner */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">Supabase Endpoint</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${status?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-xs font-semibold text-slate-300">
                  {status?.connected ? 'Connected to Supabase' : 'Offline / Checking'}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-xs text-emerald-300 break-all flex items-center justify-between">
              <span>{status?.url || 'https://icvuibdumunumdztxbbq.supabase.co'}</span>
              <a
                href={status?.url}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-emerald-400 transition-colors"
                title="Open Supabase Dashboard"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-2" />
              </a>
            </div>

            {/* Health Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <span className="text-slate-400 block text-[11px] mb-1">Database Table (`app_projects`):</span>
                <div className="flex items-center gap-2">
                  {status?.tableExists ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ready ({status.projectCount} stored projects)
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Table needed (Run SQL below)
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <span className="text-slate-400 block text-[11px] mb-1">In-Memory Active Projects:</span>
                <span className="font-bold text-indigo-300">{status?.activeProjectsInMemory ?? 1} projects synced</span>
              </div>
            </div>
          </div>

          {/* Action Message Toast */}
          {actionMessage && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs text-slate-200 font-medium animate-fade-in shadow-md">
              {actionMessage}
            </div>
          )}

          {/* Sync Actions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Real-Time Cloud Synchronization</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handlePushSync}
                disabled={loading}
                className="p-3.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
              >
                <ArrowUpRight className="w-4 h-4 text-indigo-400" />
                <span>Push Local State to Supabase</span>
              </button>

              <button
                onClick={handlePullSync}
                disabled={loading}
                className="p-3.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                <span>Pull State from Supabase</span>
              </button>
            </div>
          </div>

          {/* SQL Setup Script */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span>Supabase SQL Table Initialization Script</span>
              </label>
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 px-2.5 py-1 rounded-lg border border-indigo-500/30 transition-colors"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste this in your Supabase Dashboard <code className="text-indigo-300">SQL Editor</code> to create the <code className="text-emerald-300">app_projects</code> table if it doesn't exist yet:
            </p>

            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400/90 overflow-x-auto custom-scrollbar leading-relaxed">
              {status?.sqlScript || `CREATE TABLE IF NOT EXISTS public.app_projects (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Re-check Database</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
