import { apiClient } from "./api";
import type {
  StoreCapacityResponse,
  UpdateStoreCapacityRequest,
  AssignStoreUserRequest,
} from "@inventra/api-types";

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  status: string;
  createdAt: string;
}

export const storeStaffApi = {
  async getStoreCapacity(storeId: string): Promise<StoreCapacityResponse> {
    const res = await apiClient.get<StoreCapacityResponse>(`/api/v1/stores/${storeId}/capacity`);
    return res.data;
  },

  async updateStoreCapacity(storeId: string, maxUsers: number): Promise<StoreCapacityResponse> {
    const res = await apiClient.patch<StoreCapacityResponse>(`/api/v1/stores/${storeId}/capacity`, { maxUsers } as UpdateStoreCapacityRequest);
    return res.data;
  },

  async assignUserToStore(storeId: string, data: AssignStoreUserRequest): Promise<any> {
    const res = await apiClient.post<any>(`/api/v1/stores/${storeId}/assignments`, data);
    return res.data;
  },

  async listBusinessStaff(): Promise<UserSummary[]> {
    // In Inventra, staff can be fetched or listed via users / membership endpoint
    try {
      const res = await apiClient.get<UserSummary[]>("/api/v1/users");
      return res.data;
    } catch {
      return [];
    }
  },
};
