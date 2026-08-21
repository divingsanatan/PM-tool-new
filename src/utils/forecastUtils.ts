import { ProjectData, Task, Subtask, Stakeholder, Milestone, RaidItem } from '../types';
import { calculateEVMMetrics } from './evm';

export interface TrendDataPoint {
  period: string; // e.g. "W1 (Jan 22)", "W2 (Jan 29)", etc.
  date: string;   // YYYY-MM-DD
  plannedValue: number;
  earnedValue: number | null;
  actualCost: number | null;
  spi: number | null;
  cpi: number | null;
  projectedEVLikely?: number | null;
  projectedEVPessimistic?: number | null;
  isProjected?: boolean;
}

export interface ForecastScenario {
  name: 'optimistic' | 'most_likely' | 'pessimistic';
  label: string;
  description: string;
  forecastDate: string; // YYYY-MM-DD
  varianceDays: number; // positive = delay, negative = early
  projectedDurationDays: number;
  assumedSPI: number;
  assumedCPI: number;
  projectedEAC: number;
  status: 'ahead' | 'on_track' | 'at_risk' | 'critical';
}

export interface ProjectForecastResult {
  projectId: string;
  projectName: string;
  projectCode: string;
  startDate: string;
  targetEndDate: string;
  plannedDurationDays: number;
  elapsedDays: number;
  progressPercent: number;
  
  // Current Indices
  currentSPI: number;
  currentCPI: number;
  criticalRatio: number; // SPI * CPI
  requiredSPIForTarget: number; // SPI required on remaining work to hit target date

  // Key Dates
  baselineEndDate: string;
  forecastCompletionDate: string; // Default to Most Likely
  scheduleVarianceDays: number;   // +Delay / -Ahead
  slippagePercent: number;
  deliveryStatus: 'ahead' | 'on_track' | 'at_risk' | 'critical';

  // Cost Projections
  budgetAtCompletion: number;
  estimateAtCompletion: number;
  varianceAtCompletion: number; // BAC - EAC

  // Confidence & Drivers
  confidenceScore: number; // 0 - 100
  confidenceLevel: 'High' | 'Medium' | 'Low';
  confidenceFactors: {
    label: string;
    score: number; // 0-100
    impact: string;
  }[];

  // Tri-Factor Scenarios
  scenarios: {
    optimistic: ForecastScenario;
    mostLikely: ForecastScenario;
    pessimistic: ForecastScenario;
  };

  // Historical & Extrapolated Trend Data for Charts
  trendTimeline: TrendDataPoint[];

  // Executive AI Summary
  executiveSummary: string;
  recommendations: string[];
}

/**
 * Utility to calculate days between two YYYY-MM-DD dates
 */
