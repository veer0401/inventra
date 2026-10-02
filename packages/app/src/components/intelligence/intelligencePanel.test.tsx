import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@inventra/ui";
import { IntelligencePanel, cleanProductSearchPrefix, normalizeSearchQuery } from "./IntelligencePanel";
import { useShortcutStore } from "../../stores/shortcutStore";
import { useAuthStore } from "../../stores/authStore";
import { intelligenceApi } from "../../services/intelligenceApi";
import { catalogApi } from "../../services/catalogApi";
import { customerApi } from "../../services/customerApi";
import { inventoryApi } from "../../services/inventoryApi";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../services/intelligenceApi", () => ({
  intelligenceApi: {
    interpret: vi.fn(),
  },
}));

vi.mock("../../services/catalogApi", () => ({
  catalogApi: {
    searchProducts: vi.fn(),
    searchProductsStructured: vi.fn(),
    getProduct: vi.fn(),
  },
}));

vi.mock("../../services/inventoryApi", () => ({
  inventoryApi: {
    listInventory: vi.fn(),
    listBatches: vi.fn(),
  },
}));

vi.mock("../../services/customerApi", () => ({
  customerApi: {
    searchCustomers: vi.fn(),
  },
}));

const renderPanel = (initialRoute = "/dashboard") => {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <IntelligencePanel />
      </MemoryRouter>
    </ToastProvider>
  );
};

