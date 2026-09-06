package com.inventra.inventra_backend.content.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.content.api.dto.CmsPageResponse;
import com.inventra.inventra_backend.content.application.CmsService;
import com.inventra.inventra_backend.tenant.subscription.api.dto.PricingConfigResponse;
import com.inventra.inventra_backend.tenant.subscription.application.SubscriptionService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public")
public class PublicCmsController {

    private final CmsService cmsService;
    private final SubscriptionService subscriptionService;

    public PublicCmsController(CmsService cmsService, SubscriptionService subscriptionService) {
        this.cmsService = cmsService;
        this.subscriptionService = subscriptionService;
    }

    @GetMapping("/content/{pageKey}")
    public ApiResponse<CmsPageResponse> getPageContent(@PathVariable String pageKey) {
        return ApiResponse.ok(cmsService.getPageContent(pageKey));
    }

    @GetMapping("/content")
    public ApiResponse<List<CmsPageResponse>> getAllPages() {
        return ApiResponse.ok(cmsService.getAllPages());
    }

    @GetMapping("/pricing")
    public ApiResponse<PricingConfigResponse> getPublicPricing() {
        return ApiResponse.ok(subscriptionService.getPricing());
    }
}
