import * as React from "react";
import { cn } from "./utils";

export interface ShortcutHintProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Shortcut string representation, e.g. "Ctrl+K", "Cmd+K", "Meta+K", "G I", "Shift+Alt+P", "Esc", "Enter", "F2"
   */
  shortcut: string;
  /**
   * If true, renders a tighter, compact single-chip or minimal padding layout
   */
  compact?: boolean;
  /**
   * Explicit override for OS platform detection. Defaults to runtime detection.
   */
  isMac?: boolean;
}

/**
 * Normalizes platform detection safely for SSR / browser environments.
 */
export function isMacOS(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || navigator.userAgent || "";
  return /Mac|iPhone|iPod|iPad/i.test(platform);
}

/**
 * Formats a key token to its platform-appropriate label or symbol.
 */
export function formatKeyToken(token: string, isMac: boolean): string {
  const t = token.trim().toLowerCase();
  if (isMac) {
    switch (t) {
      case "cmd":
      case "command":
      case "meta":
      case "ctrl":
      case "control":
        return "⌘";
      case "alt":
      case "option":
      case "opt":
        return "⌥";
      case "shift":
        return "⇧";
      case "ctrl-raw":
        return "⌃";
      case "escape":
      case "esc":
        return "Esc";
      case "enter":
      case "return":
        return "↵";
      case "backspace":
      case "delete":
      case "del":
        return "⌫";
      case "space":
        return "Space";
      case "arrowup":
      case "up":
        return "↑";
      case "arrowdown":
      case "down":
        return "↓";
      case "arrowleft":
      case "left":
        return "←";
      case "arrowright":
      case "right":
        return "→";
      default:
        return token.toUpperCase();
    }
  } else {
    switch (t) {
      case "cmd":
      case "command":
      case "meta":
      case "ctrl":
      case "control":
        return "Ctrl";
      case "alt":
      case "option":
      case "opt":
        return "Alt";
      case "shift":
        return "Shift";
      case "escape":
      case "esc":
        return "Esc";
      case "enter":
      case "return":
        return "Enter";
      case "backspace":
      case "delete":
      case "del":
        return "Del";
      case "space":
        return "Space";
      case "arrowup":
      case "up":
        return "↑";
      case "arrowdown":
      case "down":
        return "↓";
      case "arrowleft":
      case "left":
        return "←";
      case "arrowright":
      case "right":
        return "→";
      default:
        return token.toUpperCase();
    }
  }
}

/**
 * Parses a shortcut string into structured groups:
 * - Sequences separated by space (e.g. "G I" -> [["G"], ["I"]])
 * - Combined keys separated by "+" (e.g. "Ctrl+K" -> [["Ctrl", "K"]])
 */
export function parseShortcut(shortcut: string): string[][] {
  if (!shortcut || !shortcut.trim()) return [];
  const parts = shortcut.trim().split(/\s+/);
  return parts.map((part) => part.split("+").map((k) => k.trim()).filter(Boolean));
}

/**
 * Accessible ShortcutHint component displaying platform-normalized keyboard tags.
 */
export const ShortcutHint: React.FC<ShortcutHintProps> = ({
  shortcut,
  compact = false,
  isMac: isMacOverride,
  className,
  ...props
}) => {
  const isMac = React.useMemo(
    () => (typeof isMacOverride === "boolean" ? isMacOverride : isMacOS()),
    [isMacOverride]
  );

  const keyGroups = React.useMemo(() => parseShortcut(shortcut), [shortcut]);

  if (!keyGroups || keyGroups.length === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono select-none text-muted shrink-0",
        compact ? "text-[10px]" : "text-xs",
        className
      )}
      aria-label={`Keyboard shortcut: ${shortcut}`}
      {...props}
    >
      {keyGroups.map((group, groupIndex) => (
        <React.Fragment key={groupIndex}>
          {groupIndex > 0 && (
            <span className="text-[10px] text-muted font-sans lowercase px-0.5 select-none">
              then
            </span>
          )}
          <span className="inline-flex items-center gap-0.5">
            {group.map((key, keyIndex) => (
              <kbd
                key={keyIndex}
                className={cn(
                  "inline-flex items-center justify-center font-mono font-semibold rounded border border-strong bg-surface-muted text-secondary shadow-xs leading-none transition-colors",
                  compact
                    ? "px-1 py-0.5 text-[9px] min-w-[16px] h-4"
                    : "px-1.5 py-0.5 text-[10px] min-w-[18px] h-5"
                )}
              >
                {formatKeyToken(key, isMac)}
              </kbd>
            ))}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
};
