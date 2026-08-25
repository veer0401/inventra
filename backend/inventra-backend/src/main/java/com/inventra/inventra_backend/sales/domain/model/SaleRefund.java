package com.inventra.inventra_backend.sales.domain.model;

import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "sale_refunds")
public class SaleRefund {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "store_id", nullable = false, updatable = false)
    private UUID storeId;

    @Column(name = "sale_return_id", nullable = false, updatable = false)
    private UUID saleReturnId;

    @Enumerated(EnumType.STRING)
    @Column(name = "refund_method", nullable = false, length = 30)
    private RefundMethod refundMethod;

    @Column(name = "amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal amount;

    @Column(name = "transaction_reference", length = 100)
    private String transactionReference;

    @Column(name = "refunded_at", nullable = false)
    private Instant refundedAt = Instant.now();

    @Column(name = "refunded_by", nullable = false, updatable = false)
    private UUID refundedBy;

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected SaleRefund() {
    }

    public SaleRefund(
        UUID businessId,
        UUID storeId,
        UUID saleReturnId,
        RefundMethod refundMethod,
        BigDecimal amount,
        String transactionReference,
        UUID refundedBy,
        String notes
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId is required");
        this.storeId = Objects.requireNonNull(storeId, "storeId is required");
        this.saleReturnId = Objects.requireNonNull(saleReturnId, "saleReturnId is required");
        this.refundMethod = Objects.requireNonNull(refundMethod, "refundMethod is required");
        this.amount = Objects.requireNonNull(amount, "amount is required").setScale(4, RoundingMode.HALF_UP);
        if (this.amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Refund amount must be positive");
        }
        this.transactionReference = transactionReference != null ? transactionReference.trim() : null;
        this.refundedBy = Objects.requireNonNull(refundedBy, "refundedBy is required");
        this.notes = notes != null ? notes.trim() : null;
        this.refundedAt = Instant.now();
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getBusinessId() { return businessId; }
    public UUID getStoreId() { return storeId; }
    public UUID getSaleReturnId() { return saleReturnId; }
    public RefundMethod getRefundMethod() { return refundMethod; }
    public BigDecimal getAmount() { return amount; }
    public String getTransactionReference() { return transactionReference; }
    public Instant getRefundedAt() { return refundedAt; }
    public UUID getRefundedBy() { return refundedBy; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }
}
