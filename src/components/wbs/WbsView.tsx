import React, { useState, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Task, Feature, Epic, Milestone, Subtask, Priority, TaskStatus } from '../../types';
import { RaciTagCell } from './RaciTagCell';
import { DEFAULT_STATUS_PERCENTAGES } from '../../utils/taskCalculations';
import {
  Network,
  ChevronDown,
  ChevronRight,
  FolderGit2,
  CheckSquare,
  ListTodo,
  Flag,
  Plus,
  Edit2,
  Search,
  Maximize2,
  Minimize2,
  Clock,
  DollarSign,
  User,
  CheckCircle2,
  PauseCircle,
  AlertCircle,
  Presentation,
  Sliders,
  Layers,
  ChevronDownSquare,
  ChevronUpSquare,
  Calculator,
  Link2,
  AlertTriangle,
  Bookmark,
  Trash2,
  Kanban,
  List,
  Filter,
  Sparkles,
  Zap,
  ArrowRight,
  GripVertical,
  Move,
  PieChart,
  Circle,
  Box,
  Wand2,
  Calendar,
  Users,
  Tag,
  FileText,
  Bug
} from 'lucide-react';
import { HierarchyItemModal, HierarchyType } from '../modals/HierarchyItemModal';
import {
  getStatusProgress,
  getTaskEffectiveValues,
  getFeatureEffectiveValues,
  getEpicEffectiveValues,
  getMilestoneEffectiveValues,
  getProjectEffectiveValues,
  getTaskAllAssigneeIds,
  getFeatureAllAssigneeIds,
  getEpicAllAssigneeIds,
  getMilestoneAllAssigneeIds,
  getProjectAllAssigneeIds
} from '../../utils/taskCalculations';
import {
  getTaskPredecessors,
  getTaskSuccessors
} from '../../utils/dependencies';

interface WbsViewProps {
  onOpenTaskModal: (task?: Task) => void;
}

type DisplayViewType = 'tree' | 'list' | 'board';
type GroupByMode = 'milestone-feature' | 'feature-task' | 'status';

