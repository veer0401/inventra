package com.inventra.inventra_backend.intelligence.application;

import com.inventra.inventra_backend.intelligence.domain.model.IntentResult;
import com.inventra.inventra_backend.intelligence.domain.service.DeterministicNlpEngine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Application service for Inventra natural-language intelligence interpretation.
 * Read-only interpretation: does not execute business actions or mutate database state.
 */
@Service
public class IntelligenceService {

    private static final Logger log = LoggerFactory.getLogger(IntelligenceService.class);

    private final DeterministicNlpEngine nlpEngine;

    public IntelligenceService(DeterministicNlpEngine nlpEngine) {
        this.nlpEngine = nlpEngine;
    }

    /**
     * Interprets input text and returns structured intent without execution.
     */
    public IntentResult interpret(String text) {
        log.debug("Interpreting natural-language command: '{}'", text);
        IntentResult result = nlpEngine.interpret(text);
        log.debug("Interpreted intent: {}, confidence: {}, version: {}",
            result.intent(), result.confidence(), result.engineVersion());
        return result;
    }
}
