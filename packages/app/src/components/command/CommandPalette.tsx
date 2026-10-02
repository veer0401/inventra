import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  ArrowRight,
  LayoutDashboard,
  Package,
  Boxes,
  FileSpreadsheet,
  Truck,
  Settings,
  PlusCircle,
  SlidersHorizontal,
  HelpCircle,
  CreditCard,
  UserCheck,
  Plus,
  Minus,
  ShoppingCart,
  Receipt,
  ArrowLeftRight,
  UploadCloud,
  Smartphone,
  Sparkles,
} from "lucide-react";
import {
  useShortcutStore,
  DEFAULT_COMMANDS,
  CommandDefinition,
} from "../../stores/shortcutStore";
import { ShortcutHint } from "@inventra/ui";

const ICON_MAP: Record<string, React.ReactNode> = {
  OPEN_COMMAND_PALETTE: <Search className="h-4 w-4 text-primary" />,
  OPEN_INTELLIGENCE: <Sparkles className="h-4 w-4 text-accent" />,
  TOGGLE_SIDEBAR: <SlidersHorizontal className="h-4 w-4 text-secondary" />,
  SHOW_SHORTCUT_HELP: <HelpCircle className="h-4 w-4 text-secondary" />,
  GO_TO_DASHBOARD: <LayoutDashboard className="h-4 w-4 text-primary" />,
  GO_TO_POS: <ShoppingCart className="h-4 w-4 text-primary" />,
  GO_TO_SALES: <Receipt className="h-4 w-4 text-primary" />,
  GO_TO_TRANSFERS: <ArrowLeftRight className="h-4 w-4 text-primary" />,
  GO_TO_IMPORTS: <UploadCloud className="h-4 w-4 text-primary" />,
  GO_TO_DEVICES: <Smartphone className="h-4 w-4 text-primary" />,
  GO_TO_CATALOG: <Package className="h-4 w-4 text-primary" />,
  GO_TO_INVENTORY: <Boxes className="h-4 w-4 text-primary" />,
  GO_TO_BATCHES: <Boxes className="h-4 w-4 text-warning" />,
  GO_TO_PURCHASING: <FileSpreadsheet className="h-4 w-4 text-primary" />,
  GO_TO_SUPPLIERS: <Truck className="h-4 w-4 text-primary" />,
  GO_TO_SETTINGS: <Settings className="h-4 w-4 text-secondary" />,
  NEW_PRODUCT: <PlusCircle className="h-4 w-4 text-success" />,
  NEW_PURCHASE_ORDER: <PlusCircle className="h-4 w-4 text-success" />,
  NEW_GOODS_RECEIPT: <Truck className="h-4 w-4 text-success" />,
  STOCK_ADJUSTMENT: <SlidersHorizontal className="h-4 w-4 text-warning" />,
  FOCUS_SEARCH: <Search className="h-4 w-4 text-secondary" />,
  EDIT_SELECTED: <ArrowRight className="h-4 w-4 text-secondary" />,
  POS_SEARCH: <Search className="h-4 w-4 text-primary" />,
  POS_CUSTOMER: <UserCheck className="h-4 w-4 text-primary" />,
  POS_PAYMENT: <CreditCard className="h-4 w-4 text-success" />,
  POS_QTY_INCREMENT: <Plus className="h-4 w-4 text-primary" />,
  POS_QTY_DECREMENT: <Minus className="h-4 w-4 text-primary" />,
};

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    activeKeymap,
    recentCommandIds,
    recordRecentCommand,
  } = useShortcutStore();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands by search query
  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return DEFAULT_COMMANDS;
    }
    return DEFAULT_COMMANDS.filter((cmd) => {
      const matchLabel = cmd.label.toLowerCase().includes(q);
      const matchDesc = cmd.description.toLowerCase().includes(q);
      const matchKeywords = cmd.keywords?.some((k) => k.toLowerCase().includes(q));
      const matchBinding = (activeKeymap[cmd.id] || cmd.defaultBinding).toLowerCase().includes(q);
      return matchLabel || matchDesc || matchKeywords || matchBinding;
    });
  }, [query, activeKeymap]);

  // Group filtered commands
  const groupedSections = useMemo(() => {
    if (!query.trim()) {
      // Show Recents if empty query
      const recentCmds = recentCommandIds
        .map((id) => DEFAULT_COMMANDS.find((c) => c.id === id))
        .filter((c): c is CommandDefinition => Boolean(c));

      const navCmds = DEFAULT_COMMANDS.filter((c) => c.category === "NAVIGATION");
      const createCmds = DEFAULT_COMMANDS.filter((c) => c.category === "CREATE" || c.category === "ACTIONS");
      const systemCmds = DEFAULT_COMMANDS.filter((c) => c.category === "SYSTEM");

      return [
        { title: "RECENT", items: recentCmds },
        { title: "NAVIGATION", items: navCmds },
        { title: "CREATE & QUICK ACTIONS", items: createCmds },
        { title: "SYSTEM & PREFERENCES", items: systemCmds },
      ].filter((s) => s.items.length > 0);
    } else {
      return [
        { title: "MATCHING COMMANDS", items: filteredCommands },
      ].filter((s) => s.items.length > 0);
    }
  }, [query, filteredCommands, recentCommandIds]);



  // Flattened list for keyboard selection index
  const flatItems = useMemo(() => {
    const list: CommandDefinition[] = [];
    for (const sec of groupedSections) {
      for (const item of sec.items) {
        list.push(item);
      }
    }
    return list;
  }, [groupedSections]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Execute selected command
  const executeCommand = (cmd: CommandDefinition) => {
    recordRecentCommand(cmd.id);
    setCommandPaletteOpen(false);

    switch (cmd.id) {
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
      case "NEW_CUSTOMER":
        navigate("/customers");
        window.dispatchEvent(new CustomEvent("inventra:open-new-customer"));
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
      case "TOGGLE_SIDEBAR":
        window.dispatchEvent(new CustomEvent("inventra:toggle-sidebar"));
        break;
      case "SHOW_SHORTCUT_HELP":
        useShortcutStore.getState().setShortcutHelpOpen(true);
        break;
      case "OPEN_INTELLIGENCE":
        useShortcutStore.getState().setIntelligenceOpen(true);
        break;
      default:
        window.dispatchEvent(new CustomEvent("inventra:command", { detail: { commandId: cmd.id } }));
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (flatItems.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % (flatItems.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        executeCommand(flatItems[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setCommandPaletteOpen(false);
    }
  };

  if (!commandPaletteOpen) return null;

  let currentCounter = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-surface rounded-xl border border-strong shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[520px] transition-colors"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        {/* Header Search Input */}
        <div className="flex items-center px-4 border-b border-subtle h-14 bg-surface gap-3 shrink-0">
          <Search className="h-5 w-5 text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, navigate pages, create orders (or type /)..."
            className="flex-1 bg-transparent text-sm text-primary placeholder:text-muted outline-none font-medium"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 text-muted hover:text-primary rounded"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <ShortcutHint shortcut="Esc" compact />
          )}
        </div>

        {/* Commands List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-4 text-primary"
          role="listbox"
        >
          {flatItems.length === 0 ? (
            <div className="py-12 text-center text-muted text-xs">
              No matching commands or actions found for &quot;{query}&quot;
            </div>
          ) : (
            groupedSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-mono font-bold tracking-wider text-muted uppercase">
                  {section.title}
                </div>
                {section.items.map((cmd) => {
                  const itemIndex = currentCounter++;
                  const isSelected = itemIndex === selectedIndex;
                  const boundKey = activeKeymap[cmd.id] || cmd.defaultBinding;

                  return (
                    <div
                      key={`${section.title}-${cmd.id}`}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      role="option"
                      aria-selected={isSelected}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        isSelected
                          ? "bg-surface-muted border-l-2 border-accent text-primary font-medium"
                          : "text-secondary hover:bg-surface-muted hover:text-primary border-l-2 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="p-1 rounded bg-surface-elevated border border-subtle shrink-0">
                          {ICON_MAP[cmd.id] || <Sparkles className="h-4 w-4 text-primary" />}
                        </span>
                        <div className="truncate">
                          <div className="text-primary font-medium truncate">{cmd.label}</div>
                          <div className="text-[11px] text-muted truncate">{cmd.description}</div>
                        </div>
                      </div>
                      <div className="shrink-0 ml-3">
                        <ShortcutHint shortcut={boundKey} compact />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 border-t border-subtle bg-surface-muted text-[11px] text-muted flex items-center justify-between font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span>↑↓ to navigate</span>
            <span>•</span>
            <span>↵ to execute</span>
            <span>•</span>
            <span>Esc to close</span>
          </div>
          <div>Inventra Quick Access</div>
        </div>
      </div>
    </div>
  );
};
