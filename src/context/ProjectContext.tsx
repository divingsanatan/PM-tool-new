import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ProjectData, Task, RaidItem, Stakeholder, Feature, Epic, Milestone, Subtask, EVMMetrics, UserProfile, ProjectMeta, ActivityLog, ChangeRequest, ChangeRequestStatus, CustomAiConfig, TaskStatus, ProjectBoardCategory, ProjectBoardItem, BoardItemComment, ProjectChatMessage } from '../types';
import { initialProjectData } from '../data/initialData';
import { calculateEVMMetrics } from '../utils/evm';
import { getTaskEffectiveValues, DEFAULT_STATUS_PERCENTAGES, calculateTimestampActualHours } from '../utils/taskCalculations';

export const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'user-pm-1',
    name: 'Alex Morgan',
    email: 'alex.m@apex.io',
    role: 'pm',
    title: 'Project Manager & Scrum Master',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    department: 'PMO'
  },
  {
    id: 'user-sh-3',
    name: 'Marcus Vance',
    email: 'marcus.v@apex.io',
    role: 'stakeholder',
    title: 'Senior Full Stack Engineer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    department: 'Engineering'
  },
  {
    id: 'user-sh-2',
    name: 'Dr. Elena Rostova',
    email: 'elena.r@apex.io',
    role: 'stakeholder',
    title: 'Principal Architect',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150',
    department: 'Architecture'
  },
  {
    id: 'user-sh-4',
    name: 'Priya Sharma',
    email: 'priya.s@apex.io',
    role: 'stakeholder',
    title: 'Lead UI/UX Designer',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
    department: 'Design'
  },
  {
    id: 'user-sh-5',
    name: 'David Chen',
    email: 'david.c@apex.io',
    role: 'stakeholder',
    title: 'DevOps & QA Specialist',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    department: 'DevOps'
  }
];

