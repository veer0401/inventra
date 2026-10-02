import type { ProductQueryCondition } from "./catalog";

/**
 * Foundational intent categories recognized by the deterministic Inventra Intelligence engine.
 */
export type IntentType =
  | "NAVIGATE"
  | "SEARCH_PRODUCT"
  | "SEARCH_CUSTOMER"
  | "LOW_STOCK"
  | "EXPIRING_BATCHES"
  | "SALES_SUMMARY"
  | "HELP"
  | "UNKNOWN";

/**
 * Request payload for natural language command interpretation.
 */
export interface InterpretRequest {
  text: string;
}

/**
 * Structured entities extracted from natural language input.
 */
export interface InterpretEntities {
  query?: string;
  conditions?: ProductQueryCondition[];
  destination?: string;
  itemType?: string;
  timeframe?: string;
  dateContext?: string;
  [key: string]: unknown;
}

/**
 * Structured response from natural language command interpretation.
 */
export interface InterpretResponse {
  intent: IntentType;
  confidence: number;
  entities: InterpretEntities;
  originalText: string;
  normalizedText: string;
  explanation?: string;
  suggestions?: string[];
  engineVersion: string;
}

