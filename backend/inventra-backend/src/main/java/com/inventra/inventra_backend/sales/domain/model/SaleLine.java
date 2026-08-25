package com.inventra.inventra_backend.sales.domain.model;

import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "sale_lines")
public class SaleLine {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "sale_id", nullable = false, updatable = false)
    private UUID saleId;

    @Column(name = "product_id", nullable = false, updatable = false)
    private UUID productId;

    @Column(name = "line_number", nullable = false)
    private Integer lineNumber;

    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    @Column(name = "generic_name", length = 255)
    private String genericName;

    @Column(name = "dosage_form", length = 50)
    private String dosageForm;

    @Column(name = "strength", length = 50)
    private String strength;

    @Column(name = "selling_unit", nullable = false, length = 50)
    private String sellingUnit;

    @Column(name = "conversion_factor", nullable = false)
    private Integer conversionFactor = 1;

    @Column(name = "quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantity;

    @Column(name = "base_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal baseQuantity;

    @Column(name = "unit_price", nullable = false, precision = 14, scale = 4)
    private BigDecimal unitPrice;

    @Column(name = "gross_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal grossAmount;

    @Column(name = "discount_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal discountPercentage = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    @Column(name = "discount_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal discountAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "allocated_bill_discount", nullable = false, precision = 14, scale = 4)
    private BigDecimal allocatedBillDiscount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "tax_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal taxRate = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    @Column(name = "tax_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal taxAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "line_total", nullable = false, precision = 14, scale = 4)
    private BigDecimal lineTotal;

    @Column(name = "returned_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal returnedQuantity = BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected SaleLine() {
    }

    public SaleLine(
        UUID businessId,
        UUID saleId,
        UUID productId,
        Integer lineNumber,
        String productName,
        String genericName,
        String dosageForm,
        String strength,
        String sellingUnit,
        Integer conversionFactor,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal discountPercentage,
        BigDecimal taxRate
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId is required");
        this.saleId = Objects.requireNonNull(saleId, "saleId is required");
        this.productId = Objects.requireNonNull(productId, "productId is required");
        this.lineNumber = Objects.requireNonNull(lineNumber, "lineNumber is required");
        this.productName = Objects.requireNonNull(productName, "productName is required").trim();
        this.genericName = genericName != null ? genericName.trim() : null;
        this.dosageForm = dosageForm != null ? dosageForm.trim() : null;
        this.strength = strength != null ? strength.trim() : null;
        this.sellingUnit = Objects.requireNonNull(sellingUnit, "sellingUnit is required").trim();
        this.conversionFactor = conversionFactor != null && conversionFactor >= 1 ? conversionFactor : 1;
        this.quantity = Objects.requireNonNull(quantity, "quantity is required").setScale(3, RoundingMode.HALF_UP);
        this.baseQuantity = this.quantity.multiply(BigDecimal.valueOf(this.conversionFactor)).setScale(3, RoundingMode.HALF_UP);
        this.unitPrice = Objects.requireNonNull(unitPrice, "unitPrice is required").setScale(4, RoundingMode.HALF_UP);
        this.discountPercentage = discountPercentage != null ? discountPercentage.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        this.taxRate = taxRate != null ? taxRate.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        this.allocatedBillDiscount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        this.returnedQuantity = BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);
        this.createdAt = Instant.now();

        recalculateAmounts();
    }

    public void setAllocatedBillDiscount(BigDecimal allocatedDiscount) {
        this.allocatedBillDiscount = allocatedDiscount != null ? allocatedDiscount.setScale(4, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        recalculateAmounts();
    }

    public void recalculateAmounts() {
        this.grossAmount = this.quantity.multiply(this.unitPrice).setScale(4, RoundingMode.HALF_UP);
        this.discountAmount = this.grossAmount.multiply(this.discountPercentage)
            .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        BigDecimal netBeforeTax = this.grossAmount.subtract(this.discountAmount).subtract(this.allocatedBillDiscount);
        if (netBeforeTax.compareTo(BigDecimal.ZERO) < 0) {
            netBeforeTax = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }
        this.taxAmount = netBeforeTax.multiply(this.taxRate)
            .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        this.lineTotal = netBeforeTax.add(this.taxAmount).setScale(4, RoundingMode.HALF_UP);
    }

    public void addReturnedQuantity(BigDecimal qty) {
        if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Returned quantity must be positive");
        }
        BigDecimal newReturned = this.returnedQuantity.add(qty);
        if (newReturned.compareTo(this.quantity) > 0) {
            throw new IllegalArgumentException("Returned quantity cannot exceed sold quantity");
        }
        this.returnedQuantity = newReturned.setScale(3, RoundingMode.HALF_UP);
    }

    public BigDecimal getNetLineAmountBeforeBillDiscount() {
        return this.grossAmount.subtract(this.discountAmount).setScale(4, RoundingMode.HALF_UP);
    }

    public BigDecimal getRemainingReturnableQuantity() {
        return this.quantity.subtract(this.returnedQuantity).setScale(3, RoundingMode.HALF_UP);
    }

    public UUID getId() { return id; }
    public UUID getBusinessId() { return businessId; }
    public UUID getSaleId() { return saleId; }
    public UUID getProductId() { return productId; }
    public Integer getLineNumber() { return lineNumber; }
    public String getProductName() { return productName; }
    public String getGenericName() { return genericName; }
    public String getDosageForm() { return dosageForm; }
    public String getStrength() { return strength; }
    public String getSellingUnit() { return sellingUnit; }
    public Integer getConversionFactor() { return conversionFactor; }
    public BigDecimal getQuantity() { return quantity; }
    public BigDecimal getBaseQuantity() { return baseQuantity; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public BigDecimal getGrossAmount() { return grossAmount; }
    public BigDecimal getDiscountPercentage() { return discountPercentage; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public BigDecimal getAllocatedBillDiscount() { return allocatedBillDiscount; }
    public BigDecimal getTaxRate() { return taxRate; }
    public BigDecimal getTaxAmount() { return taxAmount; }
    public BigDecimal getLineTotal() { return lineTotal; }
    public BigDecimal getReturnedQuantity() { return returnedQuantity; }
    public Instant getCreatedAt() { return createdAt; }
}
