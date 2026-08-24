package com.inventra.inventra_backend.inventory.api.dto;

import com.inventra.inventra_backend.inventory.domain.model.BatchStatus;
import com.inventra.inventra_backend.inventory.domain.model.InventoryBatch;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record InventoryBatchResponse(
    UUID id,
    UUID businessId,
    UUID storeId,
    UUID productId,
    UUID inventoryItemId,
    String batchNumber,
    LocalDate manufacturingDate,
    LocalDate expiryDate,
    BigDecimal quantity,
    BigDecimal purchasePrice,
    BigDecimal mrp,
    BigDecimal sellingPrice,
    BatchStatus status,
    Long version,
    Instant createdAt,
    Instant updatedAt
) {
    public static InventoryBatchResponse from(InventoryBatch batch) {
        return new InventoryBatchResponse(
            batch.getId(),
            batch.getBusinessId(),
            batch.getStoreId(),
            batch.getProductId(),
            batch.getInventoryItemId(),
            batch.getBatchNumber(),
            batch.getManufacturingDate(),
            batch.getExpiryDate(),
            batch.getQuantity(),
            batch.getPurchasePrice(),
            batch.getMrp(),
            batch.getSellingPrice(),
            batch.getStatus(),
            batch.getVersion(),
            batch.getCreatedAt(),
            batch.getUpdatedAt()
        );
    }
}
