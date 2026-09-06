import { apiClient } from "./api";
import type {
  StoreCapacityResponse,
  UpdateStoreCapacityRequest,
  AssignStoreUserRequest,
} from "@inventra/api-types";

export interface StaffMember {
  id: string;
  userId?: string | null;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: string;
  status: string;
  storeId?: string | null;
  storeName?: string | null;
  isPrimaryStore: boolean;
  isInvitation: boolean;
  invitationToken?: string | null;
  activationUrl?: string | null;
  createdAt: string;
}

export interface InviteStaffRequest {
  email: string;
  role: string;
  storeId?: string | null;
}

export interface InviteStaffResponse {
  id: string;
  businessId: string;
  email: string;
  role: string;
  storeId?: string | null;
  status: string;
  expiresAt: string;
  activationToken?: string;
  activationUrl?: string;
}

export interface VerifyInvitationResponse {
  valid: boolean;
  invitationId: string;
  email: string;
  role: string;
  businessId: string;
  businessName: string;
  storeId?: string | null;
  storeName?: string | null;
  expiresAt: string;
}

export interface ActivateStaffRequest {
  token: string;
  fullName: string;
  phoneNumber: string;
  password: string;
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

  async listBusinessStaff(): Promise<StaffMember[]> {
    try {
      const res = await apiClient.get<StaffMember[]>("/api/v1/users");
      return res.data;
    } catch {
      return [];
    }
  },

  async inviteStaff(data: InviteStaffRequest): Promise<InviteStaffResponse> {
    const res = await apiClient.post<InviteStaffResponse>("/api/v1/users/invite", data);
    return res.data;
  },

  async verifyInvitation(token: string): Promise<VerifyInvitationResponse> {
    const res = await apiClient.get<VerifyInvitationResponse>(`/api/v1/auth/invite/verify?token=${encodeURIComponent(token)}`, {
      skipAuth: true,
    });
    return res.data;
  },

  async activateStaff(data: ActivateStaffRequest): Promise<{ message: string }> {
    const res = await apiClient.post<{ message: string }>("/api/v1/auth/invite/activate", data, {
      skipAuth: true,
    });
    return res.data;
  },
};
