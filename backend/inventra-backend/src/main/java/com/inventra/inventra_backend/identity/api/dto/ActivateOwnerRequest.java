package com.inventra.inventra_backend.identity.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ActivateOwnerRequest(
    @NotBlank(message = "Activation token is required")
    String token,

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters")
    String newPassword
) {}
