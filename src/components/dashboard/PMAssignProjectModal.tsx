import React, { useState } from 'react';
import { UserProfile, ProjectMeta } from '../../types';
import { CrossProjectPMPerformance } from '../../utils/portfolioAndLeaveUtils';
import { X, Building2, UserCheck, Check, AlertCircle } from 'lucide-react';

interface PMAssignProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  pmsList: CrossProjectPMPerformance[];
  projectsList: ProjectMeta[];
  onAssignPM: (projectId: string, pmUserId: string) => Promise<void>;
  preselectedPMId?: string;
}

export const PMAssignProjectModal: React.FC<PMAssignProjectModalProps> = ({
  isOpen,
  onClose,
  pmsList,
  projectsList,
  onAssignPM,
  preselectedPMId
}) => {
  const [selectedPMId, setSelectedPMId] = useState<string>(preselectedPMId || (pmsList[0]?.pmId || ''));
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectsList[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPMId || !selectedProjectId) return;
    setIsSubmitting(true);
    try {
      await onAssignPM(selectedProjectId, selectedPMId);
      const targetPM = pmsList.find(p => p.pmId === selectedPMId);
      const targetProj = projectsList.find(p => p.id === selectedProjectId);
      setSuccessMsg(`Assigned ${targetPM?.name} to lead "${targetProj?.projectName}".`);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to assign PM:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Assign Project Manager</h3>
              <p className="text-xs text-slate-400">Allocate project leadership across the portfolio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {successMsg ? (
          <div className="p-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Assignment Confirmed</h4>
            <p className="text-xs text-slate-300">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Select Project Manager (PM)
              </label>
              <select
                value={selectedPMId}
                onChange={(e) => setSelectedPMId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {pmsList.map(pm => (
                  <option key={pm.pmId} value={pm.pmId}>
                    {pm.name} ({pm.title}) • {pm.managedProjects.length} Projects Led
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Select Target Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {projectsList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.projectCode} - {p.projectName} (${(p.budget / 1000).toFixed(0)}k budget)
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-xs text-slate-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                Assigning this PM will make them the lead Project Manager for this project, update stakeholder RACI accountability, and reflect in their portfolio scorecards.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" />
                {isSubmitting ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
