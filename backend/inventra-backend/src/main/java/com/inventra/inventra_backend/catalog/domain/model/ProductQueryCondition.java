package com.inventra.inventra_backend.catalog.domain.model;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import java.math.BigDecimal;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

/**
 * Validated condition within a structured product query.
 */
public record ProductQueryCondition(
    ProductQueryField field,
    QueryOperator operator,
    String value,
    String secondaryValue,
    String unit
) {
    private static final Set<String> SUPPORTED_STRENGTH_UNITS = Set.of(
        "mg", "ml", "mcg", "g", "%"
    );

    public ProductQueryCondition {
        Objects.requireNonNull(field, "field must not be null");
        Objects.requireNonNull(operator, "operator must not be null");
        if (value == null || value.trim().isEmpty()) {
            throw new BusinessRuleViolationException(
                "INVALID_QUERY_CONDITION",
                "Condition value must not be blank for field: " + field
            );
        }
        value = value.trim();
        if (secondaryValue != null) {
            secondaryValue = secondaryValue.trim();
            if (secondaryValue.isEmpty()) {
                secondaryValue = null;
            }
        }
        if (unit != null) {
            unit = unit.trim().toLowerCase(Locale.ROOT);
            if (unit.isEmpty()) {
                unit = null;
            }
        }

        validateCondition(field, operator, value, secondaryValue, unit);
    }

    public void validate() {
        validateCondition(field, operator, value, secondaryValue, unit);
    }

    private static void validateCondition(
        ProductQueryField field,
        QueryOperator operator,
        String value,
        String secondaryValue,
        String unit
    ) {
        switch (field) {
            case NAME, GENERIC_NAME, BRAND, SKU -> {
                if (operator != QueryOperator.EQUALS &&
                    operator != QueryOperator.CONTAINS &&
                    operator != QueryOperator.STARTS_WITH &&
                    operator != QueryOperator.ENDS_WITH) {
                    throw new BusinessRuleViolationException(
                        "INVALID_OPERATOR",
                        "Field " + field + " only supports text operators (EQUALS, CONTAINS, STARTS_WITH, ENDS_WITH)"
                    );
                }
            }
            case DOSAGE_FORM -> {
                if (operator != QueryOperator.EQUALS) {
                    throw new BusinessRuleViolationException(
                        "INVALID_OPERATOR",
                        "Field DOSAGE_FORM only supports EQUALS operator"
                    );
                }
                try {
                    DosageForm.valueOf(value.toUpperCase(Locale.ROOT));
                } catch (IllegalArgumentException ex) {
                    throw new BusinessRuleViolationException(
                        "INVALID_DOSAGE_FORM",
                        "Invalid dosage form: '" + value + "'. Supported values: TABLET, CAPSULE, SYRUP, INJECTION, OINTMENT, DROPS, POWDER, DEVICE, GENERAL"
                    );
                }
            }
            case PRICE, STOCK, REORDER_LEVEL -> {
                validateNumericOperatorAndValues(field, operator, value, secondaryValue);
            }
            case STRENGTH -> {
                validateNumericOperatorAndValues(field, operator, value, secondaryValue);
                if (unit != null && !SUPPORTED_STRENGTH_UNITS.contains(unit)) {
                    throw new BusinessRuleViolationException(
                        "INVALID_STRENGTH_UNIT",
                        "Unsupported strength unit: '" + unit + "'. Supported units: mg, ml, mcg, g, %"
                    );
                }
            }
        }
    }

    private static void validateNumericOperatorAndValues(
        ProductQueryField field,
        QueryOperator operator,
        String value,
        String secondaryValue
    ) {
        if (operator != QueryOperator.EQUALS &&
            operator != QueryOperator.GREATER_THAN &&
            operator != QueryOperator.GREATER_THAN_OR_EQUAL &&
            operator != QueryOperator.LESS_THAN &&
            operator != QueryOperator.LESS_THAN_OR_EQUAL &&
            operator != QueryOperator.BETWEEN) {
            throw new BusinessRuleViolationException(
                "INVALID_OPERATOR",
                "Field " + field + " only supports numeric operators"
            );
        }

        BigDecimal lower = parseNumeric(value, field.name());

        if (operator == QueryOperator.BETWEEN) {
            if (secondaryValue == null || secondaryValue.isBlank()) {
                throw new BusinessRuleViolationException(
                    "INVALID_BETWEEN_RANGE",
                    "BETWEEN operator requires secondaryValue"
                );
            }
            BigDecimal upper = parseNumeric(secondaryValue, field.name() + " (upper bound)");
            if (lower.compareTo(upper) > 0) {
                throw new BusinessRuleViolationException(
                    "INVALID_BETWEEN_RANGE",
                    "Lower bound (" + lower + ") cannot be greater than upper bound (" + upper + ")"
                );
            }
        }
    }

    private static BigDecimal parseNumeric(String str, String fieldName) {
        try {
            return new BigDecimal(str);
        } catch (NumberFormatException ex) {
            throw new BusinessRuleViolationException(
                "INVALID_NUMERIC_VALUE",
                "Value '" + str + "' for field " + fieldName + " must be a valid numeric value"
            );
        }
    }
}
