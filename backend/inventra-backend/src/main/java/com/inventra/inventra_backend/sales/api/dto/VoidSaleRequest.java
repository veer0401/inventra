package com.inventra.inventra_backend.sales.api.dto;

import jakarta.validation.constraints.NotBlank;

public record VoidSaleRequest(
    @NotBlank(message = "Void reason is required")
    String reason
) {
}
