package com.inventra.inventra_backend.identity.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.identity.api.dto.ActivateInvitedUserRequest;
import com.inventra.inventra_backend.identity.api.dto.ActivateOwnerRequest;
import com.inventra.inventra_backend.identity.api.dto.AuthResponse;
import com.inventra.inventra_backend.identity.api.dto.ChangePasswordRequest;
import com.inventra.inventra_backend.identity.api.dto.LoginRequest;
import com.inventra.inventra_backend.identity.api.dto.PasswordResetConfirmRequest;
import com.inventra.inventra_backend.identity.api.dto.PasswordResetRequest;
import com.inventra.inventra_backend.identity.api.dto.RefreshTokenRequest;
import com.inventra.inventra_backend.identity.api.dto.SwitchContextRequest;
import com.inventra.inventra_backend.identity.api.dto.UserSessionResponse;
import com.inventra.inventra_backend.identity.api.dto.VerifyInvitationResponse;
import com.inventra.inventra_backend.identity.application.AuthService;
import com.inventra.inventra_backend.identity.application.UserManagementService;
import com.inventra.inventra_backend.onboarding.application.OnboardingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final OnboardingService onboardingService;
    private final UserManagementService userManagementService;

    public AuthController(
        AuthService authService,
        OnboardingService onboardingService,
        UserManagementService userManagementService
    ) {
        this.authService = authService;
        this.onboardingService = onboardingService;
        this.userManagementService = userManagementService;
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(
        @Valid @RequestBody LoginRequest request,
        HttpServletRequest httpRequest
    ) {
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = resolveUserAgent(httpRequest, request.deviceType());
        return ApiResponse.ok(authService.login(request, ipAddress, userAgent));
    }

    @PostMapping("/onboarding/activate")
    public ApiResponse<Map<String, String>> activateOwner(
        @Valid @RequestBody ActivateOwnerRequest request,
        HttpServletRequest httpRequest
    ) {
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = resolveUserAgent(httpRequest, null);
        onboardingService.activateOwner(request, ipAddress, userAgent);
        return ApiResponse.ok(Map.of("message", "Owner account activated successfully. You can now log in."));
    }

    @GetMapping("/invite/verify")
    public ApiResponse<VerifyInvitationResponse> verifyInvitation(
        @RequestParam("token") String token
    ) {
        return ApiResponse.ok(userManagementService.verifyInvitation(token));
    }

    @PostMapping("/invite/activate")
    public ApiResponse<Map<String, String>> activateInvitedUser(
        @Valid @RequestBody ActivateInvitedUserRequest request,
        HttpServletRequest httpRequest
    ) {
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = resolveUserAgent(httpRequest, null);
        userManagementService.activateInvitedUser(request, ipAddress, userAgent);
        return ApiResponse.ok(Map.of("message", "Staff account activated successfully. You can now log in."));
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthResponse> refresh(
        @Valid @RequestBody RefreshTokenRequest request,
        HttpServletRequest httpRequest
    ) {
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = resolveUserAgent(httpRequest, null);
        return ApiResponse.ok(authService.refresh(request, ipAddress, userAgent));
    }

    @PostMapping("/switch-context")
    public ApiResponse<AuthResponse> switchContext(
        @Valid @RequestBody SwitchContextRequest request,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        UUID userId = (UUID) authentication.getPrincipal();
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = resolveUserAgent(httpRequest, null);
        return ApiResponse.ok(authService.switchContext(userId, request, ipAddress, userAgent));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(
        @Valid @RequestBody RefreshTokenRequest request,
        HttpServletRequest httpRequest
    ) {
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = resolveUserAgent(httpRequest, null);
        authService.logout(request, ipAddress, userAgent);
        return ApiResponse.ok(null);
    }

    @GetMapping("/sessions")
    public ApiResponse<List<UserSessionResponse>> getSessions(
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        UUID userId = (UUID) authentication.getPrincipal();
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = resolveUserAgent(httpRequest, null);
        return ApiResponse.ok(authService.getUserSessions(userId, ipAddress, userAgent));
    }

    @PostMapping("/sessions/{id}/revoke")
    public ApiResponse<Void> revokeSession(
        @PathVariable("id") UUID sessionId,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        UUID userId = (UUID) authentication.getPrincipal();
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = resolveUserAgent(httpRequest, null);
        authService.revokeSession(userId, sessionId, ipAddress, userAgent);
        return ApiResponse.ok();
    }

    @PostMapping("/sessions/revoke-others")
    public ApiResponse<Void> revokeOtherSessions(
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        UUID userId = (UUID) authentication.getPrincipal();
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = resolveUserAgent(httpRequest, null);
        authService.revokeOtherSessions(userId, ipAddress, userAgent);
        return ApiResponse.ok();
    }

    private String resolveUserAgent(HttpServletRequest httpRequest, com.inventra.inventra_backend.tenant.domain.model.DeviceType deviceType) {
        String userAgent = httpRequest.getHeader("User-Agent");
        String clientPlatform = httpRequest.getHeader("X-Client-Platform");
        boolean isDesktop = (clientPlatform != null && clientPlatform.equalsIgnoreCase("DESKTOP")) ||
                            (deviceType != null && deviceType == com.inventra.inventra_backend.tenant.domain.model.DeviceType.DESKTOP);
        if (isDesktop) {
            return (userAgent != null ? userAgent : "Inventra Desktop") + " [DESKTOP]";
        }
        return userAgent != null ? userAgent : "Unknown Web Client";
    }

    @PostMapping("/logout-all")
    public ApiResponse<Void> logoutAll(
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        UUID userId = (UUID) authentication.getPrincipal();
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");
        authService.logoutAll(userId, ipAddress, userAgent);
        return ApiResponse.ok(null);
    }

    @PostMapping("/password/change")
    public ApiResponse<Void> changePassword(
        @Valid @RequestBody ChangePasswordRequest request,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        UUID userId = (UUID) authentication.getPrincipal();
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");
        authService.changePassword(userId, request, ipAddress, userAgent);
        return ApiResponse.ok(null);
    }

    @PostMapping("/password/reset-request")
    public ApiResponse<Void> requestPasswordReset(
        @Valid @RequestBody PasswordResetRequest request,
        HttpServletRequest httpRequest
    ) {
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");
        authService.requestPasswordReset(request, ipAddress, userAgent);
        return ApiResponse.ok(null);
    }

    @PostMapping("/password/reset-confirm")
    public ApiResponse<Void> confirmPasswordReset(
        @Valid @RequestBody PasswordResetConfirmRequest request,
        HttpServletRequest httpRequest
    ) {
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");
        authService.confirmPasswordReset(request, ipAddress, userAgent);
        return ApiResponse.ok(null);
    }
}
