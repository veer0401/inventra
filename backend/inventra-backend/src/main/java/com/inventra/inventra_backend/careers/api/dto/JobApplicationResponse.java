package com.inventra.inventra_backend.careers.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record JobApplicationResponse(
    UUID id,
    UUID jobId,
    String jobTitle,
    String fullName,
    String email,
    String phone,
    String currentLocation,
    String linkedinUrl,
    String portfolioUrl,
    BigDecimal experienceYears,
    String currentCompany,
    String currentRole,
    Integer noticePeriodDays,
    String currentCtc,
    String expectedCtc,
    String resumeUrl,
    String coverLetter,
    String status,
    String adminNotes,
    Instant createdAt,
    Instant updatedAt
) {}
