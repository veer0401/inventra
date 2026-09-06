package com.inventra.inventra_backend.ingestion.domain.repository;

import com.inventra.inventra_backend.ingestion.domain.model.ImportDomain;
import com.inventra.inventra_backend.ingestion.domain.model.ImportJob;
import com.inventra.inventra_backend.ingestion.domain.model.ImportJobStatus;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ImportJobRepository extends JpaRepository<ImportJob, UUID> {

    Optional<ImportJob> findByIdAndBusinessId(UUID id, UUID businessId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT j FROM ImportJob j WHERE j.id = :id AND j.businessId = :businessId")
    Optional<ImportJob> findByIdAndBusinessIdWithLock(@Param("id") UUID id, @Param("businessId") UUID businessId);

    Optional<ImportJob> findByBusinessIdAndIdempotencyKey(UUID businessId, String idempotencyKey);

    @Query("SELECT j FROM ImportJob j WHERE j.businessId = :businessId " +
           "AND (:domain IS NULL OR j.importDomain = :domain) " +
           "AND (:status IS NULL OR j.status = :status) " +
           "ORDER BY j.createdAt DESC")
    Page<ImportJob> searchImportJobs(
        @Param("businessId") UUID businessId,
        @Param("domain") ImportDomain domain,
        @Param("status") ImportJobStatus status,
        Pageable pageable
    );
}
