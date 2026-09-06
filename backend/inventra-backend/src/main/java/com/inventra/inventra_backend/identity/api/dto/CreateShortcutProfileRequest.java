package com.inventra.inventra_backend.identity.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;

public record CreateShortcutProfileRequest(
    @NotBlank(message = "Profile name is required")
    @Size(max = 100, message = "Profile name cannot exceed 100 characters")
    String name,

    @Size(max = 255, message = "Description cannot exceed 255 characters")
    String description,

    boolean isActive,

    Map<String, String> shortcuts
) {}
