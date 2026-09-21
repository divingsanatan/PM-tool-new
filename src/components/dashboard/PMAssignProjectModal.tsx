import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useProject } from '../../context/ProjectContext';
import { CrossProjectPMPerformance } from '../../utils/portfolioAndLeaveUtils';
import { UserProfile } from '../../types';
import {
  X,
  UserCheck,
  Check,
  AlertCircle,
  FolderPlus,
  Users,
  Search,
  UserMinus,
  Shield,
  Briefcase,
  Layers,
  Sparkles,
  Plus,
  Puzzle
} from 'lucide-react';

interface PMAssignProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  pmsList?: CrossProjectPMPerformance[];
  preselectedProjectId?: string;
  preselectedPMId?: string;
}

export const PMAssignProjectModal: React.FC<PMAssignProjectModalProps> = ({
  isOpen,
  onClose,
  preselectedProjectId,
  preselectedPMId
}) => {
  const {
    projectsList,
    allProjectsMap,
    allUsers,
    activeProjectId,
    projectData,
    setProjectManagers,
    assignProjectManager,
    unassignProjectManager,
    createUserAccount
  } = useProject();

  // Mode: 'by_project' (select project -> choose multiple PMs) or 'by_pm' (select PM -> choose multiple projects)
  const [activeMode, setActiveMode] = useState<'by_project' | 'by_pm'>('by_project');

  // PM Filter Tab: 'all' | 'staff' | 'dummy'
  const [pmFilterTab, setPmFilterTab] = useState<'all' | 'staff' | 'dummy'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingDummy, setIsCreatingDummy] = useState(false);
  const [dummyName, setDummyName] = useState('Interim PM (Dummy)');
  const [dummyRate, setDummyRate] = useState('100');

  // Selected entities
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    preselectedProjectId || projectsList[0]?.id || activeProjectId || 'proj-1'
  );
  const [selectedPMId, setSelectedPMId] = useState<string>(
    preselectedPMId || allUsers.find(u => u.role === 'pm' || u.appRole === 'Project Manager')?.id || allUsers[0]?.id || ''
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Comprehensive list of PM users in the organization (including staff, dual PMs, and dummy/placeholder PMs)
  const pmUsers = useMemo(() => {
    const list: UserProfile[] = [];
    const seen = new Set<string>();

    const checkAndAdd = (u: UserProfile) => {
      if (!u || !u.id) return;
      const idLower = u.id.toLowerCase();
      if (seen.has(idLower)) return;

      const roleLower = (u.role || '').toLowerCase();
      const appRoleLower = (u.appRole || '').toLowerCase();
      const titleLower = (u.title || '').toLowerCase();
      const emailLower = (u.email || '').toLowerCase();

      const isPM =
        roleLower === 'pm' ||
        roleLower === 'project manager' ||
        appRoleLower === 'project manager' ||
        titleLower.includes('pm') ||
        titleLower.includes('project manager') ||
        titleLower.includes('scrum') ||
        titleLower.includes('delivery lead') ||
        Boolean(u.isDualPMDev) ||
        Boolean(u.hasPMAccess) ||
        Boolean(u.isPlaceholder) ||
        Boolean(u.isDummy) ||
        emailLower.includes('@placeholder') ||
        roleLower === 'admin' ||
        appRoleLower === 'admin';

      if (isPM) {
        seen.add(idLower);
        list.push(u);
      }
    };

    // 1. Check allUsers
    allUsers.forEach(checkAndAdd);

    // 2. Scan stakeholders across all projects for any PMs or dummy PM placeholders
    const allProjs: any[] = Object.values(allProjectsMap || {});
    if (projectData && !allProjs.some((p: any) => p.id === projectData.id)) {
      allProjs.push(projectData);
    }
    allProjs.forEach((p: any) => {
      (p.stakeholders || []).forEach((sh: any) => {
        const shRoleLower = (sh.role || '').toLowerCase();
        const shAppRoleLower = (sh.appRole || '').toLowerCase();
        const shEmailLower = (sh.email || '').toLowerCase();
        const isShPM =
          shRoleLower.includes('project manager') ||
          shRoleLower.includes('scrum') ||
          shAppRoleLower === 'project manager' ||
          Boolean(sh.isDualPMDev) ||
          Boolean(sh.hasPMAccess) ||
          Boolean(sh.isPlaceholder) ||
          sh.status === 'placeholder' ||
          shEmailLower.includes('@placeholder');

        if (isShPM && !seen.has(sh.id.toLowerCase())) {
          seen.add(sh.id.toLowerCase());
          list.push({
            id: sh.id,
            name: sh.name,
            email: sh.email,
            role: 'Project Manager',
            appRole: 'Project Manager',
            isPlaceholder: Boolean(sh.isPlaceholder || sh.status === 'placeholder' || shEmailLower.includes('@placeholder')),
            isDummy: Boolean(sh.isPlaceholder || sh.status === 'placeholder' || shEmailLower.includes('@placeholder')),
            title: sh.role || 'Project Manager',
            avatar: sh.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
            department: 'PMO (Bench Pool)',
            hourlyRate: sh.hourlyRate || 100,
            weeklyCapacityHours: sh.weeklyCapacityHours || 40,
            skills: sh.skills || ['Project Management', 'Agile']
          });
        }
      });
    });

    return list;
  }, [allUsers, allProjectsMap, projectData]);

  // Filtered PMs based on tab and search
  const filteredPMUsers = useMemo(() => {
    return pmUsers.filter(pm => {
      const isDummy = Boolean(pm.isPlaceholder || pm.isDummy || (pm.email && pm.email.includes('@placeholder')));
      if (pmFilterTab === 'staff' && isDummy) return false;
      if (pmFilterTab === 'dummy' && !isDummy) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          pm.name.toLowerCase().includes(q) ||
          (pm.email && pm.email.toLowerCase().includes(q)) ||
          (pm.title && pm.title.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [pmUsers, pmFilterTab, searchQuery]);

  // Current project data for selected project
  const currentProject = useMemo(() => {
    const fromMap = allProjectsMap && allProjectsMap[selectedProjectId];
    if (fromMap) return fromMap;
    if (selectedProjectId === activeProjectId) return projectData;
    return projectsList.find(p => p.id === selectedProjectId) || null;
  }, [allProjectsMap, selectedProjectId, activeProjectId, projectData, projectsList]);

  // Assigned PM IDs for the selected project
  const assignedPMIds = useMemo(() => {
    if (!currentProject) return [];
    
    // 1. If projectManagerIds is explicitly set on the project (even if empty []), THAT is the source of truth!
    if (Array.isArray(currentProject.projectManagerIds)) {
      // Map stored IDs (could be user id or stakeholder id or email) to allUsers IDs
      const mappedIds = new Set<string>();
      currentProject.projectManagerIds.forEach(idOrEmail => {
        const idLower = (idOrEmail || '').toLowerCase();
        const user = allUsers.find(
          u => u.id.toLowerCase() === idLower || (u.email && u.email.toLowerCase() === idLower)
        );
        if (user) {
          mappedIds.add(user.id);
        } else if (idOrEmail) {
          mappedIds.add(idOrEmail);
        }
      });
      return Array.from(mappedIds);
    }
    
    // 2. Legacy fallback
    if (currentProject.projectManagerId) {
      const user = allUsers.find(
        u => u.id === currentProject.projectManagerId || (u.email && currentProject.projectManagerEmail && u.email.toLowerCase() === currentProject.projectManagerEmail.toLowerCase())
      );
      return [user?.id || currentProject.projectManagerId];
    }

    // 3. Stakeholder role fallback
    const ids = new Set<string>();
    (currentProject.stakeholders || []).forEach(s => {
      if (s.appRole === 'Project Manager' || s.role?.toLowerCase().includes('project manager')) {
        const matchedUser = allUsers.find(
          u => u.id === s.id || (u.email && s.email && u.email.toLowerCase() === s.email.toLowerCase())
        );
        if (matchedUser) {
          ids.add(matchedUser.id);
        } else if (s.id) {
          ids.add(s.id);
        }
      }
    });

    return Array.from(ids);
  }, [currentProject, allUsers]);

  // Projects assigned to the selected PM
  const pmAssignedProjectIds = useMemo(() => {
    const targetUser = pmUsers.find(u => u.id === selectedPMId) || allUsers.find(u => u.id === selectedPMId);
    if (!targetUser) return [];

    const targetId = targetUser.id.toLowerCase();
    const targetEmail = (targetUser.email || '').toLowerCase();

    return projectsList
      .filter(p => {
        const fullProj = allProjectsMap[p.id] || (p.id === activeProjectId ? projectData : null) || p;
        
        if (Array.isArray(fullProj.projectManagerIds)) {
          const ids = fullProj.projectManagerIds.map((id: string) => id.toLowerCase());
          const emails = (fullProj.projectManagerEmails || []).map((e: string) => e.toLowerCase());
          return ids.includes(targetId) || emails.includes(targetEmail);
        }
        
        if (fullProj.projectManagerId) {
          return fullProj.projectManagerId.toLowerCase() === targetId ||
            (fullProj.projectManagerEmail && fullProj.projectManagerEmail.toLowerCase() === targetEmail);
        }

        return false;
      })
      .map(p => p.id);
  }, [selectedPMId, pmUsers, allUsers, projectsList, allProjectsMap, activeProjectId, projectData]);

  if (!isOpen) return null;

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper to test if a PM user is assigned to currently selected project
  const isPMAssigned = (pm: UserProfile) => {
    if (!pm) return false;
    const targetId = (pm.id || '').toLowerCase();
    const targetEmail = (pm.email || '').toLowerCase();

    // 1. Check assignedPMIds
    if (assignedPMIds.some(id => id.toLowerCase() === targetId || (targetEmail && id.toLowerCase() === targetEmail))) {
      return true;
    }

    // 2. Check currentProject
    if (currentProject) {
      if (Array.isArray(currentProject.projectManagerIds)) {
        const pmIds = currentProject.projectManagerIds.map(i => (i || '').toLowerCase());
        const pmEmails = (currentProject.projectManagerEmails || []).map(e => (e || '').toLowerCase());
        if (pmIds.includes(targetId) || (targetEmail && (pmIds.includes(targetEmail) || pmEmails.includes(targetEmail)))) {
          return true;
        }
      }
      if (currentProject.projectManagerId && (currentProject.projectManagerId.toLowerCase() === targetId || (targetEmail && currentProject.projectManagerId.toLowerCase() === targetEmail))) {
        return true;
      }
      if (currentProject.projectManagerEmail && targetEmail && currentProject.projectManagerEmail.toLowerCase() === targetEmail) {
        return true;
      }
    }

    return false;
  };

  // Create new Dummy PM on demand
  const handleCreateDummyPM = () => {
    if (!dummyName.trim()) return;
    const newId = `user-dummy-pm-${Date.now()}`;
    const sanitizedEmail = `dummy.${dummyName.trim().toLowerCase().replace(/[^a-z0-9]/g, '.')}@placeholder.local`;
    
    const newDummyUser: UserProfile = {
      id: newId,
      name: dummyName.trim(),
      email: sanitizedEmail,
      role: 'Project Manager',
      appRole: 'Project Manager',
      isPlaceholder: true,
      isDummy: true,
      hasPMAccess: true,
      title: 'Interim PM (Placeholder)',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
      department: 'PMO (Bench Pool)',
      hourlyRate: Number(dummyRate) || 100,
      weeklyCapacityHours: 40,
      skills: ['Project Planning', 'Sprint Allocation', 'Budget Monitoring']
    };

    if (createUserAccount) {
      createUserAccount(newDummyUser);
    }
    setIsCreatingDummy(false);
    setSelectedPMId(newId);
    showToast(`Created dummy PM "${newDummyUser.name}" successfully!`);
  };

  // Toggle PM on the selected project
  const handleTogglePMForProject = async (pmUserId: string) => {
    setIsSubmitting(true);
    try {
      const targetUser = pmUsers.find(u => u.id === pmUserId) || allUsers.find(u => u.id === pmUserId) || { id: pmUserId, email: pmUserId, name: 'Project Manager' };
      const currentlyAssigned = isPMAssigned(targetUser as UserProfile);

      // Get current project PM ids
      let currentIds = [...assignedPMIds];
      if (currentProject?.projectManagerIds && Array.isArray(currentProject.projectManagerIds)) {
        currentIds = Array.from(new Set([...currentIds, ...currentProject.projectManagerIds]));
      }

      let newPMIds: string[];
      if (currentlyAssigned) {
        const targetId = (targetUser.id || pmUserId).toLowerCase();
        const targetEmail = (targetUser.email || '').toLowerCase();
        newPMIds = currentIds.filter(id => {
          const idLower = (id || '').toLowerCase();
          return idLower !== targetId && (targetEmail ? idLower !== targetEmail : true);
        });
        await setProjectManagers(selectedProjectId, newPMIds);
        showToast(`Unassigned ${targetUser?.name || 'PM'} from project.`);
      } else {
        newPMIds = Array.from(new Set([...currentIds, pmUserId]));
        await setProjectManagers(selectedProjectId, newPMIds);
        showToast(`Assigned ${targetUser?.name || 'PM'} to project!`);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update project managers.', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unassign single PM from selected project
  const handleUnassignPM = async (pmUserId: string) => {
    setIsSubmitting(true);
    try {
      const targetUser = pmUsers.find(u => u.id === pmUserId) || allUsers.find(u => u.id === pmUserId);
      const targetId = (targetUser?.id || pmUserId).toLowerCase();
      const targetEmail = (targetUser?.email || '').toLowerCase();

      let currentIds = [...assignedPMIds];
      if (currentProject?.projectManagerIds && Array.isArray(currentProject.projectManagerIds)) {
        currentIds = Array.from(new Set([...currentIds, ...currentProject.projectManagerIds]));
      }

      const newPMIds = currentIds.filter(id => {
        const idLower = (id || '').toLowerCase();
        return idLower !== targetId && (targetEmail ? idLower !== targetEmail : true);
      });

      await setProjectManagers(selectedProjectId, newPMIds);
      showToast(`Unassigned ${targetUser?.name || 'PM'} successfully.`);
    } catch (err) {
      console.error(err);
      showToast('Failed to unassign PM.', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unassign all PMs from selected project
  const handleUnassignAllFromProject = async () => {
    if (!window.confirm('Are you sure you want to unassign all Project Managers from this project?')) return;
    setIsSubmitting(true);
    try {
      await setProjectManagers(selectedProjectId, []);
      showToast('All Project Managers unassigned from project.');
    } catch (err) {
      console.error(err);
      showToast('Failed to unassign all PMs.', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Project assignment for Selected PM
  const handleToggleProjectForPM = async (projectId: string) => {
    setIsSubmitting(true);
    try {
      const targetProj = allProjectsMap[projectId] || (projectId === activeProjectId ? projectData : null) || projectsList.find(p => p.id === projectId);
      if (!targetProj) return;

      const currentPMIds: string[] = Array.isArray(targetProj.projectManagerIds)
        ? [...targetProj.projectManagerIds]
        : targetProj.projectManagerId
        ? [targetProj.projectManagerId]
        : [];

      const targetId = selectedPMId.toLowerCase();
      const targetUser = pmUsers.find(u => u.id === selectedPMId) || allUsers.find(u => u.id === selectedPMId);
      const targetEmail = (targetUser?.email || '').toLowerCase();

      const isAssigned = currentPMIds.some(id => id.toLowerCase() === targetId || (targetEmail && id.toLowerCase() === targetEmail));
      let updatedPMIds: string[];

      if (isAssigned) {
        updatedPMIds = currentPMIds.filter(id => {
          const idLower = id.toLowerCase();
          return idLower !== targetId && (targetEmail ? idLower !== targetEmail : true);
        });
      } else {
        updatedPMIds = Array.from(new Set([...currentPMIds, selectedPMId]));
      }

      await setProjectManagers(projectId, updatedPMIds);
      showToast(`${isAssigned ? 'Unassigned' : 'Assigned'} ${targetUser?.name || 'PM'} ${isAssigned ? 'from' : 'to'} ${targetProj.projectName || 'project'}.`);
    } catch (err) {
      console.error(err);
      showToast('Failed to update PM project allocation.', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dummyPMCount = pmUsers.filter(u => Boolean(u.isPlaceholder || u.isDummy || u.email?.includes('@placeholder'))).length;
  const staffPMCount = pmUsers.length - dummyPMCount;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col h-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">Project Manager Allocation</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  MULTI-PM & DUMMY PM SUPPORTED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Assign real PMs or placeholder dummy PM slots to any project, or manage individual PM portfolios.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="px-4 sm:px-6 pt-3.5 pb-2 border-b border-slate-800/80 bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setActiveMode('by_project')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeMode === 'by_project'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>By Project (Assign Multiple PMs)</span>
            </button>
            <button
              onClick={() => setActiveMode('by_pm')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeMode === 'by_pm'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>By PM (Allocate Projects)</span>
            </button>
          </div>

          {toastMessage && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-medium bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>{toastMessage.text}</span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {activeMode === 'by_project' ? (
            /* ================= MODE: BY PROJECT ================= */
            <div className="space-y-4">
              {/* Project Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Select Target Project
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {projectsList.map(p => {
                    const isSelected = p.id === selectedProjectId;
                    const fullProj = allProjectsMap[p.id] || (p.id === activeProjectId ? projectData : null) || p;
                    const pmCount = Array.isArray(fullProj.projectManagerIds)
                      ? fullProj.projectManagerIds.length
                      : (fullProj.projectManagerId ? 1 : 0);

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProjectId(p.id)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500 text-white ring-1 ring-indigo-500/30'
                            : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300">
                            {p.projectCode}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                            {pmCount} PM{pmCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-xs font-bold truncate">{p.projectName}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Project Assigned PMs Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    Currently Assigned PMs ({assignedPMIds.length})
                  </span>
                  {assignedPMIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleUnassignAllFromProject}
                      disabled={isSubmitting}
                      className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1"
                    >
                      <UserMinus className="w-3 h-3" />
                      Unassign All
                    </button>
                  )}
                </div>

                {assignedPMIds.length === 0 ? (
                  <p className="text-xs text-amber-400/90 italic bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                    ⚠️ No Project Manager currently assigned to this project. Select one or more PMs below to assign.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {assignedPMIds.map(pmId => {
                      const user = pmUsers.find(u => u.id === pmId) || allUsers.find(u => u.id === pmId);
                      const name = user?.name || pmId;
                      const avatar = user?.avatar;
                      const isDummy = Boolean(user?.isPlaceholder || user?.isDummy || (user?.email && user.email.includes('@placeholder')));

                      return (
                        <div
                          key={pmId}
                          className={`inline-flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl border text-xs font-medium ${
                            isDummy
                              ? 'bg-purple-950/50 border-purple-500/40 text-purple-200'
                              : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-200'
                          }`}
                        >
                          {avatar ? (
                            <img src={avatar} alt={name} className="w-5 h-5 rounded-full object-cover border border-slate-700" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-purple-600 text-[10px] flex items-center justify-center font-bold">
                              🧩
                            </div>
                          )}
                          <span className="font-semibold text-slate-100">{name}</span>
                          {isDummy && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/30 text-purple-300 font-mono">
                              Dummy
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleUnassignPM(pmId)}
                            disabled={isSubmitting}
                            className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors ml-0.5"
                            title="Unassign this PM"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* PM Selection Checkboxes with Dummy Filter Tabs & Quick Add */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Available Project Managers & Dummy PMs ({filteredPMUsers.length})
                    </label>
                    <p className="text-[11px] text-slate-400">Click to assign or unassign to this project</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Dummy / Staff Filter Pills */}
                    <div className="inline-flex p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setPmFilterTab('all')}
                        className={`px-2 py-1 rounded-md font-medium transition-colors ${
                          pmFilterTab === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        All ({pmUsers.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPmFilterTab('staff')}
                        className={`px-2 py-1 rounded-md font-medium transition-colors ${
                          pmFilterTab === 'staff' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Staff ({staffPMCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPmFilterTab('dummy')}
                        className={`px-2 py-1 rounded-md font-medium flex items-center gap-1 transition-colors ${
                          pmFilterTab === 'dummy' ? 'bg-purple-600 text-white' : 'text-purple-400 hover:text-purple-300'
                        }`}
                      >
                        <Puzzle className="w-3 h-3" />
                        <span>Dummy ({dummyPMCount})</span>
                      </button>
                    </div>

                    {/* Quick Create Dummy PM button */}
                    <button
                      type="button"
                      onClick={() => setIsCreatingDummy(!isCreatingDummy)}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Dummy PM</span>
                    </button>
                  </div>
                </div>

                {/* Inline Dummy PM Creation Form */}
                {isCreatingDummy && (
                  <div className="p-3 mb-3 rounded-2xl bg-purple-950/30 border border-purple-500/40 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Puzzle className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-purple-200">Create New Placeholder / Dummy PM</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCreatingDummy(false)}
                        className="text-slate-400 hover:text-slate-200 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1">
                          Placeholder Name / Role
                        </label>
                        <input
                          type="text"
                          value={dummyName}
                          onChange={(e) => setDummyName(e.target.value)}
                          placeholder="e.g. Interim Technical PM, Contract PM Placeholder"
                          className="w-full bg-slate-950 border border-purple-500/30 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1">
                          Planned Rate ($/hr)
                        </label>
                        <input
                          type="number"
                          value={dummyRate}
                          onChange={(e) => setDummyRate(e.target.value)}
                          placeholder="100"
                          className="w-full bg-slate-950 border border-purple-500/30 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-400"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCreatingDummy(false)}
                        className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateDummyPM}
                        className="px-3.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save & Add Dummy PM</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* PM List */}
                <div className="space-y-2">
                  {filteredPMUsers.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800 text-center space-y-2">
                      <p className="text-xs text-slate-400">No project managers match the current filter.</p>
                      <button
                        type="button"
                        onClick={() => { setPmFilterTab('all'); setSearchQuery(''); }}
                        className="text-xs font-bold text-indigo-400 hover:underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    filteredPMUsers.map(pm => {
                      const isAssigned = isPMAssigned(pm);
                      const isDummy = Boolean(pm.isPlaceholder || pm.isDummy || (pm.email && pm.email.includes('@placeholder')));

                      return (
                        <div
                          key={pm.id}
                          onClick={() => handleTogglePMForProject(pm.id)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                            isAssigned
                              ? isDummy
                                ? 'bg-purple-950/30 border-purple-500/60 ring-1 ring-purple-500/20'
                                : 'bg-indigo-950/30 border-indigo-500/60 ring-1 ring-indigo-500/20'
                              : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative">
                              <img
                                src={pm.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
                                alt={pm.name}
                                className={`w-9 h-9 rounded-full object-cover border shrink-0 ${
                                  isDummy ? 'border-purple-500/50' : 'border-slate-700'
                                }`}
                              />
                              {isDummy && (
                                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-purple-600 text-[9px] flex items-center justify-center font-bold text-white border border-slate-900">
                                  🧩
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">{pm.name}</span>
                                
                                {isDummy ? (
                                  <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold font-mono">
                                    🧩 Dummy PM / Placeholder
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono">
                                    {pm.role === 'admin' ? 'Admin / PMO' : pm.title || 'Project Manager'}
                                  </span>
                                )}

                                {pm.isDualPMDev && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                                    Dual PM+Dev
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">
                                {isDummy ? (
                                  <span className="text-purple-300/80 font-mono">unassigned placeholder slot</span>
                                ) : (
                                  pm.email
                                )} • ${pm.hourlyRate || 100}/hr
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isAssigned ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnassignPM(pm.id);
                                }}
                                disabled={isSubmitting}
                                className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 active:scale-95 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                                <span>Unassign</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePMForProject(pm.id);
                                }}
                                disabled={isSubmitting}
                                className={`px-3 py-1.5 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isDummy
                                    ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/30'
                                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Assign PM</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ================= MODE: BY PM ================= */
            <div className="space-y-4">
              {/* PM Selector with Dummy PM Filter */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Select Project Manager
                  </label>
                  <div className="inline-flex p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setPmFilterTab('all')}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                        pmFilterTab === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      All ({pmUsers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPmFilterTab('dummy')}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                        pmFilterTab === 'dummy' ? 'bg-purple-600 text-white' : 'text-purple-400 hover:text-purple-300'
                      }`}
                    >
                      Dummy ({dummyPMCount})
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredPMUsers.map(pm => {
                    const isSelected = pm.id === selectedPMId;
                    const isDummy = Boolean(pm.isPlaceholder || pm.isDummy || (pm.email && pm.email.includes('@placeholder')));
                    const targetId = pm.id.toLowerCase();
                    const targetEmail = (pm.email || '').toLowerCase();
                    const count = projectsList.filter(p => {
                      const fullProj = allProjectsMap[p.id] || (p.id === activeProjectId ? projectData : null) || p;
                      const pmIds = (fullProj?.projectManagerIds || p.projectManagerIds || []).map(id => id.toLowerCase());
                      const pmEmails = (fullProj?.projectManagerEmails || p.projectManagerEmails || []).map(e => e.toLowerCase());
                      return pmIds.includes(targetId) || pmEmails.includes(targetEmail);
                    }).length;

                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setSelectedPMId(pm.id)}
                        className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                          isSelected
                            ? isDummy
                              ? 'bg-purple-950/40 border-purple-500 text-white ring-1 ring-purple-500/30'
                              : 'bg-indigo-950/40 border-indigo-500 text-white ring-1 ring-indigo-500/30'
                            : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="relative">
                          <img
                            src={pm.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
                            alt={pm.name}
                            className={`w-9 h-9 rounded-full object-cover border shrink-0 ${
                              isDummy ? 'border-purple-500/50' : 'border-slate-700'
                            }`}
                          />
                          {isDummy && (
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-purple-600 text-[8px] flex items-center justify-center font-bold text-white">
                              🧩
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">{pm.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold font-mono ${
                              isDummy ? 'bg-purple-500/20 text-purple-300' : 'bg-indigo-500/20 text-indigo-300'
                            }`}>
                              {count} Proj
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {isDummy ? '🧩 Dummy PM Slot' : (pm.title || 'Project Manager')}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Projects Assignment Checklist for Selected PM */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Allocate Projects to {pmUsers.find(u => u.id === selectedPMId)?.name || allUsers.find(u => u.id === selectedPMId)?.name || 'Selected PM'}
                </label>

                <div className="space-y-2">
                  {projectsList.map(proj => {
                    const isAssigned = pmAssignedProjectIds.includes(proj.id);

                    return (
                      <div
                        key={proj.id}
                        onClick={() => handleToggleProjectForPM(proj.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isAssigned
                            ? 'bg-indigo-950/30 border-indigo-500/60 ring-1 ring-indigo-500/20'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                              {proj.projectCode}
                            </span>
                            <h4 className="font-bold text-xs sm:text-sm text-slate-100 truncate">{proj.projectName}</h4>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            <span>Budget: <strong className="text-slate-300">${proj.budget?.toLocaleString()}</strong></span>
                            <span>Tasks: <strong className="text-slate-300">{proj.taskCount ?? 0}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isAssigned ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleProjectForPM(proj.id);
                              }}
                              disabled={isSubmitting}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>Unassign</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleProjectForPM(proj.id);
                              }}
                              disabled={isSubmitting}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Assign Project</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Assignments sync in real-time across all views and scorecards</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
