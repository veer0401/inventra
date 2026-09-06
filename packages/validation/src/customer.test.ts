import { describe, it, expect } from "vitest";
import { createCustomerSchema, updateCustomerSchema, customerSearchSchema } from "./customer";

describe("Customer Validation Schemas", () => {
  describe("createCustomerSchema", () => {
    it("accepts valid customer input", () => {
      const valid = {
        customerCode: "CUST-001",
        fullName: "Jane Doe",
        phone: "9876543210",
        email: "jane@example.com",
        address: "123 Main St",
        gstin: "27AAAAA0000A1Z5",
        notes: "Regular patient",
      };
      const result = createCustomerSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("requires fullName and phone", () => {
      const invalid = {
        fullName: "",
        phone: "",
      };
      const result = createCustomerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects phone shorter than 7 digits", () => {
      const invalid = {
        fullName: "Jane Doe",
        phone: "12345",
      };
      const result = createCustomerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects invalid email", () => {
      const invalid = {
        fullName: "Jane Doe",
        phone: "9876543210",
        email: "not-an-email",
      };
      const result = createCustomerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("allows optional fields to be empty strings", () => {
      const valid = {
        fullName: "Jane Doe",
        phone: "9876543210",
        email: "",
        address: "",
        gstin: "",
        notes: "",
      };
      const result = createCustomerSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe("updateCustomerSchema", () => {
    it("accepts valid update input with status", () => {
      const valid = {
        fullName: "Jane Doe Updated",
        phone: "9876543210",
        status: "ACTIVE",
      };
      const result = updateCustomerSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("accepts INACTIVE or SUSPENDED status", () => {
      const validInactive = {
        fullName: "Jane Doe",
        phone: "9876543210",
        status: "INACTIVE",
      };
      expect(updateCustomerSchema.safeParse(validInactive).success).toBe(true);

      const validSuspended = {
        fullName: "Jane Doe",
        phone: "9876543210",
        status: "SUSPENDED",
      };
      expect(updateCustomerSchema.safeParse(validSuspended).success).toBe(true);
    });
  });

  describe("customerSearchSchema", () => {
    it("parses search query with defaults", () => {
      const parsed = customerSearchSchema.parse({ search: "Jane" });
      expect(parsed.search).toBe("Jane");
      expect(parsed.page).toBe(0);
      expect(parsed.size).toBe(20);
    });
  });
});
