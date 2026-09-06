package com.inventra.inventra_backend.careers.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record UpdateJobRequest(
    @NotBlank String title,
    @NotBlank String department,
    @NotBlank String location,
    String employmentType,
    @NotBlank String experienceLevel,
    String salaryRange,
    @NotBlank String summary,
    @NotBlank String description,
    List<String> responsibilities,
    List<String> requirements,
    List<String> benefits,
    Boolean active
) {}
