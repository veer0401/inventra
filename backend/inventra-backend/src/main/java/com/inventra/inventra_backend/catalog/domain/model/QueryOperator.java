package com.inventra.inventra_backend.catalog.domain.model;

/**
 * Supported comparison and text operators for structured queries.
 */
public enum QueryOperator {
    EQUALS,
    CONTAINS,
    STARTS_WITH,
    ENDS_WITH,
    GREATER_THAN,
    GREATER_THAN_OR_EQUAL,
    LESS_THAN,
    LESS_THAN_OR_EQUAL,
    BETWEEN
}
