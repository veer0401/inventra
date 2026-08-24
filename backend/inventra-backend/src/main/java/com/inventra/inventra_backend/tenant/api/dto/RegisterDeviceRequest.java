package com.inventra.inventra_backend.tenant.api.dto;

import com.inventra.inventra_backend.tenant.domain.model.DeviceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterDeviceRequest(
    @NotBlank(message = "Device name is required")
    @Size(max = 100, message = "Device name must not exceed 100 characters")
    String deviceName,

    @NotBlank(message = "Device code is required")
    @Size(max = 50, message = "Device code must not exceed 50 characters")
    String deviceCode,

    @NotNull(message = "Device type is required")
    DeviceType deviceType,

    String platformOs,
    String appVersion
) {}
