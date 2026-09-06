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
import type { PurchaseOrderStatus } from "@inventra/api-types";
import {
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Store,
  ArrowRight,
  Truck,
  Building2,
  Calendar,
  AlertTriangle,
} from "lucide-react";

type StatusTab = "ALL" | PurchaseOrderStatus;

export const PurchaseOrdersPage: React.FC = () => {
  const activeContext = useAuthStore((state) => state.activeContext);
  const storeId = activeContext?.storeId;
  const businessId = activeContext?.businessId;
  const userRole = activeContext?.role || "STAFF";
  const canCreate = ["OWNER", "MANAGER"].includes(userRole);

  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Query suppliers list for filter dropdown
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-dropdown", businessId],
    queryFn: () => purchasingApi.listSuppliers({ size: 100 }),
    enabled: !!businessId,
  });

  // Query Purchase Orders
  const {
    data: poPageData,
    isLoading: isLoadingPOs,
    isError: isPOError,
    error: poError,
    refetch: refetchPOs,
    isFetching,
  } = useQuery({
    queryKey: [
      "purchase-orders",
      businessId,
      storeId,
      {
        status: activeTab === "ALL" ? undefined : activeTab,
        supplierId: selectedSupplierId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        size: pageSize,
      },
    ],
    queryFn: () =>
      purchasingApi.listPurchaseOrders({
        storeId,
        supplierId: selectedSupplierId || undefined,
        status: activeTab === "ALL" ? undefined : activeTab,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        size: pageSize,
      }),
    enabled: !!businessId,
  });

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary" className="font-mono text-[10px]">DRAFT</Badge>;
      case "CONFIRMED":
        return <Badge variant="accent" className="font-mono text-[10px]">CONFIRMED</Badge>;
      case "PARTIALLY_RECEIVED":
        return <Badge variant="warning" className="font-mono text-[10px]">PARTIALLY RECEIVED</Badge>;
      case "FULLY_RECEIVED":
        return <Badge variant="success" className="font-mono text-[10px]">FULLY RECEIVED</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive" className="font-mono text-[10px]">CANCELLED</Badge>;
      case "CLOSED":
        return <Badge variant="outline" className="font-mono text-[10px]">CLOSED</Badge>;
      default:
        return <Badge variant="outline" className="font-mono text-[10px]">{status}</Badge>;
    }
  };

  const totalElements = poPageData?.totalElements ?? 0;
  const totalPages = poPageData?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Header & Store Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
              Purchase Orders (PO)
            </h1>
            <Badge variant="outline" className="font-mono text-xs hidden sm:inline-flex">
              PROCUREMENT
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
            onClick={() => refetchPOs()}
            disabled={isFetching}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {canCreate && (
            <Link to="/purchasing/orders/new">
              <Button variant="primary" size="sm" className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Purchase Order
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filter Tabs & Sub-filters */}
      <div className="space-y-3">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-muted rounded-lg border border-subtle text-xs">
          {(["ALL", "DRAFT", "CONFIRMED", "PARTIALLY_RECEIVED", "FULLY_RECEIVED", "CANCELLED"] as StatusTab[]).map(
            (tab) => (
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
                {tab === "ALL" ? `All Orders (${totalElements})` : tab.replace("_", " ")}
              </button>
            )
          )}
        </div>

        {/* Secondary Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

          {/* From Date */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted shrink-0" />
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(0);
              }}
              className="h-9 text-xs"
              placeholder="From Date"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted shrink-0" />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(0);
              }}
              className="h-9 text-xs"
              placeholder="To Date"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isPOError ? (
        <Alert variant="danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Failed to load purchase orders</h4>
            <p className="text-xs mt-0.5">
              {(poError as any)?.message || "An error occurred while communicating with the procurement service."}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetchPOs()} className="mt-2 text-xs">
              Retry
            </Button>
          </div>
        </Alert>
      ) : isLoadingPOs ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : !poPageData?.content || poPageData.content.length === 0 ? (
        <EmptyState
          icon={<FileSpreadsheet className="h-8 w-8" />}
          title={
            activeTab !== "ALL"
              ? `No ${activeTab.replace("_", " ")} Purchase Orders`
              : selectedSupplierId
              ? "No Purchase Orders for Selected Supplier"
              : "No Purchase Orders Recorded"
          }
          description="Create purchase orders to authorize replenishment and track supplier delivery fulfillment."
          action={
            canCreate && (
              <Link to="/purchasing/orders/new">
                <Button variant="primary" size="sm" className="text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Create First Purchase Order
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto border border-subtle rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poPageData.content.map((po) => (
                  <TableRow key={po.id} className="hover:bg-surface-muted/50 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-primary">
                      <Link
                        to={`/purchasing/orders/${po.id}`}
                        className="hover:text-accent hover:underline flex items-center gap-1.5"
                      >
                        {po.orderNumber}
                      </Link>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-muted">
                      {po.orderDate}
                    </TableCell>

                    <TableCell className="font-mono text-xs text-muted">
                      {po.expectedDeliveryDate || "—"}
                    </TableCell>

                    <TableCell>{getStatusBadge(po.status)}</TableCell>

                    <TableCellNumeric className="font-mono text-sm font-bold text-primary">
                      ₹{po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCellNumeric>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(po.status === "CONFIRMED" || po.status === "PARTIALLY_RECEIVED") && (
                          <Link to={`/goods-receipts/new?purchaseOrderId=${po.id}&supplierId=${po.supplierId}`}>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs text-accent">
                              <Truck className="h-3 w-3 mr-1" />
                              Receive GRN
                            </Button>
                          </Link>
                        )}
                        <Link to={`/purchasing/orders/${po.id}`}>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                            Details
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards View */}
          <div className="space-y-3 md:hidden">
            {poPageData.content.map((po) => (
              <Card key={po.id} className="p-3.5 border-subtle space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/purchasing/orders/${po.id}`}
                      className="font-mono font-bold text-sm text-primary hover:text-accent"
                    >
                      {po.orderNumber}
                    </Link>
                    <p className="text-xs text-muted font-mono mt-0.5">Date: {po.orderDate}</p>
                  </div>
                  {getStatusBadge(po.status)}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-subtle text-xs">
                  <div>
                    <span className="text-muted block text-[10px] uppercase">Total Amount</span>
                    <span className="font-mono font-bold text-sm text-primary">
                      ₹{po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted block text-[10px] uppercase">Expected Date</span>
                    <span className="font-mono text-xs text-secondary">
                      {po.expectedDeliveryDate || "—"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-subtle">
                  {(po.status === "CONFIRMED" || po.status === "PARTIALLY_RECEIVED") && (
                    <Link
                      to={`/goods-receipts/new?purchaseOrderId=${po.id}&supplierId=${po.supplierId}`}
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="h-8 text-xs w-full text-accent">
                        <Truck className="h-3.5 w-3.5 mr-1" />
                        Receive
                      </Button>
                    </Link>
                  )}
                  <Link to={`/purchasing/orders/${po.id}`} className="flex-1">
                    <Button variant="primary" size="sm" className="h-8 text-xs w-full">
                      View Order
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {poPageData.content.length > 0 && (
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
