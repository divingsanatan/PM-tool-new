import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { UserProfile, UserRole } from '../../types';
import {
  ShieldCheck,
  Lock,
  Mail,
  UserCheck,
  UserPlus,
  Briefcase,
  Sparkles,
  KeyRound,
  Building2,
  Activity,
  ArrowRight,
  Globe,
  CheckCircle2,
  X
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { allUsers, loginAsUser, createUserAccount, pendingInvite, acceptPendingInvite } = useProject();

  const [activeTab, setActiveTab] = useState<'credentials' | 'google' | 'register'>(
    pendingInvite?.email ? 'register' : 'credentials'
  );

  // Auto-fill invitation email if present
  useEffect(() => {
    if (pendingInvite?.email) {
      setRegEmail(pendingInvite.email);
      setCustomGoogleEmail(pendingInvite.email);
      if (pendingInvite.name) setRegName(pendingInvite.name);
      if (pendingInvite.role) setRegTitle(pendingInvite.role);
    }
  }, [pendingInvite]);

  // Google Sign In Modal State
  const [showGoogleAccountPicker, setShowGoogleAccountPicker] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState(pendingInvite?.email || '');
  const [customGoogleName, setCustomGoogleName] = useState(pendingInvite?.name || '');
  const [isCustomGoogleForm, setIsCustomGoogleForm] = useState(false);

  // Credentials Form State
  const defaultAdmin = allUsers.find(u => u.role === 'admin') || allUsers[0];
  const [selectedUserId, setSelectedUserId] = useState<string>(defaultAdmin?.id || '');
  const [password, setPassword] = useState('admin2026!');
  const [errorMsg, setErrorMsg] = useState('');

  // Register Form State
  const [regName, setRegName] = useState(pendingInvite?.name || '');
  const [regEmail, setRegEmail] = useState(pendingInvite?.email || '');
  const [regRole, setRegRole] = useState<UserRole>('stakeholder');
  const [regTitle, setRegTitle] = useState(pendingInvite?.role || '');
  const [regDepartment, setRegDepartment] = useState('Engineering');
  const [regPassword, setRegPassword] = useState('team2026!');

  // Handle user selection in credentials form
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const user = allUsers.find(u => u.id === userId);
    if (user) {
      if (user.role === 'admin') {
        setPassword('admin2026!');
      } else if (user.role === 'pm') {
        setPassword('pm2026!');
      } else {
        setPassword('team2026!');
      }
    }
    setErrorMsg('');
  };

  const handleQuickFillRole = (role: 'admin' | 'pm' | 'stakeholder') => {
    const targetUser = allUsers.find(u => u.role === role) || allUsers[0];
    if (targetUser) {
      setSelectedUserId(targetUser.id);
      if (role === 'admin') {
        setPassword('admin2026!');
      } else if (role === 'pm') {
        setPassword('pm2026!');
      } else {
        setPassword('team2026!');
      }
      setErrorMsg('');
    }
  };

  const handleLoginUser = (user: UserProfile) => {
    if (pendingInvite) {
      acceptPendingInvite(user);
    } else {
      loginAsUser(user);
    }
    if (onLoginSuccess) onLoginSuccess();
  };

  const handleQuickAcceptInvite = () => {
    const inviteEmail = pendingInvite?.email || 'team.member@company.com';
    const inviteName = pendingInvite?.name || inviteEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());

    const invitedUser: UserProfile = {
      id: 'inv-user-' + Date.now(),
      name: inviteName,
      email: inviteEmail,
      role: 'stakeholder',
      title: pendingInvite?.role || 'Team Member',
      department: 'Project Team',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(inviteName)}`
    };

    createUserAccount(invitedUser);
    acceptPendingInvite(invitedUser);
    if (onLoginSuccess) onLoginSuccess();
  };

  const handleGoogleAccountSelect = (user: UserProfile) => {
    const googleUser: UserProfile = {
      ...user,
      email: user.email.includes('@') ? user.email : `${user.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`
    };
    handleLoginUser(googleUser);
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail.trim() || !customGoogleName.trim()) {
      setErrorMsg('Please enter your Google name and email.');
      return;
    }

    const newGoogleUser: UserProfile = {
      id: 'google-user-' + Date.now(),
      name: customGoogleName.trim(),
      email: customGoogleEmail.trim().endsWith('@gmail.com') ? customGoogleEmail.trim() : `${customGoogleEmail.trim()}@gmail.com`,
      role: 'stakeholder',
      title: 'Google Team Contributor',
      department: 'External Partner',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(customGoogleName)}`
    };

    createUserAccount(newGoogleUser);
    if (onLoginSuccess) onLoginSuccess();
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }
    const targetUser = allUsers.find(u => u.id === selectedUserId);
    if (!targetUser) {
      setErrorMsg('Selected account was not found.');
      return;
    }

    // Role-specific credential validation
    const pwd = password.trim();
    if (targetUser.role === 'admin') {
      const validAdminPasswords = ['admin2026!', 'admin1234', 'demo1234'];
      if (!validAdminPasswords.includes(pwd)) {
        setErrorMsg('Invalid Executive Administrator password. Please use admin2026! or admin1234.');
        return;
      }
    } else if (targetUser.role === 'pm') {
      const validPmPasswords = ['pm2026!', 'pm1234', 'demo1234'];
      if (!validPmPasswords.includes(pwd)) {
        setErrorMsg('Invalid Project Manager password. Please use pm2026! or pm1234.');
        return;
      }
    } else {
      const validMemberPasswords = ['team2026!', 'team1234', 'demo1234'];
      if (!validMemberPasswords.includes(pwd)) {
        setErrorMsg('Invalid Team Contributor password. Please use team2026! or team1234.');
        return;
      }
    }

    handleLoginUser(targetUser);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    // A newly registered standard user cannot register as Admin without existing admin authority
    if (regRole === 'admin' && allUsers.some(u => u.role === 'admin')) {
      setErrorMsg('New Administrator registration requires executive PMO approval. Please register as Project Manager or Team Contributor.');
      return;
    }

    const newUser: UserProfile = {
      id: 'user-' + Date.now(),
      name: regName,
      email: regEmail,
      role: regRole,
      title: regTitle || (regRole === 'pm' ? 'Project Manager' : 'Team Contributor'),
      department: regDepartment || 'General',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(regName)}`
    };

    createUserAccount(newUser);
    if (onLoginSuccess) onLoginSuccess();
  };

  const selectedUserObj = allUsers.find(u => u.id === selectedUserId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10">
        
        {/* Left Side: Brand & Security Scope Info */}
        <div className="md:w-5/12 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800/80">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100 tracking-tight">ApexPM Enterprise</h1>
                <p className="text-xs text-indigo-300 font-mono">Role-Gated Workspace</p>
              </div>
            </div>

            {/* Invitation Pending Banner */}
            {pendingInvite && (
              <div className="mb-5 p-4 bg-teal-500/10 border border-teal-500/30 rounded-2xl text-teal-200 space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 font-bold text-xs text-teal-300">
                  <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Project Invitation Received!</span>
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <div>Project: <strong className="text-white font-mono">{pendingInvite.projectCode || 'Target Project'}</strong></div>
                  {pendingInvite.email && <div>Recipient: <strong className="text-teal-300">{pendingInvite.email}</strong></div>}
                  {pendingInvite.role && <div>Role: <strong className="text-white">{pendingInvite.role}</strong></div>}
                </div>
                <button
                  onClick={handleQuickAcceptInvite}
                  className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-teal-600/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Accept Invitation & Enter Project</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-200">
                Sign in to view your account workspace & relevant project data
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Log in using Google OAuth 2.0 or enterprise credentials. Sessions are securely locked to your authenticated profile.
              </p>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>Executive Administrator (Admin)</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">Portfolio</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Portfolio governance, multi-project EVM, PM assignment, rate cards, and cross-project leave approvals.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>Project Manager (PM)</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">Project Scope</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      WBS & Gantt breakdown, EVM metrics (SPI/CPI), team workload, RAID items, and project board.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>Team Member / Contributor</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">Execution</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Individual member report card, personal approved leaves calendar, task deliverables, and team chat.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/80 mt-6 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span className="flex items-center gap-1 text-slate-400">
              <Lock className="w-3 h-3 text-emerald-400" /> Locked Session Security
            </span>
            <span className="text-indigo-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" /> Google OAuth
            </span>
          </div>
        </div>

        {/* Right Side: Authentication Controls */}
        <div className="md:w-7/12 p-6 sm:p-8 flex flex-col justify-between bg-slate-900">
          <div>
            {/* 🎯 1-Click Instant Demo Login Bar */}
            <div className="mb-5 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>1-Click Demo Persona Sign-In:</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Instant Access</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. Admin Persona */}
                {(() => {
                  const adminUser = allUsers.find(u => u.role === 'admin' || u.email?.toLowerCase() === 'admin@apex.io') || allUsers[0];
                  return (
                    <button
                      type="button"
                      onClick={() => handleLoginUser(adminUser)}
                      className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-500/70 text-left transition-all group flex flex-col justify-between"
                      title="Log in immediately as Executive Administrator"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/25 text-amber-300 border border-amber-500/40">
                          ADMIN
                        </span>
                        <Building2 className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="font-bold text-xs text-white truncate block">{adminUser.name}</span>
                      <span className="text-[10px] text-amber-300/80 font-mono truncate block">{adminUser.email}</span>
                      <span className="text-[9px] text-slate-400 mt-1 font-medium group-hover:text-amber-200 transition-colors flex items-center gap-0.5">
                        <span>Enter as Admin</span> →
                      </span>
                    </button>
                  );
                })()}

                {/* 2. PM Persona */}
                {(() => {
                  const pmUser = allUsers.find(u => u.role === 'pm') || allUsers[1] || allUsers[0];
                  return (
                    <button
                      type="button"
                      onClick={() => handleLoginUser(pmUser)}
                      className="p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/40 hover:border-indigo-500/70 text-left transition-all group flex flex-col justify-between"
                      title="Log in immediately as Project Manager"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/25 text-indigo-300 border border-indigo-500/40">
                          PM
                        </span>
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="font-bold text-xs text-white truncate block">{pmUser.name}</span>
                      <span className="text-[10px] text-indigo-300/80 font-mono truncate block">{pmUser.email}</span>
                      <span className="text-[9px] text-slate-400 mt-1 font-medium group-hover:text-indigo-200 transition-colors flex items-center gap-0.5">
                        <span>Enter as PM</span> →
                      </span>
                    </button>
                  );
                })()}

                {/* 3. Team Member Persona */}
                {(() => {
                  const memberUser = allUsers.find(u => u.role === 'stakeholder') || allUsers[2] || allUsers[0];
                  return (
                    <button
                      type="button"
                      onClick={() => handleLoginUser(memberUser)}
                      className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-500/70 text-left transition-all group flex flex-col justify-between"
                      title="Log in immediately as Team Contributor"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
                          MEMBER
                        </span>
                        <Activity className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="font-bold text-xs text-white truncate block">{memberUser.name}</span>
                      <span className="text-[10px] text-emerald-300/80 font-mono truncate block">{memberUser.email}</span>
                      <span className="text-[9px] text-slate-400 mt-1 font-medium group-hover:text-emerald-200 transition-colors flex items-center gap-0.5">
                        <span>Enter as Member</span> →
                      </span>
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-2xl border border-slate-800/80 mb-5 text-xs font-medium">
              <button
                type="button"
                onClick={() => { setActiveTab('google'); setErrorMsg(''); }}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'google'
                    ? 'bg-indigo-600 text-white font-semibold shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google Sign-In</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('credentials'); setErrorMsg(''); }}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'credentials'
                    ? 'bg-indigo-600 text-white font-semibold shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Credentials</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('register'); setErrorMsg(''); }}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'register'
                    ? 'bg-indigo-600 text-white font-semibold shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* TAB 1: Google Login Option */}
            {activeTab === 'google' && (
              <div className="space-y-4">
                {/* Hero Google Auth Banner */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto shadow-md">
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-100">Sign in with Google Workspace</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Single Sign-On (SSO) with your Google account. Fast, secure, and automatically verified.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowGoogleAccountPicker(true)}
                    className="w-full py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2.5 active:scale-[0.99]"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                </div>

                {/* Quick Google User Accounts Direct Select */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Or select a verified account persona:
                  </span>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {allUsers.slice(0, 5).map((u) => (
                      <div
                        key={u.id}
                        onClick={() => handleGoogleAccountSelect(u)}
                        className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/50 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs text-slate-200 group-hover:text-indigo-300 transition-colors block truncate">
                                {u.name}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border shrink-0 ${
                                u.role === 'admin'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : u.role === 'pm'
                                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              }`}>
                                {u.role === 'admin' ? 'Admin' : u.role === 'pm' ? 'PM' : 'Member'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block truncate">
                              {u.email.includes('@') ? u.email : `${u.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center gap-1 shrink-0">
                          <span>Sign In</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Standard Credentials Login Form */}
            {activeTab === 'credentials' && (
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                {/* Role Separation Notice Callout */}
                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-100">Role & Security Separation:</span>
                    <span className="text-slate-300 ml-1">
                      A Project Manager (PM) cannot be the Admin. Both roles are distinct and require separate sign-in credentials.
                    </span>
                  </div>
                </div>

                {/* 1-Click Role Quick Fill Cards */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Quick Fill & Test Role Credentials:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickFillRole('admin')}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        selectedUserObj?.role === 'admin'
                          ? 'bg-amber-500/15 border-amber-500/60 ring-1 ring-amber-500/30 text-amber-200 shadow-sm'
                          : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Admin
                        </span>
                        <Building2 className="w-3 h-3 text-amber-400" />
                      </div>
                      <span className="font-bold text-xs text-slate-100 truncate">Sophia Martinez</span>
                      <span className="text-[10px] text-slate-400 font-mono truncate">admin@apex.io</span>
                      <span className="text-[9px] text-amber-400/80 font-mono mt-1">Pass: admin2026!</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickFillRole('pm')}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        selectedUserObj?.role === 'pm'
                          ? 'bg-indigo-500/15 border-indigo-500/60 ring-1 ring-indigo-500/30 text-indigo-200 shadow-sm'
                          : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          PM
                        </span>
                        <ShieldCheck className="w-3 h-3 text-indigo-400" />
                      </div>
                      <span className="font-bold text-xs text-slate-100 truncate">Alex Morgan</span>
                      <span className="text-[10px] text-slate-400 font-mono truncate">alex.m@apex.io</span>
                      <span className="text-[9px] text-indigo-400/80 font-mono mt-1">Pass: pm2026!</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickFillRole('stakeholder')}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        selectedUserObj?.role === 'stakeholder'
                          ? 'bg-emerald-500/15 border-emerald-500/60 ring-1 ring-emerald-500/30 text-emerald-200 shadow-sm'
                          : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Member
                        </span>
                        <Activity className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="font-bold text-xs text-slate-100 truncate">Marcus Vance</span>
                      <span className="text-[10px] text-slate-400 font-mono truncate">marcus.v@apex.io</span>
                      <span className="text-[9px] text-emerald-400/80 font-mono mt-1">Pass: team2026!</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Select User Account *</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => handleUserSelect(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none transition-colors"
                  >
                    <optgroup label="Executive PMO (Admin)">
                      {allUsers.filter(u => u.role === 'admin').map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} (Executive Admin - {u.email})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Project Managers (PM)">
                      {allUsers.filter(u => u.role === 'pm').map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} (PM - {u.email})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Team Contributors & Stakeholders">
                      {allUsers.filter(u => u.role === 'stakeholder').map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.title} - {u.email})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">Password *</label>
                    <span className="text-[10px] font-mono text-slate-400">
                      Required for {selectedUserObj?.role === 'admin' ? 'Admin' : selectedUserObj?.role === 'pm' ? 'PM' : 'Team Member'}
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter credentials password"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-200 outline-none transition-colors font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Pre-filled: <span className="font-mono text-indigo-300">{password}</span> (also accepts <span className="font-mono text-slate-400">demo1234</span>)
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Sign In as {selectedUserObj?.name || 'Selected User'} ({selectedUserObj?.role === 'admin' ? 'Admin' : selectedUserObj?.role === 'pm' ? 'PM' : 'Member'})</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: Register New User Profile */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Jordan Miller"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="jordan@apex.io"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Role *</label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as UserRole)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                    >
                      <option value="admin">Executive Admin - Full Org & Portfolio</option>
                      <option value="pm">Project Manager (PM) - PMO & Project Scope</option>
                      <option value="stakeholder">Stakeholder / Team Contributor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Job Title</label>
                    <input
                      type="text"
                      value={regTitle}
                      onChange={(e) => setRegTitle(e.target.value)}
                      placeholder="e.g. Lead Engineer"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Department</label>
                    <input
                      type="text"
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      placeholder="e.g. Engineering"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Create password"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create Profile & Sign In</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="pt-4 text-center border-t border-slate-800/60 mt-4">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Profile switching within sessions is strictly disabled. You must log out to switch accounts.</span>
            </p>
          </div>
        </div>

      </div>

      {/* Google Account Selector Popup Modal */}
      {showGoogleAccountPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <h3 className="font-bold text-sm text-slate-100">Choose a Google Account</h3>
              </div>
              <button
                onClick={() => setShowGoogleAccountPicker(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isCustomGoogleForm ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">Select an account to continue to ApexPM Enterprise</p>
                <div className="space-y-2 max-h-[260px] overflow-y-auto">
                  {allUsers.map((u) => {
                    const gEmail = u.email.includes('@') ? u.email : `${u.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`;
                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          handleGoogleAccountSelect(u);
                          setShowGoogleAccountPicker(false);
                        }}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500 hover:bg-slate-800/60 cursor-pointer transition-all flex items-center gap-3"
                      >
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-slate-100 truncate">{u.name}</h4>
                          <p className="text-[11px] text-slate-400 font-mono truncate">{gEmail}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          u.role === 'admin'
                            ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                            : u.role === 'pm'
                            ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                            : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        }`}>
                          {u.role === 'admin' ? 'Admin' : u.role === 'pm' ? 'PM' : 'Member'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setIsCustomGoogleForm(true)}
                    className="w-full py-2 rounded-xl border border-slate-700 hover:border-slate-600 text-xs text-slate-300 font-medium transition-colors"
                  >
                    + Use another Google account
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => { handleCustomGoogleSubmit(e); setShowGoogleAccountPicker(false); }} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    placeholder="e.g. Maya Lin"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Google Email Address *</label>
                  <input
                    type="email"
                    required
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    placeholder="maya.lin@gmail.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCustomGoogleForm(false)}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    ← Back to account list
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md"
                  >
                    Sign In with Google
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
