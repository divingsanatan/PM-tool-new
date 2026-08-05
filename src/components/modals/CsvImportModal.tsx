import React, { useState, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { generateWbsCsvTemplate, exportProjectToCsv, parseAndImportCsv, CsvImportResult } from '../../utils/csvImportExport';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Database,
  Layers,
  FolderGit2,
  CheckSquare,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const { projectData, importWbsData } = useProject();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [parseResult, setParseResult] = useState<CsvImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const templateContent = generateWbsCsvTemplate();
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `WBS_Import_Template_${projectData.projectCode || 'PRJ'}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCurrentData = () => {
    const csvContent = exportProjectToCsv(projectData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `WBS_Full_Data_${projectData.projectCode || 'PRJ'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setParseResult(null);
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        setCsvContent(text);
        const result = parseAndImportCsv(text, projectData);
        setParseResult(result);
      } catch (err: any) {
        setParseError(err.message || 'Failed to parse CSV file. Please check format.');
      }
    };
    reader.onerror = () => {
      setParseError('Failed to read selected CSV file.');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv') || file.type.includes('csv') || file.type.includes('spreadsheet')) {
        processFile(file);
      } else {
        setParseError('Please upload a valid .csv spreadsheet file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleExecuteImport = async () => {
    if (!parseResult) return;
    setIsImporting(true);
    try {
      await importWbsData(parseResult.parsedData, importMode);
      setImportSuccess(true);
      setTimeout(() => {
        setIsImporting(false);
      }, 300);
    } catch (err: any) {
      setParseError(err.message || 'Error occurred while saving imported data.');
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setCsvContent('');
    setParseResult(null);
    setParseError(null);
    setImportSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                Import & Feed WBS via CSV
                <span className="px-2 py-0.5 text-[10px] font-mono tracking-wider font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full uppercase">
                  Bulk Data Feed
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Download a formatted template, populate milestones/epics/features/tasks, and feed data directly into the workspace.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Action Row: Template & Export */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center justify-between p-3.5 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-300 group-hover:scale-110 transition-transform">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-indigo-200">Download CSV Template</div>
                  <div className="text-[11px] text-indigo-300/70">Pre-filled with WBS header schema</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={handleExportCurrentData}
              className="flex items-center justify-between p-3.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-700/50 rounded-lg text-slate-300 group-hover:scale-110 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">Export Current WBS</div>
                  <div className="text-[11px] text-slate-400">Download current live dataset as CSV</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Drag & Drop Upload Zone */}
          {!parseResult && !importSuccess && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99]'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,application/vnd.ms-excel"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="p-3.5 bg-slate-800/80 border border-slate-700/50 rounded-2xl text-slate-300 shadow-inner">
                  <Upload className="w-7 h-7 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Click to browse or drop your CSV file here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports <code className="text-indigo-300 font-mono">.csv</code> format containing Milestones, Epics, Features, Tasks & Subtasks
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Parse Error Alert */}
          {parseError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-300 text-xs">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-rose-200">Parsing Error</div>
                <div className="mt-0.5 opacity-90">{parseError}</div>
              </div>
            </div>
          )}

          {/* Parsed Result Stats & Import Options */}
          {parseResult && !importSuccess && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    CSV Parsed Successfully ({selectedFile?.name})
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Change File
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2.5">
                    <Database className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Milestones</div>
                      <div className="text-sm font-bold text-white">{parseResult.stats.milestonesCount}</div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Epics</div>
                      <div className="text-sm font-bold text-white">{parseResult.stats.epicsCount}</div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2.5">
                    <FolderGit2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Features</div>
                      <div className="text-sm font-bold text-white">{parseResult.stats.featuresCount}</div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2.5">
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tasks / Bugs</div>
                      <div className="text-sm font-bold text-white">{parseResult.stats.tasksCount}</div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Subtasks</div>
                      <div className="text-sm font-bold text-white">{parseResult.stats.subtasksCount}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Import Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    onClick={() => setImportMode('replace')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      importMode === 'replace'
                        ? 'bg-indigo-500/10 border-indigo-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Replace WBS Dataset</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Overwrites current WBS items with the newly imported CSV structure.
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setImportMode('merge')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      importMode === 'merge'
                        ? 'bg-indigo-500/10 border-indigo-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Merge & Append</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Appends new items and updates matching IDs/titles without deleting existing ones.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {importSuccess && (
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">WBS Feed Successfully Updated!</h4>
                <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                  The CSV dataset has been processed and fed into the active WBS, Gantt, and EVM views.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
                >
                  View Updated WBS Workspace
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            {importSuccess ? 'Close' : 'Cancel'}
          </button>

          {parseResult && !importSuccess && (
            <button
              onClick={handleExecuteImport}
              disabled={isImporting}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Importing Feed...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Feed CSV Data into WBS
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
