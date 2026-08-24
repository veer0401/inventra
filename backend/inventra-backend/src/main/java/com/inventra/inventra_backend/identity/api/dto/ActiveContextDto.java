package com.inventra.inventra_backend.identity.api.dto;

import com.inventra.inventra_backend.identity.domain.model.Role;
import java.util.UUID;

public record ActiveContextDto(
    UUID businessId,
    String businessName,
    UUID storeId,
    String storeName,
    String storeCode,
    Role role,
    UUID deviceId
) {}
