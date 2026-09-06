import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@inventra/ui";
import { AdminCmsPage } from "./AdminCmsPage";
import { cmsApi } from "../../services/cmsApi";

vi.mock("../../services/cmsApi", () => ({
  cmsApi: {
    getAllCoupons: vi.fn().mockResolvedValue([]),
    getAdminPage: vi.fn(),
    updateAdminPage: vi.fn().mockResolvedValue({}),
  },
}));

describe("Admin CMS Visual Form Builder & Stats Redesign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders AdminCmsPage with Visual Form Editor mode by default for HOME page", async () => {
    vi.mocked(cmsApi.getAdminPage).mockResolvedValueOnce({
      pageKey: "HOME",
      title: "The Modern Pharmacy Operating System",
      subtitle: "High-speed POS billing and statutory compliance",
      content: {
        heroBadge: "New: Integrated GST E-Invoicing",
        stats: [
          { label: "Billing Speed", value: "< 300ms", subtext: "Counter checkout speed" },
          { label: "Active Stores", value: "2,400+", subtext: "Pan-India pharmacies" },
        ],
      },
      updatedAt: new Date().toISOString(),
    });

    render(
      <ToastProvider>
        <MemoryRouter initialEntries={["/admin/cms"]}>
          <AdminCmsPage />
        </MemoryRouter>
      </ToastProvider>
    );

    // Verify Visual Form mode is active and Header is displayed
    expect(await screen.findByText("Visual Form (Easy)")).toBeInTheDocument();
    expect(screen.getByText("Homepage Metric Stats & Performance Strip")).toBeInTheDocument();
    expect(screen.getByText("Live Strip Preview (As Shown on Homepage)")).toBeInTheDocument();

    // Verify stat cards and preview elements
    expect(screen.getByDisplayValue("< 300ms")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Billing Speed")).toBeInTheDocument();
  });

  it("allows switching to Raw JSON mode and back to Visual Form", async () => {
    vi.mocked(cmsApi.getAdminPage).mockResolvedValueOnce({
      pageKey: "HOME",
      title: "The Modern Pharmacy Operating System",
      subtitle: "High-speed POS billing",
      content: {
        stats: [{ label: "Uptime", value: "99.99%", subtext: "Offline resilient" }],
      },
      updatedAt: new Date().toISOString(),
    });

    render(
      <ToastProvider>
        <MemoryRouter initialEntries={["/admin/cms"]}>
          <AdminCmsPage />
        </MemoryRouter>
      </ToastProvider>
    );

    await screen.findByText("Visual Form (Easy)");

    // Switch to Raw JSON
    const rawJsonBtn = screen.getByText("Raw JSON");
    fireEvent.click(rawJsonBtn);

    expect(screen.getByText("Format JSON")).toBeInTheDocument();

    // Switch back to Visual
    const visualBtn = screen.getByText("Visual Form (Easy)");
    fireEvent.click(visualBtn);

    expect(screen.getByText("Homepage Metric Stats & Performance Strip")).toBeInTheDocument();
  });
});
