import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Printer,
  Ban,
  User,
  CreditCard,
  AlertTriangle,
  Package,
  RotateCcw,
} from "lucide-react";
import { Button, Badge, Input, ShortcutHint } from "@inventra/ui";
import type { VoidSaleRequest, ReceiptResponse } from "@inventra/api-types";
import { salesApi } from "../../services/salesApi";
import { useAuthStore } from "../../stores/authStore";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import { PosReceiptView } from "../../components/pos/PosReceiptView";

export const SaleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeContext } = useAuthStore();

  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState<string | null>(null);

  const [receiptData, setReceiptData] = useState<ReceiptResponse | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  const { data: sale, isLoading, isError } = useQuery({
    queryKey: ["sale-detail", id],
    queryFn: () => salesApi.getSale(id!),
    enabled: Boolean(id),
  });

  const isManagerOrOwner = activeContext?.role === "OWNER" || activeContext?.role === "MANAGER";
  const canVoid = isManagerOrOwner && sale?.status === "COMPLETED";
  const canReturn = sale?.status === "COMPLETED" || sale?.status === "PARTIALLY_RETURNED";

  // F6 Shortcut for sales return
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F6" && canReturn && id) {
        e.preventDefault();
        navigate(`/sales/${id}/return`);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canReturn, id, navigate]);

  const voidMutation = useMutation({
    mutationFn: (req: VoidSaleRequest) => salesApi.voidSale(id!, req),
    onSuccess: (data) => {
      setVoidModalOpen(false);
      setVoidReason("");
      queryClient.setQueryData(["sale-detail", id], data);
      queryClient.invalidateQueries({ queryKey: ["sales-list"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-batches"] });
    },
    onError: (err: any) => {
      setVoidError(
        err?.response?.data?.message || err?.message || "Failed to void sale. Please try again."
      );
    },
  });

  const handlePrintReceipt = async () => {
    if (!id) return;
    try {
      setLoadingReceipt(true);
      const data = await salesApi.getReceipt(id);
      setReceiptData(data);
    } catch (err) {
      console.error("Failed to load receipt:", err);
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handleVoidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidReason.trim()) return;
    setVoidError(null);
    voidMutation.mutate({ reason: voidReason.trim() });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-text-muted">
        Loading sale details...
      </div>
    );
  }

  if (isError || !sale) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-lg font-bold text-text-primary">Sale Not Found</h2>
        <p className="text-xs text-text-secondary">
          The requested commercial transaction could not be located in this business.
        </p>
        <Button variant="primary" onClick={() => navigate("/sales")}>
          Back to Sales History
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/sales")}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-text-primary">{sale.saleNumber}</h1>
              <Badge variant={sale.status === "COMPLETED" ? "success" : "secondary"}>
                {sale.status}
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5 font-mono">
              Invoice #{sale.invoiceNumber} • {formatDateTime(sale.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canReturn && (
            <Button
              variant="outline"
              onClick={() => navigate(`/sales/${sale.id}/return`)}
              className="gap-2 text-xs border-primary/40 text-primary hover:bg-primary/10"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Return Items</span>
              <ShortcutHint shortcut="F6" />
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handlePrintReceipt}
            disabled={loadingReceipt}
            className="gap-2 text-xs"
          >
            <Printer className="h-4 w-4" />
            {loadingReceipt ? "Loading..." : "Print Thermal Receipt"}
          </Button>

          {canVoid && (
            <Button
              variant="destructive"
              onClick={() => {
                setVoidError(null);
                setVoidModalOpen(true);
              }}
              className="gap-2 text-xs"
            >
              <Ban className="h-4 w-4" />
              Void Sale
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border">
          <span className="text-[11px] font-semibold text-text-muted uppercase">Total Payable</span>
          <div className="text-2xl font-black text-primary mt-1">
            {formatCurrency(sale.totalAmount)}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <span className="text-[11px] font-semibold text-text-muted uppercase">Paid Amount</span>
          <div className="text-2xl font-black text-success mt-1">
            {formatCurrency(sale.paidAmount)}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <span className="text-[11px] font-semibold text-text-muted uppercase">Change Given</span>
          <div className="text-2xl font-black text-text-secondary mt-1">
            {formatCurrency(sale.changeAmount)}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <span className="text-[11px] font-semibold text-text-muted uppercase">Line Items</span>
          <div className="text-2xl font-black text-text-primary mt-1">
            {sale.lines?.length || 0}
          </div>
        </div>
      </div>

      {/* Void Notice Banner if Voided */}
      {sale.status === "VOIDED" && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
          <Ban className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-destructive text-sm">Sale Voided</h4>
            <p className="text-xs text-text-secondary mt-0.5">
              Void Reason: {sale.voidReason || "No reason specified"}
            </p>
            <p className="text-[11px] text-text-muted mt-1">
              Voided at: {sale.voidedAt ? formatDateTime(sale.voidedAt) : "N/A"}
            </p>
          </div>
        </div>
      )}

      {/* Transaction & Customer Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border space-y-2 text-xs">
          <h3 className="font-bold text-text-primary flex items-center gap-1.5 mb-2">
            <User className="h-4 w-4 text-primary" />
            Customer & Prescription
          </h3>
          <div className="flex justify-between">
            <span className="text-text-muted">Customer Name:</span>
            {sale.customerId ? (
              <button
                type="button"
                onClick={() => navigate(`/customers/${sale.customerId}`)}
                className="font-medium text-primary hover:underline font-semibold"
              >
                {sale.customerName || "View Customer Profile"}
              </button>
            ) : (
              <span className="font-medium text-text-primary">
                {sale.customerName || "Walk-in Customer"}
              </span>
            )}
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Contact Phone:</span>
            <span>{sale.customerPhone || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Prescription Required:</span>
            <span className={sale.prescriptionRequired ? "text-destructive font-bold" : "text-text-secondary"}>
              {sale.prescriptionRequired ? "Yes (Prescription Verified)" : "No (OTC)"}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border space-y-2 text-xs">
          <h3 className="font-bold text-text-primary flex items-center gap-1.5 mb-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Settlement Breakdown
          </h3>
          <div className="flex justify-between">
            <span className="text-text-muted">Subtotal:</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>
          {sale.discountAmount > 0 && (
            <div className="flex justify-between text-success">
              <span>Overall Discount:</span>
              <span>-{formatCurrency(sale.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-text-muted">Tax Amount (GST):</span>
            <span>+{formatCurrency(sale.taxAmount)}</span>
          </div>
          {sale.roundOffAmount !== 0 && (
            <div className="flex justify-between text-text-muted">
              <span>Round Off:</span>
              <span>{formatCurrency(sale.roundOffAmount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Line Items Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border bg-surface-subtle">
          <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Line Items & FEFO Batch Allocations
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-surface-subtle text-text-muted font-semibold uppercase">
              <tr>
                <th className="py-2.5 px-4">#</th>
                <th className="py-2.5 px-4">Item Description</th>
                <th className="py-2.5 px-4 text-center">Unit</th>
                <th className="py-2.5 px-4 text-center">Qty</th>
                <th className="py-2.5 px-4 text-right">Unit Price</th>
                <th className="py-2.5 px-4 text-right">Discount</th>
                <th className="py-2.5 px-4 text-right">Tax</th>
                <th className="py-2.5 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sale.lines?.map((line) => (
                <tr key={line.id} className="align-top hover:bg-surface-subtle transition-colors">
                  <td className="py-3 px-4 font-mono text-text-muted">{line.lineNumber}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-text-primary">{line.productName}</div>
                    {line.genericName && (
                      <div className="text-[11px] text-text-muted">{line.genericName}</div>
                    )}
                    {/* Batch Allocations */}
                    {line.allocations && line.allocations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {line.allocations.map((alloc) => (
                          <span
                            key={alloc.id}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-subtle border border-border text-text-secondary"
                          >
                            Lot: {alloc.batchNumber} (Exp: {alloc.expiryDate}) • {alloc.allocatedBaseQuantity} units
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-text-secondary">{line.sellingUnit}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold">{line.quantity}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatCurrency(line.unitPrice)}</td>
                  <td className="py-3 px-4 text-right font-mono text-success">
                    {line.discountAmount > 0 ? `-${formatCurrency(line.discountAmount)}` : "—"}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-text-muted">
                    +{formatCurrency(line.taxAmount)} ({line.taxRate}%)
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-text-primary">
                    {formatCurrency(line.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Void Modal */}
      {voidModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-surface rounded-2xl border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2 rounded-xl bg-destructive/10 border border-destructive/20">
                <Ban className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-base">Void Sale Transaction</h3>
                <p className="text-xs text-text-muted font-mono">{sale.saleNumber}</p>
              </div>
            </div>

            <p className="text-xs text-text-secondary">
              Voiding this sale will automatically restore all batch inventory levels and log a reverse stock audit movement. This action cannot be undone.
            </p>

            <form onSubmit={handleVoidSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Reason for Voiding *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Customer cancelled order / Cashier billing error"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {voidError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  {voidError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVoidModalOpen(false)}
                  disabled={voidMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={voidMutation.isPending || voidReason.trim().length < 3}
                  className="gap-1.5"
                >
                  {voidMutation.isPending ? "Voiding..." : "Confirm Void"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <PosReceiptView receipt={receiptData} onClose={() => setReceiptData(null)} />
        </div>
      )}
    </div>
  );
};
