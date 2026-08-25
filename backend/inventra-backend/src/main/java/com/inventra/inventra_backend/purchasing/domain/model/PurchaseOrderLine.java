package com.inventra.inventra_backend.purchasing.domain.model;

import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "purchase_order_lines")
public class PurchaseOrderLine {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "purchase_order_id", nullable = false)
    private UUID purchaseOrderId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "supplier_product_id")
    private UUID supplierProductId;

    @Column(name = "line_number", nullable = false)
    private int lineNumber;

    @Column(name = "purchase_unit", nullable = false, length = 50)
    private String purchaseUnit;

    @Column(name = "conversion_factor", nullable = false)
    private int conversionFactor = 1;

    @Column(name = "ordered_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal orderedQuantity;

    @Column(name = "ordered_base_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal orderedBaseQuantity;

    @Column(name = "received_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal receivedQuantity = BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);

    @Column(name = "received_base_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal receivedBaseQuantity = BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);

    @Column(name = "unit_cost", nullable = false, precision = 14, scale = 4)
    private BigDecimal unitCost;

    @Column(name = "base_unit_cost", nullable = false, precision = 14, scale = 4)
    private BigDecimal baseUnitCost;

    @Column(name = "discount_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal discountPercentage = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    @Column(name = "tax_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal taxRate = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    @Column(name = "tax_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal taxAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "line_total", nullable = false, precision = 14, scale = 4)
    private BigDecimal lineTotal;

    protected PurchaseOrderLine() {
        // Required by JPA
    }

    public PurchaseOrderLine(
        UUID businessId,
        UUID purchaseOrderId,
        UUID productId,
        UUID supplierProductId,
        int lineNumber,
        String purchaseUnit,
        int conversionFactor,
        BigDecimal orderedQuantity,
        BigDecimal unitCost,
        BigDecimal discountPercentage,
        BigDecimal taxRate
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.purchaseOrderId = Objects.requireNonNull(purchaseOrderId, "purchaseOrderId must not be null");
        this.productId = Objects.requireNonNull(productId, "productId must not be null");
        this.supplierProductId = supplierProductId;
        this.lineNumber = lineNumber;
        this.purchaseUnit = Objects.requireNonNull(purchaseUnit, "purchaseUnit must not be null").trim();
        this.conversionFactor = conversionFactor >= 1 ? conversionFactor : 1;
        this.orderedQuantity = Objects.requireNonNull(orderedQuantity, "orderedQuantity must not be null");
        this.orderedBaseQuantity = this.orderedQuantity.multiply(BigDecimal.valueOf(this.conversionFactor)).setScale(3, RoundingMode.HALF_UP);
        this.unitCost = Objects.requireNonNull(unitCost, "unitCost must not be null");
        this.baseUnitCost = this.unitCost.divide(BigDecimal.valueOf(this.conversionFactor), 4, RoundingMode.HALF_UP);
        this.discountPercentage = discountPercentage != null ? discountPercentage : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        this.taxRate = taxRate != null ? taxRate : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        this.receivedQuantity = BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);
        this.receivedBaseQuantity = BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);
        calculateLineTotal();
    }

    public void calculateLineTotal() {
        BigDecimal gross = this.orderedQuantity.multiply(this.unitCost);
        BigDecimal discount = gross.multiply(this.discountPercentage).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        BigDecimal net = gross.subtract(discount);
        this.taxAmount = net.multiply(this.taxRate).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        this.lineTotal = net.add(this.taxAmount).setScale(4, RoundingMode.HALF_UP);
    }

    public void recordReceipt(BigDecimal qtyInPurchaseUnits) {
        if (qtyInPurchaseUnits == null || qtyInPurchaseUnits.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Received quantity must be greater than zero");
        }
        BigDecimal newReceived = this.receivedQuantity.add(qtyInPurchaseUnits).setScale(3, RoundingMode.HALF_UP);
        if (newReceived.compareTo(this.orderedQuantity) > 0) {
            throw new IllegalArgumentException("Received quantity cannot exceed ordered quantity");
        }
        this.receivedQuantity = newReceived;
        this.receivedBaseQuantity = this.receivedQuantity.multiply(BigDecimal.valueOf(this.conversionFactor)).setScale(3, RoundingMode.HALF_UP);
    }

    public boolean isFullyReceived() {
        return this.receivedQuantity.compareTo(this.orderedQuantity) >= 0;
    }

    public UUID getId() {
        return id;
    }

    public UUID getBusinessId() {
        return businessId;
    }

    public UUID getPurchaseOrderId() {
        return purchaseOrderId;
    }

    public UUID getProductId() {
        return productId;
    }

    public UUID getSupplierProductId() {
        return supplierProductId;
    }

    public int getLineNumber() {
        return lineNumber;
    }

    public String getPurchaseUnit() {
        return purchaseUnit;
    }

    public int getConversionFactor() {
        return conversionFactor;
    }

    public BigDecimal getOrderedQuantity() {
        return orderedQuantity;
    }

    public BigDecimal getOrderedBaseQuantity() {
        return orderedBaseQuantity;
    }

    public BigDecimal getReceivedQuantity() {
        return receivedQuantity;
    }

    public BigDecimal getReceivedBaseQuantity() {
        return receivedBaseQuantity;
    }

    public BigDecimal getUnitCost() {
        return unitCost;
    }

    public BigDecimal getBaseUnitCost() {
        return baseUnitCost;
    }

    public BigDecimal getDiscountPercentage() {
        return discountPercentage;
    }

    public BigDecimal getTaxRate() {
        return taxRate;
    }

    public BigDecimal getTaxAmount() {
        return taxAmount;
    }

    public BigDecimal getLineTotal() {
        return lineTotal;
    }
}
