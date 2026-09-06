/**
 * Tier 1: Global Primitive Design Tokens
 * Raw scales independent of semantic roles or component binding.
 */

export const primitives = {
  colors: {
    // Slate Base (Dark & Light Foundation)
    slate: {
      50: "#F8FAFC",
      100: "#F1F5F9",
      200: "#E2E8F0",
      300: "#CBD5E1",
      400: "#94A3B8",
      500: "#64748B",
      600: "#475569",
      700: "#334155",
      800: "#1E293B",
      850: "#172033",
      900: "#0F172A",
      950: "#0B0F17",
    },
    // Clinical Teal (Default Primary)
    teal: {
      50: "#F0FDFA",
      100: "#CCFBF1",
      200: "#99F6E4",
      300: "#5EEAD4",
      400: "#2DD4BF",
      500: "#14B8A6",
      600: "#0D9488",
      700: "#0F766E",
      800: "#115E59",
      900: "#134E4A",
      950: "#042F2E",
    },
    // Cobalt Indigo (Default Accent & Interactive Focus)
    indigo: {
      50: "#EEF2FF",
      100: "#E0E7FF",
      200: "#C7D2FE",
      300: "#A5B4FC",
      400: "#818CF8",
      500: "#6366F1",
      600: "#4F46E5",
      700: "#4338CA",
      800: "#3730A3",
      900: "#312E81",
      950: "#1E1B4B",
    },
    // Ocean Sky Blue (Preset)
    sky: {
      50: "#F0F9FF",
      100: "#E0F2FE",
      200: "#BAE6FD",
      300: "#7DD3FC",
      400: "#38BDF8",
      500: "#0EA5E9",
      600: "#0284C7",
      700: "#0369A1",
      800: "#075985",
      900: "#0C4A6E",
      950: "#082F49",
    },
    // Emerald Green (Success & Botanical Preset)
    emerald: {
      50: "#ECFDF5",
      100: "#D1FAE5",
      200: "#A7F3D0",
      300: "#6EE7B7",
      400: "#34D399",
      500: "#10B981",
      600: "#059669",
      700: "#047857",
      800: "#065F46",
      900: "#064E3B",
      950: "#022C22",
    },
    // Amber / Gold (Warning & Schedule Drug Compliance)
    amber: {
      50: "#FFFBEB",
      100: "#FEF3C7",
      200: "#FDE68A",
      300: "#FCD34D",
      400: "#FBBF24",
      500: "#F59E0B",
      600: "#D97706",
      700: "#B45309",
      800: "#92400E",
      900: "#78350F",
      950: "#451A03",
    },
    // Rose / Crimson (Danger & Discontinued Items)
    rose: {
      50: "#FFF1F2",
      100: "#FFE4E6",
      200: "#FECDD3",
      300: "#FDA4AF",
      400: "#FB7185",
      500: "#F43F5E",
      600: "#E11D48",
      700: "#BE123C",
      800: "#9F1239",
      900: "#881337",
      950: "#4C0519",
    },
    // Midnight Cyan (Night Preset)
    cyan: {
      50: "#ECFEFF",
      100: "#CFFAFE",
      200: "#A5F3FC",
      300: "#67E8F9",
      400: "#22D3EE",
      500: "#06B6D4",
      600: "#0891B2",
      700: "#0E7490",
      800: "#155E75",
      900: "#164E63",
      950: "#083344",
    },
    // Monochrome
    white: "#FFFFFF",
    black: "#000000",
  },

  spacing: {
    0: "0px",
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    8: "32px",
    10: "40px",
    12: "48px",
    16: "64px",
  },

  radii: {
    none: "0px",
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
    full: "9999px",
  },

  typography: {
    fontFamilies: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      mono: "'JetBrains Mono', SFMono-Regular, Consolas, monospace",
    },
    fontSizes: {
      "2xs": "10px",
      xs: "11px",
      sm: "12px",
      base: "13px",
      md: "14px",
      lg: "16px",
      xl: "18px",
      "2xl": "20px",
      "3xl": "24px",
    },
    fontWeights: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.625,
    },
  },

  motion: {
    duration: {
      fast: "100ms",
      normal: "150ms",
      slow: "250ms",
    },
    easing: {
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      easeOut: "cubic-bezier(0, 0, 0.2, 1)",
    },
  },

  shadows: {
    xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    card: "0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px 0 rgba(15, 23, 42, 0.04)",
    elevated: "0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.08)",
    modal: "0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.12)",
  },

  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
  },
} as const;

export type Primitives = typeof primitives;
