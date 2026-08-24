package com.inventra.inventra_backend.catalog.api.dto;

import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.model.ProductStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ProductResponse(
    UUID id,
    UUID businessId,
    UUID categoryId,
    UUID globalProductId,
    String name,
    String genericName,
    String brandName,
    String manufacturer,
    DosageForm dosageForm,
    String strength,
    String baseUnit,
    String sellingUnit,
    int unitsPerSellingUnit,
    String hsnCode,
    BigDecimal taxRate,
    boolean isTaxInclusive,
    boolean prescriptionRequired,
    ProductStatus status,
    List<ProductIdentifierResponse> identifiers,
    Instant createdAt,
    Instant updatedAt
) {
    public static ProductResponse from(Product product, List<ProductIdentifierResponse> identifiers) {
        return new ProductResponse(
            product.getId(),
            product.getBusinessId(),
            product.getCategoryId(),
            product.getGlobalProductId(),
            product.getName(),
            product.getGenericName(),
            product.getBrandName(),
            product.getManufacturer(),
            product.getDosageForm(),
            product.getStrength(),
            product.getBaseUnit(),
            product.getSellingUnit(),
            product.getUnitsPerSellingUnit(),
            product.getHsnCode(),
            product.getTaxRate(),
            product.isTaxInclusive(),
            product.isPrescriptionRequired(),
            product.getStatus(),
            identifiers != null ? identifiers : List.of(),
            product.getCreatedAt(),
            product.getUpdatedAt()
        );
    }
}
