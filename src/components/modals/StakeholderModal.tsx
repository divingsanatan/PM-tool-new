import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Stakeholder, StakeholderCategory } from '../../types';
import { X, Users, Building2, Globe, AlertTriangle } from 'lucide-react';

interface StakeholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  stakeholderToEdit?: Stakeholder | null;
}

export const StakeholderModal: React.FC<StakeholderModalProps> = ({
  isOpen,
  onClose,
  stakeholderToEdit
}) => {
  const { saveStakeholder, currentUser } = useProject();

  const isPM = currentUser?.role === 'pm';

  const isEditable = useMemo(() => {
    if (isPM) return true;
    if (!stakeholderToEdit) return false;
    if (stakeholderToEdit.id === currentUser?.id) return true;
    if (stakeholderToEdit.email && stakeholderToEdit.email.toLowerCase() === currentUser?.email.toLowerCase()) return true;
    return false;
  }, [isPM, stakeholderToEdit, currentUser]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [category, setCategory] = useState<StakeholderCategory>('internal');
  const [hourlyRate, setHourlyRate] = useState(90);
  const [weeklyCapacityHours, setWeeklyCapacityHours] = useState(40);
  const [skillsStr, setSkillsStr] = useState('');

  useEffect(() => {
    if (stakeholderToEdit) {
      setName(stakeholderToEdit.name);
      setEmail(stakeholderToEdit.email);
      setRole(stakeholderToEdit.role);
      setCategory(stakeholderToEdit.category || 'internal');
      setHourlyRate(stakeholderToEdit.hourlyRate);
      setWeeklyCapacityHours(stakeholderToEdit.weeklyCapacityHours);
      setSkillsStr(stakeholderToEdit.skills.join(', '));
    } else {
      setName('');
      setEmail('');
      setRole('');
      setCategory('internal');
      setHourlyRate(90);
      setWeeklyCapacityHours(40);
      setSkillsStr('Agile, React, Management');
    }
  }, [stakeholderToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable) return;
    const skills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);

    await saveStakeholder({
      id: stakeholderToEdit?.id,
      name,
      email,
      role,
      category,
      hourlyRate: Number(hourlyRate),
      weeklyCapacityHours: Number(weeklyCapacityHours),
      skills,
      status: 'active',
      createdBy: stakeholderToEdit?.createdBy || currentUser?.id,
      createdByEmail: stakeholderToEdit?.createdByEmail || currentUser?.email
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg h-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-slate-100 text-base sm:text-lg">
              {stakeholderToEdit ? 'Edit Stakeholder' : 'Add New Stakeholder'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          {!isEditable && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <div>
                <strong className="block text-amber-200 font-bold">Read-Only Mode</strong>
                <span>Team members cannot edit details of other team members or add new stakeholders. Only Project Managers or editing your own profile is permitted.</span>
              </div>
            </div>
          )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
            <input
              type="text"
              required
              disabled={!isEditable}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-teal-500 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Stakeholder Category *</label>
              <select
                disabled={!isEditable}
                value={category}
                onChange={(e) => setCategory(e.target.value as StakeholderCategory)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-teal-500 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="internal">🏢 Internal Stakeholder</option>
                <option value="external">🌐 External Stakeholder</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Email Address *</label>
              <input
                type="email"
                required
                disabled={!isEditable}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah.j@company.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Role / Job Title *</label>
            <input
              type="text"
              required
              disabled={!isEditable}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Lead QA Engineer"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Hourly Rate ($)</label>
              <input
                type="number"
                disabled={!isEditable}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Weekly Capacity (Hours)</label>
              <input
                type="number"
                disabled={!isEditable}
                value={weeklyCapacityHours}
                onChange={(e) => setWeeklyCapacityHours(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Skills (comma separated)</label>
            <input
              type="text"
              disabled={!isEditable}
              value={skillsStr}
              onChange={(e) => setSkillsStr(e.target.value)}
              placeholder="e.g. React, Docker, Security"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
            >
              {isEditable ? 'Cancel' : 'Close'}
            </button>
            {isEditable ? (
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-md shadow-teal-600/20"
              >
                Save Stakeholder
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="px-5 py-2 rounded-xl bg-slate-800 text-slate-500 font-semibold text-xs cursor-not-allowed border border-slate-700"
              >
                Read-Only
              </button>
            )}
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};
