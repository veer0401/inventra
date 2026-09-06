package com.inventra.inventra_backend.sync.domain.repository;

import com.inventra.inventra_backend.sync.domain.model.SyncOperation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SyncOperationRepository extends JpaRepository<SyncOperation, UUID> {

    Optional<SyncOperation> findByBusinessIdAndDeviceIdAndEventId(UUID businessId, UUID deviceId, UUID eventId);

    Optional<SyncOperation> findByBusinessIdAndEventId(UUID businessId, UUID eventId);

    Optional<SyncOperation> findByBusinessIdAndDeviceIdAndDeviceSequenceNumber(UUID businessId, UUID deviceId, Long deviceSequenceNumber);

    List<SyncOperation> findByBusinessIdAndDeviceIdOrderByDeviceSequenceNumberAsc(UUID businessId, UUID deviceId);
}
