export type Priority = 'urgent' | 'high' | 'normal' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done';
export type FeatureStatus = 'backlog' | 'in_progress' | 'testing' | 'completed';
export type MilestoneStatus = 'upcoming' | 'in_progress' | 'achieved' | 'delayed';

export type RaidType = 'risk' | 'assumption' | 'issue' | 'dependency';
export type RaidSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskStatus = 'identified' | 'monitoring' | 'mitigated' | 'occurred' | 'closed';

export type StakeholderCategory = 'internal' | 'external';

export interface Stakeholder {
  id: string;
  name: string;
  email: string;
  role: string;
  category?: StakeholderCategory;
  avatar: string;
  hourlyRate: number;
  weeklyCapacityHours: number;
  skills: string[];
  status: 'active' | 'out-of-office' | 'part-time';
  createdBy?: string;
  createdByEmail?: string;
}

export type EpicStatus = 'backlog' | 'in_progress' | 'completed';

export interface Epic {
  id: string;
  title: string;
  description: string;
  milestoneId?: string;
  status: EpicStatus;
  color?: string;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  epicId?: string;
  milestoneId?: string;
  status: FeatureStatus;
  priority: Priority;
  targetReleaseDate: string;
  color: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  featureId?: string;
  epicId?: string;
  dueDate: string;
  status: MilestoneStatus;
  baselineCost: number;
  actualCost: number;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  assigneeId?: string;
  estimatedHours: number;
  actualHours: number;
}

export type RaciRole = 'R' | 'A' | 'C' | 'I';

export interface RaciMatrix {
  responsible?: string[]; // Stakeholder IDs (R)
  accountable?: string[];  // Stakeholder IDs (A)
  consulted?: string[];    // Stakeholder IDs (C)
  informed?: string[];     // Stakeholder IDs (I)
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  epicId?: string;
  featureId?: string;
  milestoneId?: string;
  status: TaskStatus;
  priority: Priority;
  assigneeIds: string[];
  raci?: RaciMatrix;
  startDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  estimatedHours: number;
  actualHours: number;
  plannedCost: number;
  actualCost: number;
  completionPercent: number; // 0 to 100
  dependencies: string[]; // task IDs
  tags: string[];
  createdBy?: string;
  createdByEmail?: string;
}

export interface RaidItem {
  id: string;
  type: RaidType;
  title: string;
  description: string;
  ownerId: string;
  status: string;
  probability?: RaidSeverity;
  impact?: RaidSeverity;
  riskScore?: number; // 1 - 16
  mitigationStrategy?: string;
  contingencyPlan?: string;
  severity?: RaidSeverity;
  targetResolutionDate?: string;
  linkedTaskId?: string;
  createdBy?: string;
  createdByEmail?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  userEmail?: string;
  userAvatar?: string;
  action: string;
  details: string;
  category?: 'task' | 'wbs' | 'raid' | 'stakeholder' | 'project' | 'auth' | 'audit' | 'change';
  entityId?: string;
}

export type ChangeRequestStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'deferred' | 'implemented';
export type ChangeRequestPriority = 'low' | 'medium' | 'high' | 'critical';
export type ChangeImpactArea = 'scope' | 'schedule' | 'cost' | 'quality' | 'risk' | 'resources';

export interface ChangeRequest {
  id: string; // e.g. CR-001
  crNumber: string;
  title: string;
  description: string;
  requestor: string;
  requestorEmail?: string;
  requestDate: string;
  status: ChangeRequestStatus;
  priority: ChangeRequestPriority;
  impactAreas: ChangeImpactArea[];
  
  // PMI Impact Analysis Metrics
  costImpactDelta: number; // positive = increase budget, negative = savings
  scheduleImpactDays: number; // positive = delay days, negative = acceleration
  scopeImpactDescription: string;
  riskImpactDescription?: string;
  
  // Justification & Recommendation
  justification: string;
  proposedSolution: string;
  pmRecommendation?: string;
  
  // CCB Review
  ccbDecisionDate?: string;
  ccbNotes?: string;
  approvedBy?: string;
  fastTrackApproved?: boolean; // Flexible mode approval without full CCB
  
  linkedTaskId?: string;
  linkedRaidId?: string;
  createdBy?: string;
  createdByEmail?: string;
}

export interface EVMMetrics {
  plannedValue: number;    // PV
  earnedValue: number;     // EV
  actualCost: number;      // AC
  budgetAtCompletion: number; // BAC
  scheduleVariance: number; // SV = EV - PV
  costVariance: number;    // CV = EV - AC
  spi: number;             // SPI = EV / PV
  cpi: number;             // CPI = EV / AC
  eac: number;             // Estimate at Completion = BAC / CPI
  etc: number;             // Estimate to Complete = EAC - AC
}

export interface StakeholderWorkload {
  stakeholder: Stakeholder;
  assignedHours: number;
  capacityHours: number;
  utilizationPercent: number;
  taskCount: number;
  overloaded: boolean;
}

export type UserRole = 'pm' | 'stakeholder';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  avatar: string;
  department?: string;
}

export interface ProjectMeta {
  id: string;
  projectName: string;
  projectCode: string;
  description: string;
  budget: number;
  startDate: string;
  targetEndDate: string;
  taskCount: number;
  spi?: number;
  cpi?: number;
}

export interface DashboardWidgetConfig {
  id: string;
  title: string;
  enabled: boolean;
  order: number;
  width: 'full' | 'half' | 'third';
}

export interface ProjectData {
  id: string;
  projectName: string;
  projectCode: string;
  description: string;
  startDate: string;
  targetEndDate: string;
  budget: number;
  stakeholders: Stakeholder[];
  milestones: Milestone[];
  epics: Epic[];
  features: Feature[];
  tasks: Task[];
  subtasks: Subtask[];
  raidItems: RaidItem[];
  activities: ActivityLog[];
  changeRequests?: ChangeRequest[];
  widgets: DashboardWidgetConfig[];
}

export type ViewMode = 'dashboard' | 'member_dashboard' | 'wbs' | 'gantt' | 'workload' | 'stakeholders' | 'raid' | 'reports' | 'audit' | 'change';

export type AiProvider = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'deepseek' | 'custom';

export interface CustomAiConfig {
  enabled: boolean;
  provider: AiProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}
