import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../../context/ProjectContext';
import { ViewMode, Task, RaidItem, Stakeholder } from '../../types';
import {
  Search,
  X,
  Command,
  ArrowRight,
  CheckSquare,
  ShieldAlert,
  Users,
  LayoutDashboard,
  Award,
  Network,
  GanttChart,
  FolderKanban,
  MessagesSquare,
  CalendarDays,
  ShieldCheck,
  GitPullRequest,
  FileText,
  History,
  Building2,
  Plus,
  Bug,
  Sparkles,
  Settings,
  Database,
  Sun,
  Moon,
  Briefcase,
  Layers,
  Flag,
  Clock,
  DollarSign,
  UserCheck,
  Tag,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  FolderGit2,
  User,
  Key,
  Flame,
  HelpCircle,
  Hash
} from 'lucide-react';

export type CommandCategory = 'all' | 'tasks' | 'raid' | 'team' | 'changes' | 'board' | 'views' | 'actions' | 'projects';

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onSelectView: (view: ViewMode) => void;
  onOpenTaskModal: (task?: Task) => void;
  onOpenRaidModal: (item?: RaidItem) => void;
  onOpenStakeholderModal: (stakeholder?: Stakeholder) => void;
  onOpenInviteModal?: (email?: string) => void;
  onOpenAiReportModal: () => void;
  onOpenAiSettingsModal?: () => void;
  onOpenUserModal?: () => void;
  onOpenSupabaseModal?: () => void;
  currentView?: ViewMode;
}

interface PaletteItem {
  id: string;
  category: CommandCategory;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ReactNode;
  shortcut?: string;
  metadata?: string;
  onSelect: () => void;
}

/**
 * Text Match Highlighter
 */
