package com.inventra.inventra_backend.tenant.subscription.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record AdminStoreDetailsResponse(
    String businessId,
    String legalName,
    String tradeName,
    String gstin,
    String drugLicenseNumber,
    String tier,
    String planName,
    String status,
    String billingCycle,
    BigDecimal amount,
    long daysRemaining,
    boolean autoRenew,
    Instant currentPeriodStart,
    Instant currentPeriodEnd,
    String paymentMethod,
    // Usage telemetry
    int activeWorkstations,
    int totalWorkstations,
    int workstationLimit,
    int branchCount,
    int branchLimit,
    int userCount,
    int productCount,
    long salesCount,
    long alertsCount,
    int alertsLimit,
    double storageUsedGb,
    double storageLimitGb,
    List<StoreBranchSummary> branches,
    List<StoreUserSummary> users,
    List<LicenseInvoiceResponse> invoices
) {
    public record StoreBranchSummary(String id, String name, String code) {}
    public record StoreUserSummary(String id, String fullName, String email, String role, String status) {}
}
