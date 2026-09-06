package com.inventra.inventra_backend.tenant.api.dto;

import com.inventra.inventra_backend.identity.domain.model.Role;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AssignStoreUserRequest(
    @NotNull(message = "businessMembershipId is required")
    UUID businessMembershipId,
    Role roleOverride,
    boolean isPrimaryStore
) {}
