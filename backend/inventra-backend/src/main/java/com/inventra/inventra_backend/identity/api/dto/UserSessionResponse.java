package com.inventra.inventra_backend.identity.api.dto;

import java.time.Instant;
import java.util.UUID;

public record UserSessionResponse(
    UUID id,
    String deviceType,
    String browser,
    String operatingSystem,
    String ipAddress,
    String location,
    Instant createdAt,
    Instant lastActiveAt,
    boolean current,
    boolean active
) {}
