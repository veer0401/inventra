import { describe, it, expect, beforeEach } from "vitest";
import { DeviceIdentityService } from "../services/deviceIdentity";

describe("Inventra Desktop Native Shell Configuration (@inventra/desktop)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("generates and persists a stable device identity across app restarts", () => {
    const devId1 = DeviceIdentityService.getDeviceId();
    expect(devId1).toMatch(/^DEV-/);

    // Subsequent retrieval returns the same stable identity
    const devId2 = DeviceIdentityService.getDeviceId();
    expect(devId2).toBe(devId1);
  });

  it("handles device revocation state correctly", () => {
    expect(DeviceIdentityService.isRevoked()).toBe(false);

    DeviceIdentityService.markRevoked("Admin security revocation test");
    expect(DeviceIdentityService.isRevoked()).toBe(true);

    DeviceIdentityService.clearRevocation();
    expect(DeviceIdentityService.isRevoked()).toBe(false);
  });

  it("persists configurable terminal device names", () => {
    expect(DeviceIdentityService.getDeviceName()).toBe("Counter Terminal 1");

    DeviceIdentityService.setDeviceName("Apollo East Counter #3");
    expect(DeviceIdentityService.getDeviceName()).toBe("Apollo East Counter #3");
  });

  it("verifies Desktop runtime adapter provides desktop platform identification and frameless window mode", async () => {
    const { DesktopRuntimeAdapter } = await import("@inventra/app");
    const adapter = new DesktopRuntimeAdapter();

    expect(adapter.platform).toBe("desktop");
    expect(adapter.window.isFrameless).toBe(true);
    expect(adapter.isOfflineCapable).toBe(true);
  });

  it("verifies desktop shared styling pipeline applies CSS custom properties to document.documentElement", async () => {
    const { useThemeStore } = await import("@inventra/app");
    document.documentElement.className = "";
    document.documentElement.removeAttribute("style");

    useThemeStore.getState().resetToDefaults();
    useThemeStore.getState().setMode("dark");
    useThemeStore.getState().setPreset("clinical");

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("clinical");
    expect(document.documentElement.style.getPropertyValue("--primary")).toBeDefined();
    expect(document.documentElement.style.getPropertyValue("--bg-app")).toBeDefined();

    // Verify custom colors
    useThemeStore.getState().setCustomColors("#00AAFF", "#FF00AA");
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("#00AAFF");
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#FF00AA");
  });
});
