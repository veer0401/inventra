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
} from "lucide-react";
import { storeStaffApi } from "../../services/storeStaffApi";
import { Button, Card, Input, Alert, useToast, Spinner, Dialog } from "@inventra/ui";
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

  // Form State for Assign User
  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState("CASHIER");
  const [isPrimaryStore, setIsPrimaryStore] = React.useState(false);

  // Form State for Update Capacity (Owner only)
  const [newMaxUsers, setNewMaxUsers] = React.useState<number>(5);

  const isOwner = activeContext?.role === "OWNER" || activeContext?.role === "PLATFORM_ADMIN";

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
  const { data: staffList = [], isLoading: isLoadingStaff } = useQuery({
    queryKey: ["business-staff"],
    queryFn: () => storeStaffApi.listBusinessStaff(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["store-capacity", selectedStoreId] });
    queryClient.invalidateQueries({ queryKey: ["business-staff"] });
  };

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

  const activeCount = capacity?.currentActiveUsers ?? 0;
  const maxCount = capacity?.maxUsers ?? 5;
  const atCapacity = capacity?.atCapacity ?? activeCount >= maxCount;
  const percentage = Math.min(100, Math.round((activeCount / Math.max(1, maxCount)) * 100));

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
                Store Staff & User Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage branch staff assignments, role permissions, and store capacity limits
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Store Switcher */}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="h-9 px-3 py-1 rounded-md border border-input bg-card text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {stores.map((s: { storeId: string; storeName: string; storeCode: string }) => (
                <option key={s.storeId} value={s.storeId}>
                  {s.storeName} ({s.storeCode})
                </option>
              ))}
            </select>
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

          <Button
            onClick={() => setShowAssignModal(true)}
            size="sm"
            disabled={atCapacity}
            className="gap-1.5 bg-primary text-primary-foreground shadow-sm disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>Assign Staff</span>
          </Button>
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
              Enforced by backend pessimistic concurrency locking to prevent store limit overruns.
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
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          <span>Active Staff & Access Credentials</span>
        </h3>

        {isLoadingStaff ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">Loading store staff...</p>
          </div>
        ) : staffList.length === 0 ? (
          <Card className="p-10 text-center border-dashed">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <h3 className="font-semibold text-foreground">No Users Assigned</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-3">
              Assign staff members to this store to grant them counter and terminal access.
            </p>
            <Button size="sm" onClick={() => setShowAssignModal(true)} disabled={atCapacity}>
              Assign First User
            </Button>
          </Card>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium text-xs border-b border-border/80 uppercase">
                <tr>
                  <th className="py-3 px-4">Staff Name</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Member Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {staffList.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="py-3.5 px-4 font-semibold text-foreground">{s.fullName}</td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{s.email}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-primary/10 text-primary">
                        {s.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Staff Modal */}
      {showAssignModal && (
        <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
          <form onSubmit={handleAssignSubmit} className="p-6 space-y-4 max-w-md bg-card rounded-lg border border-border shadow-lg">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span>Assign Staff to Store</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Add a team member to <strong>{capacity?.storeName}</strong>. Current capacity: {activeCount}/{maxCount}.
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Select User / Staff <span className="text-destructive">*</span></label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full h-9 px-3 py-1 rounded-md border border-input bg-card text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  required
                >
                  <option value="">-- Choose User --</option>
                  {staffList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email}) - {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Store Role Override</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full h-9 px-3 py-1 rounded-md border border-input bg-card text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="primaryStore"
                  checked={isPrimaryStore}
                  onChange={(e) => setIsPrimaryStore(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="primaryStore" className="text-xs text-foreground font-medium">
                  Set as Primary Workstation Store
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAssignModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={assignMutation.isPending} className="bg-primary text-primary-foreground">
                {assignMutation.isPending && <Spinner className="h-4 w-4 mr-1" />}
                Confirm Assignment
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Update Store Capacity Modal */}
      {showCapacityModal && (
        <Dialog open={showCapacityModal} onOpenChange={setShowCapacityModal}>
          <form onSubmit={handleUpdateCapacitySubmit} className="p-6 space-y-4 max-w-md bg-card rounded-lg border border-border shadow-lg">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary" />
              <span>Configure Store User Capacity</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Adjust maximum active staff limit allowed at <strong>{capacity?.storeName}</strong>.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Maximum Active Staff Users</label>
              <Input
                type="number"
                min="1"
                max="50"
                value={newMaxUsers}
                onChange={(e) => setNewMaxUsers(Math.max(1, Number(e.target.value)))}
                className="font-mono text-sm"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Default limit is 5 users. Limit must be greater than or equal to current active users ({activeCount}).
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCapacityModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={updateCapacityMutation.isPending} className="bg-primary text-primary-foreground">
                {updateCapacityMutation.isPending && <Spinner className="h-4 w-4 mr-1" />}
                Save Capacity Limit
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
};
