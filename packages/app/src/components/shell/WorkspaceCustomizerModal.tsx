import React, { useState, useEffect } from "react";
import {
  SlidersHorizontal,
  RotateCcw,
  Check,
  ChevronUp,
  ChevronDown,
  Layers,
  Wrench,
} from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
  useToast,
} from "@inventra/ui";
import { useAuthStore } from "../../stores/authStore";
import { useWorkspaceStore, MAX_PRIMARY_NAV_ITEMS } from "../../stores/workspaceStore";
import {
  getAllAvailableNavItems,
  CANONICAL_NAVIGATION_GROUPS,
  isNavAuthorized,
  NavItemDef,
} from "./navigationRegistry";
import {
  CANONICAL_QUICK_TOOLS,
  isQuickToolAuthorized,
} from "./quickToolsRegistry";

export const WorkspaceCustomizerModal: React.FC = () => {
  const {
    isCustomizerOpen,
    setCustomizerOpen,
    primaryNavIds,
    quickToolIds,
    setPrimaryNavIds,
    setQuickToolIds,
    resetToRoleDefaults,
  } = useWorkspaceStore();

  const userRole = useAuthStore((state) => state.activeContext?.role || "STAFF");
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<"nav" | "tools">("nav");

  // Local draft state during modal edit session
  const [draftNavIds, setDraftNavIds] = useState<string[]>(primaryNavIds);
  const [draftToolIds, setDraftToolIds] = useState<string[]>(quickToolIds);

  useEffect(() => {
    if (isCustomizerOpen) {
      setDraftNavIds(primaryNavIds);
      setDraftToolIds(quickToolIds);
    }
  }, [isCustomizerOpen, primaryNavIds, quickToolIds]);

  // All available navigation items authorized for role
  const availableNavItems = getAllAvailableNavItems(userRole);
  // Also collect child items that can be pinned directly
  const allNavOptions: NavItemDef[] = [...availableNavItems];
  CANONICAL_NAVIGATION_GROUPS.forEach((group) => {
    group.items.forEach((item) => {
      if (item.children) {
        item.children.forEach((child) => {
          if (isNavAuthorized(child, userRole)) {
            allNavOptions.push({
              id: child.id,
              label: child.label,
              to: child.to,
              icon: child.icon || item.icon,
              shortcut: child.shortcut,
              allowedRoles: child.allowedRoles,
            });
          }
        });
      }
    });
  });

  // Deduplicate options by ID
  const uniqueNavOptions = Array.from(
    new Map(allNavOptions.map((item) => [item.id, item])).values()
  );

  const availableQuickTools = CANONICAL_QUICK_TOOLS.filter((tool) =>
    isQuickToolAuthorized(tool, userRole)
  );

  // Handlers for Nav items
  const handleToggleNav = (id: string) => {
    if (draftNavIds.includes(id)) {
      if (draftNavIds.length <= 1) {
        toast.warning("At least one navigation tab must remain active.");
        return;
      }
      setDraftNavIds(draftNavIds.filter((item) => item !== id));
    } else {
      if (draftNavIds.length >= MAX_PRIMARY_NAV_ITEMS) {
        toast.warning(
          `Top bar limit reached (${MAX_PRIMARY_NAV_ITEMS} tabs max). Additional modules remain accessible under More ▾.`
        );
        return;
      }
      setDraftNavIds([...draftNavIds, id]);
    }
  };

  const handleMoveNav = (index: number, direction: "up" | "down") => {
    const next = [...draftNavIds];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    setDraftNavIds(next);
  };

  // Handlers for Quick Tools
  const handleToggleTool = (id: string) => {
    if (draftToolIds.includes(id)) {
      if (draftToolIds.length <= 1) {
        toast.warning("At least one quick tool must remain active.");
        return;
      }
      setDraftToolIds(draftToolIds.filter((item) => item !== id));
    } else {
      setDraftToolIds([...draftToolIds, id]);
    }
  };

  const handleMoveTool = (index: number, direction: "up" | "down") => {
    const next = [...draftToolIds];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    setDraftToolIds(next);
  };

  const handleSave = () => {
    setPrimaryNavIds(draftNavIds);
    setQuickToolIds(draftToolIds);
    toast.success("Workspace layout saved successfully.");
    setCustomizerOpen(false);
  };

  const handleReset = () => {
    resetToRoleDefaults(userRole);
    toast.info(`Reset workspace to default layout for ${userRole}.`);
    setCustomizerOpen(false);
  };

  return (
    <Dialog open={isCustomizerOpen} onOpenChange={setCustomizerOpen}>
      <div className="w-full max-w-xl p-5 bg-surface rounded-lg border border-subtle shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="space-y-1 shrink-0 pr-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-primary-subtle text-primary border border-primary/20">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-primary">
                Customize ERP Workspace
              </DialogTitle>
              <DialogDescription className="text-xs text-secondary">
                Tailor your top navigation tabs and pharmacy quick tools for maximum operational density.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 border-b border-subtle pb-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("nav")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
              activeTab === "nav"
                ? "bg-surface-muted text-primary border-b-2 border-primary"
                : "text-secondary hover:text-primary"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Top Navigation Tabs</span>
            <Badge variant="outline" className="text-[10px] ml-1 py-0 px-1">
              {draftNavIds.length}/{MAX_PRIMARY_NAV_ITEMS} active
            </Badge>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tools")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
              activeTab === "tools"
                ? "bg-surface-muted text-primary border-b-2 border-primary"
                : "text-secondary hover:text-primary"
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>Pharmacy Quick Tools</span>
            <Badge variant="outline" className="text-[10px] ml-1 py-0 px-1">
              {draftToolIds.length} visible
            </Badge>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[260px]">
          {activeTab === "nav" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-secondary">
                <span>Active Top Tabs (Ordered left to right)</span>
                <span className="text-[11px] text-muted">Use arrows to reorder</span>
              </div>

              {/* Active / Ordered List */}
              <div className="space-y-1.5">
                {draftNavIds.map((id, index) => {
                  const item = uniqueNavOptions.find((opt) => opt.id === id);
                  if (!item) return null;
                  const Icon = item.icon;
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between p-2 rounded border border-subtle bg-surface-muted/60 text-xs text-primary"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-muted text-[11px] w-4">
                          {index + 1}.
                        </span>
                        {Icon && <Icon className="h-3.5 w-3.5 text-primary shrink-0" />}
                        <span className="font-medium truncate">{item.label}</span>
                        {item.shortcut && (
                          <span className="font-mono text-[10px] text-muted px-1 rounded bg-surface border border-subtle">
                            {item.shortcut}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveNav(index, "up")}
                          className="p-1 rounded hover:bg-surface text-secondary hover:text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          title="Move Left / Earlier"
                          aria-label={`Move ${item.label} up`}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === draftNavIds.length - 1}
                          onClick={() => handleMoveNav(index, "down")}
                          className="p-1 rounded hover:bg-surface text-secondary hover:text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          title="Move Right / Later"
                          aria-label={`Move ${item.label} down`}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleNav(id)}
                          className="text-[11px] text-danger-fg hover:underline ml-2 px-1"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Inactive / Addable Modules */}
              {uniqueNavOptions.filter((opt) => !draftNavIds.includes(opt.id)).length > 0 && (
                <div className="pt-2 border-t border-subtle space-y-2">
                  <span className="text-xs text-secondary font-medium">
                    Available Modules to Add to Top Bar
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {uniqueNavOptions
                      .filter((opt) => !draftNavIds.includes(opt.id))
                      .map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleToggleNav(opt.id)}
                            className="flex items-center justify-between p-2 rounded border border-dashed border-subtle hover:border-primary/40 hover:bg-surface-muted text-xs text-secondary hover:text-primary text-left transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2 truncate">
                              {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                              <span className="truncate">{opt.label}</span>
                            </div>
                            <span className="text-[11px] text-primary font-semibold shrink-0">
                              + Add
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-secondary">
                <span>Active Pharmacy Quick Tools</span>
                <span className="text-[11px] text-muted">Use arrows to reorder</span>
              </div>

              {/* Active Tools */}
              <div className="space-y-1.5">
                {draftToolIds.map((id, index) => {
                  const tool = availableQuickTools.find((t) => t.id === id);
                  if (!tool) return null;
                  const Icon = tool.icon;
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between p-2 rounded border border-subtle bg-surface-muted/60 text-xs text-primary"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-muted text-[11px] w-4">
                          {index + 1}.
                        </span>
                        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                        <div>
                          <span className="font-medium">{tool.label}</span>
                          <span className="text-[11px] text-muted block truncate max-w-xs">
                            {tool.description}
                          </span>
                        </div>
                        {tool.shortcut && (
                          <span className="font-mono text-[10px] text-muted px-1 rounded bg-surface border border-subtle shrink-0">
                            {tool.shortcut}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveTool(index, "up")}
                          className="p-1 rounded hover:bg-surface text-secondary hover:text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          aria-label={`Move ${tool.label} up`}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === draftToolIds.length - 1}
                          onClick={() => handleMoveTool(index, "down")}
                          className="p-1 rounded hover:bg-surface text-secondary hover:text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          aria-label={`Move ${tool.label} down`}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleTool(id)}
                          className="text-[11px] text-danger-fg hover:underline ml-2 px-1"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Addable Tools */}
              {availableQuickTools.filter((t) => !draftToolIds.includes(t.id)).length > 0 && (
                <div className="pt-2 border-t border-subtle space-y-2">
                  <span className="text-xs text-secondary font-medium">
                    Available Tools to Add
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {availableQuickTools
                      .filter((t) => !draftToolIds.includes(t.id))
                      .map((tool) => {
                        const Icon = tool.icon;
                        return (
                          <button
                            key={tool.id}
                            type="button"
                            onClick={() => handleToggleTool(tool.id)}
                            className="flex items-center justify-between p-2 rounded border border-dashed border-subtle hover:border-primary/40 hover:bg-surface-muted text-xs text-secondary hover:text-primary text-left transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{tool.label}</span>
                            </div>
                            <span className="text-[11px] text-primary font-semibold shrink-0">
                              + Add
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="pt-3 border-t border-subtle flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-muted hover:text-primary flex items-center gap-1.5 h-8"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset to Role Defaults</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCustomizerOpen(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              className="text-xs flex items-center gap-1.5 h-8"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Save Preferences</span>
            </Button>
          </div>
        </DialogFooter>
      </div>
    </Dialog>
  );
};
