package com.inventra.inventra_backend.identity.api.dto;

import com.inventra.inventra_backend.identity.domain.model.InvitationStatus;
import java.time.Instant;
import java.util.UUID;

public record UserInvitationResponse(
    UUID id,
    UUID businessId,
    String email,
    String role,
    UUID storeId,
    InvitationStatus status,
    Instant expiresAt,
    String activationToken,
    String activationUrl
) {}
