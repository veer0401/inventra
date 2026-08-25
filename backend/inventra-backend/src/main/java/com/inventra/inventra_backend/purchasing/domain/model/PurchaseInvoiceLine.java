package com.inventra.inventra_backend.purchasing.domain.model;

import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "purchase_invoice_lines")
public class PurchaseInvoiceLine {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "purchase_invoice_id", nullable = false)
    private UUID purchaseInvoiceId;

    @Column(name = "goods_receipt_line_id")
    private UUID goodsReceiptLineId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "line_number", nullable = false)
    private int lineNumber;

    @Column(name = "invoiced_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal invoicedQuantity;

    @Column(name = "unit_cost", nullable = false, precision = 14, scale = 4)
    private BigDecimal unitCost;

    @Column(name = "discount_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal discountAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "tax_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal taxRate = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    @Column(name = "tax_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal taxAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "line_total", nullable = false, precision = 14, scale = 4)
    private BigDecimal lineTotal;

    protected PurchaseInvoiceLine() {
        // Required by JPA
    }

    public PurchaseInvoiceLine(
        UUID businessId,
        UUID purchaseInvoiceId,
        UUID goodsReceiptLineId,
        UUID productId,
        int lineNumber,
        BigDecimal invoicedQuantity,
        BigDecimal unitCost,
        BigDecimal discountAmount,
        BigDecimal taxRate
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.purchaseInvoiceId = Objects.requireNonNull(purchaseInvoiceId, "purchaseInvoiceId must not be null");
        this.goodsReceiptLineId = goodsReceiptLineId;
        this.productId = Objects.requireNonNull(productId, "productId must not be null");
        this.lineNumber = lineNumber;
        this.invoicedQuantity = Objects.requireNonNull(invoicedQuantity, "invoicedQuantity must not be null");
        this.unitCost = Objects.requireNonNull(unitCost, "unitCost must not be null");
        this.discountAmount = discountAmount != null ? discountAmount.setScale(4, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        this.taxRate = taxRate != null ? taxRate : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        calculateLineTotal();
    }

    public void calculateLineTotal() {
        BigDecimal gross = this.invoicedQuantity.multiply(this.unitCost);
        BigDecimal net = gross.subtract(this.discountAmount);
        this.taxAmount = net.multiply(this.taxRate).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        this.lineTotal = net.add(this.taxAmount).setScale(4, RoundingMode.HALF_UP);
    }

    public UUID getId() {
        return id;
    }

    public UUID getBusinessId() {
        return businessId;
    }

    public UUID getPurchaseInvoiceId() {
        return purchaseInvoiceId;
    }

    public UUID getGoodsReceiptLineId() {
        return goodsReceiptLineId;
    }

    public UUID getProductId() {
        return productId;
    }

    public int getLineNumber() {
        return lineNumber;
    }

    public BigDecimal getInvoicedQuantity() {
        return invoicedQuantity;
    }

    public BigDecimal getUnitCost() {
        return unitCost;
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public BigDecimal getTaxRate() {
        return taxRate;
    }

    public BigDecimal getTaxAmount() {
        return taxAmount;
    }

    public BigDecimal getLineTotal() {
        return lineTotal;
    }
}
