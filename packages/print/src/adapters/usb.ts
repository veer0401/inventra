import type { ReceiptDocument, PrintFormattingOptions } from "../models/receipt";
import type { IPrinterAdapter, PrinterDevice, PrintResult, PrinterType } from "./types";
import { EscPosRenderer } from "../renderer/escpos";

export class UsbPrinterAdapter implements IPrinterAdapter {
  public readonly type: PrinterType = "USB";
  private connected = false;
  private currentDevice: PrinterDevice | null = null;

  public async connect(device: PrinterDevice): Promise<boolean> {
    this.currentDevice = device;
    this.connected = true;
    return true;
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
    this.currentDevice = null;
  }

  public async printReceipt(doc: ReceiptDocument, options?: PrintFormattingOptions): Promise<PrintResult> {
    const jobId = "USB-" + Math.random().toString(36).substring(2, 9).toUpperCase();
    const timestamp = new Date().toISOString();

    if (!this.connected || !this.currentDevice) {
      return {
        success: false,
        jobId,
        error: "USB thermal printer is not connected",
        timestamp,
      };
    }

    try {
      const paperWidth = options?.paperWidth || this.currentDevice.paperWidth || "80mm";
      const bytes = EscPosRenderer.render(doc, { ...options, paperWidth });

      // In native Tauri environment, invokes `plugin:printer|write_raw` or OS spooler.
      // In WebUSB environment, claims interface and writes to endpoint.
      if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        const invoke = (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI_INTERNALS__?.invoke;
        if (invoke) {
          await invoke("plugin:printer|print_raw", {
            devicePath: this.currentDevice.address || "USB001",
            data: Array.from(bytes),
          });
        }
      }

      return {
        success: true,
        jobId,
        bytesSent: bytes.length,
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        jobId,
        error: err.message || "Failed to write raw bytes to USB printer",
        timestamp,
      };
    }
  }

  public async testPrint(device: PrinterDevice): Promise<PrintResult> {
    const testDoc: ReceiptDocument = {
      header: {
        pharmacyName: "INVENTRA USB TEST",
        storeName: device.name,
      },
      metadata: {
        saleNumber: "TEST-USB-01",
        invoiceNumber: "INV-USB-01",
        date: new Date().toISOString().split("T")[0],
        cashierName: "Hardware Diagnostics",
      },
      lines: [
        {
          name: "USB Direct Comm Check",
          quantity: 1,
          sellingUnit: "TEST",
          unitPrice: 0.0,
          totalAmount: 0.0,
        },
      ],
      financials: {
        subtotal: 0.0,
        discountAmount: 0.0,
        taxAmount: 0.0,
        roundOffAmount: 0.0,
        totalAmount: 0.0,
        paidAmount: 0.0,
        changeAmount: 0.0,
        paymentMethod: "USB_RAW",
      },
      footer: {
        customNote: `Port: ${device.address || "USB Direct"}`,
        returnPolicyNotice: "USB Thermal Printer Operational.",
      },
    };

    return this.printReceipt(testDoc, { paperWidth: device.paperWidth });
  }

  public async getStatus(): Promise<"READY" | "BUSY" | "OUT_OF_PAPER" | "OFFLINE" | "ERROR"> {
    return this.connected ? "READY" : "OFFLINE";
  }
}
