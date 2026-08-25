package com.inventra.inventra_backend.sales.domain.repository;

import com.inventra.inventra_backend.sales.domain.model.Sale;
import com.inventra.inventra_backend.sales.domain.model.SaleStatus;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SaleRepository extends JpaRepository<Sale, UUID> {

    Optional<Sale> findByIdAndBusinessId(UUID id, UUID businessId);

    Optional<Sale> findByIdAndStoreIdAndBusinessId(UUID id, UUID storeId, UUID businessId);

    Optional<Sale> findByBusinessIdAndIdempotencyKey(UUID businessId, String idempotencyKey);

    Optional<Sale> findByBusinessIdAndStoreIdAndSaleNumber(UUID businessId, UUID storeId, String saleNumber);

    Optional<Sale> findByBusinessIdAndInvoiceNumber(UUID businessId, String invoiceNumber);

    @Query("SELECT s FROM Sale s WHERE s.businessId = :businessId AND s.storeId = :storeId ORDER BY s.createdAt DESC")
    Page<Sale> findByBusinessIdAndStoreId(
        @Param("businessId") UUID businessId,
        @Param("storeId") UUID storeId,
        Pageable pageable
    );

    @Query("""
        SELECT s FROM Sale s WHERE s.businessId = :businessId
        AND (:storeId IS NULL OR s.storeId = :storeId)
        AND (:status IS NULL OR s.status = :status)
        AND (CAST(:startDate AS date) IS NULL OR s.saleDate >= :startDate)
        AND (CAST(:endDate AS date) IS NULL OR s.saleDate <= :endDate)
        ORDER BY s.createdAt DESC
        """)
    Page<Sale> searchSales(
        @Param("businessId") UUID businessId,
        @Param("storeId") UUID storeId,
        @Param("status") SaleStatus status,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate,
        Pageable pageable
    );

    long countByBusinessIdAndStoreId(UUID businessId, UUID storeId);
}
