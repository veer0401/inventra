import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Package,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Select,
  Pagination,
  Spinner,
} from "@inventra/ui";
import { useAuthStore } from "../../stores/authStore";
import { reportApi } from "../../services/reportApi";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { ContextualHelpModal } from "../../components/common/ContextualHelpModal";
import { Info } from "lucide-react";

type ReportTab = "sales" | "inventory" | "expiry" | "velocity" | "scheduleH";

/** Client-side pagination helper */
function paginate<T>(
  items: T[] | undefined,
  currPage: number,
  size: number
): { paginated: T[]; totalPages: number } {
  const safeItems = items ?? [];
  const totalPages = Math.max(1, Math.ceil(safeItems.length / size));
  const start = currPage * size;
  return { paginated: safeItems.slice(start, start + size), totalPages };
}

export const ReportsPage: React.FC = () => {
  const { activeContext, memberships } = useAuthStore();

  const currentStores = useMemo(() => {
    return (
      memberships.find((m) => m.businessId === activeContext?.businessId)
        ?.stores ?? []
    );
  }, [memberships, activeContext?.businessId]);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    activeContext?.storeId ?? ""
  );
  const [activeTab, setActiveTab] = useState<ReportTab>("sales");
  const [datePreset, setDatePreset] = useState<string>("30d");

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const d30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [startDate, setStartDate] = useState<string>(
    d30Ago.toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Pagination
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(15);

  // Velocity sub-tab
  const [velocityFilter, setVelocityFilter] = useState<"fast" | "slow">("fast");

  // ── Date preset handler ───────────────────────────────────────────────────
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    const t = today.toISOString().slice(0, 10);
    if (preset === "today") {
      setStartDate(t);
      setEndDate(t);
    } else if (preset === "7d") {
      setStartDate(
        new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10)
      );
      setEndDate(t);
    } else if (preset === "30d") {
      setStartDate(
        new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10)
      );
      setEndDate(t);
    } else if (preset === "month") {
      setStartDate(
        new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .slice(0, 10)
      );
      setEndDate(t);
    }
    setPage(0);
  };

  // ── Queries ───────────────────────────────────────────────────────────────
  const salesQuery = useQuery({
    queryKey: ["reports", "sales", selectedStoreId, startDate, endDate],
    queryFn: () =>
      reportApi.getSalesReport({
        storeId: selectedStoreId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    enabled: activeTab === "sales",
  });

  const inventoryQuery = useQuery({
    queryKey: ["reports", "inventory-valuation", selectedStoreId],
    queryFn: () =>
      reportApi.getInventoryValuation({ storeId: selectedStoreId || undefined }),
    enabled: activeTab === "inventory",
  });

  const expiryQuery = useQuery({
    queryKey: ["reports", "expiry-risk", selectedStoreId],
    queryFn: () =>
      reportApi.getExpiryRisk({ storeId: selectedStoreId || undefined }),
    enabled: activeTab === "expiry",
  });

  const velocityQuery = useQuery({
    queryKey: ["reports", "velocity", selectedStoreId, startDate, endDate],
    queryFn: () =>
      reportApi.getProductVelocity({
        storeId: selectedStoreId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    enabled: activeTab === "velocity",
  });

  const scheduleHQuery = useQuery({
    queryKey: ["reports", "schedule-h", selectedStoreId, startDate, endDate],
    queryFn: () =>
      reportApi.getScheduleHRegister({
        storeId: selectedStoreId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    enabled: activeTab === "scheduleH",
  });

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExportCsv = () => {
    const esc = (v: unknown) => {
      const s = String(v ?? "").replace(/"/g, '""');
      return `"${s}"`;
    };
    const download = (
      filename: string,
      headers: string[],
      rows: unknown[][]
    ) => {
      const csv = [
        headers.map(esc).join(","),
        ...rows.map((r) => r.map(esc).join(",")),
      ].join("\r\n");
      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    if (activeTab === "sales" && salesQuery.data) {
      const d = salesQuery.data;
      download(
        "Inventra_Sales_GST_Report",
        ["Period Start", "Period End", "Total Revenue", "Total Tax", "Total Discount", "Cash", "Card", "UPI", "Other", "Total Orders"],
        [[d.startDate, d.endDate, d.totalRevenue, d.totalTax, d.totalDiscount, d.cashAmount, d.cardAmount, d.upiAmount, d.otherAmount, d.totalSalesCount]]
      );
    } else if (activeTab === "inventory" && inventoryQuery.data) {
      const d = inventoryQuery.data;
      download(
        "Inventra_Inventory_Valuation",
        ["Category", "Products", "Qty On Hand", "Cost Valuation", "Retail Valuation"],
        (d.categoryBreakdown ?? []).map((c) => [c.categoryName, c.productCount, c.totalQuantity, c.valuationAtCost, c.valuationAtRetail])
      );
    } else if (activeTab === "expiry" && expiryQuery.data) {
      download(
        "Inventra_Expiry_Risk",
        ["Product", "Batch #", "Expiry Date", "Days Left", "Quantity", "Cost Price", "Total Value", "Risk"],
        (expiryQuery.data.batches ?? []).map((b) => [
          b.productName, b.batchNumber, formatDate(b.expiryDate),
          b.daysUntilExpiry, b.quantity, b.costPrice, b.totalCostValue, b.riskLevel,
        ])
      );
    } else if (activeTab === "velocity" && velocityQuery.data) {
      const items =
        velocityFilter === "fast"
          ? velocityQuery.data.fastMovers
          : velocityQuery.data.slowMovers;
      download(
        `Inventra_Velocity_${velocityFilter.toUpperCase()}`,
        ["Product", "SKU", "Units Sold", "Revenue", "Sales Count", "Stock"],
        (items ?? []).map((i) => [i.productName, i.sku, i.totalQuantitySold, i.totalRevenue, i.salesCount, i.currentStock])
      );
    } else if (activeTab === "scheduleH" && scheduleHQuery.data) {
      download(
        "Inventra_Schedule_H_Register",
        ["Date", "Invoice #", "Patient", "Phone", "Doctor", "Doctor Reg#", "Drug", "Batch", "Qty", "Type"],
        (scheduleHQuery.data.entries ?? []).map((e) => [
          formatDate(e.saleDate), e.invoiceNumber, e.customerName, e.customerPhone,
          e.doctorName, e.doctorRegistrationNumber, e.productName, e.batchNumber, e.quantity, e.scheduleType,
        ])
      );
    }
  };

  // ── Tab button helper ─────────────────────────────────────────────────────
  const tabBtn = (
    id: ReportTab,
    label: string,
    icon: React.ReactNode
  ) => (
    <button
      type="button"
      onClick={() => { setActiveTab(id); setPage(0); }}
      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
        activeTab === id
          ? "border-primary text-primary font-semibold"
          : "border-transparent text-secondary hover:text-primary hover:border-subtle"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 print:p-0 print:max-w-none">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-lg border border-subtle shadow-card print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Reports & Regulatory Analytics
            </h1>
            <Badge variant="accent" className="text-[10px] font-mono">LIVE</Badge>
          </div>
          <p className="text-xs text-secondary mt-1">
            Financial summaries, GST liability, inventory valuation, expiry risk & statutory Schedule H registers.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {currentStores.length > 1 && (
            <div className="w-44">
              <Select
                value={selectedStoreId}
                onChange={(e) => { setSelectedStoreId(e.target.value); setPage(0); }}
              >
                <option value="">All Branches</option>
                {currentStores.map((s) => (
                  <option key={s.storeId} value={s.storeId}>{s.storeName}</option>
                ))}
              </Select>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5 text-xs">
            <FileSpreadsheet className="h-3.5 w-3.5 text-success" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
            <Printer className="h-3.5 w-3.5 text-primary" /> Print
          </Button>
          <ContextualHelpModal topic="reports" />
        </div>
      </div>

      {/* ── Non-Technical Reporting Quick Guide ── */}
      <div className="bg-surface-muted/40 border border-subtle rounded-lg p-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-2 text-secondary">
          <Info className="h-4 w-4 text-accent shrink-0" />
          <span>
            <strong>Reporting Guide:</strong> Select a tab to see cashflow, shelf inventory worth, batches expiring soon, or government Schedule H logs. All reports export directly to CSV.
          </span>
        </div>
        <Link
          to="/guide"
          className="text-accent hover:underline font-medium text-[11px] shrink-0 inline-flex items-center gap-1"
        >
          <span>Read Full Handbook</span>
          <span>→</span>
        </Link>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 border-b border-subtle overflow-x-auto pb-px print:hidden">
        {tabBtn("sales",     "Sales & GST",               <DollarSign className="h-4 w-4" />)}
        {tabBtn("inventory", "Inventory Valuation",        <Package    className="h-4 w-4" />)}
        {tabBtn("expiry",    "Expiry Risk",                <AlertTriangle className="h-4 w-4 text-warning" />)}
        {tabBtn("velocity",  "Product Velocity",           <Activity   className="h-4 w-4" />)}
        {tabBtn("scheduleH", "Schedule H Register",        <ShieldCheck className="h-4 w-4 text-accent" />)}
      </div>

      {/* ── Date filter (for date-sensitive tabs) ── */}
      {(activeTab === "sales" || activeTab === "velocity" || activeTab === "scheduleH") && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 rounded-lg border border-subtle text-xs print:hidden">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Calendar className="h-3.5 w-3.5 text-muted" />
            {(["today", "7d", "30d", "month"] as const).map((p) => (
              <Button
                key={p}
                variant={datePreset === p ? "primary" : "outline"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => handlePresetChange(p)}
              >
                {p === "today" ? "Today" : p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "This Month"}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setDatePreset("custom"); setPage(0); }}
              className="h-7 text-xs px-2 rounded border border-subtle bg-surface text-primary" />
            <span className="text-muted">to</span>
            <input type="date" value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setDatePreset("custom"); setPage(0); }}
              className="h-7 text-xs px-2 rounded border border-subtle bg-surface text-primary" />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: SALES & GST                                                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "sales" && (
        <div className="space-y-6">
          {salesQuery.isLoading && <div className="p-12 flex justify-center"><Spinner size="lg" /></div>}
          {salesQuery.isError  && <div className="p-8 text-center text-danger text-sm">Failed to load sales report.</div>}
          {salesQuery.data && (() => {
            const d = salesQuery.data;
            return (
              <>
                {/* KPI cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total Revenue",    value: formatCurrency(d.totalRevenue),   sub: `${d.totalSalesCount} invoices`,    color: "text-primary" },
                    { label: "Total Discount",   value: formatCurrency(d.totalDiscount),  sub: "Applied deductions",               color: "text-danger" },
                    { label: "GST Collected",    value: formatCurrency(d.totalTax),       sub: "Output tax liability",             color: "text-accent" },
                    { label: "Net Revenue",      value: formatCurrency(d.totalRevenue - d.totalDiscount), sub: "After discounts", color: "text-success" },
                  ].map((k) => (
                    <div key={k.label} className="p-4 bg-surface rounded-lg border border-subtle shadow-card">
                      <span className="text-xs text-secondary font-medium">{k.label}</span>
                      <div className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</div>
                      <span className="text-[10px] text-muted mt-0.5 block">{k.sub}</span>
                    </div>
                  ))}
                </div>

                {/* Payment tender breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="shadow-card border-subtle">
                    <CardHeader className="py-3 px-4 border-b border-subtle">
                      <CardTitle className="text-xs font-semibold text-primary">Payment Tender Reconciliation</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2.5 text-xs">
                      {[
                        { label: "Cash", amount: d.cashAmount },
                        { label: "Card (Debit / Credit)", amount: d.cardAmount },
                        { label: "UPI / QR Instant", amount: d.upiAmount },
                        { label: "Other Modes", amount: d.otherAmount },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-subtle last:border-0">
                          <span className="text-secondary">{row.label}</span>
                          <span className="font-semibold text-primary font-mono">{formatCurrency(row.amount)}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Daily breakdown table */}
                  <Card className="shadow-card border-subtle overflow-hidden">
                    <CardHeader className="py-3 px-4 border-b border-subtle">
                      <CardTitle className="text-xs font-semibold text-primary">Daily Sales Breakdown</CardTitle>
                      <CardDescription className="text-[11px] text-secondary">
                        {(d.dailyBreakdown ?? []).length} days in selected range
                      </CardDescription>
                    </CardHeader>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-subtle bg-surface-muted text-muted font-medium">
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3 text-right">Orders</th>
                            <th className="py-2 px-3 text-right">Revenue</th>
                            <th className="py-2 px-3 text-right">GST</th>
                            <th className="py-2 px-3 text-right">Discount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-subtle">
                          {(() => {
                            const { paginated } = paginate(d.dailyBreakdown, page, pageSize);
                            if (paginated.length === 0) return (
                              <tr><td colSpan={5} className="py-6 text-center text-muted">No data for selected period.</td></tr>
                            );
                            return paginated.map((row) => (
                              <tr key={row.date} className="hover:bg-surface-muted/50 transition-colors">
                                <td className="py-2 px-3 text-secondary">{formatDate(row.date)}</td>
                                <td className="py-2 px-3 text-right font-mono font-semibold text-primary">{row.count}</td>
                                <td className="py-2 px-3 text-right font-mono text-success">{formatCurrency(row.revenue)}</td>
                                <td className="py-2 px-3 text-right font-mono text-muted">{formatCurrency(row.tax)}</td>
                                <td className="py-2 px-3 text-right font-mono text-danger">-{formatCurrency(row.discount)}</td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                    <Pagination
                      currentPage={page}
                      totalPages={Math.max(1, Math.ceil((d.dailyBreakdown ?? []).length / pageSize))}
                      pageSize={pageSize}
                      totalElements={(d.dailyBreakdown ?? []).length}
                      onPageChange={setPage}
                      onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
                    />
                  </Card>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: INVENTORY VALUATION                                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          {inventoryQuery.isLoading && <div className="p-12 flex justify-center"><Spinner size="lg" /></div>}
          {inventoryQuery.isError  && <div className="p-8 text-center text-danger text-sm">Failed to load inventory valuation.</div>}
          {inventoryQuery.data && (() => {
            const d = inventoryQuery.data;
            return (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Cost Valuation",    value: formatCurrency(d.valuationAtCost),   sub: `${d.totalProducts} total products`,   color: "text-primary" },
                    { label: "Retail Valuation",  value: formatCurrency(d.valuationAtRetail), sub: "At selling price",                    color: "text-accent" },
                    { label: "Potential Profit",  value: formatCurrency(d.potentialProfit),   sub: "Retail minus cost",                   color: "text-success" },
                    { label: "Gross Margin",      value: `${Number(d.profitMarginPercent).toFixed(1)}%`, sub: "Overall stock spread",     color: "text-primary" },
                  ].map((k) => (
                    <div key={k.label} className="p-4 bg-surface rounded-lg border border-subtle shadow-card">
                      <span className="text-xs text-secondary font-medium">{k.label}</span>
                      <div className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</div>
                      <span className="text-[10px] text-muted mt-0.5 block">{k.sub}</span>
                    </div>
                  ))}
                </div>

                {/* Stock Summary Row */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "In Stock",      value: d.inStockProducts,     color: "text-success" },
                    { label: "Low Stock",     value: d.lowStockProducts,    color: "text-warning" },
                    { label: "Out of Stock",  value: d.outOfStockProducts,  color: "text-danger" },
                  ].map((s) => (
                    <div key={s.label} className="p-3 bg-surface rounded-lg border border-subtle text-center">
                      <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-[11px] text-secondary mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Category Breakdown Table */}
                <Card className="shadow-card border-subtle overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b border-subtle">
                    <CardTitle className="text-xs font-semibold text-primary">Category-wise Valuation</CardTitle>
                    <CardDescription className="text-[11px] text-secondary">
                      {(d.categoryBreakdown ?? []).length} categories · {d.totalQuantityOnHand} units on hand
                    </CardDescription>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-subtle bg-surface-muted text-muted font-medium">
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3 text-right">Products</th>
                          <th className="py-2.5 px-3 text-right">Total Qty</th>
                          <th className="py-2.5 px-3 text-right">Cost Value</th>
                          <th className="py-2.5 px-3 text-right">Retail Value</th>
                          <th className="py-2.5 px-3 text-right">Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-subtle">
                        {(() => {
                          const { paginated } = paginate(d.categoryBreakdown, page, pageSize);
                          if (paginated.length === 0) return (
                            <tr><td colSpan={6} className="py-6 text-center text-muted">No category data available.</td></tr>
                          );
                          return paginated.map((c) => {
                            const margin = c.valuationAtRetail > 0
                              ? ((c.valuationAtRetail - c.valuationAtCost) / c.valuationAtRetail * 100).toFixed(1)
                              : "0.0";
                            return (
                              <tr key={c.categoryName} className="hover:bg-surface-muted/50 transition-colors">
                                <td className="py-2.5 px-3 font-medium text-primary">{c.categoryName}</td>
                                <td className="py-2.5 px-3 text-right text-secondary">{c.productCount}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-semibold text-primary">{c.totalQuantity}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-secondary">{formatCurrency(c.valuationAtCost)}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-secondary">{formatCurrency(c.valuationAtRetail)}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-semibold text-success">{margin}%</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    currentPage={page}
                    totalPages={Math.max(1, Math.ceil((d.categoryBreakdown ?? []).length / pageSize))}
                    pageSize={pageSize}
                    totalElements={(d.categoryBreakdown ?? []).length}
                    onPageChange={setPage}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
                  />
                </Card>
              </>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: EXPIRY RISK                                                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "expiry" && (
        <div className="space-y-6">
          {expiryQuery.isLoading && <div className="p-12 flex justify-center"><Spinner size="lg" /></div>}
          {expiryQuery.isError  && <div className="p-8 text-center text-danger text-sm">Failed to load expiry risk data.</div>}
          {expiryQuery.data && (() => {
            const d = expiryQuery.data;
            const batches = d.batches ?? [];
            return (
              <>
                {/* Risk Buckets */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-danger">Expired</span>
                      <Badge variant="destructive" className="text-[10px]">QUARANTINE</Badge>
                    </div>
                    <div className="text-2xl font-bold text-danger">{d.expiredCount}</div>
                    <span className="text-[11px] text-danger/80 font-mono">{formatCurrency(d.expiredValue)}</span>
                  </div>

                  <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-warning">Critical ≤30d</span>
                      <Badge variant="warning" className="text-[10px]">CRITICAL</Badge>
                    </div>
                    <div className="text-2xl font-bold text-warning">{d.critical30DaysCount}</div>
                    <span className="text-[11px] text-warning/80 font-mono">{formatCurrency(d.critical30DaysValue)}</span>
                  </div>

                  <div className="p-4 bg-surface rounded-lg border border-subtle shadow-card">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-secondary">Warning ≤60d</span>
                      <Badge variant="outline" className="text-[10px]">HIGH RISK</Badge>
                    </div>
                    <div className="text-2xl font-bold text-primary">{d.warning60DaysCount}</div>
                    <span className="text-[11px] text-muted font-mono">{formatCurrency(d.warning60DaysValue)}</span>
                  </div>

                  <div className="p-4 bg-surface rounded-lg border border-subtle shadow-card">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-secondary">Watchlist ≤90d</span>
                      <Badge variant="outline" className="text-[10px]">FEFO</Badge>
                    </div>
                    <div className="text-2xl font-bold text-primary">{d.warning90DaysCount}</div>
                    <span className="text-[11px] text-muted font-mono">{formatCurrency(d.warning90DaysValue)}</span>
                  </div>
                </div>

                {/* Batch table */}
                <Card className="shadow-card border-subtle overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b border-subtle">
                    <CardTitle className="text-xs font-semibold text-primary">Batches Requiring Expiry Intervention</CardTitle>
                    <CardDescription className="text-[11px] text-secondary">
                      {batches.length} batches within 90 days of expiry or already expired
                    </CardDescription>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-subtle bg-surface-muted text-muted font-medium">
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-3">Batch #</th>
                          <th className="py-2.5 px-3">Expiry Date</th>
                          <th className="py-2.5 px-3 text-right">Days Left</th>
                          <th className="py-2.5 px-3 text-right">Qty</th>
                          <th className="py-2.5 px-3 text-right">Total Cost</th>
                          <th className="py-2.5 px-3 text-center">Urgency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-subtle">
                        {(() => {
                          const { paginated } = paginate(batches, page, pageSize);
                          if (paginated.length === 0) return (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-muted">
                                <CheckCircle2 className="h-5 w-5 text-success inline-block mr-1" />
                                No batches at risk within 90 days.
                              </td>
                            </tr>
                          );
                          return paginated.map((b) => {
                            const isExpired  = b.riskLevel === "EXPIRED";
                            const isCritical = b.riskLevel === "CRITICAL_30";
                            const days = b.daysUntilExpiry;
                            return (
                              <tr key={b.batchId} className="hover:bg-surface-muted/50 transition-colors">
                                <td className="py-2.5 px-3 font-medium text-primary">{b.productName}</td>
                                <td className="py-2.5 px-3 font-mono font-semibold text-primary">{b.batchNumber}</td>
                                <td className="py-2.5 px-3 text-secondary">{formatDate(b.expiryDate)}</td>
                                <td className={`py-2.5 px-3 text-right font-mono font-bold ${isExpired ? "text-danger" : isCritical ? "text-warning" : "text-secondary"}`}>
                                  {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-semibold text-primary">{b.quantity}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-secondary">{formatCurrency(b.totalCostValue)}</td>
                                <td className="py-2.5 px-3 text-center">
                                  {isExpired ? (
                                    <Badge variant="destructive" className="text-[10px]">EXPIRED</Badge>
                                  ) : isCritical ? (
                                    <Badge variant="warning" className="text-[10px]">CRITICAL</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px]">WATCHLIST</Badge>
                                  )}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    currentPage={page}
                    totalPages={Math.max(1, Math.ceil(batches.length / pageSize))}
                    pageSize={pageSize}
                    totalElements={batches.length}
                    onPageChange={setPage}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
                  />
                </Card>
              </>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: PRODUCT VELOCITY                                             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "velocity" && (
        <div className="space-y-6">
          {velocityQuery.isLoading && <div className="p-12 flex justify-center"><Spinner size="lg" /></div>}
          {velocityQuery.isError  && <div className="p-8 text-center text-danger text-sm">Failed to load velocity data.</div>}
          {velocityQuery.data && (() => {
            const d = velocityQuery.data;
            const items = velocityFilter === "fast" ? (d.fastMovers ?? []) : (d.slowMovers ?? []);
            return (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    variant={velocityFilter === "fast" ? "primary" : "outline"}
                    size="sm"
                    onClick={() => { setVelocityFilter("fast"); setPage(0); }}
                    className="gap-1.5 text-xs"
                  >
                    <TrendingUp className="h-3.5 w-3.5" /> Fast Movers (Top 10)
                  </Button>
                  <Button
                    variant={velocityFilter === "slow" ? "primary" : "outline"}
                    size="sm"
                    onClick={() => { setVelocityFilter("slow"); setPage(0); }}
                    className="gap-1.5 text-xs"
                  >
                    <Clock className="h-3.5 w-3.5" /> Slow / Non-Moving
                  </Button>
                </div>

                <Card className="shadow-card border-subtle overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b border-subtle">
                    <CardTitle className="text-xs font-semibold text-primary">
                      {velocityFilter === "fast" ? "High-Velocity SKUs" : "Low-Velocity Products"}
                    </CardTitle>
                    <CardDescription className="text-[11px] text-secondary">
                      {items.length} products · period: {startDate} → {endDate}
                    </CardDescription>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-subtle bg-surface-muted text-muted font-medium">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-3">SKU</th>
                          <th className="py-2.5 px-3 text-right">Units Sold</th>
                          <th className="py-2.5 px-3 text-right">Revenue</th>
                          <th className="py-2.5 px-3 text-right">Sales Count</th>
                          <th className="py-2.5 px-3 text-right">Stock</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-subtle">
                        {(() => {
                          const { paginated } = paginate(items, page, pageSize);
                          if (paginated.length === 0) return (
                            <tr><td colSpan={8} className="py-8 text-center text-muted">No items in this category.</td></tr>
                          );
                          return paginated.map((item, idx) => (
                            <tr key={item.productId} className="hover:bg-surface-muted/50 transition-colors">
                              <td className="py-2.5 px-3 text-muted font-mono">{page * pageSize + idx + 1}</td>
                              <td className="py-2.5 px-3 font-medium text-primary">{item.productName}</td>
                              <td className="py-2.5 px-3 font-mono text-secondary">{item.sku}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">{item.totalQuantitySold}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-success">{formatCurrency(item.totalRevenue)}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-secondary">{item.salesCount}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-primary">{item.currentStock}</td>
                              <td className="py-2.5 px-3 text-center">
                                {velocityFilter === "fast" ? (
                                  item.currentStock < item.totalQuantitySold * 0.3 ? (
                                    <Badge variant="destructive" className="text-[10px]">REORDER</Badge>
                                  ) : (
                                    <Badge variant="success" className="text-[10px]">OPTIMAL</Badge>
                                  )
                                ) : (
                                  <Badge variant="outline" className="text-[10px]">SLOW</Badge>
                                )}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    currentPage={page}
                    totalPages={Math.max(1, Math.ceil(items.length / pageSize))}
                    pageSize={pageSize}
                    totalElements={items.length}
                    onPageChange={setPage}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
                  />
                </Card>
              </>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: SCHEDULE H STATUTORY REGISTER                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "scheduleH" && (
        <div className="space-y-6">
          {scheduleHQuery.isLoading && <div className="p-12 flex justify-center"><Spinner size="lg" /></div>}
          {scheduleHQuery.isError  && <div className="p-8 text-center text-danger text-sm">Failed to load Schedule H register.</div>}
          {scheduleHQuery.data && (() => {
            const entries = scheduleHQuery.data.entries ?? [];
            const total   = scheduleHQuery.data.totalRecords ?? entries.length;
            return (
              <>
                {/* Compliance notice */}
                <div className="p-4 rounded-lg border border-subtle bg-surface text-xs flex items-start gap-3 shadow-card">
                  <ShieldCheck className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-primary">Drugs and Cosmetics Rules — Schedule H / H1 Register</h4>
                    <p className="text-[11px] text-secondary mt-0.5 leading-relaxed">
                      This register captures statutory audit records of all Schedule H and H1 prescription medicines
                      dispensed, with doctor registration credentials, patient identity, and batch traceability as
                      mandated by pharmaceutical licensing authorities.
                    </p>
                  </div>
                </div>

                <Card className="shadow-card border-subtle overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b border-subtle">
                    <CardTitle className="text-xs font-semibold text-primary">Prescription Dispensing Log</CardTitle>
                    <CardDescription className="text-[11px] text-secondary">
                      {total} Schedule H/H1 statutory records · {startDate} → {endDate}
                    </CardDescription>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-subtle bg-surface-muted text-muted font-medium">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Invoice #</th>
                          <th className="py-2.5 px-3">Patient</th>
                          <th className="py-2.5 px-3">Doctor</th>
                          <th className="py-2.5 px-3">Doctor Reg #</th>
                          <th className="py-2.5 px-3">Drug Dispensed</th>
                          <th className="py-2.5 px-3">Batch #</th>
                          <th className="py-2.5 px-3 text-right">Qty</th>
                          <th className="py-2.5 px-3 text-center">Class</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-subtle">
                        {(() => {
                          const { paginated } = paginate(entries, page, pageSize);
                          if (paginated.length === 0) return (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-muted">
                                No Schedule H dispensing events in this period.
                              </td>
                            </tr>
                          );
                          return paginated.map((e, idx) => (
                            <tr key={`${e.saleId}-${idx}`} className="hover:bg-surface-muted/50 transition-colors">
                              <td className="py-2.5 px-3 text-secondary">{formatDate(e.saleDate)}</td>
                              <td className="py-2.5 px-3 font-mono font-semibold text-primary">{e.invoiceNumber}</td>
                              <td className="py-2.5 px-3 font-medium text-primary">{e.customerName}</td>
                              <td className="py-2.5 px-3 text-secondary">{e.doctorName}</td>
                              <td className="py-2.5 px-3 font-mono text-muted text-[11px]">{e.doctorRegistrationNumber}</td>
                              <td className="py-2.5 px-3 font-semibold text-primary">{e.productName}</td>
                              <td className="py-2.5 px-3 font-mono text-secondary">{e.batchNumber}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">{e.quantity}</td>
                              <td className="py-2.5 px-3 text-center">
                                <Badge variant="accent" className="text-[10px] font-mono">{e.scheduleType}</Badge>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    currentPage={page}
                    totalPages={Math.max(1, Math.ceil(entries.length / pageSize))}
                    pageSize={pageSize}
                    totalElements={entries.length}
                    onPageChange={setPage}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
                  />
                </Card>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};
