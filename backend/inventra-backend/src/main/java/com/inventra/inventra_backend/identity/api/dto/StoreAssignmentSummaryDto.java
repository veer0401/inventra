package com.inventra.inventra_backend.identity.api.dto;

import com.inventra.inventra_backend.identity.domain.model.Role;
import java.util.UUID;

public record StoreAssignmentSummaryDto(
    UUID storeId,
    String storeName,
    String storeCode,
    Role roleOverride,
    boolean isPrimaryStore
) {}
