import type { ApiResponse, ProblemDetail } from "@inventra/api-types";
import { ApiError } from "./error";

export interface TokenProvider {
  getAccessToken: () => Promise<string | null> | string | null;
  getDeviceId?: () => Promise<string | null> | string | null;
  onUnauthorized?: () => Promise<void> | void;
  refreshToken?: () => Promise<string | null>;
}

export interface ClientConfig {
  baseUrl: string;
  defaultTimeoutMs?: number;
  tokenProvider?: TokenProvider;
  customHeaders?: Record<string, string>;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
  skipAuth?: boolean;
  body?: unknown;
  _isRetry?: boolean;
}

export class InventraClient {
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  private readonly tokenProvider?: TokenProvider;
  private readonly customHeaders: Record<string, string>;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? 15000;
    this.tokenProvider = config.tokenProvider;
    this.customHeaders = config.customHeaders ?? {};
  }

  public async get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  public async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: "POST", body });
  }

  public async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: "PATCH", body });
  }

  public async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: "PUT", body });
  }

  public async delete<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }

  public async request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    // Offline Storage Debugging Simulation: Station Isolation
    if (typeof window !== "undefined" && window.localStorage?.getItem("inventra_debug_offline_mode") === "true") {
      throw new ApiError(
        0,
        "Station Isolated (Offline Storage Simulation): Outbound network calls to the backend are suppressed."
      );
    }

    const url = this.buildUrl(path, options.params);
    const headers = await this.buildHeaders(options);

    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
      const fetchOptions: RequestInit = {
        ...options,
        headers,
        signal: options.signal ?? controller.signal,
        body: isFormData
          ? (options.body as FormData)
          : options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
      };

      let response = await fetch(url, fetchOptions);

      // Handle 401 Unauthorized with token refresh if provider is configured and this isn't already a retry
      if (response.status === 401 && !options.skipAuth && !options._isRetry && this.tokenProvider?.refreshToken) {
        const newToken = await this.handleTokenRefresh();
        if (newToken) {
          // Retry the original request exactly once with the new access token
          return await this.request<T>(path, {
            ...options,
            _isRetry: true,
          });
        } else if (this.tokenProvider.onUnauthorized) {
          await this.tokenProvider.onUnauthorized();
        }
      }

      if (!response.ok) {
        throw await this.parseErrorResponse(response);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {
          success: true,
          data: null as unknown as T,
          timestamp: new Date().toISOString(),
        };
      }

      const json = await response.json();
      return json as ApiResponse<T>;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw err;
      }
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new ApiError(408, `Request timeout after ${timeoutMs}ms`);
      }
      if (err instanceof TypeError) {
        throw new ApiError(0, `Network connection failed: ${err.message}`);
      }
      throw new ApiError(500, err instanceof Error ? err.message : "Unknown request error");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined | null>): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${cleanPath}`);

    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          url.searchParams.append(key, String(val));
        }
      });
    }

    return url.toString();
  }

  private async buildHeaders(options: RequestOptions): Promise<Record<string, string>> {
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Accept: "application/json, application/problem+json",
      ...this.customHeaders,
      ...(options.headers as Record<string, string>),
    };
    if (isFormData && headers["Content-Type"]) {
      delete headers["Content-Type"];
    }

    if (!options.skipAuth && this.tokenProvider) {
      const token = await this.tokenProvider.getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      if (this.tokenProvider.getDeviceId) {
        const deviceId = await this.tokenProvider.getDeviceId();
        if (deviceId) {
          headers["X-Device-Id"] = deviceId;
        }
      }
    }

    return headers;
  }

  private async handleTokenRefresh(): Promise<string | null> {
    if (!this.tokenProvider?.refreshToken) {
      return null;
    }

    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        return await this.tokenProvider!.refreshToken!();
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async parseErrorResponse(response: Response): Promise<ApiError> {
    try {
      const body = await response.json();
      if (body && typeof body === "object" && "errorCode" in body) {
        const problem = body as ProblemDetail;
        return new ApiError(response.status, problem.detail || problem.title || `Error ${response.status}`, problem);
      }
      if (body && typeof body === "object" && "detail" in body) {
        const problem = body as ProblemDetail;
        return new ApiError(response.status, problem.detail || problem.title || `Error ${response.status}`, problem);
      }
      if (body && typeof body === "object" && "message" in body) {
        return new ApiError(response.status, String(body.message));
      }
    } catch {
      // Body not JSON
    }
    return new ApiError(response.status, `HTTP error ${response.status}: ${response.statusText}`);
  }
}
