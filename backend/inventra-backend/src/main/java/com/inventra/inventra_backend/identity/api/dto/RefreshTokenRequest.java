package com.inventra.inventra_backend.identity.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record RefreshTokenRequest(
    @NotBlank(message = "Refresh token is required")
    String refreshToken,

    UUID deviceId
) {}
