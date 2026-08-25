package com.inventra.inventra_backend.sales.domain.repository;

import com.inventra.inventra_backend.sales.domain.model.SaleReturnLine;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SaleReturnLineRepository extends JpaRepository<SaleReturnLine, UUID> {

    List<SaleReturnLine> findBySaleReturnIdAndBusinessIdOrderByLineNumberAsc(UUID saleReturnId, UUID businessId);
}
