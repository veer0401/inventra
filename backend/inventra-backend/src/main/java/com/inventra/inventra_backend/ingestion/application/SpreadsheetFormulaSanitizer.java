package com.inventra.inventra_backend.ingestion.application;

import java.util.regex.Pattern;

public final class SpreadsheetFormulaSanitizer {

    // Matches leading =, @, or leading +/- followed by a non-digit character (excluding decimal points and commas)
    private static final Pattern FORMULA_PREFIX_PATTERN = Pattern.compile("^([=@]|[-+](?![0-9.,]))");

    private SpreadsheetFormulaSanitizer() {
        // Utility class
    }

    /**
     * Sanitizes a textual field to prevent spreadsheet formula injection in Excel/Calc/Sheets.
     * Legitimate negative numbers (e.g., "-12.50", "-5") remain unaffected.
     * Dangerous formula strings (e.g., "=SUM(A1:A10)", "@HYPERLINK", "-CMD()") are prefixed with a single quote.
     */
    public static String sanitize(String input) {
        if (input == null || input.isEmpty()) {
            return input;
        }

        String trimmed = input.trim();
        if (FORMULA_PREFIX_PATTERN.matcher(trimmed).find()) {
            return "'" + input;
        }
        return input;
    }

    /**
     * Checks if a raw string starts with a formula trigger.
     */
    public static boolean isFormulaInjectionRisk(String input) {
        if (input == null || input.isEmpty()) {
            return false;
        }
        return FORMULA_PREFIX_PATTERN.matcher(input.trim()).find();
    }
}
