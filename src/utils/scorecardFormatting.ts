/**
 * Scorecard & EVM Conditional Formatting Utilities
 * Provides standardized threshold-based conditional formatting for SPI, CPI, and scorecard metrics.
 */

export type MetricAlertLevel = 'critical' | 'warning' | 'optimal';

export interface EVMFormattingConfig {
  criticalThreshold?: number; // default 0.9
  targetThreshold?: number;   // default 1.0
}

/**
 * Returns the alert level ('critical' | 'warning' | 'optimal') for an EVM metric (SPI / CPI).
 */
export function getEVMAlertLevel(
  value: number,
  config: EVMFormattingConfig = { criticalThreshold: 0.9, targetThreshold: 1.0 }
): MetricAlertLevel {
  const critical = config.criticalThreshold ?? 0.9;
  const target = config.targetThreshold ?? 1.0;

  if (value < critical) return 'critical';
  if (value < target) return 'warning';
  return 'optimal';
}

/**
 * High-visibility CSS classes for EVM metric cards/containers.
 * Automatically applies prominent alert borders, pulsing glow, and background tint when below threshold (< 0.9).
 */
export function getEVMCardClass(
  value: number,
  criticalThreshold = 0.9
): string {
  if (value < criticalThreshold) {
    return 'bg-rose-50/90 dark:bg-gradient-to-b dark:from-rose-950/70 dark:to-slate-900 border-2 border-rose-300 dark:border-rose-500/80 shadow-xs dark:shadow-[0_0_18px_rgba(244,63,94,0.28)] ring-1 ring-rose-300/60 dark:ring-rose-500/50 transition-all';
  }
  if (value < 1.0) {
    return 'bg-amber-50/70 dark:bg-slate-900 border border-amber-300 dark:border-amber-500/50 shadow-2xs transition-all';
  }
  return 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition-all';
}

/**
 * High-visibility badge CSS classes for SPI / CPI inline pill chips.
 */
export function getEVMBadgeClass(
  value: number,
  criticalThreshold = 0.9
): string {
  if (value < criticalThreshold) {
    return 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-2 border-rose-400 dark:border-rose-500 font-black shadow-xs dark:shadow-[0_0_10px_rgba(244,63,94,0.35)] ring-1 ring-rose-300 dark:ring-rose-500/40';
  }
  if (value < 1.0) {
    return 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 font-bold';
  }
  return 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 font-bold';
}

/**
 * High-visibility text color CSS class for raw number displays.
 */
export function getEVMTextColorClass(
  value: number,
  criticalThreshold = 0.9
): string {
  if (value < criticalThreshold) {
    return 'text-rose-600 dark:text-rose-400 font-black dark:drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]';
  }
  if (value < 1.0) {
    return 'text-amber-700 dark:text-amber-400 font-bold';
  }
  return 'text-emerald-700 dark:text-emerald-400 font-bold';
}

/**
 * Human-readable label for EVM status based on thresholds.
 */
export function getEVMStatusLabel(
  value: number,
  metricType: 'SPI' | 'CPI' = 'SPI',
  criticalThreshold = 0.9
): { label: string; alertLevel: MetricAlertLevel; description: string } {
  if (value < criticalThreshold) {
    return {
      label: `Critical Alert (< ${criticalThreshold})`,
      alertLevel: 'critical',
      description: metricType === 'SPI'
        ? 'Severe schedule slippage detected. Immediate PM mitigation required.'
        : 'Severe cost overrun detected. Capital burn exceeding baseline.'
    };
  }
  if (value < 1.0) {
    return {
      label: 'Attention (0.9 - 1.0)',
      alertLevel: 'warning',
      description: metricType === 'SPI'
        ? 'Pacing slightly behind schedule baseline.'
        : 'Cost slightly exceeding planned value.'
    };
  }
  return {
    label: 'Optimal (≥ 1.0)',
    alertLevel: 'optimal',
    description: metricType === 'SPI'
      ? 'Ahead or strictly on target schedule baseline.'
      : 'Within budget efficiency limits.'
  };
}
