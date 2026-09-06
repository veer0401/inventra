import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Button, useToast } from "@inventra/ui";
import {
  ArrowLeft,
  Crown,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Landmark,
  Zap,
  Package,
  ShoppingCart,
  Monitor,
  Building,
  Users,
  Bell,
  ShieldCheck,
  Mail,
  FileText,
  Download,
  Printer,
  Activity,
  X,
} from "lucide-react";
import {
  subscriptionApi,
  type AdminStoreDetails,
  type LicenseInvoice,
} from "../../services/subscriptionApi";
import { downloadInvoiceFile, printInvoiceDocument } from "../settings/BillingPlanSection";
import { formatCurrency, formatDate } from "../../utils/formatters";

// ─── Tier & Status Badges ────────────────────────────────────────────────────
const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  STARTER: {
    label: "Starter",
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
  },
  PRO: {
    label: "Pro",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  ENTERPRISE: {
    label: "Enterprise",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
};

function TierBadge({ tier }: { tier: string }) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.PRO;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${cfg.bg} ${cfg.color} ${cfg.border}`}
    >
      <Crown className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ACTIVE":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-success-subtle text-success border border-success-border">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Active
        </span>
      );
    case "PENDING_PAYMENT":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-warning-subtle text-warning border border-warning-border">
          <AlertTriangle className="h-3.5 w-3.5" />
          Pending Payment
        </span>
      );
    case "PAST_DUE":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-danger-subtle text-danger border border-danger-border">
          <AlertTriangle className="h-3.5 w-3.5" />
          Past Due
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-muted text-secondary border border-subtle">
          {status || "Inactive"}
        </span>
      );
  }
}

const inputCls =
  "w-full px-3 py-2 rounded-lg text-sm bg-surface border border-subtle text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-focus transition-colors";

export const AdminStoreDetailPage: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [details, setDetails] = useState<AdminStoreDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"telemetry" | "invoices">("telemetry");

  // Payment Recording State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const loadDetails = useCallback(async () => {
    if (!businessId) return;
    setIsLoading(true);
    try {
      const data = await subscriptionApi.getStoreDetails(businessId);
      setDetails(data);
    } catch {
      toast.error("Failed to load store telemetry and invoices.");
    } finally {
      setIsLoading(false);
    }
  }, [businessId, toast]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // Invoice Handlers
  const handleDownloadInvoice = async (inv: LicenseInvoice) => {
    if (!details) return;
    try {
      const blob = await subscriptionApi.adminDownloadInvoicePdfBlob(inv.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Inventra-Invoice-${inv.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded Tax Invoice #${inv.invoiceNumber} (PDF)`);
    } catch {
      downloadInvoiceFile(inv, {
        legalName: details.legalName,
        gstin: details.gstin,
      } as any);
      toast.success(`Downloaded Tax Invoice #${inv.invoiceNumber}`);
    }
  };

  const handlePrintInvoice = (inv: LicenseInvoice) => {
    if (!details) return;
    try {
      printInvoiceDocument(inv, {
        legalName: details.legalName,
        gstin: details.gstin,
      } as any);
    } catch {
      toast.error("Failed to open print dialog.");
    }
  };

  const handleRecordPayment = async () => {
    if (!businessId || !paymentRef.trim() || !details) return;
    setIsRecording(true);
    try {
      await subscriptionApi.recordPayment(businessId, paymentRef.trim());
      await loadDetails();
      toast.success(`Payment successfully recorded for ${details.legalName}.`);
      setShowPaymentModal(false);
      setPaymentRef("");
    } catch {
      toast.error("Failed to record payment.");
    } finally {
      setIsRecording(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted font-medium">Gathering live system metrics & telemetry…</span>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/subscriptions")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Subscriptions
        </Button>
        <Card className="p-8 text-center text-secondary">
          <p className="text-base font-semibold">Store details not found</p>
          <p className="text-xs text-muted mt-1">The requested store ID could not be loaded.</p>
        </Card>
      </div>
    );
  }

  const primaryUserEmail = details.users?.[0]?.email;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate("/admin/subscriptions")}
          className="flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Store Subscriptions</span>
        </button>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={loadDetails} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowPaymentModal(true)}
            className="gap-1.5 text-xs"
          >
            <Landmark className="h-3.5 w-3.5" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Main Header Banner */}
      <Card className="p-6 border-subtle bg-surface shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-primary tracking-tight">{details.legalName}</h1>
              <TierBadge tier={details.tier} />
              <StatusBadge status={details.status} />
              {details.autoRenew && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-success-subtle text-success border border-success-border">
                  <Zap className="h-3 w-3" /> AutoPay ON
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-secondary flex-wrap">
              {details.tradeName && (
                <span className="text-muted">
                  Trade Name: <strong className="text-primary">{details.tradeName}</strong>
                </span>
              )}
              <span className="font-mono">GSTIN: {details.gstin || "Unregistered"}</span>
              {details.drugLicenseNumber && (
                <span className="font-mono text-muted">DL: {details.drugLicenseNumber}</span>
              )}
              {primaryUserEmail && (
                <span className="flex items-center gap-1 text-muted">
                  <Mail className="h-3 w-3" />
                  {primaryUserEmail}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 border-t lg:border-t-0 lg:border-l border-subtle pt-3 lg:pt-0 lg:pl-6 text-right">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">License Fee</div>
              <div className="text-xl font-black font-mono text-primary">
                {formatCurrency(details.amount)}
                <span className="text-xs font-normal text-muted capitalize"> / {details.billingCycle?.toLowerCase()}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Renewal Status</div>
              <div className="text-sm font-bold font-mono text-primary">
                {details.daysRemaining > 0 ? `${details.daysRemaining} days remaining` : "Expired"}
              </div>
              {details.currentPeriodEnd && (
                <div className="text-[10px] text-muted font-mono">{formatDate(details.currentPeriodEnd)}</div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-surface-muted border border-subtle w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("telemetry")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "telemetry"
              ? "bg-primary text-primary-fg shadow-xs"
              : "text-secondary hover:text-primary hover:bg-surface"
          }`}
        >
          <Activity className="h-4 w-4" />
          Live App Usage & Telemetry
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("invoices")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "invoices"
              ? "bg-primary text-primary-fg shadow-xs"
              : "text-secondary hover:text-primary hover:bg-surface"
          }`}
        >
          <FileText className="h-4 w-4" />
          Payment History & Invoices
          {details.invoices && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-surface border border-subtle font-mono text-primary">
              {details.invoices.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Live Telemetry & Quotas */}
      {activeTab === "telemetry" ? (
        <div className="space-y-6">
          {/* Telemetry Metric Cards */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
              Live Platform Consumption Metrics
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                {
                  label: "Catalog Products",
                  value: details.productCount ?? 0,
                  icon: Package,
                  color: "text-sky-500",
                  bg: "bg-sky-500/10 border-sky-500/20",
                },
                {
                  label: "Sales Processed",
                  value: details.salesCount ?? 0,
                  icon: ShoppingCart,
                  color: "text-emerald-500",
                  bg: "bg-emerald-500/10 border-emerald-500/20",
                },
                {
                  label: "Workstations",
                  value: `${details.activeWorkstations ?? 0} / ${details.totalWorkstations ?? 0}`,
                  sub: "Active / Registered",
                  icon: Monitor,
                  color: "text-indigo-500",
                  bg: "bg-indigo-500/10 border-indigo-500/20",
                },
                {
                  label: "Branches",
                  value: details.branchCount ?? 0,
                  icon: Building,
                  color: "text-purple-500",
                  bg: "bg-purple-500/10 border-purple-500/20",
                },
                {
                  label: "Active Users",
                  value: details.userCount ?? 0,
                  icon: Users,
                  color: "text-amber-500",
                  bg: "bg-amber-500/10 border-amber-500/20",
                },
                {
                  label: "System Alerts",
                  value: details.alertsCount ?? 0,
                  icon: Bell,
                  color: "text-rose-500",
                  bg: "bg-rose-500/10 border-rose-500/20",
                },
              ].map((metric) => (
                <Card
                  key={metric.label}
                  className="p-4 border-subtle bg-surface shadow-xs hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider truncate">
                      {metric.label}
                    </span>
                    <div className={`p-1.5 rounded-lg border ${metric.bg}`}>
                      <metric.icon className={`h-3.5 w-3.5 ${metric.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-black font-mono text-primary">{metric.value}</div>
                  {metric.sub && <div className="text-[10px] text-muted mt-0.5">{metric.sub}</div>}
                </Card>
              ))}
            </div>
          </div>

          {/* Resource Quota Progress */}
          <Card className="p-5 border-subtle bg-surface shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Tier Resource Quotas & Entitlements
              </h2>
              <span className="text-xs font-semibold text-secondary">
                Plan: <strong className="text-primary">{details.planName}</strong> ({details.billingCycle?.toLowerCase()})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {[
                {
                  label: "Workstation Terminals",
                  used: details.activeWorkstations ?? 0,
                  limit: details.workstationLimit ?? 5,
                  unit: "terminals",
                },
                {
                  label: "Store Branches",
                  used: details.branchCount ?? 0,
                  limit: details.branchLimit ?? 2,
                  unit: "branches",
                },
                {
                  label: "Critical Alerts & Events",
                  used: details.alertsCount ?? 0,
                  limit: details.alertsLimit ?? 2000,
                  unit: "alerts",
                },
                {
                  label: "Encrypted Cloud Storage",
                  used: details.storageUsedGb ?? 0,
                  limit: details.storageLimitGb ?? 10,
                  unit: "GB",
                },
              ].map((q) => {
                const isUnlimited = q.limit >= 999999;
                const pct = isUnlimited ? 0 : Math.min(100, Math.round((q.used / Math.max(q.limit, 1)) * 100));
                return (
                  <div key={q.label} className="space-y-1.5 p-3 rounded-xl border border-subtle bg-surface-muted/40">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-secondary">{q.label}</span>
                      <span className="font-mono text-[11px] text-primary">
                        {q.used} / {isUnlimited ? "Unlimited" : `${q.limit} ${q.unit}`}
                        {!isUnlimited && ` (${pct}%)`}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-muted overflow-hidden border border-subtle">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 90 ? "bg-danger" : pct >= 70 ? "bg-warning" : "bg-primary"
                        }`}
                        style={{ width: isUnlimited ? "10%" : `${Math.max(pct, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Sub-tables: Branches and Users */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Branches Table */}
            <Card className="border-subtle bg-surface shadow-xs overflow-hidden flex flex-col">
              <div className="p-4 border-b border-subtle bg-surface-muted/50 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-primary" />
                  Store Branches ({(details.branches || []).length})
                </span>
              </div>
              <div className="overflow-x-auto">
                {(!details.branches || details.branches.length === 0) ? (
                  <div className="p-8 text-center text-xs text-muted">No branches configured.</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-muted border-b border-subtle text-muted text-[10px] font-bold uppercase">
                      <tr>
                        <th className="py-2.5 px-4">Branch Name</th>
                        <th className="py-2.5 px-4">Code</th>
                        <th className="py-2.5 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-subtle">
                      {details.branches.map((b) => (
                        <tr key={b.id} className="hover:bg-surface-muted/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-primary">{b.name}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-muted">{b.code}</td>
                          <td className="py-3 px-4 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-success-subtle text-success border border-success-border">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>

            {/* Team Users Table */}
            <Card className="border-subtle bg-surface shadow-xs overflow-hidden flex flex-col">
              <div className="p-4 border-b border-subtle bg-surface-muted/50 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" />
                  Team Members & Staff ({(details.users || []).length})
                </span>
              </div>
              <div className="overflow-x-auto">
                {(!details.users || details.users.length === 0) ? (
                  <div className="p-8 text-center text-xs text-muted">No users registered yet.</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-muted border-b border-subtle text-muted text-[10px] font-bold uppercase">
                      <tr>
                        <th className="py-2.5 px-4">Member</th>
                        <th className="py-2.5 px-4">Role</th>
                        <th className="py-2.5 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-subtle">
                      {details.users.map((u) => (
                        <tr key={u.id} className="hover:bg-surface-muted/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-primary">{u.fullName || "User"}</div>
                            <div className="text-[10px] text-muted truncate max-w-[180px]">{u.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary-subtle text-primary border border-primary-border">
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                u.status === "ACTIVE"
                                  ? "bg-success-subtle text-success border border-success-border"
                                  : "bg-surface-muted text-muted border border-subtle"
                              }`}
                            >
                              {u.status || "Active"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* Tab 2: Payment History & Invoices */
        <Card className="border-subtle bg-surface shadow-xs overflow-hidden">
          <div className="p-5 border-b border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-primary">License Invoices & Payment Ledger</h2>
              <p className="text-xs text-muted mt-0.5">
                Official GST compliance tax invoices generated for this pharmacy license.
              </p>
            </div>
            <div className="text-right font-mono text-xs">
              <span className="text-muted">Total Paid: </span>
              <strong className="text-primary font-bold text-sm">
                {formatCurrency((details.invoices || []).reduce((acc, inv) => acc + inv.totalAmount, 0))}
              </strong>
            </div>
          </div>

          {(!details.invoices || details.invoices.length === 0) ? (
            <div className="py-16 text-center p-8 space-y-2">
              <FileText className="h-10 w-10 mx-auto text-muted/40 mb-2" />
              <p className="text-sm font-semibold text-primary">No Invoices Recorded</p>
              <p className="text-xs text-muted max-w-sm mx-auto">
                There are no paid license invoices recorded for this store yet. When an online Razorpay payment or admin
                manual payment is registered, official tax invoices will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-muted border-b border-subtle text-muted text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Base Price</th>
                    <th className="py-3 px-4 text-right">Credit / Promo</th>
                    <th className="py-3 px-4 text-right">Net Taxable</th>
                    <th className="py-3 px-4 text-right">GST (18%)</th>
                    <th className="py-3 px-4 text-right">Total Paid</th>
                    <th className="py-3 px-4">Method & IDs</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Invoice Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {details.invoices.map((inv) => {
                    const totalDeductions = (inv.discountAmount || 0) + (inv.couponDiscount || 0);
                    return (
                      <tr key={inv.id} className="hover:bg-surface-muted/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-primary">{inv.invoiceNumber}</td>
                        <td className="py-3 px-4 font-mono text-secondary text-[11px]">{formatDate(inv.invoiceDate)}</td>
                        <td className="py-3 px-4 font-medium text-primary">
                          {inv.description}
                          {inv.couponCode && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                              {inv.couponCode}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-secondary">
                          {formatCurrency(inv.originalAmount != null ? inv.originalAmount : inv.subtotal)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {totalDeductions > 0 ? (
                            <span className="text-emerald-500 font-semibold">
                              -{formatCurrency(totalDeductions)}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-primary">
                          {formatCurrency(inv.subtotal)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-muted text-[11px]">
                          {formatCurrency(inv.cgstAmount + inv.sgstAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-teal-400">
                          {formatCurrency(inv.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-secondary text-[11px]">
                          <div>{inv.paymentMethod}</div>
                          {inv.razorpayPaymentId && (
                            <div className="text-[10px] text-teal-600 font-mono font-semibold truncate max-w-[140px]" title={inv.razorpayPaymentId}>
                              {inv.razorpayPaymentId}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-subtle text-success border border-success-border">
                            <CheckCircle2 className="h-3 w-3" />
                            {inv.status}
                          </span>
                        </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadInvoice(inv)}
                            className="gap-1 h-7 px-2 text-[11px]"
                            title="Download HTML/PDF Tax Invoice"
                          >
                            <Download className="h-3 w-3 text-primary" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrintInvoice(inv)}
                            className="gap-1 h-7 px-2 text-[11px]"
                            title="Print Tax Invoice"
                          >
                            <Printer className="h-3 w-3 text-secondary" />
                            Print
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => {
              setShowPaymentModal(false);
              setPaymentRef("");
            }}
          />
          <div className="relative z-10 w-full max-w-md bg-surface border border-subtle rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-primary">Record Manual Payment</h3>
                <p className="text-xs text-secondary mt-0.5">
                  Mark payment as received for <strong className="text-primary">{details.legalName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentRef("");
                }}
                className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                Payment Reference / Transaction ID
              </label>
              <input
                type="text"
                placeholder="e.g. UPI-2026-12345 or TXN-ABCD1234"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className={inputCls}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentRef("");
                }}
                disabled={isRecording}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleRecordPayment}
                disabled={isRecording || !paymentRef.trim()}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isRecording ? "Recording…" : "Confirm Payment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
