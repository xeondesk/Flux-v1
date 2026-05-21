import React, { ErrorInfo, ReactNode } from "react";
import { ShieldAlert, RotateCcw, AlertTriangle, Cpu } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    console.error("ErrorBoundary caught an active runtime exception:", error, errorInfo);
  }

  private handleReset = () => {
    // Hard reset of the workspace by clearing any transient local storage and reloading the web page
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error("Failed to clear browser storage buffers:", e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          className="w-full min-h-screen bg-[#0F1115] text-[#E1E4E8] font-sans flex flex-col items-center justify-center p-6 select-none bg-radial from-[#12151B] to-[#0A0B0E]" 
          id="error-boundary-canvas"
        >
          <div 
            className="w-full max-w-2xl bg-[#16191E] border border-rose-500/30 rounded-xl shadow-2xl shadow-rose-950/10 overflow-hidden flex flex-col"
            id="error-boundary-box"
          >
            {/* Header */}
            <div className="p-5 border-b border-[#2A2D35] bg-[#1e1518]/30 flex items-center gap-3" id="error-boundary-header">
              <div className="w-10 h-10 bg-rose-500/10 text-rose-400 rounded-lg flex items-center justify-center border border-rose-500/20" id="error-boundary-alert-icon">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-sm font-bold uppercase tracking-wider text-rose-450">FLUX Run Halt Detected</h1>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">ERROR_ORCHESTRATION_SHOUTDOWN</span>
              </div>
            </div>

            {/* Information Body */}
            <div className="p-6 flex flex-col gap-5" id="error-boundary-body">
              <div className="space-y-2">
                <h2 className="text-base font-semibold text-zinc-150">Something went wrong inside the IDE workspace</h2>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  The FLUX Core Engine caught an unexpected runtime error that interrupted active agent workflows. You can diagnostic log details below or execute a workspace state recovery reset.
                </p>
              </div>

              {/* Collapsible Error Panel details */}
              <div className="bg-[#0F1115] border border-[#2A2D35] rounded-lg p-4 font-mono text-[11px]" id="error-boundary-details-panel">
                <div className="flex items-center gap-2 text-rose-400 font-bold mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{this.state.error ? this.state.error.name : "Runtime Exception"}</span>
                </div>
                
                <p className="text-zinc-300 leading-relaxed break-words whitespace-pre-wrap bg-zinc-950/60 p-2.5 rounded border border-zinc-900/50">
                  {this.state.error ? this.state.error.message : "An unhandled event crashed the layout render loop."}
                </p>

                {this.state.errorInfo && (
                  <details className="mt-3 text-[10px] text-zinc-500" id="error-boundary-details-dropdown">
                    <summary className="cursor-pointer hover:text-zinc-300 transition-colors uppercase font-bold tracking-wider select-none outline-none">
                      Inspect Stack Trace Buffer
                    </summary>
                    <div className="mt-2 text-[9.5px] leading-relaxed text-zinc-500 overflow-x-auto max-h-48 p-2 bg-zinc-950/20 rounded border border-zinc-900 whitespace-pre">
                      {this.state.errorInfo.componentStack}
                    </div>
                  </details>
                )}
              </div>

              {/* Troubleshooting Tips */}
              <div className="flex items-start gap-2 text-[10.5px] text-zinc-500 leading-relaxed bg-[#1e2228]/20 p-3 rounded-lg border border-[#2A2D35]/40" id="error-boundary-tip">
                <Cpu className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Tip:</strong> Reverting buffers resets memory caches, file snapshots, and todo planning templates to their clean state values immediately.
                </span>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-[#2A2D35] bg-[#121418] flex items-center justify-between" id="error-boundary-footer">
              <span className="text-[10px] font-mono text-zinc-500">Node Status: FAIL_SAFE</span>
              
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer"
                id="btn-error-reset-workspace"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Workspace Buffers
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
