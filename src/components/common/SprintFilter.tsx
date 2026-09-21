import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Sprint } from '../../types';
import { Calendar, Filter, Check, ChevronDown, Layers } from 'lucide-react';

interface SprintFilterProps {
  sprints: Sprint[];
  selectedSprintIds: string[];
  onChange: (sprintIds: string[]) => void;
  className?: string;
  showAllOption?: boolean;
}

export const SprintFilter: React.FC<SprintFilterProps> = ({
  sprints = [],
  selectedSprintIds = [],
  onChange,
  className = '',
  showAllOption = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 280 });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const width = Math.min(Math.max(280, rect.width), Math.min(340, viewportWidth - 24));
    const left = Math.max(12, Math.min(rect.left, viewportWidth - width - 12));
    const top = rect.bottom + 6;

    setMenuPos({ top, left, width });
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
        if (
          triggerRef.current &&
          !triggerRef.current.contains(e.target as Node) &&
          menuRef.current &&
          !menuRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      };
      const handleReposition = () => updatePosition();

      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      window.addEventListener('resize', handleReposition);
      window.addEventListener('scroll', handleReposition, true);

      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        document.removeEventListener('touchstart', handleOutsideClick);
        window.removeEventListener('resize', handleReposition);
        window.removeEventListener('scroll', handleReposition, true);
      };
    }
  }, [isOpen, updatePosition]);

  const isAllSelected = selectedSprintIds.length === 0 || selectedSprintIds.length === sprints.length;

  const handleToggleAll = () => {
    onChange([]); // Empty array represents All Sprints / Entire Project
  };

  const handleToggleSprint = (sprintId: string) => {
    if (isAllSelected) {
      onChange([sprintId]);
      return;
    }

    let next: string[];
    if (selectedSprintIds.includes(sprintId)) {
      next = selectedSprintIds.filter(id => id !== sprintId);
    } else {
      next = [...selectedSprintIds, sprintId];
    }

    if (next.length === 0 || next.length === sprints.length) {
      onChange([]);
    } else {
      onChange(next);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'completed': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      default: return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }
  };

  const getLabel = () => {
    if (isAllSelected) return 'All Sprints (Entire Project)';
    if (selectedSprintIds.length === 1) {
      const sp = sprints.find(s => s.id === selectedSprintIds[0]);
      return sp ? sp.name : '1 Sprint Selected';
    }
    return `${selectedSprintIds.length} Sprints Selected`;
  };

  return (
    <div className={`relative inline-block max-w-full min-w-0 ${className}`}>
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl flex-wrap max-w-full min-w-0">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-400 border-r border-slate-800 shrink-0">
          <Filter className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="hidden sm:inline">Sprint Scope:</span>
        </div>

        {/* Sprint selector dropdown button */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all border shrink min-w-0 ${
            !isAllSelected
              ? 'bg-purple-600/20 border-purple-500/40 text-purple-200 font-semibold shadow-sm'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="truncate max-w-[130px] sm:max-w-[180px] md:max-w-[220px]">{getLabel()}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu (Portal) */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/40 sm:bg-transparent"
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              width: `${menuPos.width}px`,
              zIndex: 9999
            }}
            className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 space-y-1 backdrop-blur-md animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-300">Select Sprints</span>
              {!isAllSelected && (
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Reset to All
                </button>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 pt-1 custom-scrollbar">
              {showAllOption && (
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                    isAllSelected ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">All Sprints (Full Project View)</span>
                  </div>
                  {isAllSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                </button>
              )}

              {sprints.map(sprint => {
                const selected = selectedSprintIds.includes(sprint.id);
                return (
                  <button
                    type="button"
                    key={sprint.id}
                    onClick={() => handleToggleSprint(sprint.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-colors flex items-center justify-between gap-2 ${
                      selected ? 'bg-purple-600/20 text-purple-200 font-semibold border border-purple-500/30' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-200 truncate">{sprint.name}</span>
                        <span className={`px-1.5 py-0.5 text-[9px] rounded border font-medium uppercase shrink-0 ${getStatusColor(sprint.status)}`}>
                          {sprint.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                        <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{sprint.startDate} to {sprint.endDate}</span>
                        {sprint.isAutoDates !== false && (
                          <span className="text-[9px] bg-slate-800 text-indigo-400 px-1 rounded shrink-0">Auto</span>
                        )}
                      </div>
                    </div>

                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      selected ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-700 bg-slate-800'
                    }`}>
                      {selected && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
