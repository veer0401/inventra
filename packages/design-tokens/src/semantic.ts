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
  bgApp: primitives.colors.slate[50],
  bgSurface: primitives.colors.white,
  bgSurfaceElevated: primitives.colors.white,
  bgSurfaceMuted: primitives.colors.slate[100],

  textPrimary: primitives.colors.slate[900],
  textSecondary: primitives.colors.slate[600],
  textMuted: primitives.colors.slate[400],
  textInverse: primitives.colors.white,

  borderSubtle: primitives.colors.slate[200],
  borderStrong: primitives.colors.slate[300],
  borderFocus: primitives.colors.indigo[600],

  primary: primitives.colors.teal[700],
  primaryHover: primitives.colors.teal[800],
  primaryActive: primitives.colors.teal[900],
  primaryFg: primitives.colors.white,
  primarySubtle: "rgba(15, 118, 110, 0.08)",
  primaryBorder: "rgba(15, 118, 110, 0.25)",

  accent: primitives.colors.indigo[600],
  accentHover: primitives.colors.indigo[700],
  accentFg: primitives.colors.white,
  accentSubtle: "rgba(79, 70, 229, 0.08)",
  accentBorder: "rgba(79, 70, 229, 0.25)",

  success: primitives.colors.emerald[600],
  successSubtle: primitives.colors.emerald[50],
  successFg: primitives.colors.emerald[900],
  successBorder: primitives.colors.emerald[200],

  warning: primitives.colors.amber[600],
  warningSubtle: primitives.colors.amber[50],
  warningFg: primitives.colors.amber[900],
  warningBorder: primitives.colors.amber[200],

  danger: primitives.colors.rose[600],
  dangerSubtle: primitives.colors.rose[50],
  dangerFg: primitives.colors.rose[900],
  dangerBorder: primitives.colors.rose[200],

  info: primitives.colors.sky[600],
  infoSubtle: primitives.colors.sky[50],
  infoFg: primitives.colors.sky[900],
  infoBorder: primitives.colors.sky[200],
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
