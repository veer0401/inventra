package com.inventra.inventra_backend.purchasing.api.dto;

import jakarta.validation.constraints.Size;

public record CancelOrderRequest(
    @Size(max = 500, message = "Cancellation reason cannot exceed 500 characters")
    String reason
) {}
