package com.inventra.inventra_backend.purchasing.domain.repository;

import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrderLine;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PurchaseOrderLineRepository extends JpaRepository<PurchaseOrderLine, UUID> {

    Optional<PurchaseOrderLine> findByIdAndBusinessId(UUID id, UUID businessId);

    List<PurchaseOrderLine> findByPurchaseOrderIdAndBusinessId(UUID purchaseOrderId, UUID businessId);
}
