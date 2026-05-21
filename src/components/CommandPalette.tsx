import React, { useState, useEffect, useRef } from "react";
import { 
  Command, 
  Search, 
  X, 
  Layers, 
  CheckCircle, 
  Database, 
  ShieldCheck, 
  MessageSquare, 
  Plus, 
  GitBranch, 
  Terminal, 
  Sparkles, 
  RotateCcw, 
  Code, 
  Laptop, 
  Settings, 
  Folder, 
  HelpCircle, 
  ArrowRight, 
  ListTodo,
  ToggleLeft,
  AlertTriangle,
  BadgeAlert
} from "lucide-react";
import { useFluxStore } from "../store";
import { VirtualFile, AgentPermission, ToolItem, GitBranch as GitBranchType } from "../types";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaletteMode = "actions" | "create-file" | "create-branch" | "branch-conflict";

interface CommandAction {
  id: string;
  title: string;
  subtitle?: string;
  category: "navigation" | "files" | "git" | "agent" | "tools" | "workspace";
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void | Promise<void>;
  badge?: string;
  badgeStyle?: string;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<PaletteMode>("actions");
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Create File / Create Branch Form Inputs
  const [formInput, setFormInput] = useState("");
  const [formError, setFormError] = useState("");

  // Branch Switch Conflict states
  const [targetConflictBranch, setTargetConflictBranch] = useState<GitBranchType | null>(null);
  const [conflictingFiles, setConflictingFiles] = useState<{ path: string; reason: string }[]>([]);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load Store Values
  const files = useFluxStore((s) => s.files);
  const gitBranches = useFluxStore((s) => s.gitBranches);
  const tools = useFluxStore((s) => s.tools);
  const permissions = useFluxStore((s) => s.permissions);
  const activeTab = useFluxStore((s) => s.activeTab);
  const isOrchestrating = useFluxStore((s) => s.isOrchestrating);
  const activePath = useFluxStore((s) => s.activePath);
  const editorContent = useFluxStore((s) => s.editorContent);

  // Load Store Actions
  const setActiveTab = useFluxStore((s) => s.setActiveTab);
  const setActivePath = useFluxStore((s) => s.setActivePath);
  const createFile = useFluxStore((s) => s.createFile);
  const createBranch = useFluxStore((s) => s.createBranch);
  const switchBranch = useFluxStore((s) => s.switchBranch);
  const togglePermission = useFluxStore((s) => s.togglePermission);
  const toggleToolStatus = useFluxStore((s) => s.toggleToolStatus);
  const simulateAgentConversation = useFluxStore((s) => s.simulateAgentConversation);
  const setIsOrchestrating = useFluxStore((s) => s.setIsOrchestrating);
  const resetWorkspace = useFluxStore((s) => s.resetWorkspace);

  const currentBranch = gitBranches.find((b) => b.isCurrent) || gitBranches[0];

  // Focus and resets on open/toggle
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setMode("actions");
      setSelectedIndex(0);
      setFormInput("");
      setFormError("");
      setTargetConflictBranch(null);
      setConflictingFiles([]);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Build uncommitted files helper
  const detectCheckoutConflicts = (targetB: GitBranchType) => {
    if (!currentBranch) return [];
    const currentCommitted = currentBranch.committedFiles || currentBranch.files || [];
    const targetFiles = targetB.files || [];

    const conflicts: { path: string; reason: string }[] = [];

    files.forEach((f) => {
      const currentContent = f.path === activePath ? editorContent : f.content;
      const commFile = currentCommitted.find(cf => cf.path === f.path);
      const committedContent = commFile ? commFile.content : null;

      const isUncommitted = committedContent !== currentContent;

      if (isUncommitted) {
        const targetFile = targetFiles.find(tf => tf.path === f.path);
        const targetContent = targetFile ? targetFile.content : null;

        if (committedContent === null) {
          if (targetFile && targetContent !== currentContent) {
            conflicts.push({
              path: f.path,
              reason: "Conflict: Directory contains newly created file with different content."
            });
          }
        } else if (!targetFile) {
          conflicts.push({
            path: f.path,
            reason: "Conflict: Deleted/missing in target branch but edited locally."
          });
        } else if (targetContent !== committedContent) {
          conflicts.push({
            path: f.path,
            reason: "Conflict: Code values differ from destination branch copy."
          });
        }
      }
    });

    return conflicts;
  };

