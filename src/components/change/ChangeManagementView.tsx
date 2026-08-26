import React, { useState, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  ChangeRequest,
  ChangeRequestStatus,
  ChangeRequestPriority,
  ChangeImpactArea
} from '../../types';
import {
  GitPullRequest,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Calendar,
  Layers,
  User,
  ShieldAlert,
  FileText,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  Zap,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Check,
  X,
  Lock,
  Eye,
  Building2,
  Tag,
  ShieldCheck
} from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

export const ChangeManagementView: React.FC = () => {
  const {
    projectData,
    currentUser,
    saveChangeRequest,
    deleteChangeRequest,
    updateChangeRequestStatus
  } = useProject();

  const changeRequests = projectData.changeRequests || [];

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [impactAreaFilter, setImpactAreaFilter] = useState<string>('all');

  const isPM = currentUser?.role === 'pm' || currentUser?.role === 'admin';

  const canUserEditCR = (cr: ChangeRequest) => {
    if (isPM) return true;
    if (cr.createdBy && cr.createdBy === currentUser?.id) return true;
    if (cr.createdByEmail && cr.createdByEmail.toLowerCase() === currentUser?.email.toLowerCase()) return true;
    if (cr.requestorEmail && cr.requestorEmail.toLowerCase() === currentUser?.email.toLowerCase()) return true;
    if (cr.requestor && currentUser?.name && cr.requestor.toLowerCase() === currentUser.name.toLowerCase()) return true;
    return false;
  };

  // Flexible vs Strict CCB Mode Toggle
  const [flexibleFastTrackMode, setFlexibleFastTrackMode] = useState(true);

  // Expanded CR Card IDs
  const [expandedCRIds, setExpandedCRIds] = useState<Record<string, boolean>>({});

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCR, setEditingCR] = useState<Partial<ChangeRequest> | null>(null);

  // CCB Disposition Modal State
  const [isCCBModalOpen, setIsCCBModalOpen] = useState(false);
  const [selectedCRForCCB, setSelectedCRForCCB] = useState<ChangeRequest | null>(null);
  const [ccbActionStatus, setCcbActionStatus] = useState<ChangeRequestStatus>('approved');
  const [ccbNotes, setCcbNotes] = useState('');
  const [useFastTrackInModal, setUseFastTrackInModal] = useState(false);

  // Delete Confirm Modal
  const [deletingCRId, setDeletingCRId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<ChangeRequest>>({
    title: '',
    description: '',
    requestor: currentUser.name,
    requestorEmail: currentUser.email,
    priority: 'medium',
    status: 'submitted',
    impactAreas: ['scope'],
    costImpactDelta: 0,
    scheduleImpactDays: 0,
    scopeImpactDescription: '',
    riskImpactDescription: '',
    justification: '',
    proposedSolution: ''
  });

  const toggleExpand = (id: string) => {
    setExpandedCRIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtered CRs
  const filteredCRs = useMemo(() => {
    return changeRequests.filter(cr => {
      const matchesSearch =
        searchTerm.trim() === '' ||
        cr.crNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cr.requestor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cr.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || cr.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || cr.priority === priorityFilter;
      const matchesImpact =
        impactAreaFilter === 'all' || (cr.impactAreas && cr.impactAreas.includes(impactAreaFilter as ChangeImpactArea));

      return matchesSearch && matchesStatus && matchesPriority && matchesImpact;
    });
  }, [changeRequests, searchTerm, statusFilter, priorityFilter, impactAreaFilter]);

  // KPI Calculations
  const totalCRs = changeRequests.length;
  const pendingCCB = changeRequests.filter(c => c.status === 'submitted' || c.status === 'under_review').length;
  
  const approvedCRs = changeRequests.filter(c => c.status === 'approved' || c.status === 'implemented');
  const netApprovedCostDelta = approvedCRs.reduce((acc, curr) => acc + (curr.costImpactDelta || 0), 0);
  const netApprovedScheduleDays = approvedCRs.reduce((acc, curr) => acc + (curr.scheduleImpactDays || 0), 0);

  const isFormModalEditable = useMemo(() => {
    if (isPM) return true;
    if (!editingCR) return true;
    return canUserEditCR(editingCR as ChangeRequest);
  }, [isPM, editingCR, currentUser]);

  // Open create modal
  const handleOpenCreateModal = () => {
    const nextNum = changeRequests.length + 1;
    setEditingCR(null);
    setFormData({
      crNumber: `CR-${String(nextNum).padStart(3, '0')}`,
      title: '',
      description: '',
      requestor: currentUser.name,
      requestorEmail: currentUser.email,
      requestDate: new Date().toISOString().split('T')[0],
      priority: 'medium',
      status: 'submitted',
      impactAreas: ['scope'],
      costImpactDelta: 0,
      scheduleImpactDays: 0,
      scopeImpactDescription: '',
      riskImpactDescription: '',
      justification: '',
      proposedSolution: '',
      createdBy: currentUser.id,
      createdByEmail: currentUser.email
    });
    setIsFormModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (cr: ChangeRequest) => {
    setEditingCR(cr);
    setFormData({ ...cr });
    setIsFormModalOpen(true);
  };

  // Open CCB disposition modal
  const handleOpenCCBModal = (cr: ChangeRequest, defaultStatus: ChangeRequestStatus = 'approved') => {
    setSelectedCRForCCB(cr);
    setCcbActionStatus(defaultStatus);
    setCcbNotes(cr.ccbNotes || '');
    setUseFastTrackInModal(flexibleFastTrackMode);
    setIsCCBModalOpen(true);
  };

  // Handle submit CR form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormModalEditable) return;
    if (!formData.title?.trim()) return;

    saveChangeRequest({
      ...formData,
      createdBy: formData.createdBy || currentUser.id,
      createdByEmail: formData.createdByEmail || currentUser.email
    });
    setIsFormModalOpen(false);
  };

  // Handle CCB decision submit
  const handleCCBSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCRForCCB) return;

    updateChangeRequestStatus(
      selectedCRForCCB.id,
      ccbActionStatus,
      ccbNotes.trim() || undefined,
      useFastTrackInModal
    );

    setIsCCBModalOpen(false);
    setSelectedCRForCCB(null);
  };

  // Toggle Impact Area Checkbox in Form
  const toggleImpactArea = (area: ChangeImpactArea) => {
    const current = formData.impactAreas || [];
    if (current.includes(area)) {
      setFormData({ ...formData, impactAreas: current.filter(a => a !== area) });
    } else {
      setFormData({ ...formData, impactAreas: [...current, area] });
    }
  };

  const getStatusBadge = (status: ChangeRequestStatus) => {
    switch (status) {
      case 'approved':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Approved</span>;
      case 'implemented':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-indigo-400" /> Implemented</span>;
      case 'under_review':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5"><Clock className="w-3 h-3 text-amber-400" /> CCB Review</span>;
      case 'submitted':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1.5"><GitPullRequest className="w-3 h-3 text-sky-400" /> Submitted</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5"><XCircle className="w-3 h-3 text-rose-400" /> Rejected</span>;
      case 'deferred':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-slate-400" /> Deferred</span>;
      case 'draft':
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5"><FileText className="w-3 h-3 text-purple-400" /> Draft</span>;
    }
  };

  const getPriorityBadge = (p: ChangeRequestPriority) => {
    switch (p) {
      case 'critical':
        return <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">Critical</span>;
      case 'high':
        return <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">High</span>;
      case 'medium':
        return <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">Medium</span>;
      case 'low':
      default:
        return <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Low</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1 min-w-0">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0">
              <GitPullRequest className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
                  PMI Integrated Change Control
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider whitespace-nowrap shrink-0">
                  PMBOK Aligned
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Manage change requests (CRs), baseline variance impact analysis, and Change Control Board (CCB) disposition
              </p>
            </div>
          </div>
        </div>

        {/* Workflow Mode & Actions */}
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
          {/* Flexible vs Formal CCB Mode Toggle */}
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-950/80 px-3 py-2 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <Zap className={`w-4 h-4 shrink-0 ${flexibleFastTrackMode ? 'text-amber-400' : 'text-slate-500'}`} />
              <div className="text-[11px] min-w-0">
                <span className="font-bold text-slate-200 block truncate">Fast-Track Mode</span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {flexibleFastTrackMode ? 'Direct PM Approval Enabled' : 'Formal CCB Quorum Required'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setFlexibleFastTrackMode(!flexibleFastTrackMode)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ml-2 ${
                flexibleFastTrackMode ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  flexibleFastTrackMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98] w-full sm:w-auto shrink-0"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>Submit Change Request</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-slate-400 block truncate">Total CRs Logged</span>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-100 font-mono mt-0.5 block truncate whitespace-nowrap">{totalCRs}</span>
            <span className="text-[10px] text-indigo-400 font-semibold mt-1 block truncate">In scope log</span>
          </div>
          <div className="p-2.5 sm:p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            <GitPullRequest className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-slate-400 block truncate">Pending CCB Review</span>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-100 font-mono mt-0.5 block truncate whitespace-nowrap">{pendingCCB}</span>
            <span className="text-[10px] text-amber-400 font-semibold mt-1 block truncate">Awaiting disposition</span>
          </div>
          <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-slate-400 block truncate">Approved Budget Shift</span>
            <span className={`text-lg xs:text-xl sm:text-2xl font-extrabold font-mono mt-0.5 block truncate whitespace-nowrap ${netApprovedCostDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netApprovedCostDelta >= 0 ? '+' : ''}${netApprovedCostDelta.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block truncate">Baseline adjustment</span>
          </div>
          <div className="p-2.5 sm:p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-slate-400 block truncate">Schedule Impact Shift</span>
            <span className={`text-lg xs:text-xl sm:text-2xl font-extrabold font-mono mt-0.5 block truncate whitespace-nowrap ${netApprovedScheduleDays >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {netApprovedScheduleDays >= 0 ? '+' : ''}{netApprovedScheduleDays} Days
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block truncate">Timeline adjustment</span>
          </div>
          <div className="p-2.5 sm:p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by CR number, title, requestor, or description..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-9 py-2 text-xs text-slate-200 outline-none transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">CCB Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="deferred">Deferred</option>
              <option value="implemented">Implemented</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none transition-colors"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Impact Area Filter */}
            <select
              value={impactAreaFilter}
              onChange={(e) => setImpactAreaFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none transition-colors"
            >
              <option value="all">All Impact Areas</option>
              <option value="scope">Scope</option>
              <option value="schedule">Schedule</option>
              <option value="cost">Cost / Budget</option>
              <option value="quality">Quality</option>
              <option value="risk">Risk</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
          <span>
            Showing <strong className="text-slate-200">{filteredCRs.length}</strong> of{' '}
            <strong className="text-slate-200">{totalCRs}</strong> change requests
          </span>
          {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || impactAreaFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setImpactAreaFilter('all');
              }}
              className="text-indigo-400 hover:underline font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Change Requests List */}
      {filteredCRs.length === 0 ? (
        <EmptyState
          icon={GitPullRequest}
          preset="inbox"
          title={
            searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || impactAreaFilter !== 'all'
              ? 'No matching change requests'
              : 'No change requests recorded'
          }
          description={
            searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || impactAreaFilter !== 'all'
              ? 'No change control entries match your filter criteria. Try resetting your search or filter values.'
              : 'Formal PMBOK change requests help track scope expansions, schedule delays, budget revisions, and governance approval workflows.'
          }
          action={
            searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || impactAreaFilter !== 'all'
              ? {
                  label: 'Reset Filters',
                  onClick: () => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setPriorityFilter('all');
                    setImpactAreaFilter('all');
                  },
                  variant: 'secondary'
                }
              : {
                  label: 'Submit Change Request',
                  onClick: () => {
                    setEditingCR(null);
                    setIsFormModalOpen(true);
                  },
                  icon: PlusCircle,
                  variant: 'primary'
                }
          }
          secondaryAction={
            searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || impactAreaFilter !== 'all'
              ? {
                  label: 'Submit Change Request',
                  onClick: () => {
                    setEditingCR(null);
                    setIsFormModalOpen(true);
                  },
                  icon: PlusCircle
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredCRs.map((cr) => {
            const isExpanded = expandedCRIds[cr.id];
            return (
              <div
                key={cr.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-lg transition-all space-y-4"
              >
                {/* Main Card Row */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Number, Title, Badges */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-950 font-mono font-bold text-xs text-indigo-400 border border-slate-800">
                        {cr.crNumber}
                      </span>
                      {getStatusBadge(cr.status)}
                      {getPriorityBadge(cr.priority)}

                      {cr.fastTrackApproved && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" /> Fast-Tracked
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-100 hover:text-indigo-300 transition-colors">
                      {cr.title}
                    </h3>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-sans">
                      {cr.description}
                    </p>
                  </div>

                  {/* Right Column: Impact Deltas & Quick Disposition Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 border-t lg:border-t-0 border-slate-800/80 pt-3 lg:pt-0">
                    {/* Impact Metrics Summary Box */}
                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400 text-[11px]">Cost Delta:</span>
                        <span className={`font-mono font-bold ${cr.costImpactDelta > 0 ? 'text-amber-400' : cr.costImpactDelta < 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {cr.costImpactDelta > 0 ? '+' : ''}${cr.costImpactDelta.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400 text-[11px]">Schedule Shift:</span>
                        <span className={`font-mono font-bold ${cr.scheduleImpactDays > 0 ? 'text-rose-400' : cr.scheduleImpactDays < 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {cr.scheduleImpactDays > 0 ? '+' : ''}{cr.scheduleImpactDays} days
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {isPM && (cr.status === 'submitted' || cr.status === 'under_review') && (
                        <button
                          onClick={() => handleOpenCCBModal(cr, 'approved')}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all"
                        >
                          Approve
                        </button>
                      )}

                      {isPM && (cr.status === 'submitted' || cr.status === 'under_review') && (
                        <button
                          onClick={() => handleOpenCCBModal(cr, 'rejected')}
                          className="px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all"
                        >
                          Reject
                        </button>
                      )}

                      {canUserEditCR(cr) ? (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(cr)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                            title="Edit Change Request"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingCRId(cr.id)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                            title="Delete Change Request"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(cr)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1 text-xs font-semibold"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-400" />
                            <span>View</span>
                          </button>
                          <span className="px-2 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-semibold text-slate-500 flex items-center gap-1" title="Read-only: Submitted by another user">
                            <Lock className="w-3 h-3 text-slate-500" />
                            <span>Read-Only</span>
                          </span>
                        </>
                      )}

                      <button
                        onClick={() => toggleExpand(cr.id)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1 text-xs font-semibold"
                      >
                        <span>{isExpanded ? 'Hide' : 'Details'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Impact Tags Row */}
                <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-slate-800/60">
                  <span className="text-[11px] text-slate-400 font-medium">Impact Domains:</span>
                  {(cr.impactAreas || []).map(area => (
                    <span
                      key={area}
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase"
                    >
                      {area}
                    </span>
                  ))}

                  <span className="text-slate-600 font-mono mx-1">•</span>

                  <span className="text-[11px] text-slate-400">
                    Requested by: <strong className="text-slate-200">{cr.requestor}</strong> ({cr.requestDate})
                  </span>
                </div>

                {/* Expanded Section Details */}
                {isExpanded && (
                  <div className="pt-4 border-t border-slate-800 space-y-4 animate-fade-in text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Justification & Solution */}
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <h4 className="font-bold text-indigo-300 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-indigo-400" />
                          Business Justification & Rationale
                        </h4>
                        <p className="text-slate-300 leading-relaxed font-sans">{cr.justification || 'No justification specified.'}</p>

                        <h4 className="font-bold text-indigo-300 flex items-center gap-1.5 pt-2">
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                          Proposed Technical / Scope Solution
                        </h4>
                        <p className="text-slate-300 leading-relaxed font-sans">{cr.proposedSolution || 'No solution specified.'}</p>
                      </div>

                      {/* Scope & Risk Impact Analysis */}
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-amber-400" />
                          Scope & Deliverable Impact
                        </h4>
                        <p className="text-slate-300 leading-relaxed">{cr.scopeImpactDescription || 'No scope impact description provided.'}</p>

                        {cr.riskImpactDescription && (
                          <>
                            <h4 className="font-bold text-rose-300 flex items-center gap-1.5 pt-2">
                              <ShieldAlert className="w-4 h-4 text-rose-400" />
                              Risk Exposure Impact
                            </h4>
                            <p className="text-slate-300 leading-relaxed">{cr.riskImpactDescription}</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* CCB Review Notes & Sign-off */}
                    {(cr.ccbNotes || cr.approvedBy) && (
                      <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-1.5">
                        <h4 className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                          Change Control Board (CCB) Sign-Off & Disposition Notes
                        </h4>
                        {cr.approvedBy && (
                          <div className="text-[11px] text-slate-300 font-semibold">
                            Signed by: <span className="text-indigo-300">{cr.approvedBy}</span> on {cr.ccbDecisionDate || 'N/A'}
                          </div>
                        )}
                        {cr.ccbNotes && <p className="text-slate-300 text-xs italic font-sans">{cr.ccbNotes}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal (Submit / Edit CR) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <form
            onSubmit={handleFormSubmit}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl p-4 sm:p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-slate-100">
                  {editingCR ? `Edit Change Request ${formData.crNumber}` : 'Submit New Change Request'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isFormModalEditable && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5 my-3">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <div>
                  <strong className="block text-amber-200 font-bold">Read-Only Mode</strong>
                  <span>This change request was submitted by another user. Only Project Managers or the requestor can edit it.</span>
                </div>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Title & Priority Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">Change Request Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Add Real-Time Multi-Region Sync Engine"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={formData.priority || 'medium'}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-100 outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Detailed Description *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the proposed change, affected scope components, and requirements..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-slate-100 outline-none"
                />
              </div>

              {/* Impact Domains Checkboxes */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Impacted Project Domains *</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {(['scope', 'schedule', 'cost', 'quality', 'risk', 'resources'] as ChangeImpactArea[]).map(area => {
                    const isChecked = (formData.impactAreas || []).includes(area);
                    return (
                      <button
                        type="button"
                        key={area}
                        onClick={() => toggleImpactArea(area)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold uppercase transition-all ${
                          isChecked
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {area}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Impact Analysis Metrics (Cost & Schedule) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Cost Impact Delta ($) <span className="text-slate-400 font-normal">(+ for cost, - for savings)</span>
                  </label>
                  <input
                    type="number"
                    value={formData.costImpactDelta || 0}
                    onChange={(e) => setFormData({ ...formData, costImpactDelta: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-100 font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Schedule Impact (Days) <span className="text-slate-400 font-normal">(+ for delay, - for acceleration)</span>
                  </label>
                  <input
                    type="number"
                    value={formData.scheduleImpactDays || 0}
                    onChange={(e) => setFormData({ ...formData, scheduleImpactDays: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-100 font-mono outline-none"
                  />
                </div>
              </div>

              {/* Justification & Solution */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Business Justification</label>
                  <textarea
                    rows={3}
                    value={formData.justification || ''}
                    onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                    placeholder="Why is this change necessary? Value delivered to stakeholders..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Proposed Technical Solution</label>
                  <textarea
                    rows={3}
                    value={formData.proposedSolution || ''}
                    onChange={(e) => setFormData({ ...formData, proposedSolution: e.target.value })}
                    placeholder="Implementation approach, resources needed..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-slate-100 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Logged as: <strong>{currentUser.name}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  {isFormModalEditable ? 'Cancel' : 'Close'}
                </button>
                {isFormModalEditable ? (
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md"
                  >
                    Save Change Request
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  >
                    Read-Only
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* CCB Disposition Decision Modal */}
      {isCCBModalOpen && selectedCRForCCB && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <form
            onSubmit={handleCCBSubmit}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-4 sm:p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-slate-100">
                  CCB Review: {selectedCRForCCB.crNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCCBModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <h4 className="font-bold text-slate-200">{selectedCRForCCB.title}</h4>
                <p className="text-slate-400 line-clamp-2">{selectedCRForCCB.description}</p>
                <div className="flex items-center gap-3 font-mono text-[11px] pt-1 text-indigo-300">
                  <span>Cost Delta: ${selectedCRForCCB.costImpactDelta.toLocaleString()}</span>
                  <span>•</span>
                  <span>Schedule: {selectedCRForCCB.scheduleImpactDays}d</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Decision / Status</label>
                <select
                  value={ccbActionStatus}
                  onChange={(e) => setCcbActionStatus(e.target.value as ChangeRequestStatus)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-100 outline-none font-bold"
                >
                  <option value="approved">Approve Change Request</option>
                  <option value="rejected">Reject Change Request</option>
                  <option value="deferred">Defer / Request Additional Analysis</option>
                  <option value="under_review">Mark Under Active CCB Review</option>
                  <option value="implemented">Mark as Implemented</option>
                </select>
              </div>

              {/* Fast-Track Toggle */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200 block">Fast-Track Sign-Off</span>
                  <span className="text-[10px] text-slate-400">Bypass formal committee quorum for minor changes</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUseFastTrackInModal(!useFastTrackInModal)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    useFastTrackInModal ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition ${
                      useFastTrackInModal ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">CCB Review Notes / Directives</label>
                <textarea
                  rows={3}
                  value={ccbNotes}
                  onChange={(e) => setCcbNotes(e.target.value)}
                  placeholder="Enter committee feedback, baseline adjustment rationale, or conditions for approval..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCCBModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md"
              >
                Confirm CCB Decision
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingCRId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-4 sm:p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-100">Delete Change Request?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently remove this Change Request? This will remove the change log record from the project database.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeletingCRId(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteChangeRequest(deletingCRId);
                  setDeletingCRId(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
              >
                Yes, Delete CR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
