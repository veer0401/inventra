package com.inventra.inventra_backend.purchasing.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrderLine;
import java.math.BigDecimal;
import java.util.UUID;

public record PurchaseOrderLineResponse(
    UUID id,
    UUID businessId,
    UUID purchaseOrderId,
    UUID productId,
    UUID supplierProductId,
    int lineNumber,
    String purchaseUnit,
    int conversionFactor,
    BigDecimal orderedQuantity,
    BigDecimal orderedBaseQuantity,
    BigDecimal receivedQuantity,
    BigDecimal receivedBaseQuantity,
    BigDecimal unitCost,
    BigDecimal baseUnitCost,
    BigDecimal discountPercentage,
    BigDecimal taxRate,
    BigDecimal taxAmount,
    BigDecimal lineTotal
) {
    @JsonProperty("unitPrice")
    public BigDecimal unitPrice() {
        return unitCost();
    }

    public static PurchaseOrderLineResponse from(PurchaseOrderLine pol) {
        return new PurchaseOrderLineResponse(
            pol.getId(),
            pol.getBusinessId(),
            pol.getPurchaseOrderId(),
            pol.getProductId(),
            pol.getSupplierProductId(),
            pol.getLineNumber(),
            pol.getPurchaseUnit(),
            pol.getConversionFactor(),
            pol.getOrderedQuantity(),
            pol.getOrderedBaseQuantity(),
            pol.getReceivedQuantity(),
            pol.getReceivedBaseQuantity(),
            pol.getUnitCost(),
            pol.getBaseUnitCost(),
            pol.getDiscountPercentage(),
            pol.getTaxRate(),
            pol.getTaxAmount(),
            pol.getLineTotal()
        );
    }
}
