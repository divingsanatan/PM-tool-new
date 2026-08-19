import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { MemberLeave, LeaveType, LeaveDurationType, ProjectData } from '../../types';
import {
  Calendar,
  Clock,
  User,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  Plane,
  HeartPulse,
  BookOpen,
  Coffee,
  HelpCircle,
  UserCheck,
  CalendarDays,
  Sparkles,
  Send,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUserId?: string;
  defaultDurationType?: LeaveDurationType;
}

export const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  isOpen,
  onClose,
  defaultUserId,
  defaultDurationType = 'days'
}) => {
  const { allUsers, currentUser, saveLeave, allProjectsMap } = useProject();
  const isAdmin = currentUser.role === 'admin';

  const [targetUserId, setTargetUserId] = useState<string>(() => {
    return defaultUserId || currentUser.id;
  });

  const [durationType, setDurationType] = useState<LeaveDurationType>(defaultDurationType);
  const [leaveType, setLeaveType] = useState<LeaveType>('vacation');
  
  // Date states
  const [singleDate, setSingleDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });

  // Hours states for partial day time off
  const [hoursCount, setHoursCount] = useState<number>(2);
  const [timeSlotPreset, setTimeSlotPreset] = useState<string>('afternoon');
  const [customTimeRange, setCustomTimeRange] = useState<string>('02:00 PM - 04:00 PM');
  
  const [reason, setReason] = useState('');
  const [substituteUserId, setSubstituteUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetUser = allUsers.find(u => u.id === targetUserId) || currentUser;
  const isTargetUserPM = targetUser.role === 'pm';
  const isTargetUserAdmin = targetUser.role === 'admin';

  // Calculate working days & hours for full-day leave
  const calculateDays = () => {
    if (!startDate || !endDate) return { days: 0, hours: 0 };
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return { days: 0, hours: 0 };
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const hours = days * 8;
    return { days, hours };
  };

  const { days: calculatedDays, hours: calculatedHours } = calculateDays();

  // Selected time slot text
  const getTimeSlotLabel = () => {
    if (timeSlotPreset === 'morning') return 'Morning (09:00 AM - 12:00 PM)';
    if (timeSlotPreset === 'afternoon') return 'Afternoon (01:00 PM - 04:00 PM)';
    if (timeSlotPreset === 'late_afternoon') return 'Late Afternoon (03:00 PM - 06:00 PM)';
    return customTimeRange.trim() || `${hoursCount}h Time Off`;
  };

  // Find projects where target user is active
  const userProjects: ProjectData[] = (Object.values(allProjectsMap) as ProjectData[]).filter(proj => {
    return (
      (proj.stakeholders || []).some(
        s => s.id === targetUser.id || s.email?.toLowerCase() === targetUser.email?.toLowerCase()
      ) ||
      (proj.tasks || []).some(
        t => (t.assigneeIds || []).includes(targetUser.id)
      )
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (durationType === 'days') {
      if (!startDate || !endDate) {
        setErrorMsg('Please select start and end dates.');
        return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        setErrorMsg('End date cannot be earlier than start date.');
        return;
      }
    } else {
      if (!singleDate) {
        setErrorMsg('Please select a date for your hourly time off.');
        return;
      }
      if (!hoursCount || hoursCount <= 0 || hoursCount > 8) {
        setErrorMsg('Please enter a valid duration between 0.5 and 8 hours.');
        return;
      }
    }

    if (!reason.trim()) {
      setErrorMsg('Please provide a brief reason or context for the time off.');
      return;
    }

    setIsSubmitting(true);

    const substitute = allUsers.find(u => u.id === substituteUserId);
    const reqStartDate = durationType === 'hours' ? singleDate : startDate;
    const reqEndDate = durationType === 'hours' ? singleDate : endDate;
    const finalHours = durationType === 'hours' ? hoursCount : calculatedHours;
    const finalDays = durationType === 'hours' ? Math.round((hoursCount / 8) * 100) / 100 : calculatedDays;
    const finalTimeRange = durationType === 'hours' ? getTimeSlotLabel() : undefined;

    // PM requests always route to Admin for approval unless created by Admin
    const isAutoApproved = isAdmin && (currentUser.id === targetUser.id || currentUser.role === 'admin');

    try {
      await saveLeave({
        userId: targetUser.id,
        userName: targetUser.name,
        userEmail: targetUser.email,
        userAvatar: targetUser.avatar,
        role: targetUser.title || targetUser.role,
        leaveType,
        durationType,
        timeRange: finalTimeRange,
        startDate: reqStartDate,
        endDate: reqEndDate,
        daysCount: finalDays,
        hoursCount: finalHours,
        status: isAutoApproved ? 'approved' : 'pending',
        applicantRole: targetUser.role,
        approverRoleRequired: isTargetUserPM ? 'admin' : 'pm',
        reason: reason.trim(),
        substituteUserId: substitute?.id,
        substituteUserName: substitute?.name,
        impactedProjectIds: userProjects.map(p => p.id),
        approvedBy: isAutoApproved ? currentUser.name : undefined,
        approvedAt: isAutoApproved ? new Date().toISOString() : undefined
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit leave request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const leaveTypes: { id: LeaveType; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'vacation', label: 'Vacation / Personal Off', icon: <Plane className="w-4 h-4" />, color: 'text-sky-400' },
    { id: 'sick', label: 'Sick / Doctor Appointment', icon: <HeartPulse className="w-4 h-4" />, color: 'text-rose-400' },
    { id: 'parental', label: 'Parental / Family Care', icon: <Coffee className="w-4 h-4" />, color: 'text-amber-400' },
    { id: 'training', label: 'Professional Workshop / Cert', icon: <BookOpen className="w-4 h-4" />, color: 'text-emerald-400' },
    { id: 'conference', label: 'Industry Conference / Summit', icon: <UserCheck className="w-4 h-4" />, color: 'text-purple-400' },
    { id: 'unpaid', label: 'Unpaid / Emergency Errand', icon: <HelpCircle className="w-4 h-4" />, color: 'text-slate-400' }
  ];

  const hourPresets = [
    { label: '1 Hour', hours: 1 },
    { label: '2 Hours', hours: 2 },
    { label: '2.5 Hours', hours: 2.5 },
    { label: '3 Hours', hours: 3 },
    { label: '4 Hours (Half Day)', hours: 4 },
    { label: '6 Hours', hours: 6 }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-inner shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                {isAdmin && targetUser.id !== currentUser.id 
                  ? `Log Time Off for ${targetUser.name}` 
                  : isTargetUserPM 
                  ? 'Request Leave / Time Off (Routes to Admin)'
                  : 'Request Leave & Availability Block'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {isTargetUserPM 
                  ? 'PM leaves route to Executive Admin (Sophia Martinez) for sign-off.' 
                  : 'Apply for full day(s) or a couple of hours off to adjust project capacity.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto custom-scrollbar flex-1 min-h-0 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* User selector (If Admin) */}
          {isAdmin && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Applicant / Team Member
              </label>
              <select
                value={targetUserId}
                onChange={e => setTargetUserId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.toUpperCase()} - {u.title || 'Member'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time Off Unit Mode Switcher: Full Day(s) vs Hourly Off */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Time Off Unit &amp; Duration Type
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setDurationType('days')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  durationType === 'days'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span>Full Day(s) Leave</span>
              </button>

              <button
                type="button"
                onClick={() => setDurationType('hours')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  durationType === 'hours'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Couple of Hours / Partial Day</span>
              </button>
            </div>
          </div>

          {/* Leave Type Grid */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {leaveTypes.map(t => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setLeaveType(t.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition-all ${
                    leaveType === t.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className={t.color}>{t.icon}</span>
                  <span className="truncate">{t.label.split('/')[0].trim()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* If Full Day(s): Dates Selection */}
          {durationType === 'days' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  End Date (Inclusive)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>
          ) : (
            /* If Hourly Time Off: Single Date, Hour Presets & Time Window */
            <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Date of Time Off
                  </label>
                  <input
                    type="date"
                    value={singleDate}
                    onChange={e => setSingleDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Hours Off Duration
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="8"
                      value={hoursCount}
                      onChange={e => setHoursCount(parseFloat(e.target.value) || 1)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                      required
                    />
                    <span className="text-xs text-slate-400 font-bold shrink-0">Hours</span>
                  </div>
                </div>
              </div>

              {/* Quick Hours Presets */}
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1.5">
                  Quick Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {hourPresets.map(preset => (
                    <button
                      type="button"
                      key={preset.hours}
                      onClick={() => setHoursCount(preset.hours)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        hoursCount === preset.hours
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Slot / Schedule Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Time Window / Slot
                  </label>
                  <select
                    value={timeSlotPreset}
                    onChange={e => setTimeSlotPreset(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="morning">Morning (09:00 AM - 12:00 PM)</option>
                    <option value="afternoon">Afternoon (01:00 PM - 04:00 PM)</option>
                    <option value="late_afternoon">Late Afternoon (03:00 PM - 06:00 PM)</option>
                    <option value="custom">Custom Time Window</option>
                  </select>
                </div>

                {timeSlotPreset === 'custom' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Specific Time (e.g. 10:30 AM - 1:00 PM)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 02:00 PM - 04:30 PM"
                      value={customTimeRange}
                      onChange={e => setCustomTimeRange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Duration Summary Banner */}
          <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-indigo-300">
              <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Calculated Time Off:</span>
            </div>
            <div className="flex items-center gap-2">
              {durationType === 'days' ? (
                <>
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600/30 text-indigo-200 font-mono font-bold text-xs">
                    {calculatedDays} Day{calculatedDays !== 1 ? 's' : ''}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600/30 text-indigo-200 font-mono font-bold text-xs">
                    {calculatedHours} Hours Blocked
                  </span>
                </>
              ) : (
                <>
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600/30 text-indigo-200 font-mono font-bold text-xs">
                    {hoursCount} Hours ({Math.round((hoursCount / 8) * 100)}% of work day)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600/30 text-indigo-200 font-mono font-bold text-xs">
                    {singleDate}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Approval Routing Notice */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-2.5 text-xs">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-200 block">
                {isTargetUserPM
                  ? 'Governance Routing: PM Request → Executive Admin'
                  : 'Governance Routing: Team Member → Project Manager / Admin'}
              </span>
              <p className="text-slate-400 text-[11px] mt-0.5">
                {isTargetUserPM
                  ? `Alex Morgan (PM) requests are submitted directly to Executive Admin (Sophia Martinez) for sign-off.`
                  : `Contributor requests are reviewed by the assigned Project Manager (Alex Morgan) or Executive Admin.`}
              </p>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Reason &amp; Context <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={durationType === 'hours' ? "e.g. Doctor appointment, family errand, school meeting..." : "e.g. Scheduled annual holiday, attending tech summit, recovery..."}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
              required
            />
          </div>

          {/* Substitute / Backup Assignee */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Designated Substitute / Stand-in (Optional)
            </label>
            <select
              value={substituteUserId}
              onChange={e => setSubstituteUserId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- None / Self Managed --</option>
              {allUsers
                .filter(u => u.id !== targetUser.id)
                .map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.toUpperCase()})
                  </option>
                ))}
            </select>
          </div>

          {/* Impacted Projects Info */}
          {userProjects.length > 0 && (
            <div className="pt-1">
              <p className="text-[11px] text-slate-400 mb-1">Impacted Projects with Active Allocation:</p>
              <div className="flex flex-wrap gap-1.5">
                {userProjects.map(p => (
                  <span
                    key={p.id}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300"
                  >
                    {p.projectCode || p.projectName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions Sticky Footer */}
        <div className="p-3 sm:p-3.5 border-t border-slate-800 bg-slate-950/80 shrink-0 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
          >
            {isAdmin ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Log &amp; Auto-Approve</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit Request</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
);
};
