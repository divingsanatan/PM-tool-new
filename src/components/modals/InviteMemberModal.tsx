import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { StakeholderCategory, AppRole, APP_ROLES } from '../../types';
import {
  X,
  Mail,
  Send,
  Copy,
  Check,
  UserPlus,
  ExternalLink,
  Sparkles,
  Building2,
  Globe,
  Clock,
  DollarSign,
  ShieldCheck,
  Lock,
  Zap
} from 'lucide-react';
import {
  normalizeToAppRole,
  isUserAdmin,
  isUserPM,
  canManageRolesAndTeam
} from '../../utils/roleUtils';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  defaultName?: string;
  defaultRole?: string;
  defaultCategory?: StakeholderCategory;
  stakeholderId?: string;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
  defaultName = '',
  defaultRole = 'Developer (Team member)',
  defaultCategory = 'internal',
  stakeholderId
}) => {
  const { projectData, saveStakeholder, currentUser, addActivityLog } = useProject();
  const isAdmin = isUserAdmin(currentUser);
  const isPM = isUserPM(currentUser);
  const canManage = canManageRolesAndTeam(currentUser);

  const [recipientEmail, setRecipientEmail] = useState<string>(defaultEmail);
  const [candidateName, setCandidateName] = useState<string>(defaultName);
  const [role, setRole] = useState<AppRole>(normalizeToAppRole(defaultRole));
  const [isDualPMDev, setIsDualPMDev] = useState<boolean>(false);
  const [category, setCategory] = useState<StakeholderCategory>(defaultCategory || 'internal');
  const [hourlyRate, setHourlyRate] = useState<number>(100);
  const [personalNote, setPersonalNote] = useState<string>('');
  
  const [copied, setCopied] = useState<boolean>(false);
  const [sentSuccess, setSentSuccess] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  // Sync state whenever modal opens or defaults change
  React.useEffect(() => {
    if (isOpen) {
      setRecipientEmail(defaultEmail || '');
      setCandidateName(defaultName || '');
      setRole(normalizeToAppRole(defaultRole));
      setIsDualPMDev(false);
      setCategory(defaultCategory || 'internal');
      setPersonalNote('');
      setSentSuccess(false);
      setSending(false);
    }
  }, [isOpen, defaultEmail, defaultName, defaultRole, defaultCategory]);

  if (!isOpen) return null;

  const projectName = projectData.projectName || 'Project Workspace';
  const projectCode = projectData.projectCode || 'PRJ-101';
  const pmName = currentUser?.name || 'Project Manager';
  const pmEmail = currentUser?.email || 'pm@company.com';

  const resolvedRole = normalizeToAppRole(role);
  const hasDualAccess = isDualPMDev || resolvedRole === 'Project Manager' || resolvedRole === 'Admin';

  // Dynamic Invitation Token & Link
  const inviteToken = `inv_${Math.random().toString(36).substring(2, 9)}`;
  const baseUrl = typeof window !== 'undefined' ? (window.location.origin + window.location.pathname) : 'http://localhost:3000/';
  const joinUrl = `${baseUrl}?project=${encodeURIComponent(projectCode)}&email=${encodeURIComponent(recipientEmail)}&token=${inviteToken}&role=${encodeURIComponent(resolvedRole)}&name=${encodeURIComponent(candidateName || '')}`;

  const emailSubject = `Invitation: Join ${projectName} (${projectCode}) as ${resolvedRole}`;
  const emailBody = `Hi ${candidateName || 'Team Member'},

${pmName} (${pmEmail}) has invited you to join the "${projectName}" project team as a ${resolvedRole} (${category === 'external' ? 'External Consultant/Stakeholder' : 'Internal Team Member'}).

Project Highlights:
• Project: ${projectName} (${projectCode})
• Role: ${resolvedRole}

${personalNote ? `Note from ${pmName}:\n"${personalNote}"\n\n` : ''}To accept this invitation and access your project workspace, click the link below:
${joinUrl}

If you have any questions, feel free to reply directly to this email (${pmEmail}).

Welcome aboard!
${pmName}
Project Manager, ${projectName}`;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenMailClient = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoUrl, '_blank');
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      alert('Please enter a valid recipient email address.');
      return;
    }

    setSending(true);

    try {
      // Find if we are updating an existing dummy/placeholder stakeholder
      const existingStakeholder = stakeholderId
        ? projectData.stakeholders.find(s => s.id === stakeholderId)
        : projectData.stakeholders.find(
            s => s.email === recipientEmail.trim() ||
                 (s.isPlaceholder && candidateName && s.name.toLowerCase() === candidateName.trim().toLowerCase())
          );

      const targetId = existingStakeholder ? existingStakeholder.id : (stakeholderId || `sh-inv-${Date.now().toString(36)}`);
      const nameToUse = candidateName.trim() || existingStakeholder?.name || recipientEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      const avatarUrl = existingStakeholder?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nameToUse)}`;

      await saveStakeholder({
        ...(existingStakeholder || {}),
        id: targetId,
        name: nameToUse,
        email: recipientEmail.trim(),
        role: resolvedRole,
        appRole: resolvedRole,
        isDualPMDev: isDualPMDev,
        hasPMAccess: hasDualAccess,
        category,
        hourlyRate: existingStakeholder?.hourlyRate || hourlyRate,
        weeklyCapacityHours: existingStakeholder?.weeklyCapacityHours || 40,
        skills: existingStakeholder?.skills && existingStakeholder.skills.length > 0 ? existingStakeholder.skills : ['Team Member', resolvedRole],
        status: 'invited',
        isPlaceholder: false,
        inviteToken,
        invitedAt: new Date().toISOString(),
        avatar: avatarUrl,
        createdBy: existingStakeholder?.createdBy || currentUser?.id,
        createdByEmail: existingStakeholder?.createdByEmail || currentUser?.email
      });

      // 2. Add Activity Log entry
      await addActivityLog({
        user: pmName,
        userEmail: pmEmail,
        action: 'Sent Project Team Invitation',
        details: `Dispatched email invitation to ${recipientEmail} for role "${resolvedRole}" on project ${projectCode}.`,
        category: 'stakeholder'
      });

      setSending(false);
      setSentSuccess(true);

      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-md overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl h-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Invite Team Member via Email</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  PM Flow
                </span>
              </h3>
              <p className="text-xs text-slate-400">Send an official email invitation to join {projectName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sentSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-slate-100">Invitation Email Sent Successfully!</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                An invitation to join <strong className="text-teal-300">{projectName}</strong> as <strong className="text-slate-200">{role}</strong> has been logged and dispatched to <strong className="text-teal-300">{recipientEmail}</strong>.
              </p>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400">
              ✓ Stakeholder directory record created & Activity log recorded.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendInvite} className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
            {!isPM && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                <Zap className="w-4 h-4 shrink-0 text-amber-400" />
                <span>You are currently in Team Member mode. Project Managers have full authority to invite new team members.</span>
              </div>
            )}

            {/* Recipient Details Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Recipient Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="alex.morgan@company.com"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Candidate Full Name (Optional)
                </label>
                <div className="relative">
                  <UserPlus className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Role & Category Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Assigned Project Role *
                  </label>
                  {canManage && (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      {isAdmin ? 'Admin' : 'Project Manager'}
                    </span>
                  )}
                </div>
                <select
                  disabled={!canManage}
                  value={role}
                  onChange={(e) => {
                    const sel = e.target.value as AppRole;
                    setRole(sel);
                    if (sel !== 'Developer (Team member)') {
                      setIsDualPMDev(false);
                    }
                    if (sel === 'Admin') setHourlyRate(175);
                    else if (sel === 'Project Manager') setHourlyRate(120);
                    else if (sel === 'Developer (Team member)') setHourlyRate(100);
                    else if (sel === 'Tester (Team Member)') setHourlyRate(90);
                    else if (sel === 'UI/UX Dev (Team Member)') setHourlyRate(95);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {APP_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {role === 'Developer (Team member)' && (
                  <label className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-amber-950/20 border border-amber-500/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDualPMDev}
                      onChange={(e) => setIsDualPMDev(e.target.checked)}
                      className="w-3.5 h-3.5 accent-amber-500 rounded"
                    />
                    <span className="text-[11px] text-amber-200 font-medium">
                      Dual Role: Developer + PM (Full PM access)
                    </span>
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const cat = e.target.value as StakeholderCategory;
                    setCategory(cat);
                    if (cat === 'internal' && !isAdmin) {
                      setRole('Contributor');
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none font-semibold cursor-pointer"
                >
                  <option value="internal">🏢 Internal Member</option>
                  <option value="external">🌐 External Stakeholder</option>
                </select>
              </div>
            </div>

            {/* Personal Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Personalized Message / Welcome Note <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                placeholder="We are launching sprint 2 and would love your expertise on architecture..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-3 text-xs text-slate-100 outline-none resize-none"
              />
            </div>

            {/* Email Message Live Preview Box */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generated Email Preview</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    <span>{copied ? 'Copied' : 'Copy Email'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenMailClient}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-[11px] font-semibold text-teal-300 hover:text-teal-200 transition-colors"
                    title="Open default mail client (mailto:)"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open Mail App</span>
                  </button>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-300 space-y-1.5 bg-slate-900/50 p-2.5 rounded-lg max-h-32 overflow-y-auto leading-relaxed border border-slate-800/50">
                <p className="text-teal-400 font-bold">Subject: {emailSubject}</p>
                <div className="whitespace-pre-wrap text-slate-400 border-t border-slate-800/80 pt-1.5">
                  {emailBody}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || !recipientEmail}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-teal-600/20"
              >
                <Send className="w-4 h-4" />
                <span>{sending ? 'Sending...' : 'Send Invitation Email'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
