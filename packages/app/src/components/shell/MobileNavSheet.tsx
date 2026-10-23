import React from "react";
import { NavLink } from "react-router-dom";
import { X, SlidersHorizontal, Sparkles } from "lucide-react";
import { BrandLogo } from "../common/BrandLogo";
import { useAuthStore } from "../../stores/authStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useShortcutStore } from "../../stores/shortcutStore";
import { getAuthorizedNavGroups } from "./navigationRegistry";

export interface MobileNavSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNavSheet: React.FC<MobileNavSheetProps> = ({ isOpen, onClose }) => {
  const activeContext = useAuthStore((state) => state.activeContext);
  const userRole = activeContext?.role || "STAFF";
  const { setCustomizerOpen } = useWorkspaceStore();
  const { toggleCopilot } = useShortcutStore();

  const groups = getAuthorizedNavGroups(userRole);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 z-50 lg:hidden animate-in fade-in-0 duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-surface border-r border-subtle z-50 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-3 border-b border-subtle shrink-0">
          <BrandLogo size="sm" showText badgeText="ERP" />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-secondary hover:text-primary hover:bg-surface-muted transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Workspace Quick Actions */}
        <div className="p-2 border-b border-subtle bg-surface-muted/30 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              setCustomizerOpen(true);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded border border-subtle bg-surface hover:bg-surface-muted text-primary transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span>Customize Tabs</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              toggleCopilot();
            }}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded border border-subtle bg-surface hover:bg-surface-muted text-primary transition-colors"
            title="Inventra Intelligence"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>AI</span>
          </button>
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          {groups.map((group) => (
            <div key={group.id} className="space-y-1">
              <div className="text-[10px] font-bold tracking-wider text-muted uppercase px-2 mb-1">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  if (item.children) {
                    return (
                      <div key={item.id} className="space-y-0.5">
                        <div className="px-2 py-1 font-semibold text-secondary flex items-center gap-2 text-[11px]">
                          <Icon className="h-3.5 w-3.5 text-muted" />
                          <span>{item.label}</span>
                        </div>
                        <div className="pl-4 space-y-0.5 border-l border-subtle ml-3">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon || Icon;
                            return (
                              <NavLink
                                key={child.to}
                                to={child.to}
                                onClick={onClose}
                                className={({ isActive }) =>
                                  `flex items-center gap-2 px-2.5 py-1.5 rounded transition-colors ${
                                    isActive
                                      ? "bg-primary-subtle text-primary font-semibold"
                                      : "text-secondary hover:text-primary hover:bg-surface-muted"
                                  }`
                                }
                              >
                                <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                                <span>{child.label}</span>
                              </NavLink>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      key={item.to || item.id}
                      to={item.to || "/"}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
                          isActive
                            ? "bg-primary-subtle text-primary font-semibold"
                            : "text-secondary hover:text-primary hover:bg-surface-muted"
                        }`
                      }
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
