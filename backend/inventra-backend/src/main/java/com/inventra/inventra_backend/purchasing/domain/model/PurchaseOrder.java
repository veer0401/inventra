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
@Table(name = "purchase_orders")
public class PurchaseOrder extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "store_id", nullable = false, updatable = false)
    private UUID storeId;

    @Column(name = "supplier_id", nullable = false, updatable = false)
    private UUID supplierId;

    @Column(name = "order_number", nullable = false, length = 50)
    private String orderNumber;

    @Column(name = "order_date", nullable = false)
    private LocalDate orderDate;

    @Column(name = "expected_delivery_date")
    private LocalDate expectedDeliveryDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private PurchaseOrderStatus status = PurchaseOrderStatus.DRAFT;

    @Column(name = "subtotal", nullable = false, precision = 14, scale = 4)
    private BigDecimal subtotal = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "tax_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal taxAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "discount_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal discountAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "total_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal totalAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "confirmed_by")
    private UUID confirmedBy;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "cancelled_by")
    private UUID cancelledBy;

    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @OneToMany(mappedBy = "purchaseOrderId", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("lineNumber ASC")
    private List<PurchaseOrderLine> lines = new ArrayList<>();

    protected PurchaseOrder() {
        // Required by JPA
    }

    public PurchaseOrder(
        UUID businessId,
        UUID storeId,
        UUID supplierId,
        String orderNumber,
        LocalDate orderDate,
        LocalDate expectedDeliveryDate,
        BigDecimal discountAmount,
        String notes
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.storeId = Objects.requireNonNull(storeId, "storeId must not be null");
        this.supplierId = Objects.requireNonNull(supplierId, "supplierId must not be null");
        this.orderNumber = Objects.requireNonNull(orderNumber, "orderNumber must not be null").trim();
        this.orderDate = orderDate != null ? orderDate : LocalDate.now();
        this.expectedDeliveryDate = expectedDeliveryDate;
        this.discountAmount = discountAmount != null ? discountAmount.setScale(4, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        this.status = PurchaseOrderStatus.DRAFT;
        this.notes = notes != null ? notes.trim() : null;
    }

    public void addLine(PurchaseOrderLine line) {
        if (this.status != PurchaseOrderStatus.DRAFT) {
            throw new IllegalStateException("Cannot add lines to a non-draft purchase order");
        }
        lines.add(line);
        recalculateTotals();
    }

    public void updateHeader(LocalDate expectedDeliveryDate, BigDecimal discountAmount, String notes) {
        if (this.status != PurchaseOrderStatus.DRAFT) {
            throw new IllegalStateException("Cannot update header of a non-draft purchase order");
        }
        if (expectedDeliveryDate != null) {
            this.expectedDeliveryDate = expectedDeliveryDate;
        }
        if (discountAmount != null) {
            this.discountAmount = discountAmount.setScale(4, RoundingMode.HALF_UP);
        }
        if (notes != null) {
            this.notes = notes.trim();
        }
        recalculateTotals();
    }

    public void clearLines() {
        if (this.status != PurchaseOrderStatus.DRAFT) {
            throw new IllegalStateException("Cannot clear lines of a non-draft purchase order");
        }
        lines.clear();
        recalculateTotals();
    }

    public void recalculateTotals() {
        BigDecimal sumSubtotal = BigDecimal.ZERO;
        BigDecimal sumTax = BigDecimal.ZERO;
        for (PurchaseOrderLine line : lines) {
            BigDecimal lineGross = line.getOrderedQuantity().multiply(line.getUnitCost());
            BigDecimal lineDisc = lineGross.multiply(line.getDiscountPercentage()).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            BigDecimal lineNet = lineGross.subtract(lineDisc);
            sumSubtotal = sumSubtotal.add(lineNet);
            sumTax = sumTax.add(line.getTaxAmount());
        }
        this.subtotal = sumSubtotal.setScale(4, RoundingMode.HALF_UP);
        this.taxAmount = sumTax.setScale(4, RoundingMode.HALF_UP);
        BigDecimal netAfterDiscount = this.subtotal.subtract(this.discountAmount);
        this.totalAmount = netAfterDiscount.add(this.taxAmount).setScale(4, RoundingMode.HALF_UP);
    }

    public void confirm(UUID userId) {
        if (this.status != PurchaseOrderStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT purchase orders can be confirmed");
        }
        if (lines.isEmpty()) {
            throw new IllegalStateException("Cannot confirm a purchase order with no line items");
        }
        this.status = PurchaseOrderStatus.CONFIRMED;
        this.confirmedAt = Instant.now();
        this.confirmedBy = userId;
    }

    public void cancel(UUID userId, String reason) {
        if (this.status != PurchaseOrderStatus.DRAFT && this.status != PurchaseOrderStatus.CONFIRMED) {
            throw new IllegalStateException("Cannot cancel purchase order in status " + this.status);
        }
        boolean hasReceived = lines.stream().anyMatch(l -> l.getReceivedQuantity().compareTo(BigDecimal.ZERO) > 0);
        if (hasReceived) {
            throw new IllegalStateException("Cannot cancel purchase order with already received items");
        }
        this.status = PurchaseOrderStatus.CANCELLED;
        this.cancelledAt = Instant.now();
        this.cancelledBy = userId;
        this.cancellationReason = reason != null ? reason.trim() : null;
    }

    public void close() {
        if (this.status != PurchaseOrderStatus.PARTIALLY_RECEIVED && this.status != PurchaseOrderStatus.FULLY_RECEIVED) {
            throw new IllegalStateException("Only partially or fully received purchase orders can be closed");
        }
        this.status = PurchaseOrderStatus.CLOSED;
    }

    public void updateReceivingStatus() {
        if (this.status == PurchaseOrderStatus.CANCELLED || this.status == PurchaseOrderStatus.CLOSED) {
            return;
        }
        boolean allFullyReceived = !lines.isEmpty() && lines.stream().allMatch(PurchaseOrderLine::isFullyReceived);
        boolean anyReceived = lines.stream().anyMatch(l -> l.getReceivedQuantity().compareTo(BigDecimal.ZERO) > 0);

        if (allFullyReceived) {
            this.status = PurchaseOrderStatus.FULLY_RECEIVED;
        } else if (anyReceived) {
            this.status = PurchaseOrderStatus.PARTIALLY_RECEIVED;
        }
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

    public String getOrderNumber() {
        return orderNumber;
    }

    public LocalDate getOrderDate() {
        return orderDate;
    }

    public LocalDate getExpectedDeliveryDate() {
        return expectedDeliveryDate;
    }

    public PurchaseOrderStatus getStatus() {
        return status;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public BigDecimal getTaxAmount() {
        return taxAmount;
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public String getNotes() {
        return notes;
    }

    public Instant getConfirmedAt() {
        return confirmedAt;
    }

    public UUID getConfirmedBy() {
        return confirmedBy;
    }

    public Instant getCancelledAt() {
        return cancelledAt;
    }

    public UUID getCancelledBy() {
        return cancelledBy;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public Long getVersion() {
        return version;
    }

    public List<PurchaseOrderLine> getLines() {
        return Collections.unmodifiableList(lines);
    }
}
