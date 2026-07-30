import React from 'react';
import { useProject } from '../../context/ProjectContext';
import { UserProfile } from '../../types';
import { ShieldCheck, UserCheck, X, LogOut, Mail, Building2, Shield, Lock, Globe, User, ArrowRight, Zap, RefreshCw } from 'lucide-react';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, allUsers, loginAsUser, logout, projectData } = useProject();

  if (!isOpen) return null;

  const isPM = currentUser.role === 'pm';

  // Merge default allUsers with projectData stakeholders to ensure every team member is switchable
  const switchableMembers: UserProfile[] = allUsers.map(u => u);

  projectData.stakeholders.forEach(sh => {
    if (!switchableMembers.some(u => u.email.toLowerCase() === sh.email.toLowerCase())) {
      switchableMembers.push({
        id: 'user-' + sh.id,
        name: sh.name,
        email: sh.email,
        role: 'stakeholder',
        title: sh.role,
        avatar: sh.avatar,
        department: sh.category === 'internal' ? 'Engineering' : 'External Partner'
      });
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-md animate-fade-in overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col h-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]">
        {/* Header */}
        <div className="p-5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-100">User Session & Role Switcher</h2>
              <p className="text-xs text-slate-400">PM administrative access & team member role simulation</p>
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
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Active User Details Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/30 space-y-4">
            <div className="flex items-center gap-4">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-16 h-16 rounded-full border-2 border-indigo-500 object-cover shrink-0 shadow-md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base text-slate-100 truncate">{currentUser.name}</h3>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                    isPM
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {isPM ? 'Project Manager' : 'Team Contributor'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">{currentUser.title}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    {currentUser.email}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    {currentUser.department || 'General'}
                  </span>
                </div>
              </div>
            </div>

            {/* Auth Method */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-teal-400" />
                <span>Session Privileges:</span>
              </span>
              <span className="font-semibold text-slate-200 flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                {isPM ? 'Full Administrative & Role Switch Rights' : 'Team Member Report Card Scope'}
              </span>
            </div>
          </div>

          {/* PM Role Switcher Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Switch Role / Act as Team Member</span>
              </div>
              <span className="text-[11px] text-slate-400">Select any member to switch persona</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {switchableMembers.map((user) => {
                const isActive = currentUser.email.toLowerCase() === user.email.toLowerCase();
                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      loginAsUser(user);
                      onClose();
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      isActive
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-slate-100 shadow-sm'
                        : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-10 h-10 rounded-full border border-slate-700 object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs truncate">{user.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          user.role === 'pm' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {user.role === 'pm' ? 'PM' : 'Member'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{user.title}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-md shadow-rose-600/20"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
