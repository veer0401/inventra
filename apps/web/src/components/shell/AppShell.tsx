import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
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

  // Initialize Global Keyboard Shortening listener
  useKeyboardShortcuts();

  const fetchProfiles = useShortcutStore((state) => state.fetchProfiles);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return (
    <div className="min-h-screen bg-app flex flex-col antialiased text-primary selection:bg-primary selection:text-white transition-colors duration-150">
      {/* Top Network Offline Banner */}
      <ConnectionStatus />

      {/* Main Top Header */}
      <TopBar
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onOpenContextSwitcher={() => setContextSwitcherOpen(true)}
      />

      {/* Main Body Container: Sidebar + Outlet */}
      <div className="flex-1 flex overflow-hidden">
        {/* Persistent Desktop / Collapsible Mobile Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Content Workspace Area */}
        <div className="flex-1 overflow-y-auto bg-app flex flex-col">
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            <Breadcrumbs />
            <Outlet />
          </main>
        </div>
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

