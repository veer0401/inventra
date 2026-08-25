package com.inventra.inventra_backend.transfer.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record ReceiveTransferRequest(
    String idempotencyKey,
    String notes,
    @NotEmpty(message = "lines must not be empty")
    @Valid
    List<ReceiveTransferLineRequest> lines
) {}
