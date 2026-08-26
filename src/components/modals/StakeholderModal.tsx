import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Stakeholder, StakeholderCategory } from '../../types';
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
  const {
    saveStakeholder,
    currentUser,
    addActivityLog,
    allUsers,
    allProjectsMap,
    activeProjectId,
    projectData
  } = useProject();

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
  // Rule: ONLY an admin can set roles for internal stakeholders, unless imported from Admin Registry.
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
      setImportedNotice(null);
    } else {
      setName('');
      setEmail('');
      setRole(category === 'internal' && !isAdmin ? 'Contributor' : '');
      setCategory('internal');
      setHourlyRate(90);
      setSkillsStr('Agile, React, TypeScript');
      setIsDummy(false);
      setTriggerInvite(true);
      setImportedNotice(null);
    }
  }, [stakeholderToEdit, isOpen, isAdmin, category]);

  if (!isOpen) return null;

  const handleSelectCandidate = (candidate: TalentBenchCandidate) => {
    const u = candidate.user;
    setName(u.name);
    setEmail(u.email);
    setCategory('internal');
    setRole(u.title || (u.role === 'pm' ? 'Project Manager' : 'Team Member'));
    setHourlyRate(u.hourlyRate || 90);
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
      title: u.title || u.role.toUpperCase(),
      status: statusText
    });
  };

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
      finalRole = role || stakeholderToEdit?.role || 'Contributor';
    }
    if (!finalRole) {
      finalRole = 'Contributor';
    }

    // Match avatar if from existing directory
    const matchedUser = allUsers.find(
      u => u.email.toLowerCase() === finalEmail.toLowerCase() || u.name.toLowerCase() === name.trim().toLowerCase()
    );

    await saveStakeholder({
      id: stakeholderToEdit?.id || matchedUser?.id,
      name: name.trim() || (isDummy ? `${finalRole || 'Placeholder'} (Unassigned)` : 'New Team Member'),
      email: finalEmail,
      role: finalRole,
      category,
      avatar: matchedUser?.avatar,
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
        action: isDummy ? 'Created Placeholder Stakeholder' : (stakeholderToEdit ? 'Updated Stakeholder' : 'Added Team Member'),
        details: isDummy
          ? `Added placeholder stakeholder profile "${finalRole || name}" to project team.`
          : `Added/updated team member "${name}" (${finalEmail}) with role "${finalRole}" from organizational directory.`,
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
            {/* Dummy / Placeholder Mode Toggle */}
            <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl flex items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-indigo-200 block cursor-pointer">
                  Create as Dummy / Placeholder Stakeholder
                </label>
                <p className="text-[11px] text-slate-400">
                  Reserve team allocation before assigning a real person. You can attach their email later to send an invitation link.
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
                  Full Name {isDummy ? '(Optional)' : '*'}
                </label>
                {!isDummy && (
                  <span className="text-[10px] text-slate-400">
                    Type to match registered users & bench staff
                  </span>
                )}
              </div>
              <input
                type="text"
                required={!isDummy}
                disabled={!isEditable}
                value={name}
                onFocus={() => setIsNameDropdownOpen(true)}
                onChange={(e) => {
                  setName(e.target.value);
                  setIsNameDropdownOpen(true);
                }}
                placeholder={isDummy ? "e.g. Lead Frontend Engineer (Unassigned)" : "e.g. Sarah Jenkins"}
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
                  <option value="internal">🏢 Internal Stakeholder</option>
                  <option value="external">🌐 External Stakeholder</option>
                </select>
              </div>

              {/* Email Address with Autocomplete */}
              <div ref={emailInputContainerRef} className="relative">
                <label className="block text-slate-300 font-semibold mb-1">
                  Email Address {isDummy ? '(Optional / Pending)' : '*'}
                </label>
                <input
                  type="email"
                  required={!isDummy}
                  disabled={!isEditable}
                  value={email}
                  onFocus={() => setIsEmailDropdownOpen(true)}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setIsEmailDropdownOpen(true);
                  }}
                  placeholder={isDummy ? "pending.invite@company.com" : "sarah.j@company.com"}
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
                disabled={!isEditable || (!canEditRole && !role)}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder={category === 'internal' ? 'e.g. Lead QA Engineer (Admin Set)' : 'e.g. Client Project Director'}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {!canEditRole && category === 'internal' && !role && (
                <p className="text-[11px] text-amber-300/80 mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 shrink-0" />
                  <span>Internal stakeholder roles are governed by the Executive Admin. Selecting from the directory automatically applies certified titles.</span>
                </p>
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
                  placeholder="e.g. React, Docker, Security (Optional)"
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
                  className="px-4 sm:px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-md shadow-teal-600/20 whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{stakeholderToEdit ? 'Save Changes' : 'Add to Project Team'}</span>
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
