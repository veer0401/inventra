import { describe, it, expect, beforeEach } from "vitest";
import { useThemeStore } from "./themeStore";

describe("Theme Store (useThemeStore) & DOM Custom-Property Synchronization", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-density");
    document.documentElement.removeAttribute("style");
    useThemeStore.getState().resetToDefaults();
  });

  it("initializes with default system mode, clinical preset, and comfortable density", () => {
    const state = useThemeStore.getState();
    expect(state.mode).toBe("system");
    expect(state.preset).toBe("clinical");
    expect(state.density).toBe("comfortable");
    expect(state.resolvedMode).toBeDefined();
  });

  it("updates mode to dark and applies .dark class to root element", () => {
    useThemeStore.getState().setMode("dark");
    const state = useThemeStore.getState();
    expect(state.mode).toBe("dark");
    expect(state.resolvedMode).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("updates mode to light and removes .dark class from root element", () => {
    useThemeStore.getState().setMode("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    useThemeStore.getState().setMode("light");
    const state = useThemeStore.getState();
    expect(state.mode).toBe("light");
    expect(state.resolvedMode).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("switches theme preset to ocean and updates data-theme attribute & CSS variables", () => {
    useThemeStore.getState().setPreset("ocean");
    const state = useThemeStore.getState();
    expect(state.preset).toBe("ocean");
    expect(document.documentElement.getAttribute("data-theme")).toBe("ocean");
    expect(document.documentElement.style.getPropertyValue("--primary")).toBeDefined();
  });

  it("switches theme density to compact and updates data-density attribute", () => {
    useThemeStore.getState().setDensity("compact");
    const state = useThemeStore.getState();
    expect(state.density).toBe("compact");
    expect(document.documentElement.getAttribute("data-density")).toBe("compact");
  });

  it("regression test: setCustomAccent updates --accent, --border-focus, --accent-subtle, and --accent-border on document.documentElement", () => {
    useThemeStore.getState().setMode("dark");
    useThemeStore.getState().setCustomAccent("#FF00AA");

    const state = useThemeStore.getState();
    expect(state.preset).toBe("custom");
    expect(state.customAccent).toBe("#FF00AA");

    // Check runtime DOM CSS Custom Properties
    const domAccent = document.documentElement.style.getPropertyValue("--accent");
    const domBorderFocus = document.documentElement.style.getPropertyValue("--border-focus");
    const domAccentSubtle = document.documentElement.style.getPropertyValue("--accent-subtle");
    const domAccentBorder = document.documentElement.style.getPropertyValue("--accent-border");
    const domAccentHover = document.documentElement.style.getPropertyValue("--accent-hover");

    expect(domAccent).toBe("#FF00AA");
    expect(domBorderFocus).toBe("#FF00AA");
    expect(domAccentSubtle).toContain("255, 0, 170");
    expect(domAccentBorder).toContain("255, 0, 170");
    expect(domAccentHover).toBeDefined();

    // Check persisted preferences
    const saved = localStorage.getItem("inventra_theme_preferences");
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.customAccent).toBe("#FF00AA");
    expect(parsed.preset).toBe("custom");
  });

  it("regression test: setCustomPrimary updates --primary, --primary-hover, --primary-fg, --primary-subtle, and --primary-border on document.documentElement", () => {
    useThemeStore.getState().setMode("light");
    useThemeStore.getState().setCustomPrimary("#00AAFF");

    const state = useThemeStore.getState();
    expect(state.preset).toBe("custom");
    expect(state.customPrimary).toBe("#00AAFF");

    // Check runtime DOM CSS Custom Properties
    const domPrimary = document.documentElement.style.getPropertyValue("--primary");
    const domPrimarySubtle = document.documentElement.style.getPropertyValue("--primary-subtle");
    const domPrimaryBorder = document.documentElement.style.getPropertyValue("--primary-border");
    const domPrimaryHover = document.documentElement.style.getPropertyValue("--primary-hover");
    const domPrimaryFg = document.documentElement.style.getPropertyValue("--primary-fg");

    expect(domPrimary).toBe("#00AAFF");
    expect(domPrimarySubtle).toContain("0, 170, 255");
    expect(domPrimaryBorder).toContain("0, 170, 255");
    expect(domPrimaryHover).toBeDefined();
    expect(domPrimaryFg).toBeDefined();

    // Check persisted preferences
    const saved = localStorage.getItem("inventra_theme_preferences");
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.customPrimary).toBe("#00AAFF");
    expect(parsed.preset).toBe("custom");
  });

  it("accessible contrast test: bright primary color derives readable dark text foreground", () => {
    useThemeStore.getState().setMode("light");
    useThemeStore.getState().setCustomPrimary("#FFFF00"); // bright yellow

    const domPrimaryFg = document.documentElement.style.getPropertyValue("--primary-fg");
    // Bright yellow base must pick dark text for WCAG 2.1 AA contrast
    expect(domPrimaryFg).not.toBe("#FFFFFF");
  });

  it("mode transition test: switching dark/light retains custom colors with updated accessible shades", () => {
    useThemeStore.getState().setCustomColors("#00AAFF", "#FF00AA");
    useThemeStore.getState().setMode("light");

    const lightHover = document.documentElement.style.getPropertyValue("--primary-hover");

    useThemeStore.getState().setMode("dark");
    const darkHover = document.documentElement.style.getPropertyValue("--primary-hover");

    // Primary base color is preserved
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("#00AAFF");
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#FF00AA");
    // In dark mode, hover shade is brighter than in light mode
    expect(lightHover).not.toBe(darkHover);
  });

  it("regression test: setCustomColors updates both --primary and --accent simultaneously on DOM", () => {
    useThemeStore.getState().setCustomColors("#00AAFF", "#FF00AA");

    const domPrimary = document.documentElement.style.getPropertyValue("--primary");
    const domAccent = document.documentElement.style.getPropertyValue("--accent");

    expect(domPrimary).toBe("#00AAFF");
    expect(domAccent).toBe("#FF00AA");
  });

  it("restores clinical theme CSS properties when switching from custom back to clinical", () => {
    useThemeStore.getState().setCustomColors("#00AAFF", "#FF00AA");
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#FF00AA");

    useThemeStore.getState().setPreset("clinical");

    expect(document.documentElement.getAttribute("data-theme")).toBe("clinical");
    const domPrimary = document.documentElement.style.getPropertyValue("--primary");
    const domAccent = document.documentElement.style.getPropertyValue("--accent");

    expect(domPrimary).not.toBe("#00AAFF");
    expect(domAccent).not.toBe("#FF00AA");
  });

  it("resets preferences back to defaults", () => {
    useThemeStore.getState().setMode("dark");
    useThemeStore.getState().setPreset("midnight");
    useThemeStore.getState().setDensity("compact");
    useThemeStore.getState().resetToDefaults();

    const state = useThemeStore.getState();
    expect(state.mode).toBe("system");
    expect(state.preset).toBe("clinical");
    expect(state.density).toBe("comfortable");
    expect(document.documentElement.getAttribute("data-theme")).toBe("clinical");
    expect(document.documentElement.getAttribute("data-density")).toBe("comfortable");
  });
});
