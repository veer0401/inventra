package com.inventra.inventra_backend.common.mail.dto;

import java.time.LocalDate;

public record BatchExpiryAlertItem(
    String productName,
    String batchNumber,
    LocalDate expiryDate,
    long daysRemaining,
    int quantityOnHand,
    String urgencyLevel // "CRITICAL", "WARNING", "EXPIRED"
) {}
