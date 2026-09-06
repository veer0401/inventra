package com.inventra.inventra_backend.identity.api.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record ShortcutProfileResponse(
    UUID id,
    UUID userId,
    String name,
    String description,
    boolean isActive,
    Map<String, String> shortcuts,
    Instant createdAt,
    Instant updatedAt
) {}
