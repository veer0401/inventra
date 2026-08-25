package com.inventra.inventra_backend.sales.api.dto;

import com.inventra.inventra_backend.sales.domain.model.Sale;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record InvoiceResponse(
    UUID saleId,
    UUID storeId,
    String invoiceNumber,
    String saleNumber,
    LocalDate invoiceDate,
    String customerName,
    String customerPhone,
    boolean prescriptionRequired,
    BigDecimal subtotal,
    BigDecimal discountAmount,
    BigDecimal taxAmount,
    BigDecimal roundOffAmount,
    BigDecimal totalAmount,
    BigDecimal paidAmount,
    UUID cashierId,
    Instant createdAt,
    List<SaleLineResponse> lines,
    List<SalePaymentResponse> payments
) {
    public static InvoiceResponse from(Sale sale, List<SaleLineResponse> lines, List<SalePaymentResponse> payments) {
        return new InvoiceResponse(
            sale.getId(),
            sale.getStoreId(),
            sale.getInvoiceNumber(),
            sale.getSaleNumber(),
            sale.getSaleDate(),
            sale.getCustomerName(),
            sale.getCustomerPhone(),
            sale.isPrescriptionRequired(),
            sale.getSubtotal(),
            sale.getDiscountAmount(),
            sale.getTaxAmount(),
            sale.getRoundOffAmount(),
            sale.getTotalAmount(),
            sale.getPaidAmount(),
            sale.getCashierId(),
            sale.getCreatedAt(),
            lines,
            payments
        );
    }
}
