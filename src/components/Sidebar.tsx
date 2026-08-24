import React, { useState, useEffect } from 'react';
import { ViewMode } from '../types';
import { useProject } from '../context/ProjectContext';
import {
  LayoutDashboard,
  Award,
  Network,
  GanttChart,
  BarChart3,
  Users,
  ShieldAlert,
  FileText,
  History,
  GitPullRequest,
  FolderKanban,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  User,
  Zap,
  ChevronRight,
  Layers,
  ShieldCheck,
  Briefcase,
  Key,
  Sparkles,
  MessagesSquare,
  Building2,
  CalendarDays,
  Command,
  Search
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  openTasksCount: number;
  openRisksCount: number;
  pendingCRCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenAiSettingsModal?: () => void;
  onOpenUserModal?: () => void;
  onOpenCommandPalette?: () => void;
}

interface MenuItem {
  id: ViewMode;
  label: string;
  shortLabel?: string;
  category: 'core' | 'team' | 'governance' | 'analytics' | 'admin';
  icon: React.ReactNode;
  badge?: number;
  badgeColor?: string;
  pmOnly?: boolean;
  adminOnly?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  openTasksCount,
  openRisksCount,
  pendingCRCount,
  isCollapsed: externalIsCollapsed,
  onToggleCollapse: externalOnToggleCollapse,
  onOpenAiSettingsModal,
  onOpenUserModal,
  onOpenCommandPalette
}) => {
  const { currentUser, projectData, customAiConfig, leaves } = useProject();
  const isAdmin = currentUser.role === 'admin';
  const isPM = currentUser.role === 'pm';
  
  // Calculate role-scoped pending leaves count for sidebar badge:
  const pendingLeavesCount = (leaves || []).filter(l => {
    if (l.status !== 'pending') return false;
    if (isAdmin) return true; // Admin sees all pending
    if (isPM) {
      // PM only counts team members' pending leaves (PM leaves route to Admin)
      const isSelf = l.userId === currentUser.id || (l.userEmail || '').toLowerCase() === (currentUser.email || '').toLowerCase();
      const isApplicantPM = l.applicantRole === 'pm' || (l.role || '').toLowerCase().includes('pm') || (l.role || '').toLowerCase().includes('project manager');
      return !isSelf && !isApplicantPM;
    }
    return l.userId === currentUser.id;
  }).length;

  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [optimisticView, setOptimisticView] = useState<ViewMode | null>(null);

  useEffect(() => {
    setOptimisticView(null);
  }, [currentView]);

  const rawActiveView = optimisticView || currentView;
  const activeView = rawActiveView === 'workload' ? 'stakeholders' : rawActiveView;

  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalCollapsed;
  const toggleCollapse = externalOnToggleCollapse || (() => setInternalCollapsed(!internalCollapsed));

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileDrawerOpen]);

  // Handle keyboard shortcut for collapsing sidebar (Cmd/Ctrl + B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCollapse]);

  const rawMenuItems: MenuItem[] = [
    ...(isAdmin ? [{
      id: 'admin_portfolio' as ViewMode,
      label: 'Portfolio & Operations',
      shortLabel: 'Admin Hub',
      category: 'admin' as const,
      adminOnly: true,
      icon: <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
    }] : []),
    {
      id: 'dashboard',
      label: 'Executive Dashboard',
      shortLabel: 'Executive',
      category: 'core',
      pmOnly: true,
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />
    },
    ...(!isAdmin ? [{
      id: 'member_dashboard' as ViewMode,
      label: isPM ? 'Member Report Cards' : 'My Work & Performance',
      shortLabel: isPM ? 'Cards' : 'My Work',
      category: 'core' as const,
      icon: <Award className="w-4 h-4 shrink-0" />
    }] : []),
    ...(!isAdmin ? [
      {
        id: 'wbs' as ViewMode,
        label: 'WBS & Tasks',
        shortLabel: 'WBS',
        category: 'core' as const,
        icon: <Network className="w-4 h-4 shrink-0" />,
        badge: openTasksCount,
        badgeColor: 'bg-indigo-500 text-white font-bold border-indigo-400 shadow-sm'
      },
      {
        id: 'gantt' as ViewMode,
        label: 'Gantt Timeline',
        shortLabel: 'Gantt',
        category: 'core' as const,
        icon: <GanttChart className="w-4 h-4 shrink-0" />
      }
    ] : []),
    {
      id: 'project_board',
      label: 'Project Board',
      shortLabel: 'Board',
      category: 'core',
      pmOnly: true,
      icon: <FolderKanban className="w-4 h-4 shrink-0" />
    },
    {
      id: 'stakeholders',
      label: 'Team & Workload',
      shortLabel: 'Team & Workload',
      category: 'team',
      pmOnly: true,
      icon: <Users className="w-4 h-4 shrink-0" />
    },
    {
      id: 'leave_management',
      label: 'Leave & Availability',
      shortLabel: 'Leaves',
      category: 'team',
      pmOnly: true,
      icon: <CalendarDays className="w-4 h-4 shrink-0" />,
      badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined,
      badgeColor: 'bg-amber-400 text-slate-950 font-bold border-amber-300 shadow-sm'
    },
    {
      id: 'chat',
      label: 'Team Chat',
      shortLabel: 'Chat',
      category: 'team',
      icon: <MessagesSquare className="w-4 h-4 shrink-0" />,
      badge: (projectData.boardMessages || []).length > 0 ? (projectData.boardMessages || []).length : undefined,
      badgeColor: 'bg-indigo-500 text-white font-bold border-indigo-400 shadow-sm'
    },
    {
      id: 'governance',
      label: 'Governance & Readiness',
      shortLabel: 'Governance',
      category: 'governance',
      pmOnly: true,
      icon: <ShieldCheck className="w-4 h-4 shrink-0" />
    },
    {
      id: 'raid',
      label: 'RAID Management',
      shortLabel: 'RAID',
      category: 'governance',
      icon: <ShieldAlert className="w-4 h-4 shrink-0" />,
      badge: openRisksCount,
      badgeColor: 'bg-rose-500 text-white font-bold border-rose-400 shadow-sm'
    },
    {
      id: 'change',
      label: 'Change Control',
      shortLabel: 'Change',
      category: 'governance',
      icon: <GitPullRequest className="w-4 h-4 shrink-0" />,
      badge: pendingCRCount,
      badgeColor: 'bg-amber-400 text-slate-950 font-bold border-amber-300 shadow-sm'
    },
    {
      id: 'reports',
      label: 'AI Reports & Advisor',
      shortLabel: 'Reports',
      category: 'analytics',
      icon: <FileText className="w-4 h-4 shrink-0" />
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      shortLabel: 'Audit',
      category: 'analytics',
      icon: <History className="w-4 h-4 shrink-0" />
    }
  ];

  const menuItems = rawMenuItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.pmOnly && !isPM) return false;
    return true;
  });

  const totalBadges = (openTasksCount || 0) + (openRisksCount || 0) + (pendingCRCount || 0);

  const categories = [
    ...(isAdmin ? [{ key: 'admin', name: 'Executive Operations' }] : []),
    { key: 'core', name: 'Core Workspace' },
    { key: 'team', name: 'Team & Directory' },
    { key: 'governance', name: 'PMI Governance' },
    { key: 'analytics', name: 'Analytics & Logs' }
  ];

  const handleSelect = (view: ViewMode) => {
    setOptimisticView(view);
    React.startTransition(() => {
      onSelectView(view);
      setMobileDrawerOpen(false);
    });
  };

  const currentActiveItem = menuItems.find(m => m.id === activeView) || menuItems[0];

  return (
    <>
      {/* 📱 MOBILE NAVIGATION BAR (Visible on < md screens) */}
      <div className="md:hidden bg-slate-900/95 border-b border-slate-800/90 px-2 sm:px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 z-30 min-w-0">
        {/* Mobile View Selector Pills */}
        <div className="relative flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 pr-2">
            {menuItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-colors duration-75 select-none outline-none focus:outline-none ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                      : 'bg-slate-950/80 text-slate-300 hover:text-white hover:bg-slate-800/80 active:bg-indigo-600 active:text-white border border-slate-800/90'
                  }`}
                >
                  <span className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {item.icon}
                  </span>
                  <span className="whitespace-nowrap text-xs">{item.shortLabel || item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded-full ${
                      isActive ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Full Menu Drawer Trigger */}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="relative p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 shrink-0 flex items-center gap-1.5 text-xs font-semibold shadow-sm active:scale-95 transition-all"
          title="Open Navigation Menu"
        >
          <Menu className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="hidden sm:inline">All Views</span>
          {totalBadges > 0 && (
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
          )}
        </button>
      </div>

      {/* 📱 MOBILE SLIDE-OUT DRAWER OVERLAY */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Sheet */}
          <div className="relative bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl z-10 overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Header Bar */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Project Navigation</h3>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <span>Role:</span>
                    <span className="text-indigo-400 font-semibold uppercase">{currentUser.role === 'pm' ? 'Project Manager' : currentUser.role}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu List */}
            <div className="p-4 overflow-y-auto space-y-4 custom-scrollbar">
              {categories.map((cat) => {
                const catItems = menuItems.filter(m => m.category === cat.key);
                if (catItems.length === 0) return null;

                return (
                  <div key={cat.key} className="space-y-1.5">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
                      {cat.name}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {catItems.map((item) => {
                        const isActive = activeView === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelect(item.id)}
                            className={`flex items-center justify-between p-3 rounded-2xl text-xs font-medium transition-colors duration-75 select-none outline-none focus:outline-none ${
                              isActive
                                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                                : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800 active:bg-indigo-600 active:text-white border border-slate-800/80'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={isActive ? 'text-white' : 'text-indigo-400'}>
                                {item.icon}
                              </span>
                              <span>{item.label}</span>
                            </div>
                            {item.badge !== undefined && item.badge > 0 && (
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${item.badgeColor || 'bg-slate-800 text-slate-200'}`}>
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drawer Footer User Info */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full border border-indigo-400 object-cover shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-200 truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono text-[10px] font-bold">
                ApexPM v2.6
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 💻 DESKTOP SIDEBAR (Visible on md+ screens) */}
      <aside
        id="app-sidebar"
        className={`hidden md:flex flex-col bg-slate-900 dark:bg-slate-950 border-r border-slate-800/80 p-2.5 shrink-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-56 lg:w-60'
        } sticky top-14 h-[calc(100vh-3.5rem)]`}
      >
        {/* Header Toggle */}
        <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 mb-2">
          {!isCollapsed && (
            <span className="flex items-center gap-1.5 text-slate-300 font-bold">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Views & Tools</span>
            </span>
          )}
          <button
            onClick={toggleCollapse}
            className={`p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all ${
              isCollapsed ? 'mx-auto' : 'ml-auto'
            }`}
            title={isCollapsed ? 'Expand Sidebar (⌘B)' : 'Collapse Sidebar (⌘B)'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-indigo-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>

        {/* Quick Command Palette Button */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            title="Command Palette & Quick Search (Ctrl+K)"
            className={`flex items-center gap-2 px-2.5 py-2 mb-2 rounded-xl bg-slate-950/60 hover:bg-indigo-600/10 border border-slate-800/80 hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all group shrink-0 ${
              isCollapsed ? 'justify-center px-0' : 'justify-between'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Command className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
              {!isCollapsed && (
                <span className="text-xs font-medium truncate text-slate-300 group-hover:text-slate-100">
                  Command Palette
                </span>
              )}
            </div>
            {!isCollapsed && (
              <kbd className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700/60 shrink-0">
                ⌘K
              </kbd>
            )}
          </button>
        )}

        {/* Grouped Category Navigation - Smoothly Scrollable Menu List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-0">
          {categories.map((cat) => {
            const catItems = menuItems.filter(m => m.category === cat.key);
            if (catItems.length === 0) return null;

            return (
              <div key={cat.key} className="space-y-1">
                {!isCollapsed && (
                  <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/80 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60 shrink-0" />
                    <span className="truncate">{cat.name}</span>
                  </div>
                )}

                {catItems.map((item) => {
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`nav-item-${item.id}`}
                      onClick={() => handleSelect(item.id)}
                      title={isCollapsed ? `${item.label} ${item.badge ? `(${item.badge})` : ''}` : undefined}
                      className={`relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors duration-75 select-none outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                        isCollapsed ? 'justify-center px-0' : ''
                      } ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 active:bg-indigo-600 active:text-white'
                      }`}
                    >
                      <span className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                        {item.icon}
                      </span>
                      {!isCollapsed && (
                        <span className="truncate leading-tight min-w-0 flex-1 text-left">{item.label}</span>
                      )}

                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`${
                            isCollapsed
                              ? 'absolute -top-1 -right-1'
                              : 'ml-auto shrink-0'
                          } text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${item.badgeColor || 'bg-slate-700 text-slate-300'}`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Desktop Footer System & Active Role Info Card */}
        <div className="border-t border-slate-800/80 pt-3 space-y-2 shrink-0 mt-auto">
          {onOpenAiSettingsModal && (
            <button
              onClick={onOpenAiSettingsModal}
              title="Configure Custom AI API Key (Gemini, OpenAI, Claude, DeepSeek, Groq)"
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isCollapsed ? 'justify-center px-0' : ''
              } ${
                customAiConfig?.enabled && customAiConfig?.apiKey
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Key className="w-4 h-4 text-amber-400 shrink-0" />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">
                    {customAiConfig?.enabled && customAiConfig?.apiKey ? 'Linked AI API' : 'AI API Key'}
                  </span>
                  {customAiConfig?.enabled && customAiConfig?.apiKey && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 ml-1" />
                  )}
                </div>
              )}
            </button>
          )}

          {!isCollapsed ? (
            <div
              onClick={onOpenUserModal}
              className={`p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs ${
                onOpenUserModal ? 'cursor-pointer hover:border-indigo-500/50 hover:bg-slate-900 transition-all' : ''
              }`}
              title="Click to Edit Profile & Account Settings"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-6 h-6 rounded-full border border-indigo-400 object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-200 truncate text-xs">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {currentUser.role === 'admin' ? 'Executive Admin' : currentUser.role === 'pm' ? 'Project Manager' : 'Team Member'}
                  </p>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                  currentUser.role === 'admin'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : isPM
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {currentUser.role === 'admin' ? 'Admin' : isPM ? 'PM' : 'Team'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/80 pt-1.5 mt-1.5">
                <span className="font-semibold text-slate-400">ApexPM v2.6</span>
                <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> PMI Ready
                </span>
              </div>
            </div>
          ) : (
            <div
              onClick={onOpenUserModal}
              className={`text-center ${onOpenUserModal ? 'cursor-pointer hover:opacity-80' : ''}`}
              title={`Edit Profile: ${currentUser.name} (${currentUser.role})`}
            >
              <div className="w-8 h-8 rounded-full border border-indigo-400/60 mx-auto overflow-hidden shadow-sm">
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              </div>
              <span className="text-[9px] font-mono text-indigo-400 font-bold block mt-1">v2.6</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};