describe("Inventra Intelligence Canonical Panel Component", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useShortcutStore.setState({
      intelligenceOpen: false,
      copilotOpen: false,
      activeKeymap: {
        OPEN_INTELLIGENCE: "Ctrl+J",
      },
    });
    useAuthStore.setState({
      activeContext: {
        role: "OWNER",
        businessId: "biz-1",
        businessName: "Apollo Pharmacy",
        storeId: "store-1",
        storeName: "Indiranagar Dispensary",
      } as any,
    });
  });

  it("does not render when intelligenceOpen and copilotOpen are false", () => {
    renderPanel();
    expect(screen.queryByTestId("test-intelligence-panel")).toBeNull();
  });

  it("renders when copilotOpen is true (e.g. restored from localStorage upon refresh)", () => {
    useShortcutStore.setState({ copilotOpen: true, intelligenceOpen: false });
    renderPanel("/inventory");

    expect(screen.getByTestId("test-intelligence-panel")).toBeDefined();
  });

  it("renders with header, safe context bar, and suggestions when intelligenceOpen is true", () => {
    useShortcutStore.setState({ intelligenceOpen: true });
    renderPanel("/inventory");

    expect(screen.getByTestId("test-intelligence-panel")).toBeDefined();
    expect(screen.getByText(/Inventra Intelligence/i)).toBeDefined();

    // Context bar
    const contextBar = screen.getByTestId("test-intelligence-context");
    expect(contextBar).toBeDefined();
    expect(screen.getByText("Inventory")).toBeDefined();
    expect(screen.getByText("Indiranagar Dispensary")).toBeDefined();

    // Context-aware suggestions for Inventory
    expect(screen.getByText(/Suggestions for Inventory/i)).toBeDefined();
    expect(screen.getByText(/• Find a medicine/i)).toBeDefined();
    expect(screen.getByText(/• Show low stock medicines/i)).toBeDefined();
    expect(screen.getByText(/• Show expiring batches/i)).toBeDefined();
  });

  it("displays Customer-specific suggestions when on customer route", () => {
    useShortcutStore.setState({ intelligenceOpen: true });
    renderPanel("/customers");

    expect(screen.getByText("Customers")).toBeDefined();
    expect(screen.getByText(/Suggestions for Customers/i)).toBeDefined();
    expect(screen.getByText(/• Find a customer/i)).toBeDefined();
    expect(screen.getByText(/• Search customer Rahul/i)).toBeDefined();
  });

  it("omits store name from context bar when not available in activeContext", () => {
    useShortcutStore.setState({ intelligenceOpen: true });
    useAuthStore.setState({
      activeContext: {
        role: "PLATFORM_ADMIN",
        businessId: "biz-1",
      } as any,
    });

    renderPanel("/settings");
    expect(screen.getByText("Settings")).toBeDefined();
    expect(screen.queryByText("Indiranagar Dispensary")).toBeNull();
  });

  it("executes SEARCH_PRODUCT: calls catalogApi.searchProducts and renders product cards with [View] navigation", async () => {
    useShortcutStore.setState({ intelligenceOpen: true });

    vi.mocked(intelligenceApi.interpret).mockResolvedValue({
      intent: "SEARCH_PRODUCT",
      confidence: 0.96,
      entities: { query: "paracetamol" },
      originalText: "find paracetamol",
      normalizedText: "find paracetamol",
      explanation: "Matched search product rule",
      suggestions: [],
      engineVersion: "1",
    });

    vi.mocked(catalogApi.searchProducts).mockResolvedValue({
      content: [
        {
          id: "prod-101",
          inventoryItemId: "inv-101",
          name: "Paracetamol 500mg",
          dosageForm: "TABLET" as any,
          strength: "500mg",
          baseUnit: "STRIP",
          unitsPerSellingUnit: 10,
          prescriptionRequired: false,
          status: "ACTIVE" as any,
        },
        {
          id: "prod-102",
          inventoryItemId: "inv-102",
          name: "Paracetamol 650mg Dolo",
          dosageForm: "TABLET" as any,
          strength: "650mg",
          baseUnit: "STRIP",
          unitsPerSellingUnit: 15,
          prescriptionRequired: true,
          status: "ACTIVE" as any,
        },
      ],
      totalElements: 2,
      totalPages: 1,
      size: 10,
      number: 0,
      first: true,
      last: true,
      empty: false,
    });

    renderPanel();

    const input = screen.getByTestId("test-intelligence-input");
    const submitBtn = screen.getByTestId("test-intelligence-submit");

    fireEvent.change(input, { target: { value: "find paracetamol" } });
    fireEvent.click(submitBtn);

    expect(intelligenceApi.interpret).toHaveBeenCalledWith("find paracetamol");

    await waitFor(() => {
      expect(catalogApi.searchProducts).toHaveBeenCalledWith("paracetamol", 0, 10);
      expect(screen.getByText("Paracetamol 500mg")).toBeDefined();
      expect(screen.getByText("Paracetamol 650mg Dolo")).toBeDefined();
      expect(screen.getAllByTestId("test-product-result-item").length).toBe(2);
    });

    // Click [View] on first product
    const viewButtons = screen.getAllByTestId("test-product-view-btn");
    fireEvent.click(viewButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/inventory/inv-101");
  });

  it("handles empty product search results gracefully", async () => {
    useShortcutStore.setState({ intelligenceOpen: true });

    vi.mocked(intelligenceApi.interpret).mockResolvedValue({
      intent: "SEARCH_PRODUCT",
      confidence: 0.95,
      entities: { query: "nonexistent medicine xyz" },
      originalText: "find nonexistent medicine xyz",
      normalizedText: "find nonexistent medicine xyz",
      explanation: "Matched search product rule",
      suggestions: [],
      engineVersion: "1",
    });

    vi.mocked(catalogApi.searchProducts).mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 10,
      number: 0,
      first: true,
      last: true,
      empty: true,
    });

    renderPanel();

    const input = screen.getByTestId("test-intelligence-input");
    const submitBtn = screen.getByTestId("test-intelligence-submit");

    fireEvent.change(input, { target: { value: "find nonexistent medicine xyz" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/✦ No products found/i)).toBeDefined();
      expect(screen.getByText(/I couldn't find a product matching "nonexistent medicine xyz"/i)).toBeDefined();
    });
  });

  it("executes SEARCH_CUSTOMER: calls customerApi.searchCustomers and renders customer cards with masked phone and [View] navigation", async () => {
    useShortcutStore.setState({ intelligenceOpen: true });

    vi.mocked(intelligenceApi.interpret).mockResolvedValue({
      intent: "SEARCH_CUSTOMER",
      confidence: 0.97,
      entities: { query: "Rahul" },
      originalText: "search customer Rahul",
      normalizedText: "search customer rahul",
      explanation: "Matched search customer rule",
      suggestions: [],
      engineVersion: "1",
    });

    vi.mocked(customerApi.searchCustomers).mockResolvedValue([
      {
        id: "cust-1",
        customerCode: "CUST-001",
        fullName: "Rahul Sharma",
        phone: "+919876543210",
        email: "rahul@example.com",
        status: "ACTIVE" as any,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ]);

    renderPanel();

    const input = screen.getByTestId("test-intelligence-input");
    const submitBtn = screen.getByTestId("test-intelligence-submit");

    fireEvent.change(input, { target: { value: "search customer Rahul" } });
    fireEvent.click(submitBtn);

    expect(intelligenceApi.interpret).toHaveBeenCalledWith("search customer Rahul");

    await waitFor(() => {
      expect(customerApi.searchCustomers).toHaveBeenCalledWith("Rahul");
      expect(screen.getByText("Rahul Sharma")).toBeDefined();
      // Masked phone verification (••••••3210)
      expect(screen.getByText(/••••••3210/i)).toBeDefined();
      expect(screen.getByTestId("test-customer-view-btn")).toBeDefined();
    });

    // Click [View] on customer
    const viewBtn = screen.getByTestId("test-customer-view-btn");
    fireEvent.click(viewBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/customers/cust-1");
  });

  it("handles empty customer search results gracefully", async () => {
    useShortcutStore.setState({ intelligenceOpen: true });

    vi.mocked(intelligenceApi.interpret).mockResolvedValue({
      intent: "SEARCH_CUSTOMER",
      confidence: 0.95,
      entities: { query: "Nobody" },
      originalText: "search customer Nobody",
      normalizedText: "search customer nobody",
      explanation: "Matched search customer rule",
      suggestions: [],
      engineVersion: "1",
    });

    vi.mocked(customerApi.searchCustomers).mockResolvedValue([]);

    renderPanel();

    const input = screen.getByTestId("test-intelligence-input");
    const submitBtn = screen.getByTestId("test-intelligence-submit");

    fireEvent.change(input, { target: { value: "search customer Nobody" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/✦ No customers found/i)).toBeDefined();
      expect(screen.getByText(/I couldn't find a customer matching "Nobody"/i)).toBeDefined();
    });
  });

  it("preserves ambiguity rule: 'find Rahul' remains UNKNOWN and does NOT execute customer search", async () => {
    useShortcutStore.setState({ intelligenceOpen: true });

    vi.mocked(intelligenceApi.interpret).mockResolvedValue({
      intent: "UNKNOWN",
      confidence: 0.2,
      entities: {},
      originalText: "find Rahul",
      normalizedText: "find rahul",
      explanation: "Ambiguous query: specify customer or medicine",
      suggestions: [
        "Search customer: 'search customer Rahul'",
        "Search product: 'find medicine ...'",
      ],
      engineVersion: "1",
    });

    renderPanel();

    const input = screen.getByTestId("test-intelligence-input");
    const form = input.closest("form")!;

    fireEvent.change(input, { target: { value: "find Rahul" } });
    fireEvent.submit(form);

    expect(intelligenceApi.interpret).toHaveBeenCalledWith("find Rahul");

    const cards = await screen.findAllByTestId("test-intelligence-card");
    expect(cards.length).toBeGreaterThan(0);

    const card = cards[0];
    expect(card.textContent).toContain("Request Ambiguous / Unrecognized");
    expect(card.textContent).toContain("Ambiguous query: specify customer or medicine");
    expect(card.textContent).toContain("Search customer: 'search customer Rahul'");

    // Verify search APIs were NEVER called
    expect(customerApi.searchCustomers).not.toHaveBeenCalled();
    expect(catalogApi.searchProducts).not.toHaveBeenCalled();
  });

  it("preserves Phase 2 NAVIGATE: executes navigation on [Open {label}] button click", async () => {
    useShortcutStore.setState({ intelligenceOpen: true });

    vi.mocked(intelligenceApi.interpret).mockResolvedValue({
      intent: "NAVIGATE",
      confidence: 0.99,
      entities: { destination: "INVENTORY" },
      originalText: "open inventory",
      normalizedText: "open inventory",
      explanation: "Matched navigation to registered destination: INVENTORY",
      suggestions: [],
      engineVersion: "1",
    });

    renderPanel();

    const input = screen.getByTestId("test-intelligence-input");
    const submitBtn = screen.getByTestId("test-intelligence-submit");

    fireEvent.change(input, { target: { value: "open inventory" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId("test-navigation-action-btn")).toBeDefined();
      expect(screen.getByText("/inventory")).toBeDefined();
    });

    const navBtn = screen.getByTestId("test-navigation-action-btn");
    fireEvent.click(navBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/inventory");
  });

  it("blocks navigation and displays Access Restricted when role lacks permission", async () => {
    useShortcutStore.setState({ intelligenceOpen: true });
    useAuthStore.setState({
      activeContext: {
        role: "CASHIER",
        businessId: "biz-1",
        storeId: "store-1",
      } as any,
    });

    vi.mocked(intelligenceApi.interpret).mockResolvedValue({
      intent: "NAVIGATE",
      confidence: 0.95,
      entities: { destination: "TRANSFERS" },
      originalText: "open transfers",
      normalizedText: "open transfers",
      explanation: "Matched navigation to registered destination: TRANSFERS",
      suggestions: [],
      engineVersion: "1",
    });

    renderPanel();

    const input = screen.getByTestId("test-intelligence-input");
    const submitBtn = screen.getByTestId("test-intelligence-submit");

    fireEvent.change(input, { target: { value: "open transfers" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId("test-navigation-restricted")).toBeDefined();
      expect(screen.getByText("Access Restricted")).toBeDefined();
      expect(screen.queryByTestId("test-navigation-action-btn")).toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("preserves interpretation-only notice for interpretation-only intents (SALES_SUMMARY)", async () => {
    useShortcutStore.setState({ intelligenceOpen: true });

    vi.mocked(intelligenceApi.interpret).mockResolvedValue({
      intent: "SALES_SUMMARY",
      confidence: 0.98,
      entities: { dateContext: "TODAY" },
      originalText: "show today's sales",
      normalizedText: "show today's sales",
      explanation: "Matched sales summary rule for date context TODAY",
      suggestions: [],
      engineVersion: "1",
    });

    renderPanel();

    const input = screen.getByTestId("test-intelligence-input");
    const submitBtn = screen.getByTestId("test-intelligence-submit");

    fireEvent.change(input, { target: { value: "show today's sales" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/business action execution is not connected in this phase/i)
      ).toBeDefined();
      expect(catalogApi.searchProducts).not.toHaveBeenCalled();
      expect(customerApi.searchCustomers).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("closes panel when close button is clicked", () => {
    useShortcutStore.setState({ intelligenceOpen: true });
    renderPanel();

    const closeBtn = screen.getByTestId("test-intelligence-close");
    fireEvent.click(closeBtn);

    expect(useShortcutStore.getState().intelligenceOpen).toBe(false);
  });

  describe("Product Search Query Cleaning and Normalization", () => {
    it("cleanProductSearchPrefix strips command verbs and preserves identifiers with underscores, hyphens, and codes", () => {
      expect(cleanProductSearchPrefix("find medicine_1")).toBe("medicine_1");
      expect(cleanProductSearchPrefix("find Medicine_1")).toBe("Medicine_1");
      expect(cleanProductSearchPrefix("search medicine_1")).toBe("medicine_1");
      expect(cleanProductSearchPrefix("search for medicine_1")).toBe("medicine_1");
      expect(cleanProductSearchPrefix("look for medicine_1")).toBe("medicine_1");
      expect(cleanProductSearchPrefix("find product medicine_1")).toBe("medicine_1");
      expect(cleanProductSearchPrefix("find medicine")).toBe("medicine");
      expect(cleanProductSearchPrefix("find medicine paracetamol")).toBe("paracetamol");
      expect(cleanProductSearchPrefix("find SKU-9901_A")).toBe("SKU-9901_A");
      expect(cleanProductSearchPrefix("lookup product 0.5mg")).toBe("0.5mg");
    });

    it("normalizeSearchQuery collapses whitespace while preserving special characters", () => {
      expect(normalizeSearchQuery("  medicine_1  ")).toBe("medicine_1");
      expect(normalizeSearchQuery("medicine   plus  ")).toBe("medicine plus");
      expect(normalizeSearchQuery("PROD-102_B/1")).toBe("PROD-102_B/1");
    });

    it("delegates to catalogApi.searchProducts with normalized query when user types 'find medicine_1'", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      vi.mocked(intelligenceApi.interpret).mockResolvedValue({
        intent: "SEARCH_PRODUCT",
        confidence: 0.96,
        entities: { query: "medicine_1" },
        originalText: "find medicine_1",
        normalizedText: "find medicine_1",
        explanation: "Matched product search rule",
        suggestions: [],
        engineVersion: "1",
      });

      vi.mocked(catalogApi.searchProducts).mockResolvedValue({
        content: [
          {
            id: "prod-201",
            name: "Medicine_1",
            dosageForm: "TABLET" as any,
            strength: "500mg",
            baseUnit: "STRIP",
            unitsPerSellingUnit: 10,
            prescriptionRequired: false,
            status: "ACTIVE" as any,
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        number: 0,
        first: true,
        last: true,
        empty: false,
      });

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "find medicine_1" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(catalogApi.searchProducts).toHaveBeenCalledWith("medicine_1", 0, 10);
        expect(screen.getByText("Medicine_1")).toBeDefined();
      });
    });

    it("uses fallback cleanProductSearchPrefix if entities.query is absent in interpret response", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      vi.mocked(intelligenceApi.interpret).mockResolvedValue({
        intent: "SEARCH_PRODUCT",
        confidence: 0.96,
        entities: {},
        originalText: "search for medicine_1",
        normalizedText: "search for medicine_1",
        explanation: "Matched search product rule",
        suggestions: [],
        engineVersion: "1",
      });

      vi.mocked(catalogApi.searchProducts).mockResolvedValue({
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 10,
        number: 0,
        first: true,
        last: true,
        empty: true,
      });

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "search for medicine_1" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(catalogApi.searchProducts).toHaveBeenCalledWith("medicine_1", 0, 10);
      });
    });
  });

  describe("Prompt History Navigation (ArrowUp / ArrowDown)", () => {
    it("navigates backwards and forwards through submitted prompts with ArrowUp and ArrowDown, preserving drafts", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      vi.mocked(intelligenceApi.interpret).mockResolvedValue({
        intent: "NAVIGATE",
        confidence: 0.99,
        entities: { destination: "INVENTORY" },
        originalText: "open inventory",
        normalizedText: "open inventory",
        explanation: "Matched navigation rule",
        suggestions: [],
        engineVersion: "1",
      });

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input") as HTMLInputElement;
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      // 1. ArrowUp when no history exists does nothing
      fireEvent.keyDown(input, { key: "ArrowUp" });
      expect(input.value).toBe("");

      // 2. Submit first prompt: "find medicine_1"
      fireEvent.change(input, { target: { value: "find medicine_1" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(input.value).toBe("");
      });

      // 3. Submit second prompt: "open inventory"
      fireEvent.change(input, { target: { value: "open inventory" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(input.value).toBe("");
      });

      // 4. Type an unsent draft: "my draft"
      fireEvent.change(input, { target: { value: "my draft" } });

      // 5. Press ArrowUp: should restore the most recent prompt "open inventory"
      fireEvent.keyDown(input, { key: "ArrowUp" });
      expect(input.value).toBe("open inventory");

      // 6. Press ArrowUp again: should restore the earlier prompt "find medicine_1"
      fireEvent.keyDown(input, { key: "ArrowUp" });
      expect(input.value).toBe("find medicine_1");

      // 7. Press ArrowUp again at top: stays at "find medicine_1"
      fireEvent.keyDown(input, { key: "ArrowUp" });
      expect(input.value).toBe("find medicine_1");

      // 8. Press ArrowDown: goes forward to "open inventory"
      fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(input.value).toBe("open inventory");

      // 9. Press ArrowDown at end: restores the unsent draft "my draft"
      fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(input.value).toBe("my draft");

      // 10. Press ArrowDown again: stays at draft
      fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(input.value).toBe("my draft");
    });
  });

  describe("Phase 4A: LOW_STOCK Intent & Real Data Integration", () => {
    it("interprets 'show low stock', displays loading state, and renders real low-stock product cards", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });
      useAuthStore.setState({
        activeContext: {
          businessId: "biz-1",
          storeId: "store-1",
          storeName: "Main Branch Pharmacy",
          role: "OWNER",
        } as any,
      });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "LOW_STOCK",
        confidence: 0.98,
        entities: { itemType: "MEDICINE" },
        originalQuery: "show low stock",
        normalizedQuery: "show low stock",
        explanation: "Matched low stock inventory rule",
        suggestions: [],
        version: "1.0.0",
      });

      vi.mocked(inventoryApi.listInventory).mockResolvedValueOnce({
        content: [
          {
            id: "inv-item-001",
            businessId: "biz-1",
            storeId: "store-1",
            productId: "prod-101",
            currentStock: 3,
            reorderLevel: 10,
            reorderQuantity: 50,
            minStock: 5,
            maxStock: 100,
            locationRack: "Rack A-1",
            isBatchTracked: true,
            version: 1,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          } as any,
        ],
        totalElements: 1,
        totalPages: 1,
        size: 5,
        number: 0,
        first: true,
        last: true,
        empty: false,
      } as any);

      vi.mocked(catalogApi.getProduct).mockResolvedValueOnce({
        id: "prod-101",
        businessId: "biz-1",
        name: "Amoxicillin 500mg",
        genericName: "Amoxicillin",
        brandName: "Mox",
        dosageForm: "CAPSULE" as any,
        strength: "500mg",
        baseUnit: "CAPSULE",
        sellingUnit: "STRIP",
        unitsPerSellingUnit: 10,
        taxRate: 12,
        isTaxInclusive: true,
        prescriptionRequired: true,
        status: "ACTIVE" as any,
        identifiers: [
          {
            id: "id-1",
            productId: "prod-101",
            identifierType: "SKU",
            identifierValue: "AMX-500",
            isPrimary: true,
            createdAt: "2026-01-01T00:00:00Z",
          } as any,
        ],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      } as any);

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "show low stock" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(intelligenceApi.interpret).toHaveBeenCalledWith("show low stock");
      });

      await waitFor(() => {
        expect(inventoryApi.listInventory).toHaveBeenCalledWith({
          storeId: "store-1",
          lowStockOnly: true,
          size: 5,
        });
      });

      await waitFor(() => {
        expect(catalogApi.getProduct).toHaveBeenCalledWith("prod-101");
      });

      // Product card rendering assertions
      const lowStockSection = await screen.findByTestId("test-lowstock-section");
      expect(lowStockSection).toBeInTheDocument();

      expect(screen.getByText("1 product need attention")).toBeInTheDocument();
      expect(screen.getByText("Amoxicillin 500mg")).toBeInTheDocument();
      expect(screen.getByText("SKU: AMX-500")).toBeInTheDocument();
      expect(screen.getByTestId("test-current-stock").textContent).toBe("3");
      expect(screen.getByTestId("test-min-stock").textContent).toBe("10");

      // Verify View Product button
      const viewBtn = screen.getByTestId("test-view-product-btn");
      fireEvent.click(viewBtn);
      expect(mockNavigate).toHaveBeenCalledWith("/catalog/products/prod-101");
    });

    it("renders bounded result indicator and 'View all low-stock items' button navigating to /inventory?tab=low-stock", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });
      useAuthStore.setState({
        activeContext: {
          businessId: "biz-1",
          storeId: "store-1",
          storeName: "Central Pharmacy",
          role: "MANAGER",
        } as any,
      });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "LOW_STOCK",
        confidence: 0.98,
        entities: { itemType: "MEDICINE" },
        originalQuery: "low stock",
        normalizedQuery: "low stock",
        explanation: "Matched low stock rule",
        suggestions: [],
        version: "1.0.0",
      });

      vi.mocked(inventoryApi.listInventory).mockResolvedValueOnce({
        content: [
          {
            id: "inv-item-001",
            productId: "prod-101",
            currentStock: 1,
            reorderLevel: 10,
          } as any,
        ],
        totalElements: 12, // 12 total, only 1 returned in batch -> hasMore = true
        totalPages: 3,
        size: 5,
        number: 0,
        first: true,
        last: false,
        empty: false,
      } as any);

      vi.mocked(catalogApi.getProduct).mockResolvedValueOnce({
        id: "prod-101",
        name: "Paracetamol 500mg",
        baseUnit: "TABLET",
      } as any);

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "low stock" } });
      fireEvent.click(submitBtn);

      const viewAllBtn = await screen.findByTestId("test-view-all-low-stock");
      expect(viewAllBtn).toBeInTheDocument();
      expect(viewAllBtn.textContent).toContain("View all 12 low-stock items");

      fireEvent.click(viewAllBtn);
      expect(mockNavigate).toHaveBeenCalledWith("/inventory?tab=low-stock");
    });

    it("renders empty state when inventory has zero low-stock items", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });
      useAuthStore.setState({
        activeContext: {
          businessId: "biz-1",
          storeId: "store-1",
          storeName: "Main Branch",
          role: "CASHIER",
        } as any,
      });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "LOW_STOCK",
        confidence: 0.98,
        entities: {},
        originalQuery: "which products are low on stock",
        normalizedQuery: "which products are low on stock",
        explanation: "Matched low stock rule",
        suggestions: [],
        version: "1.0.0",
      });

      vi.mocked(inventoryApi.listInventory).mockResolvedValueOnce({
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 5,
        number: 0,
        first: true,
        last: true,
        empty: true,
      } as any);

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "which products are low on stock" } });
      fireEvent.click(submitBtn);

      const emptyCard = await screen.findByTestId("test-lowstock-empty");
      expect(emptyCard).toBeInTheDocument();
      expect(emptyCard.textContent).toContain("Inventory Healthy");
      expect(emptyCard.textContent).toContain("No products are currently low on stock in Main Branch");
    });

    it("renders error state when inventory API call fails", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });
      useAuthStore.setState({
        activeContext: {
          businessId: "biz-1",
          storeId: "store-1",
          role: "OWNER",
        } as any,
      });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "LOW_STOCK",
        confidence: 0.98,
        entities: {},
        originalQuery: "what items are running low",
        normalizedQuery: "what items are running low",
        explanation: "Matched low stock rule",
        suggestions: [],
        version: "1.0.0",
      });

      vi.mocked(inventoryApi.listInventory).mockRejectedValueOnce(
        new Error("Connection to inventory database timed out")
      );

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "what items are running low" } });
      fireEvent.click(submitBtn);

      const errCard = await screen.findByTestId("test-lowstock-error");
      expect(errCard).toBeInTheDocument();
      expect(errCard.textContent).toContain("Connection to inventory database timed out");
    });

    it("prompts user to select an active store if storeId is missing", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });
      useAuthStore.setState({
        activeContext: {
          businessId: "biz-1",
          storeId: undefined, // no active store
          role: "OWNER",
        } as any,
      });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "LOW_STOCK",
        confidence: 0.98,
        entities: {},
        originalQuery: "show low stock",
        normalizedQuery: "show low stock",
        explanation: "Matched low stock rule",
        suggestions: [],
        version: "1.0.0",
      });

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "show low stock" } });
      fireEvent.click(submitBtn);

      const errCard = await screen.findByTestId("test-lowstock-error");
      expect(errCard).toBeInTheDocument();
      expect(errCard.textContent).toContain("Active store context required");
    });
  });

  describe("Phase 4B: EXPIRING_BATCHES Read-Only Integration", () => {
    it("interprets 'show expiring batches', calls listBatches with 60-day window, enriches with product data, and renders batch cards", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });
      useAuthStore.setState({
        activeContext: {
          businessId: "biz-1",
          storeId: "store-1",
          storeName: "Apollo Dispensary",
          role: "OWNER",
        } as any,
      });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "EXPIRING_BATCHES",
        confidence: 0.98,
        entities: { itemType: "BATCH" },
        originalText: "show expiring batches",
        normalizedText: "show expiring batches",
        explanation: "Matched expiring batches rule",
        suggestions: [],
        engineVersion: "1",
      });

      vi.mocked(inventoryApi.listBatches).mockResolvedValueOnce({
        content: [
          {
            id: "batch-101",
            businessId: "biz-1",
            storeId: "store-1",
            productId: "prod-101",
            batchNumber: "MOX-001",
            manufacturingDate: "2026-01-01",
            expiryDate: "2026-10-15",
            quantity: 25,
            purchasePrice: 5.0,
            mrp: 10.0,
            sellingPrice: 9.5,
            status: "ACTIVE" as any,
            version: 1,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          } as any,
        ],
        totalElements: 1,
        totalPages: 1,
        size: 5,
        number: 0,
        first: true,
        last: true,
        empty: false,
      } as any);

      vi.mocked(catalogApi.getProduct).mockResolvedValueOnce({
        id: "prod-101",
        name: "Amoxicillin 500mg",
        genericName: "Amoxicillin",
        baseUnit: "STRIP",
        identifiers: [
          {
            id: "id-1",
            productId: "prod-101",
            identifierType: "SKU",
            identifierValue: "AMX-500",
            isPrimary: true,
            createdAt: "2026-01-01T00:00:00Z",
          } as any,
        ],
      } as any);

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "show expiring batches" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(intelligenceApi.interpret).toHaveBeenCalledWith("show expiring batches");
      });

      await waitFor(() => {
        expect(inventoryApi.listBatches).toHaveBeenCalledWith({
          storeId: "store-1",
          expiringWithinDays: 60,
          size: 5,
          sort: "expiryDate,asc",
        });
      });

      await waitFor(() => {
        expect(catalogApi.getProduct).toHaveBeenCalledWith("prod-101");
      });

      const section = await screen.findByTestId("test-expiring-batches-section");
      expect(section).toBeInTheDocument();

      expect(screen.getByText("1 batch needing attention")).toBeInTheDocument();
      expect(screen.getByTestId("test-batch-number").textContent).toBe("MOX-001");
      expect(screen.getByTestId("test-product-name").textContent).toBe("Amoxicillin 500mg");
      expect(screen.getByText("Amoxicillin")).toBeInTheDocument();
      expect(screen.getByText("SKU: AMX-500")).toBeInTheDocument();
      expect(screen.getByTestId("test-batch-stock").textContent).toContain("25 STRIP");

      // Verify View Batch button navigates to /inventory/batches?filter=expiring&search=MOX-001
      const viewBatchBtn = screen.getByTestId("test-view-batch-btn");
      fireEvent.click(viewBatchBtn);
      expect(mockNavigate).toHaveBeenCalledWith(
        "/inventory/batches?filter=expiring&search=MOX-001"
      );

      // Verify View Product button navigates to /catalog/products/prod-101
      const viewProdBtn = screen.getByTestId("test-view-product-btn");
      fireEvent.click(viewProdBtn);
      expect(mockNavigate).toHaveBeenCalledWith("/catalog/products/prod-101");
    });

    it("renders 'View all expiring batches →' button when totalElements > items.length", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });
      useAuthStore.setState({
        activeContext: {
          businessId: "biz-1",
          storeId: "store-1",
          storeName: "Main Branch",
          role: "OWNER",
        } as any,
      });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "EXPIRING_BATCHES",
        confidence: 0.98,
        entities: {},
        originalText: "which batches are expiring",
        normalizedText: "which batches are expiring",
        explanation: "Matched expiring batches rule",
        suggestions: [],
        engineVersion: "1",
      });

      vi.mocked(inventoryApi.listBatches).mockResolvedValueOnce({
        content: [
          {
            id: "batch-1",
            productId: "prod-1",
            batchNumber: "B1",
            expiryDate: "2026-10-01",
            quantity: 10,
          } as any,
        ],
        totalElements: 8,
        totalPages: 2,
        size: 5,
        number: 0,
        first: true,
        last: false,
        empty: false,
      } as any);

      vi.mocked(catalogApi.getProduct).mockResolvedValueOnce({
        id: "prod-1",
        name: "Cough Syrup",
        baseUnit: "BOTTLE",
      } as any);

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "which batches are expiring" } });
      fireEvent.click(submitBtn);

      const viewAllBtn = await screen.findByTestId("test-view-all-expiring-batches");
      expect(viewAllBtn).toBeInTheDocument();
      expect(viewAllBtn.textContent).toContain("View all 8 expiring batches");

      fireEvent.click(viewAllBtn);
      expect(mockNavigate).toHaveBeenCalledWith("/inventory/batches?filter=expiring");
    });

    it("renders empty state when zero batches are expiring within 60 days", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });
      useAuthStore.setState({
        activeContext: {
          businessId: "biz-1",
          storeId: "store-1",
          storeName: "Indiranagar",
          role: "OWNER",
        } as any,
      });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "EXPIRING_BATCHES",
        confidence: 0.98,
        entities: {},
        originalText: "show expiring batches",
        normalizedText: "show expiring batches",
        explanation: "Matched expiring batches rule",
        suggestions: [],
        engineVersion: "1",
      });

      vi.mocked(inventoryApi.listBatches).mockResolvedValueOnce({
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 5,
        number: 0,
        first: true,
        last: true,
        empty: true,
      } as any);

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "show expiring batches" } });
      fireEvent.click(submitBtn);

      const emptyCard = await screen.findByTestId("test-expiring-batches-empty");
      expect(emptyCard).toBeInTheDocument();
      expect(emptyCard.textContent).toContain("No Expiring Batches");
      expect(emptyCard.textContent).toContain(
        "No active batches are expiring within the next 60 days in Indiranagar"
      );
    });

    it("renders error state when inventoryApi.listBatches fails", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });
      useAuthStore.setState({
        activeContext: {
          businessId: "biz-1",
          storeId: "store-1",
          role: "OWNER",
        } as any,
      });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "EXPIRING_BATCHES",
        confidence: 0.98,
        entities: {},
        originalText: "what medicines are expiring",
        normalizedText: "what medicines are expiring",
        explanation: "Matched expiring batches rule",
        suggestions: [],
        engineVersion: "1",
      });

      vi.mocked(inventoryApi.listBatches).mockRejectedValueOnce(
        new Error("Inventory service unavailable")
      );

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "what medicines are expiring" } });
      fireEvent.click(submitBtn);

      const errCard = await screen.findByTestId("test-expiring-batches-error");
      expect(errCard).toBeInTheDocument();
      expect(errCard.textContent).toContain("Inventory service unavailable");
    });

    it("prompts user to select active store if storeId is missing when checking expiring batches", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });
      useAuthStore.setState({
        activeContext: {
          businessId: "biz-1",
          storeId: undefined,
          role: "OWNER",
        } as any,
      });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "EXPIRING_BATCHES",
        confidence: 0.98,
        entities: {},
        originalText: "show expiring batches",
        normalizedText: "show expiring batches",
        explanation: "Matched expiring batches rule",
        suggestions: [],
        engineVersion: "1",
      });

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "show expiring batches" } });
      fireEvent.click(submitBtn);

      const errCard = await screen.findByTestId("test-expiring-batches-error");
      expect(errCard).toBeInTheDocument();
      expect(errCard.textContent).toContain("Please select an active store to view expiring batches.");
    });
  });

  describe("Step 2B: Structured Product Query Execution", () => {
    const mockProduct = {
      id: "prod-201",
      name: "Dolo 650mg Tablet",
      dosageForm: "TABLET" as any,
      strength: "650mg",
      baseUnit: "STRIP",
      unitsPerSellingUnit: 15,
      prescriptionRequired: false,
      status: "ACTIVE" as any,
    };

    const mockPage = {
      content: [mockProduct],
      totalElements: 1,
      totalPages: 1,
      size: 10,
      number: 0,
      first: true,
      last: true,
      empty: false,
    };

    it("Plain search ('find medicine_1'): calls legacy text search, not structured search", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "SEARCH_PRODUCT",
        confidence: 0.98,
        entities: { query: "medicine_1", conditions: [] },
        originalText: "find medicine_1",
        normalizedText: "find medicine_1",
        explanation: "Matched plain product search",
        suggestions: [],
        engineVersion: "1",
      });

      vi.mocked(catalogApi.searchProducts).mockResolvedValueOnce(mockPage);

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "find medicine_1" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(catalogApi.searchProducts).toHaveBeenCalledWith("medicine_1", 0, 10);
        expect(catalogApi.searchProductsStructured).not.toHaveBeenCalled();
        expect(screen.getByText("Dolo 650mg Tablet")).toBeDefined();
      });
    });

    it("Pure structured search ('find medicines below 100'): calls searchProductsStructured with PRICE < 100 and query null", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "SEARCH_PRODUCT",
        confidence: 0.98,
        entities: {
          conditions: [
            { field: "PRICE", operator: "LESS_THAN", value: "100" },
          ],
        },
        originalText: "find medicines below 100",
        normalizedText: "find medicines below 100",
        explanation: "Matched structured price query",
        suggestions: [],
        engineVersion: "1",
      });

      vi.mocked(catalogApi.searchProductsStructured).mockResolvedValueOnce(mockPage);

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "find medicines below 100" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(catalogApi.searchProductsStructured).toHaveBeenCalledWith(
          {
            query: null,
            conditions: [{ field: "PRICE", operator: "LESS_THAN", value: "100" }],
            storeId: "store-1",
          },
          0,
          10
        );
        expect(catalogApi.searchProducts).not.toHaveBeenCalled();
        expect(screen.getByText("Dolo 650mg Tablet")).toBeDefined();
      });
    });

    it("Dosage form search ('find tablets'): calls searchProductsStructured with DOSAGE_FORM = TABLET", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "SEARCH_PRODUCT",
        confidence: 0.98,
        entities: {
          conditions: [
            { field: "DOSAGE_FORM", operator: "EQUALS", value: "TABLET" },
          ],
        },
        originalText: "find tablets",
        normalizedText: "find tablets",
        explanation: "Matched dosage form query",
        suggestions: [],
        engineVersion: "1",
      });

      vi.mocked(catalogApi.searchProductsStructured).mockResolvedValueOnce(mockPage);

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "find tablets" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(catalogApi.searchProductsStructured).toHaveBeenCalledWith(
          {
            query: null,
            conditions: [{ field: "DOSAGE_FORM", operator: "EQUALS", value: "TABLET" }],
            storeId: "store-1",
          },
          0,
          10
        );
        expect(catalogApi.searchProducts).not.toHaveBeenCalled();
      });
    });

    it("Strength search ('find medicines with strength above 10 mg'): calls searchProductsStructured with STRENGTH > 10 mg", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "SEARCH_PRODUCT",
        confidence: 0.98,
        entities: {
          conditions: [
            { field: "STRENGTH", operator: "GREATER_THAN", value: "10", unit: "mg" },
          ],
        },
        originalText: "find medicines with strength above 10 mg",
        normalizedText: "find medicines with strength above 10 mg",
        explanation: "Matched strength query",
        suggestions: [],
        engineVersion: "1",
      });

      vi.mocked(catalogApi.searchProductsStructured).mockResolvedValueOnce(mockPage);

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "find medicines with strength above 10 mg" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(catalogApi.searchProductsStructured).toHaveBeenCalledWith(
          {
            query: null,
            conditions: [{ field: "STRENGTH", operator: "GREATER_THAN", value: "10", unit: "mg" }],
            storeId: "store-1",
          },
          0,
          10
        );
        expect(catalogApi.searchProducts).not.toHaveBeenCalled();
      });
    });

    it("Multi-condition search ('find tablets with price above 250'): preserves both conditions and condition order", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "SEARCH_PRODUCT",
        confidence: 0.98,
        entities: {
          conditions: [
            { field: "DOSAGE_FORM", operator: "EQUALS", value: "TABLET" },
            { field: "PRICE", operator: "GREATER_THAN", value: "250" },
          ],
        },
        originalText: "find tablets with price above 250",
        normalizedText: "find tablets with price above 250",
        explanation: "Matched multi-condition query",
        suggestions: [],
        engineVersion: "1",
      });

      vi.mocked(catalogApi.searchProductsStructured).mockResolvedValueOnce(mockPage);

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "find tablets with price above 250" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(catalogApi.searchProductsStructured).toHaveBeenCalledWith(
          {
            query: null,
            conditions: [
              { field: "DOSAGE_FORM", operator: "EQUALS", value: "TABLET" },
              { field: "PRICE", operator: "GREATER_THAN", value: "250" },
            ],
            storeId: "store-1",
          },
          0,
          10
        );
        expect(catalogApi.searchProducts).not.toHaveBeenCalled();
      });
    });

    it("Multi-condition + text search ('find dolo tablets with price above 250'): preserves both query='dolo' and conditions", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "SEARCH_PRODUCT",
        confidence: 0.98,
        entities: {
          query: "dolo",
          conditions: [
            { field: "DOSAGE_FORM", operator: "EQUALS", value: "TABLET" },
            { field: "PRICE", operator: "GREATER_THAN", value: "250" },
          ],
        },
        originalText: "find dolo tablets with price above 250",
        normalizedText: "find dolo tablets with price above 250",
        explanation: "Matched multi-condition + text query",
        suggestions: [],
        engineVersion: "1",
      });

      vi.mocked(catalogApi.searchProductsStructured).mockResolvedValueOnce(mockPage);

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "find dolo tablets with price above 250" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(catalogApi.searchProductsStructured).toHaveBeenCalledWith(
          {
            query: "dolo",
            conditions: [
              { field: "DOSAGE_FORM", operator: "EQUALS", value: "TABLET" },
              { field: "PRICE", operator: "GREATER_THAN", value: "250" },
            ],
            storeId: "store-1",
          },
          0,
          10
        );
        expect(catalogApi.searchProducts).not.toHaveBeenCalled();
      });
    });

    it("Eye drops search ('find eye drops'): preserves query='eye' and DOSAGE_FORM=DROPS", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "SEARCH_PRODUCT",
        confidence: 0.98,
        entities: {
          query: "eye",
          conditions: [
            { field: "DOSAGE_FORM", operator: "EQUALS", value: "DROPS" },
          ],
        },
        originalText: "find eye drops",
        normalizedText: "find eye drops",
        explanation: "Matched eye drops query",
        suggestions: [],
        engineVersion: "1",
      });

      vi.mocked(catalogApi.searchProductsStructured).mockResolvedValueOnce(mockPage);

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "find eye drops" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(catalogApi.searchProductsStructured).toHaveBeenCalledWith(
          {
            query: "eye",
            conditions: [
              { field: "DOSAGE_FORM", operator: "EQUALS", value: "DROPS" },
            ],
            storeId: "store-1",
          },
          0,
          10
        );
        expect(catalogApi.searchProducts).not.toHaveBeenCalled();
      });
    });

    it("Structured query returning zero products shows clean no-results message without falling back to text search", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "SEARCH_PRODUCT",
        confidence: 0.98,
        entities: {
          conditions: [
            { field: "PRICE", operator: "LESS_THAN", value: "100" },
          ],
        },
        originalText: "find medicines below 100",
        normalizedText: "find medicines below 100",
        explanation: "Matched structured price query",
        suggestions: [],
        engineVersion: "1",
      });

      vi.mocked(catalogApi.searchProductsStructured).mockResolvedValueOnce({
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 10,
        number: 0,
        first: true,
        last: true,
        empty: true,
      });

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "find medicines below 100" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(catalogApi.searchProductsStructured).toHaveBeenCalledTimes(1);
        expect(catalogApi.searchProducts).not.toHaveBeenCalled();
        expect(screen.getByText("No products matched these filters.")).toBeDefined();
        expect(screen.queryByText(/I couldn't find a product matching/i)).toBeNull();
      });
    });

    it("Structured API failure displays error message and does NOT fallback to text search", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "SEARCH_PRODUCT",
        confidence: 0.98,
        entities: {
          conditions: [
            { field: "PRICE", operator: "LESS_THAN", value: "100" },
          ],
        },
        originalText: "find medicines below 100",
        normalizedText: "find medicines below 100",
        explanation: "Matched structured price query",
        suggestions: [],
        engineVersion: "1",
      });

      vi.mocked(catalogApi.searchProductsStructured).mockRejectedValueOnce(
        new Error("Database connection error")
      );

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "find medicines below 100" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(catalogApi.searchProductsStructured).toHaveBeenCalledTimes(1);
        expect(catalogApi.searchProducts).not.toHaveBeenCalled();
        expect(screen.getByText("Product Search Failed")).toBeDefined();
        expect(screen.getByText("Database connection error")).toBeDefined();
      });
    });

    it("Ambiguous query ('find Rahul') returning UNKNOWN does NOT execute structured or text product search", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "UNKNOWN",
        confidence: 0.10,
        entities: {},
        originalText: "find Rahul",
        normalizedText: "find rahul",
        explanation: "Ambiguous search query: 'Rahul'",
        suggestions: ["Search customer Rahul", "Search product Rahul"],
        engineVersion: "1",
      });

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "find Rahul" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(catalogApi.searchProductsStructured).not.toHaveBeenCalled();
        expect(catalogApi.searchProducts).not.toHaveBeenCalled();
        expect(screen.getAllByText(/Ambiguous search query: 'Rahul'/i).length).toBeGreaterThan(0);
      });
    });

    it("Clicking product result with store inventory identity navigates to /inventory/{inventoryItemId} and NOT /catalog/products/{id}", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "SEARCH_PRODUCT",
        confidence: 0.98,
        entities: {
          conditions: [
            { field: "DOSAGE_FORM", operator: "EQUALS", value: "TABLET" },
            { field: "PRICE", operator: "GREATER_THAN", value: "250" },
          ],
        },
        originalText: "find tablets with price above 250",
        normalizedText: "find tablets with price above 250",
        explanation: "Matched structured dosage and price query",
        suggestions: [],
        engineVersion: "1",
      });

      const testInventoryItemId = "01a07721-f7ef-752f-82bb-240c0c61260b";
      const testCatalogProductId = "prod-catalog-001";

      vi.mocked(catalogApi.searchProductsStructured).mockResolvedValueOnce({
        content: [
          {
            id: testCatalogProductId,
            inventoryItemId: testInventoryItemId,
            name: "Dolo 650",
            genericName: "Paracetamol",
            brandName: "Micro Labs",
            dosageForm: "TABLET",
            strength: "650 mg",
            baseUnit: "STRIP",
            unitsPerSellingUnit: 1,
            prescriptionRequired: false,
            status: "ACTIVE",
            currentStock: 120,
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        number: 0,
        first: true,
        last: true,
        empty: false,
      });

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "find tablets with price above 250" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Dolo 650")).toBeDefined();
        expect(screen.getByText(/Stock: 120/i)).toBeDefined();
      });

      // Verify condition chips rendered
      expect(screen.getAllByText("Tablet").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Price > ₹250").length).toBeGreaterThan(0);
      expect(screen.getByTestId("test-condition-chips")).toBeDefined();

      // Click "View Product" button
      const viewBtn = screen.getByTestId("test-product-view-btn");
      fireEvent.click(viewBtn);

      // Verify exact navigation to /inventory/{inventoryItemId}
      expect(mockNavigate).toHaveBeenCalledWith(`/inventory/${testInventoryItemId}`);
      // Verify it did NOT navigate to catalog or use productId as fallback
      expect(mockNavigate).not.toHaveBeenCalledWith(`/catalog/products/${testCatalogProductId}`);
      expect(mockNavigate).not.toHaveBeenCalledWith(`/inventory/${testCatalogProductId}`);
    });

    it("Product result without store inventory identity (inventoryItemId is null) does NOT navigate to /inventory/{productId}", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "SEARCH_PRODUCT",
        confidence: 0.98,
        entities: {
          conditions: [
            { field: "DOSAGE_FORM", operator: "EQUALS", value: "TABLET" },
          ],
        },
        originalText: "find tablets",
        normalizedText: "find tablets",
        explanation: "Matched structured dosage query",
        suggestions: [],
        engineVersion: "1",
      });

      const testCatalogProductId = "prod-catalog-002";

      vi.mocked(catalogApi.searchProductsStructured).mockResolvedValueOnce({
        content: [
          {
            id: testCatalogProductId,
            inventoryItemId: null,
            name: "Azithromycin 500",
            genericName: "Azithromycin",
            brandName: "Zithro",
            dosageForm: "TABLET",
            strength: "500 mg",
            baseUnit: "STRIP",
            unitsPerSellingUnit: 1,
            prescriptionRequired: true,
            status: "ACTIVE",
            currentStock: null,
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        number: 0,
        first: true,
        last: true,
        empty: false,
      });

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "find tablets" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Azithromycin 500")).toBeDefined();
        // Unstocked badge is rendered instead of a navigation button
        expect(screen.getByTestId("test-product-unstocked-badge")).toBeDefined();
        expect(screen.getByText("Not in Store")).toBeDefined();
        expect(screen.queryByTestId("test-product-view-btn")).toBeNull();
      });

      // Verify no incorrect navigation to /inventory/{productId}
      expect(mockNavigate).not.toHaveBeenCalledWith(`/inventory/${testCatalogProductId}`);
    });
  });

  describe("Step 3A: Product Query Runtime Quality & UX", () => {
    it("formats conditions into human-readable chips according to specification", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "SEARCH_PRODUCT",
        confidence: 0.98,
        entities: {
          conditions: [
            { field: "DOSAGE_FORM", operator: "EQUALS", value: "TABLET" },
            { field: "PRICE", operator: "GREATER_THAN", value: "250" },
            { field: "STRENGTH", operator: "GREATER_THAN", value: "10", unit: "mg" },
            { field: "NAME", operator: "STARTS_WITH", value: "DOL" },
            { field: "PRICE", operator: "BETWEEN", value: "100", secondaryValue: "500" },
          ],
        },
        originalText: "find tablets starting with DOL and price between 100 and 500",
        normalizedText: "find tablets starting with dol and price between 100 and 500",
        explanation: "Matched structured query",
        suggestions: [],
        engineVersion: "1",
      });

      vi.mocked(catalogApi.searchProductsStructured).mockResolvedValueOnce({
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 10,
        number: 0,
        first: true,
        last: true,
        empty: true,
      });

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "test condition formatting" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId("test-product-search-empty")).toBeDefined();
      });

      // Verify formatted chips inside empty state condition chips container
      const emptyState = screen.getByTestId("test-product-search-empty");
      const chipsContainer = within(emptyState).getByTestId("test-condition-chips");
      expect(within(chipsContainer).getByText("Tablet")).toBeDefined();
      expect(within(chipsContainer).getByText("Price > ₹250")).toBeDefined();
      expect(within(chipsContainer).getByText("Strength > 10 mg")).toBeDefined();
      expect(within(chipsContainer).getByText('Name starts with "DOL"')).toBeDefined();
      expect(within(chipsContainer).getByText("Price ₹100–₹500")).toBeDefined();
    });

    it("displays loading state with condition chips while structured search is pending", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "SEARCH_PRODUCT",
        confidence: 0.98,
        entities: {
          conditions: [
            { field: "DOSAGE_FORM", operator: "EQUALS", value: "CAPSULE" },
          ],
        },
        originalText: "find capsules",
        normalizedText: "find capsules",
        explanation: "Matched dosage query",
        suggestions: [],
        engineVersion: "1",
      });

      let resolveSearch: (val: any) => void = () => {};
      const pendingPromise = new Promise<any>((resolve) => {
        resolveSearch = resolve;
      });
      vi.mocked(catalogApi.searchProductsStructured).mockImplementationOnce(
        () => pendingPromise
      );

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "find capsules" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId("test-product-search-loading")).toBeDefined();
      });

      const loadingBlock = screen.getByTestId("test-product-search-loading");
      expect(within(loadingBlock).getByText("Capsule")).toBeDefined();

      // Now resolve the search
      resolveSearch({
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 10,
        number: 0,
        first: true,
        last: true,
        empty: true,
      });

      await waitFor(() => {
        expect(screen.queryByTestId("test-product-search-loading")).toBeNull();
        expect(screen.getByTestId("test-product-search-empty")).toBeDefined();
      });
    });

    it("displays error state with retry button on API failure and allows retrying", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "SEARCH_PRODUCT",
        confidence: 0.98,
        entities: {
          conditions: [
            { field: "PRICE", operator: "LESS_THAN", value: "50" },
          ],
        },
        originalText: "find medicines below 50",
        normalizedText: "find medicines below 50",
        explanation: "Matched price query",
        suggestions: [],
        engineVersion: "1",
      });

      vi.mocked(catalogApi.searchProductsStructured).mockRejectedValueOnce(
        new Error("Network timeout")
      );

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "find medicines below 50" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId("test-product-search-error")).toBeDefined();
        expect(screen.getByText("Unable to search products right now")).toBeDefined();
        expect(screen.getByText("Network timeout")).toBeDefined();
        expect(screen.getByTestId("test-product-search-retry-btn")).toBeDefined();
      });

      // Now mock successful retry
      vi.mocked(catalogApi.searchProductsStructured).mockResolvedValueOnce({
        content: [
          {
            id: "prod-retry-1",
            inventoryItemId: "inv-retry-1",
            name: "Paracetamol 500",
            dosageForm: "TABLET",
            baseUnit: "STRIP",
            unitsPerSellingUnit: 1,
            prescriptionRequired: false,
            status: "ACTIVE",
            currentStock: 50,
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        number: 0,
        first: true,
        last: true,
        empty: false,
      });

      const retryBtn = screen.getByTestId("test-product-search-retry-btn");
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.queryByTestId("test-product-search-error")).toBeNull();
        expect(screen.getByText("Paracetamol 500")).toBeDefined();
      });
    });

    it("navigates to /inventory/{inventoryItemId} via keyboard activation (Enter key on product card)", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "SEARCH_PRODUCT",
        confidence: 0.98,
        entities: {
          conditions: [
            { field: "DOSAGE_FORM", operator: "EQUALS", value: "TABLET" },
          ],
        },
        originalText: "find tablets",
        normalizedText: "find tablets",
        explanation: "Matched dosage query",
        suggestions: [],
        engineVersion: "1",
      });

      const invId = "01999999-aaaa-bbbb-cccc-123456789abc";
      vi.mocked(catalogApi.searchProductsStructured).mockResolvedValueOnce({
        content: [
          {
            id: "prod-key-1",
            inventoryItemId: invId,
            name: "Aspirin 100",
            dosageForm: "TABLET",
            strength: "100 mg",
            baseUnit: "STRIP",
            unitsPerSellingUnit: 1,
            prescriptionRequired: true,
            status: "ACTIVE",
            currentStock: 25,
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        number: 0,
        first: true,
        last: true,
        empty: false,
      });

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "find tablets" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Aspirin 100")).toBeDefined();
      });

      const card = screen.getByTestId("test-product-result-item");
      expect(card.getAttribute("role")).toBe("button");
      expect(card.getAttribute("tabIndex")).toBe("0");

      // Press Enter on card
      fireEvent.keyDown(card, { key: "Enter" });

      expect(mockNavigate).toHaveBeenCalledWith(`/inventory/${invId}`);
      expect(mockNavigate).not.toHaveBeenCalledWith(`/catalog/products/prod-key-1`);
      expect(mockNavigate).not.toHaveBeenCalledWith(`/inventory/prod-key-1`);
    });

    it("strictly routes structured queries to structured API and plain queries to text search API", async () => {
      useShortcutStore.setState({ intelligenceOpen: true });

      // Plain query 1: find medicine_1
      vi.mocked(intelligenceApi.interpret).mockResolvedValueOnce({
        intent: "SEARCH_PRODUCT",
        confidence: 0.95,
        entities: { query: "medicine_1" },
        originalText: "find medicine_1",
        normalizedText: "find medicine_1",
        explanation: "Matched plain product search",
        suggestions: [],
        engineVersion: "1",
      });

      vi.mocked(catalogApi.searchProducts).mockResolvedValueOnce({
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 10,
        number: 0,
        first: true,
        last: true,
        empty: true,
      });

      renderPanel();

      const input = screen.getByTestId("test-intelligence-input");
      const submitBtn = screen.getByTestId("test-intelligence-submit");

      fireEvent.change(input, { target: { value: "find medicine_1" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(catalogApi.searchProducts).toHaveBeenCalledWith("medicine_1", 0, 10);
        expect(catalogApi.searchProductsStructured).not.toHaveBeenCalled();
      });
    });
  });
});
