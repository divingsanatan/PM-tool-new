import React, { useState, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Task } from '../../types';
import {
  GanttChart,
  Filter,
  Plus,
  Edit2,
  Clock,
  Link2,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  PieChart,
  Circle,
  AlertCircle,
  Eye,
  Layers,
  ChevronRight
} from 'lucide-react';
import {
  getTaskDependencies,
  getTaskPredecessors,
  checkDependencyConflict
} from '../../utils/dependencies';

interface GanttViewProps {
  onOpenTaskModal: (task?: Task) => void;
}

export const GanttView: React.FC<GanttViewProps> = ({ onOpenTaskModal }) => {
  const { projectData } = useProject();
  const [timeScale, setTimeScale] = useState<'days' | 'weeks' | 'months'>('weeks');
  const [filterFeatureId, setFilterFeatureId] = useState<string>('all');
  const [filterMilestoneId, setFilterMilestoneId] = useState<string>('all');
  const [highlightCriticalPath, setHighlightCriticalPath] = useState<boolean>(true);
  const [showDependencies, setShowDependencies] = useState<boolean>(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(250);

  // Mouse drag handler for column resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftPanelWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.min(Math.max(startWidth + deltaX, 180), 500);
      setLeftPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Filter tasks based on feature/milestone filters
  const filteredTasks = useMemo(() => {
    return projectData.tasks.filter(t => {
      if (filterFeatureId !== 'all' && t.featureId !== filterFeatureId) return false;
      if (filterMilestoneId !== 'all' && t.milestoneId !== filterMilestoneId) return false;
      return true;
    });
  }, [projectData.tasks, filterFeatureId, filterMilestoneId]);

  // Dynamic Timeline start and end date calculation
  const { startDate, endDate, totalDays } = useMemo(() => {
    let minTime = Infinity;
    let maxTime = -Infinity;

    filteredTasks.forEach(t => {
      if (t.startDate) {
        const s = new Date(t.startDate).getTime();
        if (!isNaN(s)) minTime = Math.min(minTime, s);
      }
      if (t.dueDate) {
        const d = new Date(t.dueDate).getTime();
        if (!isNaN(d)) maxTime = Math.max(maxTime, d);
      }
    });

    if (minTime === Infinity || maxTime === -Infinity || minTime >= maxTime) {
      // Default to standard project timeframe
      const start = new Date('2026-06-01');
      const end = new Date('2026-10-31');
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
      return { startDate: start, endDate: end, totalDays: days };
    }

    // Add padding buffer (7 days before min, 14 days after max)
    const start = new Date(minTime - 7 * 86400000);
    const end = new Date(maxTime + 14 * 86400000);
    const days = Math.max(14, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
    return { startDate: start, endDate: end, totalDays: days };
  }, [filteredTasks]);

  // Compute column ticks and fixed tick width
  const { dateTicks, tickWidth, timelineWidth } = useMemo(() => {
    const ticks: { label: string; subLabel: string; date: Date; dayOffset: number }[] = [];
    let widthPerTick = 120;

    if (timeScale === 'days') {
      widthPerTick = 64;
      for (let i = 0; i < totalDays; i += 2) {
        const d = new Date(startDate.getTime() + i * 86400000);
        ticks.push({
          label: `${d.getMonth() + 1}/${d.getDate()}`,
          subLabel: d.toLocaleDateString('en-US', { weekday: 'short' }),
          date: d,
          dayOffset: i
        });
      }
    } else if (timeScale === 'weeks') {
      widthPerTick = 130;
      const weekCount = Math.ceil(totalDays / 7);
      for (let i = 0; i < weekCount; i++) {
        const dayOffset = i * 7;
        const d = new Date(startDate.getTime() + dayOffset * 86400000);
        const endW = new Date(d.getTime() + 6 * 86400000);
        ticks.push({
          label: `Week ${i + 1}`,
          subLabel: `${d.getMonth() + 1}/${d.getDate()} - ${endW.getMonth() + 1}/${endW.getDate()}`,
          date: d,
          dayOffset
        });
      }
    } else {
      // Months
      widthPerTick = 180;
      let curr = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const endMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 1);

      while (curr < endMonth) {
        const dayOffset = Math.max(0, Math.ceil((curr.getTime() - startDate.getTime()) / 86400000));
        ticks.push({
          label: curr.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          subLabel: curr.toLocaleDateString('en-US', { month: 'long' }),
          date: new Date(curr),
          dayOffset
        });
        curr = new Date(curr.getFullYear(), curr.getMonth() + 1, 1);
      }
    }

    const calculatedWidth = Math.max(800, ticks.length * widthPerTick);
    return { dateTicks: ticks, tickWidth: widthPerTick, timelineWidth: calculatedWidth };
  }, [startDate, endDate, totalDays, timeScale]);

  // Strict uniform row height in pixels for 1:1 vertical alignment
  const ROW_HEIGHT = 56;

  // Calculate task bar pixel position on the inner timeline width
  const getTaskPixelPosition = (task: Task) => {
    const minTime = startDate.getTime();
    const maxTime = endDate.getTime();
    const totalDuration = maxTime - minTime;

    const tStart = new Date(task.startDate).getTime();
    const tDue = new Date(task.dueDate).getTime();

    const startOffsetRatio = Math.max(0, Math.min(1, (tStart - minTime) / totalDuration));
    const durationRatio = Math.max(0, Math.min(1 - startOffsetRatio, (tDue - tStart) / totalDuration));

    const leftPx = startOffsetRatio * timelineWidth;
    const widthPx = Math.max(40, durationRatio * timelineWidth);

    return { leftPx, widthPx };
  };

  // Build SVG dependency links
  const dependencyLinks = useMemo(() => {
    if (!showDependencies) return [];

    const links: {
      id: string;
      predTitle: string;
      succTitle: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      depType: string;
      hasConflict: boolean;
    }[] = [];

    filteredTasks.forEach((succTask, succIdx) => {
      const deps = getTaskDependencies(succTask);
      deps.forEach((dep) => {
        const predIdx = filteredTasks.findIndex(t => t.id === dep.targetTaskId);
        if (predIdx !== -1) {
          const predTask = filteredTasks[predIdx];
          const predPos = getTaskPixelPosition(predTask);
          const succPos = getTaskPixelPosition(succTask);

          const y1 = predIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
          const y2 = succIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

          let x1 = predPos.leftPx + predPos.widthPx;
          let x2 = succPos.leftPx;

          if (dep.type === 'SS') {
            x1 = predPos.leftPx;
            x2 = succPos.leftPx;
          } else if (dep.type === 'FF') {
            x1 = predPos.leftPx + predPos.widthPx;
            x2 = succPos.leftPx + succPos.widthPx;
          } else if (dep.type === 'SF') {
            x1 = predPos.leftPx;
            x2 = succPos.leftPx + succPos.widthPx;
          }

          const conflict = checkDependencyConflict(succTask, dep, projectData.tasks);

          links.push({
            id: `${predTask.id}-${succTask.id}-${dep.type}`,
            predTitle: predTask.title,
            succTitle: succTask.title,
            x1,
            y1,
            x2,
            y2,
            depType: dep.type,
            hasConflict: conflict.hasConflict
          });
        }
      });
    });

    return links;
  }, [filteredTasks, startDate, endDate, timelineWidth, showDependencies, projectData.tasks]);

  // Conflicts count
  const conflictCount = useMemo(() => {
    return dependencyLinks.filter(l => l.hasConflict).length;
  }, [dependencyLinks]);

  return (
    <div id="gantt-view" className="space-y-5 min-w-0">
      {/* Top Header Controls Bar */}
      <div className="flex flex-col gap-3 sm:gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm min-w-0">
        {/* Top Row: Title, Subtitle, and Primary Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80 min-w-0">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                <GanttChart className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-100 tracking-tight whitespace-nowrap">
                Gantt Schedule & Timeline
              </h2>
              {conflictCount > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 shrink-0">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  {conflictCount} Conflict{conflictCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Interactive schedule visualization with predecessor links, critical path, and auto-scrolling dates.
            </p>
          </div>

          <button
            onClick={() => onOpenTaskModal()}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-sm shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add Task</span>
          </button>
        </div>

        {/* Bottom Row: Filter & TimeScale Controls Toolbar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 min-w-0">
          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2.5 min-w-0 flex-1">
            {/* Milestone Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300 w-full sm:w-48">
              <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={filterMilestoneId}
                onChange={(e) => setFilterMilestoneId(e.target.value)}
                className="bg-transparent text-slate-200 outline-none cursor-pointer w-full text-xs truncate"
              >
                <option value="all" className="bg-slate-900">All Milestones</option>
                {projectData.milestones.map(m => (
                  <option key={m.id} value={m.id} className="bg-slate-900">{m.title}</option>
                ))}
              </select>
            </div>

            {/* Feature Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300 w-full sm:w-48">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={filterFeatureId}
                onChange={(e) => setFilterFeatureId(e.target.value)}
                className="bg-transparent text-slate-200 outline-none cursor-pointer w-full text-xs truncate"
              >
                <option value="all" className="bg-slate-900">All Features</option>
                {projectData.features.map(f => (
                  <option key={f.id} value={f.id} className="bg-slate-900">{f.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Scale & Feature Toggles */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Title Column Width Selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
              <span className="text-[10px] text-slate-400 font-medium px-1.5 uppercase font-mono hidden sm:inline">Title Width</span>
              <button
                onClick={() => setLeftPanelWidth(210)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-all ${
                  leftPanelWidth <= 220 ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Compact width (210px)"
              >
                Compact
              </button>
              <button
                onClick={() => setLeftPanelWidth(260)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-all ${
                  leftPanelWidth > 220 && leftPanelWidth <= 300 ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Default balanced width (260px)"
              >
                Default
              </button>
              <button
                onClick={() => setLeftPanelWidth(360)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-all ${
                  leftPanelWidth > 300 ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Expanded width (360px)"
              >
                Wide
              </button>
            </div>

            {/* Time Scale Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
              {(['days', 'weeks', 'months'] as const).map(scale => (
                <button
                  key={scale}
                  onClick={() => setTimeScale(scale)}
                  className={`px-3 py-1 rounded-lg capitalize font-medium transition-all ${
                    timeScale === scale
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {scale}
                </button>
              ))}
            </div>

            {/* Show Dependencies Toggle */}
            <button
              onClick={() => setShowDependencies(!showDependencies)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 shrink-0 ${
                showDependencies
                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Toggle Visual Dependency Links"
            >
              <Link2 className="w-3.5 h-3.5 shrink-0" />
              <span>Links</span>
            </button>

            {/* Critical Path Toggle */}
            <button
              onClick={() => setHighlightCriticalPath(!highlightCriticalPath)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 shrink-0 ${
                highlightCriticalPath
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Critical Path</span>
            </button>
          </div>
        </div>
      </div>

      {/* Synchronized Two-Pane Gantt Area */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row min-w-0">
        {/* LEFT PANEL: Work Item Metadata List */}
        <div
          className="w-full shrink-0 border-b md:border-b-0 border-slate-800 bg-slate-950/40 min-w-0 transition-all duration-150"
          style={{ width: `${leftPanelWidth}px` }}
        >
          {/* Left Table Header */}
          <div className="h-12 border-b border-slate-800 px-3.5 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-950/80">
            <span className="truncate">Work Item Title</span>
            <span className="text-[10px] text-slate-500 font-mono shrink-0">Dates & Links</span>
          </div>

          {/* Left Task Meta Rows */}
          <div className="divide-y divide-slate-800/60">
            {filteredTasks.map((task) => {
              const predecessors = getTaskPredecessors(task, projectData.tasks);
              const hasConflict = predecessors.some(p => p.hasConflict);

              return (
                <div
                  key={task.id}
                  className="px-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors group"
                  style={{ height: `${ROW_HEIGHT}px` }}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Status Dot */}
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        task.status === 'done' ? 'bg-emerald-400 ring-2 ring-emerald-400/20' :
                        task.status === 'in_progress' ? 'bg-indigo-400 ring-2 ring-indigo-400/20' :
                        task.status === 'review' ? 'bg-purple-400 ring-2 ring-purple-400/20' :
                        task.status === 'blocked' ? 'bg-rose-500 ring-2 ring-rose-500/20' : 'bg-slate-500'
                      }`}
                      title={`Status: ${task.status.replace('_', ' ')}`}
                    />

                    {/* Title & Dates */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-xs text-slate-200 group-hover:text-indigo-300 transition-colors truncate" title={task.title}>
                          {task.title}
                        </span>
                        {hasConflict && (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" title="Schedule Conflict!" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span>{task.startDate || 'TBD'} → {task.dueDate || 'TBD'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Predecessors Badge & Edit Action */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {predecessors.length > 0 && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-0.5 ${
                          hasConflict
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                        }`}
                        title={`${predecessors.length} Predecessor Link(s)`}
                      >
                        <Link2 className="w-2.5 h-2.5" />
                        <span>{predecessors.length}</span>
                      </span>
                    )}

                    <button
                      onClick={() => onOpenTaskModal(task)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
                      title="Edit Task & Dependencies"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredTasks.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500 italic">
                No items match the selected filter.
              </div>
            )}
          </div>
        </div>

        {/* Interactive Resizer Handle (Desktop) */}
        <div
          onMouseDown={handleMouseDown}
          className="hidden md:flex w-2 bg-slate-950 hover:bg-indigo-600 cursor-col-resize items-center justify-center transition-colors group shrink-0 relative z-30 select-none border-x border-slate-800/80"
          title="Drag to resize Work Item Title column width"
        >
          <div className="w-0.5 h-7 bg-slate-600 group-hover:bg-white rounded-full transition-colors" />
        </div>

        {/* RIGHT PANEL: Horizontal Scrollable Timeline Canvas */}
        <div className="flex-1 overflow-x-auto relative min-w-0 bg-slate-900/50">
          <div style={{ width: `${timelineWidth}px` }} className="relative min-h-full">
            {/* Timeline Column Headers */}
            <div className="h-12 border-b border-slate-800 bg-slate-950/80 flex items-center text-slate-400 font-mono text-xs font-semibold sticky top-0 z-20">
              {dateTicks.map((tick, idx) => (
                <div
                  key={idx}
                  className="h-full border-r border-slate-800/80 flex flex-col justify-center items-center px-1 text-center shrink-0"
                  style={{ width: `${tickWidth}px` }}
                >
                  <span className="text-[11px] font-bold text-slate-200 leading-none">{tick.label}</span>
                  <span className="text-[9px] text-slate-500 font-sans mt-0.5">{tick.subLabel}</span>
                </div>
              ))}
            </div>

            {/* SVG Dependency Overlay */}
            {showDependencies && dependencyLinks.length > 0 && (
              <svg
                className="absolute top-12 left-0 w-full pointer-events-none z-10"
                style={{ height: `${filteredTasks.length * ROW_HEIGHT}px` }}
              >
                <defs>
                  <marker id="arrow-indigo" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#818cf8" />
                  </marker>
                  <marker id="arrow-amber" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
                  </marker>
                  <marker id="arrow-red" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
                  </marker>
                </defs>

                {dependencyLinks.map((link) => {
                  const isConflict = link.hasConflict;
                  const strokeColor = isConflict ? '#f43f5e' : link.depType === 'SS' ? '#f59e0b' : '#818cf8';
                  const markerUrl = isConflict ? 'url(#arrow-red)' : link.depType === 'SS' ? 'url(#arrow-amber)' : 'url(#arrow-indigo)';
                  const dashArray = isConflict ? '4 3' : link.depType === 'SS' ? '5 3' : undefined;

                  const midX = (link.x1 + link.x2) / 2;
                  const pathD = `M ${link.x1} ${link.y1} C ${midX} ${link.y1}, ${midX} ${link.y2}, ${link.x2} ${link.y2}`;

                  return (
                    <g key={link.id} className="pointer-events-auto group/line">
                      <path
                        d={pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={isConflict ? "2.5" : "2"}
                        strokeDasharray={dashArray}
                        markerEnd={markerUrl}
                        className="opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <title>{`${link.depType}: ${link.predTitle} → ${link.succTitle}`}</title>
                      </path>
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Timeline Task Rows & Background Grid Columns */}
            <div className="divide-y divide-slate-800/60 relative">
              {filteredTasks.map((task) => {
                const { leftPx, widthPx } = getTaskPixelPosition(task);
                const predecessors = getTaskPredecessors(task, projectData.tasks);
                const isCritical = highlightCriticalPath && predecessors.length > 0;

                return (
                  <div
                    key={task.id}
                    className="relative px-2 flex items-center hover:bg-slate-800/20 transition-colors"
                    style={{ height: `${ROW_HEIGHT}px` }}
                  >
                    {/* Background Column Guidelines */}
                    {dateTicks.map((_, idx) => (
                      <div
                        key={idx}
                        className="absolute top-0 bottom-0 border-r border-slate-800/40 pointer-events-none"
                        style={{ left: `${idx * tickWidth}px`, width: `${tickWidth}px` }}
                      />
                    ))}

                    {/* Interactive Task Bar */}
                    <div
                      className={`absolute h-8 rounded-xl border flex items-center px-3 text-xs font-bold text-white shadow-md transition-all cursor-pointer group/bar ${
                        isCritical
                          ? 'bg-rose-600/90 border-rose-400 shadow-rose-950/50 hover:bg-rose-500'
                          : task.status === 'done'
                          ? 'bg-emerald-600/90 border-emerald-400 shadow-emerald-950/50 hover:bg-emerald-500'
                          : task.status === 'blocked'
                          ? 'bg-rose-700/90 border-rose-400'
                          : 'bg-indigo-600/90 border-indigo-400 shadow-indigo-950/50 hover:bg-indigo-500'
                      }`}
                      style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                      onClick={() => onOpenTaskModal(task)}
                      title={`${task.title}\nStatus: ${task.status.toUpperCase()}\nProgress: ${task.completionPercent}%\nDates: ${task.startDate} to ${task.dueDate}`}
                    >
                      {/* Completion Progress Bar Overlay */}
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-white/20 rounded-l-xl pointer-events-none"
                        style={{ width: `${Math.min(100, Math.max(0, task.completionPercent))}%` }}
                      />

                      <span className="truncate relative z-10 drop-shadow text-slate-100 font-semibold tracking-wide">
                        {task.title}
                      </span>

                      <span className="ml-2 relative z-10 text-[10px] opacity-80 font-mono font-normal shrink-0">
                        {task.completionPercent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend & Summary Footer */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 sm:p-4 rounded-xl text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-indigo-600 border border-indigo-400" /> Standard Task
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-600 border border-emerald-400" /> Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-600 border border-rose-400" /> Critical Path
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-indigo-300">
            <span className="w-4 h-0.5 bg-indigo-400 inline-block" /> FS (Finish-to-Start)
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-amber-300">
            <span className="w-4 h-0.5 border-t border-dashed border-amber-400 inline-block" /> SS (Start-to-Start)
          </span>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Tasks: <strong className="text-slate-200">{filteredTasks.length}</strong> | Dependencies: <strong className="text-indigo-400">{dependencyLinks.length}</strong>
        </div>
      </div>
    </div>
  );
};
