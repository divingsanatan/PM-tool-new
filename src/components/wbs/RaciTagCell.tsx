import React, { useState, useRef, useEffect } from 'react';
import { Task, Stakeholder } from '../../types';
import { aggregateRaciForHierarchy, getTaskRaci } from '../../utils/raciUtils';
import { Tag, ShieldCheck, Check, Plus, X } from 'lucide-react';

interface RaciTagCellProps {
  itemType: 'milestone' | 'epic' | 'feature' | 'task';
  itemId: string;
  task?: Task;
  stakeholders: Stakeholder[];
  projectData: any;
  onSaveTask: (task: Task) => void;
}

export const RaciTagCell: React.FC<RaciTagCellProps> = ({
  itemType,
  itemId,
  task,
  stakeholders,
  projectData,
  onSaveTask
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const raciInfo = aggregateRaciForHierarchy(itemType, itemId, projectData);

  const getStakeholderById = (id: string) => stakeholders.find(s => s.id === id);

  const handleToggleRole = (stkId: string, role: 'R' | 'A' | 'C' | 'I') => {
    if (!task) return;

    const currentRaci = getTaskRaci(task);
    let r = [...currentRaci.responsible];
    let a = [...currentRaci.accountable];
    let c = [...currentRaci.consulted];
    let i = [...currentRaci.informed];

    if (role === 'R') {
      r = r.includes(stkId) ? r.filter(id => id !== stkId) : [...r, stkId];
    } else if (role === 'A') {
      a = a.includes(stkId) ? a.filter(id => id !== stkId) : [...a, stkId];
    } else if (role === 'C') {
      c = c.includes(stkId) ? c.filter(id => id !== stkId) : [...c, stkId];
    } else if (role === 'I') {
      i = i.includes(stkId) ? i.filter(id => id !== stkId) : [...i, stkId];
    }

    onSaveTask({
      ...task,
      assigneeIds: r, // sync assignees with responsible
      raci: {
        responsible: r,
        accountable: a,
        consulted: c,
        informed: i
      }
    });
  };

  const hasAnyTags =
    raciInfo.responsible.length > 0 ||
    raciInfo.accountable.length > 0 ||
    raciInfo.consulted.length > 0 ||
    raciInfo.informed.length > 0;

  return (
    <div className="relative w-36 flex items-center justify-start shrink-0">
      {/* Trigger Button displaying active RACI role tags */}
      <button
        type="button"
        onClick={() => itemType === 'task' && setIsOpen(!isOpen)}
        disabled={itemType !== 'task'}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all text-[11px] font-medium w-full truncate ${
          itemType === 'task'
            ? 'hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/60'
            : 'border-transparent bg-transparent cursor-default'
        }`}
        title={itemType === 'task' ? 'Click to edit RACI tags for this task' : 'Rolled-over RACI summary from child tasks'}
      >
        {hasAnyTags ? (
          <div className="flex items-center gap-1 overflow-hidden truncate">
            {raciInfo.responsible.length > 0 && (
              <span
                className="px-1.5 py-0.2 rounded font-black text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0"
                title={`Responsible: ${raciInfo.responsible.map(id => getStakeholderById(id)?.name).filter(Boolean).join(', ')}`}
              >
                R:{raciInfo.responsible.length}
              </span>
            )}
            {raciInfo.accountable.length > 0 && (
              <span
                className="px-1.5 py-0.2 rounded font-black text-[9px] bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 shrink-0"
                title={`Accountable: ${raciInfo.accountable.map(id => getStakeholderById(id)?.name).filter(Boolean).join(', ')}`}
              >
                A:{raciInfo.accountable.length}
              </span>
            )}
            {raciInfo.consulted.length > 0 && (
              <span
                className="px-1.5 py-0.2 rounded font-black text-[9px] bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 shrink-0"
                title={`Consulted: ${raciInfo.consulted.map(id => getStakeholderById(id)?.name).filter(Boolean).join(', ')}`}
              >
                C:{raciInfo.consulted.length}
              </span>
            )}
            {raciInfo.informed.length > 0 && (
              <span
                className="px-1.5 py-0.2 rounded font-black text-[9px] bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 shrink-0"
                title={`Informed: ${raciInfo.informed.map(id => getStakeholderById(id)?.name).filter(Boolean).join(', ')}`}
              >
                I:{raciInfo.informed.length}
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-400 dark:text-slate-500 text-[10px] flex items-center gap-1 font-mono">
            <Tag className="w-3 h-3 text-slate-400" />
            <span>+ RACI</span>
          </span>
        )}
      </button>

      {/* Inline RACI Tagging Popover */}
      {isOpen && task && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full mt-1.5 z-40 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-3 space-y-2 text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Tag RACI Roles</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            Select governance tags for stakeholders. These roll up automatically to parent Features & Milestones.
          </div>

          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {stakeholders.map(s => {
              const taskRaci = getTaskRaci(task);
              const isR = taskRaci.responsible.includes(s.id);
              const isA = taskRaci.accountable.includes(s.id);
              const isC = taskRaci.consulted.includes(s.id);
              const isI = taskRaci.informed.includes(s.id);

              return (
                <div key={s.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <img src={s.avatar} className="w-5 h-5 rounded-full shrink-0" alt="" />
                    <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-200 truncate max-w-[90px]">{s.name}</span>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleRole(s.id, 'R')}
                      className={`w-5 h-5 rounded text-[10px] font-black transition-all flex items-center justify-center border ${
                        isR
                          ? 'bg-emerald-500 text-white border-emerald-400'
                          : 'bg-slate-200 dark:bg-slate-900 text-slate-500 border-slate-300 dark:border-slate-800 hover:text-emerald-500'
                      }`}
                      title="Responsible"
                    >
                      R
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleRole(s.id, 'A')}
                      className={`w-5 h-5 rounded text-[10px] font-black transition-all flex items-center justify-center border ${
                        isA
                          ? 'bg-purple-500 text-white border-purple-400'
                          : 'bg-slate-200 dark:bg-slate-900 text-slate-500 border-slate-300 dark:border-slate-800 hover:text-purple-500'
                      }`}
                      title="Accountable"
                    >
                      A
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleRole(s.id, 'C')}
                      className={`w-5 h-5 rounded text-[10px] font-black transition-all flex items-center justify-center border ${
                        isC
                          ? 'bg-blue-500 text-white border-blue-400'
                          : 'bg-slate-200 dark:bg-slate-900 text-slate-500 border-slate-300 dark:border-slate-800 hover:text-blue-500'
                      }`}
                      title="Consulted"
                    >
                      C
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleRole(s.id, 'I')}
                      className={`w-5 h-5 rounded text-[10px] font-black transition-all flex items-center justify-center border ${
                        isI
                          ? 'bg-slate-700 text-white border-slate-600'
                          : 'bg-slate-200 dark:bg-slate-900 text-slate-500 border-slate-300 dark:border-slate-800 hover:text-slate-300'
                      }`}
                      title="Informed"
                    >
                      I
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
