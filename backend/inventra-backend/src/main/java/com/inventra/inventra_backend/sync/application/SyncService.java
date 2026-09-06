package com.inventra.inventra_backend.sync.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.sync.api.dto.ChangeFeedEntry;
import com.inventra.inventra_backend.sync.api.dto.SyncDownloadResponse;
import com.inventra.inventra_backend.sync.api.dto.SyncOperationRequest;
import com.inventra.inventra_backend.sync.api.dto.SyncOperationResult;
import com.inventra.inventra_backend.sync.api.dto.SyncUploadRequest;
import com.inventra.inventra_backend.sync.api.dto.SyncUploadResponse;
import com.inventra.inventra_backend.sync.domain.model.SyncChangeFeed;
import com.inventra.inventra_backend.sync.domain.model.SyncDeviceState;
import com.inventra.inventra_backend.sync.domain.repository.SyncChangeFeedRepository;
import com.inventra.inventra_backend.sync.domain.repository.SyncDeviceStateRepository;
import com.inventra.inventra_backend.tenant.domain.model.Device;
import com.inventra.inventra_backend.tenant.domain.model.DeviceStatus;
import com.inventra.inventra_backend.tenant.domain.repository.DeviceRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SyncService {

    private static final Logger log = LoggerFactory.getLogger(SyncService.class);

    private final SyncOperationProcessor operationProcessor;
    private final SyncChangeFeedRepository changeFeedRepository;
    private final SyncDeviceStateRepository deviceStateRepository;
    private final DeviceRepository deviceRepository;
    private final StoreRepository storeRepository;
    private final ObjectMapper objectMapper;

    public SyncService(
        SyncOperationProcessor operationProcessor,
        SyncChangeFeedRepository changeFeedRepository,
        SyncDeviceStateRepository deviceStateRepository,
        DeviceRepository deviceRepository,
        StoreRepository storeRepository,
        ObjectMapper objectMapper
    ) {
        this.operationProcessor = operationProcessor;
        this.changeFeedRepository = changeFeedRepository;
        this.deviceStateRepository = deviceStateRepository;
        this.deviceRepository = deviceRepository;
        this.storeRepository = storeRepository;
        this.objectMapper = objectMapper;
    }

    public SyncUploadResponse processUpload(
        UUID businessId,
        UUID storeId,
        UUID userId,
        UUID authenticatedDeviceId,
        SyncUploadRequest request
    ) {
        // Step 1: Validate Device Authentication & Prevent Impersonation
        if (authenticatedDeviceId != null && !authenticatedDeviceId.equals(request.deviceId())) {
            throw new BusinessRuleViolationException(
                "DEVICE_IMPERSONATION_FORBIDDEN",
                "Authenticated device ID (" + authenticatedDeviceId + ") does not match payload device ID (" + request.deviceId() + ")"
            );
        }

        Device device = deviceRepository.findById(request.deviceId())
            .orElseThrow(() -> new BusinessRuleViolationException("DEVICE_NOT_FOUND", "Device not registered"));

        if (!device.getBusinessId().equals(businessId)) {
            throw new BusinessRuleViolationException("DEVICE_TENANT_MISMATCH", "Device does not belong to the current business");
        }

        if (device.getStatus() != DeviceStatus.ACTIVE) {
            throw new BusinessRuleViolationException(
                "DEVICE_REVOKED",
                "Device " + device.getDeviceCode() + " is " + device.getStatus() + " and cannot synchronize"
            );
        }

        // Step 2: Validate Store Existence
        if (storeId != null) {
            storeRepository.findByIdAndBusinessId(storeId, businessId)
                .orElseThrow(() -> ResourceNotFoundException.forResource("Store", storeId));
        }

        // Step 3: Sort operations by (deviceSequenceNumber ASC, occurredAt ASC, eventId ASC)
        List<SyncOperationRequest> sortedOperations = request.operations().stream()
            .sorted(Comparator.comparing(SyncOperationRequest::deviceSequenceNumber)
                .thenComparing(SyncOperationRequest::occurredAt)
                .thenComparing(SyncOperationRequest::eventId))
            .toList();

        // Step 4: Process operations sequentially with isolated transaction per operation
        List<SyncOperationResult> results = new ArrayList<>();
        Long highestSequenceNumber = 0L;

        for (SyncOperationRequest opReq : sortedOperations) {
            SyncOperationResult result = operationProcessor.processSingleOperation(
                businessId, storeId, userId, request.deviceId(), opReq
            );
            results.add(result);

            if (opReq.deviceSequenceNumber() > highestSequenceNumber) {
                highestSequenceNumber = opReq.deviceSequenceNumber();
            }
        }

        // Step 5: Update Device Sync State
        updateDeviceState(businessId, request.deviceId(), highestSequenceNumber, null);

        return new SyncUploadResponse(
            request.syncSessionId(),
            Instant.now(),
            results.size(),
            results
        );
    }

    @Transactional(readOnly = true)
    public SyncDownloadResponse downloadChanges(
        UUID businessId,
        UUID storeId,
        Long cursor,
        Integer limit
    ) {
        long effectiveCursor = cursor != null && cursor >= 0 ? cursor : 0L;
        int effectiveLimit = limit != null && limit > 0 ? Math.min(limit, 500) : 100;

        List<SyncChangeFeed> feedEntries = changeFeedRepository.findChangesForDevice(
            businessId,
            storeId,
            effectiveCursor,
            PageRequest.of(0, effectiveLimit + 1)
        );

        boolean hasMore = feedEntries.size() > effectiveLimit;
        List<SyncChangeFeed> pageEntries = hasMore ? feedEntries.subList(0, effectiveLimit) : feedEntries;

        long nextCursor = effectiveCursor;
        List<ChangeFeedEntry> changes = new ArrayList<>();

        for (SyncChangeFeed entry : pageEntries) {
            try {
                Object payloadObj = objectMapper.readValue(entry.getPayload(), Object.class);
                changes.add(new ChangeFeedEntry(
                    entry.getChangeSeq(),
                    entry.getId(),
                    entry.getEntityType(),
                    entry.getEntityId(),
                    entry.getOperation(),
                    entry.getEntityVersion(),
                    payloadObj,
                    entry.getCreatedAt()
                ));
                nextCursor = entry.getChangeSeq();
            } catch (Exception e) {
                log.error("Failed to parse change feed JSON for seq {}: {}", entry.getChangeSeq(), e.getMessage());
            }
        }

        return new SyncDownloadResponse(
            effectiveCursor,
            nextCursor,
            hasMore,
            changes
        );
    }

    @Transactional
    public void updateDeviceState(UUID businessId, UUID deviceId, Long sequenceNumber, Long cursor) {
        try {
            SyncDeviceState state = deviceStateRepository.findByBusinessIdAndDeviceId(businessId, deviceId)
                .orElseGet(() -> new SyncDeviceState(businessId, deviceId));

            state.updateSyncState(sequenceNumber, cursor);
            deviceStateRepository.save(state);
        } catch (Exception e) {
            log.warn("Failed to update sync device state for device {}: {}", deviceId, e.getMessage());
        }
    }
}
