package com.inventra.inventra_backend.transfer.domain.model;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "inventory_transfer_line_batch_allocations")
public class TransferLineBatchAllocation {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "source_store_id", nullable = false, updatable = false)
    private UUID sourceStoreId;

    @Column(name = "destination_store_id", nullable = false, updatable = false)
    private UUID destinationStoreId;

    @Column(name = "transfer_id", nullable = false, updatable = false)
    private UUID transferId;

    @Column(name = "transfer_line_id", nullable = false, updatable = false)
    private UUID transferLineId;

    @Column(name = "source_batch_id", nullable = false, updatable = false)
    private UUID sourceBatchId;

    @Column(name = "destination_batch_id")
    private UUID destinationBatchId;

    @Column(name = "product_id", nullable = false, updatable = false)
    private UUID productId;

    @Column(name = "batch_number", nullable = false, length = 100)
    private String batchNumber;

    @Column(name = "manufacturing_date")
    private LocalDate manufacturingDate;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Column(name = "shipped_base_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal shippedBaseQuantity;

    @Column(name = "received_base_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal receivedBaseQuantity;

    @Column(name = "unit_cost", nullable = false, precision = 14, scale = 4)
    private BigDecimal unitCost;

    @Column(name = "mrp", precision = 14, scale = 4)
    private BigDecimal mrp;

    @Column(name = "selling_price", precision = 14, scale = 4)
    private BigDecimal sellingPrice;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected TransferLineBatchAllocation() {
        // Required by JPA
    }

    public TransferLineBatchAllocation(
        UUID businessId,
        UUID sourceStoreId,
        UUID destinationStoreId,
        UUID transferId,
        UUID transferLineId,
        UUID sourceBatchId,
        UUID productId,
        String batchNumber,
        LocalDate manufacturingDate,
        LocalDate expiryDate,
        BigDecimal shippedBaseQuantity,
        BigDecimal unitCost,
        BigDecimal mrp,
        BigDecimal sellingPrice
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.sourceStoreId = Objects.requireNonNull(sourceStoreId, "sourceStoreId must not be null");
        this.destinationStoreId = Objects.requireNonNull(destinationStoreId, "destinationStoreId must not be null");
        this.transferId = Objects.requireNonNull(transferId, "transferId must not be null");
        this.transferLineId = Objects.requireNonNull(transferLineId, "transferLineId must not be null");
        this.sourceBatchId = Objects.requireNonNull(sourceBatchId, "sourceBatchId must not be null");
        this.productId = Objects.requireNonNull(productId, "productId must not be null");
        this.batchNumber = Objects.requireNonNull(batchNumber, "batchNumber must not be null");
        this.manufacturingDate = manufacturingDate;
        this.expiryDate = Objects.requireNonNull(expiryDate, "expiryDate must not be null");
        
        this.shippedBaseQuantity = Objects.requireNonNull(shippedBaseQuantity, "shippedBaseQuantity must not be null").setScale(3);
        if (this.shippedBaseQuantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleViolationException("INVALID_SHIPPED_BATCH_QUANTITY", "Shipped batch quantity must be positive");
        }
        this.receivedBaseQuantity = BigDecimal.ZERO.setScale(3);
        this.unitCost = Objects.requireNonNull(unitCost, "unitCost must not be null").setScale(4);
        this.mrp = mrp != null ? mrp.setScale(4) : this.unitCost;
        this.sellingPrice = sellingPrice != null ? sellingPrice.setScale(4) : this.unitCost;
        this.createdAt = Instant.now();
    }

    public void recordReceipt(BigDecimal receivedQty, UUID destinationBatchId) {
        if (receivedQty == null || receivedQty.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleViolationException("INVALID_RECEIVED_BATCH_QUANTITY", "Received batch quantity must be positive");
        }
        BigDecimal newReceived = this.receivedBaseQuantity.add(receivedQty).setScale(3);
        if (newReceived.compareTo(this.shippedBaseQuantity) > 0) {
            throw new BusinessRuleViolationException(
                "RECEIVED_BATCH_QUANTITY_EXCEEDS_SHIPPED",
                "Cumulative received quantity (" + newReceived + ") cannot exceed shipped quantity (" + this.shippedBaseQuantity + ") for batch " + this.batchNumber
            );
        }
        this.receivedBaseQuantity = newReceived;
        if (destinationBatchId != null) {
            this.destinationBatchId = destinationBatchId;
        }
    }

    public UUID getId() { return id; }
    public UUID getBusinessId() { return businessId; }
    public UUID getSourceStoreId() { return sourceStoreId; }
    public UUID getDestinationStoreId() { return destinationStoreId; }
    public UUID getTransferId() { return transferId; }
    public UUID getTransferLineId() { return transferLineId; }
    public UUID getSourceBatchId() { return sourceBatchId; }
    public UUID getDestinationBatchId() { return destinationBatchId; }
    public UUID getProductId() { return productId; }
    public String getBatchNumber() { return batchNumber; }
    public LocalDate getManufacturingDate() { return manufacturingDate; }
    public LocalDate getExpiryDate() { return expiryDate; }
    public BigDecimal getShippedBaseQuantity() { return shippedBaseQuantity; }
    public BigDecimal getReceivedBaseQuantity() { return receivedBaseQuantity; }
    public BigDecimal getUnitCost() { return unitCost; }
    public BigDecimal getMrp() { return mrp; }
    public BigDecimal getSellingPrice() { return sellingPrice; }
    public Instant getCreatedAt() { return createdAt; }
}
