package com.inventra.inventra_backend.identity.api.dto;

import jakarta.validation.constraints.Size;
import java.util.Map;

public record UpdateShortcutProfileRequest(
    @Size(min = 1, max = 100, message = "Profile name must be between 1 and 100 characters")
    String name,

    @Size(max = 255, message = "Description cannot exceed 255 characters")
    String description,

    Boolean isActive,

    Map<String, String> shortcuts
) {}
