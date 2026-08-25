package com.inventra.inventra_backend.sales.domain.model;

import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "sale_line_batch_allocations")
public class SaleLineBatchAllocation {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "store_id", nullable = false, updatable = false)
    private UUID storeId;

    @Column(name = "sale_id", nullable = false, updatable = false)
    private UUID saleId;

    @Column(name = "sale_line_id", nullable = false, updatable = false)
    private UUID saleLineId;

    @Column(name = "batch_id", nullable = false, updatable = false)
    private UUID batchId;

    @Column(name = "product_id", nullable = false, updatable = false)
    private UUID productId;

    @Column(name = "batch_number", nullable = false, length = 100)
    private String batchNumber;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Column(name = "allocated_base_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal allocatedBaseQuantity;

    @Column(name = "unit_cost", nullable = false, precision = 14, scale = 4)
    private BigDecimal unitCost;

    @Column(name = "mrp", precision = 14, scale = 4)
    private BigDecimal mrp;

    @Column(name = "selling_price", precision = 14, scale = 4)
    private BigDecimal sellingPrice;

    @Column(name = "returned_base_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal returnedBaseQuantity = BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected SaleLineBatchAllocation() {
    }

    public SaleLineBatchAllocation(
        UUID businessId,
        UUID storeId,
        UUID saleId,
        UUID saleLineId,
        UUID batchId,
        UUID productId,
        String batchNumber,
        LocalDate expiryDate,
        BigDecimal allocatedBaseQuantity,
        BigDecimal unitCost,
        BigDecimal mrp,
        BigDecimal sellingPrice
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId is required");
        this.storeId = Objects.requireNonNull(storeId, "storeId is required");
        this.saleId = Objects.requireNonNull(saleId, "saleId is required");
        this.saleLineId = Objects.requireNonNull(saleLineId, "saleLineId is required");
        this.batchId = Objects.requireNonNull(batchId, "batchId is required");
        this.productId = Objects.requireNonNull(productId, "productId is required");
        this.batchNumber = Objects.requireNonNull(batchNumber, "batchNumber is required").trim();
        this.expiryDate = Objects.requireNonNull(expiryDate, "expiryDate is required");
        this.allocatedBaseQuantity = Objects.requireNonNull(allocatedBaseQuantity, "allocatedBaseQuantity is required").setScale(3, RoundingMode.HALF_UP);
        this.unitCost = Objects.requireNonNull(unitCost, "unitCost is required").setScale(4, RoundingMode.HALF_UP);
        this.mrp = mrp != null ? mrp.setScale(4, RoundingMode.HALF_UP) : null;
        this.sellingPrice = sellingPrice != null ? sellingPrice.setScale(4, RoundingMode.HALF_UP) : null;
        this.returnedBaseQuantity = BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);
        this.createdAt = Instant.now();
    }

    public void addReturnedBaseQuantity(BigDecimal qty) {
        if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Returned base quantity must be positive");
        }
        BigDecimal newReturned = this.returnedBaseQuantity.add(qty);
        if (newReturned.compareTo(this.allocatedBaseQuantity) > 0) {
            throw new IllegalArgumentException("Returned base quantity cannot exceed allocated base quantity");
        }
        this.returnedBaseQuantity = newReturned.setScale(3, RoundingMode.HALF_UP);
    }

    public BigDecimal getRemainingReturnableBaseQuantity() {
        return this.allocatedBaseQuantity.subtract(this.returnedBaseQuantity).setScale(3, RoundingMode.HALF_UP);
    }

    public UUID getId() { return id; }
    public UUID getBusinessId() { return businessId; }
    public UUID getStoreId() { return storeId; }
    public UUID getSaleId() { return saleId; }
    public UUID getSaleLineId() { return saleLineId; }
    public UUID getBatchId() { return batchId; }
    public UUID getProductId() { return productId; }
    public String getBatchNumber() { return batchNumber; }
    public LocalDate getExpiryDate() { return expiryDate; }
    public BigDecimal getAllocatedBaseQuantity() { return allocatedBaseQuantity; }
    public BigDecimal getUnitCost() { return unitCost; }
    public BigDecimal getMrp() { return mrp; }
    public BigDecimal getSellingPrice() { return sellingPrice; }
    public BigDecimal getReturnedBaseQuantity() { return returnedBaseQuantity; }
    public Instant getCreatedAt() { return createdAt; }
}
