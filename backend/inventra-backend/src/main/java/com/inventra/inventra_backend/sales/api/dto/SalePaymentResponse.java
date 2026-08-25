package com.inventra.inventra_backend.sales.api.dto;

import com.inventra.inventra_backend.sales.domain.model.PaymentMethod;
import com.inventra.inventra_backend.sales.domain.model.PaymentStatus;
import com.inventra.inventra_backend.sales.domain.model.SalePayment;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SalePaymentResponse(
    UUID id,
    PaymentMethod paymentMethod,
    BigDecimal amount,
    BigDecimal tenderedAmount,
    BigDecimal changeAmount,
    String transactionReference,
    PaymentStatus status,
    Instant paidAt,
    String notes
) {
    public static SalePaymentResponse from(SalePayment p) {
        return new SalePaymentResponse(
            p.getId(),
            p.getPaymentMethod(),
            p.getAmount(),
            p.getTenderedAmount(),
            p.getChangeAmount(),
            p.getTransactionReference(),
            p.getStatus(),
            p.getPaidAt(),
            p.getNotes()
        );
    }
}
