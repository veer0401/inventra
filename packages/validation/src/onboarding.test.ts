import { describe, it, expect } from "vitest";
import {
  submitOnboardingApplicationSchema,
  rejectOnboardingApplicationSchema,
  activateOwnerSchema,
} from "./onboarding";

describe("Onboarding Validation Schemas", () => {
  describe("submitOnboardingApplicationSchema", () => {
    it("accepts valid application data", () => {
      const valid = {
        applicantName: "Dr. Rajesh Sharma",
        applicantEmail: "rajesh@apollocare.local",
        applicantPhone: "9876543210",
        businessName: "Apollo Care Pvt Ltd",
        tradeName: "Apollo Care",
        drugLicenseNumber: "DL-KA-2026-10492",
        gstin: "29AAAAA0000A1Z5",
        storeName: "Main Dispensary",
        storeCode: "MAIN-01",
        addressLine1: "100 Feet Road",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560038",
      };

      const result = submitOnboardingApplicationSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects blank applicant name or invalid email", () => {
      const invalid = {
        applicantName: "",
        applicantEmail: "not-an-email",
        businessName: "",
        storeName: "",
      };

      const result = submitOnboardingApplicationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues.map((i) => i.path[0]);
        expect(issues).toContain("applicantName");
        expect(issues).toContain("applicantEmail");
        expect(issues).toContain("businessName");
        expect(issues).toContain("storeName");
      }
    });
  });

  describe("rejectOnboardingApplicationSchema", () => {
    it("accepts valid rejection reason", () => {
      const valid = {
        rejectionReason: "Drug license documentation is invalid or expired.",
      };
      const result = rejectOnboardingApplicationSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects reason shorter than 5 characters", () => {
      const invalid = {
        rejectionReason: "No",
      };
      const result = rejectOnboardingApplicationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("activateOwnerSchema", () => {
    it("accepts valid activation payload with matching passwords", () => {
      const valid = {
        token: "sample-uuid-token-12345",
        newPassword: "SecurePassword123!",
        confirmPassword: "SecurePassword123!",
      };
      const result = activateOwnerSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects mismatched passwords", () => {
      const mismatched = {
        token: "sample-token",
        newPassword: "SecurePassword123!",
        confirmPassword: "DifferentPassword123!",
      };
      const result = activateOwnerSchema.safeParse(mismatched);
      expect(result.success).toBe(false);
    });

    it("rejects password shorter than 8 characters", () => {
      const short = {
        token: "sample-token",
        newPassword: "short",
        confirmPassword: "short",
      };
      const result = activateOwnerSchema.safeParse(short);
      expect(result.success).toBe(false);
    });
  });
});
