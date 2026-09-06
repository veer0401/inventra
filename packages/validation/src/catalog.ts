import { z } from "zod";
import { uuidSchema } from "./common";

export const dosageFormEnum = z.enum([
  "TABLET",
  "CAPSULE",
  "SYRUP",
  "INJECTION",
  "OINTMENT",
  "DROPS",
  "POWDER",
  "DEVICE",
  "GENERAL",
]);

export const identifierTypeEnum = z.enum([
  "BARCODE",
  "SKU",
  "EAN_13",
  "UPC",
  "MANUFACTURER_CODE",
]);

export const productStatusEnum = z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"]);

export const categoryStatusEnum = z.enum(["ACTIVE", "INACTIVE"]);

export const createCategorySchema = z.object({
  parentId: uuidSchema.optional().or(z.literal("")),
  name: z.string().min(1, "Category name is required").max(100, "Category name must not exceed 100 characters"),
  code: z.string().min(1, "Category code is required").max(50, "Category code must not exceed 50 characters"),
  description: z.string().max(255, "Description must not exceed 255 characters").optional().or(z.literal("")),
});

export const updateCategorySchema = z.object({
  name: z.string().max(100, "Category name must not exceed 100 characters").optional().or(z.literal("")),
  description: z.string().max(255, "Description must not exceed 255 characters").optional().or(z.literal("")),
  status: categoryStatusEnum.optional(),
});

export const addProductIdentifierSchema = z.object({
  identifierType: identifierTypeEnum,
  identifierValue: z.string().min(1, "Identifier value is required").max(100, "Identifier value must not exceed 100 characters"),
  isPrimary: z.boolean().optional(),
});

export const createProductSchema = z.object({
  categoryId: uuidSchema.optional().or(z.literal("")),
  globalProductId: uuidSchema.optional().or(z.literal("")),
  name: z.string().min(1, "Product name is required").max(200, "Product name must not exceed 200 characters"),
  genericName: z.string().max(255, "Generic name must not exceed 255 characters").optional().or(z.literal("")),
  brandName: z.string().max(100, "Brand name must not exceed 100 characters").optional().or(z.literal("")),
  manufacturer: z.string().max(150, "Manufacturer must not exceed 150 characters").optional().or(z.literal("")),
  dosageForm: dosageFormEnum,
  strength: z.string().max(50, "Strength must not exceed 50 characters").optional().or(z.literal("")),
  baseUnit: z.string().min(1, "Base unit is required").max(30, "Base unit must not exceed 30 characters"),
  sellingUnit: z.string().max(50, "Selling unit must not exceed 50 characters").optional().default("Unit"),
  unitsPerSellingUnit: z.coerce.number().int().min(1, "Units per selling unit must be at least 1").default(1),
  hsnCode: z.string().max(20, "HSN code must not exceed 20 characters").optional().or(z.literal("")),
  taxRate: z.coerce.number().min(0, "Tax rate must be non-negative").default(0),
  isTaxInclusive: z.boolean().default(true),
  prescriptionRequired: z.boolean().default(false),
  status: productStatusEnum.optional(),
  identifiers: z.array(addProductIdentifierSchema).optional(),
});

export const updateProductSchema = z.object({
  categoryId: uuidSchema.optional().or(z.literal("")),
  name: z.string().min(1, "Product name cannot be empty").max(200, "Product name must not exceed 200 characters").optional(),
  genericName: z.string().max(255).optional().or(z.literal("")),
  brandName: z.string().max(100).optional().or(z.literal("")),
  manufacturer: z.string().max(150).optional().or(z.literal("")),
  dosageForm: dosageFormEnum.optional(),
  strength: z.string().max(50).optional().or(z.literal("")),
  baseUnit: z.string().max(30).optional(),
  sellingUnit: z.string().max(50).optional().or(z.literal("")),
  unitsPerSellingUnit: z.coerce.number().int().min(1, "Units per selling unit must be at least 1").optional(),
  hsnCode: z.string().max(20).optional().or(z.literal("")),
  taxRate: z.coerce.number().min(0, "Tax rate must be non-negative").optional(),
  isTaxInclusive: z.boolean().optional(),
  prescriptionRequired: z.boolean().optional(),
  status: productStatusEnum.optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type AddProductIdentifierInput = z.infer<typeof addProductIdentifierSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
