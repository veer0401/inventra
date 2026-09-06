import type { IRuntimeAdapter } from "./types";
import type { PrinterDevice } from "@inventra/print";

export class DesktopRuntimeAdapter implements IRuntimeAdapter {
  readonly platform = "desktop" as const;
  readonly isOfflineCapable = true;

  private printerDevice: PrinterDevice = {
    id: "THERMAL-01",
    name: "Counter 1 ESC/POS Printer",
    type: "VIRTUAL",
    paperWidth: "80mm",
    isDefault: true,
  };

  readonly window = {
    isFrameless: true,
    minimize: async () => {
      if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().minimize();
      }
    },
    maximize: async () => {
      if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().toggleMaximize();
      }
    },
    close: async () => {
      if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().close();
      }
    },
    isMaximized: async () => {
      if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        return getCurrentWindow().isMaximized();
      }
      return false;
    },
  };

  readonly storage = {
    isOfflineStorageAvailable: true,
  };

  readonly printing = {
    isThermalPrintingAvailable: true,
    getPrinterDevice: () => this.printerDevice,
    setPrinterDevice: (device: PrinterDevice) => {
      this.printerDevice = device;
    },
  };

  readonly scanner = {
    isHardwareScannerSupported: true,
  };

  readonly sync = {
    isSyncSupported: true,
  };

  readonly deviceIdentity = {
    getDeviceId: () => {
      if (typeof window !== "undefined" && localStorage.getItem("inventra_device_id")) {
        return localStorage.getItem("inventra_device_id")!;
      }
      const newId = `DEV-${Date.now().toString(36).toUpperCase()}`;
      if (typeof window !== "undefined") {
        localStorage.setItem("inventra_device_id", newId);
      }
      return newId;
    },
    getDeviceName: () => {
      if (typeof window !== "undefined" && localStorage.getItem("inventra_device_name")) {
        return localStorage.getItem("inventra_device_name")!;
      }
      return "Counter Terminal 1";
    },
    isRevoked: () => {
      if (typeof window !== "undefined") {
        return localStorage.getItem("inventra_device_revoked") === "true";
      }
      return false;
    },
  };
}
