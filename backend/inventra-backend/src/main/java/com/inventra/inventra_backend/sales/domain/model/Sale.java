package com.inventra.inventra_backend.sales.domain.model;

import com.inventra.inventra_backend.common.domain.BaseAuditableEntity;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "sales")
public class Sale extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "store_id", nullable = false, updatable = false)
    private UUID storeId;

    @Column(name = "sale_number", nullable = false, length = 60)
    private String saleNumber;

    @Column(name = "invoice_number", nullable = false, length = 60)
    private String invoiceNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private SaleStatus status = SaleStatus.COMPLETED;

    @Column(name = "sale_date", nullable = false)
    private LocalDate saleDate;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "customer_name", length = 150)
    private String customerName;

    @Column(name = "customer_phone", length = 30)
    private String customerPhone;

    @Column(name = "prescription_required", nullable = false)
    private boolean prescriptionRequired = false;

    @Column(name = "subtotal", nullable = false, precision = 14, scale = 4)
    private BigDecimal subtotal = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "tax_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal taxAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "discount_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal discountAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "round_off_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal roundOffAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "total_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal totalAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "paid_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal paidAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "change_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal changeAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    @Column(name = "cashier_id", nullable = false, updatable = false)
    private UUID cashierId;

    @Column(name = "device_id")
    private UUID deviceId;

    @Column(name = "idempotency_key", length = 100)
    private String idempotencyKey;

    @Column(name = "notes")
    private String notes;

    @Column(name = "voided_at")
    private Instant voidedAt;

    @Column(name = "voided_by")
    private UUID voidedBy;

    @Column(name = "void_reason")
    private String voidReason;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @OneToMany(mappedBy = "saleId", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("lineNumber ASC")
    private List<SaleLine> lines = new ArrayList<>();

    @OneToMany(mappedBy = "saleId", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<SalePayment> payments = new ArrayList<>();

    protected Sale() {
    }

    public Sale(
        UUID businessId,
        UUID storeId,
        String saleNumber,
        String invoiceNumber,
        LocalDate saleDate,
        String customerName,
        String customerPhone,
        boolean prescriptionRequired,
        BigDecimal discountAmount,
        BigDecimal roundOffAmount,
        UUID cashierId,
        UUID deviceId,
        String idempotencyKey,
        String notes
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId is required");
        this.storeId = Objects.requireNonNull(storeId, "storeId is required");
        this.saleNumber = Objects.requireNonNull(saleNumber, "saleNumber is required").trim();
        this.invoiceNumber = Objects.requireNonNull(invoiceNumber, "invoiceNumber is required").trim();
        this.status = SaleStatus.COMPLETED;
        this.saleDate = saleDate != null ? saleDate : LocalDate.now();
        this.customerName = customerName != null ? customerName.trim() : null;
        this.customerPhone = customerPhone != null ? customerPhone.trim() : null;
        this.prescriptionRequired = prescriptionRequired;
        this.discountAmount = discountAmount != null ? discountAmount.setScale(4, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        this.roundOffAmount = roundOffAmount != null ? roundOffAmount.setScale(4, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        this.cashierId = Objects.requireNonNull(cashierId, "cashierId is required");
        this.deviceId = deviceId;
        this.idempotencyKey = idempotencyKey != null && !idempotencyKey.isBlank() ? idempotencyKey.trim() : null;
        this.notes = notes != null ? notes.trim() : null;
    }

    public void addLine(SaleLine line) {
        Objects.requireNonNull(line, "SaleLine cannot be null");
        lines.add(line);
    }

    public void addPayment(SalePayment payment) {
        Objects.requireNonNull(payment, "SalePayment cannot be null");
        payments.add(payment);
    }

    public void recalculateTotals() {
        // Step 1: Distribute bill-level discount proportionally across lines
        BigDecimal totalNetBeforeBillDisc = BigDecimal.ZERO;
        for (SaleLine line : lines) {
            totalNetBeforeBillDisc = totalNetBeforeBillDisc.add(line.getNetLineAmountBeforeBillDiscount());
        }

        BigDecimal distributedDiscount = BigDecimal.ZERO;
        if (totalNetBeforeBillDisc.compareTo(BigDecimal.ZERO) > 0 && this.discountAmount.compareTo(BigDecimal.ZERO) > 0) {
            for (int i = 0; i < lines.size(); i++) {
                SaleLine line = lines.get(i);
                if (i == lines.size() - 1) {
                    // Last line absorbs remainder to guarantee exact reconciliation
                    BigDecimal remainder = this.discountAmount.subtract(distributedDiscount);
                    line.setAllocatedBillDiscount(remainder);
                } else {
                    BigDecimal lineRatio = line.getNetLineAmountBeforeBillDiscount()
                        .divide(totalNetBeforeBillDisc, 8, RoundingMode.HALF_UP);
                    BigDecimal lineAlloc = this.discountAmount.multiply(lineRatio).setScale(4, RoundingMode.HALF_UP);
                    distributedDiscount = distributedDiscount.add(lineAlloc);
                    line.setAllocatedBillDiscount(lineAlloc);
                }
            }
        } else {
            for (SaleLine line : lines) {
                line.setAllocatedBillDiscount(BigDecimal.ZERO);
            }
        }

        // Step 2: Sum line subtotals and line taxes
        BigDecimal sumSubtotal = BigDecimal.ZERO;
        BigDecimal sumTax = BigDecimal.ZERO;
        for (SaleLine line : lines) {
            sumSubtotal = sumSubtotal.add(line.getGrossAmount().subtract(line.getDiscountAmount()));
            sumTax = sumTax.add(line.getTaxAmount());
        }
        this.subtotal = sumSubtotal.setScale(4, RoundingMode.HALF_UP);
        this.taxAmount = sumTax.setScale(4, RoundingMode.HALF_UP);

        BigDecimal netPayable = this.subtotal.subtract(this.discountAmount).add(this.taxAmount).add(this.roundOffAmount);
        if (netPayable.compareTo(BigDecimal.ZERO) < 0) {
            netPayable = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }
        this.totalAmount = netPayable.setScale(4, RoundingMode.HALF_UP);

        // Step 3: Sum successful payments
        BigDecimal sumPaid = BigDecimal.ZERO;
        BigDecimal sumChange = BigDecimal.ZERO;
        for (SalePayment p : payments) {
            if (p.getStatus() == PaymentStatus.SUCCESS) {
                sumPaid = sumPaid.add(p.getAmount());
                if (p.getChangeAmount() != null) {
                    sumChange = sumChange.add(p.getChangeAmount());
                }
            }
        }
        this.paidAmount = sumPaid.setScale(4, RoundingMode.HALF_UP);
        this.changeAmount = sumChange.setScale(4, RoundingMode.HALF_UP);
    }

    public void voidSale(UUID userId, String reason) {
        if (this.status != SaleStatus.COMPLETED) {
            throw new IllegalStateException("Only COMPLETED sales can be voided");
        }
        this.status = SaleStatus.VOIDED;
        this.voidedAt = Instant.now();
        this.voidedBy = userId;
        this.voidReason = Objects.requireNonNull(reason, "Void reason is required").trim();
    }

    public void markReturnProcessed() {
        boolean allReturned = true;
        boolean anyReturned = false;
        for (SaleLine line : lines) {
            if (line.getReturnedQuantity().compareTo(BigDecimal.ZERO) > 0) {
                anyReturned = true;
            }
            if (line.getRemainingReturnableQuantity().compareTo(BigDecimal.ZERO) > 0) {
                allReturned = false;
            }
        }

        if (allReturned) {
            this.status = SaleStatus.FULLY_RETURNED;
        } else if (anyReturned) {
            this.status = SaleStatus.PARTIALLY_RETURNED;
        }
    }

    public UUID getId() { return id; }
    public UUID getBusinessId() { return businessId; }
    public UUID getStoreId() { return storeId; }
    public String getSaleNumber() { return saleNumber; }
    public String getInvoiceNumber() { return invoiceNumber; }
    public SaleStatus getStatus() { return status; }
    public LocalDate getSaleDate() { return saleDate; }
    public UUID getCustomerId() { return customerId; }
    public void setCustomerId(UUID customerId) { this.customerId = customerId; }
    public String getCustomerName() { return customerName; }
    public String getCustomerPhone() { return customerPhone; }
    public boolean isPrescriptionRequired() { return prescriptionRequired; }
    public BigDecimal getSubtotal() { return subtotal; }
    public BigDecimal getTaxAmount() { return taxAmount; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public BigDecimal getRoundOffAmount() { return roundOffAmount; }
    public void setRoundOffAmount(BigDecimal roundOffAmount) {
        this.roundOffAmount = roundOffAmount != null ? roundOffAmount.setScale(4, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
    }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public BigDecimal getPaidAmount() { return paidAmount; }
    public BigDecimal getChangeAmount() { return changeAmount; }
    public UUID getCashierId() { return cashierId; }
    public UUID getDeviceId() { return deviceId; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public String getNotes() { return notes; }
    public Instant getVoidedAt() { return voidedAt; }
    public UUID getVoidedBy() { return voidedBy; }
    public String getVoidReason() { return voidReason; }
    public Long getVersion() { return version; }
    public List<SaleLine> getLines() { return Collections.unmodifiableList(lines); }
    public List<SalePayment> getPayments() { return Collections.unmodifiableList(payments); }
}
