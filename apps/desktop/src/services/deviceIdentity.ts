/**
 * Persistent Device Identity Manager for Desktop Terminals.
 * Generates unique device identity on initial setup and persists across app restarts.
 */

const DEVICE_ID_KEY = "inventra_desktop_device_id";
const DEVICE_NAME_KEY = "inventra_desktop_device_name";
const DEVICE_REVOKED_KEY = "inventra_desktop_device_revoked";

export class DeviceIdentityService {
  public static getDeviceId(): string {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      // Generate standard RFC 4122 v4 UUID format
      deviceId = "DEV-" + crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  public static getDeviceName(): string {
    let name = localStorage.getItem(DEVICE_NAME_KEY);
    if (!name) {
      name = "Counter Terminal 1";
      localStorage.setItem(DEVICE_NAME_KEY, name);
    }
    return name;
  }

  public static setDeviceName(name: string): void {
    localStorage.setItem(DEVICE_NAME_KEY, name);
  }

  public static isRevoked(): boolean {
    return localStorage.getItem(DEVICE_REVOKED_KEY) === "true";
  }

  public static markRevoked(reason?: string): void {
    localStorage.setItem(DEVICE_REVOKED_KEY, "true");
    if (reason) {
      localStorage.setItem("inventra_desktop_revocation_reason", reason);
    }
  }

  public static clearRevocation(): void {
    localStorage.removeItem(DEVICE_REVOKED_KEY);
    localStorage.removeItem("inventra_desktop_revocation_reason");
  }
}
