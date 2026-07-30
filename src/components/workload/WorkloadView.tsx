import React from 'react';
import { useProject } from '../../context/ProjectContext';
import { calculateStakeholderWorkloads } from '../../utils/evm';
import { Stakeholder } from '../../types';
import {
  BarChart3,
  Users,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Clock,
  DollarSign,
  ShieldAlert,
  Lock,
  Mail
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

interface WorkloadViewProps {
  onOpenStakeholderModal: (stakeholder?: Stakeholder) => void;
  onOpenInviteModal?: (email?: string) => void;
}

export const WorkloadView: React.FC<WorkloadViewProps> = ({
  onOpenStakeholderModal,
  onOpenInviteModal
}) => {
  const { projectData, currentUser } = useProject();
  const isPM = currentUser?.role === 'pm';

  const canEditStakeholder = (sh: Stakeholder) => {
    if (isPM) return true;
    if (sh.id === currentUser?.id) return true;
    if (sh.email && sh.email.toLowerCase() === currentUser?.email.toLowerCase()) return true;
    return false;
  };

  const workloads = calculateStakeholderWorkloads(projectData.stakeholders, projectData.tasks, projectData.subtasks);

  const overloadedCount = workloads.filter(w => w.overloaded).length;

  const chartData = workloads.map(w => ({
    name: w.stakeholder.name,
    role: w.stakeholder.role,
    Assigned: w.assignedHours,
    Capacity: w.capacityHours,
    utilization: w.utilizationPercent
  }));

  return (
    <div id="workload-view" className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-400 shrink-0" />
            <h2 className="text-base sm:text-xl font-bold text-slate-100 truncate">Stakeholder Load Distribution & Capacity Heatmap</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Monitor weekly capacity limits, workload balance across team members, and prevent resource burnout.
          </p>
        </div>

        {isPM && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {onOpenInviteModal && (
              <button
                onClick={() => onOpenInviteModal()}
                className="flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold text-xs transition-colors shadow-sm flex-1 sm:flex-none whitespace-nowrap"
              >
                <Mail className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Invite via Email</span>
              </button>
            )}
            <button
              onClick={() => onOpenStakeholderModal()}
              className="flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-colors shadow-md shadow-teal-600/20 flex-1 sm:flex-none whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add Stakeholder</span>
            </button>
          </div>
        )}
      </div>

      {/* Overload Alert Warning if any member is overloaded */}
      {overloadedCount > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 sm:p-4 rounded-xl flex items-center justify-between text-xs text-rose-300 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold block">Capacity Overload Detected!</span>
              <p className="text-rose-200/80 mt-0.5 leading-relaxed">
                {overloadedCount} team member(s) are allocated over 100% of their weekly capacity. Consider reassigning tasks.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Capacity Heatmap Bar Chart */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm min-w-0">
        <h3 className="font-bold text-slate-100 text-sm sm:text-base mb-1 truncate">Weekly Assigned Hours vs Max Capacity</h3>
        <p className="text-xs text-slate-400 mb-4">Assigned active task workload (Hours) versus scheduled availability</p>

        <div className="h-64 sm:h-72 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" fontSize={11} unit="h" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar dataKey="Assigned" name="Assigned Workload (Hours)" fill="#14b8a6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Capacity" name="Max Capacity (Hours)" fill="#64748b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stakeholder Workload Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
        {workloads.map((wl) => {
          const sh = wl.stakeholder;
          const assignedTasks = projectData.tasks.filter(
            t => t.assigneeIds.includes(sh.id) && t.status !== 'done'
          );

          return (
            <div
              key={sh.id}
              className={`p-5 rounded-2xl border bg-slate-900 transition-all min-w-0 overflow-hidden flex flex-col justify-between ${
                wl.overloaded
                  ? 'border-rose-500/50 shadow-lg shadow-rose-500/10'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={sh.avatar}
                    alt={sh.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-100 text-sm truncate">{sh.name}</h4>
                    <p className="text-xs text-slate-400 truncate">{sh.role}</p>
                  </div>
                </div>

                {canEditStakeholder(sh) ? (
                  <button
                    onClick={() => onOpenStakeholderModal(sh)}
                    className="text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors shrink-0"
                  >
                    Edit
                  </button>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0" title="Read-only: Cannot edit other team members">
                    <Lock className="w-3 h-3 text-slate-500" />
                    <span>Read-Only</span>
                  </span>
                )}
              </div>

              {/* Load Bar Gauge */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="text-slate-400 shrink-0">Capacity Load</span>
                  <span className={`font-bold font-mono text-right truncate ${wl.overloaded ? 'text-rose-400' : 'text-teal-400'}`}>
                    {wl.assignedHours}h / {wl.capacityHours}h ({wl.utilizationPercent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      wl.overloaded ? 'bg-rose-500' : 'bg-teal-500'
                    }`}
                    style={{ width: `${Math.min(wl.utilizationPercent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Financial & Skill Metadata */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400 border-t border-slate-800 pt-3 min-w-0">
                <div className="flex items-center gap-1 min-w-0">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Rate: ${sh.hourlyRate}/h</span>
                </div>
                <div className="flex items-center gap-1 min-w-0">
                  <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">Tasks: {wl.taskCount}</span>
                </div>
              </div>

              {/* Active Assigned Tasks List */}
              <div className="mt-3 pt-2 space-y-1.5 min-w-0">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Assigned Active Tasks ({assignedTasks.length})
                </span>
                {assignedTasks.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No active tasks assigned.</p>
                ) : (
                  assignedTasks.map(t => (
                    <div key={t.id} className="p-2 rounded-lg bg-slate-950/60 text-xs flex items-center justify-between gap-2 min-w-0">
                      <span className="text-slate-300 truncate min-w-0 flex-1">{t.title}</span>
                      <span className="text-slate-400 font-mono text-[10px] shrink-0">{t.estimatedHours}h</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
