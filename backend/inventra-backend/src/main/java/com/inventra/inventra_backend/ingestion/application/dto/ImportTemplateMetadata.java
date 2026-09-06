package com.inventra.inventra_backend.ingestion.application.dto;

import com.inventra.inventra_backend.ingestion.domain.model.ImportDomain;
import java.util.List;

public record ImportTemplateMetadata(
    ImportDomain domain,
    String displayName,
    String description,
    List<TemplateColumnDefinition> columns,
    String sampleCsvContent
) {}
