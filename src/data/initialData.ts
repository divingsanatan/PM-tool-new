import { ProjectData } from '../types';

export const initialProjectData: ProjectData = {
  id: "proj-1",
  projectName: "Apex Cloud Infrastructure & Portal",
  projectCode: "APX-2026",
  description: "Enterprise multi-tenant cloud application suite featuring ClickUp-grade execution tracking, automated EVM reporting, and real-time collaboration.",
  startDate: "2026-06-01",
  targetEndDate: "2026-11-30",
  budget: 250000,
  stakeholders: [
    {
      id: "sh-admin",
      name: "Sophia Martinez",
      email: "admin@apex.io",
      role: "Executive Portfolio Administrator",
      category: "internal",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150",
      hourlyRate: 175,
      weeklyCapacityHours: 40,
      skills: ["Portfolio Governance", "Executive Strategy", "PMO Operations", "Commercial Risk", "EVM Analytics"],
      status: "active"
    },
    {
      id: "sh-1",
      name: "Alex Morgan",
      email: "alex.m@apex.io",
      role: "Project Manager & Scrum Master",
      category: "internal",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
      hourlyRate: 95,
      weeklyCapacityHours: 40,
      skills: ["Agile", "EVM", "Risk Management", "Stakeholder Relations"],
      status: "active"
    },
    {
      id: "sh-2",
      name: "Dr. Elena Rostova",
      email: "elena.r@apex.io",
      role: "Principal Architect",
      category: "internal",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150",
      hourlyRate: 130,
      weeklyCapacityHours: 35,
      skills: ["Cloud Architecture", "Distributed Systems", "Security"],
      status: "active"
    },
    {
      id: "sh-3",
      name: "Marcus Vance",
      email: "marcus.v@apex.io",
      role: "Senior Full Stack Engineer",
      category: "internal",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
      hourlyRate: 110,
      weeklyCapacityHours: 40,
      skills: ["React", "TypeScript", "Node.js", "WebSockets"],
      status: "active"
    },
    {
      id: "sh-4",
      name: "Priya Sharma",
      email: "priya.s@apex.io",
      role: "Lead UI/UX Designer",
      category: "external",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
      hourlyRate: 85,
      weeklyCapacityHours: 30,
      skills: ["Figma", "Design Systems", "User Research", "Accessibility"],
      status: "active"
    },
    {
      id: "sh-5",
      name: "David Chen",
      email: "david.c@apex.io",
      role: "DevOps & QA Specialist",
      category: "internal",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
      hourlyRate: 90,
      weeklyCapacityHours: 40,
      skills: ["CI/CD", "Docker", "Kubernetes", "Automated Testing"],
      status: "active"
    }
  ],
  milestones: [
    {
      id: "m-1",
      title: "M1: Platform Infrastructure Alpha",
      description: "Backend REST/WebSocket endpoints and data sync engine operational.",
      dueDate: "2026-07-01",
      status: "achieved",
      baselineCost: 40000,
      actualCost: 38500
    },
    {
      id: "m-2",
      title: "M2: EVM Dashboard & Gantt Preview",
      description: "SPI & CPI analytics engine and drag-and-drop Gantt chart ready for testing.",
      dueDate: "2026-08-01",
      status: "in_progress",
      baselineCost: 65000,
      actualCost: 52000
    },
    {
      id: "m-3",
      title: "M3: RAID System & Workload Heatmap",
      description: "Risk matrix scoring and stakeholder capacity load tracking operational.",
      dueDate: "2026-09-15",
      status: "upcoming",
      baselineCost: 50000,
      actualCost: 12000
    },
    {
      id: "m-4",
      title: "M4: Production Release & AI Reports",
      description: "Final security audit, offline storage verification, and AI automated report suite.",
      dueDate: "2026-11-01",
      status: "upcoming",
      baselineCost: 45000,
      actualCost: 0
    }
  ],
  epics: [
    {
      id: "epic-1",
      title: "Platform Core Infrastructure",
      description: "Core database schema, security, and WebSocket sync layer.",
      milestoneId: "m-1",
      status: "completed",
      color: "#3b82f6"
    },
    {
      id: "epic-2",
      title: "Analytics & EVM Engine",
      description: "Financial, earned value, and schedule performance computation suite.",
      milestoneId: "m-2",
      status: "in_progress",
      color: "#8b5cf6"
    },
    {
      id: "epic-3",
      title: "Governance & Risk Matrix",
      description: "RAID items, severity matrix, and mitigation workflows.",
      milestoneId: "m-3",
      status: "in_progress",
      color: "#f59e0b"
    },
    {
      id: "epic-4",
      title: "Automated Reporting Suite",
      description: "AI insights, automated summaries, and executive exports.",
      milestoneId: "m-4",
      status: "backlog",
      color: "#10b981"
    }
  ],
  features: [
    {
      id: "feat-1",
      title: "Core Platform Architecture",
      description: "Foundation, database schema, real-time sync server, and authentication engine.",
      epicId: "epic-1",
      milestoneId: "m-1",
      status: "completed",
      priority: "urgent",
      targetReleaseDate: "2026-07-15",
      color: "#3b82f6"
    },
    {
      id: "feat-2",
      title: "EVM & Analytics Dashboard",
      description: "SPI/CPI metrics computation, budget tracking, and real-time Gantt visualizations.",
      epicId: "epic-2",
      milestoneId: "m-2",
      status: "in_progress",
      priority: "urgent",
      targetReleaseDate: "2026-08-15",
      color: "#8b5cf6"
    },
    {
      id: "feat-3",
      title: "RAID Risk & Oversight Module",
      description: "Risk, Assumption, Issue, and Dependency matrix tracking with mitigation planning.",
      epicId: "epic-3",
      milestoneId: "m-3",
      status: "in_progress",
      priority: "high",
      targetReleaseDate: "2026-09-01",
      color: "#f59e0b"
    },
    {
      id: "feat-4",
      title: "Automated Reporting & AI Suite",
      description: "Automated weekly executive reporting, Gemini risk mitigation advisor, and export.",
      epicId: "epic-4",
      milestoneId: "m-4",
      status: "backlog",
      priority: "normal",
      targetReleaseDate: "2026-10-15",
      color: "#10b981"
    }
  ],
  userStories: [
    {
      id: "story-101",
      title: "Real-Time Data Model & WebSocket Synchronization",
      description: "As a project manager, I want instant state synchronization so that team changes reflect in real-time.",
      featureId: "feat-1",
      epicId: "epic-1",
      milestoneId: "m-1",
      sprintId: "sprint-1",
      status: "completed",
      priority: "urgent",
      storyPoints: 8,
      assigneeIds: ["sh-2", "sh-3"],
      targetReleaseDate: "2026-06-20",
      color: "#3b82f6"
    },
    {
      id: "story-102",
      title: "ClickUp-grade UI & Accessibility Design System",
      description: "As a team member, I want an accessible, responsive dark/light interface to manage project execution effortlessly.",
      featureId: "feat-1",
      epicId: "epic-1",
      milestoneId: "m-1",
      sprintId: "sprint-1",
      status: "completed",
      priority: "high",
      storyPoints: 5,
      assigneeIds: ["sh-4"],
      targetReleaseDate: "2026-06-25",
      color: "#3b82f6"
    },
    {
      id: "story-103",
      title: "Automated EVM SPI/CPI Variance Forecasting",
      description: "As a project director, I want automated EVM metric calculations so that I can forecast schedule and cost health.",
      featureId: "feat-2",
      epicId: "epic-2",
      milestoneId: "m-2",
      sprintId: "sprint-2",
      status: "in_progress",
      priority: "urgent",
      storyPoints: 13,
      assigneeIds: ["sh-1", "sh-3"],
      targetReleaseDate: "2026-07-28",
      color: "#8b5cf6"
    },
    {
      id: "story-104",
      title: "Interactive Gantt Timeline & Dependency Management",
      description: "As a project planner, I want an interactive draggable Gantt chart with FS/SS dependencies and critical path tracing.",
      featureId: "feat-2",
      epicId: "epic-2",
      milestoneId: "m-2",
      sprintId: "sprint-2",
      status: "in_progress",
      priority: "urgent",
      storyPoints: 13,
      assigneeIds: ["sh-3", "sh-4"],
      targetReleaseDate: "2026-08-10",
      color: "#8b5cf6"
    },
    {
      id: "story-105",
      title: "Stakeholder Workload Distribution & Capacity Tracking",
      description: "As a resource manager, I want workload distribution heatmaps to prevent resource bottlenecks.",
      featureId: "feat-2",
      epicId: "epic-2",
      milestoneId: "m-2",
      sprintId: "sprint-2",
      status: "in_progress",
      priority: "high",
      storyPoints: 8,
      assigneeIds: ["sh-1", "sh-5"],
      targetReleaseDate: "2026-08-05",
      color: "#8b5cf6"
    },
    {
      id: "story-106",
      title: "Comprehensive RAID Risk Matrix & Mitigation Workflow",
      description: "As a risk manager, I want a 4x4 probability/impact matrix to assess and mitigate delivery risks proactively.",
      featureId: "feat-3",
      epicId: "epic-3",
      milestoneId: "m-3",
      sprintId: "sprint-3",
      status: "in_progress",
      priority: "high",
      storyPoints: 8,
      assigneeIds: ["sh-1", "sh-2"],
      targetReleaseDate: "2026-08-20",
      color: "#f59e0b"
    },
    {
      id: "story-107",
      title: "Gemini AI Executive Reporting Suite",
      description: "As an executive sponsor, I want AI-generated status briefs and trend commentary to make fast strategic decisions.",
      featureId: "feat-4",
      epicId: "epic-4",
      milestoneId: "m-4",
      sprintId: "sprint-3",
      status: "backlog",
      priority: "normal",
      storyPoints: 5,
      assigneeIds: ["sh-1", "sh-3"],
      targetReleaseDate: "2026-09-01",
      color: "#10b981"
    }
  ],
  tasks: [
    {
      id: "task-101",
      title: "Design Relational Schema & Real-Time Sync Protocols",
      description: "Define database models for tasks, RAID items, EVM metrics, and WebSocket event payloads.",
      storyId: "story-101",
      userStoryId: "story-101",
      epicId: "epic-1",
      featureId: "feat-1",
      milestoneId: "m-1",
      sprintId: "sprint-1",
      status: "done",
      priority: "urgent",
      assigneeIds: ["sh-2", "sh-3"],
      raci: {
        responsible: ["sh-2", "sh-3"],
        accountable: ["sh-2"],
        consulted: ["sh-1"],
        informed: ["sh-4", "sh-5"]
      },
      startDate: "2026-06-01",
      dueDate: "2026-06-15",
      estimatedHours: 60,
      actualHours: 58,
      plannedCost: 6600,
      actualCost: 6380,
      completionPercent: 100,
      dependencies: [],
      tags: ["Backend", "Architecture", "WebSockets"]
    },
    {
      id: "task-102",
      title: "Implement ClickUp-style Design System & Glass Theme",
      description: "Build accessible dark/light mode UI components, cards, status badges, and tabs.",
      storyId: "story-102",
      userStoryId: "story-102",
      epicId: "epic-1",
      featureId: "feat-1",
      milestoneId: "m-1",
      sprintId: "sprint-1",
      status: "done",
      priority: "high",
      assigneeIds: ["sh-4"],
      raci: {
        responsible: ["sh-4"],
        accountable: ["sh-4"],
        consulted: ["sh-3"],
        informed: ["sh-1", "sh-2"]
      },
      startDate: "2026-06-10",
      dueDate: "2026-06-25",
      estimatedHours: 45,
      actualHours: 42,
      plannedCost: 3825,
      actualCost: 3570,
      completionPercent: 100,
      dependencies: [],
      tags: ["UI/UX", "Tailwind", "Theme"]
    },
    {
      id: "task-103",
      title: "Develop EVM SPI/CPI Metric Calculation Engine",
      description: "Compute Earned Value (EV), Planned Value (PV), Actual Cost (AC), SPI, CPI, EAC, and ETC dynamically.",
      storyId: "story-103",
      userStoryId: "story-103",
      epicId: "epic-2",
      featureId: "feat-2",
      milestoneId: "m-2",
      sprintId: "sprint-2",
      status: "in_progress",
      priority: "urgent",
      assigneeIds: ["sh-1", "sh-3"],
      raci: {
        responsible: ["sh-3"],
        accountable: ["sh-1"],
        consulted: ["sh-2"],
        informed: ["sh-5"]
      },
      startDate: "2026-07-01",
      dueDate: "2026-07-28",
      estimatedHours: 50,
      actualHours: 35,
      plannedCost: 5125,
      actualCost: 3800,
      completionPercent: 80,
      dependencies: ["task-101:FS"],
      linkedBugIds: ["task-bug-1"],
      acceptanceCriteria: [
        { id: "ac-103-1", text: "EV, PV, AC formulas adhere to PMI standard (EV = % Complete * BAC)", validated: true, validatedBy: "Alex Morgan (PM)", validatedAt: "2026-07-26" },
        { id: "ac-103-2", text: "SPI and CPI handle zero-cost and edge cases gracefully without division-by-zero errors", validated: true, validatedBy: "Alex Morgan (PM)", validatedAt: "2026-07-27" },
        { id: "ac-103-3", text: "EAC and ETC auto-update when actual hours change", validated: false }
      ],
      tags: ["EVM", "Analytics", "Engine"]
    },
    {
      id: "task-104",
      title: "Build Interactive Gantt Chart Component",
      description: "Multi-scale Gantt view with task dependency lines, draggable bars, critical path highlights, and zoom levels.",
      storyId: "story-104",
      userStoryId: "story-104",
      epicId: "epic-2",
      featureId: "feat-2",
      milestoneId: "m-2",
      sprintId: "sprint-2",
      status: "demoable",
      priority: "urgent",
      assigneeIds: ["sh-3", "sh-4"],
      raci: {
        responsible: ["sh-3", "sh-4"],
        accountable: ["sh-3"],
        consulted: ["sh-1"],
        informed: ["sh-2", "sh-5"]
      },
      startDate: "2026-07-05",
      dueDate: "2026-08-10",
      estimatedHours: 80,
      actualHours: 45,
      plannedCost: 7800,
      actualCost: 4950,
      completionPercent: 85,
      dependencies: ["task-102:SS"],
      acceptanceCriteria: [
        { id: "ac-104-1", text: "Timeline renders task bars with correct start and end dates", validated: true, validatedBy: "Alex Morgan (PM)", validatedAt: "2026-07-28" },
        { id: "ac-104-2", text: "Drag-and-drop handles FS/SS/FF dependency constraints visually", validated: false },
        { id: "ac-104-3", text: "Critical path tasks highlighted in amber/red outline when selected", validated: false }
      ],
      tags: ["Gantt", "Interactive", "Visualization"]
    },
    {
      id: "task-105",
      title: "Stakeholder Workload Distribution & Heatmap",
      description: "Calculate capacity utilization per team member and flag overload warnings (>100% capacity).",
      storyId: "story-105",
      userStoryId: "story-105",
      epicId: "epic-2",
      featureId: "feat-2",
      milestoneId: "m-2",
      sprintId: "sprint-2",
      status: "in_progress",
      priority: "high",
      assigneeIds: ["sh-1", "sh-5"],
      raci: {
        responsible: ["sh-5"],
        accountable: ["sh-1"],
        consulted: ["sh-4"],
        informed: ["sh-2", "sh-3"]
      },
      startDate: "2026-07-15",
      dueDate: "2026-08-05",
      estimatedHours: 40,
      actualHours: 25,
      plannedCost: 3700,
      actualCost: 2325,
      completionPercent: 60,
      dependencies: ["task-103:FS"],
      tags: ["Workload", "Heatmap", "Capacity"]
    },
    {
      id: "task-106",
      title: "RAID Log Management System & Risk Matrix",
      description: "Interactive table and 4x4 matrix heatmap for Risks, Assumptions, Issues, and Dependencies.",
      storyId: "story-106",
      userStoryId: "story-106",
      epicId: "epic-3",
      featureId: "feat-3",
      milestoneId: "m-3",
      sprintId: "sprint-3",
      status: "in_progress",
      priority: "high",
      assigneeIds: ["sh-1", "sh-2"],
      raci: {
        responsible: ["sh-1", "sh-2"],
        accountable: ["sh-1"],
        consulted: ["sh-5"],
        informed: ["sh-3", "sh-4"]
      },
      startDate: "2026-07-20",
      dueDate: "2026-08-20",
      estimatedHours: 55,
      actualHours: 20,
      plannedCost: 6187,
      actualCost: 2250,
      completionPercent: 40,
      dependencies: ["task-101:FS"],
      tags: ["RAID", "Risk", "Oversight"]
    },
    {
      id: "task-107",
      title: "Offline Access Engine & IndexedDB Persistence",
      description: "Implement local cache queue, connection status monitor, and auto-sync on reconnect.",
      storyId: "story-101",
      userStoryId: "story-101",
      epicId: "epic-1",
      featureId: "feat-1",
      milestoneId: "m-1",
      sprintId: "sprint-1",
      status: "done",
      priority: "high",
      assigneeIds: ["sh-3", "sh-5"],
      raci: {
        responsible: ["sh-3"],
        accountable: ["sh-5"],
        consulted: ["sh-2"],
        informed: ["sh-1"]
      },
      startDate: "2026-06-20",
      dueDate: "2026-07-10",
      estimatedHours: 35,
      actualHours: 35,
      plannedCost: 3500,
      actualCost: 3500,
      completionPercent: 100,
      dependencies: ["task-101:SS"],
      tags: ["Offline", "Sync", "IndexedDB"]
    },
    {
      id: "task-108",
      title: "AI Automated Executive Report Generator",
      description: "Gemini AI integration endpoint to generate weekly progress reports, SPI/CPI trend commentary, and risk advice.",
      storyId: "story-107",
      userStoryId: "story-107",
      epicId: "epic-4",
      featureId: "feat-4",
      milestoneId: "m-4",
      sprintId: "sprint-3",
      status: "todo",
      priority: "normal",
      assigneeIds: ["sh-1", "sh-3"],
      raci: {
        responsible: ["sh-3"],
        accountable: ["sh-1"],
        consulted: ["sh-2", "sh-4"],
        informed: ["sh-5"]
      },
      startDate: "2026-08-15",
      dueDate: "2026-09-01",
      estimatedHours: 30,
      actualHours: 0,
      plannedCost: 3075,
      actualCost: 0,
      completionPercent: 0,
      dependencies: ["task-103:FS", "task-106:SS"],
      tags: ["AI", "Gemini", "Reporting"]
    },
    {
      id: "task-bug-1",
      type: "bug",
      title: "SPI Calculation Overflow on Zero-Cost Tasks",
      description: "Division by zero occurs in EVM engine when task baseline cost is 0 and SPI calculation runs.",
      storyId: "story-103",
      userStoryId: "story-103",
      epicId: "epic-2",
      featureId: "feat-2",
      milestoneId: "m-2",
      status: "in_progress",
      priority: "urgent",
      assigneeIds: ["sh-3"],
      raci: {
        responsible: ["sh-3"],
        accountable: ["sh-1"],
        consulted: ["sh-2"],
        informed: ["sh-4"]
      },
      startDate: "2026-07-15",
      dueDate: "2026-07-30",
      estimatedHours: 8,
      actualHours: 4,
      plannedCost: 720,
      actualCost: 360,
      completionPercent: 50,
      dependencies: [],
      tags: ["Bug", "EVM", "Defect"]
    },
    {
      id: "task-bug-2",
      type: "bug",
      title: "Gantt Timeline Drag Snap Offset on Retina Screens",
      description: "Dragging a task bar on high-DPI monitors causes a 2-day date alignment error.",
      storyId: "story-104",
      userStoryId: "story-104",
      epicId: "epic-2",
      featureId: "feat-2",
      milestoneId: "m-2",
      status: "todo",
      priority: "high",
      assigneeIds: ["sh-4"],
      raci: {
        responsible: ["sh-4"],
        accountable: ["sh-3"],
        consulted: ["sh-2"],
        informed: ["sh-1"]
      },
      startDate: "2026-07-20",
      dueDate: "2026-08-05",
      estimatedHours: 12,
      actualHours: 0,
      plannedCost: 1020,
      actualCost: 0,
      completionPercent: 0,
      dependencies: [],
      tags: ["Bug", "Gantt", "UI"]
    }
  ],
  subtasks: [
    { id: "sub-1", taskId: "task-101", title: "Write OpenAPI / REST endpoints documentation", completed: true, assigneeId: "sh-2", estimatedHours: 10, actualHours: 10 },
    { id: "sub-2", taskId: "task-101", title: "Setup Express + WS server handshake logic", completed: true, assigneeId: "sh-3", estimatedHours: 20, actualHours: 18 },
    { id: "sub-3", taskId: "task-103", title: "Formula verification for Earned Value vs Planned Value", completed: true, assigneeId: "sh-1", estimatedHours: 15, actualHours: 12 },
    { id: "sub-4", taskId: "task-103", title: "SPI/CPI trend line chart renderer", completed: false, assigneeId: "sh-3", estimatedHours: 20, actualHours: 15 },
    { id: "sub-5", taskId: "task-104", title: "Draggable timeline bars with date snap", completed: true, assigneeId: "sh-3", estimatedHours: 30, actualHours: 25 },
    { id: "sub-6", taskId: "task-104", title: "SVG dependency connector lines", completed: false, assigneeId: "sh-4", estimatedHours: 25, actualHours: 10 },
    { id: "sub-7", taskId: "task-106", title: "Probability vs Impact 4x4 Risk Matrix renderer", completed: true, assigneeId: "sh-1", estimatedHours: 15, actualHours: 12 },
    { id: "sub-8", taskId: "task-106", title: "Mitigation plan entry form and status filter", completed: false, assigneeId: "sh-2", estimatedHours: 15, actualHours: 5 }
  ],
  sprints: [
    {
      id: "sprint-1",
      name: "Sprint 1 - Foundation & Core Architecture",
      goal: "Establish relational data model, real-time WebSocket sync engine, and design system.",
      status: "completed",
      startDate: "2026-06-01",
      endDate: "2026-06-25",
      isAutoDates: true,
      capacityPoints: 50
    },
    {
      id: "sprint-2",
      name: "Sprint 2 - EVM Analytics & Interactive Gantt",
      goal: "Deliver Earned Value Management calculations, interactive Gantt chart, and workload heatmaps.",
      status: "active",
      startDate: "2026-07-01",
      endDate: "2026-08-15",
      isAutoDates: true,
      capacityPoints: 65
    },
    {
      id: "sprint-3",
      name: "Sprint 3 - RAID Risk & AI Executive Reporting",
      goal: "Implement RAID risk mitigation matrix, change control CCB flow, and Gemini executive reporting.",
      status: "future",
      startDate: "2026-08-16",
      endDate: "2026-10-30",
      isAutoDates: true,
      capacityPoints: 60
    }
  ],
  raidItems: [
    {
      id: "raid-1",
      type: "risk",
      title: "Third-party WebSocket network latency under heavy load",
      description: "High concurrency during multi-stakeholder simultaneous editing may introduce event broadcast lag.",
      ownerId: "sh-2",
      status: "monitoring",
      probability: "medium",
      impact: "high",
      riskScore: 9,
      mitigationStrategy: "Implement event throttling (100ms) and local optimistic UI reconciliation.",
      contingencyPlan: "Fallback to 2-second HTTP polling if WebSocket drops connection.",
      severity: "high",
      targetResolutionDate: "2026-08-15",
      linkedTaskId: "task-101"
    },
    {
      id: "raid-2",
      type: "risk",
      title: "Scope creep on custom dashboard widgets",
      description: "Stakeholders requesting additional unbudgeted charts during M2 review.",
      ownerId: "sh-1",
      status: "mitigated",
      probability: "medium",
      impact: "medium",
      riskScore: 6,
      mitigationStrategy: "Enforce strict Change Control Board (CCB) approval process for new widget types.",
      contingencyPlan: "Defer secondary widget customizers to Post-V1 product backlog.",
      severity: "medium",
      targetResolutionDate: "2026-08-01",
      linkedTaskId: "task-103"
    },
    {
      id: "raid-3",
      type: "issue",
      title: "Design Lead capacity constrained due to simultaneous client pitch",
      description: "Priya Sharma is allocated 30h/week but task load requires 38h/week for Gantt polish.",
      ownerId: "sh-1",
      status: "investigating",
      severity: "high",
      mitigationStrategy: "Reassign non-critical icon polishing to Marcus or bring in freelance assistance.",
      targetResolutionDate: "2026-07-30",
      linkedTaskId: "task-104"
    },
    {
      id: "raid-4",
      type: "assumption",
      title: "Gemini API rate limits are sufficient for automated hourly status reports",
      description: "Assuming 15 requests per minute free-tier quota is adequate for AI summary generation.",
      ownerId: "sh-3",
      status: "validated",
      severity: "low",
      targetResolutionDate: "2026-07-10",
      linkedTaskId: "task-108"
    },
    {
      id: "raid-5",
      type: "dependency",
      title: "EVM Engine depends on completed Task 101 REST Schema",
      description: "Calculation of PV and EV requires standardized task start/due dates and planned cost fields.",
      ownerId: "sh-3",
      status: "satisfied",
      severity: "high",
      linkedTaskId: "task-103"
    },
    {
      id: "raid-6",
      type: "risk",
      title: "Offline sync conflict resolution during multi-user edits",
      description: "If two users edit the same task offline and reconnect simultaneously, last-write-wins might overwrite changes.",
      ownerId: "sh-3",
      status: "identified",
      probability: "medium",
      impact: "high",
      riskScore: 9,
      mitigationStrategy: "Use timestamp-based granular field patching instead of replacing whole task payload.",
      contingencyPlan: "Display visual diff dialog if conflict timestamp mismatch > 10 seconds.",
      severity: "high",
      targetResolutionDate: "2026-08-30",
      linkedTaskId: "task-107"
    }
  ],
  activities: [
    {
      id: "act-1",
      timestamp: "2026-07-25T10:15:00Z",
      user: "Alex Morgan",
      userEmail: "alex.morgan@apex.io",
      userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      action: "Updated Milestone",
      details: "Marked Milestone 'M1: Platform Infrastructure Alpha' as Achieved.",
      category: "project",
      entityId: "m-1"
    },
    {
      id: "act-2",
      timestamp: "2026-07-25T08:45:00Z",
      user: "Marcus Vance",
      userEmail: "marcus.vance@apex.io",
      userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      action: "Completed Task",
      details: "Finished 'Design Relational Schema & Real-Time Sync Protocols' (Task 101).",
      category: "task",
      entityId: "task-101"
    },
    {
      id: "act-3",
      timestamp: "2026-07-24T18:20:00Z",
      user: "Dr. Elena Rostova",
      userEmail: "elena.rostova@apex.io",
      userAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      action: "Logged Risk",
      details: "Logged risk 'Third-party WebSocket network latency under heavy load'.",
      category: "raid",
      entityId: "raid-1"
    },
    {
      id: "act-4",
      timestamp: "2026-07-24T14:10:00Z",
      user: "Priya Sharma",
      userEmail: "priya.sharma@apex.io",
      userAvatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
      action: "Updated Task Progress",
      details: "Advanced 'Build Interactive Gantt Chart Component' to 65% completion.",
      category: "task",
      entityId: "task-104"
    },
    {
      id: "act-5",
      timestamp: "2026-07-24T09:30:00Z",
      user: "Sarah Jenkins",
      userEmail: "sarah.jenkins@apex.io",
      userAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
      action: "Added Stakeholder",
      details: "Onboarded David Kim as Lead QA Specialist (Hourly rate: $90/hr).",
      category: "stakeholder",
      entityId: "sh-5"
    },
    {
      id: "act-6",
      timestamp: "2026-07-23T16:00:00Z",
      user: "Alex Morgan",
      userEmail: "alex.morgan@apex.io",
      userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      action: "Adjusted Baseline Budget",
      details: "Updated Project Baseline Budget from $140,000 to $150,000.",
      category: "project",
      entityId: "proj-001"
    },
    {
      id: "act-7",
      timestamp: "2026-07-23T11:15:00Z",
      user: "Google Workspace SSO",
      userEmail: "auth-service@google.com",
      userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=GoogleAuth",
      action: "Google SSO Login",
      details: "User Alex Morgan authenticated via Google OAuth 2.0.",
      category: "auth"
    }
  ],
  widgets: [
    { id: "evm-summary", title: "EVM Performance Index (SPI & CPI)", enabled: true, order: 1, width: "full" },
    { id: "gantt-chart", title: "Interactive Gantt Timeline & Critical Path", enabled: true, order: 2, width: "full" },
    { id: "workload-distribution", title: "Stakeholder Workload Distribution & Load Heatmap", enabled: true, order: 3, width: "half" },
    { id: "raid-matrix", title: "RAID Risk & Oversight Matrix", enabled: true, order: 4, width: "half" },
    { id: "completion-metrics", title: "Work Item Completion Progress (Features, Milestones, Tasks)", enabled: true, order: 5, width: "half" },
    { id: "ai-assistant", title: "AI Executive Project Summary & Risk Advisor", enabled: true, order: 6, width: "half" }
  ],
  pmChecklist: {
    scopeDetails: "Enterprise cloud application featuring ClickUp-grade execution tracking, automated EVM reporting, and real-time collaboration.",
    stakeholderNotes: "All 5 core internal and external stakeholders onboarded with hourly rates and weekly capacities assigned.",
    scheduleNotes: "Project spans 6 months (June - November 2026) broken down into 4 key milestone releases.",
    costNotes: "$250,000 baseline budget authorized across engineering, design, and infrastructure streams.",
    dorNotes: "Work item must have: Title, description, estimated hours, assigned stakeholder, and defined acceptance criteria.",
    dodNotes: "Work item must have: 100% subtasks completed, code verified, acceptance criteria validated by PM, and no blocking risks.",
    dorCriteria: [
      "Item description & scope clearly articulated",
      "Assignee(s) designated with capacity checked",
      "Effort estimated in hours",
      "Optional Acceptance Criteria defined"
    ],
    dodCriteria: [
      "All subtasks & code review finished",
      "PM validated all defined Acceptance Criteria",
      "Logged against corresponding milestone/epic",
      "No critical unmitigated RAID items linked"
    ],
    customItems: [
      { id: "c-1", title: "Architecture & Security Review Sign-off", completed: true, category: "Governance", details: "Signed off by Principal Architect Dr. Elena Rostova" },
      { id: "c-2", title: "Design System & Accessibility Checklist", completed: true, category: "Design", details: "Priya Sharma verified WCAG 2.1 AA compliance" },
      { id: "c-3", title: "Client Demo Environment Provisioned", completed: false, category: "DevOps", details: "Pending staging deployment setup" }
    ]
  },
  changeRequests: [
    {
      id: "cr-101",
      crNumber: "CR-001",
      title: "Add Real-Time Multi-Region WebSocket Synchronization",
      description: "Expand backend architecture to support redundant regional WebSocket edge servers for sub-50ms latency.",
      requestor: "Dr. Elena Rostova",
      requestorEmail: "elena.rostova@apex.io",
      requestDate: "2026-07-20",
      status: "approved",
      priority: "high",
      impactAreas: ["scope", "cost", "schedule"],
      costImpactDelta: 10000,
      scheduleImpactDays: 5,
      scopeImpactDescription: "Adds 2 additional Redis PubSub worker nodes and edge latency monitoring dashboards.",
      riskImpactDescription: "Mitigates high-load latency risk (RAID-001) logged during stress testing.",
      justification: "Critical for enterprise clients demanding real-time multi-user collaboration across geographic regions.",
      proposedSolution: "Provision managed Redis edge cluster and implement automated failover sync.",
      pmRecommendation: "Recommend approval. Budget contingency covers the $10,000 cost delta.",
      ccbDecisionDate: "2026-07-22",
      ccbNotes: "Approved unanimously by CCB. Baseline schedule extended by 5 days.",
      approvedBy: "Alex Morgan (Project Manager)",
      fastTrackApproved: false,
      linkedTaskId: "task-102",
      linkedRaidId: "raid-1"
    },
    {
      id: "cr-102",
      crNumber: "CR-002",
      title: "Fast-Track QA Automation Suite for Alpha Milestone",
      description: "Onboard dedicated automated testing contractor to accelerate test script generation before M2 milestone.",
      requestor: "Marcus Vance",
      requestorEmail: "marcus.vance@apex.io",
      requestDate: "2026-07-24",
      status: "under_review",
      priority: "medium",
      impactAreas: ["schedule", "cost", "quality"],
      costImpactDelta: 4500,
      scheduleImpactDays: -3,
      scopeImpactDescription: "Enables parallel execution of End-to-End Cypress integration tests.",
      riskImpactDescription: "Reduces risk of regressions during fast-paced API updates.",
      justification: "Will save 3 schedule days during the critical path phase before stakeholder demonstration.",
      proposedSolution: "Allocate $4,500 from operational reserves for 30 hours of specialized test engineering.",
      pmRecommendation: "Under review by CCB board. Fast-track approval option available."
    },
    {
      id: "cr-103",
      crNumber: "CR-003",
      title: "Scope Modification: Third-Party Billing Gateway Integration",
      description: "Incorporate automated subscription billing and invoice PDF generation directly into stakeholder dashboard.",
      requestor: "Priya Sharma",
      requestorEmail: "priya.sharma@apex.io",
      requestDate: "2026-07-25",
      status: "draft",
      priority: "low",
      impactAreas: ["scope", "cost", "risk"],
      costImpactDelta: 12000,
      scheduleImpactDays: 8,
      scopeImpactDescription: "Adds Stripe webhooks, invoice generation queue, and billing settings tab.",
      justification: "Client request from recent steering committee review.",
      proposedSolution: "De-prioritize non-critical reporting export widgets to offset scope creep."
    }
  ],
  boardCategories: [
    {
      id: "cat-1",
      projectId: "proj-1",
      name: "Architecture & Specs",
      description: "Technical design blueprints, DB schemas, and system specs",
      color: "indigo"
    },
    {
      id: "cat-2",
      projectId: "proj-1",
      name: "Design & UX Assets",
      description: "Figma wireframes, UI kits, and design system tokens",
      color: "purple"
    },
    {
      id: "cat-3",
      projectId: "proj-1",
      name: "Dev Links & Environments",
      description: "Grafana dashboards, API endpoints, and staging links",
      color: "teal"
    },
    {
      id: "cat-4",
      projectId: "proj-1",
      name: "Onboarding & Guidelines",
      description: "Developer setup guides, coding standards, and RACI rules",
      color: "amber"
    }
  ],
  boardItems: [
    {
      id: "board-item-1",
      projectId: "proj-1",
      categoryId: "cat-1",
      type: "note",
      title: "Real-Time WebSocket & EVM Calculation Engine Spec",
      content: `<h2 style="color: #818cf8; font-size: 18px; font-weight: 700; margin-bottom: 8px;">System Architecture Summary</h2>
<p style="color: #cbd5e1; line-height: 1.6;">The <strong>Apex PM Platform</strong> utilizes a server-authoritative Earned Value Management (EVM) calculation engine. All task status changes trigger an instant recalculation of <em>Planned Value (PV)</em>, <em>Earned Value (EV)</em>, and <em>Actual Cost (AC)</em>.</p>
<hr style="border-color: #334155; margin: 12px 0;" />
<h3 style="color: #94a3b8; font-size: 14px; font-weight: 600; margin-bottom: 6px;">Key Calculation Rules:</h3>
<ul style="color: #cbd5e1; padding-left: 20px; list-style-type: disc;">
  <li><strong>PV (Planned Value):</strong> Baseline budget &times; Scheduled Completion %</li>
  <li><strong>EV (Earned Value):</strong> Baseline budget &times; Actual Completion %</li>
  <li><strong>AC (Actual Cost):</strong> Sum of logged stakeholder labor costs and overhead.</li>
</ul>
<pre style="background: #0f172a; padding: 12px; border-radius: 8px; font-family: monospace; color: #38bdf8; margin-top: 10px; border: 1px solid #1e293b;">
// Example EVM formulas in TypeScript
const SPI = EV / PV;
const CPI = EV / AC;
const EAC = BAC / CPI;
</pre>`,
      tags: ["Architecture", "EVM", "Specs"],
      color: "indigo",
      createdBy: "user-pm-1",
      createdByName: "Alex Morgan",
      createdByEmail: "alex.m@apex.io",
      createdAt: "2026-07-10T10:00:00Z",
      updatedAt: "2026-07-28T14:30:00Z",
      isPinned: true,
      comments: [
        {
          id: "cmt-101",
          itemId: "board-item-1",
          userId: "user-sh-2",
          userName: "Dr. Elena Rostova",
          userEmail: "elena.r@apex.io",
          userAvatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150",
          userRole: "Principal Architect",
          content: "I reviewed the EVM calculation formulas. Looks solid! Make sure we cache EAC calculations for large projects with >500 tasks.",
          createdAt: "2026-07-28T15:10:00Z",
          reactions: { "👍": ["Alex Morgan", "Marcus Vance"], "💡": ["Priya Sharma"] }
        },
        {
          id: "cmt-102",
          itemId: "board-item-1",
          userId: "user-sh-3",
          userName: "Marcus Vance",
          userEmail: "marcus.v@apex.io",
          userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
          userRole: "Senior Engineer",
          content: "Added unit test coverage for SPI/CPI edge cases when actual cost (AC) is zero.",
          createdAt: "2026-07-28T16:45:00Z",
          reactions: { "🚀": ["Alex Morgan"] }
        }
      ]
    },
    {
      id: "board-item-2",
      projectId: "proj-1",
      categoryId: "cat-2",
      type: "link",
      title: "Figma UI Kit & Dark Luxury Design System",
      content: "Official Figma board containing high-fidelity desktop and tablet screens, color tokens, and Gantt chart drag-and-drop interactions.",
      url: "https://figma.com/file/apex-pm-v2-design-system",
      tags: ["Figma", "Design", "UI"],
      color: "purple",
      createdBy: "user-sh-4",
      createdByName: "Priya Sharma",
      createdByEmail: "priya.s@apex.io",
      createdAt: "2026-07-12T11:20:00Z",
      updatedAt: "2026-07-12T11:20:00Z",
      isPinned: true,
      comments: [
        {
          id: "cmt-103",
          itemId: "board-item-2",
          userId: "user-pm-1",
          userName: "Alex Morgan",
          userEmail: "alex.m@apex.io",
          userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
          userRole: "Project Manager",
          content: "Please ensure contrast ratios pass WCAG AA standards for the Gantt chart status badges.",
          createdAt: "2026-07-13T09:00:00Z",
          reactions: { "👍": ["Priya Sharma"] }
        }
      ]
    },
    {
      id: "board-item-3",
      projectId: "proj-1",
      categoryId: "cat-3",
      type: "link",
      title: "Grafana Production Telemetry & Latency Dashboard",
      content: "Real-time Grafana dashboard monitoring WebSocket packet throughput, database IOPS, and API latency metrics across US-East and EU-West regions.",
      url: "https://grafana.apex.io/d/evm-realtime-metrics",
      tags: ["Monitoring", "Grafana", "DevOps"],
      color: "teal",
      createdBy: "user-sh-5",
      createdByName: "David Chen",
      createdByEmail: "david.c@apex.io",
      createdAt: "2026-07-15T09:15:00Z",
      updatedAt: "2026-07-20T16:00:00Z"
    },
    {
      id: "board-item-4",
      projectId: "proj-1",
      categoryId: "cat-1",
      type: "file",
      title: "Apex_Platform_Technical_Specification_v2.4.pdf",
      content: "Comprehensive engineering blueprint describing RACI matrix propagation, change management workflows, and audit logging structures.",
      fileName: "Apex_Platform_Technical_Specification_v2.4.pdf",
      fileSize: "4.8 MB",
      fileType: "PDF",
      url: "https://assets.apex.io/docs/Apex_Platform_Technical_Specification_v2.4.pdf",
      tags: ["PDF", "Blueprint", "Spec"],
      color: "slate",
      createdBy: "user-sh-2",
      createdByName: "Dr. Elena Rostova",
      createdByEmail: "elena.r@apex.io",
      createdAt: "2026-07-18T14:45:00Z",
      updatedAt: "2026-07-18T14:45:00Z"
    },
    {
      id: "board-item-5",
      projectId: "proj-1",
      categoryId: "cat-4",
      type: "note",
      title: "Team Onboarding & Coding Standards Checklist",
      content: `<h3 style="color: #f59e0b; font-size: 16px; font-weight: 600;">Quick Start Guide for New Engineers</h3>
<p style="color: #cbd5e1; line-height: 1.6;">Welcome to the Apex PM core development team! Before submitting pull requests, please complete these steps:</p>
<ol style="color: #cbd5e1; padding-left: 20px; margin-top: 8px;">
  <li>Clone repository & copy <code>.env.example</code> to <code>.env</code>.</li>
  <li>Run <code>npm install</code> and verify linting with <code>npm run lint</code>.</li>
  <li>Ensure all new state methods in <code>ProjectContext</code> update audit trails.</li>
</ol>
<div style="background: rgba(245, 158, 11, 0.1); padding: 10px; border-left: 3px solid #f59e0b; border-radius: 6px; margin-top: 12px; color: #fde68a;">
  <strong>Note:</strong> Always link work items to relevant epics and RACI stakeholders before marking tasks complete.
</div>`,
      tags: ["Onboarding", "Standards", "Process"],
      color: "amber",
      createdBy: "user-sh-3",
      createdByName: "Marcus Vance",
      createdByEmail: "marcus.v@apex.io",
      createdAt: "2026-07-22T08:30:00Z",
      updatedAt: "2026-07-22T08:30:00Z"
    }
  ],
  boardMessages: [
    {
      id: "msg-101",
      projectId: "proj-1",
      userId: "user-pm-1",
      userName: "Alex Morgan",
      userEmail: "alex.m@apex.io",
      userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
      userRole: "Project Manager",
      content: "📢 Welcome to the Project Board & Team Discussion Hub! Feel free to add technical notes, Figma links, or spec PDFs and ask questions directly on cards or right here in chat.",
      createdAt: "2026-07-28T10:00:00Z",
      type: "announcement",
      isPinned: true,
      reactions: { "🚀": ["Marcus Vance", "Dr. Elena Rostova", "Priya Sharma"], "👍": ["David Chen"] }
    },
    {
      id: "msg-102",
      projectId: "proj-1",
      userId: "user-sh-3",
      userName: "Marcus Vance",
      userEmail: "marcus.v@apex.io",
      userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
      userRole: "Senior Engineer",
      content: "Hey team! I updated the WebSocket & EVM Calculation Note on the board with unit testing formulas. Let me know if you need edge case coverage.",
      createdAt: "2026-07-28T14:35:00Z",
      type: "item_reference",
      linkedItemId: "board-item-1",
      linkedItemTitle: "Real-Time WebSocket & EVM Calculation Engine Spec",
      reactions: { "👍": ["Alex Morgan", "Dr. Elena Rostova"] }
    },
    {
      id: "msg-103",
      projectId: "proj-1",
      userId: "user-sh-2",
      userName: "Dr. Elena Rostova",
      userEmail: "elena.r@apex.io",
      userAvatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150",
      userRole: "Principal Architect",
      content: "Are we confirming the Sprint 3 Architecture Review for Thursday 2:00 PM EST?",
      createdAt: "2026-07-29T09:15:00Z",
      type: "question",
      reactions: { "❓": ["David Chen"] }
    },
    {
      id: "msg-104",
      projectId: "proj-1",
      userId: "user-pm-1",
      userName: "Alex Morgan",
      userEmail: "alex.m@apex.io",
      userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
      userRole: "Project Manager",
      content: "Yes, Thursday 2:00 PM EST confirmed! I've added the calendar invite link to the Dev Links category.",
      createdAt: "2026-07-29T09:20:00Z",
      type: "chat",
      reactions: { "🎉": ["Dr. Elena Rostova", "Priya Sharma"] }
    }
  ]
};

