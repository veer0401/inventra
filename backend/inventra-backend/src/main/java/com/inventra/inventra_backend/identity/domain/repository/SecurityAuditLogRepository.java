package com.inventra.inventra_backend.identity.domain.repository;

import com.inventra.inventra_backend.identity.domain.model.SecurityAuditLog;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SecurityAuditLogRepository extends JpaRepository<SecurityAuditLog, UUID> {

    List<SecurityAuditLog> findByUserId(UUID userId);

    List<SecurityAuditLog> findByUserIdOrderByOccurredAtDesc(UUID userId);

    List<SecurityAuditLog> findByBusinessId(UUID businessId);

    List<SecurityAuditLog> findByDeviceId(UUID deviceId);
}
