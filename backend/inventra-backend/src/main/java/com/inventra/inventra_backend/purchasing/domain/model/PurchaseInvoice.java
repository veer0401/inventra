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
@Table(name = "purchase_invoices")
public class PurchaseInvoice extends BaseAuditableEntity {

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

    @Column(name = "goods_receipt_id")
    private UUID goodsReceiptId;

    @Column(name = "supplier_invoice_number", nullable = false, length = 100)
    private String supplierInvoiceNumber;

    @Column(name = "invoice_date", nullable = false)
    private LocalDate invoiceDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "subtotal", nullable = false, precision = 14, scale = 4)
    private BigDecimal subtotal = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "tax_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal taxAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "discount_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal discountAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "round_off_amount", nullable = false, precision = 6, scale = 2)
    private BigDecimal roundOffAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    @Column(name = "total_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal totalAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private PurchaseInvoiceStatus status = PurchaseInvoiceStatus.DRAFT;

    @Column(name = "posted_at")
    private Instant postedAt;

    @Column(name = "posted_by")
    private UUID postedBy;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @OneToMany(mappedBy = "purchaseInvoiceId", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("lineNumber ASC")
    private List<PurchaseInvoiceLine> lines = new ArrayList<>();

    protected PurchaseInvoice() {
        // Required by JPA
    }

    public PurchaseInvoice(
        UUID businessId,
        UUID storeId,
        UUID supplierId,
        UUID purchaseOrderId,
        UUID goodsReceiptId,
        String supplierInvoiceNumber,
        LocalDate invoiceDate,
        LocalDate dueDate,
        BigDecimal discountAmount,
        BigDecimal roundOffAmount,
        String notes
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.storeId = Objects.requireNonNull(storeId, "storeId must not be null");
        this.supplierId = Objects.requireNonNull(supplierId, "supplierId must not be null");
        this.purchaseOrderId = purchaseOrderId;
        this.goodsReceiptId = goodsReceiptId;
        this.supplierInvoiceNumber = Objects.requireNonNull(supplierInvoiceNumber, "supplierInvoiceNumber must not be null").trim();
        this.invoiceDate = invoiceDate != null ? invoiceDate : LocalDate.now();
        this.dueDate = dueDate;
        this.discountAmount = discountAmount != null ? discountAmount.setScale(4, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        this.roundOffAmount = roundOffAmount != null ? roundOffAmount.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        this.status = PurchaseInvoiceStatus.DRAFT;
        this.notes = notes != null ? notes.trim() : null;
    }

    public void addLine(PurchaseInvoiceLine line) {
        if (this.status != PurchaseInvoiceStatus.DRAFT) {
            throw new IllegalStateException("Cannot add lines to a non-draft purchase invoice");
        }
        lines.add(line);
        recalculateTotals();
    }

    public void clearLines() {
        if (this.status != PurchaseInvoiceStatus.DRAFT) {
            throw new IllegalStateException("Cannot clear lines of a non-draft purchase invoice");
        }
        lines.clear();
        recalculateTotals();
    }

    public void recalculateTotals() {
        BigDecimal sumSubtotal = BigDecimal.ZERO;
        BigDecimal sumTax = BigDecimal.ZERO;
        for (PurchaseInvoiceLine line : lines) {
            BigDecimal lineGross = line.getInvoicedQuantity().multiply(line.getUnitCost());
            BigDecimal lineNet = lineGross.subtract(line.getDiscountAmount());
            sumSubtotal = sumSubtotal.add(lineNet);
            sumTax = sumTax.add(line.getTaxAmount());
        }
        this.subtotal = sumSubtotal.setScale(4, RoundingMode.HALF_UP);
        this.taxAmount = sumTax.setScale(4, RoundingMode.HALF_UP);
        BigDecimal net = this.subtotal.subtract(this.discountAmount).add(this.taxAmount);
        this.totalAmount = net.add(this.roundOffAmount).setScale(4, RoundingMode.HALF_UP);
    }

    public void post(UUID userId) {
        if (this.status != PurchaseInvoiceStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT purchase invoices can be posted");
        }
        if (lines.isEmpty()) {
            throw new IllegalStateException("Cannot post a purchase invoice with no line items");
        }
        this.status = PurchaseInvoiceStatus.POSTED;
        this.postedAt = Instant.now();
        this.postedBy = userId;
    }

    public void cancel() {
        if (this.status == PurchaseInvoiceStatus.CANCELLED) {
            throw new IllegalStateException("Purchase invoice is already cancelled");
        }
        this.status = PurchaseInvoiceStatus.CANCELLED;
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

    public UUID getGoodsReceiptId() {
        return goodsReceiptId;
    }

    public String getSupplierInvoiceNumber() {
        return supplierInvoiceNumber;
    }

    public LocalDate getInvoiceDate() {
        return invoiceDate;
    }

    public LocalDate getDueDate() {
        return dueDate;
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

    public BigDecimal getRoundOffAmount() {
        return roundOffAmount;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public PurchaseInvoiceStatus getStatus() {
        return status;
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

    public Long getVersion() {
        return version;
    }

    public List<PurchaseInvoiceLine> getLines() {
        return Collections.unmodifiableList(lines);
    }
}
