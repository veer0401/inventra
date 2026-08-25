package com.inventra.inventra_backend.purchasing.domain.model;

import com.inventra.inventra_backend.common.domain.BaseAuditableEntity;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "goods_receipts")
public class GoodsReceipt extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "store_id", nullable = false, updatable = false)
    private UUID storeId;

    @Column(name = "supplier_id", nullable = false, updatable = false)
    private UUID supplierId;

    @Column(name = "purchase_order_id")
    private UUID purchaseOrderId;

    @Column(name = "receipt_number", nullable = false, length = 50)
    private String receiptNumber;

    @Column(name = "vendor_delivery_note", length = 100)
    private String vendorDeliveryNote;

    @Column(name = "received_date", nullable = false)
    private LocalDate receivedDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private GoodsReceiptStatus status = GoodsReceiptStatus.DRAFT;

    @Column(name = "total_items", nullable = false)
    private int totalItems = 0;

    @Column(name = "total_received_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal totalReceivedQuantity = BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);

    @Column(name = "total_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal totalAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "posted_at")
    private Instant postedAt;

    @Column(name = "posted_by")
    private UUID postedBy;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "idempotency_key", length = 100)
    private String idempotencyKey;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @OneToMany(mappedBy = "goodsReceiptId", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("lineNumber ASC")
    private List<GoodsReceiptLine> lines = new ArrayList<>();

    protected GoodsReceipt() {
        // Required by JPA
    }

    public GoodsReceipt(
        UUID businessId,
        UUID storeId,
        UUID supplierId,
        UUID purchaseOrderId,
        String receiptNumber,
        String vendorDeliveryNote,
        LocalDate receivedDate,
        String notes,
        String idempotencyKey
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.storeId = Objects.requireNonNull(storeId, "storeId must not be null");
        this.supplierId = Objects.requireNonNull(supplierId, "supplierId must not be null");
        this.purchaseOrderId = purchaseOrderId;
        this.receiptNumber = Objects.requireNonNull(receiptNumber, "receiptNumber must not be null").trim();
        this.vendorDeliveryNote = vendorDeliveryNote != null ? vendorDeliveryNote.trim() : null;
        this.receivedDate = receivedDate != null ? receivedDate : LocalDate.now();
        this.status = GoodsReceiptStatus.DRAFT;
        this.notes = notes != null ? notes.trim() : null;
        this.idempotencyKey = idempotencyKey != null ? idempotencyKey.trim() : null;
    }

    public void addLine(GoodsReceiptLine line) {
        if (this.status != GoodsReceiptStatus.DRAFT) {
            throw new IllegalStateException("Cannot add lines to a non-draft goods receipt");
        }
        lines.add(line);
        recalculateTotals();
    }

    public void clearLines() {
        if (this.status != GoodsReceiptStatus.DRAFT) {
            throw new IllegalStateException("Cannot clear lines of a non-draft goods receipt");
        }
        lines.clear();
        recalculateTotals();
    }

    public void recalculateTotals() {
        this.totalItems = lines.size();
        BigDecimal sumQty = BigDecimal.ZERO;
        BigDecimal sumAmount = BigDecimal.ZERO;
        for (GoodsReceiptLine line : lines) {
            sumQty = sumQty.add(line.getReceivedBaseQuantity());
            sumAmount = sumAmount.add(line.getLineTotal());
        }
        this.totalReceivedQuantity = sumQty.setScale(3, RoundingMode.HALF_UP);
        this.totalAmount = sumAmount.setScale(4, RoundingMode.HALF_UP);
    }

    public void post(UUID userId) {
        if (this.status != GoodsReceiptStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT goods receipts can be posted");
        }
        if (lines.isEmpty()) {
            throw new IllegalStateException("Cannot post a goods receipt with no line items");
        }
        this.status = GoodsReceiptStatus.POSTED;
        this.postedAt = Instant.now();
        this.postedBy = userId;
    }

    public void cancel() {
        if (this.status != GoodsReceiptStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT goods receipts can be cancelled directly");
        }
        this.status = GoodsReceiptStatus.CANCELLED;
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

    public UUID getSupplierId() {
        return supplierId;
    }

    public UUID getPurchaseOrderId() {
        return purchaseOrderId;
    }

    public String getReceiptNumber() {
        return receiptNumber;
    }

    public String getVendorDeliveryNote() {
        return vendorDeliveryNote;
    }

    public LocalDate getReceivedDate() {
        return receivedDate;
    }

    public GoodsReceiptStatus getStatus() {
        return status;
    }

    public int getTotalItems() {
        return totalItems;
    }

    public BigDecimal getTotalReceivedQuantity() {
        return totalReceivedQuantity;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public Instant getPostedAt() {
        return postedAt;
    }

    public UUID getPostedBy() {
        return postedBy;
    }

    public String getNotes() {
        return notes;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public Long getVersion() {
        return version;
    }

    public List<GoodsReceiptLine> getLines() {
        return Collections.unmodifiableList(lines);
    }
}
