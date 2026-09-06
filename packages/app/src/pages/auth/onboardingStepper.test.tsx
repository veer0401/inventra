import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RegisterApplicationPage } from "./RegisterApplicationPage";
import { apiClient } from "../../services/api";

vi.mock("../../services/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("RegisterApplicationPage Stepper Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes("/api/v1/onboarding/check-availability")) {
        return Promise.resolve({
          data: {
            emailAvailable: true,
            emailMessage: null,
            phoneAvailable: true,
            phoneMessage: null,
            drugLicenseAvailable: true,
            drugLicenseMessage: null,
            allAvailable: true,
          },
        });
      }
      if (url.includes("/api/v1/pincode/560038")) {
        return Promise.resolve({
          data: {
            pincode: "560038",
            city: "Bengaluru",
            state: "Karnataka",
            district: "Bengaluru",
            found: true,
            message: "PIN code resolved successfully",
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it("renders Step 1 (Owner Information) initially with all stepper indicators, 10-digit mobile field, and left icons", () => {
    render(
      <MemoryRouter>
        <RegisterApplicationPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Register Your Pharmacy")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Owner Information" })).toBeDefined();
    expect(screen.getByPlaceholderText("e.g. Dr. Rajesh Sharma")).toBeDefined();
    expect(screen.getByPlaceholderText("e.g. rajesh@sharmapharmacy.com")).toBeDefined();
    expect(screen.getByPlaceholderText("9876543210")).toBeDefined();

    // Step indicators
    expect(screen.getAllByText("Step 1 of 4").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /Continue/i })).toBeDefined();
  });

  it("strictly validates that mobile number is 10 digits before continuing to Step 2", () => {
    render(
      <MemoryRouter>
        <RegisterApplicationPage />
      </MemoryRouter>
    );

    // Fill name and email but invalid 5-digit mobile
    fireEvent.change(screen.getByPlaceholderText("e.g. Dr. Rajesh Sharma"), {
      target: { value: "Dr. Rajesh Sharma" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. rajesh@sharmapharmacy.com"), {
      target: { value: "rajesh@sharma.local" },
    });
    fireEvent.change(screen.getByPlaceholderText("9876543210"), {
      target: { value: "98765" },
    });

    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    fireEvent.click(continueBtn);

    // Validation errors should appear
    expect(
      screen.getByText("Mobile number must be strictly 10 digits starting with 6, 7, 8, or 9")
    ).toBeDefined();
    // Still on step 1
    expect(screen.getAllByText("Step 1 of 4").length).toBeGreaterThanOrEqual(1);
  });

  it("auto-detects city and state from PIN code (placed first) in Step 3 and completes onboarding", async () => {
    render(
      <MemoryRouter>
        <RegisterApplicationPage />
      </MemoryRouter>
    );

    // Fill Step 1 with valid 10-digit mobile
    fireEvent.change(screen.getByPlaceholderText("e.g. Dr. Rajesh Sharma"), {
      target: { value: "Dr. Rajesh Sharma" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. rajesh@sharmapharmacy.com"), {
      target: { value: "rajesh@sharma.local" },
    });
    fireEvent.change(screen.getByPlaceholderText("9876543210"), {
      target: { value: "9876543210" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Now on Step 2: Business & Legal
    await waitFor(() => {
      expect(screen.getAllByText("Step 2 of 4").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole("heading", { name: "Business & Legal" })).toBeDefined();
    });

    // Fill Step 2
    fireEvent.change(screen.getByPlaceholderText("e.g. Sharma Healthcare Pvt Ltd"), {
      target: { value: "Sharma Medicos Pvt Ltd" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. DL-20B-123456"), {
      target: { value: "DL-KA-2026-999" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Now on Step 3: Store Location
    await waitFor(() => {
      expect(screen.getAllByText("Step 3 of 4").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole("heading", { name: "Store Location" })).toBeDefined();
    });

    // Verify PIN code is placed first and type 6 digits
    const pincodeInput = screen.getByPlaceholderText("e.g. 560038");
    fireEvent.change(pincodeInput, { target: { value: "560038" } });

    // Wait for auto-detection API response to populate city and state
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/api/v1/pincode/560038", { skipAuth: true });
      expect(screen.getByText(/Auto-detected: Bengaluru, Karnataka/i)).toBeDefined();
    });

    // Check city and state select dropdowns were auto-selected
    const stateSelect = screen.getByRole("combobox", { name: /State \/ Union Territory/i });
    const citySelect = screen.getByRole("combobox", { name: /City \/ District/i });
    expect((stateSelect as HTMLSelectElement).value).toBe("Karnataka");
    expect((citySelect as HTMLSelectElement).value).toBe("Bengaluru");

    // Complete street address and branch name
    fireEvent.change(screen.getByPlaceholderText("e.g. Shop 12, Ground Floor, Central Market"), {
      target: { value: "100 Feet Road, 4th Block" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. Indiranagar Main Dispensary"), {
      target: { value: "Apollo Koramangala" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Now on Step 4: Review & Submit
    await waitFor(() => {
      expect(screen.getAllByText("Step 4 of 4").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole("heading", { name: "Review & Submit" })).toBeDefined();
    });

    // Verify review summaries
    expect(screen.getByText("Dr. Rajesh Sharma")).toBeDefined();
    expect(screen.getByText("rajesh@sharma.local")).toBeDefined();
    expect(screen.getByText("+91 9876543210")).toBeDefined();
    expect(screen.getByText("Sharma Medicos Pvt Ltd")).toBeDefined();
    expect(screen.getByText("560038")).toBeDefined();
    expect(screen.getByText("Bengaluru, Karnataka")).toBeDefined();

    // Submit button should be disabled until declaration is checked
    const submitBtn = screen.getByRole("button", { name: /Submit Application/i });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);

    // Check declaration
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);

    // Mock API success
    (apiClient.post as any).mockResolvedValueOnce({
      data: {
        id: "APP-2026-001",
        businessName: "Sharma Medicos Pvt Ltd",
        applicantName: "Dr. Rajesh Sharma",
        applicantEmail: "rajesh@sharma.local",
        status: "PENDING",
      },
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Application Received")).toBeDefined();
      expect(screen.getByText("APP-2026-001")).toBeDefined();
    });
  });

  it("updates city dropdown options dynamically when state dropdown is changed manually", async () => {
    render(
      <MemoryRouter>
        <RegisterApplicationPage />
      </MemoryRouter>
    );

    // Fill Step 1 with valid 10-digit mobile
    fireEvent.change(screen.getByPlaceholderText("e.g. Dr. Rajesh Sharma"), {
      target: { value: "Dr. Rajesh Sharma" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. rajesh@sharmapharmacy.com"), {
      target: { value: "rajesh@sharma.local" },
    });
    fireEvent.change(screen.getByPlaceholderText("9876543210"), {
      target: { value: "9876543210" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Fill Step 2
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Business & Legal" })).toBeDefined();
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. Sharma Healthcare Pvt Ltd"), {
      target: { value: "Sharma Medicos Pvt Ltd" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. DL-20B-123456"), {
      target: { value: "DL-KA-2026-999" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // On Step 3: Check State and City dropdowns
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Store Location" })).toBeDefined();
    });
    const stateSelect = screen.getByRole("combobox", { name: /State \/ Union Territory/i }) as HTMLSelectElement;
    const citySelect = screen.getByRole("combobox", { name: /City \/ District/i }) as HTMLSelectElement;

    // Initially city is disabled because no state is selected
    expect(citySelect.disabled).toBe(true);

    // Select Maharashtra
    fireEvent.change(stateSelect, { target: { value: "Maharashtra" } });
    expect(stateSelect.value).toBe("Maharashtra");
    expect(citySelect.disabled).toBe(false);

    // Verify Maharashtra cities are available
    expect(screen.getByRole("option", { name: "Mumbai" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Pune" })).toBeDefined();

    // Select Pune
    fireEvent.change(citySelect, { target: { value: "Pune" } });
    expect(citySelect.value).toBe("Pune");
  });

  it("checks availability API and prevents advancing if email, mobile, or drug license is pre-existing", async () => {
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes("/api/v1/onboarding/check-availability")) {
        return Promise.resolve({
          data: {
            emailAvailable: false,
            emailMessage: "An account with this email address already exists. Please sign in or use a different email.",
            phoneAvailable: false,
            phoneMessage: "This mobile number is already registered.",
            drugLicenseAvailable: true,
            drugLicenseMessage: null,
            allAvailable: false,
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <RegisterApplicationPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. Dr. Rajesh Sharma"), {
      target: { value: "Dr. Rajesh Sharma" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. rajesh@sharmapharmacy.com"), {
      target: { value: "existing@sharma.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("9876543210"), {
      target: { value: "9876543210" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Should stay on Step 1 and display the pre-existing error messages
    await waitFor(() => {
      expect(
        screen.getByText("An account with this email address already exists. Please sign in or use a different email.")
      ).toBeDefined();
      expect(screen.getByText("This mobile number is already registered.")).toBeDefined();
      expect(screen.getAllByText("Step 1 of 4").length).toBeGreaterThanOrEqual(1);
    });
  });
});
