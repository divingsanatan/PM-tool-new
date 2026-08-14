import React, { useState, useRef, useEffect } from 'react';
import { Sprint } from '../../types';
import { Calendar, Filter, Check, ChevronDown, Layers, Sparkles } from 'lucide-react';

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAllSelected = selectedSprintIds.length === 0 || selectedSprintIds.length === sprints.length;

  const handleToggleAll = () => {
    onChange([]); // Empty array represents All Sprints / Entire Project
  };

  const handleToggleSprint = (sprintId: string) => {
    if (isAllSelected) {
      // If currently all selected, clicking one selects only that sprint
      onChange([sprintId]);
      return;
    }

    let next: string[];
    if (selectedSprintIds.includes(sprintId)) {
      next = selectedSprintIds.filter(id => id !== sprintId);
    } else {
      next = [...selectedSprintIds, sprintId];
    }

    // If none or all are selected, reset to empty array (All Sprints)
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
    <div className={`relative inline-block max-w-full ${className}`} ref={dropdownRef}>
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl flex-wrap max-w-full">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-400 border-r border-slate-800 shrink-0">
          <Filter className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="hidden sm:inline">Sprint Scope:</span>
        </div>

        {/* Sprint selector dropdown button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all border shrink-0 ${
            !isAllSelected
              ? 'bg-purple-600/20 border-purple-500/40 text-purple-200 font-semibold shadow-sm'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="truncate max-w-[110px] sm:max-w-[170px] md:max-w-[200px]">{getLabel()}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 md:left-auto md:right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-2 space-y-1">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300">Select Sprints</span>
            {!isAllSelected && (
              <button
                onClick={handleToggleAll}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Reset to All
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 pt-1">
            <button
              onClick={handleToggleAll}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                isAllSelected ? 'bg-indigo-600/20 text-indigo-300 font-semibold' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>All Sprints (Full Project View)</span>
              </div>
              {isAllSelected && <Check className="w-4 h-4 text-indigo-400" />}
            </button>

            {sprints.map(sprint => {
              const selected = selectedSprintIds.includes(sprint.id);
              return (
                <button
                  key={sprint.id}
                  onClick={() => handleToggleSprint(sprint.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                    selected ? 'bg-purple-600/20 text-purple-200 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{sprint.name}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] rounded border font-medium uppercase ${getStatusColor(sprint.status)}`}>
                        {sprint.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{sprint.startDate} to {sprint.endDate}</span>
                      {sprint.isAutoDates !== false && (
                        <span className="text-[9px] bg-slate-800 text-indigo-400 px-1 rounded">Auto</span>
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
      )}
    </div>
  );
};
