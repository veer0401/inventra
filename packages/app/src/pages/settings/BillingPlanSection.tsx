import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Badge,
  useToast,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@inventra/ui";
import {
  Crown,
  Sparkles,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building2,
  Monitor,
  HardDrive,
  Bell,
  Download,
  FileText,
  ArrowRight,
  ShieldCheck,
  Printer,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
  Zap,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  subscriptionApi,
  type SubscriptionDetails,
  type LicenseInvoice,
  type PlanTier,
  type BillingCycle,
  type TierPricing,
  type UpgradePreview,
} from "../../services/subscriptionApi";
import { formatCurrency, formatDate } from "../../utils/formatters";

const PAGE_SIZE = 5;

// ─── Renewal Summary Modal ────────────────────────────────────────────────
// Online payment is not available; the modal shows the amount due and how to pay.
interface PayNowModalProps {
  open: boolean;
  onClose: () => void;
  subscription: SubscriptionDetails | null;
}

const PayNowModal: React.FC<PayNowModalProps> = ({ open, onClose, subscription }) => {
  const basePrice = subscription?.amount || 0;
  const gstAmount = basePrice * 0.18;
  const totalAmount = basePrice + gstAmount;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-surface border border-subtle rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-subtle bg-surface-muted">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-subtle border border-primary-border">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary">Renew Subscription</h3>
              <p className="text-xs text-muted">Review the amount due for your current plan</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Amount summary */}
          <div className="rounded-xl border border-subtle bg-surface-muted overflow-hidden">
            <div className="px-4 py-2.5 border-b border-subtle bg-surface flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Amount Due</span>
              <span className="text-xs font-semibold text-primary">{subscription?.planName}</span>
            </div>
            <div className="divide-y divide-subtle">
              <div className="flex justify-between px-4 py-2 text-xs text-secondary">
                <span>Billing Cycle</span>
                <span className="font-medium text-primary capitalize">{subscription?.billingCycle?.toLowerCase() ?? "—"}</span>
              </div>
              <div className="flex justify-between px-4 py-2 text-xs text-secondary">
                <span>Base Plan Price</span>
                <span className="font-mono">{formatCurrency(basePrice)}</span>
              </div>
              <div className="flex justify-between px-4 py-2 text-xs text-secondary">
                <span>GST (18%)</span>
                <span className="font-mono">{formatCurrency(gstAmount)}</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm font-bold text-primary bg-primary-subtle">
                <span>Total Payable</span>
                <span className="font-mono text-primary text-base">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-subtle bg-surface-muted flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-secondary leading-relaxed">
              Online payment is not available. To renew, contact Inventra support and quote the total above. Once your
              payment is recorded by an administrator, the tax invoice appears under Billing History.
            </p>
          </div>

          <Button variant="outline" onClick={onClose} className="w-full">Close</Button>
        </div>
      </div>
    </div>
  );
};

// ─── Plan Upgrade Summary Modal ───────────────────────────────────────────
// Shows the prorated upgrade price; the upgrade itself is recorded by an administrator.
interface ProratedUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  targetPlan: { tier: PlanTier; cycle: BillingCycle; name: string; amount: number } | null;
}

