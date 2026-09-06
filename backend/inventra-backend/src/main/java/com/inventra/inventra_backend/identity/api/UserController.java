package com.inventra.inventra_backend.identity.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.identity.api.dto.InviteUserRequest;
import com.inventra.inventra_backend.identity.api.dto.StaffMemberDto;
import com.inventra.inventra_backend.identity.api.dto.UserInvitationResponse;
import com.inventra.inventra_backend.identity.application.UserManagementService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserManagementService userManagementService;

    public UserController(UserManagementService userManagementService) {
        this.userManagementService = userManagementService;
    }

    @PostMapping("/invite")
    @PreAuthorize("hasRole('PLATFORM_ADMIN') or hasRole('OWNER') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<UserInvitationResponse>> inviteUser(
        @Valid @RequestBody InviteUserRequest request,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID actorUserId = (UUID) authentication.getPrincipal();
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");

        UserInvitationResponse response = userManagementService.inviteUser(
            businessId,
            actorUserId,
            request,
            ipAddress,
            userAgent
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<StaffMemberDto>> listBusinessStaff() {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(userManagementService.listBusinessStaff(businessId));
    }

    private UUID getRequiredBusinessId() {
        return TenantContextHolder.getTenantId()
            .map(t -> UUID.fromString(t.value()))
            .orElseThrow(() -> new IllegalStateException("Active business context is required for staff operations"));
    }
}
