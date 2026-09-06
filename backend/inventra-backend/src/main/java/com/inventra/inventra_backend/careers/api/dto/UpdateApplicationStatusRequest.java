package com.inventra.inventra_backend.careers.api.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateApplicationStatusRequest(
    @NotBlank String status,
    String adminNotes
) {}
