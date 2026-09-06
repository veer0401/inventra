package com.inventra.inventra_backend.careers.api;

import com.inventra.inventra_backend.careers.api.dto.JobApplicationResponse;
import com.inventra.inventra_backend.careers.api.dto.JobResponse;
import com.inventra.inventra_backend.careers.api.dto.SubmitApplicationRequest;
import com.inventra.inventra_backend.careers.application.CareerService;
import com.inventra.inventra_backend.common.api.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/careers")
public class PublicCareerController {

    private final CareerService careerService;

    public PublicCareerController(CareerService careerService) {
        this.careerService = careerService;
    }

    @GetMapping("/jobs")
    public ApiResponse<List<JobResponse>> getActiveJobs() {
        return ApiResponse.ok(careerService.getActiveJobs());
    }

    @GetMapping("/jobs/{id}")
    public ApiResponse<JobResponse> getJobById(@PathVariable UUID id) {
        return ApiResponse.ok(careerService.getJobById(id));
    }

    @PostMapping("/jobs/{id}/apply")
    public ApiResponse<JobApplicationResponse> submitApplication(
        @PathVariable UUID id,
        @Valid @RequestBody SubmitApplicationRequest request
    ) {
        return ApiResponse.ok(careerService.submitApplication(id, request));
    }
}
