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
@Table(name = "products")
public class Product extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "category_id")
    private UUID categoryId;

    @Column(name = "global_product_id")
    private UUID globalProductId;

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

    @Column(name = "is_tax_inclusive", nullable = false)
    private boolean isTaxInclusive;

    @Column(name = "prescription_required", nullable = false)
    private boolean prescriptionRequired;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ProductStatus status;

    protected Product() {
        // Required by JPA
    }

    public Product(
        UUID businessId,
        UUID categoryId,
        UUID globalProductId,
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
        Boolean isTaxInclusive,
        Boolean prescriptionRequired
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.categoryId = categoryId;
        this.globalProductId = globalProductId;
        this.name = validateName(name);
        this.genericName = genericName != null ? genericName.trim() : null;
        this.brandName = brandName != null ? brandName.trim() : null;
        this.manufacturer = manufacturer != null ? manufacturer.trim() : null;
        this.dosageForm = Objects.requireNonNull(dosageForm, "dosageForm must not be null");
        this.strength = strength != null ? strength.trim() : null;
        this.baseUnit = validateUnit(baseUnit, "baseUnit");
        this.sellingUnit = sellingUnit != null && !sellingUnit.isBlank() ? sellingUnit.trim() : "Unit";
        this.unitsPerSellingUnit = validateUnitsPerSellingUnit(unitsPerSellingUnit);
        this.hsnCode = hsnCode != null ? hsnCode.trim() : null;
        this.taxRate = validateTaxRate(taxRate);
        this.isTaxInclusive = isTaxInclusive != null ? isTaxInclusive : true;
        this.prescriptionRequired = prescriptionRequired != null ? prescriptionRequired : false;
        this.status = ProductStatus.ACTIVE;
    }

    public void update(
        UUID categoryId,
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
        Boolean isTaxInclusive,
        Boolean prescriptionRequired,
        ProductStatus status
    ) {
        if (categoryId != null) {
            this.categoryId = categoryId;
        }
        if (name != null) {
            this.name = validateName(name);
        }
        if (genericName != null) {
            this.genericName = genericName.trim();
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
            this.baseUnit = validateUnit(baseUnit, "baseUnit");
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
        if (isTaxInclusive != null) {
            this.isTaxInclusive = isTaxInclusive;
        }
        if (prescriptionRequired != null) {
            this.prescriptionRequired = prescriptionRequired;
        }
        if (status != null) {
            this.status = status;
        }
    }

    private static String validateName(String name) {
        if (name == null || name.isBlank()) {
            throw new BusinessRuleViolationException("PRODUCT_NAME_REQUIRED", "Product name must not be blank");
        }
        return name.trim();
    }

    private static String validateUnit(String unit, String fieldName) {
        if (unit == null || unit.isBlank()) {
            throw new BusinessRuleViolationException("PRODUCT_UNIT_REQUIRED", fieldName + " must not be blank");
        }
        return unit.trim();
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

    public UUID getBusinessId() {
        return businessId;
    }

    public UUID getCategoryId() {
        return categoryId;
    }

    public UUID getGlobalProductId() {
        return globalProductId;
    }

    public void linkGlobalProduct(UUID globalProductId) {
        this.globalProductId = globalProductId;
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

    public boolean isTaxInclusive() {
        return isTaxInclusive;
    }

    public boolean isPrescriptionRequired() {
        return prescriptionRequired;
    }

    public ProductStatus getStatus() {
        return status;
    }
}
