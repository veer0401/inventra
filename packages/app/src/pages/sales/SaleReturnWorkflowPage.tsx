import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Loader2,
  DollarSign,
  PackageCheck,
  Check,
} from "lucide-react";
import { salesApi } from "../../services/salesApi";
import { Select } from "@inventra/ui";
import { ReturnReceiptView } from "../../components/returns/ReturnReceiptView";
import type {
  SaleResponse,
  SaleReturnResponse,
  PaymentMethod,
  StockCondition,
  CreateSaleReturnRequest,
} from "@inventra/api-types";

interface ReturnLineState {
  saleLineId: string;
  selected: boolean;
  maxReturnable: number;
  returnQuantity: number;
  unitPrice: number;
  taxRate: number;
  productName: string;
  sellingUnit: string;
  batchNumber?: string;
  expiryDate?: string;
  stockCondition: StockCondition;
  batchAllocations: {
    allocationId: string;
    maxBaseQty: number;
    returnBaseQty: number;
  }[];
}

export const SaleReturnWorkflowPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [sale, setSale] = useState<SaleResponse | null>(null);
  const [returnLines, setReturnLines] = useState<ReturnLineState[]>([]);
  const [returnReason, setReturnReason] = useState("CUSTOMER_CHANGED_MIND");
  const [customReason, setCustomReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>("CASH");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedReturn, setCompletedReturn] = useState<SaleReturnResponse | null>(null);

  const fetchSale = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await salesApi.getSale(id);
      setSale(res);

      // Initialize return lines with remaining returnable quantities
      const linesState: ReturnLineState[] = res.lines.map((line) => {
        const remaining = Math.max(0, line.quantity - (line.returnedQuantity || 0));
        return {
          saleLineId: line.id,
          selected: false,
          maxReturnable: remaining,
          returnQuantity: remaining > 0 ? remaining : 0,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          productName: line.productName,
          sellingUnit: line.sellingUnit,
          batchNumber: line.allocations?.[0]?.batchNumber,
          expiryDate: line.allocations?.[0]?.expiryDate,
          stockCondition: "RESTOCKABLE",
          batchAllocations: line.allocations.map((alloc) => ({
            allocationId: alloc.id,
            maxBaseQty: alloc.allocatedBaseQuantity,
            returnBaseQty: alloc.allocatedBaseQuantity,
          })),
        };
      });

      setReturnLines(linesState);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load original sale");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSale();
  }, [id]);

  const handleToggleSelect = (lineId: string) => {
    setReturnLines((prev) =>
      prev.map((l) => (l.saleLineId === lineId ? { ...l, selected: !l.selected } : l))
    );
  };

  const handleQuantityChange = (lineId: string, val: number) => {
    setReturnLines((prev) =>
      prev.map((l) => {
        if (l.saleLineId === lineId) {
          const clamped = Math.max(0.001, Math.min(l.maxReturnable, val));
          return { ...l, returnQuantity: clamped };
        }
        return l;
      })
    );
  };

  const handleConditionChange = (lineId: string, condition: StockCondition) => {
    setReturnLines((prev) =>
      prev.map((l) => (l.saleLineId === lineId ? { ...l, stockCondition: condition } : l))
    );
  };

  const handleSelectAll = () => {
    const allSelected = returnLines.every((l) => l.selected || l.maxReturnable <= 0);
    setReturnLines((prev) =>
      prev.map((l) => (l.maxReturnable > 0 ? { ...l, selected: !allSelected } : l))
    );
  };

  // Calculate return financial preview
  const selectedItems = returnLines.filter((l) => l.selected && l.returnQuantity > 0);
  const calculatedSubtotal = selectedItems.reduce((sum, item) => {
    return sum + item.returnQuantity * item.unitPrice;
  }, 0);

  const calculatedTax = selectedItems.reduce((sum, item) => {
    const itemSubtotal = item.returnQuantity * item.unitPrice;
    return sum + itemSubtotal * (item.taxRate / 100);
  }, 0);

  const totalRefundAmount = Math.round((calculatedSubtotal + calculatedTax + Number.EPSILON) * 100) / 100;

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale || selectedItems.length === 0) return;

    const finalReason = returnReason === "OTHER" ? customReason.trim() : returnReason;
    if (!finalReason) {
      alert("Please specify a reason for this return");
      return;
    }

    const payload: CreateSaleReturnRequest = {
      returnDate: new Date().toISOString().split("T")[0],
      reason: finalReason,
      idempotencyKey: `RET-${sale.id.slice(0, 8)}-${Date.now()}`,
      lines: selectedItems.map((item) => ({
        saleLineId: item.saleLineId,
        quantity: item.returnQuantity,
        batchAllocations: item.batchAllocations.map((alloc) => ({
          saleLineBatchAllocationId: alloc.allocationId,
          returnedBaseQuantity: item.returnQuantity,
          stockCondition: item.stockCondition,
        })),
      })),
      refunds: [
        {
          refundMethod,
          amount: totalRefundAmount,
          transactionReference: transactionRef.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      ],
    };

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await salesApi.createSaleReturn(sale.id, payload);
      setCompletedReturn(res);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to process sale return";
      setError(msg);
      // If concurrency conflict or quantity error, refresh original sale
      fetchSale();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-text-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">Loading original sale details...</p>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive-border bg-destructive-subtle px-4 py-3 text-sm text-destructive-fg mb-4">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error || "Sale record not found"}</span>
        </div>
        <button
          type="button"
          onClick={() => navigate("/sales")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sales History</span>
        </button>
      </div>
    );
  }

  // If sale is voided, disallow returns
  if (sale.status === "VOIDED") {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <button
          type="button"
          onClick={() => navigate(`/sales/${sale.id}`)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sale Details</span>
        </button>

        <div className="rounded-xl border border-destructive-border bg-destructive-subtle p-6 text-destructive-fg space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-7 w-7 shrink-0" />
            <div>
              <h2 className="text-base font-bold">Cannot Return Voided Sale</h2>
              <p className="text-xs opacity-90 mt-0.5">
                This transaction ({sale.saleNumber}) was voided on {sale.voidedAt || "an earlier date"} and cannot be returned.
              </p>
            </div>
          </div>
          {sale.voidReason && (
            <p className="text-xs bg-surface p-3 rounded border border-destructive-border/40 text-text-primary">
              <span className="font-semibold">Void Reason:</span> {sale.voidReason}
            </p>
          )}
        </div>
      </div>
    );
  }

  const isEligibleForReturn = returnLines.some((l) => l.maxReturnable > 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/sales/${sale.id}`)}
            className="rounded-lg border border-border p-2 text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition-colors"
            title="Back to Sale"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-text-primary">Process Sales Return</h1>
              <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                {sale.saleNumber}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Invoice #{sale.invoiceNumber} • Sold on {sale.saleDate} • Customer: {sale.customerName || "Walk-in"}
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive-border bg-destructive-subtle px-4 py-3 text-sm text-destructive-fg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!isEligibleForReturn ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
          <PackageCheck className="h-10 w-10 mx-auto text-success-fg opacity-80 mb-2" />
          <h3 className="text-base font-semibold text-text-primary">All Items Fully Returned</h3>
          <p className="text-sm text-text-muted mt-1 max-w-md mx-auto">
            All quantities in sale {sale.saleNumber} have already been returned to inventory.
          </p>
          <button
            type="button"
            onClick={() => navigate(`/sales/${sale.id}`)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Sale Details</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmitReturn} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left 65%: Line Items Selection */}
          <div className="space-y-4 lg:col-span-8">
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                    Select Items to Return
                  </h2>
                  <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs text-text-secondary font-mono">
                    {selectedItems.length} selected
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Toggle All Eligible
                </button>
              </div>

              <div className="space-y-3">
                {returnLines.map((line) => {
                  const isEligible = line.maxReturnable > 0;
                  return (
                    <div
                      key={line.saleLineId}
                      className={`rounded-lg border p-4 transition-colors ${
                        line.selected
                          ? "border-primary bg-primary/5 shadow-xs"
                          : isEligible
                          ? "border-border hover:bg-surface-subtle/50"
                          : "border-border/60 bg-surface-subtle opacity-60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          disabled={!isEligible}
                          checked={line.selected}
                          onChange={() => handleToggleSelect(line.saleLineId)}
                          className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:opacity-40"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <div>
                              <span className="font-semibold text-sm text-text-primary">{line.productName}</span>
                              <div className="text-xs text-text-muted flex items-center gap-2 mt-0.5">
                                <span>Unit: {line.sellingUnit}</span>
                                {line.batchNumber && <span>• Batch: {line.batchNumber}</span>}
                                {line.expiryDate && <span>• Exp: {line.expiryDate}</span>}
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-xs font-semibold text-text-primary">
                                ₹{line.unitPrice.toFixed(2)} / unit
                              </span>
                              <span className="block text-[11px] text-text-muted">
                                Max returnable: {line.maxReturnable}
                              </span>
                            </div>
                          </div>

                          {/* Editable return controls when selected */}
                          {line.selected && (
                            <div className="mt-3 pt-3 border-t border-border/80 flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-text-secondary">Return Qty:</label>
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0.001"
                                  max={line.maxReturnable}
                                  value={line.returnQuantity}
                                  onChange={(e) =>
                                    handleQuantityChange(line.saleLineId, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-24 rounded border border-border bg-surface px-2.5 py-1 text-sm font-semibold text-text-primary text-center focus:ring-2 focus:ring-primary"
                                />
                                <span className="text-xs text-text-muted">{line.sellingUnit}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-text-secondary">Condition:</label>
                                <div className="w-56">
                                  <Select
                                    value={line.stockCondition}
                                    onChange={(e) =>
                                      handleConditionChange(line.saleLineId, e.target.value as StockCondition)
                                    }
                                  >
                                    <option value="RESTOCKABLE">RESTOCKABLE (Active Stock)</option>
                                    <option value="DAMAGED">DAMAGED (Quarantine)</option>
                                    <option value="EXPIRED">EXPIRED (Write-off)</option>
                                  </Select>
                                </div>
                              </div>

                              <div className="text-xs font-bold text-text-primary">
                                Refund: ₹{(line.returnQuantity * line.unitPrice * (1 + line.taxRate / 100)).toFixed(2)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reason & Remarks Card */}
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Return Reason</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Reason Code</label>
                  <Select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                  >
                    <option value="CUSTOMER_CHANGED_MIND">Customer Changed Mind</option>
                    <option value="WRONG_PRODUCT">Wrong Product Dispensed</option>
                    <option value="DAMAGED">Damaged Goods</option>
                    <option value="EXPIRED">Near Expiry / Expired</option>
                    <option value="DISPENSING_ERROR">Doctor Prescription Changed</option>
                    <option value="OTHER">Other (Specify Below)</option>
                  </Select>
                </div>

                {returnReason === "OTHER" && (
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Explanation</label>
                    <input
                      type="text"
                      required
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Specify reason for return..."
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Operator Remarks (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional return notes or batch condition observations..."
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Right 35%: Sticky Settlement Summary */}
          <div className="lg:col-span-4 space-y-4">
            <div className="sticky top-6 rounded-xl border border-border bg-surface p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" />
                Refund Settlement
              </h2>

              {/* Breakdown */}
              <div className="space-y-2 border-y border-border py-3 text-sm">
                <div className="flex justify-between text-text-secondary">
                  <span>Selected Items:</span>
                  <span className="font-semibold text-text-primary">{selectedItems.length} item(s)</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Returned Subtotal:</span>
                  <span className="font-mono">₹{calculatedSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Tax Refunded:</span>
                  <span className="font-mono">₹{calculatedTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-text-primary pt-2 border-t border-border">
                  <span>Total Refund:</span>
                  <span className="text-primary font-mono text-lg">₹{totalRefundAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Refund Payment Method */}
              <div className="space-y-3">
                <label className="block text-xs font-medium text-text-secondary">Refund Tender Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["CASH", "UPI", "CARD"] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setRefundMethod(method)}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                        refundMethod === method
                          ? "border-primary bg-primary text-primary-fg"
                          : "border-border bg-surface text-text-secondary hover:bg-surface-subtle"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>

                {refundMethod !== "CASH" && (
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Transaction Reference / Auth Code
                    </label>
                    <input
                      type="text"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="e.g. UPI-REF-998811"
                      className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text-primary font-mono focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={selectedItems.length === 0 || isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-primary-fg shadow hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing Return...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    <span>Confirm & Process Return</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Return Success Modal */}
      {completedReturn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md rounded-xl border border-border bg-surface shadow-2xl p-6 space-y-4 my-8">
            <div className="text-center space-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-subtle text-success-fg mx-auto mb-2">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-text-primary">Return Processed Successfully!</h3>
              <p className="text-xs text-text-muted">
                Return Credit Note <span className="font-mono font-bold text-text-primary">{completedReturn.returnNumber}</span> has been issued.
              </p>
            </div>

            {/* Receipt Preview */}
            <div className="flex justify-center my-4">
              <ReturnReceiptView
                saleReturn={completedReturn}
                originalSale={sale}
                onClose={() => navigate(`/returns/${completedReturn.id}`)}
              />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                onClick={() => navigate(`/sales/${sale.id}`)}
                className="text-xs font-medium text-text-secondary hover:text-text-primary"
              >
                Back to Sale
              </button>
              <button
                type="button"
                onClick={() => navigate(`/returns/${completedReturn.id}`)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-fg hover:opacity-90"
              >
                <span>View Return Record</span>
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
