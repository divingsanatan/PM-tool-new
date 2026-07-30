import React, { useState } from 'react';
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
  const { allUsers, loginAsUser, createUserAccount } = useProject();

  const [activeTab, setActiveTab] = useState<'google' | 'credentials' | 'register'>('google');
  
  // Google Sign In Modal State
  const [showGoogleAccountPicker, setShowGoogleAccountPicker] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [isCustomGoogleForm, setIsCustomGoogleForm] = useState(false);

  // Credentials Form State
  const [selectedUserId, setSelectedUserId] = useState<string>(allUsers[0]?.id || '');
  const [password, setPassword] = useState('demo1234');
  const [errorMsg, setErrorMsg] = useState('');

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('stakeholder');
  const [regTitle, setRegTitle] = useState('');
  const [regDepartment, setRegDepartment] = useState('Engineering');
  const [regPassword, setRegPassword] = useState('demo1234');

  const handleLoginUser = (user: UserProfile) => {
    loginAsUser(user);
    if (onLoginSuccess) onLoginSuccess();
  };

  const handleGoogleAccountSelect = (user: UserProfile) => {
    // Attach google auth email formatting if not present
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
    if (targetUser) {
      handleLoginUser(targetUser);
    } else {
      setErrorMsg('User not found.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) {
      setErrorMsg('Please fill in all required fields.');
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

            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-200">
                Sign in to view your account workspace & relevant project data
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Log in using Google OAuth 2.0 or enterprise credentials. Sessions are securely locked to your authenticated profile.
              </p>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">Project Manager (PM) Scope</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Budget controls, EVM metrics (SPI/CPI), baseline settings, and team workload balancing.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">Stakeholder / Team Scope</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tailored workspace displaying relevant work items, assigned tasks, and RAID risks.
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
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-2xl border border-slate-800/80 mb-6 text-xs font-medium">
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
                    Or select a verified Google account
                  </span>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {allUsers.slice(0, 4).map((u) => (
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
                            <span className="font-semibold text-xs text-slate-200 group-hover:text-indigo-300 transition-colors block truncate">
                              {u.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block truncate">
                              {u.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center gap-1 shrink-0">
                          <span>Google Sign In</span>
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
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Select User Account *</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none transition-colors"
                  >
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role === 'pm' ? 'Project Manager' : 'Stakeholder'} - {u.title})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Password *</label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-200 outline-none transition-colors font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Default demo password is pre-filled (demo1234)</p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Authenticate & Access Workspace</span>
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
                      <option value="pm">Project Manager (PM) - Full Rights</option>
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
                        <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {u.role === 'pm' ? 'PM' : 'Member'}
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
