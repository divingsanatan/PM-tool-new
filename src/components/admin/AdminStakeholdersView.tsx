import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  Stakeholder,
  UserProfile,
  MemberLeave,
  StakeholderCategory,
  ProjectMeta,
  Task,
  AppRole
} from '../../types';
import {
  calculate4WeekCapacityHeatmap,
  Member4WeekHeatmap,
  MemberWeeklyLoad,
  WeekSlot,
  RebalancingSuggestion
} from '../../utils/workloadHeatmapUtils';
import { calculateCrossProjectPMPerformance } from '../../utils/portfolioAndLeaveUtils';
import { isUserAdmin, isUserPM, canManageRolesAndTeam, APP_ROLES, normalizeToAppRole, getAppRoleBadge } from '../../utils/roleUtils';
import { IndividualReportCardModal } from '../modals/IndividualReportCardModal';
import { StakeholderModal } from '../modals/StakeholderModal';
import { InviteMemberModal } from '../modals/InviteMemberModal';
import { LeaveRequestModal } from './LeaveRequestModal';
import { PMAssignProjectModal } from '../dashboard/PMAssignProjectModal';
import {
  Users,
  Briefcase,
  Code,
  Laptop,
  Shield,
  ShieldCheck,
  Search,
  Filter,
  Plus,
  Sparkles,
  Flame,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  UserCheck,
  UserPlus,
  Mail,
  Award,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  Sliders,
  Layers,
  X,
  Check,
  Palmtree,
  Zap,
  LayoutGrid,
  List,
  Eye,
  Building2,
  Globe,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Copy,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Maximize2,
  SlidersHorizontal,
  Table as TableIcon
} from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

interface AdminStakeholdersViewProps {
  onOpenStakeholderModal?: (stakeholder?: Stakeholder) => void;
  onOpenInviteModal?: (dataOrEmail?: string | { email?: string; name?: string; role?: string; category?: StakeholderCategory; stakeholderId?: string }) => void;
  onOpenTaskModal?: (taskId: string) => void;
  onSwitchToProjectView?: (projectId: string) => void;
}

