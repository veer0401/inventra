package com.inventra.inventra_backend.transfer.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record TransferLineBatchAllocationResponse(
    UUID id,
    UUID transferLineId,
    UUID sourceBatchId,
    UUID destinationBatchId,
    UUID productId,
    String batchNumber,
    LocalDate manufacturingDate,
    LocalDate expiryDate,
    BigDecimal shippedBaseQuantity,
    BigDecimal receivedBaseQuantity,
    BigDecimal unitCost,
    BigDecimal mrp,
    BigDecimal sellingPrice
) {}
