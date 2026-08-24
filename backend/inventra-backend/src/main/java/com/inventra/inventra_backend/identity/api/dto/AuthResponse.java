package com.inventra.inventra_backend.identity.api.dto;

import java.util.List;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    long expiresIn,
    UserSummaryDto user,
    ActiveContextDto activeContext,
    List<BusinessMembershipSummaryDto> memberships
) {}
