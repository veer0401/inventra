package com.inventra.inventra_backend.catalog.domain.repository;

import com.inventra.inventra_backend.catalog.domain.model.GlobalMedicine;
import com.inventra.inventra_backend.catalog.domain.model.GlobalMedicineStatus;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface GlobalMedicineRepository extends JpaRepository<GlobalMedicine, UUID> {

    Page<GlobalMedicine> findByStatus(GlobalMedicineStatus status, Pageable pageable);

    Optional<GlobalMedicine> findByIdAndStatus(UUID id, GlobalMedicineStatus status);

    boolean existsByNameIgnoreCase(String name);

    Optional<GlobalMedicine> findByNameIgnoreCase(String name);

    @Query("""
        SELECT gm FROM GlobalMedicine gm
        WHERE (:status IS NULL OR gm.status = :status)
          AND (
            :query IS NULL OR :query = ''
            OR LOWER(gm.name) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(gm.genericName) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(gm.brandName) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(gm.manufacturer) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(gm.barcode) = LOWER(:query)
          )
    """)
    Page<GlobalMedicine> search(
        @Param("query") String query,
        @Param("status") GlobalMedicineStatus status,
        Pageable pageable
    );
}
