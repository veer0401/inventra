export type SupplierType = "MANUFACTURER" | "DISTRIBUTOR" | "WHOLESALER" | "IMPORTER" | "OTHER";
export type SupplierStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";
export type SupplierProductStatus = "ACTIVE" | "INACTIVE" | "DISCONTINUED";

export type PurchaseOrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PARTIALLY_RECEIVED"
  | "FULLY_RECEIVED"
  | "CANCELLED"
  | "CLOSED";

export type GoodsReceiptStatus = "DRAFT" | "POSTED" | "CANCELLED";

export type PurchaseInvoiceStatus = "DRAFT" | "POSTED" | "CANCELLED";

export type InvoiceStatus = "DRAFT" | "POSTED" | "PAID" | "PARTIALLY_PAID" | "VOIDED";

export interface SupplierResponse {
  id: string;
  businessId: string;
  supplierCode: string;
  legalName: string;
  tradeName: string | null;
  supplierType: SupplierType;
  gstin: string | null;
  drugLicenseNumber: string | null;
  pan: string | null;
  email: string | null;
  phoneNumber: string | null;
  contactPersonName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  paymentTermsDays: number;
  creditLimit: number | null;
  status: SupplierStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierRequest {
  supplierCode: string;
  legalName: string;
  tradeName?: string;
  supplierType: SupplierType;
  gstin?: string;
  drugLicenseNumber?: string;
  pan?: string;
  email?: string;
  phoneNumber?: string;
  contactPersonName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  paymentTermsDays?: number;
  creditLimit?: number;
  notes?: string;
}

export interface UpdateSupplierRequest {
  legalName?: string;
  tradeName?: string;
  supplierType?: SupplierType;
  gstin?: string;
  drugLicenseNumber?: string;
  pan?: string;
  email?: string;
  phoneNumber?: string;
  contactPersonName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  paymentTermsDays?: number;
  creditLimit?: number;
  status?: SupplierStatus;
  notes?: string;
}

export interface SupplierProductResponse {
  id: string;
  businessId: string;
  supplierId: string;
  productId: string;
  supplierProductCode: string | null;
  supplierProductName: string | null;
  purchaseUnit: string;
  conversionFactor: number;
  lastPurchasePrice: number | null;
  isPreferred: boolean;
  minOrderQuantity: number | null;
  leadTimeDays: number | null;
  status: SupplierProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierProductRequest {
  productId: string;
  supplierProductCode?: string;
  supplierProductName?: string;
  purchaseUnit: string;
  conversionFactor: number;
  lastPurchasePrice?: number;
  isPreferred?: boolean;
  minOrderQuantity?: number;
  leadTimeDays?: number;
}

export interface GoodsReceiptLineResponse {
  id: string;
  businessId: string;
  goodsReceiptId: string;
  purchaseOrderLineId: string | null;
  productId: string;
  lineNumber: number;
  receivedQuantity: number;
  purchaseUnit: string;
  conversionFactor: number;
  receivedBaseQuantity: number;
  rejectedQuantity: number;
  batchNumber: string | null;
  manufacturingDate: string | null;
  expiryDate: string | null;
  unitCost: number;
  baseUnitCost: number;
  mrp: number | null;
  sellingPrice: number | null;
  taxRate: number | null;
  taxAmount: number | null;
  lineTotal: number;
  inventoryBatchId: string | null;
}

export interface GoodsReceiptSummaryResponse {
  id: string;
  businessId: string;
  storeId: string;
  supplierId: string;
  purchaseOrderId: string | null;
  receiptNumber: string;
  vendorDeliveryNote: string | null;
  receivedDate: string;
  status: GoodsReceiptStatus;
  totalItems: number;
  totalReceivedQuantity: number;
  totalAmount: number;
}

export interface GoodsReceiptResponse {
  id: string;
  businessId: string;
  storeId: string;
  supplierId: string;
  purchaseOrderId: string | null;
  receiptNumber: string;
  vendorDeliveryNote: string | null;
  receivedDate: string;
  status: GoodsReceiptStatus;
  totalItems: number;
  totalReceivedQuantity: number;
  totalAmount: number;
  postedAt: string | null;
  postedBy: string | null;
  notes: string | null;
  idempotencyKey: string | null;
  version: number;
  lines: GoodsReceiptLineResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoodsReceiptLineRequest {
  purchaseOrderLineId?: string;
  productId: string;
  receivedQuantity: number;
  purchaseUnit: string;
  conversionFactor: number;
  rejectedQuantity?: number;
  batchNumber?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  unitCost: number;
  mrp?: number;
  sellingPrice?: number;
  taxRate?: number;
}

export interface CreateGoodsReceiptRequest {
  storeId: string;
  supplierId: string;
  purchaseOrderId?: string;
  vendorDeliveryNote?: string;
  receivedDate?: string;
  notes?: string;
  idempotencyKey?: string;
  lines: CreateGoodsReceiptLineRequest[];
}

export interface UpdateGoodsReceiptRequest {
  vendorDeliveryNote?: string;
  receivedDate?: string;
  notes?: string;
  lines?: CreateGoodsReceiptLineRequest[];
}

export interface CreatePurchaseOrderLineRequest {
  productId: string;
  supplierProductId?: string;
  purchaseUnit: string;
  conversionFactor: number;
  orderedQuantity: number;
  unitCost: number;
  discountPercentage?: number;
  taxRate?: number;
}

export interface CreatePurchaseOrderRequest {
  storeId: string;
  supplierId: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  discountAmount?: number;
  notes?: string;
  lines: CreatePurchaseOrderLineRequest[];
}

export interface UpdatePurchaseOrderRequest {
  expectedDeliveryDate?: string;
  discountAmount?: number;
  notes?: string;
  lines?: CreatePurchaseOrderLineRequest[];
}

export interface CancelOrderRequest {
  reason?: string;
}

export interface PurchaseOrderLineResponse {
  id: string;
  productId: string;
  lineNumber: number;
  orderedQuantity: number;
  receivedQuantity: number;
  purchaseUnit: string;
  conversionFactor: number;
  unitCost: number;
  unitPrice?: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
}

export interface PurchaseOrderSummaryResponse {
  id: string;
  orderNumber: string;
  storeId: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDeliveryDate?: string;
  totalAmount: number;
  createdAt: string;
}

export interface PurchaseOrderResponse {
  id: string;
  businessId: string;
  storeId: string;
  supplierId: string;
  orderNumber: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDeliveryDate?: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  lines: PurchaseOrderLineResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseInvoiceLineResponse {
  id: string;
  goodsReceiptLineId: string | null;
  productId: string;
  lineNumber: number;
  invoicedQuantity: number;
  unitCost: number;
  unitPrice?: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  lineTotal: number;
}

export interface PurchaseInvoiceSummaryResponse {
  id: string;
  businessId: string;
  storeId: string;
  supplierId: string;
  purchaseOrderId: string | null;
  goodsReceiptId: string | null;
  supplierInvoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: PurchaseInvoiceStatus;
  totalAmount: number;
  totalLines: number;
}

export interface PurchaseInvoiceResponse {
  id: string;
  businessId: string;
  storeId: string;
  supplierId: string;
  purchaseOrderId: string | null;
  goodsReceiptId: string | null;
  supplierInvoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  roundOffAmount: number;
  totalAmount: number;
  status: PurchaseInvoiceStatus;
  postedAt: string | null;
  postedBy: string | null;
  notes: string | null;
  version: number;
  lines: PurchaseInvoiceLineResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseInvoiceLineRequest {
  goodsReceiptLineId?: string;
  productId: string;
  invoicedQuantity: number;
  unitPrice: number;
  taxRate?: number;
  discountAmount?: number;
}

export interface CreatePurchaseInvoiceRequest {
  storeId: string;
  supplierId: string;
  purchaseOrderId?: string;
  goodsReceiptId?: string;
  supplierInvoiceNumber: string;
  invoiceDate?: string;
  dueDate?: string;
  discountAmount?: number;
  roundOffAmount?: number;
  notes?: string;
  lines: CreatePurchaseInvoiceLineRequest[];
}

