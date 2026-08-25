package com.inventra.inventra_backend.transfer.domain.model;

import com.inventra.inventra_backend.common.domain.BaseAuditableEntity;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "inventory_transfers")
public class InventoryTransfer extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "source_store_id", nullable = false, updatable = false)
    private UUID sourceStoreId;

    @Column(name = "destination_store_id", nullable = false, updatable = false)
    private UUID destinationStoreId;

    @Column(name = "transfer_number", nullable = false, updatable = false, length = 60)
    private String transferNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private TransferStatus status;

    @Column(name = "requested_by", nullable = false, updatable = false)
    private UUID requestedBy;

    @Column(name = "requested_at", nullable = false, updatable = false)
    private Instant requestedAt;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "shipped_by")
    private UUID shippedBy;

    @Column(name = "shipped_at")
    private Instant shippedAt;

    @Column(name = "received_by")
    private UUID receivedBy;

    @Column(name = "received_at")
    private Instant receivedAt;

    @Column(name = "cancelled_by")
    private UUID cancelledBy;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "cancellation_reason")
    private String cancellationReason;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "expected_delivery_date")
    private LocalDate expectedDeliveryDate;

    @Column(name = "device_id")
    private UUID deviceId;

    @Column(name = "create_idempotency_key", length = 100)
    private String createIdempotencyKey;

    @Column(name = "ship_idempotency_key", length = 100)
    private String shipIdempotencyKey;

    @Column(name = "notes")
    private String notes;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @OneToMany(mappedBy = "transferId", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InventoryTransferLine> lines = new ArrayList<>();

    @OneToMany(mappedBy = "transferId", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TransferLineBatchAllocation> batchAllocations = new ArrayList<>();

    @OneToMany(mappedBy = "transferId", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InventoryTransferReceipt> receipts = new ArrayList<>();

    protected InventoryTransfer() {
        // Required by JPA
    }

    public InventoryTransfer(
        UUID businessId,
        UUID sourceStoreId,
        UUID destinationStoreId,
        String transferNumber,
        UUID requestedBy,
        LocalDate expectedDeliveryDate,
        UUID deviceId,
        String createIdempotencyKey,
        String notes
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.sourceStoreId = Objects.requireNonNull(sourceStoreId, "sourceStoreId must not be null");
        this.destinationStoreId = Objects.requireNonNull(destinationStoreId, "destinationStoreId must not be null");
        if (this.sourceStoreId.equals(this.destinationStoreId)) {
            throw new BusinessRuleViolationException("SAME_STORE_TRANSFER_NOT_ALLOWED", "Source and destination store cannot be the same");
        }
        this.transferNumber = Objects.requireNonNull(transferNumber, "transferNumber must not be null");
        this.requestedBy = Objects.requireNonNull(requestedBy, "requestedBy must not be null");
        this.requestedAt = Instant.now();
        this.status = TransferStatus.REQUESTED;
        this.expectedDeliveryDate = expectedDeliveryDate;
        this.deviceId = deviceId;
        this.createIdempotencyKey = createIdempotencyKey != null ? createIdempotencyKey.trim() : null;
        this.notes = notes != null ? notes.trim() : null;
    }

    public void approve(UUID approvedBy) {
        if (this.status != TransferStatus.REQUESTED) {
            throw new BusinessRuleViolationException("CANNOT_APPROVE_TRANSFER", "Cannot approve transfer in status " + this.status);
        }
        this.status = TransferStatus.APPROVED;
        this.approvedBy = Objects.requireNonNull(approvedBy, "approvedBy must not be null");
        this.approvedAt = Instant.now();
    }

    public void reject(UUID rejectedBy, String reason) {
        if (this.status != TransferStatus.REQUESTED) {
            throw new BusinessRuleViolationException("CANNOT_REJECT_TRANSFER", "Cannot reject transfer in status " + this.status);
        }
        if (reason == null || reason.trim().isBlank()) {
            throw new BusinessRuleViolationException("REJECTION_REASON_REQUIRED", "Rejection reason is required");
        }
        this.status = TransferStatus.REJECTED;
        this.cancelledBy = Objects.requireNonNull(rejectedBy, "rejectedBy must not be null");
        this.cancelledAt = Instant.now();
        this.rejectionReason = reason.trim();
    }

    public void cancel(UUID cancelledBy, String reason) {
        if (this.status != TransferStatus.REQUESTED && this.status != TransferStatus.APPROVED) {
            throw new BusinessRuleViolationException("CANNOT_CANCEL_SHIPPED_TRANSFER", "Cannot cancel transfer in status " + this.status);
        }
        this.status = TransferStatus.CANCELLED;
        this.cancelledBy = Objects.requireNonNull(cancelledBy, "cancelledBy must not be null");
        this.cancelledAt = Instant.now();
        this.cancellationReason = reason != null ? reason.trim() : "Cancelled by user";
    }

    public void markShipped(UUID shippedBy, String shipIdempotencyKey) {
        if (this.status != TransferStatus.APPROVED && this.status != TransferStatus.REQUESTED) {
            throw new BusinessRuleViolationException("CANNOT_SHIP_TRANSFER", "Cannot ship transfer in status " + this.status);
        }
        this.status = TransferStatus.IN_TRANSIT;
        this.shippedBy = Objects.requireNonNull(shippedBy, "shippedBy must not be null");
        this.shippedAt = Instant.now();
        this.shipIdempotencyKey = shipIdempotencyKey != null ? shipIdempotencyKey.trim() : null;
    }

    public void recordReceiptProgress(UUID receivedBy) {
        if (this.status != TransferStatus.IN_TRANSIT && this.status != TransferStatus.PARTIALLY_RECEIVED) {
            throw new BusinessRuleViolationException("CANNOT_RECEIVE_TRANSFER", "Cannot receive transfer in status " + this.status);
        }
        this.receivedBy = Objects.requireNonNull(receivedBy, "receivedBy must not be null");
        this.receivedAt = Instant.now();

        boolean allFullyReceived = !lines.isEmpty() && lines.stream().allMatch(l -> l.getReceivedBaseQuantity().compareTo(l.getShippedBaseQuantity()) >= 0);
        if (allFullyReceived) {
            this.status = TransferStatus.RECEIVED;
        } else {
            this.status = TransferStatus.PARTIALLY_RECEIVED;
        }
    }

    public void addLine(InventoryTransferLine line) {
        this.lines.add(line);
    }

    public void addBatchAllocation(TransferLineBatchAllocation allocation) {
        this.batchAllocations.add(allocation);
    }

    public void addReceipt(InventoryTransferReceipt receipt) {
        this.receipts.add(receipt);
    }

    public UUID getId() { return id; }
    public UUID getBusinessId() { return businessId; }
    public UUID getSourceStoreId() { return sourceStoreId; }
    public UUID getDestinationStoreId() { return destinationStoreId; }
    public String getTransferNumber() { return transferNumber; }
    public TransferStatus getStatus() { return status; }
    public UUID getRequestedBy() { return requestedBy; }
    public Instant getRequestedAt() { return requestedAt; }
    public UUID getApprovedBy() { return approvedBy; }
    public Instant getApprovedAt() { return approvedAt; }
    public UUID getShippedBy() { return shippedBy; }
    public Instant getShippedAt() { return shippedAt; }
    public UUID getReceivedBy() { return receivedBy; }
    public Instant getReceivedAt() { return receivedAt; }
    public UUID getCancelledBy() { return cancelledBy; }
    public Instant getCancelledAt() { return cancelledAt; }
    public String getCancellationReason() { return cancellationReason; }
    public String getRejectionReason() { return rejectionReason; }
    public LocalDate getExpectedDeliveryDate() { return expectedDeliveryDate; }
    public UUID getDeviceId() { return deviceId; }
    public String getCreateIdempotencyKey() { return createIdempotencyKey; }
    public String getShipIdempotencyKey() { return shipIdempotencyKey; }
    public String getNotes() { return notes; }
    public Long getVersion() { return version; }
    public List<InventoryTransferLine> getLines() { return Collections.unmodifiableList(lines); }
    public List<TransferLineBatchAllocation> getBatchAllocations() { return Collections.unmodifiableList(batchAllocations); }
    public List<InventoryTransferReceipt> getReceipts() { return Collections.unmodifiableList(receipts); }
}
