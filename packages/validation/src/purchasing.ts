import { z } from "zod";

export const supplierTypeSchema = z.enum([
  "MANUFACTURER",
  "DISTRIBUTOR",
  "WHOLESALER",
  "IMPORTER",
  "OTHER",
]);

export const supplierStatusSchema = z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]);
export const supplierProductStatusSchema = z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"]);
export const goodsReceiptStatusSchema = z.enum(["DRAFT", "POSTED", "CANCELLED"]);

export const createSupplierSchema = z.object({
  supplierCode: z
    .string()
    .trim()
    .min(1, "Supplier code is required")
    .max(50, "Supplier code cannot exceed 50 characters"),
  legalName: z
    .string()
    .trim()
    .min(1, "Legal name is required")
    .max(200, "Legal name cannot exceed 200 characters"),
  tradeName: z
    .string()
    .trim()
    .max(200, "Trade name cannot exceed 200 characters")
    .optional()
    .or(z.literal("")),
  supplierType: supplierTypeSchema,
  gstin: z
    .string()
    .trim()
    .max(20, "GSTIN cannot exceed 20 characters")
    .optional()
    .or(z.literal("")),
  drugLicenseNumber: z
    .string()
    .trim()
    .max(100, "Drug license number cannot exceed 100 characters")
    .optional()
    .or(z.literal("")),
  pan: z
    .string()
    .trim()
    .max(20, "PAN cannot exceed 20 characters")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(150, "Email cannot exceed 150 characters")
    .optional()
    .or(z.literal("")),
  phoneNumber: z
    .string()
    .trim()
    .max(30, "Phone number cannot exceed 30 characters")
    .optional()
    .or(z.literal("")),
  contactPersonName: z
    .string()
    .trim()
    .max(150, "Contact person name cannot exceed 150 characters")
    .optional()
    .or(z.literal("")),
  addressLine1: z
    .string()
    .trim()
    .max(255, "Address line 1 cannot exceed 255 characters")
    .optional()
    .or(z.literal("")),
  addressLine2: z
    .string()
    .trim()
    .max(255, "Address line 2 cannot exceed 255 characters")
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .trim()
    .max(100, "City cannot exceed 100 characters")
    .optional()
    .or(z.literal("")),
  state: z
    .string()
    .trim()
    .max(100, "State cannot exceed 100 characters")
    .optional()
    .or(z.literal("")),
  postalCode: z
    .string()
    .trim()
    .max(20, "Postal code cannot exceed 20 characters")
    .optional()
    .or(z.literal("")),
  paymentTermsDays: z
    .number({ invalid_type_error: "Payment terms days must be a number" })
    .int("Must be whole number")
    .min(0, "Payment terms cannot be negative")
    .optional(),
  creditLimit: z
    .number({ invalid_type_error: "Credit limit must be a number" })
    .min(0, "Credit limit cannot be negative")
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional()
    .or(z.literal("")),
});

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  status: supplierStatusSchema.optional(),
});

export const createSupplierProductSchema = z.object({
  productId: z.string().uuid("Product ID is required and must be a valid UUID"),
  supplierProductCode: z
    .string()
    .trim()
    .max(100, "Supplier product code cannot exceed 100 characters")
    .optional()
    .or(z.literal("")),
  supplierProductName: z
    .string()
    .trim()
    .max(255, "Supplier product name cannot exceed 255 characters")
    .optional()
    .or(z.literal("")),
  purchaseUnit: z
    .string()
    .trim()
    .min(1, "Purchase unit is required")
    .max(50, "Purchase unit cannot exceed 50 characters"),
  conversionFactor: z
    .number({ invalid_type_error: "Conversion factor must be a number" })
    .int("Conversion factor must be an integer")
    .min(1, "Conversion factor must be at least 1"),
  lastPurchasePrice: z
    .number({ invalid_type_error: "Price must be a number" })
    .min(0, "Price cannot be negative")
    .optional(),
  isPreferred: z.boolean().optional().default(false),
  minOrderQuantity: z
    .number({ invalid_type_error: "MOQ must be a number" })
    .min(0, "MOQ cannot be negative")
    .optional(),
  leadTimeDays: z
    .number({ invalid_type_error: "Lead time must be a number" })
    .int("Lead time must be an integer")
    .min(0, "Lead time cannot be negative")
    .optional(),
});

