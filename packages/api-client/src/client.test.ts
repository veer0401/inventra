import { describe, it, expect, vi, beforeEach } from "vitest";
import { InventraClient } from "./client";
import { ApiError } from "./error";

describe("InventraClient", () => {
  let client: InventraClient;

  beforeEach(() => {
    client = new InventraClient({
      baseUrl: "http://localhost:8080",
      tokenProvider: {
        getAccessToken: () => "mock-jwt-token",
        getDeviceId: () => "01a037d5-c0d3-72eb-81f6-ad0a91e7fa24",
      },
    });
  });

  it("injects Authorization Bearer and X-Device-Id headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { id: "123" }, timestamp: "2026-08-25T12:00:00Z" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const response = await client.get("/api/v1/products");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe("http://localhost:8080/api/v1/products");
    expect(calledOptions.headers["Authorization"]).toBe("Bearer mock-jwt-token");
    expect(calledOptions.headers["X-Device-Id"]).toBe("01a037d5-c0d3-72eb-81f6-ad0a91e7fa24");
    expect(response.success).toBe(true);
  });

  it("appends query parameters correctly", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [], timestamp: "2026-08-25T12:00:00Z" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await client.get("/api/v1/products/search", { params: { query: "Crocin", page: 0, size: 20 } });

    const [calledUrl] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe("http://localhost:8080/api/v1/products/search?query=Crocin&page=0&size=20");
  });

  it("parses RFC 9457 ProblemDetail on HTTP 422 error", async () => {
    const problemDetail = {
      type: "https://api.inventra.com/errors/insufficient-stock",
      title: "Insufficient Stock",
      status: 422,
      detail: "Insufficient stock for Paracetamol",
      errorCode: "INSUFFICIENT_STOCK",
      timestamp: "2026-08-25T12:00:00Z",
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => problemDetail,
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(client.post("/api/v1/sales", { lines: [] })).rejects.toThrow(ApiError);

    try {
      await client.post("/api/v1/sales", { lines: [] });
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(422);
      expect(apiErr.errorCode).toBe("INSUFFICIENT_STOCK");
      expect(apiErr.isBusinessRuleViolation()).toBe(true);
      expect(apiErr.message).toBe("Insufficient stock for Paracetamol");
    }
  });

  it("parses validation violations on HTTP 400 error", async () => {
    const problemDetail = {
      type: "https://api.inventra.com/errors/validation-failed",
      title: "Validation Failed",
      status: 400,
      detail: "Request validation failed",
      errorCode: "VALIDATION_FAILED",
      timestamp: "2026-08-25T12:00:00Z",
      violations: [{ field: "email", message: "Email is required" }],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => problemDetail,
    });
    vi.stubGlobal("fetch", mockFetch);

    try {
      await client.post("/api/v1/auth/login", {});
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(400);
      expect(apiErr.isValidationError()).toBe(true);
      expect(apiErr.violations).toHaveLength(1);
      expect(apiErr.violations![0].field).toBe("email");
    }
  });
});
