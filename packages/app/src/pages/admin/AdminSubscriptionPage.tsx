import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Button, useToast } from "@inventra/ui";
import {
  Building2,
  CreditCard,
  Crown,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Save,
  X,
  RotateCcw,
  Landmark,
  BadgePercent,
  Users,
  Zap,
  Search,
  DollarSign,
  Bold,
  Italic,
  List,
  ToggleRight,
  ToggleLeft,
  SlidersHorizontal,
  Eye,
  Activity,
  Monitor,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import {
  subscriptionApi,
  type AdminBusinessSubscription,
  type PricingConfig,
  type TierPricing,
  type UpdatePricingPayload,
} from "../../services/subscriptionApi";
import { formatCurrency, formatDate } from "../../utils/formatters";

// ─── Tab Navigation ───────────────────────────────────────────────────────────
type AdminBillingTab = "stores" | "pricing";

// ─── Input class helper ───────────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2 rounded-lg text-sm bg-surface border border-subtle text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-focus transition-colors";


// ─── Tier helpers ─────────────────────────────────────────────────────────────
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
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.bg} ${cfg.color} ${cfg.border}`}
    >
      <Crown className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ACTIVE":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success-subtle text-success border border-success-border">
          <CheckCircle2 className="h-3 w-3" />
          Active
        </span>
      );
    case "PENDING_PAYMENT":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-warning-subtle text-warning border border-warning-border">
          <AlertTriangle className="h-3 w-3" />
          Pending Payment
        </span>
      );
    case "PAST_DUE":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-danger-subtle text-danger border border-danger-border">
          <AlertTriangle className="h-3 w-3" />
          Past Due
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-muted text-secondary border border-subtle">
          {status || "Inactive"}
        </span>
      );
  }
}

function DaysRemainingBadge({ days, status }: { days: number; status: string }) {
  if (status === "PENDING_PAYMENT") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-muted bg-surface-muted border border-subtle">
        No active plan
      </span>
    );
  }
  if (days <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger-subtle text-danger border border-danger-border">
        <AlertTriangle className="h-3 w-3" />
        Expired
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning-subtle text-warning border border-warning-border">
        <AlertTriangle className="h-3 w-3" />
        {days}d left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success-subtle text-success border border-success-border">
      <CheckCircle2 className="h-3 w-3" />
      {days}d left
    </span>
  );
}

// ─── Rich Text Editor ─────────────────────────────────────────────────────────
interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
}

const RichEditor: React.FC<RichEditorProps> = ({ value, onChange }) => {
  const ref = useRef<HTMLDivElement>(null);

  // Sync initial value once
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    ref.current?.focus();
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const toolbarBtn = (icon: React.ReactNode, cmd: string, title: string, val?: string) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); exec(cmd, val); }}
      title={title}
      className="p-1.5 rounded hover:bg-surface-muted text-secondary hover:text-primary transition-colors cursor-pointer"
    >
      {icon}
    </button>
  );

  return (
    <div className="rounded-lg border border-subtle bg-surface overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-focus transition-colors">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-subtle bg-surface-muted">
        {toolbarBtn(<Bold className="h-3.5 w-3.5" />, "bold", "Bold (Ctrl+B)")}
        {toolbarBtn(<Italic className="h-3.5 w-3.5" />, "italic", "Italic (Ctrl+I)")}
        <div className="w-px h-4 bg-subtle mx-1" />
        {toolbarBtn(<List className="h-3.5 w-3.5" />, "insertUnorderedList", "Bullet list")}
        <div className="w-px h-4 bg-subtle mx-1" />
        {toolbarBtn(
          <span className="text-[10px] font-mono font-bold">H2</span>,
          "formatBlock",
          "Heading",
          "h2"
        )}
        {toolbarBtn(
          <span className="text-[10px] font-mono">P</span>,
          "formatBlock",
          "Paragraph",
          "p"
        )}
      </div>
      {/* Editable */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { if (ref.current) onChange(ref.current.innerHTML); }}
        className="min-h-[80px] max-h-[160px] overflow-y-auto px-3 py-2 text-xs text-primary outline-none leading-relaxed
          [&_ul]:list-disc [&_ul]:pl-4 [&_b]:font-bold [&_strong]:font-bold [&_em]:italic [&_i]:italic [&_h2]:font-bold [&_h2]:text-sm"
      />
    </div>
  );
};

// ─── Column Configuration & Sorting ──────────────────────────────────────────
type ColumnKey =
  | "business"
  | "plan"
  | "status"
  | "billing"
  | "amount"
  | "renewal"
  | "workstations"
  | "branches"
  | "users"
  | "autopay"
  | "actions";

type SortField =
  | "legalName"
  | "tier"
  | "status"
  | "billingCycle"
  | "amount"
  | "daysRemaining"
  | "activeWorkstations"
  | "branchCount"
  | "userCount"
  | "autoRenew";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  sortable: boolean;
  sortField?: SortField;
  align?: "left" | "center" | "right";
  defaultVisible: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: "business", label: "Business", sortable: true, sortField: "legalName", defaultVisible: true },
  { key: "plan", label: "Plan", sortable: true, sortField: "tier", defaultVisible: true },
  { key: "status", label: "Status", sortable: true, sortField: "status", defaultVisible: true },
  { key: "billing", label: "Billing", sortable: true, sortField: "billingCycle", defaultVisible: true },
  { key: "amount", label: "Amount", sortable: true, sortField: "amount", align: "right", defaultVisible: true },
  { key: "renewal", label: "Renewal / Days", sortable: true, sortField: "daysRemaining", defaultVisible: true },
  { key: "workstations", label: "Workstations", sortable: true, sortField: "activeWorkstations", align: "center", defaultVisible: true },
  { key: "branches", label: "Branches", sortable: true, sortField: "branchCount", align: "center", defaultVisible: true },
  { key: "users", label: "Users / Team", sortable: true, sortField: "userCount", align: "center", defaultVisible: true },
  { key: "autopay", label: "AutoPay", sortable: true, sortField: "autoRenew", align: "center", defaultVisible: true },
  { key: "actions", label: "Actions", sortable: false, align: "right", defaultVisible: true },
];

// ─── Stores Tab ───────────────────────────────────────────────────────────────
interface RecordPaymentModalState {
  businessId: string;
  legalName: string;
}

const PAGE_SIZE = 10;

function StoresTab() {
  const navigate = useNavigate();
  const toast = useToast();
  const [stores, setStores] = useState<AdminBusinessSubscription[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("legalName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [paymentModal, setPaymentModal] = useState<RecordPaymentModalState | null>(null);
  const [paymentRef, setPaymentRef] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  // Column Customization State
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>({
    business: true,
    plan: true,
    status: true,
    billing: true,
    amount: true,
    renewal: true,
    workstations: true,
    branches: true,
    users: true,
    autopay: true,
    actions: true,
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const columnDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(e.target as Node)) {
        setShowColumnDropdown(false);
      }
    }
    if (showColumnDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showColumnDropdown]);

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAllColumns = () => {
    const all: Record<ColumnKey, boolean> = {} as any;
    ALL_COLUMNS.forEach((c) => (all[c.key] = true));
    setVisibleColumns(all);
  };

  const resetDefaultColumns = () => {
    const defaults: Record<ColumnKey, boolean> = {} as any;
    ALL_COLUMNS.forEach((c) => (defaults[c.key] = c.defaultVisible));
    setVisibleColumns(defaults);
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const pageData = await subscriptionApi.getAllBusinessSubscriptions({
        search: debouncedSearch.trim() || undefined,
        page,
        size: PAGE_SIZE,
      });
      setStores(pageData.content || []);
      setTotalPages(pageData.totalPages || 0);
      setTotalElements(pageData.totalElements || 0);
    } catch {
      toast.error("Failed to load business subscriptions.");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentModal || !paymentRef.trim()) return;
    setIsRecording(true);
    try {
      await subscriptionApi.recordPayment(paymentModal.businessId, paymentRef.trim());
      await load();
      toast.success(`Payment recorded for ${paymentModal.legalName}.`);
      setPaymentModal(null);
      setPaymentRef("");
    } catch {
      toast.error("Failed to record payment.");
    } finally {
      setIsRecording(false);
    }
  };

  const sortedStores = [...stores].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "legalName":
        cmp = a.legalName.localeCompare(b.legalName);
        break;
      case "tier":
        cmp = a.tier.localeCompare(b.tier);
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
      case "billingCycle":
        cmp = (a.billingCycle || "").localeCompare(b.billingCycle || "");
        break;
      case "amount":
        cmp = a.amount - b.amount;
        break;
      case "daysRemaining":
        cmp = a.daysRemaining - b.daysRemaining;
        break;
      case "activeWorkstations":
        cmp = a.activeWorkstations - b.activeWorkstations;
        break;
      case "branchCount":
        cmp = a.branchCount - b.branchCount;
        break;
      case "userCount":
        cmp = (a.userCount || 0) - (b.userCount || 0);
        break;
      case "autoRenew":
        cmp = (a.autoRenew === b.autoRenew ? 0 : a.autoRenew ? 1 : -1);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3 opacity-30" />
    );

  // Stats computed from real store data (only active subscriptions count towards revenue)
  const activeStores = stores.filter((s) => s.status === "ACTIVE");
  const monthlyRevenue = activeStores.reduce((sum, s) => sum + s.amount, 0);
  const pendingOrPastDue = stores.filter((s) => s.status === "PENDING_PAYMENT" || s.status === "PAST_DUE").length;
  const autopayActive = stores.filter((s) => s.autoRenew).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Stores",
            value: totalElements,
            icon: Building2,
            color: "text-info",
            bg: "bg-info-subtle border border-info-border",
          },
          {
            label: "Active Revenue",
            value: formatCurrency(monthlyRevenue),
            icon: DollarSign,
            color: "text-success",
            bg: "bg-success-subtle border border-success-border",
          },
          {
            label: "Pending / Past Due",
            value: pendingOrPastDue,
            icon: AlertTriangle,
            color: "text-warning",
            bg: "bg-warning-subtle border border-warning-border",
          },
          {
            label: "AutoPay Active",
            value: autopayActive,
            icon: Zap,
            color: "text-primary",
            bg: "bg-primary-subtle border border-primary-border",
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 border-subtle bg-surface shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wide">{stat.label}</span>
              <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-primary">{stat.value}</div>
          </Card>
        ))}
      </div>

      {/* Table & Controls */}
      <Card className="border-subtle bg-surface shadow-xs overflow-hidden">
        <div className="p-4 border-b border-subtle flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or GSTIN…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`${inputCls} pl-9`}
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {/* Column Customization Dropdown */}
            <div className="relative" ref={columnDropdownRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColumnDropdown((v) => !v)}
                className="gap-1.5 shrink-0 text-xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-secondary" />
                <span>Columns</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface-muted border border-subtle font-mono text-secondary">
                  {Object.values(visibleColumns).filter(Boolean).length}/{ALL_COLUMNS.length}
                </span>
              </Button>

              {showColumnDropdown && (
                <div className="absolute right-0 mt-2 w-60 p-2.5 rounded-xl bg-surface border border-subtle shadow-2xl z-30 space-y-2 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-1.5 border-b border-subtle px-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Show Columns</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllColumns}
                        className="text-[10px] text-primary hover:underline cursor-pointer"
                      >
                        All
                      </button>
                      <span className="text-muted text-[10px]">·</span>
                      <button
                        type="button"
                        onClick={resetDefaultColumns}
                        className="text-[10px] text-primary hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1 px-0.5">
                    {ALL_COLUMNS.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs hover:bg-surface-muted cursor-pointer text-primary transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.key]}
                          onChange={() => toggleColumn(col.key)}
                          className="rounded border-subtle text-primary focus:ring-primary/20 cursor-pointer"
                        />
                        <span className="flex-1 font-medium">{col.label}</span>
                        {col.sortable && <span className="text-[9px] text-muted uppercase">Sortable</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={load} className="gap-1.5 shrink-0 text-xs">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted">Loading subscriptions…</span>
          </div>
        ) : sortedStores.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="h-10 w-10 mx-auto text-muted/40 mb-3" />
            <p className="text-sm font-medium text-secondary">No businesses found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-subtle bg-surface-muted text-muted font-semibold uppercase tracking-wider">
                <tr>
                  {visibleColumns.business && (
                    <th className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleSort("legalName")}
                        className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                      >
                        Business <SortIcon field="legalName" />
                      </button>
                    </th>
                  )}
                  {visibleColumns.plan && (
                    <th className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleSort("tier")}
                        className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                      >
                        Plan <SortIcon field="tier" />
                      </button>
                    </th>
                  )}
                  {visibleColumns.status && (
                    <th className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleSort("status")}
                        className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                      >
                        Status <SortIcon field="status" />
                      </button>
                    </th>
                  )}
                  {visibleColumns.billing && (
                    <th className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleSort("billingCycle")}
                        className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                      >
                        Billing <SortIcon field="billingCycle" />
                      </button>
                    </th>
                  )}
                  {visibleColumns.amount && (
                    <th className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort("amount")}
                        className="flex items-center gap-1 ml-auto hover:text-primary transition-colors cursor-pointer"
                      >
                        Amount <SortIcon field="amount" />
                      </button>
                    </th>
                  )}
                  {visibleColumns.renewal && (
                    <th className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleSort("daysRemaining")}
                        className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                      >
                        Renewal <SortIcon field="daysRemaining" />
                      </button>
                    </th>
                  )}
                  {visibleColumns.workstations && (
                    <th className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleSort("activeWorkstations")}
                        className="flex items-center gap-1 mx-auto hover:text-primary transition-colors cursor-pointer"
                      >
                        Workstations <SortIcon field="activeWorkstations" />
                      </button>
                    </th>
                  )}
                  {visibleColumns.branches && (
                    <th className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleSort("branchCount")}
                        className="flex items-center gap-1 mx-auto hover:text-primary transition-colors cursor-pointer"
                      >
                        Branches <SortIcon field="branchCount" />
                      </button>
                    </th>
                  )}
                  {visibleColumns.users && (
                    <th className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleSort("userCount")}
                        className="flex items-center gap-1 mx-auto hover:text-primary transition-colors cursor-pointer"
                      >
                        Users <SortIcon field="userCount" />
                      </button>
                    </th>
                  )}
                  {visibleColumns.autopay && (
                    <th className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleSort("autoRenew")}
                        className="flex items-center gap-1 mx-auto hover:text-primary transition-colors cursor-pointer"
                      >
                        AutoPay <SortIcon field="autoRenew" />
                      </button>
                    </th>
                  )}
                  {visibleColumns.actions && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {sortedStores.map((store) => (
                  <tr key={store.businessId} className="hover:bg-surface-muted transition-colors">
                    {visibleColumns.business && (
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/subscriptions/${store.businessId}`)}
                          className="text-left font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5 group cursor-pointer"
                          title="Click to view store telemetry & invoices"
                        >
                          <span className="group-hover:underline">{store.legalName}</span>
                          <Eye className="h-3 w-3 text-muted group-hover:text-primary transition-colors" />
                        </button>
                        <div className="font-mono text-muted text-[10px] mt-0.5">{store.gstin || "No GSTIN"}</div>
                      </td>
                    )}
                    {visibleColumns.plan && (
                      <td className="py-3 px-4">
                        <TierBadge tier={store.tier} />
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="py-3 px-4">
                        <StatusBadge status={store.status} />
                      </td>
                    )}
                    {visibleColumns.billing && (
                      <td className="py-3 px-4 text-secondary font-medium capitalize">
                        {store.billingCycle?.toLowerCase() || "monthly"}
                      </td>
                    )}
                    {visibleColumns.amount && (
                      <td className="py-3 px-4 text-right font-mono font-bold text-primary">
                        {formatCurrency(store.amount)}
                      </td>
                    )}
                    {visibleColumns.renewal && (
                      <td className="py-3 px-4 space-y-1">
                        {store.currentPeriodEnd ? (
                          <div className="text-muted font-mono text-[10px]">{formatDate(store.currentPeriodEnd)}</div>
                        ) : (
                          <div className="text-muted font-mono text-[10px]">—</div>
                        )}
                        <DaysRemainingBadge days={store.daysRemaining} status={store.status} />
                      </td>
                    )}
                    {visibleColumns.workstations && (
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-secondary">
                          <Monitor className="h-3.5 w-3.5 text-primary" />
                          {store.activeWorkstations}
                        </span>
                      </td>
                    )}
                    {visibleColumns.branches && (
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-secondary">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                          {store.branchCount}
                        </span>
                      </td>
                    )}
                    {visibleColumns.users && (
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-secondary">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          {store.userCount || 1}
                        </span>
                      </td>
                    )}
                    {visibleColumns.autopay && (
                      <td className="py-3 px-4 text-center">
                        {store.autoRenew ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success">
                            <ToggleRight className="h-4 w-4" />
                            ON
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted">
                            <ToggleLeft className="h-4 w-4" />
                            OFF
                          </span>
                        )}
                      </td>
                    )}
                    {visibleColumns.actions && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/subscriptions/${store.businessId}`)}
                            className="gap-1 text-xs"
                            title="View App Usage Telemetry & Invoices"
                          >
                            <Activity className="h-3 w-3 text-primary" />
                            Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPaymentModal({ businessId: store.businessId, legalName: store.legalName })}
                            className="gap-1 text-xs"
                            title="Record Manual Payment"
                          >
                            <Landmark className="h-3 w-3" />
                            Record
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-4 border-t border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-secondary">
          <div>
            Showing{" "}
            <span className="font-bold text-primary font-mono">
              {totalElements === 0 ? 0 : page * PAGE_SIZE + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-primary font-mono">
              {Math.min((page + 1) * PAGE_SIZE, totalElements)}
            </span>{" "}
            of <span className="font-bold text-primary font-mono">{totalElements}</span> stores
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || isLoading}
              className="gap-1 h-8 px-2.5"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <span className="text-xs font-medium px-2">
              Page <span className="font-bold text-primary">{page + 1}</span> of{" "}
              <span className="font-bold text-primary">{Math.max(totalPages, 1)}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1 || isLoading}
              className="gap-1 h-8 px-2.5"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Record Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => { setPaymentModal(null); setPaymentRef(""); }} />
          <div className="relative z-10 w-full max-w-md bg-surface border border-subtle rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-primary">Record Manual Payment</h3>
                <p className="text-xs text-secondary mt-0.5">
                  Mark payment as received for <strong className="text-primary">{paymentModal.legalName}</strong>
                </p>
              </div>
              <button type="button" onClick={() => { setPaymentModal(null); setPaymentRef(""); }} className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-surface-muted transition-colors">
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
              <Button variant="outline" onClick={() => { setPaymentModal(null); setPaymentRef(""); }} disabled={isRecording}>Cancel</Button>
              <Button variant="primary" onClick={handleRecordPayment} disabled={isRecording || !paymentRef.trim()} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {isRecording ? "Recording…" : "Confirm Payment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pricing Tab ──────────────────────────────────────────────────────────────
function PricingTab() {
  const toast = useToast();
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [draftPricing, setDraftPricing] = useState<Partial<UpdatePricingPayload>>({});
  const [newFeatureText, setNewFeatureText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await subscriptionApi.getPricing();
      setConfig(data);
    } catch {
      toast.error("Failed to load pricing configuration.");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const startEdit = (tier: TierPricing) => {
    setEditingTier(tier.tier);
    setDraftPricing({
      tier: tier.tier,
      planName: tier.planName,
      monthlyPrice: tier.monthlyPrice,
      description: tier.description,
      annualDiscountPct: tier.annualDiscountPct,
      features: [...(tier.features || [])],
      workstationLimit: tier.workstationLimit ?? (tier.tier === "ENTERPRISE" ? 25 : tier.tier === "PRO" ? 5 : 1),
      branchLimit: tier.branchLimit ?? (tier.tier === "ENTERPRISE" ? 10 : tier.tier === "PRO" ? 2 : 1),
      storageLimitGb: tier.storageLimitGb ?? (tier.tier === "ENTERPRISE" ? 100 : tier.tier === "PRO" ? 10 : 2),
      alertLimit: tier.alertLimit ?? (tier.tier === "ENTERPRISE" ? 10000 : tier.tier === "PRO" ? 2000 : 500),
    });
    setNewFeatureText("");
  };

  const cancelEdit = () => {
    setEditingTier(null);
    setDraftPricing({});
    setNewFeatureText("");
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setDraftPricing((d) => ({
      ...d,
      features: [...(d.features || []), newFeatureText.trim()],
    }));
    setNewFeatureText("");
  };

  const handleRemoveFeature = (idx: number) => {
    setDraftPricing((d) => ({
      ...d,
      features: (d.features || []).filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async () => {
    if (!draftPricing.tier || draftPricing.monthlyPrice === undefined) return;
    setIsSaving(true);
    try {
      const updated = await subscriptionApi.updatePricing(draftPricing as UpdatePricingPayload);
      setConfig(updated);
      toast.success(`${draftPricing.planName || draftPricing.tier} pricing, quotas & features updated.`);
      cancelEdit();
    } catch {
      toast.error("Failed to update pricing.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 flex items-center justify-center gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm text-muted">Loading pricing configuration…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl border border-warning-border bg-warning-subtle flex items-start gap-3">
        <BadgePercent className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-warning-fg">Official Canonical Plan Governance Console</p>
          <p className="text-xs text-warning-fg/70 mt-0.5">
            All plan tier pricing, descriptions, quotas, and dynamic marketing features configured here are directly reflected across public website pricing, customer checkout, and store subscription billing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {config?.tiers.map((tier) => {
          const isEditing = editingTier === tier.tier;
          const currentMonthly = isEditing ? (draftPricing.monthlyPrice ?? tier.monthlyPrice) : tier.monthlyPrice;
          const currentDiscount = isEditing ? (draftPricing.annualDiscountPct ?? tier.annualDiscountPct) : tier.annualDiscountPct;
          const annualPrice = Math.round(currentMonthly * 12 * (1 - currentDiscount / 100));
          const currentFeatures = isEditing ? (draftPricing.features || []) : (tier.features || []);

          return (
            <Card
              key={tier.tier}
              className={`border-subtle bg-surface shadow-xs overflow-hidden transition-all flex flex-col justify-between ${
                isEditing ? "ring-2 ring-primary/30 border-focus" : ""
              }`}
            >
              {/* Header */}
              <div>
                <div className="px-5 pt-5 pb-3 border-b border-subtle flex items-center justify-between">
                  <TierBadge tier={tier.tier} />
                  {!isEditing ? (
                    <Button variant="ghost" size="sm" onClick={() => startEdit(tier)} className="gap-1.5 text-xs">
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit Tier
                    </Button>
                  ) : (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-surface-muted transition-colors cursor-pointer"
                      title="Cancel edit"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  {/* Plan Name */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
                      Display Plan Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={draftPricing.planName ?? ""}
                        onChange={(e) => setDraftPricing((d) => ({ ...d, planName: e.target.value }))}
                        className={inputCls}
                        placeholder="e.g. Inventra Pharmacy Pro"
                      />
                    ) : (
                      <p className="text-base font-bold text-primary">{tier.planName}</p>
                    )}
                  </div>

                  {/* Monthly Price & Discount Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
                        Monthly Rate (₹)
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={draftPricing.monthlyPrice ?? ""}
                          onChange={(e) => setDraftPricing((d) => ({ ...d, monthlyPrice: parseFloat(e.target.value) || 0 }))}
                          className={inputCls}
                        />
                      ) : (
                        <div className="text-xl font-black font-mono text-primary">
                          {formatCurrency(tier.monthlyPrice)}
                          <span className="text-xs font-normal text-muted ml-1">/ mo</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
                        Annual Discount (%)
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={draftPricing.annualDiscountPct ?? ""}
                          onChange={(e) => setDraftPricing((d) => ({ ...d, annualDiscountPct: parseInt(e.target.value, 10) || 0 }))}
                          className={inputCls}
                        />
                      ) : (
                        <div>
                          <span className="text-sm font-bold font-mono text-success">{tier.annualDiscountPct}% OFF</span>
                          <p className="text-[11px] text-muted truncate">→ {formatCurrency(annualPrice)}/yr</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quotas Grid */}
                  <div className="pt-2 border-t border-subtle">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-2">
                      Operational Quotas
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-surface-muted border border-subtle">
                        <span className="text-[10px] text-muted block">Workstations</span>
                        {isEditing ? (
                          <input
                            type="number"
                            min="1"
                            value={draftPricing.workstationLimit ?? 1}
                            onChange={(e) => setDraftPricing((d) => ({ ...d, workstationLimit: parseInt(e.target.value, 10) || 1 }))}
                            className="w-full text-xs font-mono font-bold bg-surface rounded border border-subtle px-1.5 py-0.5 mt-1"
                          />
                        ) : (
                          <span className="font-bold text-primary font-mono">{tier.workstationLimit ?? 1} terminals</span>
                        )}
                      </div>

                      <div className="p-2 rounded-lg bg-surface-muted border border-subtle">
                        <span className="text-[10px] text-muted block">Branch Stores</span>
                        {isEditing ? (
                          <input
                            type="number"
                            min="1"
                            value={draftPricing.branchLimit ?? 1}
                            onChange={(e) => setDraftPricing((d) => ({ ...d, branchLimit: parseInt(e.target.value, 10) || 1 }))}
                            className="w-full text-xs font-mono font-bold bg-surface rounded border border-subtle px-1.5 py-0.5 mt-1"
                          />
                        ) : (
                          <span className="font-bold text-primary font-mono">{tier.branchLimit ?? 1} branches</span>
                        )}
                      </div>

                      <div className="p-2 rounded-lg bg-surface-muted border border-subtle">
                        <span className="text-[10px] text-muted block">Cloud Storage</span>
                        {isEditing ? (
                          <input
                            type="number"
                            min="1"
                            step="0.5"
                            value={draftPricing.storageLimitGb ?? 2}
                            onChange={(e) => setDraftPricing((d) => ({ ...d, storageLimitGb: parseFloat(e.target.value) || 2 }))}
                            className="w-full text-xs font-mono font-bold bg-surface rounded border border-subtle px-1.5 py-0.5 mt-1"
                          />
                        ) : (
                          <span className="font-bold text-primary font-mono">{tier.storageLimitGb ?? 2} GB</span>
                        )}
                      </div>

                      <div className="p-2 rounded-lg bg-surface-muted border border-subtle">
                        <span className="text-[10px] text-muted block">Alert Quota</span>
                        {isEditing ? (
                          <input
                            type="number"
                            min="100"
                            value={draftPricing.alertLimit ?? 500}
                            onChange={(e) => setDraftPricing((d) => ({ ...d, alertLimit: parseInt(e.target.value, 10) || 500 }))}
                            className="w-full text-xs font-mono font-bold bg-surface rounded border border-subtle px-1.5 py-0.5 mt-1"
                          />
                        ) : (
                          <span className="font-bold text-primary font-mono">{tier.alertLimit ?? 500} alerts</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
                      Plan Description
                    </label>
                    {isEditing ? (
                      <RichEditor
                        value={draftPricing.description ?? ""}
                        onChange={(html) => setDraftPricing((d) => ({ ...d, description: html }))}
                      />
                    ) : (
                      <div
                        className="text-xs text-secondary leading-relaxed [&_ul]:list-disc [&_ul]:pl-4 [&_b]:font-bold [&_strong]:font-bold [&_em]:italic"
                        dangerouslySetInnerHTML={{ __html: tier.description }}
                      />
                    )}
                  </div>

                  {/* Dynamic Features List */}
                  <div className="pt-2 border-t border-subtle">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
                      Plan Feature Points ({currentFeatures.length})
                    </label>
                    
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {currentFeatures.map((feat, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-muted border border-subtle text-xs">
                              <span className="flex-1 truncate">{feat}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFeature(idx)}
                                className="text-muted hover:text-danger p-1 transition-colors cursor-pointer"
                                title="Remove feature"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={newFeatureText}
                            onChange={(e) => setNewFeatureText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddFeature();
                              }
                            }}
                            placeholder="Add feature bullet point..."
                            className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-surface border border-subtle text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleAddFeature}
                            className="px-2.5 py-1.5 text-xs gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <ul className="space-y-1.5 text-xs text-secondary">
                        {currentFeatures.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer for Editing */}
              {isEditing && (
                <div className="p-5 pt-3 border-t border-subtle bg-surface-muted/50 flex gap-2">
                  <Button variant="primary" onClick={handleSave} disabled={isSaving} className="flex-1 gap-2">
                    <Save className="h-3.5 w-3.5" />
                    {isSaving ? "Saving…" : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => config && startEdit(config.tiers.find((t) => t.tier === editingTier)!)}
                    disabled={isSaving}
                    title="Reset to last saved"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export const AdminSubscriptionPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "pricing" ? "pricing" : "stores";
  const [activeTab, setActiveTab] = useState<AdminBillingTab>(initialTab);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "pricing" && activeTab !== "pricing") {
      setActiveTab("pricing");
    } else if (tab !== "pricing" && activeTab === "pricing" && !tab) {
      setActiveTab("stores");
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tabId: AdminBillingTab) => {
    setActiveTab(tabId);
    setSearchParams(tabId === "pricing" ? { tab: "pricing" } : {});
  };

  const tabs: { id: AdminBillingTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "stores", label: "Store Subscriptions", icon: Building2 },
    { id: "pricing", label: "Plan Pricing & Discounts", icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-1">Subscription Management</h1>
          <p className="text-sm text-secondary">
            Oversee all store plans, manage platform pricing, quotas, features, and record manual payments.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-muted border border-subtle w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-primary text-primary-fg shadow-sm"
                : "text-secondary hover:text-primary hover:bg-surface"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "stores" ? <StoresTab /> : <PricingTab />}
    </div>
  );
};
