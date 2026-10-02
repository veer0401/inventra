import { describe, it, expect } from "vitest";
import { resolveNavigationAction, DESTINATION_ROUTE_MAP } from "./navigationActionResolver";

describe("navigationActionResolver", () => {
  it("resolves INVENTORY for authorized role", () => {
    const res = resolveNavigationAction("INVENTORY", "OWNER");
    expect(res.isSupported).toBe(true);
    expect(res.isAllowed).toBe(true);
    expect(res.route).toBe("/inventory");
    expect(res.label).toBe("Store Inventory");
  });

  it("resolves CUSTOMERS for authorized role", () => {
    const res = resolveNavigationAction("customers", "CASHIER");
    expect(res.isSupported).toBe(true);
    expect(res.isAllowed).toBe(true);
    expect(res.route).toBe("/customers");
  });

  it("resolves PURCHASING to /purchasing/orders", () => {
    const res = resolveNavigationAction("PURCHASING", "MANAGER");
    expect(res.isSupported).toBe(true);
    expect(res.isAllowed).toBe(true);
    expect(res.route).toBe("/purchasing/orders");
  });

  it("blocks access to TRANSFERS for unauthorized CASHIER role", () => {
    const res = resolveNavigationAction("TRANSFERS", "CASHIER");
    expect(res.isSupported).toBe(true);
    expect(res.isAllowed).toBe(false);
    expect(res.reason).toContain("Access Restricted");
  });

  it("returns unsupported for unknown destination", () => {
    const res = resolveNavigationAction("NONEXISTENT_MODULE", "OWNER");
    expect(res.isSupported).toBe(false);
    expect(res.isAllowed).toBe(false);
    expect(res.reason).toContain("not mapped to an active route");
  });

  it("handles null or empty destination gracefully", () => {
    const res = resolveNavigationAction(null);
    expect(res.isSupported).toBe(false);
    expect(res.isAllowed).toBe(false);
  });

  it("handles whitespace and case insensitivity", () => {
    const res = resolveNavigationAction("   batches   ", "INVENTORY_OPERATOR");
    expect(res.isSupported).toBe(true);
    expect(res.isAllowed).toBe(true);
    expect(res.route).toBe("/inventory/batches");
  });

  it("verifies all registered destinations have non-empty routes", () => {
    for (const [key, config] of Object.entries(DESTINATION_ROUTE_MAP)) {
      expect(config.destination).toBe(key);
      expect(config.route.startsWith("/")).toBe(true);
      expect(config.label).toBeTruthy();
    }
  });
});
