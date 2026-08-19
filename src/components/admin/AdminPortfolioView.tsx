import React, { useState, useMemo, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  ProjectData,
  Stakeholder,
  MemberLeave,
  LeaveStatus,
  LeaveType,
  UserRole,
  StandardRateCard,
  OrganizationSettings,
  PortfolioInsight
} from '../../types';
import {
  calculatePortfolioCommercials,
  calculateCrossProjectWorkloads,
  generatePortfolioInsights,
  DEFAULT_RATE_CARDS,
  CrossProjectMemberWorkload
} from '../../utils/portfolioAndLeaveUtils';
import { LeaveRequestModal } from './LeaveRequestModal';
import { LeaveManagement } from './LeaveManagement';
import { IndividualReportCardModal } from '../modals/IndividualReportCardModal';
import {
  Building2,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Briefcase,
  Shield,
  ShieldCheck,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Sliders,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Layers,
  Award,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw,
  Edit3,
  Plane,
  HeartPulse,
  BookOpen,
  Coffee,
  HelpCircle,
  UserCheck,
  UserPlus,
  FileSpreadsheet,
  Code,
  Laptop,
  CheckSquare
} from 'lucide-react';

interface AdminPortfolioViewProps {
  onSwitchToProjectView?: (projectId: string) => void;
}

