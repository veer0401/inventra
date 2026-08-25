package com.inventra.inventra_backend.transfer.domain.model;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "inventory_transfer_receipt_lines")
public class InventoryTransferReceiptLine {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "transfer_receipt_id", nullable = false, updatable = false)
    private UUID transferReceiptId;

    @Column(name = "transfer_line_id", nullable = false, updatable = false)
    private UUID transferLineId;

    @Column(name = "transfer_line_batch_allocation_id", nullable = false, updatable = false)
    private UUID transferLineBatchAllocationId;

    @Column(name = "destination_batch_id", nullable = false, updatable = false)
    private UUID destinationBatchId;

    @Column(name = "product_id", nullable = false, updatable = false)
    private UUID productId;

    @Column(name = "received_base_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal receivedBaseQuantity;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected InventoryTransferReceiptLine() {
        // Required by JPA
    }

    public InventoryTransferReceiptLine(
        UUID businessId,
        UUID transferReceiptId,
        UUID transferLineId,
        UUID transferLineBatchAllocationId,
        UUID destinationBatchId,
        UUID productId,
        BigDecimal receivedBaseQuantity
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.transferReceiptId = Objects.requireNonNull(transferReceiptId, "transferReceiptId must not be null");
        this.transferLineId = Objects.requireNonNull(transferLineId, "transferLineId must not be null");
        this.transferLineBatchAllocationId = Objects.requireNonNull(transferLineBatchAllocationId, "transferLineBatchAllocationId must not be null");
        this.destinationBatchId = Objects.requireNonNull(destinationBatchId, "destinationBatchId must not be null");
        this.productId = Objects.requireNonNull(productId, "productId must not be null");
        
        this.receivedBaseQuantity = Objects.requireNonNull(receivedBaseQuantity, "receivedBaseQuantity must not be null").setScale(3);
        if (this.receivedBaseQuantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleViolationException("INVALID_RECEIPT_LINE_QUANTITY", "Received base quantity must be positive");
        }
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getBusinessId() { return businessId; }
    public UUID getTransferReceiptId() { return transferReceiptId; }
    public UUID getTransferLineId() { return transferLineId; }
    public UUID getTransferLineBatchAllocationId() { return transferLineBatchAllocationId; }
    public UUID getDestinationBatchId() { return destinationBatchId; }
    public UUID getProductId() { return productId; }
    public BigDecimal getReceivedBaseQuantity() { return receivedBaseQuantity; }
    public Instant getCreatedAt() { return createdAt; }
}
