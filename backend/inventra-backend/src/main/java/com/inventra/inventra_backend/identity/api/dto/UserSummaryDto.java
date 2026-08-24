package com.inventra.inventra_backend.identity.api.dto;

import com.inventra.inventra_backend.identity.domain.model.AccountStatus;
import java.util.UUID;

public record UserSummaryDto(
    UUID id,
    String email,
    String fullName,
    String phoneNumber,
    AccountStatus status,
    boolean emailVerified
) {}
