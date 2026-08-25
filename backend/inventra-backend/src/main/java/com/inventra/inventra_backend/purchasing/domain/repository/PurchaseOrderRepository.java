package com.inventra.inventra_backend.purchasing.domain.repository;

import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrder;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrderStatus;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, UUID> {

    Optional<PurchaseOrder> findByIdAndBusinessId(UUID id, UUID businessId);

    Optional<PurchaseOrder> findByIdAndStoreIdAndBusinessId(UUID id, UUID storeId, UUID businessId);

    boolean existsByBusinessIdAndOrderNumberIgnoreCase(UUID businessId, String orderNumber);

    Page<PurchaseOrder> findByBusinessId(UUID businessId, Pageable pageable);

    Page<PurchaseOrder> findByBusinessIdAndStoreId(UUID businessId, UUID storeId, Pageable pageable);

    Page<PurchaseOrder> findByBusinessIdAndStoreIdAndStatus(UUID businessId, UUID storeId, PurchaseOrderStatus status, Pageable pageable);

    @Query("""
        SELECT po FROM PurchaseOrder po
        WHERE po.businessId = :businessId
          AND (:storeId IS NULL OR po.storeId = :storeId)
          AND (:supplierId IS NULL OR po.supplierId = :supplierId)
          AND (:status IS NULL OR po.status = :status)
          AND (CAST(:fromDate AS date) IS NULL OR po.orderDate >= :fromDate)
          AND (CAST(:toDate AS date) IS NULL OR po.orderDate <= :toDate)
    """)
    Page<PurchaseOrder> findWithFilters(
        @Param("businessId") UUID businessId,
        @Param("storeId") UUID storeId,
        @Param("supplierId") UUID supplierId,
        @Param("status") PurchaseOrderStatus status,
        @Param("fromDate") LocalDate fromDate,
        @Param("toDate") LocalDate toDate,
        Pageable pageable
    );

    @Query("SELECT COUNT(po) FROM PurchaseOrder po WHERE po.businessId = :businessId AND po.storeId = :storeId")
    long countByBusinessIdAndStoreId(@Param("businessId") UUID businessId, @Param("storeId") UUID storeId);
}
