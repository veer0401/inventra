package com.inventra.inventra_backend.sales.api.dto;

import com.inventra.inventra_backend.sales.domain.model.Sale;
import com.inventra.inventra_backend.sales.domain.model.SaleStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record SaleResponse(
    UUID id,
    UUID storeId,
    String saleNumber,
    String invoiceNumber,
    SaleStatus status,
    LocalDate saleDate,
    String customerName,
    String customerPhone,
    boolean prescriptionRequired,
    BigDecimal subtotal,
    BigDecimal taxAmount,
    BigDecimal discountAmount,
    BigDecimal roundOffAmount,
    BigDecimal totalAmount,
    BigDecimal paidAmount,
    BigDecimal changeAmount,
    UUID cashierId,
    UUID deviceId,
    String idempotencyKey,
    String notes,
    Instant voidedAt,
    UUID voidedBy,
    String voidReason,
    Instant createdAt,
    List<SaleLineResponse> lines,
    List<SalePaymentResponse> payments
) {
    public static SaleResponse from(Sale sale, List<SaleLineResponse> lines, List<SalePaymentResponse> payments) {
        return new SaleResponse(
            sale.getId(),
            sale.getStoreId(),
            sale.getSaleNumber(),
            sale.getInvoiceNumber(),
            sale.getStatus(),
            sale.getSaleDate(),
            sale.getCustomerName(),
            sale.getCustomerPhone(),
            sale.isPrescriptionRequired(),
            sale.getSubtotal(),
            sale.getTaxAmount(),
            sale.getDiscountAmount(),
            sale.getRoundOffAmount(),
            sale.getTotalAmount(),
            sale.getPaidAmount(),
            sale.getChangeAmount(),
            sale.getCashierId(),
            sale.getDeviceId(),
            sale.getIdempotencyKey(),
            sale.getNotes(),
            sale.getVoidedAt(),
            sale.getVoidedBy(),
            sale.getVoidReason(),
            sale.getCreatedAt(),
            lines,
            payments
        );
    }
}
