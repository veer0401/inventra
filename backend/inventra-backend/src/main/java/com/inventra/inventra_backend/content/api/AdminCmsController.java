package com.inventra.inventra_backend.content.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.content.api.dto.CmsPageResponse;
import com.inventra.inventra_backend.content.api.dto.UpdateCmsPageRequest;
import com.inventra.inventra_backend.content.application.CmsService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/content")
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class AdminCmsController {

    private final CmsService cmsService;

    public AdminCmsController(CmsService cmsService) {
        this.cmsService = cmsService;
    }

    @GetMapping
    public ApiResponse<List<CmsPageResponse>> getAllPages() {
        return ApiResponse.ok(cmsService.getAllPages());
    }

    @GetMapping("/{pageKey}")
    public ApiResponse<CmsPageResponse> getPageContent(@PathVariable String pageKey) {
        return ApiResponse.ok(cmsService.getPageContent(pageKey));
    }

    @PutMapping("/{pageKey}")
    public ApiResponse<CmsPageResponse> updatePageContent(
        @PathVariable String pageKey,
        @Valid @RequestBody UpdateCmsPageRequest request,
        Principal principal
    ) {
        String updatedBy = principal != null ? principal.getName() : "Platform Admin";
        return ApiResponse.ok(cmsService.updatePageContent(pageKey, request, updatedBy));
    }
}
