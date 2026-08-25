package com.inventra.inventra_backend.purchasing.api.dto;

import com.inventra.inventra_backend.purchasing.domain.model.PurchaseInvoice;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseInvoiceStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PurchaseInvoiceResponse(
    UUID id,
    UUID businessId,
    UUID storeId,
    UUID supplierId,
    UUID purchaseOrderId,
    UUID goodsReceiptId,
    String supplierInvoiceNumber,
    LocalDate invoiceDate,
    LocalDate dueDate,
    BigDecimal subtotal,
    BigDecimal taxAmount,
    BigDecimal discountAmount,
    BigDecimal roundOffAmount,
    BigDecimal totalAmount,
    PurchaseInvoiceStatus status,
    Instant postedAt,
    UUID postedBy,
    String notes,
    Long version,
    List<PurchaseInvoiceLineResponse> lines,
    Instant createdAt,
    Instant updatedAt
) {
    public static PurchaseInvoiceResponse from(PurchaseInvoice pi, List<PurchaseInvoiceLineResponse> lines) {
        return new PurchaseInvoiceResponse(
            pi.getId(),
            pi.getBusinessId(),
            pi.getStoreId(),
            pi.getSupplierId(),
            pi.getPurchaseOrderId(),
            pi.getGoodsReceiptId(),
            pi.getSupplierInvoiceNumber(),
            pi.getInvoiceDate(),
            pi.getDueDate(),
            pi.getSubtotal(),
            pi.getTaxAmount(),
            pi.getDiscountAmount(),
            pi.getRoundOffAmount(),
            pi.getTotalAmount(),
            pi.getStatus(),
            pi.getPostedAt(),
            pi.getPostedBy(),
            pi.getNotes(),
            pi.getVersion(),
            lines,
            pi.getCreatedAt(),
            pi.getUpdatedAt()
        );
    }
}
