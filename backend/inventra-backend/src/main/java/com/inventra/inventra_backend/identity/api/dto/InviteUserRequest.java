package com.inventra.inventra_backend.identity.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record InviteUserRequest(
    @NotBlank(message = "Email address is required")
    @Email(message = "Must be a valid email address")
    String email,

    @NotBlank(message = "Role is required")
    String role,

    UUID storeId
) {}
