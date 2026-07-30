import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { RaidItem, RaidType, RaidSeverity } from '../../types';
import { X, ShieldAlert, AlertTriangle } from 'lucide-react';

interface RaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: RaidItem | null;
}

export const RaidModal: React.FC<RaidModalProps> = ({ isOpen, onClose, itemToEdit }) => {
  const { projectData, saveRaidItem, currentUser } = useProject();

  const isPM = currentUser?.role === 'pm';

  const currentStakeholder = useMemo(() => {
    return projectData.stakeholders.find(
      s => s.email.toLowerCase() === currentUser?.email.toLowerCase()
    );
  }, [projectData.stakeholders, currentUser?.email]);

  const isEditable = useMemo(() => {
    if (isPM) return true;
    if (!itemToEdit) return true;
    if (itemToEdit.createdBy && itemToEdit.createdBy === currentUser?.id) return true;
    if (itemToEdit.createdByEmail && itemToEdit.createdByEmail.toLowerCase() === currentUser?.email.toLowerCase()) return true;
    if (itemToEdit.ownerId && currentStakeholder && itemToEdit.ownerId === currentStakeholder.id) return true;
    if (itemToEdit.ownerId && itemToEdit.ownerId === currentUser?.id) return true;
    return false;
  }, [isPM, itemToEdit, currentStakeholder, currentUser]);

  const [type, setType] = useState<RaidType>('risk');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [status, setStatus] = useState('identified');
  const [probability, setProbability] = useState<RaidSeverity>('medium');
  const [impact, setImpact] = useState<RaidSeverity>('medium');
  const [mitigationStrategy, setMitigationStrategy] = useState('');
  const [contingencyPlan, setContingencyPlan] = useState('');
  const [targetResolutionDate, setTargetResolutionDate] = useState('');

  useEffect(() => {
    if (itemToEdit) {
      setType(itemToEdit.type);
      setTitle(itemToEdit.title);
      setDescription(itemToEdit.description || '');
      setOwnerId(itemToEdit.ownerId || (projectData.stakeholders[0]?.id || ''));
      setStatus(itemToEdit.status || 'identified');
      setProbability(itemToEdit.probability || 'medium');
      setImpact(itemToEdit.impact || 'medium');
      setMitigationStrategy(itemToEdit.mitigationStrategy || '');
      setContingencyPlan(itemToEdit.contingencyPlan || '');
      setTargetResolutionDate(itemToEdit.targetResolutionDate || '');
    } else {
      setType('risk');
      setTitle('');
      setDescription('');
      setOwnerId(projectData.stakeholders[0]?.id || 'sh-1');
      setStatus('identified');
      setProbability('medium');
      setImpact('medium');
      setMitigationStrategy('');
      setContingencyPlan('');
      setTargetResolutionDate(new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0]);
    }
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable) return;

    // Compute numeric risk score based on probability x impact (1 to 4)
    const probMap: Record<RaidSeverity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
    const impactMap: Record<RaidSeverity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
    const riskScore = probMap[probability] * impactMap[impact];

    await saveRaidItem({
      id: itemToEdit?.id,
      type,
      title,
      description,
      ownerId,
      status,
      probability,
      impact,
      riskScore,
      mitigationStrategy,
      contingencyPlan,
      targetResolutionDate,
      createdBy: itemToEdit?.createdBy || currentUser?.id,
      createdByEmail: itemToEdit?.createdByEmail || currentUser?.email
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl h-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h3 className="font-bold text-slate-100 text-base sm:text-lg">
              {itemToEdit ? 'Edit RAID Log Item' : 'Log New RAID Item'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          {!isEditable && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <div>
                <strong className="block text-amber-200 font-bold">Read-Only Mode</strong>
                <span>This RAID item was logged by another user. Only Project Managers or the creator/owner can edit it.</span>
              </div>
            </div>
          )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* RAID Type Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">RAID Category</label>
            <div className="grid grid-cols-2 xs:grid-cols-4 gap-2">
              {(['risk', 'assumption', 'issue', 'dependency'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-2 rounded-xl font-bold capitalize text-xs border transition-colors ${
                    type === t
                      ? 'bg-rose-600 text-white border-rose-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Database schema migration delay"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-rose-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide background context and cause..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-rose-500"
            />
          </div>

          {/* Probability & Impact */}
          {type === 'risk' && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Probability</label>
                <select
                  value={probability}
                  onChange={(e) => setProbability(e.target.value as RaidSeverity)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 outline-none capitalize"
                >
                  <option value="low">Low (1)</option>
                  <option value="medium">Medium (2)</option>
                  <option value="high">High (3)</option>
                  <option value="critical">Critical (4)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Impact</label>
                <select
                  value={impact}
                  onChange={(e) => setImpact(e.target.value as RaidSeverity)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 outline-none capitalize"
                >
                  <option value="low">Low (1)</option>
                  <option value="medium">Medium (2)</option>
                  <option value="high">High (3)</option>
                  <option value="critical">Critical (4)</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Primary Mitigation Strategy</label>
            <textarea
              rows={2}
              value={mitigationStrategy}
              onChange={(e) => setMitigationStrategy(e.target.value)}
              placeholder="Action plan to eliminate or minimize risk..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Contingency Plan</label>
            <input
              type="text"
              value={contingencyPlan}
              onChange={(e) => setContingencyPlan(e.target.value)}
              placeholder="Fallback protocol if risk occurs..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-rose-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Assigned Owner</label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none"
              >
                {projectData.stakeholders.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Target Resolution Date</label>
              <input
                type="date"
                value={targetResolutionDate}
                onChange={(e) => setTargetResolutionDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
            >
              {isEditable ? 'Cancel' : 'Close'}
            </button>
            {isEditable ? (
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-600/20"
              >
                Save RAID Item
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="px-5 py-2 rounded-xl bg-slate-800 text-slate-500 font-semibold text-xs cursor-not-allowed border border-slate-700"
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
