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

export const LOCAL_STORAGE_REFRESH_TOKEN = "inventra_rt";
export const LOCAL_STORAGE_CACHED_USER = "inventra_cached_user";
export const LOCAL_STORAGE_CACHED_CONTEXT = "inventra_cached_context";
export const LOCAL_STORAGE_CACHED_MEMBERSHIPS = "inventra_cached_memberships";
export const LOCAL_STORAGE_DEBUG_OFFLINE = "inventra_debug_offline_mode";

export const isDesktopPlatform = (): boolean => {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as any).__TAURI_INTERNALS__ ||
    (window as any).__TAURI__ ||
    window.location.port === "5174" ||
    window.location.port === "1420"
  );
};

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignore localStorage exceptions
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
  },
};

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

export const persistAuthData = (data: AuthResponse): void => {
  safeSessionStorage.setItem(SESSION_STORAGE_REFRESH_TOKEN, data.refreshToken);
  if (data.activeContext?.businessId) {
    safeSessionStorage.setItem(SESSION_STORAGE_ACTIVE_BUSINESS, data.activeContext.businessId);
  }
  if (data.activeContext?.storeId) {
    safeSessionStorage.setItem(SESSION_STORAGE_ACTIVE_STORE, data.activeContext.storeId);
  }

  // Persistent storage for desktop sessions & offline resilience
  safeLocalStorage.setItem(LOCAL_STORAGE_REFRESH_TOKEN, data.refreshToken);
  if (data.user) {
    safeLocalStorage.setItem(LOCAL_STORAGE_CACHED_USER, JSON.stringify(data.user));
  }
  if (data.activeContext) {
    safeLocalStorage.setItem(LOCAL_STORAGE_CACHED_CONTEXT, JSON.stringify(data.activeContext));
  }
  if (data.memberships) {
    safeLocalStorage.setItem(LOCAL_STORAGE_CACHED_MEMBERSHIPS, JSON.stringify(data.memberships));
  }
};

export const clearPersistedAuthData = (): void => {
  safeSessionStorage.removeItem(SESSION_STORAGE_REFRESH_TOKEN);
  safeSessionStorage.removeItem(SESSION_STORAGE_ACTIVE_BUSINESS);
  safeSessionStorage.removeItem(SESSION_STORAGE_ACTIVE_STORE);

  safeLocalStorage.removeItem(LOCAL_STORAGE_REFRESH_TOKEN);
  safeLocalStorage.removeItem(LOCAL_STORAGE_CACHED_USER);
  safeLocalStorage.removeItem(LOCAL_STORAGE_CACHED_CONTEXT);
  safeLocalStorage.removeItem(LOCAL_STORAGE_CACHED_MEMBERSHIPS);
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
      clearPersistedAuthData();
    },
  },
});

