package com.inventra.inventra_backend.sales.api.dto;

import com.inventra.inventra_backend.sales.domain.model.SaleLine;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record SaleLineResponse(
    UUID id,
    UUID productId,
    Integer lineNumber,
    String productName,
    String genericName,
    String dosageForm,
    String strength,
    String sellingUnit,
    Integer conversionFactor,
    BigDecimal quantity,
    BigDecimal baseQuantity,
    BigDecimal unitPrice,
    BigDecimal grossAmount,
    BigDecimal discountPercentage,
    BigDecimal discountAmount,
    BigDecimal allocatedBillDiscount,
    BigDecimal taxRate,
    BigDecimal taxAmount,
    BigDecimal lineTotal,
    BigDecimal returnedQuantity,
    List<SaleLineBatchAllocationResponse> batchAllocations
) {
    public static SaleLineResponse from(SaleLine line, List<SaleLineBatchAllocationResponse> allocations) {
        return new SaleLineResponse(
            line.getId(),
            line.getProductId(),
            line.getLineNumber(),
            line.getProductName(),
            line.getGenericName(),
            line.getDosageForm(),
            line.getStrength(),
            line.getSellingUnit(),
            line.getConversionFactor(),
            line.getQuantity(),
            line.getBaseQuantity(),
            line.getUnitPrice(),
            line.getGrossAmount(),
            line.getDiscountPercentage(),
            line.getDiscountAmount(),
            line.getAllocatedBillDiscount(),
            line.getTaxRate(),
            line.getTaxAmount(),
            line.getLineTotal(),
            line.getReturnedQuantity(),
            allocations
        );
    }
}
