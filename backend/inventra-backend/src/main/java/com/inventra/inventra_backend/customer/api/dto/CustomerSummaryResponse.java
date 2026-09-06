package com.inventra.inventra_backend.customer.api.dto;

import com.inventra.inventra_backend.customer.domain.model.Customer;
import com.inventra.inventra_backend.customer.domain.model.CustomerStatus;
import java.time.Instant;
import java.util.UUID;

public record CustomerSummaryResponse(
    UUID id,
    String customerCode,
    String fullName,
    String phone,
    String email,
    CustomerStatus status,
    Instant createdAt
) {
    public static CustomerSummaryResponse from(Customer c) {
        return new CustomerSummaryResponse(
            c.getId(),
            c.getCustomerCode(),
            c.getFullName(),
            c.getPhone(),
            c.getEmail(),
            c.getStatus(),
            c.getCreatedAt()
        );
    }
}
