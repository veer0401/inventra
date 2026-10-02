package com.inventra.inventra_backend.catalog.api.dto;

import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.model.ProductStatus;
import java.math.BigDecimal;
import java.util.UUID;

public record ProductSummaryResponse(
    UUID id,
    String name,
    String genericName,
    String brandName,
    String manufacturer,
    DosageForm dosageForm,
    String strength,
    String baseUnit,
    String sellingUnit,
    int unitsPerSellingUnit,
    BigDecimal taxRate,
    boolean prescriptionRequired,
    ProductStatus status,
    UUID inventoryItemId,
    BigDecimal currentStock
) {
    public static ProductSummaryResponse from(Product product) {
        return from(product, null, null);
    }

    public static ProductSummaryResponse from(Product product, UUID inventoryItemId, BigDecimal currentStock) {
        return new ProductSummaryResponse(
            product.getId(),
            product.getName(),
            product.getGenericName(),
            product.getBrandName(),
            product.getManufacturer(),
            product.getDosageForm(),
            product.getStrength(),
            product.getBaseUnit(),
            product.getSellingUnit(),
            product.getUnitsPerSellingUnit(),
            product.getTaxRate(),
            product.isPrescriptionRequired(),
            product.getStatus(),
            inventoryItemId,
            currentStock
        );
    }
}
