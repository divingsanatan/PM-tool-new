import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { StakeholderCategory } from '../../types';
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
  Zap
} from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = ''
}) => {
  const { projectData, saveStakeholder, currentUser, addActivityLog } = useProject();
  const isPM = currentUser?.role === 'pm';

  const [recipientEmail, setRecipientEmail] = useState<string>(defaultEmail);
  const [candidateName, setCandidateName] = useState<string>('');
  const [role, setRole] = useState<string>('Frontend Engineer');
  const [category, setCategory] = useState<StakeholderCategory>('internal');
  const [hourlyRate, setHourlyRate] = useState<number>(75);
  const [personalNote, setPersonalNote] = useState<string>('');
  
  const [copied, setCopied] = useState<boolean>(false);
  const [sentSuccess, setSentSuccess] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  if (!isOpen) return null;

  const projectName = projectData.projectName || 'Project Workspace';
  const projectCode = projectData.projectCode || 'PRJ-101';
  const pmName = currentUser?.name || 'Project Manager';
  const pmEmail = currentUser?.email || 'pm@company.com';

  // Dynamic Invitation Token & Link
  const inviteToken = `inv_${Math.random().toString(36).substring(2, 9)}`;
  const baseUrl = typeof window !== 'undefined' ? (window.location.origin + window.location.pathname) : 'http://localhost:3000/';
  const joinUrl = `${baseUrl}?project=${encodeURIComponent(projectCode)}&email=${encodeURIComponent(recipientEmail)}&token=${inviteToken}&role=${encodeURIComponent(role)}&name=${encodeURIComponent(candidateName || '')}`;

  const emailSubject = `Invitation: Join ${projectName} (${projectCode}) as ${role}`;
  const emailBody = `Hi ${candidateName || 'Team Member'},

${pmName} (${pmEmail}) has invited you to join the "${projectName}" project team as a ${role} (${category === 'external' ? 'External Consultant/Stakeholder' : 'Internal Team Member'}).

Project Highlights:
• Project: ${projectName} (${projectCode})
• Role: ${role}

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
      // 1. Create or update stakeholder record in project state
      const stakeholderId = `sh-inv-${Date.now().toString(36)}`;
      const nameToUse = candidateName.trim() || recipientEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      const avatarIndex = Math.floor(Math.random() * 80) + 1;
      const avatarUrl = `https://i.pravatar.cc/150?img=${avatarIndex}`;

      await saveStakeholder({
        id: stakeholderId,
        name: nameToUse,
        email: recipientEmail.trim(),
        role: role.trim() || 'Team Member',
        category,
        hourlyRate,
        weeklyCapacityHours: 40,
        skills: ['Team Member', role],
        status: 'invited',
        inviteToken,
        invitedAt: new Date().toISOString(),
        avatar: avatarUrl,
        createdBy: currentUser?.id,
        createdByEmail: currentUser?.email
      });

      // 2. Add Activity Log entry
      await addActivityLog({
        user: pmName,
        userEmail: pmEmail,
        action: 'Sent Project Team Invitation',
        details: `Dispatched email invitation to ${recipientEmail} for role "${role}" on project ${projectCode}.`,
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Project Role *
                </label>
                <input
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Senior QA Engineer"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as StakeholderCategory)}
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
