import { describe, it, expect, beforeEach } from "vitest";
import {
  useShortcutStore,
  DEFAULT_COMMANDS,
  isBrowserReserved,
} from "./shortcutStore";

describe("F5 shortcutStore", () => {
  beforeEach(() => {
    useShortcutStore.setState({
      profiles: [],
      activeProfile: null,
      activeKeymap: Object.fromEntries(
        DEFAULT_COMMANDS.map((c) => [c.id, c.defaultBinding])
      ),
      recentCommandIds: ["OPEN_COMMAND_PALETTE"],
      commandPaletteOpen: false,
      shortcutHelpOpen: false,
    });
  });

  it("initializes with default ERP keybindings", () => {
    const state = useShortcutStore.getState();
    expect(state.getBindingForCommand("OPEN_COMMAND_PALETTE")).toBe("Ctrl+K");
    expect(state.getBindingForCommand("GO_TO_INVENTORY")).toBe("G I");
    expect(state.getBindingForCommand("NEW_PRODUCT")).toBe("N P");
    expect(state.getBindingForCommand("TOGGLE_SIDEBAR")).toBe("Ctrl+B");
    expect(state.getBindingForCommand("SHOW_SHORTCUT_HELP")).toBe("?");
  });

  it("identifies browser reserved shortcuts accurately", () => {
    expect(isBrowserReserved("Ctrl+W")).toBe(true);
    expect(isBrowserReserved("Ctrl+T")).toBe(true);
    expect(isBrowserReserved("Ctrl+R")).toBe(true);
    expect(isBrowserReserved("F5")).toBe(true);
    expect(isBrowserReserved("Ctrl+K")).toBe(false);
    expect(isBrowserReserved("G I")).toBe(false);
    expect(isBrowserReserved("N P")).toBe(false);
  });

  it("detects shortcut collision and conflicts", () => {
    const state = useShortcutStore.getState();
    const conflict = state.validateConflict("NEW_PRODUCT", "Ctrl+K");
    expect(conflict.hasConflict).toBe(true);
    expect(conflict.conflictingCommand?.id).toBe("OPEN_COMMAND_PALETTE");

    const noConflict = state.validateConflict("NEW_PRODUCT", "Alt+Shift+X");
    expect(noConflict.hasConflict).toBe(false);
  });

  it("tracks recent command executions", () => {
    const store = useShortcutStore.getState();
    store.recordRecentCommand("GO_TO_PURCHASING");
    expect(useShortcutStore.getState().recentCommandIds[0]).toBe("GO_TO_PURCHASING");

    store.recordRecentCommand("GO_TO_CATALOG");
    expect(useShortcutStore.getState().recentCommandIds[0]).toBe("GO_TO_CATALOG");
    expect(useShortcutStore.getState().recentCommandIds[1]).toBe("GO_TO_PURCHASING");
  });

  it("toggles command palette and help sheet modals", () => {
    const store = useShortcutStore.getState();
    expect(store.commandPaletteOpen).toBe(false);
    store.setCommandPaletteOpen(true);
    expect(useShortcutStore.getState().commandPaletteOpen).toBe(true);

    expect(store.shortcutHelpOpen).toBe(false);
    store.setShortcutHelpOpen(true);
    expect(useShortcutStore.getState().shortcutHelpOpen).toBe(true);
  });
});
