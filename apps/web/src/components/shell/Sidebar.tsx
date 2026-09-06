import React, { useState } from "react";
import { NavLink } from "react-router-dom";
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
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { ShortcutHint } from "@inventra/ui";

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItemDef {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  isFuture?: boolean;
  futurePhase?: string;
  allowedRoles?: string[];
}


interface NavGroupDef {
  title: string;
  items: NavItemDef[];
}

const SIDEBAR_COLLAPSED_KEY = "inventra_sidebar_collapsed";

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const activeContext = useAuthStore((state) => state.activeContext);
  const userRole = activeContext?.role || "STAFF";
  const isPlatformAdmin = userRole === "PLATFORM_ADMIN";

  // Persistent collapsed state for desktop
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
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
          label: "Dashboard",
          to: "/dashboard",
          icon: LayoutDashboard,
          shortcut: "G D",
        },
      ],
    },
    {
      title: "OPERATIONS",
      items: [
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
        {
          label: "Catalog & Categories",
          to: "/catalog",
          icon: Layers,
          shortcut: "G C",
        },
        {
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
        {
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
          label: "Universal Data Import",
          to: "/imports",
          icon: UploadCloud,
          shortcut: "G M",
          allowedRoles: ["OWNER", "MANAGER", "ADMIN", "PLATFORM_ADMIN"],
        },
        {
          label: "Registered Devices",
          to: "/devices",
          icon: Smartphone,
          shortcut: "G E",
          allowedRoles: ["OWNER", "ADMIN", "MANAGER"],
        },
        {
          label: "Store Staff & Capacity",
          to: "/users",
          icon: Users,
          allowedRoles: ["OWNER", "ADMIN", "MANAGER"],
        },
        {
          label: "Reports & Analytics",
          to: "/reports",
          icon: BarChart3,
          isFuture: true,
          futurePhase: "Phase F10",
          allowedRoles: ["OWNER", "ADMIN", "MANAGER"],
        },
        {
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
          label: "Onboarding Approvals",
          to: "/admin/onboarding",
          icon: ShieldAlert,
          allowedRoles: ["PLATFORM_ADMIN"],
        },
      ],
    });
  }

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
        className={`fixed lg:static inset-y-0 left-0 z-40 bg-surface border-r border-subtle flex flex-col transition-all duration-200 ease-in-out shrink-0 h-full ${
          isCollapsed ? "lg:w-[72px]" : "lg:w-60"
        } w-60 transform ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        aria-label="Application Sidebar Navigation"
      >
        {/* Mobile Header with Close Button */}
        <div className="flex items-center justify-between p-4 border-b border-subtle lg:hidden">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center font-mono font-bold text-xs text-primary-fg">
              IN
            </div>
            <span className="font-bold text-sm text-primary">INVENTRA ERP</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-secondary hover:text-primary hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-focus"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Navigation Groups */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-5 text-xs">
          {navigationGroups.map((group) => {
            const filteredItems = group.items.filter((item) => {
              if (!item.allowedRoles) return true;
              return item.allowedRoles.includes(userRole) || isPlatformAdmin;
            });

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
                    const isExact = item.to === "/inventory" || item.to === "/catalog" || item.to === "/dashboard" || item.to === "/" || item.to === "/purchasing";
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={isExact}
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
