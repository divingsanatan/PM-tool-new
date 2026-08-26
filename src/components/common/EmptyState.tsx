import React from 'react';
import {
  Inbox,
  Search,
  CheckCircle2,
  FolderOpen,
  Calendar,
  Layers,
  Users,
  ShieldAlert,
  BarChart2,
  FileText,
  MessageSquare,
  Sparkles,
  LucideIcon,
  FilterX
} from 'lucide-react';

export type EmptyStatePreset =
  | 'inbox'
  | 'search'
  | 'filter'
  | 'tasks'
  | 'calendar'
  | 'users'
  | 'folder'
  | 'shield'
  | 'chart'
  | 'file'
  | 'chat'
  | 'complete';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'amber' | 'emerald' | 'rose';
}

export interface EmptyStateProps {
  preset?: EmptyStatePreset;
  icon?: LucideIcon | React.ReactNode;
  title?: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

const PRESET_CONFIG: Record<
  EmptyStatePreset,
  {
    icon: LucideIcon;
    defaultTitle: string;
    defaultDesc: string;
    color: string;
    ringColor: string;
    haloColor: string;
  }
> = {
  inbox: {
    icon: Inbox,
    defaultTitle: 'No items found',
    defaultDesc: 'There are no records in this list yet.',
    color: 'text-amber-400',
    ringColor: 'border-amber-500/30 bg-amber-500/10',
    haloColor: 'from-amber-500/15 via-orange-500/5 to-transparent'
  },
  search: {
    icon: Search,
    defaultTitle: 'No matching results',
    defaultDesc: 'We couldn’t find anything matching your search term. Try checking for typos or using different keywords.',
    color: 'text-sky-400',
    ringColor: 'border-sky-500/30 bg-sky-500/10',
    haloColor: 'from-sky-500/15 via-indigo-500/5 to-transparent'
  },
  filter: {
    icon: FilterX,
    defaultTitle: 'No matching criteria',
    defaultDesc: 'No records match the selected filters. Try clearing or broadening your filter criteria.',
    color: 'text-indigo-400',
    ringColor: 'border-indigo-500/30 bg-indigo-500/10',
    haloColor: 'from-indigo-500/15 via-purple-500/5 to-transparent'
  },
  tasks: {
    icon: Layers,
    defaultTitle: 'No work items yet',
    defaultDesc: 'Get started by creating your first work item or scheduling tasks into this view.',
    color: 'text-indigo-400',
    ringColor: 'border-indigo-500/30 bg-indigo-500/10',
    haloColor: 'from-indigo-500/15 via-blue-500/5 to-transparent'
  },
  calendar: {
    icon: Calendar,
    defaultTitle: 'No scheduled events',
    defaultDesc: 'There are no tasks or milestones scheduled for this timeframe.',
    color: 'text-purple-400',
    ringColor: 'border-purple-500/30 bg-purple-500/10',
    haloColor: 'from-purple-500/15 via-pink-500/5 to-transparent'
  },
  users: {
    icon: Users,
    defaultTitle: 'No team members found',
    defaultDesc: 'No stakeholders or assignees are associated with this criteria.',
    color: 'text-teal-400',
    ringColor: 'border-teal-500/30 bg-teal-500/10',
    haloColor: 'from-teal-500/15 via-emerald-500/5 to-transparent'
  },
  folder: {
    icon: FolderOpen,
    defaultTitle: 'Folder is empty',
    defaultDesc: 'There are currently no items or child documents stored here.',
    color: 'text-blue-400',
    ringColor: 'border-blue-500/30 bg-blue-500/10',
    haloColor: 'from-blue-500/15 via-indigo-500/5 to-transparent'
  },
  shield: {
    icon: ShieldAlert,
    defaultTitle: 'No risks or issues recorded',
    defaultDesc: 'Your project is operating smoothly with no outstanding RAID items.',
    color: 'text-emerald-400',
    ringColor: 'border-emerald-500/30 bg-emerald-500/10',
    haloColor: 'from-emerald-500/15 via-teal-500/5 to-transparent'
  },
  chart: {
    icon: BarChart2,
    defaultTitle: 'No analytics available',
    defaultDesc: 'Log activity or complete tasks to generate performance metrics.',
    color: 'text-indigo-400',
    ringColor: 'border-indigo-500/30 bg-indigo-500/10',
    haloColor: 'from-indigo-500/15 via-purple-500/5 to-transparent'
  },
  file: {
    icon: FileText,
    defaultTitle: 'No documents found',
    defaultDesc: 'Create a new document, export report, or upload documentation.',
    color: 'text-slate-400',
    ringColor: 'border-slate-700 bg-slate-800/60',
    haloColor: 'from-slate-700/20 via-slate-800/10 to-transparent'
  },
  chat: {
    icon: MessageSquare,
    defaultTitle: 'No messages yet',
    defaultDesc: 'Start the conversation with your team by typing a message below.',
    color: 'text-emerald-400',
    ringColor: 'border-emerald-500/30 bg-emerald-500/10',
    haloColor: 'from-emerald-500/15 via-teal-500/5 to-transparent'
  },
  complete: {
    icon: CheckCircle2,
    defaultTitle: 'All caught up!',
    defaultDesc: 'You have cleared all pending items in this view.',
    color: 'text-emerald-400',
    ringColor: 'border-emerald-500/30 bg-emerald-500/10',
    haloColor: 'from-emerald-500/20 via-teal-500/5 to-transparent'
  }
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  preset = 'inbox',
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className = '',
  children
}) => {
  const config = PRESET_CONFIG[preset] || PRESET_CONFIG.inbox;
  const displayTitle = title || config.defaultTitle;
  const displayDesc = description !== undefined ? description : config.defaultDesc;

  // Render Icon
  const renderIcon = () => {
    if (icon) {
      if (typeof icon === 'function' || (typeof icon === 'object' && 'render' in (icon as any))) {
        const CustomIcon = icon as LucideIcon;
        const iconSize = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
        return <CustomIcon className={`${iconSize} ${config.color}`} />;
      }
      return icon;
    }

    const IconComp = config.icon;
    const iconSize = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
    return <IconComp className={`${iconSize} ${config.color}`} />;
  };

  const getActionBtnClass = (variant: EmptyStateAction['variant'] = 'primary') => {
    switch (variant) {
      case 'amber':
        return 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20';
      case 'emerald':
        return 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20';
      case 'rose':
        return 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20';
      case 'secondary':
        return 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700';
      case 'primary':
      default:
        return 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25';
    }
  };

  if (size === 'sm') {
    return (
      <div
        className={`flex flex-col items-center justify-center p-4 text-center rounded-xl bg-slate-950/40 border border-dashed border-slate-800/80 my-1 animate-in fade-in duration-150 ${className}`}
      >
        <div className={`p-2 rounded-xl border mb-2 ${config.ringColor} shadow-inner`}>
          {renderIcon()}
        </div>
        <h4 className="text-xs font-semibold text-slate-300">{displayTitle}</h4>
        {displayDesc && (
          <p className="text-[11px] text-slate-500 max-w-xs mt-0.5 leading-relaxed">
            {displayDesc}
          </p>
        )}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={`mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer ${getActionBtnClass(
              action.variant
            )}`}
          >
            {action.icon && <action.icon className="w-3 h-3" />}
            <span>{action.label}</span>
          </button>
        )}
        {children}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden flex flex-col items-center justify-center text-center p-6 sm:p-10 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-slate-800/80 shadow-inner animate-in fade-in duration-200 ${
        size === 'lg' ? 'min-h-[380px]' : 'min-h-[220px]'
      } ${className}`}
    >
      {/* Ambient background glowing halo */}
      <div
        className={`absolute inset-0 bg-radial ${config.haloColor} pointer-events-none opacity-70`}
      />

      {/* Decorative floating shapes */}
      <div className="relative mb-3.5 sm:mb-4">
        {/* Outer soft ring */}
        <div className="absolute -inset-2.5 rounded-3xl bg-slate-800/30 blur-sm -z-10" />

        {/* Center Badge with Icon */}
        <div
          className={`relative p-3.5 sm:p-4 rounded-2xl border shadow-xl flex items-center justify-center ${config.ringColor}`}
        >
          {renderIcon()}

          {/* Sparkle badge accent */}
          <div className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-slate-900 border border-slate-700 text-amber-300 shadow-sm">
            <Sparkles className="w-2.5 h-2.5" />
          </div>
        </div>
      </div>

      {/* Title & Description */}
      <h3 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight max-w-md">
        {displayTitle}
      </h3>
      {displayDesc && (
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mt-1.5 leading-relaxed">
          {displayDesc}
        </p>
      )}

      {/* Action Buttons */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-2.5 mt-4 sm:mt-5 flex-wrap justify-center z-10">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer ${getActionBtnClass(
                action.variant
              )}`}
            >
              {action.icon && <action.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              <span>{action.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              {secondaryAction.icon && <secondaryAction.icon className="w-3.5 h-3.5" />}
              <span>{secondaryAction.label}</span>
            </button>
          )}
        </div>
      )}

      {children}
    </div>
  );
};
