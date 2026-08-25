package com.inventra.inventra_backend.purchasing.domain.repository;

import com.inventra.inventra_backend.purchasing.domain.model.PurchaseInvoiceLine;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PurchaseInvoiceLineRepository extends JpaRepository<PurchaseInvoiceLine, UUID> {

    Optional<PurchaseInvoiceLine> findByIdAndBusinessId(UUID id, UUID businessId);

    List<PurchaseInvoiceLine> findByPurchaseInvoiceIdAndBusinessId(UUID purchaseInvoiceId, UUID businessId);
}
