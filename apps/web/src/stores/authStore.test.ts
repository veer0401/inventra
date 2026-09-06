import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthStore, safeSessionStorage } from "./authStore";
import type { AuthResponse } from "@inventra/api-types";
import * as queryService from "../services/queryClient";

describe("useAuthStore & Session Management", () => {
  const memoryStorage = new Map<string, string>();

  beforeEach(() => {
    memoryStorage.clear();

    vi.spyOn(safeSessionStorage, "getItem").mockImplementation((key: string) => memoryStorage.get(key) || null);
    vi.spyOn(safeSessionStorage, "setItem").mockImplementation((key: string, val: string) => {
      memoryStorage.set(key, val);
    });
    vi.spyOn(safeSessionStorage, "removeItem").mockImplementation((key: string) => {
      memoryStorage.delete(key);
    });
    vi.spyOn(queryService, "invalidateStoreContextQueries").mockResolvedValue();

    useAuthStore.setState({
      status: "UNAUTHENTICATED",
      accessToken: null,
      refreshToken: null,
      user: null,
      activeContext: null,
      memberships: [],
      error: null,
      isOnline: true,
    });
  });

  const mockAuthResponse: AuthResponse = {
    accessToken: "jwt-access-token-1",
    refreshToken: "jwt-refresh-token-1",
    expiresIn: 900,
    user: {
      id: "01a037d5-c0d3-72eb-81f6-ad0a91e7fa24",
      email: "pharmacist@inventra.local",
      fullName: "Dr. Vikram Seth",
      phoneNumber: "+919876543210",
      status: "ACTIVE",
      emailVerified: true,
    },
    activeContext: {
      businessId: "01a037d5-b001-72eb-81f6-ad0a91e7fa21",
      businessName: "Apollo Health Ventures",
      storeId: "01a037d5-s001-72eb-81f6-ad0a91e7fa22",
      storeName: "Apollo Pharmacy Indiranagar",
      storeCode: "AP-BLR-01",
      role: "OWNER",
    },
    memberships: [
      {
        businessId: "01a037d5-b001-72eb-81f6-ad0a91e7fa21",
        businessName: "Apollo Health Ventures",
        role: "OWNER",
        stores: [
          {
            storeId: "01a037d5-s001-72eb-81f6-ad0a91e7fa22",
            storeName: "Apollo Pharmacy Indiranagar",
            storeCode: "AP-BLR-01",
            isPrimaryStore: true,
          },
          {
            storeId: "01a037d5-s002-72eb-81f6-ad0a91e7fa23",
            storeName: "Apollo Pharmacy Koramangala",
            storeCode: "AP-BLR-02",
            isPrimaryStore: false,
          },
        ],
      },
    ],
  };

  const mockAdminAuthResponse: AuthResponse = {
    accessToken: "jwt-admin-access-token",
    refreshToken: "jwt-admin-refresh-token",
    expiresIn: 900,
    user: {
      id: "01a037d5-c0d3-72eb-81f6-ad0a91e7fa99",
      email: "admin@inventra.local",
      fullName: "Platform Administrator",
      status: "ACTIVE",
      emailVerified: true,
    },
    activeContext: {
      businessName: "Inventra Platform",
      storeName: "Global Console",
      storeCode: "GLOBAL",
      role: "PLATFORM_ADMIN",
    },
    memberships: [],
  };

  it("authenticates user and stores refreshToken in sessionStorage", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockAuthResponse,
        timestamp: "2026-08-25T12:00:00Z",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await useAuthStore.getState().login({ email: "pharmacist@inventra.local", password: "Password123!" });

    const state = useAuthStore.getState();
    expect(state.status).toBe("AUTHENTICATED");
    expect(state.accessToken).toBe("jwt-access-token-1");
    expect(state.user?.email).toBe("pharmacist@inventra.local");
    expect(state.activeContext?.role).toBe("OWNER");
    expect(memoryStorage.get("inventra_rt")).toBe("jwt-refresh-token-1");
  });

  it("authenticates platform admin with global console context without store requirement", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockAdminAuthResponse,
        timestamp: "2026-08-25T12:00:00Z",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await useAuthStore.getState().login({ email: "admin@inventra.local", password: "PlatformAdmin@Inventra2026!" });

    const state = useAuthStore.getState();
    expect(state.status).toBe("AUTHENTICATED");
    expect(state.accessToken).toBe("jwt-admin-access-token");
    expect(state.activeContext?.role).toBe("PLATFORM_ADMIN");
    expect(state.activeContext?.businessId).toBeUndefined();
  });

  it("handles login error and transitions to AUTH_FAILED status", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        type: "https://errors.inventra.internal/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Invalid email or password",
        errorCode: "INVALID_CREDENTIALS",
        timestamp: "2026-08-25T12:00:00Z",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      useAuthStore.getState().login({ email: "bad@user.com", password: "WrongPassword" })
    ).rejects.toThrow();

    const state = useAuthStore.getState();
    expect(state.status).toBe("AUTH_FAILED");
    expect(state.error).toBe("Invalid email or password. Please try again.");
    expect(state.accessToken).toBeNull();
  });

  it("switches context, updates tokens, and invalidates server query cache", async () => {
    const switchedResponse: AuthResponse = {
      ...mockAuthResponse,
      accessToken: "jwt-access-token-branch2",
      refreshToken: "jwt-refresh-token-branch2",
      activeContext: {
        businessId: "01a037d5-b001-72eb-81f6-ad0a91e7fa21",
        businessName: "Apollo Health Ventures",
        storeId: "01a037d5-s002-72eb-81f6-ad0a91e7fa23",
        storeName: "Apollo Pharmacy Koramangala",
        storeCode: "AP-BLR-02",
        role: "OWNER",
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: switchedResponse,
        timestamp: "2026-08-25T12:00:00Z",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await useAuthStore.getState().switchContext(
      "01a037d5-b001-72eb-81f6-ad0a91e7fa21",
      "01a037d5-s002-72eb-81f6-ad0a91e7fa23"
    );

    const state = useAuthStore.getState();
    expect(state.status).toBe("AUTHENTICATED");
    expect(state.accessToken).toBe("jwt-access-token-branch2");
    expect(state.activeContext?.storeCode).toBe("AP-BLR-02");
    expect(queryService.invalidateStoreContextQueries).toHaveBeenCalled();
  });

  it("logs out user, revokes session, and clears storage", async () => {
    useAuthStore.setState({
      status: "AUTHENTICATED",
      accessToken: "some-access-token",
      refreshToken: "some-refresh-token",
      user: mockAuthResponse.user,
      activeContext: mockAuthResponse.activeContext,
    });
    memoryStorage.set("inventra_rt", "some-refresh-token");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.status).toBe("UNAUTHENTICATED");
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
    expect(memoryStorage.get("inventra_rt")).toBeUndefined();
    expect(queryService.invalidateStoreContextQueries).toHaveBeenCalled();
  });

  it("restores session from sessionStorage on startup", async () => {
    memoryStorage.set("inventra_rt", "valid-stored-refresh-token");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockAuthResponse,
        timestamp: "2026-08-25T12:00:00Z",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await useAuthStore.getState().restoreSession();

    const state = useAuthStore.getState();
    expect(state.status).toBe("AUTHENTICATED");
    expect(state.user?.fullName).toBe("Dr. Vikram Seth");
    expect(state.accessToken).toBe("jwt-access-token-1");
  });

  it("terminates all sessions on logoutAll", async () => {
    useAuthStore.setState({
      status: "AUTHENTICATED",
      accessToken: "some-access-token",
      refreshToken: "some-refresh-token",
    });
    memoryStorage.set("inventra_rt", "some-refresh-token");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await useAuthStore.getState().logoutAll();

    const state = useAuthStore.getState();
    expect(state.status).toBe("UNAUTHENTICATED");
    expect(memoryStorage.get("inventra_rt")).toBeUndefined();
  });
});
