package com.inventra.inventra_backend.inventory.domain.repository;

import com.inventra.inventra_backend.inventory.domain.model.StockMovement;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {

    Page<StockMovement> findByBusinessIdAndStoreIdOrderByOccurredAtDesc(
        UUID businessId,
        UUID storeId,
        Pageable pageable
    );

    Page<StockMovement> findByBusinessIdAndStoreIdAndProductIdOrderByOccurredAtDesc(
        UUID businessId,
        UUID storeId,
        UUID productId,
        Pageable pageable
    );

    Page<StockMovement> findByBusinessIdAndStoreIdAndBatchIdOrderByOccurredAtDesc(
        UUID businessId,
        UUID storeId,
        UUID batchId,
        Pageable pageable
    );
}
