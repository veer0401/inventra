package com.inventra.inventra_backend.sales.domain.repository;

import com.inventra.inventra_backend.sales.domain.model.SaleLineBatchAllocation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SaleLineBatchAllocationRepository extends JpaRepository<SaleLineBatchAllocation, UUID> {

    List<SaleLineBatchAllocation> findBySaleIdAndBusinessId(UUID saleId, UUID businessId);

    List<SaleLineBatchAllocation> findBySaleLineIdAndBusinessId(UUID saleLineId, UUID businessId);

    Optional<SaleLineBatchAllocation> findByIdAndBusinessId(UUID id, UUID businessId);

    Optional<SaleLineBatchAllocation> findByIdAndSaleLineIdAndBusinessId(UUID id, UUID saleLineId, UUID businessId);
}
