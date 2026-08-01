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
  MessagesSquare
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
}

interface MenuItem {
  id: ViewMode;
  label: string;
  shortLabel?: string;
  category: 'core' | 'team' | 'governance' | 'analytics';
  icon: React.ReactNode;
  badge?: number;
  badgeColor?: string;
  pmOnly?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  openTasksCount,
  openRisksCount,
  pendingCRCount,
  isCollapsed: externalIsCollapsed,
  onToggleCollapse: externalOnToggleCollapse,
  onOpenAiSettingsModal
}) => {
  const { currentUser, projectData, customAiConfig } = useProject();
  const isPM = currentUser.role === 'pm';

  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [optimisticView, setOptimisticView] = useState<ViewMode | null>(null);

  useEffect(() => {
    setOptimisticView(null);
  }, [currentView]);

  const activeView = optimisticView || currentView;

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
    {
      id: 'dashboard',
      label: 'Executive Dashboard',
      shortLabel: 'Executive',
      category: 'core',
      pmOnly: true,
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />
    },
    {
      id: 'member_dashboard',
      label: isPM ? 'Member Report Cards' : 'My Work & Performance',
      shortLabel: isPM ? 'Cards' : 'My Work',
      category: 'core',
      icon: <Award className="w-4 h-4 shrink-0" />
    },
    {
      id: 'wbs',
      label: 'WBS & Tasks',
      shortLabel: 'WBS',
      category: 'core',
      icon: <Network className="w-4 h-4 shrink-0" />,
      badge: openTasksCount,
      badgeColor: 'bg-indigo-500 text-white font-bold border-indigo-400 shadow-sm'
    },
    {
      id: 'gantt',
      label: 'Gantt Timeline',
      shortLabel: 'Gantt',
      category: 'core',
      icon: <GanttChart className="w-4 h-4 shrink-0" />
    },
    {
      id: 'project_board',
      label: 'Project Board',
      shortLabel: 'Board',
      category: 'core',
      icon: <FolderKanban className="w-4 h-4 shrink-0" />
    },
    {
      id: 'workload',
      label: 'Workload & Capacity',
      shortLabel: 'Workload',
      category: 'team',
      pmOnly: true,
      icon: <BarChart3 className="w-4 h-4 shrink-0" />
    },
    {
      id: 'stakeholders',
      label: 'Stakeholders & Team',
      shortLabel: 'Team',
      category: 'team',
      icon: <Users className="w-4 h-4 shrink-0" />
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

  const menuItems = rawMenuItems.filter(item => !item.pmOnly || isPM);

  const totalBadges = (openTasksCount || 0) + (openRisksCount || 0) + (pendingCRCount || 0);

  const categories = [
    { key: 'core', name: 'Core Workspace' },
    { key: 'team', name: 'Team & Capacity' },
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
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 mb-1.5">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-6 h-6 rounded-full border border-indigo-400 object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-200 truncate text-xs">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{currentUser.role === 'pm' ? 'Project Manager' : 'Team Member'}</p>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                  isPM ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {isPM ? 'PM' : 'Team'}
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
            <div className="text-center">
              <div className="w-8 h-8 rounded-full border border-indigo-400/60 mx-auto overflow-hidden shadow-sm" title={`${currentUser.name} (${currentUser.role})`}>
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


