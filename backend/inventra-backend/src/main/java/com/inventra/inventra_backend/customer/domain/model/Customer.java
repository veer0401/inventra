package com.inventra.inventra_backend.customer.domain.model;

import com.inventra.inventra_backend.common.domain.BaseAuditableEntity;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "customers")
public class Customer extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "customer_code", nullable = false, length = 30)
    private String customerCode;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "phone", nullable = false, length = 30)
    private String phone;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "gstin", length = 20)
    private String gstin;

    @Column(name = "notes", length = 500)
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private CustomerStatus status = CustomerStatus.ACTIVE;

    @Column(name = "created_by")
    private UUID createdBy;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    protected Customer() {}

    public Customer(
        UUID businessId,
        String customerCode,
        String fullName,
        String phone,
        String email,
        String address,
        String gstin,
        String notes,
        UUID createdBy
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId is required");
        this.customerCode = Objects.requireNonNull(customerCode, "customerCode is required").trim().toUpperCase();
        this.fullName = Objects.requireNonNull(fullName, "fullName is required").trim();
        this.phone = Objects.requireNonNull(phone, "phone is required").trim();
        this.email = email != null && !email.isBlank() ? email.trim().toLowerCase() : null;
        this.address = address != null && !address.isBlank() ? address.trim() : null;
        this.gstin = gstin != null && !gstin.isBlank() ? gstin.trim().toUpperCase() : null;
        this.notes = notes != null && !notes.isBlank() ? notes.trim() : null;
        this.status = CustomerStatus.ACTIVE;
        this.createdBy = createdBy;
    }

    public void update(
        String fullName,
        String phone,
        String email,
        String address,
        String gstin,
        String notes,
        CustomerStatus status
    ) {
        if (fullName != null && !fullName.isBlank()) {
            this.fullName = fullName.trim();
        }
        if (phone != null && !phone.isBlank()) {
            this.phone = phone.trim();
        }
        this.email = email != null && !email.isBlank() ? email.trim().toLowerCase() : null;
        this.address = address != null && !address.isBlank() ? address.trim() : null;
        this.gstin = gstin != null && !gstin.isBlank() ? gstin.trim().toUpperCase() : null;
        this.notes = notes != null && !notes.isBlank() ? notes.trim() : null;
        if (status != null) {
            this.status = status;
        }
    }

    public UUID getId() { return id; }
    public UUID getBusinessId() { return businessId; }
    public String getCustomerCode() { return customerCode; }
    public String getFullName() { return fullName; }
    public String getPhone() { return phone; }
    public String getEmail() { return email; }
    public String getAddress() { return address; }
    public String getGstin() { return gstin; }
    public String getNotes() { return notes; }
    public CustomerStatus getStatus() { return status; }
    public UUID getCreatedBy() { return createdBy; }
    public Long getVersion() { return version; }
}
