import React from 'react';
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';
import {
  getEVMAlertLevel,
  getEVMBadgeClass,
  getEVMTextColorClass,
  getEVMStatusLabel
} from '../../utils/scorecardFormatting';

interface EVMScorecardBadgeProps {
  value: number;
  type?: 'SPI' | 'CPI';
  threshold?: number; // default 0.9
  showLabel?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const EVMScorecardBadge: React.FC<EVMScorecardBadgeProps> = ({
  value,
  type = 'SPI',
  threshold = 0.9,
  showLabel = true,
  showIcon = true,
  size = 'md',
  className = ''
}) => {
  const alertLevel = getEVMAlertLevel(value, { criticalThreshold: threshold, targetThreshold: 1.0 });
  const status = getEVMStatusLabel(value, type as 'SPI' | 'CPI', threshold);

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    md: 'px-2 py-0.5 text-xs gap-1.5',
    lg: 'px-3 py-1 text-sm gap-2'
  };

  return (
    <span
      className={`inline-flex items-center rounded-lg font-mono transition-all ${getEVMBadgeClass(
        value,
        threshold
      )} ${sizeClasses[size]} ${className}`}
      title={`${type}: ${value.toFixed(2)} — ${status.label}: ${status.description}`}
    >
      {showIcon && (
        <>
          {alertLevel === 'critical' ? (
            <AlertTriangle className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-rose-400 shrink-0 animate-bounce`} />
          ) : alertLevel === 'warning' ? (
            <TrendingDown className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-amber-400 shrink-0`} />
          ) : (
            <TrendingUp className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-emerald-400 shrink-0`} />
          )}
        </>
      )}

      {showLabel && <span className="text-[10px] uppercase font-bold opacity-80">{type}:</span>}
      <span className={getEVMTextColorClass(value, threshold)}>{value.toFixed(2)}</span>

      {alertLevel === 'critical' && (
        <span className="ml-1 px-1 py-0.2 rounded text-[9px] font-sans font-black bg-rose-500 text-white uppercase tracking-tight">
          Alert
        </span>
      )}
    </span>
  );
};
