import { ProjectData, Task, Subtask, Feature, Epic, Milestone, RaidItem, TaskStatus, Priority, FeatureStatus, EpicStatus, MilestoneStatus, RaidType, RaidSeverity } from '../types';

export interface CsvImportResult {
  parsedData: {
    milestones: Milestone[];
    epics: Epic[];
    features: Feature[];
    tasks: Task[];
    subtasks: Subtask[];
    raidItems: RaidItem[];
  };
  stats: {
    milestonesCount: number;
    epicsCount: number;
    featuresCount: number;
    tasksCount: number;
    subtasksCount: number;
    raidCount: number;
  };
  warnings: string[];
}

/**
 * Escapes a cell value for CSV output
 */
function escapeCsvCell(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates a clean, fully populated sample CSV template string
 */
export function generateWbsCsvTemplate(): string {
  const headers = [
    "Type",
    "WBS Code",
    "ID",
    "Title",
    "Description",
    "Milestone Title/ID",
    "Epic Title/ID",
    "Feature Title/ID",
    "Parent Task ID",
    "Status",
    "Priority",
    "Assignee Emails",
    "Start Date",
    "Due Date",
    "Estimated Hours",
    "Actual Hours",
    "Planned Cost ($)",
    "Actual Cost ($)",
    "Predecessors",
    "Completion %",
    "Tags"
  ];

  const sampleRows = [
    [
      "Milestone", "1.0", "M-1", "Apex Cloud Infrastructure & Portal",
      "Core cloud setup and platform portal baseline", "", "", "", "",
      "in_progress", "high", "alex.m@apex.io", "2026-06-01", "2026-09-30",
      "160", "80", "15000", "7500", "", "50", "Cloud, Baseline"
    ],
    [
      "Epic", "1.1", "EPIC-1", "M2: EVM Dashboard & Gantt Preview",
      "Earned Value Management and interactive Gantt engine", "Apex Cloud Infrastructure & Portal", "", "", "",
      "in_progress", "high", "alex.m@apex.io, marcus.v@apex.io", "2026-07-01", "2026-08-31",
      "120", "60", "12000", "6000", "", "50", "EVM, Gantt"
    ],
    [
      "Feature", "1.1.1", "FEAT-1", "Analytics & EVM Engine",
      "Backend metrics calculator and EVM algorithms", "Apex Cloud Infrastructure & Portal", "M2: EVM Dashboard & Gantt Preview", "", "",
      "in_progress", "high", "marcus.v@apex.io", "2026-07-01", "2026-08-15",
      "80", "40", "8000", "4000", "", "50", "Backend, EVM"
    ],
    [
      "Task", "1.1.1.1", "TASK-101", "EVM & Analytics Dashboard",
      "Build interactive SPI/CPI charts and task EVM widgets", "Apex Cloud Infrastructure & Portal", "M2: EVM Dashboard & Gantt Preview", "Analytics & EVM Engine", "",
      "in_progress", "high", "alex.m@apex.io, marcus.v@apex.io", "2026-08-01", "2026-08-05",
      "40", "25", "3720", "2325", "", "40", "Dashboard, React"
    ],
    [
      "Subtask", "1.1.1.1.1", "SUB-1", "SPI & CPI Formula Engine",
      "Verify math logic for EVM metrics calculation", "", "", "", "TASK-101",
      "done", "normal", "marcus.v@apex.io", "2026-08-01", "2026-08-02",
      "10", "10", "1000", "1000", "", "100", "Math, EVM"
    ],
    [
      "Task", "1.1.1.2", "TASK-102", "Gantt Interactivity & Lead Time Linker",
      "Implement drag-drop Gantt bars and predecessor link renderer", "Apex Cloud Infrastructure & Portal", "M2: EVM Dashboard & Gantt Preview", "Analytics & EVM Engine", "",
      "todo", "normal", "priya.s@apex.io", "2026-08-06", "2026-08-12",
      "32", "0", "3000", "0", "TASK-101:FS", "0", "Gantt, UI"
    ],
    [
      "RaidItem", "", "RAID-1", "Cloud API Rate Limit Risk",
      "Potential throttling during burst load syncs under heavy multi-user edit cycles", "", "", "", "TASK-101",
      "identified", "high", "david.c@apex.io", "2026-08-01", "2026-08-30",
      "0", "0", "0", "0", "", "0", "Risk, Infrastructure"
    ]
  ];

  const lines = [
    headers.map(h => escapeCsvCell(h)).join(','),
    ...sampleRows.map(row => row.map(cell => escapeCsvCell(cell)).join(','))
  ];

  return lines.join('\n');
}

/**
 * Exports current project data into CSV string format matching the template structure
 */
export function exportProjectToCsv(projectData: ProjectData): string {
  const headers = [
    "Type",
    "WBS Code",
    "ID",
    "Title",
    "Description",
    "Milestone Title/ID",
    "Epic Title/ID",
    "Feature Title/ID",
    "Parent Task ID",
    "Status",
    "Priority",
    "Assignee Emails",
    "Start Date",
    "Due Date",
    "Estimated Hours",
    "Actual Hours",
    "Planned Cost ($)",
    "Actual Cost ($)",
    "Predecessors",
    "Completion %",
    "Tags"
  ];

  const rows: string[][] = [];

  // Map user ID to email or name helper
  const userMap = new Map<string, string>();
  (projectData.stakeholders || []).forEach(s => {
    userMap.set(s.id, s.email || s.name);
  });

  // Map IDs to titles
  const milestoneTitleMap = new Map<string, string>();
  (projectData.milestones || []).forEach(m => milestoneTitleMap.set(m.id, m.title));

  const epicTitleMap = new Map<string, string>();
  (projectData.epics || []).forEach(e => epicTitleMap.set(e.id, e.title));

  const featureTitleMap = new Map<string, string>();
  (projectData.features || []).forEach(f => featureTitleMap.set(f.id, f.title));

  // 1. Milestones
  (projectData.milestones || []).forEach((m, idx) => {
    rows.push([
      "Milestone",
      `${idx + 1}.0`,
      m.id,
      m.title,
      m.description || "",
      "",
      epicTitleMap.get(m.epicId || '') || "",
      featureTitleMap.get(m.featureId || '') || "",
      "",
      m.status,
      "normal",
      "",
      "",
      m.dueDate || "",
      "0",
      "0",
      String(m.baselineCost || 0),
      String(m.actualCost || 0),
      "",
      m.status === 'achieved' ? "100" : "0",
      "Milestone"
    ]);
  });

  // 2. Epics
  (projectData.epics || []).forEach((e, idx) => {
    rows.push([
      "Epic",
      `1.${idx + 1}`,
      e.id,
      e.title,
      e.description || "",
      milestoneTitleMap.get(e.milestoneId || '') || "",
      "",
      "",
      "",
      e.status,
      "normal",
      "",
      "",
      "",
      "0",
      "0",
      "0",
      "0",
      "",
      e.status === 'completed' ? "100" : "50",
      "Epic"
    ]);
  });

  // 3. Features
  (projectData.features || []).forEach((f, idx) => {
    rows.push([
      "Feature",
      `1.1.${idx + 1}`,
      f.id,
      f.title,
      f.description || "",
      milestoneTitleMap.get(f.milestoneId || '') || "",
      epicTitleMap.get(f.epicId || '') || "",
      "",
      "",
      f.status,
      f.priority || "normal",
      "",
      "",
      f.targetReleaseDate || "",
      "0",
      "0",
      "0",
      "0",
      "",
      f.status === 'completed' ? "100" : "50",
      "Feature"
    ]);
  });

  // 4. Tasks & Bugs
  (projectData.tasks || []).forEach((t, idx) => {
    const assigneeEmails = (t.assigneeIds || [])
      .map(id => userMap.get(id) || id)
      .join(', ');

    const preds = (t.dependencies || []).join(', ');

    rows.push([
      t.type === 'bug' ? "Bug" : "Task",
      `1.1.1.${idx + 1}`,
      t.id,
      t.title,
      t.description || "",
      milestoneTitleMap.get(t.milestoneId || '') || "",
      epicTitleMap.get(t.epicId || '') || "",
      featureTitleMap.get(t.featureId || '') || "",
      "",
      t.status,
      t.priority || "normal",
      assigneeEmails,
      t.startDate || "",
      t.dueDate || "",
      String(t.estimatedHours || 0),
      String(t.actualHours || 0),
      String(t.plannedCost || 0),
      String(t.actualCost || 0),
      preds,
      String(t.completionPercent || 0),
      (t.tags || []).join(', ')
    ]);
  });

  // 5. Subtasks
  (projectData.subtasks || []).forEach((st, idx) => {
    const assignee = userMap.get(st.assigneeId || '') || st.assigneeId || '';
    rows.push([
      "Subtask",
      `1.1.1.1.${idx + 1}`,
      st.id,
      st.title,
      "",
      "",
      "",
      "",
      st.taskId,
      st.completed ? "done" : "todo",
      "normal",
      assignee,
      "",
      "",
      String(st.estimatedHours || 0),
      String(st.actualHours || 0),
      "0",
      "0",
      "",
      st.completed ? "100" : "0",
      "Subtask"
    ]);
  });

  // 6. RAID Items
  (projectData.raidItems || []).forEach((r) => {
    const owner = userMap.get(r.ownerId || '') || r.ownerId || '';
    rows.push([
      "RaidItem",
      "",
      r.id,
      r.title,
      r.description || "",
      "",
      "",
      "",
      r.linkedTaskId || "",
      r.status,
      r.severity || r.probability || "medium",
      owner,
      "",
      r.targetResolutionDate || "",
      "0",
      "0",
      "0",
      "0",
      "",
      "0",
      r.type
    ]);
  });

  const lines = [
    headers.map(h => escapeCsvCell(h)).join(','),
    ...rows.map(row => row.map(cell => escapeCsvCell(cell)).join(','))
  ];

  return lines.join('\n');
}

/**
 * Robust CSV Line Parser supporting quoted strings, escaped quotes, and newlines
 */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current.trim());
        current = '';
      } else if (char === '\r') {
        // skip CR
      } else if (char === '\n') {
        row.push(current.trim());
        rows.push(row);
        row = [];
        current = '';
      } else {
        current += char;
      }
    }
  }

  if (current || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows.filter(r => r.some(cell => cell.length > 0));
}

