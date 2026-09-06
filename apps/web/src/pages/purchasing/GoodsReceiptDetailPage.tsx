import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
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
  Alert,
  Skeleton,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@inventra/ui";
import { purchasingApi } from "../../services/purchasingApi";
import { useAuthStore } from "../../stores/authStore";
import type { GoodsReceiptStatus } from "@inventra/api-types";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Store,
  Layers,
  FileCheck,
} from "lucide-react";

export const GoodsReceiptDetailPage: React.FC = () => {
  const { receiptId } = useParams<{ receiptId: string }>();
  const queryClient = useQueryClient();
  const activeContext = useAuthStore((state) => state.activeContext);
  const storeId = activeContext?.storeId;
  const businessId = activeContext?.businessId;
  const userRole = activeContext?.role || "STAFF";
  const canManage = ["OWNER", "ADMIN", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"].includes(userRole);

  const [isPostConfirmOpen, setIsPostConfirmOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Goods Receipt Record
  const {
    data: receipt,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["goods-receipt", businessId, receiptId],
    queryFn: () => purchasingApi.getGoodsReceipt(receiptId!),
    enabled: !!businessId && !!receiptId,
  });

  // Post Mutation
  const postMutation = useMutation({
    mutationFn: async () => {
      return purchasingApi.postGoodsReceipt(receiptId!);
    },
    onSuccess: () => {
      // Invalidate store inventory and receipt caches
      queryClient.invalidateQueries({ queryKey: ["inventory", businessId, storeId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-batches", businessId, storeId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-fefo", businessId, storeId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements", businessId, storeId] });
      queryClient.invalidateQueries({ queryKey: ["goods-receipts", businessId, storeId] });
      queryClient.invalidateQueries({ queryKey: ["goods-receipt", businessId, receiptId] });
      setIsPostConfirmOpen(false);
      refetch();
    },
    onError: (err: any) => {
      if (err.status === 409 || err.code === "CONCURRENT_MODIFICATION") {
        setActionError("This receipt was modified by another operator. Please refresh before retrying.");
      } else {
        setActionError(err.message || "Failed to post goods receipt.");
      }
    },
  });

  // Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      return purchasingApi.cancelGoodsReceipt(receiptId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goods-receipts", businessId, storeId] });
      queryClient.invalidateQueries({ queryKey: ["goods-receipt", businessId, receiptId] });
      setIsCancelConfirmOpen(false);
      refetch();
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to cancel goods receipt.");
    },
  });

  const getStatusBadge = (status?: GoodsReceiptStatus) => {
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

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (isError || !receipt) {
    return (
      <Alert variant="danger">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <div>
          <h4 className="font-semibold text-sm">Failed to load Goods Receipt</h4>
          <p className="text-xs mt-0.5">
            {(error as any)?.message || "The requested goods receipt could not be found."}
          </p>
          <Link to="/goods-receipts" className="inline-block mt-2">
            <Button variant="outline" size="sm" className="text-xs">
              Back to Goods Receipts
            </Button>
          </Link>
        </div>
      </Alert>
    );
  }

  const isDraft = receipt.status === "DRAFT";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-subtle">
        <div className="space-y-1">
          <Link
            to="/goods-receipts"
            className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Goods Receipts
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary font-mono">
              {receipt.receiptNumber}
            </h1>
            {getStatusBadge(receipt.status)}
          </div>
          <div className="flex items-center gap-2 text-xs text-secondary">
            <Store className="h-3.5 w-3.5 text-accent shrink-0" />
            <span>Store: <strong className="text-primary">{activeContext?.storeName}</strong></span>
            <span className="text-subtle">•</span>
            <span>Received: <strong className="font-mono text-primary">{receipt.receivedDate}</strong></span>
          </div>
        </div>

        {/* Action Controls for Draft Receipts */}
        {canManage && isDraft && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActionError(null);
                setIsCancelConfirmOpen(true);
              }}
              className="text-xs text-danger hover:bg-danger-subtle"
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Cancel Receipt
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setActionError(null);
                setIsPostConfirmOpen(true);
              }}
              className="text-xs"
            >
              <FileCheck className="h-3.5 w-3.5 mr-1.5" />
              Post Goods Receipt
            </Button>
          </div>
        )}
      </div>

      {actionError && (
        <Alert variant="danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </Alert>
      )}

      {/* Posted Success Banner */}
      {receipt.status === "POSTED" && (
        <Alert variant="success" className="text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            This Goods Receipt was posted on {new Date(receipt.postedAt || receipt.updatedAt).toLocaleString()}.
            Physical stock and batch records have been committed to this store.
          </span>
        </Alert>
      )}

      {/* GRN Summary Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-subtle space-y-1">
          <span className="text-xs text-muted font-medium uppercase tracking-wider block">Vendor Reference</span>
          <div className="text-base font-mono font-bold text-primary truncate">
            {receipt.vendorDeliveryNote || "—"}
          </div>
          <p className="text-[11px] text-muted">Delivery Note / Invoice</p>
        </Card>

        <Card className="p-4 border-subtle space-y-1">
          <span className="text-xs text-muted font-medium uppercase tracking-wider block">Line Items</span>
          <div className="text-xl sm:text-2xl font-mono font-bold text-primary">
            {receipt.totalItems}
          </div>
          <p className="text-[11px] text-muted">Total distinct products</p>
        </Card>

        <Card className="p-4 border-subtle space-y-1">
          <span className="text-xs text-muted font-medium uppercase tracking-wider block">Received Quantity</span>
          <div className="text-xl sm:text-2xl font-mono font-bold text-secondary">
            {receipt.totalReceivedQuantity}
          </div>
          <p className="text-[11px] text-muted">Total pack units</p>
        </Card>

        <Card className="p-4 border-subtle space-y-1">
          <span className="text-xs text-muted font-medium uppercase tracking-wider block">Total Amount</span>
          <div className="text-xl sm:text-2xl font-mono font-bold text-primary">
            ₹{receipt.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted">Inclusive of taxes</p>
        </Card>
      </div>

      {/* Line Items Table */}
      <Card className="p-4 sm:p-6 border-subtle space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          Received Line Items & Batches ({receipt.lines.length})
        </h2>

        <div className="overflow-x-auto border border-subtle rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 text-center">#</TableHead>
                <TableHead>Product ID</TableHead>
                <TableHead>Batch Lot</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead className="text-right">Received Qty</TableHead>
                <TableHead className="text-right">Base Units</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">MRP</TableHead>
                <TableHead className="text-right">Tax (%)</TableHead>
                <TableHead className="text-right">Line Total (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipt.lines.map((line) => (
                <TableRow key={line.id} className="hover:bg-surface-muted/50 transition-colors">
                  <TableCell className="text-center font-mono text-xs text-muted">
                    {line.lineNumber}
                  </TableCell>

                  <TableCell className="font-mono text-xs text-primary font-semibold">
                    <Link to={`/inventory/${line.productId}`} className="hover:underline text-accent">
                      {line.productId.slice(0, 8)}...
                    </Link>
                  </TableCell>

                  <TableCell className="font-mono text-xs font-semibold text-secondary">
                    {line.batchNumber || "—"}
                  </TableCell>

                  <TableCell className="font-mono text-xs text-primary">
                    {line.expiryDate || "—"}
                  </TableCell>

                  <TableCellNumeric className="font-mono text-xs font-bold text-primary">
                    {line.receivedQuantity} {line.purchaseUnit}
                  </TableCellNumeric>

                  <TableCellNumeric className="font-mono text-xs text-secondary">
                    {line.receivedBaseQuantity}
                  </TableCellNumeric>

                  <TableCellNumeric className="font-mono text-xs text-secondary">
                    ₹{line.unitCost.toFixed(2)}
                  </TableCellNumeric>

                  <TableCellNumeric className="font-mono text-xs text-muted">
                    {line.mrp ? `₹${line.mrp.toFixed(2)}` : "—"}
                  </TableCellNumeric>

                  <TableCellNumeric className="font-mono text-xs text-muted">
                    {line.taxRate ? `${line.taxRate}%` : "0%"}
                  </TableCellNumeric>

                  <TableCellNumeric className="font-mono text-xs font-bold text-primary">
                    ₹{line.lineTotal.toFixed(2)}
                  </TableCellNumeric>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {receipt.notes && (
          <div className="p-3 bg-surface-muted rounded-md border border-subtle text-xs text-secondary">
            <strong className="text-primary block text-[10px] uppercase">Notes:</strong>
            {receipt.notes}
          </div>
        )}
      </Card>

      {/* Post Confirmation Dialog */}
      <Dialog open={isPostConfirmOpen} onOpenChange={setIsPostConfirmOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <FileCheck className="h-5 w-5 text-accent" />
            Post Goods Receipt & Commit Stock
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2 text-xs text-secondary">
          <p>
            Are you sure you want to post Goods Receipt{" "}
            <strong className="font-mono text-primary">{receipt.receiptNumber}</strong>?
          </p>
          <div className="p-3 bg-accent-subtle/40 rounded-md border border-accent/20 text-accent font-medium">
            Posting this Goods Receipt will commit the received quantities and associated batch lots
            directly into active inventory for <strong>{activeContext?.storeName}</strong>.
          </div>
        </div>
        <DialogFooter className="pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPostConfirmOpen(false)}
            disabled={postMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            onClick={() => postMutation.mutate()}
            isLoading={postMutation.isPending}
          >
            Confirm & Post Receipt
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-danger">
            <XCircle className="h-5 w-5 text-danger" />
            Cancel Draft Goods Receipt
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2 text-xs text-secondary">
          <p>
            Are you sure you want to cancel Goods Receipt{" "}
            <strong className="font-mono text-primary">{receipt.receiptNumber}</strong>?
          </p>
          <p className="text-muted">
            This action cannot be undone. Draft quantities will not be added to inventory.
          </p>
        </div>
        <DialogFooter className="pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCancelConfirmOpen(false)}
            disabled={cancelMutation.isPending}
          >
            Back
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => cancelMutation.mutate()}
            isLoading={cancelMutation.isPending}
          >
            Yes, Cancel Receipt
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
};
