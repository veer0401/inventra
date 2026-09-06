package com.inventra.inventra_backend.catalog.api.dto;

import java.util.List;

public record GlobalMedicineCsvImportResult(
    int totalRows,
    int createdCount,
    int updatedCount,
    int failedCount,
    List<String> errors
) {}
