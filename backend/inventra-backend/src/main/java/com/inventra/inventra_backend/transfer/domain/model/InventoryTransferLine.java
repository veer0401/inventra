package com.inventra.inventra_backend.transfer.domain.model;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
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
@Table(name = "inventory_transfer_lines")
public class InventoryTransferLine {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "transfer_id", nullable = false, updatable = false)
    private UUID transferId;

    @Column(name = "product_id", nullable = false, updatable = false)
    private UUID productId;

    @Column(name = "line_number", nullable = false, updatable = false)
    private Integer lineNumber;

    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    @Column(name = "selling_unit", nullable = false, length = 50)
    private String sellingUnit;

    @Column(name = "conversion_factor", nullable = false)
    private Integer conversionFactor;

    @Column(name = "requested_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal requestedQuantity;

    @Column(name = "requested_base_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal requestedBaseQuantity;

    @Column(name = "approved_quantity", precision = 12, scale = 3)
    private BigDecimal approvedQuantity;

    @Column(name = "approved_base_quantity", precision = 12, scale = 3)
    private BigDecimal approvedBaseQuantity;

    @Column(name = "shipped_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal shippedQuantity;

    @Column(name = "shipped_base_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal shippedBaseQuantity;

    @Column(name = "received_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal receivedQuantity;

    @Column(name = "received_base_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal receivedBaseQuantity;

    @Column(name = "unit_cost", precision = 14, scale = 4)
    private BigDecimal unitCost;

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected InventoryTransferLine() {
        // Required by JPA
    }

    public InventoryTransferLine(
        UUID businessId,
        UUID transferId,
        UUID productId,
        Integer lineNumber,
        String productName,
        String sellingUnit,
        Integer conversionFactor,
        BigDecimal requestedQuantity,
        BigDecimal unitCost,
        String notes
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.transferId = Objects.requireNonNull(transferId, "transferId must not be null");
        this.productId = Objects.requireNonNull(productId, "productId must not be null");
        this.lineNumber = Objects.requireNonNull(lineNumber, "lineNumber must not be null");
        this.productName = Objects.requireNonNull(productName, "productName must not be null");
        this.sellingUnit = Objects.requireNonNull(sellingUnit, "sellingUnit must not be null");
        this.conversionFactor = conversionFactor != null && conversionFactor >= 1 ? conversionFactor : 1;
        
        this.requestedQuantity = Objects.requireNonNull(requestedQuantity, "requestedQuantity must not be null").setScale(3, RoundingMode.HALF_UP);
        if (this.requestedQuantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleViolationException("INVALID_REQUESTED_QUANTITY", "Requested quantity must be positive");
        }
        this.requestedBaseQuantity = this.requestedQuantity.multiply(BigDecimal.valueOf(this.conversionFactor)).setScale(3, RoundingMode.HALF_UP);
        
        this.approvedQuantity = this.requestedQuantity;
        this.approvedBaseQuantity = this.requestedBaseQuantity;
        this.shippedQuantity = BigDecimal.ZERO.setScale(3);
        this.shippedBaseQuantity = BigDecimal.ZERO.setScale(3);
        this.receivedQuantity = BigDecimal.ZERO.setScale(3);
        this.receivedBaseQuantity = BigDecimal.ZERO.setScale(3);
        this.unitCost = unitCost != null ? unitCost.setScale(4, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(4);
        this.notes = notes != null ? notes.trim() : null;
        this.createdAt = Instant.now();
    }

    public void setApprovedQuantity(BigDecimal qty) {
        if (qty == null || qty.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessRuleViolationException("INVALID_APPROVED_QUANTITY", "Approved quantity cannot be negative");
        }
        if (qty.compareTo(this.requestedQuantity) > 0) {
            throw new BusinessRuleViolationException("APPROVED_QUANTITY_EXCEEDS_REQUESTED", "Approved quantity cannot exceed requested quantity");
        }
        this.approvedQuantity = qty.setScale(3, RoundingMode.HALF_UP);
        this.approvedBaseQuantity = this.approvedQuantity.multiply(BigDecimal.valueOf(this.conversionFactor)).setScale(3, RoundingMode.HALF_UP);
    }

    public void recordShipment(BigDecimal qty, BigDecimal unitCost) {
        if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleViolationException("INVALID_SHIPPED_QUANTITY", "Shipped quantity must be positive");
        }
        if (qty.compareTo(this.approvedQuantity) != 0) {
            throw new BusinessRuleViolationException("SHIPMENT_QUANTITY_MISMATCH", "Shipped quantity must exactly match approved quantity (All-or-Nothing shipment)");
        }
        this.shippedQuantity = qty.setScale(3, RoundingMode.HALF_UP);
        this.shippedBaseQuantity = this.shippedQuantity.multiply(BigDecimal.valueOf(this.conversionFactor)).setScale(3, RoundingMode.HALF_UP);
        if (unitCost != null) {
            this.unitCost = unitCost.setScale(4, RoundingMode.HALF_UP);
        }
    }

    public void recordReceipt(BigDecimal receivedBaseQty) {
        if (receivedBaseQty == null || receivedBaseQty.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleViolationException("INVALID_RECEIVED_QUANTITY", "Received quantity must be positive");
        }
        BigDecimal newReceivedBase = this.receivedBaseQuantity.add(receivedBaseQty).setScale(3, RoundingMode.HALF_UP);
        if (newReceivedBase.compareTo(this.shippedBaseQuantity) > 0) {
            throw new BusinessRuleViolationException("RECEIVED_QUANTITY_EXCEEDS_SHIPPED", "Cumulative received base quantity (" + newReceivedBase + ") cannot exceed shipped base quantity (" + this.shippedBaseQuantity + ")");
        }
        this.receivedBaseQuantity = newReceivedBase;
        this.receivedQuantity = this.receivedBaseQuantity.divide(BigDecimal.valueOf(this.conversionFactor), 3, java.math.RoundingMode.HALF_UP);
    }

    public UUID getId() { return id; }
    public UUID getBusinessId() { return businessId; }
    public UUID getTransferId() { return transferId; }
    public UUID getProductId() { return productId; }
    public Integer getLineNumber() { return lineNumber; }
    public String getProductName() { return productName; }
    public String getSellingUnit() { return sellingUnit; }
    public Integer getConversionFactor() { return conversionFactor; }
    public BigDecimal getRequestedQuantity() { return requestedQuantity; }
    public BigDecimal getRequestedBaseQuantity() { return requestedBaseQuantity; }
    public BigDecimal getApprovedQuantity() { return approvedQuantity; }
    public BigDecimal getApprovedBaseQuantity() { return approvedBaseQuantity; }
    public BigDecimal getShippedQuantity() { return shippedQuantity; }
    public BigDecimal getShippedBaseQuantity() { return shippedBaseQuantity; }
    public BigDecimal getReceivedQuantity() { return receivedQuantity; }
    public BigDecimal getReceivedBaseQuantity() { return receivedBaseQuantity; }
    public BigDecimal getUnitCost() { return unitCost; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }
}
