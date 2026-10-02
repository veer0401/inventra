package com.inventra.inventra_backend.intelligence.domain.model;

/**
 * Foundational intent categories recognized by the deterministic Inventra Intelligence engine.
 */
public enum IntentType {
    NAVIGATE,
    SEARCH_PRODUCT,
    SEARCH_CUSTOMER,
    LOW_STOCK,
    EXPIRING_BATCHES,
    SALES_SUMMARY,
    HELP,
    UNKNOWN
}
