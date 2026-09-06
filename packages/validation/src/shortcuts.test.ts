import { describe, it, expect } from "vitest";
import {
  createShortcutProfileSchema,
  updateShortcutProfileSchema,
  updateStoreCapacitySchema,
} from "./shortcuts";

describe("F5 Shortcut Validation Schemas", () => {
  describe("createShortcutProfileSchema", () => {
    it("validates valid create profile request", () => {
      const result = createShortcutProfileSchema.safeParse({
        name: "Fast Checkout",
        description: "POS billing hotkeys",
        isActive: true,
        shortcuts: {
          OPEN_COMMAND_PALETTE: "Ctrl+K",
          NEW_PURCHASE_ORDER: "N O",
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = createShortcutProfileSchema.safeParse({
        name: "   ",
      });
      expect(result.success).toBe(false);
    });

    it("rejects excessively long name (>100 chars)", () => {
      const result = createShortcutProfileSchema.safeParse({
        name: "A".repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateShortcutProfileSchema", () => {
    it("validates partial update", () => {
      const result = updateShortcutProfileSchema.safeParse({
        name: "Updated Name",
        isActive: true,
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name if provided", () => {
      const result = updateShortcutProfileSchema.safeParse({
        name: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateStoreCapacitySchema", () => {
    it("validates positive integer maxUsers", () => {
      const result = updateStoreCapacitySchema.safeParse({ maxUsers: 10 });
      expect(result.success).toBe(true);
    });

    it("rejects 0 or negative maxUsers", () => {
      expect(updateStoreCapacitySchema.safeParse({ maxUsers: 0 }).success).toBe(false);
      expect(updateStoreCapacitySchema.safeParse({ maxUsers: -5 }).success).toBe(false);
    });

    it("rejects float maxUsers", () => {
      expect(updateStoreCapacitySchema.safeParse({ maxUsers: 5.5 }).success).toBe(false);
    });
  });
});
