package com.inventra.inventra_backend.sales.domain.repository;

import com.inventra.inventra_backend.sales.domain.model.SaleRefund;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SaleRefundRepository extends JpaRepository<SaleRefund, UUID> {

    List<SaleRefund> findBySaleReturnIdAndBusinessId(UUID saleReturnId, UUID businessId);
}
