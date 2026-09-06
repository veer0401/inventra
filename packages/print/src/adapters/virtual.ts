import type { ReceiptDocument, PrintFormattingOptions } from "../models/receipt";
import type { IPrinterAdapter, PrinterDevice, PrintResult, PrinterType } from "./types";
import { EscPosRenderer } from "../renderer/escpos";

export class VirtualPrinterAdapter implements IPrinterAdapter {
  public readonly type: PrinterType = "VIRTUAL";
  private connected = false;
  private currentDevice: PrinterDevice | null = null;
  private printedDocuments: Array<{ doc: ReceiptDocument; bytes: Uint8Array; timestamp: string }> = [];
  private shouldFailNextPrint = false;
  private failureReason = "Simulated printer error: Paper out";
  private lastError: string | null = null;

  public async connect(device: PrinterDevice): Promise<boolean> {
    this.currentDevice = device;
    this.connected = true;
    this.lastError = null;
    return true;
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
    this.currentDevice = null;
    this.lastError = null;
  }

  public setSimulatedFailure(shouldFail: boolean, reason?: string): void {
    this.shouldFailNextPrint = shouldFail;
    if (reason) this.failureReason = reason;
    if (!shouldFail) this.lastError = null;
  }

  public async printReceipt(doc: ReceiptDocument, options?: PrintFormattingOptions): Promise<PrintResult> {
    const jobId = "PJ-" + Math.random().toString(36).substring(2, 9).toUpperCase();
    const timestamp = new Date().toISOString();

    if (!this.connected) {
      this.lastError = "Virtual printer is not connected";
      return {
        success: false,
        jobId,
        error: this.lastError,
        timestamp,
      };
    }

    if (this.shouldFailNextPrint) {
      this.shouldFailNextPrint = false; // Reset trigger
      this.lastError = this.failureReason;
      return {
        success: false,
        jobId,
        error: this.failureReason,
        timestamp,
      };
    }

    this.lastError = null;
    const paperWidth = options?.paperWidth || this.currentDevice?.paperWidth || "80mm";
    const bytes = EscPosRenderer.render(doc, { ...options, paperWidth });

    this.printedDocuments.push({ doc, bytes, timestamp });

    return {
      success: true,
      jobId,
      bytesSent: bytes.length,
      timestamp,
    };
  }

  public async testPrint(device: PrinterDevice): Promise<PrintResult> {
    const testDoc: ReceiptDocument = {
      header: {
        pharmacyName: "INVENTRA TEST PRINT",
        storeName: "Virtual Test Terminal",
        address: "123 Healthcare Boulevard",
        phone: "+91 9876543210",
        gstin: "27AAAAA0000A1Z5",
      },
      metadata: {
        saleNumber: "TEST-0001",
        invoiceNumber: "INV-TEST-0001",
        date: new Date().toISOString().split("T")[0],
        cashierName: "System Diagnostics",
      },
      lines: [
        {
          name: "Test Medication 500mg",
          batchNumber: "TEST-B1",
          expiryDate: "2027-12",
          quantity: 1,
          sellingUnit: "STRIP",
          unitPrice: 100.0,
          totalAmount: 100.0,
        },
      ],
      financials: {
        subtotal: 100.0,
        discountAmount: 0.0,
        taxAmount: 12.0,
        roundOffAmount: 0.0,
        totalAmount: 100.0,
        paidAmount: 100.0,
        changeAmount: 0.0,
        paymentMethod: "TEST",
      },
      footer: {
        customNote: "Printer Hardware Communication: OK",
        returnPolicyNotice: "Thermal print subsystem operational.",
      },
    };

    return this.printReceipt(testDoc, { paperWidth: device.paperWidth });
  }

  public async getStatus(): Promise<"READY" | "BUSY" | "OUT_OF_PAPER" | "OFFLINE" | "ERROR"> {
    if (!this.connected) return "OFFLINE";
    if (this.lastError) return "ERROR";
    if (this.shouldFailNextPrint) return "OUT_OF_PAPER";
    return "READY";
  }

  public getHistory(): Array<{ doc: ReceiptDocument; bytes: Uint8Array; timestamp: string }> {
    return [...this.printedDocuments];
  }

  public clearHistory(): void {
    this.printedDocuments = [];
  }
}
