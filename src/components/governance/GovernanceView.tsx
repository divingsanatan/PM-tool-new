import React, { useState, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { ViewMode, Stakeholder, Task, Milestone, Epic, Feature, Subtask, RaidItem } from '../../types';
import { calculateWbsTotalBudget, calculateWbsProjectEndDate } from '../../utils/taskCalculations';
import {
  ShieldCheck,
  FileText,
  Users,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  Sparkles,
  AlertTriangle,
  Plus,
  Trash2,
  Edit3,
  Layers,
  ArrowRight,
  Upload,
  Bot,
  HelpCircle,
  Check,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  FolderPlus,
  Zap
} from 'lucide-react';

interface GovernanceViewProps {
  onNavigate?: (view: ViewMode) => void;
}

export const GovernanceView: React.FC<GovernanceViewProps> = ({ onNavigate }) => {
  const {
    projectData,
    updatePMChecklist,
    validateAcceptanceCriterion,
    saveTask,
    updateProjectDetails,
    createProject,
    currentUser,
    customAiConfig
  } = useProject();

  const [activeTab, setActiveTab] = useState<'all' | 'scope' | 'dor' | 'dod' | 'demoable'>('all');
  
  // Custom DOR/DOD criterion state
  const [newDorText, setNewDorText] = useState('');
  const [newDodText, setNewDodText] = useState('');

  // AI SOW Intake Modal States
  const [isSowModalOpen, setIsSowModalOpen] = useState(false);
  const [sowStage, setSowStage] = useState<'input' | 'proposal'>('input');
  const [sowText, setSowText] = useState('');
  const [targetBudgetInput, setTargetBudgetInput] = useState<string>('200000');
  const [targetStartDateInput, setTargetStartDateInput] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Proposal State
  const [aiProposal, setAiProposal] = useState<any | null>(null);
  const [proposalTab, setProposalTab] = useState<'overview' | 'wbs' | 'stakeholders' | 'milestones' | 'raid' | 'guidelines'>('overview');

  // --- DYNAMIC PARAMETER CALCULATIONS ---
  // 1. Dynamic Budget & Cost from WBS
  const defaultHourlyRate = 100;
  const stakeholderRateMap = useMemo(() => {
    const map = new Map<string, number>();
    (projectData.stakeholders || []).forEach(s => {
      map.set(s.id, s.hourlyRate || defaultHourlyRate);
    });
    return map;
  }, [projectData.stakeholders]);

  const derivedWbsCost = useMemo(() => {
    let taskTotal = 0;
    (projectData.tasks || []).forEach(t => {
      let rate = defaultHourlyRate;
      if (t.assigneeIds && t.assigneeIds.length > 0) {
        const assignedRate = stakeholderRateMap.get(t.assigneeIds[0]);
        if (assignedRate) rate = assignedRate;
      }
      if (t.baselineCost && t.baselineCost > 0) {
        taskTotal += t.baselineCost;
      } else {
        taskTotal += (t.estimatedHours || 0) * rate;
      }
    });

    let subtaskTotal = 0;
    (projectData.subtasks || []).forEach(st => {
      subtaskTotal += (st.estimatedHours || 0) * defaultHourlyRate;
    });

    return taskTotal + subtaskTotal;
  }, [projectData.tasks, projectData.subtasks, stakeholderRateMap]);

  const bacBudget = projectData.budget || 200000;
  const costDifference = derivedWbsCost - bacBudget;

  // 2. Dynamic Key Stakeholders
  const activeStakeholdersCount = (projectData.stakeholders || []).length;
  const internalCount = (projectData.stakeholders || []).filter(s => s.category !== 'external').length;
  const externalCount = (projectData.stakeholders || []).filter(s => s.category === 'external').length;
  
  // Assigned stakeholders across tasks
  const assignedStakeholderIds = useMemo(() => {
    const set = new Set<string>();
    (projectData.tasks || []).forEach(t => {
      (t.assigneeIds || []).forEach(id => set.add(id));
    });
    return Array.from(set);
  }, [projectData.tasks]);

  // 3. Dynamic Schedule
  const milestoneCount = (projectData.milestones || []).length;
  const achievedMilestones = (projectData.milestones || []).filter(m => m.status === 'achieved').length;

  // Calculate earliest task start and latest task target date
  const taskDates = useMemo(() => {
    let earliest = projectData.startDate;
    let latest = projectData.targetEndDate;
    (projectData.tasks || []).forEach(t => {
      if (t.startDate && t.startDate < earliest) earliest = t.startDate;
      if (t.targetEndDate && t.targetEndDate > latest) latest = t.targetEndDate;
    });
    return { earliest, latest };
  }, [projectData.startDate, projectData.targetEndDate, projectData.tasks]);

  // Demoable Tasks
  const demoableTasks = (projectData.tasks || []).filter(
    t => t.status === 'review' || t.status === 'demoable'
  );

  // --- HANDLERS FOR GOVERNANCE DATA ---
  const handleToggleDorCriterion = (index: number) => {
    const current = projectData.pmChecklist?.dorCriteria || [];
    const updated = [...current];
    if (index >= 0 && index < updated.length) {
      if (updated[index].startsWith('[x] ')) {
        updated[index] = updated[index].replace('[x] ', '');
      } else {
        updated[index] = '[x] ' + updated[index];
      }
      updatePMChecklist({ dorCriteria: updated });
    }
  };

  const handleAddDorCriterion = () => {
    if (!newDorText.trim()) return;
    const current = projectData.pmChecklist?.dorCriteria || [];
    updatePMChecklist({ dorCriteria: [...current, newDorText.trim()] });
    setNewDorText('');
  };

  const handleRemoveDorCriterion = (index: number) => {
    const current = projectData.pmChecklist?.dorCriteria || [];
    const updated = current.filter((_, i) => i !== index);
    updatePMChecklist({ dorCriteria: updated });
  };

  const handleToggleDodCriterion = (index: number) => {
    const current = projectData.pmChecklist?.dodCriteria || [];
    const updated = [...current];
    if (index >= 0 && index < updated.length) {
      if (updated[index].startsWith('[x] ')) {
        updated[index] = updated[index].replace('[x] ', '');
      } else {
        updated[index] = '[x] ' + updated[index];
      }
      updatePMChecklist({ dodCriteria: updated });
    }
  };

  const handleAddDodCriterion = () => {
    if (!newDodText.trim()) return;
    const current = projectData.pmChecklist?.dodCriteria || [];
    updatePMChecklist({ dodCriteria: [...current, newDodText.trim()] });
    setNewDodText('');
  };

  const handleRemoveDodCriterion = (index: number) => {
    const current = projectData.pmChecklist?.dodCriteria || [];
    const updated = current.filter((_, i) => i !== index);
    updatePMChecklist({ dodCriteria: updated });
  };

  // --- SOW PRESETS & AI INTAKE ---
  const loadSowPreset = (type: 'cloud' | 'fintech' | 'enterprise') => {
    if (type === 'cloud') {
      setSowText(`STATEMENT OF WORK (SOW) - CLOUD PLATFORM MIGRATION & MODERNIZATION
1. Project Overview:
Migrate legacy on-premise infrastructure and monolith microservices to a containerized Cloud Run and Kubernetes architecture with Cloud SQL PostgreSQL.

2. Scope & Objectives:
- Dockerize microservices and configure Vite/Express services.
- Establish CI/CD deployment pipelines.
- Migrate database schemas and seed initial data.
- Perform automated security testing, load testing, and OAuth integration.
- Provide team training and operational runbooks.

3. Key Roles:
- Project Manager (PM) - Lead Governance & Risk
- Cloud Solutions Architect - Infrastructure Design
- Senior DevOps Engineer - CI/CD & Security
- Full-Stack Developer - Service Migration & APIs
- QA Automation Engineer - End-to-End Verification

4. Key Milestones:
- M1: Architecture & Cloud Landing Zone Setup (Target: Week 3)
- M2: Containerization & Database Migration (Target: Week 6)
- M3: Security & Performance Load Testing (Target: Week 9)
- M4: Final Cutover & Operational Handover (Target: Week 12)

5. Target Budget: $180,000 | Target Timeline: 12 Weeks`);
      setTargetBudgetInput('180000');
    } else if (type === 'fintech') {
      setSowText(`STATEMENT OF WORK (SOW) - MOBILE FINTECH & WEALTH APP
1. Project Overview:
Develop a cross-platform mobile fintech application for digital wealth management, biometric auth, and real-time bank transaction streaming.

2. Key Deliverables:
- Secure User Onboarding & KYC Identity Verification.
- Real-time Account Balance & Portfolio Dashboard.
- Automated Recurring Savings & Investment Rules.
- Bank API OAuth Integration & PCI-DSS Compliance Audit.

3. Team Structure:
- Mobile Lead Architect - iOS/Android
- Backend API Engineer - Financial Gateway Sync
- Security & Compliance Specialist - PCI & Audit
- Product Designer / UX Lead

4. Timeline & Budget:
- Duration: 16 Weeks
- Budget: $240,000`);
      setTargetBudgetInput('240000');
    } else {
      setSowText(`STATEMENT OF WORK (SOW) - ENTERPRISE WORKSPACE & PORTAL
1. Objective:
Re-architect internal company workspace portal for multi-project tracking, team workload analytics, and AI report generation.

2. Deliverables:
- Dynamic Executive Dashboards with EVM Gauges.
- Interactive Work Breakdown Structure (WBS) & Gantt Scheduler.
- RAID Management & Change Control Board Workflows.
- Automated PDF/Markdown AI Status Reports.

3. Duration & Budget:
- Duration: 10 Weeks
- Budget: $150,000`);
      setTargetBudgetInput('150000');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setSowText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleRunAiAnalysis = async () => {
    if (!sowText.trim()) {
      setAiError('Please enter or attach SOW / Document text before running analysis.');
      return;
    }

    setIsAiLoading(true);
    setAiError(null);

    try {
      const res = await fetch('/api/ai/parse-sow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sowText,
          targetBudget: parseFloat(targetBudgetInput) || 200000,
          startDate: targetStartDateInput,
          customAiConfig
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to parse SOW document with AI.');
      }

      setAiProposal(json.proposal);
      setSowStage('proposal');
    } catch (err: any) {
      console.error('AI SOW Parse Error:', err);
      setAiError(err.message || 'Error executing AI SOW analysis.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // APPLY AI PROPOSAL TO APP
  const handleApproveProposal = async (mode: 'update_current' | 'create_new') => {
    if (!aiProposal) return;

    // Convert proposal arrays into typed objects
    const now = Date.now();
    
    // Milestones
    const generatedMilestones: Milestone[] = (aiProposal.milestones || []).map((m: any, idx: number) => ({
      id: `ms-gen-${now}-${idx}`,
      title: m.title || `Milestone ${idx + 1}`,
      targetDate: m.targetDate || new Date(now + (idx + 1) * 21 * 86400000).toISOString().split('T')[0],
      status: 'upcoming',
      description: m.description || ''
    }));

    // Epics
    const generatedEpics: Epic[] = (aiProposal.epics || []).map((e: any, idx: number) => {
      const ms = generatedMilestones[e.milestoneIndex || 0];
      return {
        id: `epic-gen-${now}-${idx}`,
        title: e.title || `Epic ${idx + 1}`,
        description: e.description || '',
        milestoneId: ms ? ms.id : undefined,
        status: 'in_progress',
        color: '#6366f1'
      };
    });

    // Features
    const generatedFeatures: Feature[] = (aiProposal.features || []).map((f: any, idx: number) => {
      const ep = generatedEpics[f.epicIndex || 0];
      const ms = generatedMilestones[f.milestoneIndex || 0];
      return {
        id: `feat-gen-${now}-${idx}`,
        title: f.title || `Feature ${idx + 1}`,
        description: f.description || '',
        epicId: ep ? ep.id : undefined,
        milestoneId: ms ? ms.id : undefined,
        status: 'in_progress'
      };
    });

    // Stakeholders
    const generatedStakeholders: Stakeholder[] = (aiProposal.stakeholders || []).map((s: any, idx: number) => ({
      id: `sh-gen-${now}-${idx}`,
      name: s.name || `Team Member ${idx + 1}`,
      email: s.email || `team${idx + 1}@example.com`,
      role: s.role || 'Contributor',
      category: s.category === 'external' ? 'external' : 'internal',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(s.name || `sh-${idx}`)}`,
      hourlyRate: s.hourlyRate || 110,
      weeklyCapacityHours: s.weeklyCapacityHours || 40,
      skills: s.skills || ['Agile', 'Development'],
      status: 'active'
    }));

    // Tasks & Subtasks
    const generatedTasks: Task[] = [];
    const generatedSubtasks: Subtask[] = [];

    (aiProposal.tasks || []).forEach((t: any, idx: number) => {
      const taskId = `task-gen-${now}-${idx}`;
      const feat = generatedFeatures[t.featureIndex || 0];
      const ep = generatedEpics[t.epicIndex || 0];

      // Assign stakeholder round robin
      const assignee = generatedStakeholders[idx % Math.max(1, generatedStakeholders.length)];

      generatedTasks.push({
        id: taskId,
        title: t.title || `Task ${idx + 1}`,
        description: t.description || '',
        featureId: feat ? feat.id : undefined,
        epicId: ep ? ep.id : undefined,
        status: t.status || 'todo',
        priority: t.priority || 'high',
        estimatedHours: t.estimatedHours || 20,
        actualHours: 0,
        plannedCost: t.baselineCost || (t.estimatedHours || 20) * (assignee?.hourlyRate || 100),
        actualCost: 0,
        startDate: targetStartDateInput,
        dueDate: new Date(Date.now() + (idx + 2) * 7 * 86400000).toISOString().split('T')[0],
        assigneeIds: assignee ? [assignee.id] : [],
        completionPercent: 0,
        dependencies: [],
        tags: ['SOW-Generated'],
        acceptanceCriteria: t.acceptanceCriteria || [
          { id: `ac-${taskId}-1`, text: 'Requirements fulfilled per SOW guidelines', validated: false }
        ]
      });
    });

    (aiProposal.subtasks || []).forEach((st: any, idx: number) => {
      const parentTask = generatedTasks[st.taskIndex || 0] || generatedTasks[0];
      generatedSubtasks.push({
        id: `sub-gen-${now}-${idx}`,
        taskId: parentTask ? parentTask.id : `task-gen-${now}-0`,
        title: st.title || `Subtask ${idx + 1}`,
        estimatedHours: st.estimatedHours || 6,
        actualHours: 0,
        completed: false
      });
    });

    // RAID Items
    const generatedRaid: RaidItem[] = (aiProposal.raidItems || []).map((r: any, idx: number) => ({
      id: `raid-gen-${now}-${idx}`,
      type: r.type || 'risk',
      title: r.title || `Risk Item ${idx + 1}`,
      description: r.description || '',
      ownerId: generatedStakeholders[0]?.id || 'sh-0',
      severity: r.severity || 'medium',
      status: r.status || 'identified'
    }));

    // DOR & DOD
    const dorCriteria = aiProposal.dorCriteria || [
      'Requirements clearly stated in user story format with acceptance criteria',
      'Technical dependencies and resource assignments mapped'
    ];
    const dodCriteria = aiProposal.dodCriteria || [
      'Code reviewed and passing unit / integration tests',
      'PM sign-off and acceptance criteria validated'
    ];

    const computedWbsBudget = calculateWbsTotalBudget(generatedTasks, generatedSubtasks, generatedStakeholders);
    const startDateUsed = targetStartDateInput || aiProposal.startDate || projectData.startDate;
    const computedEndDate = calculateWbsProjectEndDate(startDateUsed, generatedTasks);
    const finalBudget = computedWbsBudget > 0 ? computedWbsBudget : (aiProposal.budget || parseFloat(targetBudgetInput) || 200000);

    if (mode === 'create_new') {
      await createProject({
        projectName: aiProposal.projectName || 'SOW Agile Project',
        projectCode: aiProposal.projectCode || 'SOW',
        description: aiProposal.description || 'Project generated from AI SOW Intake',
        startDate: startDateUsed,
        targetEndDate: computedEndDate,
        budget: finalBudget,
        stakeholders: generatedStakeholders.length > 0 ? generatedStakeholders : projectData.stakeholders,
        milestones: generatedMilestones,
        epics: generatedEpics,
        features: generatedFeatures,
        tasks: generatedTasks,
        subtasks: generatedSubtasks,
        raidItems: generatedRaid,
        pmChecklist: {
          scopeDetails: aiProposal.scopeDetails || sowText,
          stakeholderNotes: `Generated ${generatedStakeholders.length} team members from SOW`,
          scheduleNotes: `Generated ${generatedMilestones.length} milestones from SOW. Target end date ${computedEndDate} auto-calculated from WBS.`,
          costNotes: `Total budget $${finalBudget.toLocaleString()} auto-calculated from WBS tasks.`,
          dorCriteria,
          dodCriteria
        }
      });
    } else {
      await updateProjectDetails({
        projectName: aiProposal.projectName || projectData.projectName,
        projectCode: aiProposal.projectCode || projectData.projectCode,
        description: aiProposal.description || projectData.description,
        startDate: startDateUsed,
        targetEndDate: computedEndDate,
        budget: finalBudget,
        stakeholders: generatedStakeholders.length > 0 ? generatedStakeholders : projectData.stakeholders,
        milestones: generatedMilestones,
        epics: generatedEpics,
        features: generatedFeatures,
        tasks: generatedTasks,
        subtasks: generatedSubtasks,
        raidItems: generatedRaid,
        pmChecklist: {
          ...(projectData.pmChecklist || {}),
          scopeDetails: aiProposal.scopeDetails || sowText,
          scheduleNotes: `Schedule updated to ${startDateUsed} ~ ${computedEndDate} based on WBS task timeline.`,
          costNotes: `Budget updated to $${finalBudget.toLocaleString()} from WBS tasks.`,
          dorCriteria,
          dodCriteria
        }
      });
    }

    setIsSowModalOpen(false);
    setSowStage('input');
    setAiProposal(null);
    if (onNavigate) {
      onNavigate('wbs');
    }
  };

  return (
    <div id="governance-readiness-view" className="space-y-6 pb-12 min-w-0 max-w-full">
      {/* Top Banner & Title Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-6 rounded-2xl shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 z-10 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight leading-snug">
              Governance, SOW Intake & Readiness Studio
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 whitespace-nowrap shrink-0">
              PMI PMBOK Compliance
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
            Manage project readiness, DOR/DOD standards, and auto-generate WBS, stakeholders, RAID logs, and milestones directly from Statement of Work (SOW) documents using Gemini AI.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 z-10 w-full md:w-auto">
          <button
            onClick={() => {
              setSowStage('input');
              setIsSowModalOpen(true);
            }}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 border border-indigo-400/30 active:scale-95 shrink-0 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
            <span>AI SOW & Document Intake</span>
          </button>
        </div>
      </div>

      {/* 3 DYNAMIC PARAMETER CARDS (COST, STAKEHOLDERS, SCHEDULE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. DYNAMIC COST & BUDGET CARD */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800/90 shadow-md space-y-3.5 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-200 text-sm leading-tight">Project Cost & Budget</h3>
                  <span className="text-[10px] text-slate-400 block">Dynamic WBS Rollup</span>
                </div>
              </div>
              {costDifference <= 0 ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                  <CheckCircle2 className="w-3 h-3 shrink-0" /> Budget Aligned
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                  <AlertTriangle className="w-3 h-3 shrink-0" /> Exceeds BAC
                </span>
              )}
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2 text-slate-400">
                <span className="shrink-0">Authorized Baseline (BAC):</span>
                <span className="font-mono text-slate-200 font-bold text-right truncate">${bacBudget.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-slate-400">
                <span className="shrink-0">Derived WBS Cost:</span>
                <span className="font-mono text-emerald-400 font-bold text-right truncate">${derivedWbsCost.toLocaleString()}</span>
              </div>

              {/* Progress bar */}
              <div className="pt-1">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>WBS Allocation vs BAC</span>
                  <span className="font-mono font-semibold text-slate-300">{Math.round((derivedWbsCost / Math.max(1, bacBudget)) * 100)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      derivedWbsCost > bacBudget ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, (derivedWbsCost / Math.max(1, bacBudget)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate && onNavigate('wbs')}
            className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-700/60 shrink-0"
          >
            <span>Inspect WBS Tasks & Costs</span>
            <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          </button>
        </div>

        {/* 2. DYNAMIC KEY STAKEHOLDERS CARD */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800/90 shadow-md space-y-3.5 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-200 text-sm leading-tight">Key Stakeholders & Team</h3>
                  <span className="text-[10px] text-slate-400 block">Live Resource Roster</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                <CheckCircle2 className="w-3 h-3 shrink-0" /> {activeStakeholdersCount} Members
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2 text-slate-400">
                <span className="shrink-0">Internal / External Breakdown:</span>
                <span className="font-semibold text-slate-200 text-right truncate">{internalCount} Int / {externalCount} Ext</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-slate-400">
                <span className="shrink-0">Active Assignees in WBS:</span>
                <span className="font-semibold text-purple-300 text-right truncate">{assignedStakeholderIds.length} Assigned</span>
              </div>

              {/* Avatar stack */}
              <div className="flex items-center gap-1.5 pt-1.5 overflow-x-auto custom-scrollbar min-w-0">
                {(projectData.stakeholders || []).slice(0, 6).map((s, idx) => (
                  <img
                    key={s.id || idx}
                    src={s.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.name}`}
                    alt={s.name}
                    className="w-6 h-6 rounded-full border border-slate-700 shrink-0"
                    title={`${s.name} (${s.role})`}
                  />
                ))}
                {activeStakeholdersCount > 6 && (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-full shrink-0">
                    +{activeStakeholdersCount - 6}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate && onNavigate('stakeholders')}
            className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-700/60 shrink-0"
          >
            <span>Manage Stakeholders & Rates</span>
            <ArrowRight className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          </button>
        </div>

        {/* 3. DYNAMIC PROJECT SCHEDULE CARD */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800/90 shadow-md space-y-3.5 flex flex-col justify-between min-w-0 sm:col-span-2 lg:col-span-1">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-200 text-sm leading-tight">Project Schedule</h3>
                  <span className="text-[10px] text-slate-400 block">Gantt & Milestones Sync</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                <CheckCircle2 className="w-3 h-3 shrink-0" /> Baseline Active
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2 text-slate-400">
                <span className="shrink-0">Timeline Window:</span>
                <span className="font-mono text-slate-200 text-[11px] truncate text-right">{taskDates.earliest} to {taskDates.latest}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-slate-400">
                <span className="shrink-0">Milestones Progress:</span>
                <span className="font-bold text-amber-300 text-right truncate">{achievedMilestones} / {milestoneCount} Achieved</span>
              </div>

              {/* Progress bar */}
              <div className="pt-1">
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${milestoneCount > 0 ? (achievedMilestones / milestoneCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate && onNavigate('gantt')}
            className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-700/60 shrink-0"
          >
            <span>View Gantt Schedule</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </button>
        </div>
      </div>

      {/* READINESS & DOR/DOD CONTROLS MAIN SECTION */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto custom-scrollbar scroll-smooth">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            All Governance Controls
          </button>
          <button
            onClick={() => setActiveTab('scope')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'scope'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Project Scope Statement
          </button>
          <button
            onClick={() => setActiveTab('dor')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'dor'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Definition of Ready (DOR)
          </button>
          <button
            onClick={() => setActiveTab('dod')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'dod'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Definition of Done (DOD)
          </button>
          <button
            onClick={() => setActiveTab('demoable')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'demoable'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span>Acceptance Criteria Validation</span>
            {demoableTasks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-950 font-bold shrink-0">
                {demoableTasks.length}
              </span>
            )}
          </button>
        </div>

        {/* 1. PROJECT SCOPE DETAILS */}
        {(activeTab === 'all' || activeTab === 'scope') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Project Scope & Statement of Work Summary</span>
              </h3>
            </div>
            <textarea
              value={projectData.pmChecklist?.scopeDetails || projectData.description || ''}
              onChange={(e) => updatePMChecklist({ scopeDetails: e.target.value })}
              placeholder="Provide a detailed scope description, high-level objectives, and deliverables..."
              className="w-full h-28 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-y leading-relaxed"
            />
          </div>
        )}

        {/* 2. DEFINITION OF READY (DOR) */}
        {(activeTab === 'all' || activeTab === 'dor') && (
          <div className="space-y-4 pt-2 border-t border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0"></div>
                <h3 className="font-bold text-slate-200 text-sm truncate">Definition of Ready (DOR) Guidelines</h3>
              </div>
              <span className="text-xs text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full font-semibold border border-indigo-500/20 whitespace-nowrap shrink-0 self-start sm:self-auto">
                Pre-Sprint Entry Criteria
              </span>
            </div>

            <div className="space-y-2 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              {(projectData.pmChecklist?.dorCriteria || []).length === 0 ? (
                <p className="text-xs text-slate-400 italic">No custom DOR criteria added yet. Type below to add criteria.</p>
              ) : (
                (projectData.pmChecklist?.dorCriteria || []).map((item, idx) => {
                  const isChecked = item.startsWith('[x] ');
                  const text = isChecked ? item.slice(4) : item;
                  return (
                    <div key={idx} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-colors">
                      <label className="flex items-start gap-2.5 cursor-pointer min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleDorCriterion(idx)}
                          className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 shrink-0"
                        />
                        <span className={`text-xs ${isChecked ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                          {text}
                        </span>
                      </label>
                      <button
                        onClick={() => handleRemoveDorCriterion(idx)}
                        className="text-slate-400 hover:text-rose-400 p-1 rounded transition-colors shrink-0"
                        title="Delete Criterion"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}

              {/* Add DOR Criterion Input */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newDorText}
                  onChange={(e) => setNewDorText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDorCriterion()}
                  placeholder="Add new DOR requirement (e.g. Technical dependencies mapped)..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleAddDorCriterion}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" /> Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. DEFINITION OF DONE (DOD) */}
        {(activeTab === 'all' || activeTab === 'dod') && (
          <div className="space-y-4 pt-2 border-t border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></div>
                <h3 className="font-bold text-slate-200 text-sm truncate">Definition of Done (DOD) Guidelines</h3>
              </div>
              <span className="text-xs text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full font-semibold border border-emerald-500/20 whitespace-nowrap shrink-0 self-start sm:self-auto">
                Release Verification Criteria
              </span>
            </div>

            <div className="space-y-2 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              {(projectData.pmChecklist?.dodCriteria || []).length === 0 ? (
                <p className="text-xs text-slate-400 italic">No custom DOD criteria added yet. Type below to add criteria.</p>
              ) : (
                (projectData.pmChecklist?.dodCriteria || []).map((item, idx) => {
                  const isChecked = item.startsWith('[x] ');
                  const text = isChecked ? item.slice(4) : item;
                  return (
                    <div key={idx} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-colors">
                      <label className="flex items-start gap-2.5 cursor-pointer min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleDodCriterion(idx)}
                          className="mt-0.5 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 shrink-0"
                        />
                        <span className={`text-xs ${isChecked ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                          {text}
                        </span>
                      </label>
                      <button
                        onClick={() => handleRemoveDodCriterion(idx)}
                        className="text-slate-400 hover:text-rose-400 p-1 rounded transition-colors shrink-0"
                        title="Delete Criterion"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}

              {/* Add DOD Criterion Input */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newDodText}
                  onChange={(e) => setNewDodText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDodCriterion()}
                  placeholder="Add new DOD requirement (e.g. Code reviewed and passed automated QA)..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleAddDodCriterion}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" /> Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. WORK ITEMS ACCEPTANCE CRITERIA VALIDATION */}
        {(activeTab === 'all' || activeTab === 'demoable') && (
          <div className="space-y-4 pt-2 border-t border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="leading-tight">Work Items Demoable Acceptance Criteria Validation</span>
              </h3>
              <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">
                {demoableTasks.length} Work Items in Review/Demoable Status
              </span>
            </div>

            {demoableTasks.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                No work items are currently in "Review" or "Demoable" status requiring PM sign-off.
              </div>
            ) : (
              <div className="space-y-3">
                {demoableTasks.map(task => {
                  const acList = task.acceptanceCriteria || [];
                  const validatedCount = acList.filter(ac => ac.validated).length;
                  const allValidated = acList.length > 0 && validatedCount === acList.length;

                  return (
                    <div key={task.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[10px] text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-800 whitespace-nowrap shrink-0">
                              {task.id.slice(-6)}
                            </span>
                            <h5 className="font-semibold text-slate-200 text-xs sm:text-sm truncate min-w-0 flex-1">{task.title}</h5>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                              No Acceptance Criteria Added
                            </span>
                          )}

                          {task.status !== 'done' && (
                            <button
                              onClick={() => saveTask({ ...task, status: 'done', completionPercent: 100 })}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 whitespace-nowrap shrink-0"
                            >
                              <Check className="w-3 h-3 shrink-0" /> Sign Off Done
                            </button>
                          )}
                        </div>
                      </div>

                      {acList.length > 0 && (
                        <div className="space-y-1.5 pl-2 border-l-2 border-indigo-500/40">
                          {acList.map(ac => (
                            <label key={ac.id} className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={ac.validated}
                                onChange={(e) => validateAcceptanceCriterion(task.id, ac.id, e.target.checked)}
                                className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 shrink-0"
                              />
                              <span className={ac.validated ? 'line-through text-slate-400' : ''}>
                                {ac.text}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI SOW INTAKE MODAL */}
      {isSowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col my-auto overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between bg-slate-900/90 shrink-0 gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shrink-0 mt-0.5">
                  <Bot className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-bold text-slate-100 text-base sm:text-lg leading-tight">
                      AI Statement of Work (SOW) Intake & Auto-Architect
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 whitespace-nowrap shrink-0">
                      Gemini 3.6 Flash
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {sowStage === 'input'
                      ? 'Paste or attach SOW document text to automatically generate WBS, Stakeholders, Milestones & RAID items.'
                      : 'Review AI generated project structure and approve to automatically create the project in app.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSowModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors shrink-0 -mr-1 -mt-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5">
              {sowStage === 'input' ? (
                <div className="space-y-4">
                  {/* Presets Bar */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">
                      Select Sample SOW Preset or Upload Document:
                    </label>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => loadSowPreset('cloud')}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-950/60 text-slate-200 hover:text-indigo-300 border border-slate-700/60 hover:border-indigo-500/40 text-xs font-medium transition-all"
                        >
                          Cloud Migration SOW
                        </button>
                        <button
                          onClick={() => loadSowPreset('fintech')}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-950/60 text-slate-200 hover:text-indigo-300 border border-slate-700/60 hover:border-indigo-500/40 text-xs font-medium transition-all"
                        >
                          Mobile Fintech SOW
                        </button>
                        <button
                          onClick={() => loadSowPreset('enterprise')}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-950/60 text-slate-200 hover:text-indigo-300 border border-slate-700/60 hover:border-indigo-500/40 text-xs font-medium transition-all"
                        >
                          Enterprise Workspace SOW
                        </button>
                      </div>
                      
                      <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0">
                        <Upload className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>Upload SOW Text / Markdown</span>
                        <input type="file" accept=".txt,.md,.json,.doc,.docx" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* SOW Text Area */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Statement of Work (SOW) / Project Brief Content:
                    </label>
                    <textarea
                      value={sowText}
                      onChange={(e) => setSowText(e.target.value)}
                      placeholder="Paste your SOW, Project Brief, RFP, or Requirements text here..."
                      className="w-full h-56 bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 resize-y leading-relaxed"
                    />
                  </div>

                  {/* Options inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300">Baseline Budget Target ($)</label>
                        <span className="text-[10px] text-emerald-400 font-mono">Auto-calculated by WBS</span>
                      </div>
                      <input
                        type="number"
                        value={targetBudgetInput}
                        onChange={(e) => setTargetBudgetInput(e.target.value)}
                        placeholder="Auto-derived from WBS tasks"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                      <p className="text-[10px] text-slate-400">Total cost will be automatically derived from WBS task hours & stakeholder rates.</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300">Project Start Date</label>
                        <span className="text-[10px] text-indigo-400 font-mono">Sets Timeline Origin</span>
                      </div>
                      <input
                        type="date"
                        value={targetStartDateInput}
                        onChange={(e) => setTargetStartDateInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                      <p className="text-[10px] text-indigo-300 font-mono">
                        Estimated Target End Date: {calculateWbsProjectEndDate(targetStartDateInput, projectData.tasks || [])} (Auto-calculated from WBS)
                      </p>
                    </div>
                  </div>

                  {aiError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{aiError}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* PROPOSAL REVIEW STAGE */
                <div className="space-y-5">
                  {/* Tabs */}
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto custom-scrollbar">
                    <button
                      onClick={() => setProposalTab('overview')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
                        proposalTab === 'overview' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Project Overview
                    </button>
                    <button
                      onClick={() => setProposalTab('wbs')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
                        proposalTab === 'wbs' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      WBS Tasks ({(aiProposal?.tasks || []).length})
                    </button>
                    <button
                      onClick={() => setProposalTab('stakeholders')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
                        proposalTab === 'stakeholders' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Stakeholders ({(aiProposal?.stakeholders || []).length})
                    </button>
                    <button
                      onClick={() => setProposalTab('milestones')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
                        proposalTab === 'milestones' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Milestones ({(aiProposal?.milestones || []).length})
                    </button>
                    <button
                      onClick={() => setProposalTab('raid')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
                        proposalTab === 'raid' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      RAID Log ({(aiProposal?.raidItems || []).length})
                    </button>
                  </div>

                  {/* PROPOSAL TAB CONTENTS */}
                  {proposalTab === 'overview' && (
                    <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400">Project Name:</span>
                          <p className="font-bold text-slate-100 text-sm">{aiProposal?.projectName}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Project Code / Budget:</span>
                          <p className="font-mono text-emerald-400 font-bold">
                            {aiProposal?.projectCode} | ${aiProposal?.budget?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs pt-2 border-t border-slate-800/80">
                        <span className="text-slate-400">Description:</span>
                        <p className="text-slate-200 mt-1">{aiProposal?.description}</p>
                      </div>
                      <div className="text-xs pt-2 border-t border-slate-800/80">
                        <span className="text-slate-400">Scope Summary:</span>
                        <p className="text-slate-300 mt-1 leading-relaxed">{aiProposal?.scopeDetails}</p>
                      </div>
                    </div>
                  )}

                  {proposalTab === 'wbs' && (
                    <div className="space-y-2.5 max-h-80 overflow-y-auto custom-scrollbar">
                      {(aiProposal?.tasks || []).map((t: any, idx: number) => (
                        <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-200">{t.title}</span>
                            <span className="font-mono text-indigo-300">{t.estimatedHours} hrs (${t.baselineCost})</span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2">{t.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {proposalTab === 'stakeholders' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto custom-scrollbar">
                      {(aiProposal?.stakeholders || []).map((s: any, idx: number) => (
                        <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                          <span className="font-bold text-slate-200 text-xs">{s.name}</span>
                          <p className="text-[11px] text-purple-300">{s.role} (${s.hourlyRate}/hr)</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {proposalTab === 'milestones' && (
                    <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                      {(aiProposal?.milestones || []).map((m: any, idx: number) => (
                        <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-200">{m.title}</span>
                            <span className="font-mono text-amber-300">{m.targetDate}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{m.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {proposalTab === 'raid' && (
                    <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                      {(aiProposal?.raidItems || []).map((r: any, idx: number) => (
                        <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-200 uppercase text-[10px] bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800">
                              {r.type}
                            </span>
                            <span className="font-semibold text-slate-300">{r.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{r.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              {sowStage === 'input' ? (
                <>
                  <button
                    onClick={() => setIsSowModalOpen(false)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleRunAiAnalysis}
                    disabled={isAiLoading}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isAiLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                        <span>Analyzing SOW & Building Plan...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Analyze SOW & Generate Project Plan</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setSowStage('input')}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                  >
                    ← Back to SOW Input
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleApproveProposal('update_current')}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Approve & Apply to Current Project</span>
                    </button>

                    <button
                      onClick={() => handleApproveProposal('create_new')}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <FolderPlus className="w-4 h-4 text-white" />
                      <span>Approve & Create New Project</span>
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
