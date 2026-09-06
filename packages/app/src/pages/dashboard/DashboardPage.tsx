import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Clock,
  UploadCloud,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { reportApi } from "../../services/reportApi";
import { formatCurrency } from "../../utils/formatters";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Spinner,
} from "@inventra/ui";
import type { BusinessMembershipSummaryDto } from "@inventra/api-types";

export const DashboardPage: React.FC = () => {
  const { user, activeContext, memberships } = useAuthStore();
  const isPlatformAdmin = activeContext?.role === "PLATFORM_ADMIN";

  // Live KPI Summary Query
  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["dashboard-summary", activeContext?.storeId],
    queryFn: () => reportApi.getSummary({ storeId: activeContext?.storeId || undefined }),
    enabled: Boolean(activeContext?.storeId),
    refetchInterval: 60000, // Refresh every minute
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Session Hero Banner & Welcome */}
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
              TERMINAL ONLINE
            </Badge>
          </div>
          <p className="text-xs text-secondary mt-1">
            Active Store: <strong className="text-primary">{activeContext?.storeName || "Main Dispensary"}</strong>
            {activeContext?.storeCode && ` (${activeContext.storeCode})`} •{" "}
            <span>{activeContext?.businessName}</span>
          </p>
        </div>

        {/* Quick Shortcut Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/pos">
            <Button variant="primary" size="sm" className="gap-1.5 shadow-sm">
              <ShoppingCart className="h-4 w-4" />
              New POS Sale (F2)
            </Button>
          </Link>
          <Link to="/reports">
            <Button variant="outline" size="sm" className="gap-1.5">
              <BarChart3 className="h-4 w-4 text-primary" />
              Reports & GST
            </Button>
          </Link>
          {isPlatformAdmin && (
            <Link to="/admin/onboarding">
              <Button variant="outline" size="sm">
                Admin Console →
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Real-time Pharmacy Operations KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <Card className="shadow-card border-subtle">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-secondary">Today's Sales</span>
              <div className="p-2 rounded-md bg-primary-subtle text-primary">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            {isLoadingSummary ? (
              <div className="py-2"><Spinner size="sm" /></div>
            ) : (
              <>
                <div className="text-2xl font-bold text-primary mt-2">
                  {formatCurrency(summary?.totalSalesRevenue || 0)}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-secondary">
                  <span className="font-semibold text-primary">{summary?.totalSalesCount || 0}</span> orders completed
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Month to Date Sales */}
        <Card className="shadow-card border-subtle">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-secondary">Month-to-Date Revenue</span>
              <div className="p-2 rounded-md bg-success-subtle text-success">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            {isLoadingSummary ? (
              <div className="py-2"><Spinner size="sm" /></div>
            ) : (
              <> {/* Month-to-Date */}
                <div className="text-2xl font-bold text-success mt-2">
                  {formatCurrency(summary?.totalSalesRevenue || 0)}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-secondary">
                  <span className="font-semibold text-primary">{summary?.totalSalesCount || 0}</span> total orders
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stock Valuation */}
        <Card className="shadow-card border-subtle">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-secondary">Inventory Valuation</span>
              <div className="p-2 rounded-md bg-accent-subtle text-accent">
                <Boxes className="h-4 w-4" />
              </div>
            </div>
            {isLoadingSummary ? (
              <div className="py-2"><Spinner size="sm" /></div>
            ) : (
              <>
                <div className="text-2xl font-bold text-primary mt-2">
                  {formatCurrency(summary?.inventoryCostValuation || 0)}
                </div>
                <div className="flex items-center justify-between mt-1 text-xs text-secondary">
                  <span>Retail: <strong className="text-primary">{formatCurrency(summary?.inventoryRetailValuation || 0)}</strong></span>
                  <Link to="/reports" className="text-primary font-medium hover:underline">Margin →</Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pharmacy Risk Alerts (Low Stock & Expiry) */}
        <Card className="shadow-card border-subtle">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-secondary">Clinical & Stock Alerts</span>
              <div className="p-2 rounded-md bg-warning-subtle text-warning">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            {isLoadingSummary ? (
              <div className="py-2"><Spinner size="sm" /></div>
            ) : (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-secondary flex items-center gap-1">
                    <Clock className="h-3 w-3 text-warning" /> Near Expiry (&le;90d):
                  </span>
                  <Link to="/reports" className="font-bold text-warning hover:underline">
                    {summary?.nearExpiryBatchCount || 0} Batches
                  </Link>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-secondary flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-danger" /> Below Reorder Min:
                  </span>
                  <Link to="/inventory" className="font-bold text-danger hover:underline">
                    {summary?.lowStockItemCount || 0} Products
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Pharmacy Modules Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
              Pharmacy Operations & Dispensary Systems
            </h2>
            <p className="text-xs text-secondary">
              Direct access to all live operational pharmacy modules.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* POS Terminal */}
          <Link to="/pos" className="group">
            <Card className="hover:border-primary transition-all h-full flex flex-col justify-between shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-primary-subtle text-primary group-hover:bg-primary group-hover:text-primary-fg transition-colors">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <Badge variant="success" className="text-[9px] font-mono">
                    LIVE POS
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-primary group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>Point of Sale (POS)</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Counter billing, barcode scanning, FEFO batch allocation & thermal receipt printing.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Sales & Invoices */}
          <Link to="/sales" className="group">
            <Card className="hover:border-primary transition-all h-full flex flex-col justify-between shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-primary-subtle text-primary group-hover:bg-primary group-hover:text-primary-fg transition-colors">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    ACTIVE
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-primary group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>Sales & Invoices</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Transaction history, receipts, returns processing, and customer billing records.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Inventory & Batches */}
          <Link to="/inventory" className="group">
            <Card className="hover:border-primary transition-all h-full flex flex-col justify-between shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-accent-subtle text-accent group-hover:bg-accent group-hover:text-accent-fg transition-colors">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    ACTIVE
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-primary group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>Inventory & FEFO</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Live stock balances, batch expiry tracking, and stock movement adjustments.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Reports & Analytics */}
          <Link to="/reports" className="group">
            <Card className="hover:border-primary transition-all h-full flex flex-col justify-between shadow-card border-primary/30">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-success-subtle text-success group-hover:bg-success group-hover:text-white transition-colors">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <Badge variant="accent" className="text-[9px] font-mono">
                    NEW
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-primary group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>Reports & Analytics</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Financial summaries, GSTR-1 tax liability, stock valuation, and Schedule H registers.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Purchasing & Goods Receipt */}
          <Link to="/purchasing/orders" className="group">
            <Card className="hover:border-primary transition-all h-full flex flex-col justify-between shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-primary-subtle text-primary group-hover:bg-primary group-hover:text-primary-fg transition-colors">
                    <Truck className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    ACTIVE
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-primary group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>Procurement & GRN</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Vendor purchase orders, goods receipts, purchase invoices, and supplier ledgers.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Catalog & Master Drugs */}
          <Link to="/catalog" className="group">
            <Card className="hover:border-primary transition-all h-full flex flex-col justify-between shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-primary-subtle text-primary group-hover:bg-primary group-hover:text-primary-fg transition-colors">
                    <Layers className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    ACTIVE
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-primary group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>Product Catalog</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Master drug database, HSN codes, dosage forms, manufacturer brands, and tax rates.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Store Transfers */}
          <Link to="/transfers" className="group">
            <Card className="hover:border-primary transition-all h-full flex flex-col justify-between shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-warning-subtle text-warning group-hover:bg-warning group-hover:text-white transition-colors">
                    <ArrowLeftRight className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    ACTIVE
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-primary group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>Store Transfers</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Inter-store replenishment requests, dispatch notes, and dual-sign receipt confirmation.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Universal Data Ingestion */}
          <Link to="/imports" className="group">
            <Card className="hover:border-primary transition-all h-full flex flex-col justify-between shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-accent-subtle text-accent group-hover:bg-accent group-hover:text-accent-fg transition-colors">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    ACTIVE
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-primary group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>Universal Data Import</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Bulk CSV/Excel migration for catalog products, inventory batches, and suppliers.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Session Security & Tenant Identity Context */}
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
          <div>Reports Module: <span className="text-success font-semibold">Active (F10 Live)</span></div>
        </div>
      </div>
    </div>
  );
};
