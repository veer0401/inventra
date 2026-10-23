import { create } from "zustand";
import { safeLocalStorage } from "./authStore";
import {
  CANONICAL_NAVIGATION_GROUPS,
  NavItemDef,
  isNavAuthorized,
  getAllAvailableNavItems,
} from "../components/shell/navigationRegistry";
import {
  CANONICAL_QUICK_TOOLS,
  QuickToolDef,
  isQuickToolAuthorized,
} from "../components/shell/quickToolsRegistry";

export const MAX_PRIMARY_NAV_ITEMS = 6;

export interface WorkspacePreferences {
  primaryNavIds: string[];
  quickToolIds: string[];
}

export interface WorkspaceState extends WorkspacePreferences {
  activeUserId: string | null;
  isCustomizerOpen: boolean;
  isBarcodeModalOpen: boolean;

  // Actions
  initializeForUser: (userId: string | null, role: string) => void;
  setPrimaryNavIds: (ids: string[]) => void;
  setQuickToolIds: (ids: string[]) => void;
  reorderPrimaryNav: (fromIndex: number, toIndex: number) => void;
  reorderQuickTools: (fromIndex: number, toIndex: number) => void;
  togglePrimaryNavItem: (id: string, role?: string) => void;
  toggleQuickTool: (id: string, role?: string) => void;
  resetToRoleDefaults: (role: string) => void;
  setCustomizerOpen: (open: boolean) => void;
  setBarcodeModalOpen: (open: boolean) => void;

  // Selectors
  getEffectivePrimaryNav: (role: string) => NavItemDef[];
  getEffectiveQuickTools: (role: string) => QuickToolDef[];
}

export function getDefaultPrimaryNavForRole(role: string): string[] {
  switch (role) {
    case "CASHIER":
      return ["pos", "work-sales", "customers", "returns"];
    case "INVENTORY_OPERATOR":
      return ["inventory-group", "transfers", "purchasing-group", "suppliers"];
    case "STAFF":
    case "PHARMACIST":
      return ["dashboard", "work-sales", "inventory-group", "customers"];
    case "PLATFORM_ADMIN":
      return ["onboarding-approvals", "users", "settings"];
    case "OWNER":
    case "MANAGER":
    default:
      return ["dashboard", "work-sales", "inventory-group", "purchasing-group", "reports"];
  }
}

export function getDefaultQuickToolsForRole(role: string): string[] {
  switch (role) {
    case "CASHIER":
      return ["barcode-scan", "new-sale", "search-product", "today-sales", "customers"];
    case "INVENTORY_OPERATOR":
      return ["barcode-scan", "low-stock", "expiring-batches", "stock-movement", "receive-goods"];
    case "STAFF":
    case "PHARMACIST":
      return ["barcode-scan", "new-sale", "search-product", "low-stock", "expiring-batches"];
    case "PLATFORM_ADMIN":
      return ["search-product"];
    case "OWNER":
    case "MANAGER":
    default:
      return [
        "barcode-scan",
        "new-sale",
        "low-stock",
        "expiring-batches",
        "new-purchase",
        "today-sales",
      ];
  }
}

function getStorageKey(userId: string | null): string {
  return `inventra_workspace_nav_${userId || "default"}`;
}

function loadSavedPreferences(userId: string | null, role: string): WorkspacePreferences {
  try {
    const raw = safeLocalStorage.getItem(getStorageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.primaryNavIds) && Array.isArray(parsed.quickToolIds)) {
        return {
          primaryNavIds: parsed.primaryNavIds,
          quickToolIds: parsed.quickToolIds,
        };
      }
    }
  } catch {
    // Fall back to role defaults
  }

  return {
    primaryNavIds: getDefaultPrimaryNavForRole(role),
    quickToolIds: getDefaultQuickToolsForRole(role),
  };
}

