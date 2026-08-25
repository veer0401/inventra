package com.inventra.inventra_backend.purchasing.domain.model;

import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "goods_receipt_lines")
public class GoodsReceiptLine {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "goods_receipt_id", nullable = false)
    private UUID goodsReceiptId;

    @Column(name = "purchase_order_line_id")
    private UUID purchaseOrderLineId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "line_number", nullable = false)
    private int lineNumber;

    @Column(name = "received_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal receivedQuantity;

    @Column(name = "purchase_unit", nullable = false, length = 50)
    private String purchaseUnit;

    @Column(name = "conversion_factor", nullable = false)
    private int conversionFactor = 1;

    @Column(name = "received_base_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal receivedBaseQuantity;

    @Column(name = "rejected_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal rejectedQuantity = BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);

    @Column(name = "batch_number", length = 100)
    private String batchNumber;

    @Column(name = "manufacturing_date")
    private LocalDate manufacturingDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "unit_cost", nullable = false, precision = 14, scale = 4)
    private BigDecimal unitCost;

    @Column(name = "base_unit_cost", nullable = false, precision = 14, scale = 4)
    private BigDecimal baseUnitCost;

    @Column(name = "mrp", precision = 12, scale = 2)
    private BigDecimal mrp;

    @Column(name = "selling_price", precision = 12, scale = 2)
    private BigDecimal sellingPrice;

    @Column(name = "tax_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal taxRate = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    @Column(name = "tax_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal taxAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "line_total", nullable = false, precision = 14, scale = 4)
    private BigDecimal lineTotal;

    @Column(name = "inventory_batch_id")
    private UUID inventoryBatchId;

    protected GoodsReceiptLine() {
        // Required by JPA
    }

    public GoodsReceiptLine(
        UUID businessId,
        UUID goodsReceiptId,
        UUID purchaseOrderLineId,
        UUID productId,
        int lineNumber,
        BigDecimal receivedQuantity,
        String purchaseUnit,
        int conversionFactor,
        BigDecimal rejectedQuantity,
        String batchNumber,
        LocalDate manufacturingDate,
        LocalDate expiryDate,
        BigDecimal unitCost,
        BigDecimal mrp,
        BigDecimal sellingPrice,
        BigDecimal taxRate
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.goodsReceiptId = Objects.requireNonNull(goodsReceiptId, "goodsReceiptId must not be null");
        this.purchaseOrderLineId = purchaseOrderLineId;
        this.productId = Objects.requireNonNull(productId, "productId must not be null");
        this.lineNumber = lineNumber;
        this.receivedQuantity = Objects.requireNonNull(receivedQuantity, "receivedQuantity must not be null");
        this.purchaseUnit = Objects.requireNonNull(purchaseUnit, "purchaseUnit must not be null").trim();
        this.conversionFactor = conversionFactor >= 1 ? conversionFactor : 1;
        this.receivedBaseQuantity = this.receivedQuantity.multiply(BigDecimal.valueOf(this.conversionFactor)).setScale(3, RoundingMode.HALF_UP);
        this.rejectedQuantity = rejectedQuantity != null ? rejectedQuantity.setScale(3, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);
        this.batchNumber = batchNumber != null ? batchNumber.trim().toUpperCase() : null;
        this.manufacturingDate = manufacturingDate;
        this.expiryDate = expiryDate;
        this.unitCost = Objects.requireNonNull(unitCost, "unitCost must not be null");
        this.baseUnitCost = this.unitCost.divide(BigDecimal.valueOf(this.conversionFactor), 4, RoundingMode.HALF_UP);
        this.mrp = mrp;
        this.sellingPrice = sellingPrice;
        if (this.sellingPrice != null && this.mrp != null && this.sellingPrice.compareTo(this.mrp) > 0) {
            throw new IllegalArgumentException("Selling price cannot exceed MRP");
        }
        this.taxRate = taxRate != null ? taxRate : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        calculateLineTotal();
    }

    public void calculateLineTotal() {
        BigDecimal net = this.receivedQuantity.multiply(this.unitCost);
        this.taxAmount = net.multiply(this.taxRate).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        this.lineTotal = net.add(this.taxAmount).setScale(4, RoundingMode.HALF_UP);
    }

    public void assignInventoryBatch(UUID inventoryBatchId) {
        this.inventoryBatchId = inventoryBatchId;
    }

    public UUID getId() {
        return id;
    }

    public UUID getBusinessId() {
        return businessId;
    }

    public UUID getGoodsReceiptId() {
        return goodsReceiptId;
    }

    public UUID getPurchaseOrderLineId() {
        return purchaseOrderLineId;
    }

    public UUID getProductId() {
        return productId;
    }

    public int getLineNumber() {
        return lineNumber;
    }

    public BigDecimal getReceivedQuantity() {
        return receivedQuantity;
    }

    public String getPurchaseUnit() {
        return purchaseUnit;
    }

    public int getConversionFactor() {
        return conversionFactor;
    }

    public BigDecimal getReceivedBaseQuantity() {
        return receivedBaseQuantity;
    }

    public BigDecimal getRejectedQuantity() {
        return rejectedQuantity;
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

    public BigDecimal getUnitCost() {
        return unitCost;
    }

    public BigDecimal getBaseUnitCost() {
        return baseUnitCost;
    }

    public BigDecimal getMrp() {
        return mrp;
    }

    public BigDecimal getSellingPrice() {
        return sellingPrice;
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

    public UUID getInventoryBatchId() {
        return inventoryBatchId;
    }
}
