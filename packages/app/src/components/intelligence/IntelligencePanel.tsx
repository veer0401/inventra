import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useInRouterContext, MemoryRouter } from "react-router-dom";
import {
  Sparkles,
  X,
  Send,
  Compass,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Info,
  ChevronRight,
  Package,
  User,
  ExternalLink,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { useShortcutStore } from "../../stores/shortcutStore";
import { useAuthStore } from "../../stores/authStore";
import { intelligenceApi } from "../../services/intelligenceApi";
import { catalogApi } from "../../services/catalogApi";
import { customerApi } from "../../services/customerApi";
import { inventoryApi } from "../../services/inventoryApi";
import { resolveNavigationAction } from "../../services/navigationActionResolver";
import type {
  InterpretResponse,
  ProductSummaryResponse,
  CustomerSummaryResponse,
  ProductQueryCondition,
} from "@inventra/api-types";
import { ShortcutHint } from "@inventra/ui";

export interface LowStockItem {
  id: string;
  productId: string;
  productName: string;
  genericName?: string;
  sku?: string;
  currentStock: number;
  reorderLevel: number;
  minStock?: number;
  baseUnit?: string;
  locationRack?: string | null;
}

export interface LowStockState {
  status: "loading" | "success" | "empty" | "error";
  total: number;
  items: LowStockItem[];
  hasMore: boolean;
  storeName?: string;
  error?: string;
}

export interface ExpiringBatchItem {
  id: string;
  batchNumber: string;
  productId: string;
  productName: string;
  genericName?: string;
  sku?: string;
  expiryDate: string;
  quantity: number;
  baseUnit?: string;
  mrp?: number;
  sellingPrice?: number;
}

export interface ExpiringBatchesState {
  status: "loading" | "success" | "empty" | "error";
  total: number;
  items: ExpiringBatchItem[];
  hasMore: boolean;
  storeName?: string;
  error?: string;
}

interface ProductSearchState {
  status: "loading" | "success" | "empty" | "error";
  query: string;
  conditions?: ProductQueryCondition[];
  products: ProductSummaryResponse[];
  error?: string;
}

interface CustomerSearchState {
  status: "loading" | "success" | "empty" | "error";
  query: string;
  customers: CustomerSummaryResponse[];
  error?: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "inventra";
  timestamp: Date;
  text?: string;
  result?: InterpretResponse;
  productSearch?: ProductSearchState;
  customerSearch?: CustomerSearchState;
  lowStock?: LowStockState;
  expiringBatches?: ExpiringBatchesState;
  error?: string;
}

function formatExpiryDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function maskPhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.trim();
  if (cleaned.length <= 4) return cleaned;
  const lastFour = cleaned.slice(-4);
  return `••••••${lastFour}`;
}

/**
 * Strips natural language search command prefixes while safely preserving product names/codes.
 * For example:
 * - "find medicine_1" -> "medicine_1"
 * - "search for medicine_1" -> "medicine_1"
 * - "find product medicine_1" -> "medicine_1"
 * - "find medicine" -> "medicine"
 * - "find medicine paracetamol" -> "paracetamol"
 */
export function cleanProductSearchPrefix(text: string): string {
  if (!text) return "";
  const trimmed = text.trim();
  // 1. If explicit category prefix is followed by space and query (e.g. "find product medicine_1" or "find medicine paracetamol")
  const explicitMatch = trimmed.match(
    /^(?:search\s+for|search|find|lookup|look\s+for|get|show)\s+(?:the\s+)?(?:product|medicine|drug|item|tablet)s?\s+(.+)$/i
  );
  if (explicitMatch && explicitMatch[1]?.trim()) {
    return explicitMatch[1].trim();
  }

  // 2. Direct command verb prefix (e.g. "find medicine_1", "search for medicine_1", "find medicine")
  const directMatch = trimmed.match(
    /^(?:search\s+for|search|find|lookup|look\s+for|get|show)\s+(.+)$/i
  );
  if (directMatch && directMatch[1]?.trim()) {
    return directMatch[1].trim();
  }

  return trimmed;
}

/**
 * Normalizes a search query without destroying meaningful characters such as _, -, /, ., digits.
 */
export function normalizeSearchQuery(query: string): string {
  if (!query) return "";
  return query.trim().replace(/\s+/g, " ");
}

/**
 * Formats a raw dosage form string into clean Title Case (e.g. TABLET -> Tablet, EYE_DROPS -> Eye Drops).
 */
