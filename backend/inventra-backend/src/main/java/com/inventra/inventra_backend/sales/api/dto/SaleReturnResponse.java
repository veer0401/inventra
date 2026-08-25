package com.inventra.inventra_backend.sales.api.dto;

import com.inventra.inventra_backend.sales.domain.model.SaleReturn;
import com.inventra.inventra_backend.sales.domain.model.SaleReturnStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record SaleReturnResponse(
    UUID id,
    UUID storeId,
    UUID saleId,
    String returnNumber,
    SaleReturnStatus status,
    LocalDate returnDate,
    BigDecimal subtotal,
    BigDecimal taxAmount,
    BigDecimal discountAmount,
    BigDecimal roundOffAmount,
    BigDecimal totalRefundAmount,
    String reason,
    UUID returnedBy,
    UUID deviceId,
    String idempotencyKey,
    Instant createdAt,
    List<SaleReturnLineResponse> lines,
    List<SaleRefundResponse> refunds
) {
    public static SaleReturnResponse from(SaleReturn ret, List<SaleReturnLineResponse> lines, List<SaleRefundResponse> refunds) {
        return new SaleReturnResponse(
            ret.getId(),
            ret.getStoreId(),
            ret.getSaleId(),
            ret.getReturnNumber(),
            ret.getStatus(),
            ret.getReturnDate(),
            ret.getSubtotal(),
            ret.getTaxAmount(),
            ret.getDiscountAmount(),
            ret.getRoundOffAmount(),
            ret.getTotalRefundAmount(),
            ret.getReason(),
            ret.getReturnedBy(),
            ret.getDeviceId(),
            ret.getIdempotencyKey(),
            ret.getCreatedAt(),
            lines,
            refunds
        );
    }
}
