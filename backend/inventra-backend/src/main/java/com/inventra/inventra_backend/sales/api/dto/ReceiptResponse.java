package com.inventra.inventra_backend.sales.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.inventra.inventra_backend.sales.domain.model.Sale;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public record ReceiptResponse(
    UUID saleId,
    UUID storeId,
    String pharmacyName,
    String storeName,
    String storeAddress,
    String storePhone,
    String gstin,
    String drugLicenseNumber,
    String receiptNumber,
    String invoiceNumber,
    LocalDate saleDate,
    String customerName,
    String customerPhone,
    String cashierName,
    BigDecimal subtotal,
    BigDecimal discountAmount,
    BigDecimal taxAmount,
    BigDecimal roundOffAmount,
    BigDecimal totalAmount,
    BigDecimal paidAmount,
    BigDecimal changeAmount,
    String paymentMethod,
    String footerNote,
    UUID cashierId,
    Instant createdAt,
    List<SaleLineResponse> lines,
    List<SalePaymentResponse> payments,
    List<ReceiptLineItemDto> items
) {
    @JsonProperty("saleNumber")
    public String saleNumber() {
        return receiptNumber();
    }

    @JsonProperty("date")
    public String date() {
        return saleDate() != null ? saleDate().toString() : "";
    }

    @JsonProperty("discount")
    public BigDecimal discount() {
        return discountAmount();
    }

    @JsonProperty("tax")
    public BigDecimal tax() {
        return taxAmount();
    }

    @JsonProperty("roundOff")
    public BigDecimal roundOff() {
        return roundOffAmount();
    }

    @JsonProperty("total")
    public BigDecimal total() {
        return totalAmount();
    }

    @JsonProperty("paid")
    public BigDecimal paid() {
        return paidAmount();
    }

    @JsonProperty("change")
    public BigDecimal change() {
        return changeAmount();
    }

    public static ReceiptResponse from(
        Sale sale,
        List<SaleLineResponse> lines,
        List<SalePaymentResponse> payments,
        Store store,
        Business business
    ) {
        String pharmacyName = "Inventra Pharmacy";
        if (business != null) {
            if (business.getTradeName() != null && !business.getTradeName().isBlank()) {
                pharmacyName = business.getTradeName().trim();
            } else if (business.getLegalName() != null && !business.getLegalName().isBlank()) {
                pharmacyName = business.getLegalName().trim();
            }
        }

        String storeName = store != null ? store.getStoreName() : (business != null && business.getTradeName() != null ? business.getTradeName() : "Main Branch");
        String storeAddress = "";
        if (store != null) {
            List<String> addressParts = new ArrayList<>();
            if (store.getAddressLine1() != null && !store.getAddressLine1().isBlank()) addressParts.add(store.getAddressLine1().trim());
            if (store.getAddressLine2() != null && !store.getAddressLine2().isBlank()) addressParts.add(store.getAddressLine2().trim());
            if (store.getCity() != null && !store.getCity().isBlank()) addressParts.add(store.getCity().trim());
            if (store.getState() != null && !store.getState().isBlank()) addressParts.add(store.getState().trim());
            if (store.getPostalCode() != null && !store.getPostalCode().isBlank()) addressParts.add(store.getPostalCode().trim());
            storeAddress = String.join(", ", addressParts);
        }

        String storePhone = store != null && store.getPhoneNumber() != null ? store.getPhoneNumber() : "";
        String gstin = business != null && business.getGstin() != null ? business.getGstin() : "";
        String drugLicense = business != null && business.getDrugLicenseNumber() != null ? business.getDrugLicenseNumber() : "";

        String primaryMethod = "CASH";
        if (payments != null && !payments.isEmpty() && payments.get(0).paymentMethod() != null) {
            primaryMethod = payments.get(0).paymentMethod().name();
        }

        List<ReceiptLineItemDto> receiptItems = new ArrayList<>();
        if (lines != null) {
            for (SaleLineResponse l : lines) {
                String batchNum = null;
                String expDate = null;
                if (l.batchAllocations() != null && !l.batchAllocations().isEmpty()) {
                    batchNum = l.batchAllocations().get(0).batchNumber();
                    expDate = l.batchAllocations().get(0).expiryDate() != null ? l.batchAllocations().get(0).expiryDate().toString() : null;
                }
                receiptItems.add(new ReceiptLineItemDto(
                    l.productName(),
                    batchNum,
                    expDate,
                    l.quantity(),
                    l.unitPrice(),
                    l.taxAmount(),
                    l.lineTotal()
                ));
            }
        }

        return new ReceiptResponse(
            sale.getId(),
            sale.getStoreId(),
            pharmacyName,
            storeName,
            storeAddress,
            storePhone,
            gstin,
            drugLicense,
            sale.getSaleNumber(),
            sale.getInvoiceNumber(),
            sale.getSaleDate(),
            sale.getCustomerName(),
            sale.getCustomerPhone(),
            "Cashier",
            sale.getSubtotal(),
            sale.getDiscountAmount(),
            sale.getTaxAmount(),
            sale.getRoundOffAmount(),
            sale.getTotalAmount(),
            sale.getPaidAmount(),
            sale.getChangeAmount(),
            primaryMethod,
            "Thank you for choosing us! Get well soon.",
            sale.getCashierId(),
            sale.getCreatedAt(),
            lines != null ? lines : List.of(),
            payments != null ? payments : List.of(),
            receiptItems
        );
    }
}