export const AdminStakeholdersView: React.FC<AdminStakeholdersViewProps> = ({
  onOpenStakeholderModal,
  onOpenInviteModal,
  onOpenTaskModal,
  onSwitchToProjectView
}) => {
  const {
    allProjectsMap,
    projectsList,
    activeProjectId,
    switchProject,
    allUsers,
    currentUser,
    leaves,
    saveStakeholder,
    deleteStakeholder,
    saveTask,
    assignProjectManager,
    addActivityLog
  } = useProject();

  const isAdmin = isUserAdmin(currentUser);

  // Sub-tabs: 'directory' | 'heatmap' | 'skills_bench'
  const [activeTab, setActiveTab] = useState<'directory' | 'heatmap' | 'skills_bench'>('directory');

  // Layout mode for directory: default to 'table' (Tabular View)
  const [layoutMode, setLayoutMode] = useState<'grid' | 'table'>('table');

  // Table Sorting State
  const [sortField, setSortField] = useState<'name' | 'role' | 'utilization' | 'projects' | 'skills' | 'rate' | 'status'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Table Expanded Sub-rows (Inline 360 Details)
  const [expandedMemberIds, setExpandedMemberIds] = useState<Set<string>>(new Set());

  // Table Multi-Row Selection for Batch Operations
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());

  // Pagination & Density
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [tableDensity, setTableDensity] = useState<'comfortable' | 'compact'>('comfortable');

  // Copy Email Feedback
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);

  // Filter States for Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [roleCategoryFilter, setRoleCategoryFilter] = useState<'all' | 'pm' | 'developer' | 'tester' | 'uiux' | 'admin' | 'external' | 'dummy'>('all');
  const [allocationFilter, setAllocationFilter] = useState<'all' | 'bench' | 'active' | 'partially' | 'overallocated' | 'leave'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [selectedTechSkillFilter, setSelectedTechSkillFilter] = useState<string>('all');

  // Smart Skill Search & Combobox State (Scales to hundreds of competencies)
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [isSkillDropdownOpen, setIsSkillDropdownOpen] = useState(false);
  const [skillSortOrder, setSkillSortOrder] = useState<'count' | 'alpha'>('count');
  const skillDropdownRef = useRef<HTMLDivElement>(null);

  // Close skill dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (skillDropdownRef.current && !skillDropdownRef.current.contains(event.target as Node)) {
        setIsSkillDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsSkillDropdownOpen(false);
      }
    }
    if (isSkillDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isSkillDropdownOpen]);

  // Quick Inline Add Modal & State
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [quickAddTargetProjectId, setQuickAddTargetProjectId] = useState<string>(activeProjectId || projectsList[0]?.id || 'proj-1');
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddEmail, setQuickAddEmail] = useState('');
  const [quickAddRole, setQuickAddRole] = useState('Project Manager');
  const [quickAddCategory, setQuickAddCategory] = useState<StakeholderCategory>('internal');
  const [quickAddRate, setQuickAddRate] = useState<number>(110);
  const [quickAddSkills, setQuickAddSkills] = useState('Agile, Leadership, Scrum');
  const [quickAddIsDummy, setQuickAddIsDummy] = useState(false);
  const [quickAddSendInvite, setQuickAddSendInvite] = useState(true);

  // Modals
  const [selectedStakeholderForReportCard, setSelectedStakeholderForReportCard] = useState<Stakeholder | null>(null);
  const [stakeholderToEdit, setStakeholderToEdit] = useState<Stakeholder | null>(null);
  const [isStakeholderModalOpen, setIsStakeholderModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteModalData, setInviteModalData] = useState<{ email?: string; name?: string; role?: string; category?: StakeholderCategory; stakeholderId?: string }>({});
  const [isPMAssignModalOpen, setIsPMAssignModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedUserForLeave, setSelectedUserForLeave] = useState<string | undefined>(undefined);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    triggerHaptic('success');
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Heatmap Controls State
  const [heatmapAnchorDate, setHeatmapAnchorDate] = useState<Date>(() => new Date());
  const [heatmapDisplayMode, setHeatmapDisplayMode] = useState<'percent' | 'hours' | 'variance'>('percent');
  const [heatmapRoleFilter, setHeatmapRoleFilter] = useState<string>('all');
  const [heatmapSearchQuery, setHeatmapSearchQuery] = useState<string>('');
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<{
    member: Member4WeekHeatmap;
    weekLoad: MemberWeeklyLoad;
  } | null>(null);
  const [rebalancingSuccessId, setRebalancingSuccessId] = useState<string | null>(null);

  // 1. Build Unified Cross-Project Stakeholder Matrix
  const projectsArray = useMemo(() => Object.values(allProjectsMap || {}), [allProjectsMap]);

  const allEnterpriseStakeholders = useMemo(() => {
    const map = new Map<string, {
      stakeholder: Stakeholder;
      userProfile?: UserProfile;
      assignedProjects: { projectId: string; projectName: string; projectCode: string; roleInProject: string; isPM: boolean; hours: number }[];
      totalAssignedHours: number;
      weeklyCapacity: number;
      availableHours: number;
      utilizationPercent: number;
      allocationStatus: 'bench' | 'partially_allocated' | 'fully_allocated' | 'overallocated';
      isPM: boolean;
      isAdmin: boolean;
      isDeveloper: boolean;
      isQaOrDesign: boolean;
      isDummy: boolean;
      skills: string[];
      completedTasks: number;
      totalTasks: number;
      currentLeave: MemberLeave | null;
    }>();

    // Seed from all registered organizational users
    allUsers.forEach(user => {
      const emailKey = (user.email || user.id).toLowerCase();
      const weeklyCapacity = user.weeklyCapacityHours || 40;
      const isUserAdmin = user.role === 'admin';
      const isUserPm = user.role === 'pm' || (user.title || '').toLowerCase().includes('project manager') || (user.title || '').toLowerCase().includes('scrum master');

      map.set(emailKey, {
        stakeholder: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.title || (isUserAdmin ? 'Executive Admin' : (isUserPm ? 'Project Manager' : 'Team Member')),
          category: 'internal',
          avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`,
          hourlyRate: user.hourlyRate || (isUserAdmin ? 180 : (isUserPm ? 120 : 95)),
          weeklyCapacityHours: weeklyCapacity,
          skills: user.skills && user.skills.length > 0 ? user.skills : ['Agile'],
          status: 'active'
        },
        userProfile: user,
        assignedProjects: [],
        totalAssignedHours: 0,
        weeklyCapacity,
        availableHours: weeklyCapacity,
        utilizationPercent: 0,
        allocationStatus: 'bench',
        isPM: isUserPm,
        isAdmin: isUserAdmin,
        isDeveloper: false,
        isQaOrDesign: false,
        isDummy: false,
        skills: [...(user.skills || [])],
        completedTasks: 0,
        totalTasks: 0,
        currentLeave: null
      });
    });

    // Ingest all project stakeholders and assigned tasks across projects
    projectsArray.forEach(proj => {
      if (!proj) return;
      const projManagerId = proj.projectManagerId;
      const projManagerEmail = (proj.projectManagerEmail || '').toLowerCase();

      (proj.stakeholders || []).forEach(sh => {
        const emailKey = (sh.email || sh.id).toLowerCase();
        const isDummyMember = Boolean(sh.isPlaceholder || sh.status === 'placeholder' || (sh.email && sh.email.includes('@placeholder')));
        let entry = map.get(emailKey);

        if (!entry) {
          entry = {
            stakeholder: sh,
            userProfile: allUsers.find(u => u.email.toLowerCase() === emailKey || u.id === sh.id),
            assignedProjects: [],
            totalAssignedHours: 0,
            weeklyCapacity: sh.weeklyCapacityHours || 40,
            availableHours: sh.weeklyCapacityHours || 40,
            utilizationPercent: 0,
            allocationStatus: 'bench',
            isPM: false,
            isAdmin: false,
            isDeveloper: false,
            isQaOrDesign: false,
            isDummy: isDummyMember,
            skills: [...(sh.skills || [])],
            completedTasks: 0,
            totalTasks: 0,
            currentLeave: null
          };
          map.set(emailKey, entry);
        } else {
          // Merge skills
          if (sh.skills) {
            sh.skills.forEach(sk => {
              if (!entry!.skills.includes(sk)) {
                entry!.skills.push(sk);
              }
            });
          }
          if (isDummyMember) {
            entry.isDummy = true;
          }
        }

        // Check if PM on this project
        const pmIds = (proj.projectManagerIds || (proj.projectManagerId ? [proj.projectManagerId] : [])).map(id => id.toLowerCase());
        const pmEmails = (proj.projectManagerEmails || (proj.projectManagerEmail ? [proj.projectManagerEmail.toLowerCase()] : [])).map(e => e.toLowerCase());
        const isProjPM = pmIds.includes(sh.id.toLowerCase()) || (entry.userProfile ? pmIds.includes(entry.userProfile.id.toLowerCase()) : false) ||
          pmEmails.includes(emailKey);

        // Find active tasks for this member in this project
        const memberTasks = (proj.tasks || []).filter(t => {
          if (!t.assigneeIds || t.assigneeIds.length === 0) return false;
          return t.assigneeIds.includes(sh.id) || (entry!.userProfile && t.assigneeIds.includes(entry!.userProfile.id));
        });

        const completedTasksCount = memberTasks.filter(t => t.status === 'done').length;
        const activeTasks = memberTasks.filter(t => t.status !== 'done');
        const projHours = activeTasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);

        entry.totalAssignedHours += projHours;
        entry.completedTasks += completedTasksCount;
        entry.totalTasks += memberTasks.length;

        // Record project assignment
        const existsProj = entry.assignedProjects.some(p => p.projectId === proj.id);
        if (!existsProj) {
          entry.assignedProjects.push({
            projectId: proj.id,
            projectName: proj.projectName,
            projectCode: proj.projectCode,
            roleInProject: sh.role || 'Member',
            isPM: Boolean(isProjPM),
            hours: projHours
          });
        }
      });
    });

    // Finalize computed metrics
    const todayStr = new Date().toISOString().split('T')[0];
    const results = Array.from(map.values()).map(entry => {
      const rawRole = entry.stakeholder.role || entry.stakeholder.appRole || entry.userProfile?.appRole || entry.userProfile?.role || entry.userProfile?.title || '';
      const normRole: AppRole = normalizeToAppRole(rawRole);
      const isPM = normRole === 'Project Manager' || entry.isPM || entry.stakeholder.isDualPMDev || entry.userProfile?.isDualPMDev || entry.assignedProjects.some(p => p.isPM);
      const isAdmin = normRole === 'Admin' || entry.isAdmin || entry.userProfile?.role === 'admin';
      const isDeveloper = normRole === 'Developer (Team member)';
      const isTester = normRole === 'Tester (Team Member)';
      const isUiUx = normRole === 'UI/UX Dev (Team Member)';
      const isQaOrDesign = isTester || isUiUx;

      const weeklyCap = entry.weeklyCapacity > 0 ? entry.weeklyCapacity : 40;
      const utilPercent = Math.round((entry.totalAssignedHours / weeklyCap) * 100);
      const avail = Math.max(0, weeklyCap - entry.totalAssignedHours);

      let allocStatus: 'bench' | 'partially_allocated' | 'fully_allocated' | 'overallocated' = 'bench';
      if (entry.totalAssignedHours === 0) {
        allocStatus = 'bench';
      } else if (entry.totalAssignedHours > weeklyCap) {
        allocStatus = 'overallocated';
      } else if (entry.totalAssignedHours >= weeklyCap) {
        allocStatus = 'fully_allocated';
      } else {
        allocStatus = 'partially_allocated';
      }

      // Check current leave
      const activeLeave = (leaves || []).find(l => {
        if (l.status !== 'approved') return false;
        const matchUser = l.userId === entry.stakeholder.id || (entry.userProfile && l.userId === entry.userProfile.id) ||
          (l.userEmail && l.userEmail.toLowerCase() === entry.stakeholder.email.toLowerCase());
        if (!matchUser) return false;
        return todayStr >= l.startDate && todayStr <= l.endDate;
      }) || null;

      return {
        ...entry,
        normRole,
        isPM,
        isAdmin,
        isDeveloper,
        isTester,
        isUiUx,
        isQaOrDesign,
        availableHours: avail,
        utilizationPercent: utilPercent,
        allocationStatus: allocStatus,
        currentLeave: activeLeave
      };
    });

    return results;
  }, [allUsers, projectsArray, leaves]);

  // Cross-project PM performance for assignment and modal views
  const pmPerformanceList = useMemo(() => {
    return calculateCrossProjectPMPerformance(projectsArray, allUsers, leaves);
  }, [projectsArray, allUsers, leaves]);

  // Tech skills catalog with counts
  const techSkillsCatalog = useMemo(() => {
    const counts: Record<string, number> = {};
    allEnterpriseStakeholders.forEach(item => {
      item.skills.forEach(skill => {
        const clean = skill.trim();
        if (clean) {
          counts[clean] = (counts[clean] || 0) + 1;
        }
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allEnterpriseStakeholders]);

  // Top 5 popular skills for quick access chips
  const topQuickSkills = useMemo(() => {
    return techSkillsCatalog.slice(0, 5);
  }, [techSkillsCatalog]);

  // Filtered & sorted skills for the smart search dropdown
  const dropdownFilteredSkills = useMemo(() => {
    const q = skillSearchQuery.toLowerCase().trim();
    let list = techSkillsCatalog;
    if (q) {
      list = list.filter(item => item.name.toLowerCase().includes(q));
    }
    if (skillSortOrder === 'alpha') {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [techSkillsCatalog, skillSearchQuery, skillSortOrder]);

  // Filtered Stakeholders
  const filteredStakeholders = useMemo(() => {
    return allEnterpriseStakeholders.filter(item => {
      const sh = item.stakeholder;
      const user = item.userProfile;
      const q = searchQuery.toLowerCase().trim();

      // Search Query
      if (q) {
        const matchName = sh.name.toLowerCase().includes(q);
        const matchEmail = sh.email.toLowerCase().includes(q);
        const matchRole = sh.role.toLowerCase().includes(q);
        const matchSkills = item.skills.some(s => s.toLowerCase().includes(q));
        const matchProjects = item.assignedProjects.some(p => p.projectName.toLowerCase().includes(q) || p.projectCode.toLowerCase().includes(q));
        if (!matchName && !matchEmail && !matchRole && !matchSkills && !matchProjects) {
          return false;
        }
      }

      // Role Category Filter
      if (roleCategoryFilter === 'pm' && !item.isPM) return false;
      if (roleCategoryFilter === 'developer' && !item.isDeveloper) return false;
      if (roleCategoryFilter === 'tester' && !item.isTester) return false;
      if (roleCategoryFilter === 'uiux' && !item.isUiUx) return false;
      if (roleCategoryFilter === 'admin' && !item.isAdmin) return false;
      if (roleCategoryFilter === 'external' && sh.category !== 'external') return false;
      if (roleCategoryFilter === 'dummy' && !item.isDummy) return false;

      // Allocation Filter (Active vs On Bench)
      if (allocationFilter === 'bench' && item.allocationStatus !== 'bench') return false;
      if (allocationFilter === 'active' && item.totalAssignedHours === 0) return false;
      if (allocationFilter === 'partially' && item.allocationStatus !== 'partially_allocated') return false;
      if (allocationFilter === 'overallocated' && item.allocationStatus !== 'overallocated') return false;
      if (allocationFilter === 'leave' && !item.currentLeave) return false;

      // Project Filter
      if (projectFilter !== 'all') {
        const inProject = item.assignedProjects.some(p => p.projectId === projectFilter);
        if (!inProject) return false;
      }

      // Skill Filter
      if (selectedTechSkillFilter !== 'all') {
        const hasSkill = item.skills.some(s => s.toLowerCase() === selectedTechSkillFilter.toLowerCase());
        if (!hasSkill) return false;
      }

      return true;
    });
  }, [allEnterpriseStakeholders, searchQuery, roleCategoryFilter, allocationFilter, projectFilter, selectedTechSkillFilter]);

  // Sorted Stakeholders
  const sortedStakeholders = useMemo(() => {
    const list = [...filteredStakeholders];
    list.sort((a, b) => {
      let diff = 0;
      switch (sortField) {
        case 'name':
          diff = (a.stakeholder.name || '').localeCompare(b.stakeholder.name || '');
          break;
        case 'role':
          diff = (a.stakeholder.role || '').localeCompare(b.stakeholder.role || '');
          break;
        case 'utilization':
          diff = a.utilizationPercent - b.utilizationPercent;
          break;
        case 'projects':
          diff = a.assignedProjects.length - b.assignedProjects.length;
          break;
        case 'skills':
          diff = a.skills.length - b.skills.length;
          break;
        case 'rate':
          diff = (a.stakeholder.hourlyRate || 95) - (b.stakeholder.hourlyRate || 95);
          break;
        case 'status':
          diff = (a.allocationStatus || '').localeCompare(b.allocationStatus || '');
          break;
        default:
          diff = 0;
      }
      return sortDirection === 'asc' ? diff : -diff;
    });
    return list;
  }, [filteredStakeholders, sortField, sortDirection]);

  // Paginated Stakeholders
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(sortedStakeholders.length / pageSize));
  
  const paginatedStakeholders = useMemo(() => {
    if (pageSize === -1) return sortedStakeholders;
    const start = (currentPage - 1) * pageSize;
    return sortedStakeholders.slice(start, start + pageSize);
  }, [sortedStakeholders, currentPage, pageSize]);

  // Reset current page if out of range when filtering
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Helper: Toggle Sort Field
  const handleToggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Helper: Toggle Expand Sub-Row
  const handleToggleExpandRow = (id: string) => {
    setExpandedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Helper: Toggle Select Single Row
  const handleToggleSelectRow = (id: string) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Helper: Toggle Select All on Current Page
  const handleToggleSelectAll = () => {
    const currentPageIds = paginatedStakeholders.map(item => item.stakeholder.id || item.stakeholder.email);
    const allSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedMemberIds.has(id));

    if (allSelected) {
      setSelectedMemberIds(prev => {
        const next = new Set(prev);
        currentPageIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedMemberIds(prev => {
        const next = new Set(prev);
        currentPageIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  // Helper: Copy Email
  const handleCopyEmail = (email: string, id: string) => {
    navigator.clipboard?.writeText(email);
    setCopiedEmailId(id);
    showToast(`✓ Copied "${email}" to clipboard`);
    setTimeout(() => setCopiedEmailId(null), 2000);
  };

  // Helper: Export to CSV
  const handleExportCSV = (membersToExport = sortedStakeholders) => {
    const headers = [
      'Name',
      'Email',
      'Role',
      'Category',
      'Allocation Status',
      'Assigned Hours/Week',
      'Weekly Capacity',
      'Utilization %',
      'Assigned Projects',
      'Skills',
      'Hourly Rate ($/hr)',
      'Is Dummy / Placeholder'
    ];

    const rows = membersToExport.map(item => [
      `"${(item.stakeholder.name || '').replace(/"/g, '""')}"`,
      `"${(item.stakeholder.email || '').replace(/"/g, '""')}"`,
      `"${(item.stakeholder.role || '').replace(/"/g, '""')}"`,
      `"${item.stakeholder.category || 'internal'}"`,
      `"${item.allocationStatus}"`,
      item.totalAssignedHours,
      item.weeklyCapacity,
      `"${item.utilizationPercent}%"`,
      `"${item.assignedProjects.map(p => `${p.projectName} (${p.projectCode})`).join('; ')}"`,
      `"${item.skills.join(', ')}"`,
      item.stakeholder.hourlyRate || 95,
      item.isDummy ? 'Yes' : 'No'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `enterprise_talent_matrix_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`✓ Exported ${membersToExport.length} talent profiles to CSV`);
  };

  // Aggregate Metrics for Header
  const totalCount = allEnterpriseStakeholders.length;
  const pmCount = allEnterpriseStakeholders.filter(s => s.isPM).length;
  const devCount = allEnterpriseStakeholders.filter(s => s.isDeveloper).length;
  const testerCount = allEnterpriseStakeholders.filter(s => s.isTester).length;
  const uiuxCount = allEnterpriseStakeholders.filter(s => s.isUiUx).length;
  const adminCount = allEnterpriseStakeholders.filter(s => s.isAdmin).length;
  const externalCount = allEnterpriseStakeholders.filter(s => s.stakeholder.category === 'external').length;
  const activeCount = allEnterpriseStakeholders.filter(s => s.totalAssignedHours > 0).length;
  const benchCount = allEnterpriseStakeholders.filter(s => s.allocationStatus === 'bench').length;
  const overallocatedCount = allEnterpriseStakeholders.filter(s => s.allocationStatus === 'overallocated').length;
  const avgUtilization = activeCount > 0
    ? Math.round(allEnterpriseStakeholders.reduce((acc, s) => acc + s.utilizationPercent, 0) / allEnterpriseStakeholders.length)
    : 0;

  // Unified Project Data for Enterprise Heatmap
  const unifiedEnterpriseProjectData = useMemo(() => {
    // Collect all tasks and stakeholders across all portfolio projects
    const allUnifiedTasks: Task[] = [];
    const allUnifiedStakeholders: Stakeholder[] = [];
    const seenShIds = new Set<string>();

    projectsArray.forEach(p => {
      if (!p) return;
      (p.tasks || []).forEach(t => {
        allUnifiedTasks.push({
          ...t,
          title: `[${p.projectCode}] ${t.title}`
        });
      });
      (p.stakeholders || []).forEach(s => {
        const key = (s.email || s.id).toLowerCase();
        if (!seenShIds.has(key)) {
          seenShIds.add(key);
          allUnifiedStakeholders.push(s);
        }
      });
    });

    // Also include all users not yet in any project
    allUsers.forEach(u => {
      const key = (u.email || u.id).toLowerCase();
      if (!seenShIds.has(key)) {
        seenShIds.add(key);
        allUnifiedStakeholders.push({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.title || 'Member',
          category: 'internal',
          avatar: u.avatar,
          hourlyRate: u.hourlyRate || 95,
          weeklyCapacityHours: u.weeklyCapacityHours || 40,
          skills: u.skills || ['Agile'],
          status: 'active'
        });
      }
    });

    return {
      id: 'unified-enterprise-portfolio',
      projectName: 'Enterprise Talent Pool & Portfolio',
      projectCode: 'APEX-ALL',
      description: 'Unified cross-project task allocation and capacity analysis',
      startDate: new Date().toISOString().split('T')[0],
      targetEndDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      budget: 1000000,
      stakeholders: allUnifiedStakeholders,
      milestones: [],
      epics: [],
      features: [],
      tasks: allUnifiedTasks,
      subtasks: [],
      raidItems: [],
      activities: [],
      widgets: []
    };
  }, [projectsArray, allUsers]);

  // Compute 4-Week Enterprise Heatmap
  const enterpriseHeatmapData = useMemo(() => {
    return calculate4WeekCapacityHeatmap(unifiedEnterpriseProjectData, leaves || [], heatmapAnchorDate);
  }, [unifiedEnterpriseProjectData, leaves, heatmapAnchorDate]);

  // Filtered Heatmap Members
  const filteredHeatmapMembers = useMemo(() => {
    const membersList = enterpriseHeatmapData?.members || [];
    return membersList.filter(item => {
      const sh = item.stakeholder;
      const q = heatmapSearchQuery.toLowerCase().trim();
      if (q) {
        const matchName = sh.name.toLowerCase().includes(q);
        const matchRole = sh.role.toLowerCase().includes(q);
        const matchEmail = sh.email.toLowerCase().includes(q);
        const matchSkills = (sh.skills || []).some(s => s.toLowerCase().includes(q));
        if (!matchName && !matchRole && !matchEmail && !matchSkills) return false;
      }

      if (heatmapRoleFilter !== 'all') {
        const rLower = (sh.role || '').toLowerCase();
        if (heatmapRoleFilter === 'pm' && !rLower.includes('pm') && !rLower.includes('project manager') && !rLower.includes('scrum master')) return false;
        if (heatmapRoleFilter === 'dev' && !rLower.includes('dev') && !rLower.includes('engineer') && !rLower.includes('architect') && !rLower.includes('frontend') && !rLower.includes('backend')) return false;
        if (heatmapRoleFilter === 'qa_design' && !rLower.includes('qa') && !rLower.includes('tester') && !rLower.includes('ui') && !rLower.includes('ux') && !rLower.includes('design')) return false;
      }
      return true;
    });
  }, [enterpriseHeatmapData, heatmapSearchQuery, heatmapRoleFilter]);

  // Quick Inline Add Stakeholder Submission
  const handleQuickAddStakeholder = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawName = quickAddName.trim();
    const rawEmail = quickAddEmail.trim();
    const shouldBeDummy = quickAddIsDummy || !rawEmail || !rawEmail.includes('@');

    const finalEmail = shouldBeDummy
      ? `unassigned.${(quickAddRole || rawName || 'member').toLowerCase().replace(/[^a-z0-9]/g, '.')}@placeholder.local`
      : rawEmail;

    const displayName = rawName || (shouldBeDummy ? `${quickAddRole} (Unassigned)` : 'New Team Member');
    const parsedSkills = quickAddSkills.split(',').map(s => s.trim()).filter(Boolean);

    const newSh: Stakeholder = {
      id: `sh-${Date.now()}`,
      name: displayName,
      email: finalEmail,
      role: quickAddRole.trim() || 'Contributor',
      category: quickAddCategory,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(finalEmail)}`,
      hourlyRate: Number(quickAddRate) || 95,
      weeklyCapacityHours: 40,
      skills: parsedSkills.length > 0 ? parsedSkills : [quickAddRole, 'Agile'],
      status: shouldBeDummy ? 'placeholder' : (quickAddSendInvite ? 'invited' : 'active'),
      isPlaceholder: shouldBeDummy,
      createdBy: currentUser?.id,
      createdByEmail: currentUser?.email
    };

    await saveStakeholder(newSh);

    setIsQuickAddModalOpen(false);
    setQuickAddName('');
    setQuickAddEmail('');
    setQuickAddRole('Project Manager');

    if (!shouldBeDummy && quickAddSendInvite) {
      if (onOpenInviteModal) {
        onOpenInviteModal({
          email: finalEmail,
          name: displayName,
          role: newSh.role,
          category: quickAddCategory,
          stakeholderId: newSh.id
        });
      } else {
        setInviteModalData({
          email: finalEmail,
          name: displayName,
          role: newSh.role,
          category: quickAddCategory,
          stakeholderId: newSh.id
        });
        setIsInviteModalOpen(true);
      }
    } else {
      showToast(shouldBeDummy
        ? `✓ Created dummy stakeholder profile "${displayName}" (${newSh.role}). You can assign tasks now and attach their email later to send an invitation.`
        : `✓ Added team member "${displayName}" (${finalEmail}) with role "${newSh.role}".`
      );
    }
  };

  // Quick Rebalance Execution in Heatmap
  const handleExecuteRebalancing = async (suggestion: RebalancingSuggestion) => {
    try {
      const targetProj = projectsArray.find(p => (p.tasks || []).some(t => t.id === suggestion.taskId));
      if (!targetProj) return;

      const targetTask = (targetProj.tasks || []).find(t => t.id === suggestion.taskId);
      if (!targetTask) return;

      const updatedAssignees = (targetTask.assigneeIds || [])
        .filter(id => id !== suggestion.fromMemberId && id !== suggestion.fromMemberName)
        .concat(suggestion.toMemberId);

      await saveTask({
        ...targetTask,
        assigneeIds: updatedAssignees
      });

      addActivityLog({
        user: currentUser?.name || 'Executive Admin',
        action: 'Rebalanced Workload Heatmap Task',
        details: `Reassigned "${suggestion.taskTitle}" from ${suggestion.fromMemberName} to ${suggestion.toMemberName} to eliminate capacity bottleneck.`,
        category: 'stakeholder'
      });

      setRebalancingSuccessId(suggestion.id);
      showToast(`✓ Rebalanced: Task assigned to ${suggestion.toMemberName}`);
      setTimeout(() => setRebalancingSuccessId(null), 3000);
    } catch (err) {
      console.error('Failed to rebalance task:', err);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in pb-12 text-slate-900 dark:text-slate-100">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-slate-900 border border-teal-500/50 text-teal-800 dark:text-teal-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Hero / Header Section - Sleek, High-Contrast & Compact */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-100 via-indigo-50/50 to-slate-100 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 flex items-center gap-1 shrink-0">
                <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>Executive Talent &amp; Governance Hub</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 shrink-0">
                {projectsArray.length} Enterprise Projects
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Stakeholders, PMs &amp; Talent Matrix</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 max-w-3xl mt-0.5 leading-relaxed">
              Unified governance directory of Project Managers, developers, QA, designers, and external stakeholders. Monitor skill distribution, active vs on-bench allocation, and multi-week cross-project capacity heatmaps.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
            <button
              onClick={() => setIsQuickAddModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Add Stakeholder / PM</span>
            </button>

            <button
              onClick={() => {
                setInviteModalData({});
                setIsInviteModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-600/20 hover:bg-teal-600 text-teal-700 dark:text-teal-300 hover:text-white border border-teal-300 dark:border-teal-500/30 font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            >
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span>Invite Member</span>
            </button>

            <button
              onClick={() => setIsPMAssignModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              title="Assign or reassign PM leadership across projects"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Assign PM</span>
            </button>
          </div>
        </div>

        {/* KPI Banner Metrics - Space-Optimized Single Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80">
          <div className="p-2 sm:p-2.5 rounded-xl bg-white/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] mb-0.5">
              <span>Total Pool</span>
              <Users className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-mono">{totalCount}</p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate">Across projects &amp; bench</p>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-white/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] mb-0.5">
              <span>Project Managers</span>
              <Briefcase className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-base sm:text-lg font-extrabold text-indigo-700 dark:text-indigo-300 font-mono">{pmCount}</p>
            <p className="text-[9px] text-indigo-600 dark:text-indigo-400 truncate">Leadership roles</p>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-white/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] mb-0.5">
              <span>Active</span>
              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-base sm:text-lg font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">{activeCount}</p>
            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 truncate">{avgUtilization}% avg util</p>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-white/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] mb-0.5">
              <span>On Bench</span>
              <Sparkles className="w-3 h-3 text-sky-600 dark:text-sky-400" />
            </div>
            <p className="text-base sm:text-lg font-extrabold text-sky-700 dark:text-sky-300 font-mono">{benchCount}</p>
            <p className="text-[9px] text-sky-600 dark:text-sky-400 truncate">Available to staff</p>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-white/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] mb-0.5">
              <span>Overloaded</span>
              <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
            </div>
            <p className={`text-base sm:text-lg font-extrabold font-mono ${overallocatedCount > 0 ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-slate-700 dark:text-slate-300'}`}>
              {overallocatedCount}
            </p>
            <p className="text-[9px] text-rose-600 dark:text-rose-400/80 truncate">
              {overallocatedCount > 0 ? '>100% capacity' : 'Optimal load'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Sub-Tab Switcher - Responsive Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl shadow-xs">
        {/* Mobile Sub-Tab Select (< sm) */}
        <div className="block sm:hidden w-full">
          <div className="relative">
            <select
              value={activeTab}
              onChange={e => setActiveTab(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 appearance-none pr-8"
            >
              <option value="directory">👥 Talent &amp; Stakeholder Directory ({filteredStakeholders.length})</option>
              <option value="heatmap">🔥 Cross-Project Heatmap {overallocatedCount > 0 ? `(${overallocatedCount} Overloaded)` : ''}</option>
              <option value="skills_bench">✨ Skill Inventory &amp; Bench ({benchCount} Bench)</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
              ▼
            </div>
          </div>
        </div>

        {/* Tablet & Desktop Horizontal Pills (>= sm) */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto custom-scrollbar-horizontal py-0.5 max-w-full">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-3 lg:px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === 'directory'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Talent Directory</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'directory' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {filteredStakeholders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('heatmap')}
            className={`flex items-center gap-2 px-3 lg:px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === 'heatmap'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
            <span>Workload Heatmap</span>
            {overallocatedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white font-bold animate-pulse">
                {overallocatedCount} Overloaded
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('skills_bench')}
            className={`flex items-center gap-2 px-3 lg:px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === 'skills_bench'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
            <span>Skill Inventory &amp; Bench</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold">
              {benchCount} Bench
            </span>
          </button>
        </div>

        {activeTab === 'directory' && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto px-1">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`p-1.5 rounded-xl border transition-all ${
                layoutMode === 'grid'
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-400 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode('table')}
              className={`p-1.5 rounded-xl border transition-all ${
                layoutMode === 'table'
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-400 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Compact Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ================= TAB 1: TALENT & STAKEHOLDER DIRECTORY ================= */}
      {activeTab === 'directory' && (
        <div className="space-y-3.5">
          {/* Smart Filter & Search Control Center */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            {/* Top Row: Search, Project Filter, Export & Actions */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, email, title, skill (e.g. React, Scrum), or project code..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Action Controls & Selectors */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Project Filter Dropdown */}
                <select
                  value={projectFilter}
                  onChange={e => setProjectFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 shadow-xs"
                >
                  <option value="all">📂 All Projects ({projectsArray.length})</option>
                  {projectsArray.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.projectName} ({p.projectCode})
                    </option>
                  ))}
                </select>

                {/* Export to CSV Button */}
                <button
                  type="button"
                  onClick={() => handleExportCSV(sortedStakeholders)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs"
                  title="Export current filtered view to CSV spreadsheet"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>

                {/* Table Density Toggle */}
                <button
                  type="button"
                  onClick={() => setTableDensity(prev => (prev === 'comfortable' ? 'compact' : 'comfortable'))}
                  className={`p-2 rounded-xl border transition-all ${
                    tableDensity === 'compact'
                      ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-400 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title={tableDensity === 'compact' ? 'Switch to Comfortable row density' : 'Switch to Compact row density'}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>

                {/* Quick Add Stakeholder Button */}
                <button
                  type="button"
                  onClick={() => setIsQuickAddModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-[0.98]"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>Add Talent</span>
                </button>

                {/* Reset Filters Button */}
                {(searchQuery || roleCategoryFilter !== 'all' || allocationFilter !== 'all' || projectFilter !== 'all' || selectedTechSkillFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setRoleCategoryFilter('all');
                      setAllocationFilter('all');
                      setProjectFilter('all');
                      setSelectedTechSkillFilter('all');
                      setSkillSearchQuery('');
                    }}
                    className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    title="Reset all active filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Status / Allocation Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar-horizontal pb-1 pt-1 border-t border-slate-200 dark:border-slate-800/80">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                <span>Allocation:</span>
              </span>
              {[
                { key: 'all', label: `All (${totalCount})` },
                { key: 'active', label: `🟢 Active (${activeCount})` },
                { key: 'bench', label: `🔵 On Bench (${benchCount})` },
                { key: 'overallocated', label: `🔴 Overallocated (${overallocatedCount})` },
                { key: 'partially', label: '🟡 Partially Staffed' },
                { key: 'leave', label: '🌴 On Leave' }
              ].map(pill => (
                <button
                  key={pill.key}
                  onClick={() => setAllocationFilter(pill.key as any)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    allocationFilter === pill.key
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/90 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Role Domain Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar-horizontal pb-1 pt-1 border-t border-slate-200 dark:border-slate-800/80">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                <span>Role Domain:</span>
              </span>
              {[
                { key: 'all', label: `All Roles (${totalCount})` },
                { key: 'pm', label: `👔 PMs (${pmCount})` },
                { key: 'developer', label: `💻 Devs (${devCount})` },
                { key: 'tester', label: `🧪 QA (${testerCount})` },
                { key: 'uiux', label: `🎨 UI/UX (${uiuxCount})` },
                { key: 'admin', label: `🛡️ Admins (${adminCount})` },
                { key: 'external', label: `🌐 External (${externalCount})` },
                { key: 'dummy', label: `✨ Placeholders` }
              ].map(pill => (
                <button
                  key={pill.key}
                  onClick={() => setRoleCategoryFilter(pill.key as any)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    roleCategoryFilter === pill.key
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Smart Scalable Skills & Competencies Filter (Scales smoothly to 100s of skills) */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Skills &amp; Competencies:</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                    {techSkillsCatalog.length} competencies
                  </span>
                </div>

                {selectedTechSkillFilter !== 'all' && (
                  <button
                    onClick={() => {
                      setSelectedTechSkillFilter('all');
                      setSkillSearchQuery('');
                    }}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline font-semibold flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear skill filter (Selected: {selectedTechSkillFilter})</span>
                  </button>
                )}
              </div>

              {/* Skills Bar with Top Quick Pills + Interactive Smart Search Dropdown */}
              <div className="flex flex-wrap items-center gap-1.5 relative">
                {/* 'All Skills' Button */}
                <button
                  onClick={() => {
                    setSelectedTechSkillFilter('all');
                    setSkillSearchQuery('');
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    selectedTechSkillFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span>All Skills</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 font-mono font-semibold">
                    {techSkillsCatalog.length}
                  </span>
                </button>

                {/* Top Quick Access Popular Skills */}
                {topQuickSkills.map(skillItem => {
                  const isSelected = selectedTechSkillFilter.toLowerCase() === skillItem.name.toLowerCase();
                  return (
                    <button
                      key={skillItem.name}
                      onClick={() => {
                        setSelectedTechSkillFilter(isSelected ? 'all' : skillItem.name);
                      }}
                      className={`px-2 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-400'
                          : 'bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:text-indigo-600 dark:hover:text-indigo-200'
                      }`}
                    >
                      <span>{skillItem.name}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                        {skillItem.count}
                      </span>
                    </button>
                  );
                })}

                {/* Pinned Active Custom Skill Pill (if user selected a skill outside top 5) */}
                {selectedTechSkillFilter !== 'all' &&
                  !topQuickSkills.some(s => s.name.toLowerCase() === selectedTechSkillFilter.toLowerCase()) && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-xs shrink-0">
                      <Sparkles className="w-3 h-3 text-purple-200" />
                      <span>{selectedTechSkillFilter}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTechSkillFilter('all');
                        }}
                        className="ml-1 p-0.5 rounded-full hover:bg-purple-700 text-purple-200 hover:text-white transition-colors"
                        title="Clear this skill filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                {/* Smart Combobox Search Input & Popover Trigger */}
                <div className="relative min-w-[200px] sm:min-w-[240px] flex-1 max-w-sm" ref={skillDropdownRef}>
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={skillSearchQuery}
                      onChange={(e) => {
                        setSkillSearchQuery(e.target.value);
                        if (!isSkillDropdownOpen) setIsSkillDropdownOpen(true);
                      }}
                      onFocus={() => setIsSkillDropdownOpen(true)}
                      placeholder={`Search & filter ${techSkillsCatalog.length} skills...`}
                      className="w-full bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 rounded-xl pl-8 pr-16 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                      {skillSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setSkillSearchQuery('')}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                          title="Clear search"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsSkillDropdownOpen(prev => !prev)}
                        className={`p-1 rounded-lg transition-colors ${isSkillDropdownOpen ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                        title="Toggle all skills menu"
                      >
                        {isSkillDropdownOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Smart Popover Dropdown for 100s of skills */}
                  {isSkillDropdownOpen && (
                    <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-72 sm:w-88 md:w-96 max-w-[90vw] bg-white dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl z-40 p-3 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150">
                      {/* Popover Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">Competency Directory</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                            {dropdownFilteredSkills.length}
                          </span>
                        </div>

                        {/* Sort Toggle (By Count vs Alphabetical) */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setSkillSortOrder('count')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                              skillSortOrder === 'count'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                            title="Sort by most members with this skill"
                          >
                            Top Count
                          </button>
                          <button
                            type="button"
                            onClick={() => setSkillSortOrder('alpha')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                              skillSortOrder === 'alpha'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                            title="Sort alphabetically A-Z"
                          >
                            A-Z
                          </button>
                        </div>
                      </div>

                      {/* Scrollable list/grid of skills */}
                      <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-0.5">
                        {/* Option to clear filter if active */}
                        {selectedTechSkillFilter !== 'all' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTechSkillFilter('all');
                              setIsSkillDropdownOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20 flex items-center justify-between transition-colors mb-1"
                          >
                            <span className="flex items-center gap-1.5">
                              <X className="w-3.5 h-3.5" />
                              <span>Reset to All Skills</span>
                            </span>
                            <span className="text-[10px] text-rose-600 dark:text-rose-400">Clear filter</span>
                          </button>
                        )}

                        {dropdownFilteredSkills.length === 0 ? (
                          <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-xs">
                            <p>No competencies matching "{skillSearchQuery}"</p>
                            <button
                              type="button"
                              onClick={() => setSkillSearchQuery('')}
                              className="mt-2 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                            >
                              Clear search query
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {dropdownFilteredSkills.map(skillItem => {
                              const isSelected = selectedTechSkillFilter.toLowerCase() === skillItem.name.toLowerCase();
                              return (
                                <button
                                  key={skillItem.name}
                                  type="button"
                                  onClick={() => {
                                    setSelectedTechSkillFilter(isSelected ? 'all' : skillItem.name);
                                    setIsSkillDropdownOpen(false);
                                  }}
                                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between text-left transition-all ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white font-bold ring-1 ring-indigo-400 shadow-xs'
                                      : 'bg-slate-50 dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-500/40'
                                  }`}
                                >
                                  <span className="truncate mr-1.5" title={skillItem.name}>
                                    {skillItem.name}
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                                      isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}>
                                      {skillItem.count}
                                    </span>
                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Dropdown Footer */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Tip: Select to isolate profiles</span>
                        <button
                          type="button"
                          onClick={() => setIsSkillDropdownOpen(false)}
                          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Active Filters Tag Bar (Summary of Applied Filters) */}
            {(searchQuery || roleCategoryFilter !== 'all' || allocationFilter !== 'all' || projectFilter !== 'all' || selectedTechSkillFilter !== 'all') && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Active filters:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 text-xs">
                    <span>Search: "{searchQuery}"</span>
                    <button onClick={() => setSearchQuery('')} className="hover:text-indigo-900 dark:hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {projectFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 text-xs">
                    <span>Project: {projectsArray.find(p => p.id === projectFilter)?.projectCode || projectFilter}</span>
                    <button onClick={() => setProjectFilter('all')} className="hover:text-indigo-900 dark:hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {roleCategoryFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/20 text-xs">
                    <span>
                      Role:{' '}
                      {roleCategoryFilter === 'pm'
                        ? 'Project Manager'
                        : roleCategoryFilter === 'developer'
                        ? 'Developer (Team member)'
                        : roleCategoryFilter === 'tester'
                        ? 'Tester (Team Member)'
                        : roleCategoryFilter === 'uiux'
                        ? 'UI/UX Dev (Team Member)'
                        : roleCategoryFilter === 'admin'
                        ? 'Admin'
                        : roleCategoryFilter === 'external'
                        ? 'External'
                        : 'Placeholders'}
                    </span>
                    <button onClick={() => setRoleCategoryFilter('all')} className="hover:text-teal-900 dark:hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {allocationFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/20 text-xs">
                    <span>Allocation: {allocationFilter}</span>
                    <button onClick={() => setAllocationFilter('all')} className="hover:text-sky-900 dark:hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedTechSkillFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 text-xs">
                    <span>Skill: {selectedTechSkillFilter}</span>
                    <button onClick={() => setSelectedTechSkillFilter('all')} className="hover:text-purple-900 dark:hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setRoleCategoryFilter('all');
                    setAllocationFilter('all');
                    setProjectFilter('all');
                    setSelectedTechSkillFilter('all');
                    setSkillSearchQuery('');
                  }}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold ml-auto"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* Batch Operations Bar (When rows are selected) */}
          {selectedMemberIds.size > 0 && (
            <div className="p-3.5 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 shadow-xl animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-slate-100">
                  {selectedMemberIds.size} team member{selectedMemberIds.size > 1 ? 's' : ''} selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const selectedList = sortedStakeholders.filter(item =>
                      selectedMemberIds.has(item.stakeholder.id || item.stakeholder.email)
                    );
                    handleExportCSV(selectedList);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Selected ({selectedMemberIds.size}) to CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMemberIds(new Set())}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredStakeholders.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-xl">
              <Users className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-200">No Stakeholders or PMs Matched Your Filters</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Try adjusting your search keywords, role domains, or skill requirements to view enterprise talent.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setRoleCategoryFilter('all');
                    setAllocationFilter('all');
                    setProjectFilter('all');
                    setSelectedTechSkillFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  Reset All Filters
                </button>
                <button
                  onClick={() => setIsQuickAddModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Add New Stakeholder / PM</span>
                </button>
              </div>
            </div>
          ) : layoutMode === 'grid' ? (
            /* ================= GRID CARD VIEW ================= */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginatedStakeholders.map(item => {
                const sh = item.stakeholder;
                const isUserAdmin = item.isAdmin;
                const isUserPm = item.isPM;
                const isDummy = item.isDummy;

                return (
                  <div
                    key={sh.id || sh.email}
                    className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-xl flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Header with Avatar & Role Badges */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={sh.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sh.email)}`}
                            alt={sh.name}
                            className="w-12 h-12 rounded-2xl object-cover border border-slate-700 bg-slate-950 shrink-0 shadow-md"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-100 text-sm truncate">{sh.name}</h3>
                              {isUserAdmin && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase shrink-0">
                                  Admin
                                </span>
                              )}
                              {isUserPm && !isUserAdmin && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase shrink-0">
                                  PM
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 block truncate">{sh.email}</span>
                            <span className="text-[11px] font-semibold text-indigo-300 mt-0.5 block">{sh.role}</span>
                          </div>
                        </div>

                        {/* Status / Bench Pill */}
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {isDummy ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              ✨ Placeholder
                            </span>
                          ) : item.allocationStatus === 'bench' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-sky-400" />
                              On Bench
                            </span>
                          ) : item.allocationStatus === 'overallocated' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 animate-pulse">
                              <Flame className="w-3 h-3 text-rose-400" />
                              {item.utilizationPercent}% Load
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              🟢 {item.utilizationPercent}% Active
                            </span>
                          )}

                          {item.currentLeave && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Palmtree className="w-2.5 h-2.5 text-amber-400" />
                              On Leave
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Workload Capacity Bar */}
                      <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Weekly Workload Allocation</span>
                          <span className="font-mono font-bold text-slate-200">
                            {item.totalAssignedHours}h / {item.weeklyCapacity}h ({item.utilizationPercent}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.allocationStatus === 'overallocated'
                                ? 'bg-rose-500'
                                : item.allocationStatus === 'bench'
                                ? 'bg-slate-700'
                                : item.utilizationPercent >= 85
                                ? 'bg-emerald-500'
                                : 'bg-indigo-500'
                            }`}
                            style={{ width: `${Math.min(100, item.utilizationPercent)}%` }}
                          />
                        </div>
                      </div>

                      {/* Assigned Projects Badges */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Assigned Projects ({item.assignedProjects.length})
                        </span>
                        {item.assignedProjects.length === 0 ? (
                          <span className="text-xs text-slate-400 italic block">No active project commitments</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {item.assignedProjects.map(proj => (
                              <button
                                key={proj.projectId}
                                type="button"
                                onClick={() => {
                                  if (onSwitchToProjectView) onSwitchToProjectView(proj.projectId);
                                  else switchProject(proj.projectId);
                                }}
                                className="px-2 py-0.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold flex items-center gap-1 transition-all"
                                title={`Switch to ${proj.projectName}`}
                              >
                                <span>{proj.projectCode}</span>
                                {proj.isPM && <span className="text-amber-400">★ PM</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Skills Tags */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Technical Skills
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {item.skills.map((skill, sIdx) => {
                            const isFiltered = selectedTechSkillFilter !== 'all' && skill.toLowerCase() === selectedTechSkillFilter.toLowerCase();
                            return (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => setSelectedTechSkillFilter(skill)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                                  isFiltered
                                    ? 'bg-indigo-600 text-white font-bold'
                                    : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                                }`}
                              >
                                {skill}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="text-[11px] font-mono">
                        <span className="font-bold text-emerald-400">${sh.hourlyRate || 95}/hr</span>
                        <span className="text-slate-400 ml-1">rate</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isDummy ? (
                          <button
                            type="button"
                            onClick={() => {
                              setStakeholderToEdit(sh);
                              setIsStakeholderModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
                          >
                            <Mail className="w-3 h-3" />
                            <span>Assign Email</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedStakeholderForReportCard(sh)}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
                          >
                            <Award className="w-3 h-3" />
                            <span>Report Card</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setStakeholderToEdit(sh);
                            setIsStakeholderModalOpen(true);
                          }}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Edit Stakeholder Profile"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ================= SMART INTERACTIVE TABULAR VIEW ================= */
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
              <div className="overflow-x-auto overflow-y-auto max-h-[500px] xl:max-h-[560px] 2xl:max-h-[640px] custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse min-w-[960px]">
                  <thead className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur border-b border-slate-800 shadow-sm">
                    <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                      {/* Checkbox & Expand All */}
                      <th className="py-3 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                          title="Select / Deselect all on current page"
                        >
                          {paginatedStakeholders.length > 0 &&
                          paginatedStakeholders.every(item => selectedMemberIds.has(item.stakeholder.id || item.stakeholder.email)) ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </th>

                      {/* Expand toggle header */}
                      <th className="py-3 px-1 w-8 text-center" title="Row expander"></th>

                      {/* Name & Identity */}
                      <th
                        className="py-3 px-3 min-w-[200px] cursor-pointer hover:text-indigo-300 transition-colors"
                        onClick={() => handleToggleSort('name')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Stakeholder & Profile</span>
                          {sortField === 'name' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-60" />
                          )}
                        </div>
                      </th>

                      {/* Role & Category */}
                      <th
                        className="py-3 px-3 min-w-[140px] cursor-pointer hover:text-indigo-300 transition-colors"
                        onClick={() => handleToggleSort('role')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Role & Domain</span>
                          {sortField === 'role' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-60" />
                          )}
                        </div>
                      </th>

                      {/* Allocation / Workload */}
                      <th
                        className="py-3 px-3 min-w-[160px] cursor-pointer hover:text-indigo-300 transition-colors"
                        onClick={() => handleToggleSort('utilization')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Workload & Utilization</span>
                          {sortField === 'utilization' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-60" />
                          )}
                        </div>
                      </th>

                      {/* Assigned Projects */}
                      <th
                        className="py-3 px-3 min-w-[140px] cursor-pointer hover:text-indigo-300 transition-colors"
                        onClick={() => handleToggleSort('projects')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Projects</span>
                          {sortField === 'projects' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-60" />
                          )}
                        </div>
                      </th>

                      {/* Technical Skills */}
                      <th
                        className="py-3 px-3 min-w-[180px] cursor-pointer hover:text-indigo-300 transition-colors"
                        onClick={() => handleToggleSort('skills')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Skills & Stack</span>
                          {sortField === 'skills' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-60" />
                          )}
                        </div>
                      </th>

                      {/* Hourly Rate */}
                      <th
                        className="py-3 px-3 min-w-[90px] cursor-pointer hover:text-indigo-300 transition-colors"
                        onClick={() => handleToggleSort('rate')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Rate</span>
                          {sortField === 'rate' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-60" />
                          )}
                        </div>
                      </th>

                      {/* Actions */}
                      <th className="py-3 px-4 min-w-[130px] text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800/60">
                    {paginatedStakeholders.map(item => {
                      const sh = item.stakeholder;
                      const memberKey = sh.id || sh.email;
                      const isUserAdmin = item.isAdmin;
                      const isUserPm = item.isPM;
                      const isDummy = item.isDummy;
                      const isSelected = selectedMemberIds.has(memberKey);
                      const isExpanded = expandedMemberIds.has(memberKey);

                      // Calculate active tasks across all enterprise projects for the expanded row
                      const crossProjectTasks: Array<{ project: ProjectMeta; task: Task }> = [];
                      projectsArray.forEach(proj => {
                        (proj.tasks || []).forEach(t => {
                          const isAssigned = (t.assigneeIds || []).some(id => id === sh.id || id === sh.name || id === sh.email);
                          if (isAssigned) {
                            crossProjectTasks.push({ project: proj, task: t });
                          }
                        });
                      });

                      const pyClass = tableDensity === 'compact' ? 'py-2 px-3' : 'py-2.5 px-3';

                      return (
                        <React.Fragment key={memberKey}>
                          <tr
                            className={`transition-colors ${
                              isSelected
                                ? 'bg-indigo-950/40'
                                : isExpanded
                                ? 'bg-slate-850/60'
                                : 'hover:bg-slate-800/40'
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleSelectRow(memberKey)}
                                className="text-slate-400 hover:text-slate-200 p-1"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-700 hover:text-slate-500" />
                                )}
                              </button>
                            </td>

                            {/* Expand Row Chevron */}
                            <td className="py-2.5 px-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleExpandRow(memberKey)}
                                className={`p-1 rounded-lg transition-transform ${
                                  isExpanded ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'
                                }`}
                                title={isExpanded ? 'Collapse 360 overview' : 'Expand 360 overview & live tasks'}
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </td>

                            {/* Stakeholder Name, Avatar & Email */}
                            <td className={pyClass}>
                              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                <img
                                  src={sh.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sh.email)}`}
                                  alt={sh.name}
                                  className={`${tableDensity === 'compact' ? 'w-7 h-7 rounded-lg' : 'w-9 h-9 rounded-xl'} object-cover border border-slate-700 bg-slate-950 shrink-0 shadow`}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-100 text-xs truncate max-w-[140px] sm:max-w-[200px]" title={sh.name}>{sh.name}</span>
                                    {isUserAdmin && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase shrink-0">
                                        Admin
                                      </span>
                                    )}
                                    {isUserPm && !isUserAdmin && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase shrink-0">
                                        PM
                                      </span>
                                    )}
                                    {isDummy && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold uppercase shrink-0">
                                        Dummy
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 mt-0.5 min-w-0">
                                    <span className="text-[11px] text-slate-400 truncate max-w-[130px] sm:max-w-[170px]" title={sh.email}>
                                      {sh.email}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyEmail(sh.email, memberKey)}
                                      className="text-slate-600 hover:text-indigo-400 transition-colors p-0.5 shrink-0"
                                      title="Copy email address"
                                    >
                                      {copiedEmailId === memberKey ? (
                                        <Check className="w-3 h-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-2.5 h-2.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Role & Domain */}
                            <td className={pyClass}>
                              <span className="font-semibold text-slate-200 text-xs block">{sh.role}</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] text-slate-400 capitalize">{sh.category || 'Internal'}</span>
                                {item.isDeveloper && <span className="text-[10px] text-indigo-400">· Eng</span>}
                                {item.isQaOrDesign && <span className="text-[10px] text-pink-400">· Design/QA</span>}
                              </div>
                            </td>

                            {/* Allocation Status & Workload Progress Bar */}
                            <td className={pyClass}>
                              <div className="space-y-1.5 max-w-[190px]">
                                <div className="flex items-center justify-between gap-1 text-[11px]">
                                  {item.allocationStatus === 'bench' ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 inline-flex items-center gap-1">
                                      <Sparkles className="w-2.5 h-2.5 text-sky-400" />
                                      On Bench
                                    </span>
                                  ) : item.allocationStatus === 'overallocated' ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                                      <Flame className="w-2.5 h-2.5 text-rose-400" />
                                      {item.utilizationPercent}% Overallocated
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      🟢 {item.utilizationPercent}% Active
                                    </span>
                                  )}
                                  <span className="font-mono text-[10px] font-bold text-slate-300 shrink-0">
                                    {item.totalAssignedHours}h / {item.weeklyCapacity}h
                                  </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      item.allocationStatus === 'overallocated'
                                        ? 'bg-rose-500'
                                        : item.allocationStatus === 'bench'
                                        ? 'bg-slate-700'
                                        : item.utilizationPercent >= 85
                                        ? 'bg-emerald-500'
                                        : 'bg-indigo-500'
                                    }`}
                                    style={{ width: `${Math.min(100, item.utilizationPercent)}%` }}
                                  />
                                </div>

                                {item.currentLeave && (
                                  <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                                    <Palmtree className="w-2.5 h-2.5 text-amber-400" />
                                    <span>On leave ({item.currentLeave.type})</span>
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Assigned Projects */}
                            <td className={pyClass}>
                              {item.assignedProjects.length === 0 ? (
                                <span className="text-slate-500 text-[11px] italic">0 active projects</span>
                              ) : (
                                <div className="flex flex-wrap gap-1 max-w-[180px]">
                                  {item.assignedProjects.map(proj => (
                                    <button
                                      key={proj.projectId}
                                      type="button"
                                      onClick={() => {
                                        if (onSwitchToProjectView) onSwitchToProjectView(proj.projectId);
                                        else switchProject(proj.projectId);
                                      }}
                                      className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold flex items-center gap-1 transition-all"
                                      title={`Switch to ${proj.projectName} (${proj.projectCode})`}
                                    >
                                      <span>{proj.projectCode}</span>
                                      {proj.isPM && <span className="text-amber-400">★</span>}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Skills & Stack */}
                            <td className={pyClass}>
                              <div className="flex flex-wrap gap-1 max-w-[220px]">
                                {item.skills.slice(0, 4).map((s, idx) => {
                                  const isSelectedSkill = selectedTechSkillFilter.toLowerCase() === s.toLowerCase();
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setSelectedTechSkillFilter(s)}
                                      className={`px-1.5 py-0.5 rounded text-[10px] transition-all ${
                                        isSelectedSkill
                                          ? 'bg-indigo-600 text-white font-bold'
                                          : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                                      }`}
                                      title={`Filter table by ${s}`}
                                    >
                                      {s}
                                    </button>
                                  );
                                })}
                                {item.skills.length > 4 && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleExpandRow(memberKey)}
                                    className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-[10px] font-mono"
                                    title="View all skills"
                                  >
                                    +{item.skills.length - 4} more
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Billing Rate */}
                            <td className={`${pyClass} font-mono`}>
                              <div className="space-y-0.5">
                                <span className="font-bold text-emerald-400 text-xs">${sh.hourlyRate || 95}/hr</span>
                                <span className="text-[10px] text-slate-500 block">
                                  ~${(sh.hourlyRate || 95) * item.totalAssignedHours}/wk
                                </span>
                              </div>
                            </td>

                            {/* Actions Column */}
                            <td className={`${pyClass} text-right px-4`}>
                              <div className="flex items-center justify-end gap-1.5">
                                {isDummy ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setStakeholderToEdit(sh);
                                      setIsStakeholderModalOpen(true);
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
                                    title="Convert placeholder to real member"
                                  >
                                    <Mail className="w-3 h-3" />
                                    <span>Assign</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStakeholderForReportCard(sh)}
                                    className="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
                                    title="View Individual Performance Report Card"
                                  >
                                    <Award className="w-3 h-3" />
                                    <span>Report</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setStakeholderToEdit(sh);
                                    setIsStakeholderModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                  title="Edit Stakeholder Profile & Rates"
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleExpandRow(memberKey)}
                                  className={`p-1.5 rounded-xl border transition-colors ${
                                    isExpanded
                                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                  title={isExpanded ? 'Hide deep-dive' : 'Show 360 deep-dive'}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* ================= EXPANDED 360 SUB-ROW ================= */}
                          {isExpanded && (
                            <tr className="bg-slate-950/95 border-b border-slate-800">
                              <td colSpan={9} className="p-3 sm:p-5">
                                <div className="rounded-2xl bg-slate-900/95 border border-slate-800 p-4 sm:p-5 space-y-4 shadow-inner w-full max-w-full overflow-hidden">
                                  {/* Sub-Header */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                                        <Sparkles className="w-4 h-4" />
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                                          360° Resource &amp; Task Breakdown: {sh.name}
                                        </h4>
                                        <p className="text-[11px] text-slate-400 truncate">
                                          Cross-project allocations, active task queue, and leave schedule.
                                        </p>
                                      </div>
                                    </div>

                                    {/* Action Links */}
                                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedStakeholderForReportCard(sh)}
                                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                      >
                                        <Award className="w-3.5 h-3.5" />
                                        <span>Full Report Card</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setStakeholderToEdit(sh);
                                          setIsStakeholderModalOpen(true);
                                        }}
                                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                                      >
                                        <Sliders className="w-3.5 h-3.5" />
                                        <span>Edit Profile</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Grid of details: Tasks & Capacity */}
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                                    {/* Left: Active Cross-Project Tasks */}
                                    <div className="space-y-2 min-w-0">
                                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                                        <span className="flex items-center gap-1.5">
                                          <Code className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                          <span>Active Tasks Across Projects ({crossProjectTasks.length})</span>
                                        </span>
                                      </div>

                                      {crossProjectTasks.length === 0 ? (
                                        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-slate-400 italic">
                                          No active tasks currently assigned across any project.
                                        </div>
                                      ) : (
                                        <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                                          {crossProjectTasks.map(({ project: p, task: t }) => (
                                            <div
                                              key={t.id}
                                              className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-3 text-xs hover:border-slate-700 transition-all"
                                            >
                                              <div className="min-w-0 space-y-0.5">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0">
                                                    {p.projectCode}
                                                  </span>
                                                  <span className="font-semibold text-slate-200 truncate">{t.title}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                  <span>Due: {t.dueDate || 'No date'}</span>
                                                  {t.estimatedHours ? <span>· Est: {t.estimatedHours}h</span> : null}
                                                  {t.actualHours ? <span>· Spent: {t.actualHours}h</span> : null}
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-2 shrink-0">
                                                <span
                                                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                                    t.status === 'done'
                                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                      : t.status === 'in_progress'
                                                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                                      : t.status === 'review'
                                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                      : 'bg-slate-800 text-slate-400'
                                                  }`}
                                                >
                                                  {t.status.replace('_', ' ')}
                                                </span>
                                                {onOpenTaskModal && (
                                                  <button
                                                    type="button"
                                                    onClick={() => onOpenTaskModal(t.id)}
                                                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                                                    title="Open Task Details"
                                                  >
                                                    <ExternalLink className="w-3 h-3" />
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Right: Cross-Project Capacity Allocation Distribution */}
                                    <div className="space-y-3 min-w-0">
                                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <Sliders className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                                        <span>Capacity Distribution ({item.weeklyCapacity || 40}h Base)</span>
                                      </span>

                                      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                          <span className="text-slate-400">Total Utilization:</span>
                                          <span className="font-mono font-bold text-slate-200">
                                            {item.totalAssignedHours || 0}h committed / {item.weeklyCapacity || 40}h max ({item.utilizationPercent || 0}%)
                                          </span>
                                        </div>

                                        {/* Multi-Project Segmented Bar */}
                                        <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden flex relative">
                                          {item.assignedProjects.length === 0 ? (
                                            <div className="w-full h-full bg-slate-800/80 flex items-center justify-center text-[10px] text-sky-400 font-medium px-2">
                                              100% Available on Bench (0h / {item.weeklyCapacity || 40}h)
                                            </div>
                                          ) : (
                                            item.assignedProjects.map((p, idx) => {
                                              const pLoad = p.hours || 0;
                                              const pct = item.weeklyCapacity > 0 ? (pLoad / item.weeklyCapacity) * 100 : 0;
                                              const colors = ['bg-indigo-500', 'bg-teal-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500'];
                                              return (
                                                <div
                                                  key={p.projectId}
                                                  className={`h-full ${colors[idx % colors.length]}`}
                                                  style={{ width: `${pct}%` }}
                                                  title={`${p.projectCode}: ${pLoad}h (${Math.round(pct)}%)`}
                                                />
                                              );
                                            })
                                          )}
                                        </div>

                                        {/* Breakdown Legend */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px]">
                                          <div className="flex flex-wrap gap-2">
                                            {item.assignedProjects.map((p, idx) => {
                                              const pLoad = p.hours || 0;
                                              const colors = ['bg-indigo-500', 'bg-teal-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500'];
                                              return (
                                                <div key={p.projectId} className="flex items-center gap-1 font-semibold text-slate-300">
                                                  <span className={`w-2 h-2 rounded-full ${colors[idx % colors.length]}`} />
                                                  <span>
                                                    {p.projectCode}: {pLoad}h
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                          <div className="flex items-center gap-1 font-semibold text-sky-400 shrink-0">
                                            <span className="w-2 h-2 rounded-full bg-sky-400" />
                                            <span>
                                              Free Bench: {Math.max(0, (item.weeklyCapacity || 40) - (item.totalAssignedHours || 0))}h
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Complete Skills List */}
                                      <div className="space-y-1.5">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                          All Verified Skills ({item.skills.length})
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                          {item.skills.length === 0 ? (
                                            <span className="text-[10px] text-slate-500 italic">No verified skills listed</span>
                                          ) : (
                                            item.skills.map((skill, sIdx) => (
                                              <span
                                                key={sIdx}
                                                className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-medium"
                                              >
                                                {skill}
                                              </span>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ================= PAGINATION & TABLE CONTROLS FOOTER ================= */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                {/* Left: Total Records Info */}
                <div className="flex items-center gap-3">
                  <span>
                    Showing <strong className="text-slate-200">{paginatedStakeholders.length > 0 ? (currentPage - 1) * (pageSize === -1 ? sortedStakeholders.length : pageSize) + 1 : 0}</strong> to{' '}
                    <strong className="text-slate-200">
                      {pageSize === -1 ? sortedStakeholders.length : Math.min(currentPage * pageSize, sortedStakeholders.length)}
                    </strong>{' '}
                    of <strong className="text-slate-200">{sortedStakeholders.length}</strong> talent profiles
                  </span>

                  {/* Quick CSV Export */}
                  <button
                    type="button"
                    onClick={() => handleExportCSV(sortedStakeholders)}
                    className="text-indigo-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export all ({sortedStakeholders.length})</span>
                  </button>
                </div>

                {/* Right: Page Size Selector & Pagination Buttons */}
                <div className="flex items-center gap-3">
                  {/* Page Size Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px]">Rows:</span>
                    <select
                      value={pageSize}
                      onChange={e => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value={8}>8</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={-1}>All ({sortedStakeholders.length})</option>
                    </select>
                  </div>

                  {/* Pagination Buttons */}
                  {pageSize !== -1 && totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 transition-colors"
                        title="Previous page"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <span className="px-2 font-mono font-bold text-slate-200 text-xs">
                        Page {currentPage} of {totalPages}
                      </span>

                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 transition-colors"
                        title="Next page"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: WORKLOAD & CAPACITY HEATMAP ================= */}
      {activeTab === 'heatmap' && (
        <div className="space-y-5">
          {/* Heatmap Controls Bar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <span>4-Week Cross-Project Capacity & Bottleneck Heatmap</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualizes multi-week staffing load across all enterprise projects. Red indicates capacity bottlenecks (≥105%), green is optimal, and slate is bench.
                </p>
              </div>

              {/* Week Window Navigation */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  onClick={() => {
                    const prev = new Date(heatmapAnchorDate);
                    prev.setDate(prev.getDate() - 7);
                    setHeatmapAnchorDate(prev);
                  }}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition-colors"
                  title="Previous Week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setHeatmapAnchorDate(new Date())}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold hover:border-indigo-500 transition-colors"
                >
                  Current Sprint
                </button>
                <button
                  onClick={() => {
                    const next = new Date(heatmapAnchorDate);
                    next.setDate(next.getDate() + 7);
                    setHeatmapAnchorDate(next);
                  }}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition-colors"
                  title="Next Week"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Heatmap Filters & Mode Switcher */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search heatmap talent..."
                    value={heatmapSearchQuery}
                    onChange={e => setHeatmapSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <select
                  value={heatmapRoleFilter}
                  onChange={e => setHeatmapRoleFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Roles</option>
                  <option value="pm">Project Managers</option>
                  <option value="dev">Developers</option>
                  <option value="qa_design">QA & Design</option>
                </select>
              </div>

              {/* Display Mode: % vs Hours vs Variance */}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
                {[
                  { key: 'percent', label: '% Utilization' },
                  { key: 'hours', label: 'Hours (Assigned/Cap)' },
                  { key: 'variance', label: 'Net Variance (+/-)' }
                ].map(m => (
                  <button
                    key={m.key}
                    onClick={() => setHeatmapDisplayMode(m.key as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      heatmapDisplayMode === m.key
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-slate-400 border-t border-slate-800/80">
              <span className="font-bold text-slate-300">Legend:</span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-500/80" /> Critical / Overallocated (≥105%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500/80" /> Optimal Load (75%-100%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-sky-500/70" /> Light Load (1%-74%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-800" /> On Bench (0%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500/80" /> Time Off / Leave
              </span>
            </div>
          </div>

          {/* Heatmap Grid Matrix */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4 min-w-[240px]">Team Member / Role</th>
                    {(enterpriseHeatmapData?.weekSlots || []).map((wSlot, wIdx) => (
                      <th key={wIdx} className="py-3.5 px-3 text-center min-w-[140px]">
                        <span className="block text-slate-200 font-bold">{wSlot.shortLabel}</span>
                        <span className="text-[10px] text-slate-400 font-normal">Week {wSlot.weekNumber}</span>
                      </th>
                    ))}
                    <th className="py-3.5 px-4 text-right min-w-[120px]">Peak Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredHeatmapMembers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="font-semibold">No members matched the heatmap filter criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredHeatmapMembers.map(item => {
                      const sh = item.stakeholder;
                      return (
                        <tr key={sh.id || sh.email} className="hover:bg-slate-800/40 transition-colors">
                          {/* Member Info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={sh.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sh.email)}`}
                                alt={sh.name}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-700 bg-slate-950 shrink-0"
                              />
                              <div className="min-w-0">
                                <span className="font-bold text-slate-100 text-xs block truncate">{sh.name}</span>
                                <span className="text-[11px] text-indigo-300 block truncate">{sh.role}</span>
                              </div>
                            </div>
                          </td>

                          {/* 4 Weekly Heatmap Cells */}
                          {item.weeklyLoads.map((wLoad, wIdx) => {
                            const isOver = wLoad.utilizationPercent > 100;
                            const isOpt = wLoad.utilizationPercent >= 75 && wLoad.utilizationPercent <= 100;
                            const isBench = wLoad.assignedHours === 0;
                            const hasLeave = wLoad.leavesInWeek.length > 0;

                            let cellBg = 'bg-slate-950/70 text-slate-400 border-slate-800/60';
                            if (hasLeave && wLoad.effectiveCapacityHours === 0) {
                              cellBg = 'bg-amber-950/40 border-amber-500/40 text-amber-300';
                            } else if (isOver) {
                              cellBg = 'bg-rose-950/50 border-rose-500/50 text-rose-300 font-bold';
                            } else if (isOpt) {
                              cellBg = 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-bold';
                            } else if (!isBench) {
                              cellBg = 'bg-sky-950/40 border-sky-500/30 text-sky-300';
                            }

                            return (
                              <td key={wIdx} className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setSelectedHeatmapCell({ member: item, weekLoad: wLoad })}
                                  className={`w-full py-2 px-2.5 rounded-xl border transition-all text-xs font-mono flex flex-col items-center justify-center hover:scale-[1.03] active:scale-95 shadow-sm ${cellBg}`}
                                  title="Click to inspect weekly tasks and rebalancing options"
                                >
                                  {heatmapDisplayMode === 'percent' && (
                                    <span>{wLoad.utilizationPercent}%</span>
                                  )}
                                  {heatmapDisplayMode === 'hours' && (
                                    <span>{wLoad.assignedHours}h / {wLoad.effectiveCapacityHours}h</span>
                                  )}
                                  {heatmapDisplayMode === 'variance' && (
                                    <span className={wLoad.varianceHours > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                                      {wLoad.varianceHours > 0 ? `+${wLoad.varianceHours}h` : `${wLoad.varianceHours}h`}
                                    </span>
                                  )}

                                  {hasLeave && (
                                    <span className="text-[9px] text-amber-400 flex items-center gap-0.5 mt-0.5">
                                      <Palmtree className="w-2.5 h-2.5" />
                                      {wLoad.blockedLeaveHours}h leave
                                    </span>
                                  )}
                                </button>
                              </td>
                            );
                          })}

                          {/* Peak Utilization */}
                          <td className="py-3.5 px-4 text-right font-mono">
                            <span className={`font-bold text-xs ${
                              item.peakUtilization > 100 ? 'text-rose-400' : 'text-slate-200'
                            }`}>
                              {item.peakUtilization}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: SKILL INVENTORY & BENCH INTELLIGENCE ================= */}
      {activeTab === 'skills_bench' && (
        <div className="space-y-5">
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Enterprise Skill Domains & Bench Staffing Intelligence</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Overview of certified talents across major technical and leadership domains, with immediate 1-click bench staffing recommendations.
              </p>
            </div>

            {/* Skill Domain Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
              {[
                { domain: 'Project Leadership & Scrum', filterTag: 'Project Manager', icon: Briefcase, color: 'indigo' },
                { domain: 'Frontend & UI Engineering', filterTag: 'React', icon: Code, color: 'emerald' },
                { domain: 'Backend & Cloud Infrastructure', filterTag: 'Node', icon: Laptop, color: 'sky' },
                { domain: 'UI/UX & Product Design', filterTag: 'UI/UX', icon: Sparkles, color: 'purple' },
                { domain: 'QA Automation & Security', filterTag: 'QA', icon: ShieldCheck, color: 'amber' },
                { domain: 'Agile & DevOps', filterTag: 'Agile', icon: Zap, color: 'rose' }
              ].map(d => {
                const DomainIcon = d.icon;
                const membersWithDomain = allEnterpriseStakeholders.filter(s =>
                  s.skills.some(sk => sk.toLowerCase().includes(d.filterTag.toLowerCase())) ||
                  s.stakeholder.role.toLowerCase().includes(d.filterTag.toLowerCase())
                );
                const benchInDomain = membersWithDomain.filter(s => s.allocationStatus === 'bench');

                return (
                  <div key={d.domain} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl bg-indigo-500/10 text-indigo-400`}>
                          <DomainIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-100">{d.domain}</h4>
                          <span className="text-[10px] text-slate-400">{membersWithDomain.length} certified talent</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        {benchInDomain.length} on bench
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Available Bench Talent:
                      </span>
                      {benchInDomain.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">All certified members are currently 100% staffed.</p>
                      ) : (
                        <div className="space-y-1">
                          {benchInDomain.slice(0, 3).map(b => (
                            <div key={b.stakeholder.id} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-900 border border-slate-800/80">
                              <span className="font-semibold text-slate-200">{b.stakeholder.name}</span>
                              <button
                                onClick={() => {
                                  setStakeholderToEdit(b.stakeholder);
                                  setIsStakeholderModalOpen(true);
                                }}
                                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
                              >
                                Assign →
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: QUICK ADD STAKEHOLDER / PM ================= */}
      {isQuickAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 max-h-[calc(100vh-2rem)] flex flex-col">
            <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add Stakeholder or Project Manager</h3>
                  <p className="text-xs text-slate-400">Add to project team or create a placeholder profile without immediate invite</p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickAddModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddStakeholder} className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto custom-scrollbar flex-1">
              {/* Dummy / Placeholder Mode Toggle */}
              <div className="p-3 bg-slate-950/60 border border-indigo-500/30 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-bold text-indigo-200 block cursor-pointer">
                    Create as Dummy / Placeholder Member (No Email Required)
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Reserves staffing capacity and permits immediate task assignment. You can attach their email later to send an invitation.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={quickAddIsDummy}
                  onChange={e => setQuickAddIsDummy(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Full Name {quickAddIsDummy ? '(Optional)' : '*'}
                  </label>
                  <input
                    type="text"
                    required={!quickAddIsDummy}
                    value={quickAddName}
                    onChange={e => setQuickAddName(e.target.value)}
                    placeholder={quickAddIsDummy ? "e.g. Lead PM (Unassigned)" : "e.g. Rachel Adams"}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-indigo-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Email Address {quickAddIsDummy ? '(Optional)' : '*'}
                  </label>
                  <input
                    type="email"
                    required={!quickAddIsDummy}
                    value={quickAddEmail}
                    onChange={e => setQuickAddEmail(e.target.value)}
                    placeholder={quickAddIsDummy ? "Leave blank for placeholder" : "rachel.a@apex.io"}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>

              {/* Role Presets */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Role / Job Title *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {APP_ROLES.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuickAddRole(preset)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                        quickAddRole === preset
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <select
                  required
                  value={quickAddRole}
                  onChange={e => setQuickAddRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-indigo-500 text-xs font-semibold"
                >
                  {APP_ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Category *
                  </label>
                  <select
                    value={quickAddCategory}
                    onChange={e => setQuickAddCategory(e.target.value as StakeholderCategory)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-indigo-500 text-xs font-semibold"
                  >
                    <option value="internal">🏢 Internal Team / PM</option>
                    <option value="external">🌐 External Client / Stakeholder</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Hourly Rate ($/hr)
                  </label>
                  <input
                    type="number"
                    value={quickAddRate}
                    onChange={e => setQuickAddRate(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Skills (comma separated)
                </label>
                <input
                  type="text"
                  value={quickAddSkills}
                  onChange={e => setQuickAddSkills(e.target.value)}
                  placeholder="e.g. Agile, React, Python, Scrum"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 active:scale-[0.98]"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{quickAddIsDummy || !quickAddEmail ? 'Save Placeholder Profile' : 'Save & Send Invite'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= HEATMAP CELL INSPECTOR MODAL ================= */}
      {selectedHeatmapCell && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 max-h-[calc(100vh-2rem)] flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <span>Workload Cell: {selectedHeatmapCell.member.stakeholder.name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedHeatmapCell.weekLoad.weekSlot.label} (Week {selectedHeatmapCell.weekLoad.weekSlot.weekNumber})
                </p>
              </div>
              <button
                onClick={() => setSelectedHeatmapCell(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto custom-scrollbar flex-1">
              {/* Capacity Breakdown */}
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">Assigned Load</span>
                  <span className="text-sm font-bold text-white">{selectedHeatmapCell.weekLoad.assignedHours}h</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Effective Cap</span>
                  <span className="text-sm font-bold text-slate-300">{selectedHeatmapCell.weekLoad.effectiveCapacityHours}h</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Utilization</span>
                  <span className={`text-sm font-bold ${selectedHeatmapCell.weekLoad.utilizationPercent > 100 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {selectedHeatmapCell.weekLoad.utilizationPercent}%
                  </span>
                </div>
              </div>

              {/* Tasks Assigned in this Week Window */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Scheduled Deliverables in Week ({selectedHeatmapCell.weekLoad.taskAllocations.length})
                </span>
                {selectedHeatmapCell.weekLoad.taskAllocations.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    No tasks scheduled during this 7-day window. Member is free on bench.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedHeatmapCell.weekLoad.taskAllocations.map(t => (
                      <div key={t.taskId} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/90 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-200 block truncate">{t.taskTitle}</span>
                          <span className="text-[10px] text-slate-400">Total: {t.totalTaskHours}h</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono font-bold shrink-0">
                          {t.allocatedHoursThisWeek}h
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rebalance Actions if Overloaded */}
              {selectedHeatmapCell.weekLoad.utilizationPercent > 100 && (
                <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 space-y-2 text-rose-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="font-bold">Capacity Bottleneck Alert</span>
                  </div>
                  <p className="text-[11px] text-rose-300/80 leading-relaxed">
                    This team member is overloaded by {selectedHeatmapCell.weekLoad.varianceHours} hours in this period. Consider reallocating tasks to bench talent.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedHeatmapCell(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Card Modal */}
      {selectedStakeholderForReportCard && (
        <IndividualReportCardModal
          isOpen={Boolean(selectedStakeholderForReportCard)}
          onClose={() => setSelectedStakeholderForReportCard(null)}
          stakeholder={selectedStakeholderForReportCard}
          onOpenTaskModal={onOpenTaskModal}
        />
      )}

      {/* Stakeholder Edit Modal */}
      {isStakeholderModalOpen && (
        <StakeholderModal
          isOpen={isStakeholderModalOpen}
          onClose={() => {
            setIsStakeholderModalOpen(false);
            setStakeholderToEdit(null);
          }}
          stakeholderToEdit={stakeholderToEdit}
          onOpenInviteModal={onOpenInviteModal}
        />
      )}

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <InviteMemberModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          defaultEmail={inviteModalData.email}
          defaultName={inviteModalData.name}
          defaultRole={inviteModalData.role}
          defaultCategory={inviteModalData.category}
          stakeholderId={inviteModalData.stakeholderId}
        />
      )}

      {/* PM Assign Project Modal */}
      {isPMAssignModalOpen && (
        <PMAssignProjectModal
          isOpen={isPMAssignModalOpen}
          onClose={() => setIsPMAssignModalOpen(false)}
          pmsList={pmPerformanceList}
          projectsList={projectsArray.map(p => ({
            id: p.id,
            projectName: p.projectName,
            projectCode: p.projectCode,
            description: p.description || '',
            budget: p.budget || 0,
            startDate: p.startDate || '',
            targetEndDate: p.targetEndDate || '',
            taskCount: (p.tasks || []).length
          }))}
          onAssignPM={assignProjectManager}
        />
      )}

      {/* Leave Request Modal */}
      {isLeaveModalOpen && (
        <LeaveRequestModal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          preselectedUserId={selectedUserForLeave}
        />
      )}
    </div>
  );
};
