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
@Table(name = "supplier_products")
public class SupplierProduct extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "supplier_id", nullable = false)
    private UUID supplierId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "supplier_product_code", length = 100)
    private String supplierProductCode;

    @Column(name = "supplier_product_name")
    private String supplierProductName;

    @Column(name = "purchase_unit", nullable = false, length = 50)
    private String purchaseUnit;

    @Column(name = "conversion_factor", nullable = false)
    private int conversionFactor = 1;

    @Column(name = "last_purchase_price", precision = 12, scale = 2)
    private BigDecimal lastPurchasePrice;

    @Column(name = "is_preferred", nullable = false)
    private boolean isPreferred = false;

    @Column(name = "min_order_quantity", precision = 12, scale = 3)
    private BigDecimal minOrderQuantity;

    @Column(name = "lead_time_days")
    private Integer leadTimeDays;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private SupplierProductStatus status = SupplierProductStatus.ACTIVE;

    protected SupplierProduct() {
        // Required by JPA
    }

    public SupplierProduct(
        UUID businessId,
        UUID supplierId,
        UUID productId,
        String supplierProductCode,
        String supplierProductName,
        String purchaseUnit,
        Integer conversionFactor,
        BigDecimal lastPurchasePrice,
        Boolean isPreferred,
        BigDecimal minOrderQuantity,
        Integer leadTimeDays
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.supplierId = Objects.requireNonNull(supplierId, "supplierId must not be null");
        this.productId = Objects.requireNonNull(productId, "productId must not be null");
        this.supplierProductCode = supplierProductCode != null ? supplierProductCode.trim() : null;
        this.supplierProductName = supplierProductName != null ? supplierProductName.trim() : null;
        setPurchaseUnit(purchaseUnit);
        setConversionFactor(conversionFactor != null ? conversionFactor : 1);
        this.lastPurchasePrice = lastPurchasePrice;
        this.isPreferred = isPreferred != null ? isPreferred : false;
        this.minOrderQuantity = minOrderQuantity;
        setLeadTimeDays(leadTimeDays);
        this.status = SupplierProductStatus.ACTIVE;
    }

    public void update(
        String supplierProductCode,
        String supplierProductName,
        String purchaseUnit,
        Integer conversionFactor,
        BigDecimal lastPurchasePrice,
        Boolean isPreferred,
        BigDecimal minOrderQuantity,
        Integer leadTimeDays,
        SupplierProductStatus status
    ) {
        if (supplierProductCode != null) {
            this.supplierProductCode = supplierProductCode.trim();
        }
        if (supplierProductName != null) {
            this.supplierProductName = supplierProductName.trim();
        }
        if (purchaseUnit != null) {
            setPurchaseUnit(purchaseUnit);
        }
        if (conversionFactor != null) {
            setConversionFactor(conversionFactor);
        }
        if (lastPurchasePrice != null) {
            this.lastPurchasePrice = lastPurchasePrice;
        }
        if (isPreferred != null) {
            this.isPreferred = isPreferred;
        }
        if (minOrderQuantity != null) {
            this.minOrderQuantity = minOrderQuantity;
        }
        if (leadTimeDays != null) {
            setLeadTimeDays(leadTimeDays);
        }
        if (status != null) {
            this.status = status;
        }
    }

    public void recordLastPurchasePrice(BigDecimal price) {
        if (price != null && price.compareTo(BigDecimal.ZERO) >= 0) {
            this.lastPurchasePrice = price;
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getBusinessId() {
        return businessId;
    }

    public UUID getSupplierId() {
        return supplierId;
    }

    public UUID getProductId() {
        return productId;
    }

    public String getSupplierProductCode() {
        return supplierProductCode;
    }

    public String getSupplierProductName() {
        return supplierProductName;
    }

    public String getPurchaseUnit() {
        return purchaseUnit;
    }

    public void setPurchaseUnit(String purchaseUnit) {
        Objects.requireNonNull(purchaseUnit, "purchaseUnit must not be null");
        String trimmed = purchaseUnit.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("purchaseUnit must not be blank");
        }
        this.purchaseUnit = trimmed;
    }

    public int getConversionFactor() {
        return conversionFactor;
    }

    public void setConversionFactor(int conversionFactor) {
        if (conversionFactor < 1) {
            throw new IllegalArgumentException("conversionFactor must be at least 1");
        }
        this.conversionFactor = conversionFactor;
    }

    public BigDecimal getLastPurchasePrice() {
        return lastPurchasePrice;
    }

    public boolean isPreferred() {
        return isPreferred;
    }

    public BigDecimal getMinOrderQuantity() {
        return minOrderQuantity;
    }

    public Integer getLeadTimeDays() {
        return leadTimeDays;
    }

    public void setLeadTimeDays(Integer leadTimeDays) {
        if (leadTimeDays != null && leadTimeDays < 0) {
            throw new IllegalArgumentException("leadTimeDays must be non-negative");
        }
        this.leadTimeDays = leadTimeDays;
    }

    public SupplierProductStatus getStatus() {
        return status;
    }

    public void setStatus(SupplierProductStatus status) {
        this.status = Objects.requireNonNull(status, "status must not be null");
    }
}
