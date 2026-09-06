import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, Store, Shield, WifiOff, Search, HelpCircle } from "lucide-react";
import { useAuthStore, safeLocalStorage, LOCAL_STORAGE_DEBUG_OFFLINE } from "../../stores/authStore";
import { useShortcutStore } from "../../stores/shortcutStore";
import { ShortcutHint } from "@inventra/ui";
import { UserMenu } from "./UserMenu";
import { BrandLogo } from "../common/BrandLogo";


export interface TopBarProps {
  onToggleSidebar: () => void;
  onOpenContextSwitcher: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar, onOpenContextSwitcher }) => {
  const { activeContext, isOnline } = useAuthStore();
  const [isDebugOffline, setIsDebugOffline] = useState(() =>
    safeLocalStorage.getItem(LOCAL_STORAGE_DEBUG_OFFLINE) === "true"
  );

  useEffect(() => {
    const handleDebugChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      setIsDebugOffline(customEvent.detail.enabled);
    };

    window.addEventListener("inventra_offline_debug_change", handleDebugChange);
    return () => {
      window.removeEventListener("inventra_offline_debug_change", handleDebugChange);
    };
  }, []);

  const isPlatformAdmin = activeContext?.role === "PLATFORM_ADMIN";

  return (
    <header className="sticky top-0 z-30 bg-surface text-primary border-b border-subtle h-14 px-3 sm:px-6 flex items-center justify-between shadow-xs transition-colors duration-150 shrink-0">
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

        <BrandLogo size="sm" showText badgeText="ERP" />

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
        {/* Operations & User Guide */}
        <Link
          to="/guide"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-subtle bg-surface-muted hover:bg-surface-elevated text-secondary hover:text-primary transition-all text-xs focus:outline-none focus:ring-2 focus:ring-focus"
          title="Open Pharmacy Operations & Site Guide"
        >
          <HelpCircle className="h-3.5 w-3.5 text-accent shrink-0" />
          <span className="hidden sm:inline font-medium">Guide</span>
        </Link>

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

        {/* Network Connectivity / Station Isolation Status */}
        {isDebugOffline ? (
          <Link
            to="/settings?tab=offline"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all shadow-xs"
            title="Station Isolated: Offline Storage Simulation Active. Click to configure."
          >
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-bold">OFFLINE DEBUG (ISOLATED)</span>
          </Link>
        ) : (
          <Link
            to="/settings?tab=offline"
            className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono bg-surface-muted hover:bg-surface-elevated border border-subtle transition-colors"
            title="Workstation Storage & Connectivity. Click to inspect."
          >
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
          </Link>
        )}

        {/* User Account Menu */}
        <UserMenu onOpenContextSwitcher={onOpenContextSwitcher} />
      </div>
    </header>
  );
};
