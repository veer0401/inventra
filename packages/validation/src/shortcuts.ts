import { z } from "zod";

export const createShortcutProfileSchema = z.object({
  name: z
    .string({ required_error: "Profile name is required" })
    .trim()
    .min(1, "Profile name is required")
    .max(100, "Profile name cannot exceed 100 characters"),
  description: z
    .string()
    .trim()
    .max(255, "Description cannot exceed 255 characters")
    .optional()
    .nullable(),
  isActive: z.boolean().optional().default(false),
  shortcuts: z.record(z.string()).optional().default({}),
});

export type CreateShortcutProfileInput = z.infer<typeof createShortcutProfileSchema>;

export const updateShortcutProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Profile name cannot be empty")
    .max(100, "Profile name cannot exceed 100 characters")
    .optional(),
  description: z
    .string()
    .trim()
    .max(255, "Description cannot exceed 255 characters")
    .optional()
    .nullable(),
  isActive: z.boolean().optional(),
  shortcuts: z.record(z.string()).optional(),
});

export type UpdateShortcutProfileInput = z.infer<typeof updateShortcutProfileSchema>;

export const updateStoreCapacitySchema = z.object({
  maxUsers: z
    .number({ required_error: "maxUsers is required" })
    .int("maxUsers must be an integer")
    .min(1, "Store capacity must allow at least 1 active user")
    .max(1000, "Store capacity cannot exceed 1000 users"),
});

export type UpdateStoreCapacityInput = z.infer<typeof updateStoreCapacitySchema>;
