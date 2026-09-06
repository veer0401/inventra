import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Select,
  FormField,
  Alert,
  Badge,
} from "@inventra/ui";
import { inventoryApi } from "../../services/inventoryApi";
import { useAuthStore } from "../../stores/authStore";
import type {
  InventoryItemResponse,
  StockMovementType,
  StockAdjustmentRequest,
} from "@inventra/api-types";
import { AlertCircle, ArrowRight } from "lucide-react";

export interface StockAdjustmentModalProps {
  item: InventoryItemResponse | null;
  productName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MOVEMENT_TYPES: { value: StockMovementType; label: string; isNegative: boolean }[] = [
  { value: "ADJUSTMENT_IN", label: "Stock Adjustment (Add / In)", isNegative: false },
  { value: "ADJUSTMENT_OUT", label: "Stock Adjustment (Deduct / Out)", isNegative: true },
  { value: "DAMAGE_WRITE_OFF", label: "Damage Write-Off (Deduct)", isNegative: true },
  { value: "EXPIRY_WRITE_OFF", label: "Expiry Write-Off (Deduct)", isNegative: true },
  { value: "STOCK_AUDIT", label: "Stock Audit Discrepancy Correction", isNegative: false },
];

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  item,
  productName = "Product",
  isOpen,
  onClose,
  onSuccess,
}) => {
  const activeContext = useAuthStore((state) => state.activeContext);
  const storeId = activeContext?.storeId;
  const businessId = activeContext?.businessId;
  const queryClient = useQueryClient();

  const [movementType, setMovementType] = useState<StockMovementType>("ADJUSTMENT_IN");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [quantityInput, setQuantityInput] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch batches if product is batch tracked
  const { data: batches = [] } = useQuery({
    queryKey: ["inventory-fefo", businessId, storeId, item?.productId],
    queryFn: () => inventoryApi.listFefoBatches(item!.productId, storeId),
    enabled: isOpen && !!item && !!storeId && item.isBatchTracked,
  });

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  const parsedQty = parseFloat(quantityInput) || 0;
  const selectedMovementDef = MOVEMENT_TYPES.find((m) => m.value === movementType);
  const effectiveDelta = selectedMovementDef?.isNegative ? -Math.abs(parsedQty) : Math.abs(parsedQty);

  const currentAvailable = selectedBatch ? selectedBatch.quantity : item ? item.currentStock : 0;
  const projectedBalance = currentAvailable + effectiveDelta;

  const mutation = useMutation({
    mutationFn: async (req: StockAdjustmentRequest) => {
      return inventoryApi.adjustStock(req, storeId);
    },
    onSuccess: () => {
      // Invalidate store inventory queries
      queryClient.invalidateQueries({ queryKey: ["inventory", businessId, storeId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-batches", businessId, storeId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-fefo", businessId, storeId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements", businessId, storeId] });
      if (onSuccess) onSuccess();
      handleClose();
    },
    onError: (err: any) => {
      if (err.status === 409 || err.code === "CONCURRENT_MODIFICATION") {
        setErrorMessage(
          "This inventory record was changed by another operator. Please close this modal, refresh the record, and try again."
        );
      } else {
        setErrorMessage(err.message || "Failed to record stock adjustment. Please check input values.");
      }
    },
  });

  const handleClose = () => {
    setQuantityInput("");
    setReason("");
    setErrorMessage(null);
    setSelectedBatchId("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!item || !storeId) return;
    if (parsedQty <= 0) {
      setErrorMessage("Please enter a valid quantity greater than zero.");
      return;
    }
    if (!reason.trim()) {
      setErrorMessage("Please enter a reason or auditable note for this adjustment.");
      return;
    }
    if (item.isBatchTracked && !selectedBatchId) {
      setErrorMessage("This product is batch-tracked. Please select a specific batch to adjust.");
      return;
    }

    const payload: StockAdjustmentRequest = {
      productId: item.productId,
      movementType,
      reason: reason.trim(),
    };

    if (selectedBatch) {
      payload.batchAdjustment = {
        batchId: selectedBatch.id,
        batchNumber: selectedBatch.batchNumber,
        expiryDate: selectedBatch.expiryDate,
        manufacturingDate: selectedBatch.manufacturingDate || undefined,
        purchasePrice: selectedBatch.purchasePrice,
        mrp: selectedBatch.mrp,
        sellingPrice: selectedBatch.sellingPrice,
        quantityDelta: effectiveDelta,
      };
    } else {
      payload.quantityDelta = effectiveDelta;
    }

    mutation.mutate(payload);
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <span>Record Stock Adjustment</span>
        </DialogTitle>
        <div className="text-xs text-muted">
          Store: <span className="font-semibold text-primary">{activeContext?.storeName}</span>
        </div>
      </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMessage && (
            <Alert variant="danger" className="text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </Alert>
          )}

          {/* Product Overview Card */}
          <div className="p-3 bg-surface-muted rounded-md border border-subtle space-y-1">
            <div className="text-xs font-semibold text-primary truncate">{productName}</div>
            <div className="flex items-center justify-between text-xs text-secondary">
              <span>Overall Stock:</span>
              <span className="font-mono font-bold text-primary">
                {item.currentStock.toFixed(2)} Units
              </span>
            </div>
            {item.isBatchTracked && (
              <Badge variant="outline" className="text-[10px] font-mono mt-1">
                Batch Tracked Item
              </Badge>
            )}
          </div>

          {/* Movement Type Selector */}
          <FormField label="Movement Type" required>
            <Select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as StockMovementType)}
              className="w-full"
            >
              {MOVEMENT_TYPES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Batch Selector (if batch tracked) */}
          {item.isBatchTracked && (
            <FormField label="Target Batch" required>
              <Select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full font-mono text-xs"
              >
                <option value="">-- Select Batch (FEFO Order) --</option>
                {batches.map((b, idx) => (
                  <option key={b.id} value={b.id}>
                    {idx === 0 ? "★ [FEFO 1st] " : ""}Lot: {b.batchNumber} | Exp: {b.expiryDate} | Qty: {b.quantity}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          {/* Quantity Input */}
          <FormField label="Quantity Magnitude" required helperText="Enter absolute quantity. Direction is handled by movement type.">
            <Input
              type="number"
              step="any"
              min="0.01"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              placeholder="e.g. 5"
              required
              className="font-mono"
            />
          </FormField>

          {/* Dynamic Balance Preview */}
          <div className="p-3 bg-surface-elevated rounded-md border border-subtle flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-muted block text-[10px]">CURRENT</span>
              <span className="font-bold">{currentAvailable.toFixed(2)}</span>
            </div>
            <div className="text-accent font-bold">
              {effectiveDelta >= 0 ? `+${effectiveDelta.toFixed(2)}` : effectiveDelta.toFixed(2)}
            </div>
            <ArrowRight className="h-4 w-4 text-muted" />
            <div>
              <span className="text-muted block text-[10px]">PROJECTED</span>
              <span
                className={`font-bold ${
                  projectedBalance < 0 ? "text-danger" : "text-success font-semibold"
                }`}
              >
                {projectedBalance.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Reason code / notes */}
          <FormField label="Auditable Reason / Notes" required>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Damaged during unboxing, audit variance count"
              maxLength={255}
              required
            />
          </FormField>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={mutation.isPending}
              disabled={mutation.isPending || parsedQty <= 0 || !reason.trim()}
            >
              Confirm Adjustment
            </Button>
          </DialogFooter>
        </form>
    </Dialog>
  );
};
