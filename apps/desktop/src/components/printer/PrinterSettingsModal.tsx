import React, { useState } from "react";
import { X, Printer, Check, Play, AlertCircle } from "lucide-react";
import type { PrinterDevice, PrinterType } from "@inventra/print";
import { VirtualPrinterAdapter } from "@inventra/print";

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDevice: PrinterDevice;
  onSaveDevice: (device: PrinterDevice) => void;
}

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({
  isOpen,
  onClose,
  currentDevice,
  onSaveDevice,
}) => {
  const [name, setName] = useState(currentDevice.name);
  const [type, setType] = useState<PrinterType>(currentDevice.type);
  const [paperWidth, setPaperWidth] = useState<"80mm" | "58mm">(currentDevice.paperWidth);
  const [address, setAddress] = useState(currentDevice.address || "");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleTestPrint = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const virtual = new VirtualPrinterAdapter();
      await virtual.connect({
        id: "DEV-TEST",
        name,
        type,
        paperWidth,
        address,
      });

      const res = await virtual.testPrint({
        id: "DEV-TEST",
        name,
        type,
        paperWidth,
        address,
      });

      if (res.success) {
        setTestResult({
          success: true,
          message: `Test receipt formatted successfully (${res.bytesSent} bytes generated for ${paperWidth}).`,
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || "Failed to generate test print stream",
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Test print failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveDevice({
      ...currentDevice,
      name,
      type,
      paperWidth,
      address,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-card text-foreground w-full max-w-lg rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Thermal Printer Configuration</h2>
              <p className="text-xs text-muted-foreground">ESC/POS Thermal Receipt Hardware</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Printer Name */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Printer Name / Identifier</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. Counter 1 Thermal Printer"
            />
          </div>

          {/* Connection Type */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Connection Transport</label>
            <div className="grid grid-cols-3 gap-2">
              {(["VIRTUAL", "USB", "NETWORK"] as PrinterType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-3 py-2 rounded-lg border text-center font-medium transition-all ${
                    type === t
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t === "VIRTUAL" ? "Virtual / Sim" : t === "USB" ? "USB Direct" : "TCP Network"}
                </button>
              ))}
            </div>
          </div>

          {/* Paper Width */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Thermal Paper Width</label>
            <div className="grid grid-cols-2 gap-2">
              {(["80mm", "58mm"] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setPaperWidth(w)}
                  className={`px-3 py-2 rounded-lg border text-center font-medium transition-all ${
                    paperWidth === w
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {w} {w === "80mm" ? "(Standard 48 cols)" : "(Compact 32 cols)"}
                </button>
              ))}
            </div>
          </div>

          {/* Address / Port Input */}
          {type !== "VIRTUAL" && (
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                {type === "USB" ? "USB Port / Endpoint" : "Network Address (IP:Port)"}
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                placeholder={type === "USB" ? "e.g. USB001" : "e.g. 192.168.1.100:9100"}
              />
            </div>
          )}

          {/* Test Print Result Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2 ${
                testResult.success
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800"
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
              )}
              <div className="text-xs leading-relaxed">{testResult.message}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border bg-muted/30 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestPrint}
            disabled={isTesting}
            className="px-3.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-primary" />
            <span>{isTesting ? "Testing..." : "Test Print"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
