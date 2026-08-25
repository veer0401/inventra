package com.inventra.inventra_backend.transfer.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record TransferLineResponse(
    UUID id,
    UUID productId,
    Integer lineNumber,
    String productName,
    String sellingUnit,
    Integer conversionFactor,
    BigDecimal requestedQuantity,
    BigDecimal requestedBaseQuantity,
    BigDecimal approvedQuantity,
    BigDecimal approvedBaseQuantity,
    BigDecimal shippedQuantity,
    BigDecimal shippedBaseQuantity,
    BigDecimal receivedQuantity,
    BigDecimal receivedBaseQuantity,
    BigDecimal unitCost,
    String notes
) {}
