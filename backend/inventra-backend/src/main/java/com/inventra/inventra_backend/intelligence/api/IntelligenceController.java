package com.inventra.inventra_backend.intelligence.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.intelligence.api.dto.InterpretRequest;
import com.inventra.inventra_backend.intelligence.api.dto.InterpretResponse;
import com.inventra.inventra_backend.intelligence.application.IntelligenceService;
import com.inventra.inventra_backend.intelligence.domain.model.IntentResult;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller exposing the natural language command interpretation endpoint.
 * Protected by Spring Security: requires an authenticated user session.
 */
@RestController
@RequestMapping("/api/v1/intelligence")
public class IntelligenceController {

    private final IntelligenceService intelligenceService;

    public IntelligenceController(IntelligenceService intelligenceService) {
        this.intelligenceService = intelligenceService;
    }

    @PostMapping("/interpret")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<InterpretResponse> interpret(@Valid @RequestBody InterpretRequest request) {
        IntentResult result = intelligenceService.interpret(request.text());
        return ApiResponse.ok(InterpretResponse.from(result));
    }
}
