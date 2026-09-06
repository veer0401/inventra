package com.inventra.inventra_backend.purchasing.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseInvoiceLine;
import java.math.BigDecimal;
import java.util.UUID;

public record PurchaseInvoiceLineResponse(
    UUID id,
    UUID businessId,
    UUID purchaseInvoiceId,
    UUID goodsReceiptLineId,
    UUID productId,
    int lineNumber,
    BigDecimal invoicedQuantity,
    BigDecimal unitCost,
    BigDecimal discountAmount,
    BigDecimal taxRate,
    BigDecimal taxAmount,
    BigDecimal lineTotal
) {
    @JsonProperty("unitPrice")
    public BigDecimal unitPrice() {
        return unitCost();
    }

    public static PurchaseInvoiceLineResponse from(PurchaseInvoiceLine pil) {
        return new PurchaseInvoiceLineResponse(
            pil.getId(),
            pil.getBusinessId(),
            pil.getPurchaseInvoiceId(),
            pil.getGoodsReceiptLineId(),
            pil.getProductId(),
            pil.getLineNumber(),
            pil.getInvoicedQuantity(),
            pil.getUnitCost(),
            pil.getDiscountAmount(),
            pil.getTaxRate(),
            pil.getTaxAmount(),
            pil.getLineTotal()
        );
    }
}
