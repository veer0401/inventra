import React, { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  Store,
  Shield,
  WifiOff,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Layers,
  Zap,
} from "lucide-react";
import { useAuthStore, safeLocalStorage, LOCAL_STORAGE_DEBUG_OFFLINE } from "../../stores/authStore";
import { useShortcutStore } from "../../stores/shortcutStore";
import { useWorkspaceStore, MAX_PRIMARY_NAV_ITEMS } from "../../stores/workspaceStore";
import { ShortcutHint } from "@inventra/ui";
import { BrandLogo } from "../common/BrandLogo";
import { UserMenu } from "./UserMenu";
import { getAuthorizedNavGroups } from "./navigationRegistry";
import { QuickToolDef } from "./quickToolsRegistry";

export interface TopBarProps {
  onToggleSidebar: () => void;
  onOpenContextSwitcher: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar, onOpenContextSwitcher }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { activeContext, isOnline, user } = useAuthStore();
  const userRole = activeContext?.role || "STAFF";
  const isPlatformAdmin = userRole === "PLATFORM_ADMIN";

  const {
    initializeForUser,
    getEffectivePrimaryNav,
    getEffectiveQuickTools,
    setCustomizerOpen,
    setBarcodeModalOpen,
  } = useWorkspaceStore();

  const { toggleCopilot, setCommandPaletteOpen, copilotOpen, intelligenceOpen } = useShortcutStore();
  const isIntelligenceActive = Boolean(copilotOpen || intelligenceOpen);

  const [isDebugOffline, setIsDebugOffline] = useState(() =>
    safeLocalStorage.getItem(LOCAL_STORAGE_DEBUG_OFFLINE) === "true"
  );

  // Dedicated ref for More mega menu container to handle outside clicks reliably
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Ribbon Collapse / Decollapse State with LocalStorage Persistence
  const LOCAL_STORAGE_RIBBON_COLLAPSED = "inventra_workspace_ribbon_collapsed";
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState(() => {
    return safeLocalStorage.getItem(LOCAL_STORAGE_RIBBON_COLLAPSED) === "true";
  });

  const toggleRibbonCollapse = React.useCallback(() => {
    setIsRibbonCollapsed((prev) => {
      const next = !prev;
      safeLocalStorage.setItem(LOCAL_STORAGE_RIBBON_COLLAPSED, String(next));
      return next;
    });
  }, []);

  // Keyboard shortcut Ctrl+F1 to toggle ribbon collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "F1") {
        e.preventDefault();
        toggleRibbonCollapse();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleRibbonCollapse]);

  // Initialize workspace preferences whenever active user or role changes
  useEffect(() => {
    initializeForUser(user?.id || null, userRole);
  }, [user?.id, userRole, initializeForUser]);

  // Robust click outside listener using moreMenuRef
  useEffect(() => {
    if (!isMoreOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMoreOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMoreOpen]);

  // Close menus on route navigation
  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  // Offline debug event listener
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

  const primaryNavItems = React.useMemo(() => {
    const raw = getEffectivePrimaryNav(userRole);
    return raw.slice(0, MAX_PRIMARY_NAV_ITEMS);
  }, [getEffectivePrimaryNav, userRole]);

  const quickTools = getEffectiveQuickTools(userRole);
  const allGroups = getAuthorizedNavGroups(userRole);

  // Helper to determine which parent item corresponds to current pathname
  const findParentIdForPath = React.useCallback(
    (pathname: string): string => {
      for (const item of primaryNavItems) {
        if (item.to && (pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to + "/")))) {
          return item.id;
        }
        if (item.children) {
          for (const child of item.children) {
            if (pathname === child.to || (child.to !== "/" && pathname.startsWith(child.to + "/"))) {
              return item.id;
            }
          }
        }
      }
      if (pathname.startsWith("/pos") || pathname.startsWith("/sales") || pathname.startsWith("/returns") || pathname.startsWith("/customers")) {
        return "work-sales";
      }
      if (pathname.startsWith("/inventory") || pathname.startsWith("/transfers")) {
        return "inventory-group";
      }
      if (pathname.startsWith("/purchasing") || pathname.startsWith("/goods-receipts") || pathname.startsWith("/suppliers")) {
        return "purchasing-group";
      }
      if (pathname.startsWith("/catalog")) {
        return "catalog-group";
      }
      if (pathname.startsWith("/reports")) {
        return "reports";
      }
      if (pathname.startsWith("/users") || pathname.startsWith("/devices") || pathname.startsWith("/imports") || pathname.startsWith("/settings")) {
        return "users";
      }
      return primaryNavItems[0]?.id || "dashboard";
    },
    [primaryNavItems]
  );

  // Active parent category for the Google Sheets contextual sub-ribbon
  const [selectedParentId, setSelectedParentId] = useState<string>(() =>
    findParentIdForPath(location.pathname)
  );

  // Synchronize active parent tab strictly when location.pathname actually changes
  const prevPathnameRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== location.pathname) {
      prevPathnameRef.current = location.pathname;
      const matched = findParentIdForPath(location.pathname);
      if (matched) {
        setSelectedParentId(matched);
      }
    }
  }, [location.pathname, findParentIdForPath]);

  // Current active parent item definition
  const currentActiveItem =
    primaryNavItems.find((item) => item.id === selectedParentId) || primaryNavItems[0];

  // Helper to determine active sub-tabs for the current active parent category
  const activeSubTabs = React.useMemo(() => {
    if (!currentActiveItem) return [];

    // Contextual fallback for Dashboard (uses 'Overview' to avoid label collision with parent 'Dashboard')
    if (currentActiveItem.id === "dashboard") {
      return [
        { id: "dash-overview", label: "Overview", to: "/dashboard", shortcut: "G D" },
        { id: "dash-pos", label: "POS Billing", to: "/pos", shortcut: "F1" },
        { id: "dash-inventory", label: "Stock Overview", to: "/inventory", shortcut: "G I" },
        { id: "dash-orders", label: "Purchase Orders", to: "/purchasing/orders", shortcut: "G P" },
      ];
    }

    // Contextual fallback for Reports
    if (currentActiveItem.id === "reports") {
      return [
        { id: "rep-hub", label: "Reports Hub", to: "/reports", shortcut: "G A" },
        { id: "rep-sales", label: "Sales Summary", to: "/reports" },
        { id: "rep-tax", label: "Tax & GST", to: "/reports" },
      ];
    }

    // If the active item has explicitly defined children, use them (e.g. Sales, Inventory, Purchasing)
    if (currentActiveItem.children && currentActiveItem.children.length > 0) {
      return currentActiveItem.children;
    }

    // Otherwise, check canonical navigation groups to find corresponding group sub-items
    const matchedGroup = allGroups.find(
      (g) =>
        g.id === currentActiveItem.id ||
        g.items.some((item) => item.id === currentActiveItem.id)
    );

    if (matchedGroup) {
      const subItems: {
        id: string;
        label: string;
        to: string;
        icon?: React.ComponentType<{ className?: string }>;
        shortcut?: string;
      }[] = [];

      matchedGroup.items.forEach((item) => {
        if (item.children) {
          item.children.forEach((c) => subItems.push(c));
        } else if (item.to) {
          subItems.push({
            id: item.id,
            label: item.label,
            to: item.to,
            icon: item.icon,
            shortcut: item.shortcut,
          });
        }
      });

      if (subItems.length > 0) {
        return subItems;
      }
    }

    if (currentActiveItem.to) {
      return [
        {
          id: currentActiveItem.id,
          label: currentActiveItem.label,
          to: currentActiveItem.to,
          icon: currentActiveItem.icon,
          shortcut: currentActiveItem.shortcut,
        },
      ];
    }

    return [];
  }, [currentActiveItem, allGroups]);

  const handleQuickToolClick = (tool: QuickToolDef) => {
    if (tool.isAction) {
      if (tool.actionId === "openBarcodeScan") {
        setBarcodeModalOpen(true);
      } else if (tool.actionId === "openCommandPalette") {
        setCommandPaletteOpen(true);
      }
    } else if (tool.to) {
      navigate(tool.to);
    }
  };

  return (
    <header
      className="sticky top-0 z-30 bg-surface border-b border-subtle shrink-0 shadow-xs flex flex-col select-none"
      aria-label="Application Top Header"
    >
      {/* ── ROW 1: GOOGLE SHEETS STYLE MENU BAR (36px) ─────────────────────────── */}
      <div className="h-9 px-3 sm:px-4 flex items-center justify-between border-b border-subtle/70 gap-2.5 relative z-30 overflow-visible">
        {/* Left: Mobile Toggle, Brand & Parent Category Tabs */}
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-visible">
          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-1 rounded text-secondary hover:text-primary hover:bg-surface-muted transition-colors focus:outline-none focus:ring-2 focus:ring-focus cursor-pointer shrink-0"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Brand Logo with ERP software badge */}
          <Link
            to="/dashboard"
            onClick={() => setSelectedParentId("dashboard")}
            className="flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-focus rounded py-0.5 shrink-0"
            title="Inventra ERP Home"
          >
            <BrandLogo size="sm" showText badgeText="ERP" />
          </Link>

          <div className="hidden lg:block h-3.5 w-px bg-subtle shrink-0 ml-1 mr-0.5" />

          {/* Desktop Primary Navigation Tabs */}
          <nav
            className="hidden lg:flex items-center gap-1 relative overflow-visible shrink-0"
            aria-label="Primary Workspace Modules"
          >
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const hasChildren = Boolean(item.children && item.children.length > 0);
              const isSelected = selectedParentId === item.id;
              const isChildActive = item.children?.some(
                (child) =>
                  location.pathname === child.to ||
                  (child.to !== "/" && location.pathname.startsWith(child.to + "/"))
              );
              const isDirectActive =
                item.to &&
                (location.pathname === item.to ||
                  (item.to !== "/" && location.pathname.startsWith(item.to + "/")));
              const isActive = isSelected || isChildActive || isDirectActive;

              if (hasChildren) {
                return (
                  <div key={item.id} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreOpen(false);
                        setSelectedParentId(item.id);
                        setIsRibbonCollapsed(false);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                        isActive
                          ? "bg-primary-subtle text-primary font-semibold border-b-2 border-primary"
                          : "text-secondary hover:text-primary hover:bg-surface-muted"
                      }`}
                      aria-expanded={Boolean(isActive)}
                      aria-haspopup="true"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.to || item.id}
                  to={item.to || "/"}
                  onClick={() => {
                    setSelectedParentId(item.id);
                    setIsRibbonCollapsed(false);
                  }}
                  className={({ isActive: isLinkActive }) =>
                    `flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded shrink-0 transition-colors ${
                      isActive || isLinkActive
                        ? "bg-primary-subtle text-primary font-semibold border-b-2 border-primary"
                        : "text-secondary hover:text-primary hover:bg-surface-muted"
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{item.label}</span>
                  {item.shortcut && (
                    <span className="hidden xl:inline font-mono text-[9px] text-muted opacity-70">
                      {item.shortcut}
                    </span>
                  )}
                </NavLink>
              );
            })}

            {/* "More ▾" All Modules Mega Menu */}
            <div className="relative shrink-0 ml-0.5">
              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen((prev) => !prev);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border transition-colors cursor-pointer ${
                  isMoreOpen
                    ? "bg-surface-muted text-primary border-primary/40 font-semibold"
                    : "border-transparent text-secondary hover:text-primary hover:bg-surface-muted"
                }`}
                aria-expanded={isMoreOpen}
                aria-haspopup="true"
                aria-label="All application modules"
              >
                <span>More</span>
                <ChevronDown
                  className={`h-3 w-3 text-muted transition-transform duration-150 ${
                    isMoreOpen ? "rotate-180 text-primary" : ""
                  }`}
                />
              </button>

              {/* All Modules Mega Menu Popover */}
              {isMoreOpen && (
                <div
                  className="absolute left-0 top-full mt-1 w-[680px] max-w-[90vw] rounded-lg border border-subtle bg-surface-elevated text-primary shadow-2xl p-4 z-50 animate-in fade-in-0 zoom-in-95 duration-100"
                  role="menu"
                  aria-label="All Modules"
                >
                  <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-subtle">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-primary">
                        All Modules & Operations
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreOpen(false);
                        setCustomizerOpen(true);
                      }}
                      className="flex items-center gap-1.5 text-[11px] text-primary hover:underline font-medium cursor-pointer"
                    >
                      <SlidersHorizontal className="h-3 w-3" />
                      <span>Customize Top Bar</span>
                    </button>
                  </div>

                  {/* Multi-column Grid of Groups */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    {allGroups.map((group) => (
                      <div key={group.id} className="space-y-1.5">
                        <div className="font-bold text-[10px] tracking-wider text-muted uppercase">
                          {group.title}
                        </div>
                        <div className="space-y-0.5">
                          {group.items.map((item) => {
                            const Icon = item.icon;
                            if (item.children) {
                              return (
                                <div key={item.id} className="space-y-0.5 pt-1">
                                  <div className="text-[11px] font-semibold text-secondary flex items-center gap-1.5 px-1.5 py-0.5">
                                    <Icon className="h-3 w-3 text-muted" />
                                    <span>{item.label}</span>
                                  </div>
                                  <div className="pl-3 border-l border-subtle space-y-0.5 ml-2">
                                    {item.children.map((child) => (
                                      <NavLink
                                        key={child.to}
                                        to={child.to}
                                        onClick={() => setIsMoreOpen(false)}
                                        className={({ isActive }) =>
                                          `flex items-center justify-between px-2 py-1 rounded transition-colors ${
                                            isActive
                                              ? "bg-primary-subtle text-primary font-semibold"
                                              : "text-secondary hover:text-primary hover:bg-surface-muted"
                                          }`
                                        }
                                      >
                                        <span className="truncate">{child.label}</span>
                                        {child.shortcut && (
                                          <span className="font-mono text-[9px] text-muted ml-1">
                                            {child.shortcut}
                                          </span>
                                        )}
                                      </NavLink>
                                    ))}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <NavLink
                                key={item.to || item.id}
                                to={item.to || "/"}
                                onClick={() => setIsMoreOpen(false)}
                                className={({ isActive }) =>
                                  `flex items-center justify-between px-2 py-1 rounded transition-colors ${
                                    isActive
                                      ? "bg-primary-subtle text-primary font-semibold"
                                      : "text-secondary hover:text-primary hover:bg-surface-muted"
                                  }`
                                }
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <Icon className="h-3 w-3 text-muted shrink-0" />
                                  <span className="truncate">{item.label}</span>
                                </div>
                                {item.shortcut && (
                                  <span className="font-mono text-[9px] text-muted ml-1">
                                    {item.shortcut}
                                  </span>
                                )}
                              </NavLink>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Right Area: Store Location, Search, Intelligence, Connectivity & User Profile */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Active Store Location Selector */}
          {!isPlatformAdmin ? (
            <button
              type="button"
              onClick={onOpenContextSwitcher}
              className="hidden md:flex items-center gap-1.5 text-xs text-secondary hover:text-primary hover:bg-surface-muted px-2 py-0.5 rounded border border-subtle/80 hover:border-subtle transition-all text-left focus:outline-none focus:ring-1 focus:ring-focus cursor-pointer shrink-0 max-w-[120px] 2xl:max-w-[160px]"
              title="Click to switch store location"
            >
              <Store className="h-3 w-3 text-primary shrink-0" />
              <span className="font-semibold text-primary truncate">
                {activeContext?.storeName || "Select Store"}
              </span>
              <span className="text-muted font-mono text-[9px] shrink-0">
                {activeContext?.storeCode || ""}
              </span>
            </button>
          ) : (
            <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded border border-primary/30 bg-primary-subtle text-primary text-xs shrink-0">
              <Shield className="h-3 w-3 shrink-0" />
              <span className="font-semibold">Platform Admin</span>
            </div>
          )}

          {/* Quick Search / Command Palette */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-subtle bg-surface-muted/60 hover:bg-surface-muted text-secondary hover:text-primary transition-colors text-xs cursor-pointer shrink-0"
            aria-label="Open Command Palette (Ctrl+K)"
            title="Open Command Palette (Ctrl+K)"
          >
            <Search className="h-3 w-3 text-muted shrink-0" />
            <span className="hidden xl:inline text-[11px] text-muted">Find...</span>
            <ShortcutHint shortcut="Ctrl+K" compact />
          </button>

          {/* Inventra Intelligence Toggle */}
          <button
            type="button"
            onClick={() => toggleCopilot()}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors text-xs cursor-pointer shrink-0 ${
              isIntelligenceActive
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40 font-semibold"
                : "border-subtle bg-surface hover:bg-surface-muted text-secondary hover:text-primary"
            }`}
            title="Inventra Intelligence (Ctrl+J)"
            aria-pressed={isIntelligenceActive}
          >
            <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
            <span className="text-[11px] font-medium">AI</span>
          </button>

          {/* Network / Connectivity Status */}
          {isDebugOffline ? (
            <Link
              to="/settings?tab=offline"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-warning-subtle text-warning-fg border border-warning-border hover:bg-warning/10 transition-colors shrink-0"
              title="Offline simulation active"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
              <span>DEBUG</span>
            </Link>
          ) : (
            <Link
              to="/settings?tab=offline"
              className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border border-subtle transition-colors shrink-0"
              title="Workstation connectivity status"
            >
              {isOnline ? (
                <div className="flex items-center gap-1 text-success-fg">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span className="font-semibold text-[10px]">ONLINE</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-danger-fg">
                  <WifiOff className="h-3 w-3" />
                  <span className="font-bold text-[10px]">OFFLINE</span>
                </div>
              )}
            </Link>
          )}

          {/* User Account Menu */}
          <UserMenu onOpenContextSwitcher={onOpenContextSwitcher} />

          <div className="h-4 w-px bg-subtle/80 shrink-0 mx-0.5" />

          {/* Ribbon Collapse / Decollapse Toggle */}
          <button
            type="button"
            onClick={toggleRibbonCollapse}
            className="flex items-center justify-center p-1 rounded text-secondary hover:text-primary hover:bg-surface-muted border border-transparent hover:border-subtle transition-all cursor-pointer shrink-0"
            title={isRibbonCollapsed ? "Expand Workspace Ribbon (Ctrl+F1)" : "Collapse Workspace Ribbon (Ctrl+F1)"}
            aria-label={isRibbonCollapsed ? "Expand Workspace Ribbon" : "Collapse Workspace Ribbon"}
            aria-expanded={!isRibbonCollapsed}
          >
            {isRibbonCollapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* ── COLLAPSIBLE WORKSPACE RIBBONS (ROW 2 & ROW 3) ───────────────────────── */}
      {!isRibbonCollapsed && (
        <>
          {/* ── ROW 2: DEDICATED CONTEXTUAL SUB-MODULE RIBBON (34px) ─────────────── */}
          <div className="h-8.5 px-3 sm:px-4 bg-surface-elevated/75 backdrop-blur-xs border-b border-subtle/70 flex items-center justify-between text-xs overflow-x-auto no-scrollbar gap-2.5 relative z-15 animate-in fade-in-0 slide-in-from-top-1 duration-150">
            {/* Left: Active Parent Category Sub-Tabs Space */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wider shrink-0 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
                <span>{currentActiveItem?.label} Tools</span>
              </div>

              <div className="h-3.5 w-px bg-subtle shrink-0 mx-0.5" />

              <div className="flex items-center gap-1.5">
                {activeSubTabs.map((subTab) => {
                  const SubIcon = subTab.icon;
                  const isSubActive =
                    location.pathname === subTab.to ||
                    (subTab.to !== "/" && location.pathname.startsWith(subTab.to + "/"));

                  return (
                    <NavLink
                      key={subTab.to}
                      to={subTab.to}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all shrink-0 ${
                        isSubActive
                          ? "bg-surface text-primary font-semibold shadow-xs border border-subtle ring-1 ring-primary/25"
                          : "text-secondary hover:text-primary hover:bg-surface/80 border border-transparent"
                      }`}
                    >
                      {SubIcon && <SubIcon className="h-3.5 w-3.5 text-muted shrink-0" />}
                      <span className="truncate">{subTab.label}</span>
                      {subTab.shortcut && (
                        <span className="font-mono text-[9px] text-muted ml-0.5 px-1.5 py-0.2 rounded bg-surface-muted/60 border border-subtle/50 opacity-80">
                          {subTab.shortcut}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* Right context info: Active Branch / Station */}
            <div className="hidden lg:flex items-center gap-2 text-[10px] text-muted shrink-0">
              <span className="font-medium text-secondary">{activeContext?.businessName || "Inventra ERP"}</span>
              <span className="opacity-40">•</span>
              <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-surface border border-subtle text-secondary font-medium">Terminal Ready</span>
            </div>
          </div>

          {/* ── ROW 3: PHARMACY OPERATIONAL QUICK TOOLS TOOLBAR (32px) ─────────────── */}
          <div className="h-8 px-3 sm:px-4 bg-surface-muted/35 border-b border-subtle/80 flex items-center justify-between text-xs overflow-x-auto no-scrollbar gap-2.5 relative z-10 animate-in fade-in-0 slide-in-from-top-1 duration-150">
            {/* Left: Quick Tools Buttons */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 shrink-0 text-muted font-bold text-xs uppercase tracking-wider mr-1">
                <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>Quick Tools:</span>
              </div>

              <div className="flex items-center gap-1.5">
                {quickTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => handleQuickToolClick(tool)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-secondary hover:text-primary bg-surface/70 hover:bg-surface border border-subtle/70 hover:border-subtle hover:shadow-2xs transition-all shrink-0 cursor-pointer"
                      title={`${tool.label} — ${tool.description}`}
                    >
                      <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">{tool.shortLabel}</span>
                      {tool.shortcut && (
                        <span className="font-mono text-[9px] text-muted px-1.5 py-0.2 rounded bg-surface-muted border border-subtle/70 hidden md:inline">
                          {tool.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Workspace Customizer Button & Collapse Toggle */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <button
                type="button"
                onClick={() => setCustomizerOpen(true)}
                className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary px-2.5 py-1 rounded bg-surface/50 hover:bg-surface border border-subtle/60 hover:border-subtle hover:shadow-2xs transition-all cursor-pointer shrink-0"
                title="Customize top navigation tabs and quick tools"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted" />
                <span className="hidden md:inline font-medium">Customize Workspace</span>
              </button>

              <button
                type="button"
                onClick={toggleRibbonCollapse}
                className="flex items-center gap-1 text-[11px] text-muted hover:text-primary px-2 py-0.5 rounded hover:bg-surface border border-transparent hover:border-subtle transition-all cursor-pointer shrink-0"
                title="Collapse Workspace Ribbon (Ctrl+F1)"
                aria-label="Collapse Workspace Ribbon"
              >
                <ChevronUp className="h-3 w-3" />
                <span className="hidden xl:inline">Collapse</span>
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
};
