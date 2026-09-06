import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  Button,
  Input,
  Badge,
  EmptyState,
  Alert,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCellNumeric,
  Select,
  Pagination,
} from "@inventra/ui";
import { purchasingApi } from "../../services/purchasingApi";
import { useAuthStore } from "../../stores/authStore";
import type { PurchaseInvoiceStatus } from "@inventra/api-types";
import {
  Receipt,
  RefreshCw,
  Store,
  ArrowRight,
  Building2,
  Calendar,
  AlertTriangle,
} from "lucide-react";

type StatusTab = "ALL" | PurchaseInvoiceStatus;

export const PurchaseInvoicesPage: React.FC = () => {
  const activeContext = useAuthStore((state) => state.activeContext);
  const storeId = activeContext?.storeId;
  const businessId = activeContext?.businessId;

  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [dueDateBefore, setDueDateBefore] = useState<string>("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Query suppliers list for filter dropdown
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-dropdown", businessId],
    queryFn: () => purchasingApi.listSuppliers({ size: 100 }),
    enabled: !!businessId,
  });

  // Query Purchase Invoices
  const {
    data: invoicePageData,
    isLoading: isLoadingInvoices,
    isError: isInvoiceError,
    error: invoiceError,
    refetch: refetchInvoices,
    isFetching,
  } = useQuery({
    queryKey: [
      "purchase-invoices",
      businessId,
      storeId,
      {
        status: activeTab === "ALL" ? undefined : activeTab,
        supplierId: selectedSupplierId || undefined,
        dueDateBefore: dueDateBefore || undefined,
        page,
        size: pageSize,
      },
    ],
    queryFn: () =>
      purchasingApi.listPurchaseInvoices({
        storeId,
        supplierId: selectedSupplierId || undefined,
        status: activeTab === "ALL" ? undefined : activeTab,
        dueDateBefore: dueDateBefore || undefined,
        page,
        size: pageSize,
      }),
    enabled: !!businessId,
  });

  const getStatusBadge = (status: PurchaseInvoiceStatus) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary" className="font-mono text-[10px]">DRAFT</Badge>;
      case "POSTED":
        return <Badge variant="success" className="font-mono text-[10px]">POSTED</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive" className="font-mono text-[10px]">CANCELLED</Badge>;
      default:
        return <Badge variant="outline" className="font-mono text-[10px]">{status}</Badge>;
    }
  };

  const totalElements = invoicePageData?.totalElements ?? 0;
  const totalPages = invoicePageData?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Header & Store Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
              Purchase Invoices
            </h1>
            <Badge variant="outline" className="font-mono text-xs hidden sm:inline-flex">
              ACCOUNTS PAYABLE
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-secondary">
            <Store className="h-3.5 w-3.5 text-accent shrink-0" />
            <span>
              Active Store: <strong className="text-primary">{activeContext?.storeName || "All Branches"}</strong>
            </span>
            <span className="text-subtle">•</span>
            <span className="text-muted">{activeContext?.businessName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchInvoices()}
            disabled={isFetching}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Sub-filters */}
      <div className="space-y-3">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-muted rounded-lg border border-subtle text-xs">
          {(["ALL", "DRAFT", "POSTED", "CANCELLED"] as StatusTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === tab
                  ? "bg-surface text-primary shadow-xs font-semibold"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {tab === "ALL" ? `All Invoices (${totalElements})` : tab}
            </button>
          ))}
        </div>

        {/* Secondary Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Supplier Dropdown */}
          <div className="w-full">
            <Select
              value={selectedSupplierId}
              leftIcon={<Building2 className="h-4 w-4" />}
              onChange={(e) => {
                setSelectedSupplierId(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All Suppliers</option>
              {suppliersData?.content.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.legalName} ({s.supplierCode})
                </option>
              ))}
            </Select>
          </div>

          {/* Due Date Before */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted shrink-0" />
            <Input
              type="date"
              value={dueDateBefore}
              onChange={(e) => {
                setDueDateBefore(e.target.value);
                setPage(0);
              }}
              className="h-9 text-xs"
              placeholder="Due Date Before"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isInvoiceError ? (
        <Alert variant="danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Failed to load purchase invoices</h4>
            <p className="text-xs mt-0.5">
              {(invoiceError as any)?.message || "An error occurred while communicating with the purchasing service."}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetchInvoices()} className="mt-2 text-xs">
              Retry
            </Button>
          </div>
        </Alert>
      ) : isLoadingInvoices ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : !invoicePageData?.content || invoicePageData.content.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-8 w-8" />}
          title={
            activeTab !== "ALL"
              ? `No ${activeTab} Purchase Invoices`
              : "No Purchase Invoices Found"
          }
          description="Purchase invoices record vendor bills linked to goods receipts or purchase orders."
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto border border-subtle rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicePageData.content.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-surface-muted/50 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-primary">
                      <Link
                        to={`/purchasing/invoices/${inv.id}`}
                        className="hover:text-accent hover:underline flex items-center gap-1.5"
                      >
                        {inv.supplierInvoiceNumber}
                      </Link>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-muted">
                      {inv.invoiceDate || "—"}
                    </TableCell>

                    <TableCell className="font-mono text-xs text-muted">
                      {inv.dueDate || "—"}
                    </TableCell>

                    <TableCell className="font-mono text-xs text-muted">
                      {inv.totalLines} lines
                    </TableCell>

                    <TableCell>{getStatusBadge(inv.status)}</TableCell>

                    <TableCellNumeric className="font-mono text-sm font-bold text-primary">
                      ₹{inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCellNumeric>

                    <TableCell className="text-right">
                      <Link to={`/purchasing/invoices/${inv.id}`}>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                          Details
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards View */}
          <div className="space-y-3 md:hidden">
            {invoicePageData.content.map((inv) => (
              <Card key={inv.id} className="p-3.5 border-subtle space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/purchasing/invoices/${inv.id}`}
                      className="font-mono font-bold text-sm text-primary hover:text-accent"
                    >
                      {inv.supplierInvoiceNumber}
                    </Link>
                    <p className="text-xs text-muted font-mono mt-0.5">Date: {inv.invoiceDate || "—"}</p>
                  </div>
                  {getStatusBadge(inv.status)}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-subtle text-xs">
                  <div>
                    <span className="text-muted block text-[10px] uppercase">Total Amount</span>
                    <span className="font-mono font-bold text-sm text-primary">
                      ₹{inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted block text-[10px] uppercase">Due Date</span>
                    <span className="font-mono text-xs text-secondary">
                      {inv.dueDate || "—"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-subtle">
                  <Link to={`/purchasing/invoices/${inv.id}`} className="w-full">
                    <Button variant="primary" size="sm" className="h-8 text-xs w-full">
                      View Invoice
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {invoicePageData.content.length > 0 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalElements={totalElements}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 50, 100]}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(0);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
