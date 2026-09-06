package com.inventra.inventra_backend.sync.infrastructure;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.sync.domain.model.SyncChangeFeed;
import com.inventra.inventra_backend.sync.domain.model.SyncChangeOperation;
import com.inventra.inventra_backend.sync.domain.repository.SyncChangeFeedRepository;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ChangeFeedPublisher {

    private final SyncChangeFeedRepository changeFeedRepository;
    private final ObjectMapper objectMapper;

    public ChangeFeedPublisher(SyncChangeFeedRepository changeFeedRepository) {
        this(changeFeedRepository, new ObjectMapper().findAndRegisterModules());
    }

    @Autowired
    public ChangeFeedPublisher(SyncChangeFeedRepository changeFeedRepository, ObjectMapper objectMapper) {
        this.changeFeedRepository = changeFeedRepository;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper().findAndRegisterModules();
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void publish(
        UUID businessId,
        UUID storeId,
        String entityType,
        UUID entityId,
        SyncChangeOperation operation,
        Integer entityVersion,
        Object payload
    ) {
        try {
            String jsonPayload = objectMapper.writeValueAsString(payload);
            SyncChangeFeed entry = new SyncChangeFeed(
                businessId,
                storeId,
                entityType,
                entityId,
                operation,
                entityVersion != null ? entityVersion : 1,
                jsonPayload
            );
            changeFeedRepository.save(entry);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to serialize change feed payload for " + entityType + " " + entityId, e);
        }
    }
}