export const createGoodsReceiptLineSchema = z.object({
  purchaseOrderLineId: z.string().uuid().optional(),
  productId: z.string().uuid("Product is required"),
  receivedQuantity: z
    .number({ invalid_type_error: "Received quantity is required" })
    .min(0.001, "Received quantity must be greater than 0"),
  purchaseUnit: z
    .string()
    .trim()
    .min(1, "Purchase unit is required")
    .max(50, "Purchase unit cannot exceed 50 characters"),
  conversionFactor: z
    .number({ invalid_type_error: "Conversion factor is required" })
    .int("Conversion factor must be an integer")
    .min(1, "Conversion factor must be at least 1"),
  rejectedQuantity: z
    .number({ invalid_type_error: "Rejected quantity must be a number" })
    .min(0, "Rejected quantity cannot be negative")
    .optional()
    .default(0),
  batchNumber: z
    .string()
    .trim()
    .max(100, "Batch number cannot exceed 100 characters")
    .optional()
    .or(z.literal("")),
  manufacturingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Manufacturing date must be YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expiry date must be YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
  unitCost: z
    .number({ invalid_type_error: "Unit cost is required" })
    .min(0, "Unit cost cannot be negative"),
  mrp: z
    .number({ invalid_type_error: "MRP must be a number" })
    .min(0, "MRP cannot be negative")
    .optional(),
  sellingPrice: z
    .number({ invalid_type_error: "Selling price must be a number" })
    .min(0, "Selling price cannot be negative")
    .optional(),
  taxRate: z
    .number({ invalid_type_error: "Tax rate must be a number" })
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot exceed 100%")
    .optional()
    .default(0),
});

export const createGoodsReceiptSchema = z.object({
  storeId: z.string().uuid("Store is required"),
  supplierId: z.string().uuid("Supplier is required"),
  purchaseOrderId: z.string().uuid().optional(),
  vendorDeliveryNote: z
    .string()
    .trim()
    .max(100, "Vendor delivery note cannot exceed 100 characters")
    .optional()
    .or(z.literal("")),
  receivedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Received date must be YYYY-MM-DD")
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional()
    .or(z.literal("")),
  idempotencyKey: z
    .string()
    .trim()
    .max(100, "Idempotency key cannot exceed 100 characters")
    .optional()
    .or(z.literal("")),
  lines: z
    .array(createGoodsReceiptLineSchema)
    .min(1, "At least one goods receipt line item is required"),
});

export const updateGoodsReceiptSchema = z.object({
  vendorDeliveryNote: z
    .string()
    .trim()
    .max(100, "Vendor delivery note cannot exceed 100 characters")
    .optional()
    .or(z.literal("")),
  receivedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Received date must be YYYY-MM-DD")
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional()
    .or(z.literal("")),
  lines: z.array(createGoodsReceiptLineSchema).optional(),
});

export const purchaseOrderStatusSchema = z.enum([
  "DRAFT",
  "CONFIRMED",
  "PARTIALLY_RECEIVED",
  "FULLY_RECEIVED",
  "CANCELLED",
  "CLOSED",
]);

export const purchaseInvoiceStatusSchema = z.enum(["DRAFT", "POSTED", "CANCELLED"]);

export const createPurchaseOrderLineSchema = z.object({
  productId: z.string().uuid("Product is required"),
  supplierProductId: z.string().uuid().optional(),
  purchaseUnit: z
    .string()
    .trim()
    .min(1, "Purchase unit is required")
    .max(50, "Purchase unit cannot exceed 50 characters"),
  conversionFactor: z
    .number({ invalid_type_error: "Conversion factor is required" })
    .int("Conversion factor must be an integer")
    .min(1, "Conversion factor must be at least 1"),
  orderedQuantity: z
    .number({ invalid_type_error: "Ordered quantity is required" })
    .min(0.001, "Ordered quantity must be greater than 0"),
  unitCost: z
    .number({ invalid_type_error: "Unit cost is required" })
    .min(0, "Unit cost cannot be negative"),
  discountPercentage: z
    .number({ invalid_type_error: "Discount percentage must be a number" })
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%")
    .optional()
    .default(0),
  taxRate: z
    .number({ invalid_type_error: "Tax rate must be a number" })
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot exceed 100%")
    .optional()
    .default(0),
});

