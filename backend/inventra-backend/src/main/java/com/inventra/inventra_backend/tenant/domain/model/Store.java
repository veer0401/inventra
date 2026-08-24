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
@Table(name = "stores")
public class Store extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false)
    private UUID businessId;

    @Column(name = "store_code", nullable = false, length = 50)
    private String storeCode;

    @Column(name = "store_name", nullable = false, length = 200)
    private String storeName;

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

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "email")
    private String email;

    @Column(name = "is_headquarters", nullable = false)
    private boolean isHeadquarters = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private StoreStatus status = StoreStatus.ACTIVE;

    protected Store() {
        // Required by JPA
    }

    public Store(
        UUID id,
        UUID businessId,
        String storeCode,
        String storeName,
        boolean isHeadquarters
    ) {
        this.id = id != null ? id : UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "Business ID cannot be null");
        setStoreCode(storeCode);
        setStoreName(storeName);
        this.isHeadquarters = isHeadquarters;
        this.status = StoreStatus.ACTIVE;
    }

    public static Store create(
        UUID businessId,
        String storeCode,
        String storeName,
        boolean isHeadquarters
    ) {
        return new Store(UuidUtils.newUuid7(), businessId, storeCode, storeName, isHeadquarters);
    }

    public UUID getId() {
        return id;
    }

    public UUID getBusinessId() {
        return businessId;
    }

    public String getStoreCode() {
        return storeCode;
    }

    public void setStoreCode(String storeCode) {
        Objects.requireNonNull(storeCode, "Store code cannot be null");
        String normalized = storeCode.trim().toUpperCase();
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("Store code cannot be blank");
        }
        this.storeCode = normalized;
    }

    public String getStoreName() {
        return storeName;
    }

    public void setStoreName(String storeName) {
        Objects.requireNonNull(storeName, "Store name cannot be null");
        String trimmed = storeName.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Store name cannot be blank");
        }
        this.storeName = trimmed;
    }

    public String getAddressLine1() {
        return addressLine1;
    }

    public void setAddressLine1(String addressLine1) {
        this.addressLine1 = addressLine1;
    }

    public String getAddressLine2() {
        return addressLine2;
    }

    public void setAddressLine2(String addressLine2) {
        this.addressLine2 = addressLine2;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getPostalCode() {
        return postalCode;
    }

    public void setPostalCode(String postalCode) {
        this.postalCode = postalCode;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public boolean isHeadquarters() {
        return isHeadquarters;
    }

    public void setHeadquarters(boolean headquarters) {
        isHeadquarters = headquarters;
    }

    public StoreStatus getStatus() {
        return status;
    }

    public void setStatus(StoreStatus status) {
        this.status = Objects.requireNonNull(status, "Status cannot be null");
    }

    public boolean isActive() {
        return this.status == StoreStatus.ACTIVE;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Store store)) return false;
        return id != null && id.equals(store.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
