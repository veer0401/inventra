package com.inventra.inventra_backend.ingestion.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.multitenancy.TenantContext;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.ingestion.api.dto.ConfirmImportResponse;
import com.inventra.inventra_backend.ingestion.api.dto.ImportJobResponse;
import com.inventra.inventra_backend.ingestion.api.dto.ImportRowResponse;
import com.inventra.inventra_backend.ingestion.api.dto.SkipImportRowRequest;
import com.inventra.inventra_backend.ingestion.api.dto.UpdateImportRowRequest;
import com.inventra.inventra_backend.ingestion.application.ImportJobService;
import com.inventra.inventra_backend.ingestion.application.dto.ImportTemplateMetadata;
import com.inventra.inventra_backend.ingestion.domain.model.ImportDomain;
import com.inventra.inventra_backend.ingestion.domain.model.ImportJobStatus;
import com.inventra.inventra_backend.ingestion.domain.model.ImportRowStatus;
import com.inventra.inventra_backend.ingestion.domain.model.ImportSource;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/imports")
public class ImportController {

    private final ImportJobService importJobService;

    public ImportController(ImportJobService importJobService) {
        this.importJobService = importJobService;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<ImportJobResponse>> uploadImportFile(
        @RequestParam("file") MultipartFile file,
        @RequestParam("domain") ImportDomain domain,
        @RequestParam(value = "storeId", required = false) UUID storeId,
        @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID userId = getRequiredUserId();

        if (file == null || file.isEmpty()) {
            throw new BusinessRuleViolationException("FILE_EMPTY", "Uploaded file cannot be empty");
        }

        UUID resolvedStoreId = storeId != null ? storeId : getStoreIdOrNull();

        try {
            byte[] bytes = file.getBytes();
            ImportJobResponse response = importJobService.createImportJob(
                businessId,
                resolvedStoreId,
                userId,
                ImportSource.CSV,
                domain,
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "import.csv",
                bytes,
                idempotencyKey
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
        } catch (BusinessRuleViolationException brve) {
            throw brve;
        } catch (Exception e) {
            throw new BusinessRuleViolationException("FILE_READ_ERROR", "Failed to read uploaded file: " + e.getMessage());
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'PLATFORM_ADMIN', 'INVENTORY_OPERATOR')")
    public ApiResponse<Page<ImportJobResponse>> listImportJobs(
        @RequestParam(required = false) ImportDomain domain,
        @RequestParam(required = false) ImportJobStatus status,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID businessId = getRequiredBusinessId();
        Page<ImportJobResponse> page = importJobService.searchImportJobs(businessId, domain, status, pageable);
        return ApiResponse.ok(page);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'PLATFORM_ADMIN', 'INVENTORY_OPERATOR')")
    public ApiResponse<ImportJobResponse> getImportJobById(@PathVariable UUID id) {
        UUID businessId = getRequiredBusinessId();
        ImportJobResponse response = importJobService.getImportJobById(businessId, id);
        return ApiResponse.ok(response);
    }

    @GetMapping("/{id}/rows")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'PLATFORM_ADMIN', 'INVENTORY_OPERATOR')")
    public ApiResponse<Page<ImportRowResponse>> getImportRows(
        @PathVariable UUID id,
        @RequestParam(required = false) ImportRowStatus status,
        @PageableDefault(size = 50) Pageable pageable
    ) {
        UUID businessId = getRequiredBusinessId();
        Page<ImportRowResponse> rows = importJobService.searchImportRows(businessId, id, status, pageable);
        return ApiResponse.ok(rows);
    }

    @PatchMapping("/{id}/rows/{rowId}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'PLATFORM_ADMIN')")
    public ApiResponse<ImportRowResponse> updateImportRow(
        @PathVariable UUID id,
        @PathVariable UUID rowId,
        @Valid @RequestBody UpdateImportRowRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID userId = getRequiredUserId();
        ImportRowResponse response = importJobService.updateImportRow(businessId, id, rowId, userId, request.fields());
        return ApiResponse.ok(response);
    }

    @PostMapping("/{id}/rows/{rowId}/skip")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'PLATFORM_ADMIN')")
    public ApiResponse<ImportRowResponse> skipImportRow(
        @PathVariable UUID id,
        @PathVariable UUID rowId,
        @Valid @RequestBody SkipImportRowRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID userId = getRequiredUserId();
        ImportRowResponse response = importJobService.skipImportRow(businessId, id, rowId, userId, request.skipReason());
        return ApiResponse.ok(response);
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'PLATFORM_ADMIN')")
    public ApiResponse<ConfirmImportResponse> confirmImportJob(@PathVariable UUID id) {
        UUID businessId = getRequiredBusinessId();
        UUID userId = getRequiredUserId();
        ConfirmImportResponse response = importJobService.confirmImportJob(businessId, id, userId);
        return ApiResponse.ok(response);
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'PLATFORM_ADMIN')")
    public ApiResponse<ImportJobResponse> cancelImportJob(@PathVariable UUID id) {
        UUID businessId = getRequiredBusinessId();
        UUID userId = getRequiredUserId();
        ImportJobResponse response = importJobService.cancelImportJob(businessId, id, userId);
        return ApiResponse.ok(response);
    }

    @GetMapping("/templates/{domain}")
    public ApiResponse<ImportTemplateMetadata> getTemplateMetadata(@PathVariable ImportDomain domain) {
        ImportTemplateMetadata metadata = importJobService.getTemplateMetadata(domain);
        return ApiResponse.ok(metadata);
    }

    private UUID getRequiredBusinessId() {
        TenantContext context = TenantContextHolder.requireContext();
        return UUID.fromString(context.tenantId().value());
    }

    private UUID getRequiredUserId() {
        TenantContext context = TenantContextHolder.requireContext();
        return context.getUserId()
            .map(UUID::fromString)
            .orElseThrow(() -> new BusinessRuleViolationException("MISSING_USER_CONTEXT", "User context is required"));
    }

    private UUID getStoreIdOrNull() {
        TenantContext context = TenantContextHolder.requireContext();
        return context.getStoreId().map(UUID::fromString).orElse(null);
    }
}
