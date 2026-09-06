import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  ShieldCheck,
  CreditCard,
  Layers,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
  Globe,
} from "lucide-react";
import { useAuthStore } from "../../../stores/authStore";
import { ShortcutHint } from "@inventra/ui";
import { BrandLogo } from "../../common/BrandLogo";

interface NavItemDef {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

interface NavGroupDef {
  title: string;
  items: NavItemDef[];
}

const ADMIN_SIDEBAR_COLLAPSED_KEY = "inventra_admin_sidebar_collapsed";

const AdminNavGroups: NavGroupDef[] = [
  {
    title: "PLATFORM",
    items: [
      {
        label: "Dashboard",
        to: "/admin/dashboard",
        icon: LayoutDashboard,
        shortcut: "G D",
      },
      {
        label: "Store Onboarding",
        to: "/admin/applications",
        icon: ShieldCheck,
        shortcut: "G A",
      },
    ],
  },
  {
    title: "GLOBAL CATALOG",
    items: [
      {
        label: "Global Medicines",
        to: "/admin/medicines",
        icon: Globe,
        shortcut: "G M",
      },
    ],
  },
  {
    title: "BILLING & LICENSING",
    items: [
      {
        label: "Store Subscriptions",
        to: "/admin/subscriptions",
        icon: CreditCard,
        shortcut: "G S",
      },
    ],
  },
  {
    title: "TALENT & HIRING",
    items: [
      {
        label: "Careers & Candidates",
        to: "/admin/careers",
        icon: Briefcase,
        shortcut: "G J",
      },
    ],
  },
  {
    title: "CONTENT & MARKETING",
    items: [
      {
        label: "Website CMS & Coupons",
        to: "/admin/cms",
        icon: Layers,
        shortcut: "G C",
      },
    ],
  },
];

export const AdminShell: React.FC = () => {
  const { user, logout } = useAuthStore();

  // Persistent collapsed state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-app text-primary antialiased selection:bg-primary selection:text-white transition-colors duration-150 overflow-hidden">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-surface border-r border-subtle flex flex-col transition-all duration-200 ease-in-out shrink-0 h-full ${
          isCollapsed ? "lg:w-[72px]" : "lg:w-60"
        } w-60 transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        aria-label="Platform Admin Sidebar"
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          {!isCollapsed ? (
            <BrandLogo size="sm" showText badgeText="PLATFORM ADMIN" />
          ) : (
            <div className="w-full flex justify-center">
              <BrandLogo size="sm" />
            </div>
          )}

          {/* Mobile close button */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded text-secondary hover:text-primary hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-focus lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-5 text-xs">
          {AdminNavGroups.map((group) => {
            if (group.items.length === 0) return null;
            return (
              <div key={group.title} className="space-y-1">
                {/* Section Header */}
                {!isCollapsed ? (
                  <div className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider text-muted select-none truncate">
                    {group.title}
                  </div>
                ) : (
                  <div className="h-px bg-subtle my-2 mx-2" title={group.title} />
                )}

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
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
                                  isActive ? "text-primary-fg" : "text-muted group-hover:text-primary"
                                }`}
                              />
                              <span className={`truncate ${isCollapsed ? "lg:hidden" : "block"}`}>
                                {item.label}
                              </span>
                            </div>

                            {!isCollapsed && item.shortcut && (
                              <ShortcutHint
                                shortcut={item.shortcut}
                                compact
                                className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                                  isActive ? "text-primary-fg" : "text-muted"
                                }`}
                              />
                            )}

                            {/* Tooltip when collapsed */}
                            {isCollapsed && (
                              <div className="hidden lg:group-hover:flex absolute left-full ml-2 px-2.5 py-1 bg-surface-elevated text-primary text-xs font-medium rounded-md shadow-md border border-subtle whitespace-nowrap z-50 pointer-events-none items-center gap-2">
                                <span>{item.label}</span>
                                {item.shortcut && <ShortcutHint shortcut={item.shortcut} compact />}
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

        {/* Footer */}
        <div className="p-2.5 border-t border-subtle space-y-2">
          {/* Collapse Toggle */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden lg:flex items-center justify-between w-full py-1.5 px-2.5 rounded-md border border-subtle hover:bg-surface-muted hover:text-primary transition-colors text-xs font-sans text-secondary focus:outline-none focus:ring-2 focus:ring-focus cursor-pointer"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <div className="flex items-center justify-center w-full">
                <ChevronRight className="h-4 w-4 shrink-0" />
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

          {/* User Info */}
          {!isCollapsed ? (
            <div className="flex items-center gap-2 px-2 py-2 rounded-md bg-surface-muted border border-subtle">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-fg shrink-0">
                {user?.fullName?.[0]?.toUpperCase() || "A"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-primary truncate leading-tight">
                  {user?.fullName || "Administrator"}
                </p>
                <p className="text-[10px] text-muted truncate">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="p-1 rounded text-muted hover:text-danger hover:bg-danger-subtle transition-colors shrink-0"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="hidden lg:flex justify-center">
              <button
                type="button"
                onClick={() => logout()}
                className="p-2 rounded text-muted hover:text-danger hover:bg-danger-subtle transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Version */}
          {!isCollapsed ? (
            <div className="text-[10px] text-muted font-mono px-1 text-center">
              v1.0.0 · Platform Console
            </div>
          ) : null}
        </div>
      </aside>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Menu Toggle (when sidebar is hidden) */}
        <div className="lg:hidden flex items-center gap-2 p-3 border-b border-subtle bg-surface sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-md text-secondary hover:text-primary hover:bg-surface-muted transition-colors"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center font-mono font-bold text-xs text-primary-fg">
              I
            </div>
            <span className="font-bold text-sm text-primary">Inventra</span>
            <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-primary-subtle text-primary border border-primary-border">
              ADMIN
            </span>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-app transition-all duration-200">
          <div className="w-full min-w-0 p-4 sm:p-6 lg:p-8 transition-all duration-200">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
