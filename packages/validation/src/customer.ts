import { z } from "zod";

export const customerStatusSchema = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]);

export const createCustomerSchema = z.object({
  customerCode: z
    .string()
    .trim()
    .max(30, "Customer code cannot exceed 30 characters")
    .optional()
    .or(z.literal("")),
  fullName: z
    .string({ required_error: "Full name is required" })
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(150, "Full name cannot exceed 150 characters"),
  phone: z
    .string({ required_error: "Mobile number is required" })
    .trim()
    .regex(/^[6-9]\d{9}$/, "Mobile number must be strictly 10 digits"),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(150, "Email cannot exceed 150 characters")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .trim()
    .max(1000, "Address cannot exceed 1000 characters")
    .optional()
    .or(z.literal("")),
  gstin: z
    .string()
    .trim()
    .max(20, "GSTIN cannot exceed 20 characters")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(500, "Notes cannot exceed 500 characters")
    .optional()
    .or(z.literal("")),
});

export const updateCustomerSchema = z.object({
  fullName: z
    .string({ required_error: "Full name is required" })
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(150, "Full name cannot exceed 150 characters"),
  phone: z
    .string({ required_error: "Mobile number is required" })
    .trim()
    .regex(/^[6-9]\d{9}$/, "Mobile number must be strictly 10 digits"),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(150, "Email cannot exceed 150 characters")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .trim()
    .max(1000, "Address cannot exceed 1000 characters")
    .optional()
    .or(z.literal("")),
  gstin: z
    .string()
    .trim()
    .max(20, "GSTIN cannot exceed 20 characters")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(500, "Notes cannot exceed 500 characters")
    .optional()
    .or(z.literal("")),
  status: customerStatusSchema.optional(),
});

export const customerSearchSchema = z.object({
  search: z.string().trim().optional(),
  status: customerStatusSchema.optional(),
  page: z.number().int().min(0).default(0),
  size: z.number().int().min(1).max(100).default(20),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerSearchInput = z.infer<typeof customerSearchSchema>;
