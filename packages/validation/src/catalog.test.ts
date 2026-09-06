import { describe, it, expect } from "vitest";
import {
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  addProductIdentifierSchema,
} from "./catalog";

describe("Catalog Validation Schemas", () => {
  describe("createProductSchema", () => {
    it("validates valid pharmaceutical product payload", () => {
      const validPayload = {
        name: "Amoxicillin 500mg Capsule",
        genericName: "Amoxicillin Trihydrate",
        brandName: "Novamox",
        manufacturer: "Cipla Ltd",
        dosageForm: "CAPSULE",
        strength: "500mg",
        baseUnit: "Capsule",
        sellingUnit: "Strip of 10 Capsules",
        unitsPerSellingUnit: 10,
        hsnCode: "3004",
        taxRate: 12.0,
        isTaxInclusive: true,
        prescriptionRequired: true,
        identifiers: [
          {
            identifierType: "BARCODE",
            identifierValue: "8901234567890",
            isPrimary: true,
          },
        ],
      };

      const result = createProductSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("fails when product name is missing or empty", () => {
      const invalidPayload = {
        name: "",
        dosageForm: "TABLET",
        baseUnit: "Tablet",
      };

      const result = createProductSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Product name is required");
      }
    });

    it("fails when dosage form is invalid", () => {
      const invalidPayload = {
        name: "Paracetamol",
        dosageForm: "UNKNOWN_FORM",
        baseUnit: "Tablet",
      };

      const result = createProductSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("fails when tax rate is negative", () => {
      const invalidPayload = {
        name: "Paracetamol",
        dosageForm: "TABLET",
        baseUnit: "Tablet",
        taxRate: -5.0,
      };

      const result = createProductSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("fails when unitsPerSellingUnit is less than 1", () => {
      const invalidPayload = {
        name: "Paracetamol",
        dosageForm: "TABLET",
        baseUnit: "Tablet",
        unitsPerSellingUnit: 0,
      };

      const result = createProductSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe("addProductIdentifierSchema", () => {
    it("validates valid barcode and SKU identifier", () => {
      const valid = {
        identifierType: "BARCODE",
        identifierValue: "8901234567890",
        isPrimary: true,
      };

      const result = addProductIdentifierSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects empty identifier value", () => {
      const invalid = {
        identifierType: "SKU",
        identifierValue: "",
      };

      const result = addProductIdentifierSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("createCategorySchema", () => {
    it("validates valid category payload", () => {
      const valid = {
        name: "Antibiotics",
        code: "CAT-ANTI-01",
        description: "Antibacterial compounds",
      };

      const result = createCategorySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects missing code", () => {
      const invalid = {
        name: "Antibiotics",
        code: "",
      };

      const result = createCategorySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("updateProductSchema", () => {
    it("validates partial update with status change", () => {
      const valid = {
        name: "Updated Name",
        status: "INACTIVE",
      };

      const result = updateProductSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });
});
