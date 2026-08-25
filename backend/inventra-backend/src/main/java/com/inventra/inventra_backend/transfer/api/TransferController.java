package com.inventra.inventra_backend.transfer.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.multitenancy.TenantContext;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.transfer.api.dto.ApproveTransferRequest;
import com.inventra.inventra_backend.transfer.api.dto.CancelTransferRequest;
import com.inventra.inventra_backend.transfer.api.dto.CreateTransferRequest;
import com.inventra.inventra_backend.transfer.api.dto.ReceiveTransferRequest;
import com.inventra.inventra_backend.transfer.api.dto.RejectTransferRequest;
import com.inventra.inventra_backend.transfer.api.dto.ShipTransferRequest;
import com.inventra.inventra_backend.transfer.api.dto.TransferReceiptResponse;
import com.inventra.inventra_backend.transfer.api.dto.TransferResponse;
import com.inventra.inventra_backend.transfer.application.TransferService;
import com.inventra.inventra_backend.transfer.domain.model.TransferStatus;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/transfers")
public class TransferController {

    private final TransferService transferService;

    public TransferController(TransferService transferService) {
        this.transferService = transferService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR')")
    public ResponseEntity<ApiResponse<TransferResponse>> createTransfer(
        @Valid @RequestBody CreateTransferRequest request
    ) {
        TenantContext context = TenantContextHolder.requireContext();
        UUID businessId = UUID.fromString(context.tenantId().value());
        UUID userId = context.userId() != null ? UUID.fromString(context.userId()) : null;

        TransferResponse response = transferService.createTransfer(businessId, userId, null, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR')")
    public ResponseEntity<ApiResponse<Page<TransferResponse>>> searchTransfers(
        @RequestParam(required = false) UUID storeId,
        @RequestParam(required = false) TransferStatus status,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        TenantContext context = TenantContextHolder.requireContext();
        UUID businessId = UUID.fromString(context.tenantId().value());

        Page<TransferResponse> response = transferService.searchTransfers(businessId, storeId, status, pageable);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR')")
    public ResponseEntity<ApiResponse<TransferResponse>> getTransferById(
        @PathVariable UUID id
    ) {
        TenantContext context = TenantContextHolder.requireContext();
        UUID businessId = UUID.fromString(context.tenantId().value());

        TransferResponse response = transferService.getTransferById(businessId, id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<ApiResponse<TransferResponse>> approveTransfer(
        @PathVariable UUID id,
        @RequestBody(required = false) ApproveTransferRequest request
    ) {
        TenantContext context = TenantContextHolder.requireContext();
        UUID businessId = UUID.fromString(context.tenantId().value());
        UUID userId = context.userId() != null ? UUID.fromString(context.userId()) : null;

        TransferResponse response = transferService.approveTransfer(businessId, id, userId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<ApiResponse<TransferResponse>> rejectTransfer(
        @PathVariable UUID id,
        @Valid @RequestBody RejectTransferRequest request
    ) {
        TenantContext context = TenantContextHolder.requireContext();
        UUID businessId = UUID.fromString(context.tenantId().value());
        UUID userId = context.userId() != null ? UUID.fromString(context.userId()) : null;

        TransferResponse response = transferService.rejectTransfer(businessId, id, userId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR')")
    public ResponseEntity<ApiResponse<TransferResponse>> cancelTransfer(
        @PathVariable UUID id,
        @RequestBody(required = false) CancelTransferRequest request
    ) {
        TenantContext context = TenantContextHolder.requireContext();
        UUID businessId = UUID.fromString(context.tenantId().value());
        UUID userId = context.userId() != null ? UUID.fromString(context.userId()) : null;

        TransferResponse response = transferService.cancelTransfer(businessId, id, userId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/{id}/ship")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR')")
    public ResponseEntity<ApiResponse<TransferResponse>> shipTransfer(
        @PathVariable UUID id,
        @Valid @RequestBody ShipTransferRequest request
    ) {
        TenantContext context = TenantContextHolder.requireContext();
        UUID businessId = UUID.fromString(context.tenantId().value());
        UUID userId = context.userId() != null ? UUID.fromString(context.userId()) : null;

        TransferResponse response = transferService.shipTransfer(businessId, id, userId, null, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/{id}/receive")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR')")
    public ResponseEntity<ApiResponse<TransferReceiptResponse>> receiveTransfer(
        @PathVariable UUID id,
        @Valid @RequestBody ReceiveTransferRequest request
    ) {
        TenantContext context = TenantContextHolder.requireContext();
        UUID businessId = UUID.fromString(context.tenantId().value());
        UUID userId = context.userId() != null ? UUID.fromString(context.userId()) : null;

        TransferReceiptResponse response = transferService.receiveTransfer(businessId, id, userId, null, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }
}
