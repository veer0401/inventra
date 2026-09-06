import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useShortcutStore } from "../stores/shortcutStore";


export function isInputElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    el.isContentEditable ||
    el.getAttribute("role") === "textbox"
  );
}

export function normalizeEventKey(e: KeyboardEvent): string {
  const isCtrlOrCmd = e.ctrlKey || e.metaKey;
  const parts: string[] = [];

  if (isCtrlOrCmd) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey && e.key.length > 1) parts.push("Shift");

  let key = e.key;
  if (key === "Escape") key = "Esc";
  if (key.length === 1) key = key.toUpperCase();

  if (parts.length > 0 && !["Control", "Meta", "Alt", "Shift"].includes(e.key)) {
    parts.push(key);
    return parts.join("+");
  }

  return key;
}

export interface UseKeyboardShortcutsOptions {
  onCustomCommand?: (commandId: string) => boolean | void;
}

export function useKeyboardShortcuts(options?: UseKeyboardShortcutsOptions) {
  const navigate = useNavigate();
  const {
    activeKeymap,
    setCommandPaletteOpen,
    setShortcutHelpOpen,
    recordRecentCommand,
  } = useShortcutStore();

  const pendingSequenceRef = useRef<{ firstKey: string; timeoutId: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping = isInputElement(e.target);

      // Normalize current event key
      const pressedKeyCombo = normalizeEventKey(e);

      // Find matching command in activeKeymap
      const findCommandByBinding = (binding: string) => {
        const normalizedTarget = binding.trim().toUpperCase();
        for (const [cmdId, bound] of Object.entries(activeKeymap)) {
          if (bound.trim().toUpperCase() === normalizedTarget) {
            return cmdId;
          }
        }
        return null;
      };

      // 1. Modifiers & Universal actions (always active unless prevented)
      const directCommandId = findCommandByBinding(pressedKeyCombo);

      if (directCommandId === "OPEN_COMMAND_PALETTE") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        recordRecentCommand("OPEN_COMMAND_PALETTE");
        return;
      }

      if (directCommandId === "TOGGLE_SIDEBAR") {
        e.preventDefault();
        const customHandled = options?.onCustomCommand?.("TOGGLE_SIDEBAR");
        if (!customHandled) {
          window.dispatchEvent(new CustomEvent("inventra:toggle-sidebar"));
        }
        return;
      }

      // If user is actively typing in a form input/textarea, STRICTLY SKIP single-key & sequence hotkeys!
      if (isTyping) {
        if (pendingSequenceRef.current) {
          window.clearTimeout(pendingSequenceRef.current.timeoutId);
          pendingSequenceRef.current = null;
        }
        return;
      }

      // 2. Global Help overlay: '?'
      if (e.key === "?" || directCommandId === "SHOW_SHORTCUT_HELP") {
        e.preventDefault();
        setShortcutHelpOpen(true);
        recordRecentCommand("SHOW_SHORTCUT_HELP");
        return;
      }

      // 3. Single-Key Search focus: '/'
      if (e.key === "/" || directCommandId === "FOCUS_SEARCH") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[name="search"], input[placeholder*="Search"], input[placeholder*="search"]'
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        } else {
          setCommandPaletteOpen(true);
        }
        return;
      }

      // 4. POS Foundation Single-Key Shortcuts (F2, F4, F8, +, -)
      if (["F2", "F4", "F8", "+", "-"].includes(e.key) || ["POS_SEARCH", "POS_CUSTOMER", "POS_PAYMENT", "POS_QTY_INCREMENT", "POS_QTY_DECREMENT"].includes(directCommandId || "")) {
        const cmdId = directCommandId || findCommandByBinding(e.key);
        if (cmdId) {
          e.preventDefault();
          const customHandled = options?.onCustomCommand?.(cmdId);
          if (!customHandled) {
            window.dispatchEvent(new CustomEvent("inventra:pos-command", { detail: { commandId: cmdId } }));
          }
          return;
        }
      }

      // 5. Sequence Chords (e.g. G I, N P, A S, N O, N G, G D, G C, G B, G S, G T)
      if (pendingSequenceRef.current) {
        const firstKey = pendingSequenceRef.current.firstKey;
        window.clearTimeout(pendingSequenceRef.current.timeoutId);
        pendingSequenceRef.current = null;

        const secondKey = e.key.toUpperCase();
        const sequenceBinding = `${firstKey} ${secondKey}`;
        const matchedSeqCmd = findCommandByBinding(sequenceBinding);

        if (matchedSeqCmd) {
          e.preventDefault();
          executeCommand(matchedSeqCmd);
          return;
        }
      }

      // Check if current key starts a sequence in activeKeymap (e.g. "G", "N", "A")
      const upperKey = e.key.toUpperCase();
      const hasMatchingSequence = Object.values(activeKeymap).some((binding) =>
        binding.trim().toUpperCase().startsWith(`${upperKey} `)
      );

      if (hasMatchingSequence && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const timeoutId = window.setTimeout(() => {
          pendingSequenceRef.current = null;
        }, 1000);
        pendingSequenceRef.current = { firstKey: upperKey, timeoutId };
        return;
      }

      // 6. Direct command fallback
      if (directCommandId) {
        const customHandled = options?.onCustomCommand?.(directCommandId);
        if (!customHandled) {
          executeCommand(directCommandId);
        }
      }
    };

    const executeCommand = (cmdId: string) => {
      recordRecentCommand(cmdId);
      switch (cmdId) {
        case "GO_TO_DASHBOARD":
          navigate("/dashboard");
          break;
        case "GO_TO_POS":
          navigate("/pos");
          break;
        case "GO_TO_SALES":
          navigate("/sales");
          break;
        case "GO_TO_CUSTOMERS":
          navigate("/customers");
          break;
        case "GO_TO_RETURNS":
          navigate("/returns");
          break;
        case "GO_TO_TRANSFERS":
          navigate("/transfers");
          break;
        case "GO_TO_IMPORTS":
          navigate("/imports");
          break;
        case "GO_TO_DEVICES":
          navigate("/devices");
          break;
        case "GO_TO_CATALOG":
          navigate("/catalog");
          break;
        case "GO_TO_INVENTORY":
          navigate("/inventory");
          break;
        case "GO_TO_BATCHES":
          navigate("/inventory/batches");
          break;
        case "GO_TO_PURCHASING":
          navigate("/purchasing/orders");
          break;
        case "GO_TO_SUPPLIERS":
          navigate("/suppliers");
          break;
        case "GO_TO_SETTINGS":
          navigate("/settings");
          break;
        case "NEW_CUSTOMER":
          navigate("/customers");
          window.dispatchEvent(new CustomEvent("inventra:open-new-customer"));
          break;
        case "NEW_PRODUCT":
          navigate("/catalog");
          window.dispatchEvent(new CustomEvent("inventra:open-new-product"));
          break;
        case "NEW_PURCHASE_ORDER":
          navigate("/purchasing/orders/new");
          break;
        case "NEW_GOODS_RECEIPT":
          navigate("/purchasing/receipts/new");
          break;
        case "STOCK_ADJUSTMENT":
          window.dispatchEvent(new CustomEvent("inventra:open-stock-adjustment"));
          break;
        default:
          window.dispatchEvent(new CustomEvent("inventra:command", { detail: { commandId: cmdId } }));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (pendingSequenceRef.current) {
        window.clearTimeout(pendingSequenceRef.current.timeoutId);
      }
    };
  }, [activeKeymap, navigate, options, recordRecentCommand, setCommandPaletteOpen, setShortcutHelpOpen]);
}
