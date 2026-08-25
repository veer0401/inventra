package com.inventra.inventra_backend.transfer.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record ReceiveTransferLineRequest(
    @NotNull(message = "transferLineId is required")
    UUID transferLineId,

    @NotEmpty(message = "batchAllocations must not be empty")
    @Valid
    List<ReceiveTransferBatchAllocationRequest> batchAllocations
) {}
