import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Task, Priority, TaskStatus, WorkItemType } from '../../types';
import { X, CheckSquare, DollarSign, Clock, Calendar, Users, Calculator, ShieldCheck, Link2, Plus, AlertTriangle, Trash2, Flag, Bookmark, Layers, Bug } from 'lucide-react';
import { HierarchyItemModal, HierarchyType } from './HierarchyItemModal';
import { getAvgHourlyRate, getStatusProgress } from '../../utils/taskCalculations';
import {
  DependencyType,
  DEPENDENCY_TYPE_LABELS,
  parseDependency,
  formatDependency,
  checkDependencyConflict
} from '../../utils/dependencies';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  defaultStatus?: TaskStatus;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  defaultStatus
}) => {
  const { projectData, saveTask, currentUser } = useProject();

  const isPM = currentUser?.role === 'pm';

  const currentStakeholder = useMemo(() => {
    if (!currentUser) return null;
    return projectData.stakeholders.find(
      s => s.email.toLowerCase() === currentUser.email.toLowerCase()
    );
  }, [projectData.stakeholders, currentUser]);

  const isTaskEditable = useMemo(() => {
    if (isPM) return true;
    if (!taskToEdit) return true; // New task creation
    if (currentStakeholder) {
      if (taskToEdit.assigneeId === currentStakeholder.id) return true;
      if (taskToEdit.assigneeIds && taskToEdit.assigneeIds.includes(currentStakeholder.id)) return true;
    }
    if (taskToEdit.assigneeId === currentUser?.id) return true;
    if (taskToEdit.assigneeIds && taskToEdit.assigneeIds.includes(currentUser?.id)) return true;
    if (taskToEdit.assigneeName && currentUser?.name && taskToEdit.assigneeName.toLowerCase() === currentUser.name.toLowerCase()) return true;
    return false;
  }, [isPM, taskToEdit, currentStakeholder, currentUser]);

  const assignedName = useMemo(() => {
    if (!taskToEdit) return '';
    if (taskToEdit.assigneeName) return taskToEdit.assigneeName;
    const match = projectData.stakeholders.find(s => s.id === taskToEdit.assigneeId || (taskToEdit.assigneeIds && taskToEdit.assigneeIds.includes(s.id)));
    return match ? match.name : 'another team member';
  }, [taskToEdit, projectData.stakeholders]);

  const [type, setType] = useState<WorkItemType>('task');
  const [linkedBugIds, setLinkedBugIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus || 'todo');
  const [priority, setPriority] = useState<Priority>('normal');
  const [epicId, setEpicId] = useState('');
  const [featureId, setFeatureId] = useState('');
  const [milestoneId, setMilestoneId] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [responsibleIds, setResponsibleIds] = useState<string[]>([]);
  const [accountableIds, setAccountableIds] = useState<string[]>([]);
  const [consultedIds, setConsultedIds] = useState<string[]>([]);
  const [informedIds, setInformedIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]);
  const [estimatedHours, setEstimatedHours] = useState(20);
  const [actualHours, setActualHours] = useState(0);

  // Quick creation modal for WBS items
  const [isHierarchyModalOpen, setIsHierarchyModalOpen] = useState(false);
  const [hierarchyModalType, setHierarchyModalType] = useState<HierarchyType>('feature');

  // Dependency Management State
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [selectedDepTaskId, setSelectedDepTaskId] = useState<string>('');
  const [selectedDepType, setSelectedDepType] = useState<DependencyType>('FS');

  const availableBugs = useMemo(() => {
    return projectData.tasks.filter(t => t.type === 'bug' && t.id !== taskToEdit?.id);
  }, [projectData.tasks, taskToEdit]);

  useEffect(() => {
    if (taskToEdit) {
      setType(taskToEdit.type || 'task');
      setLinkedBugIds(taskToEdit.linkedBugIds || []);
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setStatus(taskToEdit.status);
      setPriority(taskToEdit.priority);
      setEpicId(taskToEdit.epicId || '');
      setFeatureId(taskToEdit.featureId || '');
      setMilestoneId(taskToEdit.milestoneId || '');
      
      const assignees = taskToEdit.assigneeIds || [];
      setAssigneeIds(assignees);
      setResponsibleIds(taskToEdit.raci?.responsible && taskToEdit.raci.responsible.length > 0 ? taskToEdit.raci.responsible : assignees);
      setAccountableIds(taskToEdit.raci?.accountable || []);
      setConsultedIds(taskToEdit.raci?.consulted || []);
      setInformedIds(taskToEdit.raci?.informed || []);

      setStartDate(taskToEdit.startDate);
      setDueDate(taskToEdit.dueDate);
      setEstimatedHours(taskToEdit.estimatedHours);
      setActualHours(taskToEdit.actualHours);
      setDependencies(taskToEdit.dependencies || []);
    } else {
      setType('task');
      setLinkedBugIds([]);
      setTitle('');
      if (defaultStatus) setStatus(defaultStatus);
      setDescription('');
      setStatus(defaultStatus || 'todo');
      setPriority('normal');
      const firstFeat = projectData.features[0];
      if (firstFeat) {
        setFeatureId(firstFeat.id);
        const parentEp = (projectData.epics || []).find(e => e.id === firstFeat.epicId);
        setEpicId(firstFeat.epicId || '');
        setMilestoneId(firstFeat.milestoneId || parentEp?.milestoneId || '');
      } else {
        setFeatureId('');
        setEpicId('');
        setMilestoneId('');
      }
      setAssigneeIds([]);
      setResponsibleIds([]);
      setAccountableIds([]);
      setConsultedIds([]);
      setInformedIds([]);
      setStartDate(new Date().toISOString().split('T')[0]);
      setDueDate(new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]);
      setEstimatedHours(20);
      setActualHours(0);
      setDependencies([]);
    }
    setSelectedDepTaskId('');
    setSelectedDepType('FS');
  }, [taskToEdit, defaultStatus, isOpen]);

  // Handle automatic hierarchy filling when feature is selected
  const handleFeatureSelect = (selectedFeatId: string) => {
    setFeatureId(selectedFeatId);
    if (selectedFeatId) {
      const feat = projectData.features.find(f => f.id === selectedFeatId);
      if (feat) {
        if (feat.epicId) {
          setEpicId(feat.epicId);
          const ep = (projectData.epics || []).find(e => e.id === feat.epicId);
          if (ep?.milestoneId) {
            setMilestoneId(ep.milestoneId);
          }
        }
        if (feat.milestoneId) {
          setMilestoneId(feat.milestoneId);
        }
      }
    }
  };

  // Handle automatic hierarchy filling when epic is selected
  const handleEpicSelect = (selectedEpicId: string) => {
    setEpicId(selectedEpicId);
    if (selectedEpicId) {
      const ep = (projectData.epics || []).find(e => e.id === selectedEpicId);
      if (ep?.milestoneId) {
        setMilestoneId(ep.milestoneId);
      }
    }
  };

  const openQuickCreate = (type: HierarchyType) => {
    setHierarchyModalType(type);
    setIsHierarchyModalOpen(true);
  };

  // Dynamically calculated hourly rate and cost metrics
  const avgHourlyRate = useMemo(() => {
    return getAvgHourlyRate(assigneeIds, projectData.stakeholders);
  }, [assigneeIds, projectData.stakeholders]);

  const livePlannedCost = Math.round(estimatedHours * avgHourlyRate);
  const liveActualCost = Math.round(actualHours * avgHourlyRate);
  const liveCompletionPercent = getStatusProgress(status, projectData.statusPercentages);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveTask({
      id: taskToEdit?.id,
      type,
      title,
      description,
      status,
      priority,
      epicId: epicId || undefined,
      featureId: featureId || undefined,
      milestoneId: milestoneId || undefined,
      assigneeIds,
      raci: {
        responsible: responsibleIds.length > 0 ? responsibleIds : assigneeIds,
        accountable: accountableIds,
        consulted: consultedIds,
        informed: informedIds
      },
      startDate,
      dueDate,
      estimatedHours: Number(estimatedHours),
      actualHours: Number(actualHours),
      plannedCost: livePlannedCost,
      actualCost: liveActualCost,
      completionPercent: liveCompletionPercent,
      dependencies,
      linkedBugIds
    });
    onClose();
  };

  const toggleAssignee = (id: string) => {
    setAssigneeIds(prev => {
      const updated = prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id];
      setResponsibleIds(updated);
      return updated;
    });
  };

  const toggleRaciRole = (stkId: string, role: 'R' | 'A' | 'C' | 'I') => {
    if (role === 'R') {
      setResponsibleIds(prev => {
        const updated = prev.includes(stkId) ? prev.filter(id => id !== stkId) : [...prev, stkId];
        setAssigneeIds(updated);
        return updated;
      });
    } else if (role === 'A') {
      setAccountableIds(prev => prev.includes(stkId) ? prev.filter(id => id !== stkId) : [...prev, stkId]);
    } else if (role === 'C') {
      setConsultedIds(prev => prev.includes(stkId) ? prev.filter(id => id !== stkId) : [...prev, stkId]);
    } else if (role === 'I') {
      setInformedIds(prev => prev.includes(stkId) ? prev.filter(id => id !== stkId) : [...prev, stkId]);
    }
  };

  const handleAddDependency = () => {
    if (!selectedDepTaskId) return;
    const formatted = formatDependency(selectedDepTaskId, selectedDepType);
    if (!dependencies.some(d => parseDependency(d).targetTaskId === selectedDepTaskId)) {
      setDependencies(prev => [...prev, formatted]);
    }
    setSelectedDepTaskId('');
  };

  const handleRemoveDependency = (targetTaskId: string) => {
    setDependencies(prev => prev.filter(d => parseDependency(d).targetTaskId !== targetTaskId));
  };

  // Available tasks to depend on (excluding current task and already added dependencies)
  const availablePredecessorTasks = projectData.tasks.filter(t => {
    if (taskToEdit && t.id === taskToEdit.id) return false;
    const isAlreadyDep = dependencies.some(d => parseDependency(d).targetTaskId === t.id);
    return !isAlreadyDep;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl h-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-slate-100 text-base sm:text-lg">
              {taskToEdit ? 'Edit Work Item' : 'Create New Work Item'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          {!isTaskEditable && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <div>
                <strong className="block text-amber-200 font-bold">Read-Only Mode</strong>
                <span>This task is assigned to <strong className="text-white">{assignedName}</strong>. Team members can only edit tasks assigned to themselves.</span>
              </div>
            </div>
          )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Work Item Type Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Work Item Type *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('task')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  type === 'task'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckSquare className="w-4 h-4 text-indigo-400" />
                <span>Task (Feature / Work Item)</span>
              </button>
              <button
                type="button"
                onClick={() => setType('bug')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  type === 'bug'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bug className="w-4 h-4 text-rose-400" />
                <span>Bug (Defect / Issue)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Work Item Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'bug' ? "e.g., Fix WebSocket Reconnection Memory Leak" : "e.g., Design Real-Time Dashboard UI"}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope details and deliverable specs..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Status (Controls Progress %)</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none font-medium text-indigo-300 cursor-pointer"
              >
                <option value="todo">To Do ({getStatusProgress('todo', projectData.statusPercentages)}% Progress)</option>
                <option value="in_progress">In Progress ({getStatusProgress('in_progress', projectData.statusPercentages)}% Progress)</option>
                <option value="demoable">Demo-able ({getStatusProgress('demoable', projectData.statusPercentages)}% Progress)</option>
                <option value="review">Under Review / Testing ({getStatusProgress('review', projectData.statusPercentages)}% Progress)</option>
                <option value="on_hold">On Hold ({getStatusProgress('on_hold', projectData.statusPercentages)}% Progress)</option>
                <option value="blocked">Blocked ({getStatusProgress('blocked', projectData.statusPercentages)}% Progress)</option>
                <option value="done">Completed ({getStatusProgress('done', projectData.statusPercentages)}% Progress)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Feature Assignment (Simple single input, Epic & Milestone auto-calculated behind the scenes) */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-200 font-semibold flex items-center gap-1.5 text-xs">
                <Layers className="w-4 h-4 text-blue-400" /> Assigned Feature
              </label>
              <button
                type="button"
                onClick={() => openQuickCreate('feature')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> New Feature
              </button>
            </div>
            <select
              value={featureId}
              onChange={(e) => handleFeatureSelect(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm outline-none focus:border-blue-500 font-medium"
            >
              <option value="">-- Standalone Work Item (No Feature) --</option>
              {projectData.features.map(f => (
                <option key={f.id} value={f.id}>{f.title}</option>
              ))}
            </select>
          </div>

          {/* Dates & Hours */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Planned Hours</label>
              <input
                type="number"
                min="0"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Actual Hours</label>
              <div className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-slate-100 flex items-center justify-between text-xs min-h-[38px]">
                <span className="font-mono font-semibold text-amber-400">{actualHours || 0} hrs</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  <span>Auto-captured (In Progress → Demo-able)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Assignees Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Assign Stakeholders (Calculates Hourly Rate)</label>
            <div className="flex flex-wrap gap-2">
              {projectData.stakeholders.map((sh) => {
                const isSelected = assigneeIds.includes(sh.id);
                return (
                  <button
                    key={sh.id}
                    type="button"
                    onClick={() => toggleAssignee(sh.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <img src={sh.avatar} className="w-4 h-4 rounded-full" alt="" />
                    <span>{sh.name}</span>
                    <span className="opacity-75 font-mono text-[10px]">(${sh.hourlyRate}/h)</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RACI Matrix Assignments Section */}
          <div className="bg-slate-950/70 p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold text-xs text-slate-100">RACI Responsibility Matrix</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">R: Responsible</span>
                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">A: Accountable</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">C: Consulted</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-300 font-bold border border-slate-500/30">I: Informed</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Assign RACI governance roles to stakeholders. RACI tags roll over automatically to Features, Epics, and Milestones in the PM Dashboard.
            </p>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {projectData.stakeholders.map(stk => {
                const isR = responsibleIds.includes(stk.id);
                const isA = accountableIds.includes(stk.id);
                const isC = consultedIds.includes(stk.id);
                const isI = informedIds.includes(stk.id);

                return (
                  <div key={stk.id} className="flex flex-col xs:flex-row xs:items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-800/80 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={stk.avatar} className="w-5 h-5 rounded-full shrink-0" alt="" />
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-slate-200 block truncate">{stk.name}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{stk.role}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 self-end xs:self-auto">
                      <button
                        type="button"
                        onClick={() => toggleRaciRole(stk.id, 'R')}
                        className={`w-7 h-7 rounded-lg text-xs font-black transition-all flex items-center justify-center border ${
                          isR
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                            : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-emerald-400 hover:border-emerald-500/50'
                        }`}
                        title="Responsible: Performs work to achieve deliverable"
                      >
                        R
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleRaciRole(stk.id, 'A')}
                        className={`w-7 h-7 rounded-lg text-xs font-black transition-all flex items-center justify-center border ${
                          isA
                            ? 'bg-purple-500 text-white border-purple-400 shadow-sm'
                            : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-purple-400 hover:border-purple-500/50'
                        }`}
                        title="Accountable: Ultimate decision maker and answerable for deliverable"
                      >
                        A
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleRaciRole(stk.id, 'C')}
                        className={`w-7 h-7 rounded-lg text-xs font-black transition-all flex items-center justify-center border ${
                          isC
                            ? 'bg-blue-500 text-white border-blue-400 shadow-sm'
                            : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-blue-400 hover:border-blue-500/50'
                        }`}
                        title="Consulted: Provides critical input prior to decision/action"
                      >
                        C
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleRaciRole(stk.id, 'I')}
                        className={`w-7 h-7 rounded-lg text-xs font-black transition-all flex items-center justify-center border ${
                          isI
                            ? 'bg-slate-300 text-slate-950 border-white shadow-sm'
                            : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-200 hover:border-slate-600'
                        }`}
                        title="Informed: Kept updated on progress and milestones"
                      >
                        I
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Dependencies Section */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200">
                <Link2 className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-xs">Task Dependencies & Sequence Links</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {dependencies.length} linked {dependencies.length === 1 ? 'predecessor' : 'predecessors'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Link predecessor tasks to sequence work. Finish-to-Start (FS) requires predecessor completion before start; Start-to-Start (SS) links simultaneous starts.
            </p>

            {/* Active Dependencies List */}
            {dependencies.length > 0 && (
              <div className="space-y-2 pt-1">
                {dependencies.map((depStr) => {
                  const parsed = parseDependency(depStr);
                  const predecessor = projectData.tasks.find(t => t.id === parsed.targetTaskId);
                  const conflict = checkDependencyConflict({ startDate, dueDate }, parsed, projectData.tasks);

                  return (
                    <div
                      key={parsed.targetTaskId}
                      className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors ${
                        conflict.hasConflict
                          ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                          : 'bg-slate-900 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] shrink-0 ${
                          parsed.type === 'FS'
                            ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'
                            : parsed.type === 'SS'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            : 'bg-purple-950 text-purple-300 border border-purple-500/30'
                        }`}>
                          {parsed.type}
                        </span>

                        <div className="truncate min-w-0 flex-1">
                          <span className="font-semibold text-slate-200 truncate block">
                            {predecessor ? predecessor.title : `Task (${parsed.targetTaskId})`}
                          </span>
                          {predecessor && (
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Predecessor Timeline: {predecessor.startDate} → {predecessor.dueDate}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {conflict.hasConflict && (
                          <div
                            className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/30 font-mono"
                            title={conflict.reason}
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                            <span>{conflict.reason}</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveDependency(parsed.targetTaskId)}
                          className="p-1 rounded-lg hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition-colors"
                          title="Remove dependency"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Dependency Control */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-2">
              <div className="flex-1 w-full sm:w-auto">
                <select
                  value={selectedDepTaskId}
                  onChange={(e) => setSelectedDepTaskId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 outline-none"
                >
                  <option value="">Select Predecessor Task...</option>
                  {availablePredecessorTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.startDate} → {t.dueDate})
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-auto">
                <select
                  value={selectedDepType}
                  onChange={(e) => setSelectedDepType(e.target.value as DependencyType)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-indigo-300 font-mono outline-none"
                >
                  <option value="FS">FS: Finish-to-Start</option>
                  <option value="SS">SS: Start-to-Start</option>
                  <option value="FF">FF: Finish-to-Finish</option>
                  <option value="SF">SF: Start-to-Finish</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleAddDependency}
                disabled={!selectedDepTaskId}
                className={`w-full sm:w-auto px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 ${
                  selectedDepTaskId
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-sm'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Link</span>
              </button>
            </div>
          </div>

          {/* Linked Bugs (Optional) */}
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-slate-200 font-semibold flex items-center gap-2">
                <Bug className="w-4 h-4 text-rose-400" />
                <span>Linked Bugs (Optional)</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {linkedBugIds.length} {linkedBugIds.length === 1 ? 'bug' : 'bugs'} linked
              </span>
            </div>
            
            <p className="text-[11px] text-slate-400">
              Link this work item to related bugs/defects to track defect remediation.
            </p>

            {/* Current Linked Bugs list */}
            {linkedBugIds.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {linkedBugIds.map(bId => {
                  const bObj = projectData.tasks.find(t => t.id === bId);
                  if (!bObj) return null;
                  return (
                    <div
                      key={bId}
                      className="flex items-center gap-1.5 bg-rose-950/40 border border-rose-500/30 text-rose-200 px-2.5 py-1 rounded-xl text-xs font-medium"
                    >
                      <Bug className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="truncate max-w-[200px]">{bObj.title}</span>
                      <button
                        type="button"
                        onClick={() => setLinkedBugIds(prev => prev.filter(id => id !== bId))}
                        className="text-rose-400 hover:text-rose-200 ml-1 rounded p-0.5 hover:bg-rose-900/40 cursor-pointer"
                        title="Unlink bug"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dropdown to select bug to link */}
            <div className="flex items-center gap-2 pt-1">
              <select
                value=""
                onChange={(e) => {
                  const selectedId = e.target.value;
                  if (selectedId && !linkedBugIds.includes(selectedId)) {
                    setLinkedBugIds(prev => [...prev, selectedId]);
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none cursor-pointer"
              >
                <option value="">+ Select a Bug to Link (Optional)...</option>
                {availableBugs
                  .filter(b => !linkedBugIds.includes(b.id))
                  .map(b => (
                    <option key={b.id} value={b.id}>
                      🐛 {b.title} [{b.status.toUpperCase()}]
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Auto-Calculated Cost & Progress Banner */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-indigo-500/30 space-y-2.5">
            <div className="flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-xs">Automated Stakeholder Cost Calculation</span>
              </div>
              <span className="font-mono text-xs text-indigo-300">
                Avg Rate: <strong>${avgHourlyRate}/hr</strong>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1 text-xs">
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Auto Planned Cost</span>
                <span className="text-sm font-bold font-mono text-emerald-400">${livePlannedCost.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 block font-mono mt-0.5">{estimatedHours} hrs × ${avgHourlyRate}/hr</span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Auto Actual Cost</span>
                <span className="text-sm font-bold font-mono text-amber-400">${liveActualCost.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 block font-mono mt-0.5">{actualHours} hrs × ${avgHourlyRate}/hr</span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Status Progress</span>
                <span className="text-sm font-bold font-mono text-indigo-400">{liveCompletionPercent}%</span>
                <span className="text-[10px] text-slate-500 block font-mono mt-0.5 capitalize">{status.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
            >
              {isTaskEditable ? 'Cancel' : 'Close'}
            </button>
            {isTaskEditable ? (
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20"
              >
                Save Work Item
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="px-5 py-2 rounded-xl bg-slate-800 text-slate-500 font-semibold text-xs cursor-not-allowed border border-slate-700"
              >
                Read-Only (Assigned to {assignedName})
              </button>
            )}
          </div>
        </form>
        </div>
      </div>

      {/* Quick Hierarchy Creation Modal */}
      <HierarchyItemModal
        isOpen={isHierarchyModalOpen}
        onClose={() => setIsHierarchyModalOpen(false)}
        initialType={hierarchyModalType}
        initialParentMilestoneId={milestoneId}
        initialParentEpicId={epicId}
      />
    </div>
  );
};
