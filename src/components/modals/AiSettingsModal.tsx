import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { AiProvider, CustomAiConfig } from '../../types';
import {
  Sparkles,
  Key,
  ShieldCheck,
  Check,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
  Server,
  Zap,
  Globe,
  RefreshCw,
  Info,
  CheckCircle2,
  Sliders
} from 'lucide-react';

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDER_OPTIONS: { id: AiProvider; label: string; desc: string; defaultModel: string; defaultBaseUrl?: string; icon: string }[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    desc: 'Official Gemini API key. Supports gemini-3.6-flash, gemini-3.1-pro-preview, etc.',
    defaultModel: 'gemini-3.6-flash',
    icon: '✨'
  },
  {
    id: 'openai',
    label: 'OpenAI',
    desc: 'Official OpenAI API key. Supports gpt-4o, gpt-4o-mini, o3-mini.',
    defaultModel: 'gpt-4o-mini',
    defaultBaseUrl: 'https://api.openai.com/v1',
    icon: '🤖'
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    desc: 'Official Anthropic API key. Supports claude-3-5-sonnet, claude-3-5-haiku.',
    defaultModel: 'claude-3-5-sonnet-20241022',
    icon: '🧠'
  },
  {
    id: 'deepseek',
    label: 'DeepSeek AI',
    desc: 'DeepSeek API key. Supports deepseek-chat, deepseek-reasoner.',
    defaultModel: 'deepseek-chat',
    defaultBaseUrl: 'https://api.deepseek.com',
    icon: '🐋'
  },
  {
    id: 'groq',
    label: 'Groq Cloud',
    desc: 'Groq LPU API key for ultra-fast open models (Llama 3.3, Mixtral).',
    defaultModel: 'llama-3.3-70b-versatile',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    icon: '⚡'
  },
  {
    id: 'custom',
    label: 'Custom OpenAI-Compatible',
    desc: 'Any OpenAI-compatible API endpoint (LocalAI, Ollama, vLLM, OpenRouter).',
    defaultModel: 'gpt-3.5-turbo',
    defaultBaseUrl: 'https://api.openai.com/v1',
    icon: '🌐'
  }
];

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({ isOpen, onClose }) => {
  const { customAiConfig, updateCustomAiConfig } = useProject();

  const [enabled, setEnabled] = useState(customAiConfig.enabled || false);
  const [provider, setProvider] = useState<AiProvider>(customAiConfig.provider || 'gemini');
  const [apiKey, setApiKey] = useState(customAiConfig.apiKey || '');
  const [model, setModel] = useState(customAiConfig.model || 'gemini-3.6-flash');
  const [baseUrl, setBaseUrl] = useState(customAiConfig.baseUrl || '');

  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEnabled(customAiConfig.enabled || false);
      setProvider(customAiConfig.provider || 'gemini');
      setApiKey(customAiConfig.apiKey || '');
      setModel(customAiConfig.model || PROVIDER_OPTIONS.find(p => p.id === (customAiConfig.provider || 'gemini'))?.defaultModel || 'gemini-3.6-flash');
      setBaseUrl(customAiConfig.baseUrl || PROVIDER_OPTIONS.find(p => p.id === (customAiConfig.provider || 'gemini'))?.defaultBaseUrl || '');
      setTestResult(null);
      setSavedNotice(false);
    }
  }, [isOpen, customAiConfig]);

  if (!isOpen) return null;

  const handleProviderChange = (pId: AiProvider) => {
    setProvider(pId);
    const selectedP = PROVIDER_OPTIONS.find(p => p.id === pId);
    if (selectedP) {
      setModel(selectedP.defaultModel);
      if (selectedP.defaultBaseUrl) {
        setBaseUrl(selectedP.defaultBaseUrl);
      } else {
        setBaseUrl('');
      }
    }
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const startTime = Date.now();

    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customConfig: {
            enabled: true,
            provider,
            apiKey: apiKey.trim(),
            model: model.trim(),
            baseUrl: baseUrl.trim()
          }
        })
      });

      const latencyMs = Date.now() - startTime;
      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || `Connected successfully! Response received in ${latencyMs}ms.`,
          latencyMs
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Connection failed. Please double-check your API key and settings.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error while attempting to connect to server.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const newConfig: CustomAiConfig = {
      enabled: apiKey.trim() !== '' ? enabled : false,
      provider,
      apiKey: apiKey.trim(),
      model: model.trim(),
      baseUrl: baseUrl.trim()
    };

    updateCustomAiConfig(newConfig);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 600);
  };

  const handleClear = () => {
    const cleared: CustomAiConfig = {
      enabled: false,
      provider: 'gemini',
      apiKey: '',
      model: 'gemini-3.6-flash',
      baseUrl: ''
    };
    updateCustomAiConfig(cleared);
    setEnabled(false);
    setApiKey('');
    setModel('gemini-3.6-flash');
    setBaseUrl('');
    setTestResult(null);
  };

  const currentProviderObj = PROVIDER_OPTIONS.find(p => p.id === provider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-md animate-fadeIn overflow-hidden">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-100">AI API Key & Model Settings</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Custom Provider Integration
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Link your custom API key (Gemini, OpenAI, Claude, DeepSeek, Groq) or fall back to system defaults.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-200 text-xs">
          {/* Master Enable Toggle */}
          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-100">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Use Custom AI Key for AI Features</span>
              </div>
              <p className="text-[11px] text-slate-400">
                When enabled, status reports, risk mitigations, and AI suggestions will use your linked API key and rate limits.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 self-start sm:self-auto">
              <input
                type="checkbox"
                checked={enabled}
                onChange={e => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {!enabled && (
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-2.5 text-blue-300 text-xs">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">System Default Key Active:</span> All AI features are currently running on the server's built-in Gemini API key. Enable custom mode above to link your own API key.
              </div>
            </div>
          )}

          {/* Provider Selection Grid */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              1. Select AI Provider
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {PROVIDER_OPTIONS.map(opt => {
                const isSelected = provider === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleProviderChange(opt.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500 text-slate-100 shadow-md ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{opt.icon}</span>
                        <span className="font-bold text-xs text-slate-100">{opt.label}</span>
                      </div>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                      )}
                    </div>
                    <p className="text-[10px] line-clamp-2 text-slate-400">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              2. Enter {currentProviderObj?.label} API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder={`Paste your ${currentProviderObj?.label} API Key here...`}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono pr-10 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              Your API key is transmitted directly to our secure server environment for processing and stored locally in your browser.
            </p>
          </div>

          {/* Model Name & Optional Base URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Model Name / Alias
              </label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="e.g. gemini-3.6-flash, gpt-4o-mini"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {(provider === 'openai' || provider === 'deepseek' || provider === 'groq' || provider === 'custom') && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Custom Base URL
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  placeholder="e.g. https://api.openai.com/v1"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Test Connection Button & Status Box */}
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !apiKey.trim()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    <span>Testing Connection...</span>
                  </>
                ) : (
                  <>
                    <Server className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Test Connection & Key Ping</span>
                  </>
                )}
              </button>

              {apiKey.trim() && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Clear Saved Key</span>
                </button>
              )}
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2 text-xs animate-fadeIn ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">
                    {testResult.success ? 'Connection Verified!' : 'Connection Failed'}
                  </div>
                  <div className="text-[11px] mt-0.5 leading-relaxed">{testResult.message}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted in memory & local session</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5"
            >
              {savedNotice ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Save AI Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
