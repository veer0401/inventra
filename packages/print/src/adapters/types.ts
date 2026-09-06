import type { ReceiptDocument, PrintFormattingOptions } from "../models/receipt";

export type PrinterType = "VIRTUAL" | "USB" | "NETWORK" | "SERIAL";

export type PrintJobStatus = "QUEUED" | "PRINTING" | "PRINTED" | "FAILED";

export interface PrinterDevice {
  id: string;
  name: string;
  type: PrinterType;
  address?: string; // USB path, IP:Port, COM port
  paperWidth: "80mm" | "58mm";
  isDefault?: boolean;
}

export interface PrintResult {
  success: boolean;
  jobId: string;
  error?: string;
  bytesSent?: number;
  timestamp: string;
}

export interface IPrinterAdapter {
  readonly type: PrinterType;
  connect(device: PrinterDevice): Promise<boolean>;
  disconnect(): Promise<void>;
  printReceipt(doc: ReceiptDocument, options?: PrintFormattingOptions): Promise<PrintResult>;
  testPrint(device: PrinterDevice): Promise<PrintResult>;
  getStatus(): Promise<"READY" | "BUSY" | "OUT_OF_PAPER" | "OFFLINE" | "ERROR">;
}
