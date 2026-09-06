package com.inventra.inventra_backend.onboarding.domain.model;

import com.inventra.inventra_backend.common.domain.BaseAuditableEntity;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "business_registration_applications")
public class BusinessRegistrationApplication extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "applicant_name", nullable = false, length = 150)
    private String applicantName;

    @Column(name = "applicant_email", nullable = false)
    private String applicantEmail;

    @Column(name = "applicant_phone", length = 20)
    private String applicantPhone;

    @Column(name = "business_name", nullable = false)
    private String businessName;

    @Column(name = "trade_name")
    private String tradeName;

    @Column(name = "drug_license_number", length = 100)
    private String drugLicenseNumber;

    @Column(name = "gstin", length = 20)
    private String gstin;

    @Column(name = "store_name", nullable = false, length = 200)
    private String storeName;

    @Column(name = "store_code", nullable = false, length = 50)
    private String storeCode;

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

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private OnboardingApplicationStatus status = OnboardingApplicationStatus.PENDING_REVIEW;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt = Instant.now();

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "rejection_reason", length = 1000)
    private String rejectionReason;

    @Column(name = "activation_token_hash", length = 64)
    private String activationTokenHash;

    @Column(name = "activation_token_expires_at")
    private Instant activationTokenExpiresAt;

    @Column(name = "activation_completed_at")
    private Instant activationCompletedAt;

    @Column(name = "created_business_id")
    private UUID createdBusinessId;

    @Column(name = "created_user_id")
    private UUID createdUserId;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    protected BusinessRegistrationApplication() {
        // Required by JPA
    }

    public BusinessRegistrationApplication(
        UUID id,
        String applicantName,
        String applicantEmail,
        String applicantPhone,
        String businessName,
        String tradeName,
        String drugLicenseNumber,
        String gstin,
        String storeName,
        String storeCode,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String postalCode
    ) {
        this.id = id != null ? id : UuidUtils.newUuid7();
        setApplicantName(applicantName);
        setApplicantEmail(applicantEmail);
        this.applicantPhone = applicantPhone != null ? applicantPhone.trim() : null;
        setBusinessName(businessName);
        this.tradeName = tradeName != null ? tradeName.trim() : null;
        this.drugLicenseNumber = drugLicenseNumber != null ? drugLicenseNumber.trim() : null;
        this.gstin = gstin != null ? gstin.trim() : null;
        setStoreName(storeName);
        this.storeCode = (storeCode != null && !storeCode.trim().isEmpty()) ? storeCode.trim() : "MAIN-01";
        this.addressLine1 = addressLine1 != null ? addressLine1.trim() : null;
        this.addressLine2 = addressLine2 != null ? addressLine2.trim() : null;
        this.city = city != null ? city.trim() : null;
        this.state = state != null ? state.trim() : null;
        this.postalCode = postalCode != null ? postalCode.trim() : null;
        this.status = OnboardingApplicationStatus.PENDING_REVIEW;
        this.submittedAt = Instant.now();
    }

    public static BusinessRegistrationApplication create(
        String applicantName,
        String applicantEmail,
        String applicantPhone,
        String businessName,
        String tradeName,
        String drugLicenseNumber,
        String gstin,
        String storeName,
        String storeCode,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String postalCode
    ) {
        return new BusinessRegistrationApplication(
            UuidUtils.newUuid7(),
            applicantName,
            applicantEmail,
            applicantPhone,
            businessName,
            tradeName,
            drugLicenseNumber,
            gstin,
            storeName,
            storeCode,
            addressLine1,
            addressLine2,
            city,
            state,
            postalCode
        );
    }

    public void approve(UUID adminUserId, UUID businessId, UUID userId, String tokenHash, Instant expiresAt) {
        if (this.status != OnboardingApplicationStatus.PENDING_REVIEW) {
            throw new BusinessRuleViolationException(
                "INVALID_APPLICATION_STATUS",
                "Only applications with PENDING_REVIEW status can be approved. Current status: " + this.status
            );
        }
        this.status = OnboardingApplicationStatus.APPROVED;
        this.reviewedAt = Instant.now();
        this.reviewedBy = adminUserId;
        this.createdBusinessId = Objects.requireNonNull(businessId, "Business ID required for approval");
        this.createdUserId = Objects.requireNonNull(userId, "User ID required for approval");
        this.activationTokenHash = Objects.requireNonNull(tokenHash, "Activation token hash required");
        this.activationTokenExpiresAt = Objects.requireNonNull(expiresAt, "Token expiration required");
    }

    public void reject(UUID adminUserId, String reason) {
        if (this.status != OnboardingApplicationStatus.PENDING_REVIEW) {
            throw new BusinessRuleViolationException(
                "INVALID_APPLICATION_STATUS",
                "Only applications with PENDING_REVIEW status can be rejected. Current status: " + this.status
            );
        }
        if (reason == null || reason.trim().isBlank()) {
            throw new BusinessRuleViolationException("REJECTION_REASON_REQUIRED", "Rejection reason cannot be blank");
        }
        this.status = OnboardingApplicationStatus.REJECTED;
        this.reviewedAt = Instant.now();
        this.reviewedBy = adminUserId;
        this.rejectionReason = reason.trim();
    }

    public void completeActivation() {
        if (this.status != OnboardingApplicationStatus.APPROVED) {
            throw new BusinessRuleViolationException(
                "INVALID_APPLICATION_STATUS",
                "Only APPROVED applications can be activated"
            );
        }
        if (this.activationCompletedAt != null) {
            throw new BusinessRuleViolationException("TOKEN_ALREADY_USED", "Activation token has already been used");
        }
        if (this.activationTokenExpiresAt == null || Instant.now().isAfter(this.activationTokenExpiresAt)) {
            throw new BusinessRuleViolationException("TOKEN_EXPIRED", "Activation token has expired");
        }
        this.activationCompletedAt = Instant.now();
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public String getApplicantName() {
        return applicantName;
    }

    public void setApplicantName(String applicantName) {
        Objects.requireNonNull(applicantName, "Applicant name cannot be null");
        String trimmed = applicantName.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Applicant name cannot be blank");
        }
        this.applicantName = trimmed;
    }

    public String getApplicantEmail() {
        return applicantEmail;
    }

    public void setApplicantEmail(String applicantEmail) {
        Objects.requireNonNull(applicantEmail, "Applicant email cannot be null");
        String normalized = applicantEmail.trim().toLowerCase();
        if (normalized.isEmpty() || !normalized.contains("@")) {
            throw new IllegalArgumentException("Invalid email: " + applicantEmail);
        }
        this.applicantEmail = normalized;
    }

    public String getApplicantPhone() {
        return applicantPhone;
    }

    public void setApplicantPhone(String applicantPhone) {
        this.applicantPhone = applicantPhone != null ? applicantPhone.trim() : null;
    }

    public String getBusinessName() {
        return businessName;
    }

    public void setBusinessName(String businessName) {
        Objects.requireNonNull(businessName, "Business name cannot be null");
        String trimmed = businessName.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Business name cannot be blank");
        }
        this.businessName = trimmed;
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

    public String getStoreCode() {
        return storeCode;
    }

    public void setStoreCode(String storeCode) {
        this.storeCode = (storeCode != null && !storeCode.trim().isEmpty()) ? storeCode.trim() : "MAIN-01";
    }

    public String getAddressLine1() {
        return addressLine1;
    }

    public void setAddressLine1(String addressLine1) {
        this.addressLine1 = addressLine1 != null ? addressLine1.trim() : null;
    }

    public String getAddressLine2() {
        return addressLine2;
    }

    public void setAddressLine2(String addressLine2) {
        this.addressLine2 = addressLine2 != null ? addressLine2.trim() : null;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city != null ? city.trim() : null;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state != null ? state.trim() : null;
    }

    public String getPostalCode() {
        return postalCode;
    }

    public void setPostalCode(String postalCode) {
        this.postalCode = postalCode != null ? postalCode.trim() : null;
    }

    public OnboardingApplicationStatus getStatus() {
        return status;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public UUID getReviewedBy() {
        return reviewedBy;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public String getActivationTokenHash() {
        return activationTokenHash;
    }

    public Instant getActivationTokenExpiresAt() {
        return activationTokenExpiresAt;
    }

    public Instant getActivationCompletedAt() {
        return activationCompletedAt;
    }

    public UUID getCreatedBusinessId() {
        return createdBusinessId;
    }

    public UUID getCreatedUserId() {
        return createdUserId;
    }

    public Long getVersion() {
        return version;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof BusinessRegistrationApplication that)) return false;
        return id != null && id.equals(that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
