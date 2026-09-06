import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ConnectionStatus } from "./ConnectionStatus";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { Breadcrumbs } from "./Breadcrumbs";
import { ContextSwitcher } from "./ContextSwitcher";
import { CommandPalette } from "../command/CommandPalette";
import { ShortcutHelpModal } from "../command/ShortcutHelpModal";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useShortcutStore } from "../../stores/shortcutStore";

export const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contextSwitcherOpen, setContextSwitcherOpen] = useState(false);
  const location = useLocation();
  const isPosPage = location.pathname === "/pos";

  // Initialize Global Keyboard Shortening listener
  useKeyboardShortcuts();

  const fetchProfiles = useShortcutStore((state) => state.fetchProfiles);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return (
    <div className="h-full w-full flex flex-col min-h-0 antialiased text-primary selection:bg-primary selection:text-white transition-colors duration-150 overflow-hidden">
      {/* Top Network Offline Banner */}
      <ConnectionStatus />

      {/* Main Top Header */}
      <TopBar
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onOpenContextSwitcher={() => setContextSwitcherOpen(true)}
      />

      {/* Main Body Container: Sidebar + Outlet */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Persistent Desktop / Collapsible Mobile Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Content Workspace Area */}
        {isPosPage ? (
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden bg-app flex flex-col">
            <Outlet />
          </div>
        ) : (
          <div className="flex-1 min-w-0 overflow-y-auto bg-app flex flex-col transition-all duration-200">
            <main className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 transition-all duration-200">
              <Breadcrumbs />
              <Outlet />
            </main>
          </div>
        )}
      </div>

      {/* Context Switcher Modal */}
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

