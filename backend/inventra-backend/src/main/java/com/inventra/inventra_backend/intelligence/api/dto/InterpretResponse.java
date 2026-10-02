package com.inventra.inventra_backend.intelligence.api.dto;

import com.inventra.inventra_backend.intelligence.domain.model.IntentResult;
import com.inventra.inventra_backend.intelligence.domain.model.IntentType;
import java.util.List;
import java.util.Map;

/**
 * Structured response containing interpreted intent, confidence, entities, and metadata.
 */
public record InterpretResponse(
    IntentType intent,
    double confidence,
    Map<String, Object> entities,
    String originalText,
    String normalizedText,
    String explanation,
    List<String> suggestions,
    String engineVersion
) {
    public static InterpretResponse from(IntentResult result) {
        return new InterpretResponse(
            result.intent(),
            result.confidence(),
            result.entities(),
            result.originalText(),
            result.normalizedText(),
            result.explanation(),
            result.suggestions(),
            result.engineVersion()
        );
    }
}
