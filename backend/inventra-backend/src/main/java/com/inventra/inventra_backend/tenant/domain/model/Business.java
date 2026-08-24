package com.inventra.inventra_backend.tenant.domain.model;

import com.inventra.inventra_backend.common.domain.BaseAuditableEntity;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "businesses")
public class Business extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "legal_name", nullable = false)
    private String legalName;

    @Column(name = "trade_name")
    private String tradeName;

    @Column(name = "drug_license_number", length = 100)
    private String drugLicenseNumber;

    @Column(name = "gstin", length = 20)
    private String gstin;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private BusinessStatus status = BusinessStatus.ACTIVE;

    protected Business() {
        // Required by JPA
    }

    public Business(UUID id, String legalName, String tradeName, String drugLicenseNumber, String gstin) {
        this.id = id != null ? id : UuidUtils.newUuid7();
        setLegalName(legalName);
        this.tradeName = tradeName != null ? tradeName.trim() : null;
        this.drugLicenseNumber = drugLicenseNumber != null ? drugLicenseNumber.trim() : null;
        this.gstin = gstin != null ? gstin.trim() : null;
        this.status = BusinessStatus.ACTIVE;
    }

    public static Business create(String legalName, String tradeName, String drugLicenseNumber, String gstin) {
        return new Business(UuidUtils.newUuid7(), legalName, tradeName, drugLicenseNumber, gstin);
    }

    public UUID getId() {
        return id;
    }

    public String getLegalName() {
        return legalName;
    }

    public void setLegalName(String legalName) {
        Objects.requireNonNull(legalName, "Legal name cannot be null");
        String trimmed = legalName.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Legal name cannot be blank");
        }
        this.legalName = trimmed;
    }

    public String getTradeName() {
        return tradeName;
    }

    public void setTradeName(String tradeName) {
        this.tradeName = tradeName != null ? tradeName.trim() : null;
    }

    public String getDrugLicenseNumber() {
        return drugLicenseNumber;
    }

    public void setDrugLicenseNumber(String drugLicenseNumber) {
        this.drugLicenseNumber = drugLicenseNumber != null ? drugLicenseNumber.trim() : null;
    }

    public String getGstin() {
        return gstin;
    }

    public void setGstin(String gstin) {
        this.gstin = gstin != null ? gstin.trim() : null;
    }

    public BusinessStatus getStatus() {
        return status;
    }

    public void setStatus(BusinessStatus status) {
        this.status = Objects.requireNonNull(status, "Status cannot be null");
    }

    public boolean isActive() {
        return this.status == BusinessStatus.ACTIVE;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Business business)) return false;
        return id != null && id.equals(business.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
