package com.inventra.inventra_backend.inventory.domain.repository;

import com.inventra.inventra_backend.inventory.domain.model.BatchStatus;
import com.inventra.inventra_backend.inventory.domain.model.InventoryBatch;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryBatchRepository extends JpaRepository<InventoryBatch, UUID> {

    Optional<InventoryBatch> findByIdAndBusinessId(UUID id, UUID businessId);

    Optional<InventoryBatch> findByStoreIdAndProductIdAndBatchNumber(
        UUID storeId,
        UUID productId,
        String batchNumber
    );

    List<InventoryBatch> findByBusinessIdAndStoreIdAndProductId(
        UUID businessId,
        UUID storeId,
        UUID productId
    );

    Page<InventoryBatch> findByBusinessIdAndStoreId(UUID businessId, UUID storeId, Pageable pageable);

    @Query("""
        SELECT b FROM InventoryBatch b
        WHERE b.businessId = :businessId
          AND b.storeId = :storeId
          AND b.productId = :productId
          AND b.status = 'ACTIVE'
          AND b.quantity > 0
        ORDER BY b.expiryDate ASC, b.createdAt ASC
    """)
    List<InventoryBatch> findFefoBatches(
        @Param("businessId") UUID businessId,
        @Param("storeId") UUID storeId,
        @Param("productId") UUID productId
    );

    @Query("""
        SELECT b FROM InventoryBatch b
        WHERE b.businessId = :businessId
          AND b.storeId = :storeId
          AND b.expiryDate < :currentDate
          AND b.quantity > 0
        ORDER BY b.expiryDate ASC
    """)
    Page<InventoryBatch> findExpiredBatches(
        @Param("businessId") UUID businessId,
        @Param("storeId") UUID storeId,
        @Param("currentDate") LocalDate currentDate,
        Pageable pageable
    );

    @Query("""
        SELECT b FROM InventoryBatch b
        WHERE b.businessId = :businessId
          AND b.storeId = :storeId
          AND b.expiryDate >= :currentDate
          AND b.expiryDate <= :targetDate
          AND b.quantity > 0
        ORDER BY b.expiryDate ASC
    """)
    Page<InventoryBatch> findNearExpiryBatches(
        @Param("businessId") UUID businessId,
        @Param("storeId") UUID storeId,
        @Param("currentDate") LocalDate currentDate,
        @Param("targetDate") LocalDate targetDate,
        Pageable pageable
    );

    @Query("""
        SELECT COALESCE(SUM(b.quantity), 0)
        FROM InventoryBatch b
        WHERE b.businessId = :businessId
          AND b.storeId = :storeId
          AND b.productId = :productId
          AND b.status = 'ACTIVE'
    """)
    BigDecimal sumActiveBatchQuantityByProduct(
        @Param("businessId") UUID businessId,
        @Param("storeId") UUID storeId,
        @Param("productId") UUID productId
    );
}
