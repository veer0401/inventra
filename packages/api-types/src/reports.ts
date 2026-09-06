export interface ReportSummaryResponse {
  totalSalesRevenue: number;
  totalSalesCount: number;
  averageOrderValue: number;
  totalItemsSold: number;
  totalTaxCollected: number;
  totalDiscountGiven: number;
  totalReturnsCount: number;
  totalRefundAmount: number;
  inventoryCostValuation: number;
  inventoryRetailValuation: number;
  totalActiveBatches: number;
  nearExpiryBatchCount: number;
  expiredBatchCount: number;
  lowStockItemCount: number;
}

export interface DailySalesPointDto {
  date: string;
  count: number;
  revenue: number;
  tax: number;
  discount: number;
}

export interface SalesReportResponse {
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalSalesCount: number;
  totalTax: number;
  totalDiscount: number;
  cashAmount: number;
  cardAmount: number;
  upiAmount: number;
  otherAmount: number;
  dailyBreakdown: DailySalesPointDto[];
}

export interface CategoryValuationDto {
  categoryName: string;
  productCount: number;
  totalQuantity: number;
  valuationAtCost: number;
  valuationAtRetail: number;
}

export interface InventoryValuationReportResponse {
  totalProducts: number;
  inStockProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalQuantityOnHand: number;
  valuationAtCost: number;
  valuationAtRetail: number;
  potentialProfit: number;
  profitMarginPercent: number;
  categoryBreakdown: CategoryValuationDto[];
}

export interface ExpiryBatchDto {
  batchId: string;
  productId: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  totalCostValue: number;
  riskLevel: "EXPIRED" | "CRITICAL_30" | "WARNING_60" | "WARNING_90";
  daysUntilExpiry: number;
}

export interface ExpiryRiskReportResponse {
  critical30DaysCount: number;
  critical30DaysValue: number;
  warning60DaysCount: number;
  warning60DaysValue: number;
  warning90DaysCount: number;
  warning90DaysValue: number;
  expiredCount: number;
  expiredValue: number;
  batches: ExpiryBatchDto[];
}

export interface ProductVelocityItemDto {
  productId: string;
  productName: string;
  sku: string;
  totalQuantitySold: number;
  totalRevenue: number;
  salesCount: number;
  currentStock: number;
}

export interface ProductVelocityReportResponse {
  fastMovers: ProductVelocityItemDto[];
  slowMovers: ProductVelocityItemDto[];
  nonMovingItems: ProductVelocityItemDto[];
}

export interface ScheduleHEntryDto {
  saleId: string;
  invoiceNumber: string;
  saleDate: string;
  customerName: string;
  customerPhone: string;
  doctorName: string;
  doctorRegistrationNumber: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  scheduleType: string;
}

export interface ScheduleHRegisterResponse {
  entries: ScheduleHEntryDto[];
  totalRecords: number;
}
