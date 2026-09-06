package com.inventra.inventra_backend.catalog.domain.model;

import com.inventra.inventra_backend.common.domain.BaseAuditableEntity;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "global_medicine_suggestions")
public class GlobalMedicineSuggestion extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "product_id")
    private UUID productId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "generic_name", length = 255)
    private String genericName;

    @Column(name = "brand_name", length = 100)
    private String brandName;

    @Column(name = "manufacturer", length = 150)
    private String manufacturer;

    @Enumerated(EnumType.STRING)
    @Column(name = "dosage_form", nullable = false, length = 50)
    private DosageForm dosageForm;

    @Column(name = "strength", length = 50)
    private String strength;

    @Column(name = "base_unit", nullable = false, length = 30)
    private String baseUnit;

    @Column(name = "selling_unit", nullable = false, length = 50)
    private String sellingUnit;

    @Column(name = "units_per_selling_unit", nullable = false)
    private int unitsPerSellingUnit;

    @Column(name = "hsn_code", length = 20)
    private String hsnCode;

    @Column(name = "tax_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal taxRate;

    @Column(name = "prescription_required", nullable = false)
    private boolean prescriptionRequired;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private SuggestionStatus status;

    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "global_medicine_id")
    private UUID globalMedicineId;

    protected GlobalMedicineSuggestion() {
        // JPA
    }

    public GlobalMedicineSuggestion(
        UUID businessId,
        UUID productId,
        String name,
        String genericName,
        String brandName,
        String manufacturer,
        DosageForm dosageForm,
        String strength,
        String baseUnit,
        String sellingUnit,
        Integer unitsPerSellingUnit,
        String hsnCode,
        BigDecimal taxRate,
        Boolean prescriptionRequired
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.productId = productId;
        this.name = name != null ? name.trim() : "";
        this.genericName = genericName != null ? genericName.trim() : null;
        this.brandName = brandName != null ? brandName.trim() : null;
        this.manufacturer = manufacturer != null ? manufacturer.trim() : null;
        this.dosageForm = dosageForm != null ? dosageForm : DosageForm.GENERAL;
        this.strength = strength != null ? strength.trim() : null;
        this.baseUnit = baseUnit != null ? baseUnit.trim() : "Unit";
        this.sellingUnit = sellingUnit != null ? sellingUnit.trim() : "Unit";
        this.unitsPerSellingUnit = unitsPerSellingUnit != null && unitsPerSellingUnit >= 1 ? unitsPerSellingUnit : 1;
        this.hsnCode = hsnCode != null ? hsnCode.trim() : null;
        this.taxRate = taxRate != null ? taxRate : BigDecimal.ZERO;
        this.prescriptionRequired = prescriptionRequired != null ? prescriptionRequired : false;
        this.status = SuggestionStatus.PENDING;
    }

    public void markApproved(UUID globalMedicineId, UUID adminUserId, String notes) {
        this.status = SuggestionStatus.APPROVED;
        this.globalMedicineId = globalMedicineId;
        this.reviewedBy = adminUserId;
        this.reviewedAt = Instant.now();
        this.adminNotes = notes;
    }

    public void markRejected(UUID adminUserId, String reason) {
        this.status = SuggestionStatus.REJECTED;
        this.reviewedBy = adminUserId;
        this.reviewedAt = Instant.now();
        this.adminNotes = reason;
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

    public String getName() {
        return name;
    }

    public String getGenericName() {
        return genericName;
    }

    public String getBrandName() {
        return brandName;
    }

    public String getManufacturer() {
        return manufacturer;
    }

    public DosageForm getDosageForm() {
        return dosageForm;
    }

    public String getStrength() {
        return strength;
    }

    public String getBaseUnit() {
        return baseUnit;
    }

    public String getSellingUnit() {
        return sellingUnit;
    }

    public int getUnitsPerSellingUnit() {
        return unitsPerSellingUnit;
    }

    public String getHsnCode() {
        return hsnCode;
    }

    public BigDecimal getTaxRate() {
        return taxRate;
    }

    public boolean isPrescriptionRequired() {
        return prescriptionRequired;
    }

    public SuggestionStatus getStatus() {
        return status;
    }

    public String getAdminNotes() {
        return adminNotes;
    }

    public UUID getReviewedBy() {
        return reviewedBy;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public UUID getGlobalMedicineId() {
        return globalMedicineId;
    }
}
