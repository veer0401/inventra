import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Building2,
  Boxes,
  ShoppingCart,
  Truck,
  ArrowLeftRight,
  Terminal,
  Layers,
  ArrowRight,
  Receipt,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
} from "@inventra/ui";
import type { BusinessMembershipSummaryDto } from "@inventra/api-types";

export const DashboardPage: React.FC = () => {
  const { user, activeContext, memberships } = useAuthStore();
  const isPlatformAdmin = activeContext?.role === "PLATFORM_ADMIN";

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Session Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-lg border border-subtle shadow-card">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              Welcome, {user?.fullName || "Operator"}
            </h1>
            <Badge variant="accent" className="text-[10px] font-mono">
              {activeContext?.role || "STAFF"}
            </Badge>
            <Badge variant="success" className="text-[10px] font-mono">
              SESSION ACTIVE
            </Badge>
          </div>
          <p className="text-xs text-secondary mt-1">
            Connected to <strong className="text-primary">{activeContext?.businessName}</strong>
            {activeContext?.storeName && (
              <> • {activeContext.storeName} ({activeContext.storeCode || "HQ"})</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPlatformAdmin && (
            <Link to="/admin/onboarding">
              <Button variant="primary" size="sm">
                Onboarding Admin Console →
              </Button>
            </Link>
          )}
          <Link to="/settings">
            <Button variant="outline" size="sm">
              Account Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Core Pharmacy Systems Navigation */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
              Pharmacy Core Systems
            </h2>
            <p className="text-xs text-secondary">
              Operational modules scheduled across upcoming frontend implementation phases.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* POS Card */}
          <Link to="/pos" className="group">
            <Card className="hover:border-primary transition-all h-full flex flex-col justify-between shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-primary-subtle text-primary group-hover:bg-primary group-hover:text-primary-fg transition-colors">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    Phase F5
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-primary group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>Point of Sale (POS)</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Counter dispensing, FEFO batch recommendation, barcode scanning & receipt printing.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Sales & Returns Card */}
          <Link to="/sales" className="group">
            <Card className="hover:border-primary transition-all h-full flex flex-col justify-between shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-primary-subtle text-primary group-hover:bg-primary group-hover:text-primary-fg transition-colors">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    Phase F6
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-primary group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>Sales & Returns</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Invoicing history, returns processing, refund reconciliation & cashier settlements.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Inventory & Batches Card */}
          <Link to="/inventory" className="group">
            <Card className="hover:border-primary transition-all h-full flex flex-col justify-between shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-accent-subtle text-accent group-hover:bg-accent group-hover:text-accent-fg transition-colors">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    Phase F4
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-primary group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>Inventory & Batches</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Batch allocation, expiry notifications, stock adjustments & quarantine handling.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Catalog & Categories Card */}
          <Link to="/catalog" className="group">
            <Card className="hover:border-primary transition-all h-full flex flex-col justify-between shadow-card border-primary/40">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-primary-subtle text-primary group-hover:bg-primary group-hover:text-primary-fg transition-colors">
                    <Layers className="h-5 w-5" />
                  </div>
                  <Badge variant="success" className="text-[9px] font-mono">
                    ACTIVE (F3)
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-primary group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>Catalog & Categories</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Master drug products, barcode identifiers, tax categories & dosage forms.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Purchases & GRN Card */}
          <Link to="/purchasing" className="group">
            <Card className="hover:border-primary transition-all h-full flex flex-col justify-between shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-success-subtle text-success group-hover:bg-success group-hover:text-white transition-colors">
                    <Truck className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    Phase F8
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-primary group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>Purchases & GRN</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Purchase orders, invoice verification, goods receipts & supplier lot entries.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Store Transfers Card */}
          <Link to="/transfers" className="group">
            <Card className="hover:border-primary transition-all h-full flex flex-col justify-between shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-warning-subtle text-warning group-hover:bg-warning group-hover:text-white transition-colors">
                    <ArrowLeftRight className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    Phase F7
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-primary group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>Store Transfers</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Inter-store stock requests, dispatch shipments, and dual-authorization receipt.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Cryptographic Session Identity & Assigned Memberships */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-card border-subtle">
          <CardHeader className="pb-3 border-b border-subtle">
            <CardTitle className="text-sm text-primary flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Authenticated Session Identity
            </CardTitle>
            <CardDescription className="text-secondary text-xs">
              Cryptographically verified JWT claims active in this browser session.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-surface-muted rounded-md border border-subtle">
                <span className="text-muted block text-[10px]">User Account ID</span>
                <span className="font-mono text-primary font-semibold truncate block mt-0.5">
                  {user?.id}
                </span>
              </div>

              <div className="p-3 bg-surface-muted rounded-md border border-subtle">
                <span className="text-muted block text-[10px]">Active Business ID</span>
                <span className="font-mono text-primary font-semibold truncate block mt-0.5">
                  {activeContext?.businessId || "N/A (Global Admin)"}
                </span>
              </div>

              <div className="p-3 bg-surface-muted rounded-md border border-subtle">
                <span className="text-muted block text-[10px]">Active Store ID</span>
                <span className="font-mono text-primary font-semibold truncate block mt-0.5">
                  {activeContext?.storeId || "N/A (Global Admin)"}
                </span>
              </div>

              <div className="p-3 bg-surface-muted rounded-md border border-subtle">
                <span className="text-muted block text-[10px]">Active Authority</span>
                <span className="font-semibold text-primary block mt-0.5 font-mono">
                  {activeContext?.role}
                </span>
              </div>

              <div className="p-3 bg-surface-muted rounded-md border border-subtle">
                <span className="text-muted block text-[10px]">Email Verification</span>
                <span className="font-semibold text-success block mt-0.5">
                  {user?.emailVerified ? "Verified" : "Pending"}
                </span>
              </div>

              <div className="p-3 bg-surface-muted rounded-md border border-subtle">
                <span className="text-muted block text-[10px]">Account Lifecycle</span>
                <span className="font-semibold text-primary block mt-0.5">
                  {user?.status}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-subtle">
          <CardHeader className="pb-3 border-b border-subtle">
            <CardTitle className="text-sm text-primary flex items-center gap-2">
              <Building2 className="h-4 w-4 text-accent" />
              Assigned Entities ({memberships.length})
            </CardTitle>
            <CardDescription className="text-secondary text-xs">
              Pharmacy businesses accessible by this user.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {memberships.length === 0 ? (
                <p className="text-xs text-muted">No tenant memberships (Platform Admin)</p>
              ) : (
                memberships.map((m: BusinessMembershipSummaryDto) => (
                  <div
                    key={m.businessId}
                    className="p-2.5 rounded-md border border-subtle bg-surface-muted space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary">{m.businessName}</span>
                      <Badge variant="secondary" className="text-[10px] py-0">
                        {m.role}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-secondary">
                      {m.stores.length} store branch location(s)
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Developer & System Diagnostics Section */}
      <div className="p-4 rounded-lg border border-subtle bg-surface text-xs space-y-2 text-secondary shadow-card">
        <div className="flex items-center gap-2 text-primary font-semibold uppercase tracking-wider text-[11px]">
          <Terminal className="h-3.5 w-3.5 text-primary" />
          <span>Developer & System Diagnostics</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 font-mono text-[11px]">
          <div>Backend: <span className="text-primary font-semibold">Spring Boot 4.1.1</span></div>
          <div>Database: <span className="text-primary font-semibold">PostgreSQL 17 (Flyway V8)</span></div>
          <div>API Port: <span className="text-primary font-semibold">8081</span></div>
          <div>Terminal Mode: <span className="text-success font-semibold">Online Only (Web)</span></div>
        </div>
      </div>
    </div>
  );
};
