package com.inventra.inventra_backend.sync.infrastructure;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HexFormat;
import java.util.Iterator;
import java.util.List;

public final class CanonicalJsonUtils {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private CanonicalJsonUtils() {
    }

    public static String computeCanonicalChecksum(Object obj) {
        if (obj == null) {
            return computeCanonicalChecksum(OBJECT_MAPPER.nullNode());
        }
        if (obj instanceof JsonNode jn) {
            return computeCanonicalChecksum(jn);
        }
        JsonNode node = OBJECT_MAPPER.valueToTree(obj);
        return computeCanonicalChecksum(node);
    }

    public static String computeCanonicalChecksum(JsonNode node) {
        try {
            JsonNode canonicalNode = canonicalize(node);
            String canonicalString = OBJECT_MAPPER.writeValueAsString(canonicalNode);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(canonicalString.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to compute canonical checksum", e);
        }
    }

    private static JsonNode canonicalize(JsonNode src) {
        if (src == null || src.isNull()) {
            return OBJECT_MAPPER.nullNode();
        }
        if (src.isObject()) {
            ObjectNode obj = OBJECT_MAPPER.createObjectNode();
            List<String> fieldNames = new ArrayList<>();
            Iterator<String> it = src.fieldNames();
            while (it.hasNext()) {
                fieldNames.add(it.next());
            }
            Collections.sort(fieldNames);
            for (String fieldName : fieldNames) {
                obj.set(fieldName, canonicalize(src.get(fieldName)));
            }
            return obj;
        } else if (src.isArray()) {
            ArrayNode arr = OBJECT_MAPPER.createArrayNode();
            for (JsonNode child : src) {
                arr.add(canonicalize(child));
            }
            return arr;
        } else {
            return src;
        }
    }
}
