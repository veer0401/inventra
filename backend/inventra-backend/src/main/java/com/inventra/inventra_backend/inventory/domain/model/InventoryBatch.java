package com.inventra.inventra_backend.inventory.domain.model;

import com.inventra.inventra_backend.common.domain.BaseAuditableEntity;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "inventory_batches")
public class InventoryBatch extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "store_id", nullable = false, updatable = false)
    private UUID storeId;

    @Column(name = "product_id", nullable = false, updatable = false)
    private UUID productId;

    @Column(name = "inventory_item_id", nullable = false, updatable = false)
    private UUID inventoryItemId;

    @Column(name = "batch_number", nullable = false, length = 100)
    private String batchNumber;

    @Column(name = "manufacturing_date")
    private LocalDate manufacturingDate;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Column(name = "quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantity;

    @Column(name = "purchase_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal purchasePrice;

    @Column(name = "mrp", nullable = false, precision = 12, scale = 2)
    private BigDecimal mrp;

    @Column(name = "selling_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal sellingPrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private BatchStatus status;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected InventoryBatch() {
        // Required by JPA
    }

    public InventoryBatch(
        UUID businessId,
        UUID storeId,
        UUID productId,
        UUID inventoryItemId,
        String batchNumber,
        LocalDate manufacturingDate,
        LocalDate expiryDate,
        BigDecimal initialQuantity,
        BigDecimal purchasePrice,
        BigDecimal mrp,
        BigDecimal sellingPrice
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.storeId = Objects.requireNonNull(storeId, "storeId must not be null");
        this.productId = Objects.requireNonNull(productId, "productId must not be null");
        this.inventoryItemId = Objects.requireNonNull(inventoryItemId, "inventoryItemId must not be null");
        this.batchNumber = validateBatchNumber(batchNumber);
        this.manufacturingDate = manufacturingDate;
        this.expiryDate = Objects.requireNonNull(expiryDate, "expiryDate must not be null");
        this.quantity = initialQuantity != null ? initialQuantity.setScale(3) : BigDecimal.ZERO.setScale(3);
        validateQuantity(this.quantity);
        this.purchasePrice = purchasePrice != null ? purchasePrice.setScale(2) : BigDecimal.ZERO.setScale(2);
        this.mrp = mrp != null ? mrp.setScale(2) : BigDecimal.ZERO.setScale(2);
        this.sellingPrice = sellingPrice != null ? sellingPrice.setScale(2) : this.mrp;
        validatePrices(this.purchasePrice, this.mrp, this.sellingPrice);
        this.status = this.quantity.compareTo(BigDecimal.ZERO) == 0 ? BatchStatus.DEPLETED : BatchStatus.ACTIVE;
    }

    public void adjustQuantity(BigDecimal delta) {
        if (delta == null) {
            return;
        }
        BigDecimal newQuantity = this.quantity.add(delta).setScale(3);
        if (newQuantity.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessRuleViolationException(
                "INSUFFICIENT_BATCH_STOCK",
                "Batch " + this.batchNumber + " has insufficient stock for delta: " + delta
            );
        }
        this.quantity = newQuantity;
        if (this.quantity.compareTo(BigDecimal.ZERO) == 0 && this.status == BatchStatus.ACTIVE) {
            this.status = BatchStatus.DEPLETED;
        } else if (this.quantity.compareTo(BigDecimal.ZERO) > 0 && this.status == BatchStatus.DEPLETED) {
            this.status = BatchStatus.ACTIVE;
        }
    }

    public void updatePrices(BigDecimal purchasePrice, BigDecimal mrp, BigDecimal sellingPrice) {
        if (purchasePrice != null) {
            this.purchasePrice = purchasePrice.setScale(2);
        }
        if (mrp != null) {
            this.mrp = mrp.setScale(2);
        }
        if (sellingPrice != null) {
            this.sellingPrice = sellingPrice.setScale(2);
        }
        validatePrices(this.purchasePrice, this.mrp, this.sellingPrice);
    }

    public void updateStatus(BatchStatus status) {
        if (status != null) {
            this.status = status;
        }
    }

    private static String validateBatchNumber(String num) {
        if (num == null || num.isBlank()) {
            throw new BusinessRuleViolationException("BATCH_NUMBER_REQUIRED", "Batch number must not be blank");
        }
        return num.trim().toUpperCase();
    }

    private static void validateQuantity(BigDecimal qty) {
        if (qty.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessRuleViolationException("INVALID_BATCH_QUANTITY", "Batch quantity must be non-negative");
        }
    }

    private static void validatePrices(BigDecimal purchasePrice, BigDecimal mrp, BigDecimal sellingPrice) {
        if (purchasePrice.compareTo(BigDecimal.ZERO) < 0 || mrp.compareTo(BigDecimal.ZERO) < 0 || sellingPrice.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessRuleViolationException("INVALID_PRICING", "Prices must be non-negative");
        }
        if (sellingPrice.compareTo(mrp) > 0) {
            throw new BusinessRuleViolationException(
                "SELLING_PRICE_EXCEEDS_MRP",
                "Selling price (" + sellingPrice + ") cannot exceed MRP (" + mrp + ")"
            );
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getBusinessId() {
        return businessId;
    }

    public UUID getStoreId() {
        return storeId;
    }

    public UUID getProductId() {
        return productId;
    }

    public UUID getInventoryItemId() {
        return inventoryItemId;
    }

    public String getBatchNumber() {
        return batchNumber;
    }

    public LocalDate getManufacturingDate() {
        return manufacturingDate;
    }

    public LocalDate getExpiryDate() {
        return expiryDate;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public BigDecimal getPurchasePrice() {
        return purchasePrice;
    }

    public BigDecimal getMrp() {
        return mrp;
    }

    public BigDecimal getSellingPrice() {
        return sellingPrice;
    }

    public BatchStatus getStatus() {
        return status;
    }

    public Long getVersion() {
        return version;
    }
}
