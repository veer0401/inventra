package com.inventra.inventra_backend.catalog.domain.model;

/**
 * Supported product query fields for structured catalog filtering.
 * Only fields that actually exist in the domain model are supported.
 */
public enum ProductQueryField {
    NAME,
    GENERIC_NAME,
    BRAND,
    DOSAGE_FORM,
    STRENGTH,
    PRICE,
    STOCK,
    REORDER_LEVEL,
    SKU
}
