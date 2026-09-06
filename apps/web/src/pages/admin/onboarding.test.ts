import { describe, it, expect } from "vitest";
import { useAuthStore } from "../../stores/authStore";

describe("Platform Admin Authorization & State", () => {
  it("recognizes PLATFORM_ADMIN role properly in context state", () => {
    useAuthStore.setState({
      status: "AUTHENTICATED",
      user: {
        id: "admin-user-id",
        email: "admin@inventra.local",
        fullName: "Platform Admin",
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
      accessToken: "mock-token",
      refreshToken: "mock-rt",
      error: null,
      isOnline: true,
    });

    const state = useAuthStore.getState();
    expect(state.activeContext?.role).toBe("PLATFORM_ADMIN");
    expect(state.user?.email).toBe("admin@inventra.local");
    expect(state.status).toBe("AUTHENTICATED");
  });
});
