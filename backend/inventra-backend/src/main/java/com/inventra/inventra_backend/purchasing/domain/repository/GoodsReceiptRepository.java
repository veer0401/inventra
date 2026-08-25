package com.inventra.inventra_backend.purchasing.domain.repository;

import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceipt;
import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceiptStatus;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface GoodsReceiptRepository extends JpaRepository<GoodsReceipt, UUID> {

    Optional<GoodsReceipt> findByIdAndBusinessId(UUID id, UUID businessId);

    Optional<GoodsReceipt> findByIdAndStoreIdAndBusinessId(UUID id, UUID storeId, UUID businessId);

    Optional<GoodsReceipt> findByBusinessIdAndIdempotencyKey(UUID businessId, String idempotencyKey);

    boolean existsByBusinessIdAndReceiptNumberIgnoreCase(UUID businessId, String receiptNumber);

    @Query("""
        SELECT gr FROM GoodsReceipt gr
        WHERE gr.businessId = :businessId
          AND (:storeId IS NULL OR gr.storeId = :storeId)
          AND (:supplierId IS NULL OR gr.supplierId = :supplierId)
          AND (:status IS NULL OR gr.status = :status)
          AND (:purchaseOrderId IS NULL OR gr.purchaseOrderId = :purchaseOrderId)
    """)
    Page<GoodsReceipt> findWithFilters(
        @Param("businessId") UUID businessId,
        @Param("storeId") UUID storeId,
        @Param("supplierId") UUID supplierId,
        @Param("status") GoodsReceiptStatus status,
        @Param("purchaseOrderId") UUID purchaseOrderId,
        Pageable pageable
    );

    @Query("SELECT COUNT(gr) FROM GoodsReceipt gr WHERE gr.businessId = :businessId AND gr.storeId = :storeId")
    long countByBusinessIdAndStoreId(@Param("businessId") UUID businessId, @Param("storeId") UUID storeId);
}
