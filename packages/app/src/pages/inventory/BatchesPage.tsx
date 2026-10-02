import React, { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  Button,
  Input,
  Badge,
  StatusBadge,
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
  Pagination,
} from "@inventra/ui";
import { inventoryApi } from "../../services/inventoryApi";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";
import type { BatchStatus } from "@inventra/api-types";
import {
  Boxes,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  Store,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

type ExpiryFilter = "ALL" | "EXPIRED" | "30_DAYS" | "60_DAYS" | "90_DAYS";

export const BatchesPage: React.FC = () => {
  const activeContext = useAuthStore((state) => state.activeContext);
  const storeId = activeContext?.storeId;
  const businessId = activeContext?.businessId;
  const [searchParams] = useSearchParams();

  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>(() => {
    const f = searchParams.get("filter")?.toUpperCase();
    if (f === "EXPIRING" || f === "60_DAYS" || f === "60") return "60_DAYS";
    if (f === "30_DAYS" || f === "30") return "30_DAYS";
    if (f === "90_DAYS" || f === "90") return "90_DAYS";
    if (f === "EXPIRED") return "EXPIRED";
    return "ALL";
  });
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    return searchParams.get("search") || "";
  });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  React.useEffect(() => {
    const f = searchParams.get("filter")?.toUpperCase();
    if (f === "EXPIRING" || f === "60_DAYS" || f === "60") {
      setExpiryFilter("60_DAYS");
    } else if (f === "30_DAYS" || f === "30") {
      setExpiryFilter("30_DAYS");
    } else if (f === "90_DAYS" || f === "90") {
      setExpiryFilter("90_DAYS");
    } else if (f === "EXPIRED") {
      setExpiryFilter("EXPIRED");
    }

    const s = searchParams.get("search");
    if (s !== null) {
      setSearchQuery(s);
    }
  }, [searchParams]);

  // Convert filter tab to API parameters
  const expiringWithinDays =
    expiryFilter === "30_DAYS"
      ? 30
      : expiryFilter === "60_DAYS"
      ? 60
      : expiryFilter === "90_DAYS"
      ? 90
      : undefined;
  const expiredOnly = expiryFilter === "EXPIRED";

  // Store-scoped TanStack Query for Batches
  const {
    data: batchesPageData,
    isLoading: isLoadingBatches,
    isError: isBatchesError,
    error: batchesError,
    refetch: refetchBatches,
    isFetching,
  } = useQuery({
    queryKey: [
      "inventory-batches",
      businessId,
      storeId,
      { expiringWithinDays, expiredOnly, page, size: pageSize },
    ],
    queryFn: () =>
      inventoryApi.listBatches({
        storeId,
        expiringWithinDays,
        expiredOnly,
        page,
        size: pageSize,
      }),
    enabled: !!storeId,
  });

  // Query catalog products to resolve human-readable product names and SKUs
  const { data: catalogData } = useQuery({
    queryKey: ["catalog-products", businessId, 0, 100],
    queryFn: () => catalogApi.listProducts(0, 100),
    enabled: !!businessId,
    staleTime: 60000,
  });

  const productsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (catalogData?.content) {
      for (const p of catalogData.content) {
        map.set(p.id, p);
      }
    }
    return map;
  }, [catalogData]);

  // Filter batches by search query
  const filteredBatches = useMemo(() => {
    if (!batchesPageData?.content) return [];
    return batchesPageData.content.filter((batch) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const product = productsMap.get(batch.productId);
      const batchMatch = batch.batchNumber.toLowerCase().includes(q);
      const nameMatch = product?.name?.toLowerCase().includes(q);
      const genericMatch = product?.genericName?.toLowerCase().includes(q);
      const skuMatch = product?.sku?.toLowerCase().includes(q);
      return batchMatch || nameMatch || genericMatch || skuMatch;
    });
  }, [batchesPageData, productsMap, searchQuery]);

  const totalElements = batchesPageData?.totalElements ?? 0;
  const totalPages = batchesPageData?.totalPages ?? 1;

  const getBatchUrgency = (expiryDate: string, status: BatchStatus) => {
    if (status === "EXPIRED") {
      return { variant: "danger" as const, label: "Expired", icon: AlertTriangle };
    }
    if (status === "QUARANTINED" || status === "RECALLED") {
      return { variant: "danger" as const, label: status, icon: ShieldAlert };
    }
    if (status === "DEPLETED") {
      return { variant: "neutral" as const, label: "Depleted", icon: Clock };
    }

    try {
      const expiry = new Date(expiryDate);
      const now = new Date();
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        return { variant: "danger" as const, label: "Expired", icon: AlertTriangle };
      }
      if (diffDays <= 30) {
        return { variant: "danger" as const, label: `Expires in ${diffDays}d`, icon: AlertTriangle };
      }
      if (diffDays <= 60) {
        return { variant: "warning" as const, label: `Expires in ${diffDays}d`, icon: Clock };
      }
      return { variant: "success" as const, label: "Healthy", icon: CheckCircle2 };
    } catch {
      return { variant: "neutral" as const, label: "Active", icon: CheckCircle2 };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Store Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
              Store Batches & FEFO Explorer
            </h1>
            <Badge variant="outline" className="font-mono text-xs hidden sm:inline-flex">
              STORE SCOPED
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-secondary">
            <Store className="h-3.5 w-3.5 text-accent shrink-0" />
            <span>
              Active Store: <strong className="text-primary">{activeContext?.storeName || "Select Store"}</strong>
              {activeContext?.storeCode && (
                <span className="font-mono text-muted ml-1">({activeContext.storeCode})</span>
              )}
            </span>
            <span className="text-subtle">•</span>
            <span className="text-muted">{activeContext?.businessName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/inventory">
            <Button variant="outline" size="sm" className="text-xs">
              <Boxes className="h-3.5 w-3.5 mr-1.5" />
              Inventory Overview
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchBatches()}
            disabled={isFetching}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Expiry Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-muted rounded-lg border border-subtle text-xs">
          <button
            type="button"
            onClick={() => {
              setExpiryFilter("ALL");
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              expiryFilter === "ALL"
                ? "bg-surface text-primary shadow-xs font-semibold"
                : "text-secondary hover:text-primary"
            }`}
          >
            All Batches ({totalElements})
          </button>
          <button
            type="button"
            onClick={() => {
              setExpiryFilter("30_DAYS");
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 ${
              expiryFilter === "30_DAYS"
                ? "bg-surface text-danger shadow-xs font-semibold"
                : "text-secondary hover:text-danger"
            }`}
          >
            <Clock className="h-3 w-3" />
            Expiring ≤ 30 Days
          </button>
          <button
            type="button"
            onClick={() => {
              setExpiryFilter("60_DAYS");
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 ${
              expiryFilter === "60_DAYS"
                ? "bg-surface text-warning shadow-xs font-semibold"
                : "text-secondary hover:text-warning"
            }`}
          >
            <Clock className="h-3 w-3" />
            Expiring ≤ 60 Days
          </button>
          <button
            type="button"
            onClick={() => {
              setExpiryFilter("EXPIRED");
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 ${
              expiryFilter === "EXPIRED"
                ? "bg-surface text-danger shadow-xs font-semibold"
                : "text-secondary hover:text-danger"
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            Expired Lots
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          <Input
            type="search"
            placeholder="Search batch lot, product, SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Main Batches Content Area */}
      {isBatchesError ? (
        <Alert variant="danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Failed to load store batches</h4>
            <p className="text-xs mt-0.5">
              {(batchesError as any)?.message || "An error occurred while connecting to the inventory service."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchBatches()}
              className="mt-2 text-xs"
            >
              Retry
            </Button>
          </div>
        </Alert>
      ) : isLoadingBatches ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filteredBatches.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-8 w-8" />}
          title={
            expiryFilter === "EXPIRED"
              ? "No Expired Lots"
              : expiryFilter !== "ALL"
              ? "No Batches Expiring in This Range"
              : searchQuery
              ? "No Matching Batches Found"
              : "No Batches Recorded in This Store"
          }
          description={
            expiryFilter === "EXPIRED"
              ? "Good news! There are no expired inventory lots in this store."
              : searchQuery
              ? `No batch records matched "${searchQuery}". Try another lot number or product keyword.`
              : "Record stock receipts through Goods Receipts (GRN) to populate store batches."
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto border border-subtle rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Lot</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Mfg Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Expiry Status</TableHead>
                  <TableHead className="text-right">Available Qty</TableHead>
                  <TableHead className="text-right">Cost Price</TableHead>
                  <TableHead className="text-right">MRP</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map((batch) => {
                  const product = productsMap.get(batch.productId);
                  const urgency = getBatchUrgency(batch.expiryDate, batch.status);
                  const isExpired = batch.status === "EXPIRED" || urgency.label === "Expired";

                  return (
                    <TableRow
                      key={batch.id}
                      className={`hover:bg-surface-muted/50 transition-colors ${
                        isExpired ? "bg-danger-subtle/20" : ""
                      }`}
                    >
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        <div className="flex items-center gap-1.5">
                          <span>{batch.batchNumber}</span>
                          {isExpired && (
                            <Badge variant="destructive" className="text-[9px] font-mono px-1 py-0.2">
                              Expired
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <Link
                            to={`/inventory/${batch.productId}`}
                            className="font-medium text-xs text-primary hover:text-accent hover:underline"
                          >
                            {product?.name || `Product (${batch.productId.slice(0, 8)}...)`}
                          </Link>
                          {product?.genericName && (
                            <span className="text-[11px] text-muted truncate max-w-xs">
                              {product.genericName}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-xs text-muted">
                        {batch.manufacturingDate || "—"}
                      </TableCell>

                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {batch.expiryDate}
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={urgency.variant} label={urgency.label} />
                      </TableCell>

                      <TableCellNumeric className="font-mono text-sm font-bold text-primary">
                        {batch.quantity.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </TableCellNumeric>

                      <TableCellNumeric className="font-mono text-xs text-muted">
                        ₹{batch.purchasePrice.toFixed(2)}
                      </TableCellNumeric>

                      <TableCellNumeric className="font-mono text-xs text-muted">
                        ₹{batch.mrp.toFixed(2)}
                      </TableCellNumeric>

                      <TableCellNumeric className="font-mono text-xs font-semibold text-primary">
                        ₹{batch.sellingPrice.toFixed(2)}
                      </TableCellNumeric>

                      <TableCell>
                        <Badge
                          variant={batch.status === "ACTIVE" ? "success" : "destructive"}
                          className="text-[10px] font-mono"
                        >
                          {batch.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <Link to={`/inventory/${batch.productId}`}>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                            FEFO View
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards View */}
          <div className="space-y-3 md:hidden">
            {filteredBatches.map((batch) => {
              const product = productsMap.get(batch.productId);
              const urgency = getBatchUrgency(batch.expiryDate, batch.status);

              return (
                <Card key={batch.id} className="p-3.5 border-subtle space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-sm text-primary">
                        {batch.batchNumber}
                      </span>
                      <p className="text-xs text-secondary mt-0.5">
                        {product?.name || `Product (${batch.productId.slice(0, 8)}...)`}
                      </p>
                    </div>
                    <StatusBadge status={urgency.variant} label={urgency.label} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-subtle text-xs">
                    <div>
                      <span className="text-muted block text-[10px] uppercase">Available Stock</span>
                      <span className="font-mono font-bold text-sm text-primary">
                        {batch.quantity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted block text-[10px] uppercase">Expiry Date</span>
                      <span className="font-mono text-xs text-secondary font-semibold">
                        {batch.expiryDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-subtle text-xs">
                    <span className="font-mono text-muted">
                      MRP: ₹{batch.mrp.toFixed(2)} | SP: ₹{batch.sellingPrice.toFixed(2)}
                    </span>
                    <Link to={`/inventory/${batch.productId}`}>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        Details
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {filteredBatches.length > 0 && (
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
