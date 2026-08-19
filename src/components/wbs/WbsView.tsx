import React, { useState, useMemo, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Task, Feature, Epic, Milestone, Subtask, Priority, TaskStatus } from '../../types';
import { DEFAULT_STATUS_PERCENTAGES } from '../../utils/taskCalculations';
import {
  Network,
  ChevronDown,
  ChevronLeft,
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
  FileSpreadsheet,
  Bug,
  GitPullRequest,
  Columns
} from 'lucide-react';
import { HierarchyItemModal, HierarchyType } from '../modals/HierarchyItemModal';
import { CsvImportModal } from '../modals/CsvImportModal';
import { SprintFilter } from '../common/SprintFilter';
import { SprintModal } from '../modals/SprintModal';
import { Sprint } from '../../types';
import { calculateEVMMetrics } from '../../utils/evm';

export type ColumnKey = 'name' | 'assignee' | 'startDate' | 'dueDate' | 'estHours' | 'status' | 'itemType' | 'cost' | 'priority' | 'tags';

export const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  name: 480,
  assignee: 120,
  startDate: 110,
  dueDate: 120,
  estHours: 100,
  status: 130,
  itemType: 115,
  cost: 110,
  priority: 95,
  tags: 120,
};

export const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  name: true,
  assignee: true,
  startDate: false,
  dueDate: true,
  estHours: false,
  status: true,
  itemType: true,
  cost: true,
  priority: true,
  tags: false,
};

export const COLUMN_DEFINITIONS: { key: ColumnKey; label: string }[] = [
  { key: 'name', label: 'Name & Hierarchy' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'estHours', label: 'Est. Hours' },
  { key: 'status', label: 'Status' },
  { key: 'itemType', label: 'Item Type' },
  { key: 'cost', label: 'Cost' },
  { key: 'priority', label: 'Priority' },
  { key: 'tags', label: 'Tags' },
];
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

