import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  Layers,
  ShoppingCart,
  Receipt,
  ArrowLeftRight,
  Truck,
  Building2,
  BarChart3,
  Smartphone,
  Users,
  Settings,
  ShieldAlert,
  UploadCloud,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Bot,
  Package,
  FileText,
  UserSquare,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useShortcutStore } from "../../stores/shortcutStore";
import { ShortcutHint } from "@inventra/ui";
import { BrandLogo } from "../common/BrandLogo";

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface NavChildItemDef {
  label: string;
  to: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  isFuture?: boolean;
  futurePhase?: string;
  allowedRoles?: string[];
}

export interface NavItemDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  shortcut?: string;
  isFuture?: boolean;
  futurePhase?: string;
  allowedRoles?: string[];
  children?: NavChildItemDef[];
}

export interface NavGroupDef {
  title: string;
  items: NavItemDef[];
}

const SIDEBAR_COLLAPSED_KEY = "inventra_sidebar_collapsed";
const SIDEBAR_EXPANDED_PARENTS_KEY = "inventra_sidebar_expanded_parents";

// Routes where NavLink end=true is required (exact match only)
const EXACT_ROUTES = new Set([
  "/",
  "/dashboard",
  "/inventory",
  "/catalog",
  "/transfers",
  "/customers",
  "/suppliers",
  "/sales",
  "/returns",
  "/purchasing/orders",
  "/purchasing/invoices",
  "/goods-receipts",
  "/reports",
  "/users",
  "/devices",
  "/imports",
  "/settings",
]);

