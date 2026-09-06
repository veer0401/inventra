import { apiClient } from "./api";
import type {
  ReportSummaryResponse,
  SalesReportResponse,
  InventoryValuationReportResponse,
  ExpiryRiskReportResponse,
  ProductVelocityReportResponse,
  ScheduleHRegisterResponse,
} from "@inventra/api-types";

export interface ReportFilterParams {
  storeId?: string;
  startDate?: string;
  endDate?: string;
  thresholdDays?: number;
}

export const reportApi = {
  /**
   * High-level operational KPI summary
   */
  async getSummary(params?: ReportFilterParams): Promise<ReportSummaryResponse> {
    const res = await apiClient.get<ReportSummaryResponse>("/api/v1/reports/summary", {
      params: {
        storeId: params?.storeId,
        startDate: params?.startDate,
        endDate: params?.endDate,
      },
    });
    return res.data;
  },

  /**
   * Sales & Tax GST report breakdown
   */
  async getSalesReport(params?: ReportFilterParams): Promise<SalesReportResponse> {
    const res = await apiClient.get<SalesReportResponse>("/api/v1/reports/sales", {
      params: {
        storeId: params?.storeId,
        startDate: params?.startDate,
        endDate: params?.endDate,
      },
    });
    return res.data;
  },

  /**
   * Inventory Valuation (Cost vs Retail, Potential Gross Margin)
   */
  async getInventoryValuation(params?: { storeId?: string }): Promise<InventoryValuationReportResponse> {
    const res = await apiClient.get<InventoryValuationReportResponse>("/api/v1/reports/inventory-valuation", {
      params: {
        storeId: params?.storeId,
      },
    });
    return res.data;
  },

  /**
   * Expiry Risk classification (30/60/90 days & expired)
   */
  async getExpiryRisk(params?: { storeId?: string; thresholdDays?: number }): Promise<ExpiryRiskReportResponse> {
    const res = await apiClient.get<ExpiryRiskReportResponse>("/api/v1/reports/expiry-risk", {
      params: {
        storeId: params?.storeId,
        thresholdDays: params?.thresholdDays,
      },
    });
    return res.data;
  },

  /**
   * Product velocity analysis (Fast and slow movers)
   */
  async getProductVelocity(params?: ReportFilterParams): Promise<ProductVelocityReportResponse> {
    const res = await apiClient.get<ProductVelocityReportResponse>("/api/v1/reports/product-velocity", {
      params: {
        storeId: params?.storeId,
        startDate: params?.startDate,
        endDate: params?.endDate,
      },
    });
    return res.data;
  },

  /**
   * Schedule H / Rx Pharmacy Statutory Compliance Register
   */
  async getScheduleHRegister(params?: ReportFilterParams): Promise<ScheduleHRegisterResponse> {
    const res = await apiClient.get<ScheduleHRegisterResponse>("/api/v1/reports/schedule-h", {
      params: {
        storeId: params?.storeId,
        startDate: params?.startDate,
        endDate: params?.endDate,
      },
    });
    return res.data;
  },
};
