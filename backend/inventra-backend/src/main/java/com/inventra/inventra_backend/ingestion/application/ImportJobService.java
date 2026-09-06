package com.inventra.inventra_backend.ingestion.application;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.identity.application.SecurityAuditService;
import com.inventra.inventra_backend.identity.domain.model.SecurityAuditEventType;
import com.inventra.inventra_backend.ingestion.api.dto.ConfirmImportResponse;
import com.inventra.inventra_backend.ingestion.api.dto.ImportJobResponse;
import com.inventra.inventra_backend.ingestion.api.dto.ImportRowResponse;
import com.inventra.inventra_backend.ingestion.api.dto.ImportValidationIssueResponse;
import com.inventra.inventra_backend.ingestion.application.dto.EntityMatchResult;
import com.inventra.inventra_backend.ingestion.application.dto.ImportTemplateMetadata;
import com.inventra.inventra_backend.ingestion.application.handler.ImportDomainHandler;
import com.inventra.inventra_backend.ingestion.domain.model.ImportDomain;
import com.inventra.inventra_backend.ingestion.domain.model.ImportJob;
import com.inventra.inventra_backend.ingestion.domain.model.ImportJobStatus;
import com.inventra.inventra_backend.ingestion.domain.model.ImportRow;
import com.inventra.inventra_backend.ingestion.domain.model.ImportRowStatus;
import com.inventra.inventra_backend.ingestion.domain.model.ImportSource;
import com.inventra.inventra_backend.ingestion.domain.model.ImportValidationIssue;
import com.inventra.inventra_backend.ingestion.domain.model.ValidationIssueSeverity;
import com.inventra.inventra_backend.ingestion.domain.repository.ImportJobRepository;
import com.inventra.inventra_backend.ingestion.domain.repository.ImportRowRepository;
import com.inventra.inventra_backend.ingestion.domain.repository.ImportValidationIssueRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ImportJobService {

    private final ImportJobRepository importJobRepository;
    private final ImportRowRepository importRowRepository;
    private final ImportValidationIssueRepository validationIssueRepository;
    private final Map<ImportDomain, ImportDomainHandler> handlers;
    private final SecurityAuditService securityAuditService;
    private final ObjectMapper objectMapper;
    private final StreamingCsvParser csvParser;

    public ImportJobService(
        ImportJobRepository importJobRepository,
        ImportRowRepository importRowRepository,
        ImportValidationIssueRepository validationIssueRepository,
        List<ImportDomainHandler> domainHandlers,
        SecurityAuditService securityAuditService,
        ObjectMapper objectMapper
    ) {
        this.importJobRepository = importJobRepository;
        this.importRowRepository = importRowRepository;
        this.validationIssueRepository = validationIssueRepository;
        this.handlers = domainHandlers.stream().collect(Collectors.toMap(ImportDomainHandler::getDomain, Function.identity()));
        this.securityAuditService = securityAuditService;
        this.objectMapper = objectMapper;
        this.csvParser = new StreamingCsvParser();
    }

    @Transactional
    public ImportJobResponse createImportJob(
        UUID businessId,
        UUID storeId,
        UUID userId,
        ImportSource source,
        ImportDomain domain,
        String originalFilename,
        byte[] fileBytes,
        String idempotencyKey
    ) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<ImportJob> existing = importJobRepository.findByBusinessIdAndIdempotencyKey(businessId, idempotencyKey.trim());
            if (existing.isPresent()) {
                return buildJobResponse(existing.get());
            }
        }

        ImportDomainHandler handler = getHandler(domain);
        String fileHash = computeSha256(fileBytes);

        StreamingCsvParser.ParsedCsvData parsed = csvParser.parse(fileBytes);

        ImportJob job = new ImportJob(
            businessId,
            storeId,
            source,
            domain,
            originalFilename,
            null,
            fileHash,
            idempotencyKey,
            userId
        );
        ImportJob savedJob = importJobRepository.save(job);

        int totalRows = parsed.rows().size();
        int validRows = 0;
        int invalidRows = 0;

        List<ImportRow> rowsToSave = new ArrayList<>();
        List<ImportValidationIssue> issuesToSave = new ArrayList<>();

        for (int i = 0; i < totalRows; i++) {
            Map<String, String> rawMap = parsed.rows().get(i);
            String rawJson = toJson(rawMap);

            ImportRow row = new ImportRow(businessId, savedJob.getId(), i + 1, rawJson);

            Map<String, Object> normalized = handler.normalizeRow(rawMap);
            String normalizedJson = toJson(normalized);

            List<ImportValidationIssue> issues = handler.validateRow(row.getId(), normalized, businessId, storeId);
            EntityMatchResult match = handler.matchEntity(normalized, businessId, storeId);

            boolean hasErrors = issues.stream().anyMatch(iss -> iss.getSeverity() == ValidationIssueSeverity.ERROR);
            ImportRowStatus rowStatus = hasErrors ? ImportRowStatus.INVALID : ImportRowStatus.VALID;

            row.updateValidationAndMatch(normalizedJson, rowStatus, match.matchedEntityId(), match.matchConfidence());

            if (rowStatus == ImportRowStatus.VALID) {
                validRows++;
            } else {
                invalidRows++;
            }

            rowsToSave.add(row);
            issuesToSave.addAll(issues);
        }

        importRowRepository.saveAll(rowsToSave);
        validationIssueRepository.saveAll(issuesToSave);

        savedJob.updateCounters(totalRows, validRows, invalidRows, 0);
        savedJob = importJobRepository.save(savedJob);

        securityAuditService.recordEvent(
            userId,
            businessId,
            null,
            SecurityAuditEventType.IMPORT_CREATED,
            null,
            null,
            "Import Job Created: " + originalFilename + " (" + domain + ", " + totalRows + " rows)"
        );

        return buildJobResponse(savedJob);
    }

    @Transactional(readOnly = true)
    public ImportJobResponse getImportJobById(UUID businessId, UUID importJobId) {
        ImportJob job = importJobRepository.findByIdAndBusinessId(importJobId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("ImportJob", importJobId));
        return buildJobResponse(job);
    }

    @Transactional(readOnly = true)
    public Page<ImportJobResponse> searchImportJobs(
        UUID businessId,
        ImportDomain domain,
        ImportJobStatus status,
        Pageable pageable
    ) {
        return importJobRepository.searchImportJobs(businessId, domain, status, pageable)
            .map(this::buildJobResponse);
    }

    @Transactional(readOnly = true)
    public Page<ImportRowResponse> searchImportRows(
        UUID businessId,
        UUID importJobId,
        ImportRowStatus status,
        Pageable pageable
    ) {
        ImportJob job = importJobRepository.findByIdAndBusinessId(importJobId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("ImportJob", importJobId));

        Page<ImportRow> rows = importRowRepository.searchImportRows(job.getId(), businessId, status, pageable);

        List<UUID> rowIds = rows.getContent().stream().map(ImportRow::getId).toList();
        List<ImportValidationIssue> allIssues = validationIssueRepository.findByImportRowIdIn(rowIds);
        Map<UUID, List<ImportValidationIssue>> issuesMap = allIssues.stream()
            .collect(Collectors.groupingBy(ImportValidationIssue::getImportRowId));

        return rows.map(r -> buildRowResponse(r, issuesMap.getOrDefault(r.getId(), List.of())));
    }

    @Transactional
    public ImportRowResponse updateImportRow(
        UUID businessId,
        UUID importJobId,
        UUID rowId,
        UUID userId,
        Map<String, String> updatedFields
    ) {
        ImportJob job = importJobRepository.findByIdAndBusinessId(importJobId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("ImportJob", importJobId));

        if (job.getStatus() != ImportJobStatus.PENDING_REVIEW) {
            throw new BusinessRuleViolationException(
                "CANNOT_EDIT_FINALIZED_IMPORT",
                "Cannot edit rows on import job in status " + job.getStatus()
            );
        }

        ImportRow row = importRowRepository.findByIdAndImportJobIdAndBusinessId(rowId, importJobId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("ImportRow", rowId));

        Map<String, String> currentRaw = fromJsonToMap(row.getRawDataJson());
        currentRaw.putAll(updatedFields);
        row.updateRawData(toJson(currentRaw));

        ImportDomainHandler handler = getHandler(job.getImportDomain());
        Map<String, Object> normalized = handler.normalizeRow(currentRaw);
        String normalizedJson = toJson(normalized);

        // Delete previous issues for this row
        validationIssueRepository.deleteByImportRowId(row.getId());

        List<ImportValidationIssue> newIssues = handler.validateRow(row.getId(), normalized, businessId, job.getStoreId());
        EntityMatchResult match = handler.matchEntity(normalized, businessId, job.getStoreId());

        boolean hasErrors = newIssues.stream().anyMatch(iss -> iss.getSeverity() == ValidationIssueSeverity.ERROR);
        ImportRowStatus rowStatus;
        if (row.getStatus() == ImportRowStatus.SKIPPED) {
            rowStatus = ImportRowStatus.SKIPPED;
        } else {
            rowStatus = hasErrors ? ImportRowStatus.INVALID : ImportRowStatus.VALID;
        }

        row.updateValidationAndMatch(normalizedJson, rowStatus, match.matchedEntityId(), match.matchConfidence());
        ImportRow savedRow = importRowRepository.save(row);
        validationIssueRepository.saveAll(newIssues);

        recalculateJobCounters(job);

        return buildRowResponse(savedRow, newIssues);
    }

    @Transactional
    public ImportRowResponse skipImportRow(
        UUID businessId,
        UUID importJobId,
        UUID rowId,
        UUID userId,
        String skipReason
    ) {
        if (skipReason == null || skipReason.isBlank()) {
            throw new BusinessRuleViolationException("SKIP_REASON_REQUIRED", "A skip reason is mandatory when excluding a row");
        }

        ImportJob job = importJobRepository.findByIdAndBusinessId(importJobId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("ImportJob", importJobId));

        if (job.getStatus() != ImportJobStatus.PENDING_REVIEW) {
            throw new BusinessRuleViolationException(
                "CANNOT_SKIP_FINALIZED_IMPORT",
                "Cannot skip rows on import job in status " + job.getStatus()
            );
        }

        ImportRow row = importRowRepository.findByIdAndImportJobIdAndBusinessId(rowId, importJobId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("ImportRow", rowId));

        row.markSkipped(userId, skipReason.trim());
        ImportRow savedRow = importRowRepository.save(row);

        recalculateJobCounters(job);

        securityAuditService.recordEvent(
            userId,
            businessId,
            null,
            SecurityAuditEventType.IMPORT_ROW_SKIPPED,
            null,
            null,
            "Import row #" + row.getRowIndex() + " skipped: " + skipReason.trim()
        );

        List<ImportValidationIssue> issues = validationIssueRepository.findByImportRowId(row.getId());
        return buildRowResponse(savedRow, issues);
    }

    @Transactional
    public ConfirmImportResponse confirmImportJob(
        UUID businessId,
        UUID importJobId,
        UUID userId
    ) {
        ImportJob job = importJobRepository.findByIdAndBusinessIdWithLock(importJobId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("ImportJob", importJobId));

        if (job.getStatus() != ImportJobStatus.PENDING_REVIEW) {
            throw new BusinessRuleViolationException(
                "IMPORT_ALREADY_POSTED",
                "This import job has already been finalized in status " + job.getStatus()
            );
        }

        long invalidCount = importRowRepository.countByImportJobIdAndBusinessIdAndStatus(importJobId, businessId, ImportRowStatus.INVALID);
        if (invalidCount > 0) {
            throw new BusinessRuleViolationException(
                "UNRESOLVED_IMPORT_ERRORS",
                String.format("Cannot confirm import job with %d invalid rows. Please resolve errors or skip invalid rows.", invalidCount)
            );
        }

        List<ImportRow> validRows = importRowRepository.findByImportJobIdAndBusinessIdAndStatusOrderByRowIndexAsc(
            importJobId,
            businessId,
            ImportRowStatus.VALID
        );

        if (validRows.isEmpty() && job.getSkippedRows() == job.getTotalRows()) {
            throw new BusinessRuleViolationException("NO_ROWS_TO_POST", "All rows in this import job have been skipped. Nothing to post.");
        }

        ImportDomainHandler handler = getHandler(job.getImportDomain());

        int postedCount = 0;
        for (ImportRow row : validRows) {
            Map<String, Object> normalized = fromJsonToMapObject(row.getNormalizedDataJson());
            handler.postRow(normalized, row.getMatchedEntityId(), businessId, job.getStoreId(), userId);
            row.markPosted();
            importRowRepository.save(row);
            postedCount++;
        }

        boolean hasSkipped = job.getSkippedRows() > 0;
        job.markPosted(userId, hasSkipped);
        ImportJob savedJob = importJobRepository.save(job);

        securityAuditService.recordEvent(
            userId,
            businessId,
            null,
            SecurityAuditEventType.IMPORT_CONFIRMED,
            null,
            null,
            String.format("Import confirmed: %s, %d rows posted, %d rows skipped", job.getImportDomain(), postedCount, job.getSkippedRows())
        );

        return new ConfirmImportResponse(
            savedJob.getId(),
            savedJob.getStatus(),
            savedJob.getTotalRows(),
            postedCount,
            savedJob.getSkippedRows(),
            savedJob.getConfirmedAt()
        );
    }

    @Transactional
    public ImportJobResponse cancelImportJob(UUID businessId, UUID importJobId, UUID userId) {
        ImportJob job = importJobRepository.findByIdAndBusinessIdWithLock(importJobId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("ImportJob", importJobId));

        if (job.getStatus() != ImportJobStatus.PENDING_REVIEW) {
            throw new BusinessRuleViolationException(
                "CANNOT_CANCEL_FINALIZED_IMPORT",
                "Cannot cancel import job in status " + job.getStatus()
            );
        }

        job.markCancelled();
        ImportJob saved = importJobRepository.save(job);

        securityAuditService.recordEvent(
            userId,
            businessId,
            null,
            SecurityAuditEventType.IMPORT_CANCELLED,
            null,
            null,
            "Import cancelled: " + job.getOriginalFilename()
        );

        return buildJobResponse(saved);
    }

    public ImportTemplateMetadata getTemplateMetadata(ImportDomain domain) {
        return getHandler(domain).getTemplateMetadata();
    }

    private void recalculateJobCounters(ImportJob job) {
        int total = (int) importRowRepository.countByImportJobIdAndBusinessId(job.getId(), job.getBusinessId());
        int valid = (int) importRowRepository.countByImportJobIdAndBusinessIdAndStatus(job.getId(), job.getBusinessId(), ImportRowStatus.VALID);
        int invalid = (int) importRowRepository.countByImportJobIdAndBusinessIdAndStatus(job.getId(), job.getBusinessId(), ImportRowStatus.INVALID);
        int skipped = (int) importRowRepository.countByImportJobIdAndBusinessIdAndStatus(job.getId(), job.getBusinessId(), ImportRowStatus.SKIPPED);

        job.updateCounters(total, valid, invalid, skipped);
        importJobRepository.save(job);
    }

    private ImportDomainHandler getHandler(ImportDomain domain) {
        ImportDomainHandler handler = handlers.get(domain);
        if (handler == null) {
            throw new BusinessRuleViolationException("UNSUPPORTED_IMPORT_DOMAIN", "No import handler registered for domain: " + domain);
        }
        return handler;
    }

    private ImportJobResponse buildJobResponse(ImportJob job) {
        return new ImportJobResponse(
            job.getId(),
            job.getBusinessId(),
            job.getStoreId(),
            job.getImportSource(),
            job.getImportDomain(),
            job.getStatus(),
            job.getOriginalFilename(),
            job.getFileHash(),
            job.getTotalRows(),
            job.getValidRows(),
            job.getInvalidRows(),
            job.getSkippedRows(),
            job.getCreatedBy(),
            job.getConfirmedBy(),
            job.getConfirmedAt(),
            job.getVersion(),
            job.getCreatedAt(),
            job.getUpdatedAt()
        );
    }

    private ImportRowResponse buildRowResponse(ImportRow row, List<ImportValidationIssue> issues) {
        List<ImportValidationIssueResponse> issueResponses = issues.stream()
            .map(iss -> new ImportValidationIssueResponse(
                iss.getId(),
                iss.getFieldName(),
                iss.getErrorCode(),
                iss.getErrorMessage(),
                iss.getSeverity()
            )).toList();

        Map<String, String> rawMap = fromJsonToMap(row.getRawDataJson());
        Map<String, Object> normalizedMap = fromJsonToMapObject(row.getNormalizedDataJson());

        return new ImportRowResponse(
            row.getId(),
            row.getImportJobId(),
            row.getRowIndex(),
            row.getStatus(),
            rawMap,
            normalizedMap,
            row.getMatchedEntityId(),
            row.getMatchConfidence(),
            row.getSkippedBy(),
            row.getSkippedAt(),
            row.getSkipReason(),
            issueResponses,
            row.getCreatedAt()
        );
    }

    private String toJson(Object obj) {
        if (obj == null) return "{}";
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }

    private Map<String, String> fromJsonToMap(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, String>>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }

    private Map<String, Object> fromJsonToMapObject(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }

    private String computeSha256(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            return "0000000000000000000000000000000000000000000000000000000000000000";
        }
    }
}
