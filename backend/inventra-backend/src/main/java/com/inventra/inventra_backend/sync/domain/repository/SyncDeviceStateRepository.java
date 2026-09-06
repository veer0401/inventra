package com.inventra.inventra_backend.sync.domain.repository;

import com.inventra.inventra_backend.sync.domain.model.SyncDeviceState;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SyncDeviceStateRepository extends JpaRepository<SyncDeviceState, UUID> {

    Optional<SyncDeviceState> findByBusinessIdAndDeviceId(UUID businessId, UUID deviceId);
}
