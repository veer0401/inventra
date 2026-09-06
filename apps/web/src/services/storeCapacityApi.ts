import { apiClient } from "../stores/authStore";
import type {
  StoreCapacityResponse,
  UpdateStoreCapacityRequest,
  AssignStoreUserRequest,
} from "@inventra/api-types";

export const storeCapacityApi = {
  async getStoreCapacity(storeId: string): Promise<StoreCapacityResponse> {
    const response = await apiClient.get<StoreCapacityResponse>(
      `/api/v1/stores/${storeId}/capacity`
    );
    return response.data;
  },

  async updateStoreCapacity(
    storeId: string,
    data: UpdateStoreCapacityRequest
  ): Promise<StoreCapacityResponse> {
    const response = await apiClient.patch<StoreCapacityResponse>(
      `/api/v1/stores/${storeId}/capacity`,
      data
    );
    return response.data;
  },

  async assignUserToStore(
    storeId: string,
    data: AssignStoreUserRequest
  ): Promise<any> {
    const response = await apiClient.post<any>(
      `/api/v1/stores/${storeId}/assignments`,
      data
    );
    return response.data;
  },
};
