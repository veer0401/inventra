import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Receipt,
  ShoppingCart,
  Eye,
  Printer,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  X,
} from "lucide-react";
import { Button, Badge, Select } from "@inventra/ui";
import type { SaleStatus, ReceiptResponse } from "@inventra/api-types";
import { salesApi } from "../../services/salesApi";
import { useAuthStore } from "../../stores/authStore";
import { formatCurrency } from "../../utils/formatters";
import { PosReceiptView } from "../../components/pos/PosReceiptView";

export const SalesPage: React.FC = () => {
  const navigate = useNavigate();
  const activeContext = useAuthStore((state) => state.activeContext);

  const [statusFilter, setStatusFilter] = useState<SaleStatus | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const [activeReceipt, setActiveReceipt] = useState<ReceiptResponse | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sales-list", activeContext?.storeId, statusFilter, startDate, endDate, page],
    queryFn: () =>
      salesApi.listSales({
        storeId: activeContext?.storeId || undefined,
        status: statusFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        size: pageSize,
      }),
    enabled: Boolean(activeContext?.storeId),
  });

  const handlePrintReceipt = async (saleId: string) => {
    try {
      setLoadingReceiptId(saleId);
      const receipt = await salesApi.getReceipt(saleId);
      setActiveReceipt(receipt);
    } catch (err) {
      console.error("Failed to load receipt:", err);
    } finally {
      setLoadingReceiptId(null);
    }
  };

  const sales = data?.content || [];
  const totalPages = data?.totalPages || 0;

  const formatDateOnly = (isoString?: string | null) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return String(isoString);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(isoString);
    }
  };

  const formatTimeOnly = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  const getRelativeTimeBadge = (isoString?: string | null) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return null;
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Today
          </span>
        );
      }
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) {
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-muted text-text-muted border border-border">
            Yesterday
          </span>
        );
      }
      return null;
    } catch {
      return null;
    }
  };

  const setDatePreset = (preset: "today" | "yesterday" | "last7" | "month") => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === "today") {
      const todayStr = toYmd(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(now.getDate() - 1);
      const yStr = toYmd(y);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === "last7") {
      const d7 = new Date();
      d7.setDate(now.getDate() - 6);
      setStartDate(toYmd(d7));
      setEndDate(toYmd(now));
    } else if (preset === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toYmd(firstDay));
      setEndDate(toYmd(now));
    }
    setPage(0);
  };

  const renderStatusBadge = (status: SaleStatus) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="success">Completed</Badge>;
      case "VOIDED":
        return <Badge variant="secondary">Voided</Badge>;
      case "PARTIALLY_RETURNED":
        return <Badge variant="warning">Partial Return</Badge>;
      case "FULLY_RETURNED":
        return <Badge variant="destructive">Returned</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-text-primary">Sales & Invoices</h1>
            {activeContext?.storeName && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary/10 text-secondary border border-secondary/20">
                {activeContext.storeName}
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Commercial transaction history, invoices, and completed customer receipts
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigate("/pos")}
          className="gap-2 shadow-md shadow-primary/20"
        >
          <ShoppingCart className="h-4 w-4" />
          Open POS Terminal
        </Button>
      </div>

      {/* Filters Card */}
      <div className="p-4 rounded-xl bg-surface border border-border space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary uppercase">Status:</span>
            <div className="w-48">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setPage(0);
                }}
              >
                <option value="">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="VOIDED">Voided</option>
                <option value="PARTIALLY_RETURNED">Partially Returned</option>
                <option value="FULLY_RETURNED">Fully Returned</option>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-surface-subtle px-2.5 py-1.5 rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-semibold text-text-secondary uppercase">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(0);
              }}
              className="bg-transparent border-0 p-0 text-xs text-text-primary focus:outline-none cursor-pointer"
            />
            {startDate && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setPage(0);
                }}
                className="text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
                title="Clear start date"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-surface-subtle px-2.5 py-1.5 rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-semibold text-text-secondary uppercase">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(0);
              }}
              className="bg-transparent border-0 p-0 text-xs text-text-primary focus:outline-none cursor-pointer"
            />
            {endDate && (
              <button
                type="button"
                onClick={() => {
                  setEndDate("");
                  setPage(0);
                }}
                className="text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
                title="Clear end date"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setDatePreset("today")}
              className="px-2 py-1 text-xs rounded-md border border-border bg-surface hover:bg-surface-subtle text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDatePreset("yesterday")}
              className="px-2 py-1 text-xs rounded-md border border-border bg-surface hover:bg-surface-subtle text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => setDatePreset("last7")}
              className="px-2 py-1 text-xs rounded-md border border-border bg-surface hover:bg-surface-subtle text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setDatePreset("month")}
              className="px-2 py-1 text-xs rounded-md border border-border bg-surface hover:bg-surface-subtle text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              This Month
            </button>
          </div>

          {(statusFilter || startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("");
                setStartDate("");
                setEndDate("");
                setPage(0);
              }}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Sales Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-surface-subtle text-text-muted font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Sale #</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted">
                    Loading sales records...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted">
                    <Receipt className="h-10 w-10 mx-auto text-border mb-2" />
                    <p className="font-semibold text-text-secondary">No sales recorded yet</p>
                    <p className="text-xs mt-1">Start scanning items at the POS terminal to record sales.</p>
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-surface-subtle transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-text-primary">
                      {sale.saleNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-text-secondary">
                      {sale.invoiceNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 font-medium text-text-primary whitespace-nowrap">
                          <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{formatDateOnly(sale.createdAt || sale.saleDate)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-text-muted font-mono pl-5">
                          {sale.createdAt && (
                            <>
                              <Clock className="h-3 w-3 shrink-0 opacity-70" />
                              <span>{formatTimeOnly(sale.createdAt)}</span>
                            </>
                          )}
                          {getRelativeTimeBadge(sale.createdAt)}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text-primary font-medium">
                      {sale.customerName || <span className="text-text-muted italic">Walk-in</span>}
                      {sale.customerPhone && (
                        <div className="text-[10px] text-text-muted">{sale.customerPhone}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-text-secondary">
                      {sale.lines?.length || 0}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-text-primary">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {renderStatusBadge(sale.status)}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePrintReceipt(sale.id)}
                        disabled={loadingReceiptId === sale.id}
                        className="p-1.5"
                        title="Print Receipt"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/sales/${sale.id}`)}
                        className="gap-1 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-subtle">
            <span className="text-xs text-text-muted">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <PosReceiptView receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />
        </div>
      )}
    </div>
  );
};
