import type { SemanticTheme } from "./semantic";

export function themeToCssVariables(theme: SemanticTheme): Record<string, string> {
  return {
    "--bg-app": theme.bgApp,
    "--bg-surface": theme.bgSurface,
    "--bg-surface-elevated": theme.bgSurfaceElevated,
    "--bg-surface-muted": theme.bgSurfaceMuted,

    "--text-primary": theme.textPrimary,
    "--text-secondary": theme.textSecondary,
    "--text-muted": theme.textMuted,
    "--text-inverse": theme.textInverse,

    "--border-subtle": theme.borderSubtle,
    "--border-strong": theme.borderStrong,
    "--border-focus": theme.borderFocus,

    "--primary": theme.primary,
    "--primary-hover": theme.primaryHover,
    "--primary-active": theme.primaryActive,
    "--primary-fg": theme.primaryFg,
    "--primary-subtle": theme.primarySubtle,
    "--primary-border": theme.primaryBorder,

    "--accent": theme.accent,
    "--accent-hover": theme.accentHover,
    "--accent-fg": theme.accentFg,
    "--accent-subtle": theme.accentSubtle,
    "--accent-border": theme.accentBorder,

    "--success": theme.success,
    "--success-subtle": theme.successSubtle,
    "--success-fg": theme.successFg,
    "--success-border": theme.successBorder,

    "--warning": theme.warning,
    "--warning-subtle": theme.warningSubtle,
    "--warning-fg": theme.warningFg,
    "--warning-border": theme.warningBorder,

    "--danger": theme.danger,
    "--danger-subtle": theme.dangerSubtle,
    "--danger-fg": theme.dangerFg,
    "--danger-border": theme.dangerBorder,

    "--info": theme.info,
    "--info-subtle": theme.infoSubtle,
    "--info-fg": theme.infoFg,
    "--info-border": theme.infoBorder,
  };
}

export function applyThemeToElement(el: HTMLElement, theme: SemanticTheme): void {
  const vars = themeToCssVariables(theme);
  for (const [key, val] of Object.entries(vars)) {
    el.style.setProperty(key, val);
  }
}
