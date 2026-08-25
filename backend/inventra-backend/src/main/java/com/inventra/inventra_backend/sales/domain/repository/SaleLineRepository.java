package com.inventra.inventra_backend.sales.domain.repository;

import com.inventra.inventra_backend.sales.domain.model.SaleLine;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SaleLineRepository extends JpaRepository<SaleLine, UUID> {

    List<SaleLine> findBySaleIdAndBusinessIdOrderByLineNumberAsc(UUID saleId, UUID businessId);

    Optional<SaleLine> findByIdAndBusinessId(UUID id, UUID businessId);

    Optional<SaleLine> findByIdAndSaleIdAndBusinessId(UUID id, UUID saleId, UUID businessId);
}
