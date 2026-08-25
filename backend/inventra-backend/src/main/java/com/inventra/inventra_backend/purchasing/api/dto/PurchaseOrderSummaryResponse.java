package com.inventra.inventra_backend.purchasing.api.dto;

import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrder;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrderStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record PurchaseOrderSummaryResponse(
    UUID id,
    UUID businessId,
    UUID storeId,
    UUID supplierId,
    String orderNumber,
    LocalDate orderDate,
    LocalDate expectedDeliveryDate,
    PurchaseOrderStatus status,
    BigDecimal totalAmount,
    int totalLines
) {
    public static PurchaseOrderSummaryResponse from(PurchaseOrder po) {
        return new PurchaseOrderSummaryResponse(
            po.getId(),
            po.getBusinessId(),
            po.getStoreId(),
            po.getSupplierId(),
            po.getOrderNumber(),
            po.getOrderDate(),
            po.getExpectedDeliveryDate(),
            po.getStatus(),
            po.getTotalAmount(),
            po.getLines().size()
        );
    }
}
