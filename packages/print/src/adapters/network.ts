import type { ReceiptDocument, PrintFormattingOptions } from "../models/receipt";
import type { IPrinterAdapter, PrinterDevice, PrintResult, PrinterType } from "./types";
import { EscPosRenderer } from "../renderer/escpos";

export class NetworkPrinterAdapter implements IPrinterAdapter {
  public readonly type: PrinterType = "NETWORK";
  private connected = false;
  private currentDevice: PrinterDevice | null = null;

  public async connect(device: PrinterDevice): Promise<boolean> {
    this.currentDevice = device;
    this.connected = Boolean(device.address);
    return this.connected;
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
    this.currentDevice = null;
  }

  public async printReceipt(doc: ReceiptDocument, options?: PrintFormattingOptions): Promise<PrintResult> {
    const jobId = "NET-" + Math.random().toString(36).substring(2, 9).toUpperCase();
    const timestamp = new Date().toISOString();

    if (!this.connected || !this.currentDevice?.address) {
      return {
        success: false,
        jobId,
        error: "Network thermal printer host/port not configured",
        timestamp,
      };
    }

    try {
      const paperWidth = options?.paperWidth || this.currentDevice.paperWidth || "80mm";
      const bytes = EscPosRenderer.render(doc, { ...options, paperWidth });

      if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        const invoke = (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI_INTERNALS__?.invoke;
        if (invoke) {
          await invoke("plugin:printer|print_tcp", {
            address: this.currentDevice.address, // e.g. "192.168.1.100:9100"
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
        error: err.message || "Failed to send raw stream to network printer",
        timestamp,
      };
    }
  }

  public async testPrint(device: PrinterDevice): Promise<PrintResult> {
    const testDoc: ReceiptDocument = {
      header: {
        pharmacyName: "INVENTRA NETWORK TEST",
        storeName: device.name,
      },
      metadata: {
        saleNumber: "TEST-NET-01",
        invoiceNumber: "INV-NET-01",
        date: new Date().toISOString().split("T")[0],
        cashierName: "Network Diagnostics",
      },
      lines: [
        {
          name: "TCP/IP Direct Comm Check",
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
        paymentMethod: "RAW_TCP",
      },
      footer: {
        customNote: `Address: ${device.address || "192.168.1.100:9100"}`,
        returnPolicyNotice: "Network Thermal Printer Operational.",
      },
    };

    return this.printReceipt(testDoc, { paperWidth: device.paperWidth });
  }

  public async getStatus(): Promise<"READY" | "BUSY" | "OUT_OF_PAPER" | "OFFLINE" | "ERROR"> {
    return this.connected ? "READY" : "OFFLINE";
  }
}
