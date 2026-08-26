import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import localforage from 'localforage';
import {
  ProjectData,
  Task,
  RaidItem,
  Stakeholder,
  Feature,
  Epic,
  Milestone,
  UserStory,
  Subtask,
  Sprint,
  EVMMetrics,
  UserProfile,
  ProjectMeta,
  ActivityLog,
  ChangeRequest,
  ChangeRequestStatus,
  CustomAiConfig,
  TaskStatus,
  ProjectBoardCategory,
  ProjectBoardItem,
  BoardItemComment,
  ProjectChatMessage,
  PendingInvite,
  PMChecklistConfig,
  MemberLeave,
  LeaveStatus,
  OrganizationSettings,
  UserRole
} from '../types';
import { initialProjectData, defaultProjectsMap } from '../data/initialData';
import { calculateEVMMetrics } from '../utils/evm';
import {
  getTaskEffectiveValues,
  getStatusProgress,
  DEFAULT_STATUS_PERCENTAGES,
  calculateTimestampActualHours,
  calculateWbsTotalBudget,
  calculateWbsProjectEndDate,
  calculateSprintDates
} from '../utils/taskCalculations';
import {
  DEFAULT_ORG_SETTINGS,
  INITIAL_LEAVES,
  DEFAULT_RATE_CARDS
} from '../utils/portfolioAndLeaveUtils';
import { queryClient, queryKeys } from '../lib/queryClient';

export const ADMIN_STAKEHOLDER: Stakeholder = {
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
};

function syncProjectCalculatedAttributes(data: ProjectData): ProjectData {
  if (!data) return data;
  const tasks = data.tasks || [];
  const features = data.features || [];
  const userStories = data.userStories || [];
  const subtasks = data.subtasks || [];
  const stakeholders = data.stakeholders || [];
  const sprints = data.sprints || [];

  // Ensure Admin dummy stakeholder exists for every project
  let updatedStakeholders = stakeholders;
  let stakeholdersChanged = false;
  if (!stakeholders.some(s => s.id === 'sh-admin' || s.email?.toLowerCase() === 'admin@apex.io' || s.email?.toLowerCase() === 'sophia.m@apex.io')) {
    updatedStakeholders = [ADMIN_STAKEHOLDER, ...stakeholders];
    stakeholdersChanged = true;
  }

  const computedBudget = calculateWbsTotalBudget(tasks, subtasks, updatedStakeholders);
  const computedEndDate = calculateWbsProjectEndDate(data.startDate, tasks);
  const finalBudget = (data.budget && data.budget > 0) ? data.budget : (computedBudget > 0 ? computedBudget : 250000);

  let updatedSprints = sprints;
  let sprintsChanged = false;

  if (sprints.length > 0) {
    updatedSprints = sprints.map(sprint => {
      // If user manually set isAutoDates: false, do not override manually entered dates
      if (sprint.isAutoDates === false) return sprint;

      const calculated = calculateSprintDates(sprint.id, tasks, features, userStories);
      if (calculated) {
        if (sprint.startDate !== calculated.startDate || sprint.endDate !== calculated.endDate) {
          sprintsChanged = true;
          return {
            ...sprint,
            startDate: calculated.startDate,
            endDate: calculated.endDate,
            isAutoDates: true
          };
        }
      }
      return sprint;
    });
  }

  const userStoriesChanged = !data.userStories;

  if (data.budget === finalBudget && data.targetEndDate === computedEndDate && !sprintsChanged && !stakeholdersChanged && !userStoriesChanged) {
    return data;
  }

  return {
    ...data,
    userStories: userStories,
    budget: finalBudget,
    targetEndDate: computedEndDate,
    sprints: updatedSprints,
    stakeholders: updatedStakeholders
  };
}

// Configure localForage instance
localforage.config({
  name: 'ApexPM',
  storeName: 'apex_pm_store',
  description: 'ApexPM persistent storage for user modifications across sessions'
});

export const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'user-admin-1',
    name: 'Sophia Martinez',
    email: 'admin@apex.io',
    role: 'admin',
    title: 'Executive Portfolio Administrator & Head of PMO',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150',
    department: 'Executive PMO & Governance',
    hourlyRate: 175,
    weeklyCapacityHours: 40,
    skills: ['Portfolio Governance', 'EVM Analytics', 'Executive Strategy', 'Commercial Risk', 'PMI-PMP']
  },
  {
    id: 'user-pm-1',
    name: 'Alex Morgan',
    email: 'alex.m@apex.io',
    role: 'pm',
    title: 'Project Manager & Scrum Master',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    department: 'PMO',
    hourlyRate: 95,
    weeklyCapacityHours: 40,
    skills: ['Agile', 'Scrum', 'EVM', 'Risk Management']
  },
  {
    id: 'user-pm-2',
    name: 'Carlos Santana',
    email: 'carlos.s@apex.io',
    role: 'pm',
    title: 'Senior Technical Project Manager',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150',
    department: 'PMO',
    hourlyRate: 110,
    weeklyCapacityHours: 40,
    skills: ['Technical PM', 'Cloud Migrations', 'Capacity Planning', 'Jira']
  },
  {
    id: 'user-pm-3',
    name: 'Aisha Al-Mansoor',
    email: 'aisha.m@apex.io',
    role: 'pm',
    title: 'Agile Delivery Lead & Scrum Consultant',
    avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=150',
    department: 'PMO & Agile CoE',
    hourlyRate: 115,
    weeklyCapacityHours: 40,
    skills: ['Agile Coaching', 'Release Management', 'Kanban', 'Stakeholder Alignment']
  },
  {
    id: 'user-sh-3',
    name: 'Marcus Vance',
    email: 'marcus.v@apex.io',
    role: 'stakeholder',
    title: 'Senior Full Stack Engineer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    department: 'Engineering',
    hourlyRate: 110,
    weeklyCapacityHours: 40,
    skills: ['React', 'TypeScript', 'Node.js', 'WebSockets', 'GraphQL']
  },
  {
    id: 'user-sh-2',
    name: 'Dr. Elena Rostova',
    email: 'elena.r@apex.io',
    role: 'stakeholder',
    title: 'Principal Cloud Architect',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150',
    department: 'Architecture',
    hourlyRate: 130,
    weeklyCapacityHours: 35,
    skills: ['Cloud Architecture', 'Distributed Systems', 'Security', 'Kubernetes']
  },
  {
    id: 'user-sh-4',
    name: 'Priya Sharma',
    email: 'priya.s@apex.io',
    role: 'stakeholder',
    title: 'Lead UI/UX & Design Systems Designer',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
    department: 'Design',
    hourlyRate: 85,
    weeklyCapacityHours: 30,
    skills: ['Figma', 'Design Systems', 'User Research', 'Accessibility', 'Prototyping']
  },
  {
    id: 'user-sh-5',
    name: 'David Chen',
    email: 'david.c@apex.io',
    role: 'stakeholder',
    title: 'DevOps & Infrastructure Specialist',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    department: 'DevOps',
    hourlyRate: 90,
    weeklyCapacityHours: 40,
    skills: ['CI/CD', 'Kubernetes', 'Terraform', 'Automated QA', 'Docker']
  },
  {
    id: 'user-sh-6',
    name: 'Rachel Adams',
    email: 'rachel.a@apex.io',
    role: 'stakeholder',
    title: 'Principal Backend & Microservices Architect',
    avatar: 'https://images.unsplash.com/photo-1534751516642-a171edd25218?auto=format&fit=crop&q=80&w=150',
    department: 'Engineering',
    hourlyRate: 125,
    weeklyCapacityHours: 40,
    skills: ['Golang', 'PostgreSQL', 'Microservices', 'Kafka', 'Redis', 'High Throughput']
  },
  {
    id: 'user-sh-7',
    name: 'Liam O\'Connor',
    email: 'liam.o@apex.io',
    role: 'stakeholder',
    title: 'Senior Mobile & React Native Specialist',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=150',
    department: 'Engineering',
    hourlyRate: 105,
    weeklyCapacityHours: 40,
    skills: ['React Native', 'iOS', 'Android', 'TypeScript', 'Offline Sync']
  },
  {
    id: 'user-sh-8',
    name: 'Zoe Chen',
    email: 'zoe.c@apex.io',
    role: 'stakeholder',
    title: 'AI / ML & Data Analytics Specialist',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
    department: 'Data & AI',
    hourlyRate: 120,
    weeklyCapacityHours: 35,
    skills: ['Gemini API', 'LLM Fine-Tuning', 'Python', 'Vector DB', 'Prompt Engineering']
  },
  {
    id: 'user-sh-9',
    name: 'Samuel Wright',
    email: 'samuel.w@apex.io',
    role: 'stakeholder',
    title: 'Cybersecurity & Compliance Lead',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150',
    department: 'Security',
    hourlyRate: 135,
    weeklyCapacityHours: 40,
    skills: ['SOC2 Compliance', 'Zero Trust', 'Pen Testing', 'Cloud Security']
  },
  {
    id: 'user-sh-10',
    name: 'Kevin Taylor',
    email: 'kevin.t@apex.io',
    role: 'stakeholder',
    title: 'Lead Automation SDET & QA Architect',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150',
    department: 'Quality Assurance',
    hourlyRate: 95,
    weeklyCapacityHours: 40,
    skills: ['Playwright', 'Cypress', 'Performance Testing', 'Load Testing', 'CI Pipelines']
  },
  {
    id: 'user-sh-11',
    name: 'Maya Lin',
    email: 'maya.l@apex.io',
    role: 'stakeholder',
    title: 'Senior Product Owner & Business Analyst',
    avatar: 'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?auto=format&fit=crop&q=80&w=150',
    department: 'Product Management',
    hourlyRate: 100,
    weeklyCapacityHours: 40,
    skills: ['Requirements Gathering', 'User Story Mapping', 'UAT', 'Data Analytics']
  }
];

