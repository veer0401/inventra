import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  KeyRound,
  LogOut,
  ShieldAlert,
  ChevronDown,
  Shield,
  Store,
  Palette,
  Keyboard,
  SlidersHorizontal,
} from "lucide-react";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import {
  Button,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  FormField,
  PasswordInput,
  Alert,
  useToast,
  ShortcutHint,
} from "@inventra/ui";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema } from "@inventra/validation";
import { useAuthStore } from "../../stores/authStore";
import { useShortcutStore } from "../../stores/shortcutStore";


interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserMenuProps {
  onOpenContextSwitcher: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onOpenContextSwitcher }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, activeContext, logout, logoutAll, changePassword } = useAuthStore();

  const [isOpen, setIsOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting: isSubmittingPassword },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onChangePasswordSubmit = async (data: ChangePasswordFormValues) => {
    setPasswordError(null);
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success("Password updated successfully. Other active sessions revoked.");
      setPasswordDialogOpen(false);
      reset();
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password.");
    }
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  const handleLogoutAll = async () => {
    setIsLoggingOutAll(true);
    try {
      await logoutAll();
      toast.success("All active sessions revoked.");
      setIsOpen(false);
      navigate("/login", { replace: true });
    } catch {
      toast.error("Failed to revoke all sessions.");
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "OP";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button — Ultra-Compact Desktop Avatar Chip */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1 p-0.5 rounded hover:bg-surface-muted border border-transparent hover:border-subtle transition-all focus:outline-none focus:ring-1 focus:ring-focus text-left cursor-pointer shrink-0"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User Account Menu"
      >
        <div className="h-5.5 w-5.5 rounded-sm bg-surface-muted border border-subtle text-primary flex items-center justify-center font-mono font-bold text-[9px] uppercase shrink-0">
          {getInitials(user?.fullName)}
        </div>
        <ChevronDown
          className={`h-3 w-3 text-muted transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Popover Dropdown — Professional Desktop ERP Identity Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-1 w-76 rounded-md border border-subtle bg-surface-elevated text-primary shadow-xl py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Identity Header Card — Crisp, Non-Wrapping Layout */}
          <div className="px-3 py-2 border-b border-subtle bg-surface-muted/20">
            {/* Row 1: Name and Role Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="h-4.5 w-4.5 rounded-xs bg-primary/10 border border-primary/25 text-primary flex items-center justify-center font-mono font-bold text-[9px] uppercase shrink-0">
                  {getInitials(user?.fullName)}
                </div>
                <span className="font-semibold text-xs text-primary truncate" title={user?.fullName}>
                  {user?.fullName || "Operator"}
                </span>
              </div>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface border border-subtle text-secondary font-semibold shrink-0">
                {activeContext?.role || "STAFF"}
              </span>
            </div>

            {/* Row 2: Monospace Email */}
            <div className="text-[10px] text-muted font-mono truncate mt-1 pl-6" title={user?.email}>
              {user?.email}
            </div>

            {/* Row 3: Active Store Location Chip */}
            {activeContext?.storeName && (
              <div className="mt-2 flex items-center justify-between px-2 py-1 rounded bg-surface border border-subtle text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Store className="h-3 w-3 text-primary shrink-0" />
                  <span className="font-medium text-primary truncate">
                    {activeContext.storeName}
                  </span>
                </div>
                {activeContext.storeCode && (
                  <span className="text-[9px] font-mono text-muted shrink-0 ml-1.5">
                    {activeContext.storeCode}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Section: Operational Workstation */}
          <div className="px-2 pt-2 pb-1 space-y-0.5 text-xs">
            <div className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted">
              Workstation & Location
            </div>

            {activeContext?.role !== "PLATFORM_ADMIN" && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenContextSwitcher();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-muted text-secondary hover:text-primary transition-colors text-left cursor-pointer"
              >
                <Store className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Switch Pharmacy Location</span>
              </button>
            )}

            {activeContext?.role === "PLATFORM_ADMIN" && (
              <Link
                to="/admin/onboarding"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-muted text-secondary hover:text-primary transition-colors text-left"
              >
                <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Platform Admin Console</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                useWorkspaceStore.getState().setCustomizerOpen(true);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-muted text-secondary hover:text-primary transition-colors text-left cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Customize ERP Workspace</span>
            </button>
          </div>

          {/* Section: Account & Preferences */}
          <div className="px-2 pt-1 pb-1 border-t border-subtle/60 space-y-0.5 text-xs">
            <div className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted">
              Preferences & Access
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setPasswordDialogOpen(true);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-muted text-secondary hover:text-primary transition-colors text-left cursor-pointer"
            >
              <KeyRound className="h-3.5 w-3.5 text-muted shrink-0" />
              <span>Update Password</span>
            </button>

            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-muted text-secondary hover:text-primary transition-colors text-left"
            >
              <Palette className="h-3.5 w-3.5 text-muted shrink-0" />
              <span>Appearance & Display</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                useShortcutStore.getState().setShortcutHelpOpen(true);
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-surface-muted text-secondary hover:text-primary transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Keyboard className="h-3.5 w-3.5 text-muted shrink-0" />
                <span>Keyboard Shortcuts</span>
              </div>
              <ShortcutHint shortcut="?" compact />
            </button>
          </div>

          {/* Section: Session Termination */}
          <div className="px-2 pt-1 border-t border-subtle/80 space-y-0.5 text-xs">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-danger-subtle text-danger transition-colors text-left cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span>Sign Out Session</span>
            </button>

            <button
              type="button"
              onClick={handleLogoutAll}
              disabled={isLoggingOutAll}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-danger-subtle text-danger/80 hover:text-danger text-[11px] transition-colors text-left disabled:opacity-50 cursor-pointer"
            >
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>{isLoggingOutAll ? "Revoking..." : "Revoke All Other Sessions"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Password Change Dialog Modal */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogHeader>
          <DialogTitle>Update Account Password</DialogTitle>
          <DialogDescription>
            Change your password. Upon saving, all other active browser and terminal sessions will be revoked.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onChangePasswordSubmit)} className="space-y-4">
          {passwordError && (
            <Alert variant="danger" title="Update Failed">
              {passwordError}
            </Alert>
          )}

          <FormField
            label="Current Password"
            htmlFor="user-menu-current-pwd"
            required
            error={errors.currentPassword?.message}
          >
            <PasswordInput
              id="user-menu-current-pwd"
              placeholder="Enter current password"
              disabled={isSubmittingPassword}
              error={Boolean(errors.currentPassword)}
              {...register("currentPassword")}
            />
          </FormField>

          <FormField
            label="New Password"
            htmlFor="user-menu-new-pwd"
            required
            error={errors.newPassword?.message}
          >
            <PasswordInput
              id="user-menu-new-pwd"
              placeholder="Minimum 8 characters"
              disabled={isSubmittingPassword}
              error={Boolean(errors.newPassword)}
              {...register("newPassword")}
            />
          </FormField>

          <FormField
            label="Confirm New Password"
            htmlFor="user-menu-confirm-pwd"
            required
            error={errors.confirmPassword?.message}
          >
            <PasswordInput
              id="user-menu-confirm-pwd"
              placeholder="Re-enter new password"
              disabled={isSubmittingPassword}
              error={Boolean(errors.confirmPassword)}
              {...register("confirmPassword")}
            />
          </FormField>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPasswordDialogOpen(false)}
              disabled={isSubmittingPassword}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingPassword}
            >
              Update Password
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
};
