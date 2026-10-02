# Inventra Intelligence — NLP Engine Foundation (v1)

## Overview

Inventra Intelligence provides a foundational, deterministic natural language understanding (NLP) engine for the Inventra Pharmacy ERP platform. 

It is designed to interpret natural language commands and return structured intent and entity data without external AI costs, external LLM dependencies, or autonomous agents.

> [!IMPORTANT]
> **Interpretation Only — No Execution**
> This foundational milestone implements **INTERPRETATION ONLY**. It parses and recognizes intents, but intentionally does **NOT** execute business actions or mutate database state (e.g. `"open inventory"` returns `NAVIGATE / INVENTORY`, without automatic navigation or business mutations). Execution and action resolvers will be introduced in subsequent phases.

---

## Architecture

```
User Input ("show low stock medicines")
              ↓
  Frontend IntelligenceModal (Ctrl+J or Command Palette)
              ↓ HTTP POST /api/v1/intelligence/interpret
  Spring Security (JWT Authentication & TenantContext)
              ↓
  IntelligenceController
              ↓
  IntelligenceService
              ↓
  DeterministicNlpEngine
       ├── Text Normalization (casing, punctuation, spacing)
       ├── DestinationRegistry (central destination/alias resolution)
       ├── Deterministic Rule & Phrase Matchers
       ├── Entity Extraction (itemType, query, destination, dateContext)
       └── Confidence Calculation & Threshold Scoring (>= 0.70)
              ↓
  Structured IntentResult (engineVersion: "1")
              ↓
  JSON Response to Frontend Modal
```

---

## API Specification

### Endpoint

- **Method:** `POST`
- **Path:** `/api/v1/intelligence/interpret`
- **Auth Required:** `Bearer <JWT_TOKEN>` (`@PreAuthorize("isAuthenticated()")`)
- **Content-Type:** `application/json`

### Request Body

```json
{
  "text": "show low stock medicines"
}
```

### Response Format (Success Envelope)

```json
{
  "success": true,
  "data": {
    "intent": "LOW_STOCK",
    "confidence": 0.98,
    "entities": {
      "itemType": "MEDICINE"
    },
    "originalText": "show low stock medicines",
    "normalizedText": "show low stock medicines",
    "explanation": "Matched low stock inventory rule",
    "suggestions": [],
    "engineVersion": "1"
  },
  "timestamp": "2026-09-19T17:24:22.123Z"
}
```

---

## Supported Foundational Intents (v1)

| Intent | Sample Prompts | Extracted Entities | Confidence Range |
|---|---|---|---|
| `NAVIGATE` | "open inventory", "go to customers", "show sales", "go to purchasing" | `destination` (resolved via `DestinationRegistry`) | 0.90 – 0.99 |
| `SEARCH_PRODUCT` | "find paracetamol", "search medicine amoxicillin", "look for paracetamol" | `query` (product term) | 0.95 – 0.98 |
| `SEARCH_CUSTOMER` | "search customer Rahul", "find customer Rahul", "show customer Rahul" | `query` (customer name) | 0.95 – 0.98 |
| `LOW_STOCK` | "show low stock", "show low stock medicines", "which medicines are running low" | `itemType` ("MEDICINE", "PRODUCT", "ITEM") | 0.95 – 0.98 |
| `EXPIRING_BATCHES` | "show expiring medicines", "what medicines are expiring", "show batches expiring soon" | `itemType` ("MEDICINE", "BATCH"), `timeframe` ("SOON") | 0.92 – 0.98 |
| `SALES_SUMMARY` | "show today's sales", "how much did we sell today", "today's sales" | `dateContext` ("TODAY") | 0.92 – 0.98 |
| `HELP` | "help", "what can i do", "commands", "how to use" | None | 0.99 |
| `UNKNOWN` | Unrecognized or ambiguous text ("asdfgh something", "find Rahul") | None (returns `suggestions`) | 0.10 – 0.40 |

---

## Disambiguation & Fallback Principles

