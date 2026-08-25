package com.inventra.inventra_backend.transfer.domain.model;

import com.inventra.inventra_backend.common.domain.BaseAuditableEntity;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "inventory_transfer_receipts")
public class InventoryTransferReceipt extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "store_id", nullable = false, updatable = false)
    private UUID storeId;

    @Column(name = "transfer_id", nullable = false, updatable = false)
    private UUID transferId;

    @Column(name = "receipt_number", nullable = false, updatable = false, length = 60)
    private String receiptNumber;

    @Column(name = "receipt_date", nullable = false, updatable = false)
    private LocalDate receiptDate;

    @Column(name = "received_by", nullable = false, updatable = false)
    private UUID receivedBy;

    @Column(name = "received_at", nullable = false, updatable = false)
    private Instant receivedAt;

    @Column(name = "idempotency_key", length = 100)
    private String idempotencyKey;

    @Column(name = "notes")
    private String notes;

    @OneToMany(mappedBy = "transferReceiptId", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InventoryTransferReceiptLine> lines = new ArrayList<>();

    protected InventoryTransferReceipt() {
        // Required by JPA
    }

    public InventoryTransferReceipt(
        UUID businessId,
        UUID storeId,
        UUID transferId,
        String receiptNumber,
        LocalDate receiptDate,
        UUID receivedBy,
        String idempotencyKey,
        String notes
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.storeId = Objects.requireNonNull(storeId, "storeId must not be null");
        this.transferId = Objects.requireNonNull(transferId, "transferId must not be null");
        this.receiptNumber = Objects.requireNonNull(receiptNumber, "receiptNumber must not be null");
        this.receiptDate = receiptDate != null ? receiptDate : LocalDate.now();
        this.receivedBy = Objects.requireNonNull(receivedBy, "receivedBy must not be null");
        this.receivedAt = Instant.now();
        this.idempotencyKey = idempotencyKey != null ? idempotencyKey.trim() : null;
        this.notes = notes != null ? notes.trim() : null;
    }

    public void addLine(InventoryTransferReceiptLine line) {
        this.lines.add(line);
    }

    public UUID getId() { return id; }
    public UUID getBusinessId() { return businessId; }
    public UUID getStoreId() { return storeId; }
    public UUID getTransferId() { return transferId; }
    public String getReceiptNumber() { return receiptNumber; }
    public LocalDate getReceiptDate() { return receiptDate; }
    public UUID getReceivedBy() { return receivedBy; }
    public Instant getReceivedAt() { return receivedAt; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public String getNotes() { return notes; }
    public List<InventoryTransferReceiptLine> getLines() { return Collections.unmodifiableList(lines); }
}
