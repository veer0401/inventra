import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@inventra/ui";
import { UsersPage } from "./UsersPage";
import { ActivateAccountPage } from "../auth/ActivateAccountPage";
import { storeStaffApi, StaffMember } from "../../services/storeStaffApi";
import { useAuthStore } from "../../stores/authStore";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

const renderWithProviders = (ui: React.ReactElement, initialEntries = ["/users"]) => {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={initialEntries}>
          {ui}
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

describe("Staff & User Management Workflow", () => {
  const mockStaff: StaffMember[] = [
    {
      id: "member-1",
      userId: "user-1",
      email: "owner@lifecare.com",
      fullName: "Dr. Rajesh Sharma",
      phoneNumber: "9876543210",
      role: "OWNER",
      status: "ACTIVE",
      storeId: "store-1",
      storeName: "Indiranagar Main",
      isPrimaryStore: true,
      isInvitation: false,
      createdAt: "2026-09-01T10:00:00Z",
    },
    {
      id: "inv-1",
      userId: null,
      email: "pending.pharmacist@lifecare.com",
      fullName: "(Pending Activation)",
      phoneNumber: "—",
      role: "PHARMACIST",
      status: "PENDING_ACTIVATION",
      storeId: "store-1",
      storeName: "Indiranagar Main",
      isPrimaryStore: false,
      isInvitation: true,
      createdAt: "2026-09-05T12:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();

    useAuthStore.setState({
      token: "mock-jwt-token",
      user: {
        id: "user-1",
        email: "owner@lifecare.com",
        fullName: "Dr. Rajesh Sharma",
        status: "ACTIVE",
        emailVerified: true,
      },
      memberships: [
        {
          businessId: "biz-1",
          businessName: "LifeCare Pharmacy",
          role: "OWNER",
          status: "ACTIVE",
          stores: [
            {
              storeId: "store-1",
              storeName: "Indiranagar Main",
              storeCode: "MAIN-01",
              isHeadquarters: true,
              roleOverride: "OWNER",
              isPrimaryStore: true,
            },
          ],
        },
      ],
      activeContext: {
        businessId: "biz-1",
        businessName: "LifeCare Pharmacy",
        storeId: "store-1",
        storeName: "Indiranagar Main",
        role: "OWNER",
      },
      isAuthenticated: true,
    });

    vi.spyOn(storeStaffApi, "getStoreCapacity").mockResolvedValue({
      storeId: "store-1",
      storeName: "Indiranagar Main",
      currentActiveUsers: 1,
      maxUsers: 5,
      atCapacity: false,
    });

    vi.spyOn(storeStaffApi, "listBusinessStaff").mockResolvedValue(mockStaff);
  });

  it("renders staff management page with roster table and Invite Staff button", async () => {
    renderWithProviders(<UsersPage />);

    expect(await screen.findByText("Staff & User Management")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Invite Staff/i })).toBeInTheDocument();
    expect(await screen.findByText("Dr. Rajesh Sharma")).toBeInTheDocument();
    expect(screen.getByText("pending.pharmacist@lifecare.com")).toBeInTheDocument();
    expect(screen.getByText("Pending Activation")).toBeInTheDocument();
  });

  it("opens invite modal, inputs email and role, and generates invitation link", async () => {
    const inviteSpy = vi.spyOn(storeStaffApi, "inviteStaff").mockResolvedValue({
      id: "new-inv-1",
      businessId: "biz-1",
      email: "new.staff@lifecare.com",
      role: "PHARMACIST",
      storeId: "store-1",
      status: "PENDING",
      expiresAt: "2026-09-12T10:00:00Z",
      activationToken: "test-token-xyz",
      activationUrl: "http://localhost:5173/activate?token=test-token-xyz",
    });

    renderWithProviders(<UsersPage />);

    const inviteBtn = await screen.findByRole("button", { name: /Invite Staff/i });
    fireEvent.click(inviteBtn);

    expect(await screen.findByText("Invite New Staff Member")).toBeInTheDocument();

    const emailInput = screen.getByPlaceholderText("e.g. pharmacist@yourpharmacy.com");
    fireEvent.change(emailInput, { target: { value: "new.staff@lifecare.com" } });

    const submitBtn = screen.getByRole("button", { name: /Generate Activation Link/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(inviteSpy).toHaveBeenCalledWith({
        email: "new.staff@lifecare.com",
        role: "PHARMACIST",
        storeId: "store-1",
      });
    });

    // Verify success modal with activation link
    expect(await screen.findByText("Staff Invitation Generated!")).toBeInTheDocument();
    expect(screen.getByDisplayValue("http://localhost:5173/activate?token=test-token-xyz")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copy/i })).toBeInTheDocument();
  });

  it("renders ActivateAccountPage for staff invitation and activates with 10-digit phone and password", async () => {
    vi.spyOn(storeStaffApi, "verifyInvitation").mockResolvedValue({
      valid: true,
      invitationId: "inv-123",
      email: "invited.pharmacist@lifecare.com",
      role: "PHARMACIST",
      businessId: "biz-1",
      businessName: "LifeCare Pharmacy",
      storeId: "store-1",
      storeName: "Indiranagar Main",
      expiresAt: "2026-09-12T10:00:00Z",
    });

    const activateSpy = vi.spyOn(storeStaffApi, "activateStaff").mockResolvedValue({
      message: "Staff account activated successfully.",
    });

    renderWithProviders(<ActivateAccountPage />, ["/activate?token=valid-staff-token"]);

    expect(await screen.findByText(/Complete Your Profile & Activate/i)).toBeInTheDocument();
    expect(screen.getByText("LifeCare Pharmacy")).toBeInTheDocument();
    expect(screen.getByDisplayValue("invited.pharmacist@lifecare.com")).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText("e.g. Dr. Rajesh Sharma");
    fireEvent.change(nameInput, { target: { value: "Suresh Kumar" } });

    const phoneInput = screen.getByPlaceholderText("9876543210");
    fireEvent.change(phoneInput, { target: { value: "9876543210" } });

    const newPasswordInput = screen.getByPlaceholderText("Min 8 characters");
    fireEvent.change(newPasswordInput, { target: { value: "Password@123" } });

    const confirmPasswordInput = screen.getByPlaceholderText("Re-enter password");
    fireEvent.change(confirmPasswordInput, { target: { value: "Password@123" } });

    const submitBtn = screen.getByRole("button", { name: /Complete Profile & Activate/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(activateSpy).toHaveBeenCalledWith({
        token: "valid-staff-token",
        fullName: "Suresh Kumar",
        phoneNumber: "9876543210",
        password: "Password@123",
      });
    });

    expect(await screen.findByText("Account Activated!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Proceed to Sign In/i })).toBeInTheDocument();
  });
});
