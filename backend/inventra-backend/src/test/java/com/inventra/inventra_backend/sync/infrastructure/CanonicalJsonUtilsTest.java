package com.inventra.inventra_backend.sync.infrastructure;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CanonicalJsonUtilsTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("Canonical checksum is identical regardless of field order or formatting")
    void canonicalChecksumMatchesForReorderedFields() throws Exception {
        String json1 = "{\"name\":\"Amoxicillin\",\"quantity\":2,\"price\":50.00}";
        String json2 = "{\n  \"price\": 50.00,\n  \"name\": \"Amoxicillin\",\n  \"quantity\": 2\n}";

        JsonNode node1 = objectMapper.readTree(json1);
        JsonNode node2 = objectMapper.readTree(json2);

        String checksum1 = CanonicalJsonUtils.computeCanonicalChecksum(node1);
        String checksum2 = CanonicalJsonUtils.computeCanonicalChecksum(node2);

        assertThat(checksum1).isEqualTo(checksum2);
        assertThat(checksum1).hasSize(64);
    }

    @Test
    @DisplayName("Canonical checksum differs when payload content differs")
    void canonicalChecksumDiffersForDifferentContent() throws Exception {
        String json1 = "{\"name\":\"Amoxicillin\",\"quantity\":2}";
        String json2 = "{\"name\":\"Amoxicillin\",\"quantity\":3}";

        JsonNode node1 = objectMapper.readTree(json1);
        JsonNode node2 = objectMapper.readTree(json2);

        String checksum1 = CanonicalJsonUtils.computeCanonicalChecksum(node1);
        String checksum2 = CanonicalJsonUtils.computeCanonicalChecksum(node2);

        assertThat(checksum1).isNotEqualTo(checksum2);
    }
}
