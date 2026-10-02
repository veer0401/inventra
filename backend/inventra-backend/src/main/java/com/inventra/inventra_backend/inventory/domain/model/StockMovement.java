package com.inventra.inventra_backend.inventory.domain.model;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Append-only immutable stock movement ledger.
 *
 * <p>Source of Truth: {@code quantityDelta}
 * <p>Audit Snapshot: {@code balanceAfter} represents the materialized balance observed
 * immediately after this movement was applied in the server transaction sequence. It is
 * NOT the source of truth and must not be used to reconstruct inventory.
 */
@Entity
@Table(name = "stock_movements")
@EntityListeners(AuditingEntityListener.class)
public class StockMovement {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "store_id", nullable = false, updatable = false)
    private UUID storeId;

    @Column(name = "product_id", nullable = false, updatable = false)
    private UUID productId;

    @Column(name = "batch_id", updatable = false)
    private UUID batchId;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false, updatable = false, length = 40)
    private StockMovementType movementType;

    @Column(name = "quantity_delta", nullable = false, updatable = false, precision = 12, scale = 3)
    private BigDecimal quantityDelta;

    @Column(name = "unit_cost", updatable = false, precision = 12, scale = 2)
    private BigDecimal unitCost;

    @Column(name = "balance_after", nullable = false, updatable = false, precision = 12, scale = 3)
    private BigDecimal balanceAfter;

    @Column(name = "reference_type", updatable = false, length = 50)
    private String referenceType;

    @Column(name = "reference_id", updatable = false)
    private UUID referenceId;

    @Column(name = "reason", updatable = false, length = 255)
    private String reason;

    @Column(name = "user_id", updatable = false)
    private UUID userId;

    @Column(name = "device_id", updatable = false)
    private UUID deviceId;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected StockMovement() {
        // Required by JPA
    }

    public StockMovement(
        UUID businessId,
        UUID storeId,
        UUID productId,
        UUID batchId,
        StockMovementType movementType,
        BigDecimal quantityDelta,
        BigDecimal unitCost,
        BigDecimal balanceAfter,
        String referenceType,
        UUID referenceId,
        String reason,
        UUID userId,
        UUID deviceId,
        Instant occurredAt
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.storeId = Objects.requireNonNull(storeId, "storeId must not be null");
        this.productId = Objects.requireNonNull(productId, "productId must not be null");
        this.batchId = batchId;
        this.movementType = Objects.requireNonNull(movementType, "movementType must not be null");
        this.quantityDelta = Objects.requireNonNull(quantityDelta, "quantityDelta must not be null").setScale(3, RoundingMode.HALF_UP);
        if (this.quantityDelta.compareTo(BigDecimal.ZERO) == 0) {
            throw new BusinessRuleViolationException("ZERO_QUANTITY_DELTA", "Stock movement delta must not be zero");
        }
        this.unitCost = unitCost != null ? unitCost.setScale(2, RoundingMode.HALF_UP) : null;
        this.balanceAfter = Objects.requireNonNull(balanceAfter, "balanceAfter must not be null").setScale(3, RoundingMode.HALF_UP);
        this.referenceType = referenceType != null ? referenceType.trim() : null;
        this.referenceId = referenceId;
        this.reason = reason != null ? reason.trim() : null;
        this.userId = userId;
        this.deviceId = deviceId;
        this.occurredAt = occurredAt != null ? occurredAt : Instant.now();
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

    public UUID getProductId() {
        return productId;
    }

    public UUID getBatchId() {
        return batchId;
    }

    public StockMovementType getMovementType() {
        return movementType;
    }

    public BigDecimal getQuantityDelta() {
        return quantityDelta;
    }

    public BigDecimal getUnitCost() {
        return unitCost;
    }

    public BigDecimal getBalanceAfter() {
        return balanceAfter;
    }

    public String getReferenceType() {
        return referenceType;
    }

    public UUID getReferenceId() {
        return referenceId;
    }

    public String getReason() {
        return reason;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getDeviceId() {
        return deviceId;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
