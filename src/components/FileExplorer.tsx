import React, { useState } from "react";
import { 
  Folder, 
  Trash, 
  Code, 
  Search, 
  X, 
  GitBranch, 
  GitCommit, 
  Plus, 
  History, 
  Check, 
  Clock, 
  AlertTriangle, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  GitPullRequest, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import { VirtualFile } from "../types";
import { useFluxStore } from "../store";

interface FileExplorerProps {
  files: VirtualFile[];
  activePath: string;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
}

export default function FileExplorer({
  files,
  activePath,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
}: FileExplorerProps) {
  const [newFileName, setNewFileName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Simulated Git state from useFluxStore
  const gitBranches = useFluxStore((s) => s.gitBranches);
  const switchBranch = useFluxStore((s) => s.switchBranch);
  const createBranch = useFluxStore((s) => s.createBranch);

  const [isGitPanelExpanded, setIsGitPanelExpanded] = useState(true);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [branchError, setBranchError] = useState("");
  const [commitsPreviewBranch, setCommitsPreviewBranch] = useState<string | null>(null);
  const [conflictsBranchName, setConflictsBranchName] = useState<string | null>(null);
  const [conflictingFiles, setConflictingFiles] = useState<{ path: string; reason: string }[]>([]);
  const editorContent = useFluxStore((s) => s.editorContent);

  // New UX Enhancements States
  const [branchSearchQuery, setBranchSearchQuery] = useState("");
  const [commitSearchQuery, setCommitSearchQuery] = useState("");
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);
  const [selectedConflictPath, setSelectedConflictPath] = useState<string | null>(null);
  const [showUncommittedSection, setShowUncommittedSection] = useState(false);
  const [copiedCommitHash, setCopiedCommitHash] = useState<string | null>(null);

  const currentBranch = gitBranches.find((b) => b.isCurrent) || gitBranches[0];

  // Calculate uncommitted local files
  const getUncommittedChanges = () => {
    if (!currentBranch) return [];
    const currentCommitted = currentBranch.committedFiles || currentBranch.files || [];
    const changed: { path: string; status: "modified" | "added" | "deleted"; fileObj?: VirtualFile }[] = [];
    
    files.forEach((f) => {
      const currentContent = f.path === activePath ? editorContent : f.content;
      const commFile = currentCommitted.find((cf) => cf.path === f.path);
      const committedContent = commFile ? commFile.content : null;
      
      if (committedContent === null) {
        changed.push({ path: f.path, status: "added", fileObj: f });
      } else if (committedContent !== currentContent) {
        changed.push({ path: f.path, status: "modified", fileObj: f });
      }
    });

    // Detect deleted files
    currentCommitted.forEach((cf) => {
      if (!files.some((f) => f.path === cf.path)) {
        changed.push({ path: cf.path, status: "deleted" });
      }
    });

    return changed;
  };

  const uncommittedChanges = getUncommittedChanges();
  const uncommittedCount = uncommittedChanges.length;

  const detectCheckoutConflicts = (targetBranchName: string) => {
    const targetBranch = gitBranches.find(b => b.name === targetBranchName);
    if (!targetBranch || !currentBranch) return [];

    const currentCommitted = currentBranch.committedFiles || currentBranch.files || [];
    const targetFiles = targetBranch.files || [];

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
              reason: "Newly created file exists with different content in the destination branch."
            });
          }
        } else if (!targetFile) {
          conflicts.push({
            path: f.path,
            reason: "File is modified in your workspace but is deleted or missing in target branch."
          });
        } else if (targetContent !== committedContent) {
          conflicts.push({
            path: f.path,
            reason: "File content in destination branch differs from your uncommitted local changes."
          });
        }
      }
    });

    return conflicts;
  };

  const activePreviewBranchName = commitsPreviewBranch || currentBranch?.name || "main";
  const previewBranch = gitBranches.find((b) => b.name === activePreviewBranchName) || currentBranch;

  const handleSubmitFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    
    let normalizedPath = newFileName.trim();
    if (normalizedPath.startsWith("/")) {
      normalizedPath = normalizedPath.substring(1);
    }
    
    onCreateFile(normalizedPath);
    setNewFileName("");
    setIsAdding(false);
  };

  const handleCreateBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBranchError("");
    const trimmed = newBranchName.trim().replace(/\s+/g, "-").toLowerCase();
    if (!trimmed) return;

    const exists = gitBranches.some((b) => b.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setBranchError("Branch name already exists");
      return;
    }

    createBranch(trimmed);
    setNewBranchName("");
    setIsCreatingBranch(false);
  };

  const getFileIcon = (path: string) => {
    if (path.endsWith(".md")) return <Code className="w-4 h-4 text-emerald-400" id={`icon-md-${path}`} />;
    if (path.endsWith(".json")) return <Code className="w-4 h-4 text-amber-400" id={`icon-jsn-${path}`} />;
    return <Code className="w-4 h-4 text-sky-400" id={`icon-js-${path}`} />;
  };

  const filteredFiles = files.filter((file) =>
    file.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBranches = gitBranches.filter(b => 
    b.name.toLowerCase().includes(branchSearchQuery.toLowerCase())
  );

  const filteredCommits = (previewBranch?.commits || []).filter(c => 
    c.message.toLowerCase().includes(commitSearchQuery.toLowerCase()) ||
    c.hash.toLowerCase().includes(commitSearchQuery.toLowerCase()) ||
    c.author.toLowerCase().includes(commitSearchQuery.toLowerCase())
  );

  // Helper to generate initials for avatar
  const getAuthorInitials = (name: string) => {
    return name.split(/[\s_-]+/).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "U";
  };

  // Helper for hash copies
  const triggerCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedCommitHash(hash);
    setTimeout(() => setCopiedCommitHash(null), 1800);
  };

  // Content providers for conflict previews
  const currentContentOfConflictingFile = (path: string) => {
    const f = files.find(file => file.path === path);
    if (!f) return "(Deleted / Missing File)";
    return f.path === activePath ? editorContent : f.content;
  };

  const targetContentOfConflictingFile = (path: string) => {
    if (!conflictsBranchName) return "(No target branch)";
    const targetBranch = gitBranches.find(b => b.name === conflictsBranchName);
    const f = targetBranch?.files?.find(tf => tf.path === path);
    return f ? f.content : "(File does not exist)";
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-300 font-sans border-r border-zinc-800" id="file-explorer-container">
      
      {/* SECTION 1: WORKSPACE FILES */}
      <div className="flex-1 flex flex-col min-h-0" id="vfs-files-section">
        {/* Search Header */}
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950" id="fe-header">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-zinc-400 fill-zinc-400/20" id="fe-folder-icon" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Workspace Files</span>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="p-1 hover:bg-zinc-900 rounded text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
            title="Add File"
            id="btn-add-file-trigger"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Filter / Search Bar */}
        <div className="px-3 py-2 border-b border-zinc-900 bg-zinc-950/40 relative flex items-center gap-1.5" id="file-search-bar">
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter files or paths..."
              className="w-full bg-zinc-900 placeholder-zinc-500 text-xs text-zinc-200 border border-zinc-850 rounded pl-8 pr-7 py-1 focus:outline-none focus:border-zinc-700 transition font-sans"
              id="fe-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 p-0.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-200 transition"
                id="fe-search-clear"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Add File Minimalist Form */}
        {isAdding && (
          <form onSubmit={handleSubmitFile} className="p-2 border-b border-zinc-900 bg-zinc-900/40 flex items-center gap-1" id="file-add-form">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="src/utils.js..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 font-sans"
              autoFocus
              id="input-new-filename"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-zinc-850 hover:bg-zinc-750 border border-zinc-800 hover:text-white rounded text-[10px] uppercase font-bold text-zinc-350 transition-all cursor-pointer"
              id="btn-confirm-file-add"
            >
              Create
            </button>
          </form>
        )}

        {/* File Tree List Scrollable */}
        <div className="flex-1 overflow-y-auto p-2 space-y-[2px]" id="file-list-region">
          {filteredFiles.length === 0 ? (
            <div className="text-center text-zinc-650 text-xs py-8 px-4" id="empty-files-indicator">
              {files.length === 0 ? (
                <span>No files in workspace.</span>
              ) : (
                <span className="leading-relaxed block">
                  No matching files found for "<strong className="text-zinc-400 break-all">{searchQuery}</strong>".
                </span>
              )}
            </div>
          ) : (
            filteredFiles.map((file) => {
              const isActive = file.path === activePath;
              const isModified = uncommittedChanges.some(c => c.path === file.path);
              const changeStatus = uncommittedChanges.find(c => c.path === file.path)?.status;
              
              return (
                <div
                  key={file.path}
                  className={`group flex items-center justify-between rounded px-2.5 py-1.5 text-xs cursor-pointer transition-colors relative ${
                    isActive
                      ? "bg-zinc-900 text-zinc-100 border-l-2 border-amber-500 font-medium font-sans"
                      : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-250 font-sans"
                  }`}
                  onClick={() => onSelectFile(file.path)}
                  id={`file-row-${file.path.replace(/[^a-zA-Z0-9]/g, "-")}`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    {getFileIcon(file.path)}
                    <span className="truncate" title={file.path}>
                      {file.path}
                    </span>
                    {isModified && (
                      <span className={`text-[8px] px-1 py-[0.5px] rounded scale-90 font-mono font-bold font-sans uppercase flex items-center ${
                        changeStatus === "added" 
                          ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/10" 
                          : "bg-amber-955/20 text-amber-500 border border-amber-500/10"
                      }`}>
                        {changeStatus === "added" ? "U" : "M"}
                      </span>
                    )}
                  </div>
                  
                  {/* Delete button (hidden by default, shown on group hover) */}
                  {files.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFile(file.path);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-rose-400 transition-all cursor-pointer"
                      title="Delete File"
                      id={`btn-del-${file.path.replace(/[^a-zA-Z0-9]/g, "-")}`}
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SECTION 2: DEDICATED GIT VCS PANEL */}
      <div 
        className="border-t border-zinc-800 flex flex-col bg-zinc-950 flex-shrink-0" 
        id="vcs-git-section" 
        style={{ maxHeight: isGitPanelExpanded ? '380px' : '45px', transition: 'max-height 0.2s ease-in-out' }}
      >
        
        {/* Toggleable Section Header */}
        <div 
          className="p-3 bg-zinc-900/40 border-b border-zinc-900 flex items-center justify-between cursor-pointer hover:bg-zinc-900/60 transition-colors"
          onClick={() => setIsGitPanelExpanded(!isGitPanelExpanded)}
          id="git-pane-toggle"
        >
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-amber-500" />
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-350">VCS Branch Central</span>
            <span className="px-1.5 py-[1px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-mono text-[9px] font-bold animate-pulse">
              {currentBranch?.name}
            </span>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsCreatingBranch(!isCreatingBranch)}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-amber-500 transition-colors cursor-pointer"
              title="Spawn New Branch"
              id="btn-git-new-branch"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <span className="text-zinc-600 text-xs select-none">
              {isGitPanelExpanded ? "▼" : "▲"}
            </span>
          </div>
        </div>

        {/* Content body wrapper */}
        {isGitPanelExpanded && (
          <div className="flex-1 flex flex-col overflow-y-auto p-3 space-y-3.5 min-h-[160px]" id="git-pane-content">
            
            {/* Uncommitted Local State Overview */}
            <div className="bg-zinc-900/30 p-2 rounded-lg border border-zinc-900 flex flex-col gap-1.5">
              <div 
                className="flex items-center justify-between cursor-pointer hover:text-zinc-200 transition-colors"
                onClick={() => setShowUncommittedSection(!showUncommittedSection)}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${uncommittedCount > 0 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                  <span className="text-[10.5px] font-bold text-zinc-350 font-sans">
                    {uncommittedCount === 0 ? "Workspace is Clean" : `${uncommittedCount} Workspace Edit(s)`}
                  </span>
                </div>
                {uncommittedCount > 0 && (
                  <div className="flex items-center gap-1 text-[9px] text-zinc-550">
                    <span>{showUncommittedSection ? "Hide modifications" : "View files"}</span>
                    {showUncommittedSection ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </div>
                )}
              </div>

              {uncommittedCount > 0 && showUncommittedSection && (
                <div className="mt-1 space-y-1 pl-3 border-l border-amber-900/50">
                  {uncommittedChanges.map((change, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[10px] font-mono py-0.5 text-zinc-400">
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        <FileText className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                        <span className="truncate">{change.path}</span>
                      </div>
                      <span className={`text-[8px] font-bold px-1 rounded ${
                        change.status === "added" ? "bg-emerald-950/40 text-emerald-400" :
                        change.status === "deleted" ? "bg-rose-950/45 text-rose-400" : "bg-amber-955/20 text-amber-500"
                      } uppercase`}>
                        {change.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create Branch inline form */}
            {isCreatingBranch && (
              <form onSubmit={handleCreateBranchSubmit} className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-850 flex flex-col gap-2" id="git-create-branch-form">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Create Branch from {currentBranch?.name}</span>
                  <button 
                    type="button" 
                    onClick={() => { setIsCreatingBranch(false); setBranchError(""); }}
                    className="p-0.5 text-zinc-500 hover:text-zinc-350 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => { setNewBranchName(e.target.value); setBranchError(""); }}
                    placeholder="feature/jwt-auth..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-amber-500 font-mono"
                    autoFocus
                    id="input-new-branchname"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-450 text-black font-semibold text-[10px] uppercase rounded transition-colors cursor-pointer"
                    id="btn-confirm-branch-create"
                  >
                    Fork
                  </button>
                </div>
                {branchError && (
                  <p className="text-[9px] text-rose-450 font-sans" id="branch-error-msg">{branchError}</p>
                )}
              </form>
            )}

            {/* Branches Quick Switcher list */}
            <div className="space-y-2" id="branches-list-section">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] uppercase font-bold text-zinc-500 tracking-wider block">Local & Remote Branches:</span>
                </div>
                
                {/* Embedded Branch Search */}
                <div className="relative flex items-center">
                  <Search className="absolute left-2 w-3 h-3 text-zinc-600" />
                  <input
                    type="text"
                    placeholder="Search branches..."
                    value={branchSearchQuery}
                    onChange={(e) => setBranchSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-zinc-900 rounded px-2 py-0.5 pl-6 text-[10px] text-zinc-350 placeholder-zinc-650 focus:outline-none focus:border-zinc-800"
                  />
                  {branchSearchQuery && (
                    <button onClick={() => setBranchSearchQuery("")} className="absolute right-1.5 hover:text-white">
                      <X className="w-2.5 h-2.5 text-zinc-500" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1 bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-900 max-h-[125px] overflow-y-auto" id="branches-list-container">
                {filteredBranches.map((branch) => {
                  const isCur = branch.name === currentBranch?.name;
                  const isPreviewed = branch.name === activePreviewBranchName;
                  
                  // Proactively compute if switching would prompt conflict warnings
                  const conflictsCount = isCur ? 0 : detectCheckoutConflicts(branch.name).length;
                  const hasConflictRisk = conflictsCount > 0;

                  return (
                    <div
                      key={branch.name}
                      className={`group flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] font-mono transition-all ${
                        isCur
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : isPreviewed
                          ? "bg-zinc-900 text-zinc-200 border border-zinc-800"
                          : "text-zinc-450 hover:bg-zinc-900/60 hover:text-zinc-300 border border-transparent"
                      }`}
                      id={`branch-row-${branch.name.replace(/[^a-zA-Z0-9]/g, "_")}`}
                    >
                      <button
                        onClick={async () => {
                          if (!isCur) {
                            const conflicts = detectCheckoutConflicts(branch.name);
                            if (conflicts.length > 0) {
                              setConflictsBranchName(branch.name);
                              setConflictingFiles(conflicts);
                              // Auto-select first conflicting file
                              if (conflicts[0]) {
                                setSelectedConflictPath(conflicts[0].path);
                              }
                            } else {
                              await switchBranch(branch.name);
                              setCommitsPreviewBranch(branch.name);
                            }
                          }
                        }}
                        className="flex items-center gap-1.5 flex-1 text-left truncate cursor-pointer"
                        title={isCur ? "Currently checked out" : "Switch to this branch"}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isCur ? "bg-emerald-400" : "bg-zinc-700 font-normal"}`} />
                        <span className="truncate">{branch.name}</span>
                        {isCur && (
                          <span className="text-[7.5px] font-bold text-emerald-400 bg-emerald-950/40 px-1 py-[0.5px] border border-emerald-500/10 rounded ml-1 uppercase">
                            ACTIVE
                          </span>
                        )}
                        {hasConflictRisk && (
                          <span className="text-[7.5px] font-semibold text-rose-400 bg-rose-950/15 border border-rose-500/10 px-1 rounded flex items-center gap-0.5 ml-1">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-500" /> Conflict Risk
                          </span>
                        )}
                      </button>

                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setCommitsPreviewBranch(branch.name)}
                          className={`p-1 rounded transition-colors cursor-pointer flex items-center justify-center ${
                            isPreviewed
                              ? "bg-amber-500/25 text-amber-400"
                              : "hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                          }`}
                          title={`Inspect history for ${branch.name}`}
                          id={`btn-preview-commits-${branch.name.replace(/[^a-zA-Z0-9]/g, "_")}`}
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredBranches.length === 0 && (
                  <div className="text-[10px] text-zinc-600 italic py-2 text-center">No branches match the search filter.</div>
                )}
              </div>
            </div>

            {/* Commit History Timeline list */}
            <div className="space-y-2 border-t border-zinc-900/60 pt-3" id="git-commit-timeline-section">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1">
                    <History className="w-3.5 h-3.5 text-zinc-400" /> Commits: <span className="text-amber-400 font-mono tracking-tight text-[10px] bg-amber-550/10 px-1.5 py-[1px] rounded border border-amber-500/20">{activePreviewBranchName}</span>
                  </span>
                  <span className="text-[8.5px] font-mono text-zinc-500">
                    {previewBranch?.commits?.length || 0} Total
                  </span>
                </div>

                {/* Commit Filter Input */}
                <div className="relative flex items-center">
                  <Search className="absolute left-2 w-3 h-3 text-zinc-600" />
                  <input
                    type="text"
                    placeholder="Filter commits by hashing or keyword..."
                    value={commitSearchQuery}
                    onChange={(e) => setCommitSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-zinc-900 rounded px-2 py-0.5 pl-6 text-[10px] text-zinc-350 placeholder-zinc-650 focus:outline-none focus:border-zinc-800"
                  />
                  {commitSearchQuery && (
                    <button onClick={() => setCommitSearchQuery("")} className="absolute right-1.5 hover:text-white">
                      <X className="w-2.5 h-2.5 text-zinc-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* Enhanced timeline view */}
              <div className="relative border-l border-zinc-850 ml-3 pl-3.5 space-y-3.5 max-h-[140px] overflow-y-auto pr-1" id="commit-timeline-scroll">
                {filteredCommits.map((commit, index) => {
                  const isExpanded = expandedCommit === commit.hash;
                  const authorInitials = getAuthorInitials(commit.author);
                  const isLatest = index === 0 && !commitSearchQuery;

                  return (
                    <div 
                      key={`${commit.hash}-${index}`} 
                      className="relative text-left group cursor-pointer" 
                      id={`commit-row-${commit.hash}`}
                      onClick={() => setExpandedCommit(isExpanded ? null : commit.hash)}
                    >
                      {/* Timeline Dot */}
                      <span className="absolute -left-[21.5px] top-1.5 flex h-3.5 w-3.5 items-center justify-center bg-zinc-950 rounded-full border border-zinc-800">
                        <span className={`h-1.5 w-1.5 rounded-full ${isLatest ? "bg-amber-400 ring-2 ring-amber-500/25 animate-pulse" : "bg-zinc-600 group-hover:bg-amber-500"}`}></span>
                      </span>

                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-start justify-between gap-1.5">
                          <p className={`text-[11px] leading-relaxed break-words font-sans flex-1 ${isLatest ? "text-zinc-150 font-medium font-sans" : "text-zinc-400 font-sans"}`}>
                            {commit.message}
                          </p>
                          <ChevronRight className={`w-3.5 h-3.5 text-zinc-650 shrink-0 transform transition-transform mt-0.5 ${isExpanded ? "rotate-90 text-amber-500" : ""}`} />
                        </div>
                        
                        <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-600">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerCopyHash(commit.hash);
                            }}
                            className="text-amber-500/80 font-bold bg-[#13151A] hover:bg-amber-950/20 hover:text-amber-400 px-1 py-[0.5px] rounded border border-zinc-900 uppercase transition-all"
                            title="Copy commit hash"
                          >
                            {copiedCommitHash === commit.hash ? "Copied" : commit.hash}
                          </button>
                          <span className="truncate max-w-[85px]" title={commit.author}>{commit.author}</span>
                          <span>•</span>
                          <div className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{commit.date}</span>
                          </div>
                        </div>

                        {/* Expandable files list meta panel */}
                        {isExpanded && (
                          <div className="mt-2 p-2 bg-[#101216] border border-zinc-900 rounded text-[9.5px] text-zinc-450 space-y-1.5 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5 bg-zinc-950/50 p-1 rounded">
                              <div className="w-4 h-4 rounded-full bg-zinc-800 text-[8px] flex items-center justify-center font-bold text-zinc-400 font-mono">
                                {authorInitials}
                              </div>
                              <span className="font-semibold text-zinc-350">{commit.author}</span>
                              <span className="text-[8px] text-zinc-600 font-mono ml-auto">{commit.date}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[8px] uppercase tracking-wider text-zinc-600 font-bold block">Assigned Buffers on Snapshot:</span>
                              <div className="grid grid-cols-1 gap-0.5 font-mono max-h-[70px] overflow-y-auto">
                                {(previewBranch?.files || []).map((vFile, idx) => (
                                  <div key={idx} className="flex items-center gap-1 px-1 py-0.5 hover:bg-zinc-900 rounded">
                                    <Code className="w-3 h-3 text-zinc-600" />
                                    <span className="truncate text-zinc-400">{vFile.path}</span>
                                    <span className="text-[8px] text-[#555] ml-auto">JS</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredCommits.length === 0 && (
                  <div className="text-zinc-650 text-[10px] italic py-3 text-center pl-1">No commits match search filter.</div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Footer statistics */}
      <div className="p-3 bg-zinc-950/60 border-t border-zinc-900 text-[10px] text-zinc-600 font-mono flex items-center justify-between" id="fe-footer">
        <span>Files: {filteredFiles.length} of {files.length}</span>
        <span>VCS: ACTIVE</span>
      </div>

      {/* Conflicts Warning Modal */}
      {conflictsBranchName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in" id="git-conflict-modal">
          <div className="bg-[#111317] border border-zinc-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" id="git-conflict-card">
            
            {/* Header */}
            <div className="p-4 bg-[#161a20] border-b border-zinc-800 flex items-center justify-between" id="git-conflict-header">
              <div className="flex items-center gap-2.5 text-rose-400 font-bold text-xs font-mono uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                Checkout Conflict Safeguard Block
              </div>
              <button
                onClick={() => {
                  setConflictsBranchName(null);
                  setConflictingFiles([]);
                  setSelectedConflictPath(null);
                }}
                className="text-zinc-500 hover:text-zinc-350 bg-zinc-950/40 hover:bg-zinc-900/65 p-1 rounded-md transition-all cursor-pointer"
                id="btn-close-conflict-modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Split Panel Body */}
            <div className="flex flex-1 min-h-0 divide-x divide-zinc-850" id="git-conflict-body">
              
              {/* Left Column - List of files & explanation */}
              <div className="w-1/3 p-4 flex flex-col gap-4 overflow-y-auto bg-[#131519]">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-zinc-200">Uncommitted Changes Conflict</h3>
                  <p className="text-[11.5px] text-zinc-400 leading-relaxed font-sans">
                    You have active edits in your workspace that would be overwritten or lost if you check out <strong className="text-amber-400 font-mono">"{conflictsBranchName}"</strong>.
                  </p>
                </div>

                <div className="space-y-2" id="git-conflict-list-section">
                  <span className="text-[9.5px] uppercase font-bold text-zinc-500 tracking-wider block">Select file to inspect diff:</span>
                  <div className="bg-zinc-950/80 border border-zinc-900 rounded-xl p-2.5 space-y-1.5 max-h-[220px] overflow-y-auto pr-1" id="git-conflicting-files-scroll">
                    {conflictingFiles.map((item, idx) => {
                      const isSelected = selectedConflictPath === item.path;
                      return (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedConflictPath(item.path)}
                          className={`flex flex-col gap-1 p-2 rounded-lg cursor-pointer transition-all border ${
                            isSelected 
                              ? "bg-rose-950/20 border-rose-900/40" 
                              : "hover:bg-zinc-900/50 border-transparent text-zinc-400 hover:text-zinc-200"
                          }`}
                          id={`conflicting-item-${idx}`}
                        >
                          <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
                            <Code className={`w-3.5 h-3.5 ${isSelected ? "text-rose-400" : "text-zinc-500"}`} />
                            <span className="truncate">{item.path}</span>
                          </div>
                          <span className="text-[9px] text-zinc-500 italic pl-5 leading-normal">{item.reason}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-rose-950/10 border border-rose-900/35 rounded-xl p-3 text-[10px] text-rose-300 leading-relaxed flex gap-2" id="git-conflict-disclaimer">
                  <span className="text-sm font-bold text-rose-500">⚠</span>
                  <span>
                    <strong>What should you do?</strong> Commit your code before switching, or perform one of the safe switch actions in the footer (discard your updates, or carry them over).
                  </span>
                </div>
              </div>

              {/* Right Column - Conflict Peeker Diff Viewer */}
              <div className="flex-1 flex flex-col overflow-hidden bg-[#111317]">
                <div className="p-3 bg-[#15171b] border-b border-zinc-850 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-450 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                    Interactive Line Diff Viewer: <strong className="text-rose-400 text-[10px] lowercase font-semibold">{selectedConflictPath || "no selection"}</strong>
                  </span>
                </div>

                <div className="flex-1 overflow-auto p-4 flex flex-col justify-between">
                  {selectedConflictPath ? (
                    <div className="space-y-4">
                      {/* Unified Split Diff Viewer */}
                      <div className="grid grid-cols-2 gap-2 text-[9.5px] font-mono select-none border border-zinc-850 rounded-xl bg-zinc-950/90 overflow-hidden max-h-[380px] overflow-y-auto">
                        
                        {/* Current (Workspace) version */}
                        <div className="p-3.5 border-r border-zinc-900 flex flex-col min-w-0">
                          <div className="text-[8.5px] uppercase font-bold text-zinc-500 tracking-wider mb-2.5 pb-2 border-b border-zinc-900 flex justify-between items-center bg-[#131519]/40 p-1.5 rounded">
                            <span className="text-zinc-400">Current Workspace (Dirty)</span>
                            <span className="text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-500/10">
                              {currentContentOfConflictingFile(selectedConflictPath).split("\n").filter(Boolean).length} lines
                            </span>
                          </div>
                          <div className="space-y-[3px] overflow-x-auto whitespace-pre pr-1">
                            {currentContentOfConflictingFile(selectedConflictPath).split("\n").map((line, i) => (
                              <div key={i} className="flex gap-2.5 hover:bg-zinc-900/60 px-1 py-[1.5px] rounded border border-transparent">
                                <span className="text-zinc-700 text-[8.5px] w-5 text-right inline-block select-none">{i + 1}</span>
                                <span className="text-zinc-300">{line || " "}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Destination (Target) version */}
                        <div className="p-3.5 flex flex-col min-w-0">
                          <div className="text-[8.5px] uppercase font-bold text-zinc-500 tracking-wider mb-2.5 pb-2 border-b border-zinc-900 flex justify-between items-center bg-[#131519]/40 p-1.5 rounded">
                            <span className="text-zinc-400">Target "{conflictsBranchName}"</span>
                            <span className="text-amber-400 bg-amber-955/35 px-1.5 py-0.5 rounded border border-amber-500/10">
                              {targetContentOfConflictingFile(selectedConflictPath).split("\n").filter(Boolean).length} lines
                            </span>
                          </div>
                          <div className="space-y-[3px] overflow-x-auto whitespace-pre pr-1">
                            {targetContentOfConflictingFile(selectedConflictPath).split("\n").map((line, i) => (
                              <div key={i} className="flex gap-2.5 hover:bg-zinc-900/60 px-1 py-[1.5px] rounded border border-transparent">
                                <span className="text-zinc-700 text-[8.5px] w-5 text-right inline-block select-none">{i + 1}</span>
                                <span className="text-zinc-350">{line || " "}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-650 max-h-[300px]" id="no-conflict-selected">
                      <Code className="w-8 h-8 text-zinc-800 mb-2 animate-bounce" />
                      <span className="text-xs font-sans">Select a conflicting file from the list on the left to inspect inline context changes side-by-side.</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer / Actions */}
            <div className="p-4 bg-[#14181d] border-t border-zinc-800 flex flex-wrap gap-3 justify-end items-center" id="git-conflict-actions">
              <span className="text-[10px] text-zinc-500 font-sans mr-auto max-w-sm hidden sm:block">
                Choose <strong className="text-amber-400">Carry Over</strong> to attempt keeping modifications, or <strong className="text-rose-400">Discard</strong> to load the branch pristine.
              </span>

              <button
                type="button"
                onClick={() => {
                  setConflictsBranchName(null);
                  setConflictingFiles([]);
                  setSelectedConflictPath(null);
                }}
                className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-450 hover:text-zinc-200 rounded-lg font-bold text-[10.5px] uppercase tracking-wide transition-all cursor-pointer border border-zinc-800"
                id="btn-cancel-conflict"
              >
                Abort Switch
              </button>

              <button
                type="button"
                onClick={async () => {
                  const bName = conflictsBranchName;
                  if (bName) {
                    setConflictsBranchName(null);
                    setConflictingFiles([]);
                    setSelectedConflictPath(null);
                    await switchBranch(bName, true);
                    setCommitsPreviewBranch(bName);
                  }
                }}
                className="px-4 py-2.5 bg-rose-900/40 hover:bg-rose-900/65 text-rose-200 hover:text-white rounded-lg border border-rose-500/20 font-bold text-[10.5px] uppercase tracking-wide transition-all cursor-pointer shadow-lg shadow-rose-950/10"
                id="btn-force-switch-discard"
                title="Discard uncommitted changes and checkout target branch"
              >
                Discard & Overwrite
              </button>

              <button
                type="button"
                onClick={async () => {
                  const bName = conflictsBranchName;
                  if (bName) {
                    setConflictsBranchName(null);
                    setConflictingFiles([]);
                    setSelectedConflictPath(null);
                    await switchBranch(bName, false);
                    setCommitsPreviewBranch(bName);
                  }
                }}
                className="px-4 py-2.5 bg-[#d97706] hover:bg-[#b45309] text-black rounded-lg font-extrabold text-[10.5px] uppercase tracking-wide transition-all cursor-pointer shadow-lg shadow-amber-950/20"
                id="btn-force-switch-stash"
                title="Carry over active workspace changes onto the target branch"
              >
                Carry Over Changes
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
