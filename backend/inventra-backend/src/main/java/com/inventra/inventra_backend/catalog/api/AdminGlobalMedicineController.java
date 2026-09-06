package com.inventra.inventra_backend.catalog.api;

import com.inventra.inventra_backend.catalog.api.dto.CreateGlobalMedicineRequest;
import com.inventra.inventra_backend.catalog.api.dto.GlobalMedicineResponse;
import com.inventra.inventra_backend.catalog.api.dto.GlobalMedicineSuggestionResponse;
import com.inventra.inventra_backend.catalog.api.dto.RejectSuggestionRequest;
import com.inventra.inventra_backend.catalog.api.dto.UpdateGlobalMedicineRequest;
import com.inventra.inventra_backend.catalog.application.GlobalMedicineService;
import com.inventra.inventra_backend.catalog.domain.model.GlobalMedicineStatus;
import com.inventra.inventra_backend.catalog.domain.model.SuggestionStatus;
import com.inventra.inventra_backend.common.api.ApiResponse;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/medicines")
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class AdminGlobalMedicineController {

    private final GlobalMedicineService globalMedicineService;

    public AdminGlobalMedicineController(GlobalMedicineService globalMedicineService) {
        this.globalMedicineService = globalMedicineService;
    }

    // =========================================================================
    // Global Medicine Master Catalog Management
    // =========================================================================

    @GetMapping
    public ApiResponse<Page<GlobalMedicineResponse>> getAllMedicines(
        @RequestParam(required = false) String query,
        @RequestParam(required = false) GlobalMedicineStatus status,
        @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        return ApiResponse.ok(globalMedicineService.searchAllGlobalMedicines(query, status, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<GlobalMedicineResponse> getMedicine(@PathVariable UUID id) {
        return ApiResponse.ok(globalMedicineService.getGlobalMedicineForAdmin(id));
    }

    @PostMapping
    public ApiResponse<GlobalMedicineResponse> createMedicine(@Valid @RequestBody CreateGlobalMedicineRequest request) {
        return ApiResponse.ok(globalMedicineService.createGlobalMedicine(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<GlobalMedicineResponse> updateMedicine(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateGlobalMedicineRequest request
    ) {
        return ApiResponse.ok(globalMedicineService.updateGlobalMedicine(id, request));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<GlobalMedicineResponse> updateStatus(
        @PathVariable UUID id,
        @RequestParam GlobalMedicineStatus status
    ) {
        return ApiResponse.ok(globalMedicineService.updateStatus(id, status));
    }

    // =========================================================================
    // Silent Suggestion Pipeline Review
    // =========================================================================

    @GetMapping("/suggestions")
    public ApiResponse<Page<GlobalMedicineSuggestionResponse>> getSuggestions(
        @RequestParam(required = false) String query,
        @RequestParam(required = false) SuggestionStatus status,
        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ApiResponse.ok(globalMedicineService.listSuggestions(query, status, pageable));
    }

    @GetMapping("/suggestions/count")
    public ApiResponse<Map<String, Long>> getPendingCount() {
        return ApiResponse.ok(Map.of("pending", globalMedicineService.getPendingSuggestionsCount()));
    }

    @PostMapping("/suggestions/{id}/approve")
    public ApiResponse<GlobalMedicineSuggestionResponse> approveSuggestion(
        @PathVariable UUID id,
        @RequestParam(required = false) String notes,
        Authentication authentication
    ) {
        UUID adminUserId = (UUID) authentication.getPrincipal();
        return ApiResponse.ok(globalMedicineService.approveSuggestion(id, adminUserId, notes));
    }

    @PostMapping("/suggestions/{id}/reject")
    public ApiResponse<GlobalMedicineSuggestionResponse> rejectSuggestion(
        @PathVariable UUID id,
        @Valid @RequestBody RejectSuggestionRequest request,
        Authentication authentication
    ) {
        UUID adminUserId = (UUID) authentication.getPrincipal();
        return ApiResponse.ok(globalMedicineService.rejectSuggestion(id, adminUserId, request.reason()));
    }

    // =========================================================================
    // Bulk CSV Ingestion
    // =========================================================================

    @PostMapping(value = "/import-csv", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<com.inventra.inventra_backend.catalog.api.dto.GlobalMedicineCsvImportResult> importCsv(
        @RequestParam("file") org.springframework.web.multipart.MultipartFile file
    ) throws java.io.IOException {
        return ApiResponse.ok(globalMedicineService.importFromCsv(file.getInputStream()));
    }

    @GetMapping("/csv-template")
    public org.springframework.http.ResponseEntity<byte[]> downloadCsvTemplate() {
        String csv = globalMedicineService.generateCsvTemplate();
        byte[] bytes = csv.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return org.springframework.http.ResponseEntity.ok()
            .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"inventra_global_medicines_template.csv\"")
            .contentType(org.springframework.http.MediaType.parseMediaType("text/csv"))
            .body(bytes);
    }
}
