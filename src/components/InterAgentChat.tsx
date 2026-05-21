import React, { useState, useEffect, useRef } from "react";
import { 
  Megaphone, 
  Files, 
  Terminal, 
  Database, 
  Hash, 
  Send, 
  Play, 
  Users, 
  Sparkles, 
  Activity, 
  Bot, 
  User, 
  Clock 
} from "lucide-react";
import { useFluxStore } from "../store";
import { InterAgentMessage, InterAgentChannel } from "../types";

export default function InterAgentChat() {
  const interAgentMessages = useFluxStore((s) => s.interAgentMessages);
  const interAgentChannels = useFluxStore((s) => s.interAgentChannels);
  const activeChannelId = useFluxStore((s) => s.activeChannelId);
  const isAgentTyping = useFluxStore((s) => s.isAgentTyping);
  const plan = useFluxStore((s) => s.plan);
  
  const setActiveChannelId = useFluxStore((s) => s.setActiveChannelId);
  const sendInterAgentMessage = useFluxStore((s) => s.sendInterAgentMessage);
  const simulateAgentConversation = useFluxStore((s) => s.simulateAgentConversation);

  const [inputText, setInputText] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<string>("orchestrator");
  const [isSimulating, setIsSimulating] = useState(false);
  const [attachedTaskId, setAttachedTaskId] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interAgentMessages, isAgentTyping]);

  const activeChannel = interAgentChannels.find((c) => c.id === activeChannelId) || interAgentChannels[0];
  const channelMessages = interAgentMessages.filter((m) => m.channelId === activeChannelId);

  const channelIcons: Record<string, React.ReactNode> = {
    Megaphone: <Megaphone className="w-3.5 h-3.5" />,
    Files: <Files className="w-3.5 h-3.5" />,
    Terminal: <Terminal className="w-3.5 h-3.5" />,
    Database: <Database className="w-3.5 h-3.5" />,
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    await sendInterAgentMessage(
      activeChannelId,
      selectedPersona,
      inputText,
      selectedPersona === "orchestrator" ? "general" : "task_handover",
      attachedTaskId ? plan.find(t => t.id === attachedTaskId)?.label : undefined
    );
    setInputText("");
    setAttachedTaskId("");
  };

  const executeSimulation = async () => {
    setIsSimulating(true);
    await simulateAgentConversation(attachedTaskId || undefined);
    setIsSimulating(false);
  };

  // Agent profiles formatting
  const personas = [
    { id: "orchestrator", name: "You (Orchestrator)", role: "Human Supervisor", border: "border-slate-500/30 bg-slate-500/5", color: "text-slate-300", badgeColor: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
    { id: "llm-router", name: "Cognitive LLM Router", role: "Decision Core", border: "border-indigo-500/30 bg-indigo-500/5", color: "text-indigo-400", badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
    { id: "file-agent", name: "File Architect", role: "VFS Specialist", border: "border-emerald-500/30 bg-emerald-500/5", color: "text-emerald-400", badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    { id: "terminal-agent", name: "Terminal Command Executor", role: "System Proxy", border: "border-amber-500/30 bg-amber-500/5", color: "text-amber-400", badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    { id: "memory-agent", name: "Memory Indexer", role: "Semantic Embedder", border: "border-sky-500/30 bg-sky-500/5", color: "text-sky-400", badgeColor: "bg-sky-500/10 text-sky-450 border-sky-500/20" },
  ];

  const coordinationBadges: Record<string, { label: string; style: string }> = {
    task_handover: { label: "Task Handover", style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    api_request: { label: "API Request", style: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
    diagnostics_pass: { label: "Diagnostics OK", style: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    vector_embed: { label: "Memory Embed", style: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
    general: { label: "Coordination", style: "bg-zinc-800 text-zinc-400 border-zinc-700/50" },
  };

  const getPersonaStyle = (senderId: string) => {
    return personas.find(p => p.id === senderId) || personas[0];
  };

  const pendingTasks = plan.filter(t => t.status !== "done");

  return (
    <div className="flex h-full bg-[#16191E] text-zinc-300 font-sans" id="inter-agent-chat-wrapper">
      
      {/* CHANNELS NAVIGATION SIDEBAR */}
      <div className="w-48 bg-[#0F1115] border-r border-[#2A2D35] flex flex-col shrink-0" id="chat-sidebar">
        <div className="p-3 border-b border-[#2A2D35] flex items-center justify-between" id="sidebar-meta-pane">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">PEER CHANNELS</span>
          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 px-1 py-[1.5px] rounded border border-emerald-950">Active</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5" id="channels-navigation-deck">
          {interAgentChannels.map((channel) => {
            const isSelected = channel.id === activeChannelId;
            // Check if any agent participating in this channel is typing
            const hasTyping = channel.participants.some(p => isAgentTyping[p]);

            return (
              <button
                key={channel.id}
                onClick={() => setActiveChannelId(channel.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-2.5 rounded-lg text-left transition-all group border ${
                  isSelected 
                    ? "bg-indigo-600/15 text-indigo-300 border-indigo-500/35 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 bg-[#16191E]/30 hover:bg-[#1E2228]/50 border-transparent"
                }`}
                id={`chan-btn-${channel.id}`}
              >
                <div className={`p-1 rounded ${isSelected ? "bg-indigo-600/20 text-indigo-400" : "bg-zinc-900 text-zinc-500 group-hover:text-zinc-300"}`}>
                  {channelIcons[channel.icon] || <Hash className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold truncate font-mono">#{channel.name}</span>
                    {hasTyping && (
                      <span className="flex gap-0.5 items-center justify-center h-2" title="Agents collaborating...">
                        <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                        <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                        <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Telemetry Status */}
        <div className="p-2.5 bg-[#16191E]/40 border-t border-[#2A2D35] text-[9.5px] font-mono text-zinc-500 space-y-1" id="chat-sidebar-footer">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Coordination Engine Online</span>
          </div>
          <div>Protocols: Multi-Agent Handoff</div>
        </div>
      </div>

      {/* ACTIVE CONVERSATION COMPONENT */}
      <div className="flex-1 flex flex-col min-w-0" id="chat-conversation-plane">
        
        {/* Title and Participants Bar */}
        <div className="p-3 bg-[#1C2026] border-b border-[#2A2D35] flex items-center justify-between" id="active-chat-header">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-200">#{activeChannel.name}</span>
              <span className="text-[9.5px] font-sans text-zinc-400 hidden sm:inline">• {activeChannel.description}</span>
            </div>
            
            {/* Active Channel Peer List */}
            <div className="flex items-center gap-1.5 mt-1" id="participants-avatars">
              <Users className="w-3 h-3 text-zinc-500" />
              <div className="flex -space-x-1.5 overflow-hidden">
                {personas.slice(1).map((agent) => (
                  <div
                    key={agent.id}
                    className={`w-4 h-4 rounded-full border border-zinc-950 flex items-center justify-center text-[8px] font-bold font-mono ${
                      activeChannel.participants.includes(agent.id) || activeChannel.participants.includes("all")
                        ? "bg-indigo-600 font-bold text-white"
                        : "bg-zinc-800 text-zinc-650"
                    }`}
                    title={`${agent.name} (${agent.role})`}
                  >
                    {agent.name.charAt(0)}
                  </div>
                ))}
              </div>
              <span className="text-[9px] text-zinc-500 font-mono">
                Participants: {activeChannel.participants.includes("all") ? "All Nodes" : `${activeChannel.participants.length} peers`}
              </span>
            </div>
          </div>

          {/* Trigger Peer Simulation Button */}
          <button
            onClick={executeSimulation}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] transition rounded border border-[#6366F1]/20 hover:border-[#6366F1]/50 text-[10.5px] font-semibold text-white cursor-pointer select-none disabled:opacity-40 shadow-sm font-sans"
            id="simulation-trigger-btn"
          >
            <Play className={`w-3 h-3 ${isSimulating ? "animate-pulse" : ""}`} />
            {isSimulating ? "COORDINATING..." : "PEER RUN SIM"}
          </button>
        </div>

        {/* MAIN FEED FOR INTERAGENT MESSAGES */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0F1115]/50 select-text selection:bg-indigo-500/20" id="dialogue-messages-scroller">
          {channelMessages.map((msg) => {
            const styles = getPersonaStyle(msg.senderId);
            const badge = msg.coordinationType ? coordinationBadges[msg.coordinationType] : null;

            return (
              <div 
                key={msg.id}
                className={`p-3 border rounded-xl flex flex-col gap-2 transition-all max-w-[90%] ${
                  msg.senderId === "orchestrator" 
                    ? "mr-auto ml-1 border-slate-500/10 bg-[#16191E]/50" 
                    : `mr-auto border-transparent bg-[#16191E]/30`
                }`}
                id={`inter-msg-${msg.id}`}
              >
                {/* Meta details header row */}
                <div className="flex items-center justify-between gap-6" id={`inter-msg-top-${msg.id}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-extrabold ${styles.border}`}>
                      {msg.senderId === "orchestrator" ? <User className="w-3 h-3 text-slate-400" /> : <Bot className="w-3 h-3 text-indigo-400" />}
                    </div>
                    <span className={`text-[11.5px] font-bold ${styles.color}`}>{msg.senderName}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">({styles.role})</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0" id={`inter-msg-meta-${msg.id}`}>
                    {badge && (
                      <span className={`px-1.5 py-[1px] rounded text-[8px] font-mono font-bold uppercase tracking-wider border ${badge.style}`}>
                        {badge.label}
                      </span>
                    )}
                    <span className="text-[9.5px] text-zinc-600 font-mono flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5 text-zinc-650" /> {msg.timestamp}
                    </span>
                  </div>
                </div>

                {/* Actual dialogue core content */}
                <p className="text-[11.5px] text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap break-words pl-1 border-l border-zinc-800">
                  {msg.text}
                </p>

                {/* Contextual Link to Planning tasks if attached */}
                {msg.taskContext && (
                  <div className="flex items-center gap-1.5 mt-0.5 text-[9.5px] text-indigo-400 bg-indigo-950/20 p-1.5 rounded-md border border-indigo-900/30 font-mono w-max max-w-full" id={`inter-msg-task-${msg.id}`}>
                    <Activity className="w-3 h-3 animate-pulse" />
                    <span className="truncate">Active Protocol: <strong className="text-zinc-200">{msg.taskContext}</strong></span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing simulation container */}
          {personas.map((agent) => {
            if (!isAgentTyping[agent.id]) return null;
            return (
              <div 
                key={agent.id}
                className="p-3 bg-[#16191E]/30 border border-transparent rounded-xl flex items-center gap-3 w-56 animate-pulse"
                id={`typing-indicator-${agent.id}`}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-extrabold ${agent.border}`}>
                  <Bot className="w-3 h-3 text-indigo-400" />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <span className={`text-[10px] font-bold ${agent.color}`}>{agent.name}</span>
                  <div className="flex gap-1 items-center py-0.5">
                    <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    <span className="text-[9px] font-mono text-zinc-550 italic ml-1">typing cooperator dialogue...</span>
                  </div>
                </div>
              </div>
            );
          })}

          {channelMessages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 text-zinc-550 font-mono" id="empty-coordination-feed animate-fade-in">
              <Bot className="w-8 h-8 text-indigo-500/20 animate-bounce" />
              <div className="text-[11px] font-bold">DIALOGUE PIPELINE IS VACANT</div>
              <p className="text-[10px] max-w-xs text-zinc-500 leading-normal">
                Click "PEER RUN SIM" above or post a custom message below to engage peer-to-peer agentic workspace handovers.
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT DECK & PERSONA INJECTION SYSTEM */}
        <div className="p-3 bg-[#16191E] border-t border-[#2A2D35]" id="chat-input-panel">
          <form onSubmit={handleSendMessage} className="space-y-2" id="chat-post-form">
            
            {/* Simulated Injection Config Tooling Row */}
            <div className="flex flex-wrap items-center gap-2 justify-between" id="chat-persona-injector">
              
              {/* Persona Selector */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono" id="pose-as-container">
                <span className="text-zinc-500 font-bold select-none uppercase tracking-wide">Pose Persona:</span>
                <select
                  value={selectedPersona}
                  onChange={(e) => setSelectedPersona(e.target.value)}
                  className="bg-[#0F1115] border border-[#2A2D35] text-[10.5px] rounded px-2 py-1 text-zinc-300 focus:outline-none focus:border-indigo-500 cursor-pointer text-xs"
                  id="pose-select-id"
                >
                  {personas.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#0F1115] text-zinc-200">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Linkage Attachments */}
              {pendingTasks.length > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono" id="task-context-container">
                  <span className="text-zinc-500 font-bold select-none uppercase tracking-wide">Target Context:</span>
                  <select
                    value={attachedTaskId}
                    onChange={(e) => setAttachedTaskId(e.target.value)}
                    className="bg-[#0F1115] border border-[#2A2D35] text-[10.5px] rounded px-2 py-1 text-indigo-400 tracking-wide focus:outline-none focus:border-indigo-500 cursor-pointer max-w-44 text-xs"
                    id="attach-task-select-id"
                  >
                    <option value="" className="bg-[#0F1115] text-zinc-400">--- NO TASK LINKED ---</option>
                    {pendingTasks.map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#0F1115] text-indigo-300 truncate">
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Standard Message Text Input block */}
            <div className="flex gap-2 items-center" id="text-input-field-wrapper">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isSimulating}
                placeholder={
                  selectedPersona === "orchestrator" 
                    ? "Dispatch developer directive to peer channels (e.g., 'terminal-agent, run webpack audit!')..."
                    : `Inject response posing as ${personas.find(p => p.id === selectedPersona)?.name}...`
                }
                className="flex-1 bg-[#0F1115] border border-[#2A2D35] hover:border-[#353942] focus:border-indigo-600 rounded-lg px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none transition-all placeholder-zinc-500 font-sans tracking-wide leading-normal"
                id="coordination-chat-textbox"
              />
              <button
                type="submit"
                disabled={isSimulating || !inputText.trim()}
                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg text-white font-bold tracking-wider text-[11px] transition-all flex items-center justify-center cursor-pointer select-none border border-indigo-500/20 shrink-0 uppercase"
                id="btn-send-coordination"
                title="Send Live Packet"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            
          </form>
        </div>

      </div>

    </div>
  );
}
