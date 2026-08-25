package com.inventra.inventra_backend.transfer.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateTransferRequest(
    @NotNull(message = "sourceStoreId is required")
    UUID sourceStoreId,

    @NotNull(message = "destinationStoreId is required")
    UUID destinationStoreId,

    LocalDate expectedDeliveryDate,

    String idempotencyKey,

    String notes,

    @NotEmpty(message = "lines must not be empty")
    @Valid
    List<CreateTransferLineRequest> lines
) {}
