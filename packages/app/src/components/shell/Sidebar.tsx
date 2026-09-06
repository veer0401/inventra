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
  CreditCard,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
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

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const activeContext = useAuthStore((state) => state.activeContext);
  const userRole = activeContext?.role || "STAFF";
  const isPlatformAdmin = userRole === "PLATFORM_ADMIN";
  const location = useLocation();

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
      "sales-dispensary": true,
      "inventory-control": true,
      "catalog-master": true,
      "procurement": true,
      "administration": true,
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

  const navigationGroups: NavGroupDef[] = [
    {
      title: "OVERVIEW",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          to: "/dashboard",
          icon: LayoutDashboard,
          shortcut: "G D",
        },
      ],
    },
    {
      title: "DISPENSARY & SALES",
      items: [
        {
          id: "sales-dispensary",
          label: "Sales & Dispensary",
          icon: ShoppingCart,
          children: [
            {
              label: "Point of Sale (POS)",
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
              label: "Sales Returns",
              to: "/returns",
              icon: ArrowLeftRight,
              shortcut: "G R",
              allowedRoles: ["OWNER", "MANAGER", "CASHIER", "PHARMACIST", "STAFF", "INVENTORY_OPERATOR"],
            },
          ],
        },
      ],
    },
    {
      title: "INVENTORY & CATALOG",
      items: [
        {
          id: "inventory-control",
          label: "Inventory Control",
          icon: Boxes,
          children: [
            {
              label: "Inventory Overview",
              to: "/inventory",
              icon: Boxes,
              shortcut: "G I",
              allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "CASHIER", "PHARMACIST"],
            },
            {
              label: "Batches & FEFO",
              to: "/inventory/batches",
              icon: Boxes,
              shortcut: "G B",
              allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "CASHIER", "PHARMACIST"],
            },
            {
              label: "Stock Movements",
              to: "/inventory/movements",
              icon: ArrowLeftRight,
              allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "CASHIER", "PHARMACIST"],
            },
          ],
        },
        {
          id: "catalog-master",
          label: "Product Catalog",
          icon: Layers,
          children: [
            {
              label: "Catalog & Categories",
              to: "/catalog",
              icon: Layers,
              shortcut: "G C",
            },
          ],
        },
        {
          id: "transfers",
          label: "Store Transfers",
          to: "/transfers",
          icon: ArrowLeftRight,
          shortcut: "G X",
          allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR"],
        },
      ],
    },
    {
      title: "CUSTOMERS",
      items: [
        {
          id: "customers",
          label: "Customer Directory",
          to: "/customers",
          icon: Users,
          shortcut: "G U",
          allowedRoles: ["OWNER", "MANAGER", "CASHIER", "PHARMACIST", "STAFF", "INVENTORY_OPERATOR"],
        },
      ],
    },
    {
      title: "PROCUREMENT",
      items: [
        {
          id: "procurement",
          label: "Purchasing & Supply",
          icon: Truck,
          children: [
            {
              label: "Purchase Orders (PO)",
              to: "/purchasing/orders",
              icon: Receipt,
              shortcut: "G P",
              allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
            },
            {
              label: "Goods Receipts (GRN)",
              to: "/goods-receipts",
              icon: Truck,
              allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
            },
            {
              label: "Purchase Invoices",
              to: "/purchasing/invoices",
              icon: Receipt,
              allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
            },
          ],
        },
        {
          id: "suppliers",
          label: "Suppliers & Vendors",
          to: "/suppliers",
          icon: Building2,
          shortcut: "G S",
          allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
        },
      ],
    },
    {
      title: "MANAGEMENT",
      items: [
        {
          id: "administration",
          label: "Store Administration",
          icon: Users,
          children: [
            {
              label: "Store Staff & Capacity",
              to: "/users",
              icon: Users,
              allowedRoles: ["OWNER", "ADMIN", "MANAGER"],
            },
            {
              label: "Registered Devices",
              to: "/devices",
              icon: Smartphone,
              shortcut: "G E",
              allowedRoles: ["OWNER", "ADMIN", "MANAGER"],
            },
            {
              label: "Universal Data Import",
              to: "/imports",
              icon: UploadCloud,
              shortcut: "G M",
              allowedRoles: ["OWNER", "MANAGER", "ADMIN", "PLATFORM_ADMIN"],
            },
          ],
        },
        {
          id: "reports",
          label: "Reports & Analytics",
          to: "/reports",
          icon: BarChart3,
          shortcut: "G A",
          allowedRoles: ["OWNER", "ADMIN", "MANAGER", "PHARMACIST"],
        },
        {
          id: "billing",
          label: "Plan & Billing",
          to: "/settings?tab=billing",
          icon: CreditCard,
          allowedRoles: ["OWNER", "ADMIN", "MANAGER", "PLATFORM_ADMIN"],
        },
        {
          id: "settings",
          label: "Workstation Settings",
          to: "/settings",
          icon: Settings,
          shortcut: "G T",
        },
      ],
    },
  ];

  if (isPlatformAdmin) {
    navigationGroups.push({
      title: "PLATFORM GOVERNANCE",
      items: [
        {
          id: "onboarding-approvals",
          label: "Onboarding Approvals",
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
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden animate-in fade-in-0 duration-150"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container: Sticky on Desktop, Collapsible 240px / 72px */}
      <aside
        className={`fixed lg:sticky top-0 inset-y-0 left-0 z-40 bg-surface border-r border-subtle flex flex-col transition-all duration-200 ease-in-out shrink-0 h-full ${
          isCollapsed ? "lg:w-[72px]" : "lg:w-60"
        } w-60 transform ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        aria-label="Application Sidebar Navigation"
      >
        {/* Mobile Header with Close Button */}
        <div className="flex items-center justify-between p-4 border-b border-subtle lg:hidden">
          <BrandLogo size="sm" showText badgeText="ERP" />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-secondary hover:text-primary hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-focus cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Navigation Groups */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-4 text-xs">
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
              <div key={group.title} className="space-y-1">
                {/* Section Header (Hidden when collapsed on desktop) */}
                {!isCollapsed ? (
                  <div className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider text-muted select-none truncate">
                    {group.title}
                  </div>
                ) : (
                  <div className="h-px bg-subtle my-2 mx-2 hidden lg:block" title={group.title} />
                )}

                <div className="space-y-0.5">
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
                        <div key={item.id} className="space-y-0.5">
                          {/* Parent Button */}
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => toggleParent(item.id)}
                              title={isCollapsed ? item.label : undefined}
                              className={`w-full flex items-center ${
                                isCollapsed ? "lg:justify-center lg:px-2" : "justify-between px-3"
                              } py-2 rounded-md font-medium transition-all text-xs cursor-pointer ${
                                isChildRouteActive
                                  ? "bg-surface-muted text-primary font-semibold border-l-2 border-primary"
                                  : "text-secondary hover:text-primary hover:bg-surface-muted"
                              }`}
                              aria-expanded={isParentExpanded}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <Icon
                                  className={`h-4 w-4 shrink-0 transition-colors ${
                                    isChildRouteActive
                                      ? "text-primary"
                                      : "text-muted group-hover:text-primary"
                                  }`}
                                />
                                <span
                                  className={`truncate text-xs ${
                                    isCollapsed ? "lg:hidden" : "block"
                                  }`}
                                >
                                  {item.label}
                                </span>
                              </div>

                              {!isCollapsed && (
                                <div className="flex items-center ml-2 text-muted group-hover:text-primary">
                                  {isParentExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5 transition-transform duration-150" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 transition-transform duration-150" />
                                  )}
                                </div>
                              )}
                            </button>

                            {/* Flyout Popover Menu when Rail Mode (Collapsed) */}
                            {isCollapsed && (
                              <div className="hidden lg:group-hover:flex flex-col absolute left-full top-0 ml-2 py-1.5 px-1 bg-surface-elevated text-primary text-xs rounded-lg shadow-xl border border-subtle whitespace-nowrap z-50 min-w-[200px] animate-in fade-in-0 zoom-in-95 duration-150 pointer-events-auto">
                                <div className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider text-muted border-b border-subtle mb-1">
                                  {item.label}
                                </div>
                                {item.children.map((child) => {
                                  const ChildIcon = child.icon || Icon;
                                  const isExactRoute = child.to === "/inventory" || child.to === "/catalog" || child.to === "/purchasing" || child.to === "/" || child.to === "/sales";
                                  return (
                                    <NavLink
                                      key={child.to}
                                      to={child.to}
                                      end={isExactRoute}
                                      className={({ isActive }) =>
                                        `flex items-center justify-between px-2.5 py-1.5 rounded-md font-medium text-xs transition-colors ${
                                          isActive
                                            ? "bg-primary text-primary-fg font-semibold shadow-xs"
                                            : "text-secondary hover:text-primary hover:bg-surface-muted"
                                        }`
                                      }
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <ChildIcon className="h-3.5 w-3.5 shrink-0 text-muted group-hover:text-primary" />
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

                          {/* Children List (When Expanded on Desktop or Mobile) */}
                          {isParentExpanded && !isCollapsed && (
                            <div className="ml-3 pl-3 border-l border-subtle space-y-0.5 my-0.5 transition-all">
                              {item.children.map((child) => {
                                const ChildIcon = child.icon || Icon;
                                const isExactRoute = child.to === "/inventory" || child.to === "/catalog" || child.to === "/purchasing" || child.to === "/" || child.to === "/sales";
                                return (
                                  <NavLink
                                    key={child.to}
                                    to={child.to}
                                    end={isExactRoute}
                                    onClick={() => {
                                      if (window.innerWidth < 1024) onClose();
                                    }}
                                    className={({ isActive }) =>
                                      `flex items-center justify-between px-2.5 py-1.5 rounded-md font-medium transition-all group relative text-xs ${
                                        isActive
                                          ? "bg-primary text-primary-fg shadow-xs font-semibold"
                                          : "text-secondary hover:text-primary hover:bg-surface-muted"
                                      }`
                                    }
                                  >
                                    {({ isActive }) => (
                                      <>
                                        <div className="flex items-center gap-2 truncate">
                                          <ChildIcon
                                            className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                                              isActive
                                                ? "text-primary-fg"
                                                : "text-muted group-hover:text-primary"
                                            }`}
                                          />
                                          <span className="truncate">{child.label}</span>
                                        </div>

                                        {child.isFuture && (
                                          <span
                                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-normal shrink-0 ${
                                              isActive
                                                ? "bg-primary-hover text-primary-fg"
                                                : "bg-surface-muted text-muted border border-subtle"
                                            }`}
                                          >
                                            Future
                                          </span>
                                        )}

                                        {!child.isFuture && child.shortcut && (
                                          <ShortcutHint
                                            shortcut={child.shortcut}
                                            compact
                                            className={`opacity-0 group-hover:opacity-100 transition-opacity ${
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
                    const isExactDirectRoute = item.to === "/" || item.to === "/dashboard" || item.to === "/inventory" || item.to === "/catalog" || item.to === "/transfers" || item.to === "/customers" || item.to === "/suppliers";
                    return (
                      <NavLink
                        key={item.to || item.id}
                        to={item.to || "/"}
                        end={isExactDirectRoute}
                        onClick={() => {
                          if (window.innerWidth < 1024) onClose();
                        }}
                        title={isCollapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          `flex items-center ${
                            isCollapsed ? "lg:justify-center lg:px-2" : "justify-between px-3"
                          } py-2 rounded-md font-medium transition-all group relative ${
                            isActive
                              ? "bg-primary text-primary-fg shadow-xs font-semibold"
                              : "text-secondary hover:text-primary hover:bg-surface-muted"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div className="flex items-center gap-2.5 truncate">
                              <Icon
                                className={`h-4 w-4 shrink-0 transition-colors ${
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
                                className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-normal shrink-0 ${
                                  isActive
                                    ? "bg-primary-hover text-primary-fg"
                                    : "bg-surface-muted text-muted border border-subtle"
                                }`}
                              >
                                Future
                              </span>
                            )}

                            {!item.isFuture && !isCollapsed && item.shortcut && (
                              <ShortcutHint
                                shortcut={item.shortcut}
                                compact
                                className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                                  isActive ? "text-primary-fg" : "text-muted"
                                }`}
                              />
                            )}

                            {/* Floating tooltip when collapsed on desktop */}
                            {isCollapsed && (
                              <div className="hidden lg:group-hover:flex absolute left-full ml-2 px-2.5 py-1 bg-surface-elevated text-primary text-xs font-medium rounded-md shadow-md border border-subtle whitespace-nowrap z-50 pointer-events-none items-center gap-2">
                                <span>{item.label}</span>
                                {item.shortcut && (
                                  <ShortcutHint shortcut={item.shortcut} compact />
                                )}
                                {item.isFuture && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-surface-muted text-muted border border-subtle font-mono">
                                    {item.futurePhase || "Future"}
                                  </span>
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

        {/* Sidebar Footer with Collapse/Expand Toggle & Build Marker */}
        <div className="p-2.5 border-t border-subtle text-[10px] text-muted flex flex-col gap-2 font-mono">
          {/* Desktop Collapse / Expand Toggle Button */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden lg:flex items-center justify-between w-full py-1.5 px-2.5 rounded-md border border-subtle hover:bg-surface-muted hover:text-primary transition-colors text-xs font-sans text-secondary focus:outline-none focus:ring-2 focus:ring-focus cursor-pointer"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? (
              <div className="flex items-center justify-center w-full">
                <ChevronRight className="h-4 w-4 shrink-0" />
                <span className="sr-only">Expand sidebar (Ctrl+B)</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                  <span className="font-medium text-xs">Collapse</span>
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
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
