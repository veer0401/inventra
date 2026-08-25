package com.inventra.inventra_backend.purchasing.domain.repository;

import com.inventra.inventra_backend.purchasing.domain.model.Supplier;
import com.inventra.inventra_backend.purchasing.domain.model.SupplierStatus;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, UUID> {

    Optional<Supplier> findByIdAndBusinessId(UUID id, UUID businessId);

    boolean existsByBusinessIdAndSupplierCodeIgnoreCase(UUID businessId, String supplierCode);

    Page<Supplier> findByBusinessId(UUID businessId, Pageable pageable);

    Page<Supplier> findByBusinessIdAndStatus(UUID businessId, SupplierStatus status, Pageable pageable);

    @Query("""
        SELECT s FROM Supplier s
        WHERE s.businessId = :businessId
          AND (
            LOWER(s.legalName) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(s.supplierCode) LIKE LOWER(CONCAT('%', :query, '%'))
            OR (s.tradeName IS NOT NULL AND LOWER(s.tradeName) LIKE LOWER(CONCAT('%', :query, '%')))
            OR (s.gstin IS NOT NULL AND LOWER(s.gstin) LIKE LOWER(CONCAT('%', :query, '%')))
          )
    """)
    Page<Supplier> searchSuppliers(
        @Param("businessId") UUID businessId,
        @Param("query") String query,
        Pageable pageable
    );
}