const HighlightText: React.FC<{ text: string; highlight: string; className?: string }> = ({
  text,
  highlight,
  className = ''
}) => {
  if (!highlight || !highlight.trim() || !text) {
    return <span className={className}>{text}</span>;
  }
  const cleanHighlight = highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${cleanHighlight})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-indigo-500/35 text-indigo-200 font-semibold px-0.5 rounded text-inherit"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  onSelectView,
  onOpenTaskModal,
  onOpenRaidModal,
  onOpenStakeholderModal,
  onOpenInviteModal,
  onOpenAiReportModal,
  onOpenAiSettingsModal,
  onOpenUserModal,
  onOpenSupabaseModal,
  currentView
}) => {
  const {
    projectData,
    projectsList,
    switchProject,
    activeProjectId,
    currentUser,
    theme,
    toggleTheme,
    leaves
  } = useProject();

  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState<CommandCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === 'admin';
  const isPM = currentUser?.role === 'pm' || isAdmin;

  // Sync initial query and focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery || '');
      setActiveCategory('all');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
        if (initialQuery) {
          inputRef.current?.select();
        }
      }, 50);
    }
  }, [isOpen, initialQuery]);

  // Handle prefix parsing (e.g. "> " for actions, "@" for team, etc.)
  const effectiveFilter = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.startsWith('> ') || trimmed.startsWith('/') || trimmed === '>') {
      return { category: 'actions' as CommandCategory, text: trimmed.replace(/^(>\s*|\/)/, '') };
    }
    if (trimmed.startsWith('@')) {
      return { category: 'team' as CommandCategory, text: trimmed.slice(1).trim() };
    }
    if (trimmed.startsWith('#') || trimmed.startsWith('t:')) {
      return { category: 'tasks' as CommandCategory, text: trimmed.replace(/^(#|t:)/, '').trim() };
    }
    if (trimmed.startsWith('!') || trimmed.startsWith('r:')) {
      return { category: 'raid' as CommandCategory, text: trimmed.replace(/^(!|r:)/, '').trim() };
    }
    if (trimmed.startsWith('v:') || trimmed.startsWith('view:')) {
      return { category: 'views' as CommandCategory, text: trimmed.replace(/^(v:|view:)/, '').trim() };
    }
    if (trimmed.startsWith('cr:')) {
      return { category: 'changes' as CommandCategory, text: trimmed.replace(/^cr:/, '').trim() };
    }
    if (trimmed.startsWith('b:') || trimmed.startsWith('doc:')) {
      return { category: 'board' as CommandCategory, text: trimmed.replace(/^(b:|doc:)/, '').trim() };
    }
    if (trimmed.startsWith('p:') || trimmed.startsWith('proj:')) {
      return { category: 'projects' as CommandCategory, text: trimmed.replace(/^(p:|proj:)/, '').trim() };
    }
    return { category: activeCategory, text: trimmed };
  }, [query, activeCategory]);

  const searchText = effectiveFilter.text.toLowerCase();
  const currentCategory = effectiveFilter.category;

  // Build items list
  const allItems: PaletteItem[] = useMemo(() => {
    const items: PaletteItem[] = [];

    // --- QUICK ACTIONS ---
    items.push({
      id: 'action-new-task',
      category: 'actions',
      title: 'Create New Task',
      subtitle: 'Add a new work item with assignees, dates, estimated hours, and tags',
      icon: <Plus className="w-4 h-4 text-emerald-400" />,
      badge: 'CREATE',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      shortcut: 'N',
      metadata: 'new task create work item add issue story epic feature bug',
      onSelect: () => {
        onClose();
        onOpenTaskModal();
      }
    });

    items.push({
      id: 'action-new-bug',
      category: 'actions',
      title: 'Report New Defect / Bug',
      subtitle: 'File a defect or software issue with priority and owner assignment',
      icon: <Bug className="w-4 h-4 text-rose-400" />,
      badge: 'DEFECT',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      metadata: 'bug defect issue error fix remediation crash report',
      onSelect: () => {
        onClose();
        const newBug: Partial<Task> = {
          type: 'bug',
          title: '',
          priority: 'high',
          status: 'todo'
        };
        onOpenTaskModal(newBug as Task);
      }
    });

    items.push({
      id: 'action-new-raid',
      category: 'actions',
      title: 'Log RAID Item (Risk / Issue / Assumption)',
      subtitle: 'Record a new Risk, Assumption, Issue, or Dependency with mitigation strategy',
      icon: <ShieldAlert className="w-4 h-4 text-amber-400" />,
      badge: 'RAID',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      shortcut: 'R',
      metadata: 'risk issue assumption dependency mitigation contingency raid log',
      onSelect: () => {
        onClose();
        onOpenRaidModal();
      }
    });

    items.push({
      id: 'action-ai-report',
      category: 'actions',
      title: 'Generate AI Executive Status Brief',
      subtitle: 'Instant AI milestone progress, schedule health metrics, and risk digest',
      icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
      badge: 'AI INTELLIGENCE',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      metadata: 'ai report executive brief status summary digest health artificial intelligence',
      onSelect: () => {
        onClose();
        onOpenAiReportModal();
      }
    });

    if (isPM && onOpenInviteModal) {
      items.push({
        id: 'action-invite-member',
        category: 'actions',
        title: 'Invite Team Member via Email',
        subtitle: 'Send an email invite to collaborate on this project workspace',
        icon: <Users className="w-4 h-4 text-teal-400" />,
        badge: 'TEAM',
        badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
        metadata: 'invite team member email add stakeholder join',
        onSelect: () => {
          onClose();
          onOpenInviteModal();
        }
      });
    }

    if (onOpenAiSettingsModal) {
      items.push({
        id: 'action-ai-settings',
        category: 'actions',
        title: 'Configure AI Models & API Keys',
        subtitle: 'Manage Gemini, OpenAI, Anthropic, or custom AI provider keys',
        icon: <Key className="w-4 h-4 text-amber-400" />,
        badge: 'SETTINGS',
        badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
        metadata: 'ai settings api key gemini openai anthropic token model',
        onSelect: () => {
          onClose();
          onOpenAiSettingsModal();
        }
      });
    }

    if (onOpenUserModal) {
      items.push({
        id: 'action-switch-user',
        category: 'actions',
        title: `Switch Active User Role (Current: ${currentUser?.name})`,
        subtitle: 'Simulate or act as PM, Admin, Developer, QA, or Stakeholder',
        icon: <UserCheck className="w-4 h-4 text-indigo-400" />,
        badge: currentUser?.role?.toUpperCase() || 'USER',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        metadata: 'switch role user profile act as change person admin pm developer',
        onSelect: () => {
          onClose();
          onOpenUserModal();
        }
      });
    }

    items.push({
      id: 'action-toggle-theme',
      category: 'actions',
      title: `Switch to ${theme === 'dark' ? 'Day Mode (Light)' : 'Night Mode (Dark)'}`,
      subtitle: 'Toggle application color scheme between light and dark themes',
      icon: theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />,
      badge: 'THEME',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
      metadata: 'theme dark mode light mode toggle day night color scheme',
      onSelect: () => {
        onClose();
        toggleTheme();
      }
    });

    if (onOpenSupabaseModal) {
      items.push({
        id: 'action-cloud-sync',
        category: 'actions',
        title: 'Cloud Database & Real-Time Sync Settings',
        subtitle: 'Configure Supabase cloud persistence and multi-device replication',
        icon: <Database className="w-4 h-4 text-emerald-400" />,
        badge: 'DATABASE',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        metadata: 'supabase cloud database sync postgres backend persistence',
        onSelect: () => {
          onClose();
          onOpenSupabaseModal();
        }
      });
    }

    // --- MULTI-PROJECT PORTFOLIO SWITCHER ---
    if (projectsList && projectsList.length > 0) {
      projectsList.forEach(proj => {
        const isCurrent = proj.id === activeProjectId || proj.id === projectData.id;
        items.push({
          id: `proj-${proj.id}`,
          category: 'projects',
          title: `Project: ${proj.projectName}`,
          subtitle: `${proj.projectCode} • ${proj.description || 'Project workspace in portfolio'}${isCurrent ? ' • [ACTIVE]' : ''}`,
          icon: <Briefcase className={`w-4 h-4 ${isCurrent ? 'text-emerald-400' : 'text-indigo-400'}`} />,
          badge: isCurrent ? 'ACTIVE' : proj.projectCode,
          badgeColor: isCurrent ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-indigo-300 border-slate-700',
          metadata: `project switch ${proj.projectName} ${proj.projectCode} ${proj.description || ''} portfolio workspace`,
          onSelect: () => {
            onClose();
            switchProject(proj.id);
          }
        });
      });
    }

    // --- NAVIGATION VIEWS ---
    if (isAdmin) {
      items.push({
        id: 'view-admin-portfolio',
        category: 'views',
        title: 'Admin Portfolio & Governance Center',
        subtitle: 'Cross-project KPI rollups, resource capacity, baseline health, and multi-project audits',
        icon: <Layers className="w-4 h-4 text-amber-400" />,
        badge: 'ADMIN ONLY',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        shortcut: 'G A',
        metadata: 'admin portfolio governance kpi capacity baseline rollup enterprise',
        onSelect: () => {
          onClose();
          onSelectView('admin_portfolio');
        }
      });
    }

    if (isPM) {
      items.push({
        id: 'view-dashboard',
        category: 'views',
        title: 'Executive Project Dashboard',
        subtitle: 'High-level project health, budget utilization, milestones progress, and risk breakdown',
        icon: <LayoutDashboard className="w-4 h-4 text-indigo-400" />,
        shortcut: 'G D',
        metadata: 'dashboard executive overview kpi health budget milestones progress',
        onSelect: () => {
          onClose();
          onSelectView('dashboard');
        }
      });
    }

    items.push({
      id: 'view-member-dashboard',
      category: 'views',
      title: 'Personal My Work & Tasks Dashboard',
      subtitle: 'Assigned tasks, pending approvals, personal hours logged, and active blockers',
      icon: <Award className="w-4 h-4 text-emerald-400" />,
      shortcut: 'G M',
      metadata: 'my work member dashboard assigned tasks hours logged personal todo',
      onSelect: () => {
        onClose();
        onSelectView('member_dashboard');
      }
    });

    items.push({
      id: 'view-wbs',
      category: 'views',
      title: 'WBS Hierarchy Table (Work Breakdown Structure)',
      subtitle: 'Milestones, epics, features, user stories, tasks, inline editing, and drag & drop reorder',
      icon: <CheckSquare className="w-4 h-4 text-indigo-400" />,
      badge: `${projectData?.tasks?.length || 0} Tasks`,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      shortcut: 'G W',
      metadata: 'wbs work breakdown structure hierarchy table tasks milestones epics tree',
      onSelect: () => {
        onClose();
        onSelectView('wbs');
      }
    });

    items.push({
      id: 'view-gantt',
      category: 'views',
      title: 'Interactive Gantt Chart & Critical Path Timeline',
      subtitle: 'Visual schedules, task dependencies, critical path, zoom scales, and baseline delta',
      icon: <GanttChart className="w-4 h-4 text-indigo-400" />,
      shortcut: 'G G',
      metadata: 'gantt chart timeline schedule critical path dependencies milestone dates',
      onSelect: () => {
        onClose();
        onSelectView('gantt');
      }
    });

    items.push({
      id: 'view-network',
      category: 'views',
      title: 'PERT Network Diagram (CPM Graph)',
      subtitle: 'Task dependency graphs, topological ordering, float calculations, and CPM slack analysis',
      icon: <Network className="w-4 h-4 text-indigo-400" />,
      shortcut: 'G N',
      metadata: 'pert network diagram graph cpm critical path method slack float dependency',
      onSelect: () => {
        onClose();
        onSelectView('network');
      }
    });

    items.push({
      id: 'view-kanban',
      category: 'views',
      title: 'Agile Kanban & Sprint Board',
      subtitle: 'Drag-and-drop workflow columns (Todo, In Progress, Review, Blocked, Done)',
      icon: <FolderKanban className="w-4 h-4 text-blue-400" />,
      shortcut: 'G K',
      metadata: 'kanban agile board sprint workflow columns todo in progress done',
      onSelect: () => {
        onClose();
        onSelectView('kanban');
      }
    });

    if (isPM) {
      items.push({
        id: 'view-stakeholders',
        category: 'views',
        title: 'Stakeholders & RACI Matrix',
        subtitle: 'Stakeholder register, power/interest grid, RACI assignments, and rates',
        icon: <Users className="w-4 h-4 text-teal-400" />,
        badge: `${projectData?.stakeholders?.length || 0} Members`,
        badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
        shortcut: 'G S',
        metadata: 'stakeholders team raci matrix power interest grid rates register members',
        onSelect: () => {
          onClose();
          onSelectView('stakeholders');
        }
      });

      items.push({
        id: 'view-workload',
        category: 'views',
        title: 'Resource Allocation & Workload Heatmap',
        subtitle: 'Capacity vs. demand analysis, overallocation alerts, and billable hour utilization',
        icon: <Building2 className="w-4 h-4 text-teal-400" />,
        shortcut: 'G L',
        metadata: 'workload resource allocation capacity demand utilization heatmap hours',
        onSelect: () => {
          onClose();
          onSelectView('workload');
        }
      });

      items.push({
        id: 'view-board',
        category: 'views',
        title: 'Project Board, Wiki & Document Attachments',
        subtitle: 'Team announcements, pinned documents, uploaded attachments, and quick references',
        icon: <FolderKanban className="w-4 h-4 text-emerald-400" />,
        badge: `${(projectData?.boardItems || []).length} Items`,
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        shortcut: 'G B',
        metadata: 'project board wiki documents notes attachments files announcements',
        onSelect: () => {
          onClose();
          onSelectView('project_board');
        }
      });
    }

    items.push({
      id: 'view-chat',
      category: 'views',
      title: 'Team Discussions & Project Chat Threads',
      subtitle: 'Real-time message threads, task referencing, and team announcements',
      icon: <MessagesSquare className="w-4 h-4 text-indigo-400" />,
      shortcut: 'G C',
      metadata: 'chat discussions messages comments threads communication',
      onSelect: () => {
        onClose();
        onSelectView('chat');
      }
    });

    items.push({
      id: 'view-raid',
      category: 'views',
      title: 'RAID Management (Risks, Issues, Assumptions)',
      subtitle: '5x5 risk heatmaps, mitigation plans, and owner assignments',
      icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
      badge: `${projectData?.raidItems?.length || 0} Items`,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      shortcut: 'G R',
      metadata: 'raid risks issues assumptions dependencies heatmap mitigation contingency',
      onSelect: () => {
        onClose();
        onSelectView('raid');
      }
    });

    items.push({
      id: 'view-change',
      category: 'views',
      title: 'Change Control Management (CCB)',
      subtitle: 'Change requests, scope/schedule/budget impact deltas & approval workflows',
      icon: <GitPullRequest className="w-4 h-4 text-amber-400" />,
      badge: `${(projectData?.changeRequests || []).length} CRs`,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      metadata: 'change control ccb cr change requests scope schedule budget delta approval',
      onSelect: () => {
        onClose();
        onSelectView('change');
      }
    });

    if (isPM) {
      items.push({
        id: 'view-governance',
        category: 'views',
        title: 'Governance & PM Readiness Checklist',
        subtitle: 'PMI governance checklist, DoR/DoD compliance, and stakeholder sign-offs',
        icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
        metadata: 'governance pmi checklist dor dod compliance signoff stage gate readiness',
        onSelect: () => {
          onClose();
          onSelectView('governance');
        }
      });
    }

    items.push({
      id: 'view-reports',
      category: 'views',
      title: 'AI Status Reports & Executive Deck',
      subtitle: 'Automated executive progress reports, RAID digests, and PDF export',
      icon: <FileText className="w-4 h-4 text-indigo-400" />,
      metadata: 'reports ai status executive deck pdf export digest summary',
      onSelect: () => {
        onClose();
        onSelectView('reports');
      }
    });

    items.push({
      id: 'view-audit',
      category: 'views',
      title: 'Audit Trail & Change History',
      subtitle: 'Immutable timeline of user actions, baseline revisions, and field changes',
      icon: <History className="w-4 h-4 text-slate-400" />,
      metadata: 'audit trail history log timeline activity revisions baseline changes',
      onSelect: () => {
        onClose();
        onSelectView('audit');
      }
    });

    // --- WBS DATA ITEMS (Tasks, Milestones, Epics, Features, Subtasks) ---
    if (projectData?.tasks) {
      projectData.tasks.forEach(task => {
        const isBug = task.type === 'bug';
        const assigneeNames = (task.assigneeIds || [])
          .map(id => projectData.stakeholders.find(s => s.id === id)?.name)
          .filter(Boolean)
          .join(', ');

        const parentFeature = projectData.features?.find(f => f.id === task.featureId);
        const parentEpic = projectData.epics?.find(e => e.id === task.epicId);
        const parentMilestone = projectData.milestones?.find(m => m.id === task.milestoneId);
        const parentStory = projectData.userStories?.find(s => s.id === task.userStoryId || s.id === task.storyId);

        const hierarchyParts = [
          parentMilestone?.title,
          parentEpic?.title,
          parentFeature?.title,
          parentStory?.title
        ].filter(Boolean);

        const hierarchyBreadcrumb = hierarchyParts.length > 0 ? hierarchyParts.join(' > ') : undefined;

        items.push({
          id: `task-${task.id}`,
          category: 'tasks',
          title: task.title,
          subtitle: task.description || hierarchyBreadcrumb || `${task.estimatedHours || 0}h est • ${task.status.replace('_', ' ')}`,
          icon: isBug ? <Bug className="w-4 h-4 text-rose-400" /> : <CheckSquare className="w-4 h-4 text-indigo-400" />,
          badge: `${task.priority.toUpperCase()} • ${task.status.replace('_', ' ').toUpperCase()}`,
          badgeColor:
            task.priority === 'urgent'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              : task.priority === 'high'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
          metadata: `${task.id} ${assigneeNames} ${hierarchyBreadcrumb || ''} ${task.type || 'task'} ${task.priority} ${task.status} ${(task.tags || []).join(' ')} ${task.description || ''}`,
          onSelect: () => {
            onClose();
            onOpenTaskModal(task);
            if (!isAdmin) {
              onSelectView('wbs');
            }
          }
        });
      });
    }

    // Milestones
    if (projectData?.milestones) {
      projectData.milestones.forEach((m, idx) => {
        items.push({
          id: `milestone-${m.id}`,
          category: 'tasks',
          title: `Milestone: ${m.title}`,
          subtitle: m.description || `Target Date: ${m.dueDate} • Status: ${m.status}`,
          icon: <Flag className="w-4 h-4 text-amber-400" />,
          badge: `M${idx + 1} • ${m.status.toUpperCase()}`,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          metadata: `milestone ${m.id} ${m.title} ${m.description || ''} ${m.dueDate} ${m.status}`,
          onSelect: () => {
            onClose();
            if (!isAdmin) {
              onSelectView('wbs');
            }
          }
        });
      });
    }

    // Epics
    if (projectData?.epics) {
      projectData.epics.forEach((e) => {
        items.push({
          id: `epic-${e.id}`,
          category: 'tasks',
          title: `Epic: ${e.title}`,
          subtitle: e.description || `Status: ${e.status}`,
          icon: <Layers className="w-4 h-4 text-purple-400" />,
          badge: `EPIC • ${e.status.toUpperCase()}`,
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          metadata: `epic ${e.id} ${e.title} ${e.description || ''} ${e.status}`,
          onSelect: () => {
            onClose();
            if (!isAdmin) {
              onSelectView('wbs');
            }
          }
        });
      });
    }

    // Features
    if (projectData?.features) {
      projectData.features.forEach((f) => {
        items.push({
          id: `feature-${f.id}`,
          category: 'tasks',
          title: `Feature: ${f.title}`,
          subtitle: f.description || `Target: ${f.targetReleaseDate || 'TBD'} • ${f.status}`,
          icon: <FolderGit2 className="w-4 h-4 text-blue-400" />,
          badge: `FEATURE • ${f.status.toUpperCase()}`,
          badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          metadata: `feature ${f.id} ${f.title} ${f.description || ''} ${f.status}`,
          onSelect: () => {
            onClose();
            if (!isAdmin) {
              onSelectView('wbs');
            }
          }
        });
      });
    }

    // Subtasks
    if (projectData?.subtasks) {
      projectData.subtasks.forEach(st => {
        const parentTask = projectData.tasks?.find(t => t.id === st.taskId);
        items.push({
          id: `subtask-${st.id}`,
          category: 'tasks',
          title: `Subtask: ${st.title}`,
          subtitle: `Parent Task: ${parentTask?.title || 'Unknown'} • ${st.completed ? 'Completed' : 'Pending'} (${st.estimatedHours}h)`,
          icon: <CheckCircle2 className={`w-4 h-4 ${st.completed ? 'text-emerald-400' : 'text-slate-400'}`} />,
          badge: st.completed ? 'COMPLETED' : 'SUBTASK',
          badgeColor: st.completed ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-300 border-slate-700',
          metadata: `subtask ${st.id} ${st.title} ${parentTask?.title || ''} ${st.completed ? 'done completed' : 'pending'}`,
          onSelect: () => {
            onClose();
            if (parentTask) {
              onOpenTaskModal(parentTask);
            }
            if (!isAdmin) {
              onSelectView('wbs');
            }
          }
        });
      });
    }

    // --- RAID ITEMS ---
    if (projectData?.raidItems) {
      projectData.raidItems.forEach(item => {
        const owner = projectData.stakeholders.find(s => s.id === item.ownerId);
        items.push({
          id: `raid-${item.id}`,
          category: 'raid',
          title: item.title,
          subtitle: item.description || `Mitigation: ${item.mitigationStrategy || 'None defined'}`,
          icon: (
            <ShieldAlert
              className={`w-4 h-4 ${
                item.type === 'risk'
                  ? 'text-rose-400'
                  : item.type === 'issue'
                  ? 'text-amber-400'
                  : item.type === 'assumption'
                  ? 'text-purple-400'
                  : 'text-blue-400'
              }`}
            />
          ),
          badge: `${item.type.toUpperCase()} • ${item.status.toUpperCase()}`,
          badgeColor:
            item.type === 'risk'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              : item.type === 'issue'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : item.type === 'assumption'
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
              : 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          metadata: `raid ${item.id} ${item.title} ${item.description || ''} ${owner?.name || ''} ${item.type} ${item.status} ${item.mitigationStrategy || ''}`,
          onSelect: () => {
            onClose();
            onOpenRaidModal(item);
            onSelectView('raid');
          }
        });
      });
    }

    // --- STAKEHOLDERS & TEAM ---
    if (projectData?.stakeholders) {
      projectData.stakeholders.forEach(sh => {
        items.push({
          id: `stakeholder-${sh.id}`,
          category: 'team',
          title: sh.name,
          subtitle: `${sh.role} • ${sh.email || 'No email'} • $${sh.hourlyRate || 0}/h • ${(sh.skills || []).slice(0, 3).join(', ')}`,
          icon: sh.avatar ? (
            <img src={sh.avatar} alt={sh.name} className="w-4 h-4 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
          ) : (
            <Users className="w-4 h-4 text-teal-400" />
          ),
          badge: sh.category?.toUpperCase() || 'MEMBER',
          badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
          metadata: `team stakeholder person ${sh.id} ${sh.name} ${sh.email} ${sh.role} ${sh.skills?.join(' ')} ${sh.status} ${sh.department || ''}`,
          onSelect: () => {
            onClose();
            onOpenStakeholderModal(sh);
            if (isPM) {
              onSelectView('stakeholders');
            }
          }
        });
      });
    }

    // --- CHANGE REQUESTS ---
    if (projectData?.changeRequests) {
      projectData.changeRequests.forEach(cr => {
        items.push({
          id: `cr-${cr.id}`,
          category: 'changes',
          title: `${cr.crNumber}: ${cr.title}`,
          subtitle: cr.description || `Requested by ${cr.requestor} • Cost Δ: $${cr.costImpactDelta} • Schedule Δ: ${cr.scheduleImpactDays}d`,
          icon: <GitPullRequest className="w-4 h-4 text-amber-400" />,
          badge: `${cr.priority.toUpperCase()} • ${cr.status.replace('_', ' ').toUpperCase()}`,
          badgeColor:
            cr.status === 'approved'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : cr.status === 'rejected'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          metadata: `change request ccb ${cr.id} ${cr.crNumber} ${cr.title} ${cr.description || ''} ${cr.requestor} ${cr.status} ${cr.priority}`,
          onSelect: () => {
            onClose();
            onSelectView('change');
          }
        });
      });
    }

    // --- BOARD ITEMS & DOCS ---
    if (projectData?.boardItems) {
      projectData.boardItems.forEach(bi => {
        items.push({
          id: `board-${bi.id}`,
          category: 'board',
          title: bi.title,
          subtitle: `By ${bi.createdByName} • ${(bi.tags || []).join(', ')} • ${bi.type.toUpperCase()}`,
          icon: <FolderKanban className="w-4 h-4 text-emerald-400" />,
          badge: bi.type.toUpperCase(),
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          metadata: `board wiki doc document attachment ${bi.id} ${bi.title} ${bi.content} ${bi.fileName || ''} ${bi.tags?.join(' ')}`,
          onSelect: () => {
            onClose();
            if (isPM) {
              onSelectView('project_board');
            }
          }
        });
      });
    }

    return items;
  }, [
    projectData,
    projectsList,
    activeProjectId,
    currentUser,
    theme,
    leaves,
    isAdmin,
    isPM,
    onClose,
    onSelectView,
    onOpenTaskModal,
    onOpenRaidModal,
    onOpenStakeholderModal,
    onOpenInviteModal,
    onOpenAiReportModal,
    onOpenAiSettingsModal,
    onOpenUserModal,
    onOpenSupabaseModal,
    toggleTheme,
    switchProject
  ]);

  // Filter items based on active category and tokenized search terms
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      // Category filter
      if (currentCategory !== 'all' && item.category !== currentCategory) {
        return false;
      }

      // Query filter
      if (!searchText) return true;

      // Multi-term token matching (e.g. "urgent frontend" requires both tokens)
      const tokens = searchText.split(/\s+/).filter(Boolean);
      const targetStr = `${item.title} ${item.subtitle || ''} ${item.metadata || ''} ${item.badge || ''}`.toLowerCase();

      return tokens.every(token => targetStr.includes(token));
    });
  }, [allItems, currentCategory, searchText]);

  // Ensure selectedIndex is within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length, currentCategory, searchText]);

  // Keyboard navigation inside list
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (filteredItems.length === 0 ? 0 : (prev + 1) % filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (filteredItems.length === 0 ? 0 : (prev - 1 + filteredItems.length) % filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems.length > 0 && filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].onSelect();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const categories: CommandCategory[] = [
          'all',
          'tasks',
          'raid',
          'team',
          'changes',
          'board',
          'views',
          'actions',
          'projects'
        ];
        const nextIdx = (categories.indexOf(activeCategory) + (e.shiftKey ? -1 : 1) + categories.length) % categories.length;
        setActiveCategory(categories[nextIdx]);
      }
    },
    [filteredItems, selectedIndex, activeCategory, onClose]
  );

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Calculate counts for categories
  const categoryCounts = useMemo(() => {
    const counts: Record<CommandCategory, number> = {
      all: allItems.length,
      tasks: 0,
      raid: 0,
      team: 0,
      changes: 0,
      board: 0,
      views: 0,
      actions: 0,
      projects: 0
    };
    allItems.forEach(i => {
      if (counts[i.category] !== undefined) {
        counts[i.category]++;
      }
    });
    return counts;
  }, [allItems]);

  // Prefix helpers to click
  const prefixHelpers = [
    { label: '# Tasks', prefix: '# ', count: categoryCounts.tasks, color: 'text-indigo-400 hover:bg-indigo-500/10' },
    { label: '! RAID', prefix: '! ', count: categoryCounts.raid, color: 'text-rose-400 hover:bg-rose-500/10' },
    { label: '@ Team', prefix: '@', count: categoryCounts.team, color: 'text-teal-400 hover:bg-teal-500/10' },
    { label: '> Actions', prefix: '> ', count: categoryCounts.actions, color: 'text-emerald-400 hover:bg-emerald-500/10' },
    { label: 'cr: Changes', prefix: 'cr: ', count: categoryCounts.changes, color: 'text-amber-400 hover:bg-amber-500/10' },
    { label: 'p: Projects', prefix: 'p: ', count: categoryCounts.projects, color: 'text-cyan-400 hover:bg-cyan-500/10' }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[max(1.5rem,calc(1rem+env(safe-area-inset-top,0px)))] sm:pt-16 px-3 sm:px-4 pb-6">
        {/* Backdrop Overlay with Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Command Palette Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          className="relative w-full max-w-2xl bg-slate-900/98 dark:bg-slate-900/98 border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 text-slate-100 max-h-[85vh] ring-1 ring-white/10"
          onKeyDown={handleKeyDown}
        >
          {/* Header & Search Input Bar */}
          <div className="relative flex items-center px-4 py-3.5 border-b border-slate-800/80 bg-slate-950/50">
            <Search className="w-5 h-5 text-indigo-400 shrink-0 mr-3 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search tasks, RAID, team, change requests, or type '>' for actions..."
              className="w-full bg-transparent text-base text-slate-100 placeholder-slate-400 outline-none border-none pr-8"
              autoComplete="off"
              spellCheck="false"
            />
            {query ? (
              <button
                onClick={() => {
                  setQuery('');
                  setActiveCategory('all');
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Clear query"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center gap-1 shrink-0 text-[11px] font-mono text-slate-400 bg-slate-800/80 hover:bg-slate-700 hover:text-white px-2 py-0.5 rounded border border-slate-700/60 transition-colors"
                title="Close Command Palette"
              >
                <span>ESC</span>
              </button>
            )}
          </div>

          {/* Quick Syntax / Category Helper Bar */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-800/60 bg-slate-950/30 overflow-x-auto custom-scrollbar text-xs">
            <span className="text-[10px] text-slate-400 font-medium mr-1 uppercase tracking-wider shrink-0 hidden sm:inline">
              Filter:
            </span>
            {(
              [
                { id: 'all', label: 'All', icon: <Command className="w-3 h-3" /> },
                { id: 'tasks', label: 'WBS & Tasks', icon: <CheckSquare className="w-3 h-3" /> },
                { id: 'raid', label: 'RAID', icon: <ShieldAlert className="w-3 h-3" /> },
                { id: 'team', label: 'Team', icon: <Users className="w-3 h-3" /> },
                { id: 'changes', label: 'Changes', icon: <GitPullRequest className="w-3 h-3" /> },
                { id: 'board', label: 'Board & Docs', icon: <FolderKanban className="w-3 h-3" /> },
                { id: 'views', label: 'Views', icon: <LayoutDashboard className="w-3 h-3" /> },
                { id: 'actions', label: 'Actions', icon: <Plus className="w-3 h-3" /> },
                { id: 'projects', label: 'Projects', icon: <Briefcase className="w-3 h-3" /> }
              ] as const
            ).map(tab => {
              const count = categoryCounts[tab.id];
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveCategory(tab.id);
                    inputRef.current?.focus();
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Results / Action List */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto max-h-[52vh] p-2 space-y-1 custom-scrollbar focus:outline-none"
            tabIndex={-1}
          >
            {filteredItems.length === 0 ? (
              <div className="py-10 px-4 text-center text-slate-400 space-y-3">
                <AlertCircle className="w-8 h-8 text-slate-500 mx-auto opacity-60" />
                <div>
                  <p className="text-sm font-semibold text-slate-300">No results found for "{query}"</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    Try searching for a different keyword, risk title, assignee name, or click a prefix filter below.
                  </p>
                </div>

                {/* Prefix helper shortcut pills */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 max-w-md mx-auto">
                  {prefixHelpers.map(h => (
                    <button
                      key={h.label}
                      onClick={() => {
                        setQuery(h.prefix);
                        inputRef.current?.focus();
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700/60 transition-colors font-mono"
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={item.id}
                    data-index={index}
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border text-xs sm:text-sm ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500/40 text-white shadow-sm'
                        : 'border-transparent hover:bg-slate-800/50 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                        }`}
                      >
                        {item.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-100 truncate group-hover:text-white">
                            <HighlightText text={item.title} highlight={searchText} />
                          </span>
                          {item.badge && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wider shrink-0 ${
                                item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.subtitle && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5 group-hover:text-slate-300">
                            <HighlightText text={item.subtitle} highlight={searchText} />
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.shortcut && (
                        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded font-mono border border-slate-800">
                          {item.shortcut}
                        </kbd>
                      )}
                      <ArrowRight
                        className={`w-4 h-4 transition-all ${
                          isSelected ? 'text-indigo-400 opacity-100 translate-x-0.5' : 'text-slate-600 opacity-0 group-hover:opacity-100'
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Command Palette Keyboard Footer */}
          <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-950/80 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">↵</kbd>
                <span>Select</span>
              </span>
              <span className="hidden sm:flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">Tab</kbd>
                <span>Cycle Category</span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="hidden md:inline">Prefixes: <code className="text-indigo-300">#</code> tasks, <code className="text-indigo-300">!</code> risks, <code className="text-indigo-300">@</code> team, <code className="text-indigo-300">&gt;</code> actions, <code className="text-indigo-300">p:</code> projects</span>
              <span className="font-mono text-indigo-400 font-semibold">{filteredItems.length} items</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
