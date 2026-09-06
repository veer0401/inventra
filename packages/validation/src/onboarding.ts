import { z } from "zod";
import { emailSchema, mobileNumberSchema, pincodeSchema } from "./common";

export const submitOnboardingApplicationSchema = z.object({
  applicantName: z
    .string()
    .min(1, "Applicant full name is required")
    .max(150, "Applicant name must not exceed 150 characters"),
  applicantEmail: emailSchema,
  applicantPhone: mobileNumberSchema,
  businessName: z
    .string()
    .min(1, "Legal pharmacy / business name is required")
    .max(255, "Business name must not exceed 255 characters"),
  tradeName: z.string().max(255, "Trade name too long").optional().or(z.literal("")),
  drugLicenseNumber: z
    .string()
    .max(100, "Drug license number too long")
    .optional()
    .or(z.literal("")),
  gstin: z.string().max(20, "GSTIN too long").optional().or(z.literal("")),
  storeName: z
    .string()
    .min(1, "Primary pharmacy store name is required")
    .max(200, "Store name must not exceed 200 characters"),
  storeCode: z.string().max(50, "Store code too long").optional().or(z.literal("")),
  addressLine1: z.string().max(255, "Address line 1 too long").optional().or(z.literal("")),
  addressLine2: z.string().max(255, "Address line 2 too long").optional().or(z.literal("")),
  city: z.string().max(100, "City too long").optional().or(z.literal("")),
  state: z.string().max(100, "State too long").optional().or(z.literal("")),
  postalCode: pincodeSchema,
});

export const rejectOnboardingApplicationSchema = z.object({
  rejectionReason: z
    .string()
    .min(5, "Rejection reason must be at least 5 characters")
    .max(1000, "Rejection reason must not exceed 1000 characters"),
});

export const activateOwnerSchema = z
  .object({
    token: z.string().min(1, "Activation token is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must not exceed 128 characters"),
    confirmPassword: z.string().min(1, "Please confirm password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
