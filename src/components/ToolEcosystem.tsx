import React, { useState } from "react";
import { 
  Wrench, 
  CheckCircle, 
  HelpCircle, 
  AlertTriangle, 
  Activity, 
  Wifi, 
  RotateCw, 
  History,
  Github,
  Chrome,
  Share2,
  Database,
  Flame,
  Layers,
  CreditCard,
  Terminal,
  Compass,
  Search
} from "lucide-react";
import { ToolItem } from "../types";

const toolIcons: Record<string, React.ReactNode> = {
  Github: <Github className="w-3.5 h-3.5 text-zinc-400" />,
  Chrome: <Chrome className="w-3.5 h-3.5 text-zinc-400" />,
  Share2: <Share2 className="w-3.5 h-3.5 text-zinc-400" />,
  Database: <Database className="w-3.5 h-3.5 text-zinc-400" />,
  Flame: <Flame className="w-3.5 h-3.5 text-zinc-400" />,
  Layers: <Layers className="w-3.5 h-3.5 text-zinc-400" />,
  CreditCard: <CreditCard className="w-3.5 h-3.5 text-zinc-400" />,
  Terminal: <Terminal className="w-3.5 h-3.5 text-zinc-400" />,
  Compass: <Compass className="w-3.5 h-3.5 text-zinc-400" />,
  Search: <Search className="w-3.5 h-3.5 text-zinc-400" />,
};

interface ToolEcosystemProps {
  tools: ToolItem[];
  onToggleTool: (id: string) => void;
  onRefreshPings: () => void;
  onPingTool: (id: string) => Promise<void>;
}

