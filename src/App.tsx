import React, { useState } from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { ViewMode, Task, RaidItem, Stakeholder } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { TeamMemberDashboard } from './components/dashboard/TeamMemberDashboard';
import { WbsView } from './components/wbs/WbsView';
import { GanttView } from './components/gantt/GanttView';
import { StakeholdersView } from './components/stakeholders/StakeholdersView';
import { RaidView } from './components/raid/RaidView';
import { ReportsView } from './components/reports/ReportsView';
import { AuditTrailView } from './components/audit/AuditTrailView';
import { ChangeManagementView } from './components/change/ChangeManagementView';
import { GovernanceView } from './components/governance/GovernanceView';
import { ProjectBoardView } from './components/board/ProjectBoardView';
import { ProjectChatView } from './components/chat/ProjectChatView';
import { AdminPortfolioView } from './components/admin/AdminPortfolioView';
import { LeaveManagement } from './components/admin/LeaveManagement';

import { TaskModal } from './components/modals/TaskModal';
import { RaidModal } from './components/modals/RaidModal';
import { StakeholderModal } from './components/modals/StakeholderModal';
import { InviteMemberModal } from './components/modals/InviteMemberModal';
import { AiReportModal } from './components/modals/AiReportModal';
import { AiSettingsModal } from './components/modals/AiSettingsModal';
import { UserAuthModal } from './components/modals/UserAuthModal';
import { SupabaseModal } from './components/modals/SupabaseModal';
import { CommandPaletteModal } from './components/modals/CommandPaletteModal';
import { LoginScreen } from './components/auth/LoginScreen';

