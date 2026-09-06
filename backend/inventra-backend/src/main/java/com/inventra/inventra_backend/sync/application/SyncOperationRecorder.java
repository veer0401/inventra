package com.inventra.inventra_backend.sync.application;

import com.inventra.inventra_backend.sync.api.dto.SyncOperationRequest;
import com.inventra.inventra_backend.sync.api.dto.SyncOperationResult;
import com.inventra.inventra_backend.sync.domain.model.SyncOperation;
import com.inventra.inventra_backend.sync.domain.model.SyncStatus;
import com.inventra.inventra_backend.sync.domain.repository.SyncOperationRepository;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
public class SyncOperationRecorder {

    private static final Logger log = LoggerFactory.getLogger(SyncOperationRecorder.class);

    private final SyncOperationRepository syncOperationRepository;

    public SyncOperationRecorder(SyncOperationRepository syncOperationRepository) {
        this.syncOperationRepository = syncOperationRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public SyncOperationResult recordRejected(
        UUID businessId,
        UUID storeId,
        UUID deviceId,
        UUID userId,
        SyncOperationRequest opReq,
        String errorCode,
        String errorMessage,
        boolean retryable
    ) {
        try {
            SyncOperation syncOp = new SyncOperation(
                businessId,
                storeId,
                deviceId,
                userId,
                opReq.eventId(),
                opReq.deviceSequenceNumber(),
                opReq.eventType(),
                opReq.eventVersion(),
                SyncStatus.REJECTED,
                null,
                opReq.payloadChecksum(),
                errorCode,
                errorMessage,
                opReq.occurredAt()
            );
            syncOperationRepository.save(syncOp);
        } catch (Exception e) {
            log.warn("Failed to persist rejected sync operation {}: {}", opReq.eventId(), e.getMessage());
        }

        return SyncOperationResult.rejected(
            opReq.eventId(),
            opReq.deviceSequenceNumber(),
            errorCode,
            errorMessage,
            retryable
        );
    }
}
