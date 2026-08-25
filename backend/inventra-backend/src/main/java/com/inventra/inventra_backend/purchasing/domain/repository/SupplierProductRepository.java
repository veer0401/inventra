package com.inventra.inventra_backend.purchasing.domain.repository;

import com.inventra.inventra_backend.purchasing.domain.model.SupplierProduct;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SupplierProductRepository extends JpaRepository<SupplierProduct, UUID> {

    Optional<SupplierProduct> findByIdAndBusinessId(UUID id, UUID businessId);

    Optional<SupplierProduct> findByBusinessIdAndSupplierIdAndProductId(UUID businessId, UUID supplierId, UUID productId);

    List<SupplierProduct> findByBusinessIdAndSupplierId(UUID businessId, UUID supplierId);

    List<SupplierProduct> findByBusinessIdAndProductId(UUID businessId, UUID productId);
}
