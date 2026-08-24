import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Stakeholder, StakeholderCategory } from '../../types';
import { X, Users, Building2, Globe, AlertTriangle, Lock, ShieldCheck } from 'lucide-react';

interface StakeholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  stakeholderToEdit?: Stakeholder | null;
  onOpenInviteModal?: (email?: string) => void;
}

export const StakeholderModal: React.FC<StakeholderModalProps> = ({
  isOpen,
  onClose,
  stakeholderToEdit,
  onOpenInviteModal
}) => {
  const { saveStakeholder, currentUser, addActivityLog } = useProject();

  const isAdmin = currentUser?.role === 'admin';
  const isPM = currentUser?.role === 'pm' || isAdmin;

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
  const [hourlyRate, setHourlyRate] = useState<number | ''>(90);
  const [skillsStr, setSkillsStr] = useState('');
  const [isDummy, setIsDummy] = useState(false);
  const [triggerInvite, setTriggerInvite] = useState(false);

  // Determine if the current user has permission to set/change the role
  // Rule: ONLY an admin can set roles for internal stakeholders.
  const canEditRole = useMemo(() => {
    if (!isEditable) return false;
    if (category === 'internal') {
      return isAdmin;
    }
    // External stakeholders role can be edited by PM or Admin
    return isPM;
  }, [isEditable, category, isAdmin, isPM]);

  useEffect(() => {
    if (stakeholderToEdit) {
      setName(stakeholderToEdit.name);
      setEmail(stakeholderToEdit.email.includes('@placeholder') ? '' : stakeholderToEdit.email);
      setRole(stakeholderToEdit.role);
      setCategory(stakeholderToEdit.category || 'internal');
      setHourlyRate(stakeholderToEdit.hourlyRate || '');
      setSkillsStr(stakeholderToEdit.skills.join(', '));
      setIsDummy(Boolean(stakeholderToEdit.isPlaceholder || stakeholderToEdit.status === 'placeholder'));
      setTriggerInvite(Boolean(stakeholderToEdit.status === 'placeholder' || !stakeholderToEdit.email));
    } else {
      setName('');
      setEmail('');
      setRole(category === 'internal' && !isAdmin ? 'Contributor' : '');
      setCategory('internal');
      setHourlyRate(90);
      setSkillsStr('Agile, React, Management');
      setIsDummy(false);
      setTriggerInvite(true);
    }
  }, [stakeholderToEdit, isOpen, isAdmin, category]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable) return;
    const skills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);

    let finalEmail = email.trim();
    if (isDummy && (!finalEmail || !finalEmail.includes('@'))) {
      finalEmail = `unassigned.${(role || name || 'role').toLowerCase().replace(/\s+/g, '.')}@placeholder.local`;
    }

    const isNowInvited = !isDummy && finalEmail.includes('@') && !finalEmail.includes('@placeholder') && triggerInvite;
    const computedStatus = isDummy ? 'placeholder' : (isNowInvited ? 'invited' : (stakeholderToEdit?.status || 'active'));

    // Enforce role preservation if non-admin attempts to save internal stakeholder
    let finalRole = role.trim();
    if (category === 'internal' && !isAdmin) {
      finalRole = stakeholderToEdit?.role || 'Contributor';
    }
    if (!finalRole) {
      finalRole = 'Contributor';
    }

    await saveStakeholder({
      id: stakeholderToEdit?.id,
      name: name.trim() || (isDummy ? `${finalRole || 'Placeholder'} (Unassigned)` : 'New Team Member'),
      email: finalEmail,
      role: finalRole,
      category,
      hourlyRate: hourlyRate === '' ? 0 : Number(hourlyRate),
      weeklyCapacityHours: 40,
      skills,
      status: computedStatus,
      isPlaceholder: isDummy,
      createdBy: stakeholderToEdit?.createdBy || currentUser?.id,
      createdByEmail: stakeholderToEdit?.createdByEmail || currentUser?.email
    });

    if (isNowInvited && onOpenInviteModal) {
      onOpenInviteModal(finalEmail);
    } else {
      addActivityLog({
        user: currentUser?.name || 'User',
        userEmail: currentUser?.email || '',
        action: isDummy ? 'Created Placeholder Stakeholder' : 'Updated Stakeholder',
        details: isDummy
          ? `Added placeholder stakeholder profile "${finalRole || name}" to project team.`
          : `Saved stakeholder "${name}" (${finalEmail}) with role "${finalRole}".`,
        category: 'stakeholder'
      });
    }

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
          {/* Dummy / Placeholder Mode Toggle */}
          <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl flex items-center justify-between gap-3">
            <div>
              <label className="text-xs font-bold text-indigo-200 block cursor-pointer">
                Create as Dummy / Placeholder Stakeholder
              </label>
              <p className="text-[11px] text-slate-400">
                Reserve team allocation before assigning an email address. You can add their email later to send an invitation link.
              </p>
            </div>
            <input
              type="checkbox"
              disabled={!isEditable}
              checked={isDummy}
              onChange={(e) => {
                setIsDummy(e.target.checked);
                if (e.target.checked) {
                  setTriggerInvite(false);
                }
              }}
              className="w-4 h-4 accent-indigo-500 cursor-pointer rounded"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Full Name {isDummy ? '(Optional)' : '*'}
            </label>
            <input
              type="text"
              required={!isDummy}
              disabled={!isEditable}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isDummy ? "e.g. Lead Frontend Engineer (Unassigned)" : "e.g. Sarah Jenkins"}
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
              <label className="block text-slate-300 font-semibold mb-1">
                Email Address {isDummy ? '(Optional / Pending)' : '*'}
              </label>
              <input
                type="email"
                required={!isDummy}
                disabled={!isEditable}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isDummy ? "pending.invite@company.com" : "sarah.j@company.com"}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Trigger Email Invitation option */}
          {!isDummy && (
            <div className="p-3 bg-teal-950/40 border border-teal-500/20 rounded-xl flex items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-teal-300 block cursor-pointer">
                  📧 Trigger Email Invitation with Join Link
                </label>
                <p className="text-[11px] text-slate-400">
                  Automatically generates a personal project invitation link and opens the invitation email composer upon saving.
                </p>
              </div>
              <input
                type="checkbox"
                disabled={!isEditable}
                checked={triggerInvite}
                onChange={(e) => setTriggerInvite(e.target.checked)}
                className="w-4 h-4 accent-teal-500 cursor-pointer rounded"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-300 font-semibold">
                Role / Job Title *
              </label>
              {!canEditRole && category === 'internal' && (
                <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                  <Lock className="w-3 h-3 text-amber-400" />
                  Admin Governance Only
                </span>
              )}
              {canEditRole && isAdmin && category === 'internal' && (
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Admin Authorized
                </span>
              )}
            </div>
            <input
              type="text"
              required
              disabled={!isEditable || !canEditRole}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={category === 'internal' ? 'e.g. Lead QA Engineer (Admin Set)' : 'e.g. Client Project Director'}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {!canEditRole && category === 'internal' && (
              <p className="text-[11px] text-amber-300/80 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3 shrink-0" />
                <span>Internal stakeholder roles can only be set or modified by an Executive Administrator.</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Hourly Rate ($) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="any"
              disabled={!isEditable}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 90"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Skills (comma separated) <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              disabled={!isEditable}
              value={skillsStr}
              onChange={(e) => setSkillsStr(e.target.value)}
              placeholder="e.g. React, Docker, Security (Optional)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex items-center justify-end gap-2 sm:gap-3 border-t border-slate-800 pt-4 mt-6 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs whitespace-nowrap shrink-0"
            >
              {isEditable ? 'Cancel' : 'Close'}
            </button>
            {isEditable ? (
              <button
                type="submit"
                className="px-4 sm:px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-md shadow-teal-600/20 whitespace-nowrap shrink-0"
              >
                Save Stakeholder
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="px-4 sm:px-5 py-2 rounded-xl bg-slate-800 text-slate-500 font-semibold text-xs cursor-not-allowed border border-slate-700 whitespace-nowrap shrink-0"
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
