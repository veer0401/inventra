package com.inventra.inventra_backend.catalog.domain.model;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "product_identifiers")
@EntityListeners(AuditingEntityListener.class)
public class ProductIdentifier {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "product_id", nullable = false, updatable = false)
    private UUID productId;

    @Enumerated(EnumType.STRING)
    @Column(name = "identifier_type", nullable = false, length = 30)
    private IdentifierType identifierType;

    @Column(name = "identifier_value", nullable = false, length = 100)
    private String identifierValue;

    @Column(name = "is_primary", nullable = false)
    private boolean isPrimary;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ProductIdentifier() {
        // Required by JPA
    }

    public ProductIdentifier(
        UUID businessId,
        UUID productId,
        IdentifierType identifierType,
        String identifierValue,
        Boolean isPrimary
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.productId = Objects.requireNonNull(productId, "productId must not be null");
        this.identifierType = Objects.requireNonNull(identifierType, "identifierType must not be null");
        this.identifierValue = normalizeValue(identifierValue);
        this.isPrimary = isPrimary != null ? isPrimary : false;
    }

    private static String normalizeValue(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessRuleViolationException("IDENTIFIER_VALUE_REQUIRED", "Identifier value must not be blank");
        }
        return value.trim().toUpperCase();
    }

    public void setPrimary(boolean isPrimary) {
        this.isPrimary = isPrimary;
    }

    public UUID getId() {
        return id;
    }

    public UUID getBusinessId() {
        return businessId;
    }

    public UUID getProductId() {
        return productId;
    }

    public IdentifierType getIdentifierType() {
        return identifierType;
    }

    public String getIdentifierValue() {
        return identifierValue;
    }

    public boolean isPrimary() {
        return isPrimary;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
