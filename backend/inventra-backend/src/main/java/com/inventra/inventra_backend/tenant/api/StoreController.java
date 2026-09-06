package com.inventra.inventra_backend.tenant.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.tenant.api.dto.AssignStoreUserRequest;
import com.inventra.inventra_backend.tenant.api.dto.StoreCapacityResponse;
import com.inventra.inventra_backend.tenant.api.dto.UpdateStoreCapacityRequest;
import com.inventra.inventra_backend.tenant.application.StoreCapacityService;
import com.inventra.inventra_backend.tenant.domain.model.StoreAssignment;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/stores")
public class StoreController {

    private final StoreCapacityService storeCapacityService;

    public StoreController(StoreCapacityService storeCapacityService) {
        this.storeCapacityService = storeCapacityService;
    }

    @GetMapping("/{storeId}/capacity")
    @PreAuthorize("hasAnyRole('PLATFORM_ADMIN', 'OWNER', 'MANAGER', 'INVENTORY_OPERATOR', 'CASHIER')")
    public ApiResponse<StoreCapacityResponse> getStoreCapacity(
        @PathVariable UUID storeId
    ) {
        UUID businessId = getOptionalBusinessId();
        return ApiResponse.ok(storeCapacityService.getStoreCapacity(businessId, storeId));
    }

    @PatchMapping("/{storeId}/capacity")
    @PreAuthorize("hasRole('PLATFORM_ADMIN') or hasRole('OWNER')")
    public ApiResponse<StoreCapacityResponse> updateStoreCapacity(
        @PathVariable UUID storeId,
        @Valid @RequestBody UpdateStoreCapacityRequest request,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        UUID businessId = getOptionalBusinessId();
        UUID actorUserId = (UUID) authentication.getPrincipal();
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");

        return ApiResponse.ok(storeCapacityService.updateStoreCapacity(
            businessId,
            storeId,
            request.maxUsers(),
            actorUserId,
            ipAddress,
            userAgent
        ));
    }

    @PostMapping("/{storeId}/assignments")
    @PreAuthorize("hasRole('PLATFORM_ADMIN') or hasRole('OWNER') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<StoreAssignment>> assignUserToStore(
        @PathVariable UUID storeId,
        @Valid @RequestBody AssignStoreUserRequest request,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        UUID businessId = getOptionalBusinessId();
        UUID actorUserId = (UUID) authentication.getPrincipal();
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");

        StoreAssignment assignment = storeCapacityService.assignUserToStore(
            businessId,
            storeId,
            request.businessMembershipId(),
            request.roleOverride(),
            request.isPrimaryStore(),
            actorUserId,
            ipAddress,
            userAgent
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(assignment));
    }

    private UUID getOptionalBusinessId() {
        return TenantContextHolder.getTenantId()
            .map(t -> UUID.fromString(t.value()))
            .orElse(null);
    }
}