type DisplayViewType = 'list' | 'board' | 'calendar';
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
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [tempPercentages, setTempPercentages] = useState<Record<string, number | string>>(
    projectData.statusPercentages || DEFAULT_STATUS_PERCENTAGES
  );

  useEffect(() => {
    if (showStatusConfigModal) {
      setTempPercentages(projectData.statusPercentages || DEFAULT_STATUS_PERCENTAGES);
    }
  }, [showStatusConfigModal, projectData.statusPercentages]);

  const isPM = currentUser.role === 'pm' || currentUser.role === 'admin';

  const currentStakeholder = useMemo(() => {
    return projectData.stakeholders.find(
      s => s.email.toLowerCase() === currentUser.email.toLowerCase()
    );
  }, [projectData.stakeholders, currentUser.email]);

  const canUserEditTask = (_task: Task): boolean => {
    // Enable work item status updates and edits for all active team roles in WBS
    return true;
  };

  // Primary View Mode (List, Board, Calendar)
  const [viewType, setViewType] = useState<DisplayViewType>('list');
  const [groupBy, setGroupBy] = useState<GroupByMode>('milestone-feature');

  // Interactive Column Resizing & Visibility Customisation
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => {
    try {
      const saved = localStorage.getItem('wbs_column_widths');
      return saved ? { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) } : DEFAULT_COLUMN_WIDTHS;
    } catch {
      return DEFAULT_COLUMN_WIDTHS;
    }
  });

  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem('wbs_visible_columns');
      return saved ? { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) } : DEFAULT_VISIBLE_COLUMNS;
    } catch {
      return DEFAULT_VISIBLE_COLUMNS;
    }
  });

  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('wbs_column_widths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  useEffect(() => {
    localStorage.setItem('wbs_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const totalTableWidth = useMemo(() => {
    let width = columnWidths.name;
    if (visibleColumns.assignee) width += columnWidths.assignee;
    if (visibleColumns.startDate) width += columnWidths.startDate;
    if (visibleColumns.dueDate) width += columnWidths.dueDate;
    if (visibleColumns.estHours) width += columnWidths.estHours;
    if (visibleColumns.status) width += columnWidths.status;
    if (visibleColumns.itemType) width += columnWidths.itemType;
    if (visibleColumns.cost) width += columnWidths.cost;
    if (visibleColumns.priority) width += columnWidths.priority;
    if (visibleColumns.tags) width += columnWidths.tags;
    return Math.max(800, width + 60);
  }, [columnWidths, visibleColumns]);

  const handleStartResize = (e: React.MouseEvent | React.TouchEvent, colKey: ColumnKey) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startWidth = columnWidths[colKey];

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const deltaX = currentX - startX;
      const minW = colKey === 'name' ? 240 : 50;
      const maxW = colKey === 'name' ? 900 : 400;
      const newW = Math.min(maxW, Math.max(minW, startWidth + deltaX));
      setColumnWidths(prev => ({ ...prev, [colKey]: newW }));
    };

    const handleEnd = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
  };

  const handleResetColumnWidth = (colKey: ColumnKey) => {
    setColumnWidths(prev => ({ ...prev, [colKey]: DEFAULT_COLUMN_WIDTHS[colKey] }));
  };

  // Calendar View State
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [calendarMode, setCalendarMode] = useState<'month' | 'week'>('month');
  const [selectedDayModal, setSelectedDayModal] = useState<{ dateStr: string; tasks: Task[] } | null>(null);

  const formatDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handlePrevCalendar = () => {
    const next = new Date(calendarDate);
    if (calendarMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else {
      next.setDate(next.getDate() - 7);
    }
    setCalendarDate(next);
  };

  const handleNextCalendar = () => {
    const next = new Date(calendarDate);
    if (calendarMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setCalendarDate(next);
  };

  const handleTodayCalendar = () => {
    setCalendarDate(new Date());
  };

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'task' | 'bug'>('all');
  const [onlyConflicts, setOnlyConflicts] = useState(false);
  const [selectedSprintIds, setSelectedSprintIds] = useState<string[]>([]);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

  const sprints = projectData.sprints || [];
  const isSprintFiltered = selectedSprintIds.length > 0 && selectedSprintIds.length < sprints.length;

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
          completionPercent: getStatusProgress(targetStatus, projectData.statusPercentages)
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
    if (statusFilter !== 'all' && nextStatus !== statusFilter) {
      setStatusFilter('all');
    }
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
      completionPercent: getStatusProgress(statusToUse, projectData.statusPercentages),
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
    return searchQuery.trim() !== '' || statusFilter !== 'all' || priorityFilter !== 'all' || typeFilter !== 'all' || onlyConflicts || isSprintFiltered;
  }, [searchQuery, statusFilter, priorityFilter, typeFilter, onlyConflicts, isSprintFiltered]);

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

  // Filter tasks based on search query, status, priority, type, sprint, and conflict toggle
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

      let matchesSprint = true;
      if (isSprintFiltered) {
        matchesSprint = !!(task.sprintId && selectedSprintIds.includes(task.sprintId));
      }

      return matchesSearch && matchesStatus && matchesPriority && matchesType && matchesConflict && matchesSprint;
    });
  }, [projectData.tasks, projectData.features, projectData.epics, projectData.milestones, searchQuery, statusFilter, priorityFilter, typeFilter, onlyConflicts, isSprintFiltered, selectedSprintIds]);

  // Calendar view grid computations
  const calendarGridDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days: Array<{ date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean }> = [];
    const todayStr = formatDateStr(new Date());

    // Previous month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      const dStr = formatDateStr(d);
      days.push({ date: d, dateStr: dStr, isCurrentMonth: false, isToday: dStr === todayStr });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dStr = formatDateStr(d);
      days.push({ date: d, dateStr: dStr, isCurrentMonth: true, isToday: dStr === todayStr });
    }

    // Next month padding
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(year, month + 1, day);
      const dStr = formatDateStr(d);
      days.push({ date: d, dateStr: dStr, isCurrentMonth: false, isToday: dStr === todayStr });
    }

    return days;
  }, [calendarDate]);

  const calendarWeekDays = useMemo(() => {
    const start = new Date(calendarDate);
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek);

    const todayStr = formatDateStr(new Date());
    const days: Array<{ date: Date; dateStr: string; isToday: boolean }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dStr = formatDateStr(d);
      days.push({ date: d, dateStr: dStr, isToday: dStr === todayStr });
    }

    return days;
  }, [calendarDate]);

  const getTasksForDate = (dateStr: string) => {
    return filteredTasks.filter(task => {
      if (!task.dueDate && !task.startDate) return false;
      if (task.dueDate === dateStr) return true;
      if (task.startDate === dateStr) return true;
      if (task.startDate && task.dueDate) {
        return task.startDate <= dateStr && task.dueDate >= dateStr;
      }
      return false;
    });
  };

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
    return getProjectEffectiveValues(filteredTasks, projectData.subtasks, projectData.stakeholders, projectData.statusPercentages);
  }, [filteredTasks, projectData.subtasks, projectData.stakeholders, projectData.statusPercentages]);

  const evmMetrics = useMemo(() => {
    return calculateEVMMetrics(
      filteredTasks,
      projectData.budget,
      projectData.subtasks,
      projectData.stakeholders,
      projectData.statusPercentages
    );
  }, [filteredTasks, projectData.budget, projectData.subtasks, projectData.stakeholders, projectData.statusPercentages]);

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
      completionPercent: getStatusProgress(quickStatus, projectData.statusPercentages),
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
      completionPercent: getStatusProgress(status, projectData.statusPercentages),
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

        {/* View Switcher Tabs (List, Board, Calendar) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 overflow-x-auto max-w-full">
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
          <button
            id="view-tab-calendar"
            onClick={() => setViewType('calendar')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              viewType === 'calendar' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>Calendar</span>
          </button>
        </div>
      </div>

      {/* Financial Baseline & EVM Summary Bar on WBS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Project Baseline (BAC)</span>
            </div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-1">
              ${(projectData.budget || 250000).toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500">Authorized Target Budget</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Calculator className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>WBS Planned Cost</span>
            </div>
            <div className="text-base font-bold font-mono text-indigo-300 mt-1">
              ${projectRollup.plannedCost.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500">Sum of All WBS Tasks</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <PieChart className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Cost Efficiency (CPI)</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-base font-bold font-mono ${evmMetrics.cpi >= 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {evmMetrics.cpi.toFixed(2)}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                (EV: ${evmMetrics.earnedValue.toLocaleString()})
              </span>
            </div>
            <span className="text-[10px] text-slate-500">
              CV: {evmMetrics.costVariance >= 0 ? '+' : ''}${evmMetrics.costVariance.toLocaleString()}
            </span>
          </div>
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
          {viewType === 'list' && (
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

            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-xs transition-colors shadow-sm shrink-0 whitespace-nowrap"
              title="Download CSV template or upload spreadsheet to feed WBS data directly"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span>Import / Feed CSV</span>
            </button>

            <div className="h-4 w-px bg-slate-800 hidden sm:block shrink-0" />

            <button
              onClick={() => {
                setEditingSprint(null);
                setIsSprintModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-semibold text-xs transition-colors shadow-sm shrink-0 whitespace-nowrap"
              title="Create, Edit or Delete Sprints for this project"
            >
              <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Manage Sprints</span>
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

          {/* Columns Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsColumnsMenuOpen(!isColumnsMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-white text-xs font-semibold transition-all shrink-0 whitespace-nowrap shadow-xs"
              title="Customise visible columns and drag-resizable layout"
            >
              <Columns className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Columns</span>
              <span className="px-1.5 py-0.2 text-[10px] bg-indigo-500/20 text-indigo-300 font-bold rounded-full">
                {Object.values(visibleColumns).filter(Boolean).length} / {Object.keys(visibleColumns).length}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isColumnsMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isColumnsMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsColumnsMenuOpen(false)} />
                <div className="absolute left-0 md:left-auto md:right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-2 text-xs space-y-1 backdrop-blur-md">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 px-2 font-bold text-slate-300 text-[11px] uppercase tracking-wider">
                    <span>Toggle Columns</span>
                    <button
                      onClick={() => setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)}
                      className="text-[10px] text-indigo-400 hover:underline font-normal normal-case"
                    >
                      Show All
                    </button>
                  </div>

                  <div className="space-y-0.5 pt-1 max-h-64 overflow-y-auto">
                    {COLUMN_DEFINITIONS.map(col => (
                      <label
                        key={col.key}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 cursor-pointer transition-colors ${
                          col.key === 'name' ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={visibleColumns[col.key]}
                            disabled={col.key === 'name'}
                            onChange={() => {
                              if (col.key !== 'name') {
                                setVisibleColumns(prev => ({ ...prev, [col.key]: !prev[col.key] }));
                              }
                            }}
                            className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                          />
                          <span className="text-slate-200 font-medium">{col.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{columnWidths[col.key]}px</span>
                      </label>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800 px-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Drag column edges to resize</span>
                    <button
                      onClick={() => {
                        setColumnWidths(DEFAULT_COLUMN_WIDTHS);
                        setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
                      }}
                      className="text-amber-400 hover:underline"
                    >
                      Reset Default
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
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
            {isSprintFiltered && (
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                Sprint: {selectedSprintIds.map(id => sprints.find(s => s.id === id)?.name).filter(Boolean).join(', ')}
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
              setSelectedSprintIds([]);
            }}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shrink-0 shadow-sm"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* ==================== VIEW 3: INTERACTIVE CALENDAR VIEW ==================== */}
      {viewType === 'calendar' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          {/* Calendar Controls & Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Calendar className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>
                    {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Task Timeline & Schedule Calendar</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Navigation buttons: Prev, Today, Next */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
                <button
                  onClick={handlePrevCalendar}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleTodayCalendar}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={handleNextCalendar}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* View mode toggle: Month / Week */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
                <button
                  onClick={() => setCalendarMode('month')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    calendarMode === 'month' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setCalendarMode('week')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    calendarMode === 'week' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Week
                </button>
              </div>
            </div>
          </div>

          {/* Month Grid View */}
          {calendarMode === 'month' && (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-inner">
              {/* Days of week header */}
              <div className="grid grid-cols-7 bg-slate-900/90 border-b border-slate-800 text-center text-xs font-bold text-slate-400 py-2.5">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Grid Cells */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-800/60 bg-slate-950">
                {calendarGridDays.map((cell, idx) => {
                  const dayTasks = getTasksForDate(cell.dateStr);
                  const displayTasks = dayTasks.slice(0, 3);
                  const extraCount = dayTasks.length - 3;

                  return (
                    <div
                      key={idx}
                      className={`min-h-[110px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors ${
                        !cell.isCurrentMonth ? 'bg-slate-950/40 text-slate-600' : 'bg-slate-900/40 hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded-md ${
                            cell.isToday
                              ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                              : cell.isCurrentMonth
                              ? 'text-slate-300'
                              : 'text-slate-600'
                          }`}
                        >
                          {cell.date.getDate()}
                        </span>
                        <button
                          onClick={() => onOpenTaskModal({ dueDate: cell.dateStr } as any)}
                          className="p-1 opacity-60 hover:opacity-100 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded transition-all text-[10px]"
                          title={`Add task for ${cell.dateStr}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Day Task List */}
                      <div className="flex-1 space-y-1 overflow-hidden">
                        {displayTasks.map(task => {
                          const statusBg =
                            task.status === 'done' ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' :
                            task.status === 'in_progress' ? 'bg-indigo-950/80 border-indigo-500/40 text-indigo-300' :
                            task.status === 'demoable' ? 'bg-teal-950/80 border-teal-500/40 text-teal-300' :
                            task.status === 'review' ? 'bg-purple-950/80 border-purple-500/40 text-purple-300' :
                            task.status === 'on_hold' ? 'bg-amber-950/80 border-amber-500/40 text-amber-300' :
                            task.status === 'blocked' ? 'bg-rose-950/80 border-rose-500/40 text-rose-300' :
                            'bg-slate-900 border-slate-700 text-slate-300';

                          return (
                            <div
                              key={task.id}
                              onClick={() => onOpenTaskModal(task)}
                              className={`p-1.5 rounded-lg border text-[11px] leading-tight flex items-center justify-between gap-1 cursor-pointer hover:scale-[1.01] transition-all group ${statusBg}`}
                              title={`${task.title} (${task.status.replace('_', ' ')})`}
                            >
                              <div className="flex items-center gap-1 min-w-0 flex-1">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  task.priority === 'urgent' ? 'bg-rose-500' :
                                  task.priority === 'high' ? 'bg-amber-500' : 'bg-indigo-400'
                                }`} />
                                <span className="font-medium truncate">{task.title}</span>
                              </div>
                            </div>
                          );
                        })}

                        {extraCount > 0 && (
                          <button
                            onClick={() => setSelectedDayModal({ dateStr: cell.dateStr, tasks: dayTasks })}
                            className="w-full text-left font-mono text-[10px] text-indigo-400 hover:text-indigo-300 font-bold px-1 hover:underline"
                          >
                            + {extraCount} more task{extraCount > 1 ? 's' : ''}...
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Week Grid View */}
          {calendarMode === 'week' && (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <div className="grid grid-cols-7 divide-x divide-slate-800">
                {calendarWeekDays.map((cell, idx) => {
                  const dayTasks = getTasksForDate(cell.dateStr);

                  return (
                    <div key={idx} className="min-h-[350px] p-2 sm:p-3 flex flex-col bg-slate-900/30">
                      <div className="text-center border-b border-slate-800 pb-2 mb-3">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          {cell.date.toLocaleDateString('default', { weekday: 'short' })}
                        </span>
                        <span className={`text-sm font-bold font-mono px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          cell.isToday ? 'bg-indigo-600 text-white' : 'text-slate-200'
                        }`}>
                          {cell.date.getDate()}
                        </span>
                      </div>

                      <div className="flex-1 space-y-2 overflow-y-auto">
                        {dayTasks.map(task => (
                          <div
                            key={task.id}
                            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 space-y-2 text-xs transition-all shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                task.priority === 'urgent' ? 'bg-rose-500/20 text-rose-300' :
                                task.priority === 'high' ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'
                              }`}>
                                {task.priority}
                              </span>
                            </div>

                            <p className="font-bold text-slate-100 text-xs">{task.title}</p>
                            {task.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-2">{task.description}</p>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
                              <span className="capitalize text-indigo-300">{task.status.replace('_', ' ')}</span>
                              <span>${task.plannedCost?.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}

                        {dayTasks.length === 0 && (
                          <div className="p-4 text-center text-slate-600 text-[11px] border border-dashed border-slate-800/80 rounded-xl">
                            No tasks
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}



















      {/* ==================== VIEW 2: SLEEK LIST VIEW (ClickUp/Linear/WBS style) ==================== */}
      {viewType === 'list' && (() => {
        // Helper to render a feature item row and its children tasks
        const renderFeatureItem = (feature: Feature, fCode: string, isNestedInEpic = false) => {
          const featureTasks = filteredTasks.filter(t => t.featureId === feature.id);
          const isFExpanded = expandedNodes[feature.id] !== false; // default expanded
          const featureAssignees: string[] = getFeatureAllAssigneeIds(feature.id, filteredTasks, projectData.subtasks);
          const fEff = getFeatureEffectiveValues(feature.id, filteredTasks, projectData.subtasks, projectData.stakeholders, projectData.statusPercentages);
          const completionPercent = fEff.completionPercent;
          const featureCost = fEff.plannedCost;

          return (
            <div key={feature.id} className={`bg-blue-500/5 dark:bg-slate-950/40 ${isNestedInEpic ? 'border-l-2 border-indigo-500/30 dark:border-indigo-500/20' : ''}`}>
              {/* Feature Header Row */}
              <div className="flex items-center justify-between py-2.5 px-4 bg-blue-500/10 hover:bg-blue-500/15 dark:bg-slate-900/60 dark:hover:bg-slate-800/50 transition-colors border-b border-blue-500/15 dark:border-slate-800/60 group min-w-0">
                <div style={{ width: columnWidths.name }} className={`flex items-center gap-2.5 shrink-0 pr-4 min-w-0 overflow-hidden ${isNestedInEpic ? 'pl-8' : 'pl-4'}`}>
                  <button
                    onClick={() => toggleNode(feature.id)}
                    className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors shrink-0"
                  >
                    {isFExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  <PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="font-mono text-[10px] bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-bold shrink-0">{fCode}</span>

                  <span
                    onClick={() => openEditModal(feature)}
                    className="font-bold text-xs text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-300 cursor-pointer truncate"
                    title="Click to view/edit Feature screen"
                  >
                    {feature.title}
                    {featureTasks.length > 0 && (
                      <span className="ml-1.5 text-slate-500 dark:text-slate-400 font-normal">
                        ({completionPercent}%)
                      </span>
                    )}
                  </span>

                  {/* ClickUp-style Hover Quick Actions inline */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-slate-800/90 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => {
                        setActiveInlineFeatureId(feature.id);
                        if (!isFExpanded) toggleNode(feature.id);
                      }}
                      className="p-0.5 text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded transition-colors"
                      title="Quick Add Task"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => openEditModal(feature)}
                      className="p-0.5 text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded transition-colors"
                      title="Open Feature Screen"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteFeature(feature.id)}
                      className="p-0.5 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition-colors"
                      title="Delete Feature"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-800/80 px-2 py-0.5 rounded-full font-mono shrink-0">
                    <Zap className="w-3 h-3 text-amber-500" />
                    {featureTasks.length}
                  </span>
                </div>

                <div className="flex items-center shrink-0 text-xs">
                  {visibleColumns.assignee && (
                    <div style={{ width: columnWidths.assignee }} className="flex items-center justify-start shrink-0 overflow-hidden px-2.5">
                      {renderAssigneeAvatars(featureAssignees)}
                    </div>
                  )}

                  {visibleColumns.startDate && (
                    <div style={{ width: columnWidths.startDate }} className="text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1 font-mono shrink-0 overflow-hidden px-2.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{feature.targetReleaseDate || 'No date'}</span>
                    </div>
                  )}

                  {visibleColumns.dueDate && (
                    <div style={{ width: columnWidths.dueDate }} className="text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1 font-mono shrink-0 overflow-hidden px-2.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{feature.targetReleaseDate || 'No date'}</span>
                    </div>
                  )}

                  {visibleColumns.estHours && (
                    <div style={{ width: columnWidths.estHours }} className="text-left font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300 shrink-0 overflow-hidden px-2.5">
                      {fEff.estimatedHours}h
                    </div>
                  )}

                  {visibleColumns.status && (
                    <div style={{ width: columnWidths.status }} className="flex items-center justify-start font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 shrink-0 overflow-hidden px-2.5">
                      <span>{completionPercent}% done</span>
                    </div>
                  )}

                  {visibleColumns.itemType && (
                    <div style={{ width: columnWidths.itemType }} className="flex items-center justify-start shrink-0 px-2.5">
                      <select
                        value="feature"
                        onChange={(e) => handleConvertItemType(e.target.value as any, { id: feature.id, type: 'feature' })}
                        className="bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30 rounded-md px-1.5 py-0.5 text-[11px] font-semibold outline-none cursor-pointer hover:border-blue-400 transition-colors shadow-2xs w-full"
                        title="Convert WBS Item Type"
                      >
                        <option value="milestone">Milestone</option>
                        <option value="epic">Epic</option>
                        <option value="feature">Feature</option>
                        <option value="task">Task</option>
                        <option value="subtask">Subtask</option>
                      </select>
                    </div>
                  )}

                  {visibleColumns.cost && (
                    <div style={{ width: columnWidths.cost }} className="text-left font-mono text-[11px] font-semibold text-emerald-400 shrink-0 overflow-hidden px-2.5">
                      ${featureCost.toLocaleString()}
                    </div>
                  )}

                  {visibleColumns.priority && (
                    <div style={{ width: columnWidths.priority }} className="flex items-center justify-start shrink-0 px-2.5">
                      <Flag className={`w-3.5 h-3.5 ${
                        feature.priority === 'urgent' ? 'text-rose-500' :
                        feature.priority === 'high' ? 'text-amber-500' :
                        'text-indigo-500'
                      }`} />
                    </div>
                  )}

                  {visibleColumns.tags && (
                    <div style={{ width: columnWidths.tags }} className="flex items-center justify-start shrink-0 px-2.5 text-[11px] text-slate-500 font-mono">
                      —
                    </div>
                  )}
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
            <div style={{ minWidth: totalTableWidth }}>
              {/* Column Header Row */}
              <div className="flex items-center justify-between py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider bg-slate-100/80 dark:bg-slate-900/90 rounded-t-2xl relative select-none">
                <div
                  style={{ width: columnWidths.name }}
                  className="shrink-0 flex items-center justify-between pr-4 gap-2 relative group/col min-w-0"
                >
                  <span className="whitespace-nowrap font-bold text-slate-700 dark:text-slate-300">Name & WBS Hierarchy</span>
                  <div
                    onMouseDown={(e) => handleStartResize(e, 'name')}
                    onTouchStart={(e) => handleStartResize(e, 'name')}
                    onDoubleClick={() => handleResetColumnWidth('name')}
                    className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize hover:bg-indigo-500/30 active:bg-indigo-600/50 z-20 flex items-center justify-center group/handle transition-colors"
                    title="Drag to resize Name column (Double-click to reset)"
                  >
                    <div className="w-0.5 h-3.5 opacity-0 group-hover/col:opacity-100 group-hover/handle:opacity-100 bg-slate-400/60 dark:bg-slate-500 group-hover/handle:bg-indigo-400 rounded-full transition-opacity" />
                  </div>
                </div>

                <div className="flex items-center shrink-0 font-semibold">
                  {visibleColumns.assignee && (
                    <div
                      style={{ width: columnWidths.assignee }}
                      className="relative text-left whitespace-nowrap shrink-0 flex items-center group/col px-2.5"
                    >
                      <span>Assignee</span>
                      <div
                        onMouseDown={(e) => handleStartResize(e, 'assignee')}
                        onTouchStart={(e) => handleStartResize(e, 'assignee')}
                        onDoubleClick={() => handleResetColumnWidth('assignee')}
                        className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize hover:bg-indigo-500/30 active:bg-indigo-600/50 z-20 flex items-center justify-center group/handle transition-colors"
                        title="Drag to resize Assignee column"
                      >
                        <div className="w-0.5 h-3.5 opacity-0 group-hover/col:opacity-100 group-hover/handle:opacity-100 bg-slate-400/60 dark:bg-slate-500 group-hover/handle:bg-indigo-400 rounded-full transition-opacity" />
                      </div>
                    </div>
                  )}

                  {visibleColumns.startDate && (
                    <div
                      style={{ width: columnWidths.startDate }}
                      className="relative text-left whitespace-nowrap shrink-0 flex items-center group/col px-2.5"
                    >
                      <span>Start Date</span>
                      <div
                        onMouseDown={(e) => handleStartResize(e, 'startDate')}
                        onTouchStart={(e) => handleStartResize(e, 'startDate')}
                        onDoubleClick={() => handleResetColumnWidth('startDate')}
                        className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize hover:bg-indigo-500/30 active:bg-indigo-600/50 z-20 flex items-center justify-center group/handle transition-colors"
                        title="Drag to resize Start Date column"
                      >
                        <div className="w-0.5 h-3.5 opacity-0 group-hover/col:opacity-100 group-hover/handle:opacity-100 bg-slate-400/60 dark:bg-slate-500 group-hover/handle:bg-indigo-400 rounded-full transition-opacity" />
                      </div>
                    </div>
                  )}

                  {visibleColumns.dueDate && (
                    <div
                      style={{ width: columnWidths.dueDate }}
                      className="relative text-left whitespace-nowrap shrink-0 flex items-center group/col px-2.5"
                    >
                      <span>Due Date</span>
                      <div
                        onMouseDown={(e) => handleStartResize(e, 'dueDate')}
                        onTouchStart={(e) => handleStartResize(e, 'dueDate')}
                        onDoubleClick={() => handleResetColumnWidth('dueDate')}
                        className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize hover:bg-indigo-500/30 active:bg-indigo-600/50 z-20 flex items-center justify-center group/handle transition-colors"
                        title="Drag to resize Due Date column"
                      >
                        <div className="w-0.5 h-3.5 opacity-0 group-hover/col:opacity-100 group-hover/handle:opacity-100 bg-slate-400/60 dark:bg-slate-500 group-hover/handle:bg-indigo-400 rounded-full transition-opacity" />
                      </div>
                    </div>
                  )}

                  {visibleColumns.estHours && (
                    <div
                      style={{ width: columnWidths.estHours }}
                      className="relative text-left whitespace-nowrap shrink-0 flex items-center justify-start group/col px-2.5"
                    >
                      <span>Est. Hours</span>
                      <div
                        onMouseDown={(e) => handleStartResize(e, 'estHours')}
                        onTouchStart={(e) => handleStartResize(e, 'estHours')}
                        onDoubleClick={() => handleResetColumnWidth('estHours')}
                        className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize hover:bg-indigo-500/30 active:bg-indigo-600/50 z-20 flex items-center justify-center group/handle transition-colors"
                        title="Drag to resize Est. Hours column"
                      >
                        <div className="w-0.5 h-3.5 opacity-0 group-hover/col:opacity-100 group-hover/handle:opacity-100 bg-slate-400/60 dark:bg-slate-500 group-hover/handle:bg-indigo-400 rounded-full transition-opacity" />
                      </div>
                    </div>
                  )}

                  {visibleColumns.status && (
                    <div
                      style={{ width: columnWidths.status }}
                      className="relative text-left whitespace-nowrap shrink-0 flex items-center group/col px-2.5"
                    >
                      <span>Status</span>
                      <div
                        onMouseDown={(e) => handleStartResize(e, 'status')}
                        onTouchStart={(e) => handleStartResize(e, 'status')}
                        onDoubleClick={() => handleResetColumnWidth('status')}
                        className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize hover:bg-indigo-500/30 active:bg-indigo-600/50 z-20 flex items-center justify-center group/handle transition-colors"
                        title="Drag to resize Status column"
                      >
                        <div className="w-0.5 h-3.5 opacity-0 group-hover/col:opacity-100 group-hover/handle:opacity-100 bg-slate-400/60 dark:bg-slate-500 group-hover/handle:bg-indigo-400 rounded-full transition-opacity" />
                      </div>
                    </div>
                  )}

                  {visibleColumns.itemType && (
                    <div
                      style={{ width: columnWidths.itemType }}
                      className="relative text-left whitespace-nowrap shrink-0 flex items-center group/col px-2.5"
                    >
                      <span>Item Type</span>
                      <div
                        onMouseDown={(e) => handleStartResize(e, 'itemType')}
                        onTouchStart={(e) => handleStartResize(e, 'itemType')}
                        onDoubleClick={() => handleResetColumnWidth('itemType')}
                        className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize hover:bg-indigo-500/30 active:bg-indigo-600/50 z-20 flex items-center justify-center group/handle transition-colors"
                        title="Drag to resize Item Type column"
                      >
                        <div className="w-0.5 h-3.5 opacity-0 group-hover/col:opacity-100 group-hover/handle:opacity-100 bg-slate-400/60 dark:bg-slate-500 group-hover/handle:bg-indigo-400 rounded-full transition-opacity" />
                      </div>
                    </div>
                  )}

                  {visibleColumns.cost && (
                    <div
                      style={{ width: columnWidths.cost }}
                      className="relative text-left whitespace-nowrap shrink-0 flex items-center justify-start group/col px-2.5"
                    >
                      <span>Cost</span>
                      <div
                        onMouseDown={(e) => handleStartResize(e, 'cost')}
                        onTouchStart={(e) => handleStartResize(e, 'cost')}
                        onDoubleClick={() => handleResetColumnWidth('cost')}
                        className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize hover:bg-indigo-500/30 active:bg-indigo-600/50 z-20 flex items-center justify-center group/handle transition-colors"
                        title="Drag to resize Cost column"
                      >
                        <div className="w-0.5 h-3.5 opacity-0 group-hover/col:opacity-100 group-hover/handle:opacity-100 bg-slate-400/60 dark:bg-slate-500 group-hover/handle:bg-indigo-400 rounded-full transition-opacity" />
                      </div>
                    </div>
                  )}

                  {visibleColumns.priority && (
                    <div
                      style={{ width: columnWidths.priority }}
                      className="relative text-left whitespace-nowrap shrink-0 flex items-center group/col px-2.5"
                    >
                      <span>Priority</span>
                      <div
                        onMouseDown={(e) => handleStartResize(e, 'priority')}
                        onTouchStart={(e) => handleStartResize(e, 'priority')}
                        onDoubleClick={() => handleResetColumnWidth('priority')}
                        className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize hover:bg-indigo-500/30 active:bg-indigo-600/50 z-20 flex items-center justify-center group/handle transition-colors"
                        title="Drag to resize Priority column"
                      >
                        <div className="w-0.5 h-3.5 opacity-0 group-hover/col:opacity-100 group-hover/handle:opacity-100 bg-slate-400/60 dark:bg-slate-500 group-hover/handle:bg-indigo-400 rounded-full transition-opacity" />
                      </div>
                    </div>
                  )}

                  {visibleColumns.tags && (
                    <div
                      style={{ width: columnWidths.tags }}
                      className="relative text-left whitespace-nowrap shrink-0 flex items-center group/col px-2.5"
                    >
                      <span>Tags</span>
                      <div
                        onMouseDown={(e) => handleStartResize(e, 'tags')}
                        onTouchStart={(e) => handleStartResize(e, 'tags')}
                        onDoubleClick={() => handleResetColumnWidth('tags')}
                        className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize hover:bg-indigo-500/30 active:bg-indigo-600/50 z-20 flex items-center justify-center group/handle transition-colors"
                        title="Drag to resize Tags column"
                      >
                        <div className="w-0.5 h-3.5 opacity-0 group-hover/col:opacity-100 group-hover/handle:opacity-100 bg-slate-400/60 dark:bg-slate-500 group-hover/handle:bg-indigo-400 rounded-full transition-opacity" />
                      </div>
                    </div>
                  )}


                </div>
              </div>

            <div className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
              {/* 1. MILESTONES SECTION */}
              {projectData.milestones.map((milestone, mIdx) => {
                const isMExpanded = expandedNodes[milestone.id] !== false;
                const milestoneEpics = (projectData.epics || []).filter(e => e.milestoneId === milestone.id);
                const milestoneFeatures = projectData.features.filter(f => f.milestoneId === milestone.id && !f.epicId);
                const milestoneDirectTasks = filteredTasks.filter(t => t.milestoneId === milestone.id && !t.epicId && !t.featureId);
                const mEff = getMilestoneEffectiveValues(milestone.id, filteredTasks, projectData.subtasks, projectData.stakeholders, projectData.epics || [], projectData.features, projectData.statusPercentages);
                const mPercent = mEff.completionPercent;
                const mCost = mEff.plannedCost;

                return (
                  <div key={milestone.id} className="bg-amber-500/5 dark:bg-amber-950/20">
                    {/* Milestone Header Row */}
                    <div className="flex items-center justify-between py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500/15 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 transition-colors border-b border-amber-500/20 group min-w-0">
                      <div style={{ width: columnWidths.name }} className="flex items-center gap-2.5 shrink-0 pr-4 min-w-0 overflow-hidden">
                        <button
                          onClick={() => toggleNode(milestone.id)}
                          className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors shrink-0"
                        >
                          {isMExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>

                        <Flag className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="font-mono text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold shrink-0">M{mIdx + 1}</span>

                        <span
                          onClick={() => openEditModal(milestone)}
                          className="font-bold text-xs text-slate-900 dark:text-amber-200 hover:text-amber-600 dark:hover:text-amber-100 cursor-pointer truncate"
                          title="Click to view/edit Milestone screen"
                        >
                          {milestone.title}
                        </span>

                        {/* Hover Quick Actions */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-slate-800/90 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <button
                            onClick={() => openCreateModal('epic', milestone.id)}
                            className="p-0.5 text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950 rounded transition-colors"
                            title="Add Epic"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => openEditModal(milestone)}
                            className="p-0.5 text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950 rounded transition-colors"
                            title="Open Milestone Screen"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteMilestone(milestone.id)}
                            className="p-0.5 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition-colors"
                            title="Delete Milestone"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center shrink-0 text-xs">
                        {visibleColumns.assignee && (
                          <div style={{ width: columnWidths.assignee }} className="flex items-center justify-start shrink-0 overflow-hidden px-2.5">
                            {renderAssigneeAvatars(getMilestoneAllAssigneeIds(milestone.id, projectData.epics || [], projectData.features, filteredTasks, projectData.subtasks))}
                          </div>
                        )}

                        {visibleColumns.startDate && (
                          <div style={{ width: columnWidths.startDate }} className="text-amber-700 dark:text-amber-300/90 text-xs flex items-center gap-1 font-mono shrink-0 overflow-hidden px-2.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="truncate">{milestone.dueDate || 'No date'}</span>
                          </div>
                        )}

                        {visibleColumns.dueDate && (
                          <div style={{ width: columnWidths.dueDate }} className="text-amber-700 dark:text-amber-300/90 text-xs flex items-center gap-1 font-mono shrink-0 overflow-hidden px-2.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="truncate">{milestone.dueDate || 'No date'}</span>
                          </div>
                        )}

                        {visibleColumns.estHours && (
                          <div style={{ width: columnWidths.estHours }} className="text-left font-mono text-[11px] font-semibold text-amber-600 dark:text-amber-300 shrink-0 overflow-hidden px-2.5">
                            {mEff.estimatedHours}h
                          </div>
                        )}

                        {visibleColumns.status && (
                          <div style={{ width: columnWidths.status }} className="flex items-center justify-start font-mono text-[11px] font-semibold text-amber-600 dark:text-amber-400 shrink-0 overflow-hidden px-2.5">
                            <span>{mPercent}% done</span>
                          </div>
                        )}

                        {visibleColumns.itemType && (
                          <div style={{ width: columnWidths.itemType }} className="flex items-center justify-start shrink-0 px-2.5">
                            <select
                              value="milestone"
                              onChange={(e) => handleConvertItemType(e.target.value as any, { id: milestone.id, type: 'milestone' })}
                              className="bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 rounded-md px-1.5 py-0.5 text-[11px] font-semibold outline-none cursor-pointer hover:border-amber-400 transition-colors shadow-2xs w-full"
                              title="Convert WBS Item Type"
                            >
                              <option value="milestone">Milestone</option>
                              <option value="epic">Epic</option>
                              <option value="feature">Feature</option>
                              <option value="task">Task</option>
                              <option value="subtask">Subtask</option>
                            </select>
                          </div>
                        )}

                        {visibleColumns.cost && (
                          <div style={{ width: columnWidths.cost }} className="text-left font-mono text-[11px] font-semibold text-emerald-400 shrink-0 overflow-hidden px-2.5">
                            ${mCost.toLocaleString()}
                          </div>
                        )}

                        {visibleColumns.priority && (
                          <div style={{ width: columnWidths.priority }} className="flex items-center justify-start shrink-0 px-2.5">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">—</span>
                          </div>
                        )}

                        {visibleColumns.tags && (
                          <div style={{ width: columnWidths.tags }} className="flex items-center justify-start shrink-0 px-2.5 text-[11px] text-slate-500 font-mono">
                            —
                          </div>
                        )}
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
                            <div key={epic.id} className="bg-purple-500/5 dark:bg-purple-950/10">
                              {/* Epic Header Row */}
                              <div className="flex items-center justify-between py-2 px-4 bg-purple-500/10 hover:bg-purple-500/15 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 transition-colors border-b border-purple-500/20 group min-w-0">
                                <div style={{ width: columnWidths.name }} className="flex items-center gap-2.5 shrink-0 pr-4 pl-4 min-w-0 overflow-hidden">
                                  <button
                                    onClick={() => toggleNode(epic.id)}
                                    className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 transition-colors shrink-0"
                                  >
                                    {isEExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>

                                  <Layers className="w-4 h-4 text-purple-500 shrink-0" />
                                  <span className="font-mono text-[10px] bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-bold shrink-0">M{mIdx + 1}.E{eIdx + 1}</span>

                                  <span
                                    onClick={() => openEditModal(epic)}
                                    className="font-bold text-xs text-slate-900 dark:text-purple-200 hover:text-purple-600 dark:hover:text-purple-100 cursor-pointer truncate"
                                    title="Click to view/edit Epic screen"
                                  >
                                    {epic.title}
                                  </span>

                                  {/* Hover Quick Actions */}
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-slate-800/90 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <button
                                      onClick={() => openCreateModal('feature', milestone.id, epic.id)}
                                      className="p-0.5 text-slate-500 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950 rounded transition-colors"
                                      title="Add Feature"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => openEditModal(epic)}
                                      className="p-0.5 text-slate-500 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950 rounded transition-colors"
                                      title="Open Epic Screen"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => deleteEpic(epic.id)}
                                      className="p-0.5 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition-colors"
                                      title="Delete Epic"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-center shrink-0 text-xs">
                                  {visibleColumns.assignee && (
                                    <div style={{ width: columnWidths.assignee }} className="flex items-center justify-start shrink-0 overflow-hidden px-2.5">
                                      {renderAssigneeAvatars(getEpicAllAssigneeIds(epic.id, projectData.features, filteredTasks, projectData.subtasks))}
                                    </div>
                                  )}

                                  {visibleColumns.startDate && (
                                    <div style={{ width: columnWidths.startDate }} className="text-purple-700 dark:text-purple-300/90 text-xs flex items-center gap-1 font-mono shrink-0 overflow-hidden px-2.5">
                                      <Calendar className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                      <span className="truncate">{epic.targetReleaseDate || 'No date'}</span>
                                    </div>
                                  )}

                                  {visibleColumns.dueDate && (
                                    <div style={{ width: columnWidths.dueDate }} className="text-purple-700 dark:text-purple-300/90 text-xs flex items-center gap-1 font-mono shrink-0 overflow-hidden px-2.5">
                                      <Calendar className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                      <span className="truncate">{epic.targetReleaseDate || 'No date'}</span>
                                    </div>
                                  )}

                                  {visibleColumns.estHours && (
                                    <div style={{ width: columnWidths.estHours }} className="text-left font-mono text-[11px] font-semibold text-purple-600 dark:text-purple-300 shrink-0 overflow-hidden px-2.5">
                                      {getEpicEffectiveValues(epic.id, projectData.features, filteredTasks, projectData.subtasks, projectData.stakeholders, projectData.statusPercentages).estimatedHours}h
                                    </div>
                                  )}

                                  {visibleColumns.status && (
                                    <div style={{ width: columnWidths.status }} className="flex items-center justify-start font-mono text-[11px] font-semibold text-purple-600 dark:text-purple-400 shrink-0 overflow-hidden px-2.5">
                                      {(() => {
                                        const eEff = getEpicEffectiveValues(epic.id, projectData.features, filteredTasks, projectData.subtasks, projectData.stakeholders, projectData.statusPercentages);
                                        return <span>{eEff.completionPercent}% done</span>;
                                      })()}
                                    </div>
                                  )}

                                  {visibleColumns.itemType && (
                                    <div style={{ width: columnWidths.itemType }} className="flex items-center justify-start shrink-0 px-2.5">
                                      <select
                                        value="epic"
                                        onChange={(e) => handleConvertItemType(e.target.value as any, { id: epic.id, type: 'epic' })}
                                        className="bg-white dark:bg-slate-900 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 rounded-md px-1.5 py-0.5 text-[11px] font-semibold outline-none cursor-pointer hover:border-purple-400 transition-colors shadow-2xs w-full"
                                        title="Convert WBS Item Type"
                                      >
                                        <option value="milestone">Milestone</option>
                                        <option value="epic">Epic</option>
                                        <option value="feature">Feature</option>
                                        <option value="task">Task</option>
                                        <option value="subtask">Subtask</option>
                                      </select>
                                    </div>
                                  )}

                                  {visibleColumns.cost && (
                                    <div style={{ width: columnWidths.cost }} className="text-left font-mono text-[11px] font-semibold text-emerald-400 shrink-0 overflow-hidden px-2.5">
                                      {(() => {
                                        const eEff = getEpicEffectiveValues(epic.id, projectData.features, filteredTasks, projectData.subtasks, projectData.stakeholders, projectData.statusPercentages);
                                        return `$${eEff.plannedCost.toLocaleString()}`;
                                      })()}
                                    </div>
                                  )}

                                  {visibleColumns.priority && (
                                    <div style={{ width: columnWidths.priority }} className="flex items-center justify-start shrink-0 px-2.5">
                                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">—</span>
                                    </div>
                                  )}

                                  {visibleColumns.tags && (
                                    <div style={{ width: columnWidths.tags }} className="flex items-center justify-start shrink-0 px-2.5 text-[11px] text-slate-500 font-mono">
                                      —
                                    </div>
                                  )}
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
                    <div className="flex items-center justify-between py-2 px-4 bg-purple-500/10 hover:bg-purple-500/15 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 transition-colors border-b border-purple-500/20 group min-w-0">
                      <div style={{ width: columnWidths.name }} className="flex items-center gap-2.5 shrink-0 pr-4 min-w-0 overflow-hidden">
                        <button onClick={() => toggleNode(epic.id)} className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 transition-colors shrink-0">
                          {isEExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <Layers className="w-4 h-4 text-purple-500 shrink-0" />
                        <span className="font-mono text-[10px] bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-bold shrink-0">E{eIdx + 1}</span>
                        <span
                          onClick={() => openEditModal(epic)}
                          className="font-bold text-xs text-slate-900 dark:text-purple-200 hover:text-purple-600 dark:hover:text-purple-100 cursor-pointer truncate"
                          title="Click to view/edit Epic screen"
                        >
                          {epic.title}
                        </span>

                        {/* Hover Quick Actions */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-slate-800/90 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <button
                            onClick={() => openCreateModal('feature', undefined, epic.id)}
                            className="p-0.5 text-slate-500 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950 rounded transition-colors"
                            title="Add Feature"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => openEditModal(epic)}
                            className="p-0.5 text-slate-500 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950 rounded transition-colors"
                            title="Open Epic Screen"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteEpic(epic.id)}
                            className="p-0.5 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition-colors"
                            title="Delete Epic"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center shrink-0 text-xs">
                        {visibleColumns.assignee && (
                          <div style={{ width: columnWidths.assignee }} className="flex items-center justify-start shrink-0 overflow-hidden px-2.5">
                            {renderAssigneeAvatars(getEpicAllAssigneeIds(epic.id, projectData.features, filteredTasks, projectData.subtasks))}
                          </div>
                        )}
                        {visibleColumns.dueDate && (
                          <div style={{ width: columnWidths.dueDate }} className="text-purple-700 dark:text-purple-300/90 text-xs flex items-center gap-1 font-mono shrink-0 overflow-hidden px-2.5">
                            <Calendar className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            <span className="truncate">{epic.targetReleaseDate || 'No date'}</span>
                          </div>
                        )}
                        {visibleColumns.status && (
                          <div style={{ width: columnWidths.status }} className="flex items-center justify-start font-mono text-[11px] font-semibold text-purple-600 dark:text-purple-400 shrink-0 overflow-hidden px-2.5">
                            {(() => {
                              const eEff = getEpicEffectiveValues(epic.id, projectData.features, filteredTasks, projectData.subtasks, projectData.stakeholders, projectData.statusPercentages);
                              return <span>{eEff.completionPercent}% done</span>;
                            })()}
                          </div>
                        )}
                        {visibleColumns.itemType && (
                          <div style={{ width: columnWidths.itemType }} className="flex items-center justify-start shrink-0 px-2.5">
                            <select
                              value="epic"
                              onChange={(e) => handleConvertItemType(e.target.value as any, { id: epic.id, type: 'epic' })}
                              className="bg-white dark:bg-slate-900 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 rounded-md px-1.5 py-0.5 text-[11px] font-semibold outline-none cursor-pointer hover:border-purple-400 transition-colors shadow-2xs w-full"
                              title="Convert WBS Item Type"
                            >
                              <option value="milestone">Milestone</option>
                              <option value="epic">Epic</option>
                              <option value="feature">Feature</option>
                              <option value="task">Task</option>
                              <option value="subtask">Subtask</option>
                            </select>
                          </div>
                        )}
                        {visibleColumns.cost && (
                          <div style={{ width: columnWidths.cost }} className="text-left font-mono text-[11px] font-semibold text-emerald-400 shrink-0 overflow-hidden px-2.5">
                            {(() => {
                              const eEff = getEpicEffectiveValues(epic.id, projectData.features, filteredTasks, projectData.subtasks, projectData.stakeholders, projectData.statusPercentages);
                              return `$${eEff.plannedCost.toLocaleString()}`;
                            })()}
                          </div>
                        )}
                        {visibleColumns.priority && (
                          <div style={{ width: columnWidths.priority }} className="flex items-center justify-start shrink-0 px-2.5">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">—</span>
                          </div>
                        )}
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
                              if (statusFilter !== 'all' && newSt !== statusFilter) {
                                setStatusFilter('all');
                              }
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

      {/* CSV Feed Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
      />

      {/* Sprint CRUD Management Modal */}
      <SprintModal
        isOpen={isSprintModalOpen}
        onClose={() => setIsSprintModalOpen(false)}
        sprintToEdit={editingSprint}
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
                      value={tempPercentages[item.key] !== undefined ? tempPercentages[item.key] : item.defaultVal}
                      onChange={(e) => {
                        const rawVal = e.target.value;
                        if (rawVal === '') {
                          setTempPercentages(prev => ({ ...prev, [item.key]: '' }));
                        } else {
                          const num = parseInt(rawVal, 10);
                          if (!isNaN(num)) {
                            const clamped = Math.min(100, Math.max(0, num));
                            setTempPercentages(prev => ({ ...prev, [item.key]: clamped }));
                          }
                        }
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
                  const finalPercentages: Record<string, number> = {};
                  [
                    { key: 'todo', defaultVal: 0 },
                    { key: 'in_progress', defaultVal: 40 },
                    { key: 'demoable', defaultVal: 80 },
                    { key: 'review', defaultVal: 80 },
                    { key: 'on_hold', defaultVal: 0 },
                    { key: 'blocked', defaultVal: 50 },
                    { key: 'done', defaultVal: 100 },
                  ].forEach(item => {
                    const val = tempPercentages[item.key];
                    if (val === '' || val === undefined || val === null || isNaN(Number(val))) {
                      finalPercentages[item.key] = item.defaultVal;
                    } else {
                      finalPercentages[item.key] = Math.min(100, Math.max(0, Number(val)));
                    }
                  });

                  await updateStatusPercentages(finalPercentages);
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
    const taskEff = getTaskEffectiveValues(task, subtasks, projectData.stakeholders, projectData.statusPercentages);

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
          className={`flex items-center justify-between py-2 px-4 border-b border-slate-200/80 dark:border-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors group ${
            isDragTarget ? 'bg-indigo-100 dark:bg-indigo-950/80 border-indigo-400' : ''
          }`}
        >
          <div style={{ width: columnWidths.name }} className="flex items-center gap-2 shrink-0 pr-4 pl-8 min-w-0 overflow-hidden">
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
            <div className="flex items-center justify-between gap-2 min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 shrink-0 font-semibold">
                  {code}
                </span>
                <span
                  onClick={() => onOpenTaskModal(task)}
                  className={`text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 cursor-pointer min-w-0 flex-1 truncate ${
                    task.status === 'done' ? 'line-through text-slate-400 dark:text-slate-500' : ''
                  }`}
                  title={`${task.title} (Click to open details)`}
                >
                  {task.title}
                </span>
              </div>

              {/* Badges & Actions group */}
              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                {task.type === 'bug' && (
                  <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 shrink-0">
                    <Bug className="w-3 h-3 text-rose-400 shrink-0" />
                    <span>Bug</span>
                  </span>
                )}

                {task.sprintId && (() => {
                  const sp = (projectData.sprints || []).find(s => s.id === task.sprintId);
                  const spName = sp?.name || 'Sprint';
                  return (
                    <span
                      className="bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30 font-medium px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 shrink-0 max-w-[110px] cursor-pointer hover:bg-purple-500/20 transition-colors"
                      title={`Sprint: ${spName} (Click to manage)`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (sp) {
                          setEditingSprint(sp);
                          setIsSprintModalOpen(true);
                        }
                      }}
                    >
                      <Layers className="w-3 h-3 text-purple-400 shrink-0" />
                      <span className="truncate">{spName}</span>
                    </span>
                  );
                })()}

                {task.linkedBugIds && task.linkedBugIds.length > 0 && (
                  <span
                    className="bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30 font-medium px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 shrink-0 cursor-pointer hover:bg-purple-500/20 transition-colors"
                    title={`${task.linkedBugIds.length} linked bug(s)`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTaskModal(task);
                    }}
                  >
                    <Bug className="w-3 h-3 text-purple-400 shrink-0" />
                    <span>{task.linkedBugIds.length}</span>
                  </span>
                )}

                {subtasks.length > 0 && (
                  <button
                    onClick={() => toggleNode(task.id)}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono hover:underline shrink-0 bg-indigo-50 dark:bg-indigo-950/60 px-1 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/50"
                    title="Toggle subtasks view"
                  >
                    {subtasks.filter(st => st.completed).length}/{subtasks.length}
                  </button>
                )}

                {predecessors.some(p => p.hasConflict) && (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" title="Schedule conflict" />
                )}

                {/* Hover Quick Actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0 bg-slate-100 dark:bg-slate-800/90 px-1 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveInlineTaskId(task.id);
                      if (!isExpanded) toggleNode(task.id);
                    }}
                    className="p-0.5 text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded transition-colors"
                    title="Add Subtask"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTaskModal(task);
                    }}
                    className="p-0.5 text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded transition-colors"
                    title="Open Task Details"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTask(task.id);
                    }}
                    className="p-0.5 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition-colors"
                    title="Delete Task"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Aligned Columns */}
          <div className="flex items-center shrink-0 text-xs">
            {/* Assignees Avatars */}
            {visibleColumns.assignee && (
              <div style={{ width: columnWidths.assignee }} className="flex items-center justify-start shrink-0 overflow-hidden px-2.5">
                {renderAssigneeAvatars(getTaskAllAssigneeIds(task, projectData.subtasks))}
              </div>
            )}

            {/* Start Date */}
            {visibleColumns.startDate && (
              <div style={{ width: columnWidths.startDate }} className="text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1 font-mono shrink-0 overflow-hidden px-2.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="truncate">{task.startDate ? task.startDate : 'No date'}</span>
              </div>
            )}

            {/* Due date */}
            {visibleColumns.dueDate && (
              <div style={{ width: columnWidths.dueDate }} className="text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1 font-mono shrink-0 overflow-hidden px-2.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="truncate">{task.dueDate ? task.dueDate : 'No date'}</span>
              </div>
            )}

            {/* Est. Hours */}
            {visibleColumns.estHours && (
              <div style={{ width: columnWidths.estHours }} className="text-left font-mono text-[11px] text-slate-600 dark:text-slate-300 shrink-0 overflow-hidden px-2.5">
                <span className="font-semibold block truncate">{taskEff.estimatedHours}h</span>
                <span className="text-[10px] text-slate-400 block truncate">{taskEff.actualHours}h act</span>
              </div>
            )}

            {/* Direct Status Selector Dropdown */}
            {visibleColumns.status && (
              <div style={{ width: columnWidths.status }} className="flex items-center justify-start shrink-0 overflow-hidden px-2.5">
                <select
                  value={task.status}
                  onChange={(e) => {
                    const newSt = e.target.value as TaskStatus;
                    if (statusFilter !== 'all' && newSt !== statusFilter) {
                      setStatusFilter('all');
                    }
                    saveTask({
                      ...task,
                      status: newSt,
                      completionPercent: getStatusProgress(newSt, projectData.statusPercentages)
                    });
                    showNotice(`Updated Task "${task.title}" status to ${newSt.toUpperCase().replace('_', ' ')} (${getStatusProgress(newSt, projectData.statusPercentages)}%)`);
                  }}
                  className={`border rounded-md px-1.5 py-0.5 text-[11px] font-semibold outline-none cursor-pointer transition-colors shadow-2xs w-full ${
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
            )}

            {/* Item Type Dropdown before Priority */}
            {visibleColumns.itemType && (
              <div style={{ width: columnWidths.itemType }} className="flex items-center justify-start shrink-0 px-2.5">
                <select
                  value="task"
                  onChange={(e) => handleConvertItemType(e.target.value as any, { id: task.id, type: 'task' })}
                  className="bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 rounded-md px-1.5 py-0.5 text-[11px] font-semibold outline-none cursor-pointer hover:border-indigo-400 transition-colors shadow-2xs w-full"
                  title="Convert WBS Item Type"
                >
                  <option value="milestone">Milestone</option>
                  <option value="epic">Epic</option>
                  <option value="feature">Feature</option>
                  <option value="task">Task</option>
                  <option value="subtask">Subtask</option>
                </select>
              </div>
            )}

            {/* Task Planned & Actual Cost (AC) */}
            {visibleColumns.cost && (
              <div style={{ width: columnWidths.cost }} className="text-left font-mono text-[11px] shrink-0 overflow-hidden px-2.5">
                <span className="text-emerald-400 font-semibold block truncate" title="Planned Cost">
                  ${taskEff.plannedCost.toLocaleString()}
                </span>
                <span className="text-amber-400/90 text-[10px] block truncate" title="Actual Cost Incurred">
                  AC: ${taskEff.actualCost.toLocaleString()}
                </span>
              </div>
            )}

            {/* Priority flag */}
            {visibleColumns.priority && (
              <div style={{ width: columnWidths.priority }} className="flex items-center justify-start shrink-0 px-2.5">
                <button
                  onClick={() => {
                    const priorities: Priority[] = ['low', 'normal', 'high', 'urgent'];
                    const nextPriority = priorities[(priorities.indexOf(task.priority) + 1) % priorities.length];
                    saveTask({ ...task, priority: nextPriority });
                  }}
                  title={`Priority: ${task.priority}. Click to change.`}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors flex items-center gap-1 truncate"
                >
                  <Flag className={`w-3.5 h-3.5 shrink-0 ${
                    task.priority === 'urgent' ? 'text-rose-500 fill-rose-500/20' :
                    task.priority === 'high' ? 'text-amber-500 fill-amber-500/20' :
                    task.priority === 'normal' ? 'text-indigo-500' :
                    'text-slate-400'
                  }`} />
                  <span className="text-[10px] capitalize text-slate-500 dark:text-slate-400 font-medium truncate">{task.priority}</span>
                </button>
              </div>
            )}

            {/* Tags */}
            {visibleColumns.tags && (
              <div style={{ width: columnWidths.tags }} className="flex items-center justify-start shrink-0 overflow-hidden px-2.5 gap-1">
                {task.tags && task.tags.length > 0 ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 truncate" title={task.tags.join(', ')}>
                    {task.tags[0]}
                    {task.tags.length > 1 && ` +${task.tags.length - 1}`}
                  </span>
                ) : (
                  <span className="text-slate-500 text-[11px]">—</span>
                )}
              </div>
            )}
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
