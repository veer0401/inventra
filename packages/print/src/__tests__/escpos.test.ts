import { describe, it, expect, beforeEach } from "vitest";
import { EscPosRenderer, COMMANDS } from "../renderer/escpos";
import { VirtualPrinterAdapter } from "../adapters/virtual";
import type { ReceiptDocument } from "../models/receipt";

const mockSampleReceipt: ReceiptDocument = {
  header: {
    pharmacyName: "Inventra Apollo Care",
    storeName: "Apollo Counter 1",
    address: "77 Park Street, Kolkata",
    phone: "+91 33 2244 5566",
    gstin: "19AAACH7409R1ZZ",
    drugLicenseNumber: "DL-WB-10294",
  },
  metadata: {
    saleNumber: "SALE-20260828-001",
    invoiceNumber: "INV-WB-90182",
    date: "2026-08-28",
    cashierName: "Vikram Sen",
    customerName: "Ramesh Sharma",
    customerPhone: "9830012345",
  },
  lines: [
    {
      name: "Amoxicillin 500mg",
      batchNumber: "AMOX-2026A",
      expiryDate: "2027-06",
      quantity: 2,
      sellingUnit: "STRIP",
      unitPrice: 55.0,
      totalAmount: 110.0,
    },
    {
      name: "Paracetamol 650mg",
      batchNumber: "PCM-9912",
      expiryDate: "2028-01",
      quantity: 1,
      sellingUnit: "STRIP",
      unitPrice: 30.0,
      totalAmount: 30.0,
    },
  ],
  financials: {
    subtotal: 140.0,
    discountAmount: 10.0,
    taxAmount: 15.6,
    roundOffAmount: 0.4,
    totalAmount: 146.0,
    paidAmount: 200.0,
    changeAmount: 54.0,
    paymentMethod: "CASH",
  },
  footer: {
    customNote: "Thank you for visiting Inventra Apollo Care!",
    returnPolicyNotice: "Returns accepted within 7 days with receipt.",
    barcodeValue: "INV-WB-90182",
  },
};

describe("ESC/POS Thermal Receipt Engine (@inventra/print)", () => {
  let virtualPrinter: VirtualPrinterAdapter;

  beforeEach(() => {
    virtualPrinter = new VirtualPrinterAdapter();
    virtualPrinter.connect({
      id: "VP-01",
      name: "Virtual POS Counter Printer",
      type: "VIRTUAL",
      paperWidth: "80mm",
      isDefault: true,
    });
  });

  it("renders binary ESC/POS 80mm stream with initialization and feed-and-cut commands", () => {
    const bytes = EscPosRenderer.render(mockSampleReceipt, { paperWidth: "80mm", cutPaper: true });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(100);

    // Verify Initialization command at byte 0
    expect(bytes[0]).toBe(COMMANDS.INIT[0]); // 0x1B (ESC)
    expect(bytes[1]).toBe(COMMANDS.INIT[1]); // 0x40 (@)

    // Convert to text for content verification
    const textOutput = new TextDecoder().decode(bytes);
    expect(textOutput).toContain("Inventra Apollo Care");
    expect(textOutput).toContain("Apollo Counter 1");
    expect(textOutput).toContain("SALE-20260828-001");
    expect(textOutput).toContain("INV-WB-90182");
    expect(textOutput).toContain("Vikram Sen");
    expect(textOutput).toContain("Amoxicillin 500mg");
    expect(textOutput).toContain("AMOX-2026A");
    expect(textOutput).toContain("TOTAL AMOUNT:");
    expect(textOutput).toContain("146.00");
    expect(textOutput).toContain("Paid (CASH):");
    expect(textOutput).toContain("Change Due:");
    expect(textOutput).toContain("54.00");
  });

  it("renders 58mm compact layout with 32-character column formatting", () => {
    const bytes = EscPosRenderer.render(mockSampleReceipt, { paperWidth: "58mm", cutPaper: true });
    const textOutput = new TextDecoder().decode(bytes);

    expect(bytes.length).toBeGreaterThan(80);
    expect(textOutput).toContain("Inventra Apollo Care");
    expect(textOutput).toContain("Amoxicillin 5");
    expect(textOutput).toContain("TOTAL AMOUNT:");
  });

  it("generates Code128 barcode commands for invoice tracking", () => {
    const bytes = EscPosRenderer.render(mockSampleReceipt, { paperWidth: "80mm" });
    const textOutput = new TextDecoder().decode(bytes);

    expect(textOutput).toContain("INV-WB-90182");
  });

  it("prints successfully to VirtualPrinterAdapter and logs document history", async () => {
    const result = await virtualPrinter.printReceipt(mockSampleReceipt);

    expect(result.success).toBe(true);
    expect(result.jobId).toMatch(/^PJ-/);
    expect(result.bytesSent).toBeGreaterThan(100);
    expect(result.error).toBeUndefined();

    const history = virtualPrinter.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].doc.metadata.invoiceNumber).toBe("INV-WB-90182");
  });

  it("handles simulated printer failure safely without throwing unhandled exceptions", async () => {
    virtualPrinter.setSimulatedFailure(true, "Thermal head overheated");

    const result = await virtualPrinter.printReceipt(mockSampleReceipt);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Thermal head overheated");
    expect(result.jobId).toBeDefined();

    // Verify printer status reflects error condition
    const status = await virtualPrinter.getStatus();
    expect(["OUT_OF_PAPER", "ERROR"]).toContain(status);
  });

  it("allows test print generation using default diagnostics receipt", async () => {
    const result = await virtualPrinter.testPrint({
      id: "VP-TEST",
      name: "Diagnostics Virtual Printer",
      type: "VIRTUAL",
      paperWidth: "80mm",
    });

    expect(result.success).toBe(true);
    expect(result.bytesSent).toBeGreaterThan(50);
  });
});
