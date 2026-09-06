import React, { useEffect, useState } from "react";
import { Minus, Square, Copy, X, Store, Terminal } from "lucide-react";
import { useRuntimeAdapter } from "../../runtime/RuntimeContext";
import { useAuthStore } from "../../stores/authStore";
import { BrandLogo } from "../common/BrandLogo";

export interface DesktopTitlebarProps {
  storeName?: string;
  terminalName?: string;
}

export const DesktopTitlebar: React.FC<DesktopTitlebarProps> = ({
  storeName: propStoreName,
  terminalName: propTerminalName,
}) => {
  const runtime = useRuntimeAdapter();
  const { activeContext } = useAuthStore();
  const [isMaximized, setIsMaximized] = useState(false);

  const displayStoreName =
    propStoreName || activeContext?.storeName || activeContext?.businessName || "Inventra Workspace";
  const displayTerminalName =
    propTerminalName || runtime.deviceIdentity?.getDeviceName() || "Counter 1";

  useEffect(() => {
    let mounted = true;
    if (runtime.window.isMaximized) {
      runtime.window.isMaximized().then((max) => {
        if (mounted) setIsMaximized(max);
      }).catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [runtime.window]);

  const handleMinimize = async () => {
    try {
      await runtime.window.minimize?.();
    } catch {
      // Fallback
    }
  };

  const handleToggleMaximize = async () => {
    try {
      await runtime.window.maximize?.();
      if (runtime.window.isMaximized) {
        const max = await runtime.window.isMaximized();
        setIsMaximized(max);
      } else {
        setIsMaximized(!isMaximized);
      }
    } catch {
      // Fallback
    }
  };

  const handleClose = async () => {
    try {
      await runtime.window.close?.();
    } catch {
      // Fallback
    }
  };

  return (
    <header
      data-tauri-drag-region
      className="h-10 bg-surface border-b border-subtle flex items-center justify-between px-3 select-none z-50 text-xs text-primary shrink-0 transition-colors duration-150"
    >
      {/* Left: Brand & Terminal Identifier */}
      <div className="flex items-center gap-3" data-tauri-drag-region>
        <BrandLogo size="xs" showText badgeText="DESKTOP" />

        <div className="h-3.5 w-px bg-subtle mx-1" />

        <div className="flex items-center gap-1.5 text-secondary font-medium truncate max-w-[200px]">
          <Store className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate">{displayStoreName}</span>
        </div>

        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-muted text-primary font-mono text-[10px] border border-subtle">
          <Terminal className="w-3 h-3 text-primary" />
          <span>{displayTerminalName}</span>
        </div>
      </div>

      {/* Center: Draggable Spacer Area */}
      <div className="flex-1 h-full cursor-move" data-tauri-drag-region />

      {/* Right: Native Window Action Controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleMinimize}
          className="w-9 h-7 flex items-center justify-center rounded text-secondary hover:text-primary hover:bg-surface-muted transition-colors focus:outline-none"
          title="Minimize Window"
          aria-label="Minimize Window"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleToggleMaximize}
          className="w-9 h-7 flex items-center justify-center rounded text-secondary hover:text-primary hover:bg-surface-muted transition-colors focus:outline-none"
          title={isMaximized ? "Restore Window" : "Maximize Window"}
          aria-label={isMaximized ? "Restore Window" : "Maximize Window"}
        >
          {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>

        <button
          type="button"
          onClick={handleClose}
          className="w-9 h-7 flex items-center justify-center rounded text-secondary hover:text-white hover:bg-danger transition-colors focus:outline-none"
          title="Close Application"
          aria-label="Close Application"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
