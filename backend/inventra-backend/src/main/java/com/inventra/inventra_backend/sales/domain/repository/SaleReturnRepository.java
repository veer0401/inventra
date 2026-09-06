package com.inventra.inventra_backend.sales.domain.repository;

import com.inventra.inventra_backend.sales.domain.model.SaleReturn;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SaleReturnRepository extends JpaRepository<SaleReturn, UUID> {

    Optional<SaleReturn> findByIdAndBusinessId(UUID id, UUID businessId);

    Optional<SaleReturn> findByIdAndStoreIdAndBusinessId(UUID id, UUID storeId, UUID businessId);

    Optional<SaleReturn> findByBusinessIdAndIdempotencyKey(UUID businessId, String idempotencyKey);

    List<SaleReturn> findBySaleIdAndBusinessId(UUID saleId, UUID businessId);

    @Query("""
        SELECT r FROM SaleReturn r WHERE r.businessId = :businessId
        AND (:storeId IS NULL OR r.storeId = :storeId)
        AND (:saleId IS NULL OR r.saleId = :saleId)
        AND (CAST(:startDate AS date) IS NULL OR r.returnDate >= :startDate)
        AND (CAST(:endDate AS date) IS NULL OR r.returnDate <= :endDate)
        ORDER BY r.createdAt DESC
        """)
    Page<SaleReturn> searchReturns(
        @Param("businessId") UUID businessId,
        @Param("storeId") UUID storeId,
        @Param("saleId") UUID saleId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate,
        Pageable pageable
    );

    long countByBusinessIdAndStoreId(UUID businessId, UUID storeId);

    @Query("""
        SELECT r FROM SaleReturn r, Sale s
        WHERE r.saleId = s.id
        AND s.businessId = :businessId
        AND s.customerId = :customerId
        ORDER BY r.createdAt DESC
        """)
    Page<SaleReturn> findByBusinessIdAndCustomerId(
        @Param("businessId") UUID businessId,
        @Param("customerId") UUID customerId,
        Pageable pageable
    );

    @Query("""
        SELECT COUNT(r), COALESCE(SUM(r.totalRefundAmount), 0.0)
        FROM SaleReturn r, Sale s
        WHERE r.saleId = s.id
        AND s.businessId = :businessId
        AND s.customerId = :customerId
        AND r.status = 'COMPLETED'
        """)
    List<Object[]> getCustomerReturnStatistics(
        @Param("businessId") UUID businessId,
        @Param("customerId") UUID customerId
    );
}
