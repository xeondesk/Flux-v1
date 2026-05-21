import React, { useEffect } from "react";
import {
  Layers,
  Cpu,
  Database,
  Terminal,
  FileCode,
  CheckCircle,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  Command,
  Plus,
  Trash,
  Code,
  Save,
  MessageSquare,
  Send,
  Zap,
  Clock,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Search,
  BookOpen,
  GitBranch,
  GitCommit,
  ListTodo,
} from "lucide-react";
import FileExplorer from "./components/FileExplorer";
import PlanningEngine from "./components/PlanningEngine";
import ToolEcosystem from "./components/ToolEcosystem";
import AgentPermissions from "./components/AgentPermissions";
import GoogleTasksConsole from "./components/GoogleTasksConsole";
import InterAgentChat from "./components/InterAgentChat";
import { useFluxStore } from "./store";
import { signInWithGoogle, logOut } from "./firebase";
import { FirebaseSync } from "./firebaseSync";
import CommandPalette from "./components/CommandPalette";

export default function App() {
  const files = useFluxStore((s) => s.files);
  const activePath = useFluxStore((s) => s.activePath);
  const plan = useFluxStore((s) => s.plan);
  const tools = useFluxStore((s) => s.tools);
  const vectors = useFluxStore((s) => s.vectors);
  const editorContent = useFluxStore((s) => s.editorContent);
  const logs = useFluxStore((s) => s.logs);
  const promptInput = useFluxStore((s) => s.promptInput);
  const chatMessages = useFluxStore((s) => s.chatMessages);
  const permissions = useFluxStore((s) => s.permissions);
  const activeTab = useFluxStore((s) => s.activeTab);
  const isOrchestrating = useFluxStore((s) => s.isOrchestrating);
  const currentRunningOp = useFluxStore((s) => s.currentRunningOp);
  const apiConfig = useFluxStore((s) => s.apiConfig);
  const user = useFluxStore((s) => s.user);
  const syncStatus = useFluxStore((s) => s.syncStatus);
  const pendingGitCommit = useFluxStore((s) => s.pendingGitCommit);

  const [authError, setAuthError] = React.useState<string | null>(null);
  const [editCommitMessage, setEditCommitMessage] = React.useState("");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);

  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => {
      window.removeEventListener("keydown", handleGlobalShortcuts);
    };
  }, []);

  useEffect(() => {
    if (pendingGitCommit) {
      setEditCommitMessage(pendingGitCommit.message);
    } else {
      setEditCommitMessage("");
    }
  }, [pendingGitCommit]);

  const handleSignInWithGoogle = async () => {
    try {
      setAuthError(null);
      await signInWithGoogle();
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const errCode = err?.code || "";
      
      const isCancellation = 
        errCode === "auth/popup-closed-by-user" || 
        errMsg.includes("popup-closed-by-user") || 
        errMsg.includes("popup closed-by-user") || 
        errMsg.includes("popup-closed") || 
        errMsg.includes("popup closed") ||
        errCode === "auth/cancelled-popup-request" ||
        errMsg.includes("cancelled-popup-request") ||
        errMsg.includes("cancelled popup request");

      const isNetwork = 
        errCode === "auth/network-request-failed" ||
        errMsg.includes("network-request-failed") ||
        errMsg.includes("network request failed") ||
        errMsg.includes("Failed to fetch") ||
        errMsg.includes("NetworkError") ||
        errMsg.includes("offline");

      if (isCancellation) {
        console.log("Sign-In popup cancelled/closed in App.tsx:", errCode || errMsg);
      } else if (isNetwork) {
        console.log("Sign-In network request failed in App.tsx:", errCode || errMsg);
      } else {
        console.error("Sign-In failure caught:", err);
      }

      if (
        errCode === "auth/popup-blocked" || 
        errMsg.includes("popup-blocked") || 
        errMsg.includes("popup blocked")
      ) {
        setAuthError("popup-blocked");
      } else if (isCancellation) {
        setAuthError("popup-closed");
      } else if (isNetwork) {
        setAuthError("network-request-failed");
      } else {
        setAuthError(errMsg);
      }
    }
  };

  const setEditorContent = useFluxStore((s) => s.setEditorContent);
  const setPromptInput = useFluxStore((s) => s.setPromptInput);
  const setActiveTab = useFluxStore((s) => s.setActiveTab);
  const setActivePath = useFluxStore((s) => s.setActivePath);

  const fetchApiConfig = useFluxStore((s) => s.fetchApiConfig);
  const saveActiveFile = useFluxStore((s) => s.saveActiveFile);
  const createFile = useFluxStore((s) => s.createFile);
  const deleteFile = useFluxStore((s) => s.deleteFile);
  const togglePlanStatus = useFluxStore((s) => s.togglePlanStatus);
  const addTask = useFluxStore((s) => s.addTask);
  const deleteTask = useFluxStore((s) => s.deleteTask);
  const toggleToolStatus = useFluxStore((s) => s.toggleToolStatus);
  const refreshToolPings = useFluxStore((s) => s.refreshToolPings);
  const pingTool = useFluxStore((s) => s.pingTool);
  const executePrompt = useFluxStore((s) => s.executePrompt);
  const resetWorkspace = useFluxStore((s) => s.resetWorkspace);

  // Fetch credentials config on store load
  useEffect(() => {
    fetchApiConfig();
  }, [fetchApiConfig]);

  const handleSaveActiveFile = () => {
    saveActiveFile();
  };

  const handleCreateFile = async (path: string) => {
    const success = await createFile(path);
    if (!success) {
      alert("File already exists in virtual cache.");
    }
  };

  const handleDeleteFile = (path: string) => {
    deleteFile(path);
  };

  const handleTogglePlanStatus = (id: string) => {
    togglePlanStatus(id);
  };

  const handleAddTask = (label: string, priority: "low" | "medium" | "high", dependencies?: string[]) => {
    addTask(label, priority, dependencies);
  };

  const handleDeleteTask = (id: string) => {
    deleteTask(id);
  };

  const handleUpdateDependencies = (id: string, dependencies: string[]) => {
    useFluxStore.getState().setTaskDependencies(id, dependencies);
  };

  const handleToggleToolStatus = (id: string) => {
    toggleToolStatus(id);
  };

  const handleRefreshToolPings = () => {
    refreshToolPings();
  };

  const handleExecutePrompt = (suggestedText?: string) => {
    executePrompt(suggestedText);
  };

  const handleResetWorkspace = () => {
    resetWorkspace();
  };

  return (
    <div className="w-full min-h-screen bg-[#0F1115] text-[#E1E4E8] font-sans flex overflow-hidden selection:bg-indigo-500/30 select-none" id="flux-ide-root">
      <FirebaseSync />

      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />

      {/* Authentication Error / Popup Blocked Modal */}
      {authError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 text-sans" id="auth-error-modal">
          <div className="w-full max-w-md bg-[#16191E] border border-[#2A2D35] rounded-xl shadow-2xl shadow-black overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200" id="auth-error-card">
            <div className="p-6 border-b border-[#2A2D35] flex items-start gap-3.5" id="auth-error-header">
              <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-lg shrink-0" id="auth-error-icon-box">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-zinc-100 font-bold text-base tracking-tight">
                  {authError === "popup-blocked" 
                    ? "Sign-In Pop-Up Blocked" 
                    : authError === "popup-closed"
                    ? "Sign-In Pop-Up Closed"
                    : authError === "network-request-failed"
                    ? "Network Connection Failed"
                    : "Authentication Alert"}
                </h3>
                <p className="text-[#6366F1] font-mono text-[9px] font-bold uppercase tracking-widest mt-0.5">
                  CRITICAL PREVIEW GATEWAY
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs leading-relaxed text-zinc-300" id="auth-error-body">
              {authError === "popup-blocked" ? (
                <>
                  <p>
                    Your web browser blocked the Google Sign-In popup window. This is standard security behavior for applications running inside sandboxed Developer Preview iFrames.
                  </p>
                  <div className="space-y-2.5 bg-[#0F1115] border border-[#2A2D35] rounded-lg p-3.5" id="auth-recovery-steps">
                    <span className="font-bold text-zinc-200 block text-[11px] uppercase tracking-wider font-mono">
                      How to sign in successfully:
                    </span>
                    <ol className="list-decimal list-inside space-y-1.5 text-zinc-400">
                      <li>
                        Look at the <strong className="text-zinc-200">toolbar above this preview panel</strong> in the AI Studio editor.
                      </li>
                      <li>
                        Click the <strong className="text-zinc-200">"Open in New Tab"</strong> button (represented by an arrow launching out of a box icon).
                      </li>
                      <li>
                        In the new browser tab where popups are fully permitted, click the <strong className="text-zinc-200">Cloud Save</strong> button to sign in safely!
                      </li>
                    </ol>
                  </div>
                </>
              ) : authError === "popup-closed" ? (
                <>
                  <p>
                    The Google Sign-In pop-up window was closed before the authentication flow could be completed.
                  </p>
                  <div className="space-y-2.5 bg-[#0F1115] border border-[#2A2D35] rounded-lg p-3.5" id="auth-popup-closed-steps">
                    <span className="font-bold text-zinc-200 block text-[11px] uppercase tracking-wider font-mono">
                      How to sign in successfully:
                    </span>
                    <ol className="list-decimal list-inside space-y-1.5 text-zinc-400">
                      <li>
                        Click the <strong className="text-zinc-200">Cloud Save</strong> button to try signing in again.
                      </li>
                      <li>
                        In the pop-up, choose your Google account and complete the prompts — do not close the window prematurely.
                      </li>
                      <li>
                        If the pop-up behaves erratically inside this preview frame, try clicking the <strong className="text-zinc-200">"Open in New Tab"</strong> button above this preview, and complete the sign-in there.
                      </li>
                    </ol>
                  </div>
                </>
              ) : authError === "network-request-failed" ? (
                <>
                  <p>
                    The client has failed to establish a connection with the Google/Firebase authentication gateway.
                  </p>
                  <div className="space-y-2.5 bg-[#0F1115] border border-[#2A2D35] rounded-lg p-3.5" id="auth-network-failed-steps">
                    <span className="font-bold text-zinc-200 block text-[11px] uppercase tracking-wider font-mono">
                      Recommended Solutions:
                    </span>
                    <ol className="list-decimal list-inside space-y-1.5 text-[#A5B4FC]">
                      <li>
                        Check your device's active network connections or Wi-Fi status.
                      </li>
                      <li>
                        If you are in a secure or corporate workspace, verify that connections to <code className="bg-zinc-950 px-1 py-0.5 rounded text-indigo-300">*.firebaseapp.com</code> have not been blocked.
                      </li>
                      <li>
                        Click <strong className="text-zinc-200">"Got It"</strong>, refresh your web browser tab, and retry signing in.
                      </li>
                    </ol>
                  </div>
                </>
              ) : (
                <p>
                  An unexpected Firebase Authentication error occurred: <code className="block mt-2 p-2 bg-zinc-900 rounded border border-zinc-800 font-mono text-rose-400 break-all">{authError}</code>
                </p>
              )}
            </div>

            <div className="px-6 py-4 bg-[#0F1115] border-t border-[#2A2D35] flex justify-end gap-2.5" id="auth-error-footer">
              <button
                onClick={() => setAuthError(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-md transition-all cursor-pointer shadow-md shadow-indigo-600/10"
                id="btn-dismiss-auth-error"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* LEFT NAVIGATION RAIL */}
      <nav className="w-64 border-r border-[#2A2D35] bg-[#16191E] flex flex-col flex-shrink-0" id="flux-nav-rail">
        {/* Brand Banner */}
        <div className="p-5 border-b border-[#2A2D35] flex items-center justify-between" id="nav-brand-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-extrabold text-white shadow-md shadow-indigo-600/30" id="brand-avatar">F</div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight uppercase text-zinc-100">Flux Advanced</span>
              <span className="text-[9px] font-mono tracking-widest text-[#6366F1] font-bold">CORE ORCHESTRATOR</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto" id="nav-content-region">
          
          <div className="space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Workspace Core</div>
            
            <button
              onClick={() => setActiveTab("orchestrator")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all text-left cursor-pointer ${
                activeTab === "orchestrator"
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                  : "text-slate-400 hover:bg-[#1E2228] hover:text-slate-200 border border-transparent"
              }`}
              id="tab-orchestrator-trigger"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold">Orchestration View</span>
              </div>
              <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-500/30 px-1.5 py-[1px] rounded-full font-mono">SIM</span>
            </button>

            <button
              onClick={() => setActiveTab("planner")}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-md transition-all text-left cursor-pointer ${
                activeTab === "planner"
                  ? "bg-amber-600/10 text-amber-400 border border-amber-500/20"
                  : "text-slate-400 hover:bg-[#1E2228] hover:text-slate-200 border border-transparent"
              }`}
              id="tab-planner-trigger"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold">Task Planning Deck</span>
              </div>
              <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-500/30 px-1.5 py-[1px] rounded-full font-mono">
                {plan.filter((p) => p.status !== "done").length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("tasks")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all text-left cursor-pointer ${
                activeTab === "tasks"
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                  : "text-slate-400 hover:bg-[#1E2228] hover:text-slate-200 border border-transparent"
              }`}
              id="tab-tasks-trigger"
            >
              <div className="flex items-center gap-2.5">
                <ListTodo className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold">Google Tasks Console</span>
              </div>
              <span className="text-[10px] bg-blue-950 text-blue-400 border border-blue-500/30 px-1.5 py-[1px] rounded-full font-mono">
                LIVE
              </span>
            </button>

            <button
              onClick={() => setActiveTab("memory")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all text-left cursor-pointer ${
                activeTab === "memory"
                  ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20"
                  : "text-slate-400 hover:bg-[#1E2228] hover:text-slate-200 border border-transparent"
              }`}
              id="tab-memory-trigger"
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold">Memory Index</span>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-1.5 py-[1px] rounded-full font-mono">
                {vectors.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("permissions")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all text-left cursor-pointer ${
                activeTab === "permissions"
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                  : "text-slate-400 hover:bg-[#1E2228] hover:text-slate-200 border border-transparent"
              }`}
              id="tab-permissions-trigger"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold">Agent Permissions</span>
              </div>
              <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-500/30 px-1.5 py-[1px] rounded-full font-mono">
                {permissions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("coordinator")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all text-left cursor-pointer ${
                activeTab === "coordinator"
                  ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/35"
                  : "text-slate-400 hover:bg-[#1E2228] hover:text-slate-200 border border-transparent"
              }`}
              id="tab-coordinator-trigger"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span className="text-xs font-semibold">Inter-Agent Chat</span>
              </div>
              <span className="text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-500/30 px-1.5 py-[1px] rounded-full font-mono uppercase font-bold tracking-wider">
                PEER
              </span>
            </button>
          </div>

          {/* Active Agents Module */}
          <div className="space-y-2 mt-4">
            <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active System Nodes</div>
            <div className="space-y-1.5 px-1 bg-zinc-950/40 p-2.5 rounded-lg border border-[#2A2D35]/50">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">File Worker Engine</span>
                <span className="px-1.5 py-[2px] rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400">ONLINE</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Terminal Shell proxy</span>
                <span className={`px-1.5 py-[2px] rounded text-[9px] font-bold uppercase tracking-wider ${isOrchestrating ? "bg-indigo-500/20 text-indigo-400 animate-pulse" : "bg-neutral-800 text-neutral-400"}`}>
                  {isOrchestrating ? "RUNNING" : "IDLE"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Llm Router</span>
                <span className="px-1.5 py-[2px] rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400">STABLE</span>
              </div>
            </div>
          </div>

          {/* API Key configuration alert */}
          <div className="mt-4 p-3 bg-zinc-950/80 rounded-lg border border-[#2A2D35]/60 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Zap className={`w-3.5 h-3.5 ${apiConfig.apiKeyConfigured ? "text-emerald-400" : "text-amber-500 animate-bounce"}`} />
              <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-300">Credentials Cache</span>
            </div>
            <div className="text-[10px] text-zinc-500 leading-normal">
              {apiConfig.apiKeyConfigured ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  ✓ GEMINI_API_KEY Loaded
                </span>
              ) : (
                <span className="text-rose-400/90 font-medium leading-relaxed block">
                  ⚠️ API Key is missing. Live simulation will be offline. Add <strong className="font-mono text-white">GEMINI_API_KEY</strong> in Google AI Studio secrets tray.
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Sandbox Lock Layer */}
        <div className="p-4 border-t border-[#2A2D35] bg-[#121418] flex flex-col gap-2 font-mono text-[10px] text-slate-500" id="nav-footer">
          <div className="flex justify-between items-center">
            <span>Sandboxed Memory</span>
            <span className="font-bold text-zinc-350">CONNECTED</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden" id="sandbox-security-progress-track">
            <div className="h-full w-5/6 bg-indigo-500" id="sandbox-security-progress-fill"></div>
          </div>
        </div>
      </nav>

      {/* MAIN LAYOUT CANVAS */}
      <main className="flex-1 flex flex-col min-w-0" id="flux-main-container">
        
        {/* TOP STATUS HEADER BAR */}
        <header className="h-16 border-b border-[#2A2D35] bg-[#16191E] flex items-center justify-between px-6 flex-shrink-0" id="flux-top-header">
          <div className="flex items-center gap-5">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Active Workspace Cluster</span>
              <span className="text-sm font-mono text-[#6366F1] font-semibold">flux-dev-sandbox-0x4f</span>
            </div>
            <div className="h-8 w-px bg-slate-800"></div>
            <div className="flex items-center gap-4 hidden sm:flex">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Virtual Embeddings</span>
                <span className="text-xs text-zinc-300 font-mono">98.4% Synchronized</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="px-3 py-1.5 bg-[#1E2228] border border-[#2A2D35] text-xs font-semibold rounded hover:bg-[#252a32] hover:text-white hover:border-[#353942] text-zinc-300 transition-all cursor-pointer flex items-center gap-2"
              title="Search and run workspace actions (Ctrl+K)"
              id="top-command-palette-trigger"
            >
              <Command className="w-3.5 h-3.5 text-indigo-400" />
              <span>Actions</span>
              <kbd className="bg-zinc-950 px-1.5 py-[1px] rounded border border-zinc-900 text-zinc-500 font-mono text-[9px] select-none">
                Ctrl+K
              </kbd>
            </button>
            <button
              onClick={handleResetWorkspace}
              className="px-3 py-1.5 bg-[#1E2228] border border-[#2A2D35] text-xs font-semibold rounded hover:bg-[#252a32] hover:text-white hover:border-[#353942] transition-all cursor-pointer flex items-center gap-2"
              title="Restore standard buffers"
              id="btn-revert-workspace"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
              Revert Buffers
            </button>
            <a
              href="https://ai.studio/build"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-[#1E2228] border border-[#2A2D35] text-slate-400 hover:text-white rounded hover:bg-[#252a32] transition-all font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
              id="top-aistudio-hub-link"
            >
              Hub <ExternalLink className="w-3 h-3" />
            </a>

            {/* Firebase Google Auth & Secure Cloud Sync Portal */}
            <div className="flex items-center gap-3 border-l border-[#2A2D35] pl-4 ml-1">
              {user ? (
                <div className="flex items-center gap-3.5">
                  <div className="flex flex-col text-right hidden sm:flex">
                    <span className="text-[11px] text-zinc-200 font-semibold truncate max-w-[110px]" title={user.email || ""}>
                      {user.displayName || user.email?.split("@")[0]}
                    </span>
                    <span className="text-[9px] font-mono leading-none">
                      {syncStatus === "synced" ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1 justify-end">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Cloud Synced
                        </span>
                      ) : syncStatus === "syncing" ? (
                        <span className="text-amber-400 font-bold flex items-center gap-1 justify-end">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"></span>
                          Syncing...
                        </span>
                      ) : syncStatus === "error" ? (
                        <span className="text-rose-400 font-bold flex items-center gap-1 justify-end">
                          ■ Sync Error
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">Local Mock</span>
                      )}
                    </span>
                  </div>
                  
                  {/* Google Custom Avatar Profile Button */}
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="User Avatar"
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full border border-zinc-600/40 shadow shadow-indigo-500/10 hover:scale-105 transition-all"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-600 font-bold text-white text-xs flex items-center justify-center border border-[#2A2D35]">
                      {user.email?.substring(0, 1).toUpperCase()}
                    </div>
                  )}

                  <button
                    onClick={logOut}
                    className="px-2.5 py-1.5 bg-[#2A1616] hover:bg-[#3E1A1A] text-rose-400 border border-[#4E2222] text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
                    id="btn-firebase-signout"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSignInWithGoogle}
                  className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs rounded transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/10 active:scale-95 border border-indigo-500/30"
                  id="btn-firebase-signin"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                  Cloud Save
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Authentication Sync Ribbon */}
        {!user && (
          <div className="bg-amber-500/5 border-b border-[#2A2D35] px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-zinc-300" id="auth-warning-banner">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
              <span>You are viewing a <strong className="font-semibold text-zinc-100">Local Sandbox Mode</strong> workspace. Sign in with Google to enable automatic real-time cloud backup of all files and task lists.</span>
            </div>
            <button
              onClick={handleSignInWithGoogle}
              className="text-amber-400 hover:text-white font-bold flex items-center gap-1.5 transition-all bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 px-3 py-1.5 rounded border border-amber-500/30 text-[10px] uppercase font-mono tracking-wider cursor-pointer self-start sm:self-auto shrink-0"
              id="banner-btn-signin"
            >
              Sign In with Google
            </button>
          </div>
        )}

        {/* WORKSPACE BENTO GRID WORK BENCH */}
        <div className="flex-1 overflow-hidden grid grid-cols-12 p-5 gap-5" id="workbench-grid-layout">
          
          {/* LEFT THIRD (VARYING BY TAB SELECTION) */}
          <div className="col-span-12 md:col-span-4 flex flex-col h-full min-h-0 bg-[#16191E] rounded-xl border border-[#2A2D35] overflow-hidden" id="workspace-left-pane">
            
            {activeTab === "orchestrator" && (
              <div className="flex flex-col h-full" id="inner-panel-explorer-flow">
                <div className="flex-1 min-h-0">
                  <FileExplorer
                    files={files}
                    activePath={activePath}
                    onSelectFile={setActivePath}
                    onCreateFile={handleCreateFile}
                    onDeleteFile={handleDeleteFile}
                  />
                </div>
              </div>
            )}

            {activeTab === "planner" && (
              <div className="flex flex-col h-full" id="inner-panel-planner-flow">
                <div className="flex-1 min-h-0">
                  <PlanningEngine
                    plan={plan}
                    onToggleStatus={handleTogglePlanStatus}
                    onAddTask={handleAddTask}
                    onDeleteTask={handleDeleteTask}
                    onUpdateDependencies={handleUpdateDependencies}
                  />
                </div>
              </div>
            )}

            {activeTab === "memory" && (
              <div className="flex flex-col h-full" id="inner-panel-memory-flow">
                <div className="p-3 border-b border-[#2A2D35] flex items-center justify-between" id="mi-header">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" id="mi-badge-icon" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Semantic memory layer</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 font-bold bg-zinc-950 px-1.5 py-[2px] rounded">COSINE_SIMILARITY</span>
                </div>

                <div className="p-3 bg-zinc-950/40 border-b border-[#2A2D35]/50 text-xs text-zinc-400 space-y-2">
                  <p>In memory store, the agent saves project principles as vectorized coordinates. This models long-term project grounding.</p>
                  <div className="flex justify-between font-mono text-[10px] text-zinc-500">
                    <span>Index Nodes: {vectors.length}</span>
                    <span>Retrieval latency: 14ms</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3" id="vectors-list-deck">
                  {vectors.map((vec) => (
                    <div
                      key={vec.id}
                      className="p-3 bg-[#0F1115] border border-[#2A2D35]/60 rounded-lg hover:border-emerald-500/20 transition-all flex flex-col gap-1.5"
                      id={`vec-card-${vec.id}`}
                    >
                      <div className="flex justify-between items-center" id={`vec-top-${vec.id}`}>
                        <span className="text-xs font-bold font-mono text-emerald-400 truncate pr-2">/{vec.topic}</span>
                        <span className="text-[10px] font-mono font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 px-1 py-[0.5px] rounded">
                          Sim: {(vec.similarity).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-normal font-sans text-justify break-words">
                        {vec.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "permissions" && (
              <div className="flex flex-col h-full animate-fade-in" id="inner-panel-permissions-flow">
                <div className="flex-1 min-h-0">
                  <AgentPermissions />
                </div>
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="flex flex-col h-full animate-fade-in" id="inner-panel-tasks-flow">
                <div className="flex-1 min-h-0">
                  <GoogleTasksConsole />
                </div>
              </div>
            )}

            {activeTab === "coordinator" && (
              <div className="flex flex-col h-full animate-fade-in" id="inner-panel-coordinator-flow">
                <div className="flex-1 min-h-0">
                  <InterAgentChat />
                </div>
              </div>
            )}

          </div>

          {/* MIDDLE COLUMN - CORE CODE EDITOR & INTEGRATED PLAYBACK AND RUN LOGS */}
          <div className="col-span-12 md:col-span-5 flex flex-col h-full min-h-0 gap-5" id="workspace-middle-pane">
            
            {/* VIRTUAL EDITOR TAB */}
            <div className="flex-1 min-h-0 bg-[#16191E] rounded-xl border border-[#2A2D35] overflow-hidden flex flex-col" id="code-editor-card">
              <div className="p-3 border-b border-[#2A2D35] bg-[#1c2026] flex items-center justify-between flex-shrink-0" id="editor-header">
                <div className="flex items-center gap-2 truncate pr-2">
                  <FileCode className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-mono font-bold text-zinc-200 truncate" title={activePath}>
                    {activePath}
                  </span>
                  <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-[1px] rounded font-mono uppercase">
                    {activePath.split(".").pop() || "js"}
                  </span>
                </div>
                <button
                  onClick={handleSaveActiveFile}
                  className="px-2.5 py-1 text-[10px] tracking-wide text-indigo-400 hover:text-white bg-indigo-950/40 border border-indigo-900 hover:bg-indigo-500 rounded font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                  title="Overwrite changes to cache"
                  id="btn-save-file"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Cache
                </button>
              </div>

              {/* Editable Text Area */}
              <div className="flex-1 relative min-h-0" id="editor-textarea-container">
                <textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  spellCheck={false}
                  className="absolute inset-0 w-full h-full bg-[#0F1115] text-[#E1E4E8] font-mono text-xs p-4 leading-relaxed focus:outline-none overflow-y-auto resize-none block border-0 leading-normal"
                  id="virtual-code-editor-node"
                />
              </div>

              <div className="p-2 border-t border-[#2A2D35] bg-[#16191E] text-[9px] text-[#94A3B8] font-mono flex items-center justify-between" id="editor-footer">
                <span>UTF-8 BUFFER TYPE</span>
                <span>Lines Count: {editorContent.split("\n").length}</span>
              </div>
            </div>

            {/* DYNAMIC ORCHESTRATION EVENT STREAM WINDOW */}
            <div className="h-56 bg-[#16191E] rounded-xl border border-[#2A2D35] overflow-hidden flex flex-col flex-shrink-0" id="agentic-logs-terminal">
              <div className="p-3 border-b border-[#2A2D35] bg-[#1c2026] flex items-center justify-between flex-shrink-0" id="logs-header">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOrchestrating ? "bg-amber-400" : "bg-indigo-400"}`}></span>
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOrchestrating ? "bg-amber-500" : "bg-indigo-500"}`}></span>
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">
                    ORCHESTRATOR EVENT STREAM
                  </h3>
                </div>
                {isOrchestrating ? (
                  <div className="flex items-center gap-1 text-[10px] font-mono text-amber-500 font-semibold animate-pulse">
                    <Clock className="w-3 h-3 animate-spin" /> WORKING: {currentRunningOp}
                  </div>
                ) : (
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/50 px-1.5 py-[2px] rounded border border-emerald-900">
                    DIAGNOSTICS ONLINE
                  </span>
                )}
              </div>
              
              <div className="flex-1 p-3.5 bg-[#0F1115] font-mono text-[10.5px] text-zinc-300 overflow-y-auto space-y-1 scrollbar-thin select-text selection:bg-indigo-500/40" id="terminal-contents">
                {logs.map((log, index) => {
                  let textClass = "text-zinc-400";
                  if (log.includes("WRITE_FILE") || log.includes("FILE_AGENT")) {
                    textClass = "text-emerald-400";
                  } else if (log.includes("LLM_ROUTER") || log.includes("ROUTER")) {
                    textClass = "text-indigo-400";
                  } else if (log.includes("PLANNER") || log.includes("PLANNING_ENGINE")) {
                    textClass = "text-amber-400";
                  } else if (log.includes("CRITICAL_HALT")) {
                    textClass = "text-rose-400 font-semibold";
                  } else if (log.includes("COGNITIVE_PLANE")) {
                    textClass = "text-purple-400 italic";
                  } else if (log.includes("─")) {
                    textClass = "text-zinc-650 opacity-60";
                  }

                  return (
                    <div key={index} className={`whitespace-pre-wrap leading-normal ${textClass}`} id={`term-line-${index}`}>
                      {log}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN - TOOL ECOSYSTEM & INTERACTION CHAT CONSOLE */}
          <div className="col-span-12 md:col-span-3 flex flex-col h-full min-h-0 gap-5" id="workspace-right-pane">
            
            {/* TOOL ECOSYSTEM CARD */}
            <div className="flex-1 min-h-0 bg-[#16191E] rounded-xl border border-[#2A2D35] overflow-hidden" id="tool-ecosystem-card">
              <ToolEcosystem
                tools={tools}
                onToggleTool={handleToggleToolStatus}
                onRefreshPings={handleRefreshToolPings}
                onPingTool={pingTool}
              />
            </div>

            {/* QUICK COLLABORATION ACTIONS SEED CARD */}
            <div className="h-56 bg-[#16191E] rounded-xl border border-[#2A2D35] p-4 flex flex-col gap-3 flex-shrink-0" id="quick-presets-deck">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Suggested Guidelines
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-1" id="presets-panel">
                <button
                  onClick={() => handleExecutePrompt("Configure security headers inside index.js to prevent unauthorized cross-origin requests")}
                  disabled={isOrchestrating}
                  className="w-full text-left p-2 bg-[#0F1115] hover:bg-[#1C1F26] border border-[#2A2D35] hover:border-indigo-500/40 rounded-lg text-[10.5px] leading-snug text-zinc-300 transition-all cursor-pointer block"
                  id="preset-btn-1"
                >
                  "Add Cross-Origin TLS headers in index.js"
                </button>
                <button
                  onClick={() => handleExecutePrompt("Refactor standard deviation TTL rules inside cache.js to purge expired items automatically")}
                  disabled={isOrchestrating}
                  className="w-full text-left p-2 bg-[#0F1115] hover:bg-[#1C1F26] border border-[#2A2D35] hover:border-indigo-500/40 rounded-lg text-[10.5px] leading-snug text-zinc-300 transition-all cursor-pointer block"
                  id="preset-btn-2"
                >
                  "Expose automatic auto-purge rules"
                </button>
                <button
                  onClick={() => handleExecutePrompt("Add standard Prometheus style path for metrics logging on /metrics endpoint")}
                  disabled={isOrchestrating}
                  className="w-full text-left p-2 bg-[#0F1115] hover:bg-[#1C1F26] border border-[#2A2D35] hover:border-indigo-500/40 rounded-lg text-[10.5px] leading-snug text-zinc-300 transition-all cursor-pointer block"
                  id="preset-btn-3"
                >
                  "Implement Prometheus stats logging"
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* BOTTOM FLOATING ORCHESTRATOR CHAT & CONTROLLER PLATFORM */}
        <footer className="p-4 border-t border-[#2A2D35] bg-[#16191E] flex flex-col gap-3 flex-shrink-0" id="flux-footer-console">
          
          {/* Active Conversations Console */}
          <div className="max-h-36 overflow-y-auto bg-[#0F1115] border border-[#2A2D35] rounded-lg p-3 space-y-2 select-text selection:bg-indigo-500/30" id="chat-messages-container">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`text-xs leading-relaxed flex gap-2 ${
                  msg.sender === "human" ? "text-indigo-300 font-semibold" : "text-zinc-200"
                }`}
                id={`chat-${msg.id}`}
              >
                <span className="font-bold flex-shrink-0" id={`chat-sender-${msg.id}`}>
                  {msg.sender === "human" ? "YOU:" : "FLUX_AGENT:"}
                </span>
                <div className="flex-1 break-words whitespace-pre-wrap font-sans" id={`chat-text-${msg.id}`}>
                  {msg.text}

                  {/* Operational details if available */}
                  {msg.thoughts && (
                    <details className="mt-1.5 text-[10.5px] p-2 bg-zinc-950 rounded border border-zinc-900 group" id={`chat-details-${msg.id}`}>
                      <summary className="text-zinc-500 cursor-pointer hover:text-zinc-300 font-mono text-[9px] font-bold uppercase select-none">
                        Show routing orchestration thoughts
                      </summary>
                      <p className="mt-1 text-zinc-400 font-sans italic leading-relaxed pl-1.5 border-l border-[#6366F1]/35">
                        {msg.thoughts}
                      </p>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Prompt Form Input deck */}
          <div className="flex gap-2.5 items-center" id="prompt-input-row">
            <div className="relative flex-1" id="prompt-input-positioner">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isOrchestrating) {
                    handleExecutePrompt();
                  }
                }}
                disabled={isOrchestrating}
                placeholder={
                  apiConfig.apiKeyConfigured 
                    ? "Collaborative instructions (e.g. 'implement authentication rules inside index.js'...)"
                    : "⚠️ Please configure GEMINI_API_KEY in Secrets tray to activate core orchestration query engine..."
                }
                className="w-full bg-[#0F1115] hover:bg-[#111317] border border-[#2A2D35] hover:border-[#353942] focus:border-indigo-600 rounded-lg px-4 py-3 text-xs text-zinc-150 placeholder-zinc-500 focus:outline-none transition-all leading-normal"
                id="input-prompt-box"
              />
              <div className="absolute right-3.5 top-3 text-[9.5px] font-mono text-zinc-500 flex items-center gap-1 select-none" id="prompt-kbd-tip">
                <Command className="w-3.5 h-3.5" /> <span className="font-bold">ENTER</span>
              </div>
            </div>

            <button
              onClick={() => handleExecutePrompt()}
              disabled={isOrchestrating || !promptInput.trim()}
              className={`px-4 py-3 text-xs leading-normal font-bold uppercase tracking-wider rounded-lg flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                isOrchestrating || !promptInput.trim()
                  ? "bg-zinc-800 text-zinc-500 border border-zinc-900 cursor-not-allowed shadow-none"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 hover:scale-[1.01] active:scale-[0.99]"
              }`}
              id="btn-trigger-orchestrator"
            >
              <Send className={`w-3.5 h-3.5 ${isOrchestrating ? "animate-bounce" : ""}`} />
              {isOrchestrating ? "Orchestrating..." : "Execute"}
            </button>
          </div>

          <div className="flex justify-between text-[9px] text-zinc-650 font-mono opacity-80" id="prompt-stats-footer">
            <span>LLM Endpoint: gemini-3.5-flash</span>
            <span>Agent Framework Simulation Engine v1.0.4c</span>
          </div>

        </footer>

      </main>

      {/* Git Pre-commit Hook Overlay Dialog */}
      {pendingGitCommit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in" id="git-precommit-modal-overlay">
          <div className="w-full max-w-xl bg-[#16191E] border border-amber-500/40 rounded-xl shadow-2xl shadow-amber-500/5 overflow-hidden flex flex-col animate-scale-up" id="git-precommit-modal-box">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border-b border-amber-500/20 p-4 flex items-center justify-between" id="git-modal-header">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 font-mono">GIT VERSION CONTROL HOOK</span>
                  <span className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Pre-Commit Validation Protocol</span>
                </div>
              </div>
              <button
                onClick={() => pendingGitCommit.onCancel()}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-all cursor-pointer"
                id="btn-git-modal-close"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Workspace Snapshot and Changelog Review section */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4 max-h-[75vh] text-left" id="git-modal-body">
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                An agentic file operation has requested a VCS git commit transaction. Please review the workspace snapshots, active code task bindings, and proposed commit description before confirming the commit command. Only commit code that directly maps to the active plan.
              </p>

              {/* Workspace Changed Buffers Segment */}
              <div className="space-y-2" id="changed-buffers-section">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-zinc-400" /> Active Workspace Snapshots
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-900/10 px-1.5 py-[1px] border border-emerald-500/20 rounded">
                    {files.length} Buffer(s) Changed
                  </span>
                </div>
                <div className="bg-[#0F1115] border border-[#2A2D35] rounded-lg p-3 max-h-32 overflow-y-auto space-y-2 pr-1">
                  {files.map((file) => (
                    <div key={file.path} className="flex items-center justify-between text-xs font-mono" id={`modal-file-${file.path.replace(/\//g, "_")}`}>
                      <span className="text-zinc-300 truncate">{file.path}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[8.5px] text-zinc-500">
                          {file.content.length} bytes
                        </span>
                        <span className="px-1.5 py-[1px] text-[8px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/10 rounded">
                          MODIFIED
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Dependencies / Current Task Segment */}
              <div className="space-y-2" id="task-relevance-section">
                <span className="text-[9.5px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-zinc-400" /> Task Board Alignment
                </span>
                <div className="bg-[#0F1115] border border-[#2A2D35] rounded-lg p-3 max-h-32 overflow-y-auto space-y-2 pr-1">
                  {plan.filter(t => t.status === "in-progress" || t.status === "pending").map((task) => (
                    <div key={task.id} className="flex items-center justify-between text-xs" id={`modal-task-${task.id}`}>
                      <span className="text-zinc-300 font-sans truncate pr-2">{task.label}</span>
                      <span className={`px-1.5 py-[1px] text-[8px] font-bold uppercase rounded border ${
                        task.status === "in-progress" 
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse" 
                          : "bg-zinc-900 text-zinc-500 border-zinc-800"
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  ))}
                  {plan.length === 0 && (
                    <div className="text-zinc-650 text-xs italic py-1 text-center">No active tasks loaded in current backlog.</div>
                  )}
                </div>
              </div>

              {/* Commit message editor */}
              <div className="space-y-2" id="commit-msg-input-section">
                <label className="text-[9.5px] uppercase font-bold text-zinc-500 tracking-wider block">
                  Interactive Commit Message (Editable):
                </label>
                <div className="relative">
                  <textarea
                    value={editCommitMessage}
                    onChange={(e) => setEditCommitMessage(e.target.value)}
                    rows={3}
                    className="w-full bg-[#0F1115] border border-[#2A2D35] hover:border-zinc-700/80 focus:border-amber-500 rounded-lg p-3 text-xs text-white placeholder-zinc-650 focus:outline-none transition-all resize-none leading-relaxed font-mono"
                    placeholder="Enter commit explanation detailing the workspace refactoring..."
                    id="git-commit-msg-textarea"
                  />
                  {!editCommitMessage.trim() && (
                    <div className="text-[9.5px] text-rose-450 mt-1 flex items-center gap-1 font-sans" id="commit-msg-warning">
                      <AlertCircle className="w-3 h-3" /> A commit message is required to sign-off and push changes.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-zinc-950/60 border-t border-[#2A2D35] flex items-center justify-end gap-3" id="git-modal-footer">
              <button
                onClick={() => pendingGitCommit.onCancel()}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                id="btn-git-abort"
              >
                Reject Commit Hook
              </button>
              <button
                disabled={!editCommitMessage.trim()}
                onClick={() => pendingGitCommit.onConfirm(editCommitMessage.trim())}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  !editCommitMessage.trim()
                    ? "bg-zinc-800 text-zinc-500 border border-zinc-900 cursor-not-allowed"
                    : "bg-amber-500 hover:bg-amber-400 text-[#0F1115] border border-amber-650 font-extrabold hover:scale-[1.01] active:scale-[0.99]"
                }`}
                id="btn-git-approve-commit"
              >
                Approve & Commit Changes
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
