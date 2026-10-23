import { create } from "zustand";
import {
  themePresets,
  type ThemePresetKey,
  type SemanticTheme,
  applyThemeToElement,
} from "@inventra/design-tokens";

export type ThemeMode = "system" | "light" | "dark";
export type Density = "comfortable" | "compact";

export interface ThemePreferences {
  mode: ThemeMode;
  preset: ThemePresetKey;
  density: Density;
  customPrimary?: string;
  customAccent?: string;
}

export interface ThemeState extends ThemePreferences {
  isDark: boolean;
  resolvedMode: "light" | "dark";
  resolvedTokens: SemanticTheme;

  setMode: (mode: ThemeMode) => void;
  setPreset: (preset: ThemePresetKey) => void;
  setDensity: (density: Density) => void;
  setCustomColors: (primary?: string, accent?: string) => void;
  setCustomPrimary: (primary: string) => void;
  setCustomAccent: (accent: string) => void;
  resetToDefaults: () => void;
  initTheme: () => void;
}

const STORAGE_KEY = "inventra_theme_preferences";

const DEFAULT_PREFERENCES: ThemePreferences = {
  mode: "light",
  preset: "clinical",
  density: "comfortable",
  customPrimary: undefined,
  customAccent: undefined,
};

function loadStoredPreferences(): ThemePreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        mode: parsed.mode || DEFAULT_PREFERENCES.mode,
        preset: parsed.preset || DEFAULT_PREFERENCES.preset,
        density: parsed.density || DEFAULT_PREFERENCES.density,
        customPrimary: parsed.customPrimary,
        customAccent: parsed.customAccent,
      };
    }
  } catch {
    // Fall back to defaults
  }
  return DEFAULT_PREFERENCES;
}

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false; // Default clean light for modern pharmacy ERP
}

function applyThemeDom(prefs: ThemePreferences): { isDark: boolean; tokens: SemanticTheme } {
  const isDark = resolveIsDark(prefs.mode);
  const presetDef = themePresets[prefs.preset] || themePresets.clinical;
  const tokens = presetDef.getTokens(isDark, prefs.customPrimary, prefs.customAccent);

  if (typeof document !== "undefined") {
    const root = document.documentElement;

    // 1. Toggle dark class
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // 2. Set dataset attributes
    root.setAttribute("data-theme", prefs.preset);
    root.setAttribute("data-density", prefs.density);

    // 3. Apply CSS variables
    applyThemeToElement(root, tokens);
  }

  // Persist
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage unavailable
  }

  return { isDark, tokens };
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialPrefs = loadStoredPreferences();
  const initialResolved = applyThemeDom(initialPrefs);

  return {
    ...initialPrefs,
    isDark: initialResolved.isDark,
    resolvedMode: initialResolved.isDark ? "dark" : "light",
    resolvedTokens: initialResolved.tokens,

    setMode: (mode) => {
      const current = get();
      const nextPrefs: ThemePreferences = {
        mode,
        preset: current.preset,
        density: current.density,
        customPrimary: current.customPrimary,
        customAccent: current.customAccent,
      };
      const { isDark, tokens } = applyThemeDom(nextPrefs);
      set({ mode, isDark, resolvedMode: isDark ? "dark" : "light", resolvedTokens: tokens });
    },

    setPreset: (preset) => {
      const current = get();
      const nextCustomPrimary =
        preset === "custom" && !current.customPrimary ? "#0F766E" : current.customPrimary;
      const nextCustomAccent =
        preset === "custom" && !current.customAccent ? "#4F46E5" : current.customAccent;

      const nextPrefs: ThemePreferences = {
        mode: current.mode,
        preset,
        density: current.density,
        customPrimary: nextCustomPrimary,
        customAccent: nextCustomAccent,
      };
      const { isDark, tokens } = applyThemeDom(nextPrefs);
      set({
        preset,
        customPrimary: nextCustomPrimary,
        customAccent: nextCustomAccent,
        isDark,
        resolvedMode: isDark ? "dark" : "light",
        resolvedTokens: tokens,
      });
    },

    setDensity: (density) => {
      const current = get();
      const nextPrefs: ThemePreferences = {
        mode: current.mode,
        preset: current.preset,
        density,
        customPrimary: current.customPrimary,
        customAccent: current.customAccent,
      };
      const { isDark, tokens } = applyThemeDom(nextPrefs);
      set({ density, isDark, resolvedMode: isDark ? "dark" : "light", resolvedTokens: tokens });
    },

    setCustomColors: (customPrimary, customAccent) => {
      const current = get();
      const nextPrefs: ThemePreferences = {
        mode: current.mode,
        preset: "custom",
        density: current.density,
        customPrimary: customPrimary || current.customPrimary || "#0F766E",
        customAccent: customAccent || current.customAccent || "#4F46E5",
      };
      const { isDark, tokens } = applyThemeDom(nextPrefs);
      set({
        preset: "custom",
        customPrimary: nextPrefs.customPrimary,
        customAccent: nextPrefs.customAccent,
        isDark,
        resolvedMode: isDark ? "dark" : "light",
        resolvedTokens: tokens,
      });
    },

    setCustomPrimary: (primary) => {
      const current = get();
      const nextPrefs: ThemePreferences = {
        mode: current.mode,
        preset: "custom",
        density: current.density,
        customPrimary: primary,
        customAccent: current.customAccent || "#4F46E5",
      };
      const { isDark, tokens } = applyThemeDom(nextPrefs);
      set({
        preset: "custom",
        customPrimary: primary,
        customAccent: nextPrefs.customAccent,
        isDark,
        resolvedMode: isDark ? "dark" : "light",
        resolvedTokens: tokens,
      });
    },

    setCustomAccent: (accent) => {
      const current = get();
      const nextPrefs: ThemePreferences = {
        mode: current.mode,
        preset: "custom",
        density: current.density,
        customPrimary: current.customPrimary || "#0F766E",
        customAccent: accent,
      };
      const { isDark, tokens } = applyThemeDom(nextPrefs);
      set({
        preset: "custom",
        customPrimary: nextPrefs.customPrimary,
        customAccent: accent,
        isDark,
        resolvedMode: isDark ? "dark" : "light",
        resolvedTokens: tokens,
      });
    },

    resetToDefaults: () => {
      const { isDark, tokens } = applyThemeDom(DEFAULT_PREFERENCES);
      set({
        ...DEFAULT_PREFERENCES,
        isDark,
        resolvedMode: isDark ? "dark" : "light",
        resolvedTokens: tokens,
      });
    },

    initTheme: () => {
      const current = get();
      const prefs: ThemePreferences = {
        mode: current.mode,
        preset: current.preset,
        density: current.density,
        customPrimary: current.customPrimary,
        customAccent: current.customAccent,
      };
      const { isDark, tokens } = applyThemeDom(prefs);
      set({ isDark, resolvedMode: isDark ? "dark" : "light", resolvedTokens: tokens });

      // Listen to OS system scheme changes
      if (typeof window !== "undefined" && window.matchMedia) {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
          if (get().mode === "system") {
            const resolved = applyThemeDom(get());
            set({
              isDark: resolved.isDark,
              resolvedMode: resolved.isDark ? "dark" : "light",
              resolvedTokens: resolved.tokens,
            });
          }
        };

        if (mediaQuery.addEventListener) {
          mediaQuery.addEventListener("change", handleChange);
        } else if (mediaQuery.addListener) {
          mediaQuery.addListener(handleChange);
        }
      }
    },
  };
});
