package com.inventra.inventra_backend.ingestion.application;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SpreadsheetFormulaSanitizerTest {

    @Test
    @DisplayName("Should neutralize dangerous formula trigger prefixes in text")
    void shouldNeutralizeFormulaPrefixes() {
        assertEquals("'=SUM(A1:A10)", SpreadsheetFormulaSanitizer.sanitize("=SUM(A1:A10)"));
        assertEquals("'@HYPERLINK(\"http://evil.com\")", SpreadsheetFormulaSanitizer.sanitize("@HYPERLINK(\"http://evil.com\")"));
        assertEquals("'-CMD(\"calc\")", SpreadsheetFormulaSanitizer.sanitize("-CMD(\"calc\")"));
        assertEquals("'+EXEC(\"calc\")", SpreadsheetFormulaSanitizer.sanitize("+EXEC(\"calc\")"));
    }

    @Test
    @DisplayName("Should preserve legitimate negative numbers without prefixing quote")
    void shouldPreserveLegitimateNegativeNumbers() {
        assertEquals("-12.50", SpreadsheetFormulaSanitizer.sanitize("-12.50"));
        assertEquals("-5", SpreadsheetFormulaSanitizer.sanitize("-5"));
        assertEquals("-0.75", SpreadsheetFormulaSanitizer.sanitize("-0.75"));
        assertEquals("+100", SpreadsheetFormulaSanitizer.sanitize("+100"));
    }

    @Test
    @DisplayName("Should leave normal medicine and entity names unchanged")
    void shouldLeaveNormalTextUnchanged() {
        assertEquals("Dolo 650mg Tablet", SpreadsheetFormulaSanitizer.sanitize("Dolo 650mg Tablet"));
        assertEquals("Augmentin 625 Duo", SpreadsheetFormulaSanitizer.sanitize("Augmentin 625 Duo"));
        assertEquals("Benadryl Cough Syrup (100ml)", SpreadsheetFormulaSanitizer.sanitize("Benadryl Cough Syrup (100ml)"));
        assertNull(SpreadsheetFormulaSanitizer.sanitize(null));
        assertEquals("", SpreadsheetFormulaSanitizer.sanitize(""));
    }
}
