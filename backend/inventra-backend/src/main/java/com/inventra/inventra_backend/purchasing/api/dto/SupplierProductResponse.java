package com.inventra.inventra_backend.purchasing.api.dto;

import com.inventra.inventra_backend.purchasing.domain.model.SupplierProduct;
import com.inventra.inventra_backend.purchasing.domain.model.SupplierProductStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SupplierProductResponse(
    UUID id,
    UUID businessId,
    UUID supplierId,
    UUID productId,
    String supplierProductCode,
    String supplierProductName,
    String purchaseUnit,
    int conversionFactor,
    BigDecimal lastPurchasePrice,
    boolean isPreferred,
    BigDecimal minOrderQuantity,
    Integer leadTimeDays,
    SupplierProductStatus status,
    Instant createdAt,
    Instant updatedAt
) {
    public static SupplierProductResponse from(SupplierProduct sp) {
        return new SupplierProductResponse(
            sp.getId(),
            sp.getBusinessId(),
            sp.getSupplierId(),
            sp.getProductId(),
            sp.getSupplierProductCode(),
            sp.getSupplierProductName(),
            sp.getPurchaseUnit(),
            sp.getConversionFactor(),
            sp.getLastPurchasePrice(),
            sp.isPreferred(),
            sp.getMinOrderQuantity(),
            sp.getLeadTimeDays(),
            sp.getStatus(),
            sp.getCreatedAt(),
            sp.getUpdatedAt()
        );
    }
}
