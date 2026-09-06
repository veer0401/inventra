import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ToastProvider } from "@inventra/ui";
import { OfflineStorageSection } from "./OfflineStorageSection";
import { offlineStorageService } from "../../services/offlineStorageService";

const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

describe("OfflineStorageSection Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders station isolation card, driver info, and table counts", async () => {
    renderWithToast(<OfflineStorageSection />);

    expect(screen.getByText(/Station Isolation & Offline Debugging/i)).toBeInTheDocument();
    expect(screen.getByText(/Local Storage Driver & Engine/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Products Cache/i)).toBeInTheDocument();
      expect(screen.getByText(/Batches \(FEFO Lots\)/i)).toBeInTheDocument();
    });
  });

  it("toggles station isolation debug mode and updates storage state", async () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    renderWithToast(<OfflineStorageSection />);

    const switchBtn = screen.getByRole("switch");
    expect(switchBtn).toHaveAttribute("aria-checked", "false");

    fireEvent.click(switchBtn);

    expect(offlineStorageService.isOfflineDebugMode()).toBe(true);
    expect(switchBtn).toHaveAttribute("aria-checked", "true");
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it("seeds sample offline catalog when button is clicked", async () => {
    const seedSpy = vi.spyOn(offlineStorageService, "seedSampleData").mockResolvedValue();

    renderWithToast(<OfflineStorageSection />);

    const seedBtn = screen.getByRole("button", { name: /Seed Sample Offline Catalog/i });
    fireEvent.click(seedBtn);

    await waitFor(() => {
      expect(seedSpy).toHaveBeenCalled();
    });
  });
});
