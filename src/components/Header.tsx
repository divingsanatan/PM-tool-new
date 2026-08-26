import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useProject } from '../context/ProjectContext';
import { ViewMode, Task, RaidItem, Stakeholder } from '../types';
import { ProjectManagementModal } from './modals/ProjectManagementModal';
import { UserAuthModal } from './modals/UserAuthModal';
import {
  Briefcase,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  Plus,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Users,
  Search,
  X,
  CheckSquare,
  ArrowRight,
  ChevronDown,
  FolderKanban,
  GanttChart,
  UserCheck,
  Zap,
  LogOut,
  Mail,
  MoreVertical,
  Key,
  Database,
  Check,
  FolderPlus,
  Layers,
  Pencil
} from 'lucide-react';

interface HeaderProps {
  onOpenTaskModal: (task?: Task) => void;
  onOpenRaidModal: (item?: RaidItem) => void;
  onOpenStakeholderModal: (stakeholder?: Stakeholder) => void;
  onOpenInviteModal?: (email?: string) => void;
  onOpenAiReportModal: () => void;
  onOpenAiSettingsModal?: () => void;
  onOpenSupabaseModal?: () => void;
  onSelectView?: (view: ViewMode) => void;
  onOpenCommandPalette?: (initialQuery?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenTaskModal,
  onOpenRaidModal,
  onOpenStakeholderModal,
  onOpenInviteModal,
  onOpenAiReportModal,
  onOpenAiSettingsModal,
  onOpenSupabaseModal,
  onSelectView,
  onOpenCommandPalette
}) => {
  const { projectData, projectsList, allProjectsMap, leaves, activeProjectId, switchProject, currentUser, logout, isOffline, isWsConnected, theme, toggleTheme, resetToDefault, customAiConfig } = useProject();
  const isAdmin = currentUser?.role === 'admin';
  const isPM = currentUser?.role === 'pm';
  const isPrivileged = isAdmin || isPM;
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [editTargetProjectId, setEditTargetProjectId] = useState<string | null>(null);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Helper to determine if current logged-in user is a stakeholder / PM in a specific project
  const getProjectMembership = (projectId: string) => {
    const pData = (allProjectsMap && allProjectsMap[projectId]) || (projectId === projectData.id ? projectData : null);
    if (!pData) return { isMember: false, isPMLoggedIn: false, roleBadge: null };

    const currentEmail = (currentUser?.email || '').toLowerCase();
    const currentId = currentUser?.id;

    const isPMForProject = pData.projectManagerId === currentId ||
      (pData.projectManagerEmail && pData.projectManagerEmail.toLowerCase() === currentEmail);

    const isStakeholder = (pData.stakeholders || []).some(
      s => s.id === currentId || (s.email && s.email.toLowerCase() === currentEmail)
    );

    const hasAssignedTasks = (pData.tasks || []).some(
      t => (t.assigneeIds || []).includes(currentId)
    );

    const isMember = isPMForProject || isStakeholder || hasAssignedTasks;

    let roleBadge = null;
    if (isAdmin) {
      roleBadge = 'Portfolio';
    } else if (isPMForProject) {
      roleBadge = 'Project Lead';
    } else if (isStakeholder || hasAssignedTasks) {
      roleBadge = 'My Project';
    }

    return { isMember, isPMForProject, roleBadge };
  };

  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const projectSelectorContainerRef = useRef<HTMLDivElement>(null);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchDropdownPos, setSearchDropdownPos] = useState({ top: 0, left: 0, width: 340 });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobilePortalRef = useRef<HTMLDivElement>(null);

  // Update position of search dropdown on focus/resize/scroll
  const updateSearchPosition = () => {
    if (searchContainerRef.current) {
      const rect = searchContainerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const isMobile = viewportWidth < 640;
      
      // Calculate responsive width and boundary constraints for mobile/desktop
      const dropdownWidth = isMobile
        ? Math.max(280, viewportWidth - 24)
        : Math.min(Math.max(360, rect.width), Math.min(540, viewportWidth - 24));

      const leftPos = isMobile
        ? 12
        : Math.max(12, Math.min(rect.left, viewportWidth - dropdownWidth - 12));

      setSearchDropdownPos({
        top: Math.max(48, rect.bottom + 8),
        left: leftPos,
        width: dropdownWidth
      });
    }
  };

  useEffect(() => {
    if (isSearchFocused) {
      updateSearchPosition();
      window.addEventListener('resize', updateSearchPosition);
      window.addEventListener('scroll', updateSearchPosition, true);
    }
    return () => {
      window.removeEventListener('resize', updateSearchPosition);
      window.removeEventListener('scroll', updateSearchPosition, true);
    };
  }, [isSearchFocused, searchQuery]);

  // Global Keyboard Shortcut (Cmd/Ctrl + K or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (onOpenCommandPalette) {
          onOpenCommandPalette();
        } else {
          searchInputRef.current?.focus();
          updateSearchPosition();
          setIsSearchFocused(true);
        }
      } else if (e.key === 'Escape') {
        setIsSearchFocused(false);
        setIsMobileMenuOpen(false);
        setIsProjectDropdownOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenCommandPalette]);

  // Click & Touch Outside to Close Search, Mobile & Project Dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        searchContainerRef.current && 
        !searchContainerRef.current.contains(target) &&
        (!searchDropdownRef.current || !searchDropdownRef.current.contains(target))
      ) {
        setIsSearchFocused(false);
      }
      if (
        projectSelectorContainerRef.current &&
        !projectSelectorContainerRef.current.contains(target) &&
        (!projectDropdownRef.current || !projectDropdownRef.current.contains(target))
      ) {
        setIsProjectDropdownOpen(false);
      }
      if (
        mobileMenuRef.current && 
        !mobileMenuRef.current.contains(target) &&
        (!mobilePortalRef.current || !mobilePortalRef.current.contains(target))
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Safe Filter Data
  const query = searchQuery.trim().toLowerCase();
  const matchingTasks = query && projectData?.tasks
    ? projectData.tasks.filter(
        t =>
          (t.title || '').toLowerCase().includes(query) ||
          (t.description || '').toLowerCase().includes(query) ||
          (t.status || '').toLowerCase().includes(query) ||
          (t.priority || '').toLowerCase().includes(query)
      )
    : [];

  const matchingRaid = query && projectData?.raidItems
    ? projectData.raidItems.filter(
        r =>
          (r.title || '').toLowerCase().includes(query) ||
          (r.description || '').toLowerCase().includes(query) ||
          (r.type || '').toLowerCase().includes(query) ||
          (r.status || '').toLowerCase().includes(query)
      )
    : [];

  const matchingStakeholders = query && projectData?.stakeholders
    ? projectData.stakeholders.filter(
        s =>
          (s.name || '').toLowerCase().includes(query) ||
          (s.role || '').toLowerCase().includes(query) ||
          (s.department || '').toLowerCase().includes(query) ||
          (s.email || '').toLowerCase().includes(query)
      )
    : [];

  const totalResults = matchingTasks.length + matchingRaid.length + matchingStakeholders.length;
  const showResultsDropdown = isSearchFocused;

  return (
    <>
      <header id="app-header" className="w-full max-w-full bg-slate-900/95 dark:bg-slate-950/95 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-40 px-2 sm:px-3 md:px-4 py-2 text-slate-100 flex items-center justify-between gap-1.5 sm:gap-2 transition-colors min-w-0">
        {/* App Branding & Multi-Project Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>

          {/* Project Selector Trigger & Quick Switch Dropdown */}
          <div ref={projectSelectorContainerRef} className="relative shrink min-w-0">
            <button
              id="btn-project-selector"
              onClick={() => setIsProjectDropdownOpen(prev => !prev)}
              className="group text-left px-2 sm:px-2.5 py-1 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-all flex items-center gap-1 shrink min-w-0 max-w-[95px] xs:max-w-[125px] sm:max-w-[165px] md:max-w-[195px] lg:max-w-[220px]"
              title="Click to Switch Project or Manage Portfolio"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 min-w-0">
                  <h1 className="font-bold text-xs sm:text-sm text-slate-100 tracking-tight leading-none group-hover:text-indigo-300 transition-colors truncate min-w-0">
                    {projectData.projectName || 'Apex Project'}
                  </h1>
                  <span className="hidden 2xl:inline-block text-[9px] px-1 py-0.5 rounded bg-slate-950 text-indigo-300 font-mono border border-slate-800 shrink-0">
                    {projectData.projectCode}
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform shrink-0 ${isProjectDropdownOpen ? 'rotate-180 text-indigo-400' : ''}`} />
            </button>

            {/* Quick Project Switch Dropdown Menu */}
            {isProjectDropdownOpen && (
              <div
                ref={projectDropdownRef}
                className="absolute left-0 top-full mt-1.5 w-64 sm:w-72 max-w-[calc(100vw-1.5rem)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-2 animate-fade-in space-y-1.5"
              >
                <div className="px-2.5 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Switch Project ({projectsList.length})</span>
                  <span className="text-[10px] text-emerald-400 font-normal">Instant Multi-Project Sync</span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1.5 custom-scrollbar pr-0.5">
                  {projectsList.map(proj => {
                    const isActive = proj.id === activeProjectId || proj.id === projectData.id;
                    const { isMember, isPMForProject, roleBadge } = getProjectMembership(proj.id);

                    return (
                      <button
                        key={proj.id}
                        onClick={() => {
                          switchProject(proj.id);
                          setIsProjectDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-2 border ${
                          isActive
                            ? 'bg-indigo-950/60 border-indigo-500/50 text-slate-100 shadow-sm ring-1 ring-indigo-500/30'
                            : 'bg-slate-950/40 hover:bg-slate-800/80 border-slate-800/60 text-slate-300 hover:text-white'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs truncate">{proj.projectName}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-indigo-300 border border-slate-800 shrink-0">
                              {proj.projectCode}
                            </span>
                            {/* User Assignment Status Badge */}
                            {roleBadge && (
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium shrink-0 border ${
                                isAdmin
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  : isPMForProject
                                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              }`}>
                                {isAdmin ? '👑 Portfolio' : isPMForProject ? '👔 Lead PM' : '✓ My Project'}
                              </span>
                            )}
                          </div>
                          {proj.description && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{proj.description}</p>
                          )}
                        </div>

                        {isActive && (
                          <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1.5 border-t border-slate-800 space-y-1">
                  <button
                    onClick={() => {
                      setIsProjectDropdownOpen(false);
                      setEditTargetProjectId(projectData.id);
                      setIsProjectsModalOpen(true);
                    }}
                    className="w-full p-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700/80 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Edit Current Project Details</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsProjectDropdownOpen(false);
                      setEditTargetProjectId(null);
                      setIsProjectsModalOpen(true);
                    }}
                    className="w-full p-2 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Manage Portfolio & Create Project</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Search Bar (Responsive Width & Instant Palette Opener) */}
        <div
          ref={searchContainerRef}
          onClick={() => {
            if (onOpenCommandPalette) {
              onOpenCommandPalette(searchQuery);
            } else {
              searchInputRef.current?.focus();
            }
          }}
          className="relative flex-1 min-w-0 max-w-xl mx-1 sm:mx-2 cursor-pointer group"
        >
          <div className={`relative flex items-center min-w-0 rounded-xl transition-all ${
            isSearchFocused
              ? 'ring-2 ring-indigo-500/80 bg-slate-950 shadow-lg shadow-indigo-500/10'
              : 'bg-slate-950/80 hover:bg-slate-950 border border-slate-800/80 group-hover:border-slate-700'
          }`}>
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400/80 group-hover:text-indigo-400 absolute left-2.5 pointer-events-none shrink-0 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              readOnly={!!onOpenCommandPalette}
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                if (onOpenCommandPalette) {
                  onOpenCommandPalette(e.target.value);
                }
              }}
              onFocus={() => {
                if (onOpenCommandPalette) {
                  onOpenCommandPalette(searchQuery);
                } else {
                  setIsSearchFocused(true);
                  updateSearchPosition();
                }
              }}
              placeholder="Search tasks, RAID, team (⌘K)..."
              className="w-full bg-transparent pl-8 sm:pl-9 pr-10 sm:pr-14 py-1.5 text-base sm:text-xs text-slate-200 placeholder-slate-400 outline-none shadow-inner truncate cursor-pointer"
            />
            {searchQuery && !onOpenCommandPalette ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 p-0.5 text-slate-400 hover:text-white rounded shrink-0"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 absolute right-2 text-[10px] text-slate-400 bg-slate-900 border border-slate-700/80 px-1.5 py-0.5 rounded font-mono shrink-0 pointer-events-none group-hover:text-indigo-300 group-hover:border-indigo-500/40 transition-colors">
                ⌘K
              </kbd>
            )}
          </div>

          {/* Global Search Overlay Dropdown (Portal) */}
          {showResultsDropdown && createPortal(
            <>
              {/* Mobile backdrop overlay for seamless touch dismissal */}
              <div
                className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[2px] sm:hidden"
                onClick={() => setIsSearchFocused(false)}
              />
              <div
                ref={searchDropdownRef}
                className="fixed z-[9999] bg-slate-900/98 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 max-w-[calc(100vw-24px)] box-border"
                style={{
                  top: `${searchDropdownPos.top}px`,
                  ...(typeof window !== 'undefined' && window.innerWidth < 640
                    ? {
                        left: '12px',
                        right: '12px',
                        width: 'calc(100vw - 24px)',
                      }
                    : {
                        left: `${searchDropdownPos.left}px`,
                        width: `${searchDropdownPos.width}px`,
                      }),
                  maxHeight: 'calc(100vh - 100px)'
                }}
                onMouseDown={e => e.preventDefault()} // Keep focus on input when clicking inside dropdown
                onTouchStart={e => e.stopPropagation()}
              >
              <div className="p-3 bg-slate-950/80 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                {query ? (
                  <span>
                    Found <strong className="text-slate-200">{totalResults}</strong> result{totalResults !== 1 ? 's' : ''} for "{searchQuery}"
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Quick Search & Navigation
                  </span>
                )}
                <span className="text-[10px] text-slate-500 font-mono">Esc to close</span>
              </div>

              <div className="overflow-y-auto p-2 space-y-3 divide-y divide-slate-800/60 max-h-[60vh]">
                {!query ? (
                  /* Initial Empty Search Helper & Shortcuts */
                  <div className="p-2 space-y-2">
                    <p className="text-[11px] text-slate-400 px-1">
                      Start typing to search tasks, RAID items, and team members across all project modules.
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {onSelectView && (
                        <>
                          {isAdmin ? (
                            <button
                              onClick={() => {
                                onSelectView('admin_portfolio');
                                setIsSearchFocused(false);
                              }}
                              className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-xs text-slate-200 text-left transition-colors"
                            >
                              <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="truncate">Admin Operations</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                onSelectView('wbs');
                                setIsSearchFocused(false);
                              }}
                              className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-xs text-slate-200 text-left transition-colors"
                            >
                              <CheckSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span className="truncate">WBS & Work Items</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              onSelectView('raid');
                              setIsSearchFocused(false);
                            }}
                            className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-xs text-slate-200 text-left transition-colors"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">RAID Log & Risks</span>
                          </button>
                          {isPM && (
                            <button
                              onClick={() => {
                                onSelectView('stakeholders');
                                setIsSearchFocused(false);
                              }}
                              className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-xs text-slate-200 text-left transition-colors"
                            >
                              <Users className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                              <span className="truncate">Team & Workload</span>
                            </button>
                          )}
                          {isPM && (
                            <button
                              onClick={() => {
                                onSelectView('project_board');
                                setIsSearchFocused(false);
                              }}
                              className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-xs text-slate-200 text-left transition-colors"
                            >
                              <FolderKanban className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                              <span className="truncate">Project Board</span>
                            </button>
                          )}
                          {!isAdmin && (
                            <button
                              onClick={() => {
                                onSelectView('gantt');
                                setIsSearchFocused(false);
                              }}
                              className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-xs text-slate-200 text-left transition-colors"
                            >
                              <GanttChart className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span className="truncate">Gantt Schedule</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ) : totalResults === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs space-y-2">
                    <p className="font-semibold text-slate-300">No matches found for "{searchQuery}"</p>
                    <p className="text-[11px]">Try searching for task titles, descriptions, risk types, or team names.</p>
                  </div>
                ) : (
                  <>
                    {/* Matching Tasks */}
                    {matchingTasks.length > 0 && (
                      <div className="pt-2 first:pt-0 space-y-1">
                        <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-400 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <CheckSquare className="w-3.5 h-3.5" /> Tasks ({matchingTasks.length})
                          </span>
                          {onSelectView && (
                            <button
                              onClick={() => {
                                onSelectView(isAdmin ? 'project_board' : 'wbs');
                                setIsSearchFocused(false);
                              }}
                              className="text-[10px] text-indigo-300 hover:underline flex items-center gap-1 font-normal"
                            >
                              <span>View All</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {matchingTasks.map(task => (
                          <button
                            type="button"
                            key={task.id}
                            onClick={() => {
                              onOpenTaskModal(task);
                              if (onSelectView) onSelectView(isAdmin ? 'project_board' : 'wbs');
                              setIsSearchFocused(false);
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-slate-800 focus-visible:bg-slate-800 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-slate-200 truncate">{task.title}</p>
                              <p className="text-[11px] text-slate-400 truncate">{task.description}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 uppercase">
                                {task.priority}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                {task.status}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Matching RAID Items */}
                    {matchingRaid.length > 0 && (
                      <div className="pt-2 space-y-1">
                        <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-400 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5" /> RAID Items ({matchingRaid.length})
                          </span>
                          {onSelectView && (
                            <button
                              onClick={() => {
                                onSelectView('raid');
                                setIsSearchFocused(false);
                              }}
                              className="text-[10px] text-amber-300 hover:underline flex items-center gap-1 font-normal"
                            >
                              <span>View All</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {matchingRaid.map(item => (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => {
                              onOpenRaidModal(item);
                              if (onSelectView) onSelectView('raid');
                              setIsSearchFocused(false);
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-slate-800 focus-visible:bg-slate-800 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-slate-200 truncate">{item.title}</p>
                              <p className="text-[11px] text-slate-400 truncate">{item.description}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                item.type === 'risk' ? 'bg-rose-500/20 text-rose-300' :
                                item.type === 'issue' ? 'bg-amber-500/20 text-amber-300' :
                                item.type === 'assumption' ? 'bg-purple-500/20 text-purple-300' :
                                'bg-indigo-500/20 text-indigo-300'
                              }`}>
                                {item.type}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                {item.status}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Matching Stakeholders */}
                    {matchingStakeholders.length > 0 && (
                      <div className="pt-2 space-y-1">
                        <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-teal-400 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" /> Stakeholders ({matchingStakeholders.length})
                          </span>
                          {onSelectView && (
                            <button
                              onClick={() => {
                                onSelectView('stakeholders');
                                setIsSearchFocused(false);
                              }}
                              className="text-[10px] text-teal-300 hover:underline flex items-center gap-1 font-normal"
                            >
                              <span>View All</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {matchingStakeholders.map(stakeholder => (
                          <button
                            type="button"
                            key={stakeholder.id}
                            onClick={() => {
                              onOpenStakeholderModal(stakeholder);
                              if (onSelectView) onSelectView('stakeholders');
                              setIsSearchFocused(false);
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-slate-800 focus-visible:bg-slate-800 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-slate-200 truncate">{stakeholder.name}</p>
                              <p className="text-[11px] text-slate-400 truncate">{stakeholder.role} • {stakeholder.department}</p>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono shrink-0">
                              {stakeholder.email}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
        </div>

        {/* Sync Status, Quick Sign Out & Action Bar */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0 min-w-0">
          {/* Quick Sign Out */}
          <button
            id="btn-logout"
            onClick={logout}
            className="hidden xl:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-300 border border-slate-700/60 text-slate-400 text-xs font-semibold transition-colors shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">Sign Out</span>
          </button>

          {/* Sync Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 shrink-0">

            <div
              id="sync-status-badge"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors shrink-0 ${
                isOffline
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : isWsConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
              }`}
            >
              {isOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Offline</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isWsConnected ? 'Live' : 'Connected'}</span>
                </>
              )}
            </div>
          </div>

          {/* AI Executive Summary Launcher */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              id="btn-ai-report"
              onClick={onOpenAiReportModal}
              className="hidden md:flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-sm transition-all shrink-0"
              title="Generate AI Executive Brief"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>AI Brief</span>
            </button>
          </div>

          {/* Quick Add Buttons */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-800/60 p-0.5 sm:p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              id="btn-quick-add-task"
              onClick={() => onOpenTaskModal()}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              title="Add Work Item"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Task</span>
            </button>
            <button
              id="btn-quick-add-raid"
              onClick={() => onOpenRaidModal()}
              className="hidden 2xl:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors"
              title="Log Risk or Issue"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>RAID</span>
            </button>
            {isPM && (
              <>
                <button
                  id="btn-quick-add-member"
                  onClick={() => onOpenStakeholderModal()}
                  className="hidden 2xl:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors"
                  title="Add Stakeholder"
                >
                  <Users className="w-3.5 h-3.5 text-teal-400" />
                  <span>Member</span>
                </button>
                {onOpenInviteModal && (
                  <button
                    id="btn-quick-invite-email"
                    onClick={() => onOpenInviteModal()}
                    className="hidden 2xl:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-teal-300 hover:text-teal-100 hover:bg-teal-500/20 transition-colors bg-teal-500/10 border border-teal-500/20"
                    title="Send Email Invitation to Join Team"
                  >
                    <Mail className="w-3.5 h-3.5 text-teal-400" />
                    <span>Invite Email</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Day / Night Mode Switcher Button */}
          <button
            id="btn-theme-toggle"
            onClick={toggleTheme}
            className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/60 text-xs font-semibold transition-all shadow-sm group shrink-0"
            title={`Switch to ${theme === 'dark' ? 'Day Mode' : 'Night Mode'}`}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform shrink-0" />
                <span className="hidden 2xl:inline text-amber-300 font-medium">Day Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-500 group-hover:-rotate-12 transition-transform shrink-0" />
                <span className="hidden 2xl:inline text-indigo-600 dark:text-indigo-400 font-medium">Night Mode</span>
              </>
            )}
          </button>

          {/* Reset Demo Data Button */}
          <button
            id="btn-reset-demo"
            onClick={() => {
              if (showConfirmReset) {
                resetToDefault();
                setShowConfirmReset(false);
              } else {
                setShowConfirmReset(true);
                setTimeout(() => setShowConfirmReset(false), 4000);
              }
            }}
            className={`hidden 2xl:flex p-1.5 rounded-lg border text-xs transition-colors shrink-0 ${
              showConfirmReset
                ? 'bg-rose-600/30 border-rose-500/50 text-rose-300'
                : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title={showConfirmReset ? 'Click again to confirm resetting demo data' : 'Reset sample data'}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Quick Actions Overflow Menu Trigger (Three Dots) */}
          <div ref={mobileMenuRef} className="relative flex items-center shrink-0 z-20">
            <button
              id="btn-mobile-overflow-menu"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 hover:border-indigo-500/50 text-slate-200 hover:text-white transition-all shrink-0 flex items-center justify-center shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              title="More Options & Quick Actions"
            >
              <MoreVertical className="w-4 h-4 text-slate-200" />
            </button>

            {/* Responsive Quick Actions Side Panel Dropdown */}
            {isMobileMenuOpen && createPortal(
              <div 
                ref={mobilePortalRef}
                className="fixed inset-0 z-[9999] bg-slate-950/45 backdrop-blur-md flex justify-end items-start pr-2 sm:pr-4 animate-in fade-in duration-150"
                style={{
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  paddingTop: 'max(0.75rem, calc(0.75rem + env(safe-area-inset-top, 0px)))',
                  paddingRight: 'max(0.75rem, calc(0.75rem + env(safe-area-inset-right, 0px)))'
                }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div 
                  className="bg-slate-900/95 border border-slate-800/90 rounded-2xl shadow-2xl w-72 sm:w-80 max-w-[calc(100vw-1rem)] p-3.5 space-y-3 max-h-[calc(100vh-2rem)] overflow-y-auto animate-in zoom-in-95 slide-in-from-top-2 duration-150"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Panel Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                    <div>
                      <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        Quick Actions & Settings
                      </h3>
                      <p className="text-[10px] text-slate-400">Project options and controls</p>
                    </div>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      title="Close"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Actions List */}
                  <div className="space-y-1">
                    {/* Command Palette / Search Trigger */}
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenCommandPalette?.();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-100 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Search className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>Search & Command Palette</span>
                      </div>
                      <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-indigo-300 border border-slate-700">⌘K</kbd>
                    </button>

                    <button
                      onClick={() => {
                        onOpenTaskModal();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-200 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 transition-colors text-left"
                    >
                      <Plus className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>Add Work Item / Task</span>
                    </button>

                    <button
                      onClick={() => {
                        onOpenAiReportModal();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-colors text-left"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>Generate AI Executive Brief</span>
                    </button>

                    {onOpenAiSettingsModal && (
                      <button
                        onClick={() => {
                          onOpenAiSettingsModal();
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-colors text-left ${
                          customAiConfig?.enabled && customAiConfig?.apiKey
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-indigo-500/10 text-indigo-200 border-indigo-500/20 hover:bg-indigo-500/20'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Key className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>AI API Key & Model Settings</span>
                        </div>
                        {customAiConfig?.enabled && customAiConfig?.apiKey && (
                          <span className="px-1.5 py-0.5 text-[9px] rounded font-bold bg-emerald-500/20 text-emerald-300">
                            Active
                          </span>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        toggleTheme();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800/80 transition-colors text-left"
                    >
                      {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400 shrink-0" /> : <Moon className="w-4 h-4 text-indigo-400 shrink-0" />}
                      <span>Switch Theme ({theme === 'dark' ? 'Day Mode' : 'Night Mode'})</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserModalOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800/80 transition-colors text-left"
                    >
                      <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Switch Active Role ({currentUser.name})</span>
                    </button>

                    <button
                      onClick={() => {
                        onOpenRaidModal();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800/80 transition-colors text-left"
                    >
                      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Log Risk or Issue (RAID)</span>
                    </button>

                    {isPM && (
                      <>
                        <button
                          onClick={() => {
                            onOpenStakeholderModal();
                            setIsMobileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800/80 transition-colors text-left"
                        >
                          <Users className="w-4 h-4 text-teal-400 shrink-0" />
                          <span>Add Stakeholder</span>
                        </button>

                        {onOpenInviteModal && (
                          <button
                            onClick={() => {
                              onOpenInviteModal();
                              setIsMobileMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-teal-300 hover:bg-teal-500/10 border border-teal-500/20 transition-colors text-left"
                          >
                            <Mail className="w-4 h-4 text-teal-400 shrink-0" />
                            <span>Invite Team Member via Email</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <button
                      onClick={() => {
                        resetToDefault();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/10 transition-colors text-left"
                    >
                      <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Reset Sample Data</span>
                    </button>

                    <button
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>
      </header>

      {/* Embedded Modals */}
      <ProjectManagementModal
        isOpen={isProjectsModalOpen}
        initialEditProjectId={editTargetProjectId}
        onClose={() => {
          setIsProjectsModalOpen(false);
          setEditTargetProjectId(null);
        }}
      />
      <UserAuthModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
      />
    </>
  );
};


