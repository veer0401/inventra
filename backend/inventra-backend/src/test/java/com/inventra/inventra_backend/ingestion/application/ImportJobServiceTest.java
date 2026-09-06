package com.inventra.inventra_backend.ingestion.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.identity.application.SecurityAuditService;
import com.inventra.inventra_backend.ingestion.api.dto.ConfirmImportResponse;
import com.inventra.inventra_backend.ingestion.api.dto.ImportJobResponse;
import com.inventra.inventra_backend.ingestion.api.dto.ImportRowResponse;
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
import com.inventra.inventra_backend.ingestion.domain.repository.ImportJobRepository;
import com.inventra.inventra_backend.ingestion.domain.repository.ImportRowRepository;
import com.inventra.inventra_backend.ingestion.domain.repository.ImportValidationIssueRepository;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImportJobServiceTest {

    @Mock private ImportJobRepository importJobRepository;
    @Mock private ImportRowRepository importRowRepository;
    @Mock private ImportValidationIssueRepository validationIssueRepository;
    @Mock private ImportDomainHandler domainHandler;
    @Mock private SecurityAuditService securityAuditService;

    private ImportJobService service;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final UUID businessId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        when(domainHandler.getDomain()).thenReturn(ImportDomain.CUSTOMERS);

        service = new ImportJobService(
            importJobRepository,
            importRowRepository,
            validationIssueRepository,
            List.of(domainHandler),
            securityAuditService,
            objectMapper
        );
    }

    @Test
    @DisplayName("Should create import job and parse rows into draft records")
    void shouldCreateImportJob() {
        String csv = "Customer Name,Phone\nRamesh Sharma,9876543210\nPriya Patel,9823456789";

        when(domainHandler.normalizeRow(anyMap())).thenAnswer(inv -> inv.getArgument(0));
        when(domainHandler.validateRow(any(), anyMap(), any(), any())).thenReturn(List.of());
        when(domainHandler.matchEntity(anyMap(), any(), any())).thenReturn(EntityMatchResult.none());

        when(importJobRepository.save(any(ImportJob.class))).thenAnswer(inv -> inv.getArgument(0));

        ImportJobResponse response = service.createImportJob(
            businessId,
            null,
            userId,
            ImportSource.CSV,
            ImportDomain.CUSTOMERS,
            "customers.csv",
            csv.getBytes(StandardCharsets.UTF_8),
            null
        );

        assertNotNull(response);
        assertEquals(ImportJobStatus.PENDING_REVIEW, response.status());
        assertEquals(2, response.totalRows());
        assertEquals(2, response.validRows());
        assertEquals(0, response.invalidRows());

        verify(importRowRepository).saveAll(anyList());
        verify(validationIssueRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("Should skip row with mandatory reason and update job counters")
    void shouldSkipRowWithReason() {
        UUID jobId = UUID.randomUUID();
        UUID rowId = UUID.randomUUID();

        ImportJob job = new ImportJob(businessId, null, ImportSource.CSV, ImportDomain.CUSTOMERS, "customers.csv", null, "hash", null, userId);
        ImportRow row = new ImportRow(businessId, jobId, 1, "{\"fullName\":\"Invalid Name\"}");

        when(importJobRepository.findByIdAndBusinessId(jobId, businessId)).thenReturn(Optional.of(job));
        when(importRowRepository.findByIdAndImportJobIdAndBusinessId(rowId, jobId, businessId)).thenReturn(Optional.of(row));
        when(importRowRepository.save(any(ImportRow.class))).thenAnswer(inv -> inv.getArgument(0));
        when(validationIssueRepository.findByImportRowId(row.getId())).thenReturn(List.of());

        ImportRowResponse rowResponse = service.skipImportRow(businessId, jobId, rowId, userId, "Customer left organization");

        assertEquals(ImportRowStatus.SKIPPED, rowResponse.status());
        assertEquals("Customer left organization", rowResponse.skipReason());
        assertEquals(userId, rowResponse.skippedBy());
    }

    @Test
    @DisplayName("Should reject confirmation if invalid rows remain")
    void shouldRejectConfirmationWhenInvalidRowsExist() {
        UUID jobId = UUID.randomUUID();
        ImportJob job = new ImportJob(businessId, null, ImportSource.CSV, ImportDomain.CUSTOMERS, "customers.csv", null, "hash", null, userId);

        when(importJobRepository.findByIdAndBusinessIdWithLock(jobId, businessId)).thenReturn(Optional.of(job));
        when(importRowRepository.countByImportJobIdAndBusinessIdAndStatus(jobId, businessId, ImportRowStatus.INVALID)).thenReturn(2L);

        BusinessRuleViolationException ex = assertThrows(
            BusinessRuleViolationException.class,
            () -> service.confirmImportJob(businessId, jobId, userId)
        );

        assertEquals("UNRESOLVED_IMPORT_ERRORS", ex.getErrorCode());
    }

    @Test
    @DisplayName("Should post valid rows and transition to PARTIALLY_POSTED if skipped rows exist")
    void shouldPostAndSetPartiallyPostedWhenSkippedRowsExist() {
        UUID jobId = UUID.randomUUID();
        ImportJob job = new ImportJob(businessId, null, ImportSource.CSV, ImportDomain.CUSTOMERS, "customers.csv", null, "hash", null, userId);
        job.updateCounters(2, 1, 0, 1); // 1 valid, 1 skipped

        ImportRow validRow = new ImportRow(businessId, jobId, 1, "{\"fullName\":\"Ramesh\"}");
        validRow.updateValidationAndMatch("{\"fullName\":\"Ramesh\"}", ImportRowStatus.VALID, null, null);

        when(importJobRepository.findByIdAndBusinessIdWithLock(jobId, businessId)).thenReturn(Optional.of(job));
        when(importRowRepository.countByImportJobIdAndBusinessIdAndStatus(jobId, businessId, ImportRowStatus.INVALID)).thenReturn(0L);
        when(importRowRepository.findByImportJobIdAndBusinessIdAndStatusOrderByRowIndexAsc(jobId, businessId, ImportRowStatus.VALID))
            .thenReturn(List.of(validRow));
        when(importJobRepository.save(any(ImportJob.class))).thenAnswer(inv -> inv.getArgument(0));

        ConfirmImportResponse response = service.confirmImportJob(businessId, jobId, userId);

        assertEquals(ImportJobStatus.PARTIALLY_POSTED, response.status());
        assertEquals(1, response.postedRows());
        assertEquals(1, response.skippedRows());
        verify(domainHandler).postRow(anyMap(), any(), eq(businessId), any(), eq(userId));
    }
}
