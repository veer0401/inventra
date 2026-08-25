package com.inventra.inventra_backend.purchasing.api.dto;

import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrder;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrderStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PurchaseOrderResponse(
    UUID id,
    UUID businessId,
    UUID storeId,
    UUID supplierId,
    String orderNumber,
    LocalDate orderDate,
    LocalDate expectedDeliveryDate,
    PurchaseOrderStatus status,
    BigDecimal subtotal,
    BigDecimal taxAmount,
    BigDecimal discountAmount,
    BigDecimal totalAmount,
    String notes,
    Instant confirmedAt,
    UUID confirmedBy,
    Instant cancelledAt,
    UUID cancelledBy,
    String cancellationReason,
    Long version,
    List<PurchaseOrderLineResponse> lines,
    Instant createdAt,
    Instant updatedAt
) {
    public static PurchaseOrderResponse from(PurchaseOrder po, List<PurchaseOrderLineResponse> lines) {
        return new PurchaseOrderResponse(
            po.getId(),
            po.getBusinessId(),
            po.getStoreId(),
            po.getSupplierId(),
            po.getOrderNumber(),
            po.getOrderDate(),
            po.getExpectedDeliveryDate(),
            po.getStatus(),
            po.getSubtotal(),
            po.getTaxAmount(),
            po.getDiscountAmount(),
            po.getTotalAmount(),
            po.getNotes(),
            po.getConfirmedAt(),
            po.getConfirmedBy(),
            po.getCancelledAt(),
            po.getCancelledBy(),
            po.getCancellationReason(),
            po.getVersion(),
            lines,
            po.getCreatedAt(),
            po.getUpdatedAt()
        );
    }
}
