package com.inventra.inventra_backend.reporting.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ScheduleHRegisterResponse(
    List<ScheduleHEntryDto> entries,
    long totalRecords
) {
    public record ScheduleHEntryDto(
        UUID saleId,
        String invoiceNumber,
        LocalDate saleDate,
        String customerName,
        String customerPhone,
        String doctorName,
        String doctorRegistrationNumber,
        String productName,
        String batchNumber,
        BigDecimal quantity,
        String scheduleType // SCHEDULE_H, SCHEDULE_H1, SCHEDULE_X
    ) {}
}
