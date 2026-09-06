import { z } from "zod";
import { emailSchema } from "./common";

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(100, "Password too long"),
  deviceCode: z.string().max(50).optional(),
  deviceName: z.string().max(100).optional(),
  deviceType: z.enum(["DESKTOP", "MOBILE_ANDROID", "MOBILE_IOS", "BROWSER"]).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(100, "Password too long"),
    confirmPassword: z.string().min(1, "Please confirm new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const resetPasswordRequestSchema = z.object({
  email: emailSchema,
});

export const resetPasswordConfirmSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password too long"),
    confirmPassword: z.string().min(1, "Please confirm new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
