import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ShortcutProfile } from "@inventra/api-types";
import { shortcutApi } from "../services/shortcutApi";

export type CommandScope = "GLOBAL" | "NAVIGATION" | "PAGE" | "TABLE" | "FORM" | "POS" | "DIALOG";
export type CommandCategory = "NAVIGATION" | "CREATE" | "ACTIONS" | "SYSTEM";

export interface CommandDefinition {
  id: string;
  label: string;
  description: string;
  category: CommandCategory;
  defaultBinding: string;
  scope: CommandScope;
  keywords?: string[];
  icon?: string;
  destructive?: boolean;
}

export const DEFAULT_COMMANDS: CommandDefinition[] = [
  // GLOBAL
  {
    id: "OPEN_COMMAND_PALETTE",
    label: "Open Command Palette",
    description: "Search commands, navigate pages, and execute quick actions",
    category: "SYSTEM",
    defaultBinding: "Ctrl+K",
    scope: "GLOBAL",
    keywords: ["search", "menu", "find", "jump"],
  },
  {
    id: "TOGGLE_SIDEBAR",
    label: "Toggle Sidebar Rail",
    description: "Collapse or expand the navigation sidebar rail",
    category: "SYSTEM",
    defaultBinding: "Ctrl+B",
    scope: "GLOBAL",
    keywords: ["sidebar", "menu", "collapse", "expand"],
  },
  {
    id: "SHOW_SHORTCUT_HELP",
    label: "Keyboard Shortcuts Cheatsheet",
    description: "Display shortcut reference overview overlay",
    category: "SYSTEM",
    defaultBinding: "?",
    scope: "GLOBAL",
    keywords: ["help", "shortcuts", "hotkeys", "reference"],
  },
  {
    id: "OPEN_INTELLIGENCE",
    label: "Inventra Intelligence",
    description: "Open natural language intelligence command surface",
    category: "SYSTEM",
    defaultBinding: "Ctrl+J",
    scope: "GLOBAL",
    keywords: ["ai", "intelligence", "nlp", "query", "ask", "understand"],
  },

  // NAVIGATION
  {
    id: "GO_TO_DASHBOARD",
    label: "Go to Dashboard",
    description: "Navigate to the operational dashboard",
    category: "NAVIGATION",
    defaultBinding: "G D",
    scope: "NAVIGATION",
    keywords: ["home", "overview", "analytics"],
  },
  {
    id: "GO_TO_POS",
    label: "Go to Point of Sale (POS)",
    description: "Open the retail billing and rapid barcode checkout terminal",
    category: "NAVIGATION",
    defaultBinding: "G O",
    scope: "NAVIGATION",
    keywords: ["pos", "point of sale", "cashier", "billing", "checkout", "retail"],
  },
  {
    id: "GO_TO_SALES",
    label: "Go to Sales History",
    description: "Navigate to historical sales, invoices, and completed receipts",
    category: "NAVIGATION",
    defaultBinding: "G L",
    scope: "NAVIGATION",
    keywords: ["sales", "invoices", "receipts", "history", "orders"],
  },
  {
    id: "GO_TO_CATALOG",
    label: "Go to Product Catalog",
    description: "Navigate to catalog medicines and products",
    category: "NAVIGATION",
    defaultBinding: "G C",
    scope: "NAVIGATION",
    keywords: ["catalog", "products", "medicines", "drugs"],
  },
  {
    id: "GO_TO_INVENTORY",
    label: "Go to Store Inventory",
    description: "Navigate to store inventory levels and stock counts",
    category: "NAVIGATION",
    defaultBinding: "G I",
    scope: "NAVIGATION",
    keywords: ["stock", "inventory", "supplies"],
  },
  {
    id: "GO_TO_BATCHES",
    label: "Go to Batches & FEFO Explorer",
    description: "Navigate to store batch lots and near-expiry explorer",
    category: "NAVIGATION",
    defaultBinding: "G B",
    scope: "NAVIGATION",
    keywords: ["batches", "expiry", "fefo", "lots"],
  },
  {
    id: "GO_TO_PURCHASING",
    label: "Go to Purchase Orders",
    description: "Navigate to procurement and purchase orders",
    category: "NAVIGATION",
    defaultBinding: "G P",
    scope: "NAVIGATION",
    keywords: ["purchase", "orders", "procurement", "po"],
  },
  {
    id: "GO_TO_SUPPLIERS",
    label: "Go to Suppliers & Vendors",
    description: "Navigate to vendor catalog and supplier profiles",
    category: "NAVIGATION",
    defaultBinding: "G S",
    scope: "NAVIGATION",
    keywords: ["suppliers", "vendors", "distributors"],
  },
  {
    id: "GO_TO_CUSTOMERS",
    label: "Go to Customer Management",
    description: "Navigate to patient profiles and customer purchasing directory",
    category: "NAVIGATION",
    defaultBinding: "G U",
    scope: "NAVIGATION",
    keywords: ["customers", "patients", "clients", "directory"],
  },
  {
    id: "GO_TO_RETURNS",
    label: "Go to Sales Returns",
    description: "Navigate to sales return transactions and credit notes",
    category: "NAVIGATION",
    defaultBinding: "G R",
    scope: "NAVIGATION",
    keywords: ["returns", "credit notes", "refunds", "rma"],
  },
  {
    id: "GO_TO_TRANSFERS",
    label: "Go to Store Transfers",
    description: "Navigate to inter-store inventory transfers and stock movements",
    category: "NAVIGATION",
    defaultBinding: "G X",
    scope: "NAVIGATION",
    keywords: ["transfers", "dispatch", "receiving", "inter-store", "branches"],
  },
  {
    id: "GO_TO_IMPORTS",
    label: "Go to Universal Ingestion",
    description: "Navigate to bulk CSV data ingestion and draft verification center",
    category: "NAVIGATION",
    defaultBinding: "G M",
    scope: "NAVIGATION",
    keywords: ["import", "csv", "ingestion", "upload", "bulk"],
  },
  {
    id: "GO_TO_DEVICES",
    label: "Go to Registered Devices",
    description: "Navigate to POS hardware terminals and workstation devices",
    category: "NAVIGATION",
    defaultBinding: "G E",
    scope: "NAVIGATION",
    keywords: ["devices", "terminals", "hardware", "pos"],
  },
  {
    id: "GO_TO_SETTINGS",
    label: "Go to Workstation Settings",
    description: "Navigate to appearance and user preferences",
    category: "SYSTEM",
    defaultBinding: "G T",
    scope: "NAVIGATION",
    keywords: ["settings", "theme", "appearance", "config"],
  },

  // CREATE & QUICK ACTIONS
  {
    id: "NEW_CUSTOMER",
    label: "New Customer Profile",
    description: "Register a new patient or retail customer profile",
    category: "CREATE",
    defaultBinding: "N C",
    scope: "PAGE",
    keywords: ["create customer", "add patient", "new customer"],
  },
  {
    id: "POS_SELECT_CUSTOMER",
    label: "Attach Customer to POS Cart",
    description: "Search and attach customer profile to current POS checkout cart",
    category: "ACTIONS",
    defaultBinding: "F4",
    scope: "POS",
    keywords: ["customer", "attach", "patient", "search customer"],
  },
  {
    id: "START_SALE_RETURN",
    label: "Initiate Return for Sale",
    description: "Start guided return workspace for current sale invoice",
    category: "ACTIONS",
    defaultBinding: "F6",
    scope: "PAGE",
    keywords: ["return", "refund", "credit note"],
  },
  {
    id: "NEW_PRODUCT",
    label: "New Catalog Product",
    description: "Create a new medicine or catalog product item",
    category: "CREATE",
    defaultBinding: "N P",
    scope: "PAGE",
    keywords: ["create product", "add medicine", "new item"],
  },
  {
    id: "NEW_PURCHASE_ORDER",
    label: "New Purchase Order (PO)",
    description: "Create a new supplier purchase order",
    category: "CREATE",
    defaultBinding: "N O",
    scope: "PAGE",
    keywords: ["create po", "buy", "order stock"],
  },
  {
    id: "NEW_GOODS_RECEIPT",
    label: "New Goods Receipt (GRN)",
    description: "Receive stock and record a Goods Receipt Note",
    category: "CREATE",
    defaultBinding: "N G",
    scope: "PAGE",
    keywords: ["receive", "grn", "inbound", "stock in"],
  },
  {
    id: "STOCK_ADJUSTMENT",
    label: "Record Stock Adjustment",
    description: "Audit cycle count, write-off damage, or correct inventory delta",
    category: "ACTIONS",
    defaultBinding: "A S",
    scope: "PAGE",
    keywords: ["adjust", "write-off", "damage", "reconcile"],
  },
  {
    id: "FOCUS_SEARCH",
    label: "Focus Page Search Bar",
    description: "Jump focus directly into the active table search input",
    category: "ACTIONS",
    defaultBinding: "/",
    scope: "PAGE",
    keywords: ["search", "filter", "find"],
  },
  {
    id: "EDIT_SELECTED",
    label: "Edit Selected Item",
    description: "Open the editor for the currently focused table row",
    category: "ACTIONS",
    defaultBinding: "E",
    scope: "TABLE",
    keywords: ["edit", "modify", "update"],
  },

  // POS FOUNDATION
  {
    id: "POS_SEARCH",
    label: "POS: Product / Barcode Search",
    description: "Focus rapid product scanner or catalog search",
    category: "ACTIONS",
    defaultBinding: "F2",
    scope: "POS",
    keywords: ["pos", "barcode", "scan", "item"],
  },
  {
    id: "POS_CUSTOMER",
    label: "POS: Attach Customer",
    description: "Search and attach customer profile or patient prescription",
    category: "ACTIONS",
    defaultBinding: "F4",
    scope: "POS",
    keywords: ["customer", "patient", "client"],
  },
  {
    id: "POS_PAYMENT",
    label: "POS: Settle Payment & Tender",
    description: "Open checkout payment and tender settlement dialog",
    category: "ACTIONS",
    defaultBinding: "F8",
    scope: "POS",
    keywords: ["pay", "checkout", "tender", "bill"],
  },
  {
    id: "POS_QTY_INCREMENT",
    label: "POS: Increment Quantity (+)",
    description: "Increase quantity of currently selected cart line",
    category: "ACTIONS",
    defaultBinding: "+",
    scope: "POS",
    keywords: ["plus", "increment", "add"],
  },
  {
    id: "POS_QTY_DECREMENT",
    label: "POS: Decrement Quantity (-)",
    description: "Decrease quantity of currently selected cart line",
    category: "ACTIONS",
    defaultBinding: "-",
    scope: "POS",
    keywords: ["minus", "decrement", "reduce"],
  },
];

