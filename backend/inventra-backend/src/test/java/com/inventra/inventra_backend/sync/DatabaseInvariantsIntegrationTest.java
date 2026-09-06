package com.inventra.inventra_backend.sync;

import com.inventra.inventra_backend.common.util.UuidUtils;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.sync.domain.model.SyncEventType;
import com.inventra.inventra_backend.sync.domain.model.SyncOperation;
import com.inventra.inventra_backend.sync.domain.model.SyncStatus;
import com.inventra.inventra_backend.sync.domain.repository.SyncOperationRepository;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.Device;
import com.inventra.inventra_backend.tenant.domain.model.DeviceType;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.DeviceRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class DatabaseInvariantsIntegrationTest {

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private SyncOperationRepository syncOperationRepository;

    private Business businessA;
    private Business businessB;
    private Store storeA;
    private User userA;
    private Device deviceA;

    @BeforeEach
    void setUp() {
        businessA = businessRepository.save(Business.create("Business A", "biz-a", null, null));
        businessB = businessRepository.save(Business.create("Business B", "biz-b", null, null));

        storeA = storeRepository.save(Store.create(businessA.getId(), "STA", "Store A", false));
        userA = userRepository.save(User.create("user.a@inventra.com", "hash", "User A", null));

        deviceA = deviceRepository.save(Device.create(
            businessA.getId(),
            userA.getId(),
            "Counter 1",
            "DEV-C1-" + UUID.randomUUID().toString().substring(0, 8),
            DeviceType.DESKTOP,
            "Windows",
            "1.0.0"
        ));
    }

    @Test
    @DisplayName("sync_operations rejects duplicate (business_id, device_id, event_id)")
    void duplicateEventIdRejected() {
        UUID eventId = UuidUtils.newUuid7();

        SyncOperation op1 = new SyncOperation(
            businessA.getId(), storeA.getId(), deviceA.getId(), userA.getId(),
            eventId, 1L, SyncEventType.SALE_CREATED, 1,
            SyncStatus.APPLIED, null, "checksum1", null, null, Instant.now()
        );
        syncOperationRepository.saveAndFlush(op1);

        SyncOperation op2 = new SyncOperation(
            businessA.getId(), storeA.getId(), deviceA.getId(), userA.getId(),
            eventId, 2L, SyncEventType.SALE_CREATED, 1,
            SyncStatus.APPLIED, null, "checksum2", null, null, Instant.now()
        );

        assertThatThrownBy(() -> syncOperationRepository.saveAndFlush(op2))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("sync_operations rejects duplicate (business_id, device_id, device_sequence_number)")
    void duplicateSequenceNumberRejected() {
        SyncOperation op1 = new SyncOperation(
            businessA.getId(), storeA.getId(), deviceA.getId(), userA.getId(),
            UuidUtils.newUuid7(), 10L, SyncEventType.SALE_CREATED, 1,
            SyncStatus.APPLIED, null, "checksum1", null, null, Instant.now()
        );
        syncOperationRepository.saveAndFlush(op1);

        SyncOperation op2 = new SyncOperation(
            businessA.getId(), storeA.getId(), deviceA.getId(), userA.getId(),
            UuidUtils.newUuid7(), 10L, SyncEventType.SALE_CREATED, 1,
            SyncStatus.APPLIED, null, "checksum2", null, null, Instant.now()
        );

        assertThatThrownBy(() -> syncOperationRepository.saveAndFlush(op2))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("sync_operations rejects cross-business foreign key violation")
    void crossBusinessDeviceRejected() {
        SyncOperation op = new SyncOperation(
            businessB.getId(), // mismatched business with deviceA
            storeA.getId(),
            deviceA.getId(),
            userA.getId(),
            UuidUtils.newUuid7(),
            1L,
            SyncEventType.SALE_CREATED,
            1,
            SyncStatus.APPLIED,
            null,
            "checksum",
            null,
            null,
            Instant.now()
        );

        assertThatThrownBy(() -> syncOperationRepository.saveAndFlush(op))
            .isInstanceOf(DataIntegrityViolationException.class);
    }
}
