import { z } from "zod";

export const stockConditionSchema = z.enum(["RESTOCKABLE", "DAMAGED", "EXPIRED", "QUARANTINE"]);

export const createSaleReturnBatchAllocationSchema = z.object({
  saleLineBatchAllocationId: z.string().uuid("Invalid allocation ID"),
  returnedBaseQuantity: z.number().positive("Returned quantity must be greater than 0"),
  stockCondition: stockConditionSchema.default("RESTOCKABLE"),
});

export const createSaleReturnLineSchema = z.object({
  saleLineId: z.string().uuid("Invalid sale line ID"),
  quantity: z.number().positive("Return quantity must be greater than 0"),
  batchAllocations: z.array(createSaleReturnBatchAllocationSchema).optional(),
});

export const createSaleRefundSchema = z.object({
  refundMethod: z.enum(["CASH", "UPI", "CARD", "CREDIT", "OTHER"]),
  amount: z.number().positive("Refund amount must be greater than 0"),
  transactionReference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const createSaleReturnSchema = z.object({
  returnDate: z.string().optional(),
  reason: z.string({ required_error: "Return reason is required" }).trim().min(2, "Return reason is required"),
  idempotencyKey: z.string().trim().max(100).optional(),
  lines: z.array(createSaleReturnLineSchema).min(1, "At least one item must be selected for return"),
  refunds: z.array(createSaleRefundSchema).min(1, "At least one refund method must be specified"),
});

export type CreateSaleReturnInput = z.infer<typeof createSaleReturnSchema>;
