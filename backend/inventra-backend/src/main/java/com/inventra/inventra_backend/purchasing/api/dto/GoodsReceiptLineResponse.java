package com.inventra.inventra_backend.purchasing.api.dto;

import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceiptLine;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record GoodsReceiptLineResponse(
    UUID id,
    UUID businessId,
    UUID goodsReceiptId,
    UUID purchaseOrderLineId,
    UUID productId,
    int lineNumber,
    BigDecimal receivedQuantity,
    String purchaseUnit,
    int conversionFactor,
    BigDecimal receivedBaseQuantity,
    BigDecimal rejectedQuantity,
    String batchNumber,
    LocalDate manufacturingDate,
    LocalDate expiryDate,
    BigDecimal unitCost,
    BigDecimal baseUnitCost,
    BigDecimal mrp,
    BigDecimal sellingPrice,
    BigDecimal taxRate,
    BigDecimal taxAmount,
    BigDecimal lineTotal,
    UUID inventoryBatchId
) {
    public static GoodsReceiptLineResponse from(GoodsReceiptLine grl) {
        return new GoodsReceiptLineResponse(
            grl.getId(),
            grl.getBusinessId(),
            grl.getGoodsReceiptId(),
            grl.getPurchaseOrderLineId(),
            grl.getProductId(),
            grl.getLineNumber(),
            grl.getReceivedQuantity(),
            grl.getPurchaseUnit(),
            grl.getConversionFactor(),
            grl.getReceivedBaseQuantity(),
            grl.getRejectedQuantity(),
            grl.getBatchNumber(),
            grl.getManufacturingDate(),
            grl.getExpiryDate(),
            grl.getUnitCost(),
            grl.getBaseUnitCost(),
            grl.getMrp(),
            grl.getSellingPrice(),
            grl.getTaxRate(),
            grl.getTaxAmount(),
            grl.getLineTotal(),
            grl.getInventoryBatchId()
        );
    }
}
