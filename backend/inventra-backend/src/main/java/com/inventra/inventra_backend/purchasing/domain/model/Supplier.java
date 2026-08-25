package com.inventra.inventra_backend.purchasing.domain.model;

import com.inventra.inventra_backend.common.domain.BaseAuditableEntity;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "suppliers")
public class Supplier extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "supplier_code", nullable = false, length = 50)
    private String supplierCode;

    @Column(name = "legal_name", nullable = false, length = 200)
    private String legalName;

    @Column(name = "trade_name", length = 200)
    private String tradeName;

    @Enumerated(EnumType.STRING)
    @Column(name = "supplier_type", nullable = false, length = 50)
    private SupplierType supplierType = SupplierType.DISTRIBUTOR;

    @Column(name = "gstin", length = 20)
    private String gstin;

    @Column(name = "drug_license_number", length = 100)
    private String drugLicenseNumber;

    @Column(name = "pan", length = 20)
    private String pan;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "phone_number", length = 30)
    private String phoneNumber;

    @Column(name = "contact_person_name", length = 150)
    private String contactPersonName;

    @Column(name = "address_line1")
    private String addressLine1;

    @Column(name = "address_line2")
    private String addressLine2;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "state", length = 100)
    private String state;

    @Column(name = "postal_code", length = 20)
    private String postalCode;

    @Column(name = "payment_terms_days", nullable = false)
    private int paymentTermsDays = 0;

    @Column(name = "credit_limit", precision = 12, scale = 2)
    private BigDecimal creditLimit;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private SupplierStatus status = SupplierStatus.ACTIVE;

    @Column(name = "notes", length = 1000)
    private String notes;

    protected Supplier() {
        // Required by JPA
    }

    public Supplier(
        UUID businessId,
        String supplierCode,
        String legalName,
        String tradeName,
        SupplierType supplierType,
        String gstin,
        String drugLicenseNumber,
        String pan,
        String email,
        String phoneNumber,
        String contactPersonName,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String postalCode,
        Integer paymentTermsDays,
        BigDecimal creditLimit,
        String notes
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        setSupplierCode(supplierCode);
        setLegalName(legalName);
        this.tradeName = tradeName != null ? tradeName.trim() : null;
        this.supplierType = supplierType != null ? supplierType : SupplierType.DISTRIBUTOR;
        this.gstin = gstin != null ? gstin.trim().toUpperCase() : null;
        this.drugLicenseNumber = drugLicenseNumber != null ? drugLicenseNumber.trim() : null;
        this.pan = pan != null ? pan.trim().toUpperCase() : null;
        this.email = email != null ? email.trim() : null;
        this.phoneNumber = phoneNumber != null ? phoneNumber.trim() : null;
        this.contactPersonName = contactPersonName != null ? contactPersonName.trim() : null;
        this.addressLine1 = addressLine1 != null ? addressLine1.trim() : null;
        this.addressLine2 = addressLine2 != null ? addressLine2.trim() : null;
        this.city = city != null ? city.trim() : null;
        this.state = state != null ? state.trim() : null;
        this.postalCode = postalCode != null ? postalCode.trim() : null;
        setPaymentTermsDays(paymentTermsDays != null ? paymentTermsDays : 0);
        setCreditLimit(creditLimit);
        this.status = SupplierStatus.ACTIVE;
        this.notes = notes != null ? notes.trim() : null;
    }

    public void update(
        String legalName,
        String tradeName,
        SupplierType supplierType,
        String gstin,
        String drugLicenseNumber,
        String pan,
        String email,
        String phoneNumber,
        String contactPersonName,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String postalCode,
        Integer paymentTermsDays,
        BigDecimal creditLimit,
        SupplierStatus status,
        String notes
    ) {
        if (legalName != null) {
            setLegalName(legalName);
        }
        if (tradeName != null) {
            this.tradeName = tradeName.trim();
        }
        if (supplierType != null) {
            this.supplierType = supplierType;
        }
        if (gstin != null) {
            this.gstin = gstin.trim().toUpperCase();
        }
        if (drugLicenseNumber != null) {
            this.drugLicenseNumber = drugLicenseNumber.trim();
        }
        if (pan != null) {
            this.pan = pan.trim().toUpperCase();
        }
        if (email != null) {
            this.email = email.trim();
        }
        if (phoneNumber != null) {
            this.phoneNumber = phoneNumber.trim();
        }
        if (contactPersonName != null) {
            this.contactPersonName = contactPersonName.trim();
        }
        if (addressLine1 != null) {
            this.addressLine1 = addressLine1.trim();
        }
        if (addressLine2 != null) {
            this.addressLine2 = addressLine2.trim();
        }
        if (city != null) {
            this.city = city.trim();
        }
        if (state != null) {
            this.state = state.trim();
        }
        if (postalCode != null) {
            this.postalCode = postalCode.trim();
        }
        if (paymentTermsDays != null) {
            setPaymentTermsDays(paymentTermsDays);
        }
        if (creditLimit != null) {
            setCreditLimit(creditLimit);
        }
        if (status != null) {
            this.status = status;
        }
        if (notes != null) {
            this.notes = notes.trim();
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getBusinessId() {
        return businessId;
    }

    public String getSupplierCode() {
        return supplierCode;
    }

    public void setSupplierCode(String supplierCode) {
        Objects.requireNonNull(supplierCode, "supplierCode must not be null");
        String normalized = supplierCode.trim().toUpperCase();
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("supplierCode must not be blank");
        }
        this.supplierCode = normalized;
    }

    public String getLegalName() {
        return legalName;
    }

    public void setLegalName(String legalName) {
        Objects.requireNonNull(legalName, "legalName must not be null");
        String trimmed = legalName.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("legalName must not be blank");
        }
        this.legalName = trimmed;
    }

    public String getTradeName() {
        return tradeName;
    }

    public SupplierType getSupplierType() {
        return supplierType;
    }

    public String getGstin() {
        return gstin;
    }

    public String getDrugLicenseNumber() {
        return drugLicenseNumber;
    }

    public String getPan() {
        return pan;
    }

    public String getEmail() {
        return email;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public String getContactPersonName() {
        return contactPersonName;
    }

    public String getAddressLine1() {
        return addressLine1;
    }

    public String getAddressLine2() {
        return addressLine2;
    }

    public String getCity() {
        return city;
    }

    public String getState() {
        return state;
    }

    public String getPostalCode() {
        return postalCode;
    }

    public int getPaymentTermsDays() {
        return paymentTermsDays;
    }

    public void setPaymentTermsDays(int paymentTermsDays) {
        if (paymentTermsDays < 0) {
            throw new IllegalArgumentException("paymentTermsDays must be non-negative");
        }
        this.paymentTermsDays = paymentTermsDays;
    }

    public BigDecimal getCreditLimit() {
        return creditLimit;
    }

    public void setCreditLimit(BigDecimal creditLimit) {
        if (creditLimit != null && creditLimit.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("creditLimit must be non-negative");
        }
        this.creditLimit = creditLimit;
    }

    public SupplierStatus getStatus() {
        return status;
    }

    public void setStatus(SupplierStatus status) {
        this.status = Objects.requireNonNull(status, "status must not be null");
    }

    public String getNotes() {
        return notes;
    }

    public boolean isActive() {
        return this.status == SupplierStatus.ACTIVE;
    }
}
