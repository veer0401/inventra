package com.inventra.inventra_backend.tenant.domain.repository;

import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.model.StoreStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface StoreRepository extends JpaRepository<Store, UUID> {

    List<Store> findByBusinessId(UUID businessId);

    Optional<Store> findByIdAndBusinessId(UUID id, UUID businessId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Store s WHERE s.id = :id")
    Optional<Store> findByIdWithLock(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Store s WHERE s.id = :id AND s.businessId = :businessId")
    Optional<Store> findByIdAndBusinessIdWithLock(@Param("id") UUID id, @Param("businessId") UUID businessId);

    Optional<Store> findByBusinessIdAndStoreCode(UUID businessId, String storeCode);

    Optional<Store> findByBusinessIdAndIsHeadquartersTrue(UUID businessId);

    List<Store> findByBusinessIdAndStatus(UUID businessId, StoreStatus status);
}

