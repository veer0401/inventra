package com.inventra.inventra_backend.sales.domain.model;

import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "sale_return_line_batch_allocations")
public class SaleReturnLineBatchAllocation {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "store_id", nullable = false, updatable = false)
    private UUID storeId;

    @Column(name = "sale_return_id", nullable = false, updatable = false)
    private UUID saleReturnId;

    @Column(name = "sale_return_line_id", nullable = false, updatable = false)
    private UUID saleReturnLineId;

    @Column(name = "sale_line_batch_allocation_id", nullable = false, updatable = false)
    private UUID saleLineBatchAllocationId;

    @Column(name = "batch_id", nullable = false, updatable = false)
    private UUID batchId;

    @Column(name = "product_id", nullable = false, updatable = false)
    private UUID productId;

    @Column(name = "returned_base_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal returnedBaseQuantity;

    @Enumerated(EnumType.STRING)
    @Column(name = "stock_condition", nullable = false, length = 30)
    private StockCondition stockCondition = StockCondition.RESTOCKABLE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected SaleReturnLineBatchAllocation() {
    }

    public SaleReturnLineBatchAllocation(
        UUID businessId,
        UUID storeId,
        UUID saleReturnId,
        UUID saleReturnLineId,
        UUID saleLineBatchAllocationId,
        UUID batchId,
        UUID productId,
        BigDecimal returnedBaseQuantity,
        StockCondition stockCondition
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId is required");
        this.storeId = Objects.requireNonNull(storeId, "storeId is required");
        this.saleReturnId = Objects.requireNonNull(saleReturnId, "saleReturnId is required");
        this.saleReturnLineId = Objects.requireNonNull(saleReturnLineId, "saleReturnLineId is required");
        this.saleLineBatchAllocationId = Objects.requireNonNull(saleLineBatchAllocationId, "saleLineBatchAllocationId is required");
        this.batchId = Objects.requireNonNull(batchId, "batchId is required");
        this.productId = Objects.requireNonNull(productId, "productId is required");
        this.returnedBaseQuantity = Objects.requireNonNull(returnedBaseQuantity, "returnedBaseQuantity is required").setScale(3, RoundingMode.HALF_UP);
        if (this.returnedBaseQuantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Returned base quantity must be positive");
        }
        this.stockCondition = stockCondition != null ? stockCondition : StockCondition.RESTOCKABLE;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getBusinessId() { return businessId; }
    public UUID getStoreId() { return storeId; }
    public UUID getSaleReturnId() { return saleReturnId; }
    public UUID getSaleReturnLineId() { return saleReturnLineId; }
    public UUID getSaleLineBatchAllocationId() { return saleLineBatchAllocationId; }
    public UUID getBatchId() { return batchId; }
    public UUID getProductId() { return productId; }
    public BigDecimal getReturnedBaseQuantity() { return returnedBaseQuantity; }
    public StockCondition getStockCondition() { return stockCondition; }
    public Instant getCreatedAt() { return createdAt; }
}
