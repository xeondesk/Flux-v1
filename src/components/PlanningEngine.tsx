import React, { useState, useEffect, useRef } from "react";
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Play, 
  AlertCircle, 
  Clock, 
  Network, 
  List, 
  Lock, 
  Unlock, 
  GitBranch, 
  X, 
  Trash2, 
  SlidersHorizontal,
  ChevronRight
} from "lucide-react";
import { PlanItem } from "../types";

// Topological sort / generation ranking helper
function calculateTaskRanks(plan: PlanItem[]) {
  const ranks: Record<string, number> = {};
  
  // Initialize all to level 0
  plan.forEach(item => {
    ranks[item.id] = 0;
  });

  // Iteratively push levels for dependencies
  // Cap iterations to avoid infinite loops on circular dependencies
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 100) {
    changed = false;
    iterations++;
    plan.forEach(item => {
      const deps = item.dependencies || [];
      let maxDepRank = -1;
      
      deps.forEach(depId => {
        // Only count if dependency exists in our list
        const depItem = plan.find(p => p.id === depId);
        if (depItem) {
          const r = ranks[depId] ?? 0;
          if (r > maxDepRank) {
            maxDepRank = r;
          }
        }
      });

      const targetRank = maxDepRank + 1;
      if (ranks[item.id] !== targetRank) {
        ranks[item.id] = targetRank;
        changed = true;
      }
    });
  }
  return ranks;
}

interface PlanningEngineProps {
  plan: PlanItem[];
  onToggleStatus: (id: string) => void;
  onAddTask: (label: string, priority: "low" | "medium" | "high", dependencies?: string[]) => void;
  onDeleteTask: (id: string) => void;
  onUpdateDependencies: (id: string, dependencies: string[]) => void;
}

