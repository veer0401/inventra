package com.inventra.inventra_backend.sales.api.dto;

import com.inventra.inventra_backend.sales.domain.model.RefundMethod;
import com.inventra.inventra_backend.sales.domain.model.SaleRefund;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SaleRefundResponse(
    UUID id,
    RefundMethod refundMethod,
    BigDecimal amount,
    String transactionReference,
    Instant refundedAt,
    UUID refundedBy,
    String notes
) {
    public static SaleRefundResponse from(SaleRefund refund) {
        return new SaleRefundResponse(
            refund.getId(),
            refund.getRefundMethod(),
            refund.getAmount(),
            refund.getTransactionReference(),
            refund.getRefundedAt(),
            refund.getRefundedBy(),
            refund.getNotes()
        );
    }
}
