import { describe, it, expect } from "vitest";
import { emailSchema, uuidSchema, loginSchema, createProductSchema, paginationQuerySchema } from "./index";

describe("Validation Schemas", () => {
  it("validates valid and invalid emails", () => {
    expect(emailSchema.safeParse("user@inventra.local").success).toBe(true);
    expect(emailSchema.safeParse("invalid-email").success).toBe(false);
    expect(emailSchema.safeParse("").success).toBe(false);
  });

  it("validates UUIDv4/v7 formats", () => {
    expect(uuidSchema.safeParse("01a037d5-c0d3-72eb-81f6-ad0a91e7fa24").success).toBe(true);
    expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
  });

  it("validates login payload", () => {
    const valid = loginSchema.safeParse({ email: "admin@inventra.com", password: "password123" });
    expect(valid.success).toBe(true);

    const missingPassword = loginSchema.safeParse({ email: "admin@inventra.com", password: "" });
    expect(missingPassword.success).toBe(false);
  });

  it("validates create product schema with defaults", () => {
    const parsed = createProductSchema.safeParse({
      name: "Amoxicillin 500mg",
      dosageForm: "CAPSULE",
      baseUnit: "CAPSULE",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sellingUnit).toBe("Unit");
      expect(parsed.data.unitsPerSellingUnit).toBe(1);
      expect(parsed.data.taxRate).toBe(0);
      expect(parsed.data.isTaxInclusive).toBe(true);
    }
  });

  it("validates and coerces pagination query params", () => {
    const parsed = paginationQuerySchema.safeParse({ page: "1", size: "25" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.size).toBe(25);
    }
  });
});
