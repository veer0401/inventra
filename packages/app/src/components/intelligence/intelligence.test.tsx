import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider } from "@inventra/ui";
import { IntelligenceModal } from "./IntelligenceModal";
import { useShortcutStore } from "../../stores/shortcutStore";
import { useAuthStore } from "../../stores/authStore";
import { intelligenceApi } from "../../services/intelligenceApi";

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

vi.mock("../../services/inventoryApi", () => ({
  inventoryApi: {
    listBatches: vi.fn().mockResolvedValue({ content: [], totalElements: 0 }),
    listInventory: vi.fn().mockResolvedValue({ content: [], totalElements: 0 }),
  },
}));

const renderModal = () => {
  return render(
    <ToastProvider>
      <IntelligenceModal />
    </ToastProvider>
  );
};

describe("Inventra Intelligence Modal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useShortcutStore.setState({
      intelligenceOpen: false,
      activeKeymap: {
        OPEN_INTELLIGENCE: "Ctrl+J",
      },
    });
    useAuthStore.setState({
      activeContext: {
        role: "OWNER",
        businessId: "b1",
        storeId: "s1",
      } as any,
    });
  });

  it("does not render when intelligenceOpen is false", () => {
    renderModal();
    expect(screen.queryByText("Inventra Intelligence")).toBeNull();
  });

  it("renders when intelligenceOpen is true", () => {
    useShortcutStore.setState({ intelligenceOpen: true });
    renderModal();
    expect(screen.getByText("Inventra Intelligence")).toBeDefined();
    expect(screen.getByPlaceholderText(/Ask Inventra in natural language/i)).toBeDefined();
  });

  it("interprets non-navigation command (SALES_SUMMARY) and displays interpretation only without executing navigation", async () => {
    useShortcutStore.setState({ intelligenceOpen: true });

    vi.mocked(intelligenceApi.interpret).mockResolvedValue({
      intent: "SALES_SUMMARY",
      confidence: 0.98,
      entities: { period: "TODAY" },
      originalText: "show sales summary",
      normalizedText: "show sales summary",
      explanation: "Matched sales summary rule",
      suggestions: [],
      engineVersion: "1",
    });

    renderModal();

    const input = screen.getByTestId("test-intelligence-input");
    const submitBtn = screen.getByTestId("test-intelligence-submit");

    fireEvent.change(input, { target: { value: "show sales summary" } });
    fireEvent.click(submitBtn);

    expect(intelligenceApi.interpret).toHaveBeenCalledWith("show sales summary");

    await waitFor(() => {
      expect(screen.getByText("Inventra understood")).toBeDefined();
      expect(screen.getByTestId("test-intent-name").textContent).toBe("SALES_SUMMARY");
      expect(screen.getByTestId("test-confidence-value").textContent).toContain("98%");
      expect(screen.getByText("TODAY")).toBeDefined();
      expect(screen.getByText(/Interpretation mode only/i)).toBeDefined();
      // Verifies NO navigation button is rendered for non-navigation intents
      expect(screen.queryByTestId("test-navigation-action-btn")).toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("interprets 'open inventory' and navigates to inventory when action button is clicked", async () => {
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

    renderModal();

    const input = screen.getByTestId("test-intelligence-input");
    const submitBtn = screen.getByTestId("test-intelligence-submit");

    fireEvent.change(input, { target: { value: "open inventory" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Inventra understood")).toBeDefined();
      expect(screen.getByTestId("test-intent-name").textContent).toBe("NAVIGATE");
      expect(screen.getByText("/inventory")).toBeDefined();
      expect(screen.getByTestId("test-navigation-action-btn")).toBeDefined();
    });

    // Click the navigation action button
    const navBtn = screen.getByTestId("test-navigation-action-btn");
    fireEvent.click(navBtn);

    // Modal closes and navigate is called with /inventory
    expect(useShortcutStore.getState().intelligenceOpen).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith("/inventory");
  });

  it("interprets 'go to customers' and navigates to customers route", async () => {
    useShortcutStore.setState({ intelligenceOpen: true });

    vi.mocked(intelligenceApi.interpret).mockResolvedValue({
      intent: "NAVIGATE",
      confidence: 0.99,
      entities: { destination: "CUSTOMERS" },
      originalText: "go to customers",
      normalizedText: "go to customers",
      explanation: "Matched navigation to registered destination: CUSTOMERS",
      suggestions: [],
      engineVersion: "1",
    });

    renderModal();

    const input = screen.getByTestId("test-intelligence-input");
    const submitBtn = screen.getByTestId("test-intelligence-submit");

    fireEvent.change(input, { target: { value: "go to customers" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("/customers")).toBeDefined();
    });

    const navBtn = screen.getByTestId("test-navigation-action-btn");
    fireEvent.click(navBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/customers");
  });

  it("interprets 'open purchasing' and navigates to purchase orders route", async () => {
    useShortcutStore.setState({ intelligenceOpen: true });

    vi.mocked(intelligenceApi.interpret).mockResolvedValue({
      intent: "NAVIGATE",
      confidence: 0.99,
      entities: { destination: "PURCHASING" },
      originalText: "open purchasing",
      normalizedText: "open purchasing",
      explanation: "Matched navigation to registered destination: PURCHASING",
      suggestions: [],
      engineVersion: "1",
    });

    renderModal();

    const input = screen.getByTestId("test-intelligence-input");
    const submitBtn = screen.getByTestId("test-intelligence-submit");

    fireEvent.change(input, { target: { value: "open purchasing" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("/purchasing/orders")).toBeDefined();
    });

    const navBtn = screen.getByTestId("test-navigation-action-btn");
    fireEvent.click(navBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/purchasing/orders");
  });

  it("blocks navigation and displays access restricted warning when role lacks permission", async () => {
    useShortcutStore.setState({ intelligenceOpen: true });
    // User is CASHIER, who is not permitted to access TRANSFERS
    useAuthStore.setState({
      activeContext: {
        role: "CASHIER",
        businessId: "b1",
        storeId: "s1",
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

    renderModal();

    const input = screen.getByTestId("test-intelligence-input");
    const submitBtn = screen.getByTestId("test-intelligence-submit");

    fireEvent.change(input, { target: { value: "open transfers" } });
    fireEvent.click(submitBtn);

    expect(intelligenceApi.interpret).toHaveBeenCalledWith("open transfers");

    await waitFor(() => {
      expect(screen.getByTestId("test-navigation-restricted")).toBeDefined();
      expect(screen.getByText("Access Restricted")).toBeDefined();
      expect(screen.queryByTestId("test-navigation-action-btn")).toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("handles unknown destinations by showing unsupported notice without navigation", async () => {
    useShortcutStore.setState({ intelligenceOpen: true });

    vi.mocked(intelligenceApi.interpret).mockResolvedValue({
      intent: "NAVIGATE",
      confidence: 0.90,
      entities: { destination: "NON_EXISTENT_MODULE" },
      originalText: "open something nonexistent",
      normalizedText: "open something nonexistent",
      explanation: "Matched navigation intent",
      suggestions: [],
      engineVersion: "1",
    });

    renderModal();

    const input = screen.getByTestId("test-intelligence-input");
    const submitBtn = screen.getByTestId("test-intelligence-submit");

    fireEvent.change(input, { target: { value: "open something nonexistent" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId("test-navigation-unsupported")).toBeDefined();
      expect(screen.getByText(/is not mapped to an active route/i)).toBeDefined();
      expect(screen.queryByTestId("test-navigation-action-btn")).toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("handles unknown commands and displays suggestions", async () => {
    useShortcutStore.setState({ intelligenceOpen: true });

    vi.mocked(intelligenceApi.interpret).mockResolvedValue({
      intent: "UNKNOWN",
      confidence: 0.1,
      entities: {},
      originalText: "asdfgh something",
      normalizedText: "asdfgh something",
      explanation: "No matching intent rule found",
      suggestions: [
        "Show low stock medicines",
        "Search customer Rahul",
        "Open inventory",
        "Show today's sales",
      ],
      engineVersion: "1",
    });

    renderModal();

    const input = screen.getByTestId("test-intelligence-input");
    const submitBtn = screen.getByTestId("test-intelligence-submit");

    fireEvent.change(input, { target: { value: "asdfgh something" } });
    fireEvent.click(submitBtn);

    expect(intelligenceApi.interpret).toHaveBeenCalledWith("asdfgh something");

    await waitFor(() => {
      expect(screen.getByText("I couldn't confidently understand that request.")).toBeDefined();
      expect(screen.getAllByText(/Show low stock medicines/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Search customer Rahul/i).length).toBeGreaterThan(1);
      expect(screen.queryByTestId("test-navigation-action-btn")).toBeNull();
    });
  });

  it("closes when close button is clicked", () => {
    useShortcutStore.setState({ intelligenceOpen: true });
    renderModal();

    const closeBtn = screen.getByLabelText("Close intelligence modal");
    fireEvent.click(closeBtn);

    expect(useShortcutStore.getState().intelligenceOpen).toBe(false);
  });
});
