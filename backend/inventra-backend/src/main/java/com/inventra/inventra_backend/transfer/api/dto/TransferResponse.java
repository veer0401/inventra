package com.inventra.inventra_backend.transfer.api.dto;

import com.inventra.inventra_backend.transfer.domain.model.TransferStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record TransferResponse(
    UUID id,
    UUID businessId,
    UUID sourceStoreId,
    UUID destinationStoreId,
    String transferNumber,
    TransferStatus status,
    UUID requestedBy,
    Instant requestedAt,
    UUID approvedBy,
    Instant approvedAt,
    UUID shippedBy,
    Instant shippedAt,
    UUID receivedBy,
    Instant receivedAt,
    UUID cancelledBy,
    Instant cancelledAt,
    String cancellationReason,
    String rejectionReason,
    LocalDate expectedDeliveryDate,
    String notes,
    List<TransferLineResponse> lines,
    List<TransferLineBatchAllocationResponse> batchAllocations,
    List<TransferReceiptResponse> receipts
) {}