export default function ToolEcosystem({
  tools,
  onToggleTool,
  onRefreshPings,
  onPingTool,
}: ToolEcosystemProps) {
  const [pinging, setPinging] = useState(false);
  const [individualPinging, setIndividualPinging] = useState<Record<string, boolean>>({});
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);

  const handlePingAll = async () => {
    setPinging(true);
    const activeTools = tools.filter((t) => t.status === "connected" || t.status === "configured");
    
    // Staggered sequential update for realistic physical feedback
    for (const tool of activeTools) {
      setIndividualPinging((prev) => ({ ...prev, [tool.id]: true }));
      await onPingTool(tool.id);
      setIndividualPinging((prev) => ({ ...prev, [tool.id]: false }));
    }
    setPinging(false);
  };

  const handlePingSingle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Avoid triggering card expand
    setIndividualPinging((prev) => ({ ...prev, [id]: true }));
    await onPingTool(id);
    setIndividualPinging((prev) => ({ ...prev, [id]: false }));
  };

  const statusIcons = {
    connected: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    configured: <CheckCircle className="w-4 h-4 text-sky-400" />,
    idle: <HelpCircle className="w-4 h-4 text-zinc-500" />,
    disconnected: <AlertTriangle className="w-4 h-4 text-rose-500" />,
  };

  const categories = {
    vcs: { badge: "VCS Core", color: "text-amber-400 border-amber-500/20 bg-amber-500/10" },
    automation: { badge: "UI Agent", color: "text-purple-400 border-purple-500/20 bg-purple-500/10" },
    database: { badge: "Database", color: "text-blue-400 border-blue-500/20 bg-blue-500/10" },
    infra: { badge: "Infrastructure", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" },
    api: { badge: "Third Party", color: "text-rose-400 border-rose-500/20 bg-rose-500/10" },
  };

  // Helper stats computation
  const activeTools = tools.filter((t) => t.status === "connected" || t.status === "configured");
  const averageLatency = activeTools.length > 0
    ? Math.round(activeTools.reduce((acc, t) => acc + (t.pingMs || 0), 0) / activeTools.length)
    : 0;

  const toggleExpandCard = (id: string) => {
    setExpandedToolId(expandedToolId === id ? null : id);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-350 font-sans border-r border-zinc-800" id="tool-ecosystem-container">
      {/* Header Panel */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between" id="te-header">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-indigo-400" id="te-title-icon" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-sans">Tool Ecosystem Runtime</span>
        </div>
        <button
          onClick={handlePingAll}
          disabled={pinging}
          className="flex items-center gap-1.5 px-2 py-1 cursor-pointer bg-zinc-900 hover:bg-zinc-800 rounded border border-zinc-850 hover:border-zinc-700 text-[10px] text-zinc-300 transition-all font-mono disabled:opacity-50"
          id="btn-ping-tools"
        >
          <RotateCw className={`w-3 h-3 text-indigo-400 ${pinging ? "animate-spin" : ""}`} />
          {pinging ? "REFRESHING ALL..." : "PING ALL"}
        </button>
      </div>

      {/* Latency Stats Overlay Dashboard */}
      <div className="bg-zinc-900/40 p-3 border-b border-zinc-900/80 grid grid-cols-2 gap-2 text-[10px] font-mono shrink-0" id="te-dashboard-overlay">
        <div className="bg-zinc-950/45 border border-zinc-900 rounded-lg p-2 flex flex-col justify-between">
          <span className="text-zinc-500 text-[9px] uppercase tracking-wider">Gateway Latency</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-sm font-bold text-indigo-400">
              {averageLatency > 0 ? `${averageLatency} ms` : "Offline"}
            </span>
            {averageLatency > 0 && (
              <span className="text-[8px] text-emerald-500 font-bold uppercase">
                {averageLatency < 20 ? "EXCELLENT" : averageLatency < 45 ? "STABLE" : "DEGRADED"}
              </span>
            )}
          </div>
        </div>
        <div className="bg-zinc-950/45 border border-zinc-900 rounded-lg p-2 flex flex-col justify-between">
          <span className="text-zinc-500 text-[9px] uppercase tracking-wider">Operational Integrity</span>
          <div className="flex items-center gap-1.5 mt-1">
            <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-zinc-200">
              {activeTools.length > 0 ? `${Math.round((activeTools.length / tools.length) * 100)}% online` : "0% connected"}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of tools */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5" id="tools-list-grid">
        {tools.map((tool) => {
          const catInfo = categories[tool.category];
          const isSelected = expandedToolId === tool.id;
          const isPingingSingle = individualPinging[tool.id];
          const isOnline = tool.status === "connected" || tool.status === "configured";

          // Calculate latency response quality colors
          let qualityColor = "text-zinc-500 border-zinc-805 bg-zinc-900";
          let qualityText = "DISCONNECTED";
          if (isOnline && tool.pingMs !== undefined) {
            if (tool.pingMs < 20) {
              qualityColor = "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
              qualityText = "EXCELLENT";
            } else if (tool.pingMs < 45) {
              qualityColor = "text-sky-450 border-sky-500/20 bg-sky-500/5";
              qualityText = "STABLE";
            } else {
              qualityColor = "text-amber-450 border-amber-500/20 bg-amber-500/5";
              qualityText = "LAGGING";
            }
          }

          return (
            <div
              key={tool.id}
              onClick={() => toggleExpandCard(tool.id)}
              className={`bg-zinc-900/30 border rounded-lg flex flex-col transition-all cursor-pointer select-none ${
                isOnline
                  ? isSelected
                    ? "border-indigo-500/50 bg-indigo-950/5 ring-1 ring-indigo-500/10"
                    : "border-zinc-850 hover:border-zinc-700"
                  : "border-zinc-905 hover:border-zinc-900 opacity-60"
              }`}
              id={`tool-card-${tool.id}`}
            >
              {/* Card Title Row */}
              <div className="p-3 flex items-center justify-between" id={`tool-row-top-${tool.id}`}>
                <div className="flex items-center gap-2 min-w-0" id={`tool-brand-${tool.id}`}>
                  {toolIcons[tool.icon] || <Wrench className="w-3.5 h-3.5 text-zinc-400" />}
                  <span className="font-semibold text-xs text-zinc-200 truncate">{tool.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0" id={`tool-status-${tool.id}`}>
                  {isOnline && (
                    <button
                      onClick={(e) => handlePingSingle(e, tool.id)}
                      disabled={isPingingSingle || pinging}
                      className="p-1 hover:bg-zinc-800/80 rounded border border-zinc-800 hover:border-zinc-700 transition disabled:opacity-50 cursor-pointer"
                      title="Run Live Latency Test"
                      id={`ping-now-${tool.id}`}
                    >
                      <Activity className={`w-3 h-3 text-zinc-400 ${isPingingSingle ? "animate-pulse stroke-indigo-400 animate-spin" : ""}`} />
                    </button>
                  )}
                  {tool.pingMs !== undefined && isOnline && (
                    <span 
                      className={`text-[9px] font-mono font-bold bg-zinc-950 px-1 py-[1.5px] border rounded ${
                        tool.pingMs < 20 ? "text-emerald-400 border-emerald-500/25" : tool.pingMs < 45 ? "text-sky-400 border-sky-500/25" : "text-amber-400 border-amber-500/25"
                      }`}
                    >
                      {tool.pingMs}ms
                    </span>
                  )}
                  {statusIcons[tool.status]}
                </div>
              </div>

              {/* Expansion content */}
              <div className="px-3 pb-3 flex flex-col gap-2">
                <p className="text-[11px] text-zinc-400 font-sans leading-normal break-words" id={`tool-desc-${tool.id}`}>
                  {tool.description}
                </p>

                {/* Interactive Real-Time Diagnostics Panel (Shown when card is selected or currently pinging) */}
                {isOnline && isSelected && (
                  <div 
                    className="mt-1 p-2.5 bg-zinc-950 rounded-lg border border-zinc-900 space-y-1.5 text-[10px] font-mono shadow-inner text-zinc-400 animate-in fade-in slide-in-from-top-1 duration-150"
                    onClick={(e) => e.stopPropagation()} // Prevent collapse inside diagnostics click
                    id={`diag-panel-${tool.id}`}
                  >
                    <div className="flex items-center justify-between text-zinc-500 border-b border-zinc-900 pb-1" id={`diag-title-${tool.id}`}>
                      <span className="flex items-center gap-1">
                        <History className="w-3 h-3 text-indigo-400" /> LATENCY HISTORY
                      </span>
                      <span className={`text-[8px] px-1 rounded uppercase border font-semibold ${qualityColor}`}>
                        {qualityText}
                      </span>
                    </div>

                    {/* Miniature sparkline-like latency bar chart */}
                    <div className="flex items-end gap-1.5 h-7 pt-1 px-1 justify-between bg-zinc-900/30 rounded border border-zinc-900/40" id={`sparkline-${tool.id}`}>
                      {tool.pingHistory && tool.pingHistory.length > 0 ? (
                        tool.pingHistory.map((val, hIdx) => {
                          const heightPct = Math.min(100, Math.max(15, (val / 60) * 100));
                          const color = val < 20 ? "bg-emerald-500 shadow-[0_0_4px_#34d399]" : val < 45 ? "bg-sky-500 shadow-[0_0_4px_#38bdf8]" : "bg-amber-500 shadow-[0_0_4px_#f59e0b]";
                          return (
                            <div 
                              key={hIdx}
                              className={`flex-1 rounded-t-sm transition-all duration-350 ${color}`}
                              style={{ height: `${heightPct}%` }}
                              title={`Latency: ${val}ms`}
                            />
                          );
                        })
                      ) : (
                        <div className="w-full text-center text-zinc-600 text-[8px] pb-1">NO RECENT PACKETS. CLICK DIAGNOSTICS TO PING.</div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[8px] text-zinc-500 mt-1" id={`diag-meta-${tool.id}`}>
                      <div>IP ADDRESS: <span className="text-zinc-400">127.0.0.1</span></div>
                      <div>PORT: <span className="text-zinc-400">3000 (Local)</span></div>
                      <div>MIN/MAX LATENCY: <span className="text-zinc-400">
                        {tool.pingHistory && tool.pingHistory.length > 0 
                          ? `${Math.min(...tool.pingHistory)}ms / ${Math.max(...tool.pingHistory)}ms` 
                          : "N/A"}
                      </span></div>
                      <div>PACKET LOSS: <span className="text-emerald-500">0%</span></div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-1 text-[10px]" id={`tool-meta-${tool.id}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded border text-[9px] font-medium leading-none uppercase tracking-wide inline-block ${catInfo.color}`}>
                      {catInfo.badge}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTool(tool.id);
                      }}
                      className="text-[9px] cursor-pointer text-zinc-400 hover:text-zinc-200 transition bg-zinc-900 hover:bg-zinc-850 px-1.5 py-0.5 rounded border border-zinc-850 hover:border-zinc-700 font-sans"
                      id={`toggle-btn-${tool.id}`}
                    >
                      {isOnline ? "Disable" : "Enable"}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5" id={`tool-action-${tool.id}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`}></span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {tool.status === "connected" ? "DEPLOYED" : tool.status === "configured" ? "ENABLED" : tool.status === "idle" ? "STANDBY" : "OFFLINE"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-zinc-950/60 border-t border-zinc-900 text-[10px] text-zinc-600 font-mono flex items-center justify-between" id="te-footer">
        <span>Active Integrations: {activeTools.length}</span>
        <span>Gateway: MCP SOCKETS</span>
      </div>
    </div>
  );
}
