import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Sprint, SprintStatus, Task, Feature } from '../../types';
import { calculateSprintDates } from '../../utils/taskCalculations';
import { X, Calendar, Sparkles, Check, RefreshCw, Layers, AlertTriangle, ShieldAlert, Info } from 'lucide-react';

interface SprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprintToEdit?: Sprint | null;
}

export const SprintModal: React.FC<SprintModalProps> = ({
  isOpen,
  onClose,
  sprintToEdit
}) => {
  const { projectData, saveSprint, deleteSprint } = useProject();

  const tasks = projectData.tasks || [];
  const features = projectData.features || [];
  const sprints = projectData.sprints || [];

  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [status, setStatus] = useState<SprintStatus>('future');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAutoDates, setIsAutoDates] = useState(true);
  const [capacityPoints, setCapacityPoints] = useState(40);

  // Selected Features & Standalone Tasks
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);
  const [selectedStandaloneTaskIds, setSelectedStandaloneTaskIds] = useState<string[]>([]);

  // Validation message state
  const [validationNotice, setValidationNotice] = useState<string | null>(null);

  // Helper to calculate calendar days between two dates cleanly using local date math
  const calculateDays = (startStr: string, endStr: string): number => {
    if (!startStr || !endStr) return 0;
    const [sY, sM, sD] = startStr.split('-').map(Number);
    const [eY, eM, eD] = endStr.split('-').map(Number);
    if (!sY || !sM || !sD || !eY || !eM || !eD) return 0;
    const s = new Date(sY, sM - 1, sD).getTime();
    const e = new Date(eY, eM - 1, eD).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return 0;
    return Math.round((e - s) / (1000 * 60 * 60 * 24));
  };

  // Helper to add N days to a YYYY-MM-DD string
  const addDaysStr = (dateStr: string, days: number): string => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return '';
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const resY = date.getFullYear();
    const resM = String(date.getMonth() + 1).padStart(2, '0');
    const resD = String(date.getDate()).padStart(2, '0');
    return `${resY}-${resM}-${resD}`;
  };

  const currentSprintId = sprintToEdit?.id;

  // Filter features: ONLY show features that are unassigned OR assigned to THIS current sprint.
  // Features assigned to OTHER sprints are filtered out to prevent duplicate assignment.
  const availableFeatures = features.filter(f => !f.sprintId || f.sprintId === currentSprintId);

  // Filter standalone tasks: ONLY show tasks without a feature that are unassigned OR assigned to THIS current sprint.
  const availableStandaloneTasks = tasks.filter(t => !t.featureId && (!t.sprintId || t.sprintId === currentSprintId));

  useEffect(() => {
    setValidationNotice(null);

    if (sprintToEdit) {
      setName(sprintToEdit.name);
      setGoal(sprintToEdit.goal || '');
      setStatus(sprintToEdit.status);
      setCapacityPoints(sprintToEdit.capacityPoints || 40);

      const auto = sprintToEdit.isAutoDates !== false;
      setIsAutoDates(auto);

      // Pre-select features assigned to this sprint or containing tasks in this sprint
      const directlyAssignedFeatures = features.filter(f => f.sprintId === sprintToEdit.id).map(f => f.id);
      const featuresWithTasksInSprint = features
        .filter(f => tasks.some(t => t.featureId === f.id && t.sprintId === sprintToEdit.id))
        .map(f => f.id);

      const initialFeatureIds = Array.from(new Set([...directlyAssignedFeatures, ...featuresWithTasksInSprint]));
      setSelectedFeatureIds(initialFeatureIds);

      // Standalone tasks
      const standalone = tasks
        .filter(t => t.sprintId === sprintToEdit.id && !t.featureId)
        .map(t => t.id);
      setSelectedStandaloneTaskIds(standalone);

      const calc = calculateSprintDates(sprintToEdit.id, tasks, features);
      if (auto && calc) {
        setStartDate(calc.startDate);
        setEndDate(calc.endDate);
      } else {
        setStartDate(sprintToEdit.startDate);
        setEndDate(sprintToEdit.endDate);
      }
    } else {
      setName(`Sprint ${sprints.length + 1}`);
      setGoal('');
      setStatus(sprints.length === 0 ? 'active' : 'future');
      setIsAutoDates(true);
      setCapacityPoints(40);
      setSelectedFeatureIds([]);
      setSelectedStandaloneTaskIds([]);

      const today = new Date();
      const resY = today.getFullYear();
      const resM = String(today.getMonth() + 1).padStart(2, '0');
      const resD = String(today.getDate()).padStart(2, '0');
      const todayStr = `${resY}-${resM}-${resD}`;
      const twoWeeksStr = addDaysStr(todayStr, 14);

      setStartDate(todayStr);
      setEndDate(twoWeeksStr);
    }
  }, [sprintToEdit, isOpen]);

  if (!isOpen) return null;

  // Compute current duration in days
  const currentDurationDays = calculateDays(startDate, endDate);
  const isExceedingTwoWeeks = currentDurationDays > 14;

  // Compute dynamic auto dates based on selected features & standalone tasks
  const getDynamicAutoDatesForFeatures = (fIds: string[], tIds: string[]) => {
    const startDates: string[] = [];
    const endDates: string[] = [];

    fIds.forEach(fId => {
      const feat = features.find(f => f.id === fId);
      if (feat && feat.targetReleaseDate) {
        startDates.push(feat.targetReleaseDate);
        endDates.push(feat.targetReleaseDate);
      }
      const childTasks = tasks.filter(t => t.featureId === fId);
      childTasks.forEach(t => {
        if (t.startDate) startDates.push(t.startDate);
        if (t.dueDate) endDates.push(t.dueDate);
      });
    });

    tIds.forEach(tId => {
      const task = tasks.find(t => t.id === tId);
      if (task) {
        if (task.startDate) startDates.push(task.startDate);
        if (task.dueDate) endDates.push(task.dueDate);
      }
    });

    if (startDates.length === 0 && endDates.length === 0) return null;
    startDates.sort();
    endDates.sort();

    const calcStart = startDates[0] || endDates[0];
    let calcEnd = endDates[endDates.length - 1] || startDates[startDates.length - 1];

    // Cap end date to max 14 days (2 weeks) from calcStart
    if (calcStart && calcEnd) {
      const daysDiff = calculateDays(calcStart, calcEnd);
      if (daysDiff > 14) {
        calcEnd = addDaysStr(calcStart, 14);
      }
    }

    return {
      startDate: calcStart,
      endDate: calcEnd
    };
  };

  const autoCalcResult = getDynamicAutoDatesForFeatures(selectedFeatureIds, selectedStandaloneTaskIds);

  const handleResetToAuto = () => {
    setIsAutoDates(true);
    setValidationNotice(null);
    if (autoCalcResult) {
      setStartDate(autoCalcResult.startDate);
      setEndDate(autoCalcResult.endDate);
    }
  };

  const toggleFeatureSelection = (feature: Feature) => {
    setValidationNotice(null);
    const featureId = feature.id;
    const isAlreadySelected = selectedFeatureIds.includes(featureId);

    if (isAlreadySelected) {
      // Unselect feature
      const nextFeatures = selectedFeatureIds.filter(id => id !== featureId);
      setSelectedFeatureIds(nextFeatures);

      if (isAutoDates) {
        const nextDates = getDynamicAutoDatesForFeatures(nextFeatures, selectedStandaloneTaskIds);
        if (nextDates) {
          setStartDate(nextDates.startDate);
          setEndDate(nextDates.endDate);
        }
      }
      return;
    }

    // Select feature
    const nextFeatures = [...selectedFeatureIds, featureId];
    setSelectedFeatureIds(nextFeatures);

    if (isAutoDates) {
      const nextDates = getDynamicAutoDatesForFeatures(nextFeatures, selectedStandaloneTaskIds);
      if (nextDates) {
        setStartDate(nextDates.startDate);
        setEndDate(nextDates.endDate);
      }
    } else {
      if (currentDurationDays > 14) {
        setValidationNotice(
          `Sprint duration currently exceeds 2 weeks (${currentDurationDays} days). Please adjust manual dates to 14 days or less.`
        );
      }
    }
  };

  const toggleStandaloneTaskSelection = (taskId: string) => {
    setValidationNotice(null);
    const isAlreadySelected = selectedStandaloneTaskIds.includes(taskId);

    if (isAlreadySelected) {
      const nextTasks = selectedStandaloneTaskIds.filter(id => id !== taskId);
      setSelectedStandaloneTaskIds(nextTasks);

      if (isAutoDates) {
        const nextDates = getDynamicAutoDatesForFeatures(selectedFeatureIds, nextTasks);
        if (nextDates) {
          setStartDate(nextDates.startDate);
          setEndDate(nextDates.endDate);
        }
      }
      return;
    }

    const nextTasks = [...selectedStandaloneTaskIds, taskId];
    setSelectedStandaloneTaskIds(nextTasks);

    if (isAutoDates) {
      const nextDates = getDynamicAutoDatesForFeatures(selectedFeatureIds, nextTasks);
      if (nextDates) {
        setStartDate(nextDates.startDate);
        setEndDate(nextDates.endDate);
      }
    } else {
      if (currentDurationDays > 14) {
        setValidationNotice(
          `Sprint duration currently exceeds 2 weeks (${currentDurationDays} days). Please adjust manual dates to 14 days or less.`
        );
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationNotice(null);

    if (!name.trim()) return;

    const sprintId = sprintToEdit ? sprintToEdit.id : 'sprint-' + Date.now();

    let finalStart = startDate;
    let finalEnd = endDate;

    if (isAutoDates && autoCalcResult) {
      finalStart = autoCalcResult.startDate;
      finalEnd = autoCalcResult.endDate;
    }

    const durationDays = calculateDays(finalStart, finalEnd);
    if (durationDays > 14) {
      setValidationNotice(
        `Validation Error: Sprint duration cannot exceed 2 weeks (14 days). Current duration is ${durationDays} days. Please adjust Start/End dates to max 14 days.`
      );
      return;
    }

    await saveSprint(
      {
        id: sprintId,
        name: name.trim(),
        goal: goal.trim(),
        status,
        startDate: finalStart,
        endDate: finalEnd,
        isAutoDates,
        capacityPoints
      },
      selectedStandaloneTaskIds,
      selectedFeatureIds
    );

    onClose();
  };

  const handleDelete = async () => {
    if (sprintToEdit && confirm(`Are you sure you want to delete ${sprintToEdit.name}? Features and tasks will be unassigned.`)) {
      await deleteSprint(sprintToEdit.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {sprintToEdit ? `Edit Sprint: ${sprintToEdit.name}` : 'Create New Sprint'}
              </h3>
              <p className="text-xs text-slate-400">
                Define sprint goals, enforce 2-week maximum timeline, and assign available features.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Validation Banner */}
          {validationNotice && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-3 animate-fade-in">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{validationNotice}</div>
              <button
                type="button"
                onClick={() => setValidationNotice(null)}
                className="text-rose-400 hover:text-rose-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Sprint Name & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Sprint Title *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Sprint 1 - Core Platform"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Sprint Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as SprintStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="future">Future (Backlog)</option>
                <option value="active">Active Sprint</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Goal */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Sprint Goal</label>
            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="What is the primary milestone or deliverable for this sprint?"
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* Auto-Dates & 2-Week Limit Section */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-slate-200">Sprint Timeline & 2-Week Constraint</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                  isExceedingTwoWeeks
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  Duration: {currentDurationDays} Days {isExceedingTwoWeeks ? '(Exceeds 2-Wk Max Limit)' : '(≤ 2 Weeks)'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAutoDates(!isAutoDates)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
                    isAutoDates
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{isAutoDates ? 'Auto-Calculated from Features' : 'Manual Date Override'}</span>
                </button>

                {!isAutoDates && (
                  <button
                    type="button"
                    onClick={handleResetToAuto}
                    className="text-[11px] text-indigo-400 hover:underline font-medium"
                  >
                    Reset to Auto
                  </button>
                )}
              </div>
            </div>

            {/* Dates Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400">Start Date</label>
                  {isAutoDates && autoCalcResult && (
                    <span className="text-[10px] text-emerald-400 font-mono">Earliest: {autoCalcResult.startDate}</span>
                  )}
                </div>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    setIsAutoDates(false);
                    setValidationNotice(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400">End Date (Max +14 Days)</label>
                  {isAutoDates && autoCalcResult && (
                    <span className="text-[10px] text-emerald-400 font-mono">End: {autoCalcResult.endDate}</span>
                  )}
                </div>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => {
                    setEndDate(e.target.value);
                    setIsAutoDates(false);
                    setValidationNotice(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {isExceedingTwoWeeks && (
              <p className="text-[11px] text-rose-400/90 font-medium flex items-center gap-1.5 pt-1 bg-rose-950/30 p-2 rounded-lg border border-rose-500/20">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>
                  Sprint length is {currentDurationDays} days. Agile best practices limit sprints to a maximum of 2 weeks (14 days). Please adjust the end date before saving.
                </span>
              </p>
            )}

            {isAutoDates && !isExceedingTwoWeeks && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>
                  Start and End dates automatically sync with assigned features and their child tasks (capped at max 14 days).
                </span>
              </p>
            )}
          </div>

          {/* Feature Assignment Picker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-200">Assign Features to Sprint</h4>
                <p className="text-[11px] text-slate-400">
                  Select available features to include. Features assigned to other sprints are hidden to prevent duplication.
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                {selectedFeatureIds.length} Selected
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 p-2 space-y-1.5">
              {availableFeatures.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 flex flex-col items-center gap-1">
                  <Info className="w-4 h-4 text-slate-600" />
                  <span>No unassigned features available. All features are either assigned to other sprints or not yet created.</span>
                </div>
              ) : (
                availableFeatures.map(feature => {
                  const isSelected = selectedFeatureIds.includes(feature.id);
                  const childTasks = tasks.filter(t => t.featureId === feature.id);
                  const totalHours = childTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

                  return (
                    <button
                      type="button"
                      key={feature.id}
                      onClick={() => toggleFeatureSelection(feature)}
                      aria-pressed={isSelected}
                      className={`w-full text-left p-3 rounded-lg text-xs cursor-pointer transition-all border focus-visible:ring-2 ${
                        isSelected
                          ? 'bg-purple-600/20 border-purple-500/40 text-purple-100'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-700 bg-slate-950'
                          }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>

                          <div>
                            <div className="font-semibold flex items-center gap-2">
                              <span>{feature.title}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono uppercase ${
                                feature.priority === 'urgent' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                                feature.priority === 'high' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                'bg-slate-800 text-slate-400'
                              }`}>
                                {feature.priority}
                              </span>
                            </div>

                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-1">
                              {feature.targetReleaseDate && (
                                <span>Target Release: {feature.targetReleaseDate}</span>
                              )}
                              {feature.targetReleaseDate && <span>•</span>}
                              <span>{childTasks.length} Child Tasks</span>
                              <span>•</span>
                              <span>{totalHours} hrs</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Standalone Tasks (if any) */}
          {availableStandaloneTasks.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-300">Standalone Tasks (No Feature)</h4>
                  <p className="text-[11px] text-slate-400">Directly assign tasks that do not belong to a parent feature.</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {selectedStandaloneTaskIds.length} Selected
                </span>
              </div>

              <div className="max-h-36 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 p-2 space-y-1">
                {availableStandaloneTasks.map(task => {
                  const isSelected = selectedStandaloneTaskIds.includes(task.id);
                  return (
                    <button
                      type="button"
                      key={task.id}
                      onClick={() => toggleStandaloneTaskSelection(task.id)}
                      aria-pressed={isSelected}
                      className={`w-full text-left p-2 rounded-lg text-xs cursor-pointer transition-all flex items-center justify-between border focus-visible:ring-2 ${
                        isSelected
                          ? 'bg-purple-600/20 border-purple-500/40 text-purple-100'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-700 bg-slate-950'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </div>
                        <span className="font-medium">{task.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{task.estimatedHours} hrs</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            {sprintToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs border border-rose-500/20 transition-colors"
              >
                Delete Sprint
              </button>
            ) : <div />}

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isExceedingTwoWeeks}
                className={`px-4 sm:px-5 py-2 rounded-xl font-semibold text-xs transition-all shadow-lg whitespace-nowrap shrink-0 ${
                  isExceedingTwoWeeks
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                }`}
              >
                {sprintToEdit ? 'Save Sprint Changes' : 'Create Sprint'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
