package com.inventra.inventra_backend.purchasing.api.dto;

import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceipt;
import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceiptStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record GoodsReceiptResponse(
    UUID id,
    UUID businessId,
    UUID storeId,
    UUID supplierId,
    UUID purchaseOrderId,
    String receiptNumber,
    String vendorDeliveryNote,
    LocalDate receivedDate,
    GoodsReceiptStatus status,
    int totalItems,
    BigDecimal totalReceivedQuantity,
    BigDecimal totalAmount,
    Instant postedAt,
    UUID postedBy,
    String notes,
    String idempotencyKey,
    Long version,
    List<GoodsReceiptLineResponse> lines,
    Instant createdAt,
    Instant updatedAt
) {
    public static GoodsReceiptResponse from(GoodsReceipt gr, List<GoodsReceiptLineResponse> lines) {
        return new GoodsReceiptResponse(
            gr.getId(),
            gr.getBusinessId(),
            gr.getStoreId(),
            gr.getSupplierId(),
            gr.getPurchaseOrderId(),
            gr.getReceiptNumber(),
            gr.getVendorDeliveryNote(),
            gr.getReceivedDate(),
            gr.getStatus(),
            gr.getTotalItems(),
            gr.getTotalReceivedQuantity(),
            gr.getTotalAmount(),
            gr.getPostedAt(),
            gr.getPostedBy(),
            gr.getNotes(),
            gr.getIdempotencyKey(),
            gr.getVersion(),
            lines,
            gr.getCreatedAt(),
            gr.getUpdatedAt()
        );
    }
}
