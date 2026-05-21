import { create } from "zustand";
import { User } from "firebase/auth";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { VirtualFile, PlanItem, ToolItem, MemoryVector, ChatMessage, AgentOperation, AgentPermission, AgentCredential, GitBranch, GitCommit, InterAgentMessage, InterAgentChannel } from "./types";
import { initialFiles, initialPlan, defaultTools, defaultVectors } from "./mockData";

// Hardened CRUD helper proxies for syncing with Firestore (when signed in)
async function saveDocIfAuthenticated(collectionName: string, id: string, data: any) {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}/${collectionName}/${id}`;
  try {
    await setDoc(doc(db, "users", user.uid, collectionName, id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

async function deleteDocIfAuthenticated(collectionName: string, id: string) {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}/${collectionName}/${id}`;
  try {
    await deleteDoc(doc(db, "users", user.uid, collectionName, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

interface FluxStore {
  // Firebase State Coordinates
  user: User | null;
  syncStatus: "idle" | "syncing" | "synced" | "error";
  setUser: (user: User | null) => void;
  setSyncStatus: (status: "idle" | "syncing" | "synced" | "error") => void;

  // Global State Buffers
  files: VirtualFile[];
  activePath: string;
  plan: PlanItem[];
  tools: ToolItem[];
  vectors: MemoryVector[];
  permissions: AgentPermission[];
  credentials: AgentCredential[];
  editorContent: string;
  logs: string[];
  promptInput: string;
  chatMessages: ChatMessage[];
  
  // UI Coordinates
  activeTab: "orchestrator" | "planner" | "memory" | "permissions" | "tasks" | "coordinator";
  isOrchestrating: boolean;
  currentRunningOp: string | null;
  apiConfig: { apiKeyConfigured: boolean; hasAppUrl: boolean };
  pendingGitCommit: {
    message: string;
    onConfirm: (confirmedMessage: string) => void;
    onCancel: () => void;
  } | null;
  gitBranches: GitBranch[];
  switchBranch: (branchName: string, discardUncommitted?: boolean) => Promise<void>;
  createBranch: (branchName: string) => Promise<void>;
  addNewCommit: (message: string) => Promise<void>;

  // Inter-agent Chat coordinates
  interAgentMessages: InterAgentMessage[];
  interAgentChannels: InterAgentChannel[];
  activeChannelId: string;
  isAgentTyping: Record<string, boolean>;
  setActiveChannelId: (id: string) => void;
  sendInterAgentMessage: (channelId: string, senderId: string, text: string, coordinationType?: "task_handover" | "api_request" | "diagnostics_pass" | "vector_embed" | "general", taskContext?: string) => Promise<void>;
  simulateAgentConversation: (taskId?: string) => Promise<void>;

  // Core Actions
  setFiles: (files: VirtualFile[]) => void;
  setActivePath: (path: string) => void;
  setPlan: (plan: PlanItem[]) => void;
  setTools: (tools: ToolItem[]) => void;
  setVectors: (vectors: MemoryVector[]) => void;
  setPermissions: (permissions: AgentPermission[]) => void;
  togglePermission: (agentId: string, type: "fileSystemAccess" | "terminalAccess" | "externalAPIAccess") => Promise<void>;
  revokeCredential: (id: string) => Promise<void>;
  regenerateCredential: (id: string) => Promise<void>;
  addCredential: (agentId: string, serviceName: string, tokenValue: string) => Promise<void>;
  setEditorContent: (content: string) => void;
  setLogs: (logs: string[] | ((prev: string[]) => string[])) => void;
  addLog: (log: string) => void;
  setPromptInput: (prompt: string) => void;
  setChatMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setActiveTab: (tab: "orchestrator" | "planner" | "memory" | "permissions" | "tasks" | "coordinator") => void;
  setIsOrchestrating: (isOrchestrating: boolean) => void;
  setCurrentRunningOp: (op: string | null) => void;
  setApiConfig: (config: { apiKeyConfigured: boolean; hasAppUrl: boolean }) => void;

  // Domain Actions
  fetchApiConfig: () => Promise<void>;
  saveActiveFile: () => Promise<void>;
  createFile: (path: string) => Promise<boolean>;
  deleteFile: (path: string) => Promise<void>;
  togglePlanStatus: (id: string) => Promise<void>;
  addTask: (label: string, priority: "low" | "medium" | "high", dependencies?: string[]) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setTaskDependencies: (id: string, dependencies: string[]) => Promise<void>;
  toggleToolStatus: (id: string) => Promise<void>;
  refreshToolPings: () => void;
  pingTool: (id: string) => Promise<void>;
  resetWorkspace: () => void;
  executePrompt: (suggestedText?: string) => Promise<void>;
}

const initialInterAgentChannels: InterAgentChannel[] = [
  {
    id: "broadcast",
    name: "broadcast-coordination",
    description: "Global team broadcast channel for cross-functional routing actions.",
    icon: "Megaphone",
    participants: ["all", "llm-router", "file-agent", "terminal-agent", "memory-agent"],
  },
  {
    id: "vfs-handover",
    name: "vfs-io-handover",
    description: "Direct task handover pipeline between LLM Router and VFS File Worker.",
    icon: "Files",
    participants: ["llm-router", "file-agent"],
  },
  {
    id: "terminal-sandbox",
    name: "terminal-execution-testing",
    description: "Sandboxed node compiling and test diagnostics run-sync room.",
    icon: "Terminal",
    participants: ["terminal-agent", "file-agent"],
  },
  {
    id: "memory-sync",
    name: "semantic-memory-index-optimization",
    description: "Retrieval score optimization and vectors sync updates room.",
    icon: "Database",
    participants: ["llm-router", "memory-agent"],
  }
];

const initialInterAgentMessages: InterAgentMessage[] = [
  {
    id: "iam-1",
    senderId: "llm-router",
    senderName: "Cognitive LLM Router",
    senderAvatar: "api",
    receiverId: "all",
    channelId: "broadcast",
    text: "Team, I have finished parsing the user's latest task layout requirements. We need to audit all active storage cache pools. File Workspace Architect, can you locate the entry files?",
    timestamp: "09:20:15",
    coordinationType: "general"
  },
  {
    id: "iam-2",
    senderId: "file-agent",
    senderName: "File Workspace Architect",
    senderAvatar: "fileSystem",
    receiverId: "llm-router",
    channelId: "broadcast",
    text: "Received! Looking into the virtual filesystem. I found src/index.js contains the active server listener and some baseline caching mock assets. I am writing a plan to test standard CORS rules first.",
    timestamp: "09:21:40",
    coordinationType: "task_handover"
  },
  {
    id: "iam-3",
    senderId: "terminal-agent",
    senderName: "Terminal Command Executor",
    senderAvatar: "terminal",
    receiverId: "all",
    channelId: "broadcast",
    text: "Excellent. I have verified that node is running fine inside the sandbox on port 3000. Let me know when you commit changes to index.js so I can execute the dev compiler checks.",
    timestamp: "09:22:15",
    coordinationType: "diagnostics_pass"
  },
  {
    id: "iam-4",
    senderId: "file-agent",
    senderName: "File Workspace Architect",
    senderAvatar: "fileSystem",
    receiverId: "terminal-agent",
    channelId: "vfs-handover",
    text: "Hi Executor, I am about to apply changes to src/store.ts to improve error boundaries for popup credentials. Will require terminal check in 2 minutes.",
    timestamp: "09:30:10",
    coordinationType: "task_handover"
  },
  {
    id: "iam-5",
    senderId: "terminal-agent",
    senderName: "Terminal Command Executor",
    senderAvatar: "terminal",
    receiverId: "file-agent",
    channelId: "vfs-handover",
    text: "Copy that. Standing by to receive the file write trigger and boot up the diagnostic linters.",
    timestamp: "09:31:05",
    coordinationType: "general"
  },
  {
    id: "iam-6",
    senderId: "terminal-agent",
    senderName: "Terminal Command Executor",
    senderAvatar: "terminal",
    receiverId: "file-agent",
    channelId: "terminal-sandbox",
    text: "I ran the test command `npm run lint`. The typescript compiler is passing with zero diagnostics errors. Proceeding to bundle production builds.",
    timestamp: "09:34:50",
    coordinationType: "diagnostics_pass"
  },
  {
    id: "iam-7",
    senderId: "llm-router",
    senderName: "Cognitive LLM Router",
    senderAvatar: "api",
    receiverId: "memory-agent",
    channelId: "memory-sync",
    text: "Indexer, we just completed the build. Please vectorise the new API schemas and append them to our long-term context cache.",
    timestamp: "09:36:12",
    coordinationType: "vector_embed"
  },
  {
    id: "iam-8",
    senderId: "memory-agent",
    senderName: "Semantic Memory Indexer",
    senderAvatar: "database",
    receiverId: "llm-router",
    channelId: "memory-sync",
    text: "Roger that. Successfully serialized 5 new system tokens. Cosine similarity threshold has been recalibrated to 0.88. Fast retrieval grounding is fully operational.",
    timestamp: "09:37:00",
    coordinationType: "vector_embed"
  }
];

export const useFluxStore = create<FluxStore>((set, get) => ({
  // Firebase Initial States and Actions
  user: null,
  syncStatus: "idle",
  setUser: (user) => set({ user }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),

  // Initial states
  files: initialFiles,
  activePath: "src/index.js",
  plan: initialPlan,
  tools: defaultTools,
  vectors: defaultVectors,
  permissions: [
    {
      id: "file-agent",
      name: "File Workspace Architect",
      role: "I/O Specialist",
      description: "Authorized to parse source files, index project buffers, and directly write code implementations to the virtual file system storage.",
      avatar: "fileSystem",
      fileSystemAccess: true,
      terminalAccess: false,
      externalAPIAccess: false,
    },
    {
      id: "terminal-agent",
      name: "Terminal Command Executor",
      role: "Shell Proxy",
      description: "Performs diagnostic scripts, runs node compiler checks, and operates sandboxed terminal test simulations.",
      avatar: "terminal",
      fileSystemAccess: true,
      terminalAccess: true,
      externalAPIAccess: true,
    },
    {
      id: "llm-router",
      name: "Cognitive LLM Router",
      role: "Synthesizing Core",
      description: "Communicates with global AI platforms, ingests contextual feedback, and formulates steps for code edits or test orchestration.",
      avatar: "api",
      fileSystemAccess: false,
      terminalAccess: false,
      externalAPIAccess: true,
    },
    {
      id: "memory-agent",
      name: "Semantic Memory Indexer",
      role: "Memory Embedder",
      description: "Indexes system events, logs reasoning paths, and updates vector database similarities for faster prompt grounding.",
      avatar: "database",
      fileSystemAccess: true,
      terminalAccess: false,
      externalAPIAccess: true,
    },
  ],
  credentials: [
    {
      id: "cred-1",
      agentId: "file-agent",
      agentName: "File Workspace Architect",
      serviceName: "Workspace I/O JWT Buffer Key",
      tokenValue: "flx_vfs_io_auth_98aef22312bcdf",
      status: "active",
      lastVerified: "2026-05-20 16:30",
    },
    {
      id: "cred-2",
      agentId: "terminal-agent",
      agentName: "Terminal Command Executor",
      serviceName: "Sandboxed Local Node Session Token",
      tokenValue: "flx_sh_session_token_ab73c09199d",
      status: "active",
      lastVerified: "2026-05-20 16:30",
    },
    {
      id: "cred-3",
      agentId: "llm-router",
      agentName: "Cognitive LLM Router",
      serviceName: "Gemini Router API Auth Key",
      tokenValue: "flx_gemini_router_api_sec_665a3b2b",
      status: "active",
      lastVerified: "2026-05-20 16:30",
    },
    {
      id: "cred-4",
      agentId: "memory-agent",
      agentName: "Semantic Memory Indexer",
      serviceName: "Vector Store Cluster Secret Token",
      tokenValue: "flx_vdb_graph_secret_ee049f228b3c",
      status: "active",
      lastVerified: "2026-05-20 16:30",
    }
  ],
  editorContent: initialFiles.find((f) => f.path === "src/index.js")?.content || "",
  logs: [
    `[${new Date().toLocaleTimeString()}] FILE_AGENT: Analyzing virtual filesystem snapshot... found 5 active buffers.`,
    `[${new Date().toLocaleTimeString()}] LLM_ROUTER: Redirecting context queries to models/gemini-3.5-flash.`,
    `[${new Date().toLocaleTimeString()}] PLANNING_ENGINE: Found 4 registered tasks. System loaded and standing by.`,
    `[${new Date().toLocaleTimeString()}] SECURITY_ROOT: Operational security policies successfully active.`
  ],
  promptInput: "",
  chatMessages: [
    {
      id: "welcome",
      sender: "agent",
      text: "Welcome to the FLUX Agentic Workspace Core. I am the FLUX routing coordinator, ready to orchestrate tools, modify codebases, and maintain your semantic memory store. Enter an instruction below to activate the agent workflow simulation.",
      timestamp: new Date().toLocaleTimeString(),
    }
  ],
  activeTab: "orchestrator",
  interAgentMessages: initialInterAgentMessages,
  interAgentChannels: initialInterAgentChannels,
  activeChannelId: "broadcast",
  isAgentTyping: {},
  isOrchestrating: false,
  currentRunningOp: null,
  apiConfig: { apiKeyConfigured: false, hasAppUrl: false },
  pendingGitCommit: null,
  gitBranches: [
    {
      name: "main",
      isCurrent: true,
      commits: [
        {
          hash: "e5a1cd3",
          message: "chore: bump cache proxy container version to 2.4.0",
          author: "agent@google.com",
          date: "2026-05-21 02:15"
        },
        {
          hash: "7f0c12e",
          message: "feat: map topological level resolver for action items",
          author: "log4jcodes@gmail.com",
          date: "2026-05-21 00:40"
        },
        {
          hash: "b9a11ef",
          message: "init: baseline simulated caching microservice structures",
          author: "system-genesis",
          date: "2026-05-20 18:20"
        }
      ],
      files: initialFiles,
      committedFiles: initialFiles
    },
    {
      name: "feature/auth-layer",
      isCurrent: false,
      commits: [
        {
          hash: "a88c3de",
          message: "feat: experimental JWT header credential checking middleware",
          author: "agent@google.com",
          date: "2016-05-21 04:10"
        },
        {
          hash: "e5a1cd3",
          message: "chore: bump cache proxy container version to 2.4.0",
          author: "agent@google.com",
          date: "2026-05-21 02:15"
        },
        {
          hash: "7f0c12e",
          message: "feat: map topological level resolver for action items",
          author: "log4jcodes@gmail.com",
          date: "2026-05-21 00:40"
        }
      ],
      files: [
        ...initialFiles.map(f => {
          if (f.path === "src/index.js") {
            return {
              ...f,
              content: f.content.replace(
                "app.use(express.json());",
                `app.use(express.json());\n\n// Added in branch feature/auth-layer\nfunction authorizationMiddleware(req, res, next) {\n  const authHeader = req.headers.authorization;\n  if (!authHeader || !authHeader.startsWith('Bearer ')) {\n    return res.status(401).json({ error: 'Missing authorized JWT validation token.' });\n  }\n  next();\n}\n\n// Apply auth check to cache operations\napp.use('/cache', authorizationMiddleware);`
              )
            };
          }
          return f;
        })
      ],
      committedFiles: [
        ...initialFiles.map(f => {
          if (f.path === "src/index.js") {
            return {
              ...f,
              content: f.content.replace(
                "app.use(express.json());",
                `app.use(express.json());\n\n// Added in branch feature/auth-layer\nfunction authorizationMiddleware(req, res, next) {\n  const authHeader = req.headers.authorization;\n  if (!authHeader || !authHeader.startsWith('Bearer ')) {\n    return res.status(401).json({ error: 'Missing authorized JWT validation token.' });\n  }\n  next();\n}\n\n// Apply auth check to cache operations\napp.use('/cache', authorizationMiddleware);`
              )
            };
          }
          return f;
        })
      ]
    },
    {
      name: "dev-integration",
      isCurrent: false,
      commits: [
        {
          hash: "1d4fa88",
          message: "merge: pull main back into dev-integration and install loggers",
          author: "log4jcodes@gmail.com",
          date: "2026-05-21 03:00"
        },
        {
          hash: "e5a1cd3",
          message: "chore: bump cache proxy container version to 2.4.0",
          author: "agent@google.com",
          date: "2026-05-21 02:15"
        }
      ],
      files: [
        ...initialFiles,
        {
          path: "src/telemetry.js",
          language: "javascript",
          content: `// Telemetry additions for dev-integration\nconst startTime = Date.now();\n\nfunction getSystemTelemetry() {\n  return {\n    uptimeMs: Date.now() - startTime,\n    memoryUsage: process.memoryUsage(),\n    timestamp: new Date().toISOString()\n  };\n}\n\nmodule.exports = { getSystemTelemetry };\n`
        }
      ],
      committedFiles: [
        ...initialFiles,
        {
          path: "src/telemetry.js",
          language: "javascript",
          content: `// Telemetry additions for dev-integration\nconst startTime = Date.now();\n\nfunction getSystemTelemetry() {\n  return {\n    uptimeMs: Date.now() - startTime,\n    memoryUsage: process.memoryUsage(),\n    timestamp: new Date().toISOString()\n  };\n}\n\nmodule.exports = { getSystemTelemetry };\n`
        }
      ]
    }
  ],

  // Basic Setters
  setFiles: (files) => set({ files }),
  setActivePath: (path) => {
    const file = get().files.find((f) => f.path === path);
    set({ 
      activePath: path,
      editorContent: file ? file.content : ""
    });
  },
  setPlan: (plan) => set({ plan }),
  setTools: (tools) => set({ tools }),
  setVectors: (vectors) => set({ vectors }),
  setPermissions: (permissions) => set({ permissions }),
  togglePermission: async (agentId, type) => {
    const updated = get().permissions.map((p) =>
      p.id === agentId ? { ...p, [type]: !p[type] } : p
    );
    const agent = get().permissions.find((p) => p.id === agentId);
    const nextVal = agent ? !agent[type] : false;
    const timestamp = new Date().toLocaleTimeString();
    set({
      permissions: updated,
      logs: [
        ...get().logs,
        `[${timestamp}] SECURITY_ROOT: Updated policies for agent [${agentId}] - set ${type} to ${nextVal.toString().toUpperCase()}`
      ]
    });
    const targetPerm = updated.find((p) => p.id === agentId);
    if (targetPerm) {
      await saveDocIfAuthenticated("permissions", agentId, targetPerm);
    }
  },
  revokeCredential: async (id) => {
    const updated = get().credentials.map((c) =>
      c.id === id ? { ...c, status: "revoked" as const } : c
    );
    const cred = get().credentials.find((c) => c.id === id);
    const timestamp = new Date().toLocaleTimeString();
    set({
      credentials: updated,
      logs: [
        ...get().logs,
        `[${timestamp}] SECURITY_ROOT: Revoked token for security service: ${cred ? cred.serviceName : id}`
      ]
    });
    const targetCred = updated.find((c) => c.id === id);
    if (targetCred) {
      await saveDocIfAuthenticated("credentials", id, targetCred);
    }
  },
  regenerateCredential: async (id) => {
    const randomHex = () => Math.random().toString(16).substring(2, 10);
    const updated = get().credentials.map((c) => {
      if (c.id === id) {
        const prefix = c.tokenValue.split("_").slice(0, -1).join("_") || "flx_key";
        return {
          ...c,
          tokenValue: `${prefix}_${randomHex()}${randomHex()}`,
          status: "active" as const,
          lastVerified: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')} ${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
        };
      }
      return c;
    });
    const cred = get().credentials.find((c) => c.id === id);
    const timestamp = new Date().toLocaleTimeString();
    set({
      credentials: updated,
      logs: [
        ...get().logs,
        `[${timestamp}] SECURITY_ROOT: Regenerated token for ${cred ? cred.agentName : id} (${cred ? cred.serviceName : ""})`
      ]
    });
    const targetCred = updated.find((c) => c.id === id);
    if (targetCred) {
      await saveDocIfAuthenticated("credentials", id, targetCred);
    }
  },
  addCredential: async (agentId, serviceName, tokenValue) => {
    const timestamp = new Date().toLocaleTimeString();
    const agent = get().permissions.find((p) => p.id === agentId);
    if (!agent) return;
    const newCred: AgentCredential = {
      id: `cred-${Date.now()}`,
      agentId,
      agentName: agent.name,
      serviceName,
      tokenValue: tokenValue.trim() || `flx_usr_${Math.random().toString(36).substring(2, 10)}`,
      status: "active",
      lastVerified: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')} ${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
    };
    set({
      credentials: [...get().credentials, newCred],
      logs: [
        ...get().logs,
        `[${timestamp}] SECURITY_ROOT: Registered fresh credentials [${serviceName}] for ${agent.name}.`
      ]
    });
    await saveDocIfAuthenticated("credentials", newCred.id, newCred);
  },
  setEditorContent: (editorContent) => set({ editorContent }),
  setLogs: (updater) => set((state) => ({ 
    logs: typeof updater === "function" ? updater(state.logs) : updater 
  })),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  setPromptInput: (promptInput) => set({ promptInput }),
  setChatMessages: (updater) => set((state) => ({ 
    chatMessages: typeof updater === "function" ? updater(state.chatMessages) : updater 
  })),
  setActiveTab: (activeTab) => set({ activeTab }),
  setIsOrchestrating: (isOrchestrating) => set({ isOrchestrating }),
  setCurrentRunningOp: (currentRunningOp) => set({ currentRunningOp }),
  setApiConfig: (apiConfig) => set({ apiConfig }),
  setActiveChannelId: (activeChannelId) => set({ activeChannelId }),
  sendInterAgentMessage: async (channelId, senderId, text, coordinationType = "general", taskContext) => {
    const agents = {
      "llm-router": { name: "Cognitive LLM Router", avatar: "api" },
      "file-agent": { name: "File Workspace Architect", avatar: "fileSystem" },
      "terminal-agent": { name: "Terminal Command Executor", avatar: "terminal" },
      "memory-agent": { name: "Semantic Memory Indexer", avatar: "database" },
      "orchestrator": { name: "Human Orchestrator", avatar: "human" }
    };

    const sender = agents[senderId as keyof typeof agents] || { name: senderId, avatar: "api" };

    const newMsg: InterAgentMessage = {
      id: `iam-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      senderId,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      receiverId: "all",
      text,
      channelId,
      timestamp: new Date().toLocaleTimeString(),
      coordinationType,
      taskContext
    };

    set((state) => ({
      interAgentMessages: [...state.interAgentMessages, newMsg]
    }));
  },
  simulateAgentConversation: async (taskId) => {
    const state = get();
    const plan = state.plan;
    const targetTask = taskId 
      ? plan.find(t => t.id === taskId) 
      : plan.find(t => t.status === "in-progress") || plan.find(t => t.status === "pending") || { label: "system audit" };
      
    const taskLabel = targetTask?.label || "General workspace optimization";
    const channelId = get().activeChannelId;

    const setTyping = (agent: string, isTyping: boolean) => {
      set((s) => ({
        isAgentTyping: { ...s.isAgentTyping, [agent]: isTyping }
      }));
    };

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Phase 1: LLM Router opens communication
    setTyping("llm-router", true);
    await delay(1200);
    setTyping("llm-router", false);
    
    await get().sendInterAgentMessage(
      channelId,
      "llm-router",
      `Initiating peer-to-peer task collaboration. Current action item: "${taskLabel}". File Workspace Architect, do we have the resources cached in VFS?`,
      "task_handover",
      taskLabel
    );

    // Phase 2: File Agent replies
    await delay(1000);
    setTyping("file-agent", true);
    await delay(1500);
    setTyping("file-agent", false);
    
    await get().sendInterAgentMessage(
      channelId,
      "file-agent",
      `Active file indices analyzed. I see the target files are open in the editor workspace. I am ready to inject standard handler blocks for "${taskLabel}". Handing over diagnostics to Terminal Command Executor.`,
      "task_handover",
      taskLabel
    );

    // Phase 3: Terminal Agent takes over
    await delay(1000);
    setTyping("terminal-agent", true);
    await delay(1500);
    setTyping("terminal-agent", false);
    
    await get().sendInterAgentMessage(
      channelId,
      "terminal-agent",
      `Noted, Architect! I am priming npm builder proxies. Once you commit the updates, I will trigger run-tests and verify build outputs for "${taskLabel}" inside the sandbox.`,
      "diagnostics_pass",
      taskLabel
    );

    // Phase 4: Memory Indexer documents the context
    await delay(1000);
    setTyping("memory-agent", true);
    await delay(1400);
    setTyping("memory-agent", false);
    
    await get().sendInterAgentMessage(
      channelId,
      "memory-agent",
      `Storing trace telemetry in vectors layer. Indexed transaction metadata for "${taskLabel}" with routing weight 0.95. Peer coordination successfully committed.`,
      "vector_embed",
      taskLabel
    );
  },

  // Fetch Backed Configuration
  fetchApiConfig: async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      set({
        apiConfig: {
          apiKeyConfigured: !!data.apiKeyConfigured,
          hasAppUrl: !!data.hasAppUrl,
        }
      });
    } catch (err) {
      console.error("Error fetching store api config:", err);
    }
  },

  // Save active codebase changes
  saveActiveFile: async () => {
    const { activePath, editorContent, files } = get();
    const updatedFiles = files.map((f) =>
      f.path === activePath ? { ...f, content: editorContent } : f
    );
    const timestamp = new Date().toLocaleTimeString();
    
    set({
      files: updatedFiles,
      logs: [
        ...get().logs,
        `[${timestamp}] FILE_AGENT: Force-saved manual edit modifications inside ${activePath}. (${editorContent.length} bytes)`
      ]
    });

    const file = updatedFiles.find((f) => f.path === activePath);
    if (file) {
      const docId = activePath.replace(/\//g, "_");
      await saveDocIfAuthenticated("files", docId, {
        path: file.path,
        content: file.content,
        language: file.language
      });
    }
  },

  // Create virtual layout item
  createFile: async (path) => {
    const { files } = get();
    if (files.some((f) => f.path === path)) {
      return false;
    }
    const ext = path.split(".").pop() || "js";
    const newFile: VirtualFile = {
      path,
      content: `// Simulated draft buffer for ${path}\n// Ready for coding...\n`,
      language: ext === "md" ? "markdown" : ext === "json" ? "json" : "javascript",
    };
    const timestamp = new Date().toLocaleTimeString();

    set({
      files: [...files, newFile],
      activePath: path,
      editorContent: newFile.content,
      logs: [
        ...get().logs,
        `[${timestamp}] FILE_AGENT: Created new workspace layout object at ${path}`
      ]
    });

    const docId = path.replace(/\//g, "_");
    await saveDocIfAuthenticated("files", docId, newFile);
    return true;
  },

  // Drop virtual layout element
  deleteFile: async (path) => {
    const { files, activePath } = get();
    if (files.length <= 1) return;
    const filtered = files.filter((f) => f.path !== path);
    let nextActive = activePath;
    if (activePath === path) {
      nextActive = filtered[0].path;
    }
    const nextFile = filtered.find((f) => f.path === nextActive);
    const timestamp = new Date().toLocaleTimeString();

    set({
      files: filtered,
      activePath: nextActive,
      editorContent: nextFile ? nextFile.content : "",
      logs: [
        ...get().logs,
        `[${timestamp}] FILE_AGENT: Discarded virtual buffer ${path}`
      ]
    });

    const docId = path.replace(/\//g, "_");
    await deleteDocIfAuthenticated("files", docId);
  },

  // Cycle todo tasks states
  togglePlanStatus: async (id) => {
    const plan = get().plan;
    const task = plan.find(t => t.id === id);
    
    // Enforcement of execution order / dependencies check
    if (task && task.status === "pending") {
      const unresolved = (task.dependencies || []).filter(depId => {
        const depTask = plan.find(p => p.id === depId);
        return !depTask || depTask.status !== "done";
      });
      if (unresolved.length > 0) {
        const depLabels = unresolved.map(depId => {
          const t = plan.find(p => p.id === depId);
          return t ? `"${t.label}"` : depId;
        }).join(", ");
        
        const timestamp = new Date().toLocaleTimeString();
        set((state) => ({
          logs: [
            ...state.logs,
            `[${timestamp}] PLANNING_ENGINE: Execution blocked for "${task.label}". Prerequisites not resolved: ${depLabels}`
          ]
        }));
        return;
      }
    }

    const updatedPlan = get().plan.map((item) => {
      if (item.id === id) {
        const statuses: ("pending" | "in-progress" | "done")[] = [
          "pending",
          "in-progress",
          "done",
        ];
        const currIdx = statuses.indexOf(item.status);
        const nextStatus = statuses[(currIdx + 1) % statuses.length];
        return { ...item, status: nextStatus };
      }
      return item;
    });
    set({ plan: updatedPlan });

    const targetItem = updatedPlan.find((item) => item.id === id);
    if (targetItem) {
      await saveDocIfAuthenticated("plan", id, {
        id: targetItem.id,
        label: targetItem.label,
        status: targetItem.status,
        priority: targetItem.priority,
        dependencies: targetItem.dependencies || [],
        createdAt: targetItem.createdAt || new Date().toISOString()
      });
    }
  },

  // Task creators
  addTask: async (label, priority, dependencies = []) => {
    const newTask: PlanItem = {
      id: `task-${Date.now()}`,
      label,
      status: "pending",
      priority,
      dependencies,
      createdAt: new Date().toISOString(),
    };
    set({ plan: [newTask, ...get().plan] });
    await saveDocIfAuthenticated("plan", newTask.id, newTask);
  },

  deleteTask: async (id) => {
    const updatedPlan = get().plan
      .filter((item) => item.id !== id)
      .map((item) => {
        if (item.dependencies && item.dependencies.includes(id)) {
          return {
            ...item,
            dependencies: item.dependencies.filter((depId) => depId !== id)
          };
        }
        return item;
      });

    set({ plan: updatedPlan });
    await deleteDocIfAuthenticated("plan", id);

    for (const item of updatedPlan) {
      if (item.dependencies && item.dependencies.length > 0) {
        await saveDocIfAuthenticated("plan", item.id, {
          id: item.id,
          label: item.label,
          status: item.status,
          priority: item.priority,
          dependencies: item.dependencies,
          createdAt: item.createdAt || new Date().toISOString()
        });
      }
    }
  },

  setTaskDependencies: async (id, dependencies) => {
    const updatedPlan = get().plan.map((item) => {
      if (item.id === id) {
        return { ...item, dependencies };
      }
      return item;
    });
    set({ plan: updatedPlan });

    const targetItem = updatedPlan.find((item) => item.id === id);
    if (targetItem) {
      await saveDocIfAuthenticated("plan", id, {
        id: targetItem.id,
        label: targetItem.label,
        status: targetItem.status,
        priority: targetItem.priority,
        dependencies: targetItem.dependencies || [],
        createdAt: targetItem.createdAt || new Date().toISOString()
      });
    }
  },

  // Diagnostics items actions
  toggleToolStatus: async (id) => {
    const updatedTools = get().tools.map((tool) => {
      if (tool.id === id) {
        const statusOrder: ("connected" | "configured" | "idle" | "disconnected")[] = [
          "connected",
          "configured",
          "idle",
          "disconnected",
        ];
        const currIdx = statusOrder.indexOf(tool.status);
        const nextStatus = statusOrder[(currIdx + 1) % statusOrder.length];
        return { ...tool, status: nextStatus };
      }
      return tool;
    });
    set({ tools: updatedTools });

    const targetTool = updatedTools.find((t) => t.id === id);
    if (targetTool) {
      await saveDocIfAuthenticated("tools", id, targetTool);
    }
  },

  refreshToolPings: () => {
    const updatedTools = get().tools.map((t) => {
      const isOnline = t.status === "connected" || t.status === "configured";
      const latency = isOnline ? Math.floor(Math.random() * 45) + 5 : undefined;
      let newHistory = t.pingHistory ? [...t.pingHistory] : [];
      if (latency !== undefined) {
        newHistory.push(latency);
        if (newHistory.length > 10) newHistory.shift();
      }
      return {
        ...t,
        pingMs: latency,
        pingHistory: newHistory,
      };
    });
    const timestamp = new Date().toLocaleTimeString();
    set({
      tools: updatedTools,
      logs: [
        ...get().logs,
        `[${timestamp}] INFRA_AGENT: Diagnostic latency ping complete across active integrations gateway.`
      ]
    });
  },

  pingTool: async (id) => {
    // Artificial latency for visual feedback
    await new Promise((resolve) => setTimeout(resolve, 600));
    
    const updatedTools = get().tools.map((t) => {
      if (t.id === id) {
        const isOnline = t.status === "connected" || t.status === "configured";
        const latency = isOnline ? Math.floor(Math.random() * 45) + 5 : undefined;
        let newHistory = t.pingHistory ? [...t.pingHistory] : [];
        if (latency !== undefined) {
          newHistory.push(latency);
          if (newHistory.length > 10) newHistory.shift();
        }
        return {
          ...t,
          pingMs: latency,
          pingHistory: newHistory,
        };
      }
      return t;
    });

    set({ tools: updatedTools });

    const targetTool = updatedTools.find((t) => t.id === id);
    if (targetTool) {
      await saveDocIfAuthenticated("tools", id, targetTool);
    }

    const timestamp = new Date().toLocaleTimeString();
    const formattedLatency = targetTool?.pingMs !== undefined ? `${targetTool.pingMs}ms` : "OFFLINE";
    set({
      logs: [
        ...get().logs,
        `[${timestamp}] INFRA_AGENT: Diagnostic health ping check for "${targetTool?.name || id}" resolved as ${formattedLatency}.`
      ]
    });
  },

  // Deep Reset buffer clean setup
  resetWorkspace: () => {
    set({
      files: initialFiles,
      activePath: "src/index.js",
      plan: initialPlan,
      tools: defaultTools,
      vectors: defaultVectors,
      permissions: [
        {
          id: "file-agent",
          name: "File Workspace Architect",
          role: "I/O Specialist",
          description: "Authorized to parse source files, index project buffers, and directly write code implementations to the virtual file system storage.",
          avatar: "fileSystem",
          fileSystemAccess: true,
          terminalAccess: false,
          externalAPIAccess: false,
        },
        {
          id: "terminal-agent",
          name: "Terminal Command Executor",
          role: "Shell Proxy",
          description: "Performs diagnostic scripts, runs node compiler checks, and operates sandboxed terminal test simulations.",
          avatar: "terminal",
          fileSystemAccess: true,
          terminalAccess: true,
          externalAPIAccess: true,
        },
        {
          id: "llm-router",
          name: "Cognitive LLM Router",
          role: "Synthesizing Core",
          description: "Communicates with global AI platforms, ingests contextual feedback, and formulates steps for code edits or test orchestration.",
          avatar: "api",
          fileSystemAccess: false,
          terminalAccess: false,
          externalAPIAccess: true,
        },
        {
          id: "memory-agent",
          name: "Semantic Memory Indexer",
          role: "Memory Embedder",
          description: "Indexes system events, logs reasoning paths, and updates vector database similarities for faster prompt grounding.",
          avatar: "database",
          fileSystemAccess: true,
          terminalAccess: false,
          externalAPIAccess: true,
        },
      ],
      credentials: [
        {
          id: "cred-1",
          agentId: "file-agent",
          agentName: "File Workspace Architect",
          serviceName: "Workspace I/O JWT Buffer Key",
          tokenValue: "flx_vfs_io_auth_98aef22312bcdf",
          status: "active",
          lastVerified: "2026-05-20 16:30",
        },
        {
          id: "cred-2",
          agentId: "terminal-agent",
          agentName: "Terminal Command Executor",
          serviceName: "Sandboxed Local Node Session Token",
          tokenValue: "flx_sh_session_token_ab73c09199d",
          status: "active",
          lastVerified: "2026-05-20 16:30",
        },
        {
          id: "cred-3",
          agentId: "llm-router",
          agentName: "Cognitive LLM Router",
          serviceName: "Gemini Router API Auth Key",
          tokenValue: "flx_gemini_router_api_sec_665a3b2b",
          status: "active",
          lastVerified: "2026-05-20 16:30",
        },
        {
          id: "cred-4",
          agentId: "memory-agent",
          agentName: "Semantic Memory Indexer",
          serviceName: "Vector Store Cluster Secret Token",
          tokenValue: "flx_vdb_graph_secret_ee049f228b3c",
          status: "active",
          lastVerified: "2026-05-20 16:30",
        }
      ],
      editorContent: initialFiles.find((f) => f.path === "src/index.js")?.content || "",
      logs: [
        `[${new Date().toLocaleTimeString()}] SYSTEM: Re-initialized active developer sandbox cache back to default buffers.`,
        `[${new Date().toLocaleTimeString()}] SECURITY_ROOT: Operational security policies successfully active.`
      ],
      chatMessages: [
        {
          id: `welcome-${Date.now()}`,
          sender: "agent",
          text: "Workspace re-established. Send any instruction to begin executing collaborative simulations.",
          timestamp: new Date().toLocaleTimeString()
        }
      ],
      pendingGitCommit: null
    });
  },

  switchBranch: async (branchName: string, discardUncommitted: boolean = false) => {
    const currentBranch = get().gitBranches.find(b => b.isCurrent);
    if (!currentBranch) return;
    
    const updatedBranches = get().gitBranches.map(b => {
      if (b.name === currentBranch.name) {
        const savedFiles = discardUncommitted 
          ? (b.committedFiles || b.files || []) 
          : get().files;
        return { ...b, files: savedFiles, isCurrent: false };
      }
      if (b.name === branchName) {
        return { ...b, isCurrent: true };
      }
      return b;
    });

    const targetBranch = updatedBranches.find(b => b.name === branchName);
    const nextFiles = targetBranch?.files || get().files;
    
    const activePath = get().activePath;
    const hasActivePath = nextFiles.some(f => f.path === activePath);
    const nextActivePath = hasActivePath ? activePath : (nextFiles[0]?.path || "src/index.js");
    const activeFile = nextFiles.find(f => f.path === nextActivePath);

    set({
      gitBranches: updatedBranches,
      files: nextFiles,
      activePath: nextActivePath,
      editorContent: activeFile ? activeFile.content : "",
      logs: [
        ...get().logs,
        `[${new Date().toLocaleTimeString()}] GIT_VCS: Switched to branch "${branchName}". Loaded ${nextFiles.length} files from branch cache.`
      ]
    });
  },

  createBranch: async (branchName: string) => {
    const trimmed = branchName.trim();
    if (!trimmed) return;
    const exists = get().gitBranches.some(b => b.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) return;

    const currentBranch = get().gitBranches.find(b => b.isCurrent);
    const nextBranch: GitBranch = {
      name: trimmed,
      isCurrent: false,
      commits: [
        {
          hash: Math.random().toString(16).substring(2, 9),
          message: `Branch initialization from "${currentBranch?.name || "main"}"`,
          author: get().user?.email || "log4jcodes@gmail.com",
          date: new Date().toISOString().replace('T', ' ').substring(0, 16)
        },
        ...(currentBranch?.commits || [])
      ],
      files: [...get().files],
      committedFiles: [...get().files]
    };

    set({
      gitBranches: [...get().gitBranches, nextBranch],
      logs: [
        ...get().logs,
        `[${new Date().toLocaleTimeString()}] GIT_VCS: Successfully created branch "${trimmed}" from active "${currentBranch?.name || "main"}".`
      ]
    });
  },

  addNewCommit: async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const timestamp = new Date().toLocaleTimeString();
    const commitHash = Math.random().toString(16).substring(2, 9);
    const newCommit: GitCommit = {
      hash: commitHash,
      message: trimmed,
      author: get().user?.email || "log4jcodes@gmail.com",
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    const updatedBranches = get().gitBranches.map(b => {
      if (b.isCurrent) {
        return {
          ...b,
          commits: [newCommit, ...b.commits],
          files: [...get().files],
          committedFiles: [...get().files]
        };
      }
      return b;
    });

    set({
      gitBranches: updatedBranches,
      logs: [
        ...get().logs,
        `[${timestamp}] GIT_VCS: Approved and created commit [VCS-${commitHash.toUpperCase()}] on active branch with message "${trimmed}"`
      ]
    });
  },

  // Core Orchestrator Run Simulation Loop
  executePrompt: async (suggestedText) => {
    const { promptInput, isOrchestrating, files, plan, activePath } = get();
    const textToSend = suggestedText || promptInput;
    if (!textToSend.trim() || isOrchestrating) return;

    if (!suggestedText) {
      set({ promptInput: "" });
    }

    const timestamp = new Date().toLocaleTimeString();
    const userMsgId = `user-${Date.now()}`;
    
    // Set pending user message
    set((state) => ({
      chatMessages: [
        ...state.chatMessages,
        {
          id: userMsgId,
          sender: "human",
          text: textToSend,
          timestamp,
        }
      ],
      isOrchestrating: true,
      currentRunningOp: "Verifying System Permissions",
      logs: [
        ...state.logs,
        `\n[${timestamp}] ────────────────── ORCHESTRATION EVENT INITIATED ──────────────────`,
        `[${timestamp}] SECURITY_ROOT: Auditing agent credentials and outbound gate policies...`,
      ]
    }));

    await saveDocIfAuthenticated("chatMessages", userMsgId, {
      id: userMsgId,
      sender: "user",
      text: textToSend,
      timestamp,
    });

    // 1. Outbound API connection policy audit
    const routerPerm = get().permissions.find((p) => p.id === "llm-router");
    const routerCred = get().credentials.find((c) => c.agentId === "llm-router");
    const routerPolicyBlocked = routerPerm && !routerPerm.externalAPIAccess;
    const routerCredBlocked = routerCred && routerCred.status === "revoked";

    if (routerPolicyBlocked || routerCredBlocked) {
      const opTime = new Date().toLocaleTimeString();
      const errorMsg = routerCredBlocked 
        ? "OUTBOUND CONNECTION SEC_REJECTED: Gemini Router API Auth Key has been REVOKED under system manager protocols."
        : "OUTBOUND CONNECTION BLOCKED: Cognitive LLM Router has 'externalAPIAccess' permission disabled under security policies.";
      const adviceMsg = routerCredBlocked
        ? "⚠️ **Security Gateway Failure**: Inbound authorization key for my **Cognitive LLM Router** is **Revoked**. Please regenerate or activate keys in the *Secure Credentials Store* within the Permissions tab to regain API routing permissions."
        : "⚠️ **Security Transaction Blocked**: Outbound network requests are disabled for my **Cognitive LLM Router**. Please toggle 'External APIs' access back to **Enabled** in the *Agent Permissions panel* to resume active orchestration, or try a local cached query.";

      set((state) => ({
        logs: [
          ...state.logs,
          `[${opTime}] SECURITY_VIOLATION: Aborting transaction immediately.`,
          `  └─ Reason for Block: ${routerCredBlocked ? "API token is REVOKED" : "externalAPIAccess == FALSE"} on Cognitive LLM Router.`
        ],
        chatMessages: [
          ...state.chatMessages,
          {
            id: `agent-block-${Date.now()}`,
            sender: "agent",
            text: adviceMsg,
            timestamp: opTime,
          }
        ],
        isOrchestrating: false,
        currentRunningOp: null,
      }));
      return;
    }

    set((state) => ({
      currentRunningOp: "Initializing Routing Core",
      logs: [
        ...state.logs,
        `[${timestamp}] SECURITY_ROOT: Permissions audit PASSED for Cognitive LLM Router. Dispatching request.`,
        `[${timestamp}] LLM_ROUTER: Ingesting virtual workspace context with ${files.length} buffers...`,
        `[${timestamp}] DETECTOR: Searching similar vector embeddings in Semantic Index...`
      ]
    }));

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToSend,
          files,
          plan,
          currentFile: activePath,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Simulation failure.");
      }

      const ops: AgentOperation[] = data.operations || [];
      const updatedPlan: PlanItem[] = data.plan || [];
      const thoughts: string = data.thoughts || "";
      const finalReply: string = data.response || "";

      // Add thoughts log
      set((state) => ({
        logs: [
          ...state.logs,
          `[${new Date().toLocaleTimeString()}] COGNITIVE_PLANE: Internal reasoning loaded:\n"${thoughts}"`
        ]
      }));

      // Queue playback helper
      for (let i = 0; i < ops.length; i++) {
        const op = ops[i];
        set({ currentRunningOp: op.label });
        const opTime = new Date().toLocaleTimeString();

        if (op.type === "git_commit") {
          set({ currentRunningOp: "Awaiting Git Pre-commit review" });
          const confirmedMsg = await new Promise<string | null>((resolve) => {
            set({
              pendingGitCommit: {
                message: op.label || op.output || "Automated commit of changes",
                onConfirm: (msg) => resolve(msg),
                onCancel: () => resolve(null),
              }
            });
          });

          set({ pendingGitCommit: null });

          if (confirmedMsg === null) {
            set((state) => ({
              logs: [
                ...state.logs,
                `[${opTime}] GIT_COMMIT_HOOK: Pre-commit review ABORTED by user. Skipped execution of operation [${op.label}].`
              ]
            }));
            await new Promise((r) => setTimeout(r, 650));
            continue;
          } else {
            op.label = `Git Commit [APPROVED]`;
            op.output = `Committed cleanly. Message approved via Git pre-commit hook: "${confirmedMsg}"`;
            await get().addNewCommit(confirmedMsg);
          }
        }
        
        // 2 & 3. Operations-level permission and credentials checks
        const fileAgent = get().permissions.find((p) => p.id === "file-agent");
        const fileCred = get().credentials.find((c) => c.agentId === "file-agent");
        const fileSecBlockedByPerm = fileAgent && !fileAgent.fileSystemAccess;
        const fileSecBlockedByCred = fileCred && fileCred.status === "revoked";
        const fileAccessBlocked = (op.type === "write_file") && (fileSecBlockedByPerm || fileSecBlockedByCred);

        const memoryAgent = get().permissions.find((p) => p.id === "memory-agent");
        const memoryCred = get().credentials.find((c) => c.agentId === "memory-agent");
        const memorySecBlockedByPerm = memoryAgent && !memoryAgent.fileSystemAccess;
        const memorySecBlockedByCred = memoryCred && memoryCred.status === "revoked";
        const memoryAccessBlocked = (op.type === "save_memory") && (memorySecBlockedByPerm || memorySecBlockedByCred);

        if (fileAccessBlocked) {
          const resolutionMsg = fileSecBlockedByCred
            ? "Action skipped. Resolution: Regenerate or activate workspace VFS JWT keys in Credentials panel."
            : "Action skipped. To resolve, grant 'File System' permission to the File Workspace Architect agent.";
          set((state) => ({
            logs: [
              ...state.logs,
              `[${opTime}] SECURITY_VIOLATION: File write operation with label [${op.label}] was BLOCKED.`,
              `  └─ Target System: File system write to "${op.filepath}".`,
              `  └─ Violation Trigger: ${fileSecBlockedByCred ? "REPLAY JWT CREDENTIAL REVOKED" : "Policy Access set to DENY"}.`,
              `  └─ ${resolutionMsg}`
            ]
          }));
          await new Promise((r) => setTimeout(r, 650));
          continue;
        }

        if (memoryAccessBlocked) {
          const resolutionMsg = memorySecBlockedByCred
            ? "Action skipped. Resolution: Regenerate or activate database cluster token in Credentials panel."
            : "Action skipped. To resolve, grant 'File System' permission to the Semantic Memory Indexer agent.";
          set((state) => ({
            logs: [
              ...state.logs,
              `[${opTime}] SECURITY_VIOLATION: Memory embedding serialization [${op.label}] was BLOCKED.`,
              `  └─ Target System: Semantic vector register save.`,
              `  └─ Violation Trigger: ${memorySecBlockedByCred ? "CLUSTERING ACCESS TOKEN REVOKED" : "Policy Access set to DENY"}.`,
              `  └─ ${resolutionMsg}`
            ]
          }));
          await new Promise((r) => setTimeout(r, 650));
          continue;
        }

        set((state) => {
          let nextFiles = [...state.files];
          let nextActivePath = state.activePath;
          let nextEditorContent = state.editorContent;
          let nextVectors = [...state.vectors];

          if (op.type === "write_file" && op.filepath) {
            const codeToWrite = op.code || "";
            const exists = nextFiles.some((pf) => pf.path === op.filepath);
            if (exists) {
              nextFiles = nextFiles.map((pf) => pf.path === op.filepath ? { ...pf, content: codeToWrite } : pf);
            } else {
              const ext = op.filepath.split(".").pop() || "js";
              const lang = ext === "md" ? "markdown" : ext === "json" ? "json" : "javascript";
              nextFiles.push({ path: op.filepath, content: codeToWrite, language: lang });
            }
            nextActivePath = op.filepath;
            nextEditorContent = codeToWrite;
          }

          if (op.type === "save_memory" && op.label) {
            const newVec: MemoryVector = {
              id: `v-dyn-${Date.now()}-${i}`,
              topic: textToSend.substring(0, 24) + "...",
              content: op.output || "Embedded simulation record finalized.",
              similarity: 1.0,
            };
            nextVectors = [newVec, ...nextVectors];
          }

          const opLogs = [
            ...state.logs,
            `[${opTime}] ${op.type.toUpperCase()} -> [${op.label}]`
          ];
          if (op.output) {
            opLogs.push(`  └─ Output: ${op.output}`);
          }

          return {
            files: nextFiles,
            activePath: nextActivePath,
            editorContent: nextEditorContent,
            vectors: nextVectors,
            logs: opLogs,
          };
        });

        // Small interval realism pause
        await new Promise((r) => setTimeout(r, 900));
      }

      // Final success apply
      const agentMsgId = `agent-${Date.now()}`;
      set((state) => ({
        plan: updatedPlan && updatedPlan.length ? updatedPlan : state.plan,
        chatMessages: [
          ...state.chatMessages,
          {
            id: agentMsgId,
            sender: "agent",
            text: finalReply,
            timestamp: new Date().toLocaleTimeString(),
            thoughts,
            operations: ops,
          }
        ],
        logs: [
          ...state.logs,
          `[${new Date().toLocaleTimeString()}] FLUX_SYSTEM: Simulated collaboration cycle completed successfully.`
        ]
      }));

      // Synchronize results to Firebase
      await saveDocIfAuthenticated("chatMessages", agentMsgId, {
        id: agentMsgId,
        sender: "agent",
        text: finalReply,
        timestamp: new Date().toLocaleTimeString()
      });

      // Synchronize modified virtual code files
      const latestFiles = get().files;
      for (const file of latestFiles) {
        const docId = file.path.replace(/\//g, "_");
        await saveDocIfAuthenticated("files", docId, file);
      }

      // Synchronize updated semantic vector memory blocks
      const latestVectors = get().vectors;
      for (const vec of latestVectors) {
        await saveDocIfAuthenticated("vectors", vec.id, {
          id: vec.id,
          text: vec.content,
          agentId: "memory-agent",
          timestamp: new Date().toLocaleTimeString(),
          score: vec.similarity
        });
      }

      // Synchronize current developer plan
      const latestPlan = get().plan;
      for (const item of latestPlan) {
        await saveDocIfAuthenticated("plan", item.id, {
          id: item.id,
          label: item.label,
          status: item.status,
          priority: item.priority,
          createdAt: new Date().toISOString()
        });
      }

      // Synchronize new orchestration logging line
      const latestLogs = get().logs;
      const recentLogLine = latestLogs[latestLogs.length - 1];
      if (recentLogLine) {
        const logId = `log-evt-${Date.now()}`;
        await saveDocIfAuthenticated("logs", logId, {
          text: recentLogLine,
          timestamp: new Date().toLocaleTimeString()
        });
      }

    } catch (err: any) {
      console.error(err);
      const isApiKeyError = err.message && err.message.includes("GEMINI_API_KEY");
      set((state) => ({
        logs: [
          ...state.logs,
          `[${new Date().toLocaleTimeString()}] CRITICAL_HALT: ${err.message || "Unknown error during orchestration simulation."}`,
          ...(isApiKeyError ? [`  └─ REASON: Please navigate to Settings > Secrets in AI Studio and define key 'GEMINI_API_KEY'.`] : [])
        ],
        chatMessages: [
          ...state.chatMessages,
          {
            id: `agent-err-${Date.now()}`,
            sender: "agent",
            text: `⚠️ **Simulation Terminated**: ${err.message}.\n\nTo run real-time agent simulations, make sure you configure your **GEMINI_API_KEY** in the Secrets tab of Google AI Studio (top right Settings menu). In the meantime, you can explore the file layout, design new Todo lists, and trigger connections manually.`,
            timestamp: new Date().toLocaleTimeString()
          }
        ]
      }));
    } finally {
      set({ 
        isOrchestrating: false,
        currentRunningOp: null
      });
    }
  }
}));
