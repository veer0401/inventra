package com.inventra.inventra_backend.tenant.subscription.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.common.mail.application.EmailService;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.DeviceStatus;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.DeviceRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import com.inventra.inventra_backend.tenant.subscription.api.dto.AdminBusinessSubscriptionResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.AdminStoreDetailsResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.ChangePlanRequest;
import com.inventra.inventra_backend.tenant.subscription.api.dto.LicenseInvoiceResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.PaymentInitiateResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.PricingConfigResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.SubscriptionDetailsResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.UpdatePricingRequest;
import com.inventra.inventra_backend.tenant.subscription.api.dto.UpgradePreviewResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.UpgradeSubscriptionRequest;
import com.inventra.inventra_backend.tenant.subscription.api.dto.VerifyPaymentRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class SubscriptionService {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionService.class);

    private final BusinessRepository businessRepository;
    private final DeviceRepository deviceRepository;
    private final StoreRepository storeRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final JdbcTemplate jdbcTemplate;
    private final EmailService emailService;
    private final PdfInvoiceService pdfInvoiceService;
    private final CouponService couponService;

    @Value("${razorpay.key-id:}")
    private String razorpayKeyId;

    @Value("${razorpay.key-secret:}")
    private String razorpayKeySecret;

    // In-memory cache per business for active subscription configuration
    private final Map<UUID, SubscriptionConfig> businessConfigs = new ConcurrentHashMap<>();

    // Real invoice records per business
    private final Map<UUID, List<LicenseInvoiceResponse>> businessInvoices = new ConcurrentHashMap<>();

    // Admin-managed global pricing config (overrides defaults when set)
    private final Map<String, TierPricingOverride> pricingOverrides = new ConcurrentHashMap<>();

    // Global annual discount percentage (admin-configurable, default 20%)
    private volatile int globalAnnualDiscountPct = 20;

    public SubscriptionService(
        BusinessRepository businessRepository,
        DeviceRepository deviceRepository,
        StoreRepository storeRepository,
        ObjectMapper objectMapper,
        JdbcTemplate jdbcTemplate,
        EmailService emailService,
        PdfInvoiceService pdfInvoiceService,
        CouponService couponService
    ) {
        this.businessRepository = businessRepository;
        this.deviceRepository = deviceRepository;
        this.storeRepository = storeRepository;
        this.objectMapper = objectMapper;
        this.jdbcTemplate = jdbcTemplate;
        this.emailService = emailService;
        this.pdfInvoiceService = pdfInvoiceService;
        this.couponService = couponService;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    }

    private SubscriptionConfig getOrLoadConfig(UUID businessId) {
        return businessConfigs.computeIfAbsent(businessId, id -> {
            try {
                List<SubscriptionConfig> list = jdbcTemplate.query(
                    "SELECT tier, billing_cycle, status, current_period_start, current_period_end, auto_renew, payment_method FROM business_subscriptions WHERE business_id = ?",
                    (rs, rowNum) -> {
                        SubscriptionConfig c = new SubscriptionConfig();
                        c.tier = rs.getString("tier") != null ? rs.getString("tier") : "STARTER";
                        c.billingCycle = rs.getString("billing_cycle") != null ? rs.getString("billing_cycle") : "MONTHLY";
                        var startTs = rs.getTimestamp("current_period_start");
                        var endTs = rs.getTimestamp("current_period_end");
                        c.periodStart = startTs != null ? startTs.toInstant() : null;
                        c.periodEnd = endTs != null ? endTs.toInstant() : null;
                        c.autoRenew = rs.getBoolean("auto_renew");
                        c.paymentMethod = rs.getString("payment_method");
                        return c;
                    },
                    id
                );
                if (!list.isEmpty()) {
                    return list.get(0);
                }
            } catch (Exception e) {
                log.warn("Could not query business_subscriptions for {}: {}", id, e.getMessage());
            }
            return new SubscriptionConfig();
        });
    }

    private void persistSubscription(UUID businessId, SubscriptionConfig config, String status) {
        try {
            jdbcTemplate.update("""
                INSERT INTO business_subscriptions (business_id, tier, billing_cycle, status, current_period_start, current_period_end, auto_renew, payment_method, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (business_id) DO UPDATE SET
                    tier = EXCLUDED.tier,
                    billing_cycle = EXCLUDED.billing_cycle,
                    status = EXCLUDED.status,
                    current_period_start = EXCLUDED.current_period_start,
                    current_period_end = EXCLUDED.current_period_end,
                    auto_renew = EXCLUDED.auto_renew,
                    payment_method = EXCLUDED.payment_method,
                    updated_at = CURRENT_TIMESTAMP
                """,
                businessId,
                config.tier,
                config.billingCycle,
                status,
                config.periodStart != null ? java.sql.Timestamp.from(config.periodStart) : null,
                config.periodEnd != null ? java.sql.Timestamp.from(config.periodEnd) : null,
                config.autoRenew,
                config.paymentMethod
            );
        } catch (Exception e) {
            log.error("Failed to persist subscription for business {}: {}", businessId, e.getMessage(), e);
        }
    }

    private void persistInvoice(UUID businessId, LicenseInvoiceResponse inv) {
        try {
            jdbcTemplate.update("""
                INSERT INTO business_subscription_invoices (
                    id, business_id, invoice_number, invoice_date, description, plan_tier,
                    original_amount, discount_amount, coupon_code, coupon_discount,
                    subtotal, cgst_amount, sgst_amount, total_amount, payment_method, status, hsn_sac, razorpay_payment_id, razorpay_order_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET
                    original_amount = EXCLUDED.original_amount,
                    discount_amount = EXCLUDED.discount_amount,
                    coupon_code = EXCLUDED.coupon_code,
                    coupon_discount = EXCLUDED.coupon_discount,
                    subtotal = EXCLUDED.subtotal,
                    cgst_amount = EXCLUDED.cgst_amount,
                    sgst_amount = EXCLUDED.sgst_amount,
                    total_amount = EXCLUDED.total_amount,
                    razorpay_payment_id = EXCLUDED.razorpay_payment_id,
                    razorpay_order_id = EXCLUDED.razorpay_order_id,
                    status = EXCLUDED.status
                """,
                UUID.fromString(inv.id()),
                businessId,
                inv.invoiceNumber(),
                java.sql.Timestamp.from(inv.invoiceDate()),
                inv.description(),
                inv.planTier(),
                inv.originalAmount() != null ? inv.originalAmount() : inv.subtotal(),
                inv.discountAmount() != null ? inv.discountAmount() : BigDecimal.ZERO,
                inv.couponCode(),
                inv.couponDiscount() != null ? inv.couponDiscount() : BigDecimal.ZERO,
                inv.subtotal(),
                inv.cgstAmount(),
                inv.sgstAmount(),
                inv.totalAmount(),
                inv.paymentMethod(),
                inv.status(),
                inv.hsnSac(),
                inv.razorpayPaymentId(),
                inv.razorpayOrderId()
            );
        } catch (Exception e) {
            log.error("Failed to persist invoice {} for business {}: {}", inv.invoiceNumber(), businessId, e.getMessage(), e);
        }
    }

    // ─── Inner State Classes ──────────────────────────────────────────────────

    private static class SubscriptionConfig {
        String tier = "STARTER";
        String billingCycle = "MONTHLY";
        Instant periodStart = null;
        Instant periodEnd = null;
        boolean autoRenew = false;
        String paymentMethod = null;
    }

    private static class TierPricingOverride {
        BigDecimal monthlyPrice;
        String description;
        int annualDiscountPct;

        TierPricingOverride(BigDecimal monthlyPrice, String description, int annualDiscountPct) {
            this.monthlyPrice = monthlyPrice;
            this.description = description;
            this.annualDiscountPct = annualDiscountPct;
        }
    }

    // ─── Tier Defaults ────────────────────────────────────────────────────────

    private record TierDefaults(
        String planName,
        BigDecimal monthlyRate,
        int workstationLimit,
        int branchLimit,
        double storageLimitGb,
        int alertLimit,
        List<String> features
    ) {}

    private TierDefaults getTierDefaults(String tier) {
        String normalizedTier = tier.toUpperCase();
        try {
            List<TierDefaults> dbTiers = jdbcTemplate.query(
                "SELECT plan_name, monthly_price, workstation_limit, branch_limit, storage_limit_gb, alert_limit, features FROM subscription_tier_configs WHERE UPPER(tier) = ?",
                (rs, rowNum) -> {
                    String planName = rs.getString("plan_name");
                    BigDecimal monthlyPrice = rs.getBigDecimal("monthly_price");
                    int wLimit = rs.getInt("workstation_limit");
                    int bLimit = rs.getInt("branch_limit");
                    double sLimit = rs.getDouble("storage_limit_gb");
                    int aLimit = rs.getInt("alert_limit");
                    String featuresJson = rs.getString("features");
                    List<String> features = new ArrayList<>();
                    if (featuresJson != null) {
                        try {
                            JsonNode node = objectMapper.readTree(featuresJson);
                            if (node.isArray()) {
                                for (JsonNode item : node) {
                                    features.add(item.asText());
                                }
                            }
                        } catch (Exception ignored) {}
                    }
                    return new TierDefaults(planName, monthlyPrice, wLimit, bLimit, sLimit, aLimit, features);
                },
                normalizedTier
            );
            if (!dbTiers.isEmpty()) {
                TierDefaults dbDefaults = dbTiers.get(0);
                TierPricingOverride override = pricingOverrides.get(normalizedTier);
                if (override != null) {
                    return new TierDefaults(
                        dbDefaults.planName(),
                        override.monthlyPrice,
                        dbDefaults.workstationLimit(),
                        dbDefaults.branchLimit(),
                        dbDefaults.storageLimitGb(),
                        dbDefaults.alertLimit(),
                        dbDefaults.features()
                    );
                }
                return dbDefaults;
            }
        } catch (Exception e) {
            log.warn("Could not load tier defaults from DB for {}: {}", normalizedTier, e.getMessage());
        }

        TierPricingOverride override = pricingOverrides.get(normalizedTier);
        return switch (normalizedTier) {
            case "ENTERPRISE" -> new TierDefaults(
                "Inventra Enterprise Suite",
                override != null ? override.monthlyPrice : new BigDecimal("5999.00"),
                25, 10, 100.0, 10000,
                List.of(
                    "Unlimited High-Speed POS Counters",
                    "Central Multi-Warehouse Stock Transfers",
                    "Automated Expiry & Batch FEFO Routing",
                    "Real-time Automated GST Filing Reports",
                    "Enterprise Scheduled Email & SMS Dispatch",
                    "Dedicated Account Manager & 99.99% Cloud SLA",
                    "Zero Data-Loss Local Offline Sync Engine"
                )
            );
            case "PRO" -> new TierDefaults(
                "Inventra Pharmacy Pro",
                override != null ? override.monthlyPrice : new BigDecimal("2499.00"),
                5, 2, 10.0, 2000,
                List.of(
                    "Up to 5 Synchronized Workstation Terminals",
                    "Dual Dispensary Branch Management",
                    "Batch & Expiry Date (FEFO) Auto-Allocation",
                    "Universal CSV / Excel Master Catalog Importer",
                    "Automated Expiry Email & SMS Reminders",
                    "Granular Operator Roles & Security Audit Log",
                    "B2B Purchase Invoicing with Input GST Tracking"
                )
            );
            default -> new TierDefaults(
                "Inventra Starter Dispensary",
                override != null ? override.monthlyPrice : new BigDecimal("999.00"),
                1, 1, 2.0, 500,
                List.of(
                    "Single Workstation POS Billing",
                    "Standard Product Catalog Management",
                    "Direct Cash & UPI Invoice Receipts",
                    "Daily Sales & Margin Summaries"
                )
            );
        };
    }

    private int getEffectiveAnnualDiscountPct(String tier) {
        TierPricingOverride override = pricingOverrides.get(tier.toUpperCase());
        return override != null ? override.annualDiscountPct : globalAnnualDiscountPct;
    }

    // ─── Owner-Facing Methods ─────────────────────────────────────────────────

    public SubscriptionDetailsResponse getSubscription(UUID businessId) {
        Business business = businessRepository.findById(businessId)
            .orElseThrow(() -> new ResourceNotFoundException("Business", businessId.toString()));

        SubscriptionConfig config = getOrLoadConfig(businessId);

        long daysRemaining = 0;
        String status = "PENDING_PAYMENT";
        if (config.periodEnd != null) {
            if (config.periodEnd.isAfter(Instant.now())) {
                daysRemaining = ChronoUnit.DAYS.between(Instant.now(), config.periodEnd);
                status = "ACTIVE";
            } else {
                daysRemaining = 0;
                status = "PAST_DUE";
            }
        }

        int activeWorkstations = deviceRepository.findByBusinessIdAndStatus(businessId, DeviceStatus.ACTIVE).size();
        int branchCount = storeRepository.findByBusinessId(businessId).size();

        String tier = config.tier.toUpperCase();
        if (!List.of("STARTER", "PRO", "ENTERPRISE").contains(tier)) tier = "STARTER";

        TierDefaults defaults = getTierDefaults(tier);
        int discountPct = getEffectiveAnnualDiscountPct(tier);
        BigDecimal discountMultiplier = BigDecimal.ONE.subtract(
            new BigDecimal(discountPct).divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)
        );

        BigDecimal planAmount = "ANNUALLY".equalsIgnoreCase(config.billingCycle)
            ? defaults.monthlyRate().multiply(new BigDecimal("12")).multiply(discountMultiplier).setScale(2, RoundingMode.HALF_UP)
            : defaults.monthlyRate();

        Map<String, Object> quotas = new HashMap<>();
        quotas.put("workstationsUsed", activeWorkstations);
        quotas.put("workstationsLimit", defaults.workstationLimit());
        quotas.put("branchesUsed", branchCount);
        quotas.put("branchesLimit", defaults.branchLimit());
        quotas.put("storageUsedGb", 0.0);
        quotas.put("storageLimitGb", defaults.storageLimitGb());
        quotas.put("monthlyInvoicesUsed", 0);
        quotas.put("monthlyInvoicesLimit", -1);
        quotas.put("alertsUsed", 0);
        quotas.put("alertsLimit", defaults.alertLimit());

        return new SubscriptionDetailsResponse(
            business.getId().toString(),
            business.getLegalName(),
            business.getGstin() != null ? business.getGstin() : "Unregistered GSTIN",
            tier,
            defaults.planName(),
            status,
            config.billingCycle,
            planAmount,
            "INR",
            config.periodStart,
            config.periodEnd,
            daysRemaining,
            config.autoRenew,
            config.paymentMethod,
            quotas,
            defaults.features()
        );
    }

    public List<LicenseInvoiceResponse> getInvoices(UUID businessId) {
        try {
            List<LicenseInvoiceResponse> dbInvoices = jdbcTemplate.query("""
                SELECT id, invoice_number, invoice_date, description, plan_tier,
                       COALESCE(original_amount, subtotal) AS original_amount,
                       COALESCE(discount_amount, 0.00) AS discount_amount,
                       coupon_code,
                       COALESCE(coupon_discount, 0.00) AS coupon_discount,
                       subtotal, cgst_amount, sgst_amount, total_amount, payment_method, status, hsn_sac, razorpay_payment_id, razorpay_order_id
                FROM business_subscription_invoices
                WHERE business_id = ?
                ORDER BY invoice_date DESC
                """,
                (rs, rowNum) -> new LicenseInvoiceResponse(
                    rs.getString("id"),
                    rs.getString("invoice_number"),
                    rs.getTimestamp("invoice_date").toInstant(),
                    rs.getString("description"),
                    rs.getString("plan_tier"),
                    rs.getBigDecimal("original_amount"),
                    rs.getBigDecimal("discount_amount"),
                    rs.getString("coupon_code"),
                    rs.getBigDecimal("coupon_discount"),
                    rs.getBigDecimal("subtotal"),
                    rs.getBigDecimal("cgst_amount"),
                    rs.getBigDecimal("sgst_amount"),
                    rs.getBigDecimal("total_amount"),
                    rs.getString("payment_method"),
                    rs.getString("status"),
                    rs.getString("hsn_sac"),
                    null,
                    rs.getString("razorpay_payment_id"),
                    rs.getString("razorpay_order_id")
                ),
                businessId
            );
            if (!dbInvoices.isEmpty()) {
                return dbInvoices;
            }
        } catch (Exception e) {
            log.warn("Could not load invoices from DB for {}: {}", businessId, e.getMessage());
        }
        return businessInvoices.getOrDefault(businessId, List.of());
    }

    public SubscriptionDetailsResponse changePlan(UUID businessId, ChangePlanRequest request) {
        SubscriptionConfig config = getOrLoadConfig(businessId);
        config.tier = request.tier().toUpperCase();
        config.billingCycle = request.billingCycle().toUpperCase();
        String status = config.periodEnd != null && config.periodEnd.isAfter(Instant.now()) ? "ACTIVE" : "PENDING_PAYMENT";
        persistSubscription(businessId, config, status);
        return getSubscription(businessId);
    }

    public SubscriptionDetailsResponse toggleAutopay(UUID businessId, boolean enabled) {
        SubscriptionConfig config = getOrLoadConfig(businessId);
        config.autoRenew = enabled;
        String status = config.periodEnd != null && config.periodEnd.isAfter(Instant.now()) ? "ACTIVE" : "PENDING_PAYMENT";
        persistSubscription(businessId, config, status);
        return getSubscription(businessId);
    }

    public UpgradePreviewResponse calculateUpgradePreview(UUID businessId, String targetTier, String targetCycle) {
        SubscriptionConfig config = getOrLoadConfig(businessId);
        String curTier = config.tier != null ? config.tier.toUpperCase() : "STARTER";
        String curCycle = config.billingCycle != null ? config.billingCycle.toUpperCase() : "MONTHLY";

        TierDefaults curDefaults = getTierDefaults(curTier);
        int curDiscountPct = getEffectiveAnnualDiscountPct(curTier);
        BigDecimal curDiscountMultiplier = BigDecimal.ONE.subtract(
            new BigDecimal(curDiscountPct).divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)
        );
        BigDecimal curPrice = "ANNUALLY".equalsIgnoreCase(curCycle)
            ? curDefaults.monthlyRate().multiply(new BigDecimal("12")).multiply(curDiscountMultiplier).setScale(2, RoundingMode.HALF_UP)
            : curDefaults.monthlyRate();

        long totalPeriodDays = "ANNUALLY".equalsIgnoreCase(curCycle) ? 365 : 30;
        long daysRemaining = 0;
        if (config.periodEnd != null && config.periodEnd.isAfter(Instant.now())) {
            daysRemaining = ChronoUnit.DAYS.between(Instant.now(), config.periodEnd);
        }

        BigDecimal dailyRate = curPrice.divide(new BigDecimal(totalPeriodDays), 4, RoundingMode.HALF_UP);
        BigDecimal unusedCredit = dailyRate.multiply(new BigDecimal(daysRemaining)).setScale(2, RoundingMode.HALF_UP);
        if (unusedCredit.compareTo(curPrice) > 0) {
            unusedCredit = curPrice;
        }
        if (daysRemaining <= 0) {
            unusedCredit = BigDecimal.ZERO;
        }

        String newTier = targetTier != null ? targetTier.toUpperCase() : curTier;
        String newCycle = targetCycle != null ? targetCycle.toUpperCase() : curCycle;
        TierDefaults newDefaults = getTierDefaults(newTier);
        int newDiscountPct = getEffectiveAnnualDiscountPct(newTier);
        BigDecimal newDiscountMultiplier = BigDecimal.ONE.subtract(
            new BigDecimal(newDiscountPct).divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)
        );
        BigDecimal newPrice = "ANNUALLY".equalsIgnoreCase(newCycle)
            ? newDefaults.monthlyRate().multiply(new BigDecimal("12")).multiply(newDiscountMultiplier).setScale(2, RoundingMode.HALF_UP)
            : newDefaults.monthlyRate();

        BigDecimal netSubtotal = newPrice.subtract(unusedCredit);
        if (netSubtotal.compareTo(BigDecimal.ZERO) < 0) {
            netSubtotal = BigDecimal.ZERO;
        }

        BigDecimal gstRate = new BigDecimal("0.09");
        BigDecimal cgst = netSubtotal.multiply(gstRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal sgst = netSubtotal.multiply(gstRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalPayable = netSubtotal.add(cgst).add(sgst);

        return new UpgradePreviewResponse(
            curTier,
            curCycle,
            curPrice,
            daysRemaining,
            totalPeriodDays,
            dailyRate.setScale(2, RoundingMode.HALF_UP),
            unusedCredit,
            newTier,
            newCycle,
            newPrice,
            netSubtotal,
            cgst,
            sgst,
            totalPayable
        );
    }

    public PaymentInitiateResponse initiatePayment(UUID businessId) {
        return initiatePayment(businessId, null);
    }

    public PaymentInitiateResponse initiatePayment(UUID businessId, UpgradeSubscriptionRequest request) {
        SubscriptionDetailsResponse sub = getSubscription(businessId);
        boolean isUpgrade = request != null && request.targetTier() != null && !request.targetTier().isBlank();
        String targetTier = isUpgrade ? request.targetTier().toUpperCase() : sub.tier().toUpperCase();
        String targetCycle = (request != null && request.targetBillingCycle() != null && !request.targetBillingCycle().isBlank())
            ? request.targetBillingCycle().toUpperCase()
            : sub.billingCycle().toUpperCase();

        BigDecimal basePrice;
        BigDecimal unusedCredit = BigDecimal.ZERO;
        String planDescription;
        Map<String, String> notes = new HashMap<>();
        notes.put("businessId", businessId.toString());

        if (isUpgrade) {
            UpgradePreviewResponse preview = calculateUpgradePreview(businessId, targetTier, targetCycle);
            basePrice = preview.targetPrice();
            unusedCredit = preview.unusedCredit();
            planDescription = "Inventra " + preview.targetTier() + " (" + preview.targetCycle() + ") Upgrade";
            notes.put("isUpgrade", "true");
            notes.put("targetTier", preview.targetTier());
            notes.put("targetCycle", preview.targetCycle());
            notes.put("unusedCredit", unusedCredit.toString());
            notes.put("originalAmount", basePrice.toString());
        } else {
            TierDefaults defaults = getTierDefaults(targetTier);
            int discountPct = getEffectiveAnnualDiscountPct(targetTier);
            BigDecimal discountMultiplier = BigDecimal.ONE.subtract(
                new BigDecimal(discountPct).divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)
            );
            basePrice = "ANNUALLY".equalsIgnoreCase(targetCycle)
                ? defaults.monthlyRate().multiply(new BigDecimal("12")).multiply(discountMultiplier).setScale(2, RoundingMode.HALF_UP)
                : defaults.monthlyRate();
            planDescription = "Inventra " + defaults.planName() + " (" + targetCycle + ")";
            notes.put("isUpgrade", "false");
            notes.put("planTier", targetTier);
            notes.put("cycle", targetCycle);
            notes.put("originalAmount", basePrice.toString());
        }

        // Net before coupon
        BigDecimal netBeforeCoupon = basePrice.subtract(unusedCredit);
        if (netBeforeCoupon.compareTo(BigDecimal.ZERO) < 0) {
            netBeforeCoupon = BigDecimal.ZERO;
        }

        // Check if coupon code provided
        String couponCode = (request != null && request.couponCode() != null && !request.couponCode().isBlank())
            ? request.couponCode().trim().toUpperCase()
            : null;
        BigDecimal couponDiscount = BigDecimal.ZERO;

        if (couponCode != null) {
            var validation = couponService.validateCoupon(
                businessId,
                new com.inventra.inventra_backend.tenant.subscription.api.dto.ValidateCouponRequest(
                    couponCode,
                    targetTier,
                    targetCycle,
                    netBeforeCoupon
                )
            );
            if (validation.valid()) {
                couponDiscount = validation.discountAmount();
                notes.put("couponCode", couponCode);
                notes.put("couponDiscount", couponDiscount.toString());
            } else {
                throw new BusinessRuleViolationException("INVALID_COUPON", validation.message());
            }
        }

        BigDecimal netSubtotal = netBeforeCoupon.subtract(couponDiscount);
        if (netSubtotal.compareTo(BigDecimal.ZERO) < 0) {
            netSubtotal = BigDecimal.ZERO;
        }
        notes.put("subtotal", netSubtotal.toString());

        BigDecimal gstRate = new BigDecimal("0.09");
        BigDecimal cgst = netSubtotal.multiply(gstRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal sgst = netSubtotal.multiply(gstRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal payableTotal = netSubtotal.add(cgst).add(sgst);
        notes.put("payableTotal", payableTotal.toString());

        long amountInPaise = payableTotal.multiply(new BigDecimal("100")).setScale(0, RoundingMode.HALF_UP).longValue();
        if (amountInPaise <= 0) {
            amountInPaise = 100; // Razorpay requires min 1 INR for order creation
        }

        String orderId;
        if (razorpayKeyId != null && !razorpayKeyId.isBlank() && razorpayKeySecret != null && !razorpayKeySecret.isBlank()) {
            try {
                String auth = Base64.getEncoder().encodeToString(
                    (razorpayKeyId + ":" + razorpayKeySecret).getBytes(StandardCharsets.UTF_8)
                );
                Map<String, Object> body = Map.of(
                    "amount", amountInPaise,
                    "currency", "INR",
                    "receipt", "rcpt_" + (System.currentTimeMillis() / 1000),
                    "notes", notes
                );

                HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.razorpay.com/v1/orders"))
                    .header("Authorization", "Basic " + auth)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .timeout(Duration.ofSeconds(10))
                    .build();

                HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
                if (resp.statusCode() == 200 || resp.statusCode() == 201) {
                    JsonNode json = objectMapper.readTree(resp.body());
                    orderId = json.get("id").asText();
                    log.info("Created real Razorpay order {} for business {}", orderId, businessId);
                } else {
                    log.error("Razorpay order API error (HTTP {}): {}", resp.statusCode(), resp.body());
                    throw new BusinessRuleViolationException("RAZORPAY_ORDER_FAILED", "Razorpay order creation failed: " + resp.body());
                }
            } catch (BusinessRuleViolationException e) {
                throw e;
            } catch (Exception e) {
                log.error("Failed to connect to Razorpay API", e);
                throw new BusinessRuleViolationException("RAZORPAY_CONNECTION_FAILED", "Could not initiate payment with Razorpay: " + e.getMessage());
            }
        } else {
            throw new BusinessRuleViolationException("RAZORPAY_NOT_CONFIGURED", "Razorpay key and secret are not configured on the backend.");
        }

        String upiQrString = "upi://pay?pa=inventra@icici&pn=Inventra%20Technologies&am="
            + payableTotal.setScale(2, RoundingMode.HALF_UP)
            + "&cu=INR&tn=" + URLEncoder.encode("Inventra Subscription " + orderId, StandardCharsets.UTF_8);

        return new PaymentInitiateResponse(
            orderId,
            businessId.toString(),
            payableTotal,
            "INR",
            razorpayKeyId,
            planDescription,
            upiQrString,
            unusedCredit,
            couponCode,
            couponDiscount
        );
    }

    public SubscriptionDetailsResponse verifyPayment(UUID businessId, VerifyPaymentRequest request) {
        if (razorpayKeySecret == null || razorpayKeySecret.isBlank()) {
            throw new BusinessRuleViolationException("RAZORPAY_SECRET_MISSING", "Razorpay key secret is not configured.");
        }

        try {
            String data = request.razorpayOrderId() + "|" + request.razorpayPaymentId();
            Mac sha256Hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(razorpayKeySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256Hmac.init(secretKey);
            byte[] hmacBytes = sha256Hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hmacBytes) {
                sb.append(String.format("%02x", b));
            }
            String generatedSignature = sb.toString();

            if (!generatedSignature.equalsIgnoreCase(request.razorpaySignature())) {
                log.warn("Signature mismatch: expected={}, received={}", generatedSignature, request.razorpaySignature());
                throw new BusinessRuleViolationException("INVALID_SIGNATURE", "Invalid payment signature from Razorpay.");
            }
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            log.error("Crypto error during Razorpay signature verification", e);
            throw new BusinessRuleViolationException("SIGNATURE_VERIFICATION_ERROR", "Signature verification error: " + e.getMessage());
        }

        // Check if Razorpay order notes contained upgrade and coupon details
        boolean isUpgrade = false;
        BigDecimal unusedCredit = BigDecimal.ZERO;
        BigDecimal originalAmount = null;
        BigDecimal discountAmount = BigDecimal.ZERO;
        String couponCode = null;
        BigDecimal couponDiscount = BigDecimal.ZERO;
        BigDecimal subtotal = null;
        SubscriptionConfig config = getOrLoadConfig(businessId);

        try {
            if (razorpayKeyId != null && !razorpayKeyId.isBlank()) {
                String auth = Base64.getEncoder().encodeToString(
                    (razorpayKeyId + ":" + razorpayKeySecret).getBytes(StandardCharsets.UTF_8)
                );
                HttpRequest orderReq = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.razorpay.com/v1/orders/" + request.razorpayOrderId()))
                    .header("Authorization", "Basic " + auth)
                    .GET()
                    .timeout(Duration.ofSeconds(10))
                    .build();

                HttpResponse<String> orderResp = httpClient.send(orderReq, HttpResponse.BodyHandlers.ofString());
                if (orderResp.statusCode() == 200) {
                    JsonNode orderJson = objectMapper.readTree(orderResp.body());
                    JsonNode notes = orderJson.get("notes");
                    if (notes != null) {
                        if (notes.has("targetTier")) {
                            config.tier = notes.get("targetTier").asText().toUpperCase();
                        }
                        if (notes.has("targetCycle")) {
                            config.billingCycle = notes.get("targetCycle").asText().toUpperCase();
                        }
                        if (notes.has("isUpgrade") && "true".equalsIgnoreCase(notes.get("isUpgrade").asText())) {
                            isUpgrade = true;
                        }
                        if (notes.has("unusedCredit")) {
                            unusedCredit = new BigDecimal(notes.get("unusedCredit").asText());
                        }
                        if (notes.has("originalAmount")) {
                            originalAmount = new BigDecimal(notes.get("originalAmount").asText());
                        }
                        if (notes.has("couponCode")) {
                            couponCode = notes.get("couponCode").asText().trim().toUpperCase();
                        }
                        if (notes.has("couponDiscount")) {
                            couponDiscount = new BigDecimal(notes.get("couponDiscount").asText());
                        }
                        if (notes.has("subtotal")) {
                            subtotal = new BigDecimal(notes.get("subtotal").asText());
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not retrieve Razorpay order notes for {}: {}", request.razorpayOrderId(), e.getMessage());
        }

        if (couponCode != null && !couponCode.isBlank()) {
            try {
                couponService.incrementUses(couponCode);
            } catch (Exception e) {
                log.warn("Could not increment coupon uses for {}: {}", couponCode, e.getMessage());
            }
        }

        config.periodStart = Instant.now();
        config.periodEnd = "ANNUALLY".equalsIgnoreCase(config.billingCycle)
            ? Instant.now().plus(365, ChronoUnit.DAYS)
            : Instant.now().plus(30, ChronoUnit.DAYS);
        config.paymentMethod = "Razorpay";
        config.autoRenew = true;

        persistSubscription(businessId, config, "ACTIVE");

        SubscriptionDetailsResponse sub = getSubscription(businessId);
        if (originalAmount == null) {
            originalAmount = sub.amount();
        }
        discountAmount = unusedCredit;
        if (subtotal == null) {
            subtotal = originalAmount.subtract(discountAmount).subtract(couponDiscount);
            if (subtotal.compareTo(BigDecimal.ZERO) < 0) subtotal = BigDecimal.ZERO;
        }

        String invoiceNumber = "INV-" + Instant.now().getEpochSecond();
        LicenseInvoiceResponse inv = createInvoice(
            invoiceNumber,
            Instant.now(),
            sub.planName() + " - " + config.billingCycle + " Subscription" + (isUpgrade ? " (Upgraded)" : ""),
            config.tier,
            originalAmount,
            discountAmount,
            couponCode,
            couponDiscount,
            subtotal,
            "Razorpay",
            request.razorpayPaymentId(),
            request.razorpayOrderId()
        );

        persistInvoice(businessId, inv);
        businessInvoices.computeIfAbsent(businessId, k -> new CopyOnWriteArrayList<>()).add(0, inv);

        // Send payment confirmation email with transaction details
        try {
            String ownerEmail = null;
            String ownerName = null;
            List<Map<String, Object>> userRows = jdbcTemplate.queryForList("""
                SELECT u.email, u.full_name
                FROM business_memberships bm
                JOIN users u ON bm.user_id = u.id
                WHERE bm.business_id = ?
                ORDER BY CASE WHEN bm.role = 'OWNER' THEN 1 ELSE 2 END, bm.created_at ASC
                LIMIT 1
                """, businessId);

            if (!userRows.isEmpty()) {
                ownerEmail = (String) userRows.get(0).get("email");
                ownerName = (String) userRows.get(0).get("full_name");
            }

            if (ownerEmail != null && !ownerEmail.isBlank()) {
                String formattedDate = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm 'IST'")
                    .withZone(ZoneId.of("Asia/Kolkata")).format(inv.invoiceDate());
                emailService.sendSubscriptionReceipt(
                    ownerEmail,
                    sub.legalName(),
                    ownerName,
                    inv.invoiceNumber(),
                    sub.planName(),
                    config.billingCycle,
                    inv.subtotal(),
                    inv.cgstAmount(),
                    inv.sgstAmount(),
                    inv.totalAmount(),
                    request.razorpayPaymentId(),
                    request.razorpayOrderId(),
                    formattedDate,
                    isUpgrade,
                    unusedCredit,
                    couponCode,
                    couponDiscount
                );
                log.info("Subscription receipt email dispatched to {}", ownerEmail);
            }
        } catch (Exception e) {
            log.error("Failed to send subscription receipt email for business {}: {}", businessId, e.getMessage(), e);
        }

        log.info("Payment verified and recorded for business {}: ref={}", businessId, request.razorpayPaymentId());
        return getSubscription(businessId);
    }

    // ─── Admin-Facing Methods ─────────────────────────────────────────────────

    public org.springframework.data.domain.Page<AdminBusinessSubscriptionResponse> getAllBusinessSubscriptions(
        String search,
        org.springframework.data.domain.Pageable pageable
    ) {
        org.springframework.data.domain.Page<Business> businessesPage;
        if (search != null && !search.isBlank()) {
            String query = search.trim();
            businessesPage = businessRepository.findByLegalNameContainingIgnoreCaseOrGstinContainingIgnoreCase(query, query, pageable);
        } else {
            businessesPage = businessRepository.findAll(pageable);
        }

        List<AdminBusinessSubscriptionResponse> dtos = businessesPage.getContent().stream()
            .map(this::toAdminBusinessSubscriptionResponse)
            .toList();

        return new org.springframework.data.domain.PageImpl<>(
            dtos,
            pageable,
            businessesPage.getTotalElements()
        );
    }

    public List<AdminBusinessSubscriptionResponse> getAllBusinessSubscriptions() {
        return businessRepository.findAll().stream()
            .map(this::toAdminBusinessSubscriptionResponse)
            .toList();
    }

    private AdminBusinessSubscriptionResponse toAdminBusinessSubscriptionResponse(Business business) {
        SubscriptionConfig config = getOrLoadConfig(business.getId());
        String tier = config.tier.toUpperCase();
        TierDefaults defaults = getTierDefaults(tier);
        int discountPct = getEffectiveAnnualDiscountPct(tier);
        BigDecimal discountMultiplier = BigDecimal.ONE.subtract(
            new BigDecimal(discountPct).divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)
        );

        BigDecimal planRate = "ANNUALLY".equalsIgnoreCase(config.billingCycle)
            ? defaults.monthlyRate().multiply(new BigDecimal("12")).multiply(discountMultiplier).setScale(2, RoundingMode.HALF_UP)
            : defaults.monthlyRate();

        long daysRemaining = 0;
        String status = "PENDING_PAYMENT";
        BigDecimal amount = BigDecimal.ZERO;

        if (config.periodEnd != null) {
            if (config.periodEnd.isAfter(Instant.now())) {
                daysRemaining = ChronoUnit.DAYS.between(Instant.now(), config.periodEnd);
                status = "ACTIVE";
                amount = planRate;
            } else {
                daysRemaining = 0;
                status = "PAST_DUE";
                amount = planRate;
            }
        }

        int activeWorkstations = deviceRepository.findByBusinessIdAndStatus(business.getId(), DeviceStatus.ACTIVE).size();
        int branchCount = storeRepository.findByBusinessId(business.getId()).size();
        Integer userCountObj = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM business_memberships WHERE business_id = ?",
            Integer.class,
            business.getId()
        );
        int userCount = userCountObj != null ? userCountObj : 0;

        return new AdminBusinessSubscriptionResponse(
            business.getId().toString(),
            business.getLegalName(),
            business.getGstin() != null ? business.getGstin() : "Unregistered",
            tier,
            defaults.planName(),
            status,
            config.billingCycle,
            amount,
            daysRemaining,
            config.autoRenew,
            config.periodEnd,
            activeWorkstations,
            branchCount,
            userCount
        );
    }

    public AdminStoreDetailsResponse getStoreDetails(UUID businessId) {
        Business business = businessRepository.findById(businessId)
            .orElseThrow(() -> new ResourceNotFoundException("Business", businessId.toString()));

        SubscriptionConfig config = getOrLoadConfig(businessId);
        String tier = config.tier.toUpperCase();
        if (!List.of("STARTER", "PRO", "ENTERPRISE").contains(tier)) tier = "STARTER";

        TierDefaults defaults = getTierDefaults(tier);
        int discountPct = getEffectiveAnnualDiscountPct(tier);
        BigDecimal discountMultiplier = BigDecimal.ONE.subtract(
            new BigDecimal(discountPct).divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)
        );

        BigDecimal planAmount = "ANNUALLY".equalsIgnoreCase(config.billingCycle)
            ? defaults.monthlyRate().multiply(new BigDecimal("12")).multiply(discountMultiplier).setScale(2, RoundingMode.HALF_UP)
            : defaults.monthlyRate();

        long daysRemaining = 0;
        String status = "PENDING_PAYMENT";
        BigDecimal amount = BigDecimal.ZERO;

        if (config.periodEnd != null) {
            if (config.periodEnd.isAfter(Instant.now())) {
                daysRemaining = ChronoUnit.DAYS.between(Instant.now(), config.periodEnd);
                status = "ACTIVE";
                amount = planAmount;
            } else {
                daysRemaining = 0;
                status = "PAST_DUE";
                amount = planAmount;
            }
        }

        // Active workstations & total workstations
        int activeWorkstations = deviceRepository.findByBusinessIdAndStatus(businessId, DeviceStatus.ACTIVE).size();
        Integer totalWorkstationsObj = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM devices WHERE business_id = ?",
            Integer.class,
            businessId
        );
        int totalWorkstations = totalWorkstationsObj != null ? totalWorkstationsObj : 0;

        // Branches
        var storesList = storeRepository.findByBusinessId(businessId);
        int branchCount = storesList.size();
        List<AdminStoreDetailsResponse.StoreBranchSummary> branches = storesList.stream()
            .map(s -> new AdminStoreDetailsResponse.StoreBranchSummary(
                s.getId().toString(),
                s.getStoreName(),
                s.getStoreCode()
            ))
            .toList();

        // Users
        List<AdminStoreDetailsResponse.StoreUserSummary> users = jdbcTemplate.query("""
            SELECT u.id, u.full_name, u.email, bm.role, u.status
            FROM business_memberships bm
            JOIN users u ON bm.user_id = u.id
            WHERE bm.business_id = ?
            ORDER BY bm.created_at ASC
            """,
            (rs, rowNum) -> new AdminStoreDetailsResponse.StoreUserSummary(
                rs.getString("id"),
                rs.getString("full_name"),
                rs.getString("email"),
                rs.getString("role"),
                rs.getString("status")
            ),
            businessId
        );
        int userCount = users.size();

        // Product count
        Integer productCountObj = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM products WHERE business_id = ?",
            Integer.class,
            businessId
        );
        int productCount = productCountObj != null ? productCountObj : 0;

        // Sales count
        Long salesCountObj = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM sales WHERE business_id = ?",
            Long.class,
            businessId
        );
        long salesCount = salesCountObj != null ? salesCountObj : 0L;

        // Alerts / Notifications count
        Long alertsCountObj = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM notifications WHERE business_id = ?",
            Long.class,
            businessId
        );
        long alertsCount = alertsCountObj != null ? alertsCountObj : 0L;

        // Invoices
        List<LicenseInvoiceResponse> invoices = getInvoices(businessId);

        return new AdminStoreDetailsResponse(
            business.getId().toString(),
            business.getLegalName(),
            business.getTradeName() != null ? business.getTradeName() : business.getLegalName(),
            business.getGstin() != null ? business.getGstin() : "Unregistered",
            business.getDrugLicenseNumber() != null ? business.getDrugLicenseNumber() : "—",
            tier,
            defaults.planName(),
            status,
            config.billingCycle,
            amount,
            daysRemaining,
            config.autoRenew,
            config.periodStart,
            config.periodEnd,
            config.paymentMethod != null ? config.paymentMethod : "None",
            activeWorkstations,
            totalWorkstations,
            defaults.workstationLimit(),
            branchCount,
            defaults.branchLimit(),
            userCount,
            productCount,
            salesCount,
            alertsCount,
            defaults.alertLimit(),
            0.0,
            defaults.storageLimitGb(),
            branches,
            users,
            invoices
        );
    }

    public PricingConfigResponse getPricing() {
        List<PricingConfigResponse.TierPricing> tiers = new ArrayList<>();
        for (String tier : List.of("STARTER", "PRO", "ENTERPRISE")) {
            TierDefaults defaults = getTierDefaults(tier);
            TierPricingOverride override = pricingOverrides.get(tier);
            int discountPct = override != null ? override.annualDiscountPct : globalAnnualDiscountPct;
            String description = override != null ? override.description : getDefaultDescription(tier);
            tiers.add(new PricingConfigResponse.TierPricing(
                tier,
                defaults.planName(),
                defaults.monthlyRate(),
                description,
                discountPct,
                defaults.features() != null ? defaults.features() : List.of(),
                defaults.workstationLimit(),
                defaults.branchLimit(),
                defaults.storageLimitGb(),
                defaults.alertLimit()
            ));
        }
        return new PricingConfigResponse(tiers, globalAnnualDiscountPct);
    }

    public PricingConfigResponse updatePricing(UpdatePricingRequest request) {
        String tier = request.tier().toUpperCase();
        pricingOverrides.put(tier, new TierPricingOverride(
            request.monthlyPrice(),
            request.description(),
            request.annualDiscountPct()
        ));
        globalAnnualDiscountPct = request.annualDiscountPct();

        // Also persist to DB table subscription_tier_configs so it survives restarts
        try {
            String featuresJson = null;
            if (request.features() != null) {
                featuresJson = objectMapper.writeValueAsString(request.features());
            }
            jdbcTemplate.update("""
                INSERT INTO subscription_tier_configs (
                    tier, plan_name, monthly_price, annual_discount_pct, description, features,
                    workstation_limit, branch_limit, storage_limit_gb, alert_limit, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, NOW())
                ON CONFLICT (tier) DO UPDATE SET
                    plan_name = COALESCE(EXCLUDED.plan_name, subscription_tier_configs.plan_name),
                    monthly_price = EXCLUDED.monthly_price,
                    annual_discount_pct = EXCLUDED.annual_discount_pct,
                    description = EXCLUDED.description,
                    features = COALESCE(EXCLUDED.features, subscription_tier_configs.features),
                    workstation_limit = COALESCE(EXCLUDED.workstation_limit, subscription_tier_configs.workstation_limit),
                    branch_limit = COALESCE(EXCLUDED.branch_limit, subscription_tier_configs.branch_limit),
                    storage_limit_gb = COALESCE(EXCLUDED.storage_limit_gb, subscription_tier_configs.storage_limit_gb),
                    alert_limit = COALESCE(EXCLUDED.alert_limit, subscription_tier_configs.alert_limit),
                    updated_at = NOW()
                """,
                tier,
                request.planName() != null ? request.planName() : getTierDefaults(tier).planName(),
                request.monthlyPrice(),
                request.annualDiscountPct(),
                request.description(),
                featuresJson,
                request.workstationLimit() != null ? request.workstationLimit() : getTierDefaults(tier).workstationLimit(),
                request.branchLimit() != null ? request.branchLimit() : getTierDefaults(tier).branchLimit(),
                request.storageLimitGb() != null ? request.storageLimitGb() : getTierDefaults(tier).storageLimitGb(),
                request.alertLimit() != null ? request.alertLimit() : getTierDefaults(tier).alertLimit()
            );
        } catch (Exception e) {
            log.warn("Failed to persist updated pricing config to DB: {}", e.getMessage());
        }

        return getPricing();
    }

    public SubscriptionDetailsResponse recordPaymentForBusiness(UUID businessId, String paymentReference) {
        SubscriptionConfig config = getOrLoadConfig(businessId);
        config.periodStart = Instant.now();
        config.periodEnd = "ANNUALLY".equalsIgnoreCase(config.billingCycle)
            ? Instant.now().plus(365, ChronoUnit.DAYS)
            : Instant.now().plus(30, ChronoUnit.DAYS);
        config.paymentMethod = "Manual Payment (Ref: " + paymentReference + ")";

        persistSubscription(businessId, config, "ACTIVE");

        TierDefaults defaults = getTierDefaults(config.tier);
        int discountPct = getEffectiveAnnualDiscountPct(config.tier);
        BigDecimal discountMultiplier = BigDecimal.ONE.subtract(
            new BigDecimal(discountPct).divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)
        );
        BigDecimal amount = "ANNUALLY".equalsIgnoreCase(config.billingCycle)
            ? defaults.monthlyRate().multiply(new BigDecimal("12")).multiply(discountMultiplier).setScale(2, RoundingMode.HALF_UP)
            : defaults.monthlyRate();

        String invoiceNumber = "INV-" + Instant.now().getEpochSecond();
        LicenseInvoiceResponse inv = createInvoice(
            invoiceNumber,
            Instant.now(),
            defaults.planName() + " - " + config.billingCycle + " Subscription",
            config.tier,
            amount,
            config.paymentMethod,
            "manual_" + paymentReference,
            "order_manual_" + invoiceNumber
        );

        persistInvoice(businessId, inv);
        businessInvoices.computeIfAbsent(businessId, k -> new CopyOnWriteArrayList<>()).add(0, inv);

        return getSubscription(businessId);
    }

    public SubscriptionDetailsResponse toggleAutopayForBusiness(UUID businessId, boolean enabled) {
        return toggleAutopay(businessId, enabled);
    }

    public byte[] generateInvoicePdf(UUID businessId, UUID invoiceId) {
        Business business = businessRepository.findById(businessId)
            .orElseThrow(() -> new ResourceNotFoundException("Business", businessId.toString()));

        LicenseInvoiceResponse invoice = getInvoices(businessId).stream()
            .filter(inv -> inv.id().equalsIgnoreCase(invoiceId.toString()) || inv.invoiceNumber().equalsIgnoreCase(invoiceId.toString()))
            .findFirst()
            .orElseThrow(() -> new ResourceNotFoundException("Invoice", invoiceId.toString()));

        return pdfInvoiceService.generateSubscriptionInvoicePdf(business, invoice);
    }

    public byte[] generateInvoicePdfForAdmin(UUID invoiceId) {
        List<UUID> bIds = jdbcTemplate.query(
            "SELECT business_id FROM business_subscription_invoices WHERE id = ? OR invoice_number = ?",
            (rs, rowNum) -> (UUID) rs.getObject("business_id"),
            invoiceId,
            invoiceId.toString()
        );
        if (bIds.isEmpty()) {
            throw new ResourceNotFoundException("Invoice", invoiceId.toString());
        }
        return generateInvoicePdf(bIds.get(0), invoiceId);
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    private String getDefaultDescription(String tier) {
        return switch (tier.toUpperCase()) {
            case "STARTER" -> "Essential billing & inventory control for independent single-counter pharmacies.";
            case "ENTERPRISE" -> "Unlimited terminals, multi-branch warehouse distribution, and dedicated account SLAs.";
            default -> "High-speed multi-terminal sync, FEFO batch expiry control, and automated GST compliance.";
        };
    }

    private LicenseInvoiceResponse createInvoice(
        String invoiceNumber,
        Instant invoiceDate,
        String description,
        String planTier,
        BigDecimal originalAmount,
        BigDecimal discountAmount,
        String couponCode,
        BigDecimal couponDiscount,
        BigDecimal subtotal,
        String paymentMethod,
        String razorpayPaymentId,
        String razorpayOrderId
    ) {
        BigDecimal gstRate = new BigDecimal("0.09");
        BigDecimal cgst = subtotal.multiply(gstRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal sgst = subtotal.multiply(gstRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = subtotal.add(cgst).add(sgst);

        return new LicenseInvoiceResponse(
            UUID.nameUUIDFromBytes(invoiceNumber.getBytes()).toString(),
            invoiceNumber,
            invoiceDate,
            description,
            planTier,
            originalAmount != null ? originalAmount : subtotal,
            discountAmount != null ? discountAmount : BigDecimal.ZERO,
            couponCode,
            couponDiscount != null ? couponDiscount : BigDecimal.ZERO,
            subtotal,
            cgst,
            sgst,
            total,
            paymentMethod != null ? paymentMethod : "Online Payment",
            "PAID",
            "997331",
            null,
            razorpayPaymentId,
            razorpayOrderId
        );
    }

    private LicenseInvoiceResponse createInvoice(
        String invoiceNumber,
        Instant invoiceDate,
        String description,
        String planTier,
        BigDecimal subtotal,
        String paymentMethod,
        String razorpayPaymentId,
        String razorpayOrderId
    ) {
        return createInvoice(
            invoiceNumber,
            invoiceDate,
            description,
            planTier,
            subtotal,
            BigDecimal.ZERO,
            null,
            BigDecimal.ZERO,
            subtotal,
            paymentMethod,
            razorpayPaymentId,
            razorpayOrderId
        );
    }
}
