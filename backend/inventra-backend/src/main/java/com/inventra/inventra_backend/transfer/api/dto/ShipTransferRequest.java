package com.inventra.inventra_backend.transfer.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record ShipTransferRequest(
    String shipIdempotencyKey,
    String notes,
    @NotEmpty(message = "lines must not be empty")
    @Valid
    List<ShipTransferLineRequest> lines
) {}
