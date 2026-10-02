import { apiClient } from "./api";
import type { InterpretResponse } from "@inventra/api-types";

export const intelligenceApi = {
  /**
   * Sends a natural language command to Inventra Intelligence for interpretation.
   * Note: This only interprets user intent and does NOT execute any business actions.
   */
  async interpret(text: string): Promise<InterpretResponse> {
    const res = await apiClient.post<InterpretResponse>("/api/v1/intelligence/interpret", {
      text,
    });
    return res.data;
  },
};
