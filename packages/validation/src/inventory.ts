import { z } from "zod";

export const stockMovementTypeSchema = z.enum([
  "INITIAL_STOCK",
  "PURCHASE_RECEIPT",
  "PURCHASE_RETURN",
  "SALE",
  "SALE_RETURN",
  "SALE_VOID",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "DAMAGE_WRITE_OFF",
  "EXPIRY_WRITE_OFF",
  "STOCK_AUDIT",
]);

export const batchStatusSchema = z.enum([
  "ACTIVE",
  "EXPIRED",
  "DEPLETED",
  "QUARANTINED",
  "RECALLED",
]);

export const batchAdjustmentSchema = z.object({
  batchId: z.string().uuid("Invalid Batch ID format").optional(),
  batchNumber: z.string().max(100, "Batch number cannot exceed 100 characters").optional(),
  manufacturingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Manufacturing date must be in YYYY-MM-DD format")
    .optional(),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expiry date must be in YYYY-MM-DD format")
    .optional(),
  purchasePrice: z.number().min(0, "Purchase price cannot be negative").optional(),
  mrp: z.number().min(0, "MRP cannot be negative").optional(),
  sellingPrice: z.number().min(0, "Selling price cannot be negative").optional(),
  quantityDelta: z.number().refine((val) => val !== 0, "Quantity delta cannot be zero"),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().uuid("Product ID is required and must be a valid UUID"),
  movementType: stockMovementTypeSchema,
  quantityDelta: z.number().optional(),
  batchAdjustment: batchAdjustmentSchema.optional(),
  reason: z.string().max(255, "Reason must not exceed 255 characters").optional(),
  referenceId: z.string().uuid("Invalid reference ID").optional(),
  referenceType: z.string().max(50, "Reference type must not exceed 50 characters").optional(),
}).refine(
  (data) => {
    // Either overall quantityDelta or batchAdjustment.quantityDelta must be provided
    return (
      (data.quantityDelta !== undefined && data.quantityDelta !== 0) ||
      (data.batchAdjustment !== undefined && data.batchAdjustment.quantityDelta !== 0)
    );
  },
  {
    message: "Adjustment quantity delta must be specified either at item or batch level",
    path: ["quantityDelta"],
  }
);

export type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>;
export type BatchAdjustmentFormValues = z.infer<typeof batchAdjustmentSchema>;
