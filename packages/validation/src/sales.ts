import { z } from "zod";
import { uuidSchema, phoneSchema, positiveMoneySchema, positiveQuantitySchema } from "./common";

export const paymentMethodSchema = z.enum(["CASH", "UPI", "CARD", "CREDIT", "OTHER"]);
export const saleStatusSchema = z.enum(["COMPLETED", "VOIDED", "PARTIALLY_RETURNED", "FULLY_RETURNED"]);

export const createSaleLineSchema = z.object({
  productId: uuidSchema,
  batchId: uuidSchema.optional(),
  sellingUnit: z.string().trim().min(1, "Selling unit is required").max(50).optional(),
  quantity: positiveQuantitySchema,
  discountPercentage: z.number().min(0, "Discount cannot be negative").max(100, "Discount cannot exceed 100%").optional(),
});

export const createSalePaymentSchema = z.object({
  paymentMethod: paymentMethodSchema,
  amount: positiveQuantitySchema, // positive number
  tenderedAmount: positiveMoneySchema.optional(),
  transactionReference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(255).optional(),
});

export const createSaleSchema = z.object({
  storeId: uuidSchema,
  saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid sale date format (YYYY-MM-DD)").optional(),
  customerName: z.string().trim().max(150).optional(),
  customerPhone: phoneSchema,
  discountAmount: positiveMoneySchema.optional(),
  roundOffAmount: z.number().optional(),
  idempotencyKey: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
  lines: z.array(createSaleLineSchema).min(1, "Sale must contain at least one line item"),
  payments: z.array(createSalePaymentSchema).min(1, "Sale must contain at least one payment"),
});

export const posSearchQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query is required").max(100),
  storeId: uuidSchema.optional(),
  page: z.number().int().min(0).default(0).optional(),
  size: z.number().int().min(1).max(100).default(20).optional(),
});

export const salesFilterSchema = z.object({
  storeId: uuidSchema.optional(),
  status: saleStatusSchema.optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format (YYYY-MM-DD)").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date format (YYYY-MM-DD)").optional(),
  page: z.number().int().min(0).default(0).optional(),
  size: z.number().int().min(1).max(100).default(20).optional(),
});

export const voidSaleSchema = z.object({
  reason: z.string().trim().min(3, "Void reason must be at least 3 characters").max(500, "Reason is too long"),
});

export type CreateSaleLineInput = z.infer<typeof createSaleLineSchema>;
export type CreateSalePaymentInput = z.infer<typeof createSalePaymentSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type PosSearchQueryInput = z.infer<typeof posSearchQuerySchema>;
export type SalesFilterInput = z.infer<typeof salesFilterSchema>;
export type VoidSaleInput = z.infer<typeof voidSaleSchema>;
