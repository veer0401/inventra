package com.inventra.inventra_backend.sync.domain.model;

import com.inventra.inventra_backend.common.util.UuidUtils;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SyncOperationTest {

    @Test
    @DisplayName("SyncOperation creates with valid fields and applied status sets appliedAt")
    void syncOperationCreationApplied() {
        UUID businessId = UuidUtils.newUuid7();
        UUID storeId = UuidUtils.newUuid7();
        UUID deviceId = UuidUtils.newUuid7();
        UUID userId = UuidUtils.newUuid7();
        UUID eventId = UuidUtils.newUuid7();
        UUID serverEntityId = UuidUtils.newUuid7();
        Instant now = Instant.now();

        SyncOperation op = new SyncOperation(
            businessId,
            storeId,
            deviceId,
            userId,
            eventId,
            1L,
            SyncEventType.SALE_CREATED,
            1,
            SyncStatus.APPLIED,
            serverEntityId,
            "abc123checksum",
            null,
            "Sale applied",
            now
        );

        assertThat(op.getId()).isNotNull();
        assertThat(op.getBusinessId()).isEqualTo(businessId);
        assertThat(op.getStoreId()).isEqualTo(storeId);
        assertThat(op.getDeviceId()).isEqualTo(deviceId);
        assertThat(op.getUserId()).isEqualTo(userId);
        assertThat(op.getEventId()).isEqualTo(eventId);
        assertThat(op.getDeviceSequenceNumber()).isEqualTo(1L);
        assertThat(op.getEventType()).isEqualTo(SyncEventType.SALE_CREATED);
        assertThat(op.getStatus()).isEqualTo(SyncStatus.APPLIED);
        assertThat(op.getServerEntityId()).isEqualTo(serverEntityId);
        assertThat(op.getPayloadChecksum()).isEqualTo("abc123checksum");
        assertThat(op.getAppliedAt()).isNotNull();
        assertThat(op.getRetryCount()).isEqualTo(0);

        op.incrementRetryCount();
        assertThat(op.getRetryCount()).isEqualTo(1);
    }
}
