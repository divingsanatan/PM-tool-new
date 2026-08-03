import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Stakeholder } from '../../types';
import { FolderPlus, Check, Trash2, Layers, Calendar, DollarSign, X } from 'lucide-react';

interface ProjectManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectManagementModal: React.FC<ProjectManagementModalProps> = ({ isOpen, onClose }) => {
  const { projectsList, activeProjectId, switchProject, createProject, deleteProject, currentUser } = useProject();
  const isPM = currentUser.role === 'pm';

  const [isCreating, setIsCreating] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState(200000);

  const [initPlaceholderTeam, setInitPlaceholderTeam] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    const initialTeam: Stakeholder[] = [
      {
        id: `sh-pm-${Date.now()}`,
        name: currentUser.name,
        email: currentUser.email,
        role: 'Project Manager (PM)',
        category: 'internal',
        avatar: currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.name)}`,
        hourlyRate: 120,
        weeklyCapacityHours: 40,
        skills: ['Project Management', 'Agile', 'Scrum'],
        status: 'active',
        createdBy: currentUser.id,
        createdByEmail: currentUser.email
      }
    ];

    if (initPlaceholderTeam) {
      initialTeam.push(
        {
          id: `sh-dummy-1-${Date.now()}`,
          name: 'Lead Developer (Unassigned)',
          email: 'unassigned.dev@placeholder.local',
          role: 'Lead Full Stack Engineer',
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
      stakeholders: initialTeam
    });

    setProjectName('');
    setProjectCode('');
    setDescription('');
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-md animate-fade-in overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]">
        {/* Header */}
        <div className="p-5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-100">Project Portfolio Management</h2>
              <p className="text-xs text-slate-400">Add, switch, or manage enterprise projects in real-time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Active User Role Context Banner */}
          {!isPM && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between gap-3">
              <span>
                <strong>Stakeholder Access Mode:</strong> You are signed in as <strong>{currentUser.name}</strong>. Switching projects is permitted. Creating/deleting projects requires <strong>Project Manager (PM)</strong> rights.
              </span>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              All Projects ({projectsList.length})
            </span>
            {!isCreating && isPM && (
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Create New Project</span>
              </button>
            )}
          </div>

          {/* New Project Form */}
          {isCreating && (
            <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-sm font-semibold text-indigo-300">Create New Project</h3>
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
                  <label className="block text-xs font-medium text-slate-300 mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    placeholder="e.g. NextGen Portal 2.0"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Project Code</label>
                  <input
                    type="text"
                    value={projectCode}
                    onChange={e => setProjectCode(e.target.value)}
                    placeholder="e.g. PRJ-701"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Summary of scope, key goals, and milestones..."
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Total Budget ($)</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={e => setBudget(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl flex items-center justify-between gap-3">
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
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
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
              return (
                <div
                  key={project.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    isActive
                      ? 'bg-indigo-950/30 border-indigo-500/50 ring-1 ring-indigo-500/30'
                      : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm text-slate-100 truncate">{project.projectName}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                        {project.projectCode}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1 mb-2">{project.description}</p>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400">
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

                  <div className="flex items-center gap-2 shrink-0">
                    {!isActive && (
                      <button
                        onClick={() => {
                          switchProject(project.id);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                      >
                        Switch To
                      </button>
                    )}
                    {projectsList.length > 1 && (
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
