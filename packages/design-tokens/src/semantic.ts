import { primitives } from "./primitives";

export interface SemanticTheme {
  // App Canvas & Surfaces
  bgApp: string;
  bgSurface: string;
  bgSurfaceElevated: string;
  bgSurfaceMuted: string;

  // Typography & Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Borders & Dividers
  borderSubtle: string;
  borderStrong: string;
  borderFocus: string;

  // Brand Primary
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primaryFg: string;
  primarySubtle: string;
  primaryBorder: string;

  // Accent
  accent: string;
  accentHover: string;
  accentFg: string;
  accentSubtle: string;
  accentBorder: string;

  // Semantic Statuses
  success: string;
  successSubtle: string;
  successFg: string;
  successBorder: string;

  // Warning / Rx Alert
  warning: string;
  warningSubtle: string;
  warningFg: string;
  warningBorder: string;

  // Danger / Discontinued / Error
  danger: string;
  dangerSubtle: string;
  dangerFg: string;
  dangerBorder: string;

  // Information / Sync Diagnostic
  info: string;
  infoSubtle: string;
  infoFg: string;
  infoBorder: string;
}

export const lightSemanticTokens: SemanticTheme = {
  bgApp: "#F8FAFC",
  bgSurface: "#FFFFFF",
  bgSurfaceElevated: "#FFFFFF",
  bgSurfaceMuted: "#F1F5F9",

  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#64748B",
  textInverse: "#FFFFFF",

  borderSubtle: "#E2E8F0",
  borderStrong: "#CBD5E1",
  borderFocus: "#0D9488",

  primary: "#0F766E",
  primaryHover: "#115E59",
  primaryActive: "#134E4A",
  primaryFg: "#FFFFFF",
  primarySubtle: "#F0FDFA",
  primaryBorder: "#CCFBF1",

  accent: "#4F46E5",
  accentHover: "#4338CA",
  accentFg: "#FFFFFF",
  accentSubtle: "#EEF2FF",
  accentBorder: "#C7D2FE",

  success: "#059669",
  successSubtle: "#ECFDF5",
  successFg: "#065F46",
  successBorder: "#A7F3D0",

  warning: "#D97706",
  warningSubtle: "#FFFBEB",
  warningFg: "#92400E",
  warningBorder: "#FDE68A",

  danger: "#E11D48",
  dangerSubtle: "#FFF1F2",
  dangerFg: "#9F1239",
  dangerBorder: "#FECDD3",

  info: "#0284C7",
  infoSubtle: "#F0F9FF",
  infoFg: "#075985",
  infoBorder: "#BAE6FD",
};

export const darkSemanticTokens: SemanticTheme = {
  bgApp: primitives.colors.slate[950],
  bgSurface: primitives.colors.slate[900],
  bgSurfaceElevated: primitives.colors.slate[800],
  bgSurfaceMuted: primitives.colors.slate[950],

  textPrimary: primitives.colors.slate[50],
  textSecondary: primitives.colors.slate[400],
  textMuted: primitives.colors.slate[500],
  textInverse: primitives.colors.slate[950],

  borderSubtle: primitives.colors.slate[800],
  borderStrong: primitives.colors.slate[700],
  borderFocus: primitives.colors.indigo[500],

  primary: primitives.colors.teal[500],
  primaryHover: primitives.colors.teal[400],
  primaryActive: primitives.colors.teal[600],
  primaryFg: primitives.colors.slate[950],
  primarySubtle: "rgba(20, 184, 166, 0.15)",
  primaryBorder: "rgba(20, 184, 166, 0.35)",

  accent: primitives.colors.indigo[400],
  accentHover: primitives.colors.indigo[300],
  accentFg: primitives.colors.white,
  accentSubtle: "rgba(129, 140, 248, 0.15)",
  accentBorder: "rgba(129, 140, 248, 0.35)",

  success: primitives.colors.emerald[400],
  successSubtle: "rgba(6, 78, 59, 0.4)",
  successFg: primitives.colors.emerald[300],
  successBorder: primitives.colors.emerald[800],

  warning: primitives.colors.amber[400],
  warningSubtle: "rgba(120, 53, 15, 0.4)",
  warningFg: primitives.colors.amber[300],
  warningBorder: primitives.colors.amber[800],

  danger: primitives.colors.rose[400],
  dangerSubtle: "rgba(136, 19, 55, 0.4)",
  dangerFg: primitives.colors.rose[300],
  dangerBorder: primitives.colors.rose[800],

  info: primitives.colors.sky[400],
  infoSubtle: "rgba(12, 74, 110, 0.4)",
  infoFg: primitives.colors.sky[300],
  infoBorder: primitives.colors.sky[800],
};
