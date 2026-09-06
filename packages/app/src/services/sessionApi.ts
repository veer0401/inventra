import { apiClient } from "./api";

export interface UserSession {
  id: string;
  deviceType: string;
  browser: string;
  operatingSystem: string;
  ipAddress: string;
  location: string;
  createdAt: string;
  lastActiveAt: string;
  current: boolean;
  active: boolean;
}

export const sessionApi = {
  async listSessions(): Promise<UserSession[]> {
    const res = await apiClient.get<UserSession[]>("/api/v1/auth/sessions");
    return res.data || [];
  },

  async revokeSession(sessionId: string): Promise<void> {
    await apiClient.post(`/api/v1/auth/sessions/${sessionId}/revoke`);
  },

  async revokeOtherSessions(): Promise<void> {
    await apiClient.post("/api/v1/auth/sessions/revoke-others");
  },

  async revokeAllSessions(): Promise<void> {
    await apiClient.post("/api/v1/auth/logout-all");
  },
};
