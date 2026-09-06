import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  Layers,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { salesApi } from "../../services/salesApi";
import { ReturnReceiptView } from "../../components/returns/ReturnReceiptView";
import type { SaleReturnResponse, SaleResponse } from "@inventra/api-types";

export const ReturnDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [saleReturn, setSaleReturn] = useState<SaleReturnResponse | null>(null);
  const [originalSale, setOriginalSale] = useState<SaleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchReturnDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const retRes = await salesApi.getSaleReturn(id);
        setSaleReturn(retRes);

        // Fetch original sale metadata
        try {
          const saleRes = await salesApi.getSale(retRes.saleId);
          setOriginalSale(saleRes);
        } catch (e) {
          // Non-blocking if sale fetch fails
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || "Failed to load return details");
      } finally {
        setIsLoading(false);
      }
    };
    fetchReturnDetails();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-text-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">Loading return transaction...</p>
      </div>
    );
  }

  if (error || !saleReturn) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive-border bg-destructive-subtle px-4 py-3 text-sm text-destructive-fg mb-4">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error || "Return record not found"}</span>
        </div>
        <button
          type="button"
          onClick={() => navigate("/returns")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Returns</span>
        </button>
      </div>
    );
  }

  const refund = saleReturn.refunds?.[0];

  return (
    <div className="space-y-6 p-6">
      {/* Back button & Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => navigate("/returns")}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sales Returns</span>
        </button>

        <button
          type="button"
          onClick={() => setShowReceiptModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:opacity-90 shadow-sm transition-opacity"
        >
          <Printer className="h-4 w-4" />
          <span>Print Return Credit Note</span>
        </button>
      </div>

      {/* Return Header Card */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-text-primary">Sales Return {saleReturn.returnNumber}</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-subtle text-success-fg border border-success-border">
                {saleReturn.status}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1.5 flex items-center gap-2">
              <span>Processed on {saleReturn.returnDate}</span>
              <span>•</span>
              <span>
                Original Sale:{" "}
                <button
                  type="button"
                  onClick={() => navigate(`/sales/${saleReturn.saleId}`)}
                  className="font-mono font-semibold text-primary hover:underline"
                >
                  {originalSale?.saleNumber || saleReturn.saleId.slice(0, 8)}
                </button>
              </span>
              {originalSale?.customerName && (
                <>
                  <span>•</span>
                  <span>Customer: <strong className="text-text-primary">{originalSale.customerName}</strong></span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <span className="text-xs font-medium text-text-muted">Total Refund</span>
          <p className="mt-1 text-xl font-bold text-primary">
            ₹{saleReturn.totalRefundAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <span className="text-xs font-medium text-text-muted">Refund Method</span>
          <p className="mt-1 text-base font-bold text-text-primary uppercase">
            {refund?.refundMethod || "CASH"}
          </p>
          {refund?.transactionReference && (
            <span className="text-[11px] font-mono text-text-muted">{refund.transactionReference}</span>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <span className="text-xs font-medium text-text-muted">Items Returned</span>
          <p className="mt-1 text-xl font-bold text-text-primary">{saleReturn.lines?.length || 0} line(s)</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <span className="text-xs font-medium text-text-muted">Return Reason</span>
          <p className="mt-1 text-sm font-semibold text-text-primary truncate">{saleReturn.reason}</p>
        </div>
      </div>

      {/* Returned Lines Table */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="border-b border-border bg-surface-subtle px-6 py-3.5 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Returned Line Items & Batch Restoration
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text-primary">
            <thead className="border-b border-border text-xs font-semibold uppercase tracking-wider text-text-muted">
              <tr>
                <th className="py-3 px-6">Product Item</th>
                <th className="py-3 px-6">Returned Qty</th>
                <th className="py-3 px-6">Refund Rate</th>
                <th className="py-3 px-6">Tax</th>
                <th className="py-3 px-6">Line Total</th>
                <th className="py-3 px-6">Stock Restoration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {saleReturn.lines?.map((line, idx) => {
                const origLine = originalSale?.lines?.find((l) => l.id === line.saleLineId);
                const alloc = line.allocations?.[0];
                return (
                  <tr key={line.id || idx}>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-text-primary">
                        {origLine?.productName || `Product Line #${idx + 1}`}
                      </div>
                      <div className="text-xs text-text-muted font-mono">
                        Line #{line.lineNumber}
                      </div>
                    </td>

                    <td className="py-4 px-6 font-mono font-semibold">
                      {line.quantity} {origLine?.sellingUnit || "units"}
                    </td>

                    <td className="py-4 px-6 text-xs text-text-secondary">
                      ₹{line.unitRefundPrice?.toFixed(2)}
                    </td>

                    <td className="py-4 px-6 text-xs text-text-secondary">
                      ₹{line.taxAmount?.toFixed(2)} ({line.taxRate}%)
                    </td>

                    <td className="py-4 px-6 font-bold text-text-primary">
                      ₹{line.lineTotal?.toFixed(2)}
                    </td>

                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-subtle border border-border text-text-secondary">
                        {alloc?.stockCondition || "RESTOCKABLE"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Financial Footer */}
        <div className="border-t border-border bg-surface-subtle/40 p-6 flex flex-col items-end space-y-1.5 text-xs text-text-secondary">
          <div className="flex justify-between w-64">
            <span>Returned Subtotal:</span>
            <span className="font-mono font-semibold text-text-primary">₹{saleReturn.subtotal?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between w-64">
            <span>Tax Refunded:</span>
            <span className="font-mono font-semibold text-text-primary">₹{saleReturn.taxAmount?.toFixed(2)}</span>
          </div>
          {saleReturn.roundOffAmount !== 0 && (
            <div className="flex justify-between w-64">
              <span>Round Off:</span>
              <span className="font-mono font-semibold text-text-primary">₹{saleReturn.roundOffAmount?.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between w-64 pt-2 border-t border-border text-sm font-bold text-text-primary">
            <span>Total Refund Issued:</span>
            <span className="text-primary font-mono text-base">₹{saleReturn.totalRefundAmount?.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative rounded-xl border border-border bg-surface p-6 shadow-2xl my-8">
            <ReturnReceiptView
              saleReturn={saleReturn}
              originalSale={originalSale}
              onClose={() => setShowReceiptModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
