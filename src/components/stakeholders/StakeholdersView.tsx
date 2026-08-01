import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Stakeholder, StakeholderCategory } from '../../types';
import { Users, Plus, Mail, Clock, DollarSign, Edit2, Trash2, Zap, Building2, Globe, Filter, Lock } from 'lucide-react';

interface StakeholdersViewProps {
  onOpenStakeholderModal: (stakeholder?: Stakeholder) => void;
  onOpenInviteModal?: (email?: string) => void;
}

export const StakeholdersView: React.FC<StakeholdersViewProps> = ({
  onOpenStakeholderModal,
  onOpenInviteModal
}) => {
  const { projectData, saveStakeholder, deleteStakeholder, currentUser } = useProject();

  const isPM = currentUser?.role === 'pm';

  const canEditStakeholder = (sh: Stakeholder) => {
    if (isPM) return true;
    if (sh.id === currentUser?.id) return true;
    if (sh.email && sh.email.toLowerCase() === currentUser?.email.toLowerCase()) return true;
    return false;
  };

  const [quickName, setQuickName] = useState('');
  const [quickRole, setQuickRole] = useState('Developer');
  const [quickCategory, setQuickCategory] = useState<StakeholderCategory>('internal');
  const [quickRate, setQuickRate] = useState(85);
  const [quickCapacity, setQuickCapacity] = useState(40);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'internal' | 'external'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleQuickAddStakeholder = () => {
    if (!quickName.trim()) return;

    const newSh: Stakeholder = {
      id: `sh-${Date.now()}`,
      name: quickName.trim(),
      email: `${quickName.trim().toLowerCase().replace(/\s+/g, '.')}@company.com`,
      role: quickRole,
      category: quickCategory,
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80`,
      hourlyRate: Number(quickRate) || 85,
      weeklyCapacityHours: Number(quickCapacity) || 40,
      skills: [quickRole, 'Agile'],
      status: 'active',
      createdBy: currentUser?.id,
      createdByEmail: currentUser?.email
    };

    saveStakeholder(newSh);
    setQuickName('');
    setToastMessage(`⚡ ${quickCategory === 'external' ? 'External' : 'Internal'} Team member "${quickName.trim()}" added!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredStakeholders = projectData.stakeholders.filter(sh => {
    if (categoryFilter === 'all') return true;
    return (sh.category || 'internal') === categoryFilter;
  });

  return (
    <div id="stakeholders-view" className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-teal-400 shrink-0" />
            <h2 className="text-xl font-bold text-slate-100 min-w-0 truncate sm:whitespace-normal">Project Stakeholders & Team Directory</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage team roles, internal & external categories, capacity limits, billable rates, and skills.
          </p>
        </div>

        {isPM && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenInviteModal && (
              <button
                onClick={() => onOpenInviteModal()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold text-xs transition-colors shadow-sm"
              >
                <Mail className="w-4 h-4 text-teal-400" />
                <span>Invite via Email</span>
              </button>
            )}
            <button
              onClick={() => onOpenStakeholderModal()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-colors shadow-md shadow-teal-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Stakeholder</span>
            </button>
          </div>
        )}
      </div>

      {/* ClickUp Style Quick Add Member Bar (PM Only) */}
      {isPM ? (
        <div id="quick-stakeholder-bar" className="bg-slate-900 border border-teal-500/40 p-3.5 rounded-2xl shadow-lg relative space-y-2.5">
          {toastMessage && (
            <div className="absolute top-2 right-4 bg-emerald-500 text-slate-950 font-bold px-3 py-1 rounded-full text-xs shadow-md animate-bounce flex items-center gap-1 z-20">
              <Zap className="w-3.5 h-3.5" />
              <span>{toastMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-400">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Quick Add Team Member (Press Enter ↵)</span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
            <input
              type="text"
              placeholder="Full Name and press Enter... (e.g. Alex Morgan)"
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleQuickAddStakeholder();
                }
              }}
              className="flex-1 min-w-[220px] bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none shadow-inner min-h-[40px]"
            />

            <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
              {/* Category Dropdown */}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-xl min-h-[40px]">
                <select
                  value={quickCategory}
                  onChange={(e) => setQuickCategory(e.target.value as StakeholderCategory)}
                  className="bg-transparent text-slate-200 text-xs font-semibold outline-none cursor-pointer"
                  title="Select Stakeholder Type"
                >
                  <option value="internal" className="bg-slate-900 text-slate-100">🏢 Internal</option>
                  <option value="external" className="bg-slate-900 text-slate-100">🌐 External</option>
                </select>
              </div>

              <input
                type="text"
                placeholder="Role (e.g. Lead Designer)"
                value={quickRole}
                onChange={(e) => setQuickRole(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-teal-300 px-3 py-2 rounded-xl outline-none text-xs w-36 min-h-[40px]"
              />

              <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-xl min-h-[40px]">
                <span className="text-[10px] text-slate-500 font-mono">$</span>
                <input
                  type="number"
                  title="Hourly Billing Rate"
                  value={quickRate}
                  onChange={(e) => setQuickRate(Number(e.target.value))}
                  className="w-12 bg-transparent text-emerald-400 font-mono text-xs outline-none"
                />
                <span className="text-[10px] text-slate-500 font-mono">/hr</span>
              </div>

              <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-xl min-h-[40px]">
                <input
                  type="number"
                  title="Weekly Capacity Hours"
                  value={quickCapacity}
                  onChange={(e) => setQuickCapacity(Number(e.target.value))}
                  className="w-10 bg-transparent text-purple-300 font-mono text-xs outline-none"
                />
                <span className="text-[10px] text-slate-500 font-mono">hrs/wk</span>
              </div>

              <button
                onClick={handleQuickAddStakeholder}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors shadow-sm shrink-0 min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Member</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400 flex items-center gap-2">
          <Lock className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Team members can view workload and update their own details. Only Project Managers can add or modify other team members.</span>
        </div>
      )}

      {/* Category Filter Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="w-4 h-4 text-teal-400" />
          <span className="font-semibold text-slate-300">Filter View:</span>
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                categoryFilter === 'all' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({projectData.stakeholders.length})
            </button>
            <button
              onClick={() => setCategoryFilter('internal')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                categoryFilter === 'internal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>Internal ({projectData.stakeholders.filter(s => (s.category || 'internal') === 'internal').length})</span>
            </button>
            <button
              onClick={() => setCategoryFilter('external')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                categoryFilter === 'external' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>External ({projectData.stakeholders.filter(s => s.category === 'external').length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stakeholders Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-w-0">
        {filteredStakeholders.map((sh) => {
          const assignedTasks = projectData.tasks.filter(
            t => t.assigneeIds.includes(sh.id) || projectData.subtasks.some(st => st.taskId === t.id && st.assigneeId === sh.id)
          );
          const isExternal = sh.category === 'external';

          return (
            <div key={sh.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-sm flex flex-col justify-between hover:border-slate-700 transition-colors min-w-0 overflow-hidden">
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={sh.avatar}
                      alt={sh.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-teal-500/30 shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-100 text-sm flex items-center gap-1.5 truncate">
                        <span className="truncate">{sh.name}</span>
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5 min-w-0">
                        <span className="text-xs text-teal-400 font-medium truncate">{sh.role}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${
                          isExternal
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                            : 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                        }`}>
                          {isExternal ? <Globe className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
                          <span>{isExternal ? 'External' : 'Internal'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {canEditStakeholder(sh) ? (
                      <>
                        <button
                          onClick={() => onOpenStakeholderModal(sh)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                          title="Edit Stakeholder"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteStakeholder(sh.id)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-semibold text-slate-500 flex items-center gap-1" title="Read-only: Created by another user">
                        <Lock className="w-3 h-3 text-slate-500" />
                        <span>Read-Only</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-3 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-slate-400 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{sh.email}</span>
                    </div>
                    {isPM && onOpenInviteModal && (
                      <button
                        onClick={() => onOpenInviteModal(sh.email)}
                        className="px-2 py-0.5 rounded bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold transition-colors shrink-0 flex items-center gap-1 self-start sm:self-auto"
                        title={`Resend/Send invitation email to ${sh.email}`}
                      >
                        <Mail className="w-2.5 h-2.5" />
                        <span>Send Invite Email</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>Capacity:</span>
                    </span>
                    <span className="font-mono font-bold text-slate-200">{sh.weeklyCapacityHours}h / week</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Billing Rate:</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">${sh.hourlyRate} / hour</span>
                  </div>
                </div>

                {/* Skills Tags */}
                <div className="mt-4">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Skills</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {sh.skills.map((skill, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-300">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Task Count Footer */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Assigned Tasks:</span>
                <span className="font-mono font-bold text-indigo-300">{assignedTasks.length} tasks</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
