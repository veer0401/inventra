import { create } from "zustand";
import type { PosProductSearchResponse, PaymentMethod } from "@inventra/api-types";

export interface PosCartItem {
  productId: string;
  productName: string;
  genericName?: string;
  dosageForm?: string;
  strength?: string;
  baseUnit: string;
  sellingUnit: string;
  packageSellingUnit: string;
  packagePrice: number;
  isBaseUnitSale: boolean;
  unitsPerSellingUnit: number;
  unitPrice: number;
  taxRate: number;
  isTaxInclusive: boolean;
  prescriptionRequired: boolean;
  availableStock: number;
  quantity: number; // in selling units
  discountPercentage: number;
  batchNumber?: string;
  expiryDate?: string;
  batchId?: string;
}

export interface PosCartTotals {
  itemCount: number;
  totalQuantity: number;
  grossAmount: number;
  itemDiscountAmount: number;
  subtotal: number;
  taxAmount: number;
  billDiscountAmount: number;
  roundOffAmount: number;
  totalAmount: number;
  changeAmount: number;
  prescriptionRequired: boolean;
}

export interface PosCartState {
  items: PosCartItem[];
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  billDiscountAmount: number;
  roundOffAmount: number;
  selectedPaymentMethod: PaymentMethod;
  amountTendered: number;
  paymentReference: string;
  notes: string;
  activeStoreId: string | null;
  activeBusinessId: string | null;

  // Actions
  addItem: (product: PosProductSearchResponse) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  incrementQuantity: (productId: string) => void;
  decrementQuantity: (productId: string) => void;
  toggleItemUnit: (productId: string) => void;
  setItemDiscount: (productId: string, discountPercentage: number) => void;
  setCustomer: (customerOrName: { id?: string; name?: string; phone?: string } | string | null, phone?: string) => void;
  clearCustomer: () => void;
  setBillDiscount: (amount: number) => void;
  setRoundOff: (amount: number) => void;
  setPayment: (method: PaymentMethod, tendered?: number, reference?: string) => void;
  setNotes: (notes: string) => void;
  setContext: (businessId: string | null, storeId: string | null) => void;
  clearCart: () => void;
  reset: () => void;

  // Getter
  getTotals: () => PosCartTotals;
}

