package com.inventra.inventra_backend.tenant.domain.repository;

import com.inventra.inventra_backend.tenant.domain.model.Device;
import com.inventra.inventra_backend.tenant.domain.model.DeviceStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeviceRepository extends JpaRepository<Device, UUID> {

    List<Device> findByBusinessId(UUID businessId);

    Optional<Device> findByBusinessIdAndDeviceCode(UUID businessId, String deviceCode);

    List<Device> findByBusinessIdAndStatus(UUID businessId, DeviceStatus status);
}