export const BROWSER_RESERVED_KEYS = [
  "ctrl+w",
  "cmd+w",
  "meta+w",
  "ctrl+t",
  "cmd+t",
  "meta+t",
  "ctrl+n",
  "cmd+n",
  "meta+n",
  "ctrl+r",
  "cmd+r",
  "meta+r",
  "f5",
  "ctrl+shift+i",
  "cmd+alt+i",
  "f12",
  "ctrl+tab",
  "ctrl+shift+tab",
  "alt+f4",
];

export function isBrowserReserved(shortcut: string): boolean {
  if (!shortcut) return false;
  const normalized = shortcut.trim().toLowerCase().replace(/\s+/g, "");
  return BROWSER_RESERVED_KEYS.includes(normalized);
}

export interface ShortcutStoreState {
  // Profiles
  profiles: ShortcutProfile[];
  activeProfile: ShortcutProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Active Keymap (calculated: defaults + active profile overrides)
  activeKeymap: Record<string, string>;

  // Recent commands
  recentCommandIds: string[];

  // Modals UI state
  commandPaletteOpen: boolean;
  shortcutHelpOpen: boolean;
  intelligenceOpen: boolean;
  copilotOpen: boolean;

  // Actions
  setCommandPaletteOpen: (open: boolean) => void;
  setShortcutHelpOpen: (open: boolean) => void;
  setIntelligenceOpen: (open: boolean) => void;
  setCopilotOpen: (open: boolean) => void;
  toggleIntelligence: () => void;
  toggleCopilot: () => void;
  fetchProfiles: () => Promise<void>;
  createProfile: (name: string, description?: string, shortcuts?: Record<string, string>) => Promise<ShortcutProfile>;
  updateProfile: (id: string, name?: string, description?: string, shortcuts?: Record<string, string>) => Promise<ShortcutProfile>;
  activateProfile: (id: string) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  resetProfile: (id: string) => Promise<void>;
  setShortcutOverride: (commandId: string, binding: string) => Promise<void>;
  recordRecentCommand: (commandId: string) => void;

