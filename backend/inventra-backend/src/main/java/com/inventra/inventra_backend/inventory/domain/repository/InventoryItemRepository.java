package com.inventra.inventra_backend.inventory.domain.repository;

import com.inventra.inventra_backend.inventory.domain.model.InventoryItem;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryItemRepository extends JpaRepository<InventoryItem, UUID> {

    Optional<InventoryItem> findByIdAndBusinessId(UUID id, UUID businessId);

    Optional<InventoryItem> findByStoreIdAndProductId(UUID storeId, UUID productId);

    Optional<InventoryItem> findByStoreIdAndProductIdAndBusinessId(UUID storeId, UUID productId, UUID businessId);

    Page<InventoryItem> findByBusinessIdAndStoreId(UUID businessId, UUID storeId, Pageable pageable);

    java.util.List<InventoryItem> findByBusinessIdAndStoreIdAndProductIdIn(UUID businessId, UUID storeId, java.util.Collection<UUID> productIds);

    @Query("""
        SELECT i FROM InventoryItem i
        WHERE i.businessId = :businessId
          AND i.storeId = :storeId
          AND i.currentStock <= i.reorderLevel
    """)
    Page<InventoryItem> findLowStockItems(
        @Param("businessId") UUID businessId,
        @Param("storeId") UUID storeId,
        Pageable pageable
    );
}
