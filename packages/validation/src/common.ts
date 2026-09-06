import { z } from "zod";

export const uuidSchema = z.string().uuid("Invalid UUID format");

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email address")
  .max(255, "Email cannot exceed 255 characters");

export const mobileNumberSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Mobile number must be strictly 10 digits starting with 6, 7, 8, or 9");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Mobile number must be strictly 10 digits")
  .optional()
  .or(z.literal(""));

export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]{5}$/, "Postal PIN code must be strictly 6 digits");

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
});

export const positiveMoneySchema = z
  .number()
  .nonnegative("Amount cannot be negative")
  .max(999999999.99, "Amount exceeds limit");

export const positiveQuantitySchema = z
  .number()
  .positive("Quantity must be greater than zero")
  .max(9999999.999, "Quantity exceeds limit");
