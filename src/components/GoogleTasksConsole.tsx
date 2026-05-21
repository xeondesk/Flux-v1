import React, { useState, useEffect } from "react";
import {
  ListTodo,
  Plus,
  Trash2,
  Calendar,
  Loader2,
  RefreshCw,
  Download,
  Upload,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  AlertCircle,
  Inbox,
  Check,
  Square,
  ChevronRight,
  ArrowRightLeft,
  Key,
} from "lucide-react";
import { useFluxStore } from "../store";
import { getAccessToken, signInWithGoogle, setAccessToken } from "../firebase";

interface GoogleTaskList {
  id: string;
  title: string;
  updated: string;
}

interface GoogleTask {
  id: string;
  title: string;
  status: "needsAction" | "completed";
  notes?: string;
  due?: string;
  completed?: string;
}

export default function GoogleTasksConsole() {
  const user = useFluxStore((s) => s.user);
  const localPlan = useFluxStore((s) => s.plan);
  const addTaskLocal = useFluxStore((s) => s.addTask);

  // Auth & Token states
  const [token, setToken] = useState<string | null>(null);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  // Data states
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  
  // Loading & UI states
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "completed">("all");

  // Form states for creating a new Task List
  const [showCreateListForm, setShowCreateListForm] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isCreatingList, setIsCreatingList] = useState(false);

  // Form states for creating a new Task
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Expansion for task notes
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Sync / Integration overlay state
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedLocalTaskId, setSelectedLocalTaskId] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync token from Firebase in-memory cache on load/user-change
  useEffect(() => {
    const activeToken = getAccessToken();
    setToken(activeToken);
  }, [user]);

  // Handle automatic API loading when token changes
  useEffect(() => {
    if (token) {
      fetchTaskLists();
    } else {
      setTaskLists([]);
      setTasks([]);
      setSelectedListId("");
    }
  }, [token]);

  // Fetch lists when selected list triggers
  useEffect(() => {
    if (selectedListId && token) {
      fetchTasks(selectedListId);
    } else {
      setTasks([]);
    }
  }, [selectedListId, token]);

  const handleConnectAccount = async () => {
    try {
      setIsRefreshingToken(true);
      setErrorMessage(null);
      await signInWithGoogle();
      const currentToken = getAccessToken();
      if (currentToken) {
        setToken(currentToken);
        setSuccessMessage("OAuth Authentication verified. Tasks service linked!");
      } else {
        setErrorMessage("Signed in but failed to acquire Tasks access token.");
      }
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
        console.log("Tasks Auth popup cancelled/closed:", errCode || errMsg);
        setErrorMessage("The authentication popup was closed or cancelled. Please click 'Authorize Google Tasks' again, or use the 'Open in New Tab' button in the toolbar if you are inside an iframe preview.");
      } else if (isNetwork) {
        console.log("Tasks Auth network request failed:", errCode || errMsg);
        setErrorMessage("Network Connection Failed. Please verify you are connected to the Internet, and that your web proxy allows connections to *.googleapis.com and *.firebaseapp.com.");
      } else {
        console.error("Task authentication error:", err);
        setErrorMessage(errMsg || "Failed to launch Google auth pop-up.");
      }
    } finally {
      setIsRefreshingToken(false);
    }
  };

  const handleApplyManualToken = () => {
    if (manualTokenInput.trim()) {
      setAccessToken(manualTokenInput.trim());
      setToken(manualTokenInput.trim());
      setErrorMessage(null);
      setSuccessMessage("Developer security key token mapped successfully!");
      setShowManualInput(false);
    }
  };

  // 1. FETCH TASK LISTS
  const fetchTaskLists = async () => {
    if (!token) return;
    setIsLoadingLists(true);
    setErrorMessage(null);
    try {
      const res = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setToken(null);
          setAccessToken(null);
          throw new Error("Google access token has expired. Please re-authenticate.");
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || "Failed to load Google Task Lists.");
      }

      const data = await res.json();
      const lists = data.items || [];
      setTaskLists(lists);

      if (lists.length > 0 && !selectedListId) {
        setSelectedListId(lists[0].id);
      }
    } catch (err: any) {
      console.error("fetchTaskLists error:", err);
      setErrorMessage(err.message || "Network error loading Google Task Lists.");
    } finally {
      setIsLoadingLists(false);
    }
  };

  // 2. FETCH TASKS
  const fetchTasks = async (listId: string) => {
    if (!token || !listId) return;
    setIsLoadingTasks(true);
    setErrorMessage(null);
    try {
      // We will ask for up to 100 tasks
      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?maxResults=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || "Failed to fetch task items.");
      }

      const data = await res.json();
      setTasks(data.items || []);
    } catch (err: any) {
      console.error("fetchTasks error:", err);
      setErrorMessage(err.message || "Failed to fetch task list contents.");
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // 3. CREATE TASK LIST
  const handleCreateTaskList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newListName.trim()) return;
    setIsCreatingList(true);
    setErrorMessage(null);
    try {
      const res = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: newListName.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || "Could not create new task list.");
      }

      const listCreated = await res.json();
      setSuccessMessage(`Created Google Task List "${listCreated.title}"!`);
      setNewListName("");
      setShowCreateListForm(false);
      
      // Reload lists and focus on the new one
      await fetchTaskLists();
      setSelectedListId(listCreated.id);
    } catch (err: any) {
      console.error("handleCreateTaskList error:", err);
      setErrorMessage(err.message || "Error creating task list.");
    } finally {
      setIsCreatingList(false);
    }
  };

  // 4. CREATE TASK ITEM
  const handleCreateTaskItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedListId || !newTaskTitle.trim()) return;
    setIsCreatingTask(true);
    setErrorMessage(null);
    try {
      const bodyPayload: any = {
        title: newTaskTitle.trim(),
      };
      if (newTaskNotes.trim()) {
        bodyPayload.notes = newTaskNotes.trim();
      }
      if (newTaskDue) {
        // Due date needs RFC 3339 timestamp
        bodyPayload.due = new Date(newTaskDue).toISOString();
      }

      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${selectedListId}/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || "Could not insert task.");
      }

      const createdTask = await res.json();
      setSuccessMessage(`Inserted task: "${createdTask.title}"`);
      
      // Reset Form fields
      setNewTaskTitle("");
      setNewTaskNotes("");
      setNewTaskDue("");
      setShowAddTaskForm(false);

      // Refresh list
      fetchTasks(selectedListId);
    } catch (err: any) {
      console.error("handleCreateTaskItem error:", err);
      setErrorMessage(err.message || "Error inserting task.");
    } finally {
      setIsCreatingTask(false);
    }
  };

  // 5. TOGGLE STATUS (PATCH COMPLETE)
  const handleToggleStatus = async (task: GoogleTask) => {
    if (!token || !selectedListId) return;
    
    // Optimistic UI updates
    const originalTasks = [...tasks];
    const newStatus = task.status === "completed" ? "needsAction" : "completed";
    setTasks(
      tasks.map((t) =>
        t.id === task.id ? { ...t, status: newStatus } : t
      )
    );

    try {
      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${selectedListId}/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          // If clearing, Google API expects empty string or omitting completed field
          completed: newStatus === "completed" ? new Date().toISOString() : null,
        }),
      });

      if (!res.ok) {
        throw new Error("Could not update task status.");
      }
    } catch (err: any) {
      console.error("handleToggleStatus error:", err);
      setTasks(originalTasks); // rollback
      setErrorMessage(err.message || "Failed to update status on the Google Server.");
    }
  };

  // 6. DELETE TASK ITEM
  const handleDeleteTaskItem = async (taskId: string) => {
    if (!token || !selectedListId || !taskId) return;
    if (!window.confirm("Are you sure you want to delete this task from Google Tasks?")) return;

    const originalTasks = [...tasks];
    setTasks(tasks.filter((t) => t.id !== taskId));

    try {
      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${selectedListId}/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Could not delete task.");
      }
      setSuccessMessage("Task deleted successfully.");
    } catch (err: any) {
      console.error("handleDeleteTaskItem error:", err);
      setTasks(originalTasks); // rollback
      setErrorMessage(err.message || "Error deleting task.");
    }
  };

  // 7. SYNC: IMPORT TASK FROM GOOGLE TO THE APP'S PLANNING ENGINE
  const handleImportToLocalPlan = (task: GoogleTask) => {
    try {
      addTaskLocal(task.title, "medium");
      setSuccessMessage(`Successfully imported "${task.title}" task to your Local Planning Deck!`);
    } catch (err: any) {
      setErrorMessage("Could not import task into the internal deck buffer.");
    }
  };

  // 8. SYNC: EXPORT SELECTED LOCAL PLAN TASK TO GOOGLE TASKS
  const handleExportLocalToGoogle = async () => {
    const localTask = localPlan.find((item) => item.id === selectedLocalTaskId);
    if (!localTask || !token || !selectedListId) return;

    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${selectedListId}/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: localTask.label,
          notes: `Exported from FLUX Planning Deck. Priority: ${localTask.priority.toUpperCase()}`,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to export.");
      }

      const created = await res.json();
      setSuccessMessage(`Successfully exported local task: "${created.title}" to Google Tasks!`);
      setShowSyncModal(false);
      setSelectedLocalTaskId("");
      
      // Refresh list
      fetchTasks(selectedListId);
    } catch (err: any) {
      console.error("handleExportLocalToGoogle error:", err);
      setErrorMessage(err.message || "Error exporting task to Google Tasks.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter tasks based on selected tab filter
  const filteredTasks = tasks.filter((task) => {
    if (activeFilter === "pending") return task.status === "needsAction";
    if (activeFilter === "completed") return task.status === "completed";
    return true;
  });

  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.status === "completed").length;
  const progressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-[#16191E] select-text" id="google-tasks-console-pane">
      {/* Title Header Section */}
      <div className="p-3 border-b border-[#2A2D35] flex items-center justify-between bg-[#1c2026]" id="tasks-console-header">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white" id="tasks-blue-ico">
            <ListTodo className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-150 block">Google Tasks Console</span>
            <span className="text-[9px] font-bold tracking-widest text-blue-400 font-mono block uppercase leading-none">
              Google Workspace Cloud Integration
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[9px]">
          {token ? (
            <span className="bg-emerald-900/30 text-emerald-400 border border-emerald-800 px-1.5 py-[1px] rounded flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Active Integration
            </span>
          ) : (
            <span className="bg-amber-900/30 text-amber-500 border border-amber-800 px-1.5 py-[1px] rounded flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-500 animate-pulse" />
              Authorization Required
            </span>
          )}
        </div>
      </div>

      {/* Auth Banner & Warning Messages */}
      {!token && (
        <div className="p-5 flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4" id="google-tasks-anonymous-gateway">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto" id="auth-main-tasks-icon">
            <ListTodo className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-150">Google Tasks Service Gateway</h4>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              To read and synchronise tasks directly with your real Google account, we need your permission. Complete the link flow below.
            </p>
          </div>

          <div className="w-full space-y-2 pt-2">
            {!user ? (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 text-left text-[11px] rounded-lg text-zinc-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-zinc-200 block mb-0.5">Not Signed In Yet</strong>
                  First connect to Firebase via the <strong className="text-amber-400">Cloud Save</strong> button at the top header of this applet to fetch credentials.
                </div>
              </div>
            ) : (
              <button
                onClick={handleConnectAccount}
                disabled={isRefreshingToken}
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/50 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-blue-600/10 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                id="btn-tasks-connect-google"
              >
                {isRefreshingToken ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Authorize Google Tasks
                  </>
                )}
              </button>
            )}

            <div className="pt-2">
              <button
                onClick={() => setShowManualInput(!showManualInput)}
                className="text-zinc-500 hover:text-zinc-300 font-mono text-[9px] font-bold uppercase underline"
                id="btn-trigger-manual-token"
              >
                {showManualInput ? "Hide Manual Key Token Input" : "Alternative: Use Custom Token"}
              </button>
            </div>

            {showManualInput && (
              <div className="bg-zinc-950/80 border border-zinc-800 p-3 rounded-lg text-left text-xs space-y-2 mt-2" id="manual-token-field-panel">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Key className="w-3 h-3 text-indigo-400" />
                  Paste Google Access Token
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={manualTokenInput}
                    onChange={(e) => setManualTokenInput(e.target.value)}
                    placeholder="ya29.a0Acv..."
                    className="flex-1 bg-[#16191E] border border-zinc-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-600 font-mono text-[10.5px] text-zinc-300"
                  />
                  <button
                    onClick={handleApplyManualToken}
                    className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded cursor-pointer transition-all"
                  >
                    Apply
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 leading-snug">
                  If the automatic popup fails or is blocked inside iframe previews, you can paste an active OAuth token fetched manually.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Core Google Tasks Console Pane (When Authorised) */}
      {token && (
        <div className="flex-1 flex flex-col overflow-hidden text-xs" id="active-tasks-workspace">
          {/* Top Info Toast alerts */}
          {errorMessage && (
            <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 text-[11px] text-rose-400 flex items-center justify-between gap-2" id="tasks-error-toast">
              <span className="flex items-center gap-1.5 truncate">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{errorMessage}</span>
              </span>
              <button onClick={() => setErrorMessage(null)} className="font-bold hover:text-white shrink-0 text-[10px]">✕</button>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 text-[11px] text-emerald-400 flex items-center justify-between gap-2" id="tasks-success-toast">
              <span className="flex items-center gap-1.5 truncate">
                <Check className="w-3.5 h-3.5 shrink-0 bg-emerald-500/10 rounded-full" />
                <span className="truncate">{successMessage}</span>
              </span>
              <button onClick={() => setSuccessMessage(null)} className="font-bold hover:text-white shrink-0 text-[10px]">✕</button>
            </div>
          )}

          {/* List selection & Creation bar */}
          <div className="p-3 bg-zinc-950/40 border-b border-[#2A2D35]/60 flex items-center justify-between gap-1.5" id="active-lists-bar">
            {isLoadingLists ? (
              <div className="flex items-center gap-2 text-zinc-400 font-mono text-[10px]" id="loading-lists-spinner">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                Fetching Lists...
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1" id="list-dropdown-container">
                <span className="text-[10px] uppercase font-bold font-mono tracking-wider text-zinc-500">List:</span>
                <select
                  value={selectedListId}
                  onChange={(e) => setSelectedListId(e.target.value)}
                  className="bg-[#1C1F26] border border-[#2A2D35] hover:border-zinc-700 hover:text-zinc-200 text-zinc-300 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500 font-medium cursor-pointer max-w-[140px] truncate"
                >
                  {taskLists.map((list) => (
                    <option key={list.id} value={list.id} className="bg-[#16191E]" title={list.title}>
                      {list.title}
                    </option>
                  ))}
                </select>

                <button
                  onClick={fetchTaskLists}
                  className="p-1 hover:bg-[#1E2228] border border-zinc-800 rounded text-zinc-400 hover:text-white transition-all cursor-pointer"
                  title="Reload Google Lists"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            )}

            <button
              onClick={() => setShowCreateListForm(!showCreateListForm)}
              className="px-2 py-1 text-[10px] tracking-wide text-zinc-400 border border-zinc-800 hover:border-blue-500/20 hover:text-blue-400 bg-zinc-900/50 rounded hover:bg-blue-550/10 font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
              title="Create new Task List on Cloud"
              id="btn-trigger-create-list"
            >
              <Plus className="w-3 h-3" />
              New List
            </button>
          </div>

          {/* New Task List Form (Modal-like card) */}
          {showCreateListForm && (
            <form onSubmit={handleCreateTaskList} className="p-3 border-b border-blue-500/20 bg-blue-600/5 space-y-2 text-left" id="new-list-creator-form">
              <span className="text-[10px] font-bold font-mono text-blue-400 uppercase tracking-widest block">
                CREATE NEW GOOGLE TASK CONTAINER
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g. Workspace Milestones"
                  className="flex-1 bg-[#101216] border border-[#2A2D35] focus:outline-none focus:border-blue-500 rounded px-2.5 py-1 text-xs text-zinc-200"
                />
                <button
                  type="submit"
                  disabled={isCreatingList}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/40 text-white text-[11px] font-bold rounded cursor-pointer transition-all"
                >
                  {isCreatingList ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateListForm(false)}
                  className="px-2.5 py-1 border border-zinc-800 text-zinc-400 hover:text-white text-[11px] rounded transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Header Stats Panel */}
          {tasks.length > 0 && (
            <div className="p-3.5 bg-zinc-950/20 border-b border-[#2A2D35]/50" id="tasks-stats-panel">
              <div className="flex justify-between text-[11px] text-zinc-400 font-mono mb-2" id="stats-numbers">
                <span className="font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Completed Tasks
                </span>
                <span className="font-sans font-bold text-zinc-300">
                  {completedTasksCount} / {totalTasksCount} ({progressPercent}%)
                </span>
              </div>
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden" id="tasks-progress-track">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300 shadow-md shadow-blue-500/20"
                  style={{ width: `${progressPercent}%` }}
                  id="tasks-progress-bar"
                ></div>
              </div>
            </div>
          )}

          {/* Primary Quick Sync / Integration Row */}
          <div className="p-2.5 bg-zinc-950/50 border-b border-[#2A2D35]/40 flex gap-2" id="tasks-sync-actions-row">
            <button
              onClick={() => setShowAddTaskForm(true)}
              className="flex-1 px-2.5 py-1.5 bg-blue-600/10 hover:bg-blue-600 border border-blue-500/30 text-blue-400 hover:text-white text-[10.5px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
              id="btn-active-trigger-add-task"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Google Task
            </button>

            <button
              onClick={() => setShowSyncModal(true)}
              className="flex-1 px-2.5 py-1.5 bg-[#1E2228] hover:bg-[#252a32] border border-[#2A2D35] hover:border-zinc-650 text-zinc-300 text-[10.5px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-1.5"
              id="btn-active-trigger-sync"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
              Workspace Sync
            </button>
          </div>

          {/* New Task Item Insertion form */}
          {showAddTaskForm && (
            <form onSubmit={handleCreateTaskItem} className="p-3.5 border-b border-blue-500/20 bg-blue-600/5 space-y-3 text-left" id="task-creator-form">
              <span className="text-[10px] font-bold font-mono text-blue-400 uppercase tracking-widest block">
                CREATE NEW TASK ON GOOGLE SERVERS
              </span>
              
              <div className="space-y-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide">Task Title *</label>
                  <input
                    type="text"
                    required
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Refactor core components..."
                    className="w-full bg-[#101216] border border-[#2A2D35] focus:outline-none focus:border-blue-500 rounded px-2.5 py-1.5 text-xs text-zinc-200"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide">Task Notes (Optional)</label>
                  <textarea
                    value={newTaskNotes}
                    onChange={(e) => setNewTaskNotes(e.target.value)}
                    placeholder="Enter short description or logs link..."
                    className="w-full h-14 bg-[#101216] border border-[#2A2D35] focus:outline-none focus:border-blue-500 rounded px-2.5 py-1 px-1.5 text-xs text-zinc-200 font-sans resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide">Due Date (Optional)</label>
                  <input
                    type="date"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                    className="w-full bg-[#101216] border border-[#2A2D35] focus:outline-none focus:border-blue-500 rounded px-2.5 py-1 text-xs text-zinc-300 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="submit"
                  disabled={isCreatingTask}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded cursor-pointer transition-all flex items-center gap-1"
                >
                  {isCreatingTask ? <Loader2 className="w-3 h-3 animate-spin" /> : "Insert"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTaskForm(false)}
                  className="px-3 py-1.25 border border-zinc-800 text-zinc-400 hover:text-white text-xs rounded transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Sync / Export Import Portal modal overlay overlay */}
          {showSyncModal && (
            <div className="p-3.5 border-b border-indigo-500/20 bg-indigo-950/20 text-left space-y-3" id="sync-portal">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold font-mono text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#6366F1]" />
                  EXPORT LOCAL PLAN TO GOOGLE
                </span>
                <span className="text-[9px] bg-indigo-950 border border-indigo-900 px-1.5 py-[0.5px] rounded font-mono text-[#6366F1]">
                  Two-Way
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-zinc-400 leading-normal">
                  Select a pending task from your local FLUX Planning Deck to export directly into this cloud Google Tasks list.
                </p>

                {localPlan.filter((p) => p.status !== "done").length === 0 ? (
                  <p className="text-[11px] text-zinc-500 font-mono italic">
                    (No active pending local tasks in planning deck.)
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-[#A5B4FC] font-bold uppercase tracking-wider font-mono">Select Live Task</label>
                    <select
                      value={selectedLocalTaskId}
                      onChange={(e) => setSelectedLocalTaskId(e.target.value)}
                      className="w-full bg-[#101216] border border-[#2A2D35] focus:outline-none focus:border-[#6366F1] rounded px-2.5 py-1.5 text-xs text-zinc-300 cursor-pointer"
                    >
                      <option value="">-- Choose local task --</option>
                      {localPlan
                        .filter((item) => item.status !== "done")
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            [{item.priority.toUpperCase()}] {item.label}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleExportLocalToGoogle}
                  disabled={isSyncing || !selectedLocalTaskId || !selectedListId}
                  className="px-3 py-1.5 bg-[#6366F1] hover:bg-[#4F46E5] disabled:bg-[#4338CA]/30 disabled:text-zinc-500 text-white text-xs font-bold rounded cursor-pointer transition-all flex items-center gap-1.5"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Export Task
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSyncModal(false);
                    setSelectedLocalTaskId("");
                  }}
                  className="px-3 py-1.5 border border-zinc-800 text-zinc-400 hover:text-white text-xs rounded transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Tasks Filters Tabs Selector */}
          <div className="flex border-b border-[#2A2D35]/50 bg-zinc-950/20 text-center font-mono text-[9px]" id="tasks-filters-region">
            <button
              onClick={() => setActiveFilter("all")}
              className={`flex-1 py-2 font-bold uppercase tracking-wider ${
                activeFilter === "all"
                  ? "border-b-2 border-blue-500 text-blue-400 bg-zinc-900/40"
                  : "text-zinc-500 hover:text-zinc-350"
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setActiveFilter("pending")}
              className={`flex-1 py-2 font-bold uppercase tracking-wider ${
                activeFilter === "pending"
                  ? "border-b-2 border-blue-500 text-blue-400 bg-zinc-900/40"
                  : "text-zinc-500 hover:text-zinc-350"
              }`}
            >
              Pending ({tasks.filter((t) => t.status === "needsAction").length})
            </button>
            <button
              onClick={() => setActiveFilter("completed")}
              className={`flex-1 py-2 font-bold uppercase tracking-wider ${
                activeFilter === "completed"
                  ? "border-b-2 border-blue-500 text-blue-400 bg-zinc-900/40"
                  : "text-zinc-500 hover:text-zinc-350"
              }`}
            >
              Done ({tasks.filter((t) => t.status === "completed").length})
            </button>
          </div>

          {/* List items Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2 relative" id="tasks-scroll-container">
            {isLoadingTasks ? (
              <div className="absolute inset-0 bg-[#16191E]/70 flex flex-col items-center justify-center p-4" id="tasks-loading-overlay">
                <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
                <span className="text-zinc-400 font-mono text-[10px] mt-2 tracking-wider">
                  FETCHING TASKS STREAM...
                </span>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center max-w-[200px] mx-auto space-y-2.5 text-zinc-500" id="tasks-empty-slate">
                <Inbox className="w-8 h-8 text-zinc-600/70" />
                <span>No Google Tasks correspond to that query in this active container list.</span>
                {!showAddTaskForm && (
                  <button
                    onClick={() => setShowAddTaskForm(true)}
                    className="text-blue-400 hover:text-blue-300 font-bold underline text-[11px]"
                  >
                    Insert First Task
                  </button>
                )}
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isCompleted = task.status === "completed";
                const isExpanded = expandedTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    className={`p-3 bg-[#0F1115] border rounded-lg transition-all flex flex-col gap-2 ${
                      isCompleted 
                        ? "border-[#2A2D35]/40 opacity-70 hover:opacity-100" 
                        : "border-[#2A2D35]/80 hover:border-blue-500/20"
                    }`}
                    id={`task-item-${task.id}`}
                  >
                    <div className="flex items-start justify-between gap-3" id={`task-core-row-${task.id}`}>
                      {/* Checkbox Trigger Toggle */}
                      <button
                        onClick={() => handleToggleStatus(task)}
                        className={`mt-0.5 shrink-0 transition-all ${
                          isCompleted ? "text-emerald-500" : "text-zinc-600 hover:text-blue-500"
                        }`}
                        title={isCompleted ? "Reset task status" : "Mark task completed"}
                        id={`btn-toggle-completed-${task.id}`}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4 bg-emerald-500/10 rounded" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      {/* Content details */}
                      <div className="flex-1 min-w-0" id={`task-text-card-${task.id}`}>
                        <div
                          className={`text-[12px] font-sans font-medium break-words leading-snug tracking-tight text-zinc-250 cursor-pointer ${
                            isCompleted ? "line-through text-zinc-550" : ""
                          }`}
                          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        >
                          {task.title}
                        </div>

                        {/* Description snippet or dates */}
                        <div className="flex items-center gap-3 mt-1.5 text-[9.5px] font-mono text-zinc-500 font-bold select-none">
                          {task.due && (
                            <span className="flex items-center gap-1 text-amber-500/95" title="Task deadline">
                              <Calendar className="w-3 h-3 text-amber-500/80" />
                              {new Date(task.due).toLocaleDateString()}
                            </span>
                          )}

                          {task.notes && (
                            <button
                              onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                              className="hover:text-blue-400 font-bold transition-all uppercase flex items-center"
                            >
                              Notes {isExpanded ? "▲" : "▼"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Sync & Delete operations */}
                      <div className="flex items-center gap-1.5 shrink-0" id={`task-ops-row-${task.id}`}>
                        <button
                          onClick={() => handleImportToLocalPlan(task)}
                          className="p-1 hover:bg-[#1E2228] border border-zinc-800 rounded text-indigo-400 hover:text-white transition-all cursor-pointer"
                          title="Import to FLUX local deck"
                          id={`btn-import-${task.id}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteTaskItem(task.id)}
                          className="p-1 hover:bg-rose-950/20 hover:text-rose-400 border border-transparent hover:border-rose-900/30 rounded text-zinc-650 transition-all cursor-pointer"
                          title="Delete from Google Tasks"
                          id={`btn-delete-${task.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Detailed expandable properties panel */}
                    {isExpanded && (task.notes || task.due) && (
                      <div className="mt-2.5 p-2.5 bg-zinc-950/40 border border-zinc-900 rounded-md space-y-1.5" id={`task-expanded-${task.id}`}>
                        {task.notes && (
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase font-bold font-mono tracking-wider text-zinc-550 block">Notes Details</span>
                            <p className="text-[11px] font-sans text-zinc-400 leading-normal whitespace-pre-wrap select-text break-words">
                              {task.notes}
                            </p>
                          </div>
                        )}
                        
                        {task.due && (
                          <div className="flex items-center justify-between text-[10px] font-mono leading-none border-t border-zinc-900/50 pt-1.5 mt-1.5">
                            <span className="text-zinc-550 uppercase font-bold tracking-wider">Cloud Timestamp Deadline</span>
                            <span className="text-zinc-400">{task.due}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
