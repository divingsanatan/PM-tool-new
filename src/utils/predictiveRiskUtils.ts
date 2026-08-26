import { ProjectData, RaidItem, EVMMetrics, Task } from '../types';

export interface PredictedBlocker {
  id: string;
  raidId?: string;
  type: 'risk' | 'issue' | 'assumption' | 'dependency' | 'schedule';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0 - 100%
  predictedHorizonDays: number; // e.g. 3 days until blocker materializes
  affectedScope: string; // e.g. "Sprint 2 - API Gateway", "Milestone: MVP Release"
  leadingIndicator: string; // What signal alerted this
  preventativeAction: string; // Pre-emptive intervention
  ownerName?: string;
  status: string;
  urgency: 'immediate' | 'upcoming' | 'monitored';
}

export interface PredictiveRiskSummary {
  exposureScore: number; // 0 - 100
  threatLevel: 'Low' | 'Moderate' | 'Elevated' | 'Critical';
  trendDirection: 'improving' | 'stable' | 'deteriorating';
  blockerCount: number;
  criticalDependenciesCount: number;
  openIssuesCount: number;
  highRisksCount: number;
  unvalidatedAssumptionsCount: number;
  earliestBlockerHorizonDays: number | null;
  predictedBlockers: PredictedBlocker[];
  vulnerableMilestones: string[];
  keyRecommendations: string[];
}

/**
 * Calculates predictive risk metrics and forecasts potential project blockers
 * by analyzing current RAID item trends, task progress, dependencies, and EVM health.
 */
