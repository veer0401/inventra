import { create } from "zustand";
import { InventraClient, ApiError } from "@inventra/api-client";
import type {
  LoginRequest,
  AuthResponse,
  RefreshTokenRequest,
  SwitchContextRequest,
  ChangePasswordRequest,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  UserSummaryDto,
  ActiveContextDto,
  BusinessMembershipSummaryDto,
} from "@inventra/api-types";
import { invalidateStoreContextQueries } from "../services/queryClient";

/**
 * Inventra Auth State Machine
 *
 * RESTORING_SESSION: Initial startup state checking sessionStorage for active refresh token.
 * UNAUTHENTICATED: No active session / signed out.
 * AUTHENTICATING: Login credentials submitted, awaiting server verification.
 * AUTHENTICATED: Valid JWT access token and active context established.
 * CONTEXT_SELECTION_REQUIRED: User has multiple store memberships and must choose an active store.
 * SWITCHING_CONTEXT: Switching operational business/store context with backend.
 * REFRESHING: Rotating refresh token in background.
 * SESSION_EXPIRED: Token expired or revoked; user prompted to re-authenticate.
 * AUTH_FAILED: Invalid login credentials or account disabled.
 */
export type AuthStatus =
  | "RESTORING_SESSION"
  | "UNAUTHENTICATED"
  | "AUTHENTICATING"
  | "AUTHENTICATED"
  | "CONTEXT_SELECTION_REQUIRED"
  | "SWITCHING_CONTEXT"
  | "REFRESHING"
  | "SESSION_EXPIRED"
  | "AUTH_FAILED";

/**
 * Storage Strategy & Rationale:
 *
 * 1. Access Token (JWT):
 *    - In-Memory Only: Never written to localStorage or sessionStorage.
 *    - Mitigates XSS token extraction risks.
 *
 * 2. Refresh Token:
 *    - Scoped strictly to `sessionStorage` (isolated per browser tab, destroyed immediately on tab close).
 *    - Allows page refreshes in the active tab to restore session via `POST /api/v1/auth/refresh`.
 *    - Never written to long-lived `localStorage`.
 */
const SESSION_STORAGE_REFRESH_TOKEN = "inventra_rt";
const SESSION_STORAGE_ACTIVE_BUSINESS = "inventra_active_biz";
const SESSION_STORAGE_ACTIVE_STORE = "inventra_active_store";

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        return window.sessionStorage.getItem(key);
      }
      return null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
      }
    } catch {
      // Ignore sessionStorage exceptions
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
  },
};

export interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  refreshToken: string | null;
  user: UserSummaryDto | null;
  activeContext: ActiveContextDto | null;
  memberships: BusinessMembershipSummaryDto[];
  error: string | null;
  isOnline: boolean;

  // Actions
  login: (request: LoginRequest) => Promise<void>;
  refreshTokens: () => Promise<string | null>;
  switchContext: (businessId?: string, storeId?: string) => Promise<void>;
  changePassword: (request: ChangePasswordRequest) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (request: PasswordResetConfirmRequest) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setOnlineStatus: (isOnline: boolean) => void;
  clearError: () => void;
}

const API_BASE_URL: string =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : "http://localhost:8081";

