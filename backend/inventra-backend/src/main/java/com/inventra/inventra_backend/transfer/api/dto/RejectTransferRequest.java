package com.inventra.inventra_backend.transfer.api.dto;

import jakarta.validation.constraints.NotBlank;

public record RejectTransferRequest(
    @NotBlank(message = "reason is required")
    String reason
) {}
