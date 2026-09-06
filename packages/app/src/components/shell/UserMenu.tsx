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
} from "lucide-react";
import {
  Button,
  Badge,
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
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-muted border border-transparent hover:border-subtle transition-all focus:outline-none focus:ring-2 focus:ring-focus text-left"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User Account Menu"
      >
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center font-bold text-xs text-primary-fg shadow-xs">
          {getInitials(user?.fullName)}
        </div>
        <div className="hidden lg:block text-xs leading-tight">
          <div className="font-semibold text-primary truncate max-w-[120px]">
            {user?.fullName || "Operator"}
          </div>
          <div className="text-[10px] text-secondary font-mono">
            {activeContext?.role || "Staff"}
          </div>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-lg border border-strong bg-surface-elevated text-primary shadow-modal py-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Identity Header */}
          <div className="px-4 py-3 border-b border-subtle space-y-1">
            <div className="font-semibold text-sm text-primary">{user?.fullName}</div>
            <div className="text-xs text-secondary font-mono truncate">{user?.email}</div>
            <div className="flex items-center gap-1.5 pt-1.5">
              <Badge variant="accent" className="text-[10px]">
                {activeContext?.role || "STAFF"}
              </Badge>
              {activeContext?.storeName && (
                <span className="text-[11px] text-secondary truncate">
                  • {activeContext.storeName}
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions List */}
          <div className="p-1 space-y-0.5 text-xs">
            {activeContext?.role !== "PLATFORM_ADMIN" && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenContextSwitcher();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-surface-muted text-secondary hover:text-primary transition-colors text-left"
              >
                <Store className="h-4 w-4 text-primary shrink-0" />
                <span>Switch Pharmacy Location</span>
              </button>
            )}

            {activeContext?.role === "PLATFORM_ADMIN" && (
              <Link
                to="/admin/onboarding"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-surface-muted text-secondary hover:text-primary transition-colors text-left"
              >
                <Shield className="h-4 w-4 text-primary shrink-0" />
                <span>Platform Admin Console</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setPasswordDialogOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-surface-muted text-secondary hover:text-primary transition-colors text-left"
            >
              <KeyRound className="h-4 w-4 text-accent shrink-0" />
              <span>Update Account Password</span>
            </button>

            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-surface-muted text-secondary hover:text-primary transition-colors text-left"
            >
              <Palette className="h-4 w-4 text-muted shrink-0" />
              <span>Appearance & Settings</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                useShortcutStore.getState().setShortcutHelpOpen(true);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-surface-muted text-secondary hover:text-primary transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <Keyboard className="h-4 w-4 text-primary shrink-0" />
                <span>Keyboard Shortcuts</span>
              </div>
              <ShortcutHint shortcut="?" compact />
            </button>
          </div>


          {/* Session Termination Actions */}
          <div className="pt-1.5 mt-1.5 border-t border-subtle p-1 space-y-0.5 text-xs">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-danger-subtle text-danger transition-colors text-left"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign Out Current Session</span>
            </button>

            <button
              type="button"
              onClick={handleLogoutAll}
              disabled={isLoggingOutAll}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-danger-subtle text-danger transition-colors text-left disabled:opacity-50"
            >
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Revoke All Other Sessions</span>
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
