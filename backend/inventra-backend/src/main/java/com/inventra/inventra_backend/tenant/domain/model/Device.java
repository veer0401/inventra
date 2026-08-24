package com.inventra.inventra_backend.tenant.domain.model;

import com.inventra.inventra_backend.common.domain.BaseAuditableEntity;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "devices")
public class Device extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false)
    private UUID businessId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "device_name", nullable = false, length = 100)
    private String deviceName;

    @Column(name = "device_code", nullable = false, length = 50)
    private String deviceCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "device_type", nullable = false, length = 30)
    private DeviceType deviceType;

    @Column(name = "platform_os", length = 50)
    private String platformOs;

    @Column(name = "app_version", length = 30)
    private String appVersion;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private DeviceStatus status = DeviceStatus.ACTIVE;

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt = Instant.now();

    @Column(name = "last_ip_address", length = 45)
    private String lastIpAddress;

    @Column(name = "registered_at", nullable = false)
    private Instant registeredAt = Instant.now();

    @Column(name = "revoked_at")
    private Instant revokedAt;

    protected Device() {
        // Required by JPA
    }

    public Device(
        UUID id,
        UUID businessId,
        UUID userId,
        String deviceName,
        String deviceCode,
        DeviceType deviceType,
        String platformOs,
        String appVersion
    ) {
        this.id = id != null ? id : UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "Business ID cannot be null");
        this.userId = Objects.requireNonNull(userId, "User ID cannot be null");
        setDeviceName(deviceName);
        setDeviceCode(deviceCode);
        this.deviceType = Objects.requireNonNull(deviceType, "Device type cannot be null");
        this.platformOs = platformOs;
        this.appVersion = appVersion;
        this.status = DeviceStatus.ACTIVE;
        this.registeredAt = Instant.now();
        this.lastSeenAt = Instant.now();
    }

    public static Device create(
        UUID businessId,
        UUID userId,
        String deviceName,
        String deviceCode,
        DeviceType deviceType,
        String platformOs,
        String appVersion
    ) {
        return new Device(
            UuidUtils.newUuid7(),
            businessId,
            userId,
            deviceName,
            deviceCode,
            deviceType,
            platformOs,
            appVersion
        );
    }

    public UUID getId() {
        return id;
    }

    public UUID getBusinessId() {
        return businessId;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getDeviceName() {
        return deviceName;
    }

    public void setDeviceName(String deviceName) {
        Objects.requireNonNull(deviceName, "Device name cannot be null");
        String trimmed = deviceName.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Device name cannot be blank");
        }
        this.deviceName = trimmed;
    }

    public String getDeviceCode() {
        return deviceCode;
    }

    public void setDeviceCode(String deviceCode) {
        Objects.requireNonNull(deviceCode, "Device code cannot be null");
        String normalized = deviceCode.trim().toUpperCase();
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("Device code cannot be blank");
        }
        this.deviceCode = normalized;
    }

    public DeviceType getDeviceType() {
        return deviceType;
    }

    public void setDeviceType(DeviceType deviceType) {
        this.deviceType = Objects.requireNonNull(deviceType, "Device type cannot be null");
    }

    public String getPlatformOs() {
        return platformOs;
    }

    public void setPlatformOs(String platformOs) {
        this.platformOs = platformOs;
    }

    public String getAppVersion() {
        return appVersion;
    }

    public void setAppVersion(String appVersion) {
        this.appVersion = appVersion;
    }

    public DeviceStatus getStatus() {
        return status;
    }

    public void setStatus(DeviceStatus status) {
        this.status = Objects.requireNonNull(status, "Status cannot be null");
    }

    public Instant getLastSeenAt() {
        return lastSeenAt;
    }

    public void setLastSeenAt(Instant lastSeenAt) {
        this.lastSeenAt = lastSeenAt;
    }

    public String getLastIpAddress() {
        return lastIpAddress;
    }

    public void setLastIpAddress(String lastIpAddress) {
        this.lastIpAddress = lastIpAddress;
    }

    public Instant getRegisteredAt() {
        return registeredAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public void recordActivity(String ipAddress) {
        this.lastSeenAt = Instant.now();
        if (ipAddress != null && !ipAddress.isBlank()) {
            this.lastIpAddress = ipAddress;
        }
    }

    public void revoke() {
        this.status = DeviceStatus.REVOKED;
        this.revokedAt = Instant.now();
    }

    public boolean isActive() {
        return this.status == DeviceStatus.ACTIVE;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Device device)) return false;
        return id != null && id.equals(device.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
