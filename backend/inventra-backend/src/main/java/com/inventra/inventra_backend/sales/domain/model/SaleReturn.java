package com.inventra.inventra_backend.sales.domain.model;

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
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "sale_returns")
public class SaleReturn extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "store_id", nullable = false, updatable = false)
    private UUID storeId;

    @Column(name = "sale_id", nullable = false, updatable = false)
    private UUID saleId;

    @Column(name = "return_number", nullable = false, length = 60)
    private String returnNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private SaleReturnStatus status = SaleReturnStatus.COMPLETED;

    @Column(name = "return_date", nullable = false)
    private LocalDate returnDate;

    @Column(name = "subtotal", nullable = false, precision = 14, scale = 4)
    private BigDecimal subtotal = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "tax_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal taxAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "discount_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal discountAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "round_off_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal roundOffAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "total_refund_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal totalRefundAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "returned_by", nullable = false, updatable = false)
    private UUID returnedBy;

    @Column(name = "device_id")
    private UUID deviceId;

    @Column(name = "idempotency_key", length = 100)
    private String idempotencyKey;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @OneToMany(mappedBy = "saleReturnId", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("lineNumber ASC")
    private List<SaleReturnLine> lines = new ArrayList<>();

    @OneToMany(mappedBy = "saleReturnId", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<SaleRefund> refunds = new ArrayList<>();

    protected SaleReturn() {
    }

    public SaleReturn(
        UUID businessId,
        UUID storeId,
        UUID saleId,
        String returnNumber,
        LocalDate returnDate,
        String reason,
        UUID returnedBy,
        UUID deviceId,
        String idempotencyKey
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId is required");
        this.storeId = Objects.requireNonNull(storeId, "storeId is required");
        this.saleId = Objects.requireNonNull(saleId, "saleId is required");
        this.returnNumber = Objects.requireNonNull(returnNumber, "returnNumber is required").trim();
        this.returnDate = returnDate != null ? returnDate : LocalDate.now();
        this.status = SaleReturnStatus.COMPLETED;
        this.reason = Objects.requireNonNull(reason, "reason is required").trim();
        this.returnedBy = Objects.requireNonNull(returnedBy, "returnedBy is required");
        this.deviceId = deviceId;
        this.idempotencyKey = idempotencyKey != null && !idempotencyKey.isBlank() ? idempotencyKey.trim() : null;
    }

    public void addLine(SaleReturnLine line) {
        Objects.requireNonNull(line, "line cannot be null");
        lines.add(line);
    }

    public void addRefund(SaleRefund refund) {
        Objects.requireNonNull(refund, "refund cannot be null");
        refunds.add(refund);
    }

    public void recalculateTotals() {
        BigDecimal sumSubtotal = BigDecimal.ZERO;
        BigDecimal sumTax = BigDecimal.ZERO;
        for (SaleReturnLine line : lines) {
            sumSubtotal = sumSubtotal.add(line.getQuantity().multiply(line.getUnitRefundPrice()));
            sumTax = sumTax.add(line.getTaxAmount());
        }
        this.subtotal = sumSubtotal.setScale(4, RoundingMode.HALF_UP);
        this.taxAmount = sumTax.setScale(4, RoundingMode.HALF_UP);
        this.totalRefundAmount = this.subtotal.add(this.taxAmount).subtract(this.discountAmount).add(this.roundOffAmount).setScale(4, RoundingMode.HALF_UP);
    }

    public UUID getId() { return id; }
    public UUID getBusinessId() { return businessId; }
    public UUID getStoreId() { return storeId; }
    public UUID getSaleId() { return saleId; }
    public String getReturnNumber() { return returnNumber; }
    public SaleReturnStatus getStatus() { return status; }
    public LocalDate getReturnDate() { return returnDate; }
    public BigDecimal getSubtotal() { return subtotal; }
    public BigDecimal getTaxAmount() { return taxAmount; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public BigDecimal getRoundOffAmount() { return roundOffAmount; }
    public BigDecimal getTotalRefundAmount() { return totalRefundAmount; }
    public String getReason() { return reason; }
    public UUID getReturnedBy() { return returnedBy; }
    public UUID getDeviceId() { return deviceId; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public Long getVersion() { return version; }
    public List<SaleReturnLine> getLines() { return Collections.unmodifiableList(lines); }
    public List<SaleRefund> getRefunds() { return Collections.unmodifiableList(refunds); }
}
