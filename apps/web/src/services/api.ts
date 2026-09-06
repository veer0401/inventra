import { InventraClient } from "@inventra/api-client";
import { useAuthStore } from "../stores/authStore";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";

const isDesktop = typeof window !== "undefined" && Boolean(
  (window as any).__TAURI_INTERNALS__ ||
  (window as any).__TAURI__ ||
  window.location.port === "5174" ||
  window.location.port === "1420"
);

export const apiClient = new InventraClient({
  baseUrl,
  customHeaders: {
    "X-Client-Platform": isDesktop ? "DESKTOP" : "WEB",
  },
  tokenProvider: {
    getAccessToken: () => useAuthStore.getState().accessToken,
    refreshToken: () => useAuthStore.getState().refreshTokens(),
    onUnauthorized: () => useAuthStore.getState().logout(),
  },
});
