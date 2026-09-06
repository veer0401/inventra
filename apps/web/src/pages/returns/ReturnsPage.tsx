import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  RotateCcw,
  Calendar,
  Printer,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { salesApi } from "../../services/salesApi";
import { ReturnReceiptView } from "../../components/returns/ReturnReceiptView";
import type { SaleReturnResponse } from "@inventra/api-types";

export const ReturnsPage: React.FC = () => {
  const navigate = useNavigate();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);

  const [data, setData] = useState<{
    content: SaleReturnResponse[];
    totalPages: number;
    totalElements: number;
  }>({
    content: [],
    totalPages: 0,
    totalElements: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiptReturn, setReceiptReturn] = useState<SaleReturnResponse | null>(null);

  const fetchReturns = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await salesApi.listReturns({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        size: pageSize,
      });
      setData({
        content: res.content,
        totalPages: res.totalPages,
        totalElements: res.totalElements,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load sales returns");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [startDate, endDate, page]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Sales Returns & Credit Notes</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {data.totalElements} Total
            </span>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Customer return transactions, refunded batches, and restocked merchandise
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
            <Calendar className="h-4 w-4 text-text-muted" />
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(0);
              }}
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(0);
              }}
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary focus:ring-2 focus:ring-primary"
            />
          </div>

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setPage(0);
              }}
              className="text-xs text-primary hover:underline font-medium"
            >
              Clear Date Filters
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive-border bg-destructive-subtle px-4 py-3 text-sm text-destructive-fg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Returns Data Table */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium">Loading sales returns...</p>
          </div>
        ) : data.content.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text-primary">
              <thead className="border-b border-border bg-surface-subtle text-xs font-semibold uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-6 py-3.5">Return #</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Reason</th>
                  <th className="px-6 py-3.5">Items</th>
                  <th className="px-6 py-3.5">Refund Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.content.map((ret) => (
                  <tr
                    key={ret.id}
                    onClick={() => navigate(`/returns/${ret.id}`)}
                    className="hover:bg-surface-subtle cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-semibold font-mono text-text-primary">{ret.returnNumber}</span>
                    </td>

                    <td className="px-6 py-4 text-xs text-text-secondary">
                      {ret.returnDate}
                    </td>

                    <td className="px-6 py-4 text-xs text-text-secondary max-w-xs truncate">
                      {ret.reason}
                    </td>

                    <td className="px-6 py-4 text-xs text-text-secondary">
                      {ret.lines?.length || 0} line(s)
                    </td>

                    <td className="px-6 py-4 font-bold text-text-primary">
                      ₹{ret.totalRefundAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-subtle text-success-fg border border-success-border">
                        {ret.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setReceiptReturn(ret)}
                          className="rounded-lg p-1.5 text-text-muted hover:bg-surface-elevated hover:text-text-primary transition-colors"
                          title="Print Return Credit Note"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/returns/${ret.id}`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors"
                        >
                          <span>Details</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <RotateCcw className="h-10 w-10 mx-auto text-text-muted opacity-40 mb-3" />
            <h3 className="text-base font-semibold text-text-primary">No sales returns recorded</h3>
            <p className="text-sm text-text-muted mt-1 max-w-sm mx-auto">
              Completed customer returns and restocked merchandise records will appear here.
            </p>
          </div>
        )}

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-3.5 text-xs text-text-secondary">
            <span>
              Showing Page {page + 1} of {data.totalPages} ({data.totalElements} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded border border-border px-2.5 py-1 disabled:opacity-40 hover:bg-surface-subtle"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= data.totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-border px-2.5 py-1 disabled:opacity-40 hover:bg-surface-subtle"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Thermal Receipt Preview Modal */}
      {receiptReturn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative rounded-xl border border-border bg-surface p-6 shadow-2xl my-8">
            <ReturnReceiptView
              saleReturn={receiptReturn}
              onClose={() => setReceiptReturn(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
