import { useEffect, useRef, useCallback } from "react";

export interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  maxInterKeyDelayMs?: number; // Default 40ms for hardware laser/2D imagers
  minLength?: number; // Default 3 characters
  enabled?: boolean;
}

export function useBarcodeScanner({
  onScan,
  maxInterKeyDelayMs = 40,
  minLength = 3,
  enabled = true,
}: BarcodeScannerOptions) {
  const bufferRef = useRef<string[]>([]);
  const lastKeyTimeRef = useRef<number>(0);
  const timeoutIdRef = useRef<number | null>(null);

  const resetBuffer = useCallback(() => {
    bufferRef.current = [];
    lastKeyTimeRef.current = 0;
    if (timeoutIdRef.current) {
      window.clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  const playBeep = useCallback((success: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (success) {
        osc.frequency.setValueAtTime(1800, audioCtx.currentTime); // High pitch crisp beep
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } else {
        osc.frequency.setValueAtTime(400, audioCtx.currentTime); // Low error buzz
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.18);
      }
    } catch {
      // AudioContext unavailable in headless test environment
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = performance.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Enter or Tab triggers scanner submission if buffer is valid burst
      if (e.key === "Enter" || e.key === "Tab") {
        if (bufferRef.current.length >= minLength) {
          const barcode = bufferRef.current.join("").trim();
          if (barcode.length >= minLength) {
            e.preventDefault();
            e.stopPropagation();
            onScan(barcode);
            playBeep(true);
          }
        }
        resetBuffer();
        return;
      }

      // Single printable character
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // If delay is longer than max threshold, it's human typing — reset buffer
        if (bufferRef.current.length > 0 && timeSinceLastKey > maxInterKeyDelayMs) {
          bufferRef.current = [];
        }

        bufferRef.current.push(e.key);

        // Auto clear after inactivity
        if (timeoutIdRef.current) {
          window.clearTimeout(timeoutIdRef.current);
        }
        timeoutIdRef.current = window.setTimeout(() => {
          bufferRef.current = [];
        }, 150);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      resetBuffer();
    };
  }, [enabled, maxInterKeyDelayMs, minLength, onScan, playBeep, resetBuffer]);

  return { playBeep, resetBuffer };
}
