package com.inventra.inventra_backend.transfer.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record TransferReceiptLineResponse(
    UUID id,
    UUID transferLineId,
    UUID transferLineBatchAllocationId,
    UUID destinationBatchId,
    UUID productId,
    BigDecimal receivedBaseQuantity
) {}
