import { describe, it, expect } from "vitest";
import {
  hexToRgb,
  rgbToHex,
  getRelativeLuminance,
  getContrastRatio,
  getBestForeground,
  deriveAccessibleShades,
} from "./color-utils";
import { themePresets } from "./presets";

describe("WCAG 2.1 Color & Accessibility Utilities", () => {
  describe("hexToRgb & rgbToHex", () => {
    it("converts standard 6-digit hex strings", () => {
      expect(hexToRgb("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb("#0F766E")).toEqual({ r: 15, g: 118, b: 110 });
    });

    it("converts 3-digit shorthand hex", () => {
      expect(hexToRgb("#FFF")).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb("#000")).toEqual({ r: 0, g: 0, b: 0 });
    });

    it("formats rgb back to uppercase hex", () => {
      expect(rgbToHex(255, 255, 255)).toBe("#FFFFFF");
      expect(rgbToHex(0, 0, 0)).toBe("#000000");
      expect(rgbToHex(15, 118, 110)).toBe("#0F766E");
    });
  });

  describe("getRelativeLuminance & getContrastRatio", () => {
    it("calculates exact luminance for pure white and black", () => {
      expect(getRelativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1.0, 3);
      expect(getRelativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0.0, 3);
    });

    it("calculates maximum contrast ratio 21:1 for black and white", () => {
      const ratio = getContrastRatio("#000000", "#FFFFFF");
      expect(ratio).toBeCloseTo(21.0, 1);
    });

    it("calculates 1:1 contrast for identical colors", () => {
      const ratio = getContrastRatio("#0F766E", "#0F766E");
      expect(ratio).toBeCloseTo(1.0, 1);
    });
  });

  describe("getBestForeground", () => {
    it("selects white foreground for dark clinical teal background", () => {
      const result = getBestForeground("#0F766E");
      expect(result.color).toBe("#FFFFFF");
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsNormalText).toBe(true);
    });

    it("selects dark slate foreground for bright amber/yellow background", () => {
      const result = getBestForeground("#FBBF24");
      expect(["#0B0F17", "#0F172A"]).toContain(result.color);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsNormalText).toBe(true);
    });
  });

  describe("deriveAccessibleShades", () => {
    it("derives valid hover, active, and subtle colors", () => {
      const shades = deriveAccessibleShades("#0F766E", false);
      expect(shades.primary).toBe("#0F766E");
      expect(shades.hover).toBeDefined();
      expect(shades.active).toBeDefined();
      expect(shades.fg).toBe("#FFFFFF");
    });
  });

  describe("themePresets", () => {
    it("generates valid semantic tokens for each curated preset in light and dark", () => {
      const presets = Object.keys(themePresets) as (keyof typeof themePresets)[];
      expect(presets.length).toBe(6);

      for (const presetKey of presets) {
        const preset = themePresets[presetKey];
        const lightTokens = preset.getTokens(false);
        const darkTokens = preset.getTokens(true);

        expect(lightTokens.bgSurface).toBeDefined();
        expect(lightTokens.primary).toBeDefined();
        expect(darkTokens.bgSurface).toBeDefined();
        expect(darkTokens.primary).toBeDefined();
      }
    });
  });
});
