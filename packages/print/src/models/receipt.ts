/**
 * Canonical Receipt Document Model for Inventra Pharmacy ERP.
 * Shared between screen preview (HTML/React) and thermal ESC/POS byte renderer.
 */

export interface ReceiptHeader {
  pharmacyName: string;
  storeName: string;
  address?: string;
  phone?: string;
  gstin?: string;
  drugLicenseNumber?: string;
}

export interface ReceiptMetadata {
  saleNumber: string;
  invoiceNumber: string;
  date: string;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
}

export interface ReceiptLineItem {
  name: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  sellingUnit: string;
  unitPrice: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount: number;
}

export interface ReceiptFinancials {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  roundOffAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: string;
}

export interface ReceiptFooter {
  customNote?: string;
  returnPolicyNotice?: string;
  barcodeValue?: string;
  qrCodeValue?: string;
}

export interface ReceiptDocument {
  header: ReceiptHeader;
  metadata: ReceiptMetadata;
  lines: ReceiptLineItem[];
  financials: ReceiptFinancials;
  footer: ReceiptFooter;
}

export type PaperWidth = "80mm" | "58mm";

export interface PrintFormattingOptions {
  paperWidth: PaperWidth;
  characterSet?: string;
  feedLines?: number;
  cutPaper?: boolean;
  openDrawer?: boolean;
}
