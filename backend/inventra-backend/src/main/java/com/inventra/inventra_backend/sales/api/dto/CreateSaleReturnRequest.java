package com.inventra.inventra_backend.sales.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.time.LocalDate;
import java.util.List;

public record CreateSaleReturnRequest(
    LocalDate returnDate,

    @NotBlank(message = "Return reason is required")
    String reason,

    String idempotencyKey,

    @NotEmpty(message = "Return must contain at least one line item")
    List<@Valid CreateSaleReturnLineRequest> lines,

    @NotEmpty(message = "Return must contain at least one refund record")
    List<@Valid CreateSaleRefundRequest> refunds
) {
}
