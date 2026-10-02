package com.inventra.inventra_backend.inventory.domain.model;

import com.inventra.inventra_backend.common.domain.BaseAuditableEntity;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "inventory_items")
public class InventoryItem extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "store_id", nullable = false, updatable = false)
    private UUID storeId;

    @Column(name = "product_id", nullable = false, updatable = false)
    private UUID productId;

    @Column(name = "current_stock", nullable = false, precision = 12, scale = 3)
    private BigDecimal currentStock;

    @Column(name = "reorder_level", nullable = false, precision = 12, scale = 3)
    private BigDecimal reorderLevel;

    @Column(name = "reorder_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal reorderQuantity;

    @Column(name = "min_stock", nullable = false, precision = 12, scale = 3)
    private BigDecimal minStock;

    @Column(name = "max_stock", precision = 12, scale = 3)
    private BigDecimal maxStock;

    @Column(name = "location_rack", length = 50)
    private String locationRack;

    @Column(name = "is_batch_tracked", nullable = false)
    private boolean isBatchTracked;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected InventoryItem() {
        // Required by JPA
    }

    public InventoryItem(
        UUID businessId,
        UUID storeId,
        UUID productId,
        BigDecimal reorderLevel,
        BigDecimal reorderQuantity,
        BigDecimal minStock,
        BigDecimal maxStock,
        String locationRack,
        Boolean isBatchTracked
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.storeId = Objects.requireNonNull(storeId, "storeId must not be null");
        this.productId = Objects.requireNonNull(productId, "productId must not be null");
        this.currentStock = BigDecimal.ZERO.setScale(3);
        this.reorderLevel = reorderLevel != null ? reorderLevel.setScale(3, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(3);
        this.reorderQuantity = reorderQuantity != null ? reorderQuantity.setScale(3, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(3);
        this.minStock = minStock != null ? minStock.setScale(3, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(3);
        this.maxStock = maxStock != null ? maxStock.setScale(3, RoundingMode.HALF_UP) : null;
        this.locationRack = locationRack != null ? locationRack.trim() : null;
        this.isBatchTracked = isBatchTracked != null ? isBatchTracked : false;
    }

    public void adjustStock(BigDecimal delta) {
        if (delta == null) {
            return;
        }
        BigDecimal newStock = this.currentStock.add(delta).setScale(3, RoundingMode.HALF_UP);
        if (newStock.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessRuleViolationException(
                "INSUFFICIENT_STOCK",
                "Operation would result in negative stock: " + newStock
            );
        }
        this.currentStock = newStock;
    }

    public void setStock(BigDecimal newStock) {
        if (newStock == null || newStock.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessRuleViolationException(
                "INVALID_STOCK_QUANTITY",
                "Stock quantity must be non-negative"
            );
        }
        this.currentStock = newStock.setScale(3, RoundingMode.HALF_UP);
    }

    public void updateSettings(
        BigDecimal reorderLevel,
        BigDecimal reorderQuantity,
        BigDecimal minStock,
        BigDecimal maxStock,
        String locationRack,
        Boolean isBatchTracked
    ) {
        if (reorderLevel != null) {
            this.reorderLevel = reorderLevel.setScale(3, RoundingMode.HALF_UP);
        }
        if (reorderQuantity != null) {
            this.reorderQuantity = reorderQuantity.setScale(3, RoundingMode.HALF_UP);
        }
        if (minStock != null) {
            this.minStock = minStock.setScale(3, RoundingMode.HALF_UP);
        }
        if (maxStock != null) {
            this.maxStock = maxStock.setScale(3, RoundingMode.HALF_UP);
        }
        if (locationRack != null) {
            this.locationRack = locationRack.trim();
        }
        if (isBatchTracked != null) {
            this.isBatchTracked = isBatchTracked;
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

    public BigDecimal getCurrentStock() {
        return currentStock;
    }

    public BigDecimal getReorderLevel() {
        return reorderLevel;
    }

    public BigDecimal getReorderQuantity() {
        return reorderQuantity;
    }

    public BigDecimal getMinStock() {
        return minStock;
    }

    public BigDecimal getMaxStock() {
        return maxStock;
    }

    public String getLocationRack() {
        return locationRack;
    }

    public boolean isBatchTracked() {
        return isBatchTracked;
    }

    public Long getVersion() {
        return version;
    }
}
