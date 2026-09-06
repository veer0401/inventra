package com.inventra.inventra_backend.careers.api.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record JobResponse(
    UUID id,
    String title,
    String department,
    String location,
    String employmentType,
    String experienceLevel,
    String salaryRange,
    String summary,
    String description,
    List<String> responsibilities,
    List<String> requirements,
    List<String> benefits,
    boolean active,
    Instant createdAt,
    Instant updatedAt
) {}
