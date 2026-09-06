package com.inventra.inventra_backend.ingestion.domain.repository;

import com.inventra.inventra_backend.ingestion.domain.model.ImportValidationIssue;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImportValidationIssueRepository extends JpaRepository<ImportValidationIssue, UUID> {

    List<ImportValidationIssue> findByImportRowId(UUID importRowId);

    List<ImportValidationIssue> findByImportRowIdIn(List<UUID> importRowIds);

    void deleteByImportRowId(UUID importRowId);
}
