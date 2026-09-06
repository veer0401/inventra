import React, { useState } from "react";
import { Store, Building2, Check, RotateCw } from "lucide-react";
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
import type { BusinessMembershipSummaryDto, StoreAssignmentSummaryDto } from "@inventra/api-types";

export interface ContextSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContextSwitcher: React.FC<ContextSwitcherProps> = ({ open, onOpenChange }) => {
  const toast = useToast();
  const { activeContext, memberships, switchContext } = useAuthStore();
  const [isSwitching, setIsSwitching] = useState(false);
  const [targetStoreId, setTargetStoreId] = useState<string | null>(null);

  const handleSelectStore = async (businessId: string, storeId: string) => {
    if (activeContext?.businessId === businessId && activeContext?.storeId === storeId) {
      onOpenChange(false);
      return;
    }

    setTargetStoreId(storeId);
    setIsSwitching(true);
    try {
      await switchContext(businessId, storeId);
      toast.success("Active dispensary terminal switched successfully.");
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to switch operational context.");
    } finally {
      setIsSwitching(false);
      setTargetStoreId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          Switch Store Location
        </DialogTitle>
        <DialogDescription>
          Select a pharmacy business entity and dispensary branch location to switch your active terminal context.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-3 max-h-[60vh] overflow-y-auto">
        {memberships.length === 0 ? (
          <div className="text-center py-6 text-muted text-xs">
            No assigned pharmacy memberships found. (Platform Console Context)
          </div>
        ) : (
          memberships.map((biz: BusinessMembershipSummaryDto) => (
            <div key={biz.businessId} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    {biz.businessName}
                  </span>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {biz.role}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {biz.stores.map((s: StoreAssignmentSummaryDto) => {
                  const isCurrent =
                    activeContext?.businessId === biz.businessId &&
                    activeContext?.storeId === s.storeId;
                  const isPending = isSwitching && targetStoreId === s.storeId;

                  return (
                    <button
                      key={s.storeId}
                      type="button"
                      onClick={() => handleSelectStore(biz.businessId, s.storeId)}
                      disabled={isSwitching}
                      className={`flex items-center justify-between p-3 rounded-lg border text-left text-xs transition-all ${
                        isCurrent
                          ? "border-primary bg-primary-subtle font-medium text-primary ring-1 ring-primary shadow-xs"
                          : "border-subtle bg-surface hover:border-strong hover:bg-surface-muted text-primary"
                      } ${isSwitching ? "opacity-75 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-md ${
                            isCurrent
                              ? "bg-primary text-primary-fg"
                              : "bg-surface-muted text-muted"
                          }`}
                        >
                          <Store className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-primary">{s.storeName}</div>
                          <div className="text-[11px] text-muted flex items-center gap-2 mt-0.5">
                            <span className="font-mono">{s.storeCode || "HQ"}</span>
                            <span>•</span>
                            <span className="capitalize">{(s.roleOverride || biz.role).toLowerCase()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCurrent && (
                          <Badge variant="success" className="gap-1">
                            <Check className="h-3 w-3" />
                            ACTIVE
                          </Badge>
                        )}

                        {isPending && (
                          <RotateCw className="h-4 w-4 text-primary animate-spin" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
          disabled={isSwitching}
        >
          Cancel
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
