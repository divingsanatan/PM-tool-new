import React, { useState, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  FileText,
  Users,
  Calendar,
  DollarSign,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Award,
  CheckSquare,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

interface PMChecklistWidgetProps {
  onNavigate?: (view: any) => void;
}

export const PMChecklistWidget: React.FC<PMChecklistWidgetProps> = ({ onNavigate }) => {
  const { projectData, currentUser, updatePMChecklist, validateAcceptanceCriterion } = useProject();
  const isPM = currentUser.role === 'pm';

  const [activeTab, setActiveTab] = useState<'all' | 'core' | 'dor_dod' | 'demoable'>('all');
  const [editingSection, setEditingSection] = useState<string | null>(null);

  // Local state for inline notes editing
  const [scopeNotesInput, setScopeNotesInput] = useState(projectData.pmChecklist?.scopeDetails || projectData.description || '');
  const [stakeholderNotesInput, setStakeholderNotesInput] = useState(projectData.pmChecklist?.stakeholderNotes || '');
  const [scheduleNotesInput, setScheduleNotesInput] = useState(projectData.pmChecklist?.scheduleNotes || '');
  const [costNotesInput, setCostNotesInput] = useState(projectData.pmChecklist?.costNotes || '');
  const [dorNotesInput, setDorNotesInput] = useState(projectData.pmChecklist?.dorNotes || '');
  const [dodNotesInput, setDodNotesInput] = useState(projectData.pmChecklist?.dodNotes || '');

  // Add Custom Item State
  const [newCustomTitle, setNewCustomTitle] = useState('');
  const [newCustomCategory, setNewCustomCategory] = useState('Governance');
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  // Add DOR / DOD rule state
  const [newDorRule, setNewDorRule] = useState('');
  const [newDodRule, setNewDodRule] = useState('');

  // Auto-calculated Parameters
  const hasScope = useMemo(() => {
    return Boolean((projectData.description && projectData.description.trim().length > 5) || (projectData.pmChecklist?.scopeDetails && projectData.pmChecklist.scopeDetails.trim().length > 5));
  }, [projectData.description, projectData.pmChecklist?.scopeDetails]);

  const hasStakeholders = useMemo(() => {
    return projectData.stakeholders.length >= 1;
  }, [projectData.stakeholders]);

  const hasSchedule = useMemo(() => {
    return Boolean(projectData.startDate && projectData.targetEndDate && projectData.milestones.length >= 1);
  }, [projectData.startDate, projectData.targetEndDate, projectData.milestones]);

  const hasCost = useMemo(() => {
    return projectData.budget > 0;
  }, [projectData.budget]);

  // Demoable & Acceptance Criteria Metrics
  const demoableTasks = useMemo(() => {
    return projectData.tasks.filter(t => t.status === 'demoable' || t.status === 'review');
  }, [projectData.tasks]);

  const tasksWithAC = useMemo(() => {
    return projectData.tasks.filter(t => t.acceptanceCriteria && t.acceptanceCriteria.length > 0);
  }, [projectData.tasks]);

  const pendingACTasks = useMemo(() => {
    return demoableTasks.filter(t => {
      if (!t.acceptanceCriteria || t.acceptanceCriteria.length === 0) return false;
      return t.acceptanceCriteria.some(ac => !ac.validated);
    });
  }, [demoableTasks]);

  const isACValidatedForDemoable = useMemo(() => {
    if (demoableTasks.length === 0) return true;
    return pendingACTasks.length === 0;
  }, [demoableTasks, pendingACTasks]);

  // DOR & DOD Checks
  const dorRules = projectData.pmChecklist?.dorCriteria || [
    'Item description & scope clearly articulated',
    'Assignee(s) designated with capacity checked',
    'Effort estimated in hours',
    'Optional Acceptance Criteria defined'
  ];

  const dodRules = projectData.pmChecklist?.dodCriteria || [
    'All subtasks & code review finished',
    'PM validated all defined Acceptance Criteria',
    'Logged against corresponding milestone/epic',
    'No critical unmitigated RAID items linked'
  ];

  const customItems = projectData.pmChecklist?.customItems || [];

  // Readiness Score Calculation (0 - 100%)
  const coreParams = [hasScope, hasStakeholders, hasSchedule, hasCost];
  const coreCount = coreParams.filter(Boolean).length;

  const customCompleted = customItems.filter(c => c.completed).length;
  const customTotal = customItems.length;

  const readinessScore = useMemo(() => {
    const coreWeight = 50; // Core params equal 50%
    const acWeight = 25;   // AC validation equals 25%
    const customWeight = 25; // Custom items equal 25%

    const corePart = (coreCount / 4) * coreWeight;
    const acPart = isACValidatedForDemoable ? acWeight : (demoableTasks.length > 0 ? (1 - pendingACTasks.length / demoableTasks.length) * acWeight : acWeight);
    const customPart = customTotal > 0 ? (customCompleted / customTotal) * customWeight : customWeight;

    return Math.round(corePart + acPart + customPart);
  }, [coreCount, isACValidatedForDemoable, pendingACTasks.length, demoableTasks.length, customCompleted, customTotal]);

  const handleSaveScopeNotes = async () => {
    await updatePMChecklist({ scopeDetails: scopeNotesInput });
    setEditingSection(null);
  };

  const handleSaveStakeholderNotes = async () => {
    await updatePMChecklist({ stakeholderNotes: stakeholderNotesInput });
    setEditingSection(null);
  };

  const handleSaveScheduleNotes = async () => {
    await updatePMChecklist({ scheduleNotes: scheduleNotesInput });
    setEditingSection(null);
  };

  const handleSaveCostNotes = async () => {
    await updatePMChecklist({ costNotes: costNotesInput });
    setEditingSection(null);
  };

  const handleSaveDorNotes = async () => {
    await updatePMChecklist({ dorNotes: dorNotesInput });
    setEditingSection(null);
  };

  const handleSaveDodNotes = async () => {
    await updatePMChecklist({ dodNotes: dodNotesInput });
    setEditingSection(null);
  };

  const handleAddCustomItem = async () => {
    if (!newCustomTitle.trim()) return;
    const newItem = {
      id: 'custom-' + Date.now(),
      title: newCustomTitle.trim(),
      completed: false,
      category: newCustomCategory,
      details: ''
    };
    await updatePMChecklist({
      customItems: [...customItems, newItem]
    });
    setNewCustomTitle('');
    setIsAddingCustom(false);
  };

  const handleToggleCustomItem = async (itemId: string) => {
    const updated = customItems.map(c => c.id === itemId ? { ...c, completed: !c.completed } : c);
    await updatePMChecklist({ customItems: updated });
  };

  const handleDeleteCustomItem = async (itemId: string) => {
    const updated = customItems.filter(c => c.id !== itemId);
    await updatePMChecklist({ customItems: updated });
  };

  const handleAddDorRule = async () => {
    if (!newDorRule.trim()) return;
    await updatePMChecklist({
      dorCriteria: [...dorRules, newDorRule.trim()]
    });
    setNewDorRule('');
  };

  const handleRemoveDorRule = async (index: number) => {
    const updated = dorRules.filter((_, i) => i !== index);
    await updatePMChecklist({ dorCriteria: updated });
  };

  const handleAddDodRule = async () => {
    if (!newDodRule.trim()) return;
    await updatePMChecklist({
      dodCriteria: [...dodRules, newDodRule.trim()]
    });
    setNewDodRule('');
  };

  const handleRemoveDodRule = async (index: number) => {
    const updated = dodRules.filter((_, i) => i !== index);
    await updatePMChecklist({ dodCriteria: updated });
  };

  return (
    <div id="pm-checklist-widget" className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg p-4 sm:p-6 space-y-6">
      {/* Header & Overall Score */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="space-y-1 min-w-0">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                  PM Governance & Readiness Checklist
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 whitespace-nowrap shrink-0">
                  PM Authorized
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Automated validation for Scope, Stakeholders, Schedule, Cost, DOR, DOD & Acceptance Criteria.
              </p>
            </div>
          </div>
        </div>

        {/* Score & Controls */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {onNavigate && (
            <button
              onClick={() => onNavigate('governance')}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-1.5"
            >
              <span>Open Dedicated Governance Tab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="px-3.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-3 shrink-0">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 whitespace-nowrap">
                Readiness Score
              </p>
              <div className="flex items-baseline gap-1 whitespace-nowrap">
                <span className={`text-xl font-extrabold ${readinessScore >= 80 ? 'text-emerald-400' : readinessScore >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {readinessScore}%
                </span>
                <span className="text-xs text-slate-500">/ 100%</span>
              </div>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center p-1 relative shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={readinessScore >= 80 ? 'text-emerald-500' : readinessScore >= 60 ? 'text-amber-500' : 'text-rose-500'}
                  strokeDasharray={`${readinessScore}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>

          {pendingACTasks.length > 0 && (
            <span className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 animate-pulse min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">{pendingACTasks.length} Demoable AC Pending PM Validation</span>
            </span>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3 overflow-x-auto custom-scrollbar text-xs">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${activeTab === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'}`}
        >
          All Parameters
        </button>
        <button
          onClick={() => setActiveTab('core')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${activeTab === 'core' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'}`}
        >
          Core Parameters ({coreCount}/4)
        </button>
        <button
          onClick={() => setActiveTab('dor_dod')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${activeTab === 'dor_dod' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'}`}
        >
          DOR & DOD Guidelines
        </button>
        <button
          onClick={() => setActiveTab('demoable')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${activeTab === 'demoable' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'}`}
        >
          <span>Demoable AC Validation</span>
          {pendingACTasks.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-slate-950 shrink-0 inline-flex items-center justify-center">
              {pendingACTasks.length}
            </span>
          )}
        </button>
      </div>

      {/* Parameter Cards Grid */}
      {(activeTab === 'all' || activeTab === 'core') && (
        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Project Baseline Parameters</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Scope Parameter */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="font-semibold text-slate-200 text-sm truncate">1. Project Scope</span>
                </div>
                {hasScope ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0 self-start sm:self-auto whitespace-nowrap">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Scope Defined
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1 shrink-0 self-start sm:self-auto whitespace-nowrap">
                    <XCircle className="w-3.5 h-3.5 shrink-0" /> Missing Scope
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-2.5 rounded-lg border border-slate-800 break-words">
                {projectData.pmChecklist?.scopeDetails || projectData.description || 'No detailed scope description provided.'}
              </p>

              {isPM && (
                <div>
                  {editingSection === 'scope' ? (
                    <div className="space-y-2 mt-2">
                      <textarea
                        value={scopeNotesInput}
                        onChange={e => setScopeNotesInput(e.target.value)}
                        placeholder="Add or update PM scope details..."
                        className="w-full p-2 rounded-lg bg-slate-900 border border-indigo-500/50 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[70px]"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingSection(null)}
                          className="px-2.5 py-1 rounded-md text-xs bg-slate-800 text-slate-300 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveScopeNotes}
                          className="px-3 py-1 rounded-md text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                        >
                          Save Scope Details
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setScopeNotesInput(projectData.pmChecklist?.scopeDetails || projectData.description || '');
                        setEditingSection('scope');
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Edit Scope Details
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2. Stakeholders Parameter */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Users className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="font-semibold text-slate-200 text-sm truncate">2. Key Stakeholders</span>
                </div>
                {hasStakeholders ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0 self-start sm:self-auto whitespace-nowrap">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {projectData.stakeholders.length} Active Stakeholders
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1 shrink-0 self-start sm:self-auto whitespace-nowrap">
                    <XCircle className="w-3.5 h-3.5 shrink-0" /> No Stakeholders Added
                  </span>
                )}
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-400">
                  <span className="whitespace-nowrap shrink-0">Assigned Team Members:</span>
                  <span className="font-bold text-slate-200 truncate">{projectData.stakeholders.map(s => s.name).join(', ') || 'None'}</span>
                </div>
                {projectData.pmChecklist?.stakeholderNotes && (
                  <p className="text-xs text-slate-300 italic pt-1 border-t border-slate-800/80 break-words">
                    "{projectData.pmChecklist.stakeholderNotes}"
                  </p>
                )}
              </div>

              {isPM && (
                <div>
                  {editingSection === 'stakeholders' ? (
                    <div className="space-y-2 mt-2">
                      <textarea
                        value={stakeholderNotesInput}
                        onChange={e => setStakeholderNotesInput(e.target.value)}
                        placeholder="PM notes on stakeholder matrix, roles & availability..."
                        className="w-full p-2 rounded-lg bg-slate-900 border border-indigo-500/50 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[60px]"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingSection(null)}
                          className="px-2.5 py-1 rounded-md text-xs bg-slate-800 text-slate-300 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveStakeholderNotes}
                          className="px-3 py-1 rounded-md text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                        >
                          Save Stakeholder Notes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setStakeholderNotesInput(projectData.pmChecklist?.stakeholderNotes || '');
                        setEditingSection('stakeholders');
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Edit Stakeholder Notes
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 3. Schedule Parameter */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold text-slate-200 text-sm truncate">3. Project Schedule</span>
                </div>
                {hasSchedule ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0 self-start sm:self-auto whitespace-nowrap">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Schedule Baseline Set
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1 shrink-0 self-start sm:self-auto whitespace-nowrap">
                    <XCircle className="w-3.5 h-3.5 shrink-0" /> Schedule Incomplete
                  </span>
                )}
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1.5 text-xs min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-slate-400">
                  <span className="whitespace-nowrap shrink-0">Timeline Window:</span>
                  <span className="font-mono text-slate-200 whitespace-nowrap">{projectData.startDate} to {projectData.targetEndDate}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-slate-400">
                  <span className="whitespace-nowrap shrink-0">Milestones Logged:</span>
                  <span className="font-bold text-slate-200 whitespace-nowrap">{projectData.milestones.length} Milestones</span>
                </div>
                {projectData.pmChecklist?.scheduleNotes && (
                  <p className="text-xs text-slate-300 italic pt-1 border-t border-slate-800/80 break-words">
                    "{projectData.pmChecklist.scheduleNotes}"
                  </p>
                )}
              </div>

              {isPM && (
                <div>
                  {editingSection === 'schedule' ? (
                    <div className="space-y-2 mt-2">
                      <textarea
                        value={scheduleNotesInput}
                        onChange={e => setScheduleNotesInput(e.target.value)}
                        placeholder="PM notes on critical path, delays, or deadlines..."
                        className="w-full p-2 rounded-lg bg-slate-900 border border-indigo-500/50 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[60px]"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingSection(null)}
                          className="px-2.5 py-1 rounded-md text-xs bg-slate-800 text-slate-300 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveScheduleNotes}
                          className="px-3 py-1 rounded-md text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                        >
                          Save Schedule Notes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setScheduleNotesInput(projectData.pmChecklist?.scheduleNotes || '');
                        setEditingSection('schedule');
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Edit Schedule Notes
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 4. Cost / Budget Parameter */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-slate-200 text-sm truncate">4. Project Cost & Budget</span>
                </div>
                {hasCost ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0 self-start sm:self-auto whitespace-nowrap">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> ${projectData.budget.toLocaleString()} Budgeted
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1 shrink-0 self-start sm:self-auto whitespace-nowrap">
                    <XCircle className="w-3.5 h-3.5 shrink-0" /> No Budget Defined
                  </span>
                )}
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1.5 text-xs min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-slate-400">
                  <span className="whitespace-nowrap shrink-0">Total Baseline Budget (BAC):</span>
                  <span className="font-mono text-emerald-400 font-bold whitespace-nowrap">${projectData.budget.toLocaleString()}</span>
                </div>
                {projectData.pmChecklist?.costNotes && (
                  <p className="text-xs text-slate-300 italic pt-1 border-t border-slate-800/80 break-words">
                    "{projectData.pmChecklist.costNotes}"
                  </p>
                )}
              </div>

              {isPM && (
                <div>
                  {editingSection === 'cost' ? (
                    <div className="space-y-2 mt-2">
                      <textarea
                        value={costNotesInput}
                        onChange={e => setCostNotesInput(e.target.value)}
                        placeholder="PM financial notes, rate structures, contingency funds..."
                        className="w-full p-2 rounded-lg bg-slate-900 border border-indigo-500/50 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[60px]"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingSection(null)}
                          className="px-2.5 py-1 rounded-md text-xs bg-slate-800 text-slate-300 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveCostNotes}
                          className="px-3 py-1 rounded-md text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                        >
                          Save Budget Notes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setCostNotesInput(projectData.pmChecklist?.costNotes || '');
                        setEditingSection('cost');
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Edit Cost Notes
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DOR & DOD Section */}
      {(activeTab === 'all' || activeTab === 'dor_dod') && (
        <div className="space-y-4 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span>Definition of Ready (DOR) & Definition of Done (DOD)</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Definition of Ready */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200 text-xs sm:text-sm flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0"></span>
                  <span className="truncate">Definition of Ready (DOR)</span>
                </span>
                <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap shrink-0 self-start sm:self-auto">
                  Pre-Sprint Entry Criteria
                </span>
              </div>

              <ul className="space-y-2 text-xs">
                {dorRules.map((rule, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800/60">
                    <div className="flex items-start gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span className="text-slate-300 leading-snug">{rule}</span>
                    </div>
                    {isPM && (
                      <button
                        onClick={() => handleRemoveDorRule(idx)}
                        className="text-slate-500 hover:text-rose-400 p-0.5 shrink-0"
                        title="Remove rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {isPM && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newDorRule}
                    onChange={e => setNewDorRule(e.target.value)}
                    placeholder="Add new DOR requirement..."
                    className="flex-1 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    onKeyDown={e => e.key === 'Enter' && handleAddDorRule()}
                  />
                  <button
                    onClick={handleAddDorRule}
                    className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              )}
            </div>

            {/* Definition of Done */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200 text-xs sm:text-sm flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                  <span className="truncate">Definition of Done (DOD)</span>
                </span>
                <span className="text-[10px] text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap shrink-0 self-start sm:self-auto">
                  Release Verification Criteria
                </span>
              </div>

              <ul className="space-y-2 text-xs">
                {dodRules.map((rule, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800/60">
                    <div className="flex items-start gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-slate-300 leading-snug">{rule}</span>
                    </div>
                    {isPM && (
                      <button
                        onClick={() => handleRemoveDodRule(idx)}
                        className="text-slate-500 hover:text-rose-400 p-0.5 shrink-0"
                        title="Remove rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {isPM && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newDodRule}
                    onChange={e => setNewDodRule(e.target.value)}
                    placeholder="Add new DOD requirement..."
                    className="flex-1 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    onKeyDown={e => e.key === 'Enter' && handleAddDodRule()}
                  />
                  <button
                    onClick={handleAddDodRule}
                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Demoable Acceptance Criteria Validation Section */}
      {(activeTab === 'all' || activeTab === 'demoable') && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Work Items Demoable Acceptance Criteria Validation</span>
            </h4>
            <span className="text-xs text-slate-400 shrink-0">
              {demoableTasks.length} Work Items in Review/Demoable Status
            </span>
          </div>

          {demoableTasks.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-400">
              No work items currently in <strong className="text-indigo-300">demoable</strong> or <strong className="text-purple-300">review</strong> status. Move work items to demoable in the WBS or Board view to validate Acceptance Criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {demoableTasks.map(task => {
                const acList = task.acceptanceCriteria || [];
                const allValidated = acList.length > 0 && acList.every(ac => ac.validated);
                const validatedCount = acList.filter(ac => ac.validated).length;

                return (
                  <div key={task.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
                          {task.status.toUpperCase()}
                        </span>
                        <h5 className="font-bold text-slate-100 text-xs sm:text-sm truncate">
                          {task.title}
                        </h5>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {acList.length > 0 ? (
                          allValidated ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 whitespace-nowrap shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> PM Validated ({validatedCount}/{acList.length})
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1 whitespace-nowrap shrink-0">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Pending Validation ({validatedCount}/{acList.length})
                            </span>
                          )
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] text-slate-400 bg-slate-800/60 border border-slate-700 whitespace-nowrap shrink-0">
                            No Acceptance Criteria Added (Optional)
                          </span>
                        )}
                      </div>
                    </div>

                    {acList.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold text-slate-400">Acceptance Criteria Validation Checklist:</p>
                        <div className="space-y-1.5">
                          {acList.map(ac => (
                            <label
                              key={ac.id}
                              className={`flex items-start justify-between gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${ac.validated ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={ac.validated}
                                  onChange={e => validateAcceptanceCriterion(task.id, ac.id, e.target.checked)}
                                  className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 shrink-0"
                                />
                                <div>
                                  <span className={`text-xs block leading-snug ${ac.validated ? 'line-through text-emerald-300/80' : 'text-slate-200'}`}>
                                    {ac.text}
                                  </span>
                                  {ac.validatedBy && (
                                    <span className="text-[10px] text-emerald-400/80 block mt-0.5 font-mono">
                                      Validated by {ac.validatedBy} on {ac.validatedAt}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {ac.validated && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 shrink-0">
                                  VALIDATED
                                </span>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                        <span>No specific Acceptance Criteria added for this item. Acceptance Criteria are optional but recommended for demoable items.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Custom Governance Checklist Section */}
      <div className="space-y-3 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            <span>Additional PM Custom Governance Items ({customCompleted}/{customTotal})</span>
          </h4>

          {isPM && !isAddingCustom && (
            <button
              onClick={() => setIsAddingCustom(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Custom Check Item
            </button>
          )}
        </div>

        {isAddingCustom && (
          <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={newCustomTitle}
                onChange={e => setNewCustomTitle(e.target.value)}
                placeholder="Check item title (e.g. Architecture Sign-off)..."
                className="col-span-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <select
                value={newCustomCategory}
                onChange={e => setNewCustomCategory(e.target.value)}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none"
              >
                <option value="Governance">Governance</option>
                <option value="Design">Design</option>
                <option value="Security">Security</option>
                <option value="DevOps">DevOps</option>
                <option value="Quality">Quality</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsAddingCustom(false)}
                className="px-3 py-1 rounded-md text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomItem}
                className="px-3 py-1 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-500"
              >
                Add Item
              </button>
            </div>
          </div>
        )}

        {customItems.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No custom governance items added yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {customItems.map(item => (
              <div
                key={item.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-colors ${item.completed ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200' : 'bg-slate-950/60 border-slate-800 text-slate-300'}`}
              >
                <label className="flex items-center gap-2 min-w-0 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleCustomItem(item.id)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="min-w-0 flex-1">
                    <span className={`block font-medium truncate ${item.completed ? 'line-through text-emerald-300' : 'text-slate-200'}`}>
                      {item.title}
                    </span>
                    {item.category && (
                      <span className="text-[10px] text-slate-500 font-mono">{item.category}</span>
                    )}
                  </div>
                </label>

                {isPM && (
                  <button
                    onClick={() => handleDeleteCustomItem(item.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
