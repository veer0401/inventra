package com.inventra.inventra_backend.customer.api.dto;

import com.inventra.inventra_backend.customer.domain.model.Customer;
import com.inventra.inventra_backend.customer.domain.model.CustomerStatus;
import java.time.Instant;
import java.util.UUID;

public record CustomerResponse(
    UUID id,
    UUID businessId,
    String customerCode,
    String fullName,
    String phone,
    String email,
    String address,
    String gstin,
    String notes,
    CustomerStatus status,
    UUID createdBy,
    Instant createdAt,
    Instant updatedAt,
    Long version,
    CustomerStatisticsResponse statistics
) {
    public static CustomerResponse from(Customer c, CustomerStatisticsResponse stats) {
        return new CustomerResponse(
            c.getId(),
            c.getBusinessId(),
            c.getCustomerCode(),
            c.getFullName(),
            c.getPhone(),
            c.getEmail(),
            c.getAddress(),
            c.getGstin(),
            c.getNotes(),
            c.getStatus(),
            c.getCreatedBy(),
            c.getCreatedAt(),
            c.getUpdatedAt(),
            c.getVersion(),
            stats
        );
    }
}
