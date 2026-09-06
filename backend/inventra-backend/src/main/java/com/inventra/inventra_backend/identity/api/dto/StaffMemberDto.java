package com.inventra.inventra_backend.identity.api.dto;

import java.time.Instant;
import java.util.UUID;

public record StaffMemberDto(
    UUID id,
    UUID userId,
    String email,
    String fullName,
    String phoneNumber,
    String role,
    String status,
    UUID storeId,
    String storeName,
    boolean isPrimaryStore,
    boolean isInvitation,
    String invitationToken,
    String activationUrl,
    Instant createdAt
) {}
