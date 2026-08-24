package com.inventra.inventra_backend.tenant.domain.repository;

import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.model.StoreStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StoreRepository extends JpaRepository<Store, UUID> {

    List<Store> findByBusinessId(UUID businessId);

    Optional<Store> findByBusinessIdAndStoreCode(UUID businessId, String storeCode);

    Optional<Store> findByBusinessIdAndIsHeadquartersTrue(UUID businessId);

    List<Store> findByBusinessIdAndStatus(UUID businessId, StoreStatus status);
}
