package com.inventra.inventra_backend.identity.api.dto;

import java.time.Instant;
import java.util.UUID;

public record VerifyInvitationResponse(
    boolean valid,
    UUID invitationId,
    String email,
    String role,
    UUID businessId,
    String businessName,
    UUID storeId,
    String storeName,
    Instant expiresAt
) {}
