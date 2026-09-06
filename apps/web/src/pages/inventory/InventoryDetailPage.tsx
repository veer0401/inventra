import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  Button,
  Badge,
  StatusBadge,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCellNumeric,
  EmptyState,
} from "@inventra/ui";
import { inventoryApi } from "../../services/inventoryApi";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";
import { StockAdjustmentModal } from "../../components/inventory/StockAdjustmentModal";
import type { BatchStatus, StockMovementType } from "@inventra/api-types";
import {
  Boxes,
  ArrowLeft,
  SlidersHorizontal,
  ExternalLink,
  MapPin,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  History,
  Store,
} from "lucide-react";

export const InventoryDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const activeContext = useAuthStore((state) => state.activeContext);
  const storeId = activeContext?.storeId;
  const businessId = activeContext?.businessId;

  const [activeTab, setActiveTab] = useState<"BATCHES" | "MOVEMENTS">("BATCHES");
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  // 1. Fetch Product Master Data from Catalog
  const { data: product, isLoading: isLoadingProduct } = useQuery({
    queryKey: ["catalog-product", businessId, productId],
    queryFn: () => catalogApi.getProduct(productId!),
    enabled: !!businessId && !!productId,
  });

  // 2. Fetch Store Inventory Item for this product
  const {
    data: inventoryPage,
    isLoading: isLoadingInventory,
    refetch: refetchInventory,
  } = useQuery({
    queryKey: ["inventory", businessId, storeId, { productId }],
    queryFn: () => inventoryApi.listInventory({ storeId, size: 50 }),
    enabled: !!storeId && !!productId,
  });

  const inventoryItem = inventoryPage?.content?.find((item) => item.productId === productId);

  // 3. Fetch FEFO-Ordered Batches (Preserving Backend FEFO Ordering)
  const {
    data: fefoBatches = [],
    isLoading: isLoadingBatches,
    refetch: refetchBatches,
  } = useQuery({
    queryKey: ["inventory-fefo", businessId, storeId, productId],
    queryFn: () => inventoryApi.listFefoBatches(productId!, storeId),
    enabled: !!storeId && !!productId,
  });

  // 4. Fetch Stock Movement Ledger for this product
  const {
    data: movementsPage,
    isLoading: isLoadingMovements,
    refetch: refetchMovements,
  } = useQuery({
    queryKey: ["inventory-movements", businessId, storeId, productId],
    queryFn: () => inventoryApi.listStockMovements({ storeId, productId, size: 20 }),
    enabled: !!storeId && !!productId && activeTab === "MOVEMENTS",
  });

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
      if (diffDays <= 60) {
        return { variant: "warning" as const, label: `Expires in ${diffDays}d`, icon: Clock };
      }
      return { variant: "success" as const, label: "Healthy", icon: CheckCircle2 };
    } catch {
      return { variant: "neutral" as const, label: "Active", icon: CheckCircle2 };
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Back to Inventory and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-subtle">
        <div className="space-y-1">
          <Link
            to="/inventory"
            className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Inventory
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
              {isLoadingProduct ? <Skeleton className="h-8 w-60" /> : product?.name || "Product Inventory"}
            </h1>
            {product?.prescriptionRequired && (
              <Badge variant="destructive" className="text-[10px] uppercase font-mono">
                Rx Required
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-secondary">
            <Store className="h-3.5 w-3.5 text-accent shrink-0" />
            <span>
              Store: <strong className="text-primary">{activeContext?.storeName}</strong>
            </span>
            {product?.genericName && (
              <>
                <span className="text-subtle">•</span>
                <span className="text-muted">{product.genericName}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {product && (
            <Link to={`/catalog/products/${product.id}`} target="_blank">
              <Button variant="outline" size="sm" className="text-xs">
                Catalog Specs
                <ExternalLink className="h-3 w-3 ml-1.5" />
              </Button>
            </Link>
          )}
          {inventoryItem && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="text-xs"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
              Adjust Stock
            </Button>
          )}
        </div>
      </div>

      {/* Product & Store Stock Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-subtle space-y-1">
          <span className="text-xs text-muted font-medium uppercase tracking-wider block">Available Stock</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-primary">
            {isLoadingInventory ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              (inventoryItem?.currentStock ?? 0).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })
            )}
          </div>
          <p className="text-[11px] text-muted font-mono">
            {inventoryItem && inventoryItem.currentStock <= inventoryItem.reorderLevel ? (
              <span className="text-warning font-semibold">Below reorder point ({inventoryItem.reorderLevel})</span>
            ) : (
              `Reorder level: ${inventoryItem?.reorderLevel ?? "N/A"}`
            )}
          </p>
        </Card>

        <Card className="p-4 border-subtle space-y-1">
          <span className="text-xs text-muted font-medium uppercase tracking-wider block">Active Batches</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-accent">
            {isLoadingBatches ? <Skeleton className="h-8 w-16" /> : fefoBatches.length}
          </div>
          <p className="text-[11px] text-muted">Authoritative FEFO order</p>
        </Card>

        <Card className="p-4 border-subtle space-y-1">
          <span className="text-xs text-muted font-medium uppercase tracking-wider block">Location Rack</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-secondary flex items-center gap-1.5 pt-1">
            <MapPin className="h-4 w-4 text-muted" />
            <span>{inventoryItem?.locationRack || "Unassigned"}</span>
          </div>
          <p className="text-[11px] text-muted">Store shelf position</p>
        </Card>

        <Card className="p-4 border-subtle space-y-1">
          <span className="text-xs text-muted font-medium uppercase tracking-wider block">Batch Tracking</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-primary pt-1">
            {inventoryItem?.isBatchTracked ? "LOT Tracked" : "Simple"}
          </div>
          <p className="text-[11px] text-muted">FEFO & Expiry enforcement</p>
        </Card>
      </div>

      {/* Tabs: FEFO Batches vs Historical Stock Movements */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-subtle pb-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("BATCHES")}
            className={`px-3 py-2 font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "BATCHES"
                ? "bg-primary text-primary-fg font-semibold shadow-xs"
                : "text-secondary hover:text-primary hover:bg-surface-muted"
            }`}
          >
            <Boxes className="h-3.5 w-3.5" />
            FEFO Batches ({fefoBatches.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("MOVEMENTS")}
            className={`px-3 py-2 font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "MOVEMENTS"
                ? "bg-primary text-primary-fg font-semibold shadow-xs"
                : "text-secondary hover:text-primary hover:bg-surface-muted"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Stock Movements
          </button>
        </div>

        {/* Tab 1: FEFO Batches */}
        {activeTab === "BATCHES" && (
          <div>
            {isLoadingBatches ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : fefoBatches.length === 0 ? (
              <EmptyState
                icon={<Boxes className="h-8 w-8" />}
                title="No Batches On Record"
                description="There are currently no active or recorded inventory lots for this item at this store."
              />
            ) : (
              <div className="overflow-x-auto border border-subtle rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">FEFO</TableHead>
                      <TableHead>Batch Lot</TableHead>
                      <TableHead>Mfg Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Expiry Status</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Purchase Price</TableHead>
                      <TableHead className="text-right">MRP</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fefoBatches.map((batch, index) => {
                      const urgency = getBatchUrgency(batch.expiryDate, batch.status);
                      const isNextFefo = index === 0 && batch.status === "ACTIVE" && batch.quantity > 0;

                      return (
                        <TableRow
                          key={batch.id}
                          className={`hover:bg-surface-muted/50 transition-colors ${
                            isNextFefo ? "bg-accent-subtle/30" : ""
                          }`}
                        >
                          <TableCell className="text-center font-mono text-xs font-bold text-accent">
                            {index === 0 ? "★ 1st" : `#${index + 1}`}
                          </TableCell>

                          <TableCell className="font-mono text-xs font-semibold text-primary">
                            <div className="flex items-center gap-1.5">
                              <span>{batch.batchNumber}</span>
                              {isNextFefo && (
                                <Badge variant="accent" className="text-[9px] font-mono px-1 py-0.2">
                                  Dispense 1st
                                </Badge>
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
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Stock Movements History */}
        {activeTab === "MOVEMENTS" && (
          <div>
            {isLoadingMovements ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !movementsPage?.content || movementsPage.content.length === 0 ? (
              <EmptyState
                icon={<History className="h-8 w-8" />}
                title="No Stock Movements Recorded"
                description="No historical adjustments, receipts, or sales have been logged for this item yet."
              />
            ) : (
              <div className="overflow-x-auto border border-subtle rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Occurred At</TableHead>
                      <TableHead>Movement Type</TableHead>
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

                        <TableCellNumeric
                          className={`font-mono text-xs font-bold ${
                            m.quantityDelta > 0 ? "text-success" : "text-danger"
                          }`}
                        >
                          {m.quantityDelta > 0 ? `+${m.quantityDelta.toFixed(2)}` : m.quantityDelta.toFixed(2)}
                        </TableCellNumeric>

                        <TableCellNumeric className="font-mono text-xs text-primary font-semibold">
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
            )}
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {inventoryItem && (
        <StockAdjustmentModal
          item={inventoryItem}
          productName={product?.name || "Product"}
          isOpen={isAdjustmentModalOpen}
          onClose={() => setIsAdjustmentModalOpen(false)}
          onSuccess={() => {
            refetchInventory();
            refetchBatches();
            refetchMovements();
          }}
        />
      )}
    </div>
  );
};
