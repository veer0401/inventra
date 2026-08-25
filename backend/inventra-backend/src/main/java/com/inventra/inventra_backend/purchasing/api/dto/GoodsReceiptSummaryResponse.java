package com.inventra.inventra_backend.purchasing.api.dto;

import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceipt;
import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceiptStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record GoodsReceiptSummaryResponse(
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
    BigDecimal totalAmount
) {
    public static GoodsReceiptSummaryResponse from(GoodsReceipt gr) {
        return new GoodsReceiptSummaryResponse(
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
            gr.getTotalAmount()
        );
    }
}
