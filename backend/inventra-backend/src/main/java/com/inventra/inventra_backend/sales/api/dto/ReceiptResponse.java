package com.inventra.inventra_backend.sales.api.dto;

import com.inventra.inventra_backend.sales.domain.model.Sale;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ReceiptResponse(
    UUID saleId,
    UUID storeId,
    String receiptNumber,
    String invoiceNumber,
    LocalDate saleDate,
    String customerName,
    String customerPhone,
    BigDecimal subtotal,
    BigDecimal discountAmount,
    BigDecimal taxAmount,
    BigDecimal roundOffAmount,
    BigDecimal totalAmount,
    BigDecimal paidAmount,
    BigDecimal changeAmount,
    UUID cashierId,
    Instant createdAt,
    List<SaleLineResponse> lines,
    List<SalePaymentResponse> payments
) {
    public static ReceiptResponse from(Sale sale, List<SaleLineResponse> lines, List<SalePaymentResponse> payments) {
        return new ReceiptResponse(
            sale.getId(),
            sale.getStoreId(),
            sale.getSaleNumber(),
            sale.getInvoiceNumber(),
            sale.getSaleDate(),
            sale.getCustomerName(),
            sale.getCustomerPhone(),
            sale.getSubtotal(),
            sale.getDiscountAmount(),
            sale.getTaxAmount(),
            sale.getRoundOffAmount(),
            sale.getTotalAmount(),
            sale.getPaidAmount(),
            sale.getChangeAmount(),
            sale.getCashierId(),
            sale.getCreatedAt(),
            lines,
            payments
        );
    }
}
