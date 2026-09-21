import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useProject } from '../../context/ProjectContext';
import { Stakeholder, ProjectData } from '../../types';
import {
  FolderPlus,
  Check,
  Trash2,
  Layers,
  Calendar,
  DollarSign,
  X,
  Pencil,
  Save,
  UserCheck,
  UserMinus,
  Users,
  Shield,
  Briefcase
} from 'lucide-react';
import { PMAssignProjectModal } from '../dashboard/PMAssignProjectModal';

interface ProjectManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEditProjectId?: string | null;
}

export const ProjectManagementModal: React.FC<ProjectManagementModalProps> = ({
  isOpen,
  onClose,
  initialEditProjectId
}) => {
  const {
    projectData,
    projectsList,
    allProjectsMap,
    allUsers,
    activeProjectId,
    switchProject,
    createProject,
    deleteProject,
    updateProjectDetails,
    setProjectManagers,
    currentUser
  } = useProject();

  const isAdmin = currentUser.role === 'admin';
  const isPM = currentUser.role === 'pm' || isAdmin;

  const [isCreating, setIsCreating] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState(200000);
  const [initPlaceholderTeam, setInitPlaceholderTeam] = useState(false);
  const [createPmIds, setCreatePmIds] = useState<string[]>([currentUser.id]);

  // Editing state for updating project details
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBudget, setEditBudget] = useState<number>(150000);
  const [editStartDate, setEditStartDate] = useState('');
  const [editTargetEndDate, setEditTargetEndDate] = useState('');
  const [editPmIds, setEditPmIds] = useState<string[]>([]);

  // PMAssignModal trigger for specific project
  const [pmModalProjectId, setPmModalProjectId] = useState<string | null>(null);

  // Available PM candidates
  const pmUsers = useMemo(() => {
    return allUsers.filter(
      u =>
        u.role === 'pm' ||
        u.appRole === 'Project Manager' ||
        u.title?.toLowerCase().includes('pm') ||
        u.title?.toLowerCase().includes('project manager') ||
        u.title?.toLowerCase().includes('scrum') ||
        u.isDualPMDev ||
        u.hasPMAccess ||
        u.role === 'admin'
    );
  }, [allUsers]);

  const startEditing = (proj: ProjectData) => {
    setEditingProjectId(proj.id);
    setEditName(proj.projectName || '');
    setEditCode(proj.projectCode || '');
    setEditDescription(proj.description || '');
    setEditBudget(proj.budget || 150000);
    setEditStartDate(proj.startDate || new Date().toISOString().split('T')[0]);
    setEditTargetEndDate(proj.targetEndDate || new Date(Date.now() + 86400000 * 90).toISOString().split('T')[0]);

    // Populate assigned PM IDs
    const currentPmIds = new Set<string>(proj.projectManagerIds || []);
    if (proj.projectManagerId) currentPmIds.add(proj.projectManagerId);
    (proj.stakeholders || []).forEach(s => {
      if (s.appRole === 'Project Manager' || s.role?.toLowerCase().includes('project manager') || s.isDualPMDev) {
        const matched = allUsers.find(u => u.id === s.id || (u.email && s.email && u.email.toLowerCase() === s.email.toLowerCase()));
        if (matched) currentPmIds.add(matched.id);
      }
    });
    setEditPmIds(Array.from(currentPmIds));
    setIsCreating(false);
  };

  useEffect(() => {
    if (isOpen && initialEditProjectId) {
      const proj =
        (allProjectsMap && allProjectsMap[initialEditProjectId]) ||
        projectsList.find(p => p.id === initialEditProjectId) ||
        (initialEditProjectId === activeProjectId ? projectData : null);
      if (proj) {
        startEditing(proj as ProjectData);
      }
    } else if (!isOpen) {
      setEditingProjectId(null);
      setIsCreating(false);
    }
  }, [isOpen, initialEditProjectId]);

  if (!isOpen) return null;

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProjectId || !editName.trim()) return;

    const targetProj =
      (allProjectsMap && allProjectsMap[editingProjectId]) ||
      projectsList.find(p => p.id === editingProjectId) ||
      (editingProjectId === activeProjectId ? projectData : null);
    if (!targetProj) return;

    // Update PM assignments
    await setProjectManagers(editingProjectId, editPmIds);

    // Update details
    if (editingProjectId === activeProjectId) {
      await updateProjectDetails({
        projectName: editName.trim(),
        projectCode: editCode.trim() || 'PRJ-' + Math.floor(100 + Math.random() * 899),
        description: editDescription.trim(),
        budget: Number(editBudget) || 150000,
        startDate: editStartDate || targetProj.startDate,
        targetEndDate: editTargetEndDate || targetProj.targetEndDate
      });
    } else {
      try {
        const updatedData: ProjectData = {
          ...targetProj,
          projectName: editName.trim(),
          projectCode: editCode.trim() || 'PRJ-' + Math.floor(100 + Math.random() * 899),
          description: editDescription.trim(),
          budget: Number(editBudget) || 150000,
          startDate: editStartDate || targetProj.startDate,
          targetEndDate: editTargetEndDate || targetProj.targetEndDate,
          projectManagerIds: editPmIds
        };
        await fetch('/api/project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: updatedData })
        });
      } catch (err) {
        console.warn('Failed to update non-active project:', err);
      }
    }

    setEditingProjectId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    // Build initial team with all selected PMs
    const selectedPmUsers = allUsers.filter(u => createPmIds.includes(u.id));
    const initialTeam: Stakeholder[] = selectedPmUsers.map(pmUser => ({
      id: pmUser.id,
      name: pmUser.name,
      email: pmUser.email,
      role: 'Project Manager (PM)',
      appRole: 'Project Manager',
      category: 'internal',
      avatar: pmUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(pmUser.name)}`,
      hourlyRate: pmUser.hourlyRate || 120,
      weeklyCapacityHours: pmUser.weeklyCapacityHours || 40,
      skills: ['Project Management', 'Agile', 'Scrum'],
      status: 'active',
      createdBy: currentUser.id,
      createdByEmail: currentUser.email
    }));

    if (initialTeam.length === 0) {
      initialTeam.push({
        id: `sh-pm-${Date.now()}`,
        name: currentUser.name,
        email: currentUser.email,
        role: 'Project Manager (PM)',
        appRole: 'Project Manager',
        category: 'internal',
        avatar: currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.name)}`,
        hourlyRate: 120,
        weeklyCapacityHours: 40,
        skills: ['Project Management', 'Agile', 'Scrum'],
        status: 'active',
        createdBy: currentUser.id,
        createdByEmail: currentUser.email
      });
    }

    if (initPlaceholderTeam) {
      initialTeam.push(
        {
          id: `sh-dummy-1-${Date.now()}`,
          name: 'Lead Developer (Unassigned)',
          email: 'unassigned.dev@placeholder.local',
          role: 'Lead Full Stack Engineer',
          appRole: 'Developer (Team member)',
          category: 'internal',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          hourlyRate: 95,
          weeklyCapacityHours: 40,
          skills: ['React', 'Node.js', 'Architecture'],
          status: 'placeholder',
          isPlaceholder: true,
          createdBy: currentUser.id,
          createdByEmail: currentUser.email
        },
        {
          id: `sh-dummy-2-${Date.now()}`,
          name: 'QA & Test Specialist (Unassigned)',
          email: 'unassigned.qa@placeholder.local',
          role: 'Quality Assurance Lead',
          appRole: 'Tester (Team Member)',
          category: 'internal',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
          hourlyRate: 75,
          weeklyCapacityHours: 40,
          skills: ['Automated Testing', 'Selenium', 'QA'],
          status: 'placeholder',
          isPlaceholder: true,
          createdBy: currentUser.id,
          createdByEmail: currentUser.email
        },
        {
          id: `sh-dummy-3-${Date.now()}`,
          name: 'UI/UX Designer (Unassigned)',
          email: 'unassigned.design@placeholder.local',
          role: 'Product Designer',
          appRole: 'UI/UX Dev (Team Member)',
          category: 'internal',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
          hourlyRate: 85,
          weeklyCapacityHours: 40,
          skills: ['Figma', 'UI Design', 'Design Systems'],
          status: 'placeholder',
          isPlaceholder: true,
          createdBy: currentUser.id,
          createdByEmail: currentUser.email
        }
      );
    }

    await createProject({
      projectName,
      projectCode: projectCode || 'PRJ-' + Math.floor(100 + Math.random() * 899),
      description,
      budget: Number(budget) || 150000,
      stakeholders: initialTeam,
      projectManagerIds: createPmIds,
      projectManagerEmails: selectedPmUsers.map(u => u.email)
    });

    setProjectName('');
    setProjectCode('');
    setDescription('');
    setIsCreating(false);
  };

  const toggleCreatePm = (pmId: string) => {
    setCreatePmIds(prev =>
      prev.includes(pmId) ? prev.filter(id => id !== pmId) : [...prev, pmId]
    );
  };

  const toggleEditPm = (pmId: string) => {
    setEditPmIds(prev =>
      prev.includes(pmId) ? prev.filter(id => id !== pmId) : [...prev, pmId]
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col h-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-100 flex items-center gap-2">
                Project Portfolio & PM Governance
              </h2>
              <p className="text-xs text-slate-400">
                Create projects, assign/unassign multiple PMs, and manage scope parameters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Active User Role Context Banner */}
          {!isPM && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between gap-3">
              <span>
                <strong>Stakeholder Access Mode:</strong> You are signed in as <strong>{currentUser.name}</strong>. Switching projects is permitted. Creating or deleting projects requires <strong>Project Manager</strong> or <strong>Admin</strong> privileges.
              </span>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              All Enterprise Projects ({projectsList.length})
            </span>
            {!isCreating && isPM && (
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Create New Project</span>
              </button>
            )}
          </div>

          {/* New Project Form */}
          {isCreating && (
            <form onSubmit={handleCreate} className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-indigo-500/40 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Create New Project
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    placeholder="e.g. NextGen Portal 2.0"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Project Code</label>
                  <input
                    type="text"
                    value={projectCode}
                    onChange={e => setProjectCode(e.target.value)}
                    placeholder="e.g. PRJ-701"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Scope</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Summary of scope, key goals, and milestones..."
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Total Budget ($)</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={e => setBudget(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Assign Multiple PMs to New Project */}
              <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-slate-200">
                  Assign Lead Project Managers (Multi-Select)
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Select one or more Project Managers to lead this initiative.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {pmUsers.map(pm => {
                    const isChecked = createPmIds.includes(pm.id);
                    return (
                      <div
                        key={pm.id}
                        onClick={() => toggleCreatePm(pm.id)}
                        className={`p-2 rounded-xl border cursor-pointer flex items-center justify-between gap-2 transition-all ${
                          isChecked
                            ? 'bg-indigo-950/40 border-indigo-500 text-white'
                            : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={pm.avatar} alt={pm.name} className="w-6 h-6 rounded-full object-cover" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{pm.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{pm.title || 'Project Manager'}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 accent-indigo-600 rounded"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-bold text-indigo-300 block cursor-pointer">
                    Initialize Default Team Placeholders
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Automatically creates dummy team slots (Lead Dev, QA, Designer) that you can invite members to later.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={initPlaceholderTeam}
                  onChange={e => setInitPlaceholderTeam(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 cursor-pointer rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
                >
                  Save Project
                </button>
              </div>
            </form>
          )}

          {/* Project List */}
          <div className="space-y-3">
            {projectsList.map(project => {
              const isActive = project.id === activeProjectId;
              const isEditingThis = editingProjectId === project.id;
              const fullProj = allProjectsMap[project.id] || (project.id === activeProjectId ? projectData : null);

              // Gather assigned PMs
              const pmIds = Array.from(new Set([
                ...(fullProj?.projectManagerIds || project.projectManagerIds || []),
                ...(fullProj?.projectManagerId ? [fullProj.projectManagerId] : []),
                ...(project.projectManagerId ? [project.projectManagerId] : [])
              ]));

              const assignedPms = pmIds.map(id => {
                const foundUser = allUsers.find(u => u.id === id || (u.email && id.includes('@') && u.email.toLowerCase() === id.toLowerCase()));
                if (foundUser) return foundUser;
                const foundSh = (fullProj?.stakeholders || project.stakeholders || []).find((sh: any) => sh.id === id || (sh.email && id.includes('@') && sh.email.toLowerCase() === id.toLowerCase()));
                if (foundSh) return { id: foundSh.id, name: foundSh.name, email: foundSh.email, avatar: foundSh.avatar, title: foundSh.role, role: 'Project Manager' as any };
                return { id, name: id, title: 'Project Manager', role: 'Project Manager' as any };
              });

              if (isEditingThis) {
                return (
                  <form
                    key={project.id}
                    onSubmit={handleSaveEdit}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-indigo-500/50 space-y-4 animate-fade-in shadow-xl"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Pencil className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                          Edit Project Details ({project.projectName})
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingProjectId(null)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Project Name *</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Project Code</label>
                        <input
                          type="text"
                          value={editCode}
                          onChange={e => setEditCode(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Description / Scope Summary</label>
                      <textarea
                        rows={2}
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        placeholder="Detailed project scope description..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none resize-none leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Total Budget ($)</label>
                        <input
                          type="number"
                          value={editBudget}
                          onChange={e => setEditBudget(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={editStartDate}
                          onChange={e => setEditStartDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Target End Date</label>
                        <input
                          type="date"
                          value={editTargetEndDate}
                          onChange={e => setEditTargetEndDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Multi-PM Assignment Checkboxes during Edit */}
                    <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-200">
                          Assigned Project Managers ({editPmIds.length})
                        </label>
                        {editPmIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setEditPmIds([])}
                            className="text-[10px] text-rose-400 hover:underline"
                          >
                            Unassign All
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                        {pmUsers.map(pm => {
                          const isChecked = editPmIds.includes(pm.id);
                          return (
                            <div
                              key={pm.id}
                              onClick={() => toggleEditPm(pm.id)}
                              className={`p-2 rounded-xl border cursor-pointer flex items-center justify-between gap-2 transition-all ${
                                isChecked
                                  ? 'bg-indigo-950/40 border-indigo-500 text-white'
                                  : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <img src={pm.avatar} alt={pm.name} className="w-6 h-6 rounded-full object-cover" />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate">{pm.name}</p>
                                  <p className="text-[10px] text-slate-400 truncate">{pm.title || 'Project Manager'}</p>
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-4 h-4 accent-indigo-600 rounded"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setEditingProjectId(null)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </form>
                );
              }

              return (
                <div
                  key={project.id}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isActive
                      ? 'bg-indigo-950/30 border-indigo-500/60 ring-1 ring-indigo-500/30 shadow-lg shadow-indigo-950/30'
                      : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm sm:text-base text-slate-100 truncate">{project.projectName}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 border border-slate-700">
                        {project.projectCode}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Active Workspace
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-1">{project.description || 'No detailed scope description provided.'}</p>

                    {/* Assigned PM Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Project Managers:
                      </span>
                      {assignedPms.length === 0 ? (
                        <span className="text-[11px] text-amber-400 italic">No PM Assigned</span>
                      ) : (
                        assignedPms.map(pm => (
                          <div
                            key={pm.id}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-[11px] font-medium"
                          >
                            <img src={pm.avatar} alt={pm.name} className="w-4 h-4 rounded-full object-cover" />
                            <span>{pm.name}</span>
                          </div>
                        ))
                      )}

                      {isPM && (
                        <button
                          type="button"
                          onClick={() => setPmModalProjectId(project.id)}
                          className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 ml-1"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>Manage PMs</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap pt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <DollarSign className="w-3 h-3 text-slate-500" />
                        ${project.budget?.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {project.startDate} ~ {project.targetEndDate}
                      </span>
                      <span>
                        Tasks: <strong className="text-slate-300">{project.taskCount ?? 0}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => startEditing(project as ProjectData)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700/80 transition-all"
                      title="Edit project details"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    {!isActive && (
                      <button
                        onClick={() => {
                          switchProject(project.id);
                          onClose();
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                      >
                        Switch To
                      </button>
                    )}
                    {projectsList.length > 1 && isPM && (
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-950/80 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* Embedded PMAssignProjectModal if triggered from project row */}
      {pmModalProjectId && (
        <PMAssignProjectModal
          isOpen={Boolean(pmModalProjectId)}
          onClose={() => setPmModalProjectId(null)}
          preselectedProjectId={pmModalProjectId}
        />
      )}
    </div>,
    document.body
  );
};
