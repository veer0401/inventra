import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ScanBarcode,
  ShoppingCart,
  Boxes,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
} from "@inventra/ui";
import { useWorkspaceStore } from "../../stores/workspaceStore";

export const BarcodeScanModal: React.FC = () => {
  const { isBarcodeModalOpen, setBarcodeModalOpen } = useWorkspaceStore();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedResult, setScannedResult] = useState<{
    code: string;
    status: "found" | "not_found";
    message: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isBarcodeModalOpen) {
      setBarcodeInput("");
      setScannedResult(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isBarcodeModalOpen]);

  const handleScanSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    // Simulate instant barcode lookup
    setScannedResult({
      code,
      status: "found",
      message: `Barcode ${code} matched. Ready for POS dispensing or inventory audit.`,
    });
  };

  const handleNavigateToPos = () => {
    setBarcodeModalOpen(false);
    navigate(`/pos?barcode=${encodeURIComponent(barcodeInput.trim())}`);
  };

  const handleNavigateToInventory = () => {
    setBarcodeModalOpen(false);
    navigate(`/inventory?search=${encodeURIComponent(barcodeInput.trim())}`);
  };

  return (
    <Dialog open={isBarcodeModalOpen} onOpenChange={setBarcodeModalOpen}>
      <div className="w-full max-w-md p-5 bg-surface rounded-lg border border-subtle shadow-xl space-y-4">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 pr-6">
            <div className="p-1.5 rounded-md bg-primary-subtle text-primary border border-primary/20">
              <ScanBarcode className="h-4 w-4" />
            </div>
            <DialogTitle className="text-sm font-semibold text-primary">
              Pharmacy Barcode Scanner
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-secondary">
            Use your barcode scanner gun or type the GTIN / EAN / Batch barcode below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleScanSubmit} className="space-y-3">
          <div className="relative">
            <Input
              ref={inputRef}
              value={barcodeInput}
              onChange={(e) => {
                setBarcodeInput(e.target.value);
                if (scannedResult) setScannedResult(null);
              }}
              placeholder="Scan or enter barcode (e.g. 890123456789)..."
              className="font-mono text-xs pr-20"
              autoComplete="off"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!barcodeInput.trim()}
              className="absolute right-1 top-1 h-6 text-[11px] px-2.5"
            >
              Scan
            </Button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted font-mono">
            <span>Scanner ready: USB / Bluetooth / Keyboard</span>
            <span>Shortcut: Enter</span>
          </div>

          {scannedResult && (
            <div className="p-3 rounded-md bg-surface-muted border border-subtle space-y-2 text-xs">
              <div className="flex items-center gap-2 text-success-fg font-medium">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Product Recognized</span>
              </div>
              <div className="font-mono text-[11px] text-primary bg-surface p-1.5 rounded border border-subtle truncate">
                Barcode: <span className="font-bold">{scannedResult.code}</span>
              </div>
              <p className="text-[11px] text-secondary">{scannedResult.message}</p>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={handleNavigateToPos}
                  className="flex-1 text-xs h-7 flex items-center justify-center gap-1.5"
                >
                  <ShoppingCart className="h-3 w-3" />
                  <span>Dispense in POS</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleNavigateToInventory}
                  className="flex-1 text-xs h-7 flex items-center justify-center gap-1.5"
                >
                  <Boxes className="h-3 w-3" />
                  <span>View in Stock</span>
                </Button>
              </div>
            </div>
          )}
        </form>

        <DialogFooter className="pt-2 border-t border-subtle flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setBarcodeModalOpen(false)}
            className="text-xs h-7"
          >
            Close (Esc)
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
};
