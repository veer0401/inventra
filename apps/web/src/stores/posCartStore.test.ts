import { describe, it, expect, beforeEach } from "vitest";
import { usePosCartStore } from "./posCartStore";
import type { PosProductSearchResponse } from "@inventra/api-types";

describe("usePosCartStore", () => {
  const sampleProduct: PosProductSearchResponse = {
    id: "0194eb84-a4f6-7b81-a982-123456789012",
    name: "Amoxicillin 500mg",
    genericName: "Amoxicillin",
    dosageForm: "CAPSULE",
    strength: "500mg",
    baseUnit: "CAPSULE",
    sellingUnit: "STRIP",
    unitsPerSellingUnit: 10,
    taxRate: 12,
    isTaxInclusive: false,
    prescriptionRequired: true,
    currentStock: 100,
    isBatchTracked: true,
    fefoSellingPrice: 150.0,
    fefoBatchNumber: "AMX-001",
    fefoExpiryDate: "2027-01-01",
  };

  beforeEach(() => {
    usePosCartStore.getState().reset();
  });

  it("adds product to cart and calculates initial totals", () => {
    const store = usePosCartStore.getState();
    store.addItem(sampleProduct);

    const state = usePosCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].productName).toBe("Amoxicillin 500mg");
    expect(state.items[0].quantity).toBe(1);
    expect(state.items[0].unitPrice).toBe(150.0);

    const totals = state.getTotals();
    expect(totals.itemCount).toBe(1);
    expect(totals.subtotal).toBe(150.0);
    expect(totals.taxAmount).toBe(18.0); // 12% of 150
    expect(totals.totalAmount).toBe(168.0);
    expect(totals.prescriptionRequired).toBe(true);
  });

  it("increments quantity when adding duplicate product", () => {
    const store = usePosCartStore.getState();
    store.addItem(sampleProduct);
    store.addItem(sampleProduct);

    const state = usePosCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);

    const totals = state.getTotals();
    expect(totals.subtotal).toBe(300.0);
    expect(totals.taxAmount).toBe(36.0);
    expect(totals.totalAmount).toBe(336.0);
  });

  it("supports quantity decrement and removes item when quantity reaches 0", () => {
    const store = usePosCartStore.getState();
    store.addItem(sampleProduct);
    store.incrementQuantity(sampleProduct.id);

    expect(usePosCartStore.getState().items[0].quantity).toBe(2);

    usePosCartStore.getState().decrementQuantity(sampleProduct.id);
    expect(usePosCartStore.getState().items[0].quantity).toBe(1);

    usePosCartStore.getState().decrementQuantity(sampleProduct.id);
    expect(usePosCartStore.getState().items).toHaveLength(0);
  });

  it("calculates line discount correctly", () => {
    const store = usePosCartStore.getState();
    store.addItem(sampleProduct);
    store.setItemDiscount(sampleProduct.id, 10); // 10% discount on 150 = 15 off -> net 135

    const totals = usePosCartStore.getState().getTotals();
    expect(totals.grossAmount).toBe(150.0);
    expect(totals.itemDiscountAmount).toBe(15.0);
    expect(totals.subtotal).toBe(135.0);
    expect(totals.taxAmount).toBe(16.2); // 12% of 135
    expect(totals.totalAmount).toBe(151.2);
  });

  it("calculates bill discount and cash change correctly", () => {
    const store = usePosCartStore.getState();
    store.addItem(sampleProduct); // 150 + 18 tax = 168
    store.setBillDiscount(18); // total becomes 150
    store.setPayment("CASH", 200);

    const totals = usePosCartStore.getState().getTotals();
    expect(totals.totalAmount).toBe(150.0);
    expect(totals.changeAmount).toBe(50.0);
  });

  it("resets cart state when store context changes", () => {
    const store = usePosCartStore.getState();
    store.setContext("biz-1", "store-1");
    store.addItem(sampleProduct);
    expect(usePosCartStore.getState().items).toHaveLength(1);

    // Switch store context
    usePosCartStore.getState().setContext("biz-1", "store-2");
    expect(usePosCartStore.getState().items).toHaveLength(0);
    expect(usePosCartStore.getState().activeStoreId).toBe("store-2");
  });

  it("toggles unit between full pack and loose tablet", () => {
    const store = usePosCartStore.getState();
    store.addItem(sampleProduct); // 1 STRIP = 10 CAPSULES, 150 price

    expect(usePosCartStore.getState().items[0].sellingUnit).toBe("STRIP");
    expect(usePosCartStore.getState().items[0].unitPrice).toBe(150.0);

    // Toggle to loose capsule
    store.toggleItemUnit(sampleProduct.id);
    const item = usePosCartStore.getState().items[0];
    expect(item.isBaseUnitSale).toBe(true);
    expect(item.sellingUnit).toBe("CAPSULE");
    expect(item.unitPrice).toBe(15.0); // 150 / 10 = 15
    expect(item.quantity).toBe(1);

    const totals = usePosCartStore.getState().getTotals();
    expect(totals.subtotal).toBe(15.0);
    expect(totals.taxAmount).toBe(1.8); // 12% of 15
    expect(totals.totalAmount).toBe(16.8);

    // Toggle back to strip
    store.toggleItemUnit(sampleProduct.id);
    const stripItem = usePosCartStore.getState().items[0];
    expect(stripItem.isBaseUnitSale).toBe(false);
    expect(stripItem.sellingUnit).toBe("STRIP");
    expect(stripItem.unitPrice).toBe(150.0);
  });
});
