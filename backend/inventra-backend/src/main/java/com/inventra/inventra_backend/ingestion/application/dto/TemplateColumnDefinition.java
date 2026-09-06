package com.inventra.inventra_backend.ingestion.application.dto;

import java.util.List;

public record TemplateColumnDefinition(
    String fieldName,
    String headerName,
    boolean required,
    String description,
    String dataType,
    String exampleValue,
    List<String> allowedValues,
    List<String> headerAliases
) {}
