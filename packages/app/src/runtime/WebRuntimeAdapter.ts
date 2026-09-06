import type { IRuntimeAdapter } from "./types";

export class WebRuntimeAdapter implements IRuntimeAdapter {
  readonly platform = "web" as const;
  readonly isOfflineCapable = false;

  readonly window = {
    isFrameless: false,
  };

  readonly storage = {
    isOfflineStorageAvailable: false,
  };

  readonly printing = {
    isThermalPrintingAvailable: false,
  };

  readonly scanner = {
    isHardwareScannerSupported: false,
  };
}