export default function PlanningEngine({
  plan,
  onToggleStatus,
  onAddTask,
  onDeleteTask,
  onUpdateDependencies
}: PlanningEngineProps) {
  const [viewMode, setViewMode] = useState<"list" | "workflow">("list");
  const [newLabel, setNewLabel] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [isAdding, setIsAdding] = useState(false);
  
  // Dependency selection during creation
  const [selectedNewTaskDeps, setSelectedNewTaskDeps] = useState<string[]>([]);
  
  // Track which card is expanding dependency options inline
  const [openSettingsCardId, setOpenSettingsCardId] = useState<string | null>(null);

  // SVG rendering connections
  const [connections, setConnections] = useState<any[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);

  const calculateConnections = () => {
    if (!boardRef.current || viewMode !== "workflow") return;
    const containerRect = boardRef.current.getBoundingClientRect();
    const list: any[] = [];

    plan.forEach(item => {
      const toEl = document.getElementById(`node-${item.id}`);
      if (!toEl) return;
      
      const deps = item.dependencies || [];
      deps.forEach(depId => {
        const fromEl = document.getElementById(`node-${depId}`);
        if (!fromEl) return;

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        // Calculate right middle of from and left middle of to
        const fromX = fromRect.right - containerRect.left + boardRef.current!.scrollLeft;
        const fromY = fromRect.top + fromRect.height / 2 - containerRect.top + boardRef.current!.scrollTop;

        const toX = toRect.left - containerRect.left + boardRef.current!.scrollLeft;
        const toY = toRect.top + toRect.height / 2 - containerRect.top + boardRef.current!.scrollTop;

        const depTask = plan.find(t => t.id === depId);
        const status = depTask ? depTask.status : "pending";

        list.push({
          fromX,
          fromY,
          toX,
          toY,
          status,
          fromId: depId,
          toId: item.id
        });
      });
    });

    setConnections(list);
  };

  useEffect(() => {
    if (viewMode === "workflow") {
      const timer = setTimeout(() => {
        calculateConnections();
      }, 100);

      window.addEventListener("resize", calculateConnections);
      const el = boardRef.current;
      if (el) {
        el.addEventListener("scroll", calculateConnections);
      }

      return () => {
        clearTimeout(timer);
        window.removeEventListener("resize", calculateConnections);
        if (el) {
          el.removeEventListener("scroll", calculateConnections);
        }
      };
    }
  }, [plan, viewMode, openSettingsCardId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    onAddTask(newLabel.trim(), priority, selectedNewTaskDeps);
    setNewLabel("");
    setSelectedNewTaskDeps([]);
    setIsAdding(false);
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "high":
        return "bg-rose-500/10 text-rose-450 border-rose-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-450 border-amber-500/20";
      default:
        return "bg-sky-500/10 text-sky-450 border-sky-500/20";
    }
  };

  const getStatusIcon = (status: "pending" | "in-progress" | "done", isTaskBlocked: boolean) => {
    switch (status) {
      case "done":
        return <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
      case "in-progress":
        return <Clock className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />;
      default:
        if (isTaskBlocked) {
          return <Lock className="w-4 h-4 text-rose-450 flex-shrink-0" />;
        }
        return <Square className="w-4 h-4 text-zinc-500 hover:text-zinc-300 flex-shrink-0" />;
    }
  };

  // Helper inside loop to check if a task's prerequisites are finished
  const isBlocked = (item: PlanItem) => {
    if (!item.dependencies || item.dependencies.length === 0) return false;
    return item.dependencies.some(depId => {
      const depTask = plan.find(p => p.id === depId);
      return !depTask || depTask.status !== "done";
    });
  };

  const handleToggleDependency = (itemId: string, depId: string) => {
    if (itemId === depId) return; // ignore loops with self
    const task = plan.find(t => t.id === itemId);
    if (!task) return;

    const currentDeps = task.dependencies || [];
    let nextDeps: string[];
    if (currentDeps.includes(depId)) {
      nextDeps = currentDeps.filter(id => id !== depId);
    } else {
      nextDeps = [...currentDeps, depId];
    }
    onUpdateDependencies(itemId, nextDeps);
  };

  const completedCount = plan.filter((t) => t.status === "done").length;
  const inProgressCount = plan.filter((t) => t.status === "in-progress").length;
  const pendingCount = plan.filter((t) => t.status === "pending").length;

  // Topological rankings
  const ranks = calculateTaskRanks(plan);
  const maxRankNum = Math.max(0, ...Object.values(ranks));

  // Partition tasks into generational columns
  const columnData: Record<number, PlanItem[]> = {};
  for (let r = 0; r <= maxRankNum; r++) {
    columnData[r] = [];
  }
  plan.forEach(item => {
    const r = ranks[item.id] ?? 0;
    if (!columnData[r]) columnData[r] = [];
    columnData[r].push(item);
  });

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-350 font-sans border-r border-zinc-800" id="planning-engine-container">
      {/* Header with Visual Tabs */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between" id="pe-header">
        <div className="flex items-center gap-3">
          <CheckSquare className="w-4 h-4 text-amber-500" id="pe-badge-icon" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-450 leading-none">Planning Deck</span>
          
          {/* List vs Workflow Tabs */}
          <div className="flex bg-zinc-900 border border-zinc-800 p-[3px] rounded-lg">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold transition-all cursor-pointer ${
                viewMode === "list" 
                  ? "bg-zinc-850 text-white font-bold" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <List className="w-3 h-3" />
              List
            </button>
            <button
              onClick={() => {
                setViewMode("workflow");
                setTimeout(calculateConnections, 50);
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold transition-all cursor-pointer ${
                viewMode === "workflow" 
                  ? "bg-zinc-850 text-white font-bold" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Network className="w-3 h-3" />
              Graph View
            </button>
          </div>
        </div>
        
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={`p-1 hover:bg-zinc-900 rounded text-amber-500 transition-colors cursor-pointer ${isAdding ? "bg-zinc-900 text-rose-400" : ""}`}
          title="Add Action Task"
          id="btn-add-task-trigger"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {/* Stats Summary Bento Column */}
      <div className="grid grid-cols-3 border-b border-zinc-900 bg-zinc-950 text-center font-mono text-[10px]" id="pe-stats-grid">
        <div className="py-2.5 border-r border-zinc-900 flex flex-col justify-center">
          <span className="text-zinc-500 text-[8px] uppercase tracking-wider font-semibold font-sans">PENDING</span>
          <span className="text-zinc-450 font-bold text-sm mt-0.5">{pendingCount}</span>
        </div>
        <div className="py-2.5 border-r border-zinc-900 flex flex-col justify-center bg-amber-950/5">
          <span className="text-amber-500/80 text-[8px] uppercase tracking-wider font-semibold font-sans">IN PROGRESS</span>
          <span className="text-amber-400 font-bold text-sm mt-0.5">{inProgressCount}</span>
        </div>
        <div className="py-2.5 flex flex-col justify-center bg-emerald-950/5">
          <span className="text-emerald-500/80 text-[8px] uppercase tracking-wider font-semibold font-sans">RESOLVED</span>
          <span className="text-emerald-400 font-bold text-sm mt-0.5">{completedCount}</span>
        </div>
      </div>

      {/* Task Creation with Prerequisites selector */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="p-3 bg-zinc-900/50 border-b border-zinc-900 flex flex-col gap-2.5" id="task-addition-form">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Implement state preservation layers..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-sans"
            autoFocus
            id="input-task-label"
          />
          
          <div className="flex justify-between items-center bg-zinc-950/50 p-2 border border-zinc-900 rounded-md">
            <span className="text-[10px] text-zinc-500 uppercase font-sans tracking-wide">Priority:</span>
            <div className="flex gap-1.5" id="priority-options">
              {(["low", "medium", "high"] as const).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-2 py-0.5 rounded text-[10px] capitalize border cursor-pointer transition-all ${
                    priority === p
                      ? "bg-amber-500 border-amber-600 text-black font-semibold"
                      : "bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-zinc-200"
                  }`}
                  id={`btn-priority-${p}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* New Task Dependencies Selector */}
          {plan.length > 0 && (
            <div className="flex flex-col gap-1.5 bg-zinc-950/80 p-2 border border-zinc-900 rounded-md">
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Select Prerequisites:</span>
              <div className="max-h-[85px] overflow-y-auto space-y-1 pr-1 border-t border-zinc-900/40 pt-1.5">
                {plan.map(t => (
                  <label key={t.id} className="flex items-center gap-2 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedNewTaskDeps.includes(t.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedNewTaskDeps([...selectedNewTaskDeps, t.id]);
                        } else {
                          setSelectedNewTaskDeps(selectedNewTaskDeps.filter(id => id !== t.id));
                        }
                      }}
                      className="rounded border-zinc-800 bg-zinc-900 text-amber-500 focus:ring-0 w-3 h-3 cursor-pointer"
                    />
                    <span className="truncate flex-1">{t.label}</span>
                    <span className={`text-[8px] px-1 rounded uppercase font-bold border ${getPriorityColor(t.priority)}`}>{t.priority}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-md text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            id="btn-confirm-task-add"
          >
            Deploy New Task
          </button>
        </form>
      )}

      {/* Main Panel Content (List View vs SVG Graph View) */}
      <div className="flex-1 overflow-auto min-h-0 bg-zinc-950/20" id="pe-body-wrapper">
        
        {plan.length === 0 ? (
          <div className="text-center text-zinc-600 text-xs py-12" id="empty-plan-indicator">
            The Planning Deck is empty. User-agent tasks will populate here when requested.
          </div>
        ) : viewMode === "list" ? (
          
          /* -------- STANDARD VERTICAL LIST VIEW -------- */
          <div className="p-3 space-y-2.5" id="task-list-region">
            {plan.map((item) => {
              const blocked = isBlocked(item);
              const isEditingDeps = openSettingsCardId === item.id;
              
              return (
                <div
                  key={item.id}
                  className={`group flex flex-col p-2.5 bg-zinc-900/35 border rounded-lg hover:border-zinc-800 transition-all ${
                    blocked && item.status !== "done" ? "border-zinc-900/80" : "border-zinc-900"
                  }`}
                  id={`task-row-${item.id}`}
                >
                  <div className="flex gap-2.5 items-start">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Block toggling if the task has unfinished dependencies
                        if (blocked && item.status === "pending") {
                          return;
                        }
                        onToggleStatus(item.id);
                      }}
                      className="mt-0.5 cursor-pointer flex-shrink-0"
                      title={blocked && item.status === "pending" ? "Blocked by prerequisite steps" : "Cycle status"}
                    >
                      {getStatusIcon(item.status, blocked)}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-relaxed transition-all break-words ${
                        item.status === "done" ? "line-through text-zinc-600" : "text-zinc-200"
                      }`}>
                        {item.label}
                      </p>
                      
                      <div className="flex items-center justify-between mt-1.5" id={`task-meta-${item.id}`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] uppercase border font-bold ${getPriorityColor(item.priority)}`}>
                            {item.priority}
                          </span>
                          
                          {/* Rank level badge */}
                          <span className="px-1 py-0.5 rounded bg-zinc-900 text-zinc-500 text-[8px] font-mono border border-zinc-850">
                            Rank: #{ranks[item.id] ?? 0}
                          </span>

                          {item.status === "in-progress" && (
                            <span className="text-[9px] text-amber-500 font-mono animate-pulse flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Active...
                            </span>
                          )}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenSettingsCardId(isEditingDeps ? null : item.id);
                            }}
                            className={`p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-805 transition-colors cursor-pointer ${isEditingDeps ? "text-amber-500 bg-zinc-850" : ""}`}
                            title="Manage Prerequisites"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTask(item.id);
                            }}
                            className="p-1 rounded text-zinc-650 hover:text-rose-400 hover:bg-rose-950/10 transition-colors cursor-pointer"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Warnings if Blocked */}
                      {blocked && item.status === "pending" && (
                        <div className="flex items-start gap-1.5 mt-2 text-[10px] bg-rose-950/5 border border-rose-950/25 p-1.5 rounded text-amber-500/95 font-sans leading-none">
                          <Lock className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                          <div className="flex-1 text-[9px]">
                            <span className="text-zinc-500 font-semibold font-sans">Awaiting completion of:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(item.dependencies || []).map(depId => {
                                const dt = plan.find(x => x.id === depId);
                                if (dt && dt.status !== "done") {
                                  return (
                                    <span key={depId} className="px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded text-[8px] font-medium max-w-[140px] truncate" title={dt.label}>
                                      {dt.label}
                                    </span>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inline Dependency Editor Checklist */}
                  {isEditingDeps && (
                    <div className="mt-2.5 pt-2 border-t border-zinc-850 flex flex-col gap-1.5 bg-zinc-950/60 p-2 rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                          <GitBranch className="w-3 h-3 text-zinc-400" /> Specify Prerequisites:
                        </span>
                        <span className="text-[8px] text-zinc-650">(Check other steps to define links)</span>
                      </div>
                      <div className="max-h-[110px] overflow-y-auto space-y-1.5 pr-1" onClick={(e) => e.stopPropagation()}>
                        {plan.filter(p => p.id !== item.id).map(t => {
                          const isChecked = (item.dependencies || []).includes(t.id);
                          return (
                            <label key={t.id} className="flex items-center gap-2 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleDependency(item.id, t.id)}
                                className="rounded border-zinc-800 bg-zinc-900 text-amber-500 focus:ring-0 w-3 h-3 cursor-pointer"
                              />
                              <span className="truncate flex-1">{t.label}</span>
                              <span className={`text-[8px] px-1 rounded font-bold border ${getPriorityColor(t.priority)}`}>{t.priority}</span>
                            </label>
                          );
                        })}
                        {plan.filter(p => p.id !== item.id).length === 0 && (
                          <div className="text-[9px] text-zinc-650 py-1 text-center">
                            No other tasks available yet to make links.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          
          /* -------- MOUNTED WORKFLOW GRAPH VIEW -------- */
          <div className="relative min-h-[460px] h-full" ref={boardRef} id="board-connections-container">
            {/* SVG Lines Connector Canvas */}
            <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 min-h-[460px]">
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 2 L 8 5 L 0 8 z" className="fill-zinc-800" />
                </marker>
              </defs>
              {connections.map((conn, idx) => {
                // Bezier curves
                const dx = conn.toX - conn.fromX;
                const mx = conn.fromX + dx / 2;
                const path = `M ${conn.fromX} ${conn.fromY} C ${mx} ${conn.fromY}, ${mx} ${conn.toY}, ${conn.toX} ${conn.toY}`;
                
                let color = "stroke-zinc-800";
                if (conn.status === "done") {
                  color = "stroke-emerald-500/40";
                } else if (conn.status === "in-progress") {
                  color = "stroke-amber-500/40";
                }

                return (
                  <g key={idx}>
                    <path
                      d={path}
                      fill="none"
                      className={`${color} transition-all duration-300`}
                      strokeWidth="1.5"
                      markerEnd="url(#arrow)"
                    />
                    <circle
                      cx={conn.fromX}
                      cy={conn.fromY}
                      r="2.5"
                      className={conn.status === "done" ? "fill-emerald-450" : "fill-zinc-650"}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Lane Columns */}
            <div className="relative z-10 flex gap-4 p-4 min-h-[460px] select-none">
              {Object.keys(columnData).map((rankString) => {
                const rankNum = parseInt(rankString, 10);
                const list = columnData[rankNum];
                if (list.length === 0) return null;

                return (
                  <div key={rankNum} className="flex-1 min-w-[245px] max-w-[280px] flex flex-col gap-3 bg-zinc-900/15 border border-zinc-900/60 p-3 rounded-xl">
                    <div className="flex items-center justify-between border-b border-zinc-900/60 pb-2 mb-1">
                      <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800/80">
                        Level {rankNum}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono">
                        {list.length} step(s)
                      </span>
                    </div>

                    <div className="space-y-3 overflow-y-auto pr-0.5 max-h-[380px] scrollbar-none">
                      {list.map((item) => {
                        const blocked = isBlocked(item);
                        const isEditingDeps = openSettingsCardId === item.id;

                        return (
                          <div
                            key={item.id}
                            id={`node-${item.id}`}
                            className={`flex flex-col p-2.5 bg-zinc-950 border rounded-lg hover:border-zinc-800 transition-all ${
                              blocked && item.status !== "done" ? "border-rose-950/30" : "border-zinc-900"
                            }`}
                          >
                            <div className="flex gap-2 items-start">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (blocked && item.status === "pending") return;
                                  onToggleStatus(item.id);
                                }}
                                className="mt-0.5 cursor-pointer flex-shrink-0"
                                title={blocked && item.status === "pending" ? "Prerequisites pending" : "Toggle status"}
                              >
                                {getStatusIcon(item.status, blocked)}
                              </button>

                              <div className="flex-1 min-w-0">
                                <p className={`text-[11px] leading-relaxed break-words font-medium text-zinc-200 ${
                                  item.status === "done" ? "line-through text-zinc-650" : ""
                                }`}>
                                  {item.label}
                                </p>
                                
                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center gap-1">
                                    <span className={`px-1 py-0.2 rounded text-[7px] uppercase border font-bold ${getPriorityColor(item.priority)}`}>
                                      {item.priority}
                                    </span>
                                    {item.status === "in-progress" && (
                                      <span className="text-[8px] text-amber-400 font-mono animate-pulse uppercase">Active</span>
                                    )}
                                  </div>

                                  {/* Link toggler & Delete */}
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenSettingsCardId(isEditingDeps ? null : item.id);
                                      }}
                                      className="p-1 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900 rounded cursor-pointer"
                                      title="Select Links"
                                    >
                                      <SlidersHorizontal className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteTask(item.id);
                                      }}
                                      className="p-1 text-zinc-700 hover:text-rose-450 hover:bg-rose-950/10 rounded cursor-pointer"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Prerequisites visualization tags */}
                                {blocked && item.status === "pending" && (
                                  <div className="mt-2 text-[8px] border-t border-zinc-900/60 pt-1.5 flex flex-col gap-0.5" id={`block-info-${item.id}`}>
                                    <span className="text-zinc-500 uppercase font-sans tracking-wide">Awaiting Steps:</span>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                      {item.dependencies?.map(depId => {
                                        const dt = plan.find(x => x.id === depId);
                                        if (dt && dt.status !== "done") {
                                          return (
                                            <span key={depId} className="px-1 py-0.2 bg-rose-500/10 border border-rose-500/15 text-[8px] rounded text-rose-400 truncate max-w-[100px]" title={dt.label}>
                                              {dt.label}
                                            </span>
                                          );
                                        }
                                        return null;
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Column settings inline view */}
                            {isEditingDeps && (
                              <div className="mt-2.5 pt-2 border-t border-zinc-900 flex flex-col gap-1.5 bg-zinc-900/30 p-1.5 rounded" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                  <GitBranch className="w-2.5 h-2.5 text-zinc-400" /> Links:
                                </span>
                                <div className="max-h-[90px] overflow-y-auto space-y-1">
                                  {plan.filter(p => p.id !== item.id).map(t => {
                                    const isChecked = (item.dependencies || []).includes(t.id);
                                    return (
                                      <label key={t.id} className="flex items-center gap-2.5 text-[9px] text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleToggleDependency(item.id, t.id)}
                                          className="rounded border-zinc-800 bg-zinc-900 text-amber-500 focus:ring-0 w-2.5 h-2.5 cursor-pointer"
                                        />
                                        <span className="truncate flex-1">{t.label}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Completion Rate Footer */}
      <div className="p-3 bg-zinc-950/60 border-t border-zinc-900 text-[10px] text-zinc-600 font-mono flex items-center justify-between animate-fade-in" id="pe-footer">
        <span>Workflow Progress: {plan.length ? Math.round((completedCount / plan.length) * 100) : 0}%</span>
        <span className="text-[9px] text-zinc-500">ENGINE: LEVEL_RESOLVER_v2.0</span>
      </div>
    </div>
  );
}
