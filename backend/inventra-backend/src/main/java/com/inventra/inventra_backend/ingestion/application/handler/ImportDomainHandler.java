package com.inventra.inventra_backend.ingestion.application.handler;

import com.inventra.inventra_backend.ingestion.application.dto.EntityMatchResult;
import com.inventra.inventra_backend.ingestion.application.dto.ImportTemplateMetadata;
import com.inventra.inventra_backend.ingestion.domain.model.ImportDomain;
import com.inventra.inventra_backend.ingestion.domain.model.ImportValidationIssue;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface ImportDomainHandler {

    ImportDomain getDomain();

    ImportTemplateMetadata getTemplateMetadata();

    /**
     * Normalizes raw string map into typed key-value data with proper trimming,
     * formula injection shielding, and standard formatting.
     */
    Map<String, Object> normalizeRow(Map<String, String> rawData);

    /**
     * Validates normalized row data against business invariants and domain rules.
     */
    List<ImportValidationIssue> validateRow(
        UUID importRowId,
        Map<String, Object> normalizedData,
        UUID businessId,
        UUID storeId
    );

    /**
     * Resolves matching existing entities within the tenant.
     */
    EntityMatchResult matchEntity(
        Map<String, Object> normalizedData,
        UUID businessId,
        UUID storeId
    );

    /**
     * Posts a valid draft row to the authoritative domain ledger using existing application services.
     */
    void postRow(
        Map<String, Object> normalizedData,
        UUID matchedEntityId,
        UUID businessId,
        UUID storeId,
        UUID actorUserId
    );
}
