import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  RefreshCw,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Mail,
  UserCheck,
  UserPlus,
  Copy,
  Check,
  Clock,
  Phone,
} from "lucide-react";
import { storeStaffApi, StaffMember, InviteStaffRequest, InviteStaffResponse } from "../../services/storeStaffApi";
import { Button, Card, Input, Alert, useToast, Spinner, Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Select } from "@inventra/ui";
import type { AssignStoreUserRequest } from "@inventra/api-types";
import { useAuthStore } from "../../stores/authStore";

const ROLES: { label: string; value: string }[] = [
  { label: "Pharmacist", value: "PHARMACIST" },
  { label: "Cashier", value: "CASHIER" },
  { label: "Inventory Operator", value: "INVENTORY_OPERATOR" },
  { label: "Store Manager", value: "MANAGER" },
];

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const memberships = useAuthStore((state) => state.memberships);
  const activeContext = useAuthStore((state) => state.activeContext);
  const stores = memberships[0]?.stores || [];

  const [selectedStoreId, setSelectedStoreId] = React.useState<string>(
    activeContext?.storeId || stores[0]?.storeId || ""
  );

  const [showAssignModal, setShowAssignModal] = React.useState(false);
  const [showCapacityModal, setShowCapacityModal] = React.useState(false);
  const [showInviteModal, setShowInviteModal] = React.useState(false);

  // Invite Flow State
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("PHARMACIST");
  const [inviteStoreId, setInviteStoreId] = React.useState<string>(selectedStoreId || "");
  const [lastInvitation, setLastInvitation] = React.useState<InviteStaffResponse | null>(null);
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);
  const [hasCopied, setHasCopied] = React.useState(false);

  // Form State for Assign User
  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState("CASHIER");
  const [isPrimaryStore, setIsPrimaryStore] = React.useState(false);

  // Form State for Update Capacity (Owner only)
  const [newMaxUsers, setNewMaxUsers] = React.useState<number>(5);

  const isOwner = activeContext?.role === "OWNER" || activeContext?.role === "PLATFORM_ADMIN";
  const canManage = isOwner || activeContext?.role === "MANAGER";

  // Query Store Capacity (Authoritative from Backend)
  const {
    data: capacity,
    refetch: refetchCapacity,
    isFetching: isFetchingCapacity,
  } = useQuery({
    queryKey: ["store-capacity", selectedStoreId],
    queryFn: () => (selectedStoreId ? storeStaffApi.getStoreCapacity(selectedStoreId) : Promise.reject("No store")),
    enabled: !!selectedStoreId,
  });

  // Query All Staff in Business
  const { data: staffList = [], isLoading: isLoadingStaff } = useQuery<StaffMember[]>({
    queryKey: ["business-staff"],
    queryFn: () => storeStaffApi.listBusinessStaff(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["store-capacity", selectedStoreId] });
    queryClient.invalidateQueries({ queryKey: ["business-staff"] });
  };

  // Invite Mutation
  const inviteMutation = useMutation({
    mutationFn: (req: InviteStaffRequest) => storeStaffApi.inviteStaff(req),
    onSuccess: (data) => {
      invalidate();
      setShowInviteModal(false);
      setInviteEmail("");
      setLastInvitation(data);
      setShowSuccessModal(true);
      toast.success("Staff invitation generated successfully!", "Invitation Created");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message, "Invitation Failed");
    },
  });

  // Assign Mutation
  const assignMutation = useMutation({
    mutationFn: (req: AssignStoreUserRequest) =>
      storeStaffApi.assignUserToStore(selectedStoreId, req),
    onSuccess: () => {
      invalidate();
      setShowAssignModal(false);
      setSelectedUserId("");
      toast.success("User successfully assigned to store location.", "Staff Assigned");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message, "Assignment Failed");
    },
  });

  // Update Capacity Mutation
  const updateCapacityMutation = useMutation({
    mutationFn: (max: number) => storeStaffApi.updateStoreCapacity(selectedStoreId, max),
    onSuccess: (data) => {
      invalidate();
      setShowCapacityModal(false);
      toast.success(`Store user capacity updated to ${data.maxUsers} users.`, "Capacity Updated");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message, "Update Failed");
    },
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.warning("Please enter a valid email address.", "Email Required");
      return;
    }
    inviteMutation.mutate({
      email: inviteEmail.trim(),
      role: inviteRole,
      storeId: inviteStoreId ? inviteStoreId : null,
    });
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.warning("Please select a user to assign.", "User Required");
      return;
    }
    assignMutation.mutate({
      businessMembershipId: selectedUserId,
      roleOverride: selectedRole,
      isPrimaryStore,
    });
  };

  const handleUpdateCapacitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMaxUsers < 1) {
      toast.warning("Max users must be at least 1.", "Invalid Limit");
      return;
    }
    updateCapacityMutation.mutate(newMaxUsers);
  };

  const handleCopyLink = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setHasCopied(true);
    toast.success("Activation link copied to clipboard!", "Copied");
    setTimeout(() => setHasCopied(false), 2500);
  };

  const activeCount = capacity?.currentActiveUsers ?? 0;
  const maxCount = capacity?.maxUsers ?? 5;
  const atCapacity = capacity?.atCapacity ?? activeCount >= maxCount;
  const percentage = Math.min(100, Math.round((activeCount / Math.max(1, maxCount)) * 100));

  // Filter staff that are active members (not pending invitations) for assign modal
  const activeMembersForAssign = staffList.filter((s) => !s.isInvitation && s.userId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Staff & User Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Invite pharmacy team members, assign store branches, and configure branch capacity limits
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Store Switcher */}
          <div className="w-64">
            <Select
              value={selectedStoreId}
              leftIcon={<Building2 className="h-4 w-4" />}
              onChange={(e) => {
                setSelectedStoreId(e.target.value);
                setInviteStoreId(e.target.value);
              }}
            >
              {stores.map((s: { storeId: string; storeName: string; storeCode: string }) => (
                <option key={s.storeId} value={s.storeId}>
                  {s.storeName} ({s.storeCode})
                </option>
              ))}
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchCapacity()}
            disabled={isFetchingCapacity}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isFetchingCapacity ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewMaxUsers(maxCount);
                setShowCapacityModal(true);
              }}
              className="gap-1.5"
            >
              <Sliders className="h-4 w-4" />
              <span>Limit Settings</span>
            </Button>
          )}

          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAssignModal(true)}
              disabled={atCapacity}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Assign Staff</span>
            </Button>
          )}

          {canManage && (
            <Button
              onClick={() => setShowInviteModal(true)}
              size="sm"
              className="gap-1.5 bg-primary text-primary-foreground shadow-sm whitespace-nowrap"
            >
              <UserPlus className="h-4 w-4" />
              <span>Invite Staff</span>
            </Button>
          )}
        </div>
      </div>

      {/* Authoritative Store Capacity Card */}
      <Card className="p-6 space-y-4 border-l-4 border-l-primary">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                Branch User Capacity — {capacity?.storeName || "Store"}
              </h3>
              {atCapacity ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/30">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  At Capacity Limit ({maxCount}/{maxCount})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Capacity Available ({activeCount}/{maxCount} Users)
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enforced by backend pessimistic concurrency locking to prevent branch licensing overruns.
            </p>
          </div>

          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-foreground">
              {activeCount} / {maxCount}
            </div>
            <div className="text-[11px] text-muted-foreground uppercase font-semibold">Active Users Assigned</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-3 bg-muted/60 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                atCapacity
                  ? "bg-destructive"
                  : percentage >= 80
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
            <span>0 Users</span>
            <span>{percentage}% Occupied</span>
            <span>{maxCount} Max Users Allowed</span>
          </div>
        </div>

        {atCapacity && (
          <Alert variant="danger" className="flex items-center gap-2 mt-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              This branch has reached its maximum authorized staff capacity ({maxCount} active users). You must revoke or unassign inactive staff before assigning new users.
            </span>
          </Alert>
        )}
      </Card>

      {/* Staff Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <span>Team Members & Staff Roster</span>
          </h3>
          <span className="text-xs text-muted-foreground">
            Total Staff: {staffList.length} (Active & Pending)
          </span>
        </div>

        {isLoadingStaff ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">Loading store staff...</p>
          </div>
        ) : staffList.length === 0 ? (
          <Card className="p-10 text-center border-dashed">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <h3 className="font-semibold text-foreground">No Users or Staff Added Yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              Invite team members by email to grant them branch workstation and counter access.
            </p>
            <Button size="sm" onClick={() => setShowInviteModal(true)} className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              <span>Invite First User</span>
            </Button>
          </Card>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium text-xs border-b border-border/80 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Branch Location</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined / Invited</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {staffList.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            s.isInvitation
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-primary/15 text-primary"
                          }`}>
                            {s.isInvitation ? <Clock className="w-3.5 h-3.5" /> : (s.fullName?.charAt(0) || "U")}
                          </div>
                          <div>
                            <div>{s.fullName}</div>
                            {s.phoneNumber && s.phoneNumber !== "—" && (
                              <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span>+91 {s.phoneNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span>{s.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                          {s.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {s.storeName ? (
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{s.storeName}</span>
                            {s.isPrimaryStore && (
                              <span className="text-[10px] uppercase font-bold text-brand-500 bg-brand-50 dark:bg-brand-950 px-1 rounded">Primary</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned Branch</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {s.isInvitation ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="h-3 w-3" />
                            <span>Pending Activation</span>
                          </span>
                        ) : s.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            {s.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Invite Staff Modal */}
      {showInviteModal && (
        <Dialog open={showInviteModal} onOpenChange={setShowInviteModal} className="max-w-md">
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle>Invite New Staff Member</DialogTitle>
                  <DialogDescription>
                    Send an activation link for team members to complete their profile and password
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-primary flex items-center gap-1">
                  Staff Email Address <span className="text-danger">*</span>
                </label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. pharmacist@yourpharmacy.com"
                  leftIcon={<Mail className="w-4 h-4 text-muted" />}
                  required
                  autoFocus
                />
                <p className="text-[11px] text-muted">
                  The user will receive an activation link to set up their full name, phone number, and password.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-primary">Designated Role <span className="text-danger">*</span></label>
                <Select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-primary">Assign Branch Location (Optional)</label>
                <Select
                  value={inviteStoreId}
                  onChange={(e) => setInviteStoreId(e.target.value)}
                >
                  <option value="">-- No Initial Branch Assignment --</option>
                  {stores.map((s: { storeId: string; storeName: string; storeCode: string }) => (
                    <option key={s.storeId} value={s.storeId}>
                      {s.storeName} ({s.storeCode})
                    </option>
                  ))}
                </Select>
                <p className="text-[11px] text-muted">
                  User will automatically be attached to this store branch upon account activation.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowInviteModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={inviteMutation.isPending}
                className="gap-1.5"
              >
                {inviteMutation.isPending && <Spinner className="h-4 w-4" />}
                <UserPlus className="h-4 w-4" />
                <span>Generate Activation Link</span>
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}

      {/* Invitation Success & Copy Link Modal */}
      {showSuccessModal && lastInvitation && (
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal} className="max-w-md">
          <div className="space-y-4">
            <div className="text-center space-y-2 pt-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <DialogTitle className="text-lg font-bold text-center">Staff Invitation Generated!</DialogTitle>
              <DialogDescription className="text-center">
                An invitation for <strong className="text-primary">{lastInvitation.email}</strong> with role <strong className="text-primary">{lastInvitation.role}</strong> has been created.
              </DialogDescription>
            </div>

            {lastInvitation.activationUrl && (
              <div className="space-y-2 bg-surface-muted/40 p-3.5 rounded-xl border border-subtle">
                <label className="text-xs font-semibold text-primary flex items-center justify-between">
                  <span>Activation Link (Valid for 7 Days)</span>
                  {hasCopied ? (
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <Check className="h-3 w-3" /> Copied!
                    </span>
                  ) : null}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={lastInvitation.activationUrl}
                    className="font-mono text-xs selection:bg-primary/20"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant={hasCopied ? "outline" : "primary"}
                    onClick={() => handleCopyLink(lastInvitation.activationUrl!)}
                    className="shrink-0 gap-1.5"
                  >
                    {hasCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    <span>{hasCopied ? "Copied" : "Copy"}</span>
                  </Button>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Share this link with the invited employee. When they open it, they will complete their full name, verify their 10-digit mobile number, and create their password.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setShowSuccessModal(false)}
                className="w-full"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* Assign Staff Modal */}
      {showAssignModal && (
        <Dialog open={showAssignModal} onOpenChange={setShowAssignModal} className="max-w-md">
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle>Assign Staff to Store</DialogTitle>
                  <DialogDescription>
                    Add an active team member to <strong className="text-primary">{capacity?.storeName}</strong>. Current capacity: {activeCount}/{maxCount}.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-primary">Select Active Staff Member <span className="text-danger">*</span></label>
                <Select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Staff Member --</option>
                  {activeMembersForAssign.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email}) - {u.role}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-primary">Store Role Override</label>
                <Select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="primaryStore"
                  checked={isPrimaryStore}
                  onChange={(e) => setIsPrimaryStore(e.target.checked)}
                  className="rounded border-subtle text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="primaryStore" className="text-xs text-primary font-medium cursor-pointer">
                  Set as Primary Workstation Store
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAssignModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={assignMutation.isPending}>
                {assignMutation.isPending && <Spinner className="h-4 w-4 mr-1" />}
                Confirm Assignment
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}

      {/* Update Store Capacity Modal */}
      {showCapacityModal && (
        <Dialog open={showCapacityModal} onOpenChange={setShowCapacityModal} className="max-w-md">
          <form onSubmit={handleUpdateCapacitySubmit} className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle>Configure Store User Capacity</DialogTitle>
                  <DialogDescription>
                    Adjust maximum active staff limit allowed at <strong className="text-primary">{capacity?.storeName}</strong>.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-primary">Maximum Active Staff Users</label>
              <Input
                type="number"
                min="1"
                max="50"
                value={newMaxUsers}
                onChange={(e) => setNewMaxUsers(Math.max(1, Number(e.target.value)))}
                className="font-mono text-sm"
                required
              />
              <p className="text-[11px] text-muted">
                Default limit is 5 users. Limit must be greater than or equal to current active users ({activeCount}).
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCapacityModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={updateCapacityMutation.isPending}>
                {updateCapacityMutation.isPending && <Spinner className="h-4 w-4 mr-1" />}
                Save Capacity Limit
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}
    </div>
  );
};
