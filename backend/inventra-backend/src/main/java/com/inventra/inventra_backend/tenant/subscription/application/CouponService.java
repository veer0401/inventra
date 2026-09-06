package com.inventra.inventra_backend.tenant.subscription.application;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.tenant.subscription.api.dto.CouponResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.CouponValidationResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.CreateCouponRequest;
import com.inventra.inventra_backend.tenant.subscription.api.dto.UpdateCouponRequest;
import com.inventra.inventra_backend.tenant.subscription.api.dto.ValidateCouponRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CouponService {

    private static final Logger log = LoggerFactory.getLogger(CouponService.class);

    private final JdbcTemplate jdbcTemplate;

    public CouponService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public CouponValidationResponse validateCoupon(UUID businessId, ValidateCouponRequest request) {
        if (request.code() == null || request.code().isBlank()) {
            return new CouponValidationResponse(
                false, "", "Coupon code is required.", null, BigDecimal.ZERO, BigDecimal.ZERO,
                request.subtotal(), request.subtotal(), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO
            );
        }

        String normalizedCode = request.code().trim().toUpperCase();

        List<CouponResponse> coupons = jdbcTemplate.query(
            "SELECT * FROM subscription_coupons WHERE UPPER(code) = ?",
            (rs, rowNum) -> new CouponResponse(
                rs.getString("code"),
                rs.getString("description"),
                rs.getString("discount_type"),
                rs.getBigDecimal("discount_value"),
                rs.getBigDecimal("max_discount_amount"),
                rs.getBoolean("first_time_only"),
                rs.getString("min_tier"),
                rs.getString("min_cycle"),
                rs.getBigDecimal("min_order_amount"),
                rs.getInt("max_uses"),
                rs.getInt("current_uses"),
                rs.getTimestamp("valid_until") != null ? rs.getTimestamp("valid_until").toInstant() : null,
                rs.getBoolean("active"),
                rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toInstant() : Instant.now()
            ),
            normalizedCode
        );

        if (coupons.isEmpty()) {
            return invalidResponse(normalizedCode, "Coupon code '" + normalizedCode + "' does not exist.", request.subtotal());
        }

        CouponResponse coupon = coupons.get(0);

        if (!coupon.active()) {
            return invalidResponse(normalizedCode, "This coupon is currently inactive or disabled.", request.subtotal());
        }

        if (coupon.validUntil() != null && coupon.validUntil().isBefore(Instant.now())) {
            return invalidResponse(normalizedCode, "This coupon has expired.", request.subtotal());
        }

        if (coupon.currentUses() >= coupon.maxUses()) {
            return invalidResponse(normalizedCode, "This coupon has reached its maximum usage limit.", request.subtotal());
        }

        // Condition 1: First-time store payment only
        if (coupon.firstTimeOnly() && businessId != null) {
            Integer paidInvoicesCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM business_subscription_invoices WHERE business_id = ? AND status = 'PAID'",
                Integer.class,
                businessId
            );
            if (paidInvoicesCount != null && paidInvoicesCount > 0) {
                return invalidResponse(normalizedCode, "This coupon is exclusively valid for first-time store subscriptions.", request.subtotal());
            }
        }

        // Condition 2: Minimum Plan Tier
        if (coupon.minTier() != null && !coupon.minTier().isBlank()) {
            if (request.tier() == null || !isTierEligible(request.tier(), coupon.minTier())) {
                return invalidResponse(normalizedCode, "This coupon requires the " + coupon.minTier() + " plan or higher.", request.subtotal());
            }
        }

        // Condition 3: Billing Cycle requirement
        if (coupon.minCycle() != null && !coupon.minCycle().isBlank()) {
            if (request.billingCycle() == null || !coupon.minCycle().equalsIgnoreCase(request.billingCycle())) {
                return invalidResponse(normalizedCode, "This coupon is only valid on " + coupon.minCycle().toLowerCase() + " billing cycles.", request.subtotal());
            }
        }

        // Condition 4: Minimum Order Amount
        BigDecimal subtotal = request.subtotal() != null ? request.subtotal() : BigDecimal.ZERO;
        if (coupon.minOrderAmount() != null && subtotal.compareTo(coupon.minOrderAmount()) < 0) {
            return invalidResponse(normalizedCode, "A minimum order subtotal of ₹" + coupon.minOrderAmount() + " is required for this coupon.", subtotal);
        }

        // Calculate discount with optional maximum cap
        BigDecimal discountAmount;
        if ("PERCENTAGE".equalsIgnoreCase(coupon.discountType())) {
            discountAmount = subtotal.multiply(coupon.discountValue())
                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            if (coupon.maxDiscountAmount() != null && coupon.maxDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
                if (discountAmount.compareTo(coupon.maxDiscountAmount()) > 0) {
                    discountAmount = coupon.maxDiscountAmount();
                }
            }
        } else {
            discountAmount = coupon.discountValue();
        }

        if (discountAmount.compareTo(subtotal) > 0) {
            discountAmount = subtotal;
        }

        BigDecimal newSubtotal = subtotal.subtract(discountAmount).setScale(2, RoundingMode.HALF_UP);
        if (newSubtotal.compareTo(BigDecimal.ZERO) < 0) {
            newSubtotal = BigDecimal.ZERO;
        }

        BigDecimal cgst = newSubtotal.multiply(new BigDecimal("0.09")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal sgst = newSubtotal.multiply(new BigDecimal("0.09")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalPayable = newSubtotal.add(cgst).add(sgst).setScale(2, RoundingMode.HALF_UP);

        return new CouponValidationResponse(
            true,
            coupon.code(),
            "Coupon '" + coupon.code() + "' applied! You saved ₹" + discountAmount + ".",
            coupon.discountType(),
            coupon.discountValue(),
            discountAmount,
            subtotal,
            newSubtotal,
            cgst,
            sgst,
            totalPayable
        );
    }

    private boolean isTierEligible(String targetTier, String minTier) {
        int targetRank = getTierRank(targetTier);
        int minRank = getTierRank(minTier);
        return targetRank >= minRank;
    }

    private int getTierRank(String tier) {
        if (tier == null) return 0;
        return switch (tier.toUpperCase()) {
            case "STARTER" -> 1;
            case "PRO" -> 2;
            case "ENTERPRISE" -> 3;
            default -> 0;
        };
    }

    private CouponValidationResponse invalidResponse(String code, String message, BigDecimal subtotal) {
        BigDecimal base = subtotal != null ? subtotal : BigDecimal.ZERO;
        BigDecimal cgst = base.multiply(new BigDecimal("0.09")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal sgst = base.multiply(new BigDecimal("0.09")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = base.add(cgst).add(sgst).setScale(2, RoundingMode.HALF_UP);
        return new CouponValidationResponse(
            false,
            code,
            message,
            null,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            base,
            base,
            cgst,
            sgst,
            total
        );
    }

    public List<CouponResponse> getAllCoupons() {
        return jdbcTemplate.query(
            "SELECT * FROM subscription_coupons ORDER BY created_at DESC",
            (rs, rowNum) -> new CouponResponse(
                rs.getString("code"),
                rs.getString("description"),
                rs.getString("discount_type"),
                rs.getBigDecimal("discount_value"),
                rs.getBigDecimal("max_discount_amount"),
                rs.getBoolean("first_time_only"),
                rs.getString("min_tier"),
                rs.getString("min_cycle"),
                rs.getBigDecimal("min_order_amount"),
                rs.getInt("max_uses"),
                rs.getInt("current_uses"),
                rs.getTimestamp("valid_until") != null ? rs.getTimestamp("valid_until").toInstant() : null,
                rs.getBoolean("active"),
                rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toInstant() : Instant.now()
            )
        );
    }

    public CouponResponse getCoupon(String code) {
        List<CouponResponse> list = jdbcTemplate.query(
            "SELECT * FROM subscription_coupons WHERE UPPER(code) = ?",
            (rs, rowNum) -> new CouponResponse(
                rs.getString("code"),
                rs.getString("description"),
                rs.getString("discount_type"),
                rs.getBigDecimal("discount_value"),
                rs.getBigDecimal("max_discount_amount"),
                rs.getBoolean("first_time_only"),
                rs.getString("min_tier"),
                rs.getString("min_cycle"),
                rs.getBigDecimal("min_order_amount"),
                rs.getInt("max_uses"),
                rs.getInt("current_uses"),
                rs.getTimestamp("valid_until") != null ? rs.getTimestamp("valid_until").toInstant() : null,
                rs.getBoolean("active"),
                rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toInstant() : Instant.now()
            ),
            code.trim().toUpperCase()
        );
        if (list.isEmpty()) {
            throw new ResourceNotFoundException("Coupon", code);
        }
        return list.get(0);
    }

    @Transactional
    public CouponResponse createCoupon(CreateCouponRequest request) {
        String code = request.code().trim().toUpperCase();
        Integer existing = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM subscription_coupons WHERE UPPER(code) = ?",
            Integer.class,
            code
        );
        if (existing != null && existing > 0) {
            throw new BusinessRuleViolationException("COUPON_EXISTS", "A coupon with code '" + code + "' already exists.");
        }

        jdbcTemplate.update("""
            INSERT INTO subscription_coupons (
                code, description, discount_type, discount_value, max_discount_amount, first_time_only, min_tier, min_cycle,
                min_order_amount, max_uses, current_uses, valid_until, active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            code,
            request.description(),
            request.discountType().toUpperCase(),
            request.discountValue(),
            request.maxDiscountAmount(),
            request.firstTimeOnly(),
            request.minTier() != null && !request.minTier().isBlank() ? request.minTier().toUpperCase() : null,
            request.minCycle() != null && !request.minCycle().isBlank() ? request.minCycle().toUpperCase() : null,
            request.minOrderAmount() != null ? request.minOrderAmount() : BigDecimal.ZERO,
            request.maxUses() != null ? request.maxUses() : 1000,
            request.validUntil() != null ? Timestamp.from(request.validUntil()) : null,
            request.active() != null ? request.active() : true
        );

        log.info("Created promotional coupon {} with max discount cap {}", code, request.maxDiscountAmount());
        return getCoupon(code);
    }

    @Transactional
    public CouponResponse updateCoupon(String code, UpdateCouponRequest request) {
        String normalizedCode = code.trim().toUpperCase();
        int rows = jdbcTemplate.update("""
            UPDATE subscription_coupons SET
                description = ?,
                discount_type = ?,
                discount_value = ?,
                max_discount_amount = ?,
                first_time_only = ?,
                min_tier = ?,
                min_cycle = ?,
                min_order_amount = ?,
                max_uses = ?,
                valid_until = ?,
                active = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE UPPER(code) = ?
            """,
            request.description(),
            request.discountType().toUpperCase(),
            request.discountValue(),
            request.maxDiscountAmount(),
            request.firstTimeOnly(),
            request.minTier() != null && !request.minTier().isBlank() ? request.minTier().toUpperCase() : null,
            request.minCycle() != null && !request.minCycle().isBlank() ? request.minCycle().toUpperCase() : null,
            request.minOrderAmount() != null ? request.minOrderAmount() : BigDecimal.ZERO,
            request.maxUses() != null ? request.maxUses() : 1000,
            request.validUntil() != null ? Timestamp.from(request.validUntil()) : null,
            request.active() != null ? request.active() : true,
            normalizedCode
        );

        if (rows == 0) {
            throw new ResourceNotFoundException("Coupon", code);
        }

        log.info("Updated promotional coupon {}", normalizedCode);
        return getCoupon(normalizedCode);
    }

    @Transactional
    public void deleteCoupon(String code) {
        String normalizedCode = code.trim().toUpperCase();
        int rows = jdbcTemplate.update("DELETE FROM subscription_coupons WHERE UPPER(code) = ?", normalizedCode);
        if (rows == 0) {
            throw new ResourceNotFoundException("Coupon", code);
        }
        log.info("Deleted coupon {}", normalizedCode);
    }

    @Transactional
    public void incrementUses(String code) {
        if (code == null || code.isBlank()) return;
        jdbcTemplate.update(
            "UPDATE subscription_coupons SET current_uses = current_uses + 1, updated_at = CURRENT_TIMESTAMP WHERE UPPER(code) = ?",
            code.trim().toUpperCase()
        );
    }
}
