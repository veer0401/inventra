package com.inventra.inventra_backend.ingestion.domain.repository;

import com.inventra.inventra_backend.ingestion.domain.model.ImportRow;
import com.inventra.inventra_backend.ingestion.domain.model.ImportRowStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ImportRowRepository extends JpaRepository<ImportRow, UUID> {

    Optional<ImportRow> findByIdAndBusinessId(UUID id, UUID businessId);

    Optional<ImportRow> findByIdAndImportJobIdAndBusinessId(UUID id, UUID importJobId, UUID businessId);

    List<ImportRow> findByImportJobIdAndBusinessIdOrderByRowIndexAsc(UUID importJobId, UUID businessId);

    List<ImportRow> findByImportJobIdAndBusinessIdAndStatusOrderByRowIndexAsc(UUID importJobId, UUID businessId, ImportRowStatus status);

    @Query("SELECT r FROM ImportRow r WHERE r.importJobId = :importJobId AND r.businessId = :businessId " +
           "AND (:status IS NULL OR r.status = :status) " +
           "ORDER BY r.rowIndex ASC")
    Page<ImportRow> searchImportRows(
        @Param("importJobId") UUID importJobId,
        @Param("businessId") UUID businessId,
        @Param("status") ImportRowStatus status,
        Pageable pageable
    );

    long countByImportJobIdAndBusinessId(UUID importJobId, UUID businessId);

    long countByImportJobIdAndBusinessIdAndStatus(UUID importJobId, UUID businessId, ImportRowStatus status);

    void deleteByImportJobIdAndBusinessId(UUID importJobId, UUID businessId);
}
