import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Button,
  Badge,
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
} from "@inventra/ui";
import { inventoryApi } from "../../services/inventoryApi";
import { useAuthStore } from "../../stores/authStore";
import type { StockMovementType } from "@inventra/api-types";
import { History, ArrowLeft, RefreshCw, Store } from "lucide-react";

export const StockMovementsPage: React.FC = () => {
  const activeContext = useAuthStore((state) => state.activeContext);
  const storeId = activeContext?.storeId;
  const businessId = activeContext?.businessId;

  const [page, setPage] = useState(0);
  const pageSize = 20;

  const {
    data: movementsPage,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["inventory-movements-ledger", businessId, storeId, { page, size: pageSize }],
    queryFn: () => inventoryApi.listStockMovements({ storeId, page, size: pageSize }),
    enabled: !!storeId,
  });

  const getMovementBadgeVariant = (type: StockMovementType): "success" | "destructive" | "secondary" => {
    switch (type) {
      case "INITIAL_STOCK":
      case "PURCHASE_RECEIPT":
      case "SALE_RETURN":
      case "ADJUSTMENT_IN":
      case "TRANSFER_IN":
        return "success";
      case "SALE":
      case "PURCHASE_RETURN":
      case "ADJUSTMENT_OUT":
      case "TRANSFER_OUT":
      case "DAMAGE_WRITE_OFF":
      case "EXPIRY_WRITE_OFF":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const totalPages = movementsPage?.totalPages ?? 1;
  const totalElements = movementsPage?.totalElements ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-subtle">
        <div className="space-y-1">
          <Link
            to="/inventory"
            className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Inventory
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
            Stock Movement Ledger
          </h1>
          <div className="flex items-center gap-2 text-xs text-secondary">
            <Store className="h-3.5 w-3.5 text-accent shrink-0" />
            <span>
              Store: <strong className="text-primary">{activeContext?.storeName}</strong>
            </span>
          </div>
        </div>

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
      </div>

      {/* Movements Table */}
      {isError ? (
        <Alert variant="danger">
          <div>
            <h4 className="font-semibold text-sm">Failed to load stock movements</h4>
            <p className="text-xs mt-0.5">
              {(error as any)?.message || "An unexpected error occurred while fetching movements."}
            </p>
          </div>
        </Alert>
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : !movementsPage?.content || movementsPage.content.length === 0 ? (
        <EmptyState
          icon={<History className="h-8 w-8" />}
          title="No Stock Movements Recorded"
          description="There are currently no recorded stock movements or adjustments for this store."
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto border border-subtle rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Occurred At</TableHead>
                  <TableHead>Movement Type</TableHead>
                  <TableHead>Product ID</TableHead>
                  <TableHead>Batch ID</TableHead>
                  <TableHead className="text-right">Delta</TableHead>
                  <TableHead className="text-right">Balance After</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Reason / Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementsPage.content.map((m) => (
                  <TableRow key={m.id} className="hover:bg-surface-muted/50 transition-colors">
                    <TableCell className="font-mono text-xs text-muted whitespace-nowrap">
                      {new Date(m.occurredAt).toLocaleString()}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={getMovementBadgeVariant(m.movementType)}
                        className="text-[10px] font-mono"
                      >
                        {m.movementType}
                      </Badge>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-secondary">
                      <Link to={`/inventory/${m.productId}`} className="hover:underline text-accent">
                        {m.productId.slice(0, 8)}...
                      </Link>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-muted">
                      {m.batchId ? m.batchId.slice(0, 8) + "..." : "—"}
                    </TableCell>

                    <TableCellNumeric
                      className={`font-mono text-xs font-bold ${
                        m.quantityDelta > 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {m.quantityDelta > 0 ? `+${m.quantityDelta.toFixed(2)}` : m.quantityDelta.toFixed(2)}
                    </TableCellNumeric>

                    <TableCellNumeric className="font-mono text-xs font-semibold text-primary">
                      {m.balanceAfter.toFixed(2)}
                    </TableCellNumeric>

                    <TableCell className="text-xs text-muted font-mono">
                      {m.referenceType ? `${m.referenceType}: ${m.referenceId?.slice(0, 8) || ""}` : "—"}
                    </TableCell>

                    <TableCell className="text-xs text-secondary truncate max-w-xs">
                      {m.reason || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-subtle text-xs">
              <span className="text-muted">
                Showing Page <strong className="text-primary">{page + 1}</strong> of{" "}
                <strong className="text-primary">{totalPages}</strong> ({totalElements} movements)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || isFetching}
                  className="h-8 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1 || isFetching}
                  className="h-8 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
