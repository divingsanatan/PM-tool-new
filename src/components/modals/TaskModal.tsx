import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Task, Priority, TaskStatus, WorkItemType, AcceptanceCriterion, TaskComment, TaskActivity } from '../../types';
import { triggerHaptic } from '../../utils/haptics';
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
  FolderGit2,
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
import { checkTaskLeaveConflict } from '../../utils/portfolioAndLeaveUtils';
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
  initialParentStoryId?: string;
  initialParentFeatureId?: string;
  initialParentEpicId?: string;
  initialParentMilestoneId?: string;
  initialSprintId?: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  defaultStatus,
  initialParentStoryId,
  initialParentFeatureId,
  initialParentEpicId,
  initialParentMilestoneId,
  initialSprintId
}) => {
  const { projectData, saveTask, deleteTask, saveSubtask, currentUser, leaves } = useProject();

  const isPM = currentUser?.role === 'pm' || currentUser?.role === 'admin';

  const currentStakeholder = useMemo(() => {
    if (!currentUser) return null;
    return projectData.stakeholders.find(
      s => s.email.toLowerCase() === currentUser.email.toLowerCase()
    );
  }, [projectData.stakeholders, currentUser]);

  const isEditing = Boolean(taskToEdit && taskToEdit.id);

  const isTaskEditable = useMemo(() => {
    if (isPM) return true;
    if (!isEditing || !taskToEdit) return true; // New task creation
    if (currentStakeholder) {
      if (taskToEdit.assigneeIds && taskToEdit.assigneeIds.includes(currentStakeholder.id)) return true;
    }
    if (taskToEdit.assigneeIds && taskToEdit.assigneeIds.includes(currentUser?.id)) return true;
    return false;
  }, [isPM, isEditing, taskToEdit, currentStakeholder, currentUser]);

  const assignedName = useMemo(() => {
    if (!isEditing || !taskToEdit) return '';
    const match = projectData.stakeholders.find(s => (taskToEdit.assigneeIds && taskToEdit.assigneeIds.includes(s.id)));
    return match ? match.name : 'another team member';
  }, [isEditing, taskToEdit, projectData.stakeholders]);

  const [type, setType] = useState<WorkItemType>('task');
  const [linkedBugIds, setLinkedBugIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mobileTab, setMobileTab] = useState<'details' | 'activity'>('details');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus || 'todo');
  const [priority, setPriority] = useState<Priority>('normal');
  const [storyId, setStoryId] = useState('');
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

  const leaveConflict = useMemo(() => {
    return checkTaskLeaveConflict(
      { startDate, dueDate, assigneeIds },
      leaves || [],
      projectData.stakeholders
    );
  }, [startDate, dueDate, assigneeIds, leaves, projectData.stakeholders]);

  useEffect(() => {
    if (taskToEdit && taskToEdit.id) {
      setType(taskToEdit.type || 'task');
      setLinkedBugIds(taskToEdit.linkedBugIds || []);
      setAcceptanceCriteria(taskToEdit.acceptanceCriteria || []);
      setTitle(taskToEdit.title || '');
      setDescription(taskToEdit.description || '');
      setStatus(taskToEdit.status || 'todo');
      setPriority(taskToEdit.priority || 'normal');
      setStoryId(taskToEdit.storyId || taskToEdit.userStoryId || '');
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

      setStartDate(taskToEdit.startDate || new Date().toISOString().split('T')[0]);
      setDueDate(taskToEdit.dueDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]);
      setEstimatedHours(taskToEdit.estimatedHours ?? 20);
      setActualHours(taskToEdit.actualHours ?? 0);
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
      const safeStatusLabel = (taskToEdit.status || 'todo').toUpperCase().replace('_', ' ');
      setActivities(taskToEdit.activityLogs || [
        { id: 'a1', authorName: currentUser.name, action: 'created this task', timestamp: 'Jul 6 at 5:26 pm' },
        { id: 'a2', authorName: 'Laxmi kumari', action: `changed status from Backlog to ${safeStatusLabel}`, timestamp: 'Jul 7 at 8:59 pm' }
      ]);
    } else {
      // Creating a new task (optionally with presets from taskToEdit like sprintId or dueDate)
      setType(taskToEdit?.type || 'task');
      setLinkedBugIds(taskToEdit?.linkedBugIds || []);
      setAcceptanceCriteria(taskToEdit?.acceptanceCriteria || []);
      setTitle(taskToEdit?.title || '');
      setDescription(taskToEdit?.description || '');
      setStatus(taskToEdit?.status || defaultStatus || 'todo');
      setPriority(taskToEdit?.priority || 'normal');
      setChangeRequestId(taskToEdit?.changeRequestId || '');
      
      const targetStoryId = taskToEdit?.storyId || taskToEdit?.userStoryId || initialParentStoryId || '';
      setStoryId(targetStoryId);
      if (targetStoryId) {
        const targetStory = (projectData.userStories || []).find(s => s.id === targetStoryId);
        if (targetStory) {
          setFeatureId(taskToEdit?.featureId || targetStory.featureId || initialParentFeatureId || '');
          setEpicId(taskToEdit?.epicId || targetStory.epicId || initialParentEpicId || '');
          setMilestoneId(taskToEdit?.milestoneId || targetStory.milestoneId || initialParentMilestoneId || '');
          if (targetStory.sprintId && !initialSprintId && taskToEdit?.sprintId === undefined) {
            setSprintId(targetStory.sprintId);
          } else {
            setSprintId(taskToEdit?.sprintId !== undefined ? taskToEdit.sprintId : (initialSprintId || ''));
          }
        }
      } else {
        const targetFeatId = taskToEdit?.featureId || initialParentFeatureId || '';
        setFeatureId(targetFeatId);
        if (targetFeatId) {
          const targetFeat = projectData.features.find(f => f.id === targetFeatId);
          const parentEp = targetFeat?.epicId ? (projectData.epics || []).find(e => e.id === targetFeat.epicId) : undefined;
          setEpicId(taskToEdit?.epicId || targetFeat?.epicId || initialParentEpicId || '');
          setMilestoneId(taskToEdit?.milestoneId || targetFeat?.milestoneId || parentEp?.milestoneId || initialParentMilestoneId || '');
        } else {
          setEpicId(taskToEdit?.epicId || initialParentEpicId || '');
          setMilestoneId(taskToEdit?.milestoneId || initialParentMilestoneId || '');
        }
        setSprintId(taskToEdit?.sprintId !== undefined ? taskToEdit.sprintId : (initialSprintId || ''));
      }

      setAssigneeIds(taskToEdit?.assigneeIds && taskToEdit.assigneeIds.length > 0 ? taskToEdit.assigneeIds : [projectData.stakeholders[0]?.id || '']);
      setResponsibleIds([]);
      setAccountableIds([]);
      setConsultedIds([]);
      setInformedIds([]);
      setStartDate(taskToEdit?.startDate || new Date().toISOString().split('T')[0]);
      setDueDate(taskToEdit?.dueDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]);
      setEstimatedHours(taskToEdit?.estimatedHours ?? 20);
      setActualHours(taskToEdit?.actualHours ?? 0);
      setDependencies(taskToEdit?.dependencies || []);
      setSubtasksList([]);
      setComments([]);
      setActivities([
        { id: 'a0', authorName: currentUser.name, action: 'created this task', timestamp: 'Just now' }
      ]);
    }
    setTitleError(false);
    setShowDeleteConfirm(false);
    setMobileTab('details');
    setSelectedDepTaskId('');
    setSelectedDepType('FS');
    setNewAcText('');
    setIsTimerRunning(false);
    setTimerSeconds(0);
  }, [taskToEdit, defaultStatus, isOpen]);

  // Keyboard shortcut listener (Cmd/Ctrl + Enter to save, Esc to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, title, description, status, priority, storyId, epicId, featureId, milestoneId, sprintId, assigneeIds, startDate, dueDate, estimatedHours, actualHours, subtasksList, acceptanceCriteria, dependencies]);

  // Handle automatic hierarchy filling when story is selected
  const handleStorySelect = (selectedStoryId: string) => {
    setStoryId(selectedStoryId);
    if (selectedStoryId) {
      const story = (projectData.userStories || []).find(s => s.id === selectedStoryId);
      if (story) {
        if (story.featureId) {
          setFeatureId(story.featureId);
          const feat = projectData.features.find(f => f.id === story.featureId);
          if (feat?.epicId) setEpicId(feat.epicId);
          if (feat?.milestoneId) setMilestoneId(feat.milestoneId);
        }
        if (story.epicId) setEpicId(story.epicId);
        if (story.milestoneId) setMilestoneId(story.milestoneId);
        if (story.sprintId) setSprintId(story.sprintId);
      }
    }
  };

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

  // Parent user story, feature, epic title for breadcrumbs & subtask line
  const parentStory = (projectData.userStories || []).find(s => s.id === storyId);
  const parentFeature = projectData.features.find(f => f.id === (featureId || parentStory?.featureId));
  const parentEpic = (projectData.epics || []).find(e => e.id === (epicId || parentFeature?.epicId || parentStory?.epicId));
  const parentSprint = (projectData.sprints || []).find(s => s.id === sprintId);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setTitleError(true);
      setMobileTab('details');
      return;
    }
    setTitleError(false);

    await saveTask({
      id: taskToEdit?.id,
      type,
      title: title.trim(),
      description,
      status,
      priority,
      storyId: storyId || undefined,
      userStoryId: storyId || undefined,
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

    triggerHaptic(status === 'done' ? 'success' : 'light');
    onClose();
  };

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    triggerHaptic('light');
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
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center lg:justify-end p-0 sm:p-2 md:p-4 overflow-hidden animate-in fade-in duration-200">
      <div className={`bg-[#121319] border-0 sm:border border-slate-800/80 w-full ${
        isFullscreen ? 'max-w-full h-full rounded-none' : 'max-w-6xl h-full sm:max-h-[calc(100vh-1rem)] rounded-none sm:rounded-2xl'
      } shadow-2xl flex flex-col overflow-hidden text-slate-100 transition-all duration-200`}>
        
        {/* ================= CLICKUP TOP BREADCRUMB & HEADER BAR ================= */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-slate-800/80 bg-[#171821] shrink-0 text-xs gap-2">
          {/* Breadcrumb Path */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar font-sans text-slate-400 min-w-0">
            <span className="hover:text-slate-200 cursor-pointer shrink-0 hidden sm:inline">Workspace</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0 hidden sm:inline" />
            <span className="hover:text-slate-200 cursor-pointer font-medium text-slate-300 truncate max-w-[120px] sm:max-w-[160px]">{projectData.name}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            {parentSprint && (
              <>
                <span className="hover:text-slate-200 cursor-pointer text-indigo-300 font-semibold truncate max-w-[100px]">{parentSprint.name}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              </>
            )}
            {parentFeature && (
              <span className="hover:text-slate-200 cursor-pointer text-blue-300 truncate max-w-[100px] sm:max-w-[150px]">{parentFeature.title}</span>
            )}
          </div>

          {/* Top Actions & Window Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const aiDesc = `Generated specifications for ${title || 'task'}:\n- Validated API contracts and error handling\n- Added end-to-end integration tests with coverage\n- Configured automated deployment pipeline and monitoring`;
                setDescription(aiDesc);
              }}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 text-purple-300 hover:text-purple-100 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              title="ClickUp Brain AI Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>Brain²</span>
            </button>

            {/* Quick Header Save button for rapid desktop actions */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="hidden sm:flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Save work item (⌘+Enter)"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Save' : 'Create'}</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors hidden sm:inline-flex cursor-pointer"
              title={isFullscreen ? "Restore standard view" : "Fullscreen mode"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= MOBILE TAB SWITCHER (FOR SCREENS < LG) ================= */}
        <div className="flex lg:hidden border-b border-slate-800 bg-[#161720] px-3 py-1.5 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('details')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              mobileTab === 'details'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Task Details</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('activity')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              mobileTab === 'activity'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Activity & Chat</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${mobileTab === 'activity' ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {comments.length + activities.length}
            </span>
          </button>
        </div>

        {/* ================= MAIN SPLIT CONTENT AREA (LEFT WORK ITEM / RIGHT ACTIVITY) ================= */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80 min-h-0">
          
          {/* ================= LEFT / CENTER WORK ITEM DETAILS (65% WIDTH) ================= */}
          <div className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar bg-[#121319] min-h-0 ${
            mobileTab === 'activity' ? 'hidden lg:block' : 'block'
          }`}>
            
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

                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                    status === 'done' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' :
                    status === 'in_progress' ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/30' :
                    status === 'blocked' ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30' :
                    'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {(parentStory || parentFeature) && (
                <div className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
                  <span>Part of</span>
                  {parentStory ? (
                    <span className="font-semibold text-emerald-300 flex items-center gap-1">
                      <Bookmark className="w-3 h-3 text-emerald-400" />
                      {parentStory.title}
                    </span>
                  ) : parentFeature ? (
                    <span className="font-semibold text-blue-300 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-blue-400" />
                      {parentFeature.title}
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            {/* Editable Title Heading with Validation Error Ring */}
            <div className="space-y-1">
              <input
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (e.target.value.trim()) setTitleError(false);
                }}
                placeholder="Work item title (e.g. Verify project setup, API Integration...)"
                className={`w-full bg-slate-900/40 border ${
                  titleError ? 'border-rose-500 ring-2 ring-rose-500/30' : 'border-slate-800/80 focus:border-indigo-500'
                } rounded-xl px-3.5 py-2 sm:py-2.5 text-lg sm:text-xl font-bold text-slate-100 placeholder-slate-600 outline-none transition`}
              />
              {titleError && (
                <p className="text-xs text-rose-400 font-medium flex items-center gap-1.5 pt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Please enter a title for this work item before saving
                </p>
              )}
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

            {/* ================= CLICKUP KEY-VALUE PROPERTY GRID ================= */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3.5 gap-x-6 bg-[#181922] p-3.5 sm:p-4 rounded-2xl border border-slate-800/80 text-xs">
              
              {/* Status Row */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="w-20 sm:w-24 text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                  <Circle className="w-3.5 h-3.5 text-slate-500" /> Status
                </span>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                    className="w-full min-w-0 bg-indigo-600/20 text-indigo-200 border border-indigo-500/40 rounded-lg px-2.5 py-1 text-xs font-bold outline-none cursor-pointer hover:bg-indigo-600/30 transition-all uppercase truncate"
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
                    className={`p-1 rounded-md border shrink-0 transition-all cursor-pointer ${
                      status === 'done' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Toggle completed"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Priority Row */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="w-20 sm:w-24 text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                  <Flag className="w-3.5 h-3.5 text-slate-500" /> Priority
                </span>
                <div className="flex-1 min-w-0">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className={`w-full min-w-0 border rounded-lg px-2.5 py-1 text-xs font-semibold outline-none cursor-pointer truncate ${
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
              </div>

              {/* Sprint Assignment Row */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="w-20 sm:w-24 text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                  <Layers className="w-3.5 h-3.5 text-purple-400" /> Sprint
                </span>
                <div className="flex-1 min-w-0">
                  <select
                    value={sprintId}
                    onChange={(e) => setSprintId(e.target.value)}
                    className="w-full min-w-0 bg-slate-900 border border-purple-500/30 text-purple-200 rounded-lg px-2.5 py-1 text-xs font-medium outline-none cursor-pointer hover:border-purple-400 truncate"
                  >
                    <option value="" className="bg-slate-900 text-slate-300">📦 No Sprint (Backlog)</option>
                    {(projectData.sprints || []).map(sp => (
                      <option key={sp.id} value={sp.id} className="bg-slate-900 text-purple-200">
                        ⚡ {sp.name} {sp.status === 'active' ? '(Active)' : `(${sp.status})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Parent User Story Alignment Row */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="w-20 sm:w-24 text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                  <Bookmark className="w-3.5 h-3.5 text-emerald-400" /> Story
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-1">
                  <select
                    value={storyId}
                    onChange={(e) => handleStorySelect(e.target.value)}
                    className="w-full min-w-0 bg-slate-900 border border-emerald-500/30 text-emerald-200 rounded-lg px-2.5 py-1 text-xs font-medium outline-none cursor-pointer hover:border-emerald-400 truncate"
                  >
                    <option value="" className="bg-slate-900 text-slate-300">-- No Parent Story --</option>
                    {(projectData.userStories || []).map(s => {
                      const feat = projectData.features.find(f => f.id === s.featureId);
                      return (
                        <option key={s.id} value={s.id} className="bg-slate-900 text-emerald-200">
                          {s.title} {feat ? `[${feat.title}]` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={() => openQuickCreate('userStory')}
                    className="p-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0"
                    title="Quick create User Story"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Parent Feature Alignment Row */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="w-20 sm:w-24 text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                  <FolderGit2 className="w-3.5 h-3.5 text-blue-400" /> Feature
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-1">
                  <select
                    value={featureId}
                    onChange={(e) => handleFeatureSelect(e.target.value)}
                    className="w-full min-w-0 bg-slate-900 border border-blue-500/30 text-blue-200 rounded-lg px-2.5 py-1 text-xs font-medium outline-none cursor-pointer hover:border-blue-400 truncate"
                  >
                    <option value="" className="bg-slate-900 text-slate-300">-- Standalone / Direct --</option>
                    {(projectData.features || []).map(f => {
                      const ep = (projectData.epics || []).find(e => e.id === f.epicId);
                      return (
                        <option key={f.id} value={f.id} className="bg-slate-900 text-blue-200">
                          {f.title} {ep ? `(${ep.title})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={() => openQuickCreate('feature')}
                    className="p-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0"
                    title="Quick create Feature"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Assignees Row (Spans full width when multiple members assigned) */}
              <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 pt-1 min-w-0">
                <span className="w-20 sm:w-24 text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                  <Users className="w-3.5 h-3.5 text-slate-500" /> Assignees
                </span>
                <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                  {assigneeIds.map(stkId => {
                    const stk = projectData.stakeholders.find(s => s.id === stkId);
                    if (!stk) return null;
                    return (
                      <span
                        key={stkId}
                        className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full text-slate-200 text-xs font-medium shrink-0 max-w-full"
                      >
                        <span className="w-4 h-4 rounded-full bg-indigo-600 text-[9px] font-bold text-white flex items-center justify-center uppercase shrink-0">
                          {stk.name.slice(0, 2)}
                        </span>
                        <span className="truncate max-w-[140px] sm:max-w-none">{stk.name}</span>
                      </span>
                    );
                  })}
                  <div className="relative group">
                    <button
                      type="button"
                      className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
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
                            className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="truncate">{s.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates Row (Spans full width so date pickers never get cut off or overflow) */}
              <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 pt-1 min-w-0">
                <span className="w-20 sm:w-24 text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Dates
                </span>
                <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 min-w-0 max-w-full">
                    <span className="text-[11px] text-slate-400 shrink-0">Start:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer min-w-0 max-w-[130px] sm:max-w-none"
                    />
                  </div>
                  <span className="text-slate-500 font-mono shrink-0">→</span>
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 min-w-0 max-w-full">
                    <span className="text-[11px] text-slate-400 shrink-0">Due:</span>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer min-w-0 max-w-[130px] sm:max-w-none"
                    />
                  </div>
                </div>
              </div>

              {/* Leave Conflict Warning Banner */}
              {leaveConflict.hasConflict && (
                <div className="col-span-1 md:col-span-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold">Availability Conflict: </span>
                    {leaveConflict.conflicts.map(c => `${c.memberName} is on approved ${c.leave.leaveType} (${c.leave.startDate} to ${c.leave.endDate})`).join('; ')}
                  </div>
                </div>
              )}

              {/* Time Estimate Row */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="w-20 sm:w-24 text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> Estimate
                </span>
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <input
                    type="number"
                    min="0"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(Number(e.target.value))}
                    className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono text-slate-200 outline-none focus:border-indigo-500 shrink-0"
                  />
                  <span className="text-slate-500 text-xs shrink-0">hours</span>
                </div>
              </div>

              {/* Track Time Stopwatch Row */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="w-20 sm:w-24 text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Track time
                </span>
                <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={handleToggleTimer}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      isTimerRunning
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {isTimerRunning ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                    <span>{isTimerRunning ? formatTimerTime(timerSeconds) : 'Start Timer'}</span>
                  </button>
                  <span className="text-slate-400 font-mono text-[11px] shrink-0">Logged: {Math.round(actualHours * 100) / 100}h</span>
                </div>
              </div>

              {/* Linked Change Request Row (Optional) */}
              <div className="col-span-1 md:col-span-2 pt-2 border-t border-slate-800/80 space-y-1.5 min-w-0">
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
                  className="w-full min-w-0 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 truncate"
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
              <div className="col-span-1 md:col-span-2 pt-2 border-t border-slate-800/80 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> RACI Responsibility Matrix
                  </span>
                  <span className="text-[10px] text-slate-500">Click role badges to assign stakeholders</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
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
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[#181922] hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-medium transition-all text-left min-w-0"
                >
                  <Plus className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate">Add subtask</span>
                  {subtasksList.length > 0 && (
                    <span className="ml-auto text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded shrink-0">
                      {subtasksList.filter(s => s.completed).length}/{subtasksList.length}
                    </span>
                  )}
                </button>

                {/* Relate items or add dependencies */}
                <button
                  type="button"
                  onClick={() => setShowDepSection(!showDepSection)}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[#181922] hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-medium transition-all text-left min-w-0"
                >
                  <Link2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="truncate">Dependencies & Relations</span>
                  {dependencies.length > 0 && (
                    <span className="ml-auto text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded shrink-0">
                      {dependencies.length}
                    </span>
                  )}
                </button>

                {/* Create checklist / Acceptance criteria */}
                <button
                  type="button"
                  onClick={() => setShowAcSection(!showAcSection)}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[#181922] hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-medium transition-all text-left min-w-0"
                >
                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Acceptance criteria</span>
                  {acceptanceCriteria.length > 0 && (
                    <span className="ml-auto text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                      {acceptanceCriteria.length}
                    </span>
                  )}
                </button>

                {/* Attach File */}
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#181922] hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-medium transition-all cursor-pointer text-left min-w-0">
                  <Paperclip className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">Attach file</span>
                  <input type="file" onChange={handleFileUploadSimulated} className="hidden" />
                  {attachedFiles.length > 0 && (
                    <span className="ml-auto text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
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
          <div className={`w-full lg:w-96 flex flex-col bg-[#161720] border-t lg:border-t-0 shrink-0 lg:h-full flex-1 lg:flex-initial overflow-hidden ${
            mobileTab === 'details' ? 'hidden lg:flex' : 'flex'
          }`}>
            
            {/* Activity Header Bar */}
            <div className="flex items-center justify-between p-3.5 border-b border-slate-800/80 bg-[#171821] shrink-0">
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
            <div className="p-3 border-t border-slate-800/80 bg-[#121319] space-y-2 shrink-0">
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
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shrink-0 flex items-center justify-center cursor-pointer"
                    title="Send comment"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ================= PRIMARY STICKY FOOTER ACTIONS BAR ================= */}
        <div className="px-3.5 sm:px-6 py-3 border-t border-slate-800/90 bg-[#151620] shrink-0 flex items-center justify-between gap-3 shadow-2xl z-20">
          {/* Left actions: Delete / Keyboard shortcuts info */}
          <div className="flex items-center gap-2">
            {isEditing && (
              <>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                    <span className="text-xs text-rose-400 font-semibold hidden sm:inline">Delete this task?</span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (taskToEdit?.id) {
                          await deleteTask(taskToEdit.id);
                          onClose();
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Delete</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-950/40 hover:border-rose-500/60 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
                    title="Delete work item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Delete Task</span>
                  </button>
                )}
              </>
            )}

            <div className="text-[11px] text-slate-400 hidden md:flex items-center gap-1.5 ml-1">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-slate-300">Esc</span>
              <span>to cancel</span>
              <span className="mx-1 text-slate-600">•</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-slate-300">⌘+Enter</span>
              <span>to save</span>
            </div>
          </div>

          {/* Right actions: Cancel & Primary Save/Create Button */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold transition cursor-pointer hover:bg-slate-800/60 text-center whitespace-nowrap shrink-0"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSubmit()}
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 sm:py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-center whitespace-nowrap shrink-0 min-w-fit"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{isEditing ? 'Save Changes' : 'Create Work Item'}</span>
            </button>
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