interface ProjectContextType {
  projectData: ProjectData;
  projectsList: ProjectMeta[];
  activeProjectId: string;
  metrics: EVMMetrics;
  isOffline: boolean;
  isWsConnected: boolean;
  theme: 'dark' | 'light';
  currentUser: UserProfile;
  allUsers: UserProfile[];
  isAuthenticated: boolean;
  logout: () => void;
  toggleTheme: () => void;
  loginAsUser: (user: UserProfile) => void;
  createUserAccount: (user: UserProfile) => void;
  switchProject: (projectId: string) => Promise<void>;
  createProject: (newProject: Partial<ProjectData>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  updateProjectDetails: (details: Partial<ProjectData>) => Promise<void>;
  saveTask: (task: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  saveSubtask: (subtask: Partial<Subtask>) => Promise<void>;
  deleteSubtask: (subtaskId: string) => Promise<void>;
  saveRaidItem: (raidItem: Partial<RaidItem>) => Promise<void>;
  deleteRaidItem: (raidItemId: string) => Promise<void>;
  saveStakeholder: (stakeholder: Partial<Stakeholder>) => Promise<void>;
  deleteStakeholder: (stakeholderId: string) => Promise<void>;
  saveEpic: (epic: Partial<Epic>) => Promise<void>;
  deleteEpic: (epicId: string) => Promise<void>;
  saveFeature: (feature: Partial<Feature>) => Promise<void>;
  deleteFeature: (featureId: string) => Promise<void>;
  saveMilestone: (milestone: Partial<Milestone>) => Promise<void>;
  deleteMilestone: (milestoneId: string) => Promise<void>;
  saveChangeRequest: (cr: Partial<ChangeRequest>) => Promise<void>;
  deleteChangeRequest: (crId: string) => Promise<void>;
  updateChangeRequestStatus: (crId: string, status: ChangeRequestStatus, ccbNotes?: string, fastTrack?: boolean) => Promise<void>;
  saveBoardCategory: (category: Partial<ProjectBoardCategory>) => Promise<void>;
  deleteBoardCategory: (categoryId: string) => Promise<void>;
  saveBoardItem: (item: Partial<ProjectBoardItem>) => Promise<void>;
  deleteBoardItem: (itemId: string) => Promise<void>;
  togglePinBoardItem: (itemId: string) => Promise<void>;
  addBoardItemComment: (itemId: string, content: string) => Promise<void>;
  deleteBoardItemComment: (itemId: string, commentId: string) => Promise<void>;
  toggleBoardItemCommentReaction: (itemId: string, commentId: string, emoji: string) => Promise<void>;
  addProjectChatMessage: (message: Partial<ProjectChatMessage>) => Promise<void>;
  deleteProjectChatMessage: (messageId: string) => Promise<void>;
  toggleProjectChatMessageReaction: (messageId: string, emoji: string) => Promise<void>;
  togglePinProjectChatMessage: (messageId: string) => Promise<void>;
  importWbsData: (
    parsed: {
      milestones: Milestone[];
      epics: Epic[];
      features: Feature[];
      tasks: Task[];
      subtasks: Subtask[];
      raidItems: RaidItem[];
    },
    mode?: 'replace' | 'merge'
  ) => Promise<void>;
  resetToDefault: () => Promise<void>;
  updateWidgets: (widgets: ProjectData['widgets']) => Promise<void>;
  updateStatusPercentages: (percentages: Record<string, number>) => Promise<void>;
  addAuditNote: (action: string, details: string, category?: ActivityLog['category']) => void;
  clearAuditLogs: () => void;
  customAiConfig: CustomAiConfig;
  updateCustomAiConfig: (config: CustomAiConfig) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'apex_pm_project_data';
const THEME_STORAGE_KEY = 'apex_pm_theme';
const AI_CONFIG_STORAGE_KEY = 'apex_pm_custom_ai_config';
const USER_STORAGE_KEY = 'apex_pm_current_user';
const USERS_LIST_KEY = 'apex_pm_all_users';

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projectData, setProjectData] = useState<ProjectData>(() => {
    let baseData: ProjectData = { ...initialProjectData, id: 'proj-1' };
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        baseData = JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Failed to read cached project data:', e);
    }
    return {
      ...baseData,
      statusPercentages: { ...DEFAULT_STATUS_PERCENTAGES, ...(baseData.statusPercentages || {}) }
    };
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(projectData.id || 'proj-1');
  const [projectsList, setProjectsList] = useState<ProjectMeta[]>([
    {
      id: 'proj-1',
      projectName: initialProjectData.projectName,
      projectCode: initialProjectData.projectCode,
      description: initialProjectData.description,
      budget: initialProjectData.budget,
      startDate: initialProjectData.startDate,
      targetEndDate: initialProjectData.targetEndDate,
      taskCount: initialProjectData.tasks.length
    }
  ]);

  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => {
    try {
      const cached = localStorage.getItem(USERS_LIST_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      // Ignore
    }
    return DEFAULT_USERS;
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const cached = localStorage.getItem(USER_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      // Ignore
    }
    return DEFAULT_USERS[0]; // Default Alex Morgan PM
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const auth = localStorage.getItem('apex_pm_is_authenticated');
      if (auth !== null) return JSON.parse(auth);
    } catch (e) {
      // Ignore
    }
    return true; // Default logged in for smooth session
  });

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem(THEME_STORAGE_KEY) as 'dark' | 'light') || 'dark';
  });

  const [customAiConfig, setCustomAiConfig] = useState<CustomAiConfig>(() => {
    try {
      const cached = localStorage.getItem(AI_CONFIG_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      // Ignore
    }
    return {
      enabled: false,
      provider: 'gemini',
      apiKey: '',
      model: 'gemini-3.6-flash',
      baseUrl: ''
    };
  });

  const updateCustomAiConfig = (config: CustomAiConfig) => {
    setCustomAiConfig(config);
    try {
      localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save custom AI config to localStorage:', e);
    }
  };

  const wsRef = useRef<WebSocket | null>(null);

  // Sync state to local storage on every change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projectData));
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
      localStorage.setItem(USERS_LIST_KEY, JSON.stringify(allUsers));
      localStorage.setItem('apex_pm_is_authenticated', JSON.stringify(isAuthenticated));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [projectData, currentUser, allUsers, isAuthenticated]);

  // Handle Theme switching
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const loginAsUser = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem('apex_pm_is_authenticated', JSON.stringify(true));
    } catch (e) {
      // Ignore
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.setItem('apex_pm_is_authenticated', JSON.stringify(false));
    } catch (e) {
      // Ignore
    }
  };

  const createUserAccount = (newUser: UserProfile) => {
    const updatedUsers = [...allUsers, newUser];
    setAllUsers(updatedUsers);
    setCurrentUser(newUser);
    setIsAuthenticated(true);
    try {
      localStorage.setItem(USERS_LIST_KEY, JSON.stringify(updatedUsers));
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
      localStorage.setItem('apex_pm_is_authenticated', JSON.stringify(true));
    } catch (e) {
      // Ignore
    }
  };

  // BroadcastChannel for multi-tab local offline sync
  useEffect(() => {
    const channel = new BroadcastChannel('apex_pm_sync_channel');
    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'LOCAL_STATE_UPDATE') {
        if (event.data.data) setProjectData(event.data.data);
        if (event.data.activeProjectId) setActiveProjectId(event.data.activeProjectId);
        if (event.data.projects) setProjectsList(event.data.projects);
      }
    };
    return () => {
      channel.close();
    };
  }, []);

  const broadcastLocalTabSync = (data: ProjectData, pList?: ProjectMeta[], activeId?: string) => {
    try {
      const channel = new BroadcastChannel('apex_pm_sync_channel');
      channel.postMessage({
        type: 'LOCAL_STATE_UPDATE',
        data,
        projects: pList || projectsList,
        activeProjectId: activeId || activeProjectId
      });
      channel.close();
    } catch (e) {
      // BroadcastChannel ignore fallback
    }
  };

  // Setup WebSocket connection for real-time synchronization
  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsWsConnected(true);
        setIsOffline(false);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'INIT_STATE' || message.type === 'DATA_UPDATED') {
            if (message.data) setProjectData(message.data);
            if (message.activeProjectId) setActiveProjectId(message.activeProjectId);
            if (message.projects) setProjectsList(message.projects);
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      socket.onclose = () => {
        setIsWsConnected(false);
        setTimeout(() => {
          if (navigator.onLine) {
            connectWebSocket();
          }
        }, 3000);
      };

      socket.onerror = () => {
        setIsWsConnected(false);
      };
    } catch (e) {
      console.warn('WebSocket connection error:', e);
      setIsWsConnected(false);
    }
  }, []);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      connectWebSocket();
    };
    const handleOffline = () => {
      setIsOffline(true);
      setIsWsConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    connectWebSocket();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // Initial fetch from REST API
  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.projects) {
          setProjectsList(res.projects);
          if (res.activeProjectId) setActiveProjectId(res.activeProjectId);
        }
      })
      .catch(() => {});

    fetch('/api/project')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setProjectData(res.data);
        }
      })
      .catch(err => {
        console.warn('Using local cached state due to network/server response:', err);
      });
  }, []);

  // Calculated EVM Metrics
  const metrics = calculateEVMMetrics(
    projectData.tasks,
    projectData.budget,
    projectData.subtasks,
    projectData.stakeholders
  );

  // Switch Active Project
  const switchProject = async (projectId: string) => {
    setActiveProjectId(projectId);
    if (navigator.onLine) {
      try {
        const res = await fetch('/api/projects/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId })
        });
        const json = await res.json();
        if (json.success && json.data) {
          setProjectData(json.data);
          broadcastLocalTabSync(json.data, projectsList, projectId);
        }
      } catch (err) {
        console.warn('Failed to switch project on server:', err);
      }
    }
  };

  // Create Project
  const createProject = async (newProjData: Partial<ProjectData>) => {
    const newProject: ProjectData = {
      id: 'proj-' + Date.now(),
      projectName: newProjData.projectName || 'New Agile Project',
      projectCode: newProjData.projectCode || 'PRJ-' + Math.floor(100 + Math.random() * 900),
      description: newProjData.description || 'Project managed in ApexPM',
      startDate: newProjData.startDate || new Date().toISOString().split('T')[0],
      targetEndDate: newProjData.targetEndDate || new Date(Date.now() + 86400000 * 90).toISOString().split('T')[0],
      budget: newProjData.budget || 150000,
      stakeholders: newProjData.stakeholders || [...initialProjectData.stakeholders],
      epics: newProjData.epics || [],
      features: newProjData.features || [],
      milestones: newProjData.milestones || [],
      tasks: newProjData.tasks || [],
      subtasks: newProjData.subtasks || [],
      raidItems: newProjData.raidItems || [],
      activities: [
        {
          id: 'act-' + Date.now(),
          timestamp: new Date().toISOString(),
          user: currentUser.name,
          action: 'Created Project',
          details: `Created project ${newProjData.projectName}`
        }
      ],
      widgets: initialProjectData.widgets
    };

    setProjectData(newProject);
    setActiveProjectId(newProject.id);

    const newMetaList: ProjectMeta[] = [
      ...projectsList,
      {
        id: newProject.id,
        projectName: newProject.projectName,
        projectCode: newProject.projectCode,
        description: newProject.description,
        budget: newProject.budget,
        startDate: newProject.startDate,
        targetEndDate: newProject.targetEndDate,
        taskCount: newProject.tasks.length
      }
    ];
    setProjectsList(newMetaList);
    broadcastLocalTabSync(newProject, newMetaList, newProject.id);

    if (navigator.onLine) {
      try {
        await fetch('/api/projects/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProject)
        });
      } catch (err) {
        console.warn('Failed to send created project to server:', err);
      }
    }
  };

  // Delete Project
  const deleteProject = async (projectId: string) => {
    if (projectsList.length <= 1) return;
    const updatedList = projectsList.filter(p => p.id !== projectId);
    setProjectsList(updatedList);

    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success && json.data) {
          setProjectData(json.data);
          setActiveProjectId(json.activeProjectId);
          broadcastLocalTabSync(json.data, updatedList, json.activeProjectId);
        }
      } catch (err) {
        console.warn('Failed to delete project on server:', err);
      }
    }
  };

  // Data Mutation Handlers
  const updateProjectDetails = async (details: Partial<ProjectData>) => {
    const updated = { ...projectData, ...details };
    setProjectData(updated);
    broadcastLocalTabSync(updated);

    if (navigator.onLine) {
      try {
        await fetch('/api/project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: updated })
        });
      } catch (err) {
        console.warn('Server sync failed, saved locally:', err);
      }
    }
  };

  const saveTask = async (task: Partial<Task>) => {
    // Auto-resolve hierarchy mapping
    let resolvedEpicId = task.epicId;
    let resolvedMilestoneId = task.milestoneId;

    if (task.featureId) {
      const feat = projectData.features.find(f => f.id === task.featureId);
      if (feat) {
        if (feat.epicId) resolvedEpicId = feat.epicId;
        if (feat.milestoneId) resolvedMilestoneId = feat.milestoneId;
        else if (feat.epicId) {
          const parentEpic = (projectData.epics || []).find(e => e.id === feat.epicId);
          if (parentEpic?.milestoneId) resolvedMilestoneId = parentEpic.milestoneId;
        }
      }
    } else if (task.epicId) {
      const ep = (projectData.epics || []).find(e => e.id === task.epicId);
      if (ep?.milestoneId) resolvedMilestoneId = ep.milestoneId;
    }

    const taskId = task.id || 'task-' + Date.now();
    const existingTask = projectData.tasks.find(t => t.id === taskId);
    const timestampCalc = calculateTimestampActualHours(task, existingTask);

    const tempTask: Task = {
      id: taskId,
      type: task.type || existingTask?.type || 'task',
      title: task.title || 'Untitled Task',
      description: task.description || '',
      epicId: resolvedEpicId,
      featureId: task.featureId,
      milestoneId: resolvedMilestoneId,
      status: task.status || 'todo',
      priority: task.priority || 'normal',
      assigneeIds: task.assigneeIds || [],
      startDate: task.startDate || new Date().toISOString().split('T')[0],
      dueDate: task.dueDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      estimatedHours: task.estimatedHours || 10,
      actualHours: timestampCalc.actualHours,
      inProgressAt: timestampCalc.inProgressAt,
      demoableAt: timestampCalc.demoableAt,
      plannedCost: 0,
      actualCost: 0,
      completionPercent: task.completionPercent ?? 0,
      dependencies: task.dependencies || [],
      linkedBugIds: task.linkedBugIds || existingTask?.linkedBugIds || [],
      tags: task.tags || []
    };

    const eff = getTaskEffectiveValues(tempTask, projectData.subtasks, projectData.stakeholders);

    const newTask: Task = {
      ...tempTask,
      estimatedHours: eff.hasSubtasks ? eff.estimatedHours : tempTask.estimatedHours,
      actualHours: eff.hasSubtasks ? eff.actualHours : tempTask.actualHours,
      plannedCost: eff.plannedCost,
      actualCost: eff.actualCost,
      completionPercent: task.completionPercent !== undefined ? task.completionPercent : eff.completionPercent
    };

    const existingIdx = projectData.tasks.findIndex(t => t.id === newTask.id);
    const updatedTasks = [...projectData.tasks];
    if (existingIdx >= 0) {
      updatedTasks[existingIdx] = newTask;
    } else {
      updatedTasks.push(newTask);
    }

    const updated = {
      ...projectData,
      tasks: updatedTasks,
      activities: [
        {
          id: 'act-' + Date.now(),
          timestamp: new Date().toISOString(),
          user: currentUser.name,
          action: existingIdx >= 0 ? 'Updated Task' : 'Created Task',
          details: `${newTask.title} [${newTask.status.toUpperCase()}]`
        },
        ...projectData.activities
      ]
    };

    setProjectData(updated);
    broadcastLocalTabSync(updated);

    if (navigator.onLine) {
      try {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newTask, updatedBy: currentUser.name })
        });
      } catch (err) {
        console.warn('Failed to sync task to server:', err);
      }
    }
  };

  const deleteTask = async (taskId: string) => {
    const taskToDelete = projectData.tasks.find(t => t.id === taskId);
    const updatedTasks = projectData.tasks.filter(t => t.id !== taskId);
    const updatedSubtasks = projectData.subtasks.filter(st => st.taskId !== taskId);

    const updated = {
      ...projectData,
      tasks: updatedTasks,
      subtasks: updatedSubtasks,
      activities: [
        {
          id: 'act-' + Date.now(),
          timestamp: new Date().toISOString(),
          user: currentUser.name,
          action: 'Deleted Task',
          details: taskToDelete ? taskToDelete.title : taskId
        },
        ...projectData.activities
      ]
    };

    setProjectData(updated);
    broadcastLocalTabSync(updated);

    if (navigator.onLine) {
      try {
        await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Failed to delete task on server:', err);
      }
    }
  };

  const saveSubtask = async (subtask: Partial<Subtask>) => {
    if (!subtask.taskId) return;
    const newSubtask: Subtask = {
      id: subtask.id || 'sub-' + Date.now(),
      taskId: subtask.taskId,
      title: subtask.title || 'New Subtask',
      completed: subtask.completed ?? false,
      assigneeId: subtask.assigneeId,
      estimatedHours: subtask.estimatedHours || 2,
      actualHours: subtask.actualHours || 0
    };

    const existingIdx = projectData.subtasks.findIndex(st => st.id === newSubtask.id);
    const updatedSubtasks = [...projectData.subtasks];
    if (existingIdx >= 0) {
      updatedSubtasks[existingIdx] = newSubtask;
    } else {
      updatedSubtasks.push(newSubtask);
    }

    const updated = { ...projectData, subtasks: updatedSubtasks };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const deleteSubtask = async (subtaskId: string) => {
    const updatedSubtasks = projectData.subtasks.filter(st => st.id !== subtaskId);
    const updated = { ...projectData, subtasks: updatedSubtasks };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const saveRaidItem = async (item: Partial<RaidItem>) => {
    const newItem: RaidItem = {
      id: item.id || 'raid-' + Date.now(),
      type: item.type || 'risk',
      title: item.title || 'Untitled RAID Item',
      description: item.description || '',
      ownerId: item.ownerId || (projectData.stakeholders[0]?.id || 'sh-1'),
      status: item.status || 'identified',
      probability: item.probability || 'medium',
      impact: item.impact || 'medium',
      riskScore: item.riskScore || 6,
      mitigationStrategy: item.mitigationStrategy || '',
      contingencyPlan: item.contingencyPlan || '',
      severity: item.severity || 'medium',
      targetResolutionDate: item.targetResolutionDate || new Date().toISOString().split('T')[0],
      linkedTaskId: item.linkedTaskId,
      createdBy: item.createdBy || currentUser.id,
      createdByEmail: item.createdByEmail || currentUser.email
    };

    const existingIdx = projectData.raidItems.findIndex(r => r.id === newItem.id);
    const updatedRaid = [...projectData.raidItems];
    if (existingIdx >= 0) {
      updatedRaid[existingIdx] = newItem;
    } else {
      updatedRaid.push(newItem);
    }

    const updated = {
      ...projectData,
      raidItems: updatedRaid,
      activities: [
        {
          id: 'act-' + Date.now(),
          timestamp: new Date().toISOString(),
          user: currentUser.name,
          action: existingIdx >= 0 ? 'Updated RAID Item' : 'Logged RAID Item',
          details: `[${newItem.type.toUpperCase()}] ${newItem.title}`
        },
        ...projectData.activities
      ]
    };

    setProjectData(updated);
    broadcastLocalTabSync(updated);

    if (navigator.onLine) {
      try {
        await fetch('/api/raid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItem)
        });
      } catch (err) {
        console.warn('Failed to save RAID item to server:', err);
      }
    }
  };

  const deleteRaidItem = async (id: string) => {
    const itemToDelete = projectData.raidItems.find(r => r.id === id);
    const updatedRaid = projectData.raidItems.filter(r => r.id !== id);

    const updated = {
      ...projectData,
      raidItems: updatedRaid,
      activities: [
        {
          id: 'act-' + Date.now(),
          timestamp: new Date().toISOString(),
          user: currentUser.name,
          action: 'Deleted RAID Item',
          details: itemToDelete ? itemToDelete.title : id
        },
        ...projectData.activities
      ]
    };

    setProjectData(updated);
    broadcastLocalTabSync(updated);

    if (navigator.onLine) {
      try {
        await fetch(`/api/raid/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Failed to delete RAID item on server:', err);
      }
    }
  };

  const saveStakeholder = async (sh: Partial<Stakeholder>) => {
    const newSh: Stakeholder = {
      id: sh.id || 'sh-' + Date.now(),
      name: sh.name || 'New Member',
      email: sh.email || 'user@apex.io',
      role: sh.role || 'Contributor',
      category: sh.category || 'internal',
      avatar: sh.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sh.name || 'user')}`,
      hourlyRate: sh.hourlyRate || 80,
      weeklyCapacityHours: sh.weeklyCapacityHours || 40,
      skills: sh.skills || ['Agile'],
      status: sh.status || 'active',
      createdBy: sh.createdBy || currentUser.id,
      createdByEmail: sh.createdByEmail || currentUser.email
    };

    const existingIdx = projectData.stakeholders.findIndex(s => s.id === newSh.id);
    const updatedStakeholders = [...projectData.stakeholders];
    if (existingIdx >= 0) {
      updatedStakeholders[existingIdx] = newSh;
    } else {
      updatedStakeholders.push(newSh);
    }

    const updated = { ...projectData, stakeholders: updatedStakeholders };
    setProjectData(updated);
    broadcastLocalTabSync(updated);

    if (navigator.onLine) {
      try {
        await fetch('/api/stakeholders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSh)
        });
      } catch (err) {
        console.warn('Failed to save stakeholder to server:', err);
      }
    }
  };

  const deleteStakeholder = async (id: string) => {
    const updatedStakeholders = projectData.stakeholders.filter(s => s.id !== id);
    const updated = { ...projectData, stakeholders: updatedStakeholders };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const saveEpic = async (epic: Partial<Epic>) => {
    const newEpic: Epic = {
      id: epic.id || 'epic-' + Date.now(),
      title: epic.title || 'New Epic',
      description: epic.description || '',
      milestoneId: epic.milestoneId,
      status: epic.status || 'in_progress',
      color: epic.color || '#8b5cf6'
    };

    const epics = projectData.epics || [];
    const existingIdx = epics.findIndex(e => e.id === newEpic.id);
    const updatedEpics = [...epics];
    if (existingIdx >= 0) {
      updatedEpics[existingIdx] = newEpic;
    } else {
      updatedEpics.push(newEpic);
    }

    // Cascade milestone updates to features and tasks under this epic
    let updatedFeatures = [...projectData.features];
    if (newEpic.milestoneId) {
      updatedFeatures = updatedFeatures.map(f =>
        f.epicId === newEpic.id ? { ...f, milestoneId: newEpic.milestoneId } : f
      );
    }

    let updatedTasks = [...projectData.tasks];
    updatedTasks = updatedTasks.map(t => {
      let match = false;
      if (t.epicId === newEpic.id) match = true;
      if (t.featureId) {
        const feat = updatedFeatures.find(f => f.id === t.featureId);
        if (feat && feat.epicId === newEpic.id) match = true;
      }
      if (match) {
        return {
          ...t,
          epicId: newEpic.id,
          milestoneId: newEpic.milestoneId || t.milestoneId
        };
      }
      return t;
    });

    const updated = {
      ...projectData,
      epics: updatedEpics,
      features: updatedFeatures,
      tasks: updatedTasks
    };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const deleteEpic = async (epicId: string) => {
    const updatedEpics = (projectData.epics || []).filter(e => e.id !== epicId);
    const updatedFeatures = projectData.features.map(f => f.epicId === epicId ? { ...f, epicId: undefined } : f);
    const updatedTasks = projectData.tasks.map(t => t.epicId === epicId ? { ...t, epicId: undefined } : t);
    const updated = { ...projectData, epics: updatedEpics, features: updatedFeatures, tasks: updatedTasks };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const saveFeature = async (feature: Partial<Feature>) => {
    let resolvedMilestoneId = feature.milestoneId;
    if (feature.epicId && !resolvedMilestoneId) {
      const parentEpic = (projectData.epics || []).find(e => e.id === feature.epicId);
      if (parentEpic?.milestoneId) resolvedMilestoneId = parentEpic.milestoneId;
    }

    const newFeature: Feature = {
      id: feature.id || 'feat-' + Date.now(),
      title: feature.title || 'New Feature',
      description: feature.description || '',
      epicId: feature.epicId,
      milestoneId: resolvedMilestoneId,
      status: feature.status || 'in_progress',
      priority: feature.priority || 'normal',
      targetReleaseDate: feature.targetReleaseDate || new Date().toISOString().split('T')[0],
      color: feature.color || '#3b82f6'
    };

    const existingIdx = projectData.features.findIndex(f => f.id === newFeature.id);
    const updatedFeatures = [...projectData.features];
    if (existingIdx >= 0) {
      updatedFeatures[existingIdx] = newFeature;
    } else {
      updatedFeatures.push(newFeature);
    }

    // Cascade updates to child tasks automatically
    const updatedTasks = projectData.tasks.map(t => {
      if (t.featureId === newFeature.id) {
        return {
          ...t,
          epicId: newFeature.epicId || t.epicId,
          milestoneId: newFeature.milestoneId || t.milestoneId
        };
      }
      return t;
    });

    const updated = { ...projectData, features: updatedFeatures, tasks: updatedTasks };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const deleteFeature = async (featureId: string) => {
    const updatedFeatures = projectData.features.filter(f => f.id !== featureId);
    const updatedTasks = projectData.tasks.map(t => t.featureId === featureId ? { ...t, featureId: undefined } : t);
    const updated = { ...projectData, features: updatedFeatures, tasks: updatedTasks };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const saveMilestone = async (milestone: Partial<Milestone>) => {
    const newMilestone: Milestone = {
      id: milestone.id || 'm-' + Date.now(),
      title: milestone.title || 'New Milestone',
      description: milestone.description || '',
      featureId: milestone.featureId,
      dueDate: milestone.dueDate || new Date().toISOString().split('T')[0],
      status: milestone.status || 'upcoming',
      baselineCost: milestone.baselineCost || 10000,
      actualCost: milestone.actualCost || 0
    };

    const existingIdx = projectData.milestones.findIndex(m => m.id === newMilestone.id);
    const updatedMilestones = [...projectData.milestones];
    if (existingIdx >= 0) {
      updatedMilestones[existingIdx] = newMilestone;
    } else {
      updatedMilestones.push(newMilestone);
    }

    const updated = { ...projectData, milestones: updatedMilestones };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const deleteMilestone = async (milestoneId: string) => {
    const updatedMilestones = projectData.milestones.filter(m => m.id !== milestoneId);
    const updatedEpics = (projectData.epics || []).map(e => e.milestoneId === milestoneId ? { ...e, milestoneId: undefined } : e);
    const updatedFeatures = projectData.features.map(f => f.milestoneId === milestoneId ? { ...f, milestoneId: undefined } : f);
    const updatedTasks = projectData.tasks.map(t => t.milestoneId === milestoneId ? { ...t, milestoneId: undefined } : t);

    const updated = {
      ...projectData,
      milestones: updatedMilestones,
      epics: updatedEpics,
      features: updatedFeatures,
      tasks: updatedTasks
    };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const updateWidgets = async (widgets: ProjectData['widgets']) => {
    const updated = { ...projectData, widgets };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const updateStatusPercentages = async (percentages: Record<string, number>) => {
    const newPercentages = { ...DEFAULT_STATUS_PERCENTAGES, ...percentages };
    const updatedTasks = projectData.tasks.map(task => {
      const newPct = newPercentages[task.status as TaskStatus] ?? task.completionPercent;
      return { ...task, completionPercent: newPct };
    });
    await updateProjectDetails({
      statusPercentages: newPercentages as Record<TaskStatus, number>,
      tasks: updatedTasks
    });
    addAuditNote('Status Percentages Updated', 'Project Manager updated task completion thresholds.', 'wbs');
  };

  const importWbsData = async (
    parsed: {
      milestones: Milestone[];
      epics: Epic[];
      features: Feature[];
      tasks: Task[];
      subtasks: Subtask[];
      raidItems: RaidItem[];
    },
    mode: 'replace' | 'merge' = 'replace'
  ) => {
    let updatedMilestones = [...(projectData.milestones || [])];
    let updatedEpics = [...(projectData.epics || [])];
    let updatedFeatures = [...(projectData.features || [])];
    let updatedTasks = [...(projectData.tasks || [])];
    let updatedSubtasks = [...(projectData.subtasks || [])];
    let updatedRaidItems = [...(projectData.raidItems || [])];

    if (mode === 'replace') {
      if (parsed.milestones.length > 0) updatedMilestones = parsed.milestones;
      if (parsed.epics.length > 0) updatedEpics = parsed.epics;
      if (parsed.features.length > 0) updatedFeatures = parsed.features;
      if (parsed.tasks.length > 0) updatedTasks = parsed.tasks;
      if (parsed.subtasks.length > 0) updatedSubtasks = parsed.subtasks;
      if (parsed.raidItems.length > 0) updatedRaidItems = parsed.raidItems;
    } else {
      parsed.milestones.forEach(m => {
        const idx = updatedMilestones.findIndex(item => item.id === m.id || item.title.toLowerCase() === m.title.toLowerCase());
        if (idx >= 0) updatedMilestones[idx] = { ...updatedMilestones[idx], ...m };
        else updatedMilestones.push(m);
      });

      parsed.epics.forEach(e => {
        const idx = updatedEpics.findIndex(item => item.id === e.id || item.title.toLowerCase() === e.title.toLowerCase());
        if (idx >= 0) updatedEpics[idx] = { ...updatedEpics[idx], ...e };
        else updatedEpics.push(e);
      });

      parsed.features.forEach(f => {
        const idx = updatedFeatures.findIndex(item => item.id === f.id || item.title.toLowerCase() === f.title.toLowerCase());
        if (idx >= 0) updatedFeatures[idx] = { ...updatedFeatures[idx], ...f };
        else updatedFeatures.push(f);
      });

      parsed.tasks.forEach(t => {
        const idx = updatedTasks.findIndex(item => item.id === t.id || item.title.toLowerCase() === t.title.toLowerCase());
        if (idx >= 0) updatedTasks[idx] = { ...updatedTasks[idx], ...t };
        else updatedTasks.push(t);
      });

      parsed.subtasks.forEach(st => {
        const idx = updatedSubtasks.findIndex(item => item.id === st.id || item.title.toLowerCase() === st.title.toLowerCase());
        if (idx >= 0) updatedSubtasks[idx] = { ...updatedSubtasks[idx], ...st };
        else updatedSubtasks.push(st);
      });

      parsed.raidItems.forEach(r => {
        const idx = updatedRaidItems.findIndex(item => item.id === r.id || item.title.toLowerCase() === r.title.toLowerCase());
        if (idx >= 0) updatedRaidItems[idx] = { ...updatedRaidItems[idx], ...r };
        else updatedRaidItems.push(r);
      });
    }

    const updatedData: ProjectData = {
      ...projectData,
      milestones: updatedMilestones,
      epics: updatedEpics,
      features: updatedFeatures,
      tasks: updatedTasks,
      subtasks: updatedSubtasks,
      raidItems: updatedRaidItems
    };

    setProjectData(updatedData);
    broadcastLocalTabSync(updatedData);

    addAuditNote(
      'CSV WBS Data Feed Imported',
      `Imported WBS dataset (${parsed.tasks.length} tasks, ${parsed.features.length} features, ${parsed.epics.length} epics, ${parsed.milestones.length} milestones) in ${mode} mode.`,
      'wbs'
    );
  };

  const resetToDefault = async () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(USERS_LIST_KEY);
      localStorage.removeItem('apex_pm_is_authenticated');
    } catch (e) {
      // Ignore
    }
    setProjectData({ ...initialProjectData, id: 'proj-1' });
    setActiveProjectId('proj-1');
    broadcastLocalTabSync({ ...initialProjectData, id: 'proj-1' });
    if (navigator.onLine) {
      try {
        await fetch('/api/reset', { method: 'POST' });
      } catch (e) {
        console.warn('Failed to reset server state:', e);
      }
    }
  };

  const addAuditNote = (action: string, details: string, category: ActivityLog['category'] = 'audit') => {
    const newEntry: ActivityLog = {
      id: 'act-' + Date.now(),
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      userEmail: currentUser.email,
      userAvatar: currentUser.avatar,
      action,
      details,
      category
    };

    const updated = {
      ...projectData,
      activities: [newEntry, ...projectData.activities]
    };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const clearAuditLogs = () => {
    const updated = {
      ...projectData,
      activities: []
    };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const saveChangeRequest = async (crData: Partial<ChangeRequest>) => {
    const existingCRs = projectData.changeRequests || [];
    const isEdit = Boolean(crData.id && existingCRs.some(c => c.id === crData.id));

    let finalCR: ChangeRequest;
    let updatedCRs: ChangeRequest[];

    if (isEdit) {
      updatedCRs = existingCRs.map(c => {
        if (c.id === crData.id) {
          finalCR = { ...c, ...crData } as ChangeRequest;
          return finalCR;
        }
        return c;
      });
    } else {
      const nextNum = existingCRs.length + 1;
      const crNumber = crData.crNumber || `CR-${String(nextNum).padStart(3, '0')}`;
      finalCR = {
        id: 'cr-' + Date.now(),
        crNumber,
        title: crData.title || 'Untitled Change Request',
        description: crData.description || '',
        requestor: crData.requestor || currentUser.name,
        requestorEmail: crData.requestorEmail || currentUser.email,
        requestDate: crData.requestDate || new Date().toISOString().split('T')[0],
        status: crData.status || 'submitted',
        priority: crData.priority || 'medium',
        impactAreas: crData.impactAreas || ['scope'],
        costImpactDelta: Number(crData.costImpactDelta) || 0,
        scheduleImpactDays: Number(crData.scheduleImpactDays) || 0,
        scopeImpactDescription: crData.scopeImpactDescription || '',
        riskImpactDescription: crData.riskImpactDescription || '',
        justification: crData.justification || '',
        proposedSolution: crData.proposedSolution || '',
        pmRecommendation: crData.pmRecommendation || '',
        linkedTaskId: crData.linkedTaskId,
        linkedRaidId: crData.linkedRaidId,
        createdBy: crData.createdBy || currentUser.id,
        createdByEmail: crData.createdByEmail || currentUser.email,
        ...crData
      } as ChangeRequest;
      updatedCRs = [finalCR, ...existingCRs];
    }

    const auditLog: ActivityLog = {
      id: 'act-' + Date.now(),
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      userEmail: currentUser.email,
      userAvatar: currentUser.avatar,
      action: isEdit ? 'Updated Change Request' : 'Submitted Change Request',
      details: `${isEdit ? 'Modified' : 'Created'} ${finalCR.crNumber}: "${finalCR.title}" (Status: ${finalCR.status.toUpperCase()}, Cost: $${finalCR.costImpactDelta.toLocaleString()}, ${finalCR.scheduleImpactDays}d).`,
      category: 'change',
      entityId: finalCR.crNumber
    };

    const updated = {
      ...projectData,
      changeRequests: updatedCRs,
      activities: [auditLog, ...projectData.activities]
    };

    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const deleteChangeRequest = async (crId: string) => {
    const existingCRs = projectData.changeRequests || [];
    const target = existingCRs.find(c => c.id === crId);
    if (!target) return;

    const updatedCRs = existingCRs.filter(c => c.id !== crId);
    const auditLog: ActivityLog = {
      id: 'act-' + Date.now(),
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      userEmail: currentUser.email,
      userAvatar: currentUser.avatar,
      action: 'Deleted Change Request',
      details: `Removed Change Request ${target.crNumber}: "${target.title}".`,
      category: 'change',
      entityId: target.crNumber
    };

    const updated = {
      ...projectData,
      changeRequests: updatedCRs,
      activities: [auditLog, ...projectData.activities]
    };

    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const updateChangeRequestStatus = async (
    crId: string,
    status: ChangeRequestStatus,
    ccbNotes?: string,
    fastTrack: boolean = false
  ) => {
    const existingCRs = projectData.changeRequests || [];
    let targetCR: ChangeRequest | undefined;

    const updatedCRs = existingCRs.map(c => {
      if (c.id === crId) {
        targetCR = {
          ...c,
          status,
          ccbDecisionDate: new Date().toISOString().split('T')[0],
          ccbNotes: ccbNotes || c.ccbNotes,
          approvedBy: status === 'approved' ? `${currentUser.name} (${currentUser.title})` : c.approvedBy,
          fastTrackApproved: fastTrack
        };
        return targetCR;
      }
      return c;
    });

    if (!targetCR) return;

    let updatedBudget = projectData.budget;
    if (status === 'approved' && targetCR.costImpactDelta !== 0) {
      updatedBudget += targetCR.costImpactDelta;
    }

    const auditLog: ActivityLog = {
      id: 'act-' + Date.now(),
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      userEmail: currentUser.email,
      userAvatar: currentUser.avatar,
      action: `CR ${status.toUpperCase()}`,
      details: `Change Request ${targetCR.crNumber} status set to ${status.toUpperCase()}${fastTrack ? ' via Fast-Track Approval' : ''}. ${ccbNotes ? 'CCB Notes: ' + ccbNotes : ''}`,
      category: 'change',
      entityId: targetCR.crNumber
    };

    const updated = {
      ...projectData,
      budget: updatedBudget,
      changeRequests: updatedCRs,
      activities: [auditLog, ...projectData.activities]
    };

    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const saveBoardCategory = async (categoryData: Partial<ProjectBoardCategory>) => {
    const categories = projectData.boardCategories || [];
    const id = categoryData.id || 'cat-' + Date.now();
    const newCategory: ProjectBoardCategory = {
      id,
      projectId: categoryData.projectId || activeProjectId,
      name: categoryData.name || 'New Category',
      description: categoryData.description || '',
      color: categoryData.color || 'indigo'
    };

    const existingIdx = categories.findIndex(c => c.id === id);
    let updatedCategories = [...categories];
    if (existingIdx >= 0) {
      updatedCategories[existingIdx] = newCategory;
    } else {
      updatedCategories.push(newCategory);
    }

    const updated = { ...projectData, boardCategories: updatedCategories };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
    addAuditNote(
      existingIdx >= 0 ? 'Updated Board Category' : 'Created Board Category',
      `Category "${newCategory.name}" saved on Project Board.`,
      'audit'
    );
  };

  const deleteBoardCategory = async (categoryId: string) => {
    const categories = projectData.boardCategories || [];
    const catToDelete = categories.find(c => c.id === categoryId);
    const updatedCategories = categories.filter(c => c.id !== categoryId);
    const items = projectData.boardItems || [];
    const updatedItems = items.map(item => item.categoryId === categoryId ? { ...item, categoryId: undefined } : item);

    const updated = { ...projectData, boardCategories: updatedCategories, boardItems: updatedItems };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
    if (catToDelete) {
      addAuditNote('Deleted Board Category', `Category "${catToDelete.name}" removed from Project Board.`, 'audit');
    }
  };

  const saveBoardItem = async (itemData: Partial<ProjectBoardItem>) => {
    const items = projectData.boardItems || [];
    const id = itemData.id || 'board-item-' + Date.now();
    const existingIdx = items.findIndex(i => i.id === id);

    const newItem: ProjectBoardItem = {
      id,
      projectId: itemData.projectId || activeProjectId,
      categoryId: itemData.categoryId,
      type: itemData.type || 'note',
      title: itemData.title || 'Untitled Board Item',
      content: itemData.content || '',
      url: itemData.url || '',
      fileName: itemData.fileName,
      fileSize: itemData.fileSize,
      fileType: itemData.fileType,
      tags: itemData.tags || [],
      color: itemData.color || 'indigo',
      createdBy: existingIdx >= 0 ? items[existingIdx].createdBy : (itemData.createdBy || currentUser.id),
      createdByName: existingIdx >= 0 ? items[existingIdx].createdByName : (itemData.createdByName || currentUser.name),
      createdByEmail: existingIdx >= 0 ? items[existingIdx].createdByEmail : (itemData.createdByEmail || currentUser.email),
      createdAt: existingIdx >= 0 ? items[existingIdx].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: itemData.isPinned ?? (existingIdx >= 0 ? items[existingIdx].isPinned : false)
    };

    let updatedItems = [...items];
    if (existingIdx >= 0) {
      updatedItems[existingIdx] = newItem;
    } else {
      updatedItems.unshift(newItem);
    }

    const updated = { ...projectData, boardItems: updatedItems };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
    addAuditNote(
      existingIdx >= 0 ? 'Updated Board Item' : 'Added Board Item',
      `${newItem.type.toUpperCase()}: "${newItem.title}" on Project Board.`,
      'audit'
    );
  };

  const deleteBoardItem = async (itemId: string) => {
    const items = projectData.boardItems || [];
    const itemToDelete = items.find(i => i.id === itemId);
    const updatedItems = items.filter(i => i.id !== itemId);
    const updated = { ...projectData, boardItems: updatedItems };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
    if (itemToDelete) {
      addAuditNote('Deleted Board Item', `${itemToDelete.type.toUpperCase()}: "${itemToDelete.title}" removed from Project Board.`, 'audit');
    }
  };

  const togglePinBoardItem = async (itemId: string) => {
    const items = projectData.boardItems || [];
    const updatedItems = items.map(item => item.id === itemId ? { ...item, isPinned: !item.isPinned } : item);
    const updated = { ...projectData, boardItems: updatedItems };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const addBoardItemComment = async (itemId: string, content: string) => {
    if (!content.trim()) return;
    const items = projectData.boardItems || [];
    const targetItem = items.find(i => i.id === itemId);
    if (!targetItem) return;

    const newComment: BoardItemComment = {
      id: 'cmt-' + Date.now(),
      itemId,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userAvatar: currentUser.avatar,
      userRole: currentUser.title || currentUser.role,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      reactions: {}
    };

    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          comments: [...(item.comments || []), newComment]
        };
      }
      return item;
    });

    const updated = { ...projectData, boardItems: updatedItems };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const deleteBoardItemComment = async (itemId: string, commentId: string) => {
    const items = projectData.boardItems || [];
    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          comments: (item.comments || []).filter(c => c.id !== commentId)
        };
      }
      return item;
    });

    const updated = { ...projectData, boardItems: updatedItems };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const toggleBoardItemCommentReaction = async (itemId: string, commentId: string, emoji: string) => {
    const items = projectData.boardItems || [];
    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        const comments = (item.comments || []).map(comment => {
          if (comment.id === commentId) {
            const reactions = { ...(comment.reactions || {}) };
            const users = reactions[emoji] || [];
            const userIndex = users.indexOf(currentUser.name);
            let updatedUsers: string[];
            if (userIndex >= 0) {
              updatedUsers = users.filter(u => u !== currentUser.name);
            } else {
              updatedUsers = [...users, currentUser.name];
            }
            if (updatedUsers.length > 0) {
              reactions[emoji] = updatedUsers;
            } else {
              delete reactions[emoji];
            }
            return { ...comment, reactions };
          }
          return comment;
        });
        return { ...item, comments };
      }
      return item;
    });

    const updated = { ...projectData, boardItems: updatedItems };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const addProjectChatMessage = async (msgData: Partial<ProjectChatMessage>) => {
    if (!msgData.content?.trim()) return;
    const messages = projectData.boardMessages || [];
    const newMsg: ProjectChatMessage = {
      id: 'msg-' + Date.now(),
      projectId: activeProjectId,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userAvatar: currentUser.avatar,
      userRole: currentUser.title || currentUser.role,
      content: msgData.content.trim(),
      createdAt: new Date().toISOString(),
      type: msgData.type || 'chat',
      linkedItemId: msgData.linkedItemId,
      linkedItemTitle: msgData.linkedItemTitle,
      isPinned: msgData.isPinned || false,
      reactions: {}
    };

    const updated = { ...projectData, boardMessages: [...messages, newMsg] };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const deleteProjectChatMessage = async (messageId: string) => {
    const messages = projectData.boardMessages || [];
    const updatedMessages = messages.filter(m => m.id !== messageId);
    const updated = { ...projectData, boardMessages: updatedMessages };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const toggleProjectChatMessageReaction = async (messageId: string, emoji: string) => {
    const messages = projectData.boardMessages || [];
    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId) {
        const reactions = { ...(msg.reactions || {}) };
        const users = reactions[emoji] || [];
        const userIndex = users.indexOf(currentUser.name);
        let updatedUsers: string[];
        if (userIndex >= 0) {
          updatedUsers = users.filter(u => u !== currentUser.name);
        } else {
          updatedUsers = [...users, currentUser.name];
        }
        if (updatedUsers.length > 0) {
          reactions[emoji] = updatedUsers;
        } else {
          delete reactions[emoji];
        }
        return { ...msg, reactions };
      }
      return msg;
    });

    const updated = { ...projectData, boardMessages: updatedMessages };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const togglePinProjectChatMessage = async (messageId: string) => {
    const messages = projectData.boardMessages || [];
    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId) {
        return { ...msg, isPinned: !msg.isPinned };
      }
      return msg;
    });

    const updated = { ...projectData, boardMessages: updatedMessages };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  return (
    <ProjectContext.Provider
      value={{
        projectData,
        projectsList,
        activeProjectId,
        metrics,
        isOffline,
        isWsConnected,
        theme,
        currentUser,
        allUsers,
        isAuthenticated,
        logout,
        toggleTheme,
        loginAsUser,
        createUserAccount,
        switchProject,
        createProject,
        deleteProject,
        updateProjectDetails,
        saveTask,
        deleteTask,
        saveSubtask,
        deleteSubtask,
        saveRaidItem,
        deleteRaidItem,
        saveStakeholder,
        deleteStakeholder,
        saveEpic,
        deleteEpic,
        saveFeature,
        deleteFeature,
        saveMilestone,
        deleteMilestone,
        saveChangeRequest,
        deleteChangeRequest,
        updateChangeRequestStatus,
        saveBoardCategory,
        deleteBoardCategory,
        saveBoardItem,
        deleteBoardItem,
        togglePinBoardItem,
        addBoardItemComment,
        deleteBoardItemComment,
        toggleBoardItemCommentReaction,
        addProjectChatMessage,
        deleteProjectChatMessage,
        toggleProjectChatMessageReaction,
        togglePinProjectChatMessage,
        importWbsData,
        resetToDefault,
        updateWidgets,
        updateStatusPercentages,
        addAuditNote,
        clearAuditLogs,
        customAiConfig,
        updateCustomAiConfig
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
