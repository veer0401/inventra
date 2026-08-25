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
@Table(name = "sale_payments")
public class SalePayment {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "store_id", nullable = false, updatable = false)
    private UUID storeId;

    @Column(name = "sale_id", nullable = false, updatable = false)
    private UUID saleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 30)
    private PaymentMethod paymentMethod;

    @Column(name = "amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal amount;

    @Column(name = "tendered_amount", precision = 14, scale = 4)
    private BigDecimal tenderedAmount;

    @Column(name = "change_amount", precision = 14, scale = 4)
    private BigDecimal changeAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "transaction_reference", length = 100)
    private String transactionReference;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private PaymentStatus status = PaymentStatus.SUCCESS;

    @Column(name = "paid_at", nullable = false)
    private Instant paidAt = Instant.now();

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected SalePayment() {
    }

    public SalePayment(
        UUID businessId,
        UUID storeId,
        UUID saleId,
        PaymentMethod paymentMethod,
        BigDecimal amount,
        BigDecimal tenderedAmount,
        BigDecimal changeAmount,
        String transactionReference,
        PaymentStatus status,
        String notes
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId is required");
        this.storeId = Objects.requireNonNull(storeId, "storeId is required");
        this.saleId = Objects.requireNonNull(saleId, "saleId is required");
        this.paymentMethod = Objects.requireNonNull(paymentMethod, "paymentMethod is required");
        this.amount = Objects.requireNonNull(amount, "amount is required").setScale(4, RoundingMode.HALF_UP);
        if (this.amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment amount must be positive");
        }
        this.tenderedAmount = tenderedAmount != null ? tenderedAmount.setScale(4, RoundingMode.HALF_UP) : null;
        this.changeAmount = changeAmount != null ? changeAmount.setScale(4, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        this.transactionReference = transactionReference != null ? transactionReference.trim() : null;
        this.status = status != null ? status : PaymentStatus.SUCCESS;
        this.notes = notes != null ? notes.trim() : null;
        this.paidAt = Instant.now();
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getBusinessId() { return businessId; }
    public UUID getStoreId() { return storeId; }
    public UUID getSaleId() { return saleId; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public BigDecimal getAmount() { return amount; }
    public BigDecimal getTenderedAmount() { return tenderedAmount; }
    public BigDecimal getChangeAmount() { return changeAmount; }
    public String getTransactionReference() { return transactionReference; }
    public PaymentStatus getStatus() { return status; }
    public Instant getPaidAt() { return paidAt; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }
}
