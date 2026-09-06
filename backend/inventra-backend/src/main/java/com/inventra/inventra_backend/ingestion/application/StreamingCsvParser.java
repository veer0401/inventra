package com.inventra.inventra_backend.ingestion.application;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class StreamingCsvParser {

    public static final long MAX_FILE_SIZE_BYTES = 10L * 1024 * 1024; // 10 MB
    public static final int MAX_ROW_COUNT = 50000;

    public record ParsedCsvData(
        List<String> headers,
        List<Map<String, String>> rows,
        char delimiter
    ) {}

    public ParsedCsvData parse(byte[] fileBytes) {
        if (fileBytes == null || fileBytes.length == 0) {
            throw new BusinessRuleViolationException("INVALID_IMPORT_FILE_FORMAT", "Uploaded CSV file is empty");
        }

        if (fileBytes.length > MAX_FILE_SIZE_BYTES) {
            throw new BusinessRuleViolationException(
                "CSV_FILE_TOO_LARGE",
                String.format("Uploaded file size (%d bytes) exceeds maximum limit of 10MB", fileBytes.length)
            );
        }

        InputStream is = new ByteArrayInputStream(fileBytes);
        return parseStream(is);
    }

    public ParsedCsvData parseStream(InputStream inputStream) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            // 1. Read first line to detect BOM and delimiter
            String firstLine = reader.readLine();
            if (firstLine == null || firstLine.isBlank()) {
                throw new BusinessRuleViolationException("INVALID_IMPORT_FILE_FORMAT", "Uploaded CSV file contains no content or headers");
            }

            // Strip UTF-8 Byte Order Mark (BOM) if present
            if (firstLine.startsWith("\uFEFF")) {
                firstLine = firstLine.substring(1);
            }

            char delimiter = detectDelimiter(firstLine);

            List<String> headers = parseCsvLine(firstLine, delimiter);
            if (headers.isEmpty() || headers.stream().allMatch(String::isBlank)) {
                throw new BusinessRuleViolationException("INVALID_IMPORT_FILE_FORMAT", "CSV header row is empty or invalid");
            }

            // Clean headers (trim and normalize)
            List<String> cleanHeaders = new ArrayList<>();
            for (int i = 0; i < headers.size(); i++) {
                String h = headers.get(i).trim();
                cleanHeaders.add(h.isEmpty() ? "COL_" + (i + 1) : h);
            }

            List<Map<String, String>> rows = new ArrayList<>();
            StringBuilder multilineBuffer = new StringBuilder();
            boolean insideQuotes = false;
            String line;
            int lineCounter = 1; // header was line 1

            while ((line = reader.readLine()) != null) {
                lineCounter++;
                if (rows.size() >= MAX_ROW_COUNT) {
                    throw new BusinessRuleViolationException(
                        "CSV_ROW_LIMIT_EXCEEDED",
                        String.format("CSV row count exceeds maximum allowed limit of %d rows", MAX_ROW_COUNT)
                    );
                }

                if (insideQuotes) {
                    multilineBuffer.append("\n").append(line);
                } else {
                    multilineBuffer.setLength(0);
                    multilineBuffer.append(line);
                }

                insideQuotes = countUnescapedQuotes(multilineBuffer.toString()) % 2 != 0;

                if (!insideQuotes) {
                    String fullRowText = multilineBuffer.toString().trim();
                    if (!fullRowText.isEmpty()) {
                        List<String> values = parseCsvLine(fullRowText, delimiter);
                        Map<String, String> rowMap = new LinkedHashMap<>();
                        for (int i = 0; i < cleanHeaders.size(); i++) {
                            String header = cleanHeaders.get(i);
                            String val = i < values.size() ? values.get(i).trim() : "";
                            rowMap.put(header, val);
                        }
                        rows.add(rowMap);
                    }
                }
            }

            if (insideQuotes) {
                throw new BusinessRuleViolationException("INVALID_IMPORT_FILE_FORMAT", "Unclosed quoted field detected at end of file");
            }

            return new ParsedCsvData(Collections.unmodifiableList(cleanHeaders), Collections.unmodifiableList(rows), delimiter);
        } catch (BusinessRuleViolationException brve) {
            throw brve;
        } catch (Exception e) {
            throw new BusinessRuleViolationException("INVALID_IMPORT_FILE_FORMAT", "Failed to parse CSV file: " + e.getMessage());
        }
    }

    private char detectDelimiter(String sampleLine) {
        int commaCount = countCharOccurrences(sampleLine, ',');
        int semicolonCount = countCharOccurrences(sampleLine, ';');
        return semicolonCount > commaCount ? ';' : ',';
    }

    private int countCharOccurrences(String str, char ch) {
        int count = 0;
        for (int i = 0; i < str.length(); i++) {
            if (str.charAt(i) == ch) count++;
        }
        return count;
    }

    private int countUnescapedQuotes(String text) {
        int count = 0;
        for (int i = 0; i < text.length(); i++) {
            if (text.charAt(i) == '"') {
                count++;
            }
        }
        return count;
    }

    public List<String> parseCsvLine(String line, char delimiter) {
        List<String> tokens = new ArrayList<>();
        StringBuilder sb = new StringBuilder();
        boolean inQuotes = false;
        int len = line.length();

        for (int i = 0; i < len; i++) {
            char c = line.charAt(i);

            if (c == '"') {
                if (inQuotes && i + 1 < len && line.charAt(i + 1) == '"') {
                    sb.append('"');
                    i++; // skip escaped quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == delimiter && !inQuotes) {
                tokens.add(sb.toString());
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        tokens.add(sb.toString());
        return tokens;
    }
}
