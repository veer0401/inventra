package com.inventra.inventra_backend.reporting.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.multitenancy.TenantContext;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.reporting.api.dto.*;
import com.inventra.inventra_backend.reporting.application.ReportService;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'PHARMACIST')")
    public ApiResponse<ReportSummaryResponse> getSummary(
        @RequestParam(value = "storeId", required = false) UUID storeId,
        @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(reportService.getReportSummary(businessId, storeId, startDate, endDate));
    }

    @GetMapping("/sales")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'PHARMACIST')")
    public ApiResponse<SalesReportResponse> getSalesReport(
        @RequestParam(value = "storeId", required = false) UUID storeId,
        @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(reportService.getSalesReport(businessId, storeId, startDate, endDate));
    }

    @GetMapping("/inventory-valuation")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'PHARMACIST')")
    public ApiResponse<InventoryValuationReportResponse> getInventoryValuation(
        @RequestParam(value = "storeId", required = false) UUID storeId
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(reportService.getInventoryValuation(businessId, storeId));
    }

    @GetMapping("/expiry-risk")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'PHARMACIST')")
    public ApiResponse<ExpiryRiskReportResponse> getExpiryRiskReport(
        @RequestParam(value = "storeId", required = false) UUID storeId,
        @RequestParam(value = "days", required = false, defaultValue = "90") int days
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(reportService.getExpiryRiskReport(businessId, storeId, days));
    }

    @GetMapping("/product-velocity")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'PHARMACIST')")
    public ApiResponse<ProductVelocityReportResponse> getProductVelocityReport(
        @RequestParam(value = "storeId", required = false) UUID storeId,
        @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(reportService.getProductVelocityReport(businessId, storeId, startDate, endDate));
    }

    @GetMapping("/schedule-h")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'PHARMACIST')")
    public ApiResponse<ScheduleHRegisterResponse> getScheduleHRegister(
        @RequestParam(value = "storeId", required = false) UUID storeId,
        @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(reportService.getScheduleHRegister(businessId, storeId, startDate, endDate));
    }

    private UUID getRequiredBusinessId() {
        TenantContext context = TenantContextHolder.requireContext();
        return UUID.fromString(context.tenantId().value());
    }
}
