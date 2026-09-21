import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Stakeholder, StakeholderCategory, AppRole, APP_ROLES } from '../../types';
import {
  X,
  Users,
  Building2,
  AlertTriangle,
  Lock,
  ShieldCheck,
  Sparkles,
  Search,
  Check,
  UserCheck,
  Clock,
  DollarSign,
  ChevronDown,
  Layers,
  Zap,
  ArrowRight,
  Briefcase,
  UserPlus
} from 'lucide-react';
import {
  getTalentBenchPool,
  TalentBenchCandidate,
  TalentRoleCategory
} from '../../utils/talentPoolUtils';
import {
  normalizeToAppRole,
  isUserAdmin,
  isUserPM,
  canManageRolesAndTeam,
  getAppRoleBadge
} from '../../utils/roleUtils';

interface StakeholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  stakeholderToEdit?: Stakeholder | null;
  onOpenInviteModal?: (dataOrEmail?: string | { email?: string; name?: string; role?: string; category?: StakeholderCategory; stakeholderId?: string }) => void;
}

export const StakeholderModal: React.FC<StakeholderModalProps> = ({
  isOpen,
  onClose,
  stakeholderToEdit,
  onOpenInviteModal
}) => {
  const {
    saveStakeholder,
    currentUser,
    addActivityLog,
    allUsers,
    allProjectsMap,
    activeProjectId,
    projectData
  } = useProject();

  const isAdmin = isUserAdmin(currentUser);
  const isPM = isUserPM(currentUser);
  const canManageRoles = canManageRolesAndTeam(currentUser);

  const isEditable = useMemo(() => {
    if (canManageRoles) return true;
    if (!stakeholderToEdit) return false;
    if (stakeholderToEdit.id === currentUser?.id) return true;
    if (stakeholderToEdit.email && stakeholderToEdit.email.toLowerCase() === currentUser?.email.toLowerCase()) return true;
    return false;
  }, [canManageRoles, stakeholderToEdit, currentUser]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('Developer (Team member)');
  const [isDualPMDev, setIsDualPMDev] = useState(false);
  const [category, setCategory] = useState<StakeholderCategory>('internal');
  const [hourlyRate, setHourlyRate] = useState<number | ''>(100);
  const [skillsStr, setSkillsStr] = useState('');
  const [isDummy, setIsDummy] = useState(false);
  const [triggerInvite, setTriggerInvite] = useState(false);

  // Smart Talent Pool & Bench Drawer State
  const [isTalentPoolOpen, setIsTalentPoolOpen] = useState(false);
  const [talentSearch, setTalentSearch] = useState('');
  const [talentCategoryFilter, setTalentCategoryFilter] = useState<
    'all' | 'bench' | 'pm' | 'engineering' | 'architecture' | 'design' | 'devops_qa' | 'other_projects'
  >('all');
  const [importedNotice, setImportedNotice] = useState<{
    name: string;
    title: string;
    status: string;
  } | null>(null);

  // Typeahead state for name/email inputs
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false);
  const [isEmailDropdownOpen, setIsEmailDropdownOpen] = useState(false);
  const nameInputContainerRef = useRef<HTMLDivElement>(null);
  const emailInputContainerRef = useRef<HTMLDivElement>(null);

  // Calculate Real-time cross-project talent bench pool
  const talentBenchPool = useMemo(() => {
    return getTalentBenchPool(allUsers || [], allProjectsMap || {}, projectData?.id || activeProjectId || 'proj-1');
  }, [allUsers, allProjectsMap, projectData?.id, activeProjectId]);

  // Quick stats
  const talentStats = useMemo(() => {
    const total = talentBenchPool.length;
    const benchCount = talentBenchPool.filter(c => c.allocationStatus === 'bench').length;
    const pmCount = talentBenchPool.filter(c => c.roleCategory === 'pm' || c.user.role === 'pm').length;
    const currentInProject = talentBenchPool.filter(c => c.isInCurrentProject).length;
    return { total, benchCount, pmCount, currentInProject };
  }, [talentBenchPool]);

  // Filtered talent candidates in drawer
  const filteredCandidates = useMemo(() => {
    const q = talentSearch.toLowerCase().trim();
    return talentBenchPool.filter(item => {
      const u = item.user;
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        (u.title || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q) ||
        (u.skills || []).some(s => s.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (talentCategoryFilter === 'bench') {
        return item.allocationStatus === 'bench' || item.availableHours >= 30;
      }
      if (talentCategoryFilter === 'pm') {
        return item.roleCategory === 'pm' || u.role === 'pm';
      }
      if (talentCategoryFilter === 'engineering') {
        return item.roleCategory === 'engineering';
      }
      if (talentCategoryFilter === 'architecture') {
        return item.roleCategory === 'architecture';
      }
      if (talentCategoryFilter === 'design') {
        return item.roleCategory === 'design';
      }
      if (talentCategoryFilter === 'devops_qa') {
        return item.roleCategory === 'devops' || item.roleCategory === 'qa';
      }
      if (talentCategoryFilter === 'other_projects') {
        return item.activeProjects.length > 0 && !item.isInCurrentProject;
      }
      return true;
    });
  }, [talentBenchPool, talentSearch, talentCategoryFilter]);

  // Filter for inline typeahead
  const nameMatchingTalent = useMemo(() => {
    if (!name || name.trim().length < 2 || isDummy) return [];
    const q = name.toLowerCase().trim();
    return talentBenchPool.filter(
      c => c.user.name.toLowerCase().includes(q) || (c.user.title || '').toLowerCase().includes(q)
    ).slice(0, 5);
  }, [name, talentBenchPool, isDummy]);

  const emailMatchingTalent = useMemo(() => {
    if (!email || email.trim().length < 2 || isDummy) return [];
    const q = email.toLowerCase().trim();
    return talentBenchPool.filter(
      c => c.user.email.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [email, talentBenchPool, isDummy]);

  // Determine if the current user has permission to set/change the role
  // Rule: PM and Admin roles manage roles and hybrid assignments across the app.
  const canEditRole = useMemo(() => {
    if (!isEditable) return false;
    return canManageRoles;
  }, [isEditable, canManageRoles]);

  useEffect(() => {
    if (stakeholderToEdit) {
      setName(stakeholderToEdit.name);
      setEmail(stakeholderToEdit.email.includes('@placeholder') ? '' : stakeholderToEdit.email);
      const normalized = normalizeToAppRole(stakeholderToEdit.appRole || stakeholderToEdit.role);
      setRole(normalized);
      setIsDualPMDev(Boolean(stakeholderToEdit.isDualPMDev));
      setCategory(stakeholderToEdit.category || 'internal');
      setHourlyRate(stakeholderToEdit.hourlyRate || '');
      setSkillsStr(stakeholderToEdit.skills.join(', '));
      const isPlaceholderMember = Boolean(stakeholderToEdit.isPlaceholder || stakeholderToEdit.status === 'placeholder' || stakeholderToEdit.email.includes('@placeholder'));
      setIsDummy(isPlaceholderMember);
      setTriggerInvite(true);
      setImportedNotice(null);
    } else {
      setName('');
      setEmail('');
      setRole('Developer (Team member)');
      setIsDualPMDev(false);
      setCategory('internal');
      setHourlyRate(110);
      setSkillsStr('Agile, React, TypeScript');
      setIsDummy(false);
      setTriggerInvite(true);
      setImportedNotice(null);
    }
  }, [stakeholderToEdit, isOpen, canManageRoles, category]);

  if (!isOpen) return null;

  const handleSelectCandidate = (candidate: TalentBenchCandidate) => {
    const u = candidate.user;
    setName(u.name);
    setEmail(u.email);
    setCategory('internal');
    const norm = normalizeToAppRole(u.appRole || u.title || u.role);
    setRole(norm);
    setIsDualPMDev(Boolean(u.isDualPMDev));
    setHourlyRate(u.hourlyRate || 100);
    setSkillsStr((u.skills || []).join(', '));
    setIsDummy(false);
    setTriggerInvite(true);
    setIsNameDropdownOpen(false);
    setIsEmailDropdownOpen(false);
    setIsTalentPoolOpen(false);

    let statusText = '100% Bench Available';
    if (candidate.allocationStatus === 'partially_allocated') {
      statusText = `Partially Allocated (${candidate.availableHours}h Free)`;
    } else if (candidate.allocationStatus === 'fully_allocated' || candidate.allocationStatus === 'overallocated') {
      statusText = `Cross-Project (${candidate.activeProjects.map(p => p.code).join(', ')})`;
    }

    setImportedNotice({
      name: u.name,
      title: norm + (u.isDualPMDev ? ' (Dual PM & Dev)' : ''),
      status: statusText
    });
  };

  const handleSelectRolePreset = (presetRole: AppRole) => {
    setRole(presetRole);
    if (presetRole !== 'Developer (Team member)') {
      setIsDualPMDev(false);
    }
    if (!name && isDummy) {
      setName(`${presetRole} (Unassigned)`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable) return;
    const skills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);

    const rawEmail = email.trim();
    // If no email provided, automatically treat as dummy / placeholder
    const shouldBeDummy = isDummy || !rawEmail || !rawEmail.includes('@');

    let finalEmail = rawEmail;
    if (shouldBeDummy) {
      finalEmail = stakeholderToEdit?.email && stakeholderToEdit.email.includes('@placeholder')
        ? stakeholderToEdit.email
        : `unassigned.${(role || name || 'member').toLowerCase().replace(/[^a-z0-9]/g, '.')}@placeholder.local`;
    }

    const isNowInvited = !shouldBeDummy && finalEmail.includes('@') && !finalEmail.includes('@placeholder') && triggerInvite;
    const computedStatus = shouldBeDummy ? 'placeholder' : (isNowInvited ? 'invited' : (stakeholderToEdit?.status === 'invited' ? 'invited' : 'active'));

    const finalRole = normalizeToAppRole(role);
    const hasDualAccess = isDualPMDev || finalRole === 'Project Manager' || finalRole === 'Admin';

    // Match avatar if from existing directory
    const matchedUser = allUsers.find(
      u => u.email.toLowerCase() === finalEmail.toLowerCase() || (name.trim() && u.name.toLowerCase() === name.trim().toLowerCase())
    );

    const displayName = name.trim() || (shouldBeDummy ? `${finalRole} (Unassigned)` : 'New Team Member');

    await saveStakeholder({
      id: stakeholderToEdit?.id || matchedUser?.id,
      name: displayName,
      email: finalEmail,
      role: finalRole,
      appRole: finalRole,
      isDualPMDev: isDualPMDev,
      hasPMAccess: hasDualAccess,
      category,
      avatar: matchedUser?.avatar,
      hourlyRate: hourlyRate === '' ? 0 : Number(hourlyRate),
      weeklyCapacityHours: 40,
      skills: skills.length > 0 ? skills : [finalRole, 'Agile'],
      status: computedStatus,
      isPlaceholder: shouldBeDummy,
      createdBy: stakeholderToEdit?.createdBy || currentUser?.id,
      createdByEmail: stakeholderToEdit?.createdByEmail || currentUser?.email
    });

    if (isNowInvited && onOpenInviteModal) {
      onOpenInviteModal({
        email: finalEmail,
        name: displayName,
        role: finalRole,
        category,
        stakeholderId: stakeholderToEdit?.id
      });
    } else {
      addActivityLog({
        user: currentUser?.name || 'User',
        userEmail: currentUser?.email || '',
        action: shouldBeDummy ? 'Saved Dummy/Placeholder Member' : (stakeholderToEdit ? 'Updated Stakeholder' : 'Added Team Member'),
        details: shouldBeDummy
          ? `Saved dummy/placeholder member profile "${displayName}" (${finalRole}). Tasks can be assigned immediately; invite will be triggered once an email is attached.`
          : `Saved team member "${displayName}" (${finalEmail}) with role "${finalRole}".`,
        category: 'stakeholder'
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl h-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base sm:text-lg">
                {stakeholderToEdit ? 'Edit Team Member Profile' : 'Add Team Member to Project'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Assign PMs, bench resources, and specialists across all organization projects
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          {!isEditable && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <div>
                <strong className="block text-amber-200 font-bold">Read-Only Mode</strong>
                <span>
                  Team members cannot edit details of other team members or add new stakeholders. Only Project Managers or Executive Admins may add or modify team members.
                </span>
              </div>
            </div>
          )}

          {/* Smart Talent Pool & Bench Import Section */}
          {!stakeholderToEdit && isEditable && (
            <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 overflow-hidden shadow-lg shadow-indigo-950/20">
              <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-500/20 bg-indigo-950/40">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-indigo-100 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        Admin Talent Pool & Bench Fetcher
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-medium">
                        {talentStats.benchCount} on Bench Available
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Smart fetch PMs, engineers & bench staff from across all projects with certified admin rates
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTalentPoolOpen(!isTalentPoolOpen)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shrink-0 ${
                    isTalentPoolOpen
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-indigo-900/50 hover:bg-indigo-800/60 text-indigo-200 border border-indigo-500/30'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isTalentPoolOpen ? 'Hide Directory' : 'Browse Talent Pool & Bench'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isTalentPoolOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Collapsible Talent Explorer */}
              {isTalentPoolOpen && (
                <div className="p-3.5 sm:p-4 space-y-3 bg-slate-950/80 animate-fade-in">
                  {/* Search and Category Filter Tabs */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={talentSearch}
                        onChange={(e) => setTalentSearch(e.target.value)}
                        placeholder="Search by name, PM, engineering, skills (React, CI/CD, Agile)..."
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
                      />
                      {talentSearch && (
                        <button
                          type="button"
                          onClick={() => setTalentSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-[11px]">
                      {[
                        { id: 'all', label: `All (${talentStats.total})` },
                        { id: 'bench', label: `🟢 On Bench (${talentStats.benchCount})` },
                        { id: 'pm', label: `👔 PMs (${talentStats.pmCount})` },
                        { id: 'engineering', label: '💻 Engineering' },
                        { id: 'architecture', label: '🏛️ Architecture' },
                        { id: 'design', label: '🎨 Design' },
                        { id: 'devops_qa', label: '⚡ DevOps & QA' },
                        { id: 'other_projects', label: '🌐 Other Projects' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setTalentCategoryFilter(tab.id as any)}
                          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors border ${
                            talentCategoryFilter === tab.id
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Candidates List */}
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {filteredCandidates.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        No team members or bench profiles found matching your search.
                      </div>
                    ) : (
                      filteredCandidates.map(candidate => {
                        const u = candidate.user;
                        const isCurrent = candidate.isInCurrentProject;
                        const isBench = candidate.allocationStatus === 'bench';
                        const isPartial = candidate.allocationStatus === 'partially_allocated';

                        return (
                          <div
                            key={u.id}
                            className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isCurrent
                                ? 'bg-slate-900/60 border-slate-800/80 opacity-75'
                                : isBench
                                ? 'bg-emerald-950/20 hover:bg-emerald-950/40 border-emerald-500/30'
                                : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="relative shrink-0 mt-0.5">
                                <img
                                  src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`}
                                  alt={u.name}
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 rounded-full object-cover border border-slate-700 shadow-sm"
                                />
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                                    isCurrent
                                      ? 'bg-slate-500'
                                      : isBench
                                      ? 'bg-emerald-400 ring-2 ring-emerald-500/20'
                                      : isPartial
                                      ? 'bg-amber-400'
                                      : 'bg-indigo-400'
                                  }`}
                                  title={
                                    isCurrent
                                      ? 'Already on this project'
                                      : isBench
                                      ? '100% Available on Bench'
                                      : isPartial
                                      ? `Partially Available (${candidate.availableHours}h Free)`
                                      : 'Allocated on Other Projects'
                                  }
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-100 text-xs truncate">{u.name}</span>
                                  {u.role === 'admin' && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                                      Admin
                                    </span>
                                  )}
                                  {u.role === 'pm' && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                                      PM Lead
                                    </span>
                                  )}
                                  {u.department && (
                                    <span className="text-[9px] text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700">
                                      {u.department}
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] text-slate-300 truncate mt-0.5">{u.title || u.role}</p>

                                <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px]">
                                  {/* Real-time Allocation Pill */}
                                  {isCurrent ? (
                                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      Already in this project
                                    </span>
                                  ) : isBench ? (
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                                      <Zap className="w-3 h-3 text-emerald-400" />
                                      100% Bench Available ({candidate.weeklyCapacity}h Free)
                                    </span>
                                  ) : isPartial ? (
                                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-400" />
                                      {candidate.availableHours}h Free ({candidate.totalAssignedHours}h in {candidate.activeProjects.length} projs)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                                      <Layers className="w-3 h-3 text-indigo-400" />
                                      Active on {candidate.activeProjects.map(p => p.code).join(', ')}
                                    </span>
                                  )}

                                  <span className="text-slate-400 font-mono">
                                    ${u.hourlyRate || 90}/h
                                  </span>
                                </div>

                                {/* Skills */}
                                {u.skills && u.skills.length > 0 && (
                                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                    {u.skills.slice(0, 4).map((skill, sIdx) => (
                                      <span
                                        key={sIdx}
                                        className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60"
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                    {u.skills.length > 4 && (
                                      <span className="text-[9px] text-slate-500">
                                        +{u.skills.length - 4}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectCandidate(candidate)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-all ${
                                isCurrent
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                  : isBench
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                              }`}
                            >
                              {isCurrent ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Edit Profile</span>
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>Select & Auto-Fill</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notice when candidate auto-filled */}
          {importedNotice && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2 animate-fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Auto-filled profile from Admin Directory:{' '}
                  <strong className="text-white">{importedNotice.name}</strong> ({importedNotice.title}) •{' '}
                  <span className="text-emerald-400 font-semibold">{importedNotice.status}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setImportedNotice(null)}
                className="text-emerald-400 hover:text-emerald-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Banner for Placeholder / Dummy Member */}
            {isDummy && (
              <div className="p-3 bg-purple-950/40 border border-purple-500/30 rounded-xl flex items-start gap-2.5 text-purple-200 animate-fade-in">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 min-w-0">
                  <span className="font-bold block text-purple-100">Dummy / Placeholder Stakeholder Profile</span>
                  <p className="text-[11px] text-purple-300/80 leading-relaxed">
                    This profile reserves project team capacity and can be assigned tasks immediately. When you attach an email address and save, an official invitation link will be dispatched.
                  </p>
                </div>
              </div>
            )}

            {/* Dummy / Placeholder Mode Toggle */}
            <div className="p-3 bg-slate-950/60 border border-indigo-500/30 rounded-xl flex items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-indigo-200 block cursor-pointer">
                  Create as Dummy / Placeholder Member (No Email Required)
                </label>
                <p className="text-[11px] text-slate-400">
                  Allocate tasks, sprint workload, and RACI roles now without sending an email invite.
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

            {/* Full Name with Autocomplete */}
            <div ref={nameInputContainerRef} className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 font-semibold">
                  Full Name {isDummy ? '(Optional / Role Placeholder)' : '*'}
                </label>
                {!isDummy && (
                  <span className="text-[10px] text-slate-400">
                    Type to match registered users & bench staff
                  </span>
                )}
              </div>
              <input
                type="text"
                disabled={!isEditable}
                value={name}
                onFocus={() => setIsNameDropdownOpen(true)}
                onChange={(e) => {
                  setName(e.target.value);
                  setIsNameDropdownOpen(true);
                }}
                placeholder={isDummy ? "e.g. Lead Project Manager (Unassigned)" : "e.g. Sarah Jenkins"}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-teal-500 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              />

              {/* Typeahead Suggestions Dropdown */}
              {isNameDropdownOpen && nameMatchingTalent.length > 0 && !isDummy && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-indigo-500/40 rounded-xl shadow-2xl z-50 p-1.5 space-y-1 animate-fade-in max-h-48 overflow-y-auto custom-scrollbar">
                  <div className="px-2 py-1 text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Matching Organization Directory</span>
                    <button
                      type="button"
                      onClick={() => setIsNameDropdownOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {nameMatchingTalent.map(candidate => (
                    <button
                      key={candidate.user.id}
                      type="button"
                      onClick={() => handleSelectCandidate(candidate)}
                      className="w-full text-left p-2 rounded-lg bg-slate-950/60 hover:bg-indigo-950/50 hover:border-indigo-500/40 border border-transparent flex items-center justify-between gap-2 transition-all text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={candidate.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(candidate.user.name)}`}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-6 h-6 rounded-full shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-200 block truncate">{candidate.user.name}</span>
                          <span className="text-[10px] text-slate-400 block truncate">{candidate.user.title || candidate.user.email}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                        candidate.allocationStatus === 'bench'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-indigo-500/20 text-indigo-300'
                      }`}>
                        {candidate.allocationStatus === 'bench' ? '🟢 Bench Available' : `${candidate.availableHours}h Free`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
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
                  <option value="internal">🏢 Internal Stakeholder / PM</option>
                  <option value="external">🌐 External Stakeholder</option>
                </select>
              </div>

              {/* Email Address with Autocomplete */}
              <div ref={emailInputContainerRef} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-semibold">
                    Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  {!email && (
                    <span className="text-[10px] text-purple-300 font-medium">
                      Dummy mode if blank
                    </span>
                  )}
                </div>
                <input
                  type="email"
                  disabled={!isEditable}
                  value={email}
                  onFocus={() => setIsEmailDropdownOpen(true)}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setIsEmailDropdownOpen(true);
                  }}
                  placeholder="Leave blank for dummy member, or enter email to invite"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />

                {/* Email Suggestions Dropdown */}
                {isEmailDropdownOpen && emailMatchingTalent.length > 0 && !isDummy && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-indigo-500/40 rounded-xl shadow-2xl z-50 p-1.5 space-y-1 animate-fade-in max-h-48 overflow-y-auto custom-scrollbar">
                    <div className="px-2 py-1 text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                      <span>Matching Organization Directory</span>
                      <button
                        type="button"
                        onClick={() => setIsEmailDropdownOpen(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {emailMatchingTalent.map(candidate => (
                      <button
                        key={candidate.user.id}
                        type="button"
                        onClick={() => handleSelectCandidate(candidate)}
                        className="w-full text-left p-2 rounded-lg bg-slate-950/60 hover:bg-indigo-950/50 hover:border-indigo-500/40 border border-transparent flex items-center justify-between gap-2 transition-all text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-200 block truncate">{candidate.user.name}</span>
                          <span className="text-[10px] text-indigo-400 block truncate">{candidate.user.email}</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono shrink-0">
                          ${candidate.user.hourlyRate}/h
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Trigger Email Invitation option (shown when email is provided) */}
            {email && email.includes('@') && !email.includes('@placeholder') && (
              <div className="p-3 bg-teal-950/40 border border-teal-500/20 rounded-xl flex items-center justify-between gap-3 animate-fade-in">
                <div>
                  <label className="text-xs font-bold text-teal-300 block cursor-pointer">
                    📧 Dispatch Project Invitation with Join Link
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Sends an invitation email with a secure join link so the recipient can join this project and take over this profile.
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

            {/* Role & Canonical Role Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-300 font-semibold">
                  Canonical Project Role *
                </label>
                {canManageRoles && (
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Role Managed by {isAdmin ? 'Admin' : 'Project Manager'}
                  </span>
                )}
              </div>

              {/* Canonical Role Selector */}
              <select
                disabled={!isEditable || !canEditRole}
                value={role}
                onChange={(e) => {
                  const selectedRole = e.target.value as AppRole;
                  setRole(selectedRole);
                  if (selectedRole !== 'Developer (Team member)') {
                    setIsDualPMDev(false);
                  }
                  if (selectedRole === 'Admin') setHourlyRate(175);
                  else if (selectedRole === 'Project Manager') setHourlyRate(120);
                  else if (selectedRole === 'Developer (Team member)') setHourlyRate(100);
                  else if (selectedRole === 'Tester (Team Member)') setHourlyRate(90);
                  else if (selectedRole === 'UI/UX Dev (Team Member)') setHourlyRate(95);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-medium outline-none focus:border-teal-500 text-xs disabled:opacity-60 disabled:cursor-not-allowed mb-2.5"
              >
                {APP_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {/* Dual Role Toggle: Developer + PM */}
              {(role === 'Developer (Team member)' || isDualPMDev) && (
                <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-start justify-between gap-3 animate-fade-in mb-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                      <label className="text-xs font-bold text-amber-200 cursor-pointer">
                        Enable Dual Role: Developer & Project Manager
                      </label>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                        Hybrid PM Access
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-300/80 leading-relaxed">
                      Grants full Project Manager privileges (managing sprints, WBS, team roles, and budget) while keeping developer task ownership and assignment. Handled by PM and Admin roles only.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!isEditable || !canEditRole}
                    checked={isDualPMDev}
                    onChange={(e) => setIsDualPMDev(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 cursor-pointer rounded mt-0.5"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  placeholder="e.g. Project Management, Agile, React (Optional)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
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
                  className={`px-4 sm:px-5 py-2 rounded-xl text-white font-semibold text-xs shadow-md whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all ${
                    !email || isDummy
                      ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                      : triggerInvite
                      ? 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>
                    {!email || isDummy
                      ? (stakeholderToEdit ? 'Save Placeholder Profile' : 'Create Dummy Member')
                      : triggerInvite
                      ? 'Save & Send Invite'
                      : (stakeholderToEdit ? 'Save Changes' : 'Add Team Member')}
                  </span>
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