/**
 * Normalizes headers to key lookup
 */
function findHeaderIndex(headers: string[], possibleNames: string[]): number {
  const normHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const name of possibleNames) {
    const normName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const idx = normHeaders.indexOf(normName);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Parses a CSV string and constructs project data elements
 */
export function parseAndImportCsv(csvText: string, currentProjectData: ProjectData): CsvImportResult {
  const rawRows = parseCsvRows(csvText);
  const warnings: string[] = [];

  if (rawRows.length < 2) {
    throw new Error('CSV file must contain a header row and at least one data row.');
  }

  const headerRow = rawRows[0];
  const dataRows = rawRows.slice(1);

  // Map header column locations dynamically
  const typeIdx = findHeaderIndex(headerRow, ['Type', 'ItemType', 'WorkItemType', 'Kind']);
  const codeIdx = findHeaderIndex(headerRow, ['WBS Code', 'WbsCode', 'Code', 'WBS', 'WBSNo']);
  const idIdx = findHeaderIndex(headerRow, ['ID', 'TaskId', 'Item ID', 'Key']);
  const titleIdx = findHeaderIndex(headerRow, ['Title', 'Name', 'Task Name', 'Summary']);
  const descIdx = findHeaderIndex(headerRow, ['Description', 'Notes', 'Details', 'Desc']);
  const milestoneIdx = findHeaderIndex(headerRow, ['Milestone Title/ID', 'Milestone', 'Milestone ID', 'Milestone Title']);
  const epicIdx = findHeaderIndex(headerRow, ['Epic Title/ID', 'Epic', 'Epic ID', 'Epic Title']);
  const featureIdx = findHeaderIndex(headerRow, ['Feature Title/ID', 'Feature', 'Feature ID', 'Feature Title']);
  const parentTaskIdx = findHeaderIndex(headerRow, ['Parent Task ID', 'Parent Task', 'ParentID', 'Parent']);
  const statusIdx = findHeaderIndex(headerRow, ['Status', 'TaskStatus', 'State']);
  const priorityIdx = findHeaderIndex(headerRow, ['Priority', 'Severity']);
  const assigneesIdx = findHeaderIndex(headerRow, ['Assignee Emails', 'Assignees', 'Assignee', 'Owner', 'Assigned To']);
  const startDateIdx = findHeaderIndex(headerRow, ['Start Date', 'StartDate', 'Start']);
  const dueDateIdx = findHeaderIndex(headerRow, ['Due Date', 'DueDate', 'End Date', 'Target Date']);
  const estHoursIdx = findHeaderIndex(headerRow, ['Estimated Hours', 'EstimatedHours', 'Est Hours', 'Estimate']);
  const actHoursIdx = findHeaderIndex(headerRow, ['Actual Hours', 'ActualHours', 'Act Hours']);
  const planCostIdx = findHeaderIndex(headerRow, ['Planned Cost ($)', 'Planned Cost', 'PlannedCost', 'Budget']);
  const actCostIdx = findHeaderIndex(headerRow, ['Actual Cost ($)', 'Actual Cost', 'ActualCost']);
  const predsIdx = findHeaderIndex(headerRow, ['Predecessors', 'Dependencies', 'Depends On']);
  const pctIdx = findHeaderIndex(headerRow, ['Completion %', 'CompletionPercent', 'Progress', '% Complete']);
  const tagsIdx = findHeaderIndex(headerRow, ['Tags', 'Categories', 'Labels']);

  if (titleIdx === -1) {
    throw new Error('CSV file is missing a required "Title" or "Name" column.');
  }

  const milestones: Milestone[] = [];
  const epics: Epic[] = [];
  const features: Feature[] = [];
  const tasks: Task[] = [];
  const subtasks: Subtask[] = [];
  const raidItems: RaidItem[] = [];

  // User resolution maps
  const userMapByEmail = new Map<string, string>();
  (currentProjectData.stakeholders || []).forEach(s => {
    if (s.email) userMapByEmail.set(s.email.toLowerCase(), s.id);
    userMapByEmail.set(s.name.toLowerCase(), s.id);
  });

  const milestoneMap = new Map<string, string>(); // Title/ID -> ID
  const epicMap = new Map<string, string>();      // Title/ID -> ID
  const featureMap = new Map<string, string>();   // Title/ID -> ID
  const taskMap = new Map<string, string>();      // Title/ID/Code -> ID

  // Helper for safe row string cell
  const getCell = (row: string[], idx: number): string => {
    if (idx === -1 || idx >= row.length) return '';
    return (row[idx] || '').trim();
  };

  const todayStr = new Date().toISOString().split('T')[0];

  dataRows.forEach((row, rowNum) => {
    const rawType = getCell(row, typeIdx).toLowerCase();
    const title = getCell(row, titleIdx);
    if (!title) return; // skip blank rows

    const code = getCell(row, codeIdx);
    const customId = getCell(row, idIdx);
    const desc = getCell(row, descIdx);
    const msRef = getCell(row, milestoneIdx);
    const epicRef = getCell(row, epicIdx);
    const featRef = getCell(row, featureIdx);
    const parentTaskRef = getCell(row, parentTaskIdx);
    const rawStatus = getCell(row, statusIdx).toLowerCase();
    const rawPriority = getCell(row, priorityIdx).toLowerCase();
    const rawAssignees = getCell(row, assigneesIdx);
    const startDate = getCell(row, startDateIdx) || todayStr;
    const dueDate = getCell(row, dueDateIdx) || startDate;
    const estHours = parseFloat(getCell(row, estHoursIdx)) || 0;
    const actHours = parseFloat(getCell(row, actHoursIdx)) || 0;
    const planCost = parseFloat(getCell(row, planCostIdx)) || (estHours * 75);
    const actCost = parseFloat(getCell(row, actCostIdx)) || (actHours * 75);
    const rawPreds = getCell(row, predsIdx);
    const rawPct = parseFloat(getCell(row, pctIdx));
    const rawTags = getCell(row, tagsIdx);

    const tags = rawTags ? rawTags.split(',').map(t => t.trim()).filter(Boolean) : [];

    // Parse Assignees
    const assigneeIds: string[] = [];
    if (rawAssignees) {
      const parts = rawAssignees.split(/[,;]/).map(p => p.trim()).filter(Boolean);
      parts.forEach(p => {
        const foundId = userMapByEmail.get(p.toLowerCase());
        if (foundId) {
          assigneeIds.push(foundId);
        } else if (currentProjectData.stakeholders?.[0]) {
          // Default to first stakeholder if unknown
          assigneeIds.push(currentProjectData.stakeholders[0].id);
        }
      });
    }
    if (assigneeIds.length === 0 && currentProjectData.stakeholders?.[0]) {
      assigneeIds.push(currentProjectData.stakeholders[0].id);
    }

    // Determine Type
    let itemType = 'task';
    if (rawType.includes('milestone')) itemType = 'milestone';
    else if (rawType.includes('epic')) itemType = 'epic';
    else if (rawType.includes('feature')) itemType = 'feature';
    else if (rawType.includes('sub')) itemType = 'subtask';
    else if (rawType.includes('raid') || rawType.includes('risk') || rawType.includes('issue')) itemType = 'raid';
    else if (rawType.includes('bug')) itemType = 'bug';

    // 1. Milestone
    if (itemType === 'milestone') {
      const mId = customId || `m-${Date.now()}-${milestones.length + 1}`;
      let mStatus: MilestoneStatus = 'in_progress';
      if (rawStatus.includes('achiev') || rawStatus.includes('done')) mStatus = 'achieved';
      else if (rawStatus.includes('delay')) mStatus = 'delayed';

      const ms: Milestone = {
        id: mId,
        title,
        description: desc,
        dueDate,
        status: mStatus,
        baselineCost: planCost,
        actualCost: actCost
      };
      milestones.push(ms);
      milestoneMap.set(title.toLowerCase(), mId);
      milestoneMap.set(mId.toLowerCase(), mId);
      if (code) milestoneMap.set(code.toLowerCase(), mId);
      return;
    }

    // 2. Epic
    if (itemType === 'epic') {
      const eId = customId || `epic-${Date.now()}-${epics.length + 1}`;
      let eStatus: EpicStatus = 'in_progress';
      if (rawStatus.includes('completed') || rawStatus.includes('done')) eStatus = 'completed';
      else if (rawStatus.includes('backlog')) eStatus = 'backlog';

      const ep: Epic = {
        id: eId,
        title,
        description: desc,
        milestoneId: milestoneMap.get(msRef.toLowerCase()),
        status: eStatus
      };
      epics.push(ep);
      epicMap.set(title.toLowerCase(), eId);
      epicMap.set(eId.toLowerCase(), eId);
      if (code) epicMap.set(code.toLowerCase(), eId);
      return;
    }

    // 3. Feature
    if (itemType === 'feature') {
      const fId = customId || `feat-${Date.now()}-${features.length + 1}`;
      let fStatus: FeatureStatus = 'in_progress';
      if (rawStatus.includes('completed') || rawStatus.includes('done')) fStatus = 'completed';

      let priority: Priority = 'normal';
      if (rawPriority.includes('urg')) priority = 'urgent';
      else if (rawPriority.includes('high')) priority = 'high';
      else if (rawPriority.includes('low')) priority = 'low';

      const ft: Feature = {
        id: fId,
        title,
        description: desc,
        epicId: epicMap.get(epicRef.toLowerCase()),
        milestoneId: milestoneMap.get(msRef.toLowerCase()),
        status: fStatus,
        priority,
        targetReleaseDate: dueDate,
        color: '#6366f1'
      };
      features.push(ft);
      featureMap.set(title.toLowerCase(), fId);
      featureMap.set(fId.toLowerCase(), fId);
      if (code) featureMap.set(code.toLowerCase(), fId);
      return;
    }

    // 4. Subtask
    if (itemType === 'subtask') {
      const stId = customId || `sub-${Date.now()}-${subtasks.length + 1}`;
      const parentTaskId = taskMap.get(parentTaskRef.toLowerCase()) || parentTaskRef || 'task-1';
      const st: Subtask = {
        id: stId,
        taskId: parentTaskId,
        title,
        completed: rawStatus.includes('done') || rawStatus.includes('comp') || rawPct === 100,
        assigneeId: assigneeIds[0],
        estimatedHours: estHours,
        actualHours: actHours
      };
      subtasks.push(st);
      return;
    }

    // 5. Raid Item
    if (itemType === 'raid') {
      const rId = customId || `raid-${Date.now()}-${raidItems.length + 1}`;
      let rType: RaidType = 'risk';
      if (rawType.includes('issue')) rType = 'issue';
      else if (rawType.includes('assumption')) rType = 'assumption';
      else if (rawType.includes('dependency')) rType = 'dependency';

      let severity: RaidSeverity = 'medium';
      if (rawPriority.includes('high') || rawPriority.includes('urg')) severity = 'high';
      else if (rawPriority.includes('crit')) severity = 'critical';
      else if (rawPriority.includes('low')) severity = 'low';

      const ri: RaidItem = {
        id: rId,
        type: rType,
        title,
        description: desc,
        ownerId: assigneeIds[0] || 'user-pm-1',
        status: rawStatus || 'identified',
        probability: severity,
        impact: severity,
        riskScore: severity === 'critical' ? 16 : severity === 'high' ? 12 : 6,
        targetResolutionDate: dueDate,
        linkedTaskId: taskMap.get(parentTaskRef.toLowerCase())
      };
      raidItems.push(ri);
      return;
    }

    // 6. Task or Bug (Default)
    const tId = customId || `task-${Date.now()}-${tasks.length + 1}`;
    let taskStatus: TaskStatus = 'todo';
    if (rawStatus.includes('progress')) taskStatus = 'in_progress';
    else if (rawStatus.includes('demo')) taskStatus = 'demoable';
    else if (rawStatus.includes('review') || rawStatus.includes('test')) taskStatus = 'review';
    else if (rawStatus.includes('hold')) taskStatus = 'on_hold';
    else if (rawStatus.includes('block')) taskStatus = 'blocked';
    else if (rawStatus.includes('done') || rawStatus.includes('comp')) taskStatus = 'done';

    let priority: Priority = 'normal';
    if (rawPriority.includes('urg')) priority = 'urgent';
    else if (rawPriority.includes('high')) priority = 'high';
    else if (rawPriority.includes('low')) priority = 'low';

    // Completion percentage
    let compPercent = isNaN(rawPct) ? 0 : rawPct;
    if (taskStatus === 'done' && compPercent === 0) compPercent = 100;

    // Resolve dependencies
    const parsedDependencies: string[] = [];
    if (rawPreds) {
      const pTokens = rawPreds.split(/[,;]/).map(p => p.trim()).filter(Boolean);
      pTokens.forEach(pt => {
        // Can be "TASK-100:FS" or "TASK-100"
        const cleanPt = pt.split(':')[0].trim().toLowerCase();
        const foundTaskId = taskMap.get(cleanPt);
        if (foundTaskId) {
          parsedDependencies.push(pt);
        } else {
          parsedDependencies.push(pt); // keep original token
        }
      });
    }

    const t: Task = {
      id: tId,
      type: itemType === 'bug' ? 'bug' : 'task',
      title,
      description: desc,
      milestoneId: milestoneMap.get(msRef.toLowerCase()),
      epicId: epicMap.get(epicRef.toLowerCase()),
      featureId: featureMap.get(featRef.toLowerCase()),
      status: taskStatus,
      priority,
      assigneeIds,
      startDate,
      dueDate,
      estimatedHours: estHours,
      actualHours: actHours,
      plannedCost: planCost,
      actualCost: actCost,
      completionPercent: compPercent,
      dependencies: parsedDependencies,
      tags
    };

    tasks.push(t);
    taskMap.set(title.toLowerCase(), tId);
    taskMap.set(tId.toLowerCase(), tId);
    if (code) taskMap.set(code.toLowerCase(), tId);
  });

  return {
    parsedData: {
      milestones,
      epics,
      features,
      tasks,
      subtasks,
      raidItems
    },
    stats: {
      milestonesCount: milestones.length,
      epicsCount: epics.length,
      featuresCount: features.length,
      tasksCount: tasks.length,
      subtasksCount: subtasks.length,
      raidCount: raidItems.length
    },
    warnings
  };
}
