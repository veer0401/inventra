package com.inventra.inventra_backend.identity.domain.model;

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
@Table(name = "security_audit_logs")
public class SecurityAuditLog {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "business_id")
    private UUID businessId;

    @Column(name = "device_id")
    private UUID deviceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private SecurityAuditEventType eventType;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    @Column(name = "detail", length = 500)
    private String detail;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt = Instant.now();

    protected SecurityAuditLog() {
        // Required by JPA
    }

    public SecurityAuditLog(
        UUID id,
        UUID userId,
        UUID businessId,
        UUID deviceId,
        SecurityAuditEventType eventType,
        String ipAddress,
        String userAgent,
        String detail
    ) {
        this.id = id != null ? id : UuidUtils.newUuid7();
        this.userId = userId;
        this.businessId = businessId;
        this.deviceId = deviceId;
        this.eventType = Objects.requireNonNull(eventType, "Event type cannot be null");
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.detail = detail;
        this.occurredAt = Instant.now();
    }

    public static SecurityAuditLog log(
        UUID userId,
        UUID businessId,
        UUID deviceId,
        SecurityAuditEventType eventType,
        String ipAddress,
        String userAgent,
        String detail
    ) {
        return new SecurityAuditLog(
            UuidUtils.newUuid7(),
            userId,
            businessId,
            deviceId,
            eventType,
            ipAddress,
            userAgent,
            detail
        );
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getBusinessId() {
        return businessId;
    }

    public UUID getDeviceId() {
        return deviceId;
    }

    public SecurityAuditEventType getEventType() {
        return eventType;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public String getDetail() {
        return detail;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SecurityAuditLog that)) return false;
        return id != null && id.equals(that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
