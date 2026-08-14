import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Task, Priority, TaskStatus, WorkItemType, AcceptanceCriterion, TaskComment, TaskActivity } from '../../types';
import {
  X,
  Circle,
  CheckSquare,
  DollarSign,
  Clock,
  Calendar,
  Users,
  Calculator,
  ShieldCheck,
  Link2,
  Plus,
  AlertTriangle,
  Trash2,
  Flag,
  Bookmark,
  Layers,
  Bug,
  Sparkles,
  CheckCircle2,
  GitPullRequest,
  Info,
  Play,
  Square,
  Maximize2,
  Minimize2,
  MessageSquare,
  Paperclip,
  AtSign,
  Smile,
  Video,
  Bell,
  Mic,
  Send,
  Share2,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Zap,
  Check,
  Search,
  Filter,
  Wand2,
  Tag,
  FileText,
  File
} from 'lucide-react';
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
  const { projectData, saveTask, saveSubtask, currentUser } = useProject();

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
      if (taskToEdit.assigneeIds && taskToEdit.assigneeIds.includes(currentStakeholder.id)) return true;
    }
    if (taskToEdit.assigneeIds && taskToEdit.assigneeIds.includes(currentUser?.id)) return true;
    return false;
  }, [isPM, taskToEdit, currentStakeholder, currentUser]);

  const assignedName = useMemo(() => {
    if (!taskToEdit) return '';
    const match = projectData.stakeholders.find(s => (taskToEdit.assigneeIds && taskToEdit.assigneeIds.includes(s.id)));
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
  const [sprintId, setSprintId] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [responsibleIds, setResponsibleIds] = useState<string[]>([]);
  const [accountableIds, setAccountableIds] = useState<string[]>([]);
  const [consultedIds, setConsultedIds] = useState<string[]>([]);
  const [informedIds, setInformedIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]);
  const [estimatedHours, setEstimatedHours] = useState(20);
  const [actualHours, setActualHours] = useState(0);

  const [changeRequestId, setChangeRequestId] = useState('');

  // Time Tracker state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Quick creation modal for WBS items
  const [isHierarchyModalOpen, setIsHierarchyModalOpen] = useState(false);
  const [hierarchyModalType, setHierarchyModalType] = useState<HierarchyType>('feature');

  // Dependency Management State
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [selectedDepTaskId, setSelectedDepTaskId] = useState<string>('');
  const [selectedDepType, setSelectedDepType] = useState<DependencyType>('FS');

  // Acceptance Criteria State
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<AcceptanceCriterion[]>([]);
  const [newAcText, setNewAcText] = useState('');

  // Interactive ClickUp Fields State
  const [subtasksList, setSubtasksList] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [showSubtaskSection, setShowSubtaskSection] = useState(true);
  const [showDepSection, setShowDepSection] = useState(false);
  const [showAcSection, setShowAcSection] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: string; date: string }[]>([
    { name: 'architecture_diagram.pdf', size: '2.4 MB', date: 'Jul 6' }
  ]);

  // Activity & Comments feed state
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activities, setActivities] = useState<TaskActivity[]>([]);

  // View layout mode (drawer / fullscreen)
  const [isFullscreen, setIsFullscreen] = useState(false);

  const availableBugs = useMemo(() => {
    return projectData.tasks.filter(t => t.type === 'bug' && t.id !== taskToEdit?.id);
  }, [projectData.tasks, taskToEdit]);

  // Live timer interval
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else if (!isTimerRunning && timerSeconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  // Format stopwatch time
  const formatTimerTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleToggleTimer = () => {
    if (isTimerRunning) {
      // Stop timer and convert logged seconds into actual hours increment
      const addedHours = Math.max(0.1, Number((timerSeconds / 3600).toFixed(2)));
      setActualHours(prev => Number((prev + addedHours).toFixed(1)));
      setIsTimerRunning(false);
      const newAct: TaskActivity = {
        id: 'act-' + Date.now(),
        authorName: currentUser.name,
        action: `tracked ${formatTimerTime(timerSeconds)} time on this task`,
        timestamp: 'Just now'
      };
      setActivities(prev => [newAct, ...prev]);
    } else {
      setIsTimerRunning(true);
    }
  };

  useEffect(() => {
    if (taskToEdit) {
      setType(taskToEdit.type || 'task');
      setLinkedBugIds(taskToEdit.linkedBugIds || []);
      setAcceptanceCriteria(taskToEdit.acceptanceCriteria || []);
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setStatus(taskToEdit.status);
      setPriority(taskToEdit.priority);
      setEpicId(taskToEdit.epicId || '');
      setFeatureId(taskToEdit.featureId || '');
      setMilestoneId(taskToEdit.milestoneId || '');
      setSprintId(taskToEdit.sprintId || '');
      setChangeRequestId(taskToEdit.changeRequestId || '');
      
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

      // Load existing subtasks for this task
      const existingSub = projectData.subtasks.filter(st => st.taskId === taskToEdit.id);
      setSubtasksList(existingSub.map(st => ({ id: st.id, title: st.title, completed: st.completed })));

      // Load comments & activity logs
      setComments(taskToEdit.comments || [
        {
          id: 'c1',
          authorName: 'Laxmi kumari',
          authorEmail: 'laxmi@example.com',
          text: 'Verified project setup and initial configuration dependencies.',
          timestamp: 'Jul 7 at 8:59 pm'
        }
      ]);
      setActivities(taskToEdit.activityLogs || [
        { id: 'a1', authorName: currentUser.name, action: 'created this task', timestamp: 'Jul 6 at 5:26 pm' },
        { id: 'a2', authorName: 'Laxmi kumari', action: `changed status from Backlog to ${taskToEdit.status.toUpperCase().replace('_', ' ')}`, timestamp: 'Jul 7 at 8:59 pm' }
      ]);
    } else {
      setType('task');
      setLinkedBugIds([]);
      setAcceptanceCriteria([]);
      setTitle('');
      if (defaultStatus) setStatus(defaultStatus);
      setDescription('');
      setStatus(defaultStatus || 'todo');
      setPriority('normal');
      setChangeRequestId('');
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
      setSprintId(projectData.sprints && projectData.sprints[0] ? projectData.sprints[0].id : '');
      setAssigneeIds([projectData.stakeholders[0]?.id || '']);
      setResponsibleIds([]);
      setAccountableIds([]);
      setConsultedIds([]);
      setInformedIds([]);
      setStartDate(new Date().toISOString().split('T')[0]);
      setDueDate(new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]);
      setEstimatedHours(20);
      setActualHours(0);
      setDependencies([]);
      setSubtasksList([]);
      setComments([]);
      setActivities([
        { id: 'a0', authorName: currentUser.name, action: 'created this task', timestamp: 'Just now' }
      ]);
    }
    setSelectedDepTaskId('');
    setSelectedDepType('FS');
    setNewAcText('');
    setIsTimerRunning(false);
    setTimerSeconds(0);
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

  // Find selected CR details for validation display
  const selectedTaskCR = (projectData.changeRequests || []).find(cr => cr.id === changeRequestId);

  // Parent feature/epic title for breadcrumbs & subtask line
  const parentFeature = projectData.features.find(f => f.id === featureId);
  const parentEpic = (projectData.epics || []).find(e => e.id === epicId);
  const parentSprint = (projectData.sprints || []).find(s => s.id === sprintId);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

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
      sprintId: sprintId || undefined,
      changeRequestId: changeRequestId || undefined,
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
      linkedBugIds,
      acceptanceCriteria,
      comments,
      activityLogs: activities
    });

    // Save subtasks if created
    if (taskToEdit?.id) {
      for (const st of subtasksList) {
        await saveSubtask({
          id: st.id.startsWith('new-') ? undefined : st.id,
          taskId: taskToEdit.id,
          title: st.title,
          completed: st.completed
        });
      }
    }

    onClose();
  };

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    const commentObj: TaskComment = {
      id: 'c-' + Date.now(),
      authorName: currentUser.name,
      authorEmail: currentUser.email,
      text: newComment.trim(),
      timestamp: 'Just now'
    };
    setComments(prev => [...prev, commentObj]);
    setNewComment('');

    const newAct: TaskActivity = {
      id: 'act-' + Date.now(),
      authorName: currentUser.name,
      action: `commented: "${commentObj.text.slice(0, 40)}${commentObj.text.length > 40 ? '...' : ''}"`,
      timestamp: 'Just now'
    };
    setActivities(prev => [newAct, ...prev]);
  };

  const handleAddSubtaskItem = () => {
    if (!newSubtaskInput.trim()) return;
    const newSt = {
      id: 'new-' + Date.now(),
      title: newSubtaskInput.trim(),
      completed: false
    };
    setSubtasksList(prev => [...prev, newSt]);
    setNewSubtaskInput('');

    const newAct: TaskActivity = {
      id: 'act-' + Date.now(),
      authorName: currentUser.name,
      action: `added subtask "${newSt.title}"`,
      timestamp: 'Just now'
    };
    setActivities(prev => [newAct, ...prev]);
  };

  const handleAddAcceptanceCriterion = () => {
    if (!newAcText.trim()) return;
    const newAc: AcceptanceCriterion = {
      id: 'ac-' + Date.now(),
      text: newAcText.trim(),
      validated: false
    };
    setAcceptanceCriteria(prev => [...prev, newAc]);
    setNewAcText('');
  };

  const toggleAssignee = (id: string) => {
    setAssigneeIds(prev => {
      const updated = prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id];
      setResponsibleIds(updated);
      return updated;
    });
    const stk = projectData.stakeholders.find(s => s.id === id);
    if (stk) {
      const newAct: TaskActivity = {
        id: 'act-' + Date.now(),
        authorName: currentUser.name,
        action: `updated assignees for ${stk.name}`,
        timestamp: 'Just now'
      };
      setActivities(prev => [newAct, ...prev]);
    }
  };

  const handleStatusChange = (newSt: TaskStatus) => {
    const oldSt = status;
    setStatus(newSt);
    const newAct: TaskActivity = {
      id: 'act-' + Date.now(),
      authorName: currentUser.name,
      action: `changed status from ${oldSt.toUpperCase().replace('_', ' ')} to ${newSt.toUpperCase().replace('_', ' ')}`,
      timestamp: 'Just now'
    };
    setActivities(prev => [newAct, ...prev]);
  };

  const handleAddDependency = () => {
    if (!selectedDepTaskId) return;
    const formatted = formatDependency(selectedDepTaskId, selectedDepType);
    if (!dependencies.some(d => parseDependency(d).targetTaskId === selectedDepTaskId)) {
      setDependencies(prev => [...prev, formatted]);
    }
    setSelectedDepTaskId('');
  };

  const handleFileUploadSimulated = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newFile = {
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        date: 'Today'
      };
      setAttachedFiles(prev => [...prev, newFile]);
      const newAct: TaskActivity = {
        id: 'act-' + Date.now(),
        authorName: currentUser.name,
        action: `attached file ${file.name}`,
        timestamp: 'Just now'
      };
      setActivities(prev => [newAct, ...prev]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-end sm:p-2 md:p-4 overflow-hidden animate-in fade-in duration-200">
      <div className={`bg-[#121319] border border-slate-800/80 w-full ${
        isFullscreen ? 'max-w-full h-full rounded-none' : 'max-w-6xl h-full max-h-[calc(100vh-1.5rem)] rounded-2xl'
      } shadow-2xl flex flex-col overflow-hidden text-slate-100 transition-all duration-200`}>
        
        {/* ================= CLICKUP TOP BREADCRUMB & HEADER BAR ================= */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 bg-[#171821] shrink-0 text-xs">
          {/* Breadcrumb Path */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar font-sans text-slate-400">
            <span className="hover:text-slate-200 cursor-pointer">Shared with me</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="hover:text-slate-200 cursor-pointer font-medium text-slate-300">{projectData.name}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            {parentSprint && (
              <>
                <span className="hover:text-slate-200 cursor-pointer text-indigo-300 font-semibold">{parentSprint.name}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              </>
            )}
            {parentFeature && (
              <span className="hover:text-slate-200 cursor-pointer text-blue-300 truncate max-w-[150px]">{parentFeature.title}</span>
            )}
          </div>

          {/* Top Actions & Window Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px] text-slate-400 hidden sm:inline">Created Jul 6</span>

            <button
              type="button"
              onClick={() => {
                const aiDesc = `Generated specifications for ${title || 'task'}:\n- Validated API contracts\n- Added end-to-end integration tests\n- Configured automated deployment pipeline`;
                setDescription(aiDesc);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 text-purple-300 hover:text-purple-100 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              title="ClickUp Brain AI Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>Brain²</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title={isFullscreen ? "Restore side drawer view" : "Fullscreen mode"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => handleSubmit()}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Close and save"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= MAIN SPLIT CONTENT AREA (LEFT WORK ITEM / RIGHT ACTIVITY) ================= */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
          
          {/* ================= LEFT / CENTER WORK ITEM DETAILS (65% WIDTH) ================= */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar bg-[#121319]">
            
            {/* Work Item Type Badge & Subtask Parent line */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as WorkItemType)}
                    className="bg-slate-900 border border-slate-700/80 text-slate-200 text-xs font-bold rounded-lg px-2.5 py-1 outline-none cursor-pointer hover:border-indigo-500"
                  >
                    <option value="task">⚪ Task</option>
                    <option value="bug">🐛 Bug</option>
                  </select>

                  <span className="font-mono text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    #{taskToEdit?.id ? taskToEdit.id.slice(-6).toUpperCase() : 'NEW'}
                  </span>
                </div>

                {/* Save Changes button */}
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>

              {parentFeature && (
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span>Subtask of</span>
                  <span className="font-semibold text-slate-300 flex items-center gap-1">
                    <Circle className="w-3 h-3 text-indigo-400" />
                    {parentFeature.title}
                  </span>
                </div>
              )}
            </div>

            {/* Editable Title Heading */}
            <div>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Work item title (e.g. Verify project setup.)"
                className="w-full bg-transparent border-none outline-none text-xl sm:text-2xl font-bold text-slate-100 placeholder-slate-600 focus:ring-0 p-0"
              />
            </div>

            {/* AI Assistant ClickUp Brain Banner */}
            <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900/60 p-3 rounded-2xl border border-purple-500/25 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-purple-200 font-medium">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Ask <strong>Brain²</strong> for a presentation, document or prototype</span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setAcceptanceCriteria([
                      { id: 'ac-1', text: 'Unit tests coverage > 90%', validated: false },
                      { id: 'ac-2', text: 'Deployment verification on staging passes', validated: false }
                    ]);
                  }}
                  className="px-2.5 py-1 bg-purple-900/50 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 rounded-lg font-semibold transition-all"
                >
                  + Generate AC
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubtasksList([
                      { id: 'st-1', title: 'Setup isolated Docker container', completed: true },
                      { id: 'st-2', title: 'Verify npm package dependencies', completed: false },
                      { id: 'st-3', title: 'Run automated end-to-end test suite', completed: false }
                    ]);
                  }}
                  className="px-2.5 py-1 bg-indigo-900/50 hover:bg-indigo-800/60 border border-indigo-500/30 text-indigo-200 rounded-lg font-semibold transition-all"
                >
                  + Auto Breakdown
                </button>
              </div>
            </div>

            {/* ================= CLICKUP KEY-VALUE PROPERTY GRID (Matching Screenshot 2) ================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 bg-[#181922] p-4 rounded-2xl border border-slate-800/80 text-xs">
              
              {/* Status Row */}
              <div className="flex items-center gap-3">
                <span className="w-24 text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                  <Circle className="w-3.5 h-3.5 text-slate-500" /> Status
                </span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                    className="bg-indigo-600/20 text-indigo-200 border border-indigo-500/40 rounded-lg px-2.5 py-1 text-xs font-bold outline-none cursor-pointer hover:bg-indigo-600/30 transition-all uppercase"
                  >
                    <option value="todo" className="bg-slate-900 text-slate-200">TO DO</option>
                    <option value="in_progress" className="bg-slate-900 text-indigo-200">IN PROGRESS</option>
                    <option value="demoable" className="bg-slate-900 text-teal-200">DEMO READY (LOCAL)</option>
                    <option value="review" className="bg-slate-900 text-purple-200">UNDER REVIEW</option>
                    <option value="on_hold" className="bg-slate-900 text-amber-200">ON HOLD</option>
                    <option value="blocked" className="bg-slate-900 text-rose-200">BLOCKED</option>
                    <option value="done" className="bg-slate-900 text-emerald-200">DONE</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(status === 'done' ? 'todo' : 'done')}
                    className={`p-1 rounded-md border transition-all ${
                      status === 'done' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Toggle completed"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Assignees Row */}
              <div className="flex items-center gap-3">
                <span className="w-24 text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                  <Users className="w-3.5 h-3.5 text-slate-500" /> Assignees
                </span>
                <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto no-scrollbar">
                  {assigneeIds.map(stkId => {
                    const stk = projectData.stakeholders.find(s => s.id === stkId);
                    if (!stk) return null;
                    return (
                      <span
                        key={stkId}
                        className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full text-slate-200 text-xs font-medium shrink-0"
                      >
                        <span className="w-4 h-4 rounded-full bg-indigo-600 text-[9px] font-bold text-white flex items-center justify-center uppercase">
                          {stk.name.slice(0, 2)}
                        </span>
                        <span>{stk.name}</span>
                      </span>
                    );
                  })}
                  <div className="relative group">
                    <button
                      type="button"
                      className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                      title="Add assignee"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute top-full left-0 mt-1 hidden group-hover:block z-30 bg-slate-900 border border-slate-800 rounded-xl p-2 shadow-xl min-w-[180px]">
                      {projectData.stakeholders.map(s => (
                        <label key={s.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={assigneeIds.includes(s.id)}
                            onChange={() => toggleAssignee(s.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{s.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates Row */}
              <div className="flex items-center gap-3">
                <span className="w-24 text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Dates
                </span>
                <div className="flex items-center gap-1.5 text-slate-200">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-200 outline-none"
                  />
                  <span className="text-slate-500 font-mono">→</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-200 outline-none"
                  />
                </div>
              </div>

              {/* Priority Row */}
              <div className="flex items-center gap-3">
                <span className="w-24 text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                  <Flag className="w-3.5 h-3.5 text-slate-500" /> Priority
                </span>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className={`border rounded-lg px-2.5 py-1 text-xs font-semibold outline-none cursor-pointer ${
                    priority === 'urgent' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                    priority === 'high' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                    priority === 'normal' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' :
                    'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  <option value="urgent" className="bg-slate-900 text-rose-300">🚨 Urgent</option>
                  <option value="high" className="bg-slate-900 text-amber-300">⚡ High</option>
                  <option value="normal" className="bg-slate-900 text-indigo-300">🔹 Normal</option>
                  <option value="low" className="bg-slate-900 text-slate-400">◽ Low</option>
                </select>
              </div>

              {/* Time Estimate Row */}
              <div className="flex items-center gap-3">
                <span className="w-24 text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> Time estimate
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(Number(e.target.value))}
                    className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs font-mono text-slate-200 outline-none"
                  />
                  <span className="text-slate-500">hours</span>
                </div>
              </div>

              {/* Track Time Stopwatch Row */}
              <div className="flex items-center gap-3">
                <span className="w-24 text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Track time
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleTimer}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isTimerRunning
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {isTimerRunning ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                    <span>{isTimerRunning ? formatTimerTime(timerSeconds) : 'Start Timer'}</span>
                  </button>
                  <span className="text-slate-400 font-mono text-[11px]">Logged: {Math.round(actualHours * 100) / 100}h</span>
                </div>
              </div>

              {/* Linked Change Request Row (Optional) */}
              <div className="col-span-1 sm:col-span-2 pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                    <GitPullRequest className="w-3.5 h-3.5 text-indigo-400" /> Linked Change Request <span className="text-slate-500 font-normal text-[10px]">(Optional)</span>
                  </span>
                  {selectedTaskCR && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      selectedTaskCR.status === 'approved' || selectedTaskCR.status === 'implemented'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : selectedTaskCR.status === 'rejected'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : selectedTaskCR.status === 'deferred'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                    }`}>
                      {selectedTaskCR.status.toUpperCase()}
                    </span>
                  )}
                </div>

                <select
                  value={changeRequestId}
                  onChange={(e) => setChangeRequestId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="">-- No Linked Change Request (Optional) --</option>
                  {(projectData.changeRequests || []).map((cr) => (
                    <option key={cr.id} value={cr.id}>
                      {cr.crNumber}: {cr.title} ({cr.status})
                    </option>
                  ))}
                </select>

                <div className="flex items-start gap-1.5 text-[10px] text-indigo-300/80 bg-indigo-950/20 p-2 rounded-lg border border-indigo-500/20">
                  <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Validation Notice:</strong> Linking a Change Request is optional. If left unselected, this task will auto-inherit Change Request status from its parent Feature, Epic, or Milestone if linked.
                  </span>
                </div>
              </div>

              {/* RACI Matrix Row inside Work Item */}
              <div className="col-span-1 sm:col-span-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> RACI Responsibility Matrix
                  </span>
                  <span className="text-[10px] text-slate-500">Click role badges to assign stakeholders</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Responsible (R) */}
                  <div className="p-2 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono flex items-center justify-center font-bold">R</span>
                        Responsible
                      </span>
                      <span className="text-[10px] text-slate-500">({responsibleIds.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {projectData.stakeholders.map(s => {
                        const isSelected = responsibleIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setResponsibleIds(prev => isSelected ? prev.filter(i => i !== s.id) : [...prev, s.id]);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                              isSelected ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {s.name.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Accountable (A) */}
                  <div className="p-2 rounded-xl bg-slate-900 border border-purple-500/30 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-purple-400 flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono flex items-center justify-center font-bold">A</span>
                        Accountable
                      </span>
                      <span className="text-[10px] text-slate-500">({accountableIds.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {projectData.stakeholders.map(s => {
                        const isSelected = accountableIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setAccountableIds(prev => isSelected ? prev.filter(i => i !== s.id) : [...prev, s.id]);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                              isSelected ? 'bg-purple-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {s.name.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Consulted (C) */}
                  <div className="p-2 rounded-xl bg-slate-900 border border-blue-500/30 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-blue-400 flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-blue-500/20 text-blue-300 text-[9px] font-mono flex items-center justify-center font-bold">C</span>
                        Consulted
                      </span>
                      <span className="text-[10px] text-slate-500">({consultedIds.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {projectData.stakeholders.map(s => {
                        const isSelected = consultedIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setConsultedIds(prev => isSelected ? prev.filter(i => i !== s.id) : [...prev, s.id]);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                              isSelected ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {s.name.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Informed (I) */}
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-700 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-300 flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-slate-700 text-slate-200 text-[9px] font-mono flex items-center justify-center font-bold">I</span>
                        Informed
                      </span>
                      <span className="text-[10px] text-slate-500">({informedIds.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {projectData.stakeholders.map(s => {
                        const isSelected = informedIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setInformedIds(prev => isSelected ? prev.filter(i => i !== s.id) : [...prev, s.id]);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                              isSelected ? 'bg-slate-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {s.name.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description Area */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold text-xs flex items-center justify-between">
                <span>Description</span>
                <button
                  type="button"
                  onClick={() => setDescription(prev => prev + '\n- Acceptance test step verified.')}
                  className="text-indigo-400 hover:text-indigo-300 text-[11px] font-normal flex items-center gap-1"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Write with AI</span>
                </button>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add description, or write with 🪄 AI..."
                className="w-full bg-[#181922] border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* ================= CLICKUP FIELDS SECTION (Matching Screenshot 3) ================= */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider block">Fields & Sub-actions</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Add Subtask Button */}
                <button
                  type="button"
                  onClick={() => setShowSubtaskSection(!showSubtaskSection)}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[#181922] hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-medium transition-all text-left"
                >
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <span>Add subtask</span>
                  {subtasksList.length > 0 && (
                    <span className="ml-auto text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                      {subtasksList.filter(s => s.completed).length}/{subtasksList.length}
                    </span>
                  )}
                </button>

                {/* Relate items or add dependencies */}
                <button
                  type="button"
                  onClick={() => setShowDepSection(!showDepSection)}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[#181922] hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-medium transition-all text-left"
                >
                  <Link2 className="w-4 h-4 text-purple-400" />
                  <span>Relate items or add dependencies</span>
                  {dependencies.length > 0 && (
                    <span className="ml-auto text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                      {dependencies.length}
                    </span>
                  )}
                </button>

                {/* Create checklist / Acceptance criteria */}
                <button
                  type="button"
                  onClick={() => setShowAcSection(!showAcSection)}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[#181922] hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-medium transition-all text-left"
                >
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <span>Create checklist / Acceptance criteria</span>
                  {acceptanceCriteria.length > 0 && (
                    <span className="ml-auto text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      {acceptanceCriteria.length}
                    </span>
                  )}
                </button>

                {/* Attach File */}
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#181922] hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-medium transition-all cursor-pointer text-left">
                  <Paperclip className="w-4 h-4 text-amber-400" />
                  <span>Attach file</span>
                  <input type="file" onChange={handleFileUploadSimulated} className="hidden" />
                  {attachedFiles.length > 0 && (
                    <span className="ml-auto text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      {attachedFiles.length}
                    </span>
                  )}
                </label>
              </div>

              {/* Subtasks Expanded Panel */}
              {showSubtaskSection && (
                <div className="p-3 bg-[#181922] rounded-xl border border-slate-800/80 space-y-2 mt-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>Subtasks ({subtasksList.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {subtasksList.map(st => (
                      <div key={st.id} className="flex items-center gap-2 p-1.5 bg-slate-900 rounded-lg text-xs">
                        <input
                          type="checkbox"
                          checked={st.completed}
                          onChange={(e) => {
                            setSubtasksList(prev => prev.map(s => s.id === st.id ? { ...s, completed: e.target.checked } : s));
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className={`flex-1 ${st.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>{st.title}</span>
                        <button
                          type="button"
                          onClick={() => setSubtasksList(prev => prev.filter(s => s.id !== st.id))}
                          className="text-slate-500 hover:text-rose-400 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newSubtaskInput}
                      onChange={(e) => setNewSubtaskInput(e.target.value)}
                      placeholder="+ Add subtask title..."
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtaskItem(); } }}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddSubtaskItem}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Dependencies Expanded Panel */}
              {showDepSection && (
                <div className="p-3 bg-[#181922] rounded-xl border border-slate-800/80 space-y-2 mt-2">
                  <span className="text-xs font-semibold text-slate-300 block">Task Dependencies</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedDepTaskId}
                      onChange={(e) => setSelectedDepTaskId(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none"
                    >
                      <option value="">Select predecessor task...</option>
                      {projectData.tasks.filter(t => t.id !== taskToEdit?.id).map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                    <select
                      value={selectedDepType}
                      onChange={(e) => setSelectedDepType(e.target.value as DependencyType)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-indigo-300 outline-none font-mono"
                    >
                      <option value="FS">Finish-to-Start (FS)</option>
                      <option value="SS">Start-to-Start (SS)</option>
                      <option value="FF">Finish-to-Finish (FF)</option>
                      <option value="SF">Start-to-Finish (SF)</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddDependency}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold"
                    >
                      Link
                    </button>
                  </div>

                  {dependencies.map(d => {
                    const parsed = parseDependency(d);
                    const targetT = projectData.tasks.find(t => t.id === parsed.targetTaskId);
                    return (
                      <div key={d} className="flex items-center justify-between p-2 bg-slate-900 rounded-lg text-xs">
                        <span className="text-slate-200">{targetT ? targetT.title : parsed.targetTaskId} ({parsed.type})</span>
                        <button
                          type="button"
                          onClick={() => setDependencies(prev => prev.filter(item => item !== d))}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Acceptance Criteria Expanded Panel */}
              {showAcSection && (
                <div className="p-3 bg-[#181922] rounded-xl border border-slate-800/80 space-y-2 mt-2">
                  <span className="text-xs font-semibold text-slate-300 block">Acceptance Criteria</span>
                  {acceptanceCriteria.map((ac, idx) => (
                    <div key={ac.id || idx} className="flex items-center gap-2 p-1.5 bg-slate-900 rounded-lg text-xs">
                      <input
                        type="checkbox"
                        checked={ac.validated}
                        onChange={(e) => {
                          setAcceptanceCriteria(prev => prev.map(item => item.id === ac.id ? { ...item, validated: e.target.checked } : item));
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className={`flex-1 ${ac.validated ? 'line-through text-emerald-400' : 'text-slate-200'}`}>{ac.text}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newAcText}
                      onChange={(e) => setNewAcText(e.target.value)}
                      placeholder="+ Add acceptance criterion..."
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAcceptanceCriterion(); } }}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddAcceptanceCriterion}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                    >
                      Add AC
                    </button>
                  </div>
                </div>
              )}

              {/* Attached Files List */}
              {attachedFiles.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-medium block">Attachments ({attachedFiles.length})</span>
                  <div className="flex flex-wrap gap-2">
                    {attachedFiles.map((file, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2 p-2 rounded-xl bg-[#181922] border border-slate-800 text-xs">
                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                        <div>
                          <p className="font-medium text-slate-200 truncate max-w-[140px]">{file.name}</p>
                          <p className="text-[10px] text-slate-500">{file.size} • {file.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ================= RIGHT PANEL: ACTIVITY LOG & COMMENTS FEED (Matching Screenshots 2, 3, 4) ================= */}
          <div className="w-full lg:w-96 flex flex-col bg-[#161720] border-t lg:border-t-0 shrink-0 h-full">
            
            {/* Activity Header Bar */}
            <div className="flex items-center justify-between p-3.5 border-b border-slate-800/80 bg-[#171821]">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-slate-100">Activity</h4>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400 font-mono">
                  {comments.length + activities.length}
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-400">
                <button type="button" className="p-1 hover:text-white rounded hover:bg-slate-800"><Search className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:text-white rounded hover:bg-slate-800 relative">
                  <Bell className="w-3.5 h-3.5" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-500"></span>
                </button>
                <button type="button" className="p-1 hover:text-white rounded hover:bg-slate-800"><Filter className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {/* Activity & Comment Timeline List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs custom-scrollbar">
              
              {/* Activity Log Entries */}
              {activities.map(act => (
                <div key={act.id} className="flex items-start gap-2.5 text-slate-400 text-xs">
                  <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[9px] font-bold text-indigo-300 shrink-0 mt-0.5">
                    {act.authorName ? act.authorName.slice(0, 2).toUpperCase() : 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-300">
                      <strong className="text-slate-200">{act.authorName}</strong> {act.action}
                    </p>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{act.timestamp}</span>
                  </div>
                </div>
              ))}

              {/* Comments Feed */}
              {comments.map(c => (
                <div key={c.id} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-[9px] font-bold text-white flex items-center justify-center">
                        {c.authorName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-200">{c.authorName}</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">{c.timestamp}</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>

            {/* ClickUp Comment Input Box (Matching Screenshots 2, 3, 4) */}
            <div className="p-3 border-t border-slate-800/80 bg-[#121319] space-y-2">
              <div className="bg-[#1b1c27] border border-slate-800 rounded-xl p-2 space-y-2 focus-within:border-indigo-500/80 transition-colors">
                <textarea
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  placeholder="Write a comment..."
                  className="w-full bg-transparent border-none outline-none text-xs text-slate-100 placeholder-slate-500 resize-none"
                />

                {/* Comment Action Toolbar */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-slate-400">
                  <div className="flex items-center gap-2">
                    <button type="button" className="p-1 hover:text-white rounded hover:bg-slate-800" title="Add item"><Plus className="w-3.5 h-3.5" /></button>
                    <button type="button" className="p-1 hover:text-purple-300 rounded hover:bg-purple-900/30" title="Write with Brain AI"><Sparkles className="w-3.5 h-3.5 text-purple-400" /></button>
                    <button type="button" className="p-1 hover:text-white rounded hover:bg-slate-800" title="Attach file"><Paperclip className="w-3.5 h-3.5" /></button>
                    <button type="button" className="p-1 hover:text-white rounded hover:bg-slate-800" title="Mention"><AtSign className="w-3.5 h-3.5" /></button>
                    <button type="button" className="p-1 hover:text-white rounded hover:bg-slate-800" title="Emoji"><Smile className="w-3.5 h-3.5" /></button>
                    <button type="button" className="p-1 hover:text-white rounded hover:bg-slate-800" title="Video clip"><Video className="w-3.5 h-3.5" /></button>
                    <button type="button" className="p-1 hover:text-white rounded hover:bg-slate-800" title="Voice note"><Mic className="w-3.5 h-3.5" /></button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendComment}
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shrink-0 flex items-center justify-center"
                    title="Send comment"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

          </div>
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
