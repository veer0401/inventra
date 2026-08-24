package com.inventra.inventra_backend.tenant.application;

import com.inventra.inventra_backend.common.domain.exception.DuplicateResourceException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.common.domain.exception.TenantAccessDeniedException;
import com.inventra.inventra_backend.identity.application.SecurityAuditService;
import com.inventra.inventra_backend.identity.domain.model.SecurityAuditEventType;
import com.inventra.inventra_backend.identity.domain.repository.RefreshTokenRepository;
import com.inventra.inventra_backend.tenant.api.dto.RegisterDeviceRequest;
import com.inventra.inventra_backend.tenant.domain.model.Device;
import com.inventra.inventra_backend.tenant.domain.repository.DeviceRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final SecurityAuditService auditService;

    public DeviceService(
        DeviceRepository deviceRepository,
        RefreshTokenRepository refreshTokenRepository,
        SecurityAuditService auditService
    ) {
        this.deviceRepository = deviceRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.auditService = auditService;
    }

    @Transactional
    public Device registerDevice(
        UUID businessId,
        UUID userId,
        RegisterDeviceRequest request,
        String ipAddress,
        String userAgent
    ) {
        String normalizedCode = request.deviceCode().trim().toUpperCase();
        deviceRepository.findByBusinessIdAndDeviceCode(businessId, normalizedCode).ifPresent(d -> {
            throw new DuplicateResourceException(
                "Device with code '" + normalizedCode + "' already exists in this business",
                "DEVICE_CODE_EXISTS"
            );
        });

        Device device = Device.create(
            businessId,
            userId,
            request.deviceName(),
            normalizedCode,
            request.deviceType(),
            request.platformOs(),
            request.appVersion()
        );
        device.recordActivity(ipAddress);
        Device saved = deviceRepository.save(device);

        auditService.recordEvent(
            userId,
            businessId,
            saved.getId(),
            SecurityAuditEventType.DEVICE_REGISTERED,
            ipAddress,
            userAgent,
            "Device registered: code=" + saved.getDeviceCode() + ", type=" + saved.getDeviceType()
        );

        return saved;
    }

    @Transactional
    public Device revokeDevice(
        UUID businessId,
        UUID deviceId,
        UUID actorUserId,
        String ipAddress,
        String userAgent
    ) {
        Device device = deviceRepository.findById(deviceId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Device", deviceId));

        if (!device.getBusinessId().equals(businessId)) {
            throw new TenantAccessDeniedException("Device does not belong to the current business");
        }

        device.revoke();
        Device saved = deviceRepository.save(device);

        // Invalidate all active refresh tokens for this device
        refreshTokenRepository.revokeAllByDeviceId(deviceId);

        auditService.recordEvent(
            actorUserId,
            businessId,
            deviceId,
            SecurityAuditEventType.DEVICE_REVOKED,
            ipAddress,
            userAgent,
            "Device revoked: code=" + device.getDeviceCode()
        );

        return saved;
    }

    @Transactional(readOnly = true)
    public List<Device> listDevices(UUID businessId) {
        return deviceRepository.findByBusinessId(businessId);
    }

    @Transactional(readOnly = true)
    public Device getDevice(UUID businessId, UUID deviceId) {
        Device device = deviceRepository.findById(deviceId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Device", deviceId));
        if (!device.getBusinessId().equals(businessId)) {
            throw new TenantAccessDeniedException("Device does not belong to the current business");
        }
        return device;
    }
}
