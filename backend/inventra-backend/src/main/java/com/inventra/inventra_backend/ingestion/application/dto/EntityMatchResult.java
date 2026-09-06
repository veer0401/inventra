package com.inventra.inventra_backend.ingestion.application.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record EntityMatchResult(
    UUID matchedEntityId,
    BigDecimal matchConfidence,
    String matchDescription,
    boolean isAmbiguous
) {
    public static EntityMatchResult exact(UUID id, String description) {
        return new EntityMatchResult(id, new BigDecimal("1.00"), description, false);
    }

    public static EntityMatchResult fuzzy(UUID id, BigDecimal confidence, String description) {
        return new EntityMatchResult(id, confidence, description, false);
    }

    public static EntityMatchResult ambiguous(String description) {
        return new EntityMatchResult(null, new BigDecimal("0.50"), description, true);
    }

    public static EntityMatchResult none() {
        return new EntityMatchResult(null, BigDecimal.ZERO, "No matching entity found", false);
    }
}