export function daysBetween(dateStr1: string, dateStr2: string): number {
  if (!dateStr1 || !dateStr2) return 0;
  const d1 = new Date(dateStr1).getTime();
  const d2 = new Date(dateStr2).getTime();
  const diffTime = d2 - d1;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Utility to add days to a YYYY-MM-DD date
 */
export function addDaysToDate(dateStr: string, days: number): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Formats YYYY-MM-DD into a human-readable string like "Oct 24, 2026"
 */
export function formatFriendlyDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Core EVM & Historical Trend Forecasting Engine for a Project
 */
export function calculateProjectForecast(
  project: ProjectData,
  referenceDateStr?: string
): ProjectForecastResult {
  const todayStr = referenceDateStr || new Date().toISOString().split('T')[0];
  const startDate = project.startDate || addDaysToDate(todayStr, -90);
  const targetEndDate = project.targetEndDate || addDaysToDate(todayStr, 60);

  const plannedDuration = Math.max(14, daysBetween(startDate, targetEndDate));
  const elapsedDays = Math.max(1, daysBetween(startDate, todayStr));
  
  // 1. Calculate EVM metrics
  const evm = calculateEVMMetrics(
    project.tasks || [],
    project.budget || 250000,
    project.subtasks || [],
    project.stakeholders || []
  );

  const BAC = evm.budgetAtCompletion > 0 ? evm.budgetAtCompletion : (project.budget || 250000);
  const PV = Math.max(1, evm.plannedValue);
  const EV = evm.earnedValue;
  const AC = Math.max(1, evm.actualCost);

  // Clamped indices for stability
  const currentSPI = Number(Math.max(0.35, Math.min(2.2, evm.spi || (EV / PV) || 1.0)).toFixed(2));
  const currentCPI = Number(Math.max(0.35, Math.min(2.2, evm.cpi || (EV / AC) || 1.0)).toFixed(2));
  const criticalRatio = Number((currentSPI * currentCPI).toFixed(2));

  // Deliverables progress
  const tasks = project.tasks || [];
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const taskProgressPercent = tasks.length > 0
    ? (completedTasks / tasks.length) * 100
    : Math.min(100, Math.round((EV / BAC) * 100));
  const progressPercent = Math.max(0, Math.min(100, Math.round(taskProgressPercent)));

  // RAID risks drag
  const raidItems = project.raidItems || [];
  const openCriticalRisks = raidItems.filter(
    r => r.type === 'risk' && (r.severity === 'critical' || r.severity === 'high') && r.status !== 'closed'
  ).length;
  const openIssues = raidItems.filter(r => r.type === 'issue' && r.status !== 'closed').length;
  const delayedMilestones = (project.milestones || []).filter(m => m.status === 'delayed').length;

  // 2. Compute Tri-Factor Completion Dates
  
  // A) Most Likely: Based on historical SPI trend continuation
  // Projected Total Duration = Planned Duration / SPI
  let likelyTotalDuration = Math.round(plannedDuration / currentSPI);
  // Ensure projected finish is at least today if project is in progress
  likelyTotalDuration = Math.max(elapsedDays + (tasks.length - completedTasks > 0 ? 5 : 0), likelyTotalDuration);
  const mostLikelyDate = addDaysToDate(startDate, likelyTotalDuration);
  const likelyVarianceDays = daysBetween(targetEndDate, mostLikelyDate);

  // B) Optimistic: Assumes remaining work catches up at standard velocity (SPI = 1.0)
  const remainingWorkEV = Math.max(0, BAC - EV);
  const workFractionRemaining = BAC > 0 ? remainingWorkEV / BAC : Math.max(0, (100 - progressPercent) / 100);
  const remainingDaysOptimistic = Math.max(1, Math.round(plannedDuration * workFractionRemaining));
  const optimisticDate = addDaysToDate(todayStr, remainingDaysOptimistic);
  const optimisticVarianceDays = daysBetween(targetEndDate, optimisticDate);
  const optimisticTotalDuration = daysBetween(startDate, optimisticDate);

  // C) Pessimistic: Composite Drag Index = Critical Ratio (SPI * CPI) with Risk Penalty
  const riskPenalty = (openCriticalRisks * 0.04) + (openIssues * 0.02) + (delayedMilestones * 0.03);
  const compositeDrag = Math.max(0.30, criticalRatio - riskPenalty);
  let pessimisticTotalDuration = Math.round(plannedDuration / compositeDrag);
  pessimisticTotalDuration = Math.max(likelyTotalDuration + 7, pessimisticTotalDuration);
  const pessimisticDate = addDaysToDate(startDate, pessimisticTotalDuration);
  const pessimisticVarianceDays = daysBetween(targetEndDate, pessimisticDate);

  // Required SPI to complete exactly on target date
  const remainingDaysToTarget = Math.max(1, daysBetween(todayStr, targetEndDate));
  const plannedRemainingDays = Math.max(1, plannedDuration - (elapsedDays * currentSPI));
  const requiredSPIForTarget = Number((plannedRemainingDays / remainingDaysToTarget).toFixed(2));

  // Determine delivery status
  let deliveryStatus: 'ahead' | 'on_track' | 'at_risk' | 'critical' = 'on_track';
  if (likelyVarianceDays <= -5) {
    deliveryStatus = 'ahead';
  } else if (likelyVarianceDays <= 5) {
    deliveryStatus = 'on_track';
  } else if (likelyVarianceDays <= 21) {
    deliveryStatus = 'at_risk';
  } else {
    deliveryStatus = 'critical';
  }

  const slippagePercent = plannedDuration > 0
    ? Math.round((likelyVarianceDays / plannedDuration) * 100)
    : 0;

  // Cost estimates
  const estimateAtCompletion = Math.round(BAC / currentCPI);
  const varianceAtCompletion = BAC - estimateAtCompletion;

  // 3. Confidence Score Calculation
  const factorMaturity = Math.min(100, Math.round((elapsedDays / Math.max(1, plannedDuration)) * 100));
  const factorStability = Math.max(20, Math.round(100 - Math.abs(currentSPI - 1.0) * 45 - Math.abs(currentCPI - 1.0) * 35));
  const factorRiskCoverage = Math.max(10, 100 - (openCriticalRisks * 22 + openIssues * 10 + delayedMilestones * 12));
  const factorGranularity = Math.min(100, Math.max(30, tasks.length * 8));

  const weightedConfidence = Math.round(
    factorMaturity * 0.25 +
    factorStability * 0.35 +
    factorRiskCoverage * 0.25 +
    factorGranularity * 0.15
  );
  const confidenceScore = Math.max(35, Math.min(96, weightedConfidence));
  const confidenceLevel: 'High' | 'Medium' | 'Low' =
    confidenceScore >= 75 ? 'High' : confidenceScore >= 55 ? 'Medium' : 'Low';

  const confidenceFactors = [
    {
      label: 'EVM Schedule Stability',
      score: factorStability,
      impact: currentSPI >= 0.95 && currentSPI <= 1.1 ? 'Stable Index Velocity' : 'Variance Fluctuations Detected'
    },
    {
      label: 'RAID Risk & Issue Exposure',
      score: factorRiskCoverage,
      impact: openCriticalRisks === 0 ? 'Low Risk Impediment' : `${openCriticalRisks} critical risk(s) impacting critical path`
    },
    {
      label: 'Timeline & Data Maturity',
      score: factorMaturity,
      impact: `${elapsedDays} elapsed days across ${tasks.length} tracked deliverables`
    }
  ];

  // 4. Build Historical & Forecasted Timeline Points (for S-Curve & SPI/CPI Trends)
  const totalTimelineDuration = Math.max(plannedDuration, likelyTotalDuration, pessimisticTotalDuration);
  const intervalWeeks = Math.max(1, Math.ceil(totalTimelineDuration / 7 / 8)); // 8-10 intervals
  const trendTimeline: TrendDataPoint[] = [];

  const totalPoints = Math.ceil(totalTimelineDuration / (intervalWeeks * 7)) + 1;
  const elapsedPoints = Math.min(totalPoints, Math.ceil(elapsedDays / (intervalWeeks * 7)));

  for (let i = 0; i <= totalPoints; i++) {
    const pointDay = Math.min(totalTimelineDuration, i * intervalWeeks * 7);
    const pointDate = addDaysToDate(startDate, pointDay);
    const isPastOrPresent = pointDay <= elapsedDays;
    const pointLabel = `W${Math.round(pointDay / 7)}`;

    // Planned Value Curve (Sigmoid / S-Curve model)
    const tNorm = pointDay / plannedDuration;
    const pvSigmoid = 1 / (1 + Math.exp(-6 * (tNorm - 0.5)));
    const pvAtPoint = Math.round(BAC * Math.min(1.0, pvSigmoid * 1.05));

    if (isPastOrPresent) {
      // Historical actuals with synthetic noise matching current SPI/CPI trajectory
      const fraction = pointDay / elapsedDays;
      const evAtPoint = Math.round(EV * fraction * (0.95 + (Math.sin(i) * 0.05)));
      const acAtPoint = Math.round(AC * fraction * (0.95 + (Math.cos(i) * 0.05)));
      
      const histSPI = pvAtPoint > 0 ? Number((evAtPoint / Math.max(1, pvAtPoint)).toFixed(2)) : 1.0;
      const histCPI = acAtPoint > 0 ? Number((evAtPoint / Math.max(1, acAtPoint)).toFixed(2)) : 1.0;

      trendTimeline.push({
        period: `${pointLabel}`,
        date: pointDate,
        plannedValue: pvAtPoint,
        earnedValue: Math.min(BAC, Math.max(0, evAtPoint)),
        actualCost: Math.max(0, acAtPoint),
        spi: Math.max(0.4, Math.min(1.8, histSPI)),
        cpi: Math.max(0.4, Math.min(1.8, histCPI)),
        projectedEVLikely: evAtPoint,
        projectedEVPessimistic: evAtPoint,
        isProjected: false
      });
    } else {
      // Future Projected S-Curves
      const futureDaysFromToday = pointDay - elapsedDays;
      const likelyRemainingDays = Math.max(1, likelyTotalDuration - elapsedDays);
      const likelyProgress = Math.min(1.0, futureDaysFromToday / likelyRemainingDays);
      const projectedEVLikely = Math.round(EV + (BAC - EV) * likelyProgress);

      const pessimisticRemainingDays = Math.max(1, pessimisticTotalDuration - elapsedDays);
      const pessimisticProgress = Math.min(1.0, futureDaysFromToday / pessimisticRemainingDays);
      const projectedEVPessimistic = Math.round(EV + (BAC - EV) * pessimisticProgress);

      trendTimeline.push({
        period: `${pointLabel} (Proj)`,
        date: pointDate,
        plannedValue: pointDay <= plannedDuration ? pvAtPoint : BAC,
        earnedValue: null,
        actualCost: null,
        spi: null,
        cpi: null,
        projectedEVLikely: Math.min(BAC, projectedEVLikely),
        projectedEVPessimistic: Math.min(BAC, projectedEVPessimistic),
        isProjected: true
      });
    }
  }

  // 5. Build Scenarios Object
  const scenarios = {
    optimistic: {
      name: 'optimistic' as const,
      label: 'Optimistic (Catch-up)',
      description: 'Assumes all remaining scope executes at standard velocity (SPI 1.0) without bottleneck delays.',
      forecastDate: optimisticDate,
      varianceDays: optimisticVarianceDays,
      projectedDurationDays: optimisticTotalDuration,
      assumedSPI: 1.0,
      assumedCPI: Math.max(1.0, currentCPI),
      projectedEAC: BAC,
      status: optimisticVarianceDays <= 0 ? ('ahead' as const) : ('on_track' as const)
    },
    mostLikely: {
      name: 'most_likely' as const,
      label: 'Most Likely (Historical SPI Trend)',
      description: `Projects completion extrapolating current SPI (${currentSPI.toFixed(2)}) delivery velocity through completion.`,
      forecastDate: mostLikelyDate,
      varianceDays: likelyVarianceDays,
      projectedDurationDays: likelyTotalDuration,
      assumedSPI: currentSPI,
      assumedCPI: currentCPI,
      projectedEAC: estimateAtCompletion,
      status: deliveryStatus
    },
    pessimistic: {
      name: 'pessimistic' as const,
      label: 'Pessimistic (Critical Ratio & Risk Drag)',
      description: `Factorizes compound friction from SPI (${currentSPI.toFixed(2)}) × CPI (${currentCPI.toFixed(2)}) and ${openCriticalRisks} active critical RAID blockers.`,
      forecastDate: pessimisticDate,
      varianceDays: pessimisticVarianceDays,
      projectedDurationDays: pessimisticTotalDuration,
      assumedSPI: Number((currentSPI * 0.85).toFixed(2)),
      assumedCPI: Number((currentCPI * 0.88).toFixed(2)),
      projectedEAC: Math.round(BAC / Math.max(0.4, currentCPI * 0.88)),
      status: 'critical' as const
    }
  };

  // 6. Generate Executive AI Narrative & Actionable Recommendations
  let executiveSummary = '';
  const recommendations: string[] = [];

  if (likelyVarianceDays > 14) {
    executiveSummary = `Based on historical EVM trend modeling (SPI: ${currentSPI.toFixed(2)}, CPI: ${currentCPI.toFixed(2)}), ${project.projectName} is projected to complete on ${formatFriendlyDate(mostLikelyDate)}, representing a schedule slippage of +${likelyVarianceDays} days past the planned baseline (${formatFriendlyDate(targetEndDate)}).`;
    recommendations.push(`Accelerate critical path by raising sprint velocity to SPI ${requiredSPIForTarget.toFixed(2)} on remaining deliverables.`);
    if (openCriticalRisks > 0) {
      recommendations.push(`Mitigate ${openCriticalRisks} critical RAID risks to eliminate schedule friction.`);
    }
    if (currentCPI < 0.90) {
      recommendations.push(`EAC is projected at $${estimateAtCompletion.toLocaleString()} ($${Math.abs(varianceAtCompletion).toLocaleString()} budget overrun). Review resource rates and CCB scope additions.`);
    }
  } else if (likelyVarianceDays > 0) {
    executiveSummary = `${project.projectName} is tracking near baseline with a minor projected variance of +${likelyVarianceDays} days (Forecast: ${formatFriendlyDate(mostLikelyDate)} vs Target: ${formatFriendlyDate(targetEndDate)}). Current SPI (${currentSPI.toFixed(2)}) indicates steady delivery progress.`;
    recommendations.push(`Maintain current velocity. Target sprint completion dates to close the ${likelyVarianceDays}-day gap.`);
  } else {
    executiveSummary = `${project.projectName} is operating at high efficiency with an SPI of ${currentSPI.toFixed(2)} and CPI of ${currentCPI.toFixed(2)}. Projected completion is ${formatFriendlyDate(mostLikelyDate)}, delivering ${Math.abs(likelyVarianceDays)} days ahead of baseline!`;
    recommendations.push(`Maintain high-quality standards and consider early transition/handover milestones.`);
  }

  return {
    projectId: project.id,
    projectName: project.projectName,
    projectCode: project.projectCode,
    startDate,
    targetEndDate,
    plannedDurationDays: plannedDuration,
    elapsedDays,
    progressPercent,
    currentSPI,
    currentCPI,
    criticalRatio,
    requiredSPIForTarget,
    baselineEndDate: targetEndDate,
    forecastCompletionDate: mostLikelyDate,
    scheduleVarianceDays: likelyVarianceDays,
    slippagePercent,
    deliveryStatus,
    budgetAtCompletion: BAC,
    estimateAtCompletion,
    varianceAtCompletion,
    confidenceScore,
    confidenceLevel,
    confidenceFactors,
    scenarios,
    trendTimeline,
    executiveSummary,
    recommendations
  };
}

/**
 * Portfolio-level Aggregation of Project Completion Date Forecasts
 */
export function calculatePortfolioForecasts(projects: ProjectData[]): {
  projectForecasts: ProjectForecastResult[];
  avgPortfolioSPI: number;
  avgPortfolioCPI: number;
  totalAtRiskProjects: number;
  totalCriticalProjects: number;
  totalAheadProjects: number;
  maxSlippageDays: number;
  portfolioForecastDate: string;
} {
  const forecasts = projects.map(p => calculateProjectForecast(p));
  
  const totalSPI = forecasts.reduce((sum, f) => sum + f.currentSPI, 0);
  const totalCPI = forecasts.reduce((sum, f) => sum + f.currentCPI, 0);
  const count = forecasts.length || 1;

  const atRiskCount = forecasts.filter(f => f.deliveryStatus === 'at_risk').length;
  const criticalCount = forecasts.filter(f => f.deliveryStatus === 'critical').length;
  const aheadCount = forecasts.filter(f => f.deliveryStatus === 'ahead' || f.deliveryStatus === 'on_track').length;

  const maxSlippage = forecasts.reduce((max, f) => Math.max(max, f.scheduleVarianceDays), 0);

  // Latest forecast date across active portfolio
  const sortedDates = [...forecasts].map(f => f.forecastCompletionDate).sort();
  const portfolioForecastDate = sortedDates[sortedDates.length - 1] || new Date().toISOString().split('T')[0];

  return {
    projectForecasts: forecasts,
    avgPortfolioSPI: Number((totalSPI / count).toFixed(2)),
    avgPortfolioCPI: Number((totalCPI / count).toFixed(2)),
    totalAtRiskProjects: atRiskCount,
    totalCriticalProjects: criticalCount,
    totalAheadProjects: aheadCount,
    maxSlippageDays: maxSlippage,
    portfolioForecastDate
  };
}