const isExactRoute = (to: string) => EXACT_ROUTES.has(to);

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const activeContext = useAuthStore((state) => state.activeContext);
  const userRole = activeContext?.role || "STAFF";
  const isPlatformAdmin = userRole === "PLATFORM_ADMIN";
  const location = useLocation();
  const { copilotOpen, intelligenceOpen, toggleCopilot } = useShortcutStore();
  const isCopilotActive = Boolean(copilotOpen || intelligenceOpen);

  // Persistent collapsed state for desktop (rail mode)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Persistent expanded state for parent items
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_EXPANDED_PARENTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Default to expanded
    }
    return {
      "work-sales": true,
      "inventory-group": true,
      "purchasing-group": true,
      "catalog-group": false,
      "admin-group": false,
    };
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // Ignore storage errors in restricted contexts
      }
      return next;
    });
  };

  const toggleParent = (parentId: string) => {
    setExpandedParents((prev) => {
      const next = { ...prev, [parentId]: !prev[parentId] };
      try {
        localStorage.setItem(SIDEBAR_EXPANDED_PARENTS_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  React.useEffect(() => {
    const handleToggle = () => {
      toggleCollapse();
    };
    window.addEventListener("inventra:toggle-sidebar", handleToggle);
    return () => {
      window.removeEventListener("inventra:toggle-sidebar", handleToggle);
    };
  }, []);

  // Navigation structure — grouped by workflow, not by technical module
  const navigationGroups: NavGroupDef[] = [
    {
      title: "WORK",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          to: "/dashboard",
          icon: LayoutDashboard,
          shortcut: "G D",
        },
        {
          id: "work-sales",
          label: "Sales",
          icon: ShoppingCart,
          children: [
            {
              label: "Point of Sale",
              to: "/pos",
              icon: ShoppingCart,
              shortcut: "G O",
              allowedRoles: ["OWNER", "MANAGER", "CASHIER", "PHARMACIST", "STAFF", "INVENTORY_OPERATOR"],
            },
            {
              label: "Sales & Invoices",
              to: "/sales",
              icon: Receipt,
              shortcut: "G L",
              allowedRoles: ["OWNER", "MANAGER", "CASHIER", "PHARMACIST", "STAFF", "INVENTORY_OPERATOR"],
            },
            {
              label: "Returns",
              to: "/returns",
              icon: ArrowLeftRight,
              shortcut: "G R",
              allowedRoles: ["OWNER", "MANAGER", "CASHIER", "PHARMACIST", "STAFF", "INVENTORY_OPERATOR"],
            },
          ],
        },
        {
          id: "customers",
          label: "Customers",
          to: "/customers",
          icon: UserSquare,
          shortcut: "G U",
          allowedRoles: ["OWNER", "MANAGER", "CASHIER", "PHARMACIST", "STAFF", "INVENTORY_OPERATOR"],
        },
      ],
    },
    {
      title: "INVENTORY",
      items: [
        {
          id: "inventory-group",
          label: "Inventory",
          icon: Boxes,
          children: [
            {
              label: "Stock Overview",
              to: "/inventory",
              icon: Boxes,
              shortcut: "G I",
              allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "CASHIER", "PHARMACIST"],
            },
            {
              label: "Batches & FEFO",
              to: "/inventory/batches",
              icon: Package,
              shortcut: "G B",
              allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "CASHIER", "PHARMACIST"],
            },
            {
              label: "Movements",
              to: "/inventory/movements",
              icon: ArrowLeftRight,
              allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "CASHIER", "PHARMACIST"],
            },
          ],
        },
        {
          id: "transfers",
          label: "Transfers",
          to: "/transfers",
          icon: ArrowLeftRight,
          shortcut: "G X",
          allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR"],
        },
      ],
    },
    {
      title: "PURCHASING",
      items: [
        {
          id: "purchasing-group",
          label: "Purchase Orders",
          icon: FileText,
          allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
          children: [
            {
              label: "Orders",
              to: "/purchasing/orders",
              icon: FileText,
              shortcut: "G P",
              allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
            },
            {
              label: "Goods Receipts",
              to: "/goods-receipts",
              icon: Truck,
              allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
            },
            {
              label: "Invoices",
              to: "/purchasing/invoices",
              icon: Receipt,
              allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
            },
          ],
        },
        {
          id: "suppliers",
          label: "Suppliers",
          to: "/suppliers",
          icon: Building2,
          shortcut: "G S",
          allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
        },
      ],
    },
    {
      title: "CATALOG",
      items: [
        {
          id: "catalog-group",
          label: "Products",
          icon: Layers,
          children: [
            {
              label: "All Products",
              to: "/catalog",
              icon: Layers,
              shortcut: "G C",
            },
            {
              label: "Categories",
              to: "/catalog/categories",
              icon: Boxes,
            },
          ],
        },
      ],
    },
    {
      title: "FINANCE",
      items: [
        {
          id: "reports",
          label: "Reports",
          to: "/reports",
          icon: BarChart3,
          shortcut: "G A",
          allowedRoles: ["OWNER", "ADMIN", "MANAGER", "PHARMACIST"],
        },
      ],
    },
    {
      title: "ADMIN",
      items: [
        {
          id: "users",
          label: "Users",
          to: "/users",
          icon: Users,
          allowedRoles: ["OWNER", "ADMIN", "MANAGER"],
        },
        {
          id: "devices",
          label: "Devices",
          to: "/devices",
          icon: Smartphone,
          shortcut: "G E",
          allowedRoles: ["OWNER", "ADMIN", "MANAGER"],
        },
        {
          id: "imports",
          label: "Imports",
          to: "/imports",
          icon: UploadCloud,
          shortcut: "G M",
          allowedRoles: ["OWNER", "MANAGER", "ADMIN", "PLATFORM_ADMIN"],
        },
        {
          id: "settings",
          label: "Settings",
          to: "/settings",
          icon: Settings,
          shortcut: "G T",
        },
      ],
    },
  ];

  if (isPlatformAdmin) {
    navigationGroups.push({
      title: "PLATFORM",
      items: [
        {
          id: "onboarding-approvals",
          label: "Applications",
          to: "/admin/onboarding",
          icon: ShieldAlert,
          allowedRoles: ["PLATFORM_ADMIN"],
        },
      ],
    });
  }

  // Auto-expand parent if currently on any child route
  useEffect(() => {
    navigationGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (
          item.children?.some(
            (child) =>
              location.pathname === child.to ||
              (child.to !== "/" && location.pathname.startsWith(child.to + "/"))
          )
        ) {
          setExpandedParents((prev) => {
            if (prev[item.id]) return prev;
            const next = { ...prev, [item.id]: true };
            try {
              localStorage.setItem(SIDEBAR_EXPANDED_PARENTS_KEY, JSON.stringify(next));
            } catch {
              // Ignore
            }
            return next;
          });
        }
      });
    });
  }, [location.pathname]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden animate-in fade-in-0 duration-150"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 inset-y-0 left-0 z-40 bg-surface border-r border-subtle flex flex-col transition-all duration-200 ease-in-out shrink-0 h-full ${
          isCollapsed ? "lg:w-[52px]" : "lg:w-52"
        } w-52 transform ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        aria-label="Application Sidebar Navigation"
      >
        {/* Mobile Header with Close Button */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-subtle lg:hidden">
          <BrandLogo size="sm" showText badgeText="ERP" />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-secondary hover:text-primary hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-focus cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Desktop Brand Header */}
        <div className={`hidden lg:flex items-center border-b border-subtle shrink-0 ${isCollapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"}`}>
          {!isCollapsed ? (
            <BrandLogo size="sm" showText badgeText="ERP" />
          ) : (
            <BrandLogo size="sm" showText={false} />
          )}
        </div>

        {/* Scrollable Navigation Groups */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-0.5" aria-label="Main navigation">
          {navigationGroups.map((group) => {
            // Filter items based on user role
            const filteredItems = group.items
              .map((item) => {
                if (item.children) {
                  const filteredChildren = item.children.filter((child) => {
                    if (!child.allowedRoles) return true;
                    return child.allowedRoles.includes(userRole) || isPlatformAdmin;
                  });
                  if (filteredChildren.length === 0) return null;
                  return { ...item, children: filteredChildren };
                }
                if (!item.allowedRoles) return item;
                if (item.allowedRoles.includes(userRole) || isPlatformAdmin) return item;
                return null;
              })
              .filter(Boolean) as NavItemDef[];

            if (filteredItems.length === 0) return null;

            return (
              <div key={group.title}>
                {/* Section Header */}
                {!isCollapsed ? (
                  <div className="px-3 pt-3 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted select-none truncate">
                    {group.title}
                  </div>
                ) : (
                  <div className="h-px bg-subtle mx-2 mt-3 mb-0.5 hidden lg:block" title={group.title} />
                )}

                <div className="px-1.5">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const hasChildren = Boolean(item.children && item.children.length > 0);
                    const isParentExpanded = expandedParents[item.id] ?? true;

                    // Check if any child route is currently active
                    const isChildRouteActive = Boolean(
                      item.children?.some(
                        (c) =>
                          location.pathname === c.to ||
                          (c.to !== "/" && location.pathname.startsWith(c.to + "/"))
                      )
                    );

                    // --- RENDER PARENT ITEM WITH CHILDREN ---
                    if (hasChildren && item.children) {
                      return (
                        <div key={item.id}>
                          {/* Parent Button */}
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => toggleParent(item.id)}
                              title={isCollapsed ? item.label : undefined}
                              className={`w-full flex items-center ${
                                isCollapsed ? "lg:justify-center lg:px-1.5" : "justify-between px-2"
                              } py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                                isChildRouteActive
                                  ? "bg-primary-subtle text-primary"
                                  : "text-secondary hover:text-primary hover:bg-surface-muted"
                              }`}
                              aria-expanded={isParentExpanded}
                            >
                              <div className="flex items-center gap-2 truncate min-w-0">
                                <Icon
                                  className={`h-3.5 w-3.5 shrink-0 ${
                                    isChildRouteActive
                                      ? "text-primary"
                                      : "text-muted group-hover:text-primary"
                                  }`}
                                />
                                <span
                                  className={`truncate ${
                                    isCollapsed ? "lg:hidden" : "block"
                                  }`}
                                >
                                  {item.label}
                                </span>
                              </div>

                              {!isCollapsed && (
                                <ChevronDown
                                  className={`h-3 w-3 shrink-0 text-muted transition-transform duration-150 ${
                                    isParentExpanded ? "rotate-0" : "-rotate-90"
                                  }`}
                                />
                              )}
                            </button>

                            {/* Flyout Popover Menu when Rail Mode (Collapsed) */}
                            {isCollapsed && (
                              <div className="hidden lg:group-hover:flex flex-col absolute left-full top-0 ml-1.5 py-1 px-1 bg-surface-elevated text-primary text-xs rounded-md shadow-elevated border border-subtle whitespace-nowrap z-50 min-w-[180px] animate-in fade-in-0 zoom-in-95 duration-100 pointer-events-auto">
                                <div className="px-2.5 py-1 font-semibold text-[10px] uppercase tracking-wider text-muted border-b border-subtle mb-1">
                                  {item.label}
                                </div>
                                {item.children.map((child) => {
                                  const ChildIcon = child.icon || Icon;
                                  return (
                                    <NavLink
                                      key={child.to}
                                      to={child.to}
                                      end={isExactRoute(child.to)}
                                      className={({ isActive }) =>
                                        `flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                                          isActive
                                            ? "bg-primary text-primary-fg font-semibold"
                                            : "text-secondary hover:text-primary hover:bg-surface-muted"
                                        }`
                                      }
                                    >
                                      <div className="flex items-center gap-1.5 truncate">
                                        <ChildIcon className="h-3 w-3 shrink-0 text-muted" />
                                        <span>{child.label}</span>
                                      </div>
                                      {child.shortcut && (
                                        <ShortcutHint shortcut={child.shortcut} compact />
                                      )}
                                    </NavLink>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Children List (When Expanded) */}
                          {isParentExpanded && !isCollapsed && (
                            <div className="ml-2 pl-3 border-l border-subtle space-y-px my-px">
                              {item.children.map((child) => {
                                const ChildIcon = child.icon || Icon;
                                return (
                                  <NavLink
                                    key={child.to}
                                    to={child.to}
                                    end={isExactRoute(child.to)}
                                    onClick={() => {
                                      if (window.innerWidth < 1024) onClose();
                                    }}
                                    className={({ isActive }) =>
                                      `flex items-center justify-between px-2 py-1.5 rounded text-xs font-medium transition-colors group relative ${
                                        isActive
                                          ? "bg-primary text-primary-fg font-semibold"
                                          : "text-secondary hover:text-primary hover:bg-surface-muted"
                                      }`
                                    }
                                  >
                                    {({ isActive }) => (
                                      <>
                                        <div className="flex items-center gap-1.5 truncate min-w-0">
                                          <ChildIcon
                                            className={`h-3 w-3 shrink-0 ${
                                              isActive
                                                ? "text-primary-fg"
                                                : "text-muted group-hover:text-primary"
                                            }`}
                                          />
                                          <span className="truncate">{child.label}</span>
                                        </div>

                                        {child.isFuture && (
                                          <span
                                            className={`text-[9px] px-1 rounded font-mono shrink-0 ${
                                              isActive
                                                ? "bg-primary-active text-primary-fg"
                                                : "bg-surface-muted text-muted border border-subtle"
                                            }`}
                                          >
                                            Soon
                                          </span>
                                        )}

                                        {!child.isFuture && child.shortcut && (
                                          <ShortcutHint
                                            shortcut={child.shortcut}
                                            compact
                                            className={`opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${
                                              isActive ? "text-primary-fg" : "text-muted"
                                            }`}
                                          />
                                        )}
                                      </>
                                    )}
                                  </NavLink>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // --- RENDER SINGLE DIRECT LINK ITEM ---
                    return (
                      <NavLink
                        key={item.to || item.id}
                        to={item.to || "/"}
                        end={isExactRoute(item.to || "/")}
                        onClick={() => {
                          if (window.innerWidth < 1024) onClose();
                        }}
                        title={isCollapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          `flex items-center ${
                            isCollapsed ? "lg:justify-center lg:px-1.5" : "justify-between px-2"
                          } py-1.5 rounded text-xs font-medium transition-colors group relative ${
                            isActive
                              ? "bg-primary text-primary-fg font-semibold"
                              : "text-secondary hover:text-primary hover:bg-surface-muted"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div className="flex items-center gap-2 truncate min-w-0">
                              <Icon
                                className={`h-3.5 w-3.5 shrink-0 ${
                                  isActive
                                    ? "text-primary-fg"
                                    : "text-muted group-hover:text-primary"
                                }`}
                              />
                              <span
                                className={`truncate ${
                                  isCollapsed ? "lg:hidden" : "block"
                                }`}
                              >
                                {item.label}
                              </span>
                            </div>

                            {item.isFuture && !isCollapsed && (
                              <span
                                className={`text-[9px] px-1 rounded font-mono shrink-0 ${
                                  isActive
                                    ? "bg-primary-active text-primary-fg"
                                    : "bg-surface-muted text-muted border border-subtle"
                                }`}
                              >
                                Soon
                              </span>
                            )}

                            {!item.isFuture && !isCollapsed && item.shortcut && (
                              <ShortcutHint
                                shortcut={item.shortcut}
                                compact
                                className={`opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${
                                  isActive ? "text-primary-fg" : "text-muted"
                                }`}
                              />
                            )}

                            {/* Floating tooltip when collapsed on desktop */}
                            {isCollapsed && (
                              <div className="hidden lg:group-hover:flex absolute left-full ml-1.5 px-2 py-1 bg-surface-elevated text-primary text-xs font-medium rounded-md shadow-md border border-subtle whitespace-nowrap z-50 pointer-events-none items-center gap-2">
                                <span>{item.label}</span>
                                {item.shortcut && (
                                  <ShortcutHint shortcut={item.shortcut} compact />
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Intelligence Toggle */}
        <div className="px-1.5 pb-1.5 border-t border-subtle pt-1.5">
          <button
            type="button"
            onClick={toggleCopilot}
            className={`group relative flex items-center justify-between w-full px-2 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer select-none ${
              isCopilotActive
                ? "bg-primary text-primary-fg font-semibold"
                : "text-secondary hover:text-primary hover:bg-surface-muted"
            }`}
            title="Inventra Intelligence (Ctrl+J)"
            data-testid="test-sidebar-copilot-toggle"
            aria-pressed={isCopilotActive}
            aria-label="Toggle Inventra Intelligence"
          >
            <div className="flex items-center gap-2 truncate min-w-0">
              <Bot
                className={`h-3.5 w-3.5 shrink-0 ${
                  isCopilotActive ? "text-primary-fg" : "text-muted group-hover:text-primary"
                }`}
              />
              <span className={`truncate ${isCollapsed ? "lg:hidden" : "block"}`}>
                Intelligence
              </span>
            </div>

            {!isCollapsed && (
              <span
                className={`text-[9px] font-mono px-1 rounded shrink-0 ${
                  isCopilotActive
                    ? "bg-primary-active text-primary-fg"
                    : "bg-surface-muted text-muted border border-subtle"
                }`}
              >
                Ctrl+J
              </span>
            )}

            {/* Tooltip when sidebar is collapsed in rail mode */}
            {isCollapsed && (
              <div className="hidden lg:group-hover:flex absolute left-full ml-1.5 px-2 py-1 bg-surface-elevated text-primary text-xs font-medium rounded-md shadow-md border border-subtle whitespace-nowrap z-50 pointer-events-none items-center gap-2">
                <span>Intelligence</span>
                <ShortcutHint shortcut="Ctrl+J" compact />
              </div>
            )}
          </button>
        </div>

        {/* Sidebar Footer with Collapse/Expand Toggle */}
        <div className="px-1.5 pb-2 border-t border-subtle pt-1.5 text-[10px] text-muted font-mono flex flex-col gap-1.5">
          {/* Desktop Collapse / Expand Toggle Button */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden lg:flex items-center justify-between w-full py-1 px-2 rounded border border-subtle hover:bg-surface-muted hover:text-primary transition-colors text-xs font-sans text-secondary focus:outline-none focus:ring-2 focus:ring-focus cursor-pointer"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? (
              <div className="flex items-center justify-center w-full">
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <span className="sr-only">Expand sidebar (Ctrl+B)</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs">Collapse</span>
                </div>
                <ShortcutHint shortcut="Ctrl+B" compact />
              </>
            )}
          </button>

          {/* Version Marker */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between px-1">
              <span>v1.0.0-F5</span>
              <span className="text-success font-semibold">ONLINE</span>
            </div>
          ) : (
            <div className="hidden lg:flex justify-center" title="v1.0.0-F5 (ONLINE)">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
