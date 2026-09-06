import { apiClient } from "../stores/authStore";
import type {
  ShortcutProfile,
  CreateShortcutProfileRequest,
  UpdateShortcutProfileRequest,
} from "@inventra/api-types";

export const shortcutApi = {
  async listProfiles(): Promise<ShortcutProfile[]> {
    const response = await apiClient.get<ShortcutProfile[]>(
      "/api/v1/users/me/shortcut-profiles"
    );
    return response.data;
  },

  async getProfile(id: string): Promise<ShortcutProfile> {
    const response = await apiClient.get<ShortcutProfile>(
      `/api/v1/users/me/shortcut-profiles/${id}`
    );
    return response.data;
  },

  async createProfile(data: CreateShortcutProfileRequest): Promise<ShortcutProfile> {
    const response = await apiClient.post<ShortcutProfile>(
      "/api/v1/users/me/shortcut-profiles",
      data
    );
    return response.data;
  },

  async updateProfile(id: string, data: UpdateShortcutProfileRequest): Promise<ShortcutProfile> {
    const response = await apiClient.patch<ShortcutProfile>(
      `/api/v1/users/me/shortcut-profiles/${id}`,
      data
    );
    return response.data;
  },

  async deleteProfile(id: string): Promise<void> {
    await apiClient.delete<void>(
      `/api/v1/users/me/shortcut-profiles/${id}`
    );
  },

  async activateProfile(id: string): Promise<ShortcutProfile> {
    const response = await apiClient.post<ShortcutProfile>(
      `/api/v1/users/me/shortcut-profiles/${id}/activate`
    );
    return response.data;
  },

  async resetProfile(id: string): Promise<ShortcutProfile> {
    const response = await apiClient.post<ShortcutProfile>(
      `/api/v1/users/me/shortcut-profiles/${id}/reset`
    );
    return response.data;
  },
};
