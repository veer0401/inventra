import { apiClient } from "./api";
import type {
  Page,
  CustomerResponse,
  CustomerSummaryResponse,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerFilterParams,
  SaleResponse,
  SaleReturnResponse,
} from "@inventra/api-types";

export const customerApi = {
  async listCustomers(params?: CustomerFilterParams): Promise<Page<CustomerSummaryResponse>> {
    const res = await apiClient.get<Page<CustomerSummaryResponse>>("/api/v1/customers", {
      params: {
        search: params?.search,
        status: params?.status,
        page: params?.page,
        size: params?.size,
        sort: params?.sort,
      },
    });
    return res.data;
  },

  async searchCustomers(q: string): Promise<CustomerSummaryResponse[]> {
    const res = await apiClient.get<Page<CustomerSummaryResponse>>("/api/v1/customers/search", {
      params: { q },
    });
    return res.data.content;
  },

  async getCustomer(id: string): Promise<CustomerResponse> {
    const res = await apiClient.get<CustomerResponse>(`/api/v1/customers/${id}`);
    return res.data;
  },

  async createCustomer(data: CreateCustomerRequest): Promise<CustomerResponse> {
    const res = await apiClient.post<CustomerResponse>("/api/v1/customers", data);
    return res.data;
  },

  async updateCustomer(id: string, data: UpdateCustomerRequest): Promise<CustomerResponse> {
    const res = await apiClient.put<CustomerResponse>(`/api/v1/customers/${id}`, data);
    return res.data;
  },

  async getCustomerSales(id: string, page = 0, size = 20): Promise<Page<SaleResponse>> {
    const res = await apiClient.get<Page<SaleResponse>>(`/api/v1/customers/${id}/sales`, {
      params: { page, size },
    });
    return res.data;
  },

  async getCustomerReturns(id: string, page = 0, size = 20): Promise<Page<SaleReturnResponse>> {
    const res = await apiClient.get<Page<SaleReturnResponse>>(`/api/v1/customers/${id}/returns`, {
      params: { page, size },
    });
    return res.data;
  },
};
