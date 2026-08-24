package com.inventra.inventra_backend.tenant.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.domain.exception.TenantAccessDeniedException;
import com.inventra.inventra_backend.common.multitenancy.TenantContext;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.tenant.api.dto.DeviceResponse;
import com.inventra.inventra_backend.tenant.api.dto.RegisterDeviceRequest;
import com.inventra.inventra_backend.tenant.application.DeviceService;
import com.inventra.inventra_backend.tenant.domain.model.Device;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/devices")
public class DeviceController {

    private final DeviceService deviceService;

    public DeviceController(DeviceService deviceService) {
        this.deviceService = deviceService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ApiResponse<List<DeviceResponse>> listDevices() {
        UUID businessId = getRequiredBusinessId();
        List<Device> devices = deviceService.listDevices(businessId);
        List<DeviceResponse> responses = devices.stream().map(DeviceResponse::from).toList();
        return ApiResponse.ok(responses);
    }

    @PostMapping("/register")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<ApiResponse<DeviceResponse>> registerDevice(
        @Valid @RequestBody RegisterDeviceRequest request,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID userId = (UUID) authentication.getPrincipal();
        Device device = deviceService.registerDevice(
            businessId,
            userId,
            request,
            httpRequest.getRemoteAddr(),
            httpRequest.getHeader("User-Agent")
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(DeviceResponse.from(device)));
    }

    @PostMapping("/{id}/revoke")
    @PreAuthorize("hasRole('OWNER')")
    public ApiResponse<DeviceResponse> revokeDevice(
        @PathVariable("id") UUID deviceId,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID actorUserId = (UUID) authentication.getPrincipal();
        Device device = deviceService.revokeDevice(
            businessId,
            deviceId,
            actorUserId,
            httpRequest.getRemoteAddr(),
            httpRequest.getHeader("User-Agent")
        );
        return ApiResponse.ok(DeviceResponse.from(device));
    }

    private UUID getRequiredBusinessId() {
        TenantContext context = TenantContextHolder.requireContext();
        return UUID.fromString(context.tenantId().value());
    }
}
