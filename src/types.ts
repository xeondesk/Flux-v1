export interface VirtualFile {
  path: string;
  content: string;
  language: string;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitBranch {
  name: string;
  isCurrent: boolean;
  commits: GitCommit[];
  files?: VirtualFile[];
  committedFiles?: VirtualFile[];
}

export interface PlanItem {
  id: string;
  label: string;
  status: "pending" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  dependencies?: string[];
  createdAt?: string;
}

export interface ToolItem {
  id: string;
  name: string;
  category: "vcs" | "automation" | "database" | "infra" | "api";
  status: "connected" | "idle" | "configured" | "disconnected";
  icon: string;
  description: string;
  pingMs?: number;
  pingHistory?: number[];
}

export interface MemoryVector {
  id: string;
  topic: string;
  content: string;
  similarity: number;
}

export interface AgentOperation {
  type: "search_memory" | "read_file" | "write_file" | "run_terminal" | "git_commit" | "save_memory";
  label: string;
  filepath?: string;
  code?: string;
  command?: string;
  output: string;
}

export interface ExecutionEvent {
  timestamp: string;
  level: "info" | "success" | "warn" | "error" | "agent";
  message: string;
  source: string;
}

export interface ChatMessage {
  id: string;
  sender: "human" | "agent";
  text: string;
  timestamp: string;
  thoughts?: string;
  operations?: AgentOperation[];
}

export interface AgentPermission {
  id: string;
  name: string;
  role: string;
  description: string;
  avatar: string; // Icon name as string or color tag
  fileSystemAccess: boolean;
  terminalAccess: boolean;
  externalAPIAccess: boolean;
}

export interface AgentCredential {
  id: string;
  agentId: string;
  agentName: string;
  serviceName: string;
  tokenValue: string;
  status: "active" | "revoked";
  lastVerified: string;
}

export interface InterAgentMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  channelId: string;
  text: string;
  timestamp: string;
  coordinationType?: "task_handover" | "api_request" | "diagnostics_pass" | "vector_embed" | "general";
  taskContext?: string;
}

export interface InterAgentChannel {
  id: string;
  name: string;
  description: string;
  icon: string;
  participants: string[]; // Agent IDs
}



