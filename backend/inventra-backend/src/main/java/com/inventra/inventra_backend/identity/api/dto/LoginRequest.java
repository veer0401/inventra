package com.inventra.inventra_backend.identity.api.dto;

import com.inventra.inventra_backend.tenant.domain.model.DeviceType;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record LoginRequest(
    @NotBlank(message = "Email is required")
    String email,

    @NotBlank(message = "Password is required")
    String password,

    UUID deviceId,
    String deviceCode,
    DeviceType deviceType,
    String platformOs,
    String appVersion
) {}