const ProratedUpgradeModal: React.FC<ProratedUpgradeModalProps> = ({ open, onClose, targetPlan }) => {
  const toast = useToast();
  const [preview, setPreview] = useState<UpgradePreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  useEffect(() => {
    if (open && targetPlan) {
      setIsLoadingPreview(true);
      subscriptionApi
        .getUpgradePreview(targetPlan.tier, targetPlan.cycle)
        .then(setPreview)
        .catch(() => {
          toast.error("Could not calculate upgrade proration. Please try again.");
        })
        .finally(() => {
          setIsLoadingPreview(false);
        });
    }
  }, [open, targetPlan, toast]);

  if (!open || !targetPlan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-surface border border-subtle rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-subtle bg-surface-muted">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-subtle border border-primary-border">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-primary">Upgrade License Plan</h3>
              <p className="text-xs text-muted">Prorated credit calculation</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {isLoadingPreview ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto" />
              <p className="text-xs text-muted">Calculating unused remaining days credit from your active plan…</p>
            </div>
          ) : preview ? (
            <div className="space-y-5">
              {/* Proration Explanation Banner */}
              <div className="p-3.5 rounded-xl border border-success-border bg-success-subtle flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <div className="text-xs text-success-fg leading-relaxed">
                  <strong>Prorated Credit Applied:</strong> You have <strong>{preview.daysRemaining} days remaining</strong> on your current {preview.currentTier} plan. We have credited <strong>{formatCurrency(preview.unusedCredit)}</strong> directly towards your new {preview.targetTier} plan.
                </div>
              </div>

              {/* Math Breakdown */}
              <div className="rounded-xl border border-subtle bg-surface-muted overflow-hidden">
                <div className="px-3.5 py-2 border-b border-subtle bg-surface">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Upgrade Breakdown</span>
                </div>
                <div className="divide-y divide-subtle text-xs">
                  <div className="flex justify-between px-3.5 py-2 text-secondary">
                    <span>New Plan ({preview.targetTier})</span>
                    <span className="font-mono font-medium text-primary">{formatCurrency(preview.targetPrice)}</span>
                  </div>
                  <div className="flex justify-between px-3.5 py-2 text-secondary">
                    <span>Remaining Days ({preview.daysRemaining}d)</span>
                    <span className="font-mono text-muted">@{formatCurrency(preview.dailyRate)}/d</span>
                  </div>
                  <div className="flex justify-between px-3.5 py-2 text-success font-semibold">
                    <span>Less: Unused Credit</span>
                    <span className="font-mono">- {formatCurrency(preview.unusedCredit)}</span>
                  </div>
                  <div className="flex justify-between px-3.5 py-2 text-secondary">
                    <span>Net Taxable Subtotal</span>
                    <span className="font-mono font-bold text-primary">{formatCurrency(preview.netSubtotal)}</span>
                  </div>
                  <div className="flex justify-between px-3.5 py-2 text-secondary">
                    <span>GST (18%)</span>
                    <span className="font-mono">{formatCurrency(preview.cgstAmount + preview.sgstAmount)}</span>
                  </div>
                  <div className="flex justify-between px-3.5 py-2.5 bg-primary-subtle text-primary font-bold">
                    <span>Total Payable</span>
                    <span className="font-mono text-sm">{formatCurrency(preview.totalPayable)}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-subtle bg-surface-muted flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-secondary leading-relaxed">
                  Online payment is not available. To upgrade to <strong>{targetPlan.name}</strong>, contact Inventra
                  support and quote the total above. An administrator will record your payment and activate the plan.
                </p>
              </div>

              <Button variant="outline" onClick={onClose} className="w-full">Close</Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// ─── Receipt Generation & Download Helpers ─────────────────────────────────
export function generateInvoiceHtml(invoice: LicenseInvoice, subscription: SubscriptionDetails | null): string {
  const formattedDate = new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${invoice.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    body { background: #f8fafc; color: #0f172a; padding: 40px 20px; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 24px; margin-bottom: 24px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon { width: 42px; height: 42px; background: #0284c7; color: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px; font-family: monospace; }
    .brand-title { font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
    .brand-sub { font-size: 11px; color: #64748b; font-family: monospace; margin-top: 2px; }
    .badge-tax { display: inline-block; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
    .inv-num { font-size: 22px; font-weight: 900; font-family: monospace; color: #0f172a; }
    .inv-date { font-size: 12px; color: #64748b; margin-top: 4px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 28px; }
    .party-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 6px; }
    .party-name { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .party-detail { font-size: 12px; color: #475569; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    th { background: #f1f5f9; text-transform: uppercase; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; color: #475569; text-align: left; padding: 12px 14px; border-bottom: 1px solid #cbd5e1; }
    td { padding: 14px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 28px; }
    .totals-box { width: 280px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 14px; font-size: 12px; color: #475569; border-bottom: 1px solid #f1f5f9; }
    .total-row.grand { background: #f0f9ff; color: #0284c7; font-weight: 800; font-size: 14px; border-bottom: none; }
    .footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; }
    .paid-stamp { color: #059669; font-weight: 800; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; }
    @media print {
      body { background: #fff; padding: 0; }
      .invoice-card { box-shadow: none; border: none; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div class="brand">
        <div class="brand-icon">IN</div>
        <div>
          <div class="brand-title">INVENTRA TECHNOLOGIES</div>
          <div class="brand-sub">Cloud Pharmacy ERP Platform · HSN/SAC: ${invoice.hsnSac}</div>
        </div>
      </div>
      <div style="text-align: right;">
        <span class="badge-tax">GST Tax Invoice</span>
        <div class="inv-num">${invoice.invoiceNumber}</div>
        <div class="inv-date">Date: <strong>${formattedDate}</strong></div>
      </div>
    </div>

    <div class="parties">
      <div>
        <div class="party-title">Billed By (Supplier)</div>
        <div class="party-name">Inventra Technologies India Pvt Ltd</div>
        <div class="party-detail">Enterprise Cloud Platform Services</div>
        <div class="party-detail">GSTIN: <span class="font-mono"><strong>27AAACI1234F1Z5</strong></span></div>
        <div class="party-detail">SAC Code: <span class="font-mono">${invoice.hsnSac}</span></div>
      </div>
      <div>
        <div class="party-title">Billed To (Customer)</div>
        <div class="party-name">${subscription?.legalName || "Patwa Medical Store"}</div>
        <div class="party-detail">GSTIN: <span class="font-mono"><strong>${subscription?.gstin || "Unregistered"}</strong></span></div>
        <div class="party-detail">Payment Mode: <strong>${invoice.paymentMethod}</strong></div>
        <div class="party-detail">Status: <strong style="color: #059669;">PAID IN FULL</strong></div>
      </div>
    </div>

    <!-- Payment Details Box -->
    <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px;">
      <div>
        <span style="color: #64748b; text-transform: uppercase; font-size: 10px; font-weight: 700; display: block; margin-bottom: 2px;">Payment Method</span>
        <span style="color: #0f766e; font-weight: 700;">${invoice.paymentMethod || 'Manual Payment'}</span>
      </div>
      <div style="text-align: right;">
        <span style="color: #64748b; text-transform: uppercase; font-size: 10px; font-weight: 700; display: block; margin-bottom: 2px;">Payment Status</span>
        <span style="color: #059669; font-weight: 800;">✔ PAID</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-center">SAC</th>
          <th class="text-right">Taxable (₹)</th>
          <th class="text-right">CGST 9% (₹)</th>
          <th class="text-right">SGST 9% (₹)</th>
          <th class="text-right">Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-weight: 600;">${invoice.description}</td>
          <td class="text-center font-mono">${invoice.hsnSac}</td>
          <td class="text-right font-mono">₹${invoice.subtotal.toFixed(2)}</td>
          <td class="text-right font-mono">₹${invoice.cgstAmount.toFixed(2)}</td>
          <td class="text-right font-mono">₹${invoice.sgstAmount.toFixed(2)}</td>
          <td class="text-right font-mono" style="font-weight: 700; color: #0f172a;">₹${invoice.totalAmount.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals-wrap">
      <div class="totals-box">
        ${((invoice.discountAmount || 0) > 0 || ((invoice.couponDiscount || 0) > 0)) ? `
        <div class="total-row"><span>Base Plan Price</span><span class="font-mono">₹${(invoice.originalAmount || (invoice.subtotal + (invoice.discountAmount || 0) + (invoice.couponDiscount || 0))).toFixed(2)}</span></div>
        ${(invoice.discountAmount || 0) > 0 ? `<div class="total-row" style="color: #15803d;"><span>Less: Prorated Credit</span><span class="font-mono">-₹${(invoice.discountAmount || 0).toFixed(2)}</span></div>` : ''}
        ${(invoice.couponDiscount || 0) > 0 ? `<div class="total-row" style="color: #0369a1;"><span>Less: Promo Discount ${invoice.couponCode ? `(${invoice.couponCode})` : ''}</span><span class="font-mono">-₹${(invoice.couponDiscount || 0).toFixed(2)}</span></div>` : ''}
        <div class="total-row" style="border-top: 1px dashed #cbd5e1; padding-top: 6px; margin-top: 4px;"><span>Net Taxable Subtotal</span><span class="font-mono">₹${invoice.subtotal.toFixed(2)}</span></div>
        ` : `
        <div class="total-row"><span>Taxable Amount</span><span class="font-mono">₹${invoice.subtotal.toFixed(2)}</span></div>
        `}
        <div class="total-row"><span>CGST (9%)</span><span class="font-mono">₹${invoice.cgstAmount.toFixed(2)}</span></div>
        <div class="total-row"><span>SGST (9%)</span><span class="font-mono">₹${invoice.sgstAmount.toFixed(2)}</span></div>
        <div class="total-row grand"><span>Total Paid</span><span class="font-mono">₹${invoice.totalAmount.toFixed(2)}</span></div>
      </div>
    </div>

    <div class="footer">
      <div>System-generated computerized tax invoice · No physical signature required</div>
      <div class="paid-stamp">✔ STATUS: PAID</div>
    </div>
  </div>
</body>
</html>`;
}

export async function downloadInvoiceFile(invoice: LicenseInvoice, subscription: SubscriptionDetails | null) {
  try {
    const blob = await subscriptionApi.downloadInvoicePdfBlob(invoice.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Inventra-Invoice-${invoice.invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    const html = generateInvoiceHtml(invoice, subscription);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Inventra-Invoice-${invoice.invoiceNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export function printInvoiceDocument(invoice: LicenseInvoice, subscription: SubscriptionDetails | null) {
  const html = generateInvoiceHtml(invoice, subscription);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  } else {
    downloadInvoiceFile(invoice, subscription);
  }
}

// ─── Receipt Modal ─────────────────────────────────────────────────────────
interface ReceiptModalProps {
  invoice: LicenseInvoice | null;
  subscription: SubscriptionDetails | null;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ invoice, subscription, onClose }) => {
  const toast = useToast();
  if (!invoice) return null;

  return (
    <Dialog open={Boolean(invoice)} onOpenChange={(open) => { if (!open) onClose(); }} className="max-w-2xl">
      <div>
        <DialogHeader>
          <DialogTitle>Tax Invoice — {invoice.invoiceNumber}</DialogTitle>
          <DialogDescription>GST-compliant B2B SaaS invoice · SAC: {invoice.hsnSac}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Header block */}
          <div className="rounded-xl border border-subtle bg-surface-muted overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center font-mono font-bold text-xs text-primary-fg shadow-sm">IN</div>
                  <div>
                    <div className="font-black text-sm text-primary leading-tight">INVENTRA PLATFORM</div>
                    <div className="text-[10px] font-mono text-muted">Cloud SaaS Subscription Service</div>
                  </div>
                </div>
                <div className="text-xs text-muted leading-relaxed space-y-0.5">
                  <div>Official Subscription License Invoice & Receipt</div>
                  <div>SAC Code: <strong className="font-mono text-primary">{invoice.hsnSac}</strong></div>
                </div>
              </div>
              <div className="text-left sm:text-right space-y-1.5 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-success-subtle text-success border border-success-border">
                  <CheckCircle2 className="h-3.5 w-3.5" />TAX INVOICE
                </span>
                <div className="text-lg font-black font-mono text-primary">{invoice.invoiceNumber}</div>
                <div className="text-[11px] text-muted">Date: <strong className="text-secondary">{formatDate(invoice.invoiceDate)}</strong></div>
              </div>
            </div>
            <div className="border-t border-subtle p-4 bg-surface">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Billed To</div>
              <div className="font-bold text-sm text-primary">{subscription?.legalName}</div>
              <div className="text-xs text-secondary mt-0.5">GSTIN: <span className="font-mono font-semibold">{subscription?.gstin || "Unregistered"}</span></div>
              <div className="text-xs text-muted mt-0.5">Payment Mode: {invoice.paymentMethod}</div>
            </div>

            {/* Payment details */}
            <div className="border-t border-subtle p-3 bg-surface-muted flex items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted block">Payment Method</span>
                <span className="font-semibold text-primary">{invoice.paymentMethod || "Manual Payment"}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-success-subtle text-success border border-success-border w-fit">
                ✔ Paid
              </span>
            </div>
          </div>

          {/* Line items */}
          <div className="rounded-xl border border-subtle overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-muted uppercase text-[10px] font-bold tracking-wider border-b border-subtle">
                <tr>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-3 text-center">SAC</th>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-right">CGST 9%</th>
                  <th className="py-2.5 px-3 text-right">SGST 9%</th>
                  <th className="py-2.5 px-3 text-right font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-surface">
                  <td className="py-3 px-4 font-medium text-primary">{invoice.description}</td>
                  <td className="py-3 px-3 text-center font-mono text-muted">{invoice.hsnSac}</td>
                  <td className="py-3 px-3 text-right font-mono text-secondary">{formatCurrency(invoice.subtotal)}</td>
                  <td className="py-3 px-3 text-right font-mono text-muted">{formatCurrency(invoice.cgstAmount)}</td>
                  <td className="py-3 px-3 text-right font-mono text-muted">{formatCurrency(invoice.sgstAmount)}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-primary">{formatCurrency(invoice.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 rounded-xl border border-subtle bg-surface-muted overflow-hidden">
              <div className="divide-y divide-subtle">
                {((invoice.discountAmount || 0) > 0 || ((invoice.couponDiscount || 0) > 0)) && (
                  <>
                    <div className="flex justify-between px-4 py-2 text-xs text-secondary">
                      <span>Base Plan Price</span>
                      <span className="font-mono">{formatCurrency(invoice.originalAmount || (invoice.subtotal + (invoice.discountAmount || 0) + (invoice.couponDiscount || 0)))}</span>
                    </div>
                    {(invoice.discountAmount || 0) > 0 && (
                      <div className="flex justify-between px-4 py-2 text-xs text-success font-medium">
                        <span>Less: Prorated Credit</span>
                        <span className="font-mono">-{formatCurrency(invoice.discountAmount || 0)}</span>
                      </div>
                    )}
                    {(invoice.couponDiscount || 0) > 0 && (
                      <div className="flex justify-between px-4 py-2 text-xs text-sky-600 font-medium">
                        <span>Promo Code {invoice.couponCode ? `(${invoice.couponCode})` : ""}</span>
                        <span className="font-mono">-{formatCurrency(invoice.couponDiscount || 0)}</span>
                      </div>
                    )}
                  </>
                )}
                {[
                  { label: ((invoice.discountAmount || 0) > 0 || ((invoice.couponDiscount || 0) > 0)) ? "Net Taxable Subtotal" : "Taxable Amount", value: invoice.subtotal },
                  { label: "CGST @ 9%", value: invoice.cgstAmount },
                  { label: "SGST @ 9%", value: invoice.sgstAmount },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between px-4 py-2 text-xs text-secondary">
                    <span>{row.label}</span>
                    <span className="font-mono">{formatCurrency(row.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-3 text-sm font-bold text-primary bg-primary-subtle">
                  <span>Total Paid</span>
                  <span className="font-mono">{formatCurrency(invoice.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-subtle">
            <div className="space-y-0.5">
              <div className="text-[10px] text-muted font-mono">System-generated · No signature required</div>
              <div className="text-[10px] text-success font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />PAID
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => printInvoiceDocument(invoice, subscription)}
                className="gap-1.5 text-xs"
              >
                <Printer className="h-3.5 w-3.5" />Print
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  downloadInvoiceFile(invoice, subscription);
                  toast.success("Invoice downloaded successfully.");
                }}
                className="gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" />Download Invoice
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
export const BillingPlanSection: React.FC = () => {
  const toast = useToast();

  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [invoices, setInvoices] = useState<LicenseInvoice[]>([]);
  const [tierPricing, setTierPricing] = useState<TierPricing[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTogglingAutopay, setIsTogglingAutopay] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<LicenseInvoice | null>(null);
  const [planToConfirm, setPlanToConfirm] = useState<{
    tier: PlanTier; cycle: BillingCycle; name: string; amount: number;
  } | null>(null);
  const [showPayNow, setShowPayNow] = useState(false);

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [invoicePage, setInvoicePage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));
  const pagedInvoices = invoices.slice(invoicePage * PAGE_SIZE, (invoicePage + 1) * PAGE_SIZE);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [subData, invData, pricingData] = await Promise.all([
        subscriptionApi.getCurrentSubscription(),
        subscriptionApi.getInvoices(),
        subscriptionApi.getPublicPricing().catch(() => null),
      ]);
      setSubscription(subData);
      setInvoices(invData);
      if (pricingData?.tiers) setTierPricing(pricingData.tiers);
      if (subData?.billingCycle) setBillingCycle(subData.billingCycle);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load subscription details.");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggleAutopay = async () => {
    if (!subscription) return;
    setIsTogglingAutopay(true);
    try {
      const updated = await subscriptionApi.toggleAutopay(!subscription.autoRenew);
      setSubscription(updated);
      toast.success(updated.autoRenew ? "AutoPay enabled." : "AutoPay disabled.");
    } catch {
      toast.error("Failed to update AutoPay setting.");
    } finally {
      setIsTogglingAutopay(false);
    }
  };

  // Build tier display list — use API prices when available, else hardcoded fallbacks
  const TIER_FALLBACKS: { tier: PlanTier; name: string; monthlyPrice: number; description: string; popular?: boolean; features: string[] }[] = [
    {
      tier: "STARTER", name: "Starter Dispensary", monthlyPrice: 999,
      description: "Essential billing & inventory control for independent single-counter pharmacies.",
      features: ["1 Active POS Counter", "1 Store License", "2 GB Cloud Storage", "Cash & UPI Receipts", "500 Alerts / mo"],
    },
    {
      tier: "PRO", name: "Pharmacy Pro", monthlyPrice: 2499, popular: true,
      description: "High-speed multi-terminal sync, FEFO batch expiry control, and automated GST compliance.",
      features: ["5 Synchronized Workstations", "2 Branch Licenses", "10 GB Cloud Vault", "FEFO Expiry Routing", "CSV Importer", "Operator Audit Trails", "2,000 Alerts / mo", "Priority Support"],
    },
    {
      tier: "ENTERPRISE", name: "Enterprise Multi-Store", monthlyPrice: 5999,
      description: "Unlimited terminals, multi-branch distribution, and dedicated account SLAs.",
      features: ["25+ POS Workstations", "10+ Branch Licenses", "100 GB Cloud Storage", "Warehouse Transfers", "GST Ledger Sync", "10,000 Alerts / mo", "Custom API Integrations", "99.99% SLA"],
    },
  ];

  const displayTiers = TIER_FALLBACKS.map((fb) => {
    const live = tierPricing.find((t) => t.tier === fb.tier);
    const discountPct = live?.annualDiscountPct ?? 20;
    const monthlyPrice = live?.monthlyPrice ?? fb.monthlyPrice;
    const price = billingCycle === "ANNUALLY" ? Math.round(monthlyPrice * 12 * (1 - discountPct / 100)) : monthlyPrice;
    return {
      ...fb,
      name: live?.planName ?? fb.name,
      description: live?.description ?? fb.description,
      monthlyPrice,
      price,
      discountPct,
    };
  });

  if (isLoading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted">Loading subscription plan and billing data…</p>
      </div>
    );
  }

  const currentTier = subscription?.tier || "STARTER";
  const daysRemaining = subscription?.daysRemaining ?? 0;
  const isActive = subscription?.status === "ACTIVE" && daysRemaining > 0;
  const isPastDue = subscription?.status === "PAST_DUE" || (Boolean(subscription?.currentPeriodEnd) && daysRemaining === 0);
  const isDueSoon = isActive && daysRemaining <= 7;

  return (
    <div className="space-y-6">

      {/* ── Hero Subscription Card ─────────────────────────────────── */}
      <Card className="overflow-hidden border-subtle bg-surface relative shadow-sm">
        {isDueSoon && (
          <div className="flex items-center gap-2 px-6 py-2.5 bg-warning-subtle border-b border-warning-border text-xs font-medium text-warning-fg">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Subscription renewal due in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}.
          </div>
        )}
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Crown className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-primary">
                      {subscription?.planName || "Inventra Dispensary"}
                    </h2>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-subtle text-success border border-success-border">
                        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                        ACTIVE LICENSE
                      </span>
                    ) : isPastDue ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-danger-subtle text-danger border border-danger-border">
                        PAST DUE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warning-subtle text-warning border border-warning-border">
                        PENDING ACTIVATION
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-secondary mt-0.5">
                    Registered to <strong className="text-primary">{subscription?.legalName}</strong> (GSTIN:{" "}
                    <span className="font-mono">{subscription?.gstin || "Unregistered"}</span>)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {/* Next Due */}
                <div className="p-3 rounded-lg bg-surface-muted border border-subtle">
                  <div className="flex items-center gap-1.5 text-xs text-muted font-medium">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>Next Due Date</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-primary mt-1">
                    {subscription?.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : "—"}
                  </div>
                  <div className={`text-[11px] font-medium mt-0.5 ${isDueSoon ? "text-warning" : isActive ? "text-success" : "text-muted"}`}>
                    {subscription?.currentPeriodEnd
                      ? daysRemaining > 0
                        ? `${daysRemaining} days remaining`
                        : "Due today"
                      : "No active period"}
                  </div>
                </div>

                {/* Subscription Fee + AutoPay */}
                <div className="p-3 rounded-lg bg-surface-muted border border-subtle">
                  <div className="flex items-center gap-1.5 text-xs text-muted font-medium">
                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                    <span>Subscription Fee</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-primary mt-1">
                    {formatCurrency(subscription?.amount)}{" "}
                    <span className="text-xs font-normal text-muted">/ {subscription?.billingCycle?.toLowerCase() || "monthly"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAutopay}
                    disabled={isTogglingAutopay}
                    className="flex items-center gap-1.5 mt-1.5 cursor-pointer group disabled:opacity-50"
                    title={subscription?.autoRenew ? "Click to disable AutoPay" : "Click to enable AutoPay"}
                  >
                    {subscription?.autoRenew ? (
                      <ToggleRight className="h-4 w-4 text-success group-hover:opacity-70 transition-opacity" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted group-hover:text-primary transition-colors" />
                    )}
                    <span className={`text-[11px] font-medium transition-colors ${subscription?.autoRenew ? "text-success" : "text-muted group-hover:text-primary"}`}>
                      {isTogglingAutopay ? "Updating…" : subscription?.autoRenew ? "AutoPay ON" : "AutoPay OFF"}
                    </span>
                  </button>
                </div>

                {/* Payment Method */}
                <div className="p-3 rounded-lg bg-surface-muted border border-subtle">
                  <div className="flex items-center gap-1.5 text-xs text-muted font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    <span>Payment Method</span>
                  </div>
                  <div className="text-sm font-medium text-primary mt-1 truncate">
                    {subscription?.paymentMethodSummary || "Not configured"}
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {subscription?.paymentMethodSummary ? "Secured" : "None on file"}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 justify-center">
              <Button
                variant="primary"
                onClick={() => document.getElementById("planning-tiers-matrix")?.scrollIntoView({ behavior: "smooth" })}
                className="gap-2 shadow-sm shadow-primary/20"
              >
                <Sparkles className="h-4 w-4" />
                Change Plan Tier
              </Button>

              {/* Pay Now — always visible */}
              <Button
                variant={subscription?.autoRenew ? "outline" : "outline"}
                onClick={() => setShowPayNow(true)}
                className={`gap-2 text-xs ${
                  !subscription?.autoRenew
                    ? "border-warning-border text-warning-fg hover:bg-warning-subtle"
                    : ""
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                {subscription?.autoRenew ? "Pay Manually" : "Pay Now"}
              </Button>

              {invoices.length > 0 && (
                <Button variant="outline" onClick={() => setSelectedInvoice(invoices[0])} className="gap-2 text-xs">
                  <FileText className="h-3.5 w-3.5" />
                  Latest Receipt
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Quota Utilization ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Terminals", used: subscription?.quotas.workstationsUsed ?? 1, limit: subscription?.quotas.workstationsLimit ?? 5, unit: "", icon: Monitor, color: "bg-info", iconColor: "text-info", sub: "Desktop & Web POS points" },
          { label: "Dispensary Stores", used: subscription?.quotas.branchesUsed ?? 1, limit: subscription?.quotas.branchesLimit ?? 2, unit: " branches", icon: Building2, color: "bg-success", iconColor: "text-success", sub: "Licensed storefront branches" },
          { label: "Cloud Ledger Vault", used: subscription?.quotas.storageUsedGb ?? 1.2, limit: subscription?.quotas.storageLimitGb ?? 10, unit: " GB", icon: HardDrive, color: "bg-accent", iconColor: "text-accent", sub: "Encrypted offline sync backups" },
          { label: "Alerts Dispatched", used: subscription?.quotas.alertsUsed ?? 450, limit: subscription?.quotas.alertsLimit ?? 2000, unit: "", icon: Bell, color: "bg-warning", iconColor: "text-warning", sub: "Expiry & shipment alerts this cycle" },
        ].map((quota) => {
          const pct = Math.min(100, (quota.used / quota.limit) * 100);
          return (
            <Card key={quota.label} className="p-4 border-subtle bg-surface shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-secondary uppercase">{quota.label}</span>
                <quota.icon className={`h-4 w-4 ${quota.iconColor}`} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono text-primary">{quota.used}</span>
                <span className="text-xs text-muted font-mono">/ {quota.limit}{quota.unit}</span>
              </div>
              <div className="w-full bg-surface-muted h-1.5 rounded-full overflow-hidden">
                <div className={`${quota.color} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
              <div className="text-[11px] text-muted">{quota.sub}</div>
            </Card>
          );
        })}
      </div>

      {/* ── Plan Tier Matrix ───────────────────────────────────────── */}
      <div id="planning-tiers-matrix" className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-4">
          <div>
            <h3 className="text-lg font-bold text-primary">Planning Tiers & Licensing Options</h3>
            <p className="text-xs text-secondary mt-0.5">Select the optimal capacity. Upgrades take effect immediately.</p>
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-surface-muted border border-subtle self-start sm:self-auto">
            {(["MONTHLY", "ANNUALLY"] as BillingCycle[]).map((cycle) => {
              const activeDiscount = displayTiers.find(t => t.tier === currentTier)?.discountPct ?? 20;
              return (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setBillingCycle(cycle)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                    billingCycle === cycle ? "bg-primary text-primary-fg shadow-xs" : "text-muted hover:text-primary"
                  }`}
                >
                  {cycle === "MONTHLY" ? "Monthly" : (
                    <>Annual <span className="px-1.5 rounded text-[9px] font-bold bg-success text-white">SAVE {activeDiscount}%</span></>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayTiers.map((tierDef) => {
            const isCurrent = currentTier === tierDef.tier;
            return (
              <Card
                key={tierDef.tier}
                className={`flex flex-col justify-between relative p-6 border transition-all ${
                  isCurrent ? "border-primary ring-2 ring-primary/20 bg-primary-subtle shadow-md" : "border-subtle hover:border-strong bg-surface"
                }`}
              >
                {tierDef.popular && (
                  <div className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-fg uppercase tracking-wider shadow-xs">
                    Most Popular
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-bold text-primary">{tierDef.name}</h4>
                    <div
                      className="text-xs text-secondary mt-1 min-h-[36px] leading-relaxed [&_ul]:list-disc [&_ul]:pl-3 [&_b]:font-bold [&_strong]:font-bold [&_em]:italic"
                      dangerouslySetInnerHTML={{ __html: tierDef.description }}
                    />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black font-mono text-primary">{formatCurrency(tierDef.price)}</span>
                    <span className="text-xs text-muted font-medium">/ {billingCycle === "ANNUALLY" ? "year" : "month"}</span>
                  </div>
                  <div className="h-px bg-subtle" />
                  <ul className="space-y-2">
                    {tierDef.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-xs text-secondary">
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-6 mt-6 border-t border-subtle">
                  {isCurrent ? (
                    <Button variant="outline" disabled className="w-full gap-2 border-primary/40 text-primary">
                      <CheckCircle2 className="h-4 w-4" />Current Active Plan
                    </Button>
                  ) : (
                    <Button
                      variant={tierDef.tier === "ENTERPRISE" ? "primary" : "outline"}
                      onClick={() => setPlanToConfirm({ tier: tierDef.tier, cycle: billingCycle, name: tierDef.name, amount: tierDef.price })}
                      className="w-full gap-2"
                    >
                      Switch to {tierDef.name}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Invoice History ────────────────────────────────────────── */}
      <div className="space-y-4 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-subtle pb-4">
          <div>
            <h3 className="text-lg font-bold text-primary">License Purchase & GST Invoices</h3>
            <p className="text-xs text-secondary mt-0.5">Official tax invoices for software licensing and cloud hosting subscriptions.</p>
          </div>
          <span className="text-xs text-muted font-mono">HSN/SAC: 997331 (SaaS)</span>
        </div>

        <div className="rounded-xl border border-subtle bg-surface overflow-hidden shadow-xs">
          {invoices.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-8 w-8 text-muted mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-primary">No Invoices Found</p>
              <p className="text-xs text-secondary mt-0.5">
                License invoices will appear here once subscription payments are recorded.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-subtle bg-surface-muted text-muted font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Invoice #</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3 text-right">Plan Price</th>
                    <th className="py-3 px-3 text-right">Deductions</th>
                    <th className="py-3 px-3 text-right">Subtotal</th>
                    <th className="py-3 px-3 text-right">GST 18%</th>
                    <th className="py-3 px-3 text-right">Total Paid</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {pagedInvoices.map((inv) => {
                    const original = inv.originalAmount || (inv.subtotal + (inv.discountAmount || 0) + (inv.couponDiscount || 0));
                    const totalDeductions = (inv.discountAmount || 0) + (inv.couponDiscount || 0);
                    return (
                      <tr key={inv.id} className="hover:bg-surface-muted transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-primary">{inv.invoiceNumber}</td>
                        <td className="py-3 px-3 text-secondary font-mono">{formatDate(inv.invoiceDate)}</td>
                        <td className="py-3 px-3 text-primary font-medium">
                          {inv.description}
                          <div className="text-[10px] text-muted font-mono">{inv.paymentMethod}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-secondary">
                          {formatCurrency(original)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          {totalDeductions > 0 ? (
                            <div className="text-success font-semibold">
                              -{formatCurrency(totalDeductions)}
                              {inv.couponCode && <div className="text-[9px] text-sky-600 font-mono">PROMO: {inv.couponCode}</div>}
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-secondary">{formatCurrency(inv.subtotal)}</td>
                        <td className="py-3 px-3 text-right font-mono text-muted">{formatCurrency(inv.cgstAmount + inv.sgstAmount)}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-primary">{formatCurrency(inv.totalAmount)}</td>
                        <td className="py-3 px-3 text-center"><Badge variant="success">PAID</Badge></td>
                        <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(inv)} className="gap-1.5 text-xs hover:text-primary">
                            <FileText className="h-3.5 w-3.5" />View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              downloadInvoiceFile(inv, subscription);
                              toast.success("Invoice downloaded.");
                            }}
                            className="gap-1.5 text-xs hover:text-primary"
                          >
                            <Download className="h-3.5 w-3.5" />Download
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
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-subtle bg-surface-muted text-xs text-muted">
              <span>Showing {invoicePage * PAGE_SIZE + 1}–{Math.min((invoicePage + 1) * PAGE_SIZE, invoices.length)} of {invoices.length}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setInvoicePage((p) => Math.max(0, p - 1))} disabled={invoicePage === 0} className="gap-1 px-2">
                  <ChevronLeft className="h-3.5 w-3.5" />Prev
                </Button>
                <span className="px-2 font-medium text-secondary">{invoicePage + 1} / {totalPages}</span>
                <Button variant="ghost" size="sm" onClick={() => setInvoicePage((p) => Math.min(totalPages - 1, p + 1))} disabled={invoicePage >= totalPages - 1} className="gap-1 px-2">
                  Next<ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Plan Upgrade Summary Modal ─── */}
      <ProratedUpgradeModal
        open={Boolean(planToConfirm)}
        onClose={() => setPlanToConfirm(null)}
        targetPlan={planToConfirm}
      />

      {/* ── Modals ───────────────────────────────────────────────── */}
      <ReceiptModal invoice={selectedInvoice} subscription={subscription} onClose={() => setSelectedInvoice(null)} />
      <PayNowModal open={showPayNow} onClose={() => setShowPayNow(false)} subscription={subscription} />
    </div>
  );
};
