import type { PrinterDevice } from "@inventra/print";

export interface IWindowAdapter {
  isFrameless: boolean;
  minimize?: () => Promise<void>;
  maximize?: () => Promise<void>;
  close?: () => Promise<void>;
  isMaximized?: () => Promise<boolean>;
}

export interface IStorageAdapter {
  isOfflineStorageAvailable: boolean;
  getDriver?: () => any;
}

export interface IPrintAdapter {
  isThermalPrintingAvailable: boolean;
  getPrinterDevice?: () => PrinterDevice;
  setPrinterDevice?: (device: PrinterDevice) => void;
  printReceipt?: (receiptData: any) => Promise<{ success: boolean; message?: string }>;
}

export interface IScannerAdapter {
  isHardwareScannerSupported: boolean;
}

export interface ISyncAdapter {
  isSyncSupported: boolean;
  getPendingCount?: () => Promise<number>;
  getConflictCount?: () => Promise<number>;
  triggerSync?: () => Promise<void>;
}

export interface IDeviceIdentityAdapter {
  getDeviceId: () => string;
  getDeviceName: () => string;
  isRevoked: () => boolean;
}

export interface IRuntimeAdapter {
  platform: "web" | "desktop" | "mobile";
  isOfflineCapable: boolean;
  window: IWindowAdapter;
  storage: IStorageAdapter;
  printing: IPrintAdapter;
  scanner: IScannerAdapter;
  sync?: ISyncAdapter;
  deviceIdentity?: IDeviceIdentityAdapter;
}
