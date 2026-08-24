package com.inventra.inventra_backend.identity.api.dto;

import com.inventra.inventra_backend.identity.domain.model.Role;
import java.util.List;
import java.util.UUID;

public record BusinessMembershipSummaryDto(
    UUID businessId,
    String businessName,
    Role role,
    List<StoreAssignmentSummaryDto> stores
) {}
