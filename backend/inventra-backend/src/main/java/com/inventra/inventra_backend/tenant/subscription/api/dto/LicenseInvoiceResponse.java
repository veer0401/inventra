package com.inventra.inventra_backend.tenant.subscription.api.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record LicenseInvoiceResponse(
    String id,
    String invoiceNumber,
    Instant invoiceDate,
    String description,
    String planTier,
    BigDecimal originalAmount,
    BigDecimal discountAmount,
    String couponCode,
    BigDecimal couponDiscount,
    BigDecimal subtotal,
    BigDecimal cgstAmount,
    BigDecimal sgstAmount,
    BigDecimal totalAmount,
    String paymentMethod,
    String status,
    String hsnSac,
    String invoicePdfUrl,
    String razorpayPaymentId,
    String razorpayOrderId
) {
    public LicenseInvoiceResponse(
        String id,
        String invoiceNumber,
        Instant invoiceDate,
        String description,
        String planTier,
        BigDecimal subtotal,
        BigDecimal cgstAmount,
        BigDecimal sgstAmount,
        BigDecimal totalAmount,
        String paymentMethod,
        String status,
        String hsnSac,
        String invoicePdfUrl,
        String razorpayPaymentId,
        String razorpayOrderId
    ) {
        this(
            id,
            invoiceNumber,
            invoiceDate,
            description,
            planTier,
            subtotal,
            BigDecimal.ZERO,
            null,
            BigDecimal.ZERO,
            subtotal,
            cgstAmount,
            sgstAmount,
            totalAmount,
            paymentMethod,
            status,
            hsnSac,
            invoicePdfUrl,
            razorpayPaymentId,
            razorpayOrderId
        );
    }
}
