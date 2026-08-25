package com.inventra.inventra_backend.purchasing.api.dto;

import com.inventra.inventra_backend.purchasing.domain.model.PurchaseInvoice;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseInvoiceStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record PurchaseInvoiceSummaryResponse(
    UUID id,
    UUID businessId,
    UUID storeId,
    UUID supplierId,
    UUID purchaseOrderId,
    UUID goodsReceiptId,
    String supplierInvoiceNumber,
    LocalDate invoiceDate,
    LocalDate dueDate,
    PurchaseInvoiceStatus status,
    BigDecimal totalAmount,
    int totalLines
) {
    public static PurchaseInvoiceSummaryResponse from(PurchaseInvoice pi) {
        return new PurchaseInvoiceSummaryResponse(
            pi.getId(),
            pi.getBusinessId(),
            pi.getStoreId(),
            pi.getSupplierId(),
            pi.getPurchaseOrderId(),
            pi.getGoodsReceiptId(),
            pi.getSupplierInvoiceNumber(),
            pi.getInvoiceDate(),
            pi.getDueDate(),
            pi.getStatus(),
            pi.getTotalAmount(),
            pi.getLines().size()
        );
    }
}