function MainLayout() {
  const { projectData, isAuthenticated, currentUser } = useProject();
  const [currentView, setCurrentViewRaw] = useState<ViewMode>('dashboard');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteInitialQuery, setCommandPaletteInitialQuery] = useState('');

  const handleOpenCommandPalette = React.useCallback((initialQuery?: string) => {
    setCommandPaletteInitialQuery(initialQuery || '');
    setIsCommandPaletteOpen(true);
  }, []);

  const handleSelectView = React.useCallback((view: ViewMode) => {
    React.startTransition(() => {
      setCurrentViewRaw(view);
    });
  }, []);

  const isAdmin = currentUser?.role === 'admin';
  const isPM = currentUser?.role === 'pm';

  // Automatically enforce view restrictions for role
  React.useEffect(() => {
    if (!isAdmin && !isPM && (
      currentView === 'dashboard' || 
      currentView === 'project_board' || 
      currentView === 'stakeholders' || 
      currentView === 'workload' || 
      currentView === 'governance' ||
      currentView === 'admin_portfolio'
    )) {
      handleSelectView('member_dashboard');
    }
    if (!isAdmin && currentView === 'admin_portfolio') {
      handleSelectView(isPM ? 'dashboard' : 'member_dashboard');
    }
  }, [isPM, isAdmin, currentView, handleSelectView]);

  // Global Keyboard Shortcuts (Cmd/Ctrl + K or '/')
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }
      
      // Pressing '/' when not typing in an input / textarea / editable element
      if (e.key === '/' && !isCommandPaletteOpen) {
        const target = e.target as HTMLElement;
        const isInput = target && (
          target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.isContentEditable ||
          target.closest('input') ||
          target.closest('textarea')
        );
        if (!isInput) {
          e.preventDefault();
          setIsCommandPaletteOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen]);

  // Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const [isRaidModalOpen, setIsRaidModalOpen] = useState(false);
  const [raidItemToEdit, setRaidItemToEdit] = useState<RaidItem | null>(null);

  const [isStakeholderModalOpen, setIsStakeholderModalOpen] = useState(false);
  const [stakeholderToEdit, setStakeholderToEdit] = useState<Stakeholder | null>(null);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteDefaultEmail, setInviteDefaultEmail] = useState<string>('');

  const [isAiReportModalOpen, setIsAiReportModalOpen] = useState(false);
  const [isAiSettingsModalOpen, setIsAiSettingsModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Quick Open Modal Handlers
  const handleOpenTaskModal = (task?: Task) => {
    setTaskToEdit(task || null);
    setIsTaskModalOpen(true);
  };

  const handleOpenRaidModal = (item?: RaidItem) => {
    setRaidItemToEdit(item || null);
    setIsRaidModalOpen(true);
  };

  const handleOpenStakeholderModal = (stakeholder?: Stakeholder) => {
    setStakeholderToEdit(stakeholder || null);
    setIsStakeholderModalOpen(true);
  };

  const handleOpenInviteModal = (email?: string) => {
    setInviteDefaultEmail(email || '');
    setIsInviteModalOpen(true);
  };

  const openTasksCount = projectData.tasks.filter(t => t.status !== 'done').length;
  const openRisksCount = projectData.raidItems.filter(r => r.status !== 'closed' && r.status !== 'mitigated').length;
  const pendingCRCount = (projectData.changeRequests || []).filter(c => c.status === 'submitted' || c.status === 'under_review').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white max-w-full overflow-x-hidden">
      {/* Top Navigation Header */}
      <Header
        onOpenTaskModal={handleOpenTaskModal}
        onOpenRaidModal={handleOpenRaidModal}
        onOpenStakeholderModal={handleOpenStakeholderModal}
        onOpenInviteModal={handleOpenInviteModal}
        onOpenAiReportModal={() => setIsAiReportModalOpen(true)}
        onOpenAiSettingsModal={() => setIsAiSettingsModalOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onSelectView={handleSelectView}
        onOpenCommandPalette={handleOpenCommandPalette}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 min-w-0 max-w-full overflow-x-hidden">
        {/* Left Side Navigation Bar */}
        <Sidebar
          currentView={currentView}
          onSelectView={handleSelectView}
          openTasksCount={openTasksCount}
          openRisksCount={openRisksCount}
          pendingCRCount={pendingCRCount}
          onOpenAiSettingsModal={() => setIsAiSettingsModalOpen(true)}
          onOpenUserModal={() => setIsUserModalOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* Central View Canvas */}
        <main className="flex-1 p-3 sm:p-4 md:p-5 lg:p-6 overflow-y-auto md:max-h-[calc(100vh-3.5rem)] max-w-[1600px] mx-auto w-full min-w-0 min-h-0">
          {currentView === 'dashboard' && (
            isPM ? (
              <DashboardView
                onNavigate={handleSelectView}
                onOpenAiReportModal={() => setIsAiReportModalOpen(true)}
                onOpenTaskModal={() => handleOpenTaskModal()}
                onOpenRaidModal={() => handleOpenRaidModal()}
              />
            ) : (
              <TeamMemberDashboard onOpenTaskModal={handleOpenTaskModal} />
            )
          )}

          {currentView === 'admin_portfolio' && (
            <AdminPortfolioView
              onSwitchToProjectView={(projId) => handleSelectView('dashboard')}
            />
          )}

          {currentView === 'member_dashboard' && (
            currentUser.role === 'admin' ? (
              <DashboardView
                onNavigate={handleSelectView}
                onOpenAiReportModal={() => setIsAiReportModalOpen(true)}
                onOpenTaskModal={() => handleOpenTaskModal()}
                onOpenRaidModal={() => handleOpenRaidModal()}
              />
            ) : (
              <TeamMemberDashboard onOpenTaskModal={handleOpenTaskModal} />
            )
          )}

          {currentView === 'governance' && (
            isPM ? (
              <GovernanceView onNavigate={handleSelectView} />
            ) : (
              <TeamMemberDashboard onOpenTaskModal={handleOpenTaskModal} />
            )
          )}

          {currentView === 'wbs' && (
            isAdmin ? (
              <AdminPortfolioView
                onSwitchToProjectView={(projId) => handleSelectView('dashboard')}
              />
            ) : (
              <WbsView onOpenTaskModal={handleOpenTaskModal} />
            )
          )}

          {currentView === 'gantt' && (
            isAdmin ? (
              <AdminPortfolioView
                onSwitchToProjectView={(projId) => handleSelectView('dashboard')}
              />
            ) : (
              <GanttView onOpenTaskModal={handleOpenTaskModal} />
            )
          )}

          {currentView === 'workload' && (
            isPM ? (
              <StakeholdersView
                initialTab="workload"
                onOpenStakeholderModal={handleOpenStakeholderModal}
                onOpenInviteModal={handleOpenInviteModal}
              />
            ) : (
              <TeamMemberDashboard onOpenTaskModal={handleOpenTaskModal} />
            )
          )}

          {currentView === 'stakeholders' && (
            isPM ? (
              <StakeholdersView
                initialTab="directory"
                onOpenStakeholderModal={handleOpenStakeholderModal}
                onOpenInviteModal={handleOpenInviteModal}
              />
            ) : (
              <TeamMemberDashboard onOpenTaskModal={handleOpenTaskModal} />
            )
          )}

          {currentView === 'leave_management' && (
            <LeaveManagement
              onNavigateToProject={(projId) => handleSelectView('dashboard')}
            />
          )}

          {currentView === 'raid' && (
            <RaidView onOpenRaidModal={handleOpenRaidModal} />
          )}

          {currentView === 'change' && (
            <ChangeManagementView />
          )}

          {currentView === 'project_board' && (
            isPM ? (
              <ProjectBoardView onNavigate={handleSelectView} />
            ) : (
              <TeamMemberDashboard onOpenTaskModal={handleOpenTaskModal} />
            )
          )}

          {currentView === 'chat' && (
            <ProjectChatView onNavigate={handleSelectView} />
          )}

          {currentView === 'reports' && (
            <ReportsView />
          )}

          {currentView === 'audit' && (
            <AuditTrailView />
          )}
        </main>
      </div>

      {/* Modal Dialogs */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={taskToEdit}
      />

      <RaidModal
        isOpen={isRaidModalOpen}
        onClose={() => setIsRaidModalOpen(false)}
        itemToEdit={raidItemToEdit}
      />

      <StakeholderModal
        isOpen={isStakeholderModalOpen}
        onClose={() => setIsStakeholderModalOpen(false)}
        stakeholderToEdit={stakeholderToEdit}
        onOpenInviteModal={handleOpenInviteModal}
      />

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        defaultEmail={inviteDefaultEmail}
      />

      <AiReportModal
        isOpen={isAiReportModalOpen}
        onClose={() => setIsAiReportModalOpen(false)}
        onOpenAiSettingsModal={() => setIsAiSettingsModalOpen(true)}
      />

      <AiSettingsModal
        isOpen={isAiSettingsModalOpen}
        onClose={() => setIsAiSettingsModalOpen(false)}
      />

      <UserAuthModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
      />

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        initialQuery={commandPaletteInitialQuery}
        onSelectView={handleSelectView}
        onOpenTaskModal={handleOpenTaskModal}
        onOpenRaidModal={handleOpenRaidModal}
        onOpenStakeholderModal={handleOpenStakeholderModal}
        onOpenInviteModal={handleOpenInviteModal}
        onOpenAiReportModal={() => setIsAiReportModalOpen(true)}
        onOpenAiSettingsModal={() => setIsAiSettingsModalOpen(true)}
        onOpenUserModal={() => setIsUserModalOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        currentView={currentView}
      />
    </div>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <MainLayout />
    </ProjectProvider>
  );
}
