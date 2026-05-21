import React, { useState } from "react";
import { 
  ShieldCheck, 
  Terminal, 
  Network, 
  HardDrive, 
  Fingerprint, 
  Info,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  XCircle,
  Copy,
  PlusCircle,
  CheckCircle2,
  Lock,
  LockKeyhole,
  LockKeyholeOpen,
  Plus,
  Trash2,
  Search,
  Check,
  ZapOff
} from "lucide-react";
import { useFluxStore } from "../store";

export default function AgentPermissions() {
  const permissions = useFluxStore((s) => s.permissions);
  const togglePermission = useFluxStore((s) => s.togglePermission);
  const credentials = useFluxStore((s) => s.credentials);
  const revokeCredential = useFluxStore((s) => s.revokeCredential);
  const regenerateCredential = useFluxStore((s) => s.regenerateCredential);
  const addCredential = useFluxStore((s) => s.addCredential);

  // UI state
  const [activeSubTab, setActiveSubTab] = useState<"policies" | "credentials">("policies");
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Register Credential state
  const [isAdding, setIsAdding] = useState(false);
  const [agentId, setAgentId] = useState(permissions[0]?.id || "file-agent");
  const [serviceName, setServiceName] = useState("");
  const [tokenValue, setTokenValue] = useState("");
  const [formError, setFormError] = useState("");
  const [showFormTokenValue, setShowFormTokenValue] = useState(false);

  const totalAgents = permissions.length;
  const fsCount = permissions.filter((p) => p.fileSystemAccess).length;
  const termCount = permissions.filter((p) => p.terminalAccess).length;
  const apiCount = permissions.filter((p) => p.externalAPIAccess).length;

  const totalCreds = credentials.length;
  const activeCreds = credentials.filter((c) => c.status === "active").length;

  // Toggle reveal helper
  const toggleReveal = (id: string) => {
    setRevealedKeys((p) => ({ ...p, [id]: !p[id] }));
  };

  // Copy to clipboard helper
  const handleCopy = (id: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKeyId(id);
    setTimeout(() => {
      setCopiedKeyId(null);
    }, 1800);
  };

  // Safe manual registration
  const handleRegisterCred = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) {
      setFormError("Service or key name cannot be empty.");
      return;
    }
    setFormError("");
    const generatedToken = tokenValue.trim() || `flx_custom_${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 6)}`;
    
    addCredential(agentId, serviceName.trim(), generatedToken);
    
    // reset form fields
    setServiceName("");
    setTokenValue("");
    setIsAdding(false);
    setShowFormTokenValue(false);
  };

  // Fill in simulated mock token helper
  const fillSimulatedToken = () => {
    const prefixes: Record<string, string> = {
      "file-agent": "flx_vfs_io_auth",
      "terminal-agent": "flx_sh_session_token",
      "llm-router": "flx_gemini_router_api_sec",
      "memory-agent": "flx_vdb_graph_secret"
    };
    const prefix = prefixes[agentId] || "flx_gate_token";
    const randomHex = () => Math.random().toString(16).substring(2, 10);
    setTokenValue(`${prefix}_${randomHex()}${randomHex()}`);
  };

  return (
    <div className="flex flex-col h-full bg-[#16191E]" id="agent-permissions-panel">
      {/* Dynamic Tab Header with Segment Switcher */}
      <div className="p-3 border-b border-[#2A2D35] flex items-center justify-between bg-[#111317]" id="perm-header">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" id="perm-badge-icon" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Agent Configuration</span>
        </div>
        <span className="text-[9px] font-mono text-[#6366F1] font-bold bg-[#6366F1]/10 border border-[#6366F1]/20 px-2 py-[2px] rounded uppercase">
          FLUX_SHIELD_V2
        </span>
      </div>

      {/* Sub Tab selection controls */}
      <div className="flex border-b border-[#2A2D35] bg-[#0F1115]/50 p-1" id="sub-navigation">
        <button
          onClick={() => setActiveSubTab("policies")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${
            activeSubTab === "policies"
              ? "bg-[#1E2228] text-white border-b-2 border-indigo-500 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1E2228]/40"
          }`}
          id="sub-tab-policies"
        >
          <ShieldCheck className={`w-3.5 h-3.5 ${activeSubTab === "policies" ? "text-indigo-400" : "text-zinc-500"}`} />
          <span>Security Policies</span>
        </button>
        <button
          onClick={() => setActiveSubTab("credentials")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${
            activeSubTab === "credentials"
              ? "bg-[#1E2228] text-white border-b-2 border-indigo-500 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1E2228]/40"
          }`}
          id="sub-tab-credentials"
        >
          <Key className={`w-3.5 h-3.5 ${activeSubTab === "credentials" ? "text-indigo-400" : "text-zinc-500"}`} />
          <span className="flex items-center gap-1">
            Secure Credentials Store
            {activeCreds > 0 && (
              <span className="text-[9px] px-1.5 py-px font-bold font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {activeCreds}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* RENDER POLICIES OVERVIEW SECTION */}
      {activeSubTab === "policies" && (
        <div className="flex flex-col flex-1 min-h-0 bg-[#16191E]" id="policies-scaffold">
          {/* Policies Overview Banner */}
          <div className="p-3 bg-zinc-950/40 border-b border-[#2A2D35]/50 text-xs text-zinc-400 space-y-2" id="policies-banner">
            <p className="text-[11px] leading-relaxed text-zinc-400">
              Govern authorization boundaries for active simulated agents. Security violations are intercepted in real-time and logged in the terminal orchestrator history.
            </p>
            
            {/* Security Metrics Desk */}
            <div className="grid grid-cols-3 gap-2 bg-[#0F1115]/80 p-2 rounded-lg border border-[#2A2D35]/40 font-mono text-[10px]" id="security-metrics-subgrid">
              <div className="text-center p-1 border-r border-[#2A2D35]/30">
                <div className="text-zinc-500 font-bold uppercase text-[8px] tracking-wider mb-0.5">File Access</div>
                <div className="text-xs font-bold text-emerald-400">{fsCount} / {totalAgents}</div>
              </div>
              <div className="text-center p-1 border-r border-[#2A2D35]/30">
                <div className="text-zinc-500 font-bold uppercase text-[8px] tracking-wider mb-0.5">Terminal Shells</div>
                <div className="text-xs font-bold text-indigo-400">{termCount} / {totalAgents}</div>
              </div>
              <div className="text-center p-1">
                <div className="text-zinc-500 font-bold uppercase text-[8px] tracking-wider mb-0.5">Network APIs</div>
                <div className="text-xs font-bold text-pink-400">{apiCount} / {totalAgents}</div>
              </div>
            </div>
          </div>

          {/* Agents Scrollable Policy Cards List */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4" id="agent-cards-deck">
            {permissions.map((agent) => {
              return (
                <div
                  key={agent.id}
                  className="p-3 bg-[#0F1115]/90 border border-[#2A2D35] hover:border-indigo-500/30 rounded-xl transition-all flex flex-col gap-3 group animate-all"
                  id={`agent-card-${agent.id}`}
                >
                  {/* Agent Ident */}
                  <div className="flex items-start gap-2.5 justify-between" id={`agent-card-ident-${agent.id}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-zinc-805 border border-zinc-700 flex items-center justify-center font-mono text-xs text-indigo-300 font-bold">
                        {agent.id.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-zinc-100 group-hover:text-indigo-400 transition-colors truncate">
                          {agent.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium font-mono">
                          {agent.role}
                        </span>
                      </div>
                    </div>
                    <div className="text-[9px] font-mono text-zinc-500 bg-zinc-950 p-1.5 py-[2px] rounded uppercase flex items-center gap-1 leading-none select-none">
                      <Fingerprint className="w-2.5 h-2.5 text-indigo-500" />
                      <span>{agent.id.toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Description text */}
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans px-0.5">
                    {agent.description}
                  </p>

                  {/* Checkbox / Toggle grid */}
                  <div 
                    className="grid grid-cols-1 gap-1.5 pt-1 border-t border-[#2A2D35]/45" 
                    id={`permissions-switch-grid-${agent.id}`}
                  >
                    
                    {/* File system access toggle checkbox */}
                    <label 
                      className="relative flex items-center justify-between p-2 rounded-lg bg-[#16191E]/50 hover:bg-[#1E2228]/50 border border-transparent hover:border-[#2A2D35]/60 transition-all cursor-pointer select-none group"
                      id={`lbl-fs-${agent.id}`}
                    >
                      {/* Tooltip */}
                      <div className="absolute left-2 right-2 bottom-full mb-2 bg-[#1E2228] border border-[#2D3139] text-zinc-300 rounded-lg p-3 shadow-2xl z-50 opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 text-left leading-relaxed">
                        <div className="text-[9px] font-bold tracking-wider text-emerald-400 uppercase font-mono mb-1 flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          <span>File System Privileges</span>
                        </div>
                        <p className="text-[10px] text-zinc-200">
                          Grants authority to read, write, edit, and create files/directories inside the workspace codebase sandbox. Crucial for agent automated edits.
                        </p>
                        <div className="mt-1.5 text-[9px] text-zinc-400 border-t border-[#2A2D35]/70 pt-1.5 font-mono leading-normal">
                          <span className="text-amber-400 font-bold">SECURITY RISKS:</span> Restricted values enforce write isolation policies to prevent untrusted codebase degradation.
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-zinc-350">
                        <HardDrive className={`w-3.5 h-3.5 ${agent.fileSystemAccess ? "text-emerald-400" : "text-zinc-500"}`} />
                        <span className="font-medium flex items-center gap-1.5">
                          File System
                          <Info className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className={`text-[10px] uppercase font-semibold ${agent.fileSystemAccess ? "text-emerald-400" : "text-zinc-500"}`}>
                          {agent.fileSystemAccess ? "Allow" : "Deny"}
                        </span>
                        <input
                          type="checkbox"
                          checked={agent.fileSystemAccess}
                          onChange={() => togglePermission(agent.id, "fileSystemAccess")}
                          className="cursor-pointer accent-indigo-500 w-3.5 h-3.5 rounded border-[#2A2D35] bg-zinc-950 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                        />
                      </div>
                    </label>

                    {/* Terminal cli access toggle checkbox */}
                    <label 
                      className="relative flex items-center justify-between p-2 rounded-lg bg-[#16191E]/50 hover:bg-[#1E2228]/50 border border-transparent hover:border-[#2A2D35]/60 transition-all cursor-pointer select-none group"
                      id={`lbl-term-${agent.id}`}
                    >
                      {/* Tooltip */}
                      <div className="absolute left-2 right-2 bottom-full mb-2 bg-[#1E2228] border border-[#2D3139] text-zinc-300 rounded-lg p-3 shadow-2xl z-50 opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 text-left leading-relaxed">
                        <div className="text-[9px] font-bold tracking-wider text-indigo-400 uppercase font-mono mb-1 flex items-center gap-1">
                          <Terminal className="w-3 h-3" />
                          <span>Terminal Shell Privileges</span>
                        </div>
                        <p className="text-[10px] text-zinc-200">
                          Authorizes the agent to execute shell commands, run test suites, check builds, install dependencies, and manipulate binary configurations.
                        </p>
                        <div className="mt-1.5 text-[9px] text-zinc-400 border-t border-[#2A2D35]/70 pt-1.5 font-mono leading-normal">
                          <span className="text-rose-400 font-bold">SECURITY RISKS:</span> CRITICAL. Allows execution of commands on system containers. Denying this limits the agent to pure static mock analysis.
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-zinc-350">
                        <Terminal className={`w-3.5 h-3.5 ${agent.terminalAccess ? "text-indigo-400" : "text-zinc-500"}`} />
                        <span className="font-medium flex items-center gap-1.5">
                          Terminal CLIs
                          <Info className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className={`text-[10px] uppercase font-semibold ${agent.terminalAccess ? "text-indigo-400" : "text-zinc-500"}`}>
                          {agent.terminalAccess ? "Allow" : "Deny"}
                        </span>
                        <input
                          type="checkbox"
                          checked={agent.terminalAccess}
                          onChange={() => togglePermission(agent.id, "terminalAccess")}
                          className="cursor-pointer accent-indigo-500 w-3.5 h-3.5 rounded border-[#2A2D35] bg-zinc-950 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                        />
                      </div>
                    </label>

                    {/* External API Access */}
                    <label 
                      className="relative flex items-center justify-between p-2 rounded-lg bg-[#16191E]/50 hover:bg-[#1E2228]/50 border border-transparent hover:border-[#2A2D35]/60 transition-all cursor-pointer select-none group"
                      id={`lbl-api-${agent.id}`}
                    >
                      {/* Tooltip */}
                      <div className="absolute left-2 right-2 bottom-full mb-2 bg-[#1E2228] border border-[#2D3139] text-zinc-300 rounded-lg p-3 shadow-2xl z-50 opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 text-left leading-relaxed">
                        <div className="text-[9px] font-bold tracking-wider text-pink-400 uppercase font-mono mb-1 flex items-center gap-1">
                          <Network className="w-3 h-3" />
                          <span>Outbound Network API Privileges</span>
                        </div>
                        <p className="text-[10px] text-zinc-200">
                          Permits outbound HTTP requests to configure remote APIs, synchronize credentials, and call central intelligence or model routers.
                        </p>
                        <div className="mt-1.5 text-[9px] text-zinc-400 border-t border-[#2A2D35]/70 pt-1.5 font-mono leading-normal">
                          <span className="text-[#6366F1] font-bold">SECURITY RISKS:</span> Enforced deny flags block external data leaking vectors, ensuring offline sandboxing constraints.
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-zinc-350">
                        <Network className={`w-3.5 h-3.5 ${agent.externalAPIAccess ? "text-pink-400" : "text-zinc-500"}`} />
                        <span className="font-medium flex items-center gap-1.5">
                          External APIs
                          <Info className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className={`text-[10px] uppercase font-semibold ${agent.externalAPIAccess ? "text-pink-400" : "text-zinc-500"}`}>
                          {agent.externalAPIAccess ? "Allow" : "Deny"}
                        </span>
                        <input
                          type="checkbox"
                          checked={agent.externalAPIAccess}
                          onChange={() => togglePermission(agent.id, "externalAPIAccess")}
                          className="cursor-pointer accent-indigo-500 w-3.5 h-3.5 rounded border-[#2A2D35] bg-zinc-950 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                        />
                      </div>
                    </label>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* RENDER SECURE CREDENTIALS STORE */}
      {activeSubTab === "credentials" && (
        <div className="flex flex-col flex-1 min-h-0 bg-[#16191E]" id="credentials-scaffold">
          {/* Cryptographic Vault stats card banner */}
          <div className="p-3 bg-zinc-950/40 border-b border-[#2A2D35]/50 text-xs text-zinc-400 space-y-2" id="credentials-banner">
            <div className="flex items-center justify-between">
              <span className="text-[11px] leading-relaxed text-zinc-400">
                Instantly revoke keys or roll them with modern cryptographic salts to reset agent connections.
              </span>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 border rounded-lg transition-all ${
                  isAdding 
                    ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                    : "bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border-indigo-500/20 cursor-pointer"
                }`}
                id="toggle-add-cred-btn"
              >
                {isAdding ? <XCircle className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{isAdding ? "Cancel" : "Add Key Token"}</span>
              </button>
            </div>

            {/* Quick stats on credentials ledger */}
            <div className="grid grid-cols-2 gap-2 bg-[#0F1115]/80 p-2 rounded-lg border border-[#2A2D35]/40 font-mono text-[10px]" id="vault-metrics-box">
              <div className="flex items-center justify-between px-2 border-r border-[#2A2D35]/30">
                <span className="text-zinc-500 font-bold uppercase text-[8px] tracking-wider">Total Registers</span>
                <span className="text-xs font-bold text-zinc-300">{totalCreds}</span>
              </div>
              <div className="flex items-center justify-between px-2">
                <span className="text-zinc-500 font-bold uppercase text-[8px] tracking-wider">Active Keys</span>
                <span className="text-xs font-bold text-emerald-400">{activeCreds} / {totalCreds}</span>
              </div>
            </div>
          </div>

          {/* Expanded Inline Add Custom Credential Form */}
          {isAdding && (
            <form onSubmit={handleRegisterCred} className="p-3 bg-[#0F1115]/80 border-b border-[#2E313A] text-xs space-y-3 animate-fade-in" id="add-cred-form">
              <div className="flex items-center justify-between border-b border-[#2A2D35]/40 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-450">Register Secure System Token</span>
                <LockKeyholeOpen className="w-3.5 h-3.5 text-indigo-400" />
              </div>

              {formError && (
                <div className="p-1 px-2.5 bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400 rounded-lg flex gap-1 items-center">
                  <XCircle className="w-3 h-3 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2.5">
                {/* Agent Selector Dropdown */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-400 font-bold font-mono uppercase">Agent Domain Owner</label>
                  <select
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    className="w-full bg-[#16191E] border border-[#2A2D35] rounded px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-indigo-500 text-[11px]"
                  >
                    {permissions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Secret Token Service Name identifier */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-400 font-bold font-mono uppercase">Token/Service Identity</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GitHub Read/Write Webhook Key"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    className="w-full bg-[#16191E] border border-[#2A2D35] rounded px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-indigo-500 placeholder-zinc-500 text-[11px]"
                  />
                </div>

                {/* Credentials core value field */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-400 font-bold font-mono uppercase">Developer Access Token</label>
                    <button
                      type="button"
                      onClick={fillSimulatedToken}
                      className="text-[9px] text-indigo-400 hover:text-indigo-300 underline font-mono cursor-pointer"
                    >
                      Autogen Key
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showFormTokenValue ? "text" : "password"}
                      placeholder="Leave empty to autogenerate secure flx_usr_ token"
                      value={tokenValue}
                      onChange={(e) => setTokenValue(e.target.value)}
                      className="w-full bg-[#16191E] border border-[#2A2D35] rounded pl-2.5 pr-10 py-1.5 text-zinc-300 focus:outline-none focus:border-indigo-500 placeholder-zinc-650 font-mono text-[10px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormTokenValue(!showFormTokenValue)}
                      className="absolute right-2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer rounded hover:bg-zinc-850"
                      title={showFormTokenValue ? "Hide Key" : "Show Key"}
                    >
                      {showFormTokenValue ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action operations buttons */}
              <div className="flex items-center gap-2 pt-1.5">
                <button
                  type="submit"
                  className="flex-1 min-h-[30px] bg-indigo-600 hover:bg-indigo-550 text-white font-bold rounded-lg transition-colors text-[11px] cursor-pointer"
                >
                  Confirm Secure Register
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 min-h-[30px] border border-[#2A2D35] hover:bg-zinc-850 text-zinc-400 rounded-lg transition-colors text-[11px]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Secure credentials scrollable ledger list */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4" id="vault-cards-deck">
            {credentials.map((cred) => {
              const hasRevealed = !!revealedKeys[cred.id];
              const isCopied = copiedKeyId === cred.id;
              const isActive = cred.status === "active";

              return (
                <div
                  key={cred.id}
                  className={`p-3 bg-[#0F1115]/95 border rounded-xl transition-all flex flex-col gap-2.5 group ${
                    isActive ? "hover:border-indigo-500/30 border-[#2A2D35]" : "border-rose-955/20 opacity-80"
                  }`}
                  id={`cred-card-${cred.id}`}
                >
                  {/* Service metadata header info */}
                  <div className="flex items-start gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center border font-mono text-[10px] font-bold ${
                        isActive
                          ? "bg-indigo-600/10 border-indigo-500/20 text-indigo-400"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      }`}>
                        <Key className="w-3 h-3" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-zinc-200 truncate">
                          {cred.serviceName}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-semibold font-mono flex items-center gap-1">
                          <span>Owner:</span>
                          <span className="text-zinc-400 font-sans">{cred.agentName}</span>
                        </span>
                      </div>
                    </div>

                    {/* Active vs Revoked Badges */}
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-mono px-2 py-[2px] font-semibold border rounded-full select-none ${
                        isActive 
                          ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/10"
                          : "text-rose-400 bg-rose-500/5 border-rose-500/10"
                      }`}>
                        {isActive ? "ACTIVE" : "REVOKED"}
                      </span>
                    </div>
                  </div>

                  {/* Masked API token slider block */}
                  <div className="relative bg-[#16191E] border border-[#2A2D35]/65 rounded-lg p-2 flex items-center justify-between font-mono text-[10px]">
                    
                    {/* Access Value field with masked representation */}
                    <div className="truncate pr-12 text-zinc-300 font-semibold tracking-wide select-all">
                      {isActive ? (
                        hasRevealed ? (
                          cred.tokenValue
                        ) : (
                          <span>
                            {cred.tokenValue.slice(0, 12)}
                            <span className="text-[8px] opacity-40 select-none">••••••••••••••••</span>
                          </span>
                        )
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1 line-through opacity-85">
                          <ZapOff className="w-3 h-3 text-rose-500 inline" />
                          <span>REVOKED_AND_BLOCKED</span>
                        </span>
                      )}
                    </div>

                    {/* Mask view eye button controls */}
                    <div className="flex items-center gap-1 select-none flex-shrink-0">
                      {isActive && (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleReveal(cred.id)}
                            title={hasRevealed ? "Mask Value" : "Reveal Value"}
                            className="p-1 text-zinc-500 hover:text-zinc-350 transition-colors hover:bg-zinc-800 rounded cursor-pointer"
                          >
                            {hasRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(cred.id, cred.tokenValue)}
                            title="Copy Key"
                            className="p-1 text-zinc-500 hover:text-zinc-350 transition-colors hover:bg-zinc-800 rounded cursor-pointer"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400 font-bold" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </>
                      )}
                    </div>

                  </div>

                  {/* Vault Card Footer (Revoke / Roll Keys Action and details) */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#2A2D35]/50 text-[9px] font-mono text-zinc-500">
                    <div>
                      Last active: <span className="text-zinc-400">{cred.lastVerified}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      {/* Revoke key switch action controller */}
                      {isActive ? (
                        <button
                          type="button"
                          onClick={() => revokeCredential(cred.id)}
                          className="flex items-center gap-1 text-[9px] text-rose-400 hover:text-rose-350 border border-transparent hover:border-rose-505/20 px-2 py-0.5 rounded bg-rose-505/5 hover:bg-rose-505/10 transition-colors cursor-pointer font-semibold uppercase"
                        >
                          Revoke Key
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => regenerateCredential(cred.id)}
                          className="flex items-center gap-1 text-[9px] text-emerald-400 hover:text-emerald-350 border border-[#2A2D35] px-2 py-0.5 rounded bg-[#16191E] hover:bg-zinc-800 transition-colors cursor-pointer font-semibold uppercase"
                        >
                          Enable & Reactivate
                        </button>
                      )}

                      {/* Regenerate key and roll seeds action */}
                      {isActive && (
                        <button
                          type="button"
                          onClick={() => regenerateCredential(cred.id)}
                          className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-indigo-400 border border-[#2A2D35] px-2 py-0.5 rounded bg-[#16191E] hover:bg-zinc-800 transition-colors cursor-pointer font-semibold uppercase"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          Roll Key
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Helpful security reminder section */}
      <div className="p-3 border-t border-[#2A2D35]/50 bg-[#121418] rounded-b-xl flex gap-2" id="safety-disclaimer">
        <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
        <div className="text-[10px] text-zinc-500 leading-relaxed font-sans">
          <strong>Security Audit Note:</strong> Secret tokens are managed on standard state buffers. revoking keys blocks all subsequent simulation tasks for safety checks.
        </div>
      </div>
    </div>
  );
}
