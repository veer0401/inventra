package com.inventra.inventra_backend.identity.application;

import com.inventra.inventra_backend.identity.domain.model.SecurityAuditEventType;
import com.inventra.inventra_backend.identity.domain.model.SecurityAuditLog;
import com.inventra.inventra_backend.identity.domain.repository.SecurityAuditLogRepository;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SecurityAuditService {

    private static final Logger log = LoggerFactory.getLogger(SecurityAuditService.class);

    private final SecurityAuditLogRepository auditLogRepository;

    public SecurityAuditService(SecurityAuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public void recordEvent(
        UUID userId,
        UUID businessId,
        UUID deviceId,
        SecurityAuditEventType eventType,
        String ipAddress,
        String userAgent,
        String detail
    ) {
        try {
            SecurityAuditLog auditLog = SecurityAuditLog.log(
                userId,
                businessId,
                deviceId,
                eventType,
                ipAddress,
                userAgent,
                detail
            );
            auditLogRepository.save(auditLog);
            log.info("Security audit event recorded: type={}, user={}, business={}, device={}",
                eventType, userId, businessId, deviceId);
        } catch (Exception e) {
            log.error("Failed to record security audit log for event {}: {}", eventType, e.getMessage());
        }
    }
}