export const project2Data: ProjectData = {
  id: "proj-2",
  projectName: "NextGen Mobile App Suite",
  projectCode: "MOB-2026",
  description: "Cross-platform iOS and Android mobile app for field operations, real-time telemetry, and mobile stakeholder updates.",
  startDate: "2026-07-01",
  targetEndDate: "2026-12-15",
  budget: 180000,
  stakeholders: [...initialProjectData.stakeholders],
  epics: [],
  features: [
    {
      id: "feat-m1",
      title: "Mobile Offline Sync & Local Cache",
      description: "SQLite offline caching and background queue synchronization.",
      status: "in_progress",
      priority: "high",
      targetReleaseDate: "2026-08-30",
      color: "#3b82f6"
    },
    {
      id: "feat-m2",
      title: "Biometric Auth & Push Notifications",
      description: "FaceID/TouchID security and real-time push alert dispatcher.",
      status: "backlog",
      priority: "normal",
      targetReleaseDate: "2026-10-15",
      color: "#10b981"
    }
  ],
  userStories: [],
  milestones: [
    {
      id: "m-m1",
      title: "M1: iOS & Android Beta Build",
      description: "Core mobile navigation and task mapping views available on TestFlight.",
      dueDate: "2026-09-01",
      status: "in_progress",
      baselineCost: 50000,
      actualCost: 32000
    }
  ],
  tasks: [
    {
      id: "task-m201",
      title: "Develop React Native Navigation Shell",
      description: "Setup bottom bar navigation and biometric security hook.",
      status: "done",
      priority: "high",
      assigneeIds: ["sh-3", "sh-4"],
      startDate: "2026-07-01",
      dueDate: "2026-07-20",
      estimatedHours: 40,
      actualHours: 38,
      plannedCost: 4400,
      actualCost: 4180,
      completionPercent: 100,
      dependencies: [],
      tags: ["Mobile", "React Native"]
    },
    {
      id: "task-m202",
      title: "Implement Field Task Progress Update Interface",
      description: "Touch-optimized task status toggle, voice notes, and photo uploads.",
      status: "in_progress",
      priority: "urgent",
      assigneeIds: ["sh-3", "sh-1"],
      startDate: "2026-07-21",
      dueDate: "2026-08-15",
      estimatedHours: 50,
      actualHours: 20,
      plannedCost: 5500,
      actualCost: 2200,
      completionPercent: 45,
      dependencies: ["task-m201:FS"],
      tags: ["UI", "Mobile"]
    }
  ],
  subtasks: [
    { id: "sub-m1", taskId: "task-m201", title: "Setup Navigation Container", completed: true, estimatedHours: 10, actualHours: 8 },
    { id: "sub-m2", taskId: "task-m202", title: "Quick Status Slider Component", completed: true, estimatedHours: 15, actualHours: 12 }
  ],
  raidItems: [
    {
      id: "raid-m1",
      type: "risk",
      title: "App Store Review delays for biometric authentication API",
      description: "Apple submission guidelines require explicit privacy manifest for FaceID usage.",
      ownerId: "sh-1",
      status: "monitoring",
      probability: "high",
      impact: "high",
      riskScore: 12,
      mitigationStrategy: "Submit early TestFlight build for preliminary Apple App Review.",
      severity: "high",
      targetResolutionDate: "2026-08-25"
    }
  ],
  activities: [
    {
      id: "act-m1",
      timestamp: "2026-07-25T01:00:00Z",
      user: "Marcus Vance",
      action: "Completed Task",
      details: "Finished 'Develop React Native Navigation Shell'"
    }
  ],
  widgets: initialProjectData.widgets
};

