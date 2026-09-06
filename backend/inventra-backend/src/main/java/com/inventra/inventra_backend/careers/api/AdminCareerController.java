package com.inventra.inventra_backend.careers.api;

import com.inventra.inventra_backend.careers.api.dto.CreateJobRequest;
import com.inventra.inventra_backend.careers.api.dto.JobApplicationResponse;
import com.inventra.inventra_backend.careers.api.dto.JobResponse;
import com.inventra.inventra_backend.careers.api.dto.UpdateApplicationStatusRequest;
import com.inventra.inventra_backend.careers.api.dto.UpdateJobRequest;
import com.inventra.inventra_backend.careers.application.CareerService;
import com.inventra.inventra_backend.common.api.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/careers")
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class AdminCareerController {

    private final CareerService careerService;

    public AdminCareerController(CareerService careerService) {
        this.careerService = careerService;
    }

    // ── Jobs Management ──────────────────────────────────────────────────────

    @GetMapping("/jobs")
    public ApiResponse<List<JobResponse>> getAllJobs() {
        return ApiResponse.ok(careerService.getAllJobs());
    }

    @PostMapping("/jobs")
    public ApiResponse<JobResponse> createJob(@Valid @RequestBody CreateJobRequest request) {
        return ApiResponse.ok(careerService.createJob(request));
    }

    @PutMapping("/jobs/{id}")
    public ApiResponse<JobResponse> updateJob(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateJobRequest request
    ) {
        return ApiResponse.ok(careerService.updateJob(id, request));
    }

    @DeleteMapping("/jobs/{id}")
    public ApiResponse<Void> deleteJob(@PathVariable UUID id) {
        careerService.deleteJob(id);
        return ApiResponse.ok();
    }

    // ── Candidate Applications Management ────────────────────────────────────

    @GetMapping("/applications")
    public ApiResponse<List<JobApplicationResponse>> getApplications(
        @RequestParam(required = false) UUID jobId,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String search
    ) {
        return ApiResponse.ok(careerService.getApplications(jobId, status, search));
    }

    @GetMapping("/applications/{id}")
    public ApiResponse<JobApplicationResponse> getApplicationById(@PathVariable UUID id) {
        return ApiResponse.ok(careerService.getApplicationById(id));
    }

    @PatchMapping("/applications/{id}/status")
    public ApiResponse<JobApplicationResponse> updateApplicationStatus(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateApplicationStatusRequest request
    ) {
        return ApiResponse.ok(careerService.updateApplicationStatus(id, request));
    }
}
