package com.inventra.inventra_backend.identity.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.identity.api.dto.AuthResponse;
import com.inventra.inventra_backend.identity.api.dto.ChangePasswordRequest;
import com.inventra.inventra_backend.identity.api.dto.LoginRequest;
import com.inventra.inventra_backend.identity.api.dto.PasswordResetConfirmRequest;
import com.inventra.inventra_backend.identity.api.dto.PasswordResetRequest;
import com.inventra.inventra_backend.identity.api.dto.RefreshTokenRequest;
import com.inventra.inventra_backend.identity.api.dto.RegisterOwnerRequest;
import com.inventra.inventra_backend.identity.api.dto.SwitchContextRequest;
import com.inventra.inventra_backend.identity.application.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register-owner")
    public ResponseEntity<ApiResponse<AuthResponse>> registerOwner(
        @Valid @RequestBody RegisterOwnerRequest request,
        HttpServletRequest httpRequest
    ) {
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");
        AuthResponse response = authService.registerOwner(request, ipAddress, userAgent);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(
        @Valid @RequestBody LoginRequest request,
        HttpServletRequest httpRequest
    ) {
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");
        return ApiResponse.ok(authService.login(request, ipAddress, userAgent));
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthResponse> refresh(
        @Valid @RequestBody RefreshTokenRequest request,
        HttpServletRequest httpRequest
    ) {
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");
        return ApiResponse.ok(authService.refresh(request, ipAddress, userAgent));
    }

    @PostMapping("/switch-context")
    public ApiResponse<AuthResponse> switchContext(
        @Valid @RequestBody SwitchContextRequest request,
        Authentication authentication
    ) {
        UUID userId = (UUID) authentication.getPrincipal();
        return ApiResponse.ok(authService.switchContext(userId, request, null));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(
        @RequestBody(required = false) RefreshTokenRequest request,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        UUID userId = authentication != null ? (UUID) authentication.getPrincipal() : null;
        String refreshToken = request != null ? request.refreshToken() : null;
        authService.logout(refreshToken, userId, httpRequest.getRemoteAddr(), httpRequest.getHeader("User-Agent"));
        return ApiResponse.ok();
    }

    @PostMapping("/logout-all")
    public ApiResponse<Void> logoutAll(
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        UUID userId = (UUID) authentication.getPrincipal();
        authService.logoutAll(userId, httpRequest.getRemoteAddr(), httpRequest.getHeader("User-Agent"));
        return ApiResponse.ok();
    }

    @PostMapping("/password/change")
    public ApiResponse<Void> changePassword(
        @Valid @RequestBody ChangePasswordRequest request,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        UUID userId = (UUID) authentication.getPrincipal();
        authService.changePassword(userId, request, httpRequest.getRemoteAddr(), httpRequest.getHeader("User-Agent"));
        return ApiResponse.ok();
    }

    @PostMapping("/password/reset-request")
    public ApiResponse<Void> requestPasswordReset(
        @Valid @RequestBody PasswordResetRequest request,
        HttpServletRequest httpRequest
    ) {
        authService.requestPasswordReset(request, httpRequest.getRemoteAddr(), httpRequest.getHeader("User-Agent"));
        return ApiResponse.ok();
    }

    @PostMapping("/password/reset-confirm")
    public ApiResponse<Void> confirmPasswordReset(
        @Valid @RequestBody PasswordResetConfirmRequest request,
        HttpServletRequest httpRequest
    ) {
        authService.confirmPasswordReset(request, httpRequest.getRemoteAddr(), httpRequest.getHeader("User-Agent"));
        return ApiResponse.ok();
    }
}