1. **Central Destination Registry:** Navigation targets are not hard-coded in regex patterns. They are registered in `DestinationRegistry`, mapping destinations (`INVENTORY`, `CUSTOMERS`, `PURCHASING`, `SALES`, `CATALOG`, `BATCHES`, `DASHBOARD`, `SUPPLIERS`, `TRANSFERS`, `IMPORTS`, `DEVICES`, `SETTINGS`, `REPORTS`, `POS`) to extensible alias sets.
2. **Ambiguous Search Prevention:** Queries like `"find Rahul"` without an explicit `"customer"` or `"medicine"` keyword are intentionally treated as ambiguous. The engine does **not** guess based on product dictionaries; instead it returns `UNKNOWN` (< 0.70 confidence) with specific disambiguation suggestions (e.g. `"Search customer: 'search customer Rahul'"`).
3. **Genuine Help vs Unknown:** `HELP` is reserved exclusively for explicit help queries (`"help"`, `"what can i do"`). Unrecognized or low-confidence queries cleanly return `UNKNOWN`.
4. **Engine Versioning:** All responses include `engineVersion: "1"` to support backward-compatible evolution across revisions.

---

## Frontend Integration

- **Trigger:** Configured in `useShortcutStore` with default binding `Ctrl+J` (and available from the global Command Palette via `Ctrl+K` -> "Inventra Intelligence").
- **Modal Component:** `<IntelligenceModal />` mounted in `AppShell`.
- **API Service:** `packages/app/src/services/intelligenceApi.ts` using the shared `apiClient`.
- **Types:** Shared across monorepo in `@inventra/api-types/src/intelligence.ts`.

---

---

## Phase 2: Navigation Action Integration

Phase 2 connects the deterministic NLP engine's `NAVIGATE` intent to real frontend application routing via a shared, role-aware action resolver:

### Key Additions in Phase 2
1. **Executable `NAVIGATE` Intent:**
   - Interpreted `NAVIGATE` intents are resolved using `resolveNavigationAction(destination, userRole)`.
   - Authorized routes display an explicit action button: `[Open {label}]` (e.g., `"open inventory"` → `[Open Store Inventory]`).
   - Clicking the action navigates programmatically using React Router's `navigate(route)` and closes the Intelligence modal.
2. **Permission & Access Control Preservation:**
   - Role authorization is strictly enforced before offering navigation actions.
   - If the active user role lacks permission for a destination (e.g. `CASHIER` attempting `"open transfers"`), navigation is blocked and an `Access Restricted` alert is shown.
   - Unmapped or unknown destinations display an informative unsupported message without navigating.
3. **Other Intents Remain Non-Executing (Interpretation Only):**
   - Non-navigation intents (`SEARCH_PRODUCT`, `SEARCH_CUSTOMER`, `LOW_STOCK`, `EXPIRING_BATCHES`, `SALES_SUMMARY`, `HELP`, `UNKNOWN`) remain strictly interpretation-only.
   - A clear disclaimer is rendered: *"Interpretation mode only — business action execution is not connected in this phase."*
4. **Zero Database Mutations:**
   - No database queries, mutations, or side-effects are introduced in this phase.
5. **Universal Web & Desktop Support:**
   - Implemented in the shared `@inventra/app` layer, functioning identically across both Web and Desktop platforms.

---

## Current Scope Boundaries & Non-Goals

- ✅ **Phase 1 Complete:** Deterministic NLP engine foundation, intent recognition, entity extraction, confidence scoring, backend API, frontend modal.
- ✅ **Phase 2 Complete:** `NAVIGATE` intent connected to existing application routes with role-based access checks.
- ❌ **No Business Mutation:** No database inserts, updates, or deletions.
- ❌ **No Module Query Execution Yet:** No POS checkout, inventory queries, sales calculation, or customer lookups executed.
- ❌ **No External LLM/AI Cost:** 100% deterministic local rules with zero API fees.
- ❌ **No Autonomous Agents:** Execution remains under explicit, user-initiated action.

