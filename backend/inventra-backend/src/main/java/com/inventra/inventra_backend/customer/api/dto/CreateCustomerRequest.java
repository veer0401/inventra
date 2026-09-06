package com.inventra.inventra_backend.customer.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCustomerRequest(
    String customerCode,

    @NotBlank(message = "Customer full name is required")
    @Size(min = 2, max = 150, message = "Full name must be between 2 and 150 characters")
    String fullName,

    @NotBlank(message = "Customer phone number is required")
    @Size(min = 7, max = 30, message = "Phone number must be between 7 and 30 characters")
    String phone,

    String email,

    String address,

    String gstin,

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    String notes
) {
}
