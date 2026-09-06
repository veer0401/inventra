package com.inventra.inventra_backend.careers.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record SubmitApplicationRequest(
    @NotBlank String fullName,
    @NotBlank @Email String email,
    @NotBlank String phone,
    @NotBlank String currentLocation,
    String linkedinUrl,
    String portfolioUrl,
    @NotNull BigDecimal experienceYears,
    String currentCompany,
    String currentRole,
    Integer noticePeriodDays,
    String currentCtc,
    String expectedCtc,
    @NotBlank String resumeUrl,
    String coverLetter
) {}