export const project3Data: ProjectData = {
  id: "proj-3",
  projectName: "Global AI Data Pipeline Engine",
  projectCode: "PIPE-2026",
  description: "High-throughput streaming analytics pipeline integrating Gemini AI models, vector search, and real-time EVM anomaly detection.",
  startDate: "2026-05-15",
  targetEndDate: "2026-10-31",
  budget: 320000,
  stakeholders: [...initialProjectData.stakeholders],
  epics: [],
  features: [
    {
      id: "feat-p1",
      title: "Vector Search & Embeddings Engine",
      description: "High performance semantic vector search pipeline.",
      status: "completed",
      priority: "urgent",
      targetReleaseDate: "2026-07-01",
      color: "#8b5cf6"
    }
  ],
  userStories: [],
  milestones: [
    {
      id: "m-p1",
      title: "M1: 100k Events/Sec Benchmark Achieved",
      description: "Streaming ingest throughput validated.",
      dueDate: "2026-07-15",
      status: "achieved",
      baselineCost: 80000,
      actualCost: 75000
    }
  ],
  tasks: [
    {
      id: "task-p301",
      title: "Implement Kafka / PubSub Ingestion Cluster",
      description: "Deploy fault-tolerant message streaming brokers.",
      status: "done",
      priority: "urgent",
      assigneeIds: ["sh-2", "sh-5"],
      startDate: "2026-05-15",
      dueDate: "2026-06-30",
      estimatedHours: 80,
      actualHours: 82,
      plannedCost: 10400,
      actualCost: 10660,
      completionPercent: 100,
      dependencies: [],
      tags: ["Data", "Pipeline"]
    },
    {
      id: "task-p302",
      title: "Gemini Real-Time Anomaly Predictor Endpoint",
      description: "Stream tasks and cost spikes into Gemini for proactive risk scoring.",
      status: "in_progress",
      priority: "urgent",
      assigneeIds: ["sh-2", "sh-3"],
      startDate: "2026-07-01",
      dueDate: "2026-08-15",
      estimatedHours: 70,
      actualHours: 40,
      plannedCost: 8400,
      actualCost: 4800,
      completionPercent: 70,
      dependencies: ["task-p301:FS"],
      tags: ["AI", "Gemini", "Streaming"]
    }
  ],
  subtasks: [],
  raidItems: [],
  activities: [],
  widgets: initialProjectData.widgets
};

export const defaultProjectsMap: Record<string, ProjectData> = {
  "proj-1": initialProjectData,
  "proj-2": project2Data,
  "proj-3": project3Data
};
