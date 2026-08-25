package com.inventra.inventra_backend.sales.domain.repository;

import com.inventra.inventra_backend.sales.domain.model.SalePayment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalePaymentRepository extends JpaRepository<SalePayment, UUID> {

    List<SalePayment> findBySaleIdAndBusinessId(UUID saleId, UUID businessId);
}