export const createPurchaseOrderSchema = z.object({
  storeId: z.string().uuid("Store is required"),
  supplierId: z.string().uuid("Supplier is required"),
  orderDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Order date must be YYYY-MM-DD")
    .optional(),
  expectedDeliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected delivery date must be YYYY-MM-DD")
    .optional(),
  discountAmount: z
    .number({ invalid_type_error: "Discount amount must be a number" })
    .min(0, "Discount amount cannot be negative")
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional()
    .or(z.literal("")),
  lines: z
    .array(createPurchaseOrderLineSchema)
    .min(1, "At least one purchase order line item is required"),
});

export const updatePurchaseOrderSchema = z.object({
  expectedDeliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected delivery date must be YYYY-MM-DD")
    .optional(),
  discountAmount: z
    .number({ invalid_type_error: "Discount amount must be a number" })
    .min(0, "Discount amount cannot be negative")
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional()
    .or(z.literal("")),
  lines: z.array(createPurchaseOrderLineSchema).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(255, "Reason cannot exceed 255 characters")
    .optional()
    .or(z.literal("")),
});

export const createPurchaseInvoiceLineSchema = z.object({
  goodsReceiptLineId: z.string().uuid().optional(),
  productId: z.string().uuid("Product is required"),
  invoicedQuantity: z
    .number({ invalid_type_error: "Invoiced quantity is required" })
    .min(0.001, "Invoiced quantity must be greater than 0"),
  unitPrice: z
    .number({ invalid_type_error: "Unit price is required" })
    .min(0, "Unit price cannot be negative"),
  taxRate: z
    .number({ invalid_type_error: "Tax rate must be a number" })
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot exceed 100%")
    .optional()
    .default(0),
  discountAmount: z
    .number({ invalid_type_error: "Discount amount must be a number" })
    .min(0, "Discount cannot be negative")
    .optional()
    .default(0),
});

export const createPurchaseInvoiceSchema = z.object({
  storeId: z.string().uuid("Store is required"),
  supplierId: z.string().uuid("Supplier is required"),
  purchaseOrderId: z.string().uuid().optional(),
  goodsReceiptId: z.string().uuid().optional(),
  supplierInvoiceNumber: z
    .string()
    .trim()
    .min(1, "Supplier invoice number is required")
    .max(100, "Supplier invoice number cannot exceed 100 characters"),
  invoiceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invoice date must be YYYY-MM-DD")
    .optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be YYYY-MM-DD")
    .optional(),
  discountAmount: z
    .number({ invalid_type_error: "Discount amount must be a number" })
    .min(0, "Discount amount cannot be negative")
    .optional(),
  roundOffAmount: z
    .number({ invalid_type_error: "Round off amount must be a number" })
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional()
    .or(z.literal("")),
  lines: z
    .array(createPurchaseInvoiceLineSchema)
    .min(1, "At least one purchase invoice line item is required"),
});

export type CreateSupplierFormValues = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierFormValues = z.infer<typeof updateSupplierSchema>;
export type CreateSupplierProductFormValues = z.infer<typeof createSupplierProductSchema>;
export type CreateGoodsReceiptFormValues = z.infer<typeof createGoodsReceiptSchema>;
export type CreateGoodsReceiptLineFormValues = z.infer<typeof createGoodsReceiptLineSchema>;
export type CreatePurchaseOrderFormValues = z.infer<typeof createPurchaseOrderSchema>;
export type CreatePurchaseOrderLineFormValues = z.infer<typeof createPurchaseOrderLineSchema>;
export type UpdatePurchaseOrderFormValues = z.infer<typeof updatePurchaseOrderSchema>;
export type CancelOrderFormValues = z.infer<typeof cancelOrderSchema>;
export type CreatePurchaseInvoiceFormValues = z.infer<typeof createPurchaseInvoiceSchema>;
export type CreatePurchaseInvoiceLineFormValues = z.infer<typeof createPurchaseInvoiceLineSchema>;

