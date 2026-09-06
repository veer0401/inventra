package com.inventra.inventra_backend.catalog.domain.model;

import com.inventra.inventra_backend.common.domain.BaseAuditableEntity;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
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
@Table(name = "global_medicines")
public class GlobalMedicine extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "generic_name", nullable = false, length = 255)
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

    @Column(name = "category_name", length = 100)
    private String categoryName;

    @Column(name = "barcode", length = 100)
    private String barcode;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private GlobalMedicineStatus status;

    protected GlobalMedicine() {
        // JPA
    }

    public GlobalMedicine(
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
        Boolean prescriptionRequired,
        String categoryName,
        String barcode,
        String description
    ) {
        this.id = UuidUtils.newUuid7();
        this.name = validateRequired(name, "Medicine name");
        this.genericName = validateRequired(genericName, "Generic salt name");
        this.brandName = brandName != null ? brandName.trim() : null;
        this.manufacturer = manufacturer != null ? manufacturer.trim() : null;
        this.dosageForm = Objects.requireNonNull(dosageForm, "dosageForm must not be null");
        this.strength = strength != null ? strength.trim() : null;
        this.baseUnit = validateRequired(baseUnit, "Base unit");
        this.sellingUnit = sellingUnit != null && !sellingUnit.isBlank() ? sellingUnit.trim() : "Unit";
        this.unitsPerSellingUnit = validateUnitsPerSellingUnit(unitsPerSellingUnit);
        this.hsnCode = hsnCode != null ? hsnCode.trim() : null;
        this.taxRate = validateTaxRate(taxRate);
        this.prescriptionRequired = prescriptionRequired != null ? prescriptionRequired : false;
        this.categoryName = categoryName != null ? categoryName.trim() : null;
        this.barcode = barcode != null ? barcode.trim() : null;
        this.description = description != null ? description.trim() : null;
        this.status = GlobalMedicineStatus.ACTIVE;
    }

    public void update(
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
        Boolean prescriptionRequired,
        String categoryName,
        String barcode,
        String description,
        GlobalMedicineStatus status
    ) {
        if (name != null) {
            this.name = validateRequired(name, "Medicine name");
        }
        if (genericName != null) {
            this.genericName = validateRequired(genericName, "Generic salt name");
        }
        if (brandName != null) {
            this.brandName = brandName.trim();
        }
        if (manufacturer != null) {
            this.manufacturer = manufacturer.trim();
        }
        if (dosageForm != null) {
            this.dosageForm = dosageForm;
        }
        if (strength != null) {
            this.strength = strength.trim();
        }
        if (baseUnit != null) {
            this.baseUnit = validateRequired(baseUnit, "Base unit");
        }
        if (sellingUnit != null) {
            this.sellingUnit = sellingUnit.trim();
        }
        if (unitsPerSellingUnit != null) {
            this.unitsPerSellingUnit = validateUnitsPerSellingUnit(unitsPerSellingUnit);
        }
        if (hsnCode != null) {
            this.hsnCode = hsnCode.trim();
        }
        if (taxRate != null) {
            this.taxRate = validateTaxRate(taxRate);
        }
        if (prescriptionRequired != null) {
            this.prescriptionRequired = prescriptionRequired;
        }
        if (categoryName != null) {
            this.categoryName = categoryName.trim();
        }
        if (barcode != null) {
            this.barcode = barcode.trim();
        }
        if (description != null) {
            this.description = description.trim();
        }
        if (status != null) {
            this.status = status;
        }
    }

    public void setStatus(GlobalMedicineStatus status) {
        this.status = Objects.requireNonNull(status, "status must not be null");
    }

    private static String validateRequired(String val, String fieldName) {
        if (val == null || val.isBlank()) {
            throw new BusinessRuleViolationException("FIELD_REQUIRED", fieldName + " must not be blank");
        }
        return val.trim();
    }

    private static int validateUnitsPerSellingUnit(Integer units) {
        int val = units != null ? units : 1;
        if (val < 1) {
            throw new BusinessRuleViolationException(
                "INVALID_PACKAGING_CONVERSION",
                "unitsPerSellingUnit must be greater than or equal to 1"
            );
        }
        return val;
    }

    private static BigDecimal validateTaxRate(BigDecimal rate) {
        BigDecimal val = rate != null ? rate : BigDecimal.ZERO;
        if (val.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessRuleViolationException("INVALID_TAX_RATE", "taxRate must be non-negative");
        }
        return val;
    }

    public UUID getId() {
        return id;
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

    public String getCategoryName() {
        return categoryName;
    }

    public String getBarcode() {
        return barcode;
    }

    public String getDescription() {
        return description;
    }

    public GlobalMedicineStatus getStatus() {
        return status;
    }
}