interface ProjectContextType {
  projectData: ProjectData;
  projectsList: ProjectMeta[];
  allProjectsMap: Record<string, ProjectData>;
  leaves: MemberLeave[];
  orgSettings: OrganizationSettings;
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
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  promoteUserRole: (userId: string, newRole: UserRole, newTitle?: string) => Promise<void>;
  assignProjectManager: (projectId: string, pmUserId: string) => Promise<void>;
  switchProject: (projectId: string) => Promise<void>;
  createProject: (newProject: Partial<ProjectData>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  updateProjectDetails: (details: Partial<ProjectData>) => Promise<void>;
  updatePMChecklist: (config: Partial<PMChecklistConfig>) => Promise<void>;
  validateAcceptanceCriterion: (taskId: string, criterionId: string, validated: boolean) => Promise<void>;
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
  saveUserStory: (story: Partial<UserStory>) => Promise<void>;
  deleteUserStory: (storyId: string) => Promise<void>;
  saveSprint: (sprint: Partial<Sprint>, assignedTaskIds?: string[], assignedFeatureIds?: string[], assignedStoryIds?: string[]) => Promise<void>;
  deleteSprint: (sprintId: string) => Promise<void>;
  assignTaskToSprint: (taskId: string, sprintId?: string) => Promise<void>;
  assignFeatureToSprint: (featureId: string, sprintId?: string) => Promise<void>;
  assignStoryToSprint: (storyId: string, sprintId?: string) => Promise<void>;
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
  saveLeave: (leave: Partial<MemberLeave>) => Promise<void>;
  deleteLeave: (leaveId: string) => Promise<void>;
  updateLeaveStatus: (leaveId: string, status: LeaveStatus, approverName?: string) => Promise<void>;
  updateOrgSettings: (settings: Partial<OrganizationSettings>) => Promise<void>;
  importWbsData: (
    parsed: {
      milestones: Milestone[];
      epics: Epic[];
      features: Feature[];
      userStories?: UserStory[];
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
  pendingInvite: PendingInvite | null;
  acceptPendingInvite: (userOverride?: UserProfile) => Promise<void>;
  clearPendingInvite: () => void;
  queryClient: typeof queryClient;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'apex_pm_project_data';
const THEME_STORAGE_KEY = 'apex_pm_theme';
const AI_CONFIG_STORAGE_KEY = 'apex_pm_custom_ai_config';
const USER_STORAGE_KEY = 'apex_pm_current_user';
const USERS_LIST_KEY = 'apex_pm_all_users';
const PROJECTS_LIST_KEY = 'apex_pm_projects_list';
const ACTIVE_PROJECT_ID_KEY = 'apex_pm_active_project_id';
const LEAVES_STORAGE_KEY = 'apex_pm_leaves';
const ORG_SETTINGS_KEY = 'apex_pm_org_settings';
const ALL_PROJECTS_MAP_KEY = 'apex_pm_all_projects_map';

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projectData, setProjectDataRaw] = useState<ProjectData>(() => {
    let baseData: ProjectData = { ...initialProjectData, id: 'proj-1' };
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        baseData = JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Failed to read cached project data:', e);
    }
    const merged = {
      ...baseData,
      statusPercentages: { ...DEFAULT_STATUS_PERCENTAGES, ...(baseData.statusPercentages || {}) }
    };
    return syncProjectCalculatedAttributes(merged);
  });

  const setProjectData = useCallback((action: ProjectData | ((prev: ProjectData) => ProjectData)) => {
    setProjectDataRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      const synced = syncProjectCalculatedAttributes(next);
      setAllProjectsMap(prevMap => ({
        ...prevMap,
        [synced.id || 'proj-1']: synced
      }));
      return synced;
    });
  }, []);

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const cached = localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
      if (cached) return cached;
    } catch (e) {
      // Ignore
    }
    return projectData.id || 'proj-1';
  });

  const [projectsList, setProjectsList] = useState<ProjectMeta[]>(() => {
    try {
      const cached = localStorage.getItem(PROJECTS_LIST_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // Ignore
    }
    return [
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
    ];
  });

  const [allProjectsMap, setAllProjectsMap] = useState<Record<string, ProjectData>>(() => {
    try {
      const cached = localStorage.getItem(ALL_PROJECTS_MAP_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return defaultProjectsMap;
  });

  const [leaves, setLeaves] = useState<MemberLeave[]>(() => {
    try {
      const cached = localStorage.getItem(LEAVES_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_LEAVES;
  });

  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>(() => {
    try {
      const cached = localStorage.getItem(ORG_SETTINGS_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return DEFAULT_ORG_SETTINGS;
  });

  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => {
    try {
      const cached = localStorage.getItem(USERS_LIST_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge missing DEFAULT_USERS into cached users so new bench talent and PMs are always accessible
          const existingEmails = new Set(parsed.map((u: UserProfile) => u.email?.toLowerCase()));
          const missingDefaults = DEFAULT_USERS.filter(d => !existingEmails.has(d.email?.toLowerCase()));
          const merged = [...parsed, ...missingDefaults];

          // Guarantee that at least one admin user exists and that admin@apex.io has role: 'admin'
          let updated = merged.map((u: UserProfile) => {
            if (u.email?.toLowerCase() === 'admin@apex.io' || u.id === 'user-admin-1') {
              return { ...u, role: 'admin' as UserRole };
            }
            return u;
          });
          if (!updated.some((u: UserProfile) => u.role === 'admin')) {
            updated = [DEFAULT_USERS[0], ...updated];
          }
          return updated;
        }
      }
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
    return DEFAULT_USERS[0]; // Default Sophia Martinez (Admin)
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

  // Async Hydration on mount using localForage
  useEffect(() => {
    let isMounted = true;
    async function loadLocalForageState() {
      try {
        const storedProjectData = await localforage.getItem<ProjectData>(LOCAL_STORAGE_KEY);
        if (isMounted && storedProjectData && storedProjectData.id) {
          setProjectData(storedProjectData);
          setActiveProjectId(storedProjectData.id);
        }
        const storedProjectsList = await localforage.getItem<ProjectMeta[]>(PROJECTS_LIST_KEY);
        if (isMounted && storedProjectsList && storedProjectsList.length > 0) {
          setProjectsList(storedProjectsList);
        }
        const storedActiveId = await localforage.getItem<string>(ACTIVE_PROJECT_ID_KEY);
        if (isMounted && storedActiveId && (!storedProjectData || storedProjectData.id === storedActiveId)) {
          setActiveProjectId(storedActiveId);
        }
        const storedUsers = await localforage.getItem<UserProfile[]>(USERS_LIST_KEY);
        if (isMounted && storedUsers && storedUsers.length > 0) {
          setAllUsers(storedUsers);
        }
        const storedUser = await localforage.getItem<UserProfile>(USER_STORAGE_KEY);
        if (isMounted && storedUser) {
          setCurrentUser(storedUser);
        }
        const storedAuth = await localforage.getItem<boolean>('apex_pm_is_authenticated');
        if (isMounted && storedAuth !== null) {
          setIsAuthenticated(storedAuth);
        }
        const storedAiConfig = await localforage.getItem<CustomAiConfig>(AI_CONFIG_STORAGE_KEY);
        if (isMounted && storedAiConfig) {
          setCustomAiConfig(storedAiConfig);
        }
      } catch (err) {
        console.warn('Error hydrating state from localForage on mount:', err);
      }
    }
    loadLocalForageState();
    return () => {
      isMounted = false;
    };
  }, []);

  const clientIdRef = useRef<string>('c_' + Math.random().toString(36).slice(2, 9));
  const localStorageDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const broadcastLocalTabSync = useCallback((data: ProjectData, pList?: ProjectMeta[], activeId?: string) => {
    try {
      const channel = new BroadcastChannel('apex_pm_sync_channel');
      channel.postMessage({
        type: 'LOCAL_STATE_UPDATE',
        data,
        projects: pList || projectsList,
        activeProjectId: activeId || activeProjectId,
        senderClientId: clientIdRef.current
      });
      channel.close();
    } catch (e) {
      // BroadcastChannel ignore fallback
    }
  }, [projectsList, activeProjectId]);

  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const project = params.get('project') || params.get('projectId') || params.get('code');
      const email = params.get('email');
      const token = params.get('token');
      const role = params.get('role');
      const name = params.get('name');

      if (project || email || token) {
        return {
          projectCode: project || undefined,
          email: email || undefined,
          token: token || undefined,
          role: role || 'Team Member',
          name: name || undefined
        };
      }
    } catch (e) {
      console.warn('Error reading URL invitation params:', e);
    }
    return null;
  });

  const clearPendingInvite = useCallback(() => {
    setPendingInvite(null);
    try {
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  const acceptPendingInvite = useCallback(async (userOverride?: UserProfile) => {
    const userToLogin = userOverride || currentUser;
    const inviteEmail = pendingInvite?.email || userToLogin.email;
    const inviteRole = pendingInvite?.role || userToLogin.title || 'Team Member';
    const inviteName = userToLogin.name || pendingInvite?.name || (inviteEmail ? inviteEmail.split('@')[0] : 'Team Contributor');

    setCurrentUser(userToLogin);
    setIsAuthenticated(true);

    if (!allUsers.some(u => u.email.toLowerCase() === userToLogin.email.toLowerCase())) {
      setAllUsers(prev => [...prev, userToLogin]);
    }

    const existingIdx = projectData.stakeholders.findIndex(
      s => (s.email && s.email.toLowerCase() === inviteEmail.toLowerCase()) || s.id === userToLogin.id
    );

    let updatedStakeholders = [...projectData.stakeholders];
    if (existingIdx >= 0) {
      updatedStakeholders[existingIdx] = {
        ...updatedStakeholders[existingIdx],
        name: inviteName,
        email: inviteEmail,
        status: 'active',
        isPlaceholder: false
      };
    } else {
      updatedStakeholders.push({
        id: userToLogin.id || `sh-inv-${Date.now()}`,
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        category: 'internal',
        avatar: userToLogin.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(inviteName)}`,
        hourlyRate: 85,
        weeklyCapacityHours: 40,
        skills: [inviteRole, 'Agile'],
        status: 'active',
        isPlaceholder: false
      });
    }

    const updatedData = {
      ...projectData,
      stakeholders: updatedStakeholders,
      activities: [
        {
          id: 'act-' + Date.now(),
          timestamp: new Date().toISOString(),
          user: inviteName,
          userEmail: inviteEmail,
          action: 'Accepted Project Invite',
          details: `Joined ${projectData.projectName || 'project'} team as ${inviteRole} via invitation link.`,
          category: 'stakeholder' as const
        },
        ...projectData.activities
      ]
    };

    setProjectData(updatedData);
    broadcastLocalTabSync(updatedData);

    if (pendingInvite?.projectCode) {
      const targetProj = projectsList.find(
        p => p.projectCode.toLowerCase() === pendingInvite.projectCode?.toLowerCase() || p.id === pendingInvite.projectCode
      );
      if (targetProj && targetProj.id !== activeProjectId) {
        setActiveProjectId(targetProj.id);
      }
    }

    clearPendingInvite();
  }, [currentUser, pendingInvite, allUsers, projectData, projectsList, activeProjectId, broadcastLocalTabSync, clearPendingInvite]);

  const updateCustomAiConfig = (config: CustomAiConfig) => {
    setCustomAiConfig(config);
    try {
      localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config));
      localforage.setItem(AI_CONFIG_STORAGE_KEY, config).catch(() => {});
    } catch (e) {
      console.error('Failed to save custom AI config:', e);
    }
  };

  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectAttempts = useRef<number>(0);
  const wsReconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const localForageTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state to local storage asynchronously and localForage with debounce
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_PROJECT_ID_KEY, activeProjectId);
      localStorage.setItem('apex_pm_is_authenticated', JSON.stringify(isAuthenticated));

      // Micro-debounce local storage serialization off the critical rendering path
      if (localStorageDebounceTimerRef.current) {
        clearTimeout(localStorageDebounceTimerRef.current);
      }
      localStorageDebounceTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projectData));
          localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(projectsList));
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
          localStorage.setItem(USERS_LIST_KEY, JSON.stringify(allUsers));
          localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(customAiConfig));
        } catch (e) {
          console.warn('Deferred localStorage save warning:', e);
        }
      }, 150);

      // Debounce heavy async IndexedDB writes
      if (localForageTimerRef.current) {
        clearTimeout(localForageTimerRef.current);
      }
      localForageTimerRef.current = setTimeout(() => {
        localforage.setItem(LOCAL_STORAGE_KEY, projectData).catch(() => {});
        localforage.setItem(PROJECTS_LIST_KEY, projectsList).catch(() => {});
        localforage.setItem(ACTIVE_PROJECT_ID_KEY, activeProjectId).catch(() => {});
        localforage.setItem(USER_STORAGE_KEY, currentUser).catch(() => {});
        localforage.setItem(USERS_LIST_KEY, allUsers).catch(() => {});
        localforage.setItem('apex_pm_is_authenticated', isAuthenticated).catch(() => {});
        localforage.setItem(AI_CONFIG_STORAGE_KEY, customAiConfig).catch(() => {});
      }, 400);
    } catch (e) {
      console.error('Failed to schedule local persistence:', e);
    }
  }, [projectData, projectsList, activeProjectId, currentUser, allUsers, isAuthenticated, customAiConfig]);

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

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    const updatedUser: UserProfile = {
      ...currentUser,
      ...updates
    };

    setCurrentUser(updatedUser);

    // Update in allUsers list
    const updatedAllUsers = allUsers.map(u => 
      u.id === updatedUser.id || (u.email && u.email.toLowerCase() === updatedUser.email.toLowerCase())
        ? updatedUser
        : u
    );
    setAllUsers(updatedAllUsers);

    // Also update matching stakeholder in projectData.stakeholders if present
    const matchingShIdx = projectData.stakeholders.findIndex(
      sh => sh.id === updatedUser.id || 
            (sh.email && sh.email.toLowerCase() === updatedUser.email.toLowerCase()) || 
            sh.id === `sh-${updatedUser.id.replace('user-', '')}`
    );

    let updatedStakeholders = [...projectData.stakeholders];
    if (matchingShIdx >= 0) {
      const existingSh = updatedStakeholders[matchingShIdx];
      updatedStakeholders[matchingShIdx] = {
        ...existingSh,
        name: updatedUser.name || existingSh.name,
        email: updatedUser.email || existingSh.email,
        avatar: updatedUser.avatar || existingSh.avatar,
        role: updatedUser.title || existingSh.role,
        hourlyRate: updatedUser.hourlyRate !== undefined ? updatedUser.hourlyRate : existingSh.hourlyRate,
        weeklyCapacityHours: updatedUser.weeklyCapacityHours !== undefined ? updatedUser.weeklyCapacityHours : existingSh.weeklyCapacityHours,
        skills: updatedUser.skills || existingSh.skills
      };
    }

    const updatedProjectData = {
      ...projectData,
      stakeholders: updatedStakeholders
    };

    setProjectData(updatedProjectData);
    broadcastLocalTabSync(updatedProjectData);

    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      localStorage.setItem(USERS_LIST_KEY, JSON.stringify(updatedAllUsers));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedProjectData));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    if (navigator.onLine) {
      try {
        await fetch('/api/project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: updatedProjectData })
        });
      } catch (err) {
        console.warn('Server sync failed, saved locally:', err);
      }
    }
  };

  // BroadcastChannel for multi-tab local offline sync
  useEffect(() => {
    const channel = new BroadcastChannel('apex_pm_sync_channel');
    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'LOCAL_STATE_UPDATE') {
        if (event.data.senderClientId && event.data.senderClientId === clientIdRef.current) {
          return;
        }
        if (event.data.data) setProjectData(event.data.data);
        if (event.data.activeProjectId) setActiveProjectId(event.data.activeProjectId);
        if (event.data.projects) setProjectsList(event.data.projects);
      }
    };
    return () => {
      channel.close();
    };
  }, []);

  // Setup WebSocket connection for real-time synchronization with exponential backoff
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsWsConnected(true);
        setIsOffline(false);
        wsReconnectAttempts.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.senderClientId && message.senderClientId === clientIdRef.current) {
            // Avoid duplicate tree re-render for locally triggered updates
            return;
          }
          if (message.type === 'INIT_STATE' || message.type === 'DATA_UPDATED') {
            if (message.data) {
              setProjectData(message.data);
              queryClient.setQueryData(queryKeys.project('active'), {
                activeProjectId: message.activeProjectId || message.data.id || 'proj-1',
                data: message.data
              });
              if (message.data.id) {
                queryClient.setQueryData(queryKeys.project(message.data.id), {
                  activeProjectId: message.data.id,
                  data: message.data
                });
              }
            }
            if (message.activeProjectId) setActiveProjectId(message.activeProjectId);
            if (message.projects) {
              setProjectsList(message.projects);
              queryClient.setQueryData(queryKeys.projectsList, {
                activeProjectId: message.activeProjectId || 'proj-1',
                projects: message.projects
              });
            }
            queryClient.invalidateQueries({ queryKey: queryKeys.allProjectsFull });
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      socket.onclose = () => {
        setIsWsConnected(false);
        if (wsReconnectTimerRef.current) clearTimeout(wsReconnectTimerRef.current);
        const delay = Math.min(15000, 2000 * Math.pow(1.5, wsReconnectAttempts.current));
        wsReconnectAttempts.current += 1;
        wsReconnectTimerRef.current = setTimeout(() => {
          if (navigator.onLine) {
            connectWebSocket();
          }
        }, delay);
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
      wsReconnectAttempts.current = 0;
      connectWebSocket();
    };
    const handleOffline = () => {
      setIsOffline(true);
      setIsWsConnected(false);
      if (wsReconnectTimerRef.current) clearTimeout(wsReconnectTimerRef.current);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    connectWebSocket();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (wsReconnectTimerRef.current) clearTimeout(wsReconnectTimerRef.current);
      if (localForageTimerRef.current) clearTimeout(localForageTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // Initial fetch from REST API with local persistence preference and TanStack Query cache priming
  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.projects) {
          setProjectsList(res.projects);
          queryClient.setQueryData(queryKeys.projectsList, {
            activeProjectId: res.activeProjectId || 'proj-1',
            projects: res.projects
          });
          if (res.activeProjectId && !localStorage.getItem(ACTIVE_PROJECT_ID_KEY)) {
            setActiveProjectId(res.activeProjectId);
          }
        }
      })
      .catch(() => {});

    fetch('/api/project')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          queryClient.setQueryData(queryKeys.project('active'), {
            activeProjectId: res.activeProjectId || res.data.id || 'proj-1',
            data: res.data
          });
          const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (!cached) {
            setProjectData(res.data);
          } else {
            // Push local modifications to server to ensure server matches local persistence
            try {
              const parsed = JSON.parse(cached);
              if (parsed && parsed.id) {
                fetch('/api/project', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ data: parsed })
                }).catch(() => {});
              }
            } catch (e) {
              setProjectData(res.data);
            }
          }
        }
      })
      .catch(err => {
        console.warn('Using local cached state due to network/server response:', err);
      });
  }, []);

  // Calculated EVM Metrics (Memoized for high-performance rendering)
  const metrics = useMemo(() => calculateEVMMetrics(
    projectData.tasks,
    projectData.budget,
    projectData.subtasks,
    projectData.stakeholders
  ), [projectData.tasks, projectData.budget, projectData.subtasks, projectData.stakeholders]);

  // Switch Active Project
  const switchProject = async (projectId: string) => {
    setActiveProjectId(projectId);

    // Immediate optimistic local update if target exists in allProjectsMap, default map, or cache
    const targetLocal = allProjectsMap[projectId] || defaultProjectsMap[projectId];
    if (targetLocal) {
      setProjectData(targetLocal);
      queryClient.setQueryData(queryKeys.project('active'), { activeProjectId: projectId, data: targetLocal });
      queryClient.setQueryData(queryKeys.project(projectId), { activeProjectId: projectId, data: targetLocal });
      broadcastLocalTabSync(targetLocal, projectsList, projectId);
    }

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
          queryClient.setQueryData(queryKeys.project('active'), { activeProjectId: json.activeProjectId || projectId, data: json.data });
          queryClient.setQueryData(queryKeys.project(projectId), { activeProjectId: projectId, data: json.data });
          broadcastLocalTabSync(json.data, projectsList, projectId);
        } else if (!targetLocal) {
          // If server switch returned error and we don't have local default, push active project state
          fetch('/api/project').then(r => r.json()).then(r => {
            if (r.data) {
              setProjectData(r.data);
              queryClient.setQueryData(queryKeys.project('active'), { activeProjectId: r.activeProjectId || projectId, data: r.data });
            }
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('Failed to switch project on server:', err);
      }
    }
  };

  // Create Project
  const createProject = async (newProjData: Partial<ProjectData>) => {
    const defaultCreatorStakeholder: Stakeholder = {
      id: `sh-pm-${Date.now()}`,
      name: currentUser.name || 'Project Manager',
      email: currentUser.email || 'pm@example.com',
      role: 'Project Manager (PM)',
      category: 'internal',
      avatar: currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.name || 'PM')}`,
      hourlyRate: currentUser.hourlyRate || 120,
      weeklyCapacityHours: currentUser.weeklyCapacityHours || 40,
      skills: currentUser.skills || ['Project Management', 'Agile', 'Scrum'],
      status: 'active',
      createdBy: currentUser.id,
      createdByEmail: currentUser.email
    };

    const rawStakeholders = newProjData.stakeholders && newProjData.stakeholders.length > 0
      ? [...newProjData.stakeholders]
      : [defaultCreatorStakeholder];
    
    if (!rawStakeholders.some(s => s.id === 'sh-admin' || s.email?.toLowerCase() === 'admin@apex.io')) {
      rawStakeholders.unshift(ADMIN_STAKEHOLDER);
    }

    const newProject: ProjectData = {
      id: 'proj-' + Date.now(),
      projectName: newProjData.projectName || 'New Agile Project',
      projectCode: newProjData.projectCode || 'PRJ-' + Math.floor(100 + Math.random() * 900),
      description: newProjData.description || '',
      startDate: newProjData.startDate || new Date().toISOString().split('T')[0],
      targetEndDate: newProjData.targetEndDate || new Date(Date.now() + 86400000 * 90).toISOString().split('T')[0],
      budget: typeof newProjData.budget === 'number' ? newProjData.budget : 150000,
      stakeholders: rawStakeholders,
      epics: newProjData.epics || [],
      features: newProjData.features || [],
      milestones: newProjData.milestones || [],
      tasks: newProjData.tasks || [],
      subtasks: newProjData.subtasks || [],
      raidItems: newProjData.raidItems || [],
      changeRequests: newProjData.changeRequests || [],
      boardCategories: newProjData.boardCategories || [],
      boardItems: newProjData.boardItems || [],
      boardMessages: newProjData.boardMessages || [],
      activities: newProjData.activities || [
        {
          id: 'act-' + Date.now(),
          timestamp: new Date().toISOString(),
          user: currentUser.name || 'System',
          action: 'Created Project',
          details: `Created new project: ${newProjData.projectName || 'New Agile Project'}`
        }
      ],
      widgets: newProjData.widgets || [
        { id: "pm-checklist", title: "PM Governance & Readiness Checklist", enabled: true, order: 1, width: "full" },
        { id: "evm", title: "EVM Financial Performance", enabled: true, order: 2, width: "full" },
        { id: "spi-cpi-gauges", title: "SPI / CPI Health Gauges", enabled: true, order: 3, width: "half" },
        { id: "workload", title: "Stakeholder Workload", enabled: true, order: 4, width: "half" },
        { id: "raid", title: "RAID Log Overview", enabled: true, order: 5, width: "half" },
        { id: "gantt-preview", title: "Timeline & Gantt", enabled: true, order: 6, width: "half" }
      ],
      pmChecklist: newProjData.pmChecklist || {
        scopeDetails: newProjData.description || '',
        stakeholderNotes: '',
        scheduleNotes: '',
        costNotes: '',
        dorNotes: '',
        dodNotes: '',
        dorCriteria: [],
        dodCriteria: [],
        customItems: []
      }
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
    queryClient.setQueryData(queryKeys.project('active'), { activeProjectId: newProject.id, data: newProject });
    queryClient.setQueryData(queryKeys.project(newProject.id), { activeProjectId: newProject.id, data: newProject });
    queryClient.setQueryData(queryKeys.projectsList, { activeProjectId: newProject.id, projects: newMetaList });
    queryClient.invalidateQueries({ queryKey: queryKeys.allProjectsFull });
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
    queryClient.setQueryData(queryKeys.projectsList, { activeProjectId, projects: updatedList });
    queryClient.invalidateQueries({ queryKey: queryKeys.allProjectsFull });

    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success && json.data) {
          setProjectData(json.data);
          setActiveProjectId(json.activeProjectId);
          queryClient.setQueryData(queryKeys.project('active'), { activeProjectId: json.activeProjectId, data: json.data });
          queryClient.setQueryData(queryKeys.project(json.activeProjectId), { activeProjectId: json.activeProjectId, data: json.data });
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
          body: JSON.stringify({ data: updated, senderClientId: clientIdRef.current })
        });
      } catch (err) {
        console.warn('Server sync failed, saved locally:', err);
      }
    }
  };

  const updatePMChecklist = async (config: Partial<PMChecklistConfig>) => {
    const updatedChecklist: PMChecklistConfig = {
      ...(projectData.pmChecklist || {}),
      ...config
    };
    const updated = { ...projectData, pmChecklist: updatedChecklist };
    setProjectData(updated);
    broadcastLocalTabSync(updated);

    if (navigator.onLine) {
      try {
        await fetch('/api/project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: updated, senderClientId: clientIdRef.current })
        });
      } catch (err) {
        console.warn('Server sync failed, saved locally:', err);
      }
    }
  };

  const validateAcceptanceCriterion = async (taskId: string, criterionId: string, validated: boolean) => {
    const targetTask = projectData.tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    const updatedCriteria = (targetTask.acceptanceCriteria || []).map(ac => {
      if (ac.id === criterionId) {
        return {
          ...ac,
          validated,
          validatedBy: validated ? `${currentUser.name} (${currentUser.role.toUpperCase()})` : undefined,
          validatedAt: validated ? new Date().toISOString().split('T')[0] : undefined
        };
      }
      return ac;
    });

    await saveTask({
      ...targetTask,
      acceptanceCriteria: updatedCriteria
    });
  };

  const saveTask = async (task: Partial<Task>) => {
    const taskId = task.id || 'task-' + Date.now();
    const existingTask = projectData.tasks.find(t => t.id === taskId);

    const hasStoryId = 'storyId' in task || 'userStoryId' in task;
    const hasFeatureId = 'featureId' in task;
    const hasEpicId = 'epicId' in task;
    const hasMilestoneId = 'milestoneId' in task;

    let targetStoryId = hasStoryId ? (task.storyId || task.userStoryId || undefined) : (existingTask?.storyId || existingTask?.userStoryId);
    let targetFeatureId = hasFeatureId ? (task.featureId || undefined) : existingTask?.featureId;
    let targetEpicId = hasEpicId ? (task.epicId || undefined) : existingTask?.epicId;
    let targetMilestoneId = hasMilestoneId ? (task.milestoneId || undefined) : existingTask?.milestoneId;

    if (targetStoryId) {
      const story = (projectData.userStories || []).find(s => s.id === targetStoryId);
      if (story) {
        if (story.featureId) targetFeatureId = story.featureId;
        if (story.epicId) targetEpicId = story.epicId;
        if (story.milestoneId) targetMilestoneId = story.milestoneId;
      }
    }

    if (targetFeatureId) {
      const feat = projectData.features.find(f => f.id === targetFeatureId);
      if (feat) {
        if (feat.epicId) targetEpicId = feat.epicId;
        if (feat.milestoneId) targetMilestoneId = feat.milestoneId;
        else if (feat.epicId) {
          const parentEpic = (projectData.epics || []).find(e => e.id === feat.epicId);
          if (parentEpic?.milestoneId) targetMilestoneId = parentEpic.milestoneId;
        }
      }
    } else if (targetEpicId) {
      const ep = (projectData.epics || []).find(e => e.id === targetEpicId);
      if (ep?.milestoneId) targetMilestoneId = ep.milestoneId;
    }

    let targetCRId = 'changeRequestId' in task ? (task.changeRequestId || undefined) : existingTask?.changeRequestId;
    if (!targetCRId) {
      if (targetStoryId) {
        const story = (projectData.userStories || []).find(s => s.id === targetStoryId);
        if (story?.changeRequestId) targetCRId = story.changeRequestId;
      }
      if (!targetCRId && targetFeatureId) {
        const feat = projectData.features.find(f => f.id === targetFeatureId);
        if (feat?.changeRequestId) targetCRId = feat.changeRequestId;
      }
      if (!targetCRId && targetEpicId) {
        const ep = (projectData.epics || []).find(e => e.id === targetEpicId);
        if (ep?.changeRequestId) targetCRId = ep.changeRequestId;
      }
      if (!targetCRId && targetMilestoneId) {
        const ms = projectData.milestones.find(m => m.id === targetMilestoneId);
        if (ms?.changeRequestId) targetCRId = ms.changeRequestId;
      }
    }

    const timestampCalc = calculateTimestampActualHours(task, existingTask);

    const tempTask: Task = {
      id: taskId,
      type: task.type || existingTask?.type || 'task',
      title: task.title || existingTask?.title || 'Untitled Task',
      description: task.description !== undefined ? task.description : (existingTask?.description || ''),
      storyId: targetStoryId,
      userStoryId: targetStoryId,
      epicId: targetEpicId,
      featureId: targetFeatureId,
      milestoneId: targetMilestoneId,
      sprintId: 'sprintId' in task ? task.sprintId : existingTask?.sprintId,
      status: task.status || existingTask?.status || 'todo',
      priority: task.priority || existingTask?.priority || 'normal',
      assigneeIds: task.assigneeIds !== undefined ? task.assigneeIds : (existingTask?.assigneeIds || []),
      startDate: task.startDate || existingTask?.startDate || new Date().toISOString().split('T')[0],
      dueDate: task.dueDate || existingTask?.dueDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      estimatedHours: task.estimatedHours !== undefined ? task.estimatedHours : (existingTask?.estimatedHours || 10),
      actualHours: timestampCalc.actualHours,
      inProgressAt: timestampCalc.inProgressAt,
      demoableAt: timestampCalc.demoableAt,
      plannedCost: existingTask?.plannedCost || 0,
      actualCost: existingTask?.actualCost || 0,
      completionPercent: task.completionPercent !== undefined ? task.completionPercent : (existingTask?.completionPercent ?? 0),
      dependencies: task.dependencies !== undefined ? task.dependencies : (existingTask?.dependencies || []),
      linkedBugIds: task.linkedBugIds || existingTask?.linkedBugIds || [],
      acceptanceCriteria: task.acceptanceCriteria !== undefined ? task.acceptanceCriteria : (existingTask?.acceptanceCriteria || []),
      tags: task.tags !== undefined ? task.tags : (existingTask?.tags || []),
      changeRequestId: targetCRId
    };

    const eff = getTaskEffectiveValues(tempTask, projectData.subtasks, projectData.stakeholders, projectData.statusPercentages);

    const statusChanged = existingTask && tempTask.status !== existingTask.status;

    let resolvedCompletionPercent = eff.completionPercent;
    if (!statusChanged && task.completionPercent !== undefined && task.completionPercent !== existingTask?.completionPercent) {
      resolvedCompletionPercent = task.completionPercent;
    }

    const newTask: Task = {
      ...tempTask,
      estimatedHours: eff.hasSubtasks ? eff.estimatedHours : tempTask.estimatedHours,
      actualHours: eff.hasSubtasks ? eff.actualHours : tempTask.actualHours,
      plannedCost: eff.plannedCost,
      actualCost: eff.actualCost,
      completionPercent: resolvedCompletionPercent
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
          body: JSON.stringify({ ...newTask, updatedBy: currentUser.name, senderClientId: clientIdRef.current })
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
        await fetch(`/api/tasks/${taskId}?senderClientId=${clientIdRef.current}`, { method: 'DELETE' });
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
          body: JSON.stringify({ ...newItem, senderClientId: clientIdRef.current })
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
        await fetch(`/api/raid/${id}?senderClientId=${clientIdRef.current}`, { method: 'DELETE' });
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

    const lowerEmail = newSh.email.toLowerCase();
    const existingIdx = projectData.stakeholders.findIndex(
      s => s.id === newSh.id || (!lowerEmail.includes('@placeholder') && s.email && s.email.toLowerCase() === lowerEmail)
    );
    const updatedStakeholders = [...projectData.stakeholders];
    if (existingIdx >= 0) {
      updatedStakeholders[existingIdx] = { ...updatedStakeholders[existingIdx], ...newSh };
    } else {
      updatedStakeholders.push(newSh);
    }

    const updated = { ...projectData, stakeholders: updatedStakeholders };
    setProjectData(updated);
    broadcastLocalTabSync(updated);

    // Keep global user registry synchronized with assigned members
    if (!lowerEmail.includes('@placeholder')) {
      setAllUsers(prevUsers => {
        const userIdx = prevUsers.findIndex(u => u.id === newSh.id || u.email.toLowerCase() === lowerEmail);
        let mappedUserRole: UserRole = 'stakeholder';
        const rLower = (newSh.role || '').toLowerCase();
        if (rLower.includes('admin') || rLower.includes('governance')) mappedUserRole = 'admin';
        else if (rLower.includes('project manager') || rLower.includes('scrum master') || rLower === 'pm') mappedUserRole = 'pm';

        if (userIdx >= 0) {
          const existing = prevUsers[userIdx];
          const updatedUser: UserProfile = {
            ...existing,
            name: newSh.name || existing.name,
            title: newSh.role || existing.title,
            hourlyRate: newSh.hourlyRate || existing.hourlyRate,
            weeklyCapacityHours: newSh.weeklyCapacityHours || existing.weeklyCapacityHours,
            skills: newSh.skills && newSh.skills.length > 0 ? newSh.skills : existing.skills,
            avatar: newSh.avatar || existing.avatar,
            role: existing.role === 'admin' ? 'admin' : (existing.role === 'pm' ? 'pm' : mappedUserRole)
          };
          const nextList = [...prevUsers];
          nextList[userIdx] = updatedUser;
          return nextList;
        } else {
          const newUser: UserProfile = {
            id: newSh.id.startsWith('user-') ? newSh.id : `user-${newSh.id}`,
            name: newSh.name,
            email: newSh.email,
            role: mappedUserRole,
            title: newSh.role,
            avatar: newSh.avatar,
            hourlyRate: newSh.hourlyRate,
            weeklyCapacityHours: newSh.weeklyCapacityHours,
            skills: newSh.skills,
            department: newSh.category === 'internal' ? 'Engineering' : 'External Partner'
          };
          return [...prevUsers, newUser];
        }
      });
    }

    if (navigator.onLine) {
      try {
        await fetch('/api/stakeholders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newSh, senderClientId: clientIdRef.current })
        });
      } catch (err) {
        console.warn('Failed to save stakeholder to server:', err);
      }
    }
  };

  const deleteStakeholder = async (id: string) => {
    const targetMember = projectData.stakeholders.find(s => s.id === id);
    const updatedStakeholders = projectData.stakeholders.filter(s => s.id !== id);
    const updatedTasks = projectData.tasks.map(t => ({
      ...t,
      assigneeIds: (t.assigneeIds || []).filter(aId => aId !== id)
    }));
    const updatedSubtasks = projectData.subtasks.map(st => 
      st.assigneeId === id ? { ...st, assigneeId: undefined } : st
    );

    const updated = {
      ...projectData,
      stakeholders: updatedStakeholders,
      tasks: updatedTasks,
      subtasks: updatedSubtasks,
      activities: [
        {
          id: 'act-' + Date.now(),
          timestamp: new Date().toISOString(),
          user: currentUser?.name || 'User',
          action: 'Removed Team Member',
          details: `Unassigned ${targetMember?.name || 'team member'} from project and returned to organization bench pool.`
        },
        ...projectData.activities
      ]
    };
    setProjectData(updated);
    broadcastLocalTabSync(updated);

    if (navigator.onLine) {
      try {
        await fetch(`/api/stakeholders/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderClientId: clientIdRef.current })
        });
      } catch (err) {
        console.warn('Failed to delete stakeholder on server:', err);
      }
    }
  };

  const saveEpic = async (epic: Partial<Epic>) => {
    let resolvedCRId = 'changeRequestId' in epic ? (epic.changeRequestId || undefined) : undefined;
    if (!resolvedCRId && epic.milestoneId) {
      const parentMs = projectData.milestones.find(m => m.id === epic.milestoneId);
      if (parentMs?.changeRequestId) resolvedCRId = parentMs.changeRequestId;
    }

    const newEpic: Epic = {
      id: epic.id || 'epic-' + Date.now(),
      title: epic.title || 'New Epic',
      description: epic.description || '',
      milestoneId: epic.milestoneId,
      status: epic.status || 'in_progress',
      color: epic.color || '#8b5cf6',
      changeRequestId: resolvedCRId
    };

    const epics = projectData.epics || [];
    const existingIdx = epics.findIndex(e => e.id === newEpic.id);
    const updatedEpics = [...epics];
    if (existingIdx >= 0) {
      updatedEpics[existingIdx] = newEpic;
    } else {
      updatedEpics.push(newEpic);
    }

    // Cascade milestone updates to features, stories, and tasks under this epic
    let updatedFeatures = [...projectData.features];
    updatedFeatures = updatedFeatures.map(f => {
      if (f.epicId === newEpic.id) {
        return {
          ...f,
          milestoneId: newEpic.milestoneId || f.milestoneId,
          changeRequestId: newEpic.changeRequestId || f.changeRequestId
        };
      }
      return f;
    });

    let updatedStories = [...(projectData.userStories || [])];
    updatedStories = updatedStories.map(s => {
      let match = false;
      if (s.epicId === newEpic.id) match = true;
      if (s.featureId) {
        const feat = updatedFeatures.find(f => f.id === s.featureId);
        if (feat && feat.epicId === newEpic.id) match = true;
      }
      if (match) {
        return {
          ...s,
          epicId: newEpic.id,
          milestoneId: newEpic.milestoneId || s.milestoneId,
          changeRequestId: newEpic.changeRequestId || s.changeRequestId
        };
      }
      return s;
    });

    let updatedTasks = [...projectData.tasks];
    updatedTasks = updatedTasks.map(t => {
      let match = false;
      if (t.epicId === newEpic.id) match = true;
      if (t.featureId) {
        const feat = updatedFeatures.find(f => f.id === t.featureId);
        if (feat && feat.epicId === newEpic.id) match = true;
      }
      const tStoryId = t.storyId || t.userStoryId;
      if (tStoryId) {
        const story = updatedStories.find(s => s.id === tStoryId);
        if (story && story.epicId === newEpic.id) match = true;
      }
      if (match) {
        return {
          ...t,
          epicId: newEpic.id,
          milestoneId: newEpic.milestoneId || t.milestoneId,
          changeRequestId: newEpic.changeRequestId || t.changeRequestId
        };
      }
      return t;
    });

    const updated = {
      ...projectData,
      epics: updatedEpics,
      features: updatedFeatures,
      userStories: updatedStories,
      tasks: updatedTasks
    };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const deleteEpic = async (epicId: string) => {
    const updatedEpics = (projectData.epics || []).filter(e => e.id !== epicId);
    const updatedFeatures = projectData.features.map(f => f.epicId === epicId ? { ...f, epicId: undefined } : f);
    const updatedStories = (projectData.userStories || []).map(s => s.epicId === epicId ? { ...s, epicId: undefined } : s);
    const updatedTasks = projectData.tasks.map(t => t.epicId === epicId ? { ...t, epicId: undefined } : t);
    const updated = { ...projectData, epics: updatedEpics, features: updatedFeatures, userStories: updatedStories, tasks: updatedTasks };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const saveFeature = async (feature: Partial<Feature>) => {
    let resolvedMilestoneId = feature.milestoneId;
    if (feature.epicId && !resolvedMilestoneId) {
      const parentEpic = (projectData.epics || []).find(e => e.id === feature.epicId);
      if (parentEpic?.milestoneId) resolvedMilestoneId = parentEpic.milestoneId;
    }

    let resolvedCRId = 'changeRequestId' in feature ? (feature.changeRequestId || undefined) : undefined;
    if (!resolvedCRId) {
      if (feature.epicId) {
        const parentEpic = (projectData.epics || []).find(e => e.id === feature.epicId);
        if (parentEpic?.changeRequestId) resolvedCRId = parentEpic.changeRequestId;
      }
      if (!resolvedCRId && resolvedMilestoneId) {
        const parentMs = projectData.milestones.find(m => m.id === resolvedMilestoneId);
        if (parentMs?.changeRequestId) resolvedCRId = parentMs.changeRequestId;
      }
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
      color: feature.color || '#3b82f6',
      changeRequestId: resolvedCRId
    };

    const existingIdx = projectData.features.findIndex(f => f.id === newFeature.id);
    const updatedFeatures = [...projectData.features];
    if (existingIdx >= 0) {
      updatedFeatures[existingIdx] = newFeature;
    } else {
      updatedFeatures.push(newFeature);
    }

    // Cascade updates to child user stories
    let updatedStories = [...(projectData.userStories || [])];
    updatedStories = updatedStories.map(s => {
      if (s.featureId === newFeature.id) {
        return {
          ...s,
          epicId: newFeature.epicId || s.epicId,
          milestoneId: newFeature.milestoneId || s.milestoneId,
          changeRequestId: newFeature.changeRequestId || s.changeRequestId
        };
      }
      return s;
    });

    // Cascade updates to child tasks automatically
    const updatedTasks = projectData.tasks.map(t => {
      const tStoryId = t.storyId || t.userStoryId;
      const childOfStory = tStoryId ? updatedStories.some(s => s.id === tStoryId && s.featureId === newFeature.id) : false;
      if (t.featureId === newFeature.id || childOfStory) {
        return {
          ...t,
          featureId: newFeature.id,
          epicId: newFeature.epicId || t.epicId,
          milestoneId: newFeature.milestoneId || t.milestoneId,
          changeRequestId: newFeature.changeRequestId || t.changeRequestId
        };
      }
      return t;
    });

    const updated = { ...projectData, features: updatedFeatures, userStories: updatedStories, tasks: updatedTasks };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const deleteFeature = async (featureId: string) => {
    const updatedFeatures = projectData.features.filter(f => f.id !== featureId);
    const updatedStories = (projectData.userStories || []).map(s => s.featureId === featureId ? { ...s, featureId: undefined } : s);
    const updatedTasks = projectData.tasks.map(t => t.featureId === featureId ? { ...t, featureId: undefined } : t);
    const updated = { ...projectData, features: updatedFeatures, userStories: updatedStories, tasks: updatedTasks };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const saveUserStory = async (story: Partial<UserStory>) => {
    let resolvedFeatureId = story.featureId;
    let resolvedEpicId = story.epicId;
    let resolvedMilestoneId = story.milestoneId;

    if (resolvedFeatureId) {
      const parentFeat = projectData.features.find(f => f.id === resolvedFeatureId);
      if (parentFeat) {
        if (!resolvedEpicId && parentFeat.epicId) resolvedEpicId = parentFeat.epicId;
        if (!resolvedMilestoneId && parentFeat.milestoneId) resolvedMilestoneId = parentFeat.milestoneId;
      }
    }
    if (resolvedEpicId && !resolvedMilestoneId) {
      const parentEpic = (projectData.epics || []).find(e => e.id === resolvedEpicId);
      if (parentEpic?.milestoneId) resolvedMilestoneId = parentEpic.milestoneId;
    }

    let resolvedCRId = 'changeRequestId' in story ? (story.changeRequestId || undefined) : undefined;
    if (!resolvedCRId) {
      if (resolvedFeatureId) {
        const parentFeat = projectData.features.find(f => f.id === resolvedFeatureId);
        if (parentFeat?.changeRequestId) resolvedCRId = parentFeat.changeRequestId;
      }
      if (!resolvedCRId && resolvedEpicId) {
        const parentEpic = (projectData.epics || []).find(e => e.id === resolvedEpicId);
        if (parentEpic?.changeRequestId) resolvedCRId = parentEpic.changeRequestId;
      }
      if (!resolvedCRId && resolvedMilestoneId) {
        const parentMs = projectData.milestones.find(m => m.id === resolvedMilestoneId);
        if (parentMs?.changeRequestId) resolvedCRId = parentMs.changeRequestId;
      }
    }

    const newStory: UserStory = {
      id: story.id || 'story-' + Date.now(),
      title: story.title || 'New User Story',
      description: story.description || '',
      acceptanceCriteria: Array.isArray(story.acceptanceCriteria) ? story.acceptanceCriteria : [],
      featureId: resolvedFeatureId,
      epicId: resolvedEpicId,
      milestoneId: resolvedMilestoneId,
      sprintId: story.sprintId,
      status: story.status || 'in_progress',
      priority: story.priority || 'normal',
      storyPoints: story.storyPoints !== undefined ? story.storyPoints : 3,
      targetReleaseDate: story.targetReleaseDate || new Date().toISOString().split('T')[0],
      color: story.color || '#10b981',
      changeRequestId: resolvedCRId
    };

    const stories = projectData.userStories || [];
    const existingIdx = stories.findIndex(s => s.id === newStory.id);
    const updatedStories = [...stories];
    if (existingIdx >= 0) {
      updatedStories[existingIdx] = newStory;
    } else {
      updatedStories.push(newStory);
    }

    // Cascade updates to child tasks
    const updatedTasks = projectData.tasks.map(t => {
      if (t.storyId === newStory.id || t.userStoryId === newStory.id) {
        return {
          ...t,
          storyId: newStory.id,
          userStoryId: newStory.id,
          featureId: newStory.featureId || t.featureId,
          epicId: newStory.epicId || t.epicId,
          milestoneId: newStory.milestoneId || t.milestoneId,
          changeRequestId: newStory.changeRequestId || t.changeRequestId
        };
      }
      return t;
    });

    const updated = {
      ...projectData,
      userStories: updatedStories,
      tasks: updatedTasks
    };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const deleteUserStory = async (storyId: string) => {
    const updatedStories = (projectData.userStories || []).filter(s => s.id !== storyId);
    const updatedTasks = projectData.tasks.map(t => (t.storyId === storyId || t.userStoryId === storyId) ? { ...t, storyId: undefined, userStoryId: undefined } : t);
    const updated = { ...projectData, userStories: updatedStories, tasks: updatedTasks };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const saveSprint = async (
    sprint: Partial<Sprint>,
    assignedTaskIds?: string[],
    assignedFeatureIds?: string[],
    assignedStoryIds?: string[]
  ) => {
    setProjectData(prev => {
      const existingSprints = prev.sprints || [];
      const sprintId = sprint.id || 'sprint-' + Date.now();

      const isAuto = sprint.isAutoDates !== undefined ? sprint.isAutoDates : true;

      // 1. Update Features
      let updatedFeatures = prev.features || [];
      if (assignedFeatureIds !== undefined) {
        updatedFeatures = updatedFeatures.map(f => {
          const isSelected = assignedFeatureIds.includes(f.id);
          if (isSelected && f.sprintId !== sprintId) {
            return { ...f, sprintId };
          } else if (!isSelected && f.sprintId === sprintId) {
            return { ...f, sprintId: undefined };
          }
          return f;
        });
      }

      // 2. Update User Stories
      let updatedStories = prev.userStories || [];
      if (assignedStoryIds !== undefined) {
        updatedStories = updatedStories.map(s => {
          const isSelected = assignedStoryIds.includes(s.id);
          if (isSelected && s.sprintId !== sprintId) {
            return { ...s, sprintId };
          } else if (!isSelected && s.sprintId === sprintId) {
            return { ...s, sprintId: undefined };
          }
          return s;
        });
      } else if (assignedFeatureIds !== undefined) {
        const selectedFeatureSet = new Set(assignedFeatureIds);
        updatedStories = updatedStories.map(s => {
          if (s.featureId && selectedFeatureSet.has(s.featureId)) {
            return { ...s, sprintId };
          } else if (s.featureId && !selectedFeatureSet.has(s.featureId) && s.sprintId === sprintId) {
            return { ...s, sprintId: undefined };
          }
          return s;
        });
      }

      // 3. Update Tasks
      let updatedTasks = prev.tasks || [];

      if (assignedStoryIds !== undefined) {
        const selectedStorySet = new Set(assignedStoryIds);
        updatedTasks = updatedTasks.map(t => {
          const tStoryId = t.storyId || t.userStoryId;
          if (tStoryId && selectedStorySet.has(tStoryId)) {
            return { ...t, sprintId };
          } else if (tStoryId && !selectedStorySet.has(tStoryId) && t.sprintId === sprintId) {
            return { ...t, sprintId: undefined };
          }
          return t;
        });
      } else if (assignedFeatureIds !== undefined) {
        const selectedFeatureSet = new Set(assignedFeatureIds);
        updatedTasks = updatedTasks.map(t => {
          if (t.featureId && selectedFeatureSet.has(t.featureId)) {
            return { ...t, sprintId };
          } else if (t.featureId && !selectedFeatureSet.has(t.featureId) && t.sprintId === sprintId) {
            return { ...t, sprintId: undefined };
          }
          return t;
        });
      }

      if (assignedTaskIds !== undefined) {
        updatedTasks = updatedTasks.map(t => {
          const isSelected = assignedTaskIds.includes(t.id);
          if (isSelected && t.sprintId !== sprintId) {
            return { ...t, sprintId };
          } else if (!isSelected && t.sprintId === sprintId && !t.featureId && !t.storyId && !t.userStoryId) {
            return { ...t, sprintId: undefined };
          }
          return t;
        });
      }

      const autoCalc = calculateSprintDates(sprintId, updatedTasks, updatedFeatures, updatedStories);
      const defaultStart = prev.startDate || new Date().toISOString().split('T')[0];
      const defaultEnd = prev.targetEndDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

      const finalStartDate = isAuto && autoCalc ? autoCalc.startDate : (sprint.startDate || autoCalc?.startDate || defaultStart);
      const finalEndDate = isAuto && autoCalc ? autoCalc.endDate : (sprint.endDate || autoCalc?.endDate || defaultEnd);

      const newSprint: Sprint = {
        id: sprintId,
        name: sprint.name || `Sprint ${existingSprints.length + 1}`,
        goal: sprint.goal || '',
        status: sprint.status || 'future',
        startDate: finalStartDate,
        endDate: finalEndDate,
        isAutoDates: isAuto,
        capacityPoints: sprint.capacityPoints || 40
      };

      const existingIdx = existingSprints.findIndex(s => s.id === newSprint.id);
      const updatedSprints = [...existingSprints];
      if (existingIdx >= 0) {
        updatedSprints[existingIdx] = newSprint;
      } else {
        updatedSprints.push(newSprint);
      }

      const updated = {
        ...prev,
        sprints: updatedSprints,
        features: updatedFeatures,
        userStories: updatedStories,
        tasks: updatedTasks,
        activities: [
          {
            id: 'act-' + Date.now(),
            timestamp: new Date().toISOString(),
            user: currentUser.name,
            action: existingIdx >= 0 ? 'Updated Sprint' : 'Created Sprint',
            details: `${newSprint.name} (${newSprint.startDate} to ${newSprint.endDate})`
          },
          ...(prev.activities || [])
        ]
      };

      broadcastLocalTabSync(updated);
      return updated;
    });
  };

  const deleteSprint = async (sprintId: string) => {
    setProjectData(prev => {
      const updatedSprints = (prev.sprints || []).filter(s => s.id !== sprintId);
      const updatedTasks = prev.tasks.map(t => t.sprintId === sprintId ? { ...t, sprintId: undefined } : t);
      const updatedFeatures = prev.features.map(f => f.sprintId === sprintId ? { ...f, sprintId: undefined } : f);
      const updatedStories = (prev.userStories || []).map(s => s.sprintId === sprintId ? { ...s, sprintId: undefined } : s);

      const updated = {
        ...prev,
        sprints: updatedSprints,
        tasks: updatedTasks,
        features: updatedFeatures,
        userStories: updatedStories
      };
      broadcastLocalTabSync(updated);
      return updated;
    });
  };

  const assignTaskToSprint = async (taskId: string, sprintId?: string) => {
    setProjectData(prev => {
      const updatedTasks = prev.tasks.map(t => t.id === taskId ? { ...t, sprintId } : t);
      const updated = { ...prev, tasks: updatedTasks };
      broadcastLocalTabSync(updated);
      return updated;
    });
  };

  const assignFeatureToSprint = async (featureId: string, sprintId?: string) => {
    setProjectData(prev => {
      const updatedFeatures = prev.features.map(f => f.id === featureId ? { ...f, sprintId } : f);
      const updatedStories = (prev.userStories || []).map(s => s.featureId === featureId ? { ...s, sprintId } : s);
      const updatedTasks = prev.tasks.map(t => t.featureId === featureId ? { ...t, sprintId } : t);
      const updated = { ...prev, features: updatedFeatures, userStories: updatedStories, tasks: updatedTasks };
      broadcastLocalTabSync(updated);
      return updated;
    });
  };

  const assignStoryToSprint = async (storyId: string, sprintId?: string) => {
    setProjectData(prev => {
      const updatedStories = (prev.userStories || []).map(s => s.id === storyId ? { ...s, sprintId } : s);
      const updatedTasks = prev.tasks.map(t => (t.storyId === storyId || t.userStoryId === storyId) ? { ...t, sprintId } : t);
      const updated = { ...prev, userStories: updatedStories, tasks: updatedTasks };
      broadcastLocalTabSync(updated);
      return updated;
    });
  };

  const saveMilestone = async (milestone: Partial<Milestone>) => {
    const newMilestone: Milestone = {
      id: milestone.id || 'm-' + Date.now(),
      title: milestone.title || 'New Milestone',
      description: milestone.description || '',
      featureId: milestone.featureId,
      epicId: milestone.epicId,
      dueDate: milestone.dueDate || new Date().toISOString().split('T')[0],
      status: milestone.status || 'upcoming',
      baselineCost: milestone.baselineCost || 10000,
      actualCost: milestone.actualCost || 0,
      changeRequestId: milestone.changeRequestId || undefined
    };

    const existingIdx = projectData.milestones.findIndex(m => m.id === newMilestone.id);
    const updatedMilestones = [...projectData.milestones];
    if (existingIdx >= 0) {
      updatedMilestones[existingIdx] = newMilestone;
    } else {
      updatedMilestones.push(newMilestone);
    }

    // Cascade changeRequestId (and milestone updates) to lower hierarchy Epics, Features, Stories, Tasks
    const updatedEpics = (projectData.epics || []).map(e => {
      if (e.milestoneId === newMilestone.id) {
        return {
          ...e,
          changeRequestId: newMilestone.changeRequestId || e.changeRequestId
        };
      }
      return e;
    });

    const updatedFeatures = projectData.features.map(f => {
      const parentEp = f.epicId ? updatedEpics.find(e => e.id === f.epicId) : undefined;
      if (f.milestoneId === newMilestone.id || parentEp?.milestoneId === newMilestone.id) {
        return {
          ...f,
          changeRequestId: newMilestone.changeRequestId || f.changeRequestId
        };
      }
      return f;
    });

    const updatedStories = (projectData.userStories || []).map(s => {
      const parentFeat = s.featureId ? updatedFeatures.find(f => f.id === s.featureId) : undefined;
      const parentEp = s.epicId ? updatedEpics.find(e => e.id === s.epicId) : undefined;
      if (s.milestoneId === newMilestone.id || parentFeat?.milestoneId === newMilestone.id || parentEp?.milestoneId === newMilestone.id) {
        return {
          ...s,
          changeRequestId: newMilestone.changeRequestId || s.changeRequestId
        };
      }
      return s;
    });

    const updatedTasks = projectData.tasks.map(t => {
      const tStoryId = t.storyId || t.userStoryId;
      const parentStory = tStoryId ? updatedStories.find(s => s.id === tStoryId) : undefined;
      const parentFeat = t.featureId ? updatedFeatures.find(f => f.id === t.featureId) : undefined;
      const parentEp = t.epicId ? updatedEpics.find(e => e.id === t.epicId) : undefined;
      if (
        t.milestoneId === newMilestone.id ||
        parentStory?.milestoneId === newMilestone.id ||
        parentFeat?.milestoneId === newMilestone.id ||
        parentEp?.milestoneId === newMilestone.id
      ) {
        return {
          ...t,
          changeRequestId: newMilestone.changeRequestId || t.changeRequestId
        };
      }
      return t;
    });

    const updated = {
      ...projectData,
      milestones: updatedMilestones,
      epics: updatedEpics,
      features: updatedFeatures,
      userStories: updatedStories,
      tasks: updatedTasks
    };
    setProjectData(updated);
    broadcastLocalTabSync(updated);
  };

  const deleteMilestone = async (milestoneId: string) => {
    const updatedMilestones = projectData.milestones.filter(m => m.id !== milestoneId);
    const updatedEpics = (projectData.epics || []).map(e => e.milestoneId === milestoneId ? { ...e, milestoneId: undefined } : e);
    const updatedFeatures = projectData.features.map(f => f.milestoneId === milestoneId ? { ...f, milestoneId: undefined } : f);
    const updatedStories = (projectData.userStories || []).map(s => s.milestoneId === milestoneId ? { ...s, milestoneId: undefined } : s);
    const updatedTasks = projectData.tasks.map(t => t.milestoneId === milestoneId ? { ...t, milestoneId: undefined } : t);

    const updated = {
      ...projectData,
      milestones: updatedMilestones,
      epics: updatedEpics,
      features: updatedFeatures,
      userStories: updatedStories,
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
    const newPercentages: Record<TaskStatus, number> = { ...DEFAULT_STATUS_PERCENTAGES };
    (Object.keys(DEFAULT_STATUS_PERCENTAGES) as TaskStatus[]).forEach(status => {
      if (percentages[status] !== undefined && percentages[status] !== null) {
        const val = Number(percentages[status]);
        if (!isNaN(val)) {
          newPercentages[status] = Math.min(100, Math.max(0, val));
        }
      }
    });

    const updatedTasks = projectData.tasks.map(task => {
      const newPct = getStatusProgress(task.status, newPercentages);
      return { ...task, completionPercent: newPct };
    });

    await updateProjectDetails({
      statusPercentages: newPercentages,
      tasks: updatedTasks
    });
    addAuditNote('Status Percentages Updated', 'Project Manager updated task completion thresholds.', 'wbs');
  };

  const importWbsData = async (
    parsed: {
      milestones: Milestone[];
      epics: Epic[];
      features: Feature[];
      userStories?: UserStory[];
      tasks: Task[];
      subtasks: Subtask[];
      raidItems: RaidItem[];
    },
    mode: 'replace' | 'merge' = 'replace'
  ) => {
    let updatedMilestones = [...(projectData.milestones || [])];
    let updatedEpics = [...(projectData.epics || [])];
    let updatedFeatures = [...(projectData.features || [])];
    let updatedStories = [...(projectData.userStories || [])];
    let updatedTasks = [...(projectData.tasks || [])];
    let updatedSubtasks = [...(projectData.subtasks || [])];
    let updatedRaidItems = [...(projectData.raidItems || [])];

    if (mode === 'replace') {
      if (parsed.milestones.length > 0) updatedMilestones = parsed.milestones;
      if (parsed.epics.length > 0) updatedEpics = parsed.epics;
      if (parsed.features.length > 0) updatedFeatures = parsed.features;
      if (parsed.userStories && parsed.userStories.length > 0) updatedStories = parsed.userStories;
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

      if (parsed.userStories) {
        parsed.userStories.forEach(s => {
          const idx = updatedStories.findIndex(item => item.id === s.id || item.title.toLowerCase() === s.title.toLowerCase());
          if (idx >= 0) updatedStories[idx] = { ...updatedStories[idx], ...s };
          else updatedStories.push(s);
        });
      }

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
      userStories: updatedStories,
      tasks: updatedTasks,
      subtasks: updatedSubtasks,
      raidItems: updatedRaidItems
    };

    setProjectData(updatedData);
    broadcastLocalTabSync(updatedData);

    addAuditNote(
      'CSV WBS Data Feed Imported',
      `Imported WBS dataset (${parsed.tasks.length} tasks, ${parsed.userStories?.length || 0} user stories, ${parsed.features.length} features, ${parsed.epics.length} epics, ${parsed.milestones.length} milestones) in ${mode} mode.`,
      'wbs'
    );
  };

  const resetToDefault = async () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(USERS_LIST_KEY);
      localStorage.removeItem(PROJECTS_LIST_KEY);
      localStorage.removeItem(ACTIVE_PROJECT_ID_KEY);
      localStorage.removeItem('apex_pm_is_authenticated');
      await localforage.clear();
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

  // Leave & Availability Management Handlers
  const saveLeave = async (leaveData: Partial<MemberLeave>) => {
    const isHourly = leaveData.durationType === 'hours';
    const applicantUser = allUsers.find(u => u.id === leaveData.userId || u.email?.toLowerCase() === leaveData.userEmail?.toLowerCase()) || currentUser;
    const applicantRole = leaveData.applicantRole || applicantUser.role || 'stakeholder';
    const isPMApplicant = applicantRole === 'pm';
    
    // Auto-approve if created directly by Executive Admin for someone else or self;
    // If created by PM, it must route to Executive Admin for sign-off (pending).
    // If created by Team Member, it routes to PM / Admin (pending).
    let initialStatus: LeaveStatus = leaveData.status || 'pending';
    if (!leaveData.status) {
      if (currentUser.role === 'admin' && (leaveData.userId === currentUser.id || leaveData.approvedBy)) {
        initialStatus = 'approved';
      } else {
        initialStatus = 'pending';
      }
    }

    const calculatedHours = isHourly
      ? (leaveData.hoursCount || 2)
      : (leaveData.hoursCount || (leaveData.daysCount ? leaveData.daysCount * 8 : 8));

    const calculatedDays = isHourly
      ? Math.round((calculatedHours / 8) * 100) / 100
      : (leaveData.daysCount || 1);

    const newLeave: MemberLeave = {
      id: leaveData.id || 'leave-' + Date.now(),
      userId: leaveData.userId || currentUser.id,
      userName: leaveData.userName || currentUser.name,
      userEmail: leaveData.userEmail || currentUser.email,
      userAvatar: leaveData.userAvatar || currentUser.avatar,
      role: leaveData.role || currentUser.title || currentUser.role,
      leaveType: leaveData.leaveType || 'vacation',
      durationType: leaveData.durationType || 'days',
      timeRange: leaveData.timeRange,
      startDate: leaveData.startDate || new Date().toISOString().split('T')[0],
      endDate: isHourly ? (leaveData.startDate || new Date().toISOString().split('T')[0]) : (leaveData.endDate || new Date().toISOString().split('T')[0]),
      daysCount: calculatedDays,
      hoursCount: calculatedHours,
      status: initialStatus,
      applicantRole: applicantRole,
      approverRoleRequired: isPMApplicant ? 'admin' : 'pm',
      reason: leaveData.reason || '',
      substituteUserId: leaveData.substituteUserId,
      substituteUserName: leaveData.substituteUserName,
      impactedProjectIds: leaveData.impactedProjectIds || [activeProjectId],
      createdAt: leaveData.createdAt || new Date().toISOString(),
      approvedBy: initialStatus === 'approved' ? (leaveData.approvedBy || currentUser.name) : undefined,
      approvedAt: initialStatus === 'approved' ? (leaveData.approvedAt || new Date().toISOString()) : undefined
    };

    const existingIdx = leaves.findIndex(l => l.id === newLeave.id);
    let updatedLeaves: MemberLeave[];
    if (existingIdx >= 0) {
      updatedLeaves = [...leaves];
      updatedLeaves[existingIdx] = newLeave;
    } else {
      updatedLeaves = [newLeave, ...leaves];
    }

    setLeaves(updatedLeaves);
    try {
      localStorage.setItem(LEAVES_STORAGE_KEY, JSON.stringify(updatedLeaves));
      await localforage.setItem(LEAVES_STORAGE_KEY, updatedLeaves);
    } catch (e) {
      console.warn('Failed to persist leaves:', e);
    }

    const durationLabel = newLeave.durationType === 'hours'
      ? `${newLeave.hoursCount}h partial day off on ${newLeave.startDate}${newLeave.timeRange ? ` (${newLeave.timeRange})` : ''}`
      : `${newLeave.daysCount} day(s) from ${newLeave.startDate} to ${newLeave.endDate}`;

    addAuditNote(
      existingIdx >= 0 ? 'Updated Leave Request' : 'Submitted Leave Request',
      `Leave for ${newLeave.userName} (${newLeave.leaveType.toUpperCase()}, ${durationLabel}) - Routing: ${newLeave.applicantRole === 'pm' ? 'PM → Executive Admin Approval' : 'Team Member → PM Approval'} - Status: ${newLeave.status.toUpperCase()}.`,
      'audit'
    );
  };

  const deleteLeave = async (leaveId: string) => {
    const target = leaves.find(l => l.id === leaveId);
    const updatedLeaves = leaves.filter(l => l.id !== leaveId);
    setLeaves(updatedLeaves);
    try {
      localStorage.setItem(LEAVES_STORAGE_KEY, JSON.stringify(updatedLeaves));
      await localforage.setItem(LEAVES_STORAGE_KEY, updatedLeaves);
    } catch (e) {
      console.warn('Failed to persist leaves after delete:', e);
    }

    if (target) {
      addAuditNote(
        'Cancelled Leave Request',
        `Cancelled leave for ${target.userName} (${target.startDate} to ${target.endDate}).`,
        'audit'
      );
    }
  };

  const updateLeaveStatus = async (leaveId: string, status: LeaveStatus, approverName?: string) => {
    const updatedLeaves = leaves.map(l => {
      if (l.id === leaveId) {
        return {
          ...l,
          status,
          approvedBy: status === 'approved' ? (approverName || currentUser.name) : undefined,
          approvedAt: status === 'approved' ? new Date().toISOString() : undefined
        };
      }
      return l;
    });

    setLeaves(updatedLeaves);
    try {
      localStorage.setItem(LEAVES_STORAGE_KEY, JSON.stringify(updatedLeaves));
      await localforage.setItem(LEAVES_STORAGE_KEY, updatedLeaves);
    } catch (e) {
      console.warn('Failed to persist updated leave status:', e);
    }

    const target = updatedLeaves.find(l => l.id === leaveId);
    if (target) {
      const durLabel = target.durationType === 'hours'
        ? `${target.hoursCount}h time-off on ${target.startDate}`
        : `${target.daysCount} days (${target.startDate} to ${target.endDate})`;

      addAuditNote(
        `Leave Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        `Leave for ${target.userName} (${durLabel}) marked ${status.toUpperCase()} by ${approverName || currentUser.name}. Capacity ${status === 'approved' ? `deducted (${target.hoursCount}h)` : 'restored'}.`,
        'audit'
      );
    }
  };

  const updateOrgSettings = async (settings: Partial<OrganizationSettings>) => {
    const updated = { ...orgSettings, ...settings };
    setOrgSettings(updated);
    try {
      localStorage.setItem(ORG_SETTINGS_KEY, JSON.stringify(updated));
      await localforage.setItem(ORG_SETTINGS_KEY, updated);
    } catch (e) {
      console.warn('Failed to persist org settings:', e);
    }

    addAuditNote(
      'Updated Organization Settings',
      `Modified organization operational policy and rate cards.`,
      'audit'
    );
  };

  const promoteUserRole = async (userId: string, newRole: UserRole, newTitle?: string) => {
    // Strict role boundary: Only Executive Administrators can promote or modify user roles
    if (currentUser.role !== 'admin') {
      console.warn('Unauthorized role change attempt. Only Executive Admins can assign or promote user roles.');
      return;
    }

    const updatedUsers = allUsers.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          role: newRole,
          title: newTitle || (newRole === 'admin' ? 'Executive Administrator' : newRole === 'pm' ? 'Project Manager' : u.title)
        };
      }
      return u;
    });

    setAllUsers(updatedUsers);
    try {
      localStorage.setItem(USERS_LIST_KEY, JSON.stringify(updatedUsers));
      await localforage.setItem(USERS_LIST_KEY, updatedUsers);
    } catch (e) {
      console.warn('Failed to persist all users:', e);
    }

    if (currentUser.id === userId) {
      const updatedCurrent = updatedUsers.find(u => u.id === userId)!;
      setCurrentUser(updatedCurrent);
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedCurrent));
        await localforage.setItem(USER_STORAGE_KEY, updatedCurrent);
      } catch (e) {
        // Ignore
      }
    }

    const targetUser = updatedUsers.find(u => u.id === userId);
    addAuditNote(
      'Updated User Role / Permissions',
      `Changed role for ${targetUser?.name || userId} to ${newRole.toUpperCase()}${newTitle ? ` (${newTitle})` : ''}.`,
      'audit'
    );
  };

  const assignProjectManager = async (projectId: string, pmUserId: string) => {
    const pmUser = allUsers.find(u => u.id === pmUserId);
    if (!pmUser) return;

    // Check if target project is active project
    if (projectId === activeProjectId) {
      // Ensure PM is in stakeholders list with lead role
      const existingIdx = projectData.stakeholders.findIndex(s => s.id === pmUser.id || s.email === pmUser.email);
      let updatedStakeholders = [...projectData.stakeholders];
      const pmStakeholder: Stakeholder = {
        id: pmUser.id,
        name: pmUser.name,
        email: pmUser.email,
        role: pmUser.title || 'Project Manager & Scrum Master',
        category: 'internal',
        avatar: pmUser.avatar,
        hourlyRate: pmUser.hourlyRate || 100,
        weeklyCapacityHours: pmUser.weeklyCapacityHours || 40,
        skills: pmUser.skills || ['Agile', 'Scrum', 'Leadership'],
        status: 'active'
      };

      if (existingIdx >= 0) {
        updatedStakeholders[existingIdx] = pmStakeholder;
      } else {
        updatedStakeholders.unshift(pmStakeholder);
      }

      const updated = { ...projectData, stakeholders: updatedStakeholders };
      setProjectData(updated);
      broadcastLocalTabSync(updated);
    }

    addAuditNote(
      'Assigned Project Manager',
      `Assigned ${pmUser.name} as Lead Project Manager for Project ID: ${projectId}.`,
      'audit'
    );
  };

  return (
    <ProjectContext.Provider
      value={{
        projectData,
        projectsList,
        allProjectsMap,
        leaves,
        orgSettings,
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
        updateUserProfile,
        promoteUserRole,
        assignProjectManager,
        switchProject,
        createProject,
        deleteProject,
        updateProjectDetails,
        updatePMChecklist,
        validateAcceptanceCriterion,
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
        saveUserStory,
        deleteUserStory,
        saveSprint,
        deleteSprint,
        assignTaskToSprint,
        assignFeatureToSprint,
        assignStoryToSprint,
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
        saveLeave,
        deleteLeave,
        updateLeaveStatus,
        updateOrgSettings,
        importWbsData,
        resetToDefault,
        updateWidgets,
        updateStatusPercentages,
        addAuditNote,
        clearAuditLogs,
        customAiConfig,
        updateCustomAiConfig,
        pendingInvite,
        acceptPendingInvite,
        clearPendingInvite,
        queryClient
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