export function formatDosageForm(form?: string | null): string {
  if (!form) return "";
  return form
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Formats a structured ProductQueryCondition into a human-readable filter chip label.
 */
export function formatProductCondition(cond: ProductQueryCondition): string {
  switch (cond.field) {
    case "DOSAGE_FORM":
      return formatDosageForm(cond.value);
    case "PRICE": {
      switch (cond.operator) {
        case "LESS_THAN":
          return `Price < ₹${cond.value}`;
        case "LESS_THAN_OR_EQUAL":
          return `Price ≤ ₹${cond.value}`;
        case "GREATER_THAN":
          return `Price > ₹${cond.value}`;
        case "GREATER_THAN_OR_EQUAL":
          return `Price ≥ ₹${cond.value}`;
        case "BETWEEN":
          return `Price ₹${cond.value}–₹${cond.secondaryValue}`;
        case "EQUALS":
          return `Price = ₹${cond.value}`;
        default:
          return `Price ${cond.operator} ₹${cond.value}`;
      }
    }
    case "STRENGTH": {
      const u = cond.unit ? ` ${cond.unit}` : "";
      switch (cond.operator) {
        case "LESS_THAN":
          return `Strength < ${cond.value}${u}`;
        case "LESS_THAN_OR_EQUAL":
          return `Strength ≤ ${cond.value}${u}`;
        case "GREATER_THAN":
          return `Strength > ${cond.value}${u}`;
        case "GREATER_THAN_OR_EQUAL":
          return `Strength ≥ ${cond.value}${u}`;
        case "BETWEEN":
          return `Strength ${cond.value}–${cond.secondaryValue}${u}`;
        case "EQUALS":
          return `Strength = ${cond.value}${u}`;
        default:
          return `Strength ${cond.operator} ${cond.value}${u}`;
      }
    }
    case "NAME": {
      switch (cond.operator) {
        case "STARTS_WITH":
          return `Name starts with "${cond.value}"`;
        case "ENDS_WITH":
          return `Name ends with "${cond.value}"`;
        case "CONTAINS":
          return `Name contains "${cond.value}"`;
        case "EQUALS":
          return `Name = "${cond.value}"`;
        default:
          return `Name ${cond.operator} "${cond.value}"`;
      }
    }
    case "GENERIC_NAME": {
      switch (cond.operator) {
        case "CONTAINS":
          return `Generic contains "${cond.value}"`;
        case "STARTS_WITH":
          return `Generic starts with "${cond.value}"`;
        case "ENDS_WITH":
          return `Generic ends with "${cond.value}"`;
        case "EQUALS":
          return `Generic: "${cond.value}"`;
        default:
          return `Generic ${cond.operator} "${cond.value}"`;
      }
    }
    case "BRAND": {
      switch (cond.operator) {
        case "CONTAINS":
          return `Brand contains "${cond.value}"`;
        case "STARTS_WITH":
          return `Brand starts with "${cond.value}"`;
        case "ENDS_WITH":
          return `Brand ends with "${cond.value}"`;
        case "EQUALS":
          return `Brand: "${cond.value}"`;
        default:
          return `Brand ${cond.operator} "${cond.value}"`;
      }
    }
    case "SKU":
      return `SKU: ${cond.value}`;
    case "STOCK":
      return `Stock ${cond.operator} ${cond.value}`;
    case "REORDER_LEVEL":
      return `Reorder Level ${cond.operator} ${cond.value}`;
    default:
      return `${cond.field} ${cond.operator} ${cond.value}`;
  }
}

const IntelligencePanelContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { intelligenceOpen, copilotOpen, setIntelligenceOpen } = useShortcutStore();
  const isPanelOpen = Boolean(intelligenceOpen || copilotOpen);
  const activeContext = useAuthStore((state) => state.activeContext);
  const userRole = activeContext?.role;
  const storeName = activeContext?.storeName;

  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const draftQueryRef = useRef<string>("");
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef<boolean>(false);

  // Derive human-readable current module name safely from location
  const currentModuleName = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/inventory/batches")) return "Batches & FEFO";
    if (path.startsWith("/inventory")) return "Inventory";
    if (path.startsWith("/catalog")) return "Product Catalog";
    if (path.startsWith("/customers")) return "Customers";
    if (path.startsWith("/purchasing")) return "Purchase Orders";
    if (path.startsWith("/goods-receipts")) return "Goods Receipts";
    if (path.startsWith("/pos")) return "Point of Sale";
    if (path.startsWith("/sales")) return "Sales History";
    if (path.startsWith("/returns")) return "Returns";
    if (path.startsWith("/transfers")) return "Store Transfers";
    if (path.startsWith("/suppliers")) return "Suppliers";
    if (path.startsWith("/devices")) return "Devices";
    if (path.startsWith("/imports")) return "Imports";
    if (path.startsWith("/reports")) return "Reports";
    if (path.startsWith("/settings")) return "Settings";
    if (path.startsWith("/dashboard")) return "Dashboard";
    return "General";
  }, [location.pathname]);

  // Derive context-aware deterministic suggestions
  const contextSuggestions = useMemo(() => {
    switch (currentModuleName) {
      case "Inventory":
      case "Batches & FEFO":
        return [
          "Find a medicine",
          "Show low stock medicines",
          "Show expiring batches",
        ];
      case "Customers":
        return [
          "Find a customer",
          "Search customer Rahul",
          "Open inventory",
        ];
      case "Purchase Orders":
      case "Goods Receipts":
        return [
          "Find a supplier",
          "Search purchase orders",
          "Open inventory",
        ];
      case "Point of Sale":
        return [
          "Find a medicine",
          "Find a customer",
          "Show today's sales",
        ];
      case "Sales History":
        return [
          "Show today's sales",
          "Find a customer",
          "Open inventory",
        ];
      default:
        return [
          "Find a medicine",
          "Find a customer",
          "Search customer Rahul",
          "Open inventory",
          "Show low stock medicines",
          "Help",
        ];
    }
  }, [currentModuleName]);

  // Auto-focus input when panel opens
  useEffect(() => {
    if (isPanelOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isPanelOpen]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isPanelOpen) {
      chatBottomRef.current?.scrollIntoView?.({ behavior: "smooth" });
    }
  }, [messages, isPanelOpen]);

  const handleRetryProductSearch = async (messageId: string) => {
    const targetMsg = messages.find((m) => m.id === messageId);
    if (!targetMsg || !targetMsg.productSearch || isProcessingRef.current) return;

    const currentSearch = targetMsg.productSearch;
    const conditions = currentSearch.conditions || [];
    const hasConditions = conditions.length > 0;
    const prodQuery = currentSearch.query;
    const activeStoreId = activeContext?.storeId || undefined;

    isProcessingRef.current = true;
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              productSearch: {
                ...currentSearch,
                status: "loading",
                error: undefined,
              },
            }
          : msg
      )
    );

    try {
      if (hasConditions) {
        const pageRes = await catalogApi.searchProductsStructured(
          {
            query: prodQuery || null,
            conditions,
            storeId: activeStoreId || null,
          },
          0,
          10
        );
        const products = pageRes.content || [];
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  productSearch: {
                    status: products.length > 0 ? "success" : "empty",
                    query: prodQuery,
                    conditions,
                    products,
                  },
                }
              : msg
          )
        );
      } else {
        const pageRes = await catalogApi.searchProducts(prodQuery, 0, 10);
        const products = pageRes.content || [];
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  productSearch: {
                    status: products.length > 0 ? "success" : "empty",
                    query: prodQuery,
                    products,
                  },
                }
              : msg
          )
        );
      }
    } catch (searchErr: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                productSearch: {
                  ...currentSearch,
                  status: "error",
                  error: searchErr?.message || "Failed to query product catalog",
                },
              }
            : msg
        )
      );
    } finally {
      isProcessingRef.current = false;
    }
  };

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isLoading || isProcessingRef.current) return;

    isProcessingRef.current = true;

    const userMessageId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      sender: "user",
      timestamp: new Date(),
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setPromptHistory((prev) =>
      prev.length > 0 && prev[prev.length - 1] === textToSend ? prev : [...prev, textToSend]
    );
    setHistoryIndex(-1);
    draftQueryRef.current = "";
    setInputQuery("");
    setIsLoading(true);

    const botMessageId = `inventra-${Date.now()}`;

    try {
      // Step 1: Interpret natural language intent via deterministic backend NLP engine
      const interpretRes = await intelligenceApi.interpret(textToSend);

      // Initialize assistant response message
      const botMsg: ChatMessage = {
        id: botMessageId,
        sender: "inventra",
        timestamp: new Date(),
        result: interpretRes,
      };

      // Step 2: Handle actionable intents (SEARCH_PRODUCT, SEARCH_CUSTOMER, NAVIGATE)
      if (interpretRes.intent === "SEARCH_PRODUCT") {
        const conditions = (interpretRes.entities?.conditions as ProductQueryCondition[] | undefined) || [];
        const hasConditions = Array.isArray(conditions) && conditions.length > 0;

        if (hasConditions) {
          // Structured product query
          const rawQuery = (interpretRes.entities?.query as string) || "";
          const prodQuery = normalizeSearchQuery(rawQuery);
          const activeStoreId = activeContext?.storeId || undefined;

          botMsg.productSearch = {
            status: "loading",
            query: prodQuery,
            conditions,
            products: [],
          };

          setMessages((prev) => [...prev, botMsg]);

          try {
            const pageRes = await catalogApi.searchProductsStructured(
              {
                query: prodQuery || null,
                conditions,
                storeId: activeStoreId || null,
              },
              0,
              10
            );
            const products = pageRes.content || [];

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMessageId
                  ? {
                      ...msg,
                      productSearch: {
                        status: products.length > 0 ? "success" : "empty",
                        query: prodQuery,
                        conditions,
                        products,
                      },
                    }
                  : msg
              )
            );
          } catch (searchErr: any) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMessageId
                  ? {
                      ...msg,
                      productSearch: {
                        status: "error",
                        query: prodQuery,
                        conditions,
                        products: [],
                        error: searchErr?.message || "Failed to query product catalog",
                      },
                    }
                  : msg
              )
            );
          }
        } else {
          // Plain-text product query (backward compatibility)
          const rawQuery =
            (interpretRes.entities?.query as string) ||
            cleanProductSearchPrefix(textToSend);
          const prodQuery = normalizeSearchQuery(rawQuery);

          botMsg.productSearch = {
            status: "loading",
            query: prodQuery,
            products: [],
          };

          setMessages((prev) => [...prev, botMsg]);

          try {
            const pageRes = await catalogApi.searchProducts(prodQuery, 0, 10);
            const products = pageRes.content || [];

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMessageId
                  ? {
                      ...msg,
                      productSearch: {
                        status: products.length > 0 ? "success" : "empty",
                        query: prodQuery,
                        products,
                      },
                    }
                  : msg
              )
            );
          } catch (searchErr: any) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMessageId
                  ? {
                      ...msg,
                      productSearch: {
                        status: "error",
                        query: prodQuery,
                        products: [],
                        error: searchErr?.message || "Failed to query product catalog",
                      },
                    }
                  : msg
              )
            );
          }
        }
      } else if (interpretRes.intent === "SEARCH_CUSTOMER") {
        const rawCustQuery =
          (interpretRes.entities?.query as string) ||
          textToSend.replace(
            /^(?:search\s+for|search|find|show|lookup|look\s+for|get)\s+(?:the\s+)?(?:customer|patient|client)s?\s+/i,
            ""
          );
        const custQuery = normalizeSearchQuery(rawCustQuery);

        botMsg.customerSearch = {
          status: "loading",
          query: custQuery,
          customers: [],
        };

        setMessages((prev) => [...prev, botMsg]);

        try {
          const customers = await customerApi.searchCustomers(custQuery);

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? {
                    ...msg,
                    customerSearch: {
                      status: customers.length > 0 ? "success" : "empty",
                      query: custQuery,
                      customers,
                    },
                  }
                : msg
            )
          );
        } catch (searchErr: any) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? {
                    ...msg,
                    customerSearch: {
                      status: "error",
                      query: custQuery,
                      customers: [],
                      error: searchErr?.message || "Failed to search customer records",
                    },
                  }
                : msg
            )
          );
        }
      } else if (interpretRes.intent === "LOW_STOCK") {
        botMsg.lowStock = {
          status: "loading",
          total: 0,
          items: [],
          hasMore: false,
          storeName: storeName || undefined,
        };

        setMessages((prev) => [...prev, botMsg]);

        try {
          const storeId = activeContext?.storeId;
          if (!storeId) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMessageId
                  ? {
                      ...msg,
                      lowStock: {
                        status: "error",
                        total: 0,
                        items: [],
                        hasMore: false,
                        error: "Active store context required to query low-stock items. Please select a store from the context switcher.",
                      },
                    }
                  : msg
              )
            );
            return;
          }

          const pageRes = await inventoryApi.listInventory({
            storeId,
            lowStockOnly: true,
            size: 5,
          });

          const rawItems = pageRes.content || [];
          const totalElements = pageRes.totalElements ?? rawItems.length;

          if (rawItems.length === 0) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMessageId
                  ? {
                      ...msg,
                      lowStock: {
                        status: "empty",
                        total: 0,
                        items: [],
                        hasMore: false,
                        storeName: storeName || undefined,
                      },
                    }
                  : msg
              )
            );
          } else {
            // Enrich inventory items with real product catalog metadata (name, sku, unit)
            const enrichedItems: LowStockItem[] = await Promise.all(
              rawItems.map(async (item) => {
                try {
                  const prod = await catalogApi.getProduct(item.productId);
                  const skuIdentifier = prod.identifiers?.find(
                    (id) => id.identifierType === "SKU"
                  );
                  return {
                    id: item.id,
                    productId: item.productId,
                    productName: prod.name || "Product",
                    genericName: prod.genericName,
                    sku: skuIdentifier?.identifierValue,
                    currentStock: Number(item.currentStock),
                    reorderLevel: Number(item.reorderLevel),
                    minStock: item.minStock != null ? Number(item.minStock) : undefined,
                    baseUnit: prod.baseUnit || "Unit",
                    locationRack: item.locationRack,
                  };
                } catch {
                  return {
                    id: item.id,
                    productId: item.productId,
                    productName: "Product " + item.productId.slice(0, 8),
                    currentStock: Number(item.currentStock),
                    reorderLevel: Number(item.reorderLevel),
                    minStock: item.minStock != null ? Number(item.minStock) : undefined,
                    baseUnit: "Unit",
                    locationRack: item.locationRack,
                  };
                }
              })
            );

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMessageId
                  ? {
                      ...msg,
                      lowStock: {
                        status: "success",
                        total: totalElements,
                        items: enrichedItems,
                        hasMore: totalElements > enrichedItems.length,
                        storeName: storeName || undefined,
                      },
                    }
                  : msg
              )
            );
          }
        } catch (stockErr: any) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? {
                    ...msg,
                    lowStock: {
                      status: "error",
                      total: 0,
                      items: [],
                      hasMore: false,
                      error: stockErr?.message || "Failed to retrieve low-stock inventory data",
                    },
                  }
                : msg
            )
          );
        }
      } else if (interpretRes.intent === "EXPIRING_BATCHES") {
        botMsg.expiringBatches = {
          status: "loading",
          total: 0,
          items: [],
          hasMore: false,
          storeName: storeName || undefined,
        };

        setMessages((prev) => [...prev, botMsg]);

        try {
          const storeId = activeContext?.storeId;
          if (!storeId) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMessageId
                  ? {
                      ...msg,
                      expiringBatches: {
                        status: "error",
                        total: 0,
                        items: [],
                        hasMore: false,
                        error: "Please select an active store to view expiring batches.",
                      },
                    }
                  : msg
              )
            );
            return;
          }

          const pageRes = await inventoryApi.listBatches({
            storeId,
            expiringWithinDays: 60,
            size: 5,
            sort: "expiryDate,asc",
          });

          const rawBatches = pageRes.content || [];
          const totalElements = pageRes.totalElements ?? rawBatches.length;

          if (rawBatches.length === 0) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMessageId
                  ? {
                      ...msg,
                      expiringBatches: {
                        status: "empty",
                        total: 0,
                        items: [],
                        hasMore: false,
                        storeName: storeName || undefined,
                      },
                    }
                  : msg
              )
            );
          } else {
            const enrichedBatches: ExpiringBatchItem[] = await Promise.all(
              rawBatches.map(async (batch) => {
                try {
                  const prod = await catalogApi.getProduct(batch.productId);
                  const skuIdentifier = prod.identifiers?.find(
                    (id) => id.identifierType === "SKU"
                  );
                  return {
                    id: batch.id,
                    batchNumber: batch.batchNumber,
                    productId: batch.productId,
                    productName: prod.name || "Product",
                    genericName: prod.genericName,
                    sku: skuIdentifier?.identifierValue,
                    expiryDate: batch.expiryDate,
                    quantity: Number(batch.quantity),
                    baseUnit: prod.baseUnit || "units",
                    mrp: batch.mrp != null ? Number(batch.mrp) : undefined,
                    sellingPrice: batch.sellingPrice != null ? Number(batch.sellingPrice) : undefined,
                  };
                } catch {
                  return {
                    id: batch.id,
                    batchNumber: batch.batchNumber,
                    productId: batch.productId,
                    productName: "Product " + batch.productId.slice(0, 8),
                    expiryDate: batch.expiryDate,
                    quantity: Number(batch.quantity),
                    baseUnit: "units",
                    mrp: batch.mrp != null ? Number(batch.mrp) : undefined,
                    sellingPrice: batch.sellingPrice != null ? Number(batch.sellingPrice) : undefined,
                  };
                }
              })
            );

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMessageId
                  ? {
                      ...msg,
                      expiringBatches: {
                        status: "success",
                        total: totalElements,
                        items: enrichedBatches,
                        hasMore: totalElements > enrichedBatches.length,
                        storeName: storeName || undefined,
                      },
                    }
                  : msg
              )
            );
          }
        } catch (batchErr: any) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? {
                    ...msg,
                    expiringBatches: {
                      status: "error",
                      total: 0,
                      items: [],
                      hasMore: false,
                      error: batchErr?.message || "Failed to retrieve expiring batches data",
                    },
                  }
                : msg
            )
          );
        }
      } else {
        // Other intents (NAVIGATE, SALES_SUMMARY, HELP, UNKNOWN)
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `inventra-err-${Date.now()}`,
        sender: "inventra",
        timestamp: new Date(),
        error: err?.message || "Failed to communicate with Inventra Intelligence engine",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      isProcessingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    setPromptHistory([]);
    setHistoryIndex(-1);
    draftQueryRef.current = "";
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      if (promptHistory.length === 0) return;
      e.preventDefault();
      let nextIndex = historyIndex;
      if (historyIndex === -1) {
        draftQueryRef.current = inputQuery;
        nextIndex = promptHistory.length - 1;
      } else if (historyIndex > 0) {
        nextIndex = historyIndex - 1;
      }
      setHistoryIndex(nextIndex);
      setInputQuery(promptHistory[nextIndex]);
      setTimeout(() => {
        if (inputRef.current) {
          const len = inputRef.current.value.length;
          inputRef.current.setSelectionRange(len, len);
        }
      }, 0);
    } else if (e.key === "ArrowDown") {
      if (historyIndex === -1) return;
      e.preventDefault();
      if (historyIndex < promptHistory.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setInputQuery(promptHistory[nextIndex]);
        setTimeout(() => {
          if (inputRef.current) {
            const len = inputRef.current.value.length;
            inputRef.current.setSelectionRange(len, len);
          }
        }, 0);
      } else {
        setHistoryIndex(-1);
        setInputQuery(draftQueryRef.current);
        setTimeout(() => {
          if (inputRef.current) {
            const len = inputRef.current.value.length;
            inputRef.current.setSelectionRange(len, len);
          }
        }, 0);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIntelligenceOpen(false);
    }
  };

  if (!isPanelOpen) return null;

  return (
    <aside
      className="w-80 sm:w-96 lg:w-[400px] flex flex-col border-l border-subtle bg-surface shadow-xl z-30 lg:z-10 shrink-0 h-full overflow-hidden transition-all duration-200 animate-in slide-in-from-right-5"
      role="region"
      aria-label="Inventra Intelligence Panel"
      data-testid="test-intelligence-panel"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-subtle bg-surface-muted/60 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent-subtle text-accent shadow-2xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-semibold text-primary">Inventra Intelligence</h2>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary-subtle text-primary font-mono border border-primary-border">
                NLP v1
              </span>
            </div>
            <p className="text-[11px] text-muted">Deterministic Contextual Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="p-1 text-muted hover:text-primary rounded-md hover:bg-surface-elevated transition-colors cursor-pointer"
              title="Clear session history"
              aria-label="Clear session history"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIntelligenceOpen(false)}
            className="p-1 text-muted hover:text-primary rounded-md hover:bg-surface-elevated transition-colors cursor-pointer"
            aria-label="Close intelligence modal"
            title="Close intelligence panel"
            data-testid="test-intelligence-close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Safe Context Bar */}
      <div
        className="px-4 py-2 bg-surface-muted/40 border-b border-subtle flex items-center justify-between text-[11px] select-none shrink-0"
        data-testid="test-intelligence-context"
      >
        <div className="flex items-center gap-1.5 text-secondary truncate">
          <span className="text-muted font-medium">Context:</span>
          <span className="font-semibold text-primary">{currentModuleName}</span>
          {storeName && (
            <>
              <span className="text-muted">·</span>
              <span className="truncate max-w-[150px] text-secondary font-medium">{storeName}</span>
            </>
          )}
        </div>
      </div>

      {/* Conversation Feed / Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-surface">
        {/* Welcome State when empty */}
        {messages.length === 0 && (
          <div className="py-6 flex flex-col items-center text-center space-y-3">
            <div className="p-3 rounded-full bg-accent-subtle text-accent shadow-xs">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-primary">What can I help with?</h3>
              <p className="text-[11px] text-secondary mt-1 max-w-[260px]">
                Ask me in plain language to find products, look up customers, or navigate across modules.
              </p>
            </div>

            <div className="w-full pt-2">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-2 text-left">
                Suggestions for {currentModuleName}
              </span>
              <div className="space-y-1.5">
                {contextSuggestions.map((sugg) => (
                  <button
                    key={sugg}
                    type="button"
                    onClick={() => handleSend(sugg)}
                    className="w-full text-left px-2.5 py-1.5 rounded-md bg-surface-muted hover:bg-surface-elevated text-xs text-secondary hover:text-primary border border-subtle flex items-center justify-between transition-colors group cursor-pointer"
                  >
                    <span className="truncate">• {sugg}</span>
                    <ChevronRight className="h-3 w-3 text-muted group-hover:text-primary shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message History */}
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-2">
            {msg.sender === "user" ? (
              // User Prompt Bubble
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-lg px-3 py-2 bg-primary text-white text-xs shadow-xs font-sans">
                  {msg.text}
                </div>
              </div>
            ) : (
              // Inventra Response
              <div className="space-y-2.5 text-xs">
                {msg.error ? (
                  <div className="p-2.5 rounded-md bg-danger-subtle border border-danger text-danger flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs">Error</p>
                      <p className="text-[11px]">{msg.error}</p>
                    </div>
                  </div>
                ) : msg.result ? (
                  <div
                    className="p-3 rounded-lg border border-subtle bg-surface-muted/50 space-y-2.5"
                    data-testid="test-intelligence-card"
                  >
                    {/* Status Header */}
                    <div className="flex items-center justify-between border-b border-subtle pb-2">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="font-semibold text-primary text-xs">Inventra understood</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface text-secondary border border-subtle"
                          data-testid="test-intent-name"
                        >
                          {msg.result.intent}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary-subtle text-primary border border-primary-border"
                          data-testid="test-confidence-value"
                        >
                          {Math.round(msg.result.confidence * 100)}% Match
                        </span>
                      </div>
                    </div>

                    {/* Explanation */}
                    {msg.result.explanation && (
                      <p className="text-[11px] text-muted italic">
                        {msg.result.explanation}
                      </p>
                    )}

                    {/* Extracted Entities */}
                    {msg.result.entities && Object.keys(msg.result.entities).length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1" data-testid="test-entities-list">
                        {Object.entries(msg.result.entities).map(([key, val]) => {
                          if (key === "conditions" && Array.isArray(val)) {
                            return (
                              <span
                                key={key}
                                className="px-1.5 py-0.5 rounded bg-surface border border-subtle text-[10px] text-secondary font-mono flex items-center gap-1"
                              >
                                conditions:{" "}
                                <span className="flex flex-wrap gap-1">
                                  {val.map((cond: ProductQueryCondition, idx: number) => (
                                    <strong key={idx} className="text-primary font-semibold">
                                      {formatProductCondition(cond)}
                                      {idx < val.length - 1 ? "," : ""}
                                    </strong>
                                  ))}
                                </span>
                              </span>
                            );
                          }
                          return (
                            <span
                              key={key}
                              className="px-1.5 py-0.5 rounded bg-surface border border-subtle text-[10px] text-secondary font-mono"
                            >
                              {key}: <strong className="text-primary font-semibold">{String(val)}</strong>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* 1. PRODUCT SEARCH RESULTS */}
                    {msg.result.intent === "SEARCH_PRODUCT" && msg.productSearch && (
                      <div className="space-y-2 pt-1" data-testid="test-product-search-block">
                        {/* 1A. LOADING STATE */}
                        {msg.productSearch.status === "loading" && (
                          <div className="space-y-2 py-1" data-testid="test-product-search-loading">
                            <div className="flex items-center gap-2 text-muted">
                              <Sparkles className="h-4 w-4 text-accent animate-pulse" />
                              <span className="text-[11px] animate-pulse">
                                {msg.productSearch.conditions && msg.productSearch.conditions.length > 0
                                  ? msg.productSearch.query
                                    ? `✦ Searching products matching "${msg.productSearch.query}" with filters...`
                                    : "✦ Searching products matching filters..."
                                  : `✦ Searching products matching "${msg.productSearch.query}"...`}
                              </span>
                            </div>

                            {/* Show condition chips immediately during loading if conditions exist */}
                            {msg.productSearch.conditions && msg.productSearch.conditions.length > 0 && (
                              <div className="flex flex-wrap gap-1 pb-1 opacity-70" data-testid="test-condition-chips">
                                {msg.productSearch.conditions.map((cond, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent font-medium text-[10px] flex items-center gap-1"
                                    data-testid="test-condition-chip"
                                  >
                                    <span>{formatProductCondition(cond)}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 1B. EMPTY RESULTS STATE */}
                        {msg.productSearch.status === "empty" && (
                          <div
                            className="p-3 rounded-lg bg-surface border border-subtle text-[11px] text-secondary space-y-2"
                            data-testid="test-product-search-empty"
                          >
                            <div className="flex items-center gap-1.5">
                              <Package className="h-4 w-4 text-muted shrink-0" />
                              <span className="font-semibold text-primary block">✦ No products found</span>
                            </div>
                            <p className="text-muted">
                              {msg.productSearch.conditions && msg.productSearch.conditions.length > 0
                                ? msg.productSearch.query
                                  ? `No products matched "${msg.productSearch.query}" with these filters.`
                                  : "No products matched these filters."
                                : `I couldn't find a product matching "${msg.productSearch.query}". Try another search.`}
                            </p>

                            {/* Condition chips in empty state */}
                            {msg.productSearch.conditions && msg.productSearch.conditions.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1" data-testid="test-condition-chips">
                                {msg.productSearch.conditions.map((cond, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent font-medium text-[10px] flex items-center gap-1"
                                    data-testid="test-condition-chip"
                                  >
                                    <span>{formatProductCondition(cond)}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 1C. ERROR STATE WITH RETRY */}
                        {msg.productSearch.status === "error" && (
                          <div
                            className="p-3 rounded-lg bg-danger-subtle border border-danger/40 text-danger text-[11px] space-y-2"
                            data-testid="test-product-search-error"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-semibold">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>Unable to search products right now</span>
                                <span className="sr-only">Product Search Failed</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRetryProductSearch(msg.id)}
                                className="px-2 py-0.5 rounded bg-surface border border-danger/30 text-danger hover:bg-danger hover:text-white text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                                data-testid="test-product-search-retry-btn"
                                title="Retry product search"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Retry</span>
                              </button>
                            </div>
                            <p className="text-danger/90">{msg.productSearch.error || "Failed to query product catalog"}</p>
                            {msg.productSearch.conditions && msg.productSearch.conditions.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-0.5" data-testid="test-condition-chips">
                                {msg.productSearch.conditions.map((cond, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded-full bg-danger/10 border border-danger/20 text-danger font-medium text-[10px]"
                                    data-testid="test-condition-chip"
                                  >
                                    {formatProductCondition(cond)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 1D. SUCCESS RESULTS STATE */}
                        {msg.productSearch.status === "success" && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-secondary font-medium">
                              <span>
                                ✦ Found {msg.productSearch.products.length} product{msg.productSearch.products.length !== 1 ? "s" : ""}
                              </span>
                              {msg.productSearch.query ? (
                                <span className="font-mono text-[10px] text-muted truncate max-w-[150px]">
                                  query: "{msg.productSearch.query}"
                                </span>
                              ) : msg.productSearch.conditions && msg.productSearch.conditions.length > 0 ? (
                                <span className="font-mono text-[10px] text-muted">structured filter</span>
                              ) : null}
                            </div>

                            {/* Prominent Condition Chips for Structured Search */}
                            {msg.productSearch.conditions && msg.productSearch.conditions.length > 0 && (
                              <div className="flex flex-wrap gap-1 pb-1" data-testid="test-condition-chips">
                                {msg.productSearch.conditions.map((cond, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent font-medium text-[10px] flex items-center gap-1"
                                    data-testid="test-condition-chip"
                                  >
                                    <span>{formatProductCondition(cond)}</span>
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="space-y-2">
                              {msg.productSearch.products.map((prod) => (
                                <div
                                  key={prod.id}
                                  tabIndex={prod.inventoryItemId ? 0 : undefined}
                                  role={prod.inventoryItemId ? "button" : undefined}
                                  aria-label={prod.inventoryItemId ? `View ${prod.name} in store inventory` : undefined}
                                  onClick={() => {
                                    if (prod.inventoryItemId) {
                                      navigate(`/inventory/${prod.inventoryItemId}`);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (prod.inventoryItemId && (e.key === "Enter" || e.key === " ")) {
                                      e.preventDefault();
                                      navigate(`/inventory/${prod.inventoryItemId}`);
                                    }
                                  }}
                                  className={`p-2.5 rounded-lg border border-subtle bg-surface flex items-center justify-between gap-2.5 transition-colors ${
                                    prod.inventoryItemId
                                      ? "hover:border-focus cursor-pointer focus-visible:ring-1 focus-visible:ring-accent focus:outline-none"
                                      : "opacity-85"
                                  }`}
                                  data-testid="test-product-result-item"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <Package className="h-3.5 w-3.5 text-primary shrink-0" />
                                      <span className="font-semibold text-primary text-xs truncate">
                                        {prod.name}
                                      </span>
                                      {prod.prescriptionRequired && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-danger/10 text-danger border border-danger/20 shrink-0">
                                          Rx
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-muted truncate mt-0.5">
                                      {[
                                        formatDosageForm(prod.dosageForm),
                                        prod.strength,
                                        prod.genericName,
                                        prod.brandName,
                                        prod.manufacturer,
                                      ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </div>
                                    <div className="text-[10px] font-mono text-secondary mt-0.5 flex items-center gap-2">
                                      <span>
                                        Unit: {prod.baseUnit}
                                        {prod.sellingUnit && prod.sellingUnit !== prod.baseUnit && ` (${prod.sellingUnit})`}
                                      </span>
                                      {prod.currentStock != null && (
                                        <span className="text-primary font-semibold">
                                          · Stock: {prod.currentStock}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {prod.inventoryItemId ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/inventory/${prod.inventoryItemId}`);
                                      }}
                                      className="px-2.5 py-1 rounded bg-surface-muted hover:bg-primary hover:text-white border border-subtle text-secondary text-[11px] font-medium transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                                      data-testid="test-product-view-btn"
                                      title="View Product in Store Inventory"
                                    >
                                      <span>View Product</span>
                                      <ExternalLink className="h-3 w-3" />
                                    </button>
                                  ) : (
                                    <span
                                      className="px-2 py-1 rounded bg-surface-muted/60 border border-subtle/60 text-muted text-[10px] shrink-0 font-mono"
                                      data-testid="test-product-unstocked-badge"
                                      title="Product has no inventory record in active store"
                                    >
                                      Not in Store
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. CUSTOMER SEARCH RESULTS */}
                    {msg.result.intent === "SEARCH_CUSTOMER" && msg.customerSearch && (
                      <div className="space-y-2 pt-1">
                        {msg.customerSearch.status === "loading" && (
                          <div className="flex items-center gap-2 text-muted py-2">
                            <Sparkles className="h-4 w-4 text-accent animate-pulse" />
                            <span className="text-[11px] animate-pulse">
                              ✦ Searching customers matching "{msg.customerSearch.query}"...
                            </span>
                          </div>
                        )}

                        {msg.customerSearch.status === "empty" && (
                          <div className="p-2.5 rounded bg-surface border border-subtle text-[11px] text-secondary space-y-1">
                            <span className="font-semibold text-primary block">✦ No customers found</span>
                            <p>
                              I couldn't find a customer matching "{msg.customerSearch.query}". Try another search.
                            </p>
                          </div>
                        )}

                        {msg.customerSearch.status === "error" && (
                          <div className="p-2.5 rounded bg-danger-subtle border border-danger text-danger text-[11px]">
                            <span className="font-semibold block">Customer Search Failed</span>
                            <span>{msg.customerSearch.error}</span>
                          </div>
                        )}

                        {msg.customerSearch.status === "success" && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-secondary font-medium">
                              <span>✦ Found {msg.customerSearch.customers.length} customer{msg.customerSearch.customers.length !== 1 ? "s" : ""}</span>
                              <span className="font-mono text-[10px] text-muted">query: "{msg.customerSearch.query}"</span>
                            </div>

                            <div className="space-y-2">
                              {msg.customerSearch.customers.map((cust) => (
                                <div
                                  key={cust.id}
                                  className="p-2.5 rounded-lg border border-subtle bg-surface hover:border-focus flex items-center justify-between gap-2.5 transition-colors"
                                  data-testid="test-customer-result-item"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <User className="h-3.5 w-3.5 text-primary shrink-0" />
                                      <span className="font-semibold text-primary text-xs truncate">
                                        {cust.fullName}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-muted truncate mt-0.5">
                                      Phone: {maskPhone(cust.phone)}
                                      {cust.email && ` · ${cust.email}`}
                                    </div>
                                    <div className="text-[10px] font-mono text-secondary mt-0.5">
                                      Code: {cust.customerCode} · {cust.status}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigate(`/customers/${cust.id}`);
                                    }}
                                    className="px-2.5 py-1 rounded bg-surface-muted hover:bg-primary hover:text-white border border-subtle text-secondary text-[11px] font-medium transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                                    data-testid="test-customer-view-btn"
                                  >
                                    <span>View</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. LOW STOCK RESULTS */}
                    {msg.result.intent === "LOW_STOCK" && msg.lowStock && (
                      <div className="space-y-2 pt-1" data-testid="test-lowstock-section">
                        {msg.lowStock.status === "loading" && (
                          <div className="flex items-center gap-2 text-muted py-2">
                            <Sparkles className="h-4 w-4 text-accent animate-pulse" />
                            <span className="text-[11px] animate-pulse">
                              ✦ Checking store inventory for low-stock items...
                            </span>
                          </div>
                        )}

                        {msg.lowStock.status === "empty" && (
                          <div
                            className="p-2.5 rounded bg-surface border border-subtle text-[11px] text-secondary space-y-1"
                            data-testid="test-lowstock-empty"
                          >
                            <div className="flex items-center gap-1.5 text-success font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Inventory Healthy</span>
                            </div>
                            <p>
                              No products are currently low on stock
                              {msg.lowStock.storeName ? ` in ${msg.lowStock.storeName}` : ""}. All items are above their reorder thresholds.
                            </p>
                          </div>
                        )}

                        {msg.lowStock.status === "error" && (
                          <div
                            className="p-2.5 rounded bg-danger-subtle border border-danger text-danger text-[11px]"
                            data-testid="test-lowstock-error"
                          >
                            <span className="font-semibold block">Inventory Check Failed</span>
                            <span>{msg.lowStock.error}</span>
                          </div>
                        )}

                        {msg.lowStock.status === "success" && (
                          <div className="space-y-2.5" data-testid="test-lowstock-results">
                            <div className="flex items-center justify-between text-[11px] font-medium border-b border-subtle pb-1.5">
                              <div className="flex items-center gap-1.5 text-warning font-semibold">
                                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                                <span>
                                  {msg.lowStock.total} product{msg.lowStock.total !== 1 ? "s" : ""} need attention
                                </span>
                              </div>
                              {msg.lowStock.storeName && (
                                <span className="text-[10px] text-muted font-mono truncate max-w-[120px]">
                                  {msg.lowStock.storeName}
                                </span>
                              )}
                            </div>

                            <div className="space-y-2">
                              {msg.lowStock.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="p-2.5 rounded-lg border border-subtle bg-surface hover:border-warning/50 transition-colors space-y-2"
                                  data-testid="test-lowstock-item"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <span className="font-semibold text-primary text-xs truncate block">
                                        {item.productName}
                                      </span>
                                      {item.genericName && (
                                        <span className="text-[10px] text-muted truncate block">
                                          {item.genericName}
                                        </span>
                                      )}
                                      {item.sku && (
                                        <span className="text-[10px] font-mono text-muted block mt-0.5">
                                          SKU: {item.sku}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigate(`/catalog/products/${item.productId}`);
                                      }}
                                      className="px-2.5 py-1 rounded bg-surface-muted hover:bg-primary hover:text-white border border-subtle text-secondary text-[11px] font-medium transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                                      data-testid="test-view-product-btn"
                                      title="View Product in Catalog"
                                    >
                                      <span>View</span>
                                      <ExternalLink className="h-3 w-3" />
                                    </button>
                                  </div>

                                  <div className="flex items-center justify-between text-[11px] bg-surface-muted/60 px-2 py-1 rounded border border-subtle/50 font-mono">
                                    <div className="flex items-center gap-1 text-danger font-semibold">
                                      <span>Stock:</span>
                                      <span data-testid="test-current-stock">{item.currentStock}</span>
                                      <span className="text-[10px] text-muted font-normal">
                                        {item.baseUnit || "units"}
                                      </span>
                                    </div>
                                    <div className="text-secondary text-[10px]">
                                      <span>Minimum: </span>
                                      <strong className="text-primary font-semibold" data-testid="test-min-stock">
                                        {item.reorderLevel}
                                      </strong>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {msg.lowStock.hasMore && (
                              <div className="pt-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigate("/inventory?tab=low-stock");
                                  }}
                                  className="w-full py-1.5 px-2 rounded-md bg-surface-muted hover:bg-surface-elevated text-primary text-xs font-medium border border-subtle hover:border-focus transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                  data-testid="test-view-all-low-stock"
                                >
                                  <span>View all {msg.lowStock.total} low-stock items</span>
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* EXPIRING BATCHES RESULTS */}
                    {msg.result.intent === "EXPIRING_BATCHES" && msg.expiringBatches && (
                      <div className="space-y-2 pt-1" data-testid="test-expiring-batches-section">
                        {msg.expiringBatches.status === "loading" && (
                          <div className="flex items-center gap-2 text-muted py-2">
                            <Sparkles className="h-4 w-4 text-accent animate-pulse" />
                            <span className="text-[11px] animate-pulse">
                              ✦ Checking store inventory for batches expiring within 60 days...
                            </span>
                          </div>
                        )}

                        {msg.expiringBatches.status === "empty" && (
                          <div
                            className="p-2.5 rounded bg-surface border border-subtle text-[11px] text-secondary space-y-1"
                            data-testid="test-expiring-batches-empty"
                          >
                            <div className="flex items-center gap-1.5 text-success font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>No Expiring Batches</span>
                            </div>
                            <p>
                              No active batches are expiring within the next 60 days
                              {msg.expiringBatches.storeName ? ` in ${msg.expiringBatches.storeName}` : ""}.
                            </p>
                          </div>
                        )}

                        {msg.expiringBatches.status === "error" && (
                          <div
                            className="p-2.5 rounded bg-danger-subtle border border-danger text-danger text-[11px]"
                            data-testid="test-expiring-batches-error"
                          >
                            <span className="font-semibold block">Expiring Batches Check Failed</span>
                            <span>{msg.expiringBatches.error}</span>
                          </div>
                        )}

                        {msg.expiringBatches.status === "success" && (
                          <div className="space-y-2.5" data-testid="test-expiring-batches-results">
                            <div className="flex items-center justify-between text-[11px] font-medium border-b border-subtle pb-1.5">
                              <div className="flex items-center gap-1.5 text-warning font-semibold">
                                <Clock className="h-3.5 w-3.5 text-warning" />
                                <span>
                                  {msg.expiringBatches.total} batch{msg.expiringBatches.total !== 1 ? "es" : ""} needing attention
                                </span>
                              </div>
                              {msg.expiringBatches.storeName && (
                                <span className="text-[10px] text-muted font-mono truncate max-w-[120px]">
                                  {msg.expiringBatches.storeName}
                                </span>
                              )}
                            </div>

                            <div className="space-y-2">
                              {msg.expiringBatches.items.map((batch) => (
                                <div
                                  key={batch.id}
                                  className="p-2.5 rounded-lg border border-subtle bg-surface hover:border-warning/50 transition-colors space-y-2"
                                  data-testid="test-expiring-batch-item"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-bold text-xs text-primary" data-testid="test-batch-number">
                                          {batch.batchNumber}
                                        </span>
                                      </div>
                                      <span className="font-semibold text-primary text-xs truncate block mt-0.5" data-testid="test-product-name">
                                        {batch.productName}
                                      </span>
                                      {batch.genericName && (
                                        <span className="text-[10px] text-muted truncate block">
                                          {batch.genericName}
                                        </span>
                                      )}
                                      {batch.sku && (
                                        <span className="text-[10px] font-mono text-muted block mt-0.5">
                                          SKU: {batch.sku}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex flex-col gap-1 items-end shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigate(`/inventory/batches?filter=expiring&search=${encodeURIComponent(batch.batchNumber)}`);
                                        }}
                                        className="px-2 py-0.5 rounded bg-surface-muted hover:bg-primary hover:text-white border border-subtle text-secondary text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                                        data-testid="test-view-batch-btn"
                                        title="View Batch in Batches Explorer"
                                      >
                                        <span>View Batch</span>
                                        <ExternalLink className="h-2.5 w-2.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigate(`/catalog/products/${batch.productId}`);
                                        }}
                                        className="px-2 py-0.5 rounded bg-surface-muted hover:bg-primary hover:text-white border border-subtle text-secondary text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                                        data-testid="test-view-product-btn"
                                        title="View Product in Catalog"
                                      >
                                        <span>View Product</span>
                                        <ExternalLink className="h-2.5 w-2.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between text-[11px] bg-surface-muted/60 px-2 py-1 rounded border border-subtle/50 font-mono">
                                    <div className="flex items-center gap-1 text-danger font-semibold">
                                      <span>Expires:</span>
                                      <span data-testid="test-expiry-date">{formatExpiryDate(batch.expiryDate)}</span>
                                    </div>
                                    <div className="text-secondary text-[10px]">
                                      <span>Stock: </span>
                                      <strong className="text-primary font-semibold" data-testid="test-batch-stock">
                                        {batch.quantity} {batch.baseUnit}
                                      </strong>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {msg.expiringBatches.hasMore && (
                              <div className="pt-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigate("/inventory/batches?filter=expiring");
                                  }}
                                  className="w-full py-1.5 px-2 rounded-md bg-surface-muted hover:bg-surface-elevated text-primary text-xs font-medium border border-subtle hover:border-focus transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                  data-testid="test-view-all-expiring-batches"
                                >
                                  <span>View all {msg.expiringBatches.total} expiring batches</span>
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 4. NAVIGATE ACTION RESOLUTION */}
                    {msg.result.intent === "NAVIGATE" &&
                      (() => {
                        const rawDest = msg.result.entities?.destination as string | undefined;
                        const navResolution = resolveNavigationAction(rawDest, userRole);

                        if (navResolution.isSupported && navResolution.isAllowed) {
                          return (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (navResolution.route) {
                                    setIntelligenceOpen(false);
                                    navigate(navResolution.route);
                                  }
                                }}
                                className="w-full px-3 py-2 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary-hover flex items-center justify-between gap-2 shadow-xs transition-colors cursor-pointer"
                                data-testid="test-navigation-action-btn"
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <Compass className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">Open {navResolution.label}</span>
                                </div>
                                <span className="text-[10px] font-mono opacity-80 shrink-0">
                                  {navResolution.route}
                                </span>
                              </button>
                            </div>
                          );
                        }

                        if (navResolution.isSupported && !navResolution.isAllowed) {
                          return (
                            <div
                              className="p-2 rounded bg-danger-subtle border border-danger flex items-start gap-1.5 text-xs text-danger"
                              data-testid="test-navigation-restricted"
                            >
                              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <div className="text-[11px]">
                                <span className="font-semibold block">Access Restricted</span>
                                <span>{navResolution.reason}</span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            className="p-2 rounded bg-surface border border-subtle flex items-start gap-1.5 text-[11px] text-secondary"
                            data-testid="test-navigation-unsupported"
                          >
                            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted" />
                            <span>{navResolution.reason}</span>
                          </div>
                        );
                      })()}

                    {/* 5. UNKNOWN INTENT WITH SUGGESTIONS */}
                    {msg.result.intent === "UNKNOWN" && (
                      <div className="p-2.5 rounded bg-surface border border-subtle text-[11px] text-secondary space-y-2">
                        <div className="flex items-center gap-1.5 text-warning font-semibold">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>Request Ambiguous / Unrecognized</span>
                        </div>
                        <p className="text-muted">
                          <span>I couldn't confidently understand that request.</span>
                          {msg.result.explanation && <span> {msg.result.explanation}</span>}
                        </p>
                        {msg.result.suggestions && msg.result.suggestions.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-subtle">
                            <span className="text-[10px] font-medium text-muted block">Try instead:</span>
                            {msg.result.suggestions.map((sugg, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSend(sugg)}
                                className="w-full text-left px-2 py-1 rounded bg-surface-muted hover:bg-surface-elevated text-[11px] text-secondary hover:text-primary transition-colors block truncate cursor-pointer"
                              >
                                • {sugg}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 6. INTERPRETATION-ONLY INTENTS (SALES_SUMMARY, HELP) */}
                    {msg.result.intent !== "SEARCH_PRODUCT" &&
                      msg.result.intent !== "SEARCH_CUSTOMER" &&
                      msg.result.intent !== "LOW_STOCK" &&
                      msg.result.intent !== "EXPIRING_BATCHES" &&
                      msg.result.intent !== "NAVIGATE" &&
                      msg.result.intent !== "UNKNOWN" && (
                        <div className="p-2.5 rounded bg-warning-subtle border border-warning-border flex items-start gap-1.5 text-[11px] text-warning">
                          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block">Interpretation mode only</span>
                            <span>
                              This request is understood ({msg.result.intent}), but business action execution is not connected in this phase.
                            </span>
                          </div>
                        </div>
                      )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator during interpretation */}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted py-2">
            <Sparkles className="h-4 w-4 text-accent animate-pulse" />
            <span className="animate-pulse text-[11px]">Interpreting with local engine...</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Form at Bottom */}
      <div className="p-3.5 border-t border-subtle bg-surface-muted/40 shrink-0 space-y-2">
        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5" data-testid="test-quick-suggestions">
          {contextSuggestions.slice(0, 3).map((sugg) => (
            <button
              key={sugg}
              type="button"
              onClick={() => handleSend(sugg)}
              className="px-2 py-0.5 rounded-full bg-surface border border-subtle hover:border-focus text-[10px] text-secondary hover:text-primary whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {sugg}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputQuery}
            onChange={(e) => {
              setInputQuery(e.target.value);
              if (historyIndex !== -1) {
                setHistoryIndex(-1);
              }
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Ask Inventra in natural language... (e.g. 'find paracetamol')"
            aria-label="Ask Inventra in natural language"
            className="w-full pl-3 pr-20 py-2 bg-surface text-primary text-xs rounded-lg border border-subtle focus:border-focus focus:outline-none focus:ring-1 focus:ring-focus transition-all"
            data-testid="test-intelligence-input"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="absolute right-1 px-2.5 py-1 bg-primary text-white text-[11px] font-medium rounded-md hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all cursor-pointer"
            data-testid="test-intelligence-submit"
          >
            <span>Ask</span>
            <Send className="h-2.5 w-2.5" />
          </button>
        </form>

        <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted">
          <span>Enter ↵ to send • ↑/↓ for history</span>
          <ShortcutHint shortcut="Ctrl+J" compact />
        </div>
      </div>
    </aside>
  );
};

export const IntelligencePanel: React.FC = () => {
  const inRouter = useInRouterContext();
  if (!inRouter) {
    return (
      <MemoryRouter>
        <IntelligencePanelContent />
      </MemoryRouter>
    );
  }
  return <IntelligencePanelContent />;
};

export default IntelligencePanel;
