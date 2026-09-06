import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Store, LogOut, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { Button, Badge, Alert } from "@inventra/ui";
import type { BusinessMembershipSummaryDto, StoreAssignmentSummaryDto } from "@inventra/api-types";

export const SelectContextPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, memberships, activeContext, switchContext, logout, error, clearError } = useAuthStore();

  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(
    activeContext?.businessId || memberships[0]?.businessId || ""
  );
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    activeContext?.storeId || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedBusiness: BusinessMembershipSummaryDto | undefined =
    memberships.find((m: BusinessMembershipSummaryDto) => m.businessId === selectedBusinessId) || memberships[0];
  const availableStores: StoreAssignmentSummaryDto[] = selectedBusiness?.stores || [];

  const handleEnterWorkspace = async (storeIdToUse?: string) => {
    const finalStoreId = storeIdToUse || selectedStoreId || availableStores[0]?.storeId;
    clearError();
    setIsSubmitting(true);
    try {
      await switchContext(selectedBusinessId, finalStoreId);
      navigate("/", { replace: true });
    } catch {
      // Error handled in store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-app text-primary flex flex-col justify-between p-6 sm:p-10">
      {/* Top Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between pb-6 border-b border-subtle">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center font-bold text-lg text-primary-fg shadow-card">
            IN
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary leading-none">Inventra ERP</h1>
            <p className="text-xs text-primary mt-1">Tenant & Store Workspace Context</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-primary">{user?.fullName}</p>
            <p className="text-[11px] text-secondary font-mono">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            leftIcon={<LogOut className="h-3.5 w-3.5" />}
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Context Selection Center */}
      <main className="max-w-5xl mx-auto w-full my-auto py-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-primary">Select Pharmacy Workspace</h2>
          <p className="text-xs text-secondary">
            Choose the business entity and store location you wish to operate in for this session.
          </p>
        </div>

        {error && (
          <Alert variant="danger" onDismiss={clearError}>
            {error}
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Business Entities */}
          <div className="md:col-span-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span>Registered Businesses ({memberships.length})</span>
            </h3>

            <div className="space-y-2.5">
              {memberships.map((membership: BusinessMembershipSummaryDto) => {
                const isSelected = membership.businessId === selectedBusinessId;
                return (
                  <button
                    key={membership.businessId}
                    type="button"
                    onClick={() => {
                      setSelectedBusinessId(membership.businessId);
                      setSelectedStoreId(membership.stores[0]?.storeId || "");
                    }}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      isSelected
                        ? "bg-surface border-primary ring-2 ring-primary shadow-card"
                        : "bg-surface-muted border-subtle hover:border-strong text-secondary"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-primary">
                        {membership.businessName}
                      </span>
                      <Badge
                        variant={isSelected ? "accent" : "secondary"}
                        className="text-[10px] font-mono"
                      >
                        {membership.role}
                      </Badge>
                    </div>
                    <div className="text-xs text-secondary mt-1">
                      {membership.stores.length} dispensary branch location(s)
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Store Locations */}
          <div className="md:col-span-7 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
              <Store className="h-3.5 w-3.5 text-accent" />
              <span>Available Store Branches ({availableStores.length})</span>
            </h3>

            {availableStores.length === 0 ? (
              <div className="p-8 rounded-lg bg-surface-muted border border-subtle text-center text-xs text-muted">
                No store branches assigned for this business entity. Contact your system owner.
              </div>
            ) : (
              <div className="space-y-2.5">
                {availableStores.map((store: StoreAssignmentSummaryDto) => {
                  const isSelected = store.storeId === selectedStoreId;
                  return (
                    <div
                      key={store.storeId}
                      className={`p-4 rounded-lg border transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-surface border-primary shadow-card"
                          : "bg-surface-muted border-subtle hover:border-strong text-secondary"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-primary">
                            {store.storeName}
                          </span>
                          <span className="text-[10px] font-mono text-muted bg-surface px-1.5 py-0.5 rounded border border-subtle">
                            {store.storeCode || "HQ"}
                          </span>
                        </div>
                        <p className="text-xs text-secondary mt-0.5">
                          Assigned role: <strong className="text-primary">{store.roleOverride || selectedBusiness?.role || "STAFF"}</strong>
                        </p>
                      </div>

                      <Button
                        variant={isSelected ? "primary" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedStoreId(store.storeId);
                          handleEnterWorkspace(store.storeId);
                        }}
                        isLoading={isSubmitting && selectedStoreId === store.storeId}
                        rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                      >
                        Launch Station
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer System Info */}
      <footer className="max-w-5xl mx-auto w-full pt-6 border-t border-subtle flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Inventra Enterprise Security Boundary</span>
        </div>
        <span>Spring Boot 4.1.1 • PostgreSQL 17</span>
      </footer>
    </div>
  );
};
