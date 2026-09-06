import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema } from "@inventra/validation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  FormField,
  PasswordInput,
  Alert,
  Badge,
  useToast,
} from "@inventra/ui";
import {
  ShieldAlert,
  KeyRound,
  User,
  Store,
  Palette,
  ShieldCheck,
  Command,
  ArrowRight,
  ExternalLink,
  CreditCard,
  Database,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { AppearanceSection } from "./AppearanceSection";
import { SessionsSection } from "./SessionsSection";
import { BillingPlanSection } from "./BillingPlanSection";
import { OfflineStorageSection } from "./OfflineStorageSection";

interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type SettingsTab = "appearance" | "profile" | "security" | "shortcuts" | "billing" | "offline";

interface TabItem {
  id: SettingsTab;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabItem[] = [
  {
    id: "appearance",
    label: "Appearance & Theme",
    description: "Display mode, UI density, high contrast, and workstation styling",
    icon: Palette,
  },
  {
    id: "profile",
    label: "Profile & Context",
    description: "Operator identity, contact credentials, and dispensary store assignment",
    icon: User,
  },
  {
    id: "security",
    label: "Security & Sessions",
    description: "Active device sessions, login locations, and credential management",
    icon: ShieldCheck,
  },
  {
    id: "shortcuts",
    label: "Keyboard Shortcuts",
    description: "Rapid navigation hotkeys, POS keymaps, and operational profiles",
    icon: KeyRound,
  },
  {
    id: "billing",
    label: "Plan & Billing",
    description: "Current planning tier, renewal due date, workstation quotas, and GST tax invoices",
    icon: CreditCard,
  },
  {
    id: "offline",
    label: "Offline & Local DB",
    description: "Embedded SQLite database, offline queue diagnostics, and station isolation",
    icon: Database,
  },
];

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { user, activeContext, changePassword, logoutAll } = useAuthStore();

  const tabParam = searchParams.get("tab") as SettingsTab | null;
  const activeTab: SettingsTab =
    tabParam && ["appearance", "profile", "security", "shortcuts", "billing", "offline"].includes(tabParam)
      ? tabParam
      : "appearance";

  const handleTabChange = (tabId: SettingsTab) => {
    setSearchParams({ tab: tabId });
  };

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

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
    setPasswordSuccess(false);
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setPasswordSuccess(true);
      toast.success("Password changed successfully. All other active sessions have been revoked.");
      reset();
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password.");
    }
  };

  const handleLogoutAll = async () => {
    setIsLoggingOutAll(true);
    try {
      await logoutAll();
      toast.success("All active sessions revoked.");
      navigate("/login", { replace: true });
    } catch {
      toast.error("Failed to revoke all sessions.");
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Page Header & Header Tabs */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Workstation & Account Settings</h1>
          <p className="text-xs text-secondary mt-1">
            Customize your interface theme, manage operator credentials, inspect active device sessions, configure keybindings, and manage your subscription plan.
          </p>
        </div>

        {/* Header Tab Navigation Bar (Underline Header Style) */}
        <div className="border-b border-subtle">
          <nav className="flex flex-wrap items-center gap-1 sm:gap-2 -mb-px" aria-label="Settings Tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`group relative pb-3 pt-2.5 px-3.5 sm:px-4 text-xs sm:text-sm font-medium transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                    isActive
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-secondary hover:text-primary hover:border-border-strong"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? "text-primary" : "text-muted group-hover:text-secondary"
                    }`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab 1: Appearance & Theme */}
      {activeTab === "appearance" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <AppearanceSection />
        </div>
      )}

      {/* Tab 2: Operator Profile & Context */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in-50 duration-200">
          {/* Operator Profile Card */}
          <Card className="shadow-card border-subtle">
            <CardHeader className="pb-3 border-b border-subtle">
              <CardTitle className="text-base text-primary flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Operator Profile
              </CardTitle>
              <CardDescription className="text-secondary text-xs">
                Cryptographic account information registered on Inventra backend.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs">
              <div className="space-y-1">
                <span className="text-secondary font-medium">Full Legal Name</span>
                <div className="text-sm font-semibold text-primary">{user?.fullName || "Authenticated Operator"}</div>
              </div>

              <div className="space-y-1">
                <span className="text-secondary font-medium">Email Address</span>
                <div className="text-sm font-mono text-primary">{user?.email}</div>
              </div>

              <div className="space-y-1">
                <span className="text-secondary font-medium">Phone Number</span>
                <div className="text-sm text-primary">{user?.phoneNumber || "Not registered"}</div>
              </div>

              <div className="pt-2 border-t border-subtle flex items-center justify-between">
                <span className="text-secondary">Account Status</span>
                <Badge variant="success" className="font-mono text-[10px]">
                  {user?.status || "ACTIVE"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-secondary">Email Verification</span>
                <Badge variant={user?.emailVerified ? "success" : "warning"} className="font-mono text-[10px]">
                  {user?.emailVerified ? "VERIFIED" : "PENDING"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Operational Context Card */}
          <Card className="shadow-card border-subtle">
            <CardHeader className="pb-3 border-b border-subtle">
              <CardTitle className="text-base text-primary flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                Active Workspace Context
              </CardTitle>
              <CardDescription className="text-secondary text-xs">
                Current business entity and branch assignment for this session.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs">
              <div className="space-y-1">
                <span className="text-secondary font-medium">Pharmacy Business Entity</span>
                <div className="text-sm font-semibold text-primary">{activeContext?.businessName || "Global Entity"}</div>
              </div>

              <div className="space-y-1">
                <span className="text-secondary font-medium">Dispensary Branch Location</span>
                <div className="text-sm text-primary flex items-center gap-2">
                  <span>{activeContext?.storeName || "Global Console"}</span>
                  {activeContext?.storeCode && (
                    <span className="text-[10px] font-mono bg-surface-muted px-1.5 py-0.5 rounded border border-subtle text-primary">
                      {activeContext.storeCode}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-secondary font-medium">Authorized Role</span>
                <div>
                  <Badge variant="accent" className="font-mono text-[10px]">
                    {activeContext?.role || "OPERATOR"}
                  </Badge>
                </div>
              </div>

              <div className="pt-2 border-t border-subtle flex items-center justify-between">
                <span className="text-secondary">Session Mode</span>
                <span className="text-[10px] font-mono text-primary font-bold">ONLINE WORKSTATION</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: Security & Sessions */}
      {activeTab === "security" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Active Sessions & Login Locations */}
          <SessionsSection />

          {/* Password Security Card */}
          <Card className="shadow-card border-subtle">
            <CardHeader className="pb-3 border-b border-subtle">
              <CardTitle className="text-base text-primary flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                Change Password
              </CardTitle>
              <CardDescription className="text-secondary text-xs">
                Updating your password automatically revokes all active refresh tokens on other devices.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit(onChangePasswordSubmit)}>
              <CardContent className="space-y-4 pt-4 max-w-lg">
                {passwordError && (
                  <Alert variant="danger" title="Password Update Failed">
                    {passwordError}
                  </Alert>
                )}

                {passwordSuccess && (
                  <Alert variant="success" title="Success">
                    Password updated successfully.
                  </Alert>
                )}

                <FormField
                  label="Current Password"
                  htmlFor="currentPassword"
                  required
                  error={errors.currentPassword?.message}
                >
                  <PasswordInput
                    id="currentPassword"
                    placeholder="Enter current password"
                    disabled={isSubmittingPassword}
                    error={Boolean(errors.currentPassword)}
                    {...register("currentPassword")}
                  />
                </FormField>

                <FormField
                  label="New Password"
                  htmlFor="newPassword"
                  required
                  error={errors.newPassword?.message}
                >
                  <PasswordInput
                    id="newPassword"
                    placeholder="Min 8 chars, 1 number, 1 uppercase, 1 special char"
                    disabled={isSubmittingPassword}
                    error={Boolean(errors.newPassword)}
                    {...register("newPassword")}
                  />
                </FormField>

                <FormField
                  label="Confirm New Password"
                  htmlFor="confirmPassword"
                  required
                  error={errors.confirmPassword?.message}
                >
                  <PasswordInput
                    id="confirmPassword"
                    placeholder="Re-enter new password"
                    disabled={isSubmittingPassword}
                    error={Boolean(errors.confirmPassword)}
                    {...register("confirmPassword")}
                  />
                </FormField>
              </CardContent>

              <CardFooter className="pt-4 border-t border-subtle flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmittingPassword}
                >
                  Update Password
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Emergency Session Revocation Card */}
          <Card className="border-danger/30 bg-danger-subtle/20 shadow-card">
            <CardHeader className="pb-3 border-b border-danger/20">
              <CardTitle className="text-base text-danger flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-danger" />
                Emergency Account Lockdown
              </CardTitle>
              <CardDescription className="text-secondary text-xs">
                Emergency revocation of all active sessions and refresh tokens across all terminals and browsers.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              <p className="text-xs text-secondary mb-4">
                If you suspect unauthorized access or device loss, revoke all active sessions immediately. You will be logged out of this device and required to authenticate again.
              </p>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleLogoutAll}
                isLoading={isLoggingOutAll}
              >
                Revoke All Active Sessions
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 4: Keyboard Shortcuts & Profiles */}
      {activeTab === "shortcuts" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <Card className="shadow-card border-subtle">
            <CardHeader className="pb-3 border-b border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base text-primary flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <span>Keyboard Shortcuts & Operational Profiles</span>
                </CardTitle>
                <CardDescription className="text-secondary text-xs">
                  Review and customize rapid navigation hotkeys, POS billing shortcuts, and switch between operational keymaps.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => navigate("/settings/shortcuts")}
                className="text-xs shrink-0"
              >
                Open Shortcut Manager
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-subtle bg-surface-muted/30 space-y-2">
                  <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Command className="h-3.5 w-3.5 text-accent" />
                    Global Navigation
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-secondary">Quick Search</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-surface border border-subtle rounded text-primary">Ctrl + K</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-secondary">Toggle Sidebar</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-surface border border-subtle rounded text-primary">Ctrl + B</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-secondary">Settings & Theme</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-surface border border-subtle rounded text-primary">Ctrl + ,</kbd>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-subtle bg-surface-muted/30 space-y-2">
                  <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5 text-emerald-500" />
                    Dispensary & POS
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-secondary">Fast POS Billing</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-surface border border-subtle rounded text-primary">F2</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-secondary">Find Customer</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-surface border border-subtle rounded text-primary">F4</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-secondary">Complete / Settle</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-surface border border-subtle rounded text-primary">F12</kbd>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-subtle bg-surface-muted/30 space-y-2">
                  <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                    Operational Profiles
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-secondary">Profiles Synced</span>
                      <Badge variant="success" className="text-[10px]">3 Available</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-secondary">Active Profile</span>
                      <span className="text-primary font-medium">Default Workstation</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-secondary">Conflict Detection</span>
                      <span className="text-emerald-500 font-medium">Active</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 text-xs text-secondary">
                <span>Want to record custom keymaps or reassign function keys?</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/settings/shortcuts")}
                  className="text-xs"
                >
                  Configure Keybindings
                  <ExternalLink className="h-3 w-3 ml-1.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. PLAN & BILLING TAB */}
      {activeTab === "billing" && (
        <div className="space-y-6 animate-in fade-in-0 duration-200">
          <BillingPlanSection />
        </div>
      )}

      {/* 6. OFFLINE STORAGE & LOCAL DB TAB */}
      {activeTab === "offline" && (
        <div className="space-y-6 animate-in fade-in-0 duration-200">
          <OfflineStorageSection />
        </div>
      )}
    </div>
  );
};
