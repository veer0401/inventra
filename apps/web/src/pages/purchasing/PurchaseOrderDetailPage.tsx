import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Button,
  Badge,
  Alert,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCellNumeric,
  useToast,
} from "@inventra/ui";
import { purchasingApi } from "../../services/purchasingApi";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";
import type { PurchaseOrderStatus } from "@inventra/api-types";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Truck,
  CheckCircle,
  XCircle,
  Lock,
  Store,
  Boxes,
  AlertTriangle,
} from "lucide-react";

export const PurchaseOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();

  const activeContext = useAuthStore((state) => state.activeContext);
  const businessId = activeContext?.businessId;
  const userRole = activeContext?.role || "STAFF";
  const canManage = ["OWNER", "MANAGER"].includes(userRole);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Purchase Order Detail
  const {
    data: po,
    isLoading: isLoadingPO,
    isError: isPOError,
    error: poError,
  } = useQuery({
    queryKey: ["purchase-order", businessId, id],
    queryFn: () => purchasingApi.getPurchaseOrder(id!),
    enabled: !!businessId && !!id,
  });

  // 2. Fetch Supplier Details
  const { data: supplier } = useQuery({
    queryKey: ["supplier", businessId, po?.supplierId],
    queryFn: () => purchasingApi.getSupplier(po!.supplierId),
    enabled: !!businessId && !!po?.supplierId,
  });

  // 3. Fetch Catalog Products Map
  const { data: catalogData } = useQuery({
    queryKey: ["catalog-products", businessId, 0, 100],
    queryFn: () => catalogApi.listProducts(0, 100),
    enabled: !!businessId,
  });

  const productsMap = React.useMemo(() => {
    const map = new Map<string, any>();
    if (catalogData?.content) {
      for (const p of catalogData.content) {
        map.set(p.id, p);
      }
    }
    return map;
  }, [catalogData]);

  // Mutations
  const confirmMutation = useMutation({
    mutationFn: () => purchasingApi.confirmPurchaseOrder(id!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", businessId] });
      queryClient.invalidateQueries({ queryKey: ["purchase-order", businessId, id] });
      toast.success(`Order ${data.orderNumber} is now confirmed and ready for goods receiving.`, "Order Confirmed");
    },
    onError: (err: any) => setActionError(err.message || "Failed to confirm purchase order."),
  });

  const cancelMutation = useMutation({
    mutationFn: () => purchasingApi.cancelPurchaseOrder(id!, { reason: cancelReason }),
    onSuccess: (data) => {
      setIsCancelModalOpen(false);
      setCancelReason("");
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", businessId] });
      queryClient.invalidateQueries({ queryKey: ["purchase-order", businessId, id] });
      toast.info(`Order ${data.orderNumber} has been cancelled.`, "Order Cancelled");
    },
    onError: (err: any) => setActionError(err.message || "Failed to cancel purchase order."),
  });

  const closeMutation = useMutation({
    mutationFn: () => purchasingApi.closePurchaseOrder(id!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", businessId] });
      queryClient.invalidateQueries({ queryKey: ["purchase-order", businessId, id] });
      toast.success(`Order ${data.orderNumber} has been closed.`, "Order Closed");
    },
    onError: (err: any) => setActionError(err.message || "Failed to close purchase order."),
  });

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary" className="font-mono text-xs">DRAFT</Badge>;
      case "CONFIRMED":
        return <Badge variant="accent" className="font-mono text-xs">CONFIRMED</Badge>;
      case "PARTIALLY_RECEIVED":
        return <Badge variant="warning" className="font-mono text-xs">PARTIALLY RECEIVED</Badge>;
      case "FULLY_RECEIVED":
        return <Badge variant="success" className="font-mono text-xs">FULLY RECEIVED</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive" className="font-mono text-xs">CANCELLED</Badge>;
      case "CLOSED":
        return <Badge variant="outline" className="font-mono text-xs">CLOSED</Badge>;
      default:
        return <Badge variant="outline" className="font-mono text-xs">{status}</Badge>;
    }
  };

  if (isPOError) {
    return (
      <div className="space-y-4">
        <Link
          to="/purchasing/orders"
          className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Purchase Orders
        </Link>
        <Alert variant="danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Error Loading Purchase Order</h4>
            <p className="text-xs">{(poError as any)?.message || "Record not found or network failure."}</p>
          </div>
        </Alert>
      </div>
    );
  }

  if (isLoadingPO || !po) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-subtle">
        <div className="space-y-1">
          <Link
            to="/purchasing/orders"
            className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Purchase Orders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary font-mono">
              {po.orderNumber}
            </h1>
            {getStatusBadge(po.status)}
          </div>
          <div className="flex items-center gap-2 text-xs text-secondary">
            <Store className="h-3.5 w-3.5 text-accent shrink-0" />
            <span>Store Branch: <strong className="text-primary">{activeContext?.storeName}</strong></span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Receive into Goods Receipt (GRN) */}
          {(po.status === "CONFIRMED" || po.status === "PARTIALLY_RECEIVED") && (
            <Link to={`/goods-receipts/new?purchaseOrderId=${po.id}&supplierId=${po.supplierId}`}>
              <Button variant="primary" size="sm" className="text-xs">
                <Truck className="h-3.5 w-3.5 mr-1.5" />
                Receive Goods (Create GRN)
              </Button>
            </Link>
          )}

          {/* Confirm Draft */}
          {po.status === "DRAFT" && canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="text-xs"
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              {confirmMutation.isPending ? "Confirming..." : "Confirm Order"}
            </Button>
          )}

          {/* Cancel Order */}
          {(po.status === "DRAFT" || po.status === "CONFIRMED") && canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelModalOpen(true)}
              className="text-xs text-danger hover:text-danger hover:bg-danger-subtle/20"
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Cancel Order
            </Button>
          )}

          {/* Close Order */}
          {(po.status === "PARTIALLY_RECEIVED" || po.status === "FULLY_RECEIVED") && canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => closeMutation.mutate()}
              disabled={closeMutation.isPending}
              className="text-xs"
            >
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              {closeMutation.isPending ? "Closing..." : "Close PO"}
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <Alert variant="danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-xs">{actionError}</p>
        </Alert>
      )}

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Supplier Info */}
        <Card className="p-4 border-subtle space-y-2">
          <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">
            Supplier / Vendor
          </span>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-accent shrink-0" />
            <span className="font-semibold text-sm text-primary">
              {supplier?.legalName || "Loading supplier..."}
            </span>
          </div>
          <div className="text-xs text-muted space-y-0.5 pt-1 border-t border-subtle">
            <p>Code: <span className="font-mono text-secondary">{supplier?.supplierCode}</span></p>
            {supplier?.email && <p>Email: <span className="text-secondary">{supplier.email}</span></p>}
            {supplier?.phoneNumber && <p>Phone: <span className="text-secondary">{supplier.phoneNumber}</span></p>}
          </div>
        </Card>

        {/* Timing Details */}
        <Card className="p-4 border-subtle space-y-2">
          <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">
            Order Schedule
          </span>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted shrink-0" />
            <span className="text-xs text-secondary">
              Ordered On: <strong className="text-primary font-mono">{po.orderDate}</strong>
            </span>
          </div>
          <div className="text-xs text-muted space-y-0.5 pt-1 border-t border-subtle">
            <p>Expected: <span className="font-mono text-secondary">{po.expectedDeliveryDate || "Not Specified"}</span></p>
            <p>Created: <span className="font-mono text-secondary">{new Date(po.createdAt).toLocaleDateString()}</span></p>
          </div>
        </Card>

        {/* Financial Summary */}
        <Card className="p-4 border-subtle space-y-1.5 font-mono text-xs">
          <span className="text-[10px] uppercase font-bold text-muted tracking-wider block font-sans">
            Financial Total
          </span>
          <div className="flex justify-between text-muted pt-1">
            <span>Subtotal:</span>
            <span>₹{(po.subtotal ?? 0).toFixed(2)}</span>
          </div>
          {(po.discountAmount ?? 0) > 0 && (
            <div className="flex justify-between text-success">
              <span>Discount:</span>
              <span>-₹{(po.discountAmount ?? 0).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted">
            <span>Tax:</span>
            <span>+₹{(po.taxAmount ?? 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-primary pt-1.5 border-t border-subtle font-sans">
            <span>Total:</span>
            <span className="font-mono text-accent">₹{(po.totalAmount ?? 0).toFixed(2)}</span>
          </div>
        </Card>
      </div>

      {/* Line Items Table */}
      <Card className="p-4 sm:p-5 border-subtle space-y-4">
        <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
          <Boxes className="h-4 w-4 text-accent" />
          Ordered Products ({po.lines?.length || 0})
        </h2>

        <div className="overflow-x-auto border border-subtle rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Unit / Conv.</TableHead>
                <TableHead className="text-right">Ordered Qty</TableHead>
                <TableHead className="text-right">Received Qty</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.lines?.map((line, index) => {
                const product = productsMap.get(line.productId);
                const isComplete = (line.receivedQuantity ?? 0) >= (line.orderedQuantity ?? 0);
                const lineCost = line.unitCost ?? (line as any).unitPrice ?? 0;

                return (
                  <TableRow key={line.id} className="hover:bg-surface-muted/50 transition-colors">
                    <TableCell className="font-mono text-xs text-muted">{index + 1}</TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <Link
                          to={`/catalog/products/${line.productId}`}
                          className="font-medium text-xs text-primary hover:text-accent hover:underline"
                        >
                          {product?.name || `Product (${line.productId.slice(0, 8)}...)`}
                        </Link>
                        {product?.genericName && (
                          <span className="text-[11px] text-muted">{product.genericName}</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-muted">
                      {line.purchaseUnit} (x{line.conversionFactor})
                    </TableCell>

                    <TableCellNumeric className="font-mono text-xs font-bold text-primary">
                      {line.orderedQuantity}
                    </TableCellNumeric>

                    <TableCellNumeric className="font-mono text-xs">
                      <span className={isComplete ? "text-success font-bold" : "text-secondary"}>
                        {line.receivedQuantity}
                      </span>
                      {(line.receivedQuantity ?? 0) > 0 && (
                        <span className="text-[10px] text-muted ml-1">
                          ({Math.round(((line.receivedQuantity ?? 0) / (line.orderedQuantity || 1)) * 100)}%)
                        </span>
                      )}
                    </TableCellNumeric>

                    <TableCellNumeric className="font-mono text-xs text-muted">
                      ₹{lineCost.toFixed(2)}
                    </TableCellNumeric>

                    <TableCellNumeric className="font-mono text-xs text-muted">
                      {line.taxRate ?? 0}% (₹{(line.taxAmount ?? 0).toFixed(2)})
                    </TableCellNumeric>

                    <TableCellNumeric className="font-mono text-xs font-bold text-primary">
                      ₹{(line.lineTotal ?? 0).toFixed(2)}
                    </TableCellNumeric>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Notes */}
      {po.notes && (
        <Card className="p-4 border-subtle space-y-1">
          <span className="text-xs font-medium text-muted uppercase">Notes / Instructions</span>
          <p className="text-xs text-secondary whitespace-pre-wrap">{po.notes}</p>
        </Card>
      )}

      {/* Cancel Order Dialog */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-5 border-subtle bg-surface space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-primary flex items-center gap-2">
              <XCircle className="h-5 w-5 text-danger" />
              Cancel Purchase Order
            </h3>
            <p className="text-xs text-secondary">
              Are you sure you want to cancel order <strong className="font-mono text-primary">{po.orderNumber}</strong>?
              This action cannot be undone.
            </p>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Reason for cancellation</label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Duplicate order, supplier price changed..."
                className="w-full p-2 rounded-md border border-subtle bg-surface text-xs text-primary focus:outline-none focus:ring-2 focus:ring-focus resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-subtle">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelModalOpen(false)}
                className="text-xs"
              >
                Go Back
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="text-xs"
              >
                {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
