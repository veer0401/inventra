package com.inventra.inventra_backend.sync.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.multitenancy.TenantContext;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.sync.api.dto.SyncDownloadResponse;
import com.inventra.inventra_backend.sync.api.dto.SyncUploadRequest;
import com.inventra.inventra_backend.sync.api.dto.SyncUploadResponse;
import com.inventra.inventra_backend.sync.application.SyncService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sync")
public class SyncController {

    private final SyncService syncService;

    public SyncController(SyncService syncService) {
        this.syncService = syncService;
    }

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'CASHIER', 'INVENTORY_OPERATOR')")
    public ResponseEntity<ApiResponse<SyncUploadResponse>> uploadSyncBatch(
        @Valid @RequestBody SyncUploadRequest request
    ) {
        TenantContext context = TenantContextHolder.requireContext();
        UUID businessId = UUID.fromString(context.tenantId().value());
        UUID storeId = context.storeId() != null ? UUID.fromString(context.storeId()) : null;
        UUID userId = context.userId() != null ? UUID.fromString(context.userId()) : null;
        UUID deviceId = request.deviceId();

        SyncUploadResponse response = syncService.processUpload(businessId, storeId, userId, deviceId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/download")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'CASHIER', 'INVENTORY_OPERATOR')")
    public ResponseEntity<ApiResponse<SyncDownloadResponse>> downloadChanges(
        @RequestParam(value = "cursor", defaultValue = "0") Long cursor,
        @RequestParam(value = "limit", defaultValue = "100") Integer limit
    ) {
        TenantContext context = TenantContextHolder.requireContext();
        UUID businessId = UUID.fromString(context.tenantId().value());
        UUID storeId = context.storeId() != null ? UUID.fromString(context.storeId()) : null;

        SyncDownloadResponse response = syncService.downloadChanges(businessId, storeId, cursor, limit);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
