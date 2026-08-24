package com.inventra.inventra_backend.identity.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record SwitchContextRequest(
    @NotNull(message = "Business ID is required")
    UUID businessId,

    @NotNull(message = "Store ID is required")
    UUID storeId
) {}