export const apiClient: InventraClient = new InventraClient({
  baseUrl: API_BASE_URL,
  tokenProvider: {
    getAccessToken: (): string | null => useAuthStore.getState().accessToken,
    refreshToken: async (): Promise<string | null> => useAuthStore.getState().refreshTokens(),
    onUnauthorized: (): void => {
      useAuthStore.setState({
        status: "SESSION_EXPIRED",
        accessToken: null,
        refreshToken: null,
        user: null,
        activeContext: null,
        error: "Your session has expired. Please sign in again.",
      });
      safeSessionStorage.removeItem(SESSION_STORAGE_REFRESH_TOKEN);
    },
  },
});

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "RESTORING_SESSION",
  accessToken: null,
  refreshToken: null,
  user: null,
  activeContext: null,
  memberships: [],
  error: null,
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,

  setOnlineStatus: (isOnline: boolean) => set({ isOnline }),

  clearError: () => set({ error: null }),

  login: async (credentials: LoginRequest): Promise<void> => {
    set({ status: "AUTHENTICATING", error: null });
    try {
      const response = await apiClient.post<AuthResponse>("/api/v1/auth/login", credentials, {
        skipAuth: true,
      });
      const data = response.data;

      // Persist refresh token in per-tab sessionStorage
      safeSessionStorage.setItem(SESSION_STORAGE_REFRESH_TOKEN, data.refreshToken);
      if (data.activeContext?.businessId) {
        safeSessionStorage.setItem(SESSION_STORAGE_ACTIVE_BUSINESS, data.activeContext.businessId);
      }
      if (data.activeContext?.storeId) {
        safeSessionStorage.setItem(SESSION_STORAGE_ACTIVE_STORE, data.activeContext.storeId);
      }

      // Check if context selection is required
      // Platform Admin does not need store context
      const isPlatformAdmin = data.activeContext?.role === "PLATFORM_ADMIN";
      const needsContextSelection =
        !isPlatformAdmin &&
        !data.activeContext?.storeId &&
        (data.memberships.length > 1 || (data.memberships[0]?.stores.length ?? 0) > 1);

      set({
        status: needsContextSelection ? "CONTEXT_SELECTION_REQUIRED" : "AUTHENTICATED",
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        activeContext: data.activeContext,
        memberships: data.memberships,
        error: null,
      });
    } catch (err: unknown) {
      let errorMessage = "An error occurred during authentication.";
      if (err instanceof ApiError) {
        if (err.status === 401) {
          errorMessage = "Invalid email or password. Please try again.";
        } else if (err.status === 403) {
          errorMessage = "Your account is inactive or disabled. Contact your administrator.";
        } else if (err.status === 429) {
          errorMessage = "Too many login attempts. Please wait 60 seconds.";
        } else {
          errorMessage = err.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      set({ status: "AUTH_FAILED", error: errorMessage });
      throw err;
    }
  },

  refreshTokens: async (): Promise<string | null> => {
    const currentRefreshToken = get().refreshToken || safeSessionStorage.getItem(SESSION_STORAGE_REFRESH_TOKEN);
    if (!currentRefreshToken) {
      return null;
    }

    set({ status: "REFRESHING" });
    try {
      const response = await apiClient.post<AuthResponse>(
        "/api/v1/auth/refresh",
        { refreshToken: currentRefreshToken } satisfies RefreshTokenRequest,
        { skipAuth: true }
      );
      const data = response.data;

      safeSessionStorage.setItem(SESSION_STORAGE_REFRESH_TOKEN, data.refreshToken);

      const isPlatformAdmin = data.activeContext?.role === "PLATFORM_ADMIN";
      const needsContextSelection =
        !isPlatformAdmin &&
        !data.activeContext?.storeId &&
        (data.memberships.length > 1 || (data.memberships[0]?.stores.length ?? 0) > 1);

      set({
        status: needsContextSelection ? "CONTEXT_SELECTION_REQUIRED" : "AUTHENTICATED",
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        activeContext: data.activeContext,
        memberships: data.memberships,
        error: null,
      });

      return data.accessToken;
    } catch {
      safeSessionStorage.removeItem(SESSION_STORAGE_REFRESH_TOKEN);
      set({
        status: "SESSION_EXPIRED",
        accessToken: null,
        refreshToken: null,
        user: null,
        activeContext: null,
        error: "Session expired. Please log in again.",
      });
      return null;
    }
  },

  switchContext: async (businessId?: string, storeId?: string): Promise<void> => {
    set({ status: "SWITCHING_CONTEXT", error: null });
    try {
      const payload: SwitchContextRequest = { businessId, storeId };
      const response = await apiClient.post<AuthResponse>("/api/v1/auth/switch-context", payload);
      const data = response.data;

      safeSessionStorage.setItem(SESSION_STORAGE_REFRESH_TOKEN, data.refreshToken);
      if (data.activeContext?.businessId) {
        safeSessionStorage.setItem(SESSION_STORAGE_ACTIVE_BUSINESS, data.activeContext.businessId);
      }
      if (data.activeContext?.storeId) {
        safeSessionStorage.setItem(SESSION_STORAGE_ACTIVE_STORE, data.activeContext.storeId);
      }

      // Invalidate all server queries so stale data from the previous store is wiped
      await invalidateStoreContextQueries();

      set({
        status: "AUTHENTICATED",
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        activeContext: data.activeContext,
        memberships: data.memberships,
        error: null,
      });
    } catch (err: unknown) {
      let message = "Failed to switch business/store context.";
      if (err instanceof ApiError) {
        message = err.message;
      }
      set({ status: "AUTHENTICATED", error: message });
      throw err;
    }
  },

  changePassword: async (request: ChangePasswordRequest): Promise<void> => {
    try {
      await apiClient.post<void>("/api/v1/auth/password/change", request);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      throw err;
    }
  },

  requestPasswordReset: async (email: string): Promise<void> => {
    try {
      await apiClient.post<void>(
        "/api/v1/auth/password/reset-request",
        { email } satisfies PasswordResetRequest,
        { skipAuth: true }
      );
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 0) {
        throw err;
      }
    }
  },

  confirmPasswordReset: async (request: PasswordResetConfirmRequest): Promise<void> => {
    try {
      await apiClient.post<void>("/api/v1/auth/password/reset-confirm", request, { skipAuth: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      throw err;
    }
  },

  logout: async (): Promise<void> => {
    const currentRefreshToken = get().refreshToken || safeSessionStorage.getItem(SESSION_STORAGE_REFRESH_TOKEN);
    try {
      if (currentRefreshToken) {
        await apiClient.post<void>(
          "/api/v1/auth/logout",
          { refreshToken: currentRefreshToken } satisfies RefreshTokenRequest,
          { skipAuth: false }
        );
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      safeSessionStorage.removeItem(SESSION_STORAGE_REFRESH_TOKEN);
      safeSessionStorage.removeItem(SESSION_STORAGE_ACTIVE_BUSINESS);
      safeSessionStorage.removeItem(SESSION_STORAGE_ACTIVE_STORE);
      await invalidateStoreContextQueries();
      set({
        status: "UNAUTHENTICATED",
        accessToken: null,
        refreshToken: null,
        user: null,
        activeContext: null,
        memberships: [],
        error: null,
      });
    }
  },

  logoutAll: async (): Promise<void> => {
    try {
      await apiClient.post<void>("/api/v1/auth/logout-all", {}, { skipAuth: false });
    } catch {
      // Ignore errors on logout
    } finally {
      safeSessionStorage.removeItem(SESSION_STORAGE_REFRESH_TOKEN);
      safeSessionStorage.removeItem(SESSION_STORAGE_ACTIVE_BUSINESS);
      safeSessionStorage.removeItem(SESSION_STORAGE_ACTIVE_STORE);
      await invalidateStoreContextQueries();
      set({
        status: "UNAUTHENTICATED",
        accessToken: null,
        refreshToken: null,
        user: null,
        activeContext: null,
        memberships: [],
        error: null,
      });
    }
  },

  restoreSession: async (): Promise<void> => {
    const storedRefreshToken = safeSessionStorage.getItem(SESSION_STORAGE_REFRESH_TOKEN);
    if (!storedRefreshToken) {
      set({ status: "UNAUTHENTICATED", accessToken: null, refreshToken: null });
      return;
    }

    set({ status: "RESTORING_SESSION", refreshToken: storedRefreshToken });
    try {
      const response = await apiClient.post<AuthResponse>(
        "/api/v1/auth/refresh",
        { refreshToken: storedRefreshToken } satisfies RefreshTokenRequest,
        { skipAuth: true }
      );
      const data = response.data;

      safeSessionStorage.setItem(SESSION_STORAGE_REFRESH_TOKEN, data.refreshToken);

      const isPlatformAdmin = data.activeContext?.role === "PLATFORM_ADMIN";
      const needsContextSelection =
        !isPlatformAdmin &&
        !data.activeContext?.storeId &&
        (data.memberships.length > 1 || (data.memberships[0]?.stores.length ?? 0) > 1);

      set({
        status: needsContextSelection ? "CONTEXT_SELECTION_REQUIRED" : "AUTHENTICATED",
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        activeContext: data.activeContext,
        memberships: data.memberships,
        error: null,
      });
    } catch {
      safeSessionStorage.removeItem(SESSION_STORAGE_REFRESH_TOKEN);
      set({
        status: "UNAUTHENTICATED",
        accessToken: null,
        refreshToken: null,
        user: null,
        activeContext: null,
      });
    }
  },
}));
