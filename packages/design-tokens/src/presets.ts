import { primitives } from "./primitives";
import { lightSemanticTokens, darkSemanticTokens, type SemanticTheme } from "./semantic";
import { deriveAccessibleShades } from "./color-utils";

export type ThemePresetKey =
  | "clinical"
  | "ocean"
  | "emerald"
  | "midnight"
  | "high-contrast"
  | "custom";

export interface PresetDefinition {
  id: ThemePresetKey;
  name: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  getTokens: (isDark: boolean, customPrimary?: string, customAccent?: string) => SemanticTheme;
}

export const themePresets: Record<ThemePresetKey, PresetDefinition> = {
  clinical: {
    id: "clinical",
    name: "Inventra Clinical",
    description: "Deep clinical teal with cobalt indigo focus. Engineered for hospital and dispensary workstations.",
    primaryColor: primitives.colors.teal[700],
    accentColor: primitives.colors.indigo[600],
    getTokens: (isDark) => (isDark ? darkSemanticTokens : lightSemanticTokens),
  },

  ocean: {
    id: "ocean",
    name: "Ocean Blue",
    description: "Sapphire blue with sky accents. Designed for retail pharmacy managers.",
    primaryColor: primitives.colors.sky[600],
    accentColor: primitives.colors.sky[500],
    getTokens: (isDark) => {
      const base = isDark ? { ...darkSemanticTokens } : { ...lightSemanticTokens };
      if (isDark) {
        base.primary = primitives.colors.sky[400];
        base.primaryHover = primitives.colors.sky[300];
        base.primaryActive = primitives.colors.sky[500];
        base.primaryFg = primitives.colors.slate[950];
        base.primarySubtle = "rgba(56, 189, 248, 0.15)";
        base.primaryBorder = "rgba(56, 189, 248, 0.35)";
        base.accent = primitives.colors.sky[300];
        base.accentBorder = "rgba(56, 189, 248, 0.35)";
        base.borderFocus = primitives.colors.sky[400];
      } else {
        base.primary = primitives.colors.sky[600];
        base.primaryHover = primitives.colors.sky[700];
        base.primaryActive = primitives.colors.sky[800];
        base.primaryFg = primitives.colors.white;
        base.primarySubtle = "rgba(2, 132, 199, 0.08)";
        base.primaryBorder = "rgba(2, 132, 199, 0.25)";
        base.accent = primitives.colors.sky[500];
        base.accentBorder = "rgba(2, 132, 199, 0.25)";
        base.borderFocus = primitives.colors.sky[600];
      }
      return base;
    },
  },

  emerald: {
    id: "emerald",
    name: "Emerald Health",
    description: "Botanical green with mint undertones. Suitable for natural & wellness pharmacies.",
    primaryColor: primitives.colors.emerald[600],
    accentColor: primitives.colors.teal[600],
    getTokens: (isDark) => {
      const base = isDark ? { ...darkSemanticTokens } : { ...lightSemanticTokens };
      if (isDark) {
        base.primary = primitives.colors.emerald[400];
        base.primaryHover = primitives.colors.emerald[300];
        base.primaryActive = primitives.colors.emerald[500];
        base.primaryFg = primitives.colors.white;
        base.primarySubtle = "rgba(52, 211, 153, 0.15)";
        base.primaryBorder = "rgba(52, 211, 153, 0.35)";
        base.accent = primitives.colors.teal[400];
        base.accentBorder = "rgba(45, 212, 191, 0.35)";
        base.borderFocus = primitives.colors.emerald[400];
      } else {
        base.primary = primitives.colors.emerald[600];
        base.primaryHover = primitives.colors.emerald[700];
        base.primaryActive = primitives.colors.emerald[800];
        base.primaryFg = primitives.colors.white;
        base.primarySubtle = "rgba(5, 150, 105, 0.08)";
        base.primaryBorder = "rgba(5, 150, 105, 0.25)";
        base.accent = primitives.colors.teal[600];
        base.accentBorder = "rgba(13, 148, 136, 0.25)";
        base.borderFocus = primitives.colors.emerald[600];
      }
      return base;
    },
  },

  midnight: {
    id: "midnight",
    name: "Midnight Clinical",
    description: "Cyan glow with obsidian OLED dark surfaces. Engineered for 24/7 night pharmacy shifts.",
    primaryColor: primitives.colors.cyan[500],
    accentColor: primitives.colors.sky[400],
    getTokens: (isDark) => {
      const base = isDark ? { ...darkSemanticTokens } : { ...lightSemanticTokens };
      if (isDark) {
        base.bgApp = "#030712"; // Gray-950 OLED
        base.bgSurface = "#0B0F17";
        base.bgSurfaceElevated = "#111827";
        base.primary = primitives.colors.cyan[400];
        base.primaryHover = primitives.colors.cyan[300];
        base.primaryActive = primitives.colors.cyan[500];
        base.primaryFg = primitives.colors.slate[950];
        base.primarySubtle = "rgba(34, 211, 238, 0.15)";
        base.primaryBorder = "rgba(34, 211, 238, 0.35)";
        base.accent = primitives.colors.sky[400];
        base.accentBorder = "rgba(56, 189, 248, 0.35)";
        base.borderFocus = primitives.colors.cyan[400];
      } else {
        base.primary = primitives.colors.cyan[600];
        base.primaryHover = primitives.colors.cyan[700];
        base.primaryFg = primitives.colors.white;
        base.accent = primitives.colors.sky[500];
        base.accentBorder = "rgba(2, 132, 199, 0.25)";
      }
      return base;
    },
  },

  "high-contrast": {
    id: "high-contrast",
    name: "High Contrast",
    description: "Pure amber accents with maximum contrast black/white boundaries for accessibility.",
    primaryColor: primitives.colors.amber[600],
    accentColor: primitives.colors.sky[600],
    getTokens: (isDark) => {
      const base = isDark ? { ...darkSemanticTokens } : { ...lightSemanticTokens };
      if (isDark) {
        base.bgApp = "#000000";
        base.bgSurface = "#000000";
        base.bgSurfaceElevated = "#0F172A";
        base.borderSubtle = "#FFFFFF";
        base.borderStrong = "#FFFFFF";
        base.textPrimary = "#FFFFFF";
        base.textSecondary = "#F1F5F9";
        base.primary = primitives.colors.amber[400];
        base.primaryFg = "#000000";
        base.accent = "#FFFFFF";
        base.accentBorder = "#FFFFFF";
        base.borderFocus = primitives.colors.amber[400];
      } else {
        base.bgApp = "#FFFFFF";
        base.bgSurface = "#FFFFFF";
        base.borderSubtle = "#000000";
        base.borderStrong = "#000000";
        base.textPrimary = "#000000";
        base.textSecondary = "#000000";
        base.primary = primitives.colors.amber[600];
        base.primaryFg = "#FFFFFF";
        base.accent = "#000000";
        base.accentBorder = "#000000";
        base.borderFocus = primitives.colors.amber[700];
      }
      return base;
    },
  },

  custom: {
    id: "custom",
    name: "Custom Theme",
    description: "Custom primary and accent hues with automated accessibility and contrast normalization.",
    primaryColor: primitives.colors.teal[700],
    accentColor: primitives.colors.indigo[600],
    getTokens: (isDark, customPrimary, customAccent) => {
      const base = isDark ? { ...darkSemanticTokens } : { ...lightSemanticTokens };
      const primaryHex = customPrimary || (isDark ? primitives.colors.teal[500] : primitives.colors.teal[700]);
      const shades = deriveAccessibleShades(primaryHex, isDark);

      base.primary = shades.primary;
      base.primaryHover = shades.hover;
      base.primaryActive = shades.active;
      base.primaryFg = shades.fg;
      base.primarySubtle = shades.subtleBg;
      base.primaryBorder = shades.subtleBorder;

      const accentHex = customAccent || (isDark ? primitives.colors.indigo[400] : primitives.colors.indigo[600]);
      const accentShades = deriveAccessibleShades(accentHex, isDark);
      base.accent = accentShades.primary;
      base.accentHover = accentShades.hover;
      base.accentFg = accentShades.fg;
      base.accentSubtle = accentShades.subtleBg;
      base.accentBorder = accentShades.subtleBorder;
      base.borderFocus = accentShades.primary;

      return base;
    },
  },
};
