import { describe, it, expect } from "vitest";
import { formatCurrency, formatQuantity, formatDate } from "./format";
import { canonicalizeJson, computePayloadChecksum } from "./canonical";

describe("Formatting Utilities", () => {
  it("formats Indian Rupee currency correctly", () => {
    const formatted = formatCurrency(1250.5);
    expect(formatted).toContain("1,250.50");
    expect(formatCurrency(0)).toContain("0.00");
    expect(formatCurrency(null)).toContain("0.00");
  });

  it("formats quantity correctly", () => {
    expect(formatQuantity(15)).toBe("15");
    expect(formatQuantity(15.5)).toBe("15.5");
    expect(formatQuantity(null)).toBe("0");
  });

  it("formats dates into Indian Standard Time", () => {
    const formatted = formatDate("2026-08-25T12:00:00Z");
    expect(formatted).toBe("25 Aug 2026");
  });
});

describe("Canonical JSON & Checksum", () => {
  it("sorts keys recursively for canonical representation", () => {
    const objA = { z: 1, a: { y: 2, b: 3 } };
    const objB = { a: { b: 3, y: 2 }, z: 1 };
    expect(canonicalizeJson(objA)).toBe(canonicalizeJson(objB));
  });

  it("computes identical SHA-256 for key-order-permutated objects", async () => {
    const objA = { storeId: "store-1", totalAmount: 500, lines: [{ id: 1, price: 50 }] };
    const objB = { totalAmount: 500, lines: [{ price: 50, id: 1 }], storeId: "store-1" };
    const hashA = await computePayloadChecksum(objA);
    const hashB = await computePayloadChecksum(objB);
    expect(hashA).toBe(hashB);
    expect(hashA).toHaveLength(64);
  });
});
