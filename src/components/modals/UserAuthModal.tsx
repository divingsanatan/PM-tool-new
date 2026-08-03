import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { UserProfile, UserRole } from '../../types';
import {
  ShieldCheck,
  User,
  X,
  LogOut,
  Mail,
  Building2,
  Lock,
  Globe,
  Zap,
  Camera,
  Upload,
  Check,
  Plus,
  Trash2,
  Phone,
  Briefcase,
  DollarSign,
  Clock,
  Sparkles,
  AlertTriangle,
  Image as ImageIcon
} from 'lucide-react';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena'
];

export const UserAuthModal: React.FC<UserAuthModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, allUsers, loginAsUser, updateUserProfile, logout, projectData, createUserAccount } = useProject();

  const [activeTab, setActiveTab] = useState<'profile' | 'switcher' | 'security'>('profile');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: currentUser.name || '',
    email: currentUser.email || '',
    title: currentUser.title || '',
    department: currentUser.department || 'Engineering',
    role: currentUser.role || 'pm',
    avatar: currentUser.avatar || PRESET_AVATARS[0],
    phone: currentUser.phone || '',
    bio: currentUser.bio || '',
    hourlyRate: currentUser.hourlyRate ?? 85,
    weeklyCapacityHours: currentUser.weeklyCapacityHours ?? 40,
    skills: currentUser.skills || ['Project Management', 'Agile', 'EVM']
  });

  const [newSkill, setNewSkill] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state on modal open or user change
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        title: currentUser.title || '',
        department: currentUser.department || 'Engineering',
        role: currentUser.role || 'pm',
        avatar: currentUser.avatar || PRESET_AVATARS[0],
        phone: currentUser.phone || '',
        bio: currentUser.bio || '',
        hourlyRate: currentUser.hourlyRate ?? 85,
        weeklyCapacityHours: currentUser.weeklyCapacityHours ?? 40,
        skills: currentUser.skills || ['Project Management', 'Agile', 'EVM']
      });
      setShowSaveSuccess(false);
      setShowConfirmLogout(false);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const isPM = currentUser.role === 'pm';

  // Merge default allUsers with projectData stakeholders
  const switchableMembers: UserProfile[] = [...allUsers];
  projectData.stakeholders.forEach(sh => {
    if (!switchableMembers.some(u => u.email.toLowerCase() === sh.email.toLowerCase())) {
      switchableMembers.push({
        id: 'user-' + sh.id,
        name: sh.name,
        email: sh.email,
        role: 'stakeholder',
        title: sh.role,
        avatar: sh.avatar,
        department: sh.category === 'internal' ? 'Engineering' : 'External Partner',
        hourlyRate: sh.hourlyRate,
        weeklyCapacityHours: sh.weeklyCapacityHours,
        skills: sh.skills
      });
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit. Please select a smaller photo.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setFormData(prev => ({ ...prev, avatar: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUserProfile({
        name: formData.name.trim(),
        email: formData.email.trim(),
        title: formData.title.trim(),
        department: formData.department.trim(),
        role: formData.role as UserRole,
        avatar: formData.avatar,
        phone: formData.phone.trim(),
        bio: formData.bio.trim(),
        hourlyRate: Number(formData.hourlyRate),
        weeklyCapacityHours: Number(formData.weeklyCapacityHours),
        skills: formData.skills
      });

      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={formData.avatar}
                alt={formData.name}
                className="w-10 h-10 rounded-full border-2 border-indigo-500 object-cover shadow-md shrink-0"
              />
              <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                formData.role === 'pm' ? 'bg-indigo-500' : 'bg-emerald-500'
              }`} />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-100 flex items-center gap-2">
                <span>{formData.name || 'User Profile'}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                  formData.role === 'pm'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {formData.role === 'pm' ? 'Project Manager' : 'Contributor'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Account settings, profile picture, title & team roles</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 bg-slate-950/40 border-b border-slate-800/80 shrink-0 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Edit Profile & Avatar</span>
          </button>

          <button
            onClick={() => setActiveTab('switcher')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'switcher'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Switch Team Persona</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {switchableMembers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'security'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Sign Out & Scope</span>
          </button>
        </div>

        {/* Success Toast */}
        {showSaveSuccess && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center justify-between shadow-md animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Profile details & avatar updated successfully! All team views synchronized.</span>
            </div>
            <button onClick={() => setShowSaveSuccess(false)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* TAB 1: EDIT PROFILE & AVATAR */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Profile Picture & Avatar Selector */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Camera className="w-4 h-4 text-indigo-400" />
                  <span>Profile Picture / Avatar</span>
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Avatar Preview */}
                  <div className="relative group shrink-0">
                    <img
                      src={formData.avatar}
                      alt="Avatar Preview"
                      className="w-20 h-20 rounded-full border-2 border-indigo-500 object-cover shadow-lg"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 rounded-full flex flex-col items-center justify-center text-white text-[10px] font-semibold transition-opacity"
                    >
                      <Camera className="w-5 h-5 mb-0.5 text-indigo-300" />
                      <span>Upload</span>
                    </button>
                  </div>

                  {/* Upload Button & URL Input */}
                  <div className="flex-1 space-y-3 w-full">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo from Computer</span>
                      </button>
                      <span className="text-[11px] text-slate-500">PNG, JPG, WebP up to 5MB</span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Or paste image web URL:</span>
                      <input
                        type="url"
                        value={formData.avatar.startsWith('data:') ? '' : formData.avatar}
                        onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Preset Avatars */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-2">Or pick from avatar presets:</span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {PRESET_AVATARS.map((presetUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, avatar: presetUrl }))}
                        className={`p-0.5 rounded-full border-2 transition-all shrink-0 ${
                          formData.avatar === presetUrl
                            ? 'border-indigo-500 ring-2 ring-indigo-500/30 scale-110'
                            : 'border-transparent hover:border-slate-700 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={presetUrl}
                          alt={`Preset ${idx + 1}`}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Personal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Full Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Job Title / Designation</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Senior Full Stack Engineer"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Department / Group</span>
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g. Engineering, Architecture"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>System Role Scope</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                  >
                    <option value="pm">Project Manager (Full Administrative Scope)</option>
                    <option value="stakeholder">Team Contributor / Stakeholder</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Phone Number</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 019-2834"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                  />
                </div>
              </div>

              {/* EVM Rates & Capacity Modeling */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Cost Modeling & Capacity</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Hourly Billing Rate ($/hr)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-slate-500">$</span>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={formData.hourlyRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: Number(e.target.value) }))}
                        className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Weekly Capacity (Hours/Week)</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="number"
                        min="5"
                        max="80"
                        value={formData.weeklyCapacityHours}
                        onChange={(e) => setFormData(prev => ({ ...prev, weeklyCapacityHours: Number(e.target.value) }))}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio & Skills */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Bio / Professional Summary</label>
                  <textarea
                    rows={2}
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Short summary of background, expertise, and project focus..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Skills & Core Expertise</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {formData.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      placeholder="Add skill (e.g., React, EVM, Figma) & press Enter"
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Saving Profile...' : 'Save Profile Updates'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SWITCH TEAM PERSONA */}
          {activeTab === 'switcher' && (
            <div className="space-y-6">
              {/* Active User Highlight */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-12 h-12 rounded-full border-2 border-indigo-500 object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Active Persona</p>
                    <h3 className="font-bold text-slate-100 text-sm truncate">{currentUser.name}</h3>
                    <p className="text-xs text-slate-400 truncate">{currentUser.title} • {currentUser.email}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  Current Session
                </span>
              </div>

              {/* Switchable Members Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Select Team Member Persona</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">Click to switch user context</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {switchableMembers.map((user) => {
                    const isActive = currentUser.email.toLowerCase() === user.email.toLowerCase();
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          loginAsUser(user);
                          setShowSaveSuccess(true);
                          setTimeout(() => setShowSaveSuccess(false), 2500);
                        }}
                        className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                          isActive
                            ? 'bg-indigo-600/20 border-indigo-500/60 text-slate-100 shadow-md ring-1 ring-indigo-500/30'
                            : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                        }`}
                      >
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-11 h-11 rounded-full border border-slate-700 object-cover shrink-0 shadow-sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs truncate text-slate-100">{user.name}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              user.role === 'pm' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {user.role === 'pm' ? 'PM' : 'Contributor'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{user.title}</p>
                          <p className="text-[10px] text-slate-500 truncate font-mono">{user.email}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SIGN OUT & SECURITY SCOPE */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Active Session Info */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Session Privileges & System Scope</span>
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">Authenticated Email:</span>
                    <span className="font-mono font-bold text-slate-200">{currentUser.email}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">Administrative Level:</span>
                    <span className="font-semibold text-indigo-300">
                      {isPM ? 'Full Administrative & EVM Approval Rights' : 'Team Contributor / Review Scope'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">Project Code Access:</span>
                    <span className="font-mono text-emerald-400 font-bold">{projectData.projectCode}</span>
                  </div>
                </div>
              </div>

              {/* Sign Out Card */}
              <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">Sign Out of ApexPM Session</h4>
                    <p className="text-xs text-slate-400">Terminates active session token and returns to login gate</p>
                  </div>
                </div>

                {!showConfirmLogout ? (
                  <button
                    onClick={() => setShowConfirmLogout(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-md shadow-rose-600/25"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 space-y-3 animate-fade-in">
                    <p className="text-xs font-semibold text-rose-200 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Are you sure you want to sign out? Your local offline changes are saved.</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          logout();
                          onClose();
                        }}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-sm"
                      >
                        Confirm Sign Out
                      </button>
                      <button
                        onClick={() => setShowConfirmLogout(false)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>ApexPM Local Profile Engine</span>
          </div>
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

