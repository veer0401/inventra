package com.inventra.inventra_backend.sales.domain.repository;

import com.inventra.inventra_backend.sales.domain.model.SaleReturnLineBatchAllocation;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SaleReturnLineBatchAllocationRepository extends JpaRepository<SaleReturnLineBatchAllocation, UUID> {

    List<SaleReturnLineBatchAllocation> findBySaleReturnIdAndBusinessId(UUID saleReturnId, UUID businessId);

    List<SaleReturnLineBatchAllocation> findBySaleReturnLineIdAndBusinessId(UUID saleReturnLineId, UUID businessId);
}
