import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Button,
  Badge,
  StatusBadge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCellNumeric,
  EmptyState,
  Skeleton,
  Alert,
  Pagination,
} from "@inventra/ui";
import { purchasingApi } from "../../services/purchasingApi";
import { useAuthStore } from "../../stores/authStore";
import { ContextualHelpModal } from "../../components/common/ContextualHelpModal";
import type { GoodsReceiptStatus } from "@inventra/api-types";
import {
  Truck,
  Plus,
  RefreshCw,
  ArrowRight,
  Store,
  CheckCircle2,
  Clock,
} from "lucide-react";

export const GoodsReceiptsPage: React.FC = () => {
  const activeContext = useAuthStore((state) => state.activeContext);
  const storeId = activeContext?.storeId;
  const businessId = activeContext?.businessId;
  const userRole = activeContext?.role || "STAFF";
  const canManage = ["OWNER", "ADMIN", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"].includes(userRole);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const {
    data: goodsReceiptsPage,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [
      "goods-receipts",
      businessId,
      storeId,
      { status: statusFilter === "ALL" ? undefined : statusFilter, page, size: pageSize },
    ],
    queryFn: () =>
      purchasingApi.listGoodsReceipts({
        storeId,
        status: statusFilter === "ALL" ? undefined : (statusFilter as GoodsReceiptStatus),
        page,
        size: pageSize,
      }),
    enabled: !!storeId,
  });

  const getStatusBadge = (status: GoodsReceiptStatus) => {
    switch (status) {
      case "POSTED":
        return <StatusBadge status="success" label="Posted / Stocked" />;
      case "DRAFT":
        return <StatusBadge status="warning" label="Draft" />;
      case "CANCELLED":
        return <StatusBadge status="danger" label="Cancelled" />;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalPages = goodsReceiptsPage?.totalPages ?? 1;
  const totalElements = goodsReceiptsPage?.totalElements ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
              Goods Receipts (GRN)
            </h1>
            <Badge variant="outline" className="font-mono text-xs hidden sm:inline-flex">
              STORE RECEIVING
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-secondary">
            <Store className="h-3.5 w-3.5 text-accent shrink-0" />
            <span>
              Receiving Branch: <strong className="text-primary">{activeContext?.storeName}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {canManage && (
            <Link to="/goods-receipts/new">
              <Button variant="primary" size="sm" className="text-xs">
                <Plus className="h-4 w-4 mr-1" />
                New Goods Receipt
              </Button>
            </Link>
          )}

          <ContextualHelpModal topic="goods-receipts" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-surface-muted rounded-lg border border-subtle self-start text-xs">
          <button
            type="button"
            onClick={() => {
              setStatusFilter("ALL");
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              statusFilter === "ALL"
                ? "bg-surface text-primary shadow-xs font-semibold"
                : "text-secondary hover:text-primary"
            }`}
          >
            All Receipts
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("DRAFT");
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              statusFilter === "DRAFT"
                ? "bg-surface text-warning shadow-xs font-semibold"
                : "text-secondary hover:text-warning"
            }`}
          >
            <Clock className="h-3 w-3" />
            Drafts
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("POSTED");
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              statusFilter === "POSTED"
                ? "bg-surface text-success shadow-xs font-semibold"
                : "text-secondary hover:text-success"
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            Posted (Stocked)
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      {isError ? (
        <Alert variant="danger">
          <div>
            <h4 className="font-semibold text-sm">Failed to load goods receipts</h4>
            <p className="text-xs mt-0.5">
              {(error as any)?.message || "An unexpected error occurred while querying receipts."}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2 text-xs">
              Retry
            </Button>
          </div>
        </Alert>
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : !goodsReceiptsPage?.content || goodsReceiptsPage.content.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-8 w-8" />}
          title="No Goods Receipts Found"
          description={
            statusFilter !== "ALL"
              ? `No ${statusFilter.toLowerCase()} receipts found for this store.`
              : "Create a Goods Receipt Note (GRN) to receive pharmaceutical shipments, capture lot numbers, and increment physical stock."
          }
          action={
            canManage && statusFilter === "ALL" ? (
              <Link to="/goods-receipts/new">
                <Button variant="primary" size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Receive New Shipment
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto border border-subtle rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GRN Number</TableHead>
                  <TableHead>Received Date</TableHead>
                  <TableHead>Delivery Note / Invoice</TableHead>
                  <TableHead className="text-center">Lines</TableHead>
                  <TableHead className="text-right">Total Qty</TableHead>
                  <TableHead className="text-right">Total Invoice (₹)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goodsReceiptsPage.content.map((gr) => (
                  <TableRow key={gr.id} className="hover:bg-surface-muted/50 transition-colors">
                    <TableCell>
                      <Link
                        to={`/goods-receipts/${gr.id}`}
                        className="font-mono text-sm font-semibold text-primary hover:text-accent hover:underline flex items-center gap-1.5"
                      >
                        {gr.receiptNumber}
                      </Link>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-muted">
                      {gr.receivedDate}
                    </TableCell>

                    <TableCell className="font-mono text-xs text-secondary">
                      {gr.vendorDeliveryNote || "—"}
                    </TableCell>

                    <TableCell className="text-center font-mono text-xs text-secondary">
                      {gr.totalItems} Items
                    </TableCell>

                    <TableCellNumeric className="font-mono text-xs text-secondary">
                      {gr.totalReceivedQuantity}
                    </TableCellNumeric>

                    <TableCellNumeric className="font-mono text-sm font-bold text-primary">
                      ₹{gr.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCellNumeric>

                    <TableCell>{getStatusBadge(gr.status)}</TableCell>

                    <TableCell className="text-right">
                      <Link to={`/goods-receipts/${gr.id}`}>
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

          {/* Pagination */}
          {goodsReceiptsPage.content.length > 0 && (
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
