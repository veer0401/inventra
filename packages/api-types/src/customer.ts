export type CustomerStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface CustomerStatisticsResponse {
  totalSalesCount: number;
  totalSpendAmount: number;
  totalReturnsCount: number;
  totalRefundAmount: number;
  lastPurchaseDate?: string | null;
}

export interface CustomerResponse {
  id: string;
  businessId: string;
  customerCode: string;
  fullName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  gstin?: string | null;
  notes?: string | null;
  status: CustomerStatus;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  statistics?: CustomerStatisticsResponse;
}

export interface CustomerSummaryResponse {
  id: string;
  customerCode: string;
  fullName: string;
  phone: string;
  email?: string | null;
  status: CustomerStatus;
  createdAt: string;
}

export interface CreateCustomerRequest {
  customerCode?: string;
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  notes?: string;
}

export interface UpdateCustomerRequest {
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  notes?: string;
  status?: CustomerStatus;
}

export interface CustomerFilterParams {
  search?: string;
  status?: CustomerStatus;
  page?: number;
  size?: number;
  sort?: string;
}
