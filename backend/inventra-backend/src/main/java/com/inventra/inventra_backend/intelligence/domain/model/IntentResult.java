package com.inventra.inventra_backend.intelligence.domain.model;

import com.inventra.inventra_backend.catalog.domain.model.ProductQueryCondition;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Domain representation of an interpreted natural-language command.
 */
public record IntentResult(
    IntentType intent,
    double confidence,
    Map<String, Object> entities,
    String originalText,
    String normalizedText,
    String explanation,
    List<String> suggestions,
    String engineVersion
) {
    public static final String CURRENT_ENGINE_VERSION = "1";

    public IntentResult {
        if (entities == null) {
            entities = Collections.emptyMap();
        } else {
            entities = Collections.unmodifiableMap(entities);
        }
        if (suggestions == null) {
            suggestions = Collections.emptyList();
        } else {
            suggestions = Collections.unmodifiableList(suggestions);
        }
        if (engineVersion == null) {
            engineVersion = CURRENT_ENGINE_VERSION;
        }
    }

    public static IntentResult unknown(String originalText, String normalizedText, String reason, List<String> suggestions) {
        return new IntentResult(
            IntentType.UNKNOWN,
            0.10,
            Collections.emptyMap(),
            originalText,
            normalizedText,
            reason != null ? reason : "Could not confidently understand request",
            suggestions != null ? suggestions : List.of(
                "Show low stock medicines",
                "Search customer Rahul",
                "Open inventory",
                "Show today's sales"
            ),
            CURRENT_ENGINE_VERSION
        );
    }

    public List<ProductQueryCondition> productConditions() {
        if (entities == null) {
            return Collections.emptyList();
        }
        Object val = entities.get("conditions");
        if (val instanceof List<?> list) {
            List<ProductQueryCondition> result = new ArrayList<>();
            for (Object item : list) {
                if (item instanceof ProductQueryCondition cond) {
                    result.add(cond);
                }
            }
            return Collections.unmodifiableList(result);
        }
        return Collections.emptyList();
    }
}
