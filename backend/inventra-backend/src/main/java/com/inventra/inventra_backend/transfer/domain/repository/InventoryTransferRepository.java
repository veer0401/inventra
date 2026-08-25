package com.inventra.inventra_backend.transfer.domain.repository;

import com.inventra.inventra_backend.transfer.domain.model.InventoryTransfer;
import com.inventra.inventra_backend.transfer.domain.model.TransferStatus;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryTransferRepository extends JpaRepository<InventoryTransfer, UUID> {

    Optional<InventoryTransfer> findByIdAndBusinessId(UUID id, UUID businessId);

    Optional<InventoryTransfer> findByBusinessIdAndCreateIdempotencyKey(UUID businessId, String createIdempotencyKey);

    Optional<InventoryTransfer> findByBusinessIdAndShipIdempotencyKey(UUID businessId, String shipIdempotencyKey);

    @Query("""
        SELECT t FROM InventoryTransfer t
        WHERE t.businessId = :businessId
          AND (:storeId IS NULL OR t.sourceStoreId = :storeId OR t.destinationStoreId = :storeId)
          AND (:status IS NULL OR t.status = :status)
        ORDER BY t.requestedAt DESC
    """)
    Page<InventoryTransfer> searchTransfers(
        @Param("businessId") UUID businessId,
        @Param("storeId") UUID storeId,
        @Param("status") TransferStatus status,
        Pageable pageable
    );

    @Query("SELECT COUNT(t) FROM InventoryTransfer t WHERE t.businessId = :businessId AND t.sourceStoreId = :storeId")
    long countByBusinessIdAndSourceStoreId(@Param("businessId") UUID businessId, @Param("storeId") UUID storeId);
}
