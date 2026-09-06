import { apiClient } from "./api";
import type {
  DeviceResponse,
  RegisterDeviceRequest,
} from "@inventra/api-types";

export const deviceApi = {
  async listDevices(): Promise<DeviceResponse[]> {
    const res = await apiClient.get<DeviceResponse[]>("/api/v1/devices");
    return res.data;
  },

  async registerDevice(data: RegisterDeviceRequest): Promise<DeviceResponse> {
    const res = await apiClient.post<DeviceResponse>("/api/v1/devices/register", data);
    return res.data;
  },

  async revokeDevice(deviceId: string): Promise<DeviceResponse> {
    const res = await apiClient.post<DeviceResponse>(`/api/v1/devices/${deviceId}/revoke`);
    return res.data;
  },
};
