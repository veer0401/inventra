package com.inventra.inventra_backend.sales.domain.model;

import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "sale_return_lines")
public class SaleReturnLine {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "sale_return_id", nullable = false, updatable = false)
    private UUID saleReturnId;

    @Column(name = "sale_line_id", nullable = false, updatable = false)
    private UUID saleLineId;

    @Column(name = "product_id", nullable = false, updatable = false)
    private UUID productId;

    @Column(name = "line_number", nullable = false)
    private Integer lineNumber;

    @Column(name = "quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantity;

    @Column(name = "base_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal baseQuantity;

    @Column(name = "unit_refund_price", nullable = false, precision = 14, scale = 4)
    private BigDecimal unitRefundPrice;

    @Column(name = "tax_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal taxRate = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    @Column(name = "tax_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal taxAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "line_total", nullable = false, precision = 14, scale = 4)
    private BigDecimal lineTotal;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "saleReturnLineId", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<SaleReturnLineBatchAllocation> batchAllocations = new ArrayList<>();

    protected SaleReturnLine() {
    }

    public SaleReturnLine(
        UUID businessId,
        UUID saleReturnId,
        UUID saleLineId,
        UUID productId,
        Integer lineNumber,
        BigDecimal quantity,
        BigDecimal baseQuantity,
        BigDecimal unitRefundPrice,
        BigDecimal taxRate
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId is required");
        this.saleReturnId = Objects.requireNonNull(saleReturnId, "saleReturnId is required");
        this.saleLineId = Objects.requireNonNull(saleLineId, "saleLineId is required");
        this.productId = Objects.requireNonNull(productId, "productId is required");
        this.lineNumber = Objects.requireNonNull(lineNumber, "lineNumber is required");
        this.quantity = Objects.requireNonNull(quantity, "quantity is required").setScale(3, RoundingMode.HALF_UP);
        this.baseQuantity = Objects.requireNonNull(baseQuantity, "baseQuantity is required").setScale(3, RoundingMode.HALF_UP);
        this.unitRefundPrice = Objects.requireNonNull(unitRefundPrice, "unitRefundPrice is required").setScale(4, RoundingMode.HALF_UP);
        this.taxRate = taxRate != null ? taxRate.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        this.createdAt = Instant.now();

        recalculateAmounts();
    }

    public void addBatchAllocation(SaleReturnLineBatchAllocation allocation) {
        Objects.requireNonNull(allocation, "allocation cannot be null");
        batchAllocations.add(allocation);
    }

    public void recalculateAmounts() {
        BigDecimal net = this.quantity.multiply(this.unitRefundPrice).setScale(4, RoundingMode.HALF_UP);
        this.taxAmount = net.multiply(this.taxRate).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        this.lineTotal = net.add(this.taxAmount).setScale(4, RoundingMode.HALF_UP);
    }

    public UUID getId() { return id; }
    public UUID getBusinessId() { return businessId; }
    public UUID getSaleReturnId() { return saleReturnId; }
    public UUID getSaleLineId() { return saleLineId; }
    public UUID getProductId() { return productId; }
    public Integer getLineNumber() { return lineNumber; }
    public BigDecimal getQuantity() { return quantity; }
    public BigDecimal getBaseQuantity() { return baseQuantity; }
    public BigDecimal getUnitRefundPrice() { return unitRefundPrice; }
    public BigDecimal getTaxRate() { return taxRate; }
    public BigDecimal getTaxAmount() { return taxAmount; }
    public BigDecimal getLineTotal() { return lineTotal; }
    public Instant getCreatedAt() { return createdAt; }
    public List<SaleReturnLineBatchAllocation> getBatchAllocations() { return Collections.unmodifiableList(batchAllocations); }
}
