import { DosageForm } from "./catalog";

export type SaleStatus = "COMPLETED" | "VOIDED" | "PARTIALLY_RETURNED" | "FULLY_RETURNED";
export type PaymentMethod = "CASH" | "UPI" | "CARD" | "CREDIT" | "OTHER";
export type PaymentStatus = "SUCCESS" | "PENDING" | "FAILED" | "REFUNDED";

export interface SaleLineBatchAllocationResponse {
  id: string;
  batchId: string;
  productId: string;
  batchNumber: string;
  expiryDate: string;
  allocatedBaseQuantity: number;
  unitCost: number;
  mrp: number;
  sellingPrice: number;
}

export interface SaleLineResponse {
  id: string;
  productId: string;
  lineNumber: number;
  productName: string;
  genericName?: string;
  dosageForm?: string;
  strength?: string;
  sellingUnit: string;
  conversionFactor: number;
  quantity: number;
  baseQuantity: number;
  unitPrice: number;
  grossAmount: number;
  discountPercentage: number;
  discountAmount: number;
  allocatedBillDiscount?: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  returnedQuantity: number;
  allocations: SaleLineBatchAllocationResponse[];
}

export interface SalePaymentResponse {
  id: string;
  paymentMethod: PaymentMethod;
  amount: number;
  tenderedAmount?: number;
  changeAmount?: number;
  transactionReference?: string;
  status: PaymentStatus;
  paidAt?: string;
  notes?: string;
}

export interface SaleResponse {
  id: string;
  businessId: string;
  storeId: string;
  saleNumber: string;
  invoiceNumber: string;
  status: SaleStatus;
  saleDate: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  prescriptionRequired: boolean;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  roundOffAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  cashierId: string;
  deviceId?: string;
  idempotencyKey?: string;
  notes?: string;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  lines: SaleLineResponse[];
  payments: SalePaymentResponse[];
  createdAt: string;
}

export interface SaleSummaryResponse {
  id: string;
  saleNumber: string;
  invoiceNumber: string;
  storeId: string;
  status: SaleStatus;
  saleDate: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  totalAmount: number;
  paidAmount: number;
  createdAt: string;
}

export interface CreateSaleLineRequest {
  productId: string;
  batchId?: string;
  sellingUnit?: string;
  quantity: number;
  discountPercentage?: number;
}

export interface CreateSalePaymentRequest {
  paymentMethod: PaymentMethod;
  amount: number;
  tenderedAmount?: number;
  transactionReference?: string;
  notes?: string;
}

export interface CreateSaleRequest {
  storeId: string;
  saleDate?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  discountAmount?: number;
  roundOffAmount?: number;
  idempotencyKey?: string;
  notes?: string;
  lines: CreateSaleLineRequest[];
  payments: CreateSalePaymentRequest[];
}

export interface PosProductSearchResponse {
  id: string;
  productId?: string;
  name: string;
  genericName?: string;
  brandName?: string;
  manufacturer?: string;
  dosageForm: DosageForm;
  strength?: string;
  baseUnit: string;
  sellingUnit: string;
  unitsPerSellingUnit: number;
  taxRate: number;
  isTaxInclusive: boolean;
  prescriptionRequired: boolean;
  currentStock: number;
  isBatchTracked: boolean;
  sellingPrice?: number;
  mrp?: number;
  fefoBatchNumber?: string;
  fefoExpiryDate?: string;
  fefoSellingPrice?: number;
  fefoMrp?: number;
}

export interface VoidSaleRequest {
  reason: string;
}

export interface SaleFilterParams {
  storeId?: string;
  status?: SaleStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

export type StockCondition = "RESTOCKABLE" | "DAMAGED" | "EXPIRED" | "QUARANTINE";

export interface CreateSaleReturnBatchAllocationRequest {
  saleLineBatchAllocationId: string;
  returnedBaseQuantity: number;
  stockCondition?: StockCondition;
}

export interface CreateSaleReturnLineRequest {
  saleLineId: string;
  quantity: number;
  batchAllocations?: CreateSaleReturnBatchAllocationRequest[];
}

export interface CreateSaleRefundRequest {
  refundMethod: PaymentMethod;
  amount: number;
  transactionReference?: string;
  notes?: string;
}

export interface CreateSaleReturnRequest {
  returnDate?: string;
  reason: string;
  idempotencyKey?: string;
  lines: CreateSaleReturnLineRequest[];
  refunds: CreateSaleRefundRequest[];
}

export interface SaleReturnLineBatchAllocationResponse {
  id: string;
  saleLineBatchAllocationId: string;
  batchId: string;
  productId: string;
  returnedBaseQuantity: number;
  stockCondition: StockCondition;
}

export interface SaleReturnLineResponse {
  id: string;
  saleLineId: string;
  productId: string;
  lineNumber: number;
  quantity: number;
  baseQuantity: number;
  unitRefundPrice: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  allocations: SaleReturnLineBatchAllocationResponse[];
}

export interface SaleRefundResponse {
  id: string;
  refundMethod: PaymentMethod;
  amount: number;
  transactionReference?: string;
  notes?: string;
  refundedAt: string;
}

export interface SaleReturnResponse {
  id: string;
  businessId: string;
  storeId: string;
  saleId: string;
  returnNumber: string;
  status: string;
  returnDate: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  roundOffAmount: number;
  totalRefundAmount: number;
  reason: string;
  returnedBy: string;
  deviceId?: string;
  idempotencyKey?: string;
  createdAt: string;
  lines: SaleReturnLineResponse[];
  refunds: SaleRefundResponse[];
}

export interface ReceiptLineItem {
  name: string;
  batch?: string;
  expiry?: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  total: number;
}

export interface ReceiptResponse {
  storeId?: string;
  pharmacyName: string;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  drugLicenseNumber?: string;
  gstin?: string;
  saleNumber: string;
  invoiceNumber: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  cashierName: string;
  items: ReceiptLineItem[];
  subtotal: number;
  discount: number;
  tax: number;
  roundOff: number;
  total: number;
  paid: number;
  change: number;
  paymentMethod: string;
  footerNote?: string;
}

export interface InvoiceResponse {
  saleId: string;
  storeId: string;
  invoiceNumber: string;
  saleNumber: string;
  invoiceDate: string;
  customerName?: string;
  customerPhone?: string;
  prescriptionRequired: boolean;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  roundOffAmount: number;
  totalAmount: number;
  paidAmount: number;
  cashierId: string;
  createdAt: string;
  lines: SaleLineResponse[];
  payments: SalePaymentResponse[];
}
