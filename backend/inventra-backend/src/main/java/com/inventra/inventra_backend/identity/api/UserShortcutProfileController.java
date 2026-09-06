package com.inventra.inventra_backend.identity.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.identity.api.dto.CreateShortcutProfileRequest;
import com.inventra.inventra_backend.identity.api.dto.ShortcutProfileResponse;
import com.inventra.inventra_backend.identity.api.dto.UpdateShortcutProfileRequest;
import com.inventra.inventra_backend.identity.application.ShortcutProfileService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users/me/shortcut-profiles")
@PreAuthorize("isAuthenticated()")
public class UserShortcutProfileController {

    private final ShortcutProfileService shortcutProfileService;

    public UserShortcutProfileController(ShortcutProfileService shortcutProfileService) {
        this.shortcutProfileService = shortcutProfileService;
    }

    @GetMapping
    public ApiResponse<List<ShortcutProfileResponse>> listProfiles(Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        return ApiResponse.ok(shortcutProfileService.listProfiles(userId));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ShortcutProfileResponse>> createProfile(
        @Valid @RequestBody CreateShortcutProfileRequest request,
        Authentication authentication
    ) {
        UUID userId = (UUID) authentication.getPrincipal();
        ShortcutProfileResponse created = shortcutProfileService.createProfile(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(created));
    }

    @GetMapping("/{id}")
    public ApiResponse<ShortcutProfileResponse> getProfile(
        @PathVariable UUID id,
        Authentication authentication
    ) {
        UUID userId = (UUID) authentication.getPrincipal();
        return ApiResponse.ok(shortcutProfileService.getProfile(userId, id));
    }

    @PatchMapping("/{id}")
    public ApiResponse<ShortcutProfileResponse> updateProfile(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateShortcutProfileRequest request,
        Authentication authentication
    ) {
        UUID userId = (UUID) authentication.getPrincipal();
        return ApiResponse.ok(shortcutProfileService.updateProfile(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteProfile(
        @PathVariable UUID id,
        Authentication authentication
    ) {
        UUID userId = (UUID) authentication.getPrincipal();
        shortcutProfileService.deleteProfile(userId, id);
        return ApiResponse.ok();
    }

    @PostMapping("/{id}/activate")
    public ApiResponse<ShortcutProfileResponse> activateProfile(
        @PathVariable UUID id,
        Authentication authentication
    ) {
        UUID userId = (UUID) authentication.getPrincipal();
        return ApiResponse.ok(shortcutProfileService.activateProfile(userId, id));
    }

    @PostMapping("/{id}/reset")
    public ApiResponse<ShortcutProfileResponse> resetProfile(
        @PathVariable UUID id,
        Authentication authentication
    ) {
        UUID userId = (UUID) authentication.getPrincipal();
        return ApiResponse.ok(shortcutProfileService.resetProfile(userId, id));
    }
}
