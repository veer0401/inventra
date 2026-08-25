package com.inventra.inventra_backend.transfer.domain.repository;

import com.inventra.inventra_backend.transfer.domain.model.InventoryTransferReceipt;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryTransferReceiptRepository extends JpaRepository<InventoryTransferReceipt, UUID> {

    List<InventoryTransferReceipt> findByTransferIdAndBusinessIdOrderByReceivedAtAsc(UUID transferId, UUID businessId);

    Optional<InventoryTransferReceipt> findByBusinessIdAndIdempotencyKey(UUID businessId, String idempotencyKey);

    @Query("SELECT COUNT(r) FROM InventoryTransferReceipt r WHERE r.businessId = :businessId AND r.storeId = :storeId")
    long countByBusinessIdAndStoreId(@Param("businessId") UUID businessId, @Param("storeId") UUID storeId);
}
