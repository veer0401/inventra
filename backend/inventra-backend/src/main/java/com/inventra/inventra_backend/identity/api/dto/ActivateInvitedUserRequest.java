package com.inventra.inventra_backend.identity.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ActivateInvitedUserRequest(
    @NotBlank(message = "Activation token is required")
    String token,

    @NotBlank(message = "Full legal name is required")
    @Size(min = 2, max = 150, message = "Full name must be between 2 and 150 characters")
    String fullName,

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Phone number must be strictly 10 digits starting with 6, 7, 8, or 9")
    String phoneNumber,

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters")
    String password
) {}