export const WbsView: React.FC<WbsViewProps> = ({ onOpenTaskModal }) => {
  const {
    projectData,
    saveTask,
    deleteTask,
    saveSubtask,
    deleteSubtask,
    saveFeature,
    saveEpic,
    saveMilestone,
    deleteEpic,
    deleteFeature,
    deleteMilestone,
    updateStatusPercentages,
    currentUser
  } = useProject();

  const [showStatusConfigModal, setShowStatusConfigModal] = useState(false);
  const [tempPercentages, setTempPercentages] = useState<Record<string, number>>(
    projectData.statusPercentages || DEFAULT_STATUS_PERCENTAGES
  );

  const isPM = currentUser.role === 'pm';

  const currentStakeholder = useMemo(() => {
    return projectData.stakeholders.find(
      s => s.email.toLowerCase() === currentUser.email.toLowerCase()
    );
  }, [projectData.stakeholders, currentUser.email]);

  const canUserEditTask = (_task: Task): boolean => {
    // Enable work item status updates and edits for all active team roles in WBS
    return true;
  };

  // Primary View Mode (Tree, List, Board, Table)
  const [viewType, setViewType] = useState<DisplayViewType>('tree');
  const [groupBy, setGroupBy] = useState<GroupByMode>('milestone-feature');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'task' | 'bug'>('all');
  const [onlyConflicts, setOnlyConflicts] = useState(false);

  // Drag & Drop State
  const [draggedItem, setDraggedItem] = useState<{
    type: 'task' | 'feature' | 'epic' | 'subtask';
    id: string;
    parentId?: string;
  } | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);
  const [dragNotice, setDragNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setDragNotice(msg);
    setTimeout(() => {
      setDragNotice(null);
    }, 4000);
  };

  const handleDragStart = (e: React.DragEvent, type: 'task' | 'feature' | 'epic' | 'subtask', id: string, parentId?: string) => {
    e.stopPropagation();
    if (type === 'task') {
      const task = projectData.tasks.find(t => t.id === id);
      if (task && !canUserEditTask(task)) {
        showNotice(`⚠️ Read-Only: You can only move/drag tasks assigned to you.`);
        return;
      }
    }
    const payload = { type, id, parentId };
    setDraggedItem(payload);
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTargetId !== targetId) {
      setDragOverTargetId(targetId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);
  };

  const handleDropOnFeature = async (targetFeatureId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);

    let item = draggedItem;
    if (!item) {
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) item = JSON.parse(raw);
      } catch (err) {
        // ignore
      }
    }
    if (!item) return;

    const targetFeature = projectData.features.find(f => f.id === targetFeatureId);
    if (!targetFeature) return;

    if (item.type === 'task') {
      const task = projectData.tasks.find(t => t.id === item.id);
      if (task) {
        await saveTask({
          ...task,
          featureId: targetFeature.id,
          epicId: targetFeature.epicId,
          milestoneId: targetFeature.milestoneId
        });
        showNotice(`Moved task "${task.title}" under Feature "${targetFeature.title}"`);
      }
    } else if (item.type === 'subtask') {
      const subtask = projectData.subtasks.find(st => st.id === item.id);
      if (subtask) {
        await saveTask({
          title: subtask.title,
          featureId: targetFeature.id,
          epicId: targetFeature.epicId,
          milestoneId: targetFeature.milestoneId,
          status: subtask.completed ? 'done' : 'todo',
          priority: 'normal',
          assigneeIds: [currentUser.id],
          estimatedHours: subtask.estimatedHours || 4,
          actualHours: subtask.actualHours || 0,
          plannedCost: 500
        });
        await deleteSubtask(subtask.id);
        showNotice(`Promoted subtask "${subtask.title}" to a full task under Feature "${targetFeature.title}"`);
      }
    }
    setDraggedItem(null);
  };

  const handleDropOnEpic = async (targetEpicId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);

    let item = draggedItem;
    if (!item) {
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) item = JSON.parse(raw);
      } catch (err) {
        // ignore
      }
    }
    if (!item) return;

    const targetEpic = (projectData.epics || []).find(ep => ep.id === targetEpicId);
    if (!targetEpic) return;

    if (item.type === 'feature') {
      const feat = projectData.features.find(f => f.id === item.id);
      if (feat) {
        await saveFeature({
          ...feat,
          epicId: targetEpic.id,
          milestoneId: targetEpic.milestoneId || feat.milestoneId
        });
        showNotice(`Moved Feature "${feat.title}" under Epic "${targetEpic.title}"`);
      }
    } else if (item.type === 'task') {
      const task = projectData.tasks.find(t => t.id === item.id);
      if (task) {
        await saveTask({
          ...task,
          epicId: targetEpic.id,
          milestoneId: targetEpic.milestoneId || task.milestoneId,
          featureId: undefined
        });
        showNotice(`Moved Task "${task.title}" directly under Epic "${targetEpic.title}"`);
      }
    }
    setDraggedItem(null);
  };

  const handleDropOnMilestone = async (targetMilestoneId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);

    let item = draggedItem;
    if (!item) {
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) item = JSON.parse(raw);
      } catch (err) {
        // ignore
      }
    }
    if (!item) return;

    const targetMilestone = projectData.milestones.find(m => m.id === targetMilestoneId);
    if (!targetMilestone) return;

    if (item.type === 'epic') {
      const epic = (projectData.epics || []).find(ep => ep.id === item.id);
      if (epic) {
        await saveEpic({ ...epic, milestoneId: targetMilestone.id });
        showNotice(`Moved Epic "${epic.title}" under Milestone "${targetMilestone.title}"`);
      }
    } else if (item.type === 'feature') {
      const feat = projectData.features.find(f => f.id === item.id);
      if (feat) {
        await saveFeature({ ...feat, milestoneId: targetMilestone.id });
        showNotice(`Moved Feature "${feat.title}" under Milestone "${targetMilestone.title}"`);
      }
    } else if (item.type === 'task') {
      const task = projectData.tasks.find(t => t.id === item.id);
      if (task) {
        await saveTask({ ...task, milestoneId: targetMilestone.id, featureId: undefined, epicId: undefined });
        showNotice(`Moved Task "${task.title}" directly under Milestone "${targetMilestone.title}"`);
      }
    }
    setDraggedItem(null);
  };

  const handleDropOnStatus = async (targetStatus: TaskStatus, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);

    let item = draggedItem;
    if (!item) {
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) item = JSON.parse(raw);
      } catch (err) {
        // ignore
      }
    }
    if (!item) return;

    if (item.type === 'task') {
      const task = projectData.tasks.find(t => t.id === item.id);
      if (task) {
        await saveTask({
          ...task,
          status: targetStatus,
          completionPercent: getStatusProgress(targetStatus)
        });
        showNotice(`Updated Task "${task.title}" status to ${targetStatus.toUpperCase().replace('_', ' ')}`);
      }
    }
    setDraggedItem(null);
  };

  const handleDropOnTask = async (targetTaskId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);

    let item = draggedItem;
    if (!item) {
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) item = JSON.parse(raw);
      } catch (err) {
        // ignore
      }
    }
    if (!item || item.id === targetTaskId) return;

    const targetTask = projectData.tasks.find(t => t.id === targetTaskId);
    if (!targetTask) return;

    if (item.type === 'subtask') {
      const subtask = projectData.subtasks.find(st => st.id === item.id);
      if (subtask) {
        await saveSubtask({ ...subtask, taskId: targetTaskId });
        showNotice(`Moved Subtask "${subtask.title}" under Task "${targetTask.title}"`);
      }
    } else if (item.type === 'task') {
      const draggedTask = projectData.tasks.find(t => t.id === item.id);
      if (draggedTask) {
        await saveTask({
          ...draggedTask,
          featureId: targetTask.featureId,
          epicId: targetTask.epicId,
          milestoneId: targetTask.milestoneId
        });
        showNotice(`Re-aligned Task "${draggedTask.title}" into Feature/Epic of "${targetTask.title}"`);
      }
    }
    setDraggedItem(null);
  };

  // Convert WBS Item Type handler
  const handleConvertItemType = async (
    targetType: 'milestone' | 'epic' | 'feature' | 'task' | 'subtask',
    item: { id: string; type: 'feature' | 'task' | 'subtask' | 'epic' | 'milestone'; parentTaskId?: string }
  ) => {
    if (item.type === targetType) return;

    if (item.type === 'task') {
      const task = projectData.tasks.find(t => t.id === item.id);
      if (!task) return;

      if (targetType === 'feature') {
        const newFeature: Feature = {
          id: `feat-${Date.now()}`,
          title: task.title,
          description: task.description || '',
          epicId: task.epicId,
          milestoneId: task.milestoneId,
          status: 'in_progress',
          priority: task.priority || 'normal',
          targetReleaseDate: task.dueDate || projectData.targetEndDate,
          color: '#6366f1'
        };
        await saveFeature(newFeature);
        await deleteTask(task.id);
        showNotice(`Converted Task "${task.title}" to Feature`);
      } else if (targetType === 'epic') {
        const newEpic: Epic = {
          id: `epic-${Date.now()}`,
          title: task.title,
          description: task.description || '',
          milestoneId: task.milestoneId,
          status: 'in_progress'
        };
        await saveEpic(newEpic);
        await deleteTask(task.id);
        showNotice(`Converted Task "${task.title}" to Epic`);
      } else if (targetType === 'milestone') {
        const newMilestone: Milestone = {
          id: `m-${Date.now()}`,
          title: task.title,
          description: task.description || '',
          epicId: task.epicId,
          featureId: task.featureId,
          dueDate: task.dueDate || projectData.targetEndDate,
          status: 'in_progress',
          baselineCost: task.plannedCost || 1000,
          actualCost: task.actualCost || 0
        };
        await saveMilestone(newMilestone);
        await deleteTask(task.id);
        showNotice(`Converted Task "${task.title}" to Milestone`);
      } else if (targetType === 'subtask') {
        const otherTask = projectData.tasks.find(t => t.id !== task.id);
        if (!otherTask) {
          showNotice('No existing task found to convert to subtask under.');
          return;
        }
        const newSubtask: Subtask = {
          id: `st-${Date.now()}`,
          taskId: otherTask.id,
          title: task.title,
          completed: task.status === 'done',
          estimatedHours: task.estimatedHours || 4,
          actualHours: task.actualHours || 0
        };
        await saveSubtask(newSubtask);
        await deleteTask(task.id);
        showNotice(`Converted Task "${task.title}" to Subtask under "${otherTask.title}"`);
      }
    } else if (item.type === 'feature') {
      const feat = projectData.features.find(f => f.id === item.id);
      if (!feat) return;

      if (targetType === 'task') {
        const newTask: Task = {
          id: `task-${Date.now()}`,
          title: feat.title,
          description: feat.description,
          epicId: feat.epicId,
          milestoneId: feat.milestoneId,
          status: 'todo',
          priority: feat.priority || 'normal',
          assigneeIds: [currentUser.id],
          startDate: projectData.startDate,
          dueDate: feat.targetReleaseDate || projectData.targetEndDate,
          estimatedHours: 8,
          actualHours: 0,
          plannedCost: 1000,
          actualCost: 0,
          completionPercent: 0,
          dependencies: [],
          tags: []
        };
        await saveTask(newTask);
        const childTasks = projectData.tasks.filter(t => t.featureId === feat.id);
        for (const ct of childTasks) {
          await saveTask({ ...ct, featureId: undefined });
        }
        await deleteFeature(feat.id);
        showNotice(`Converted Feature "${feat.title}" to Work Item`);
      } else if (targetType === 'epic') {
        const newEpic: Epic = {
          id: `epic-${Date.now()}`,
          title: feat.title,
          description: feat.description,
          milestoneId: feat.milestoneId,
          status: 'in_progress'
        };
        await saveEpic(newEpic);
        const childTasks = projectData.tasks.filter(t => t.featureId === feat.id);
        for (const ct of childTasks) {
          await saveTask({ ...ct, epicId: newEpic.id, featureId: undefined });
        }
        await deleteFeature(feat.id);
        showNotice(`Converted Feature "${feat.title}" to Epic`);
      } else if (targetType === 'milestone') {
        const newMilestone: Milestone = {
          id: `m-${Date.now()}`,
          title: feat.title,
          description: feat.description,
          epicId: feat.epicId,
          dueDate: feat.targetReleaseDate || projectData.targetEndDate,
          status: 'in_progress',
          baselineCost: 5000,
          actualCost: 0
        };
        await saveMilestone(newMilestone);
        const childTasks = projectData.tasks.filter(t => t.featureId === feat.id);
        for (const ct of childTasks) {
          await saveTask({ ...ct, milestoneId: newMilestone.id, featureId: undefined });
        }
        await deleteFeature(feat.id);
        showNotice(`Converted Feature "${feat.title}" to Milestone`);
      } else if (targetType === 'subtask') {
        const parentTask = projectData.tasks[0];
        if (!parentTask) {
          showNotice('No existing task found to attach subtask to.');
          return;
        }
        const newSubtask: Subtask = {
          id: `st-${Date.now()}`,
          taskId: parentTask.id,
          title: feat.title,
          completed: false,
          estimatedHours: 8,
          actualHours: 0
        };
        await saveSubtask(newSubtask);
        await deleteFeature(feat.id);
        showNotice(`Converted Feature "${feat.title}" to Subtask under "${parentTask.title}"`);
      }
    } else if (item.type === 'subtask') {
      const st = projectData.subtasks.find(s => s.id === item.id);
      if (!st) return;
      const parentTask = projectData.tasks.find(t => t.id === st.taskId);

      if (targetType === 'task') {
        const newTask: Task = {
          id: `task-${Date.now()}`,
          title: st.title,
          description: '',
          epicId: parentTask?.epicId,
          featureId: parentTask?.featureId,
          milestoneId: parentTask?.milestoneId,
          status: st.completed ? 'done' : 'todo',
          priority: 'normal',
          assigneeIds: st.assigneeId ? [st.assigneeId] : [currentUser.id],
          startDate: projectData.startDate,
          dueDate: parentTask?.dueDate || projectData.targetEndDate,
          estimatedHours: st.estimatedHours || 4,
          actualHours: st.actualHours || 0,
          plannedCost: 500,
          actualCost: 0,
          completionPercent: st.completed ? 100 : 0,
          dependencies: [],
          tags: []
        };
        await saveTask(newTask);
        await deleteSubtask(st.id);
        showNotice(`Promoted Subtask "${st.title}" to Task`);
      } else if (targetType === 'feature') {
        const newFeature: Feature = {
          id: `feat-${Date.now()}`,
          title: st.title,
          description: '',
          epicId: parentTask?.epicId,
          milestoneId: parentTask?.milestoneId,
          status: 'in_progress',
          priority: 'normal',
          targetReleaseDate: parentTask?.dueDate || projectData.targetEndDate,
          color: '#6366f1'
        };
        await saveFeature(newFeature);
        await deleteSubtask(st.id);
        showNotice(`Promoted Subtask "${st.title}" to Feature`);
      } else if (targetType === 'epic') {
        const newEpic: Epic = {
          id: `epic-${Date.now()}`,
          title: st.title,
          description: '',
          milestoneId: parentTask?.milestoneId,
          status: 'in_progress'
        };
        await saveEpic(newEpic);
        await deleteSubtask(st.id);
        showNotice(`Promoted Subtask "${st.title}" to Epic`);
      } else if (targetType === 'milestone') {
        const newMilestone: Milestone = {
          id: `m-${Date.now()}`,
          title: st.title,
          description: '',
          dueDate: parentTask?.dueDate || projectData.targetEndDate,
          status: 'in_progress',
          baselineCost: 1000,
          actualCost: 0
        };
        await saveMilestone(newMilestone);
        await deleteSubtask(st.id);
        showNotice(`Promoted Subtask "${st.title}" to Milestone`);
      }
    }
  };

  // Subtask Quick Add state
  const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<string, string>>({});
  const [newSubtaskHours, setNewSubtaskHours] = useState<Record<string, number>>({});

  // Fast Work Item Quick Add Bar state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<Priority>('normal');
  const [quickStatus, setQuickStatus] = useState<TaskStatus>('todo');
  const [quickFeatureId, setQuickFeatureId] = useState('');
  const [quickAssigneeId, setQuickAssigneeId] = useState(currentUser.id);
  const [quickEstHours, setQuickEstHours] = useState<number>(8);
  const [quickPlannedCost, setQuickPlannedCost] = useState<number>(1000);

  // Kanban Column Quick Add title
  const [kanbanNewTitle, setKanbanNewTitle] = useState<Record<string, string>>({});

  // Inline Task Creation state for ClickUp/Linear/WBS style rows
  const [activeInlineFeatureId, setActiveInlineFeatureId] = useState<string | null>(null);
  const [inlineTaskTitle, setInlineTaskTitle] = useState('');
  const [inlineAssigneeId, setInlineAssigneeId] = useState(currentUser.id);
  const [inlineDueDate, setInlineDueDate] = useState('');
  const [inlinePriority, setInlinePriority] = useState<Priority>('normal');
  const [inlineStatus, setInlineStatus] = useState<TaskStatus>('todo');

  // Inline Subtask Creation state
  const [activeInlineTaskId, setActiveInlineTaskId] = useState<string | null>(null);
  const [inlineSubtaskTitle, setInlineSubtaskTitle] = useState('');
  const [inlineSubtaskHours, setInlineSubtaskHours] = useState<number>(4);

  const handleSaveInlineSubtask = async (taskId: string) => {
    if (!inlineSubtaskTitle.trim()) return;
    const newSubtask: Subtask = {
      id: `st-${Date.now()}`,
      taskId,
      title: inlineSubtaskTitle.trim(),
      completed: false,
      estimatedHours: inlineSubtaskHours || 4,
      actualHours: 0
    };
    await saveSubtask(newSubtask);
    setInlineSubtaskTitle('');
    showNotice(`Added subtask "${newSubtask.title}"`);
  };

  const cycleTaskStatus = async (task: Task) => {
    const statuses: TaskStatus[] = ['todo', 'in_progress', 'demoable', 'review', 'on_hold', 'blocked', 'done'];
    const currentIdx = statuses.indexOf(task.status);
    const nextStatus = statuses[(currentIdx + 1) % statuses.length];
    await saveTask({
      ...task,
      status: nextStatus,
      completionPercent: getStatusProgress(nextStatus, projectData.statusPercentages)
    });
    showNotice(`Updated Task "${task.title}" status to ${nextStatus.toUpperCase().replace('_', ' ')} (${getStatusProgress(nextStatus, projectData.statusPercentages)}%)`);
  };

  const renderAssigneeAvatars = (assigneeIds: string[]) => {
    if (!assigneeIds || assigneeIds.length === 0) {
      return (
        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[9px] font-bold" title="Unassigned">
          ?
        </span>
      );
    }

    const avatarStyles = [
      'bg-emerald-600 text-white border-emerald-500',
      'bg-purple-600 text-white border-purple-500',
      'bg-indigo-600 text-white border-indigo-500',
      'bg-amber-600 text-white border-amber-500',
      'bg-rose-600 text-white border-rose-500',
      'bg-cyan-600 text-white border-cyan-500'
    ];

    return (
      <div className="flex items-center -space-x-1.5 overflow-hidden">
        {assigneeIds.slice(0, 3).map((id, index) => {
          const stakeholder = projectData.stakeholders.find(s => s.id === id);
          const name = stakeholder ? stakeholder.name : 'User';
          const parts = name.split(' ');
          const initials = parts.length >= 2 
            ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
            : name.slice(0, 2).toUpperCase();
          const colorClass = avatarStyles[index % avatarStyles.length];

          return (
            <span
              key={id}
              className={`w-6 h-6 rounded-full ${colorClass} border flex items-center justify-center text-[9px] font-black shadow-sm shrink-0`}
              title={name}
            >
              {initials}
            </span>
          );
        })}
        {assigneeIds.length > 3 && (
          <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center text-[9px] font-bold shrink-0">
            +{assigneeIds.length - 3}
          </span>
        )}
      </div>
    );
  };

  const handleSaveInlineTask = async (featureId?: string, statusOverride?: TaskStatus) => {
    if (!inlineTaskTitle.trim()) return;

    let targetMilestoneId = '';
    let targetEpicId = '';
    if (featureId) {
      const feat = projectData.features.find(f => f.id === featureId);
      if (feat) {
        targetMilestoneId = feat.milestoneId || '';
        targetEpicId = feat.epicId || '';
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const nextWeek = inlineDueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const statusToUse = statusOverride || inlineStatus;

    await saveTask({
      title: inlineTaskTitle.trim(),
      description: '',
      featureId: featureId || undefined,
      milestoneId: targetMilestoneId || undefined,
      epicId: targetEpicId || undefined,
      status: statusToUse,
      priority: inlinePriority,
      assigneeIds: inlineAssigneeId ? [inlineAssigneeId] : [currentUser.id],
      startDate: today,
      dueDate: nextWeek,
      estimatedHours: 8,
      actualHours: 0,
      plannedCost: 1000,
      actualCost: 0,
      completionPercent: getStatusProgress(statusToUse),
      tags: ['WorkItem']
    });

    setInlineTaskTitle('');
  };

  // Hierarchy creation/editing modal state
  const [isHierarchyModalOpen, setIsHierarchyModalOpen] = useState(false);
  const [hierarchyModalType, setHierarchyModalType] = useState<HierarchyType>('feature');
  const [initialParentMilestoneId, setInitialParentMilestoneId] = useState('');
  const [initialParentEpicId, setInitialParentEpicId] = useState('');
  const [itemToEdit, setItemToEdit] = useState<Milestone | Epic | Feature | null>(null);

  const openCreateModal = (type: HierarchyType, parentMilestoneId = '', parentEpicId = '') => {
    setItemToEdit(null);
    setHierarchyModalType(type);
    setInitialParentMilestoneId(parentMilestoneId);
    setInitialParentEpicId(parentEpicId);
    setIsHierarchyModalOpen(true);
  };

  const openEditModal = (item: Milestone | Epic | Feature) => {
    setItemToEdit(item);
    if ('dueDate' in item && 'baselineCost' in item) {
      setHierarchyModalType('milestone');
    } else if ('priority' in item || 'targetReleaseDate' in item) {
      setHierarchyModalType('feature');
    } else {
      setHierarchyModalType('epic');
    }
    setIsHierarchyModalOpen(true);
  };

  // Expanded nodes for Tree view
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    project: true,
    'm-1': true,
    'm-2': true,
    'm-3': true,
    'm-4': true,
    'feat-1': true,
    'feat-2': true,
    'feat-3': true,
    'feat-4': true,
    'unassigned-milestone': true,
    'unassigned-feature': true
  });

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const expandAll = () => {
    const allIds: Record<string, boolean> = { project: true };
    projectData.milestones.forEach(m => { allIds[m.id] = true; });
    projectData.features.forEach(f => { allIds[f.id] = true; });
    projectData.tasks.forEach(t => { allIds[t.id] = true; });
    allIds['unassigned-milestone'] = true;
    allIds['unassigned-feature'] = true;
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes({ project: true });
  };

  // Identify Tasks with Predecessor Schedule Conflicts
  const tasksWithConflicts = useMemo(() => {
    return projectData.tasks.filter(t => {
      const preds = getTaskPredecessors(t, projectData.tasks);
      return preds.some(p => p.hasConflict);
    });
  }, [projectData.tasks]);

  const isFilterActive = useMemo(() => {
    return searchQuery.trim() !== '' || statusFilter !== 'all' || priorityFilter !== 'all' || typeFilter !== 'all' || onlyConflicts;
  }, [searchQuery, statusFilter, priorityFilter, typeFilter, onlyConflicts]);

  const isTaskInMilestone = (task: Task, milestoneId: string): boolean => {
    if (task.milestoneId === milestoneId) return true;
    if (task.featureId) {
      const feat = projectData.features.find(f => f.id === task.featureId);
      if (feat && feat.milestoneId === milestoneId) return true;
      if (feat && feat.epicId) {
        const epic = (projectData.epics || []).find(e => e.id === feat.epicId);
        if (epic && epic.milestoneId === milestoneId) return true;
      }
    }
    if (task.epicId) {
      const epic = (projectData.epics || []).find(e => e.id === task.epicId);
      if (epic && epic.milestoneId === milestoneId) return true;
    }
    return false;
  };

  // Filter tasks based on search query, status, priority, type, and conflict toggle
  const filteredTasks = useMemo(() => {
    return projectData.tasks.filter(task => {
      const q = searchQuery.trim().toLowerCase();

      // Parent Hierarchy items for comprehensive search matching
      const parentFeature = projectData.features.find(f => f.id === task.featureId);
      const parentEpic = (projectData.epics || []).find(e => e.id === task.epicId || e.id === parentFeature?.epicId);
      const parentMilestone = projectData.milestones.find(
        m => m.id === task.milestoneId || m.id === parentFeature?.milestoneId || m.id === parentEpic?.milestoneId
      );

      const matchesSearch = !q || (
        task.title.toLowerCase().includes(q) ||
        (task.description && task.description.toLowerCase().includes(q)) ||
        task.tags.some(tag => tag.toLowerCase().includes(q)) ||
        (parentFeature && parentFeature.title.toLowerCase().includes(q)) ||
        (parentEpic && parentEpic.title.toLowerCase().includes(q)) ||
        (parentMilestone && parentMilestone.title.toLowerCase().includes(q))
      );
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesType = typeFilter === 'all' || (typeFilter === 'bug' ? task.type === 'bug' : task.type !== 'bug');

      let matchesConflict = true;
      if (onlyConflicts) {
        const preds = getTaskPredecessors(task, projectData.tasks);
        matchesConflict = preds.some(p => p.hasConflict);
      }

      return matchesSearch && matchesStatus && matchesPriority && matchesType && matchesConflict;
    });
  }, [projectData.tasks, projectData.features, projectData.epics, projectData.milestones, searchQuery, statusFilter, priorityFilter, typeFilter, onlyConflicts]);

  // Subtask helper
  const getSubtasksForTask = (taskId: string): Subtask[] => {
    return projectData.subtasks.filter(st => st.taskId === taskId);
  };

  // Stakeholder helper
  const getAssigneeNames = (assigneeIds: string[]): string => {
    const names = assigneeIds
      .map(id => projectData.stakeholders.find(s => s.id === id)?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : 'Unassigned';
  };

  // Priority Badge Helper
  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">High</span>;
      case 'normal':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Normal</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">Low</span>;
    }
  };

  // Status Badge with Auto Progress
  const getStatusBadge = (status: TaskStatus) => {
    const pct = getStatusProgress(status, projectData.statusPercentages);
    switch (status) {
      case 'done':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Completed ({pct}%)</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">In Progress ({pct}%)</span>;
      case 'demoable':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">Demo-able ({pct}%)</span>;
      case 'review':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">In Testing ({pct}%)</span>;
      case 'on_hold':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">On Hold ({pct}%)</span>;
      case 'blocked':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">Blocked ({pct}%)</span>;
      case 'todo':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">To Do ({pct}%)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">{status} ({pct}%)</span>;
    }
  };

  // Effective Cascading Project Rollups
  const projectRollup = useMemo(() => {
    return getProjectEffectiveValues(filteredTasks, projectData.subtasks, projectData.stakeholders);
  }, [filteredTasks, projectData.subtasks, projectData.stakeholders]);

  // Subtask Add Handler
  const handleAddSubtask = async (taskId: string) => {
    const title = newSubtaskTitles[taskId]?.trim();
    if (!title) return;
    const estHours = newSubtaskHours[taskId] || 4;
    await saveSubtask({
      taskId,
      title,
      completed: false,
      estimatedHours: estHours,
      actualHours: 0
    });
    setNewSubtaskTitles(prev => ({ ...prev, [taskId]: '' }));
    setNewSubtaskHours(prev => ({ ...prev, [taskId]: 4 }));
  };

  // Fast ClickUp Quick Add Work Item Handler
  const handleQuickAddWorkItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickTitle.trim()) return;

    let targetMilestoneId = '';
    let targetEpicId = '';
    if (quickFeatureId) {
      const feat = projectData.features.find(f => f.id === quickFeatureId);
      if (feat) {
        targetMilestoneId = feat.milestoneId || '';
        targetEpicId = feat.epicId || '';
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    await saveTask({
      title: quickTitle.trim(),
      description: '',
      featureId: quickFeatureId || undefined,
      milestoneId: targetMilestoneId || undefined,
      epicId: targetEpicId || undefined,
      status: quickStatus,
      priority: quickPriority,
      assigneeIds: quickAssigneeId ? [quickAssigneeId] : [],
      startDate: today,
      dueDate: nextWeek,
      estimatedHours: Number(quickEstHours) || 8,
      actualHours: 0,
      plannedCost: Number(quickPlannedCost) || 1000,
      actualCost: 0,
      completionPercent: getStatusProgress(quickStatus),
      tags: ['WorkItem']
    });

    setQuickTitle('');
  };

  // Kanban Quick Add Handler
  const handleKanbanQuickAdd = async (status: TaskStatus) => {
    const title = kanbanNewTitle[status]?.trim();
    if (!title) return;

    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    await saveTask({
      title,
      description: '',
      status,
      priority: 'normal',
      assigneeIds: [currentUser.id],
      startDate: today,
      dueDate: nextWeek,
      estimatedHours: 8,
      actualHours: 0,
      plannedCost: 1000,
      actualCost: 0,
      completionPercent: getStatusProgress(status),
      tags: ['BoardItem']
    });

    setKanbanNewTitle(prev => ({ ...prev, [status]: '' }));
  };

  return (
    <div id="wbs-view" className="space-y-5">
      {/* Top Banner & Primary View Mode Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm min-w-0">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Network className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">Work Breakdown & Task Management</h2>
              <p className="text-xs text-slate-400">
                Hierarchical workspace for Milestones, Epics, Features, and Work Items with live EVM rollups.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs (Tree, List, Board, Table) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 overflow-x-auto max-w-full">
          <button
            id="view-tab-tree"
            onClick={() => setViewType('tree')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              viewType === 'tree' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Network className="w-3.5 h-3.5 shrink-0" />
            <span>WBS Tree</span>
          </button>
          <button
            id="view-tab-list"
            onClick={() => setViewType('list')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              viewType === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5 shrink-0" />
            <span>List</span>
          </button>
          <button
            id="view-tab-board"
            onClick={() => setViewType('board')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              viewType === 'board' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Kanban className="w-3.5 h-3.5 shrink-0" />
            <span>Kanban</span>
          </button>
        </div>
      </div>

      {/* Drag and Drop Realtime Feedback Banner */}
      {dragNotice && (
        <div className="p-3 rounded-xl bg-indigo-950/90 border border-indigo-500/40 text-xs text-indigo-100 flex items-center gap-2.5 shadow-md animate-fade-in">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold">{dragNotice}</span>
        </div>
      )}

      {/* Dependency Schedule Conflict Alert Banner */}
      {tasksWithConflicts.length > 0 && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <p className="font-bold text-rose-300">
                {tasksWithConflicts.length} Task Schedule Conflict{tasksWithConflicts.length !== 1 ? 's' : ''}
              </p>
              <p className="text-rose-300/80 text-[11px] mt-0.5">
                Dates overlap with Finish-to-Start or Start-to-Start predecessor constraints.
              </p>
            </div>
          </div>
          <button
            onClick={() => setOnlyConflicts(!onlyConflicts)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 border transition-colors ${
              onlyConflicts
                ? 'bg-rose-500 text-white border-rose-400'
                : 'bg-rose-900/60 text-rose-200 hover:bg-rose-800 border-rose-500/40'
            }`}
          >
            {onlyConflicts ? 'Show All Items' : 'Filter Conflicts'}
          </button>
        </div>
      )}

      {/* Control Toolbar: Hierarchy Creation & Search Filters */}
      <div className="flex flex-col gap-3 bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-2xl text-xs shadow-sm min-w-0">
        {/* Top Row: GroupBy Switcher & Quick Create Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          {viewType === 'tree' && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full no-scrollbar shrink-0">
              <button
                onClick={() => setGroupBy('milestone-feature')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors text-xs shrink-0 whitespace-nowrap ${
                  groupBy === 'milestone-feature' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Flag className="w-3.5 h-3.5 shrink-0" />
                <span>Milestone Hierarchy</span>
              </button>
              <button
                onClick={() => setGroupBy('feature-task')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors text-xs shrink-0 whitespace-nowrap ${
                  groupBy === 'feature-task' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FolderGit2 className="w-3.5 h-3.5 shrink-0" />
                <span>Feature View</span>
              </button>
              <button
                onClick={() => setGroupBy('status')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors text-xs shrink-0 whitespace-nowrap ${
                  groupBy === 'status' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>By Status</span>
              </button>
            </div>
          )}

          {/* Quick Create Hierarchy Items */}
          <div className="flex flex-wrap items-center gap-1.5 py-0.5 min-w-0">
            <button
              onClick={() => openCreateModal('milestone')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-medium transition-colors shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Milestone</span>
            </button>

            <button
              onClick={() => openCreateModal('epic')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 text-xs font-medium transition-colors shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Epic</span>
            </button>

            <button
              onClick={() => openCreateModal('feature')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 text-xs font-medium transition-colors shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Feature</span>
            </button>

            <button
              onClick={() => onOpenTaskModal()}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-sm shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Work Item</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Search & Filters */}
        <div className="flex items-center gap-2 flex-wrap min-w-0 w-full pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800/80 text-slate-300 flex-1 sm:flex-none sm:w-56 min-w-[140px]">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full placeholder-slate-500 text-slate-200"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800/80 text-slate-300 px-3 py-1.5 rounded-xl outline-none cursor-pointer text-xs flex-1 sm:flex-none min-w-[110px]"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="demoable">Demo-able</option>
            <option value="review">Testing</option>
            <option value="on_hold">On Hold</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </select>

          <button
            onClick={() => {
              setTempPercentages(projectData.statusPercentages || DEFAULT_STATUS_PERCENTAGES);
              setShowStatusConfigModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-white text-xs font-semibold transition-all shrink-0 whitespace-nowrap shadow-xs"
            title="Configure Status Completion Percentages for PM"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Status % Rules</span>
          </button>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800/80 text-slate-300 px-3 py-1.5 rounded-xl outline-none cursor-pointer text-xs flex-1 sm:flex-none min-w-[110px]"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'task' | 'bug')}
            className="bg-slate-950 border border-slate-800/80 text-slate-300 px-3 py-1.5 rounded-xl outline-none cursor-pointer text-xs flex-1 sm:flex-none min-w-[120px]"
          >
            <option value="all">All Work Types</option>
            <option value="task">Tasks Only</option>
            <option value="bug">🐛 Bugs Only</option>
          </select>
        </div>
      </div>

      {/* Active Filters Summary Bar */}
      {isFilterActive && (
        <div className="flex items-center justify-between gap-2 bg-indigo-950/60 border border-indigo-500/30 p-2.5 rounded-xl text-xs text-indigo-200 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-semibold text-slate-200">Active Filters:</span>
            {searchQuery.trim() && (
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                Search: "{searchQuery.trim()}"
              </span>
            )}
            {typeFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono capitalize">
                Type: {typeFilter === 'bug' ? 'Bugs Only' : 'Tasks Only'}
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono capitalize">
                Status: {statusFilter.replace('_', ' ')}
              </span>
            )}
            {priorityFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono capitalize">
                Priority: {priorityFilter}
              </span>
            )}
            {onlyConflicts && (
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                Conflicts Only
              </span>
            )}
            <span className="text-slate-400 font-mono ml-1">
              ({filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} matched)
            </span>
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setPriorityFilter('all');
              setOnlyConflicts(false);
            }}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shrink-0 shadow-sm"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* ==================== VIEW 1: WBS TREE VIEW ==================== */}
      {viewType === 'tree' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg min-w-0">
          <div className="w-full overflow-x-auto custom-scrollbar">
            <div className="min-w-[860px]">
              {/* ROOT NODE: Project Level 1.0 */}
              <div>
                <div className="bg-slate-900/90 border-b border-slate-800 py-2.5 px-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleNode('project')}
                      className="p-1 rounded bg-indigo-500/10 text-indigo-400 hover:text-white transition-colors shrink-0"
                    >
                      {expandedNodes['project'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                        1.0
                      </span>
                      <h3 className="text-sm font-bold text-slate-100 truncate">{projectData.projectName}</h3>
                      <span className="text-xs font-mono text-slate-400 shrink-0">({projectData.projectCode})</span>
                    </div>
                  </div>

                  {/* Project Rollup Summary */}
                  <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-sans">Scope:</span>
                      <span className="text-slate-200 font-semibold">{projectRollup.doneTasks}/{projectRollup.totalTasks}</span>
                    </div>
                    <div className="w-px h-3.5 bg-slate-800" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-sans">Hours:</span>
                      <span className="text-amber-400 font-semibold">{projectRollup.actualHours}/{projectRollup.estimatedHours}h</span>
                    </div>
                    <div className="w-px h-3.5 bg-slate-800" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-sans">Cost:</span>
                      <span className="text-emerald-400 font-semibold">${projectRollup.plannedCost.toLocaleString()}</span>
                    </div>
                    <div className="w-px h-3.5 bg-slate-800" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-sans">Done:</span>
                      <span className="text-indigo-400 font-bold">{projectRollup.completionPercent}%</span>
                    </div>
                  </div>
                </div>

            {/* TREE BRANCHES & SUB-LEVELS */}
            {expandedNodes['project'] && (
              <div className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                {/* MODE 1: MILESTONE -> EPIC -> FEATURE -> TASK -> SUBTASK */}
                {groupBy === 'milestone-feature' && (
                  <>
                    {projectData.milestones
                      .filter(milestone => {
                        if (!isFilterActive) return true;
                        const q = searchQuery.trim().toLowerCase();
                        const mMatchesSearch = q && milestone.title.toLowerCase().includes(q);
                        const milestoneTasks = filteredTasks.filter(t => isTaskInMilestone(t, milestone.id));
                        const milestoneFeatures = projectData.features.filter(f => f.milestoneId === milestone.id && (q && f.title.toLowerCase().includes(q)));
                        const milestoneEpics = (projectData.epics || []).filter(e => e.milestoneId === milestone.id && (q && e.title.toLowerCase().includes(q)));
                        return mMatchesSearch || milestoneTasks.length > 0 || milestoneFeatures.length > 0 || milestoneEpics.length > 0;
                      })
                      .map((milestone, mIdx) => {
                        const mCode = `1.${mIdx + 1}`;
                        const isMExpanded = !!expandedNodes[milestone.id];
                        
                        const milestoneTasks = filteredTasks.filter(t => isTaskInMilestone(t, milestone.id));
                        const milestoneEpics = (projectData.epics || []).filter(e => {
                          if (e.milestoneId !== milestone.id) return false;
                          if (!isFilterActive) return true;
                          const q = searchQuery.trim().toLowerCase();
                          const eMatchesSearch = q && e.title.toLowerCase().includes(q);
                          const eTasks = milestoneTasks.filter(t => t.epicId === e.id || projectData.features.find(f => f.id === t.featureId)?.epicId === e.id);
                          return eMatchesSearch || eTasks.length > 0;
                        });
                        const milestoneFeatures = projectData.features.filter(f => {
                          const isInMilestone = f.milestoneId === milestone.id ||
                            (f.epicId && (projectData.epics || []).find(e => e.id === f.epicId)?.milestoneId === milestone.id) ||
                            milestoneTasks.some(t => t.featureId === f.id);
                          if (!isInMilestone) return false;

                          if (!isFilterActive) return true;
                          const q = searchQuery.trim().toLowerCase();
                          const fMatchesSearch = q && f.title.toLowerCase().includes(q);
                          const fTasks = milestoneTasks.filter(t => t.featureId === f.id);
                          return fMatchesSearch || fTasks.length > 0;
                        });
                        const unassignedTasksInMilestone = milestoneTasks.filter(t => !t.featureId && !t.epicId);

                        const mRollup = getMilestoneEffectiveValues(milestone, filteredTasks, projectData.subtasks, projectData.stakeholders);

                      return (
                        <div key={milestone.id} className="bg-slate-900/60">
                          {/* MILESTONE NODE (Level 2) */}
                          <div
                            onDragOver={(e) => handleDragOver(e, milestone.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDropOnMilestone(milestone.id, e)}
                            className={`py-2 px-3.5 bg-slate-900 hover:bg-slate-800/80 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-2.5 transition-colors group ${
                              dragOverTargetId === milestone.id ? 'bg-amber-950/40 ring-1 ring-amber-500/50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                onClick={() => toggleNode(milestone.id)}
                                className="p-1 rounded hover:bg-slate-800 text-amber-400 hover:text-white transition-colors shrink-0"
                              >
                                {isMExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                              <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
                                {mCode}
                              </span>
                              <Flag className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <h4 className="text-xs font-bold text-slate-100 truncate" title={milestone.title}>{milestone.title}</h4>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase shrink-0 ${
                                milestone.status === 'achieved' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                                milestone.status === 'in_progress' ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30' :
                                'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}>
                                {milestone.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                              <div className="flex items-center justify-start">
                                {renderAssigneeAvatars(getMilestoneAllAssigneeIds(milestone.id, projectData.epics || [], projectData.features, filteredTasks, projectData.subtasks))}
                              </div>
                              <span className="text-slate-400 text-[11px]">Due: <span className="text-slate-200">{milestone.dueDate}</span></span>
                              <span className="text-amber-400 text-[11px] font-semibold">{mRollup.actualHours}/{mRollup.estimatedHours}h</span>
                              <span className="text-emerald-400 text-[11px] font-semibold">${mRollup.plannedCost.toLocaleString()}</span>
                              <span className="text-indigo-400 text-[11px] font-bold">{mRollup.completionPercent}%</span>

                              {/* Quick Action Controls */}
                              <div className="flex items-center gap-1 ml-1">
                                <button
                                  onClick={() => openEditModal(milestone)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                                  title="Edit Milestone"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteMilestone(milestone.id)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                  title="Delete Milestone"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* MILESTONE CHILDREN BRANCHES */}
                          {isMExpanded && (
                            <div className="divide-y divide-slate-800/50">
                              {/* EPICS UNDER MILESTONE */}
                              {milestoneEpics.map((epic, epIdx) => {
                                const epCode = `${mCode}.${epIdx + 1}`;
                                const isEpExpanded = !!expandedNodes[epic.id];
                                const epicFeatures = milestoneFeatures.filter(f => f.epicId === epic.id);
                                const epicRollup = getEpicEffectiveValues(epic, projectData.features, filteredTasks, projectData.subtasks, projectData.stakeholders);

                                return (
                                  <div key={epic.id} className="border-l-2 border-purple-500/30">
                                    {/* EPIC NODE (Level 3) */}
                                    <div
                                      draggable={true}
                                      onDragStart={(e) => handleDragStart(e, 'epic', epic.id)}
                                      onDragOver={(e) => handleDragOver(e, epic.id)}
                                      onDragLeave={handleDragLeave}
                                      onDrop={(e) => handleDropOnEpic(epic.id, e)}
                                      className={`py-1.5 px-3.5 pl-6 bg-slate-900/80 hover:bg-slate-800/60 border-b border-slate-800/60 flex items-center justify-between gap-2.5 transition-colors group ${
                                        dragOverTargetId === epic.id ? 'bg-purple-950/40 ring-1 ring-purple-500/50' : ''
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div
                                          className="text-slate-600 hover:text-purple-400 cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Drag Epic"
                                        >
                                          <GripVertical className="w-3.5 h-3.5" />
                                        </div>
                                        <button
                                          onClick={() => toggleNode(epic.id)}
                                          className="p-0.5 rounded text-purple-400 hover:text-white shrink-0"
                                        >
                                          {isEpExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                        </button>
                                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 shrink-0">
                                          {epCode}
                                        </span>
                                        <Bookmark className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                        <h5 className="text-xs font-semibold text-purple-200 truncate">{epic.title}</h5>
                                      </div>

                                      <div className="flex items-center gap-2.5 text-xs shrink-0">
                                        <div className="flex items-center justify-start">
                                          {renderAssigneeAvatars(getEpicAllAssigneeIds(epic.id, projectData.features, filteredTasks, projectData.subtasks))}
                                        </div>
                                        <span className="font-mono text-slate-400 text-[11px]">{epicFeatures.length} features</span>
                                        <span className="font-mono text-amber-400 text-[11px] font-semibold">{epicRollup.actualHours}/{epicRollup.estimatedHours}h</span>
                                        <span className="font-mono text-emerald-400 text-[11px] font-semibold">${epicRollup.plannedCost.toLocaleString()}</span>
                                        <span className="font-mono text-indigo-300 text-[11px] font-bold">{epicRollup.completionPercent}%</span>
                                        <button
                                          onClick={() => openEditModal(epic)}
                                          className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                                          title="Edit Epic"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => deleteEpic(epic.id)}
                                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                          title="Delete Epic"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* FEATURES UNDER EPIC */}
                                    {isEpExpanded && (
                                      <div className="divide-y divide-slate-200/60 dark:divide-slate-800/40">
                                        {epicFeatures.map((feature, fIdx) => {
                                          const fCode = `${epCode}.${fIdx + 1}`;
                                          const isFExpanded = !!expandedNodes[feature.id];
                                          const featureTasks = milestoneTasks.filter(t => t.featureId === feature.id);
                                          const fRollup = getFeatureEffectiveValues(feature, filteredTasks, projectData.subtasks, projectData.stakeholders);

                                          return (
                                            <div key={feature.id}>
                                              {/* FEATURE NODE */}
                                              <div
                                                draggable={true}
                                                onDragStart={(e) => handleDragStart(e, 'feature', feature.id)}
                                                onDragOver={(e) => handleDragOver(e, feature.id)}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDropOnFeature(feature.id, e)}
                                                className={`py-1.5 px-3.5 pl-8 bg-slate-900/60 hover:bg-slate-800/60 border-b border-slate-800/50 flex items-center justify-between gap-2.5 transition-colors group ${
                                                  dragOverTargetId === feature.id ? 'bg-blue-950/40 ring-1 ring-blue-500/50' : ''
                                                }`}
                                              >
                                                <div className="flex items-center gap-2 min-w-0">
                                                  <div
                                                    className="text-slate-600 hover:text-blue-400 cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Drag feature"
                                                  >
                                                    <GripVertical className="w-3.5 h-3.5" />
                                                  </div>
                                                  <button
                                                    onClick={() => toggleNode(feature.id)}
                                                    className="p-0.5 rounded text-blue-400 hover:text-white shrink-0"
                                                  >
                                                    {isFExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                  </button>
                                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30 shrink-0">
                                                    {fCode}
                                                  </span>
                                                  <FolderGit2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                                  <h5 className="text-xs font-medium text-slate-200 truncate" title={feature.title}>{feature.title}</h5>
                                                </div>

                                                <div className="flex items-center gap-2.5 text-xs shrink-0">
                                                  <div className="flex items-center justify-start">
                                                    {renderAssigneeAvatars(getFeatureAllAssigneeIds(feature.id, filteredTasks, projectData.subtasks))}
                                                  </div>
                                                  <span className="font-mono text-slate-400 text-[11px]">{fRollup.totalTasks} items</span>
                                                  <span className="font-mono text-amber-400 text-[11px] font-medium">{fRollup.actualHours}/{fRollup.estimatedHours}h</span>
                                                  <span className="font-mono text-emerald-400 text-[11px] font-medium">${fRollup.plannedCost.toLocaleString()}</span>
                                                  <span className="font-mono text-indigo-300 text-[11px] font-bold">{fRollup.completionPercent}%</span>
                                                  <button
                                                    onClick={() => onOpenTaskModal({ featureId: feature.id, epicId: epic.id, milestoneId: milestone.id })}
                                                    className="px-2 py-0.5 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white text-[10px] font-semibold flex items-center gap-1 shadow-sm transition-colors"
                                                  >
                                                    <Plus className="w-3 h-3" />
                                                    <span>Work Item</span>
                                                  </button>
                                                  <button
                                                    onClick={() => openEditModal(feature)}
                                                    className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                                                    title="Edit Feature"
                                                  >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button
                                                    onClick={() => deleteFeature(feature.id)}
                                                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                                    title="Delete Feature"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              </div>

                                              {/* TASKS UNDER FEATURE */}
                                              {isFExpanded && (
                                                <div className="divide-y divide-slate-200/60 dark:divide-slate-800/40">
                                                  {featureTasks.map((task, tIdx) => renderTaskNode(task, `${fCode}.${tIdx + 1}`))}
                                                  {featureTasks.length === 0 && (
                                                    <div className="p-2.5 text-xs text-slate-400 text-center italic">
                                                      No tasks assigned under this feature yet.
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Features under Milestone without Epic */}
                              {milestoneFeatures.filter(f => !f.epicId || !milestoneEpics.some(e => e.id === f.epicId)).map((feature, fIdx) => {
                                const fCode = `${mCode}.F${fIdx + 1}`;
                                const isFExpanded = !!expandedNodes[feature.id];
                                const featureTasks = milestoneTasks.filter(t => t.featureId === feature.id);
                                const fRollup = getFeatureEffectiveValues(feature, filteredTasks, projectData.subtasks, projectData.stakeholders);

                                return (
                                  <div key={feature.id} className="border-l-2 border-blue-500/30">
                                    {/* FEATURE NODE */}
                                    <div
                                      draggable={true}
                                      onDragStart={(e) => handleDragStart(e, 'feature', feature.id)}
                                      onDragOver={(e) => handleDragOver(e, feature.id)}
                                      onDragLeave={handleDragLeave}
                                      onDrop={(e) => handleDropOnFeature(feature.id, e)}
                                      className={`py-1.5 px-3.5 pl-6 bg-slate-900/60 hover:bg-slate-800/60 border-b border-slate-800/50 flex items-center justify-between gap-2.5 transition-colors group ${
                                        dragOverTargetId === feature.id ? 'bg-blue-950/40 ring-1 ring-blue-500/50' : ''
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div
                                          className="text-slate-600 hover:text-blue-400 cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Drag feature"
                                        >
                                          <GripVertical className="w-3.5 h-3.5" />
                                        </div>
                                        <button
                                          onClick={() => toggleNode(feature.id)}
                                          className="p-0.5 rounded text-blue-400 hover:text-white shrink-0"
                                        >
                                          {isFExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                        </button>
                                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30 shrink-0">
                                          {fCode}
                                        </span>
                                        <FolderGit2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                        <h5 className="text-xs font-medium text-slate-200 truncate" title={feature.title}>{feature.title}</h5>
                                      </div>

                                      <div className="flex items-center gap-2.5 text-xs shrink-0">
                                        <span className="font-mono text-slate-400 text-[11px]">{fRollup.totalTasks} items</span>
                                        <span className="font-mono text-amber-400 text-[11px] font-medium">{fRollup.actualHours}/{fRollup.estimatedHours}h</span>
                                        <span className="font-mono text-emerald-400 text-[11px] font-medium">${fRollup.plannedCost.toLocaleString()}</span>
                                        <span className="font-mono text-indigo-300 text-[11px] font-bold">{fRollup.completionPercent}%</span>
                                        <button
                                          onClick={() => onOpenTaskModal({ featureId: feature.id, milestoneId: milestone.id })}
                                          className="px-2 py-0.5 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white text-[10px] font-semibold flex items-center gap-1 shadow-sm transition-colors"
                                        >
                                          <Plus className="w-3 h-3" />
                                          <span>Work Item</span>
                                        </button>
                                        <button
                                          onClick={() => openEditModal(feature)}
                                          className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                                          title="Edit Feature"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => deleteFeature(feature.id)}
                                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                          title="Delete Feature"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* TASKS UNDER FEATURE */}
                                    {isFExpanded && (
                                      <div className="divide-y divide-slate-200/60 dark:divide-slate-800/40">
                                        {featureTasks.map((task, tIdx) => renderTaskNode(task, `${fCode}.${tIdx + 1}`))}
                                        {featureTasks.length === 0 && (
                                          <div className="p-2 text-xs text-slate-400 text-center italic">
                                            No tasks assigned under this feature yet.
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Direct Milestone Tasks */}
                              {unassignedTasksInMilestone.length > 0 && (
                                <div className="divide-y divide-slate-200/60 dark:divide-slate-800/40">
                                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-1.5 px-4 bg-slate-100/50 dark:bg-slate-900/50">
                                    Direct Milestone Tasks
                                  </div>
                                  {unassignedTasksInMilestone.map((task, tIdx) => renderTaskNode(task, `${mCode}.X.${tIdx + 1}`))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Unassigned Tasks */}
                    {filteredTasks.filter(t => !t.milestoneId).length > 0 && (
                      <div className="bg-slate-50/50 dark:bg-slate-950/30">
                        <div className="py-2.5 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleNode('unassigned-milestone')}
                              className="p-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            >
                              {expandedNodes['unassigned-milestone'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">1.Unassigned</span>
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">General & Unassigned Milestone Tasks</h4>
                          </div>
                        </div>

                        {expandedNodes['unassigned-milestone'] && (
                          <div className="divide-y divide-slate-200/60 dark:divide-slate-800/40">
                            {filteredTasks.filter(t => !t.milestoneId).map((task, tIdx) => renderTaskNode(task, `1.U.${tIdx + 1}`))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* MODE 2: FEATURE -> TASK */}
                {groupBy === 'feature-task' && (
                  <>
                    {projectData.features.map((feature, fIdx) => {
                      const fCode = `1.${fIdx + 1}`;
                      const isFExpanded = !!expandedNodes[feature.id];
                      const featureTasks = filteredTasks.filter(t => t.featureId === feature.id);
                      const fRollup = getFeatureEffectiveValues(feature, filteredTasks, projectData.subtasks, projectData.stakeholders);

                      return (
                        <div key={feature.id} className="bg-slate-50/50 dark:bg-slate-950/30">
                          <div className="py-2.5 px-4 bg-blue-500/5 hover:bg-blue-500/10 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleNode(feature.id)}
                                className="p-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:text-white"
                              >
                                {isFExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                                    {fCode}
                                  </span>
                                  <FolderGit2 className="w-4 h-4 text-blue-500 shrink-0" />
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{feature.title}</h4>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{feature.description}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-xs font-mono">
                              <span className="text-slate-500 dark:text-slate-400">Tasks: <strong className="text-indigo-600 dark:text-indigo-300">{fRollup.totalTasks}</strong></span>
                              <span className="text-amber-600 dark:text-amber-400 font-bold">{fRollup.actualHours}/{fRollup.estimatedHours} hrs</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">${fRollup.plannedCost.toLocaleString()}</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold">{fRollup.completionPercent}%</span>
                            </div>
                          </div>

                          {isFExpanded && (
                            <div className="divide-y divide-slate-200/60 dark:divide-slate-800/40">
                              {featureTasks.map((task, tIdx) => renderTaskNode(task, `${fCode}.${tIdx + 1}`))}
                              {featureTasks.length === 0 && (
                                <div className="p-3 text-xs text-slate-400 text-center italic">
                                  No tasks found under this feature.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                {/* MODE 3: STATUS GROUPING */}
                {groupBy === 'status' && (
                  <>
                    {(['todo', 'in_progress', 'demoable', 'review', 'on_hold', 'blocked', 'done'] as TaskStatus[]).map((status, sIdx) => {
                      const statusTasks = filteredTasks.filter(t => t.status === status);
                      const isExpanded = !!expandedNodes[`status-${status}`];

                      return (
                        <div key={status} className="bg-slate-50/50 dark:bg-slate-950/30">
                          <div className="py-2.5 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleNode(`status-${status}`)}
                                className="p-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-white"
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                1.{sIdx + 1}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 capitalize">{status.replace('_', ' ')} Tasks</h4>
                              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {statusTasks.length}
                              </span>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="divide-y divide-slate-200/60 dark:divide-slate-800/40">
                              {statusTasks.map((task, tIdx) => renderTaskNode(task, `1.${sIdx + 1}.${tIdx + 1}`))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )}

      {/* ==================== VIEW 2: SLEEK LIST VIEW (ClickUp/Linear/WBS style) ==================== */}
      {viewType === 'list' && (() => {
        // Helper to render a feature item row and its children tasks
        const renderFeatureItem = (feature: Feature, fCode: string, isNestedInEpic = false) => {
          const featureTasks = filteredTasks.filter(t => t.featureId === feature.id);
          const isFExpanded = expandedNodes[feature.id] !== false; // default expanded
          const featureAssignees: string[] = getFeatureAllAssigneeIds(feature.id, filteredTasks, projectData.subtasks);
          const completedCount = featureTasks.filter(t => t.status === 'done').length;
          const completionPercent = featureTasks.length > 0 ? Math.round((completedCount / featureTasks.length) * 100) : 0;

          return (
            <div key={feature.id} className={`bg-blue-500/5 dark:bg-slate-950/40 ${isNestedInEpic ? 'pl-4 border-l-2 border-indigo-500/30 dark:border-indigo-500/20' : ''}`}>
              {/* Feature Header Row */}
              <div className="flex items-center justify-between py-2.5 px-3 bg-blue-500/10 hover:bg-blue-500/15 dark:bg-slate-900/60 dark:hover:bg-slate-800/50 transition-colors border-b border-blue-500/15 dark:border-slate-800/60 group">
                <div className="flex items-center gap-2.5 flex-1 min-w-[300px] pr-4">
                  <button
                    onClick={() => toggleNode(feature.id)}
                    className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                  >
                    {isFExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  <PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="font-mono text-[10px] bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-bold shrink-0">{fCode}</span>

                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                    {feature.title}
                    {featureTasks.length > 0 && (
                      <span className="ml-1.5 text-slate-500 dark:text-slate-400 font-normal">
                        ({completionPercent}%)
                      </span>
                    )}
                  </span>

                  <span className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-800/80 px-2 py-0.5 rounded-full font-mono">
                    <Zap className="w-3 h-3 text-amber-500" />
                    {featureTasks.length}
                  </span>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-xs">
                  <div className="w-28 flex items-center justify-start">
                    {renderAssigneeAvatars(featureAssignees)}
                  </div>

                  <RaciTagCell
                    itemType="feature"
                    itemId={feature.id}
                    stakeholders={projectData.stakeholders}
                    projectData={projectData}
                    onSaveTask={saveTask}
                  />

                  <div className="w-28 text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{feature.targetReleaseDate || 'No date'}</span>
                  </div>

                  {/* Item Type Dropdown */}
                  <div className="w-28 flex items-center justify-start">
                    <select
                      value="feature"
                      onChange={(e) => handleConvertItemType(e.target.value as any, { id: feature.id, type: 'feature' })}
                      className="bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30 rounded-md px-1.5 py-0.5 text-[11px] font-semibold outline-none cursor-pointer hover:border-blue-400 transition-colors shadow-2xs"
                      title="Convert WBS Item Type"
                    >
                      <option value="milestone">Milestone</option>
                      <option value="epic">Epic</option>
                      <option value="feature">Feature</option>
                      <option value="task">Task</option>
                      <option value="subtask">Subtask</option>
                    </select>
                  </div>

                  <div className="w-20 flex items-center justify-start">
                    <Flag className={`w-3.5 h-3.5 ${
                      feature.priority === 'urgent' ? 'text-rose-500' :
                      feature.priority === 'high' ? 'text-amber-500' :
                      'text-indigo-500'
                    }`} />
                  </div>

                  <div className="w-32 flex items-center justify-end">
                    <button
                      onClick={() => {
                        setActiveInlineFeatureId(feature.id);
                        if (!isFExpanded) toggleNode(feature.id);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 hover:text-white text-xs font-bold border border-indigo-200 dark:border-indigo-500/30 transition-all shrink-0 shadow-2xs"
                      title="Add Task to this Feature"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Task</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tasks inside Feature */}
              {isFExpanded && (
                <div className="divide-y divide-slate-200/60 dark:divide-slate-800/40">
                  {featureTasks.map((task, tIdx) => renderTaskNode(task, `${fCode}.${tIdx + 1}`))}

                  {/* Inline Task Creation Row */}
                  {activeInlineFeatureId === feature.id && (
                    <div className="flex flex-col md:flex-row md:items-center justify-between py-2 px-3 pl-8 bg-slate-100/90 dark:bg-slate-950/90 border-y border-indigo-300 dark:border-indigo-500/50 gap-2 my-1">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <Circle className="w-4 h-4 text-slate-400 stroke-dasharray-2 shrink-0 animate-pulse" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Task Name or type '/' for commands"
                          value={inlineTaskTitle}
                          onChange={(e) => setInlineTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInlineTask(feature.id);
                            if (e.key === 'Escape') setActiveInlineFeatureId(null);
                          }}
                          className="bg-transparent border-none outline-none text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 w-full font-medium"
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-xs">
                        <select
                          value={inlineAssigneeId}
                          onChange={(e) => setInlineAssigneeId(e.target.value)}
                          className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-800 rounded px-1.5 py-0.5 text-[11px] outline-none"
                        >
                          {projectData.stakeholders.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>

                        <select
                          value={inlinePriority}
                          onChange={(e) => setInlinePriority(e.target.value as Priority)}
                          className="bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border border-slate-300 dark:border-slate-800 rounded px-1.5 py-0.5 text-[11px] font-bold outline-none"
                        >
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                          <option value="low">Low</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => setActiveInlineFeatureId(null)}
                          className="px-2.5 py-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveInlineTask(feature.id)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                        >
                          <span>Save</span>
                          <span className="text-[10px] opacity-80">↵</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Add Task Button */}
                  {activeInlineFeatureId !== feature.id && (
                    <div className="py-2 px-3 pl-8">
                      <button
                        onClick={() => {
                          setActiveInlineFeatureId(feature.id);
                          if (!isFExpanded) toggleNode(feature.id);
                        }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Task</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        };

        return (
          <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm backdrop-blur-md overflow-x-auto">
            <div className="min-w-[960px]">
              {/* Column Header Row */}
              <div className="flex items-center justify-between py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider bg-slate-100/80 dark:bg-slate-900/90 rounded-t-2xl">
              <div className="flex-1 min-w-[320px] flex items-center justify-between pr-4 gap-2">
                <span className="whitespace-nowrap">Name & WBS Hierarchy</span>
                <button
                  onClick={() => openCreateModal('milestone')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-500/30 transition-all normal-case shadow-2xs whitespace-nowrap shrink-0"
                  title="Add Top-Level Milestone"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>New Milestone</span>
                </button>
              </div>
              <div className="flex items-center gap-4 shrink-0 font-semibold">
                <div className="w-28 text-left whitespace-nowrap">Assignee</div>
                <div className="w-36 text-left whitespace-nowrap">RACI Tagging</div>
                <div className="w-28 text-left whitespace-nowrap">Due date</div>
                <div className="w-28 text-left whitespace-nowrap">Item Type</div>
                <div className="w-20 text-left whitespace-nowrap">Priority</div>
                <div className="w-32 text-right pr-2 whitespace-nowrap">Actions</div>
              </div>
            </div>

            <div className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
              {/* 1. MILESTONES SECTION */}
              {projectData.milestones.map((milestone, mIdx) => {
                const isMExpanded = expandedNodes[milestone.id] !== false;
                const milestoneEpics = (projectData.epics || []).filter(e => e.milestoneId === milestone.id);
                const milestoneFeatures = projectData.features.filter(f => f.milestoneId === milestone.id && !f.epicId);
                const milestoneDirectTasks = filteredTasks.filter(t => t.milestoneId === milestone.id && !t.epicId && !t.featureId);

                return (
                  <div key={milestone.id} className="bg-amber-500/5 dark:bg-amber-950/20">
                    {/* Milestone Header Row */}
                    <div className="flex items-center justify-between py-2.5 px-3 bg-amber-500/10 hover:bg-amber-500/15 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 transition-colors border-b border-amber-500/20 group">
                      <div className="flex items-center gap-2.5 flex-1 min-w-[300px] pr-4">
                        <button
                          onClick={() => toggleNode(milestone.id)}
                          className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
                        >
                          {isMExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>

                        <Flag className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="font-mono text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold shrink-0">M{mIdx + 1}</span>

                        <span className="font-bold text-xs text-slate-900 dark:text-amber-200 truncate">
                          {milestone.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 text-xs">
                        <div className="w-28 flex items-center justify-start">
                          {renderAssigneeAvatars(getMilestoneAllAssigneeIds(milestone.id, projectData.epics || [], projectData.features, filteredTasks, projectData.subtasks))}
                        </div>
                        <RaciTagCell
                          itemType="milestone"
                          itemId={milestone.id}
                          stakeholders={projectData.stakeholders}
                          projectData={projectData}
                          onSaveTask={saveTask}
                        />
                        <div className="w-28 text-amber-700 dark:text-amber-300/90 text-xs flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-amber-500" />
                          <span>{milestone.dueDate || 'No date'}</span>
                        </div>

                        {/* Item Type Dropdown */}
                        <div className="w-28 flex items-center justify-start">
                          <select
                            value="milestone"
                            onChange={(e) => handleConvertItemType(e.target.value as any, { id: milestone.id, type: 'milestone' })}
                            className="bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 rounded-md px-1.5 py-0.5 text-[11px] font-semibold outline-none cursor-pointer hover:border-amber-400 transition-colors shadow-2xs"
                            title="Convert WBS Item Type"
                          >
                            <option value="milestone">Milestone</option>
                            <option value="epic">Epic</option>
                            <option value="feature">Feature</option>
                            <option value="task">Task</option>
                            <option value="subtask">Subtask</option>
                          </select>
                        </div>

                        <div className="w-20 flex items-center justify-start">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">—</span>
                        </div>

                        <div className="w-32 flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openCreateModal('epic', milestone.id)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/15 hover:bg-purple-600 text-purple-700 dark:text-purple-300 hover:text-white text-[11px] font-bold border border-purple-500/30 transition-all shrink-0"
                            title="Add Epic under this Milestone"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Epic</span>
                          </button>

                          <button
                            onClick={() => openCreateModal('feature', milestone.id)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/15 hover:bg-blue-600 text-blue-700 dark:text-blue-300 hover:text-white text-[11px] font-bold border border-blue-500/30 transition-all shrink-0"
                            title="Add Feature under this Milestone"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Feature</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Milestone Children */}
                    {isMExpanded && (
                      <div className="divide-y divide-slate-200/60 dark:divide-slate-800/40">
                        {/* Epics under Milestone */}
                        {milestoneEpics.map((epic, eIdx) => {
                          const isEExpanded = expandedNodes[epic.id] !== false;
                          const epicFeatures = projectData.features.filter(f => f.epicId === epic.id);
                          const epicDirectTasks = filteredTasks.filter(t => t.epicId === epic.id && !t.featureId);

                          return (
                            <div key={epic.id} className="pl-3 bg-purple-500/5 dark:bg-purple-950/10">
                              {/* Epic Header Row */}
                              <div className="flex items-center justify-between py-2 px-3 bg-purple-500/10 hover:bg-purple-500/15 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 transition-colors border-b border-purple-500/20 group">
                                <div className="flex items-center gap-2.5 flex-1 min-w-[300px] pr-4">
                                  <button
                                    onClick={() => toggleNode(epic.id)}
                                    className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 transition-colors"
                                  >
                                    {isEExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>

                                  <Layers className="w-4 h-4 text-purple-500 shrink-0" />
                                  <span className="font-mono text-[10px] bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-bold shrink-0">M{mIdx + 1}.E{eIdx + 1}</span>

                                  <span className="font-bold text-xs text-slate-900 dark:text-purple-200 truncate">
                                    {epic.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-4 shrink-0 text-xs">
                                  <div className="w-28 flex items-center justify-start">
                                    {renderAssigneeAvatars(getEpicAllAssigneeIds(epic.id, projectData.features, filteredTasks, projectData.subtasks))}
                                  </div>

                                  <RaciTagCell
                                    itemType="epic"
                                    itemId={epic.id}
                                    stakeholders={projectData.stakeholders}
                                    projectData={projectData}
                                    onSaveTask={saveTask}
                                  />

                                  <div className="w-28 text-purple-700 dark:text-purple-300/90 text-xs flex items-center gap-1 font-mono">
                                    <Calendar className="w-3.5 h-3.5 text-purple-500" />
                                    <span>{epic.targetReleaseDate || 'No date'}</span>
                                  </div>

                                  <div className="w-28 flex items-center justify-start">
                                    <select
                                      value="epic"
                                      onChange={(e) => handleConvertItemType(e.target.value as any, { id: epic.id, type: 'epic' })}
                                      className="bg-white dark:bg-slate-900 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 rounded-md px-1.5 py-0.5 text-[11px] font-semibold outline-none cursor-pointer hover:border-purple-400 transition-colors shadow-2xs"
                                      title="Convert WBS Item Type"
                                    >
                                      <option value="milestone">Milestone</option>
                                      <option value="epic">Epic</option>
                                      <option value="feature">Feature</option>
                                      <option value="task">Task</option>
                                      <option value="subtask">Subtask</option>
                                    </select>
                                  </div>

                                  <div className="w-20 flex items-center justify-start">
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">—</span>
                                  </div>

                                  <div className="w-32 flex items-center justify-end">
                                    <button
                                      onClick={() => openCreateModal('feature', milestone.id, epic.id)}
                                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/15 hover:bg-blue-600 text-blue-700 dark:text-blue-300 hover:text-white text-[11px] font-bold border border-blue-500/30 transition-all shrink-0"
                                      title="Add Feature under this Epic"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>Feature</span>
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Epic Children */}
                              {isEExpanded && (
                                <div>
                                  {epicFeatures.map((feat, fIdx) => renderFeatureItem(feat, `M${mIdx + 1}.E${eIdx + 1}.F${fIdx + 1}`, true))}
                                  {epicDirectTasks.map((t, tIdx) => renderTaskNode(t, `M${mIdx + 1}.E${eIdx + 1}.T${tIdx + 1}`))}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Direct Features under Milestone */}
                        {milestoneFeatures.map((feat, fIdx) => renderFeatureItem(feat, `M${mIdx + 1}.F${fIdx + 1}`))}

                        {/* Direct Tasks under Milestone */}
                        {milestoneDirectTasks.map((t, tIdx) => renderTaskNode(t, `M${mIdx + 1}.T${tIdx + 1}`))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 2. STANDALONE / UNASSIGNED EPICS */}
              {(projectData.epics || []).filter(e => !e.milestoneId).map((epic, eIdx) => {
                const isEExpanded = expandedNodes[epic.id] !== false;
                const epicFeatures = projectData.features.filter(f => f.epicId === epic.id);
                const epicDirectTasks = filteredTasks.filter(t => t.epicId === epic.id && !t.featureId);

                return (
                  <div key={epic.id} className="bg-purple-500/5 dark:bg-purple-950/10">
                    <div className="flex items-center justify-between py-2 px-3 bg-purple-500/10 hover:bg-purple-500/15 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 transition-colors border-b border-purple-500/20 group">
                      <div className="flex items-center gap-2.5 flex-1 min-w-[300px] pr-4">
                        <button onClick={() => toggleNode(epic.id)} className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 transition-colors">
                          {isEExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <Layers className="w-4 h-4 text-purple-500 shrink-0" />
                        <span className="font-mono text-[10px] bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-bold shrink-0">E{eIdx + 1}</span>
                        <span className="font-bold text-xs text-slate-900 dark:text-purple-200 truncate">{epic.title}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-xs">
                        <div className="w-28 flex items-center justify-start">
                          {renderAssigneeAvatars(getEpicAllAssigneeIds(epic.id, projectData.features, filteredTasks, projectData.subtasks))}
                        </div>
                        <div className="w-28 text-purple-700 dark:text-purple-300/90 text-xs flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-purple-500" />
                          <span>{epic.targetReleaseDate || 'No date'}</span>
                        </div>
                        <div className="w-28 flex items-center justify-start">
                          <select
                            value="epic"
                            onChange={(e) => handleConvertItemType(e.target.value as any, { id: epic.id, type: 'epic' })}
                            className="bg-white dark:bg-slate-900 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 rounded-md px-1.5 py-0.5 text-[11px] font-semibold outline-none cursor-pointer hover:border-purple-400 transition-colors shadow-2xs"
                          >
                            <option value="milestone">Milestone</option>
                            <option value="epic">Epic</option>
                            <option value="feature">Feature</option>
                            <option value="task">Task</option>
                            <option value="subtask">Subtask</option>
                          </select>
                        </div>
                        <div className="w-20 flex items-center justify-start">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">—</span>
                        </div>
                        <div className="w-32 flex items-center justify-end">
                          <button
                            onClick={() => openCreateModal('feature', '', epic.id)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/15 hover:bg-blue-600 text-blue-700 dark:text-blue-300 hover:text-white text-[11px] font-bold border border-blue-500/30 transition-all shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Feature</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {isEExpanded && (
                      <div>
                        {epicFeatures.map((feat, fIdx) => renderFeatureItem(feat, `E${eIdx + 1}.F${fIdx + 1}`, true))}
                        {epicDirectTasks.map((t, tIdx) => renderTaskNode(t, `E${eIdx + 1}.T${tIdx + 1}`))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 3. STANDALONE FEATURES */}
              {projectData.features.filter(f => !f.milestoneId && !f.epicId).map((feature, fIdx) => renderFeatureItem(feature, `F${fIdx + 1}`))}

              {/* 4. UNASSIGNED TASKS */}
              {filteredTasks.filter(t => !t.milestoneId && !t.epicId && !t.featureId).length > 0 && (
                <div className="bg-slate-50/50 dark:bg-slate-950/40">
                  <div className="py-2.5 px-3 font-bold text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    Unassigned / Standalone Work Items
                  </div>
                  <div className="divide-y divide-slate-200/60 dark:divide-slate-800/40">
                    {filteredTasks.filter(t => !t.milestoneId && !t.epicId && !t.featureId).map((task, idx) => renderTaskNode(task, `U.${idx + 1}`))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
      })()}

      {/* ==================== VIEW 3: KANBAN BOARD VIEW ==================== */}
      {viewType === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
          {(['todo', 'in_progress', 'demoable', 'review', 'on_hold', 'blocked', 'done'] as TaskStatus[]).map((colStatus) => {
            const colTasks = filteredTasks.filter(t => t.status === colStatus);
            const colTitle = colStatus === 'todo' ? 'To Do' :
                             colStatus === 'in_progress' ? 'In Progress' :
                             colStatus === 'demoable' ? 'Demo-able' :
                             colStatus === 'review' ? 'In Testing' :
                             colStatus === 'on_hold' ? 'On Hold' :
                             colStatus === 'blocked' ? 'Blocked' : 'Completed';

            const colBadge = colStatus === 'done' ? 'bg-emerald-500/20 text-emerald-300' :
                             colStatus === 'in_progress' ? 'bg-indigo-500/20 text-indigo-300' :
                             colStatus === 'demoable' ? 'bg-teal-500/20 text-teal-300' :
                             colStatus === 'review' ? 'bg-purple-500/20 text-purple-300' :
                             colStatus === 'on_hold' ? 'bg-amber-500/20 text-amber-300' :
                             colStatus === 'blocked' ? 'bg-rose-500/20 text-rose-300' :
                             'bg-slate-800 text-slate-300';

            const isColTarget = dragOverTargetId === colStatus;

            return (
              <div
                key={colStatus}
                onDragOver={(e) => handleDragOver(e, colStatus)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDropOnStatus(colStatus, e)}
                className={`w-72 sm:w-80 shrink-0 bg-slate-900 border rounded-2xl p-3 flex flex-col space-y-3 shadow-sm min-h-[500px] transition-all ${
                  isColTarget ? 'border-indigo-400 ring-2 ring-indigo-500/50 bg-indigo-950/40 scale-[1.01]' : 'border-slate-800/80'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${colBadge}`}>
                      {colTitle}
                    </span>
                    <span className="text-xs font-mono text-slate-400">({colTasks.length})</span>
                  </div>
                </div>

                {/* Quick Add Form in Column */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder={`+ Add to ${colTitle}...`}
                    value={kanbanNewTitle[colStatus] || ''}
                    onChange={e => setKanbanNewTitle(prev => ({ ...prev, [colStatus]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleKanbanQuickAdd(colStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-indigo-500 placeholder-slate-600"
                  />
                  <button
                    onClick={() => handleKanbanQuickAdd(colStatus)}
                    className="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Column Task Cards */}
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {colTasks.map(task => {
                    const taskAssignees = getTaskAllAssigneeIds(task, projectData.subtasks);
                    const assignees = getAssigneeNames(taskAssignees);
                    const subtasks = getSubtasksForTask(task.id);
                    const completedSub = subtasks.filter(st => st.completed).length;
                    const isCardTarget = dragOverTargetId === task.id;

                    return (
                      <div
                        key={task.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, 'task', task.id)}
                        onDragOver={(e) => handleDragOver(e, task.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDropOnTask(task.id, e)}
                        className={`p-3 rounded-xl bg-slate-950 border space-y-2 transition-all shadow-sm ${
                          isCardTarget ? 'border-indigo-400 ring-2 ring-indigo-500/50 bg-indigo-900/60' : 'border-slate-800/80 hover:border-indigo-500/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="text-slate-600 hover:text-indigo-400 cursor-grab active:cursor-grabbing"
                              title="Drag to change column status or drop subtasks"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              task.priority === 'urgent' ? 'bg-rose-500/20 text-rose-300' :
                              task.priority === 'high' ? 'bg-amber-500/20 text-amber-300' :
                              'bg-indigo-500/20 text-indigo-300'
                            }`}>
                              {task.priority}
                            </span>
                          </div>

                          <select
                            value={task.status}
                            onChange={(e) => {
                              const newSt = e.target.value as TaskStatus;
                              saveTask({ ...task, status: newSt, completionPercent: getStatusProgress(newSt, projectData.statusPercentages) });
                              showNotice(`Updated Task "${task.title}" status to ${newSt.toUpperCase().replace('_', ' ')}`);
                            }}
                            className="bg-slate-900 border border-slate-800 text-[10px] text-indigo-300 font-mono rounded px-1 py-0.5 outline-none cursor-pointer"
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="demoable">Demo-able</option>
                            <option value="review">Testing</option>
                            <option value="on_hold">On Hold</option>
                            <option value="blocked">Blocked</option>
                            <option value="done">Done</option>
                          </select>
                        </div>

                        <p className="font-bold text-xs text-slate-100">{task.title}</p>

                        {task.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2">{task.description}</p>
                        )}

                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-800/60 font-mono">
                          <div className="flex items-center gap-1.5">
                            {renderAssigneeAvatars(taskAssignees)}
                            <span className="truncate max-w-[80px]">{assignees}</span>
                          </div>
                          <span className="text-amber-400 font-semibold">${task.plannedCost?.toLocaleString()}</span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>Due: {task.dueDate}</span>
                          {subtasks.length > 0 && (
                            <span className="text-indigo-400">{completedSub}/{subtasks.length} subtasks</span>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-1 pt-1">
                          <button
                            onClick={() => onOpenTaskModal(task)}
                            className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px]"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1 rounded bg-slate-900 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 text-[10px]"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div className="p-6 text-center text-slate-600 text-xs border border-dashed border-slate-800 rounded-xl">
                      No items
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}



      {/* WBS Hierarchy Item Creation / Editing Modal */}
      <HierarchyItemModal
        isOpen={isHierarchyModalOpen}
        onClose={() => setIsHierarchyModalOpen(false)}
        initialType={hierarchyModalType}
        initialParentMilestoneId={initialParentMilestoneId}
        initialParentEpicId={initialParentEpicId}
        itemToEdit={itemToEdit}
      />

      {/* Project Manager Status Completion Thresholds Modal */}
      {showStatusConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <h3 className="font-bold text-base text-slate-100">Status Completion Rules</h3>
                  <p className="text-xs text-slate-400">Configure default % progress for each work item status</p>
                </div>
              </div>
              <button
                onClick={() => setShowStatusConfigModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {[
                { key: 'todo', label: 'To Do', defaultVal: 0, color: 'text-slate-400' },
                { key: 'in_progress', label: 'In Progress', defaultVal: 40, color: 'text-indigo-400' },
                { key: 'demoable', label: 'Demo-able', defaultVal: 80, color: 'text-teal-400' },
                { key: 'review', label: 'In Testing / Review', defaultVal: 80, color: 'text-purple-400' },
                { key: 'on_hold', label: 'On Hold', defaultVal: 0, color: 'text-amber-400' },
                { key: 'blocked', label: 'Blocked', defaultVal: 50, color: 'text-rose-400' },
                { key: 'done', label: 'Completed (Done)', defaultVal: 100, color: 'text-emerald-400' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className={`text-xs font-semibold ${item.color}`}>{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={tempPercentages[item.key] ?? item.defaultVal}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, Number(e.target.value)));
                        setTempPercentages(prev => ({ ...prev, [item.key]: val }));
                      }}
                      className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono text-center outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-slate-500 font-mono">%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowStatusConfigModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await updateStatusPercentages(tempPercentages);
                  setShowStatusConfigModal(false);
                  showNotice('Status completion percentages updated successfully!');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // RENDER TASK NODE (Level 4) & SUBTASKS (Level 5) for Tree/List
  function renderTaskNode(task: Task, code: string) {
    const isExpanded = !!expandedNodes[task.id];
    const subtasks = getSubtasksForTask(task.id);
    const predecessors = getTaskPredecessors(task, projectData.tasks);
    const isDragTarget = dragOverTargetId === task.id;

    return (
      <div
        key={task.id}
        className="group"
        onDragOver={(e) => handleDragOver(e, task.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDropOnTask(task.id, e)}
      >
        <div
          draggable={true}
          onDragStart={(e) => handleDragStart(e, 'task', task.id)}
          className={`flex items-center justify-between py-2 px-3.5 pl-10 border-b border-slate-200/80 dark:border-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors group ${
            isDragTarget ? 'bg-indigo-100 dark:bg-indigo-950/80 border-indigo-400' : ''
          }`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-[300px] pr-4">
            {/* Grip handle on hover */}
            <div
              className="text-slate-400 hover:text-indigo-500 dark:text-slate-600 dark:hover:text-indigo-400 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              title="Drag task"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>

            {/* Status Icon */}
            <button
              onClick={() => cycleTaskStatus(task)}
              className="text-slate-400 hover:text-indigo-500 transition-colors shrink-0"
              title={`Status: ${task.status.toUpperCase()}. Click to cycle.`}
            >
              {task.status === 'done' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : task.status === 'in_progress' ? (
                <PieChart className="w-3.5 h-3.5 text-indigo-500 fill-indigo-500/30" />
              ) : task.status === 'demoable' ? (
                <Presentation className="w-3.5 h-3.5 text-teal-400" />
              ) : task.status === 'review' ? (
                <Clock className="w-3.5 h-3.5 text-purple-500" />
              ) : task.status === 'on_hold' ? (
                <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
              ) : task.status === 'blocked' ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-400 stroke-dasharray-2" />
              )}
            </button>

            {/* Task Title & Code */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
                {code}
              </span>
              <span
                onClick={() => onOpenTaskModal(task)}
                className={`text-xs font-medium text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 cursor-pointer truncate ${
                  task.status === 'done' ? 'line-through text-slate-400 dark:text-slate-500' : ''
                }`}
              >
                {task.title}
              </span>

              {task.type === 'bug' && (
                <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 shrink-0">
                  <Bug className="w-3 h-3 text-rose-400" />
                  <span>Bug</span>
                </span>
              )}

              {task.linkedBugIds && task.linkedBugIds.length > 0 && (
                <span
                  className="bg-purple-500/10 text-purple-300 border border-purple-500/30 font-semibold px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 shrink-0 cursor-pointer hover:bg-purple-500/20"
                  title={`${task.linkedBugIds.length} linked bug(s)`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTaskModal(task);
                  }}
                >
                  <Bug className="w-3 h-3 text-purple-400" />
                  <span>{task.linkedBugIds.length} linked bug{task.linkedBugIds.length !== 1 ? 's' : ''}</span>
                </span>
              )}

              {subtasks.length > 0 && (
                <button
                  onClick={() => toggleNode(task.id)}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono hover:underline shrink-0"
                >
                  ({subtasks.filter(st => st.completed).length}/{subtasks.length} subtasks)
                </button>
              )}

              {predecessors.some(p => p.hasConflict) && (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" title="Schedule conflict" />
              )}
            </div>
          </div>

          {/* Right Aligned Columns */}
          <div className="flex items-center gap-4 shrink-0 text-xs">
            {/* Assignees Avatars */}
            <div className="w-28 flex items-center justify-start">
              {renderAssigneeAvatars(getTaskAllAssigneeIds(task, projectData.subtasks))}
            </div>

            {/* RACI Tagging Cell */}
            <RaciTagCell
              itemType="task"
              itemId={task.id}
              task={task}
              stakeholders={projectData.stakeholders}
              projectData={projectData}
              onSaveTask={saveTask}
            />

            {/* Due date */}
            <div className="w-28 text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1 font-mono">
              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>{task.dueDate ? task.dueDate : 'No date'}</span>
            </div>

            {/* Direct Status Selector Dropdown */}
            <div className="w-28 flex items-center justify-start">
              <select
                value={task.status}
                onChange={(e) => {
                  const newSt = e.target.value as TaskStatus;
                  saveTask({
                    ...task,
                    status: newSt,
                    completionPercent: getStatusProgress(newSt, projectData.statusPercentages)
                  });
                  showNotice(`Updated Task "${task.title}" status to ${newSt.toUpperCase().replace('_', ' ')} (${getStatusProgress(newSt, projectData.statusPercentages)}%)`);
                }}
                className={`border rounded-md px-1.5 py-0.5 text-[11px] font-semibold outline-none cursor-pointer transition-colors shadow-2xs ${
                  task.status === 'done' ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40' :
                  task.status === 'in_progress' ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40' :
                  task.status === 'demoable' ? 'bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-500/40' :
                  task.status === 'review' ? 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-500/40' :
                  task.status === 'on_hold' ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40' :
                  task.status === 'blocked' ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40' :
                  'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
                title="Update Work Item Status"
              >
                <option value="todo" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">To Do</option>
                <option value="in_progress" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">In Progress</option>
                <option value="demoable" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Demo-able</option>
                <option value="review" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Testing</option>
                <option value="on_hold" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">On Hold</option>
                <option value="blocked" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Blocked</option>
                <option value="done" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Done</option>
              </select>
            </div>

            {/* Item Type Dropdown before Priority */}
            <div className="w-28 flex items-center justify-start">
              <select
                value="task"
                onChange={(e) => handleConvertItemType(e.target.value as any, { id: task.id, type: 'task' })}
                className="bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 rounded-md px-1.5 py-0.5 text-[11px] font-semibold outline-none cursor-pointer hover:border-indigo-400 transition-colors shadow-2xs"
                title="Convert WBS Item Type"
              >
                <option value="milestone">Milestone</option>
                <option value="epic">Epic</option>
                <option value="feature">Feature</option>
                <option value="task">Task</option>
                <option value="subtask">Subtask</option>
              </select>
            </div>

            {/* Priority flag */}
            <div className="w-20 flex items-center justify-start">
              <button
                onClick={() => {
                  const priorities: Priority[] = ['low', 'normal', 'high', 'urgent'];
                  const nextPriority = priorities[(priorities.indexOf(task.priority) + 1) % priorities.length];
                  saveTask({ ...task, priority: nextPriority });
                }}
                title={`Priority: ${task.priority}. Click to change.`}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors flex items-center gap-1"
              >
                <Flag className={`w-3.5 h-3.5 ${
                  task.priority === 'urgent' ? 'text-rose-500 fill-rose-500/20' :
                  task.priority === 'high' ? 'text-amber-500 fill-amber-500/20' :
                  task.priority === 'normal' ? 'text-indigo-500' :
                  'text-slate-400'
                }`} />
                <span className="text-[10px] capitalize text-slate-500 dark:text-slate-400 font-medium">{task.priority}</span>
              </button>
            </div>

            {/* Quick Actions & Add Subtask */}
            <div className="w-32 flex items-center justify-end gap-1.5">
              <button
                onClick={() => {
                  setActiveInlineTaskId(task.id);
                  if (!isExpanded) toggleNode(task.id);
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 hover:text-white text-[11px] font-bold border border-indigo-200 dark:border-indigo-500/30 transition-all shrink-0 shadow-2xs"
                title="Add Subtask"
              >
                <Plus className="w-3 h-3" />
                <span>Subtask</span>
              </button>

              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                <button
                  onClick={() => onOpenTaskModal(task)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                  title="Edit Task Specs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                  title="Delete Task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Subtasks Container & Inline Subtask Creation */}
        {(isExpanded || activeInlineTaskId === task.id) && (
          <div className="pl-12 bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800/60 divide-y divide-slate-200/60 dark:divide-slate-800/40">
            {subtasks.map((st) => (
              <div key={st.id} className="flex items-center justify-between py-1.5 px-3 text-xs">
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="checkbox"
                    checked={st.completed}
                    onChange={(e) => saveSubtask({ ...st, completed: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className={`text-slate-700 dark:text-slate-300 ${st.completed ? 'line-through text-slate-400' : ''}`}>
                    {st.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
                  <select
                    value="subtask"
                    onChange={(e) => handleConvertItemType(e.target.value as any, { id: st.id, type: 'subtask', parentTaskId: task.id })}
                    className="bg-slate-950 text-amber-300 border border-amber-500/30 rounded px-1.5 py-0.5 text-[10px] font-semibold outline-none cursor-pointer hover:border-amber-400 transition-colors"
                    title="Convert Subtask Type"
                  >
                    <option value="milestone">Milestone</option>
                    <option value="epic">Epic</option>
                    <option value="feature">Feature</option>
                    <option value="task">Task</option>
                    <option value="subtask">Subtask</option>
                  </select>
                  <span>{st.estimatedHours}h est</span>
                  <button onClick={() => deleteSubtask(st.id)} className="hover:text-rose-500">×</button>
                </div>
              </div>
            ))}

            {/* Inline Subtask Input Row */}
            <div className="flex items-center gap-2 py-1.5 px-3 text-xs bg-indigo-950/20 border-t border-indigo-500/20">
              <Plus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <input
                type="text"
                placeholder="+ Add subtask name..."
                value={activeInlineTaskId === task.id ? inlineSubtaskTitle : ''}
                onFocus={() => setActiveInlineTaskId(task.id)}
                onChange={(e) => {
                  setActiveInlineTaskId(task.id);
                  setInlineSubtaskTitle(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveInlineSubtask(task.id);
                  if (e.key === 'Escape') setActiveInlineTaskId(null);
                }}
                className="bg-transparent border-none outline-none text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 w-full font-medium"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  placeholder="Hrs"
                  title="Estimated Hours"
                  value={activeInlineTaskId === task.id ? inlineSubtaskHours : 4}
                  onChange={(e) => setInlineSubtaskHours(Number(e.target.value))}
                  className="w-12 bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-[10px] text-slate-200 font-mono text-center outline-none"
                />
                <button
                  onClick={() => handleSaveInlineSubtask(task.id)}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold shrink-0 transition-all shadow-sm"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
};