function savePreferences(userId: string | null, prefs: WorkspacePreferences): void {
  try {
    safeLocalStorage.setItem(getStorageKey(userId), JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors
  }
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
  const initialPrefs = loadSavedPreferences(null, "OWNER");

  return {
    activeUserId: null,
    primaryNavIds: initialPrefs.primaryNavIds,
    quickToolIds: initialPrefs.quickToolIds,
    isCustomizerOpen: false,
    isBarcodeModalOpen: false,

    initializeForUser: (userId: string | null, role: string) => {
      const prefs = loadSavedPreferences(userId, role);
      set({
        activeUserId: userId,
        primaryNavIds: prefs.primaryNavIds,
        quickToolIds: prefs.quickToolIds,
      });
    },

    setPrimaryNavIds: (ids: string[]) => {
      set({ primaryNavIds: ids });
      savePreferences(get().activeUserId, {
        primaryNavIds: ids,
        quickToolIds: get().quickToolIds,
      });
    },

    setQuickToolIds: (ids: string[]) => {
      set({ quickToolIds: ids });
      savePreferences(get().activeUserId, {
        primaryNavIds: get().primaryNavIds,
        quickToolIds: ids,
      });
    },

    reorderPrimaryNav: (fromIndex: number, toIndex: number) => {
      const current = [...get().primaryNavIds];
      if (
        fromIndex < 0 ||
        fromIndex >= current.length ||
        toIndex < 0 ||
        toIndex >= current.length
      ) {
        return;
      }
      const [moved] = current.splice(fromIndex, 1);
      current.splice(toIndex, 0, moved);
      get().setPrimaryNavIds(current);
    },

    reorderQuickTools: (fromIndex: number, toIndex: number) => {
      const current = [...get().quickToolIds];
      if (
        fromIndex < 0 ||
        fromIndex >= current.length ||
        toIndex < 0 ||
        toIndex >= current.length
      ) {
        return;
      }
      const [moved] = current.splice(fromIndex, 1);
      current.splice(toIndex, 0, moved);
      get().setQuickToolIds(current);
    },

    togglePrimaryNavItem: (id: string, _role?: string) => {
      const current = [...get().primaryNavIds];
      const exists = current.includes(id);
      let next: string[];
      if (exists) {
        // Prevent removing all items
        if (current.length <= 1) return;
        next = current.filter((item) => item !== id);
      } else {
        if (current.length >= MAX_PRIMARY_NAV_ITEMS) return;
        next = [...current, id];
      }
      get().setPrimaryNavIds(next);
    },

    toggleQuickTool: (id: string, _role?: string) => {
      const current = [...get().quickToolIds];
      const exists = current.includes(id);
      let next: string[];
      if (exists) {
        if (current.length <= 1) return;
        next = current.filter((item) => item !== id);
      } else {
        next = [...current, id];
      }
      get().setQuickToolIds(next);
    },

    resetToRoleDefaults: (role: string) => {
      const defaultPrimary = getDefaultPrimaryNavForRole(role);
      const defaultQuick = getDefaultQuickToolsForRole(role);
      set({
        primaryNavIds: defaultPrimary,
        quickToolIds: defaultQuick,
      });
      savePreferences(get().activeUserId, {
        primaryNavIds: defaultPrimary,
        quickToolIds: defaultQuick,
      });
    },

    setCustomizerOpen: (open: boolean) => set({ isCustomizerOpen: open }),
    setBarcodeModalOpen: (open: boolean) => set({ isBarcodeModalOpen: open }),

    /**
     * RBAC Guaranteed Navigation Resolver.
     * Takes user's selected nav IDs, resolves actual items from CANONICAL registry,
     * and strictly strips out any items the role is unauthorized to view.
     */
    getEffectivePrimaryNav: (role: string) => {
      const availableItems = getAllAvailableNavItems(role);
      const availableMap = new Map(availableItems.map((item) => [item.id, item]));

      // Also check sub-children if user pinned a child directly (e.g. pos, sales, batches)
      CANONICAL_NAVIGATION_GROUPS.forEach((group) => {
        group.items.forEach((item) => {
          if (item.children) {
            item.children.forEach((child) => {
              if (isNavAuthorized(child, role)) {
                availableMap.set(child.id, {
                  id: child.id,
                  label: child.label,
                  to: child.to,
                  icon: child.icon || item.icon,
                  shortcut: child.shortcut,
                  allowedRoles: child.allowedRoles,
                });
              }
            });
          }
        });
      });

      const primaryIds = get().primaryNavIds;
      const effective: NavItemDef[] = [];

      primaryIds.forEach((id) => {
        const item = availableMap.get(id);
        if (item && isNavAuthorized(item, role)) {
          effective.push(item);
        }
      });

      // If effective list is empty (e.g. role change wiped them all), fall back to defaults
      if (effective.length === 0) {
        const defaults = getDefaultPrimaryNavForRole(role);
        defaults.forEach((id) => {
          const item = availableMap.get(id);
          if (item && isNavAuthorized(item, role)) {
            effective.push(item);
          }
        });
      }

      return effective.slice(0, MAX_PRIMARY_NAV_ITEMS);
    },

    /**
     * RBAC Guaranteed Quick Tools Resolver.
     * Strictly verifies permission before returning any tool.
     */
    getEffectiveQuickTools: (role: string) => {
      const toolMap = new Map(CANONICAL_QUICK_TOOLS.map((tool) => [tool.id, tool]));
      const toolIds = get().quickToolIds;
      const effective: QuickToolDef[] = [];

      toolIds.forEach((id) => {
        const tool = toolMap.get(id);
        if (tool && isQuickToolAuthorized(tool, role)) {
          effective.push(tool);
        }
      });

      if (effective.length === 0) {
        const defaults = getDefaultQuickToolsForRole(role);
        defaults.forEach((id) => {
          const tool = toolMap.get(id);
          if (tool && isQuickToolAuthorized(tool, role)) {
            effective.push(tool);
          }
        });
      }

      return effective;
    },
  };
});
