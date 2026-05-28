import React from "react";
import { Minus, Square, X } from "lucide-react";

export default function TopBar() {
  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();
  const isElectron = typeof window !== "undefined" && !!window.electronAPI;

  return (
    <div className="h-9 bg-hermes-surface/80 backdrop-blur-md border-b border-hermes-border/30 flex items-center justify-between px-3 select-none" style={{ WebkitAppRegion: "drag" } as any}>
      <div className="flex items-center gap-2">
        <span className="text-sm">🦆</span>
        <span className="text-xs font-medium text-hermes-muted tracking-wider">Duck Desktop</span>
      </div>

      <div className="flex-1 text-center" style={{ WebkitAppRegion: "no-drag" } as any}>
        <span className="text-[10px] text-hermes-muted/50">智能助手控制中心</span>
      </div>

      {isElectron && (
        <div className="flex items-center gap-0.5" style={{ WebkitAppRegion: "no-drag" } as any}>
          <button onClick={handleMinimize} className="p-1.5 rounded hover:bg-white/5 transition-colors">
            <Minus size={14} className="text-hermes-muted" />
          </button>
          <button onClick={handleMaximize} className="p-1.5 rounded hover:bg-white/5 transition-colors">
            <Square size={12} className="text-hermes-muted" />
          </button>
          <button onClick={handleClose} className="p-1.5 rounded hover:bg-red-500/30 transition-colors">
            <X size={14} className="text-hermes-muted hover:text-red-400" />
          </button>
        </div>
      )}
    </div>
  );
}