export function calculatePredictiveRisks(
  project: ProjectData,
  metrics?: EVMMetrics
): PredictiveRiskSummary {
  const raidItems = project.raidItems || [];
  const tasks = project.tasks || [];
  const milestones = project.milestones || [];
  const stakeholders = project.stakeholders || [];

  const getOwnerName = (ownerId?: string): string => {
    if (!ownerId) return 'Unassigned';
    const found = stakeholders.find(s => s.id === ownerId || s.name === ownerId);
    return found ? found.name : ownerId;
  };

  const predictedBlockers: PredictedBlocker[] = [];

  // 1. Analyze DEPENDENCIES for imminent blocker bottlenecks
  const dependencies = raidItems.filter(r => r.type === 'dependency');
  dependencies.forEach(dep => {
    const isResolved = dep.status.toLowerCase().includes('resolved') || dep.status.toLowerCase().includes('closed');
    if (!isResolved) {
      const severity = (dep.severity || dep.impact || 'high').toLowerCase() as 'low' | 'medium' | 'high' | 'critical';
      const riskScore = dep.riskScore || (severity === 'critical' ? 14 : severity === 'high' ? 10 : 6);
      
      // Correlate with linked tasks
      const linkedTask = tasks.find(t => t.id === dep.linkedTaskId || (t.dependencies && t.dependencies.includes(dep.id)));
      const affectedScope = linkedTask 
        ? `Task: ${linkedTask.title} (${linkedTask.sprintId ? 'Sprint Active' : 'Backlog'})` 
        : 'Cross-functional Workstream';

      const probability = severity === 'critical' ? 90 : severity === 'high' ? 75 : 50;
      const horizonDays = severity === 'critical' ? 2 : severity === 'high' ? 5 : 10;

      predictedBlockers.push({
        id: `pred-dep-${dep.id}`,
        raidId: dep.id,
        type: 'dependency',
        title: `Unresolved External Dependency: ${dep.title}`,
        description: dep.description || 'Pending architectural or third-party deliverable prerequisite.',
        severity: severity === 'low' ? 'low' : severity === 'medium' ? 'medium' : severity === 'high' ? 'high' : 'critical',
        probability,
        predictedHorizonDays: horizonDays,
        affectedScope,
        leadingIndicator: `Open dependency blocking downstream execution with status: ${dep.status}.`,
        preventativeAction: dep.mitigationStrategy || 'Establish emergency interface contract or implement temporary mock service to decouple workflow.',
        ownerName: getOwnerName(dep.ownerId),
        status: dep.status,
        urgency: horizonDays <= 3 ? 'immediate' : 'upcoming'
      });
    }
  });

  // 2. Analyze ACTIVE ISSUES for escalation trends
  const issues = raidItems.filter(r => r.type === 'issue');
  issues.forEach(issue => {
    const isResolved = issue.status.toLowerCase().includes('resolved') || issue.status.toLowerCase().includes('closed');
    if (!isResolved) {
      const severity = (issue.severity || issue.impact || 'medium').toLowerCase() as 'low' | 'medium' | 'high' | 'critical';
      const probability = 95; // Issues are already realized, high blocker probability if unresolved
      const horizonDays = severity === 'critical' ? 1 : severity === 'high' ? 3 : 7;

      predictedBlockers.push({
        id: `pred-iss-${issue.id}`,
        raidId: issue.id,
        type: 'issue',
        title: `Active Issue Escalation: ${issue.title}`,
        description: issue.description || 'Active blocker currently impeding team velocity.',
        severity: severity === 'low' ? 'low' : severity === 'medium' ? 'medium' : severity === 'high' ? 'high' : 'critical',
        probability,
        predictedHorizonDays: horizonDays,
        affectedScope: issue.linkedTaskId 
          ? `Linked Task: ${tasks.find(t => t.id === issue.linkedTaskId)?.title || issue.linkedTaskId}` 
          : 'Core Project Execution',
        leadingIndicator: `Unresolved active issue logged in register (Impact: ${issue.impact || severity}).`,
        preventativeAction: issue.contingencyPlan || issue.mitigationStrategy || 'Assign senior engineering lead and schedule daily standup focus block until resolved.',
        ownerName: getOwnerName(issue.ownerId),
        status: issue.status,
        urgency: severity === 'critical' || severity === 'high' ? 'immediate' : 'upcoming'
      });
    }
  });

  // 3. Analyze RISKS for high probability x impact thresholds
  const risks = raidItems.filter(r => r.type === 'risk');
  risks.forEach(risk => {
    const isResolved = risk.status.toLowerCase().includes('mitigated') || risk.status.toLowerCase().includes('closed') || risk.status.toLowerCase().includes('resolved');
    if (!isResolved) {
      const severity = (risk.severity || risk.impact || 'medium').toLowerCase() as 'low' | 'medium' | 'high' | 'critical';
      const probStr = (risk.probability || 'medium').toLowerCase();
      const probScore = probStr === 'critical' || probStr === 'high' ? 80 : probStr === 'medium' ? 50 : 25;
      
      if (probScore >= 50 || severity === 'high' || severity === 'critical') {
        const horizonDays = severity === 'critical' ? 4 : severity === 'high' ? 7 : 14;
        
        predictedBlockers.push({
          id: `pred-rsk-${risk.id}`,
          raidId: risk.id,
          type: 'risk',
          title: `Threat Materialization: ${risk.title}`,
          description: risk.description || 'High exposure risk approaching trigger threshold.',
          severity: severity === 'low' ? 'low' : severity === 'medium' ? 'medium' : severity === 'high' ? 'high' : 'critical',
          probability: probScore,
          predictedHorizonDays: horizonDays,
          affectedScope: risk.linkedTaskId 
            ? `Linked Deliverable: ${tasks.find(t => t.id === risk.linkedTaskId)?.title || risk.linkedTaskId}` 
            : 'Delivery Baseline',
          leadingIndicator: `Risk probability (${probStr}) and severity (${severity}) exceed proactive monitoring threshold.`,
          preventativeAction: risk.mitigationStrategy || risk.contingencyPlan || 'Execute primary mitigation buffer and review trigger condition with technical leads.',
          ownerName: getOwnerName(risk.ownerId),
          status: risk.status,
          urgency: horizonDays <= 5 ? 'immediate' : 'upcoming'
        });
      }
    }
  });

  // 4. Analyze UNVALIDATED ASSUMPTIONS
  const assumptions = raidItems.filter(r => r.type === 'assumption');
  assumptions.forEach(assump => {
    const isValidated = assump.status.toLowerCase().includes('validated') || assump.status.toLowerCase().includes('closed') || assump.status.toLowerCase().includes('confirmed');
    if (!isValidated) {
      const severityStr = (assump.severity || assump.impact || 'medium').toLowerCase();
      if (severityStr === 'high' || severityStr === 'critical') {
        const severity: 'low' | 'medium' | 'high' | 'critical' = severityStr === 'critical' ? 'critical' : 'high';
        predictedBlockers.push({
          id: `pred-asm-${assump.id}`,
          raidId: assump.id,
          type: 'assumption',
          title: `Unverified Critical Assumption: ${assump.title}`,
          description: assump.description || 'Working hypothesis untested against target environment.',
          severity,
          probability: 60,
          predictedHorizonDays: 8,
          affectedScope: 'Architectural & Delivery Scope',
          leadingIndicator: `High impact assumption remaining unverified during active implementation.`,
          preventativeAction: assump.mitigationStrategy || 'Conduct technical spike or stakeholder review to validate assumption before sprint milestone gates.',
          ownerName: getOwnerName(assump.ownerId),
          status: assump.status,
          urgency: 'upcoming'
        });
      }
    }
  });

  // 5. Correlate with EVM metrics for Schedule / Cost Slippage Blocker
  if (metrics && metrics.spi < 0.9) {
    predictedBlockers.push({
      id: 'pred-evm-spi-slip',
      type: 'schedule',
      title: 'Schedule Performance Velocity Bottleneck',
      description: `Current SPI of ${metrics.spi} indicates project is progressing at ${Math.round(metrics.spi * 100)}% of planned velocity.`,
      severity: metrics.spi < 0.8 ? 'critical' : 'high',
      probability: 85,
      predictedHorizonDays: 5,
      affectedScope: 'Sprint Release Gate & Milestone Delivery',
      leadingIndicator: `Earned Value ($${metrics.earnedValue.toLocaleString()}) lagging Planned Value ($${metrics.plannedValue.toLocaleString()}) by $${Math.abs(metrics.scheduleVariance).toLocaleString()}.`,
      preventativeAction: 'Reallocate non-critical backlog items, reduce sprint WIP limits, or fast-track critical path activities.',
      status: 'Trending Behind',
      urgency: 'immediate'
    });
  }

  // Sort predicted blockers by urgency and predicted horizon days
  predictedBlockers.sort((a, b) => {
    const urgencyOrder = { immediate: 0, upcoming: 1, monitored: 2 };
    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    }
    return a.predictedHorizonDays - b.predictedHorizonDays;
  });

  // Calculate Exposure Score (0 - 100)
  const openIssues = issues.filter(i => !i.status.toLowerCase().includes('resolved') && !i.status.toLowerCase().includes('closed'));
  const criticalDeps = dependencies.filter(d => !d.status.toLowerCase().includes('resolved') && !d.status.toLowerCase().includes('closed') && ((d.severity || d.impact || '').toLowerCase() === 'high' || (d.severity || d.impact || '').toLowerCase() === 'critical'));
  const highRisks = risks.filter(r => !r.status.toLowerCase().includes('mitigated') && !r.status.toLowerCase().includes('closed') && ((r.severity || r.impact || '').toLowerCase() === 'high' || (r.severity || r.impact || '').toLowerCase() === 'critical'));
  const unvalidatedAssumptions = assumptions.filter(a => !a.status.toLowerCase().includes('validated') && !a.status.toLowerCase().includes('closed'));

  let exposureRaw = (openIssues.length * 20) + (criticalDeps.length * 15) + (highRisks.length * 10) + (unvalidatedAssumptions.length * 5);
  if (metrics && metrics.spi < 0.85) exposureRaw += 20;
  else if (metrics && metrics.spi < 0.95) exposureRaw += 10;
  if (metrics && metrics.cpi < 0.85) exposureRaw += 15;

  const exposureScore = Math.min(100, Math.max(10, exposureRaw));

  let threatLevel: 'Low' | 'Moderate' | 'Elevated' | 'Critical' = 'Low';
  if (exposureScore >= 75) threatLevel = 'Critical';
  else if (exposureScore >= 50) threatLevel = 'Elevated';
  else if (exposureScore >= 25) threatLevel = 'Moderate';

  let trendDirection: 'improving' | 'stable' | 'deteriorating' = 'stable';
  if (openIssues.length > 2 || criticalDeps.length > 2 || (metrics && metrics.spi < 0.9)) {
    trendDirection = 'deteriorating';
  } else if (openIssues.length === 0 && criticalDeps.length === 0 && (!metrics || metrics.spi >= 1.0)) {
    trendDirection = 'improving';
  }

  // Vulnerable milestones
  const vulnerableMilestones: string[] = [];
  milestones.forEach(m => {
    const isCompleted = m.status === 'achieved';
    if (!isCompleted) {
      if (exposureScore >= 50 || (metrics && metrics.spi < 0.95)) {
        vulnerableMilestones.push(m.title);
      }
    }
  });
  if (vulnerableMilestones.length === 0 && milestones.length > 0) {
    const upcoming = milestones.find(m => m.status !== 'achieved');
    if (upcoming) vulnerableMilestones.push(upcoming.title);
  }

  // Earliest horizon
  const earliestBlockerHorizonDays = predictedBlockers.length > 0 
    ? Math.min(...predictedBlockers.map(b => b.predictedHorizonDays))
    : null;

  // Key recommendations
  const keyRecommendations: string[] = [];
  if (criticalDeps.length > 0) {
    keyRecommendations.push(`Resolve ${criticalDeps.length} critical dependency roadblock${criticalDeps.length > 1 ? 's' : ''} to prevent workstream starvation.`);
  }
  if (openIssues.length > 0) {
    keyRecommendations.push(`Initiate daily triage for ${openIssues.length} active issue${openIssues.length > 1 ? 's' : ''} currently impeding velocity.`);
  }
  if (metrics && metrics.spi < 0.9) {
    keyRecommendations.push(`Address schedule velocity gap (SPI ${metrics.spi}) by shedding low-priority backlog scope from current sprint.`);
  }
  if (unvalidatedAssumptions.length > 0) {
    keyRecommendations.push(`Formally validate ${unvalidatedAssumptions.length} high-impact technical assumption${unvalidatedAssumptions.length > 1 ? 's' : ''} before architecture freeze.`);
  }
  if (keyRecommendations.length === 0) {
    keyRecommendations.push('Maintain active RAID review cadence and track resolution of secondary risks during sprint retrospectives.');
  }

  return {
    exposureScore,
    threatLevel,
    trendDirection,
    blockerCount: predictedBlockers.length,
    criticalDependenciesCount: criticalDeps.length,
    openIssuesCount: openIssues.length,
    highRisksCount: highRisks.length,
    unvalidatedAssumptionsCount: unvalidatedAssumptions.length,
    earliestBlockerHorizonDays,
    predictedBlockers,
    vulnerableMilestones,
    keyRecommendations
  };
}
