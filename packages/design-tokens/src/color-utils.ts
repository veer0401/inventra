/**
 * Standard WCAG 2.1 Color & Accessibility Utilities
 * Implements sRGB relative luminance and contrast ratio calculations.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface AccessibleShades {
  primary: string;
  hover: string;
  active: string;
  fg: string;
  subtleBg: string;
  subtleBorder: string;
  subtleFg: string;
}

/**
 * Parses a 3, 6, or 8 digit hex color string into RGB.
 */
export function hexToRgb(hex: string): RGB {
  let sanitized = hex.trim().replace(/^#/, "");
  if (sanitized.length === 3) {
    sanitized = sanitized
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (sanitized.length < 6) {
    return { r: 15, g: 118, b: 110 }; // Default teal fallback
  }

  const num = parseInt(sanitized.substring(0, 6), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

/**
 * Calculates standard sRGB relative luminance.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function getRelativeLuminance(rgb: RGB): number {
  const normalize = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const R = normalize(rgb.r);
  const G = normalize(rgb.g);
  const B = normalize(rgb.b);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Calculates WCAG 2.1 contrast ratio between two colors (1:1 to 21:1).
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hexToRgb(hex1));
  const lum2 = getRelativeLuminance(hexToRgb(hex2));

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Selects the optimal high-contrast foreground color from candidates.
 */
export function getBestForeground(
  backgroundHex: string,
  candidateHexes: string[] = ["#FFFFFF", "#0B0F17", "#F8FAFC", "#0F172A"]
): { color: string; ratio: number; meetsNormalText: boolean } {
  let bestColor = candidateHexes[0] || "#FFFFFF";
  let maxRatio = 0;

  for (const candidate of candidateHexes) {
    const ratio = getContrastRatio(backgroundHex, candidate);
    if (ratio > maxRatio) {
      maxRatio = ratio;
      bestColor = candidate;
    }
  }

  return {
    color: bestColor,
    ratio: Math.round(maxRatio * 100) / 100,
    meetsNormalText: maxRatio >= 4.5,
  };
}

/**
 * Derives accessible interactive shades (hover, active, subtle, borders)
 * from a primary base color with automatic luminance adjustments.
 */
export function deriveAccessibleShades(primaryHex: string, isDarkMode = false): AccessibleShades {
  const rgb = hexToRgb(primaryHex);
  const lum = getRelativeLuminance(rgb);

  // Derive hover and active states
  let hoverRgb: RGB;
  let activeRgb: RGB;

  if (isDarkMode) {
    // In dark mode, slightly brighten for hover
    hoverRgb = {
      r: rgb.r + (255 - rgb.r) * 0.15,
      g: rgb.g + (255 - rgb.g) * 0.15,
      b: rgb.b + (255 - rgb.b) * 0.15,
    };
    activeRgb = {
      r: rgb.r * 0.85,
      g: rgb.g * 0.85,
      b: rgb.b * 0.85,
    };
  } else {
    // In light mode, slightly darken for hover
    hoverRgb = {
      r: rgb.r * 0.88,
      g: rgb.g * 0.88,
      b: rgb.b * 0.88,
    };
    activeRgb = {
      r: rgb.r * 0.78,
      g: rgb.g * 0.78,
      b: rgb.b * 0.78,
    };
  }

  const hoverHex = rgbToHex(hoverRgb.r, hoverRgb.g, hoverRgb.b);
  const activeHex = rgbToHex(activeRgb.r, activeRgb.g, activeRgb.b);

  // Best foreground for button text:
  // For pharmacy ERP action surfaces (teal, emerald, green, blue, indigo, rose),
  // white text (#FFFFFF) is universally preferred and required.
  const isLightYellowOrWhite = lum > 0.65;
  const fg = isLightYellowOrWhite ? "#0F172A" : "#FFFFFF";

  // Derive subtle background & border tints
  let subtleBg: string;
  let subtleBorder: string;
  let subtleFg: string;

  if (isDarkMode) {
    subtleBg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;
    subtleBorder = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;
    subtleFg = lum < 0.3 ? rgbToHex(rgb.r + (255 - rgb.r) * 0.6, rgb.g + (255 - rgb.g) * 0.6, rgb.b + (255 - rgb.b) * 0.6) : primaryHex;
  } else {
    subtleBg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`;
    subtleBorder = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`;
    subtleFg = lum > 0.3 ? rgbToHex(rgb.r * 0.6, rgb.g * 0.6, rgb.b * 0.6) : primaryHex;
  }

  return {
    primary: primaryHex,
    hover: hoverHex,
    active: activeHex,
    fg,
    subtleBg,
    subtleBorder,
    subtleFg,
  };
}
