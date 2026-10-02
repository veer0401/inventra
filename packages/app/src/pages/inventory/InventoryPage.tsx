import React, { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  Button,
  Input,
  Badge,
  EmptyState,
  Alert,
  Skeleton,
  Pagination,
} from "@inventra/ui";
import { inventoryApi } from "../../services/inventoryApi";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";
import { InventoryTable, type InventoryRowData } from "../../components/inventory/InventoryTable";
import { StockAdjustmentModal } from "../../components/inventory/StockAdjustmentModal";
import { ContextualHelpModal } from "../../components/common/ContextualHelpModal";
import type { InventoryItemResponse } from "@inventra/api-types";
import {
  Boxes,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  Store,
  ShieldCheck,
} from "lucide-react";

type FilterTab = "ALL" | "LOW_STOCK" | "EXPIRING";

export const InventoryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab")?.toLowerCase();
  const initialTab: FilterTab =
    tabParam === "low-stock" || tabParam === "low_stock"
      ? "LOW_STOCK"
      : tabParam === "expiring"
      ? "EXPIRING"
      : "ALL";

  const activeContext = useAuthStore((state) => state.activeContext);
  const storeId = activeContext?.storeId;
  const businessId = activeContext?.businessId;

  const [activeTab, setActiveTab] = useState<FilterTab>(initialTab);

  useEffect(() => {
    if (tabParam === "low-stock" || tabParam === "low_stock") {
      setActiveTab("LOW_STOCK");
    } else if (tabParam === "expiring") {
      setActiveTab("EXPIRING");
    } else if (tabParam === "all") {
      setActiveTab("ALL");
    }
  }, [tabParam]);

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [selectedItemForAdjustment, setSelectedItemForAdjustment] = useState<InventoryItemResponse | null>(null);

  // Store-scoped TanStack Query for Inventory
  const {
    data: inventoryPageData,
    isLoading: isLoadingInventory,
    isError: isInventoryError,
    error: inventoryError,
    refetch: refetchInventory,
    isFetching,
  } = useQuery({
    queryKey: [
      "inventory",
      businessId,
      storeId,
      { lowStockOnly: activeTab === "LOW_STOCK", page, size: pageSize },
    ],
    queryFn: () =>
      inventoryApi.listInventory({
        storeId,
        lowStockOnly: activeTab === "LOW_STOCK",
        page,
        size: pageSize,
      }),
    enabled: !!storeId,
  });

  // Query near-expiry batches count for KPI telemetry
  const { data: nearExpiryData } = useQuery({
    queryKey: ["inventory-batches-kpi", businessId, storeId],
    queryFn: () => inventoryApi.listBatches({ storeId, expiringWithinDays: 60, size: 1 }),
    enabled: !!storeId,
  });

  // Query low stock count for KPI telemetry
  const { data: lowStockKpiData } = useQuery({
    queryKey: ["inventory-lowstock-kpi", businessId, storeId],
    queryFn: () => inventoryApi.listInventory({ storeId, lowStockOnly: true, size: 1 }),
    enabled: !!storeId,
  });

  // Business-scoped product catalog lookup for metadata (generic name, sku, etc.)
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

  // Combine items with product metadata
  const rows: InventoryRowData[] = useMemo(() => {
    if (!inventoryPageData?.content) return [];
    return inventoryPageData.content
      .map((item) => ({
        item,
        product: productsMap.get(item.productId),
      }))
      .filter(({ item, product }) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const nameMatch = product?.name?.toLowerCase().includes(q);
        const genericMatch = product?.genericName?.toLowerCase().includes(q);
        const skuMatch = product?.sku?.toLowerCase().includes(q);
        const idMatch = item.productId.toLowerCase().includes(q);
        const rackMatch = item.locationRack?.toLowerCase().includes(q);
        return nameMatch || genericMatch || skuMatch || idMatch || rackMatch;
      });
  }, [inventoryPageData, productsMap, searchQuery]);

  const totalElements = inventoryPageData?.totalElements ?? 0;
  const totalPages = inventoryPageData?.totalPages ?? 1;

  // Selected product name for adjustment modal
  const selectedProductName = selectedItemForAdjustment
    ? productsMap.get(selectedItemForAdjustment.productId)?.name || "Product"
    : "Product";

  return (
    <div className="space-y-6">
      {/* Active Store Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
              Inventory & Batches
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

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/inventory/batches">
            <Button variant="outline" size="sm" className="text-xs">
              <Clock className="h-3.5 w-3.5 mr-1.5 text-accent" />
              Store Batches & FEFO
            </Button>
          </Link>

          <Link to="/inventory/movements">
            <Button variant="outline" size="sm" className="text-xs">
              <Boxes className="h-3.5 w-3.5 mr-1.5" />
              Stock Movements
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchInventory()}
            disabled={isFetching}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <ContextualHelpModal topic="inventory" />
        </div>
      </div>

      {/* KPI Cards (Derived from Authoritative Backend Queries) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3.5 sm:p-4 border-subtle space-y-1">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Total SKUs</span>
            <Boxes className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-primary">
            {isLoadingInventory ? <Skeleton className="h-7 w-16" /> : totalElements}
          </div>
          <p className="text-[11px] text-muted truncate">Items stocked at this branch</p>
        </Card>

        <Card className="p-3.5 sm:p-4 border-subtle space-y-1">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Low Stock SKUs</span>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-warning">
            {lowStockKpiData ? lowStockKpiData.totalElements : <Skeleton className="h-7 w-12" />}
          </div>
          <p className="text-[11px] text-muted truncate">Below reorder point</p>
        </Card>

        <Card className="p-3.5 sm:p-4 border-subtle space-y-1">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Near Expiry</span>
            <Clock className="h-4 w-4 text-danger" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-danger">
            {nearExpiryData ? nearExpiryData.totalElements : <Skeleton className="h-7 w-12" />}
          </div>
          <p className="text-[11px] text-muted truncate">Expiring within 60 days</p>
        </Card>

        <Card className="p-3.5 sm:p-4 border-subtle space-y-1">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Storage Control</span>
            <ShieldCheck className="h-4 w-4 text-success" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-success">FEFO</div>
          <p className="text-[11px] text-muted truncate">Authoritative lot ordering</p>
        </Card>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-muted rounded-lg border border-subtle self-start text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab("ALL");
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === "ALL"
                ? "bg-surface text-primary shadow-xs font-semibold"
                : "text-secondary hover:text-primary"
            }`}
          >
            All Inventory ({totalElements})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("LOW_STOCK");
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "LOW_STOCK"
                ? "bg-surface text-warning shadow-xs font-semibold"
                : "text-secondary hover:text-warning"
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            Low Stock Alerts
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          <Input
            type="search"
            placeholder="Search name, generic, SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Main Inventory Content Area */}
      {isInventoryError ? (
        <Alert variant="danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Failed to load store inventory</h4>
            <p className="text-xs mt-0.5">
              {(inventoryError as any)?.message || "An error occurred while connecting to the inventory service."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchInventory()}
              className="mt-2 text-xs"
            >
              Retry
            </Button>
          </div>
        </Alert>
      ) : isLoadingInventory ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-8 w-8" />}
          title={
            activeTab === "LOW_STOCK"
              ? "No Low Stock Items"
              : searchQuery
              ? "No Matching Inventory Items"
              : "No Inventory Recorded in This Store"
          }
          description={
            activeTab === "LOW_STOCK"
              ? "All inventory items at this store are currently above their reorder thresholds."
              : searchQuery
              ? `No inventory items matched "${searchQuery}". Try a different keyword.`
              : "Receive stock via Goods Receipts (GRN) or create a stock adjustment to initialize inventory."
          }
        />
      ) : (
        <div className="space-y-4">
          <InventoryTable
            rows={rows}
            onOpenAdjustment={(item) => setSelectedItemForAdjustment(item)}
          />

          {/* Pagination Controls */}
          {rows.length > 0 && (
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

      {/* Stock Adjustment Modal */}
      {selectedItemForAdjustment && (
        <StockAdjustmentModal
          item={selectedItemForAdjustment}
          productName={selectedProductName}
          isOpen={!!selectedItemForAdjustment}
          onClose={() => setSelectedItemForAdjustment(null)}
          onSuccess={() => refetchInventory()}
        />
      )}
    </div>
  );
};