// Deterministic 4-decimal rounding helper
function round4(val: number): number {
  return Math.round((val + Number.EPSILON) * 10000) / 10000;
}

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export const usePosCartStore = create<PosCartState>((set, get) => ({
  items: [],
  customerId: null,
  customerName: "",
  customerPhone: "",
  billDiscountAmount: 0,
  roundOffAmount: 0,
  selectedPaymentMethod: "CASH",
  amountTendered: 0,
  paymentReference: "",
  notes: "",
  activeStoreId: null,
  activeBusinessId: null,

  addItem: (product) => {
    set((state) => {
      const prodId = product.productId || (product as any).id;
      if (!prodId) {
        console.error("Cannot add product to POS cart: missing id / productId", product);
        return state;
      }
      const existingIndex = state.items.findIndex((item) => item.productId === prodId);
      const unitPrice =
        product.fefoSellingPrice ??
        product.sellingPrice ??
        product.fefoMrp ??
        product.mrp ??
        0;

      if (existingIndex >= 0) {
        const updated = [...state.items];
        const existing = updated[existingIndex];
        const newQty = round4(existing.quantity + 1);
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
        };
        return { items: updated };
      }

      const packageSellingUnit = product.sellingUnit || "Unit";
      const packagePrice = unitPrice;

      const newItem: PosCartItem = {
        productId: prodId,
        productName: product.name,
        genericName: product.genericName,
        dosageForm: product.dosageForm,
        strength: product.strength,
        baseUnit: product.baseUnit || "Unit",
        sellingUnit: packageSellingUnit,
        packageSellingUnit,
        packagePrice,
        isBaseUnitSale: false,
        unitsPerSellingUnit: product.unitsPerSellingUnit >= 1 ? product.unitsPerSellingUnit : 1,
        unitPrice,
        taxRate: product.taxRate || 0,
        isTaxInclusive: product.isTaxInclusive ?? true,
        prescriptionRequired: product.prescriptionRequired ?? false,
        availableStock: product.currentStock || 0,
        quantity: 1,
        discountPercentage: 0,
        batchNumber: product.fefoBatchNumber,
        expiryDate: product.fefoExpiryDate,
      };

      return { items: [...state.items, newItem] };
    });
  },

  toggleItemUnit: (productId) => {
    set((state) => {
      const index = state.items.findIndex((item) => item.productId === productId);
      if (index === -1) return state;

      const updated = [...state.items];
      const item = { ...updated[index] };

      if (item.unitsPerSellingUnit <= 1) return state;

      if (!item.isBaseUnitSale) {
        // Toggle to loose / base unit (e.g. 1 Tablet)
        item.isBaseUnitSale = true;
        item.sellingUnit = item.baseUnit || "Unit";
        item.unitPrice = round2(item.packagePrice / item.unitsPerSellingUnit);
        item.quantity = 1;
      } else {
        // Toggle back to full pack / strip
        item.isBaseUnitSale = false;
        item.sellingUnit = item.packageSellingUnit;
        item.unitPrice = item.packagePrice;
        item.quantity = 1;
      }

      updated[index] = item;
      return { items: updated };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((item) =>
        item.productId === productId
          ? { ...item, quantity: round4(quantity) }
          : item
      ),
    }));
  },

  incrementQuantity: (productId) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.productId === productId
          ? { ...item, quantity: round4(item.quantity + 1) }
          : item
      ),
    }));
  },

  decrementQuantity: (productId) => {
    const item = get().items.find((i) => i.productId === productId);
    if (!item) return;
    if (item.quantity <= 1) {
      get().removeItem(productId);
    } else {
      set((state) => ({
        items: state.items.map((i) =>
          i.productId === productId
            ? { ...i, quantity: round4(i.quantity - 1) }
            : i
        ),
      }));
    }
  },

  setItemDiscount: (productId, discountPercentage) => {
    const clamped = Math.max(0, Math.min(100, discountPercentage));
    set((state) => ({
      items: state.items.map((item) =>
        item.productId === productId
          ? { ...item, discountPercentage: clamped }
          : item
      ),
    }));
  },

  setCustomer: (customerOrName, phone) => {
    if (customerOrName === null) {
      set({ customerId: null, customerName: "", customerPhone: "" });
    } else if (typeof customerOrName === "object") {
      set({
        customerId: customerOrName.id || null,
        customerName: customerOrName.name || "",
        customerPhone: customerOrName.phone || "",
      });
    } else {
      set({
        customerId: null,
        customerName: customerOrName || "",
        customerPhone: phone || "",
      });
    }
  },

  clearCustomer: () => {
    set({ customerId: null, customerName: "", customerPhone: "" });
  },

  setBillDiscount: (billDiscountAmount) => {
    set({ billDiscountAmount: Math.max(0, billDiscountAmount) });
  },

  setRoundOff: (roundOffAmount) => {
    set({ roundOffAmount });
  },

  setPayment: (selectedPaymentMethod, tendered, paymentReference) => {
    set((state) => ({
      selectedPaymentMethod,
      amountTendered: tendered !== undefined ? tendered : state.amountTendered,
      paymentReference: paymentReference !== undefined ? paymentReference : state.paymentReference,
    }));
  },

  setNotes: (notes) => {
    set({ notes });
  },

  setContext: (businessId, storeId) => {
    const current = get();
    // Context Safety: If business or store context changed, clear POS state completely
    if (current.activeBusinessId !== businessId || current.activeStoreId !== storeId) {
      set({
        activeBusinessId: businessId,
        activeStoreId: storeId,
        items: [],
        customerId: null,
        customerName: "",
        customerPhone: "",
        billDiscountAmount: 0,
        roundOffAmount: 0,
        selectedPaymentMethod: "CASH",
        amountTendered: 0,
        paymentReference: "",
        notes: "",
      });
    }
  },

  clearCart: () => {
    set({
      items: [],
      customerId: null,
      customerName: "",
      customerPhone: "",
      billDiscountAmount: 0,
      roundOffAmount: 0,
      amountTendered: 0,
      paymentReference: "",
      notes: "",
    });
  },

  reset: () => {
    set({
      items: [],
      customerId: null,
      customerName: "",
      customerPhone: "",
      billDiscountAmount: 0,
      roundOffAmount: 0,
      selectedPaymentMethod: "CASH",
      amountTendered: 0,
      paymentReference: "",
      notes: "",
      activeStoreId: null,
      activeBusinessId: null,
    });
  },

  getTotals: () => {
    const state = get();
    let totalQty = 0;
    let grossSum = 0;
    let itemDiscSum = 0;
    let subtotalSum = 0;
    let taxSum = 0;
    let rxRequired = false;

    for (const item of state.items) {
      totalQty += item.quantity;
      if (item.prescriptionRequired) {
        rxRequired = true;
      }

      const gross = round4(item.quantity * item.unitPrice);
      const disc = round4(gross * (item.discountPercentage / 100));
      const net = round4(gross - disc);

      grossSum += gross;
      itemDiscSum += disc;
      subtotalSum += net;

      // Tax calculation
      let tax = 0;
      if (item.taxRate > 0) {
        tax = round4(net * (item.taxRate / 100));
      }
      taxSum += tax;
    }

    const subtotal = round2(subtotalSum);
    const billDiscount = round2(state.billDiscountAmount);
    const taxTotal = round2(taxSum);
    const roundOff = round2(state.roundOffAmount);

    let netPayable = round2(subtotal - billDiscount + taxTotal + roundOff);
    if (netPayable < 0) {
      netPayable = 0;
    }

    const change =
      state.selectedPaymentMethod === "CASH" && state.amountTendered > netPayable
        ? round2(state.amountTendered - netPayable)
        : 0;

    return {
      itemCount: state.items.length,
      totalQuantity: round4(totalQty),
      grossAmount: round2(grossSum),
      itemDiscountAmount: round2(itemDiscSum),
      subtotal,
      taxAmount: taxTotal,
      billDiscountAmount: billDiscount,
      roundOffAmount: roundOff,
      totalAmount: netPayable,
      changeAmount: change,
      prescriptionRequired: rxRequired,
    };
  },
}));
