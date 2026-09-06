export type DeviceType = "DESKTOP" | "MOBILE_ANDROID" | "MOBILE_IOS" | "BROWSER";
export type DeviceStatus = "ACTIVE" | "REVOKED" | "SUSPENDED";

export interface RegisterDeviceRequest {
  deviceName: string;
  deviceCode: string;
  deviceType: DeviceType;
  platformOs?: string;
  appVersion?: string;
}

export interface RevokeDeviceRequest {
  reason?: string;
}

export interface DeviceResponse {
  id: string;
  businessId: string;
  userId: string;
  deviceName: string;
  deviceCode: string;
  deviceType: DeviceType;
  platformOs?: string;
  appVersion?: string;
  status: DeviceStatus;
  lastSeenAt: string;
  lastIpAddress?: string;
  registeredAt: string;
  revokedAt?: string;
}