  // Build complete command list based on state
  const getCommandActions = (): CommandAction[] => {
    const list: CommandAction[] = [];

    // --- NAVIGATION ---
    list.push({
      id: "nav-orchestrator",
      title: "Switch to Orchestration Simulation View",
      subtitle: "Launch LLM runs, console diagnostics, & test terminal",
      category: "navigation",
      shortcut: "g o",
      icon: <Layers className="w-4 h-4 text-indigo-400" />,
      action: () => {
        setActiveTab("orchestrator");
        onClose();
      }
    });
    list.push({
      id: "nav-planner",
      title: "Switch to Task Planning Deck",
      subtitle: "Examine project objectives, Gantt milestones, and goals",
      category: "navigation",
      shortcut: "g p",
      icon: <CheckCircle className="w-4 h-4 text-amber-400" />,
      action: () => {
        setActiveTab("planner");
        onClose();
      }
    });
    list.push({
      id: "nav-tasks",
      title: "Switch to Google Tasks Sync Console",
      subtitle: "View real-time workspace integrations & synched items",
      category: "navigation",
      shortcut: "g t",
      icon: <ListTodo className="w-4 h-4 text-blue-400" />,
      action: () => {
        setActiveTab("tasks");
        onClose();
      }
    });
    list.push({
      id: "nav-memory",
      title: "Switch to Memory Database Index",
      subtitle: "Review semantic memory fragments & vector scores",
      category: "navigation",
      shortcut: "g m",
      icon: <Database className="w-4 h-4 text-emerald-400" />,
      action: () => {
        setActiveTab("memory");
        onClose();
      }
    });
    list.push({
      id: "nav-permissions",
      title: "Switch to Agent Security & Permissions",
      subtitle: "Revoke API access, configure keys, or set credentials",
      category: "navigation",
      shortcut: "g s",
      icon: <ShieldCheck className="w-4 h-4 text-teal-400" />,
      action: () => {
        setActiveTab("permissions");
        onClose();
      }
    });
    list.push({
      id: "nav-coordinator",
      title: "Switch to Inter-Agent Collaboration Chat",
      subtitle: "Discuss task diagnostics & workflows with expert AI runtimes",
      category: "navigation",
      shortcut: "g c",
      icon: <MessageSquare className="w-4 h-4 text-pink-400" />,
      action: () => {
        setActiveTab("coordinator");
        onClose();
      }
    });

    // --- FILE UTILITIES ---
    list.push({
      id: "file-new",
      title: "Create a Brand-New Virtual File",
      subtitle: "Spawn a clean buffer inside workspace registry",
      category: "files",
      shortcut: "N",
      icon: <Plus className="w-4 h-4 text-emerald-400" />,
      action: () => {
        setFormInput("");
        setFormError("");
        setMode("create-file");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    });

    // Dynamic File selections
    files.forEach((file) => {
      const isCurrentActive = file.path === activePath;
      list.push({
        id: `file-select-${file.path}`,
        title: `Open File: ${file.path}`,
        subtitle: isCurrentActive ? "Active File Buffer" : `Open in code sandbox (${file.language})`,
        category: "files",
        badge: isCurrentActive ? "editing" : undefined,
        badgeStyle: "bg-indigo-950 text-indigo-400 border-indigo-500/20",
        icon: <Code className="w-4 h-4 text-sky-400" />,
        action: () => {
          setActivePath(file.path);
          onClose();
        }
      });
    });

    // --- GIT & VERSIONING ---
    list.push({
      id: "git-branch-new",
      title: "Git: Create New Version Branch...",
      subtitle: `Fork working sandbox from current: "${currentBranch?.name}"`,
      category: "git",
      shortcut: "B",
      icon: <Plus className="w-4 h-4 text-amber-500" />,
      action: () => {
        setFormInput("");
        setFormError("");
        setMode("create-branch");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    });

    // Dynamic checkout branches list
    gitBranches.forEach((br) => {
      const isCur = br.name === currentBranch?.name;
      list.push({
        id: `git-switch-${br.name}`,
        title: `Git Checkout: switch to "${br.name}"`,
        subtitle: isCur ? "Already Checked Out" : `Checkout branch (${br.commits?.length || 0} commits)`,
        category: "git",
        badge: isCur ? "Current" : undefined,
        badgeStyle: "bg-emerald-950 text-emerald-400 border border-emerald-500/20",
        icon: <GitBranch className="w-4 h-4 text-amber-500" />,
        action: async () => {
          if (isCur) return;
          const conflicts = detectCheckoutConflicts(br);
          if (conflicts.length > 0) {
            setTargetConflictBranch(br);
            setConflictingFiles(conflicts);
            setMode("branch-conflict");
          } else {
            await switchBranch(br.name);
            onClose();
          }
        }
      });
    });

    // --- AGENT OPERATIONS ---
    list.push({
      id: "agent-toggle-sim",
      title: isOrchestrating ? "Stop Active Orchestration Shell" : "Start Active Orchestration Shell Simulation",
      subtitle: isOrchestrating ? "Force suspend loop terminal logs" : "Initiate live worker thread monitoring simulation",
      category: "agent",
      badge: isOrchestrating ? "running" : "idle",
      badgeStyle: isOrchestrating ? "bg-indigo-950 text-indigo-400 animate-pulse border-indigo-500/20" : "bg-zinc-900 text-zinc-500",
      shortcut: "⌥X",
      icon: <Terminal className="w-4 h-4 text-violet-400" />,
      action: () => {
        setIsOrchestrating(!isOrchestrating);
        onClose();
      }
    });
    list.push({
      id: "agent-peer-chat",
      title: "Simulate Collaborative Agent Chat Conversation",
      subtitle: "Execute multi-agent autonomous debate over plan directives",
      category: "agent",
      shortcut: "⌥C",
      icon: <Sparkles className="w-4 h-4 text-pink-400" />,
      action: () => {
        setActiveTab("coordinator");
        simulateAgentConversation();
        onClose();
      }
    });

    // Dynamic Permission toggling
    permissions.forEach((perm) => {
      // Toggle FileSystem
      list.push({
        id: `perm-toggle-${perm.id}-fs`,
        title: `Toggle Config: ${perm.name} - File Access`,
        subtitle: `Set file access to ${perm.fileSystemAccess ? "Disabled" : "Enabled"}`,
        category: "agent",
        badge: perm.fileSystemAccess ? "Allowed" : "Blocked",
        badgeStyle: perm.fileSystemAccess ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400",
        icon: <ShieldCheck className="w-4 h-4 text-zinc-400" />,
        action: async () => {
          await togglePermission(perm.id, "fileSystemAccess");
          // Keep open but refresh / or close safely. Let's close with log.
          onClose();
        }
      });
      // Toggle Terminal
      list.push({
        id: `perm-toggle-${perm.id}-term`,
        title: `Toggle Config: ${perm.name} - Terminal Host Shell`,
        subtitle: `Set terminal execution permissions to ${perm.terminalAccess ? "Disabled" : "Enabled"}`,
        category: "agent",
        badge: perm.terminalAccess ? "Allowed" : "Blocked",
        badgeStyle: perm.terminalAccess ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400",
        icon: <ShieldCheck className="w-4 h-4 text-zinc-400" />,
        action: async () => {
          await togglePermission(perm.id, "terminalAccess");
          onClose();
        }
      });
      // Toggle APIs
      list.push({
        id: `perm-toggle-${perm.id}-api`,
        title: `Toggle Config: ${perm.name} - External APIs`,
        subtitle: `Set remote access calls to ${perm.externalAPIAccess ? "Disabled" : "Enabled"}`,
        category: "agent",
        badge: perm.externalAPIAccess ? "Allowed" : "Blocked",
        badgeStyle: perm.externalAPIAccess ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400",
        icon: <ShieldCheck className="w-4 h-4 text-zinc-400" />,
        action: async () => {
          await togglePermission(perm.id, "externalAPIAccess");
          onClose();
        }
      });
    });

    // --- TOOLS CONTROL ---
    tools.forEach((tool) => {
      const isCon = tool.status === "connected" || tool.status === "configured";
      list.push({
        id: `tool-toggle-${tool.id}`,
        title: `Configure Tool: Toggle status of "${tool.name}"`,
        subtitle: `Currently toggled to: ${tool.status} — Click to switch`,
        category: "tools",
        badge: tool.status.toUpperCase(),
        badgeStyle: isCon ? "bg-indigo-950 text-indigo-400" : "bg-zinc-900 text-zinc-500",
        icon: <ToggleLeft className="w-4 h-4 text-teal-400" />,
        action: async () => {
          await toggleToolStatus(tool.id);
          onClose();
        }
      });
    });

    // --- WORKSPACE & SYSTEM ---
    list.push({
      id: "workspace-reset",
      title: "System Buffer Override: Reset Workspace Settings",
      subtitle: "Revert all caches, mock repositories, and tasks to defaults",
      category: "workspace",
      shortcut: "⌥R",
      icon: <RotateCcw className="w-4 h-4 text-rose-500" />,
      action: () => {
        resetWorkspace();
        onClose();
      }
    });

    return list;
  };

  const commandActions = getCommandActions();

  // Filter actions based on query when key matched
  const filteredActions = commandActions.filter((act) => {
    const q = search.toLowerCase();
    return (
      act.title.toLowerCase().includes(q) ||
      (act.subtitle && act.subtitle.toLowerCase().includes(q)) ||
      act.category.toLowerCase().includes(q)
    );
  });

  // Automatically clip select indicator bounds
  useEffect(() => {
    if (selectedIndex >= filteredActions.length) {
      setSelectedIndex(0);
    }
  }, [search, filteredActions, selectedIndex]);

  // Handle all core keyboard controls (Input hooks and list actions)
  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (mode !== "actions") {
        setMode("actions");
        setFormInput("");
        setFormError("");
        setSearch("");
        setTimeout(() => inputRef.current?.focus(), 50);
      } else {
        onClose();
      }
      return;
    }

    if (mode === "actions") {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) >= filteredActions.length ? 0 : prev + 1);
        scrollHighlightedIntoView();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1) < 0 ? filteredActions.length - 1 : prev - 1);
        scrollHighlightedIntoView();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const highlighted = filteredActions[selectedIndex];
        if (highlighted) {
          await highlighted.action();
        }
      }
    } else if (mode === "create-file") {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = formInput.trim();
        if (!val) return;
        
        // Match path normalization
        let normalized = val;
        if (normalized.startsWith("/")) {
          normalized = normalized.substring(1);
        }

        const isDuplicate = files.some(f => f.path.toLowerCase() === normalized.toLowerCase());
        if (isDuplicate) {
          setFormError("Buffer file path already exists in current workspace catalog.");
          return;
        }

        const success = await createFile(normalized);
        if (success) {
          setActivePath(normalized);
          onClose();
        } else {
          setFormError("Failed to initialize virtual file writer buffer.");
        }
      }
    } else if (mode === "create-branch") {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = formInput.trim().replace(/\s+/g, "-").toLowerCase();
        if (!val) return;

        const isDuplicate = gitBranches.some(b => b.name.toLowerCase() === val.toLowerCase());
        if (isDuplicate) {
          setFormError("Branch with this tag name already registered in local repository.");
          return;
        }

        await createBranch(val);
        onClose();
      }
    } else if (mode === "branch-conflict") {
      // Conflict Resolution Actions Keyboard hook
      if (e.key === "Enter" && targetConflictBranch) {
        // Carry Over (Default Enter)
        e.preventDefault();
        await switchBranch(targetConflictBranch.name, false);
        onClose();
      } else if (e.key === "Enter" && e.shiftKey && targetConflictBranch) {
        // Discard & Overwrite (Shift + Enter)
        e.preventDefault();
        await switchBranch(targetConflictBranch.name, true);
        onClose();
      }
    }
  };

  const scrollHighlightedIntoView = () => {
    setTimeout(() => {
      const activeEl = listRef.current?.querySelector(".bg-zinc-900\\/90");
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }, 10);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-16 bg-black/75 backdrop-blur-md animate-fade-in" 
      onClick={onClose}
      id="global-command-palette-modal"
    >
      <div 
        className="bg-[#111317] border border-zinc-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        id="command-palette-card"
      >
        
        {/* TOP INPUT ROW */}
        {mode === "actions" && (
          <div className="relative flex items-center border-b border-zinc-800 bg-[#14161B]">
            <Search className="absolute left-4 w-5 h-5 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actions, open files, switch git branches, toggle logs..."
              className="w-full bg-transparent p-4.5 pl-12 pr-12 text-sm text-zinc-100 outline-none placeholder-zinc-500 font-sans"
              id="cmd-palette-search-box"
              autoFocus
            />
            <button 
              onClick={onClose}
              className="absolute right-4 p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* NESTED INPUT ROW: CREATE FILE */}
        {mode === "create-file" && (
          <div className="p-5 border-b border-zinc-800 bg-[#14161B] space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
              <Plus className="w-3.5 h-3.5" />
              <span>Create Virtual File Buffer</span>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={formInput}
              onChange={(e) => { setFormInput(e.target.value); setFormError(""); }}
              placeholder="e.g., src/components/SidebarTracker.js"
              className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-3.5 text-sm text-zinc-200 outline-none focus:border-emerald-500 font-mono transition-all"
              id="cmd-palette-file-input"
              autoFocus
            />
            {formError ? (
              <p className="text-[11px] text-rose-400 font-sans font-medium">{formError}</p>
            ) : (
              <p className="text-[10px] text-zinc-500 font-sans">Type file path relative to root directory, and press <strong className="text-zinc-400 font-mono">[Enter]</strong> to create. Press <strong className="text-zinc-400 font-mono">[Esc]</strong> to cancel.</p>
            )}
          </div>
        )}

        {/* NESTED INPUT ROW: CREATE BRANCH */}
        {mode === "create-branch" && (
          <div className="p-5 border-b border-zinc-800 bg-[#14161B] space-y-2 font-sans">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-500">
              <GitBranch className="w-3.5 h-3.5 animate-pulse" />
              <span>Spawn Git Version Branch</span>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={formInput}
              onChange={(e) => { setFormInput(e.target.value); setFormError(""); }}
              placeholder="e.g., feature/secure-token-authorization"
              className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-3.5 text-sm text-zinc-200 outline-none focus:border-amber-500 font-mono transition-all"
              id="cmd-palette-branch-input"
              autoFocus
            />
            {formError ? (
              <p className="text-[11px] text-rose-400 font-sans font-medium">{formError}</p>
            ) : (
              <p className="text-[10px] text-zinc-500 font-sans">Enter branch name tag (spaces will be normal-bound as dashes). Press <strong className="text-zinc-400 font-mono">[Enter]</strong> to fork, <strong className="text-zinc-400 font-mono">[Esc]</strong> to go back.</p>
            )}
          </div>
        )}

        {/* NESTED CONFLICT GATE: INTERACTIVE SCREEN */}
        {mode === "branch-conflict" && targetConflictBranch && (
          <div className="p-5 border-b border-zinc-800 bg-[#171414] space-y-4 font-sans">
            <div className="flex items-center gap-2.5 text-rose-400 font-bold text-xs font-mono uppercase tracking-widest bg-rose-955/20 border border-rose-500/10 p-2.5 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
              Checkout Safegate Block: Uncommitted Active Buffer Conflict
            </div>
            <p className="text-xs text-zinc-350 leading-relaxed">
              Switching from index to <strong className="text-amber-400 font-mono">"{targetConflictBranch.name}"</strong> directly would overwrite edits currently dirty on your active editor index. Choose a safety action:
            </p>

            <div className="bg-zinc-950/65 border border-zinc-850 rounded-lg p-3 space-y-2">
              <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider block">Buffers in conflicting status:</span>
              <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
                {conflictingFiles.map((c, idx) => (
                  <div key={idx} className="flex flex-col gap-0.5 text-[10.5px] font-mono border-b border-zinc-900/30 pb-1 last:border-0 last:pb-0">
                    <span className="font-bold text-rose-400 flex items-center gap-1">■ {c.path}</span>
                    <span className="text-[9px] text-zinc-550 pl-3.5 italic">{c.reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="grid grid-cols-2 gap-3.5 pt-2">
              <div 
                onClick={async () => {
                  await switchBranch(targetConflictBranch.name, false);
                  onClose();
                }}
                className="bg-amber-500/10 p-3.5 border border-amber-500/20 hover:border-amber-400 rounded-xl cursor-pointer transition-all group flex flex-col gap-1"
                title="Preserve edits and push them on target branch"
              >
                <div className="flex justify-between items-center text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  <span>Carry Over Edits</span>
                  <span className="text-[8.5px] bg-amber-500 text-black font-extrabold px-1.5 py-[0.5px] rounded select-none font-mono tracking-tighter">Enter</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-sans leading-normal">
                  Saves local modifications safely and carries them onto <strong className="text-zinc-300 font-semibold">"{targetConflictBranch.name}"</strong> on switch.
                </span>
              </div>

              <div 
                onClick={async () => {
                  await switchBranch(targetConflictBranch.name, true);
                  onClose();
                }}
                className="bg-rose-955/25 p-3.5 border border-rose-500/25 hover:border-rose-400 rounded-xl cursor-pointer transition-all group flex flex-col gap-1"
                title="Completely discard workspace modifications"
              >
                <div className="flex justify-between items-center text-xs font-bold text-rose-400 uppercase tracking-wider font-mono">
                  <span>Discard & Overwrite</span>
                  <span className="text-[8.5px] bg-rose-500 text-white font-extrabold px-1.5 py-[0.5px] rounded select-none font-mono tracking-tighter">Shift + Enter</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-sans leading-normal">
                  Discards all uncommitted workspace edits entirely, making target checkout pristine.
                </span>
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 text-center">Press <strong className="text-zinc-450 font-mono">[Esc]</strong> or <strong className="text-zinc-450 font-mono">[Abort Button]</strong> to cancel switch.</p>
          </div>
        )}

        {/* RESULTS SCROLLABLE LIST */}
        {mode === "actions" && (
          <div 
            ref={listRef}
            className="flex-1 overflow-y-auto max-h-[385px] p-2 space-y-[2px] divide-y divide-zinc-950 bg-[#111317]"
            id="cmd-palette-actions-list"
          >
            {filteredActions.length === 0 ? (
              <div className="text-center py-10 text-zinc-550 text-xs px-3 font-sans leading-relaxed flex flex-col items-center justify-center gap-2">
                <Command className="w-8 h-8 text-zinc-800" />
                <span>No commands or file references found matching "<strong className="text-zinc-300 font-mono break-all">{search}</strong>".</span>
                <span className="text-[10px] text-zinc-600 mt-1">Try typing file name, tab identifier, or git keywords.</span>
              </div>
            ) : (
              // Group items elegantly
              ["navigation", "files", "git", "agent", "tools", "workspace"].map((catName) => {
                const categoryActions = filteredActions.filter((a) => a.category === catName);
                if (categoryActions.length === 0) return null;

                return (
                  <div key={catName} className="py-2 first:pt-1 space-y-[2.5px]" id={`cmd-cat-${catName}`}>
                    {/* Category Label */}
                    <div className="px-2.5 py-1 text-[8.5px] uppercase font-bold text-zinc-500 tracking-wider">
                      {catName === "navigation" ? "🧭 Tab Navigation" :
                       catName === "files" ? "📂 File Workspace Buffers" :
                       catName === "git" ? "⎇ Version Control Repository" :
                       catName === "agent" ? "🤖 Intelligent Run Commands" :
                       catName === "tools" ? "🛠️ Tool Configuration Ecosystem" :
                       "🔩 Workspace System Console"}
                    </div>

                    {categoryActions.map((item) => {
                      // Calculate global index relative to entire filtered list
                      const actionIndex = filteredActions.indexOf(item);
                      const isSelected = actionIndex === selectedIndex;

                      return (
                        <div
                          key={item.id}
                          onClick={async () => {
                            await item.action();
                          }}
                          className={`flex items-center justify-between rounded px-3 py-2.5 cursor-pointer border transition-all text-left ${
                            isSelected
                              ? "bg-zinc-900/90 text-white border-zinc-750 shadow-md scale-[1.006]"
                              : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-250 border-transparent"
                          }`}
                          id={`cmd-item-${item.id}`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0 pr-3">
                            <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? "text-amber-400 bg-amber-500/10" : "text-zinc-500 bg-zinc-950/40"}`}>
                              {item.icon}
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className={`text-xs font-semibold truncate ${isSelected ? "text-zinc-100 font-medium" : "text-zinc-300"}`}>
                                {item.title}
                              </span>
                              {item.subtitle && (
                                <span className="text-[10px] text-zinc-550 truncate font-sans leading-relaxed">
                                  {item.subtitle}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 flex-shrink-0">
                            {item.badge && (
                              <span className={`text-[8.5px] font-bold px-1.5 py-[1px] border border-zinc-850/30 uppercase rounded scale-90 ${item.badgeStyle || "bg-zinc-900 text-zinc-450"}`}>
                                {item.badge}
                              </span>
                            )}
                            {item.shortcut && (
                              <kbd className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded border ${
                                isSelected 
                                  ? "bg-zinc-950 border-zinc-800 text-amber-500 font-medium" 
                                  : "bg-zinc-950/40 border-zinc-900 text-zinc-500"
                              } uppercase select-none`}>
                                {item.shortcut}
                              </kbd>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* BOTTOM METADATA CONTROLS ROW */}
        <div className="p-3 bg-[#131519] border-t border-zinc-850 flex items-center justify-between text-[9px] font-mono text-zinc-600">
          <div className="flex items-center gap-3 select-none">
            {mode === "actions" ? (
              <>
                <span className="flex items-center gap-1">
                  <span className="text-zinc-400 font-sans">↑↓</span> to navigate
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="text-zinc-400 font-sans">↵</span> to execute
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="text-zinc-400 font-sans">esc</span> to close
                </span>
              </>
            ) : mode === "branch-conflict" ? (
              <>
                <span className="flex items-center gap-1">
                  <span className="text-amber-500 font-mono font-bold">[Enter]</span> Carry Over
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="text-rose-400 font-mono font-bold">[Shift+Enter]</span> Discard Updates
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="text-zinc-500 font-mono font-bold">[Esc]</span> Abort Checkout
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1">
                  <span className="text-emerald-500 font-mono font-bold">[Enter]</span> Confirm Form
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="text-zinc-500 font-mono font-bold">[Esc]</span> Go Back
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 bg-zinc-950/40 py-[1.5px] px-2.5 rounded border border-zinc-900 font-mono text-[8.5px] scale-95 select-none text-[#6366F1]">
            <Command className="w-2.5 h-2.5 shrink-0" />
            <span>FLUX PALETTE</span>
          </div>
        </div>

      </div>
    </div>
  );
}
