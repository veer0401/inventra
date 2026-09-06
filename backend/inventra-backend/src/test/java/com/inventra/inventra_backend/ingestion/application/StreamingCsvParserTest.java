package com.inventra.inventra_backend.ingestion.application;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class StreamingCsvParserTest {

    private StreamingCsvParser parser;

    @BeforeEach
    void setUp() {
        parser = new StreamingCsvParser();
    }

    @Test
    @DisplayName("Should parse standard comma-separated CSV successfully")
    void shouldParseCommaSeparatedCsv() {
        String csv = """
            Product Name,Generic Name,GST Rate
            Dolo 650mg,Paracetamol,12
            Augmentin 625,Amoxicillin,12
            """;

        StreamingCsvParser.ParsedCsvData result = parser.parse(csv.getBytes(StandardCharsets.UTF_8));

        assertEquals(3, result.headers().size());
        assertEquals("Product Name", result.headers().get(0));
        assertEquals(2, result.rows().size());
        assertEquals("Dolo 650mg", result.rows().get(0).get("Product Name"));
        assertEquals("Paracetamol", result.rows().get(0).get("Generic Name"));
        assertEquals("12", result.rows().get(0).get("GST Rate"));
    }

    @Test
    @DisplayName("Should strip UTF-8 Byte Order Mark (BOM) automatically")
    void shouldStripUtf8Bom() {
        String csv = "\uFEFFProduct Name,Category\nDolo 650mg,Analgesics";
        StreamingCsvParser.ParsedCsvData result = parser.parse(csv.getBytes(StandardCharsets.UTF_8));

        assertEquals("Product Name", result.headers().get(0));
        assertEquals(1, result.rows().size());
        assertEquals("Dolo 650mg", result.rows().get(0).get("Product Name"));
    }

    @Test
    @DisplayName("Should detect and parse semicolon-delimited CSV")
    void shouldParseSemicolonDelimitedCsv() {
        String csv = "Product Name;Dosage Form;GST Rate\nParacetamol;TABLET;12\nCough Syrup;SYRUP;18";
        StreamingCsvParser.ParsedCsvData result = parser.parse(csv.getBytes(StandardCharsets.UTF_8));

        assertEquals(';', result.delimiter());
        assertEquals(3, result.headers().size());
        assertEquals(2, result.rows().size());
        assertEquals("Paracetamol", result.rows().get(0).get("Product Name"));
        assertEquals("TABLET", result.rows().get(0).get("Dosage Form"));
    }

    @Test
    @DisplayName("Should handle quoted strings and escaped double quotes")
    void shouldHandleQuotedFields() {
        String csv = "Product Name,Description\n\"Amox-Clav 625\",\"Contains \"\"Amoxicillin\"\" and Clavulanate\"";
        StreamingCsvParser.ParsedCsvData result = parser.parse(csv.getBytes(StandardCharsets.UTF_8));

        assertEquals(1, result.rows().size());
        assertEquals("Amox-Clav 625", result.rows().get(0).get("Product Name"));
        assertEquals("Contains \"Amoxicillin\" and Clavulanate", result.rows().get(0).get("Description"));
    }

    @Test
    @DisplayName("Should handle multiline quoted fields across newlines")
    void shouldHandleMultilineQuotedFields() {
        String csv = "Product Name,Notes\n\"Cough Syrup\",\"Line 1\nLine 2\nLine 3\"";
        StreamingCsvParser.ParsedCsvData result = parser.parse(csv.getBytes(StandardCharsets.UTF_8));

        assertEquals(1, result.rows().size());
        assertEquals("Cough Syrup", result.rows().get(0).get("Product Name"));
        assertEquals("Line 1\nLine 2\nLine 3", result.rows().get(0).get("Notes"));
    }

    @Test
    @DisplayName("Should reject empty CSV file")
    void shouldRejectEmptyCsv() {
        assertThrows(BusinessRuleViolationException.class, () -> parser.parse(new byte[0]));
    }
}