  // Utilities
  getBindingForCommand: (commandId: string) => string;
  getCommandForBinding: (binding: string) => CommandDefinition | undefined;
  validateConflict: (commandId: string, newBinding: string) => { hasConflict: boolean; conflictingCommand?: CommandDefinition };
}

export const useShortcutStore = create<ShortcutStoreState>()(
  persist(
    (set, get) => {
      const buildKeymap = (profile: ShortcutProfile | null) => {
        const keymap: Record<string, string> = {};
        for (const cmd of DEFAULT_COMMANDS) {
          keymap[cmd.id] = cmd.defaultBinding;
        }
        if (profile && profile.shortcuts) {
          for (const [cmdId, binding] of Object.entries(profile.shortcuts)) {
            if (binding) {
              keymap[cmdId] = binding;
            }
          }
        }
        return keymap;
      };

      return {
        profiles: [],
        activeProfile: null,
        isLoading: false,
        isSaving: false,
        error: null,
        activeKeymap: buildKeymap(null),
        recentCommandIds: ["OPEN_COMMAND_PALETTE", "GO_TO_INVENTORY", "NEW_PRODUCT"],
        commandPaletteOpen: false,
        shortcutHelpOpen: false,
        intelligenceOpen: false,
        copilotOpen: false,

        setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
        setShortcutHelpOpen: (open) => set({ shortcutHelpOpen: open }),
        setIntelligenceOpen: (open) => set({ intelligenceOpen: open, copilotOpen: open }),
        setCopilotOpen: (open) => set({ copilotOpen: open, intelligenceOpen: open }),
        toggleIntelligence: () =>
          set((state) => {
            const next = !state.intelligenceOpen;
            return { intelligenceOpen: next, copilotOpen: next };
          }),
        toggleCopilot: () =>
          set((state) => {
            const next = !state.copilotOpen;
            return { copilotOpen: next, intelligenceOpen: next };
          }),

        fetchProfiles: async () => {
          set({ isLoading: true, error: null });
          try {
            const profiles = await shortcutApi.listProfiles();
            const active = profiles.find((p) => p.isActive) || (profiles.length > 0 ? profiles[0] : null);
            set({
              profiles,
              activeProfile: active,
              activeKeymap: buildKeymap(active),
              isLoading: false,
            });
          } catch (err: any) {
            set({
              isLoading: false,
              error: err?.message || "Failed to load shortcut profiles",
            });
          }
        },

        createProfile: async (name, description, shortcuts = {}) => {
          set({ isSaving: true, error: null });
          try {
            const created = await shortcutApi.createProfile({
              name,
              description,
              isActive: true,
              shortcuts,
            });
            const profiles = await shortcutApi.listProfiles();
            const active = profiles.find((p) => p.id === created.id) || created;
            set({
              profiles,
              activeProfile: active,
              activeKeymap: buildKeymap(active),
              isSaving: false,
            });
            return created;
          } catch (err: any) {
            set({ isSaving: false, error: err?.message || "Failed to create profile" });
            throw err;
          }
        },

        updateProfile: async (id, name, description, shortcuts) => {
          set({ isSaving: true, error: null });
          try {
            const updated = await shortcutApi.updateProfile(id, {
              name,
              description,
              shortcuts,
            });
            const profiles = await shortcutApi.listProfiles();
            const active = profiles.find((p) => p.isActive) || (profiles.length > 0 ? profiles[0] : null);
            set({
              profiles,
              activeProfile: active,
              activeKeymap: buildKeymap(active),
              isSaving: false,
            });
            return updated;
          } catch (err: any) {
            set({ isSaving: false, error: err?.message || "Failed to update profile" });
            throw err;
          }
        },

        activateProfile: async (id) => {
          set({ isSaving: true, error: null });
          try {
            const activated = await shortcutApi.activateProfile(id);
            const profiles = await shortcutApi.listProfiles();
            set({
              profiles,
              activeProfile: activated,
              activeKeymap: buildKeymap(activated),
              isSaving: false,
            });
          } catch (err: any) {
            set({ isSaving: false, error: err?.message || "Failed to activate profile" });
            throw err;
          }
        },

        deleteProfile: async (id) => {
          set({ isSaving: true, error: null });
          try {
            await shortcutApi.deleteProfile(id);
            const profiles = await shortcutApi.listProfiles();
            const active = profiles.find((p) => p.isActive) || (profiles.length > 0 ? profiles[0] : null);
            set({
              profiles,
              activeProfile: active,
              activeKeymap: buildKeymap(active),
              isSaving: false,
            });
          } catch (err: any) {
            set({ isSaving: false, error: err?.message || "Failed to delete profile" });
            throw err;
          }
        },

        resetProfile: async (id) => {
          set({ isSaving: true, error: null });
          try {
            const reset = await shortcutApi.resetProfile(id);
            const profiles = await shortcutApi.listProfiles();
            set({
              profiles,
              activeProfile: reset,
              activeKeymap: buildKeymap(reset),
              isSaving: false,
            });
          } catch (err: any) {
            set({ isSaving: false, error: err?.message || "Failed to reset profile" });
            throw err;
          }
        },

        setShortcutOverride: async (commandId, binding) => {
          const { activeProfile, createProfile, updateProfile } = get();
          let targetProfile = activeProfile;

          if (!targetProfile) {
            // Auto create Default Profile if user has none saved yet
            targetProfile = await createProfile("My Shortcuts", "Personal custom hotkeys", {
              [commandId]: binding,
            });
            return;
          }

          const updatedShortcuts = {
            ...(targetProfile.shortcuts || {}),
            [commandId]: binding,
          };
          await updateProfile(targetProfile.id, undefined, undefined, updatedShortcuts);
        },

        recordRecentCommand: (commandId) => {
          set((state) => {
            const filtered = state.recentCommandIds.filter((id) => id !== commandId);
            return {
              recentCommandIds: [commandId, ...filtered].slice(0, 5),
            };
          });
        },

        getBindingForCommand: (commandId) => {
          const { activeKeymap } = get();
          return activeKeymap[commandId] || DEFAULT_COMMANDS.find((c) => c.id === commandId)?.defaultBinding || "";
        },

        getCommandForBinding: (binding) => {
          const { activeKeymap } = get();
          const normalizedTarget = binding.trim().toUpperCase();
          for (const [cmdId, boundKey] of Object.entries(activeKeymap)) {
            if (boundKey.trim().toUpperCase() === normalizedTarget) {
              return DEFAULT_COMMANDS.find((c) => c.id === cmdId);
            }
          }
          return undefined;
        },

        validateConflict: (commandId, newBinding) => {
          const { activeKeymap } = get();
          const normalizedNew = newBinding.trim().toUpperCase();
          for (const [cmdId, boundKey] of Object.entries(activeKeymap)) {
            if (cmdId !== commandId && boundKey.trim().toUpperCase() === normalizedNew) {
              const conflicting = DEFAULT_COMMANDS.find((c) => c.id === cmdId);
              return { hasConflict: true, conflictingCommand: conflicting };
            }
          }
          return { hasConflict: false };
        },
      };
    },
    {
      name: "inventra_shortcuts_cache",
      partialize: (state) => ({
        recentCommandIds: state.recentCommandIds,
        copilotOpen: state.copilotOpen,
        intelligenceOpen: state.intelligenceOpen,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const isOpen = Boolean(state.intelligenceOpen || state.copilotOpen);
          state.intelligenceOpen = isOpen;
          state.copilotOpen = isOpen;
        }
      },
    }
  )
);
