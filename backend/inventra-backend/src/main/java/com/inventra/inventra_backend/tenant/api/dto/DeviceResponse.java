package com.inventra.inventra_backend.tenant.api.dto;

import com.inventra.inventra_backend.tenant.domain.model.Device;
import com.inventra.inventra_backend.tenant.domain.model.DeviceStatus;
import com.inventra.inventra_backend.tenant.domain.model.DeviceType;
import java.time.Instant;
import java.util.UUID;

public record DeviceResponse(
    UUID id,
    UUID businessId,
    UUID userId,
    String deviceName,
    String deviceCode,
    DeviceType deviceType,
    String platformOs,
    String appVersion,
    DeviceStatus status,
    Instant lastSeenAt,
    String lastIpAddress,
    Instant registeredAt,
    Instant revokedAt
) {
    public static DeviceResponse from(Device device) {
        return new DeviceResponse(
            device.getId(),
            device.getBusinessId(),
            device.getUserId(),
            device.getDeviceName(),
            device.getDeviceCode(),
            device.getDeviceType(),
            device.getPlatformOs(),
            device.getAppVersion(),
            device.getStatus(),
            device.getLastSeenAt(),
            device.getLastIpAddress(),
            device.getRegisteredAt(),
            device.getRevokedAt()
        );
    }
}
