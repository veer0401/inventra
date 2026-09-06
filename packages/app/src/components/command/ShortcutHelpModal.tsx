import React from "react";
import { useNavigate } from "react-router-dom";
import { X, Keyboard, Settings2, ExternalLink } from "lucide-react";
import { useShortcutStore, DEFAULT_COMMANDS } from "../../stores/shortcutStore";
import { ShortcutHint, Button } from "@inventra/ui";

export const ShortcutHelpModal: React.FC = () => {
  const navigate = useNavigate();
  const { shortcutHelpOpen, setShortcutHelpOpen, activeKeymap } = useShortcutStore();

  if (!shortcutHelpOpen) return null;

  const globalAndNav = DEFAULT_COMMANDS.filter(
    (c) => c.category === "SYSTEM" || c.category === "NAVIGATION"
  );
  const actionsAndPos = DEFAULT_COMMANDS.filter(
    (c) => c.category === "CREATE" || c.category === "ACTIONS"
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => setShortcutHelpOpen(false)}
    >
      <div
        className="w-full max-w-3xl bg-surface rounded-xl border border-strong shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard Shortcuts Cheatsheet"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary-subtle border border-primary-border">
              <Keyboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary">Keyboard Shortcuts Reference</h2>
              <p className="text-xs text-secondary">
                Master rapid navigation and operational commands across Inventra.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShortcutHelpOpen(false)}
            className="p-1.5 text-muted hover:text-primary rounded-md hover:bg-surface-muted transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content: 2 Columns */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Global & Navigation */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2.5">
                Global & Navigation
              </h3>
              <div className="space-y-1.5 bg-surface-muted/50 p-3 rounded-lg border border-subtle">
                {globalAndNav.map((cmd) => (
                  <div
                    key={cmd.id}
                    className="flex items-center justify-between py-1 text-xs text-secondary"
                  >
                    <span className="font-medium text-primary">{cmd.label}</span>
                    <ShortcutHint shortcut={activeKeymap[cmd.id] || cmd.defaultBinding} compact />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2.5">
                Table Keyboard Navigation
              </h3>
              <div className="space-y-1.5 bg-surface-muted/50 p-3 rounded-lg border border-subtle text-xs text-secondary">
                <div className="flex items-center justify-between py-1">
                  <span>Move focus down / next row</span>
                  <ShortcutHint shortcut="↓ or J" compact />
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Move focus up / prev row</span>
                  <ShortcutHint shortcut="↑ or K" compact />
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Open / View focused item</span>
                  <ShortcutHint shortcut="Enter" compact />
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Toggle checkbox selection</span>
                  <ShortcutHint shortcut="Space" compact />
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Quick edit focused item</span>
                  <ShortcutHint shortcut="E" compact />
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Clear active focus / selection</span>
                  <ShortcutHint shortcut="Esc" compact />
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Actions & POS */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2.5">
                Operations & Create Actions
              </h3>
              <div className="space-y-1.5 bg-surface-muted/50 p-3 rounded-lg border border-subtle">
                {actionsAndPos
                  .filter((c) => c.scope !== "POS")
                  .map((cmd) => (
                    <div
                      key={cmd.id}
                      className="flex items-center justify-between py-1 text-xs text-secondary"
                    >
                      <span className="font-medium text-primary">{cmd.label}</span>
                      <ShortcutHint shortcut={activeKeymap[cmd.id] || cmd.defaultBinding} compact />
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2.5">
                POS & Billing Foundation
              </h3>
              <div className="space-y-1.5 bg-surface-muted/50 p-3 rounded-lg border border-subtle">
                {actionsAndPos
                  .filter((c) => c.scope === "POS")
                  .map((cmd) => (
                    <div
                      key={cmd.id}
                      className="flex items-center justify-between py-1 text-xs text-secondary"
                    >
                      <span className="font-medium text-primary">{cmd.label}</span>
                      <ShortcutHint shortcut={activeKeymap[cmd.id] || cmd.defaultBinding} compact />
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2.5">
                Form Hotkeys
              </h3>
              <div className="space-y-1.5 bg-surface-muted/50 p-3 rounded-lg border border-subtle text-xs text-secondary">
                <div className="flex items-center justify-between py-1">
                  <span>Save Form & Submit</span>
                  <ShortcutHint shortcut="Ctrl+S" compact />
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Cancel / Close Dialog</span>
                  <ShortcutHint shortcut="Esc" compact />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-subtle bg-surface-muted flex items-center justify-between">
          <span className="text-xs text-muted font-mono">
            Press <kbd className="px-1.5 py-0.5 rounded border border-strong bg-surface text-secondary">?</kbd> anywhere to open this cheatsheet.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShortcutHelpOpen(false);
              navigate("/settings/shortcuts");
            }}
            className="flex items-center gap-1.5 text-xs"
          >
            <Settings2 className="h-3.5 w-3.5 text-primary" />
            <span>Customize Shortcuts</span>
            <ExternalLink className="h-3 w-3 ml-0.5 text-muted" />
          </Button>
        </div>
      </div>
    </div>
  );
};
