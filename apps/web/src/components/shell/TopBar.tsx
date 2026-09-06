import React from "react";
import { Menu, Store, Shield, WifiOff, Search } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useShortcutStore } from "../../stores/shortcutStore";
import { ShortcutHint } from "@inventra/ui";
import { UserMenu } from "./UserMenu";


export interface TopBarProps {
  onToggleSidebar: () => void;
  onOpenContextSwitcher: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar, onOpenContextSwitcher }) => {
  const { activeContext, isOnline } = useAuthStore();

  const isPlatformAdmin = activeContext?.role === "PLATFORM_ADMIN";

  return (
    <header className="sticky top-0 z-30 bg-surface text-primary border-b border-subtle h-14 px-3 sm:px-6 flex items-center justify-between shadow-xs transition-colors duration-150">
      {/* Left Area: Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-md text-secondary hover:text-primary hover:bg-surface-muted transition-colors focus:outline-none focus:ring-2 focus:ring-focus"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center font-mono font-bold text-xs text-primary-fg shadow-xs">
            IN
          </div>
          <span className="font-bold text-sm tracking-tight text-primary hidden sm:inline">
            INVENTRA
          </span>
          <span className="text-[10px] uppercase font-bold text-primary bg-primary-subtle px-1.5 py-0.5 rounded border border-primary-border font-mono">
            ERP
          </span>
        </div>

        {/* Active Store / Business Context Selector Badge */}
        {!isPlatformAdmin ? (
          <div className="hidden md:flex items-center gap-2 pl-3 ml-2 border-l border-subtle">
            <button
              type="button"
              onClick={onOpenContextSwitcher}
              className="flex items-center gap-2 text-xs text-secondary bg-surface-muted hover:bg-surface px-2.5 py-1 rounded-md border border-strong transition-all text-left focus:outline-none focus:ring-2 focus:ring-focus"
              title="Click to switch store location"
            >
              <Store className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-semibold text-primary truncate max-w-[150px]">
                {activeContext?.storeName || "Select Store"}
              </span>
              <span className="text-[10px] text-muted font-mono">
                ({activeContext?.storeCode || "HQ"})
              </span>
              <span className="text-muted">•</span>
              <span className="text-secondary text-[11px] truncate max-w-[120px]">
                {activeContext?.businessName}
              </span>
            </button>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 pl-3 ml-2 border-l border-subtle">
            <div className="flex items-center gap-1.5 text-xs text-primary bg-primary-subtle px-2.5 py-1 rounded-md border border-primary-border">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold">Platform Admin Console</span>
              <span className="text-[10px] font-mono text-primary">(GLOBAL)</span>
            </div>
          </div>
        )}
      </div>

      {/* Center/Right Area: Command Palette Affordance, Status, User Menu */}
      <div className="flex items-center gap-3">
        {/* Quick Command Palette Button */}
        <button
          type="button"
          onClick={() => useShortcutStore.getState().setCommandPaletteOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md border border-subtle bg-surface-muted hover:bg-surface-elevated text-secondary hover:text-primary transition-all text-xs focus:outline-none focus:ring-2 focus:ring-focus"
          aria-label="Open Command Palette (Ctrl+K)"
        >
          <Search className="h-3.5 w-3.5 text-muted shrink-0" />
          <span className="hidden md:inline text-xs text-muted">Search or commands...</span>
          <ShortcutHint shortcut="Ctrl+K" compact />
        </button>

        {/* Network Connectivity Status Indicator (UX Only) */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono bg-surface-muted border border-subtle">

          {isOnline ? (
            <>
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-success font-medium">ONLINE</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-danger" />
              <span className="text-danger font-bold">OFFLINE</span>
            </>
          )}
        </div>

        {/* User Account Menu */}
        <UserMenu onOpenContextSwitcher={onOpenContextSwitcher} />
      </div>
    </header>
  );
};
