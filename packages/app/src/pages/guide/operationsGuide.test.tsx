import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OperationsGuidePage } from "./OperationsGuidePage";
import { ContextualHelpModal } from "../../components/common/ContextualHelpModal";

describe("ContextualHelpModal Component", () => {
  it("renders trigger button and opens modal with plain-English instructions for purchase orders", () => {
    render(
      <MemoryRouter>
        <ContextualHelpModal topic="purchase-orders" />
      </MemoryRouter>
    );

    // Initial trigger button
    const triggerBtn = screen.getByRole("button", { name: /help on how purchase orders \(po\) work/i });
    expect(triggerBtn).toBeDefined();

    // Click to open modal
    fireEvent.click(triggerBtn);

    // Dialog content should be visible
    expect(screen.getByText(/How Purchase Orders \(PO\) Work/i)).toBeDefined();
    expect(screen.getByText(/Plain-English Overview/i)).toBeDefined();
  });

  it("renders contextual help for reports topic", () => {
    render(
      <MemoryRouter>
        <ContextualHelpModal topic="reports" />
      </MemoryRouter>
    );

    const triggerBtn = screen.getByRole("button", { name: /help on reporting/i });
    fireEvent.click(triggerBtn);

    expect(screen.getByText(/Reporting, GST & Regulatory Registers/i)).toBeDefined();
    expect(screen.getByText(/Schedule H \/ H1 \/ X Narcotic Registers/i)).toBeDefined();
  });
});

describe("OperationsGuidePage", () => {
  it("renders all visual journey steps and interactive operational guide tabs", () => {
    render(
      <MemoryRouter>
        <OperationsGuidePage />
      </MemoryRouter>
    );

    // Main header
    expect(screen.getByText(/Inventra Pharmacy Operations Handbook/i)).toBeDefined();

    // Visual Journey Steps
    expect(screen.getByText(/Distributor Order \(PO\)/i)).toBeDefined();
    expect(screen.getByText(/Inward Delivery \(GRN\)/i)).toBeDefined();
    expect(screen.getByText(/Inventory & FEFO Batches/i)).toBeDefined();
    expect(screen.getAllByText(/POS Counter Billing/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Returns & Restock/i)).toBeDefined();

    // Plain-English Field Reference
    expect(screen.getByText(/Quick Reference: What Do the Common Input Boxes Mean\?/i)).toBeDefined();
    expect(screen.getByText(/Batch Number:/i)).toBeDefined();
    expect(screen.getByText(/Free \/ Bonus Quantity:/i)).toBeDefined();
  });

  it("allows switching tabs to view specific operational phases", () => {
    render(
      <MemoryRouter>
        <OperationsGuidePage />
      </MemoryRouter>
    );

    // Click on POS tab
    const posTabBtn = screen.getByRole("button", { name: /4\. POS Counter Sales/i });
    fireEvent.click(posTabBtn);

    expect(screen.getByText(/4\. POS Counter Billing & Prescription Safety/i)).toBeDefined();
    expect(screen.getByText(/Selling Loose Tablets vs\. Full Strips/i)).toBeDefined();
  });
});
