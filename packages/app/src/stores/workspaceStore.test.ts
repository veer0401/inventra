import { describe, it, expect, beforeEach } from "vitest";
import {
  useWorkspaceStore,
  getDefaultPrimaryNavForRole,
  getDefaultQuickToolsForRole,
} from "./workspaceStore";

describe("Workspace Store (useWorkspaceStore) & Per-User Navigation Preferences", () => {
  beforeEach(() => {
    localStorage.clear();
    useWorkspaceStore.setState({
      activeUserId: null,
      primaryNavIds: getDefaultPrimaryNavForRole("OWNER"),
      quickToolIds: getDefaultQuickToolsForRole("OWNER"),
      isCustomizerOpen: false,
      isBarcodeModalOpen: false,
    });
  });

  it("initializes with default role navigation for OWNER", () => {
    const store = useWorkspaceStore.getState();
    expect(store.primaryNavIds).toContain("dashboard");
    expect(store.primaryNavIds).toContain("work-sales");
    expect(store.primaryNavIds).toContain("inventory-group");
    expect(store.primaryNavIds).toContain("purchasing-group");
    expect(store.primaryNavIds).toContain("reports");
  });

  it("provides tailored role defaults for CASHIER and INVENTORY_OPERATOR", () => {
    const cashierNav = getDefaultPrimaryNavForRole("CASHIER");
    expect(cashierNav).toContain("pos");
    expect(cashierNav).toContain("work-sales");
    expect(cashierNav).not.toContain("purchasing-group");

    const cashierTools = getDefaultQuickToolsForRole("CASHIER");
    expect(cashierTools).toContain("barcode-scan");
    expect(cashierTools).toContain("new-sale");
    expect(cashierTools).not.toContain("new-purchase");

    const inventoryNav = getDefaultPrimaryNavForRole("INVENTORY_OPERATOR");
    expect(inventoryNav).toContain("inventory-group");
    expect(inventoryNav).toContain("transfers");
    expect(inventoryNav).not.toContain("dashboard");
  });

  it("persists user customization to per-user localStorage key", () => {
    const store = useWorkspaceStore.getState();
    store.initializeForUser("usr-apollo-1", "OWNER");

    store.setPrimaryNavIds(["reports", "inventory-group", "work-sales"]);
    store.setQuickToolIds(["barcode-scan", "expiring-batches"]);

    const savedRaw = localStorage.getItem("inventra_workspace_nav_usr-apollo-1");
    expect(savedRaw).not.toBeNull();
    const saved = JSON.parse(savedRaw!);
    expect(saved.primaryNavIds).toEqual(["reports", "inventory-group", "work-sales"]);
    expect(saved.quickToolIds).toEqual(["barcode-scan", "expiring-batches"]);
  });

  it("maintains user isolation: User A customization does not affect User B", () => {
    const store = useWorkspaceStore.getState();

    // User A sets custom tabs
    store.initializeForUser("user-a", "OWNER");
    store.setPrimaryNavIds(["reports", "dashboard"]);

    // User B initializes with defaults
    store.initializeForUser("user-b", "CASHIER");
    expect(useWorkspaceStore.getState().primaryNavIds).toEqual(
      getDefaultPrimaryNavForRole("CASHIER")
    );

    // Switch back to User A
    store.initializeForUser("user-a", "OWNER");
    expect(useWorkspaceStore.getState().primaryNavIds).toEqual(["reports", "dashboard"]);
  });

  it("reorders primary navigation tabs", () => {
    const store = useWorkspaceStore.getState();
    store.setPrimaryNavIds(["dashboard", "work-sales", "inventory-group"]);

    // Move dashboard from index 0 to index 2
    store.reorderPrimaryNav(0, 2);
    expect(useWorkspaceStore.getState().primaryNavIds).toEqual([
      "work-sales",
      "inventory-group",
      "dashboard",
    ]);
  });

  it("reorders quick tools", () => {
    const store = useWorkspaceStore.getState();
    store.setQuickToolIds(["barcode-scan", "new-sale", "low-stock"]);

    // Move low-stock from index 2 to index 0
    store.reorderQuickTools(2, 0);
    expect(useWorkspaceStore.getState().quickToolIds).toEqual([
      "low-stock",
      "barcode-scan",
      "new-sale",
    ]);
  });

  it("toggles primary navigation items without dropping below 1 item", () => {
    const store = useWorkspaceStore.getState();
    store.setPrimaryNavIds(["dashboard", "reports"]);

    // Remove reports
    store.togglePrimaryNavItem("reports", "OWNER");
    expect(useWorkspaceStore.getState().primaryNavIds).toEqual(["dashboard"]);

    // Attempting to remove the last item is blocked
    store.togglePrimaryNavItem("dashboard", "OWNER");
    expect(useWorkspaceStore.getState().primaryNavIds).toEqual(["dashboard"]);

    // Add reports back
    store.togglePrimaryNavItem("reports", "OWNER");
    expect(useWorkspaceStore.getState().primaryNavIds).toEqual(["dashboard", "reports"]);
  });

  it("resets preferences to role defaults on demand", () => {
    const store = useWorkspaceStore.getState();
    store.initializeForUser("usr-1", "OWNER");
    store.setPrimaryNavIds(["reports"]);

    store.resetToRoleDefaults("OWNER");
    expect(useWorkspaceStore.getState().primaryNavIds).toEqual(
      getDefaultPrimaryNavForRole("OWNER")
    );
  });

  describe("RBAC Security Enforcement", () => {
    it("guarantees unauthorized modules are strictly stripped from effective navigation", () => {
      const store = useWorkspaceStore.getState();
      // Suppose a CASHIER user's storage was manipulated to include purchasing or admin
      store.setPrimaryNavIds(["pos", "purchasing-group", "users", "customers"]);

      const effectiveNav = store.getEffectivePrimaryNav("CASHIER");
      const effectiveIds = effectiveNav.map((item) => item.id);

      expect(effectiveIds).toContain("pos");
      expect(effectiveIds).toContain("customers");
      // Must NOT contain unauthorized items
      expect(effectiveIds).not.toContain("purchasing-group");
      expect(effectiveIds).not.toContain("users");
    });

    it("guarantees unauthorized quick tools are strictly stripped", () => {
      const store = useWorkspaceStore.getState();
      // CASHIER cannot create purchase orders
      store.setQuickToolIds(["barcode-scan", "new-purchase", "today-sales"]);

      const effectiveTools = store.getEffectiveQuickTools("CASHIER");
      const effectiveIds = effectiveTools.map((t) => t.id);

      expect(effectiveIds).toContain("barcode-scan");
      expect(effectiveIds).toContain("today-sales");
      expect(effectiveIds).not.toContain("new-purchase");
    });
  });
});
