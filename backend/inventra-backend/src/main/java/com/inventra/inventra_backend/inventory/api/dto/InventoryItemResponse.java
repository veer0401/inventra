package com.inventra.inventra_backend.inventory.api.dto;

import com.inventra.inventra_backend.inventory.domain.model.InventoryItem;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record InventoryItemResponse(
    UUID id,
    UUID businessId,
    UUID storeId,
    UUID productId,
    BigDecimal currentStock,
    BigDecimal reorderLevel,
    BigDecimal reorderQuantity,
    BigDecimal minStock,
    BigDecimal maxStock,
    String locationRack,
    boolean isBatchTracked,
    Long version,
    Instant createdAt,
    Instant updatedAt
) {
    public static InventoryItemResponse from(InventoryItem item) {
        return new InventoryItemResponse(
            item.getId(),
            item.getBusinessId(),
            item.getStoreId(),
            item.getProductId(),
            item.getCurrentStock(),
            item.getReorderLevel(),
            item.getReorderQuantity(),
            item.getMinStock(),
            item.getMaxStock(),
            item.getLocationRack(),
            item.isBatchTracked(),
            item.getVersion(),
            item.getCreatedAt(),
            item.getUpdatedAt()
        );
    }
}
