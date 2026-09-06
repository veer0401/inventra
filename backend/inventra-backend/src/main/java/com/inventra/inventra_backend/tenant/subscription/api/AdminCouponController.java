package com.inventra.inventra_backend.tenant.subscription.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.CouponResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.CreateCouponRequest;
import com.inventra.inventra_backend.tenant.subscription.api.dto.UpdateCouponRequest;
import com.inventra.inventra_backend.tenant.subscription.application.CouponService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/subscription/coupons")
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class AdminCouponController {

    private final CouponService couponService;

    public AdminCouponController(CouponService couponService) {
        this.couponService = couponService;
    }

    @GetMapping
    public ApiResponse<List<CouponResponse>> getAllCoupons() {
        return ApiResponse.ok(couponService.getAllCoupons());
    }

    @GetMapping("/{code}")
    public ApiResponse<CouponResponse> getCoupon(@PathVariable String code) {
        return ApiResponse.ok(couponService.getCoupon(code));
    }

    @PostMapping
    public ApiResponse<CouponResponse> createCoupon(@Valid @RequestBody CreateCouponRequest request) {
        return ApiResponse.ok(couponService.createCoupon(request));
    }

    @PutMapping("/{code}")
    public ApiResponse<CouponResponse> updateCoupon(
        @PathVariable String code,
        @Valid @RequestBody UpdateCouponRequest request
    ) {
        return ApiResponse.ok(couponService.updateCoupon(code, request));
    }

    @DeleteMapping("/{code}")
    public ApiResponse<Void> deleteCoupon(@PathVariable String code) {
        couponService.deleteCoupon(code);
        return ApiResponse.ok(null);
    }
}
