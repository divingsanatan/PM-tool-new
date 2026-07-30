import React, { useState, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { ActivityLog } from '../../types';
import {
  History,
  Search,
  Filter,
  Download,
  PlusCircle,
  Trash2,
  User,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Lock,
  Layers,
  ListFilter,
  Calendar,
  ChevronRight,
  X,
  Sparkles,
  AlertTriangle,
  Info,
  Building2,
  Tag
} from 'lucide-react';

export const AuditTrailView: React.FC = () => {
  const { projectData, currentUser, addAuditNote, clearAuditLogs } = useProject();
  const activities = projectData.activities || [];

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<'all' | 'today' | 'yesterday' | 'weekly' | 'monthly' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  // Manual Audit Note Modal State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDetails, setNoteDetails] = useState('');
  const [noteCategory, setNoteCategory] = useState<ActivityLog['category']>('audit');

  // Confirmation state for clearing logs
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Unique users list derived from activities & project stakeholders
  const uniqueUsers = useMemo(() => {
    const userMap = new Map<string, { name: string; email?: string }>();
    activities.forEach(a => {
      if (a.user) {
        userMap.set(a.user, { name: a.user, email: a.userEmail });
      }
    });
    return Array.from(userMap.values());
  }, [activities]);

  // Filtered Activities based on search, user, category, and timeframe
  const filteredActivities = useMemo(() => {
    const now = new Date();
    
    // Timeline boundary calculations
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return activities.filter(act => {
      // Search term filter
      const matchesSearch =
        searchTerm.trim() === '' ||
        act.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (act.userEmail && act.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        act.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        act.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (act.entityId && act.entityId.toLowerCase().includes(searchTerm.toLowerCase()));

      // User filter
      const matchesUser = selectedUser === 'all' || act.user === selectedUser;

      // Category filter
      const matchesCategory =
        selectedCategory === 'all' ||
        (act.category && act.category === selectedCategory) ||
        (selectedCategory === 'task' && (act.action.toLowerCase().includes('task') || act.action.toLowerCase().includes('wbs'))) ||
        (selectedCategory === 'raid' && (act.action.toLowerCase().includes('raid') || act.action.toLowerCase().includes('risk'))) ||
        (selectedCategory === 'stakeholder' && act.action.toLowerCase().includes('stakeholder')) ||
        (selectedCategory === 'auth' && (act.action.toLowerCase().includes('login') || act.action.toLowerCase().includes('auth'))) ||
        (selectedCategory === 'project' && (act.action.toLowerCase().includes('project') || act.action.toLowerCase().includes('budget') || act.action.toLowerCase().includes('milestone')));

      // Timeframe filter
      let matchesTimeframe = true;
      const actDate = new Date(act.timestamp);

      if (timeframe === 'today') {
        matchesTimeframe = actDate >= startOfToday;
      } else if (timeframe === 'yesterday') {
        matchesTimeframe = actDate >= startOfYesterday && actDate <= endOfYesterday;
      } else if (timeframe === 'weekly') {
        matchesTimeframe = actDate >= sevenDaysAgo;
      } else if (timeframe === 'monthly') {
        matchesTimeframe = actDate >= thirtyDaysAgo;
      } else if (timeframe === 'custom') {
        if (customStartDate) {
          const start = new Date(customStartDate + 'T00:00:00');
          if (!isNaN(start.getTime())) {
            matchesTimeframe = matchesTimeframe && actDate >= start;
          }
        }
        if (customEndDate) {
          const end = new Date(customEndDate + 'T23:59:59');
          if (!isNaN(end.getTime())) {
            matchesTimeframe = matchesTimeframe && actDate <= end;
          }
        }
      }

      return matchesSearch && matchesUser && matchesCategory && matchesTimeframe;
    });
  }, [activities, searchTerm, selectedUser, selectedCategory, timeframe, customStartDate, customEndDate]);

  // KPI Metrics Calculations
  const totalEvents = activities.length;
  const uniqueUserCount = new Set(activities.map(a => a.user)).size;
  
  const todayCount = activities.filter(a => {
    const d = new Date(a.timestamp);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  const handleExportCSV = () => {
    if (filteredActivities.length === 0) return;

    const headers = ['ID', 'Timestamp', 'User', 'User Email', 'Category', 'Action', 'Details', 'Entity ID'];
    const csvRows = [
      headers.join(','),
      ...filteredActivities.map(a => [
        `"${a.id}"`,
        `"${new Date(a.timestamp).toISOString()}"`,
        `"${a.user.replace(/"/g, '""')}"`,
        `"${(a.userEmail || '').replace(/"/g, '""')}"`,
        `"${(a.category || 'general').replace(/"/g, '""')}"`,
        `"${a.action.replace(/"/g, '""')}"`,
        `"${a.details.replace(/"/g, '""')}"`,
        `"${(a.entityId || '').replace(/"/g, '""')}"`
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Audit_Trail_${projectData.projectCode}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    addAuditNote(
      noteTitle.trim(),
      noteDetails.trim() || 'Manual audit log entry recorded by ' + currentUser.name,
      noteCategory
    );

    setNoteTitle('');
    setNoteDetails('');
    setIsNoteModalOpen(false);
  };

  const getCategoryBadge = (cat?: string, actionStr?: string) => {
    const c = cat || (actionStr ? actionStr.toLowerCase() : '');
    if (c.includes('task') || c.includes('wbs')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Task / WBS</span>;
    }
    if (c.includes('raid') || c.includes('risk')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">RAID Risk</span>;
    }
    if (c.includes('stakeholder')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">Stakeholder</span>;
    }
    if (c.includes('auth') || c.includes('sso') || c.includes('login')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Auth & SSO</span>;
    }
    if (c.includes('audit') || c.includes('note')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">Audit Note</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">Project / Budget</span>;
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return ts;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1 min-w-0">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0">
              <History className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
                Audit Trail & Activity Logs
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Tamper-evident system activity log tracking all changes across tasks, RAID risks, stakeholders, and user logins
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="relative z-10 flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap w-full md:w-auto">
          <button
            onClick={() => setIsNoteModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98] whitespace-nowrap min-w-0"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">Add Audit Note</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredActivities.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all disabled:opacity-50 whitespace-nowrap min-w-0"
          >
            <Download className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Export CSV</span>
          </button>

          {currentUser.role === 'pm' && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors shrink-0"
              title="Clear Audit Trail History"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Summary Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-slate-400 block truncate">Total Audit Events</span>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-100 font-mono mt-0.5 block truncate whitespace-nowrap">{totalEvents}</span>
            <span className="text-[10px] text-emerald-400 font-semibold mt-1 block truncate">Recorded in current project</span>
          </div>
          <div className="p-2.5 sm:p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            <History className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-slate-400 block truncate">Active Contributors</span>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-100 font-mono mt-0.5 block truncate whitespace-nowrap">{uniqueUserCount}</span>
            <span className="text-[10px] text-indigo-400 font-semibold mt-1 block truncate">Logged changes by user</span>
          </div>
          <div className="p-2.5 sm:p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <User className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setTimeframe('today')}
          className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-all flex items-center justify-between gap-2 min-w-0 group"
          title="Filter Audit Logs for Today"
        >
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-slate-400 block group-hover:text-slate-200 truncate">Today's Activity</span>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-100 font-mono mt-0.5 block truncate whitespace-nowrap">{todayCount}</span>
            <span className="text-[10px] text-amber-400 font-semibold mt-1 block truncate">Click to filter Today</span>
          </div>
          <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-slate-400 block truncate">Security Status</span>
            <span className="text-xs font-bold text-teal-400 mt-1 block flex items-center gap-1 truncate">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" /> Tamper-Proof
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block font-mono truncate">Role-gated sessions</span>
          </div>
          <div className="p-2.5 sm:p-3 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search, Filter Bar & View Toggle */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by user, action, details, or entity ID..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 outline-none transition-colors truncate"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* User & Category Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:flex-initial min-w-[120px] xs:min-w-[130px]">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-2.5 py-2 text-xs text-slate-200 outline-none transition-colors truncate"
              >
                <option value="all">All Users ({uniqueUsers.length})</option>
                {uniqueUsers.map(u => (
                  <option key={u.name} value={u.name}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter Dropdown */}
            <div className="relative flex-1 sm:flex-initial min-w-[120px] xs:min-w-[135px]">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-2.5 py-2 text-xs text-slate-200 outline-none transition-colors truncate"
              >
                <option value="all">All Categories</option>
                <option value="task">Tasks & WBS</option>
                <option value="raid">RAID & Risks</option>
                <option value="stakeholder">Stakeholders</option>
                <option value="project">Project & Budget</option>
                <option value="auth">Auth & SSO</option>
                <option value="audit">Manual Audit Notes</option>
              </select>
            </div>

            {/* View Mode Segmented Controls */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  viewMode === 'timeline'
                    ? 'bg-indigo-600 text-white font-semibold shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  viewMode === 'table'
                    ? 'bg-indigo-600 text-white font-semibold shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Table View
              </button>
            </div>
          </div>
        </div>

        {/* Timeframe / Date Filter Selection Bar */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 no-scrollbar sm:pb-0 sm:flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              Timeline Filter:
            </span>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'weekly', label: 'Weekly (7 Days)' },
              { id: 'monthly', label: 'Monthly (30 Days)' },
              { id: 'custom', label: 'Custom Date Range' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setTimeframe(item.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                  timeframe === item.id
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Picker Inputs */}
        {timeframe === 'custom' && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-indigo-500/30 animate-fade-in flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Start Date:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">End Date:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-xs text-indigo-400 hover:underline font-medium ml-auto"
              >
                Reset Dates
              </button>
            )}
          </div>
        )}

        {/* Filter Summary Counter & Active Timeframe Scope */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              Showing <strong className="text-slate-200">{filteredActivities.length}</strong> of{' '}
              <strong className="text-slate-200">{totalEvents}</strong> audit records
            </span>
            {timeframe !== 'all' && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-mono text-[10px] border border-indigo-500/20 whitespace-nowrap">
                Scope: {timeframe === 'today' ? 'Today' : timeframe === 'yesterday' ? 'Yesterday' : timeframe === 'weekly' ? 'Last 7 Days' : timeframe === 'monthly' ? 'Last 30 Days' : 'Custom Range'}
              </span>
            )}
          </div>

          {(searchTerm || selectedUser !== 'all' || selectedCategory !== 'all' || timeframe !== 'all' || customStartDate || customEndDate) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedUser('all');
                setSelectedCategory('all');
                setTimeframe('all');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="text-indigo-400 hover:underline font-medium"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Audit Content Stream */}
      {filteredActivities.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
          <History className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">No Audit Logs Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No system activity logs matched your search or filter parameters. Try adjusting your search query or reset filters.
          </p>
        </div>
      ) : viewMode === 'timeline' ? (
        /* TIMELINE VIEW */
        <div className="relative pl-8 sm:pl-10 space-y-6 before:absolute before:left-4 sm:before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
          {filteredActivities.map((act) => {
            const timeFormatted = formatTimestamp(act.timestamp);
            return (
              <div
                key={act.id}
                onClick={() => setSelectedLog(act)}
                className="relative group cursor-pointer transition-all"
              >
                {/* Timeline Dot Icon */}
                <div className="absolute -left-8 sm:-left-10 top-3.5 w-6 h-6 rounded-full bg-slate-900 border-2 border-indigo-500 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:border-indigo-400 transition-all shadow-md z-10">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                </div>

                {/* Audit Entry Card */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800/90 hover:border-indigo-500/40 hover:bg-slate-900/90 transition-all shadow-md space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    {/* User Profile Info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      {act.userAvatar ? (
                        <img
                          src={act.userAvatar}
                          alt={act.user}
                          className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-700 shrink-0">
                          {act.user.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-200 group-hover:text-indigo-300 transition-colors block truncate">
                          {act.user}
                        </span>
                        {act.userEmail && (
                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                            {act.userEmail}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timestamp & Category */}
                    <div className="flex items-center gap-2 text-xs">
                      {getCategoryBadge(act.category, act.action)}
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {timeFormatted}
                      </span>
                    </div>
                  </div>

                  {/* Action & Details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-indigo-300">{act.action}</span>
                      {act.entityId && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                          #{act.entityId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{act.details}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">User & Email</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Action Event</th>
                  <th className="py-3.5 px-4">Audit Details</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs text-slate-300">
                {filteredActivities.map((act) => (
                  <tr
                    key={act.id}
                    onClick={() => setSelectedLog(act)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {formatTimestamp(act.timestamp)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {act.userAvatar ? (
                          <img
                            src={act.userAvatar}
                            alt={act.user}
                            className="w-6 h-6 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {act.user.charAt(0)}
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-slate-200 block text-xs">{act.user}</span>
                          {act.userEmail && (
                            <span className="text-[10px] text-slate-400 font-mono block">{act.userEmail}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getCategoryBadge(act.category, act.action)}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-indigo-300 whitespace-nowrap">
                      {act.action}
                    </td>

                    <td className="py-3.5 px-4 max-w-md truncate text-slate-300">
                      {act.details}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                        View Log →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-4 sm:p-6 space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-slate-100">Audit Log Record Details</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-mono">Record ID:</span>
                  <span className="font-mono text-indigo-300">{selectedLog.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-mono">Exact Timestamp:</span>
                  <span className="font-mono text-slate-200">{selectedLog.timestamp}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-mono">Category:</span>
                  {getCategoryBadge(selectedLog.category, selectedLog.action)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-slate-400 font-semibold block">Authenticated User:</span>
                <div className="flex items-center gap-3">
                  {selectedLog.userAvatar && (
                    <img src={selectedLog.userAvatar} alt="" className="w-8 h-8 rounded-full" />
                  )}
                  <div>
                    <h4 className="font-bold text-slate-200">{selectedLog.user}</h4>
                    <p className="text-[11px] text-slate-400 font-mono">{selectedLog.userEmail || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold block">Action Description:</span>
                <p className="font-bold text-indigo-300 text-sm">{selectedLog.action}</p>
                <p className="text-slate-300 leading-relaxed mt-1">{selectedLog.details}</p>
              </div>

              {selectedLog.entityId && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 font-mono">Linked Entity ID:</span>
                  <span className="font-mono text-emerald-400">{selectedLog.entityId}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Audit Note Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <form onSubmit={handleAddNoteSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-slate-100">Log Manual Audit Note</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Audit Event / Note Title *</label>
                <input
                  type="text"
                  required
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g. Change Control Board (CCB) Sign-Off"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
                >
                  <option value="audit">Audit Note / CCB Approval</option>
                  <option value="project">Project / Budget Adjustment</option>
                  <option value="raid">RAID Risk Review</option>
                  <option value="task">WBS & Task Oversight</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Detailed Explanation / Rationale</label>
                <textarea
                  rows={4}
                  value={noteDetails}
                  onChange={(e) => setNoteDetails(e.target.value)}
                  placeholder="Record formal oversight justification, compliance findings, or scope approval rationale..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" />
                Signed by: <strong>{currentUser.name}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md"
                >
                  Save to Audit Trail
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Clear Audit Trail Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-4 sm:p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-100">Clear All Audit Logs?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to purge the current project audit trail? This will permanently delete all {totalEvents} activity entries. This action cannot be undone.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearAuditLogs();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
              >
                Yes, Purge Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
