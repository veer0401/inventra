package com.inventra.inventra_backend.purchasing.domain.repository;

import com.inventra.inventra_backend.purchasing.domain.model.PurchaseInvoice;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseInvoiceStatus;
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
public interface PurchaseInvoiceRepository extends JpaRepository<PurchaseInvoice, UUID> {

    Optional<PurchaseInvoice> findByIdAndBusinessId(UUID id, UUID businessId);

    Optional<PurchaseInvoice> findByIdAndStoreIdAndBusinessId(UUID id, UUID storeId, UUID businessId);

    boolean existsByBusinessIdAndSupplierIdAndSupplierInvoiceNumberIgnoreCase(UUID businessId, UUID supplierId, String supplierInvoiceNumber);

    @Query("""
        SELECT pi FROM PurchaseInvoice pi
        WHERE pi.businessId = :businessId
          AND (:storeId IS NULL OR pi.storeId = :storeId)
          AND (:supplierId IS NULL OR pi.supplierId = :supplierId)
          AND (:status IS NULL OR pi.status = :status)
          AND (CAST(:dueDateBefore AS date) IS NULL OR pi.dueDate <= :dueDateBefore)
    """)
    Page<PurchaseInvoice> findWithFilters(
        @Param("businessId") UUID businessId,
        @Param("storeId") UUID storeId,
        @Param("supplierId") UUID supplierId,
        @Param("status") PurchaseInvoiceStatus status,
        @Param("dueDateBefore") LocalDate dueDateBefore,
        Pageable pageable
    );
}
