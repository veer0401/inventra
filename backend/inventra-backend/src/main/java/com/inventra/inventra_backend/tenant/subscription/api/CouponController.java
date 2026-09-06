package com.inventra.inventra_backend.tenant.subscription.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.tenant.domain.model.BusinessMembership;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessMembershipRepository;
import com.inventra.inventra_backend.tenant.subscription.api.dto.CouponValidationResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.ValidateCouponRequest;
import com.inventra.inventra_backend.tenant.subscription.application.CouponService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/subscription/coupon")
public class CouponController {

    private final CouponService couponService;
    private final BusinessMembershipRepository membershipRepository;

    public CouponController(CouponService couponService, BusinessMembershipRepository membershipRepository) {
        this.couponService = couponService;
        this.membershipRepository = membershipRepository;
    }

    @PostMapping("/validate")
    public ApiResponse<CouponValidationResponse> validateCoupon(
        @Valid @RequestBody ValidateCouponRequest request,
        Authentication authentication
    ) {
        UUID businessId = resolveBusinessId(authentication);
        return ApiResponse.ok(couponService.validateCoupon(businessId, request));
    }

    private UUID resolveBusinessId(Authentication authentication) {
        UUID tenantId = TenantContextHolder.getTenantId()
            .map(t -> UUID.fromString(t.value()))
            .orElse(null);
        if (tenantId != null) {
            return tenantId;
        }

        if (authentication != null && authentication.getPrincipal() instanceof UUID userId) {
            var memberships = membershipRepository.findByUserId(userId);
            if (!memberships.isEmpty()) {
                return memberships.stream()
                    .filter(m -> "OWNER".equalsIgnoreCase(m.getRole().name()) || "ADMIN".equalsIgnoreCase(m.getRole().name()))
                    .map(BusinessMembership::getBusinessId)
                    .findFirst()
                    .orElse(memberships.get(0).getBusinessId());
            }
        }
        return null;
    }
}
