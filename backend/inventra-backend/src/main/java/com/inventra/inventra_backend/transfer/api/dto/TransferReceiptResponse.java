package com.inventra.inventra_backend.transfer.api.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record TransferReceiptResponse(
    UUID id,
    UUID storeId,
    UUID transferId,
    String receiptNumber,
    LocalDate receiptDate,
    UUID receivedBy,
    Instant receivedAt,
    String notes,
    List<TransferReceiptLineResponse> lines
) {}