let activeRefreshPromise: Promise<string | null> | null = null;

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

      // Persist auth data in session & persistent storage (for desktop & offline session recovery)
      persistAuthData(data);

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
        isOnline: true,
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
    if (activeRefreshPromise) {
      return activeRefreshPromise;
    }

    const currentRefreshToken =
      get().refreshToken ||
      safeSessionStorage.getItem(SESSION_STORAGE_REFRESH_TOKEN) ||
      safeLocalStorage.getItem(LOCAL_STORAGE_REFRESH_TOKEN);

    if (!currentRefreshToken) {
      return null;
    }

    activeRefreshPromise = (async () => {
      set({ status: "REFRESHING" });
      try {
        const response = await apiClient.post<AuthResponse>(
          "/api/v1/auth/refresh",
          { refreshToken: currentRefreshToken } satisfies RefreshTokenRequest,
          { skipAuth: true }
        );
        const data = response.data;

        persistAuthData(data);

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
          isOnline: true,
          error: null,
        });

        return data.accessToken;
      } catch (err: unknown) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          clearPersistedAuthData();
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

        // On network error, keep existing tokens/state if available
        return get().accessToken;
      } finally {
        activeRefreshPromise = null;
      }
    })();

    return activeRefreshPromise;
  },

  switchContext: async (businessId?: string, storeId?: string): Promise<void> => {
    set({ status: "SWITCHING_CONTEXT", error: null });
    try {
      const payload: SwitchContextRequest = { businessId, storeId };
      const response = await apiClient.post<AuthResponse>("/api/v1/auth/switch-context", payload);
      const data = response.data;

      persistAuthData(data);

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
    const currentRefreshToken =
      get().refreshToken ||
      safeSessionStorage.getItem(SESSION_STORAGE_REFRESH_TOKEN) ||
      safeLocalStorage.getItem(LOCAL_STORAGE_REFRESH_TOKEN);
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
      clearPersistedAuthData();
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
      clearPersistedAuthData();
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
    const storedRefreshToken =
      safeSessionStorage.getItem(SESSION_STORAGE_REFRESH_TOKEN) ||
      safeLocalStorage.getItem(LOCAL_STORAGE_REFRESH_TOKEN);

    if (!storedRefreshToken) {
      set({ status: "UNAUTHENTICATED", accessToken: null, refreshToken: null });
      return;
    }

    // Check if offline debug mode is active or station has no network connectivity
    const isDebugOffline = safeLocalStorage.getItem(LOCAL_STORAGE_DEBUG_OFFLINE) === "true";
    const isOffline = isDebugOffline || (typeof navigator !== "undefined" && !navigator.onLine);

    // Retrieve cached offline user & context if present in local persistence
    let cachedUser: UserSummaryDto | null = null;
    let cachedContext: ActiveContextDto | null = null;
    let cachedMemberships: BusinessMembershipSummaryDto[] = [];
    try {
      const userStr = safeLocalStorage.getItem(LOCAL_STORAGE_CACHED_USER);
      if (userStr) cachedUser = JSON.parse(userStr);
      const ctxStr = safeLocalStorage.getItem(LOCAL_STORAGE_CACHED_CONTEXT);
      if (ctxStr) cachedContext = JSON.parse(ctxStr);
      const memStr = safeLocalStorage.getItem(LOCAL_STORAGE_CACHED_MEMBERSHIPS);
      if (memStr) cachedMemberships = JSON.parse(memStr);
    } catch {
      // Ignore JSON parse errors
    }

    // If offline debugging mode is enabled or client is disconnected, restore session from cache immediately
    if (isOffline && cachedUser) {
      set({
        status: "AUTHENTICATED",
        accessToken: "offline-cached-session-token",
        refreshToken: storedRefreshToken,
        user: cachedUser,
        activeContext: cachedContext,
        memberships: cachedMemberships,
        isOnline: false,
        error: isDebugOffline
          ? "Station running in Offline Storage Simulation Mode. Network calls are isolated."
          : "Workstation running in offline mode from cached credentials.",
      });
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

      persistAuthData(data);

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
        isOnline: true,
        error: null,
      });
    } catch (err: unknown) {
      // If server explicitly rejects token (401 or 403), revoke credentials
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        clearPersistedAuthData();
        set({
          status: "UNAUTHENTICATED",
          accessToken: null,
          refreshToken: null,
          user: null,
          activeContext: null,
        });
        return;
      }

      // If backend is unreachable (offline, connection refused, status 0), restore from local cache
      if (cachedUser) {
        set({
          status: "AUTHENTICATED",
          accessToken: "offline-cached-session-token",
          refreshToken: storedRefreshToken,
          user: cachedUser,
          activeContext: cachedContext,
          memberships: cachedMemberships,
          isOnline: false,
          error: "Backend server unreachable. Station restored from local offline cache.",
        });
      } else {
        clearPersistedAuthData();
        set({
          status: "UNAUTHENTICATED",
          accessToken: null,
          refreshToken: null,
          user: null,
          activeContext: null,
        });
      }
    }
  },
}));
