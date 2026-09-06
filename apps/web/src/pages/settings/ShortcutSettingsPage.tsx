import React, { useState, useEffect, useMemo } from "react";
import {
  Keyboard,
  Plus,
  RotateCcw,
  Trash2,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Badge,
  ShortcutHint,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  FormField,
  useToast,
  Spinner,
} from "@inventra/ui";
import {
  useShortcutStore,
  DEFAULT_COMMANDS,
  CommandDefinition,
} from "../../stores/shortcutStore";
import { ShortcutRecorderModal } from "../../components/command/ShortcutRecorderModal";

export const ShortcutSettingsPage: React.FC = () => {
  const toast = useToast();
  const {
    profiles,
    activeProfile,
    activeKeymap,
    isLoading,
    fetchProfiles,
    createProfile,
    updateProfile,
    activateProfile,
    deleteProfile,
    resetProfile,
    setShortcutOverride,
  } = useShortcutStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [editingCommand, setEditingCommand] = useState<CommandDefinition | null>(null);

  // Profile creation modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileDesc, setNewProfileDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Rename modal
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renamingProfileId, setRenamingProfileId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState("");

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const filteredCommands = useMemo(() => {
    return DEFAULT_COMMANDS.filter((cmd) => {
      const matchCategory =
        selectedCategory === "ALL" ||
        (selectedCategory === "NAVIGATION" && cmd.category === "NAVIGATION") ||
        (selectedCategory === "CREATE" && cmd.category === "CREATE") ||
        (selectedCategory === "ACTIONS" && (cmd.category === "ACTIONS" || cmd.scope === "POS")) ||
        (selectedCategory === "SYSTEM" && cmd.category === "SYSTEM");

      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchCategory;

      const boundKey = (activeKeymap[cmd.id] || cmd.defaultBinding).toLowerCase();
      const matchText =
        cmd.label.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        boundKey.includes(q);

      return matchCategory && matchText;
    });
  }, [searchQuery, selectedCategory, activeKeymap]);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    if (profiles.length >= 3) {
      toast.error("You can save up to 3 shortcut profiles. Delete an existing profile first.");
      return;
    }

    setIsCreating(true);
    try {
      await createProfile(newProfileName.trim(), newProfileDesc.trim() || undefined);
      toast.success(`Shortcut profile "${newProfileName}" created and activated.`);
      setCreateModalOpen(false);
      setNewProfileName("");
      setNewProfileDesc("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create profile");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRenameProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingProfileId || !renamingName.trim()) return;

    try {
      await updateProfile(renamingProfileId, renamingName.trim());
      toast.success("Profile renamed successfully.");
      setRenameModalOpen(false);
      setRenamingProfileId(null);
      setRenamingName("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to rename profile");
    }
  };

  const handleActivateProfile = async (id: string, name: string) => {
    try {
      await activateProfile(id);
      toast.success(`Activated "${name}" shortcut profile.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to activate profile");
    }
  };

  const handleDeleteProfile = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete profile "${name}"?`)) {
      return;
    }
    try {
      await deleteProfile(id);
      toast.success(`Profile "${name}" deleted.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete profile");
    }
  };

  const handleResetProfile = async () => {
    if (!activeProfile) return;
    if (!window.confirm(`Reset all custom shortcuts in "${activeProfile.name}" to application defaults?`)) {
      return;
    }
    try {
      await resetProfile(activeProfile.id);
      toast.success(`Shortcuts for "${activeProfile.name}" reset to defaults.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset profile");
    }
  };

  const handleSaveShortcut = async (newBinding: string) => {
    if (!editingCommand) return;
    try {
      await setShortcutOverride(editingCommand.id, newBinding);
      toast.success(`Shortcut for ${editingCommand.label} set to ${newBinding}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save shortcut");
    }
  };

  const handleResetSingleShortcut = async (cmd: CommandDefinition) => {
    try {
      await setShortcutOverride(cmd.id, cmd.defaultBinding);
      toast.success(`Reset ${cmd.label} to default (${cmd.defaultBinding})`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset shortcut");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2.5">
            <Keyboard className="h-6 w-6 text-primary" />
            <span>Keyboard Shortcuts & Profiles</span>
          </h1>
          <p className="text-xs text-secondary mt-1">
            Customize workstation hotkeys and manage custom shortcut profiles for rapid daily operations.
          </p>
        </div>
      </div>

      {/* 1. Shortcut Profiles Manager Card */}
      <Card className="shadow-card border-subtle">
        <CardHeader className="pb-3 border-b border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base text-primary flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <span>Active Shortcut Profile</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Saved profiles are synchronized securely to your user account across all devices.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted">
              {profiles.length} of 3 profiles
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              disabled={profiles.length >= 3}
              className="flex items-center gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Profile</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {isLoading ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted">
              <Spinner size="sm" />
              <span>Loading shortcut profiles...</span>
            </div>
          ) : profiles.length === 0 ? (
            <div className="p-4 rounded-lg bg-surface-muted/50 border border-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-secondary">
                <span className="font-semibold text-primary">System Default Profile Active:</span> You are currently using Inventra standard ERP keybindings.
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCreateModalOpen(true)}
                className="text-xs shrink-0"
              >
                Create Custom Profile
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {profiles.map((p) => {
                const isActive = p.isActive;
                const overridesCount = Object.keys(p.shortcuts || {}).length;

                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                      isActive
                        ? "bg-accent-subtle/20 border-accent shadow-xs"
                        : "bg-surface border-subtle hover:border-strong"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-primary truncate">
                          {p.name}
                        </span>
                        {isActive ? (
                          <Badge variant="accent" className="text-[10px] px-1.5 py-0">
                            ACTIVE
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActivateProfile(p.id, p.name)}
                            className="text-xs text-primary hover:underline h-6 px-2"
                          >
                            Activate
                          </Button>

                        )}
                      </div>
                      <p className="text-[11px] text-muted mt-1 line-clamp-1">
                        {p.description || "Custom user profile"}
                      </p>
                      <div className="mt-2 text-[10px] font-mono text-secondary">
                        {overridesCount === 0
                          ? "Using default bindings"
                          : `${overridesCount} custom keybinding${overridesCount === 1 ? "" : "s"}`}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-subtle flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingProfileId(p.id);
                          setRenamingName(p.name);
                          setRenameModalOpen(true);
                        }}
                        className="text-muted hover:text-primary transition-colors text-[11px]"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProfile(p.id, p.name)}
                        className="text-danger hover:text-danger/80 transition-colors p-1"
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Keybinding Customization Table Card */}
      <Card className="shadow-card border-subtle">
        <CardHeader className="pb-3 border-b border-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base text-primary flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-primary" />
              <span>Keybinding Registry</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Click &quot;Edit&quot; on any action to record a custom hotkey or sequence.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {activeProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetProfile}
                className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset All to Defaults</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                type="search"
                placeholder="Search shortcuts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {["ALL", "NAVIGATION", "CREATE", "ACTIONS", "SYSTEM"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold font-mono transition-colors ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-fg shadow-xs"
                      : "bg-surface-muted text-secondary hover:text-primary"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-muted/60 text-muted font-mono uppercase text-[10px] tracking-wider border-b border-subtle">
                    <th className="py-2.5 px-4 font-semibold">Action / Command</th>
                    <th className="py-2.5 px-3 font-semibold">Scope</th>
                    <th className="py-2.5 px-3 font-semibold">Current Keymap</th>
                    <th className="py-2.5 px-3 font-semibold">Default</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {filteredCommands.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted text-xs">
                        No matching shortcuts found.
                      </td>
                    </tr>
                  ) : (
                    filteredCommands.map((cmd) => {
                      const currentBinding = activeKeymap[cmd.id] || cmd.defaultBinding;
                      const isCustom = currentBinding !== cmd.defaultBinding;

                      return (
                        <tr
                          key={cmd.id}
                          className="hover:bg-surface-muted/40 transition-colors group"
                        >
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-primary">{cmd.label}</div>
                            <div className="text-[11px] text-muted line-clamp-1">{cmd.description}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated border border-subtle text-secondary">
                              {cmd.scope}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <ShortcutHint shortcut={currentBinding} compact />
                              {isCustom && (
                                <Badge variant="accent" className="text-[9px] px-1 py-0">
                                  CUSTOM
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-muted font-mono text-[11px]">
                            {cmd.defaultBinding}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingCommand(cmd)}
                                className="text-xs h-7 px-2.5"
                              >
                                Edit
                              </Button>
                              {isCustom && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResetSingleShortcut(cmd)}
                                  className="text-xs h-7 px-2 text-muted hover:text-primary"
                                  title="Reset to default"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              )}
                            </div>

                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Edit / Record Shortcut */}
      {editingCommand && (
        <ShortcutRecorderModal
          command={editingCommand}
          currentBinding={activeKeymap[editingCommand.id] || editingCommand.defaultBinding}
          onClose={() => setEditingCommand(null)}
          onSave={handleSaveShortcut}
        />
      )}

      {/* Modal: Create Profile */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateProfile}>
            <DialogHeader>
              <DialogTitle className="text-base text-primary">Create Shortcut Profile</DialogTitle>
              <DialogDescription className="text-xs text-secondary">
                You can save up to 3 custom hotkey profiles (e.g. POS Fast Mode, Warehouse Mode).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <FormField label="Profile Name *" required>
                <Input
                  required
                  placeholder="e.g. POS Fast Checkout"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="text-xs"
                />
              </FormField>

              <FormField label="Description (Optional)">
                <Input
                  placeholder="e.g. Rapid single-key hotkeys for cashier dispensary"
                  value={newProfileDesc}
                  onChange={(e) => setNewProfileDesc(e.target.value)}
                  className="text-xs"
                />
              </FormField>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!newProfileName.trim() || isCreating}
              >
                {isCreating ? "Creating..." : "Create & Activate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Rename Profile */}
      <Dialog open={renameModalOpen} onOpenChange={setRenameModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleRenameProfile}>
            <DialogHeader>
              <DialogTitle className="text-base text-primary">Rename Profile</DialogTitle>
            </DialogHeader>
            <div className="py-3">
              <FormField label="Profile Name *" required>
                <Input
                  required
                  value={renamingName}
                  onChange={(e) => setRenamingName(e.target.value)}
                  className="text-xs"
                />
              </FormField>
            </div>
            <DialogFooter className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRenameModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!renamingName.trim()}
              >
                Save Name
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