export const AdminPortfolioView: React.FC<AdminPortfolioViewProps> = ({ onSwitchToProjectView }) => {
  const {
    allProjectsMap,
    projectsList,
    activeProjectId,
    switchProject,
    allUsers,
    currentUser,
    leaves,
    orgSettings,
    saveLeave,
    deleteLeave,
    updateLeaveStatus,
    updateOrgSettings,
    promoteUserRole,
    assignProjectManager
  } = useProject();

  const isAdmin = currentUser.role === 'admin';

  // Active Tab within Admin Portfolio
  const [activeTab, setActiveTab] = useState<
    'portfolio' | 'resources' | 'stakeholders' | 'leaves' | 'commercials' | 'insights' | 'access'
  >('portfolio');

  // Guard against non-admin accessing admin-only tabs
  useEffect(() => {
    if (!isAdmin && (activeTab === 'commercials' || activeTab === 'access')) {
      setActiveTab('portfolio');
    }
  }, [isAdmin, activeTab]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'all' | LeaveStatus>('all');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<'all' | LeaveType>('all');
  const [resourceFilter, setResourceFilter] = useState<'all' | 'overallocated' | 'on_leave' | 'available'>('all');
  const [selectedTechSkillFilter, setSelectedTechSkillFilter] = useState<string>('all');
  const [stakeholderRoleFilter, setStakeholderRoleFilter] = useState<'all' | 'pm' | 'developer' | 'qa_design' | 'admin'>('all');

  // Modals state
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedUserForLeave, setSelectedUserForLeave] = useState<string | undefined>(undefined);
  const [selectedStakeholderForReportCard, setSelectedStakeholderForReportCard] = useState<Stakeholder | null>(null);
  const [editingRateCard, setEditingRateCard] = useState<StandardRateCard | null>(null);
  const [editingSettings, setEditingSettings] = useState<OrganizationSettings>(orgSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Convert allProjectsMap to array of ProjectData
  const projectsArray = useMemo(() => {
    return Object.values(allProjectsMap);
  }, [allProjectsMap]);

  // Aggregated Portfolio Commercials
  const portfolioStats = useMemo(() => {
    return calculatePortfolioCommercials(projectsArray, orgSettings.rateCards || DEFAULT_RATE_CARDS);
  }, [projectsArray, orgSettings.rateCards]);

  // Cross Project Member Workloads
  const memberWorkloads = useMemo(() => {
    return calculateCrossProjectWorkloads(projectsArray, allUsers, leaves);
  }, [projectsArray, allUsers, leaves]);

  // AI Portfolio Insights
  const portfolioInsights = useMemo(() => {
    return generatePortfolioInsights(projectsArray, allUsers, leaves);
  }, [projectsArray, allUsers, leaves]);

  // Filtered Leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter(l => {
      if (leaveStatusFilter !== 'all' && l.status !== leaveStatusFilter) return false;
      if (leaveTypeFilter !== 'all' && l.leaveType !== leaveTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = l.userName.toLowerCase().includes(q);
        const matchReason = l.reason.toLowerCase().includes(q);
        const matchRole = (l.role || '').toLowerCase().includes(q);
        if (!matchName && !matchReason && !matchRole) return false;
      }
      return true;
    });
  }, [leaves, leaveStatusFilter, leaveTypeFilter, searchQuery]);

  // Filtered Resources
  const filteredResources = useMemo(() => {
    return memberWorkloads.filter(m => {
      if (resourceFilter === 'overallocated' && !m.isOverallocated) return false;
      if (resourceFilter === 'on_leave' && !m.activeLeave) return false;
      if (resourceFilter === 'available' && (m.isOverallocated || m.activeLeave)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = m.name.toLowerCase().includes(q);
        const matchRole = m.role.toLowerCase().includes(q);
        const matchDept = (m.department || '').toLowerCase().includes(q);
        if (!matchName && !matchRole && !matchDept) return false;
      }
      return true;
    });
  }, [memberWorkloads, resourceFilter, searchQuery]);

  // Aggregated Cross-Project Stakeholders and Talent Inventory
  const allPortfolioStakeholders = useMemo(() => {
    const map = new Map<string, {
      stakeholder: Stakeholder;
      userProfile?: typeof allUsers[0];
      assignedProjects: { projectId: string; projectCode: string; projectName: string; role: string; assignedTasksCount: number }[];
      skills: string[];
      isPM: boolean;
      isDeveloper: boolean;
      isQaOrDesign: boolean;
      totalTasks: number;
      completedTasks: number;
    }>();

    // Collect all stakeholders from all projects
    projectsArray.forEach(proj => {
      (proj.stakeholders || []).forEach(sh => {
        const key = (sh.email || sh.id).toLowerCase();
        const existing = map.get(key);
        const projectTasks = (proj.tasks || []).filter(t => (t.assigneeIds || []).includes(sh.id));
        const projRole = sh.role || 'Contributor';
        const roleLower = projRole.toLowerCase();
        const isPmRole = roleLower.includes('manager') || roleLower.includes('pm') || roleLower.includes('master') || roleLower.includes('lead');
        const isDevRole = roleLower.includes('dev') || roleLower.includes('engineer') || roleLower.includes('architect') || roleLower.includes('full') || roleLower.includes('backend') || roleLower.includes('frontend');
        const isQaDesign = roleLower.includes('qa') || roleLower.includes('test') || roleLower.includes('design') || roleLower.includes('ux') || roleLower.includes('ui');

        if (!existing) {
          const matchedUser = allUsers.find(u => u.email.toLowerCase() === key || u.id === sh.id);
          const initialSkills = Array.from(new Set([...(sh.skills || []), ...(matchedUser?.title ? [matchedUser.title] : [])]));
          map.set(key, {
            stakeholder: sh,
            userProfile: matchedUser,
            assignedProjects: [{
              projectId: proj.id,
              projectCode: proj.projectCode,
              projectName: proj.projectName,
              role: projRole,
              assignedTasksCount: projectTasks.length
            }],
            skills: initialSkills,
            isPM: isPmRole || matchedUser?.role === 'pm',
            isDeveloper: isDevRole,
            isQaOrDesign: isQaDesign,
            totalTasks: projectTasks.length,
            completedTasks: projectTasks.filter(t => t.status === 'done').length
          });
        } else {
          // Merge skills
          sh.skills?.forEach(s => {
            if (!existing.skills.includes(s)) existing.skills.push(s);
          });
          if (isPmRole) existing.isPM = true;
          if (isDevRole) existing.isDeveloper = true;
          if (isQaDesign) existing.isQaOrDesign = true;
          existing.totalTasks += projectTasks.length;
          existing.completedTasks += projectTasks.filter(t => t.status === 'done').length;
          if (!existing.assignedProjects.some(p => p.projectId === proj.id)) {
            existing.assignedProjects.push({
              projectId: proj.id,
              projectCode: proj.projectCode,
              projectName: proj.projectName,
              role: projRole,
              assignedTasksCount: projectTasks.length
            });
          }
        }
      });
    });

    // Ensure all non-admin registered system users from allUsers are also represented
    allUsers.forEach(u => {
      if (u.role === 'admin' || u.email.toLowerCase() === 'admin@apex.io') return;
      const key = u.email.toLowerCase();
      const roleLower = (u.title || u.role).toLowerCase();
      const isPmRole = u.role === 'pm' || roleLower.includes('pm') || roleLower.includes('manager');
      const isDevRole = roleLower.includes('dev') || roleLower.includes('engineer') || roleLower.includes('architect');
      const isQaDesign = roleLower.includes('qa') || roleLower.includes('design') || roleLower.includes('ux');

      if (!map.has(key)) {
        map.set(key, {
          stakeholder: {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.title || (u.role === 'pm' ? 'Project Manager' : 'Team Contributor'),
            avatar: u.avatar,
            hourlyRate: u.hourlyRate || 95,
            weeklyCapacityHours: u.weeklyCapacityHours || 40,
            skills: ['Full-Stack', 'Engineering', 'Agile'],
            status: 'active'
          },
          userProfile: u,
          assignedProjects: [],
          skills: ['Full-Stack', 'Engineering', 'Agile'],
          isPM: isPmRole,
          isDeveloper: isDevRole || (!isPmRole && !isQaDesign),
          isQaOrDesign: isQaDesign,
          totalTasks: 0,
          completedTasks: 0
        });
      }
    });

    return Array.from(map.values());
  }, [projectsArray, allUsers]);

  // Tech skills breakdown catalog
  const techSkillsCatalog = useMemo(() => {
    const counts: Record<string, number> = {};
    allPortfolioStakeholders.forEach(item => {
      item.skills.forEach(skill => {
        const norm = skill.trim();
        if (norm) {
          counts[norm] = (counts[norm] || 0) + 1;
        }
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allPortfolioStakeholders]);

  // Filtered Stakeholders for Matrix
  const filteredPortfolioStakeholders = useMemo(() => {
    return allPortfolioStakeholders.filter(item => {
      // Role filter
      if (stakeholderRoleFilter === 'pm' && !item.isPM && item.userProfile?.role !== 'pm') return false;
      if (stakeholderRoleFilter === 'admin' && item.userProfile?.role !== 'admin') return false;
      if (stakeholderRoleFilter === 'developer' && !item.isDeveloper) return false;
      if (stakeholderRoleFilter === 'qa_design' && !item.isQaOrDesign) return false;

      // Tech skill filter
      if (selectedTechSkillFilter !== 'all') {
        const hasSkill = item.skills.some(
          s => s.toLowerCase() === selectedTechSkillFilter.toLowerCase()
        );
        if (!hasSkill) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.stakeholder.name.toLowerCase().includes(q);
        const matchEmail = item.stakeholder.email.toLowerCase().includes(q);
        const matchRole = item.stakeholder.role.toLowerCase().includes(q);
        const matchSkills = item.skills.some(s => s.toLowerCase().includes(q));
        const matchProjects = item.assignedProjects.some(
          p => p.projectCode.toLowerCase().includes(q) || p.projectName.toLowerCase().includes(q)
        );
        if (!matchName && !matchEmail && !matchRole && !matchSkills && !matchProjects) {
          return false;
        }
      }

      return true;
    });
  }, [allPortfolioStakeholders, stakeholderRoleFilter, selectedTechSkillFilter, searchQuery]);

  // Handle Rate Card Save
  const handleSaveRateCard = async (updatedCard: StandardRateCard) => {
    const existing = orgSettings.rateCards || DEFAULT_RATE_CARDS;
    const nextCards = existing.map(c => (c.id === updatedCard.id ? updatedCard : c));
    if (!existing.some(c => c.id === updatedCard.id)) {
      nextCards.push(updatedCard);
    }
    await updateOrgSettings({ rateCards: nextCards });
    setEditingRateCard(null);
  };

  // Handle Settings Save
  const handleSaveOrgSettings = async () => {
    setIsSavingSettings(true);
    await updateOrgSettings(editingSettings);
    setIsSavingSettings(false);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner: Executive Operations & PMO Command Center */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5" />
              <span>Executive PMO & Portfolio Operations Hub</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Organization Command Center
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Multi-project governance, cross-initiative resource capacity, leave availability blocking, commercial margin tracking, and automated PMO decision intelligence.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setSelectedUserForLeave(undefined);
                setIsLeaveModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>{isAdmin ? 'Log / Approve Leave' : 'Request Leave'}</span>
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>AI Insights ({portfolioInsights.length})</span>
            </button>
          </div>
        </div>

        {/* Global Portfolio KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Contract Value</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-lg font-extrabold text-white font-mono">
              ${(portfolioStats.totalContract / 1000).toFixed(0)}k
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{portfolioStats.projectsCount} Active Projects</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Actual Cost (AC)</span>
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <p className="text-lg font-extrabold text-indigo-300 font-mono">
              ${(portfolioStats.totalActual / 1000).toFixed(0)}k
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">EV: ${(portfolioStats.totalEarned / 1000).toFixed(0)}k</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Gross Margin</span>
              <Award className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className={`text-lg font-extrabold font-mono ${
              portfolioStats.portfolioMarginPercent >= 30 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {portfolioStats.portfolioMarginPercent}%
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">${(portfolioStats.portfolioMarginDollars / 1000).toFixed(0)}k Projected</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Portfolio CPI</span>
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <p className={`text-lg font-extrabold font-mono ${
              portfolioStats.portfolioCPI >= 1.0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {portfolioStats.portfolioCPI.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Cost Efficiency</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Portfolio SPI</span>
              <Clock className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <p className={`text-lg font-extrabold font-mono ${
              portfolioStats.portfolioSPI >= 1.0 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {portfolioStats.portfolioSPI.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Schedule Velocity</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Leaves on Record</span>
              <Plane className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <p className="text-lg font-extrabold text-sky-300 font-mono">
              {leaves.length}
            </p>
            <p className="text-[10px] text-amber-400 mt-0.5">
              {leaves.filter(l => l.status === 'pending').length} Pending Approval
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Responsive Bar with Mobile Selector & Tablet/Desktop Scrollable Pills */}
      <div className="space-y-3">
        {/* Mobile Dropdown View (< lg) */}
        <div className="block lg:hidden">
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
            Portfolio Navigation View
          </label>
          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-semibold text-slate-100 focus:outline-none focus:border-indigo-500 appearance-none pr-10 shadow-lg"
            >
              <option value="portfolio">📂 Multi-Project Portfolio ({projectsArray.length})</option>
              <option value="resources">👥 Cross-Project Workloads ({memberWorkloads.length})</option>
              <option value="stakeholders">⭐ Stakeholders &amp; Talent Matrix ({allPortfolioStakeholders.length})</option>
              <option value="leaves">
                📅 Leave &amp; Availability Block {leaves.filter(l => l.status === 'pending').length > 0 ? `(${leaves.filter(l => l.status === 'pending').length} Pending)` : `(${leaves.length})`}
              </option>
              {isAdmin && <option value="commercials">💲 Commercials &amp; Rate Cards</option>}
              <option value="insights">✨ AI Decision Intelligence ({portfolioInsights.length})</option>
              {isAdmin && <option value="access">🛡️ Roles &amp; PM Assignment</option>}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              ▼
            </div>
          </div>
        </div>

        {/* Desktop & Tablet Pill Tabs (>= lg or horizontal scrollable) */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl overflow-x-auto no-scrollbar shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
              activeTab === 'portfolio'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>Multi-Project Portfolio</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'portfolio' ? 'bg-indigo-700/80 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              {projectsArray.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
              activeTab === 'resources'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Cross-Project Workloads</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'resources' ? 'bg-indigo-700/80 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              {memberWorkloads.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stakeholders')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
              activeTab === 'stakeholders'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span>Stakeholders &amp; Talent Matrix</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'stakeholders' ? 'bg-indigo-700/80 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              {allPortfolioStakeholders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leaves')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
              activeTab === 'leaves'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Leave &amp; Availability Block</span>
            {leaves.filter(l => l.status === 'pending').length > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black animate-pulse">
                {leaves.filter(l => l.status === 'pending').length}
              </span>
            ) : (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'leaves' ? 'bg-indigo-700/80 text-white' : 'bg-slate-800 text-slate-300'
              }`}>
                {leaves.length}
              </span>
            )}
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('commercials')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'commercials'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <DollarSign className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Commercials &amp; Rate Cards</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('insights')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
              activeTab === 'insights'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
            <span>AI Decision Intelligence</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'insights' ? 'bg-amber-700/80 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              {portfolioInsights.length}
            </span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('access')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'access'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0 text-indigo-400" />
              <span>Roles &amp; PM Assignment</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= TAB 1: MULTI-PROJECT PORTFOLIO ================= */}
      {activeTab === 'portfolio' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-100">Enterprise Project Roster</h2>
              <p className="text-xs text-slate-400">
                Comparative status, earned value parameters, assigned PMs, and real-time execution health.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search projects or PM..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolioStats.projectCommercialsList
              .filter(p => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (
                  p.projectName.toLowerCase().includes(q) ||
                  p.projectCode.toLowerCase().includes(q) ||
                  (p.pmName || '').toLowerCase().includes(q)
                );
              })
              .map(proj => {
                const isCurrentActive = proj.projectId === activeProjectId;
                return (
                  <div
                    key={proj.projectId}
                    className={`rounded-3xl bg-slate-900/90 border p-5 transition-all flex flex-col justify-between ${
                      isCurrentActive
                        ? 'border-indigo-500 ring-1 ring-indigo-500/50 shadow-xl shadow-indigo-950/40'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-mono font-bold text-indigo-400">
                              {proj.projectCode}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                                proj.profitabilityStatus === 'healthy'
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : proj.profitabilityStatus === 'at_risk'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {proj.profitabilityStatus.replace('_', ' ')}
                            </span>
                          </div>
                          <h3 className="font-bold text-sm text-slate-100 truncate">{proj.projectName}</h3>
                        </div>
                        {isCurrentActive && (
                          <span className="px-2 py-1 rounded-xl bg-indigo-600 text-white text-[10px] font-bold tracking-tight shrink-0 shadow-sm">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Lead PM */}
                      <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-3">
                        {proj.pmAvatar ? (
                          <img
                            src={proj.pmAvatar}
                            alt={proj.pmName}
                            className="w-6 h-6 rounded-full object-cover border border-slate-700"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                            {proj.pmName?.charAt(0) || 'P'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-slate-400 leading-none">Lead Project Manager</p>
                          <p className="text-xs font-semibold text-slate-200 truncate mt-0.5">{proj.pmName}</p>
                        </div>
                      </div>

                      {/* Financial Metrics */}
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div className="p-2 rounded-xl bg-slate-950/40 border border-slate-850">
                          <span className="text-[10px] text-slate-400 block">Contract Budget</span>
                          <span className="font-mono font-bold text-slate-200">
                            ${proj.contractValue.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-950/40 border border-slate-850">
                          <span className="text-[10px] text-slate-400 block">Gross Margin</span>
                          <span
                            className={`font-mono font-bold ${
                              proj.grossMarginPercent >= 30 ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {proj.grossMarginPercent}% (${proj.grossMarginDollars.toLocaleString()})
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-950/40 border border-slate-850">
                          <span className="text-[10px] text-slate-400 block">CPI (Cost Eff.)</span>
                          <span
                            className={`font-mono font-bold ${
                              proj.costEfficiencyIndex >= 1.0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {proj.costEfficiencyIndex.toFixed(2)}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-950/40 border border-slate-850">
                          <span className="text-[10px] text-slate-400 block">SPI (Schedule)</span>
                          <span
                            className={`font-mono font-bold ${
                              proj.scheduleEfficiencyIndex >= 1.0 ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {proj.scheduleEfficiencyIndex.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono">ID: {proj.projectId}</span>
                      <button
                        onClick={async () => {
                          await switchProject(proj.projectId);
                          if (onSwitchToProjectView) {
                            onSwitchToProjectView(proj.projectId);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <span>Open Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ================= TAB 2: CROSS-PROJECT WORKLOADS ================= */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-100">Cross-Project Resource Utilization</h2>
              <p className="text-xs text-slate-400">
                Aggregated workload, effective capacity minus approved leaves, multi-project allocations, and overallocation alerts.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={resourceFilter}
                onChange={e => setResourceFilter(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Members ({memberWorkloads.length})</option>
                <option value="overallocated">Over-allocated Only ({memberWorkloads.filter(m => m.isOverallocated).length})</option>
                <option value="on_leave">Currently On Leave ({memberWorkloads.filter(m => m.activeLeave).length})</option>
                <option value="available">Normal Capacity</option>
              </select>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by name, role..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold">
                    <th className="py-3.5 px-4 min-w-[220px]">Team Member / Role</th>
                    <th className="py-3.5 px-3 min-w-[140px]">Status & Availability</th>
                    <th className="py-3.5 px-3 min-w-[140px]">Effective Capacity</th>
                    <th className="py-3.5 px-3 min-w-[170px]">Assigned / Multi-Project</th>
                    <th className="py-3.5 px-3 min-w-[130px]">Utilization Rate</th>
                    <th className="py-3.5 px-3 min-w-[130px]">On-Time Delivery</th>
                    <th className="py-3.5 px-4 min-w-[110px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredResources.map(member => {
                    const isOver = member.isOverallocated;
                    return (
                      <tr key={member.userId} className="hover:bg-slate-850/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <span className="font-bold text-slate-100">{member.name}</span>
                                {member.department && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 shrink-0">
                                    {member.department}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">{member.role}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {member.activeLeave ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-bold">
                              <Plane className="w-3 h-3 shrink-0" />
                              <span>On {member.activeLeave.leaveType.toUpperCase()}</span>
                            </span>
                          ) : member.upcomingLeaves.length > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px]">
                              <Calendar className="w-3 h-3 shrink-0" />
                              <span>Leave in {member.upcomingLeaves[0].startDate}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px]">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>Active</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 font-mono whitespace-nowrap">
                          <div className="text-slate-200 font-semibold">
                            {member.effectiveCapacityHours}h / wk
                          </div>
                          {member.blockedLeaveHours > 0 && (
                            <span className="text-[10px] text-rose-400 block">
                              -{member.blockedLeaveHours}h leave blocked
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-semibold font-mono text-slate-200 whitespace-nowrap">
                            {member.totalAssignedHours}h assigned
                          </div>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {member.assignedProjects.map(p => (
                              <span
                                key={p.projectId}
                                className="px-1.5 py-0.2 rounded bg-slate-800 text-[9px] font-mono text-slate-300 shrink-0"
                              >
                                {p.projectCode} ({p.assignedHours}h)
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden shrink-0">
                              <div
                                className={`h-full rounded-full ${
                                  member.utilizationPercent > 120
                                    ? 'bg-rose-500'
                                    : member.utilizationPercent > 100
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, member.utilizationPercent)}%` }}
                              />
                            </div>
                            <span
                              className={`font-mono font-bold text-[11px] ${
                                isOver ? 'text-rose-400' : 'text-slate-200'
                              }`}
                            >
                              {member.utilizationPercent}%
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 font-mono whitespace-nowrap">
                          <span
                            className={`font-bold ${
                              member.onTimeDeliveryRate >= 90
                                ? 'text-emerald-400'
                                : member.onTimeDeliveryRate >= 75
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {member.onTimeDeliveryRate}%
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {member.activeTasksCount} active tasks
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserForLeave(member.userId);
                              setIsLeaveModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-[11px] font-semibold transition-all inline-flex items-center gap-1 shrink-0"
                          >
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>Log Leave</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB: STAKEHOLDERS & TALENT MATRIX ================= */}
      {activeTab === 'stakeholders' && (
        <div className="space-y-6">
          {/* Top Talent Summary Metrics & Tech Skill Filter Pills */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-400" />
                  <span>Cross-Project Stakeholders & Talent Intelligence</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Unified directory of Project Managers, Engineers, Specialists, and Contributors across all portfolio initiatives with skill breakdowns and individual report cards.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Total Stakeholders:</span>
                <span className="px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono font-bold text-sm">
                  {allPortfolioStakeholders.length}
                </span>
              </div>
            </div>

            {/* Quick KPI Role Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => setStakeholderRoleFilter(stakeholderRoleFilter === 'pm' ? 'all' : 'pm')}
                className={`p-3.5 rounded-2xl text-left transition-all border ${
                  stakeholderRoleFilter === 'pm'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-600/20'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-400">Project Managers</span>
                  <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <p className="text-xl font-black font-mono">
                  {allPortfolioStakeholders.filter(s => s.isPM || s.userProfile?.role === 'pm').length}
                </p>
                <span className="text-[10px] text-indigo-400">Click to filter PMs</span>
              </button>

              <button
                onClick={() => setStakeholderRoleFilter(stakeholderRoleFilter === 'developer' ? 'all' : 'developer')}
                className={`p-3.5 rounded-2xl text-left transition-all border ${
                  stakeholderRoleFilter === 'developer'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-600/20'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-400">Tech & Developers</span>
                  <Code className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-xl font-black font-mono">
                  {allPortfolioStakeholders.filter(s => s.isDeveloper).length}
                </p>
                <span className="text-[10px] text-emerald-400">Click to filter Developers</span>
              </button>

              <button
                onClick={() => setStakeholderRoleFilter(stakeholderRoleFilter === 'qa_design' ? 'all' : 'qa_design')}
                className={`p-3.5 rounded-2xl text-left transition-all border ${
                  stakeholderRoleFilter === 'qa_design'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-md shadow-purple-600/20'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-400">QA & UI/UX Design</span>
                  <Laptop className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <p className="text-xl font-black font-mono">
                  {allPortfolioStakeholders.filter(s => s.isQaOrDesign).length}
                </p>
                <span className="text-[10px] text-purple-400">Click to filter QA/Design</span>
              </button>

              <button
                onClick={() => setStakeholderRoleFilter(stakeholderRoleFilter === 'admin' ? 'all' : 'admin')}
                className={`p-3.5 rounded-2xl text-left transition-all border ${
                  stakeholderRoleFilter === 'admin'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-md shadow-amber-600/20'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-400">Executive Admins</span>
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className="text-xl font-black font-mono">
                  {allPortfolioStakeholders.filter(s => s.userProfile?.role === 'admin').length}
                </p>
                <span className="text-[10px] text-amber-400">Click to filter Admins</span>
              </button>
            </div>

            {/* Technical Skills & Expertise Breakdown Distribution */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Technical Skills & Expertise Inventory (Click skill pill to filter)</span>
                </span>
                {selectedTechSkillFilter !== 'all' && (
                  <button
                    onClick={() => setSelectedTechSkillFilter('all')}
                    className="text-[11px] text-indigo-400 hover:underline font-semibold"
                  >
                    Clear skill filter (Showing: {selectedTechSkillFilter})
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => setSelectedTechSkillFilter('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    selectedTechSkillFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Skills ({allPortfolioStakeholders.length})
                </button>
                {techSkillsCatalog.map(skillItem => (
                  <button
                    key={skillItem.name}
                    onClick={() => setSelectedTechSkillFilter(skillItem.name)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      selectedTechSkillFilter.toLowerCase() === skillItem.name.toLowerCase()
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-950/80 border border-slate-800 text-slate-300 hover:border-indigo-500/50 hover:text-indigo-300'
                    }`}
                  >
                    <span>{skillItem.name}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-indigo-300 font-mono font-bold">
                      {skillItem.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, role, tech skill, or project code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <select
                value={stakeholderRoleFilter}
                onChange={e => setStakeholderRoleFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Roles</option>
                <option value="pm">Project Managers</option>
                <option value="developer">Tech & Developers</option>
                <option value="qa_design">QA & Designers</option>
                <option value="admin">Executive Admins</option>
              </select>

              {(searchQuery || stakeholderRoleFilter !== 'all' || selectedTechSkillFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStakeholderRoleFilter('all');
                    setSelectedTechSkillFilter('all');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Stakeholders Table */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[980px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4 min-w-[240px]">Stakeholder / Profile</th>
                    <th className="py-3.5 px-3 min-w-[160px]">Role & Category</th>
                    <th className="py-3.5 px-3 min-w-[160px]">Assigned Projects</th>
                    <th className="py-3.5 px-3 min-w-[220px]">Technical Skills & Expertise</th>
                    <th className="py-3.5 px-3 min-w-[130px]">Rate & Capacity</th>
                    <th className="py-3.5 px-3 min-w-[140px]">Deliverables</th>
                    <th className="py-3.5 px-4 min-w-[140px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredPortfolioStakeholders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="font-semibold">No stakeholders matched your filter criteria.</p>
                        <p className="text-slate-400 text-[11px] mt-1">Try resetting the skill or role filters.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPortfolioStakeholders.map(item => {
                      const sh = item.stakeholder;
                      const user = item.userProfile;
                      const isUserAdmin = user?.role === 'admin';
                      const isUserPm = user?.role === 'pm' || item.isPM;

                      return (
                        <tr key={sh.id || sh.email} className="hover:bg-slate-800/40 transition-colors">
                          {/* Stakeholder Name & Avatar */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={sh.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sh.email}`}
                                alt={sh.name}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-700 bg-slate-950 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  <span className="font-bold text-slate-100 text-xs">{sh.name}</span>
                                  {isUserAdmin && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase shrink-0">
                                      Admin
                                    </span>
                                  )}
                                  {isUserPm && !isUserAdmin && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase shrink-0">
                                      PM
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 block whitespace-nowrap truncate max-w-[200px]">{sh.email}</span>
                              </div>
                            </div>
                          </td>

                          {/* Role & Org Position */}
                          <td className="py-3.5 px-3">
                            <span className="font-semibold text-slate-200 block whitespace-nowrap">{sh.role}</span>
                            <span className="text-[10px] text-slate-400 block capitalize whitespace-nowrap">
                              {sh.category || 'Internal Core'}
                            </span>
                          </td>

                          {/* Assigned Projects */}
                          <td className="py-3.5 px-3">
                            {item.assignedProjects.length === 0 ? (
                              <span className="text-slate-400 text-[11px] italic whitespace-nowrap">No active project</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                                {item.assignedProjects.map(proj => (
                                  <button
                                    type="button"
                                    key={proj.projectId}
                                    onClick={() => {
                                      if (onSwitchToProjectView) {
                                        onSwitchToProjectView(proj.projectId);
                                      }
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/20 text-[10px] font-semibold flex items-center gap-1 transition-all shrink-0 whitespace-nowrap"
                                    title={`Open ${proj.projectName}`}
                                  >
                                    <span className="font-mono font-bold">{proj.projectCode}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Technical Skills & Expertise */}
                          <td className="py-3.5 px-3">
                            <div className="flex flex-wrap gap-1 max-w-[240px]">
                              {item.skills.map((skill, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-medium shrink-0 whitespace-nowrap"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Rate & Capacity */}
                          <td className="py-3.5 px-3 font-mono whitespace-nowrap">
                            <span className="font-bold text-emerald-400 block">${sh.hourlyRate || 95}/hr</span>
                            <span className="text-[10px] text-slate-400 block">{sh.weeklyCapacityHours || 40}h/wk</span>
                          </td>

                          {/* Deliverables / Tasks */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="space-y-1 min-w-[120px]">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-slate-400">{item.completedTasks}/{item.totalTasks} Tasks</span>
                                <span className="font-mono text-indigo-300">
                                  {item.totalTasks > 0 ? Math.round((item.completedTasks / item.totalTasks) * 100) : 0}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{
                                    width: `${item.totalTasks > 0 ? Math.round((item.completedTasks / item.totalTasks) * 100) : 0}%`
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedStakeholderForReportCard(sh)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-bold transition-all inline-flex items-center gap-1.5 shadow-sm shrink-0 whitespace-nowrap"
                              >
                                <Award className="w-3.5 h-3.5 shrink-0" />
                                <span>Report Card</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUserForLeave(sh.id);
                                  setIsLeaveModalOpen(true);
                                }}
                                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
                                title="Log Time Off / Leave"
                              >
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'leaves' && (
        <LeaveManagement onNavigateToProject={onSwitchToProjectView} />
      )}

      {/* ================= TAB 4: COMMERCIALS & RATE CARDS (Admin Only) ================= */}
      {activeTab === 'commercials' && isAdmin && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-100">Standard Organization Rate Cards</h2>
              <p className="text-xs text-slate-400">
                Define standardized role billing rates and cost benchmarks across all portfolio initiatives.
              </p>
            </div>
          </div>

          {/* Rate Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(orgSettings.rateCards || DEFAULT_RATE_CARDS).map(card => (
              <div
                key={card.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold uppercase text-[10px]">
                      {card.seniority}
                    </span>
                    <span className="font-mono text-xs text-slate-400">{card.currency}</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-100 mb-1">{card.role}</h3>
                  <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Standard Rate</span>
                    <p className="text-xl font-extrabold text-white font-mono">
                      ${card.standardHourlyRate}<span className="text-xs text-slate-400 font-normal">/hr</span>
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-800">
                      <span>Min: ${card.minHourlyRate}</span>
                      <span>Max: ${card.maxHourlyRate}</span>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex justify-end">
                    <button
                      onClick={() => setEditingRateCard(card)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit Rate</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Org Operational Policy Settings */}
          {isAdmin && (
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Operational Policy & Capacity Settings</h3>
                  <p className="text-xs text-slate-400">
                    Configure standard working week parameters, leave allowances, and financial margin targets.
                  </p>
                </div>
                <button
                  onClick={handleSaveOrgSettings}
                  disabled={isSavingSettings}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Policy</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Company / PMO Name</label>
                  <input
                    type="text"
                    value={editingSettings.companyName}
                    onChange={e => setEditingSettings({ ...editingSettings, companyName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Weekly Standard Hours</label>
                  <input
                    type="number"
                    value={editingSettings.standardWeeklyHours}
                    onChange={e =>
                      setEditingSettings({ ...editingSettings, standardWeeklyHours: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Annual Leave Allowance (Days)</label>
                  <input
                    type="number"
                    value={editingSettings.annualLeaveDaysAllowance}
                    onChange={e =>
                      setEditingSettings({ ...editingSettings, annualLeaveDaysAllowance: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Target Gross Margin (%)</label>
                  <input
                    type="number"
                    value={editingSettings.targetMarginPercent}
                    onChange={e =>
                      setEditingSettings({ ...editingSettings, targetMarginPercent: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: AI DECISION INTELLIGENCE ================= */}
      {activeTab === 'insights' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Autonomous PMO Insights & Operational Recommendations</span>
              </h2>
              <p className="text-xs text-slate-400">
                Automated continuous scanning of resource over-allocations, leave schedule conflicts, margin deviations, and critical path risks.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolioInsights.map(insight => (
              <div
                key={insight.id}
                className={`p-5 rounded-3xl bg-slate-900/90 border transition-all flex flex-col justify-between ${
                  insight.severity === 'critical'
                    ? 'border-rose-500/50 shadow-lg shadow-rose-950/20'
                    : insight.severity === 'warning'
                    ? 'border-amber-500/50 shadow-lg shadow-amber-950/20'
                    : 'border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                        insight.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : insight.severity === 'warning'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {insight.severity} • {insight.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(insight.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-100 mb-1.5">{insight.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed mb-3">{insight.description}</p>

                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>PMO Recommendation</span>
                    </div>
                    <p className="text-xs text-slate-300">{insight.recommendation}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-indigo-300">{insight.impactMetric}</span>
                  {insight.affectedProjectId && (
                    <button
                      onClick={async () => {
                        await switchProject(insight.affectedProjectId!);
                        if (onSwitchToProjectView) {
                          onSwitchToProjectView(insight.affectedProjectId!);
                        }
                      }}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <span>Investigate Project</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 6: ROLES & PM ASSIGNMENT (ADMIN ONLY) ================= */}
      {activeTab === 'access' && isAdmin && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-100">User Access, Role Promotion & PM Assignments</h2>
              <p className="text-xs text-slate-400">
                Grant Executive Admin or Project Manager privileges, assign Lead PMs to specific projects, and configure standard hourly capacity.
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[860px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold">
                    <th className="py-3.5 px-4 min-w-[220px]">User</th>
                    <th className="py-3.5 px-3 min-w-[150px]">Current Role & Level</th>
                    <th className="py-3.5 px-3 min-w-[160px]">Title / Designation</th>
                    <th className="py-3.5 px-3 min-w-[130px]">Standard Hourly Rate</th>
                    <th className="py-3.5 px-3 min-w-[120px]">Weekly Capacity</th>
                    <th className="py-3.5 px-4 min-w-[220px] text-right">Promote / Assign Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {allUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-850/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-100 block whitespace-nowrap">{u.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono block whitespace-nowrap">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase inline-block ${
                            u.role === 'admin'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : u.role === 'pm'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {u.role === 'admin' ? 'Executive Admin' : u.role === 'pm' ? 'Project Manager' : 'Team Member'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-medium text-slate-300 whitespace-nowrap">
                        {u.title || 'Contributor'}
                      </td>

                      <td className="py-3.5 px-3 font-mono font-semibold whitespace-nowrap">
                        ${u.hourlyRate || 95}/hr
                      </td>

                      <td className="py-3.5 px-3 font-mono whitespace-nowrap">
                        {u.weeklyCapacityHours || 40}h / week
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {u.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => promoteUserRole(u.id, 'admin')}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition-all shrink-0"
                            >
                              Make Admin
                            </button>
                          )}
                          {u.role !== 'pm' && u.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => promoteUserRole(u.id, 'pm')}
                              className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold transition-all shrink-0"
                            >
                              Make PM
                            </button>
                          )}
                          {u.role !== 'stakeholder' && (
                            <button
                              type="button"
                              onClick={() => promoteUserRole(u.id, 'stakeholder')}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] font-semibold transition-all shrink-0"
                            >
                              Set as Member
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Leave Request / Allocation Modal */}
      {isLeaveModalOpen && (
        <LeaveRequestModal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          defaultUserId={selectedUserForLeave}
        />
      )}

      {/* Rate Card Edit Modal */}
      {editingRateCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">Edit Rate Card: {editingRateCard.role}</h3>
              <button
                onClick={() => setEditingRateCard(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Standard Hourly Rate ($)</label>
                <input
                  type="number"
                  value={editingRateCard.standardHourlyRate}
                  onChange={e =>
                    setEditingRateCard({
                      ...editingRateCard,
                      standardHourlyRate: Number(e.target.value)
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Min Rate ($)</label>
                  <input
                    type="number"
                    value={editingRateCard.minHourlyRate}
                    onChange={e =>
                      setEditingRateCard({
                        ...editingRateCard,
                        minHourlyRate: Number(e.target.value)
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Max Rate ($)</label>
                  <input
                    type="number"
                    value={editingRateCard.maxHourlyRate}
                    onChange={e =>
                      setEditingRateCard({
                        ...editingRateCard,
                        maxHourlyRate: Number(e.target.value)
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingRateCard(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveRateCard(editingRateCard)}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
              >
                Save Rate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Report Card Modal */}
      {selectedStakeholderForReportCard && (
        <IndividualReportCardModal
          stakeholder={selectedStakeholderForReportCard}
          isOpen={!!selectedStakeholderForReportCard}
          onClose={() => setSelectedStakeholderForReportCard(null)}
          onNavigateToProject={onSwitchToProjectView}
        />
      )}
    </div>
  );
};
