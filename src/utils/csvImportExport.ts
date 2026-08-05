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
    "Start Date",
    "Due Date",
    "Estimated Hours",
    "Planned Cost ($)",
    "Tags"
  ];

  const sampleRows = [
    [
      "Milestone", "1.0", "M-1", "Apex Cloud Infrastructure & Portal",
      "Core cloud setup and platform portal baseline", "", "", "",
      "2026-06-01", "2026-09-30", "160", "15000", "Cloud, Baseline"
    ],
    [
      "Epic", "1.1", "EPIC-1", "M2: EVM Dashboard & Gantt Preview",
      "Earned Value Management and interactive Gantt engine", "Apex Cloud Infrastructure & Portal", "", "",
      "2026-07-01", "2026-08-31", "120", "12000", "EVM, Gantt"
    ],
    [
      "Feature", "1.1.1", "FEAT-1", "Analytics & EVM Engine",
      "Backend metrics calculator and EVM algorithms", "Apex Cloud Infrastructure & Portal", "M2: EVM Dashboard & Gantt Preview", "",
      "2026-07-01", "2026-08-15", "80", "8000", "Backend, EVM"
    ],
    [
      "Task", "1.1.1.1", "TASK-101", "EVM & Analytics Dashboard",
      "Build interactive SPI/CPI charts and task EVM widgets", "Apex Cloud Infrastructure & Portal", "M2: EVM Dashboard & Gantt Preview", "Analytics & EVM Engine",
      "2026-08-01", "2026-08-05", "40", "3720", "Dashboard, React"
    ],
    [
      "Subtask", "1.1.1.1.1", "SUB-1", "SPI & CPI Formula Engine",
      "Verify math logic for EVM metrics calculation", "", "", "",
      "2026-08-01", "2026-08-02", "10", "1000", "Math, EVM"
    ],
    [
      "Task", "1.1.1.2", "TASK-102", "Gantt Interactivity & Lead Time Linker",
      "Implement drag-drop Gantt bars and predecessor link renderer", "Apex Cloud Infrastructure & Portal", "M2: EVM Dashboard & Gantt Preview", "Analytics & EVM Engine",
      "2026-08-06", "2026-08-12", "32", "3000", ""
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
    "Start Date",
    "Due Date",
    "Estimated Hours",
    "Planned Cost ($)",
    "Tags"
  ];

  const rows: string[][] = [];

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
      m.dueDate || "",
      "0",
      String(m.baselineCost || 0),
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
      "",
      "0",
      "0",
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
      f.targetReleaseDate || "",
      "0",
      "0",
      "Feature"
    ]);
  });

  // 4. Tasks & Bugs
  (projectData.tasks || []).forEach((t, idx) => {
    rows.push([
      t.type === 'bug' ? "Bug" : "Task",
      `1.1.1.${idx + 1}`,
      t.id,
      t.title,
      t.description || "",
      milestoneTitleMap.get(t.milestoneId || '') || "",
      epicTitleMap.get(t.epicId || '') || "",
      featureTitleMap.get(t.featureId || '') || "",
      t.startDate || "",
      t.dueDate || "",
      String(t.estimatedHours || 0),
      String(t.plannedCost || 0),
      (t.tags || []).join(', ')
    ]);
  });

  // 5. Subtasks
  (projectData.subtasks || []).forEach((st, idx) => {
    rows.push([
      "Subtask",
      `1.1.1.1.${idx + 1}`,
      st.id,
      st.title,
      "",
      "",
      "",
      "",
      "",
      "",
      String(st.estimatedHours || 0),
      "0",
      "Subtask"
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
  const startDateIdx = findHeaderIndex(headerRow, ['Start Date', 'StartDate', 'Start']);
  const dueDateIdx = findHeaderIndex(headerRow, ['Due Date', 'DueDate', 'End Date', 'Target Date']);
  const estHoursIdx = findHeaderIndex(headerRow, ['Estimated Hours', 'EstimatedHours', 'Est Hours', 'Estimate']);
  const planCostIdx = findHeaderIndex(headerRow, ['Planned Cost ($)', 'Planned Cost', 'PlannedCost', 'Budget']);
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

  dataRows.forEach((row) => {
    const rawType = getCell(row, typeIdx).toLowerCase();
    const title = getCell(row, titleIdx);
    if (!title) return; // skip blank rows

    const code = getCell(row, codeIdx);
    const customId = getCell(row, idIdx);
    const desc = getCell(row, descIdx);
    const msRef = getCell(row, milestoneIdx);
    const epicRef = getCell(row, epicIdx);
    const featRef = getCell(row, featureIdx);
    const startDate = getCell(row, startDateIdx) || todayStr;
    const dueDate = getCell(row, dueDateIdx) || startDate;
    const estHours = parseFloat(getCell(row, estHoursIdx)) || 0;
    const planCost = parseFloat(getCell(row, planCostIdx)) || (estHours * 75);
    const rawTags = getCell(row, tagsIdx);

    const tags = rawTags ? rawTags.split(',').map(t => t.trim()).filter(Boolean) : [];

    // Determine Type
    let itemType = 'task';
    if (rawType.includes('milestone')) itemType = 'milestone';
    else if (rawType.includes('epic')) itemType = 'epic';
    else if (rawType.includes('feature')) itemType = 'feature';
    else if (rawType.includes('sub')) itemType = 'subtask';
    else if (rawType.includes('raid') || rawType.includes('risk') || rawType.includes('issue')) itemType = 'raid';
    else if (rawType.includes('bug')) itemType = 'bug';

    // Ignore RAID items as they are excluded from CSV
    if (itemType === 'raid') {
      return;
    }

    // 1. Milestone
    if (itemType === 'milestone') {
      const mId = customId || `m-${Date.now()}-${milestones.length + 1}`;
      const ms: Milestone = {
        id: mId,
        title,
        description: desc,
        dueDate,
        status: 'upcoming',
        baselineCost: planCost,
        actualCost: 0
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
      const ep: Epic = {
        id: eId,
        title,
        description: desc,
        milestoneId: milestoneMap.get(msRef.toLowerCase()),
        status: 'backlog'
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
      const ft: Feature = {
        id: fId,
        title,
        description: desc,
        epicId: epicMap.get(epicRef.toLowerCase()),
        milestoneId: milestoneMap.get(msRef.toLowerCase()),
        status: 'backlog',
        priority: 'normal',
        targetReleaseDate: dueDate,
        color: '#6366f1'
      };
      features.push(ft);
      featureMap.set(title.toLowerCase(), fId);
      featureMap.set(fId.toLowerCase(), fId);
      if (code) featureMap.set(code.toLowerCase(), fId);
      return;
    }

    // 4. Subtask (linked to the last created task)
    if (itemType === 'subtask') {
      const stId = customId || `sub-${Date.now()}-${subtasks.length + 1}`;
      const lastTaskId = tasks.length > 0 ? tasks[tasks.length - 1].id : 'task-1';
      const st: Subtask = {
        id: stId,
        taskId: lastTaskId,
        title,
        completed: false,
        estimatedHours: estHours,
        actualHours: 0
      };
      subtasks.push(st);
      return;
    }

    // 5. Task or Bug (Default)
    const tId = customId || `task-${Date.now()}-${tasks.length + 1}`;
    const t: Task = {
      id: tId,
      type: itemType === 'bug' ? 'bug' : 'task',
      title,
      description: desc,
      milestoneId: milestoneMap.get(msRef.toLowerCase()),
      epicId: epicMap.get(epicRef.toLowerCase()),
      featureId: featureMap.get(featRef.toLowerCase()),
      status: 'todo',
      priority: 'normal',
      assigneeIds: [],
      startDate,
      dueDate,
      estimatedHours: estHours,
      actualHours: 0,
      plannedCost: planCost,
      actualCost: 0,
      completionPercent: 0,
      dependencies: [],
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
      raidCount: 0
    },
    warnings
  };
}
