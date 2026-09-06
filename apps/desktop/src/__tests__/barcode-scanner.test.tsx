import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";

function TestScannerComponent({ onScan, maxInterKeyDelayMs }: { onScan: (code: string) => void; maxInterKeyDelayMs?: number }) {
  useBarcodeScanner({ onScan, maxInterKeyDelayMs });
  return <div data-testid="scanner-test" />;
}

describe("Hardware Barcode Scanner Buffer Hook (@inventra/desktop)", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  it("identifies rapid keystroke bursts and invokes onScan on Enter", async () => {
    const onScan = vi.fn();
    const root = createRoot(container);

    await act(async () => {
      root.render(<TestScannerComponent onScan={onScan} maxInterKeyDelayMs={40} />);
    });

    const barcodeChars = ["8", "9", "0", "1", "2", "3", "4", "5"];

    await act(async () => {
      for (const char of barcodeChars) {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: char, bubbles: true })
        );
      }
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
    });

    expect(onScan).toHaveBeenCalledWith("89012345");
  });

  it("ignores single character keypresses below minLength threshold", async () => {
    const onScan = vi.fn();
    const root = createRoot(container);

    await act(async () => {
      root.render(<TestScannerComponent onScan={onScan} maxInterKeyDelayMs={20} />);
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "A", bubbles: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(onScan).not.toHaveBeenCalled();
  });
});
