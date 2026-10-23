import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ConnectionStatus } from "./ConnectionStatus";
import { TopBar } from "./TopBar";
import { MobileNavSheet } from "./MobileNavSheet";
import { Breadcrumbs } from "./Breadcrumbs";
import { ContextSwitcher } from "./ContextSwitcher";
import { WorkspaceCustomizerModal } from "./WorkspaceCustomizerModal";
import { BarcodeScanModal } from "./BarcodeScanModal";
import { CommandPalette } from "../command/CommandPalette";
import { ShortcutHelpModal } from "../command/ShortcutHelpModal";
import { IntelligencePanel } from "../intelligence/IntelligencePanel";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useShortcutStore } from "../../stores/shortcutStore";

export const AppShell: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [contextSwitcherOpen, setContextSwitcherOpen] = useState(false);
  const location = useLocation();
  const isPosPage = location.pathname === "/pos";

  // Initialize Global Keyboard Shortcuts listener
  useKeyboardShortcuts();

  const fetchProfiles = useShortcutStore((state) => state.fetchProfiles);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return (
    <div className="h-full w-full flex flex-col min-h-0 antialiased text-primary selection:bg-primary selection:text-white transition-colors duration-150 overflow-hidden">
      {/* Top Network Offline Banner */}
      <ConnectionStatus />

      {/* Main Top Header with Customizable Workspace Navigation & Quick Tools */}
      <TopBar
        onToggleSidebar={() => setMobileNavOpen((prev) => !prev)}
        onOpenContextSwitcher={() => setContextSwitcherOpen(true)}
      />

      {/* Main Body Container: Full Width Workspace Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Mobile Navigation Sheet (Small viewports only) */}
        <MobileNavSheet isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

        {/* Content Workspace Area - Full Usable Horizontal Workspace */}
        {isPosPage ? (
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden bg-app flex flex-col">
            <Outlet />
          </div>
        ) : (
          <div className="flex-1 min-w-0 overflow-y-auto bg-app flex flex-col">
            <main className="flex-1 w-full min-w-0 px-4 py-3 sm:px-6 sm:py-4">
              <Breadcrumbs />
              <Outlet />
            </main>
          </div>
        )}

        {/* Inventra Intelligence Canonical Docked Right Side Panel */}
        <IntelligencePanel />
      </div>

      {/* Workspace Customizer Modal Dialog */}
      <WorkspaceCustomizerModal />

      {/* Pharmacy Barcode Scanner Quick Tool Modal */}
      <BarcodeScanModal />

      {/* Store Location Context Switcher Modal */}
      <ContextSwitcher
        open={contextSwitcherOpen}
        onOpenChange={setContextSwitcherOpen}
      />

      {/* Global Command Palette Overlay (Ctrl+K or /) */}
      <CommandPalette />

      {/* Global Shortcut Help Sheet Overlay (?) */}
      <ShortcutHelpModal />
    </div>
  );
};
