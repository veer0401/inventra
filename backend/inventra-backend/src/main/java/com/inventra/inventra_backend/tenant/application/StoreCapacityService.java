package com.inventra.inventra_backend.tenant.application;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.identity.application.SecurityAuditService;
import com.inventra.inventra_backend.identity.domain.model.Role;
import com.inventra.inventra_backend.identity.domain.model.SecurityAuditEventType;
import com.inventra.inventra_backend.tenant.api.dto.StoreCapacityResponse;
import com.inventra.inventra_backend.tenant.domain.model.AssignmentStatus;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.model.StoreAssignment;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessMembershipRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreAssignmentRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.util.Objects;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StoreCapacityService {

    private static final Logger log = LoggerFactory.getLogger(StoreCapacityService.class);

    private final StoreRepository storeRepository;
    private final StoreAssignmentRepository storeAssignmentRepository;
    private final BusinessMembershipRepository businessMembershipRepository;
    private final SecurityAuditService auditService;

    public StoreCapacityService(
        StoreRepository storeRepository,
        StoreAssignmentRepository storeAssignmentRepository,
        BusinessMembershipRepository businessMembershipRepository,
        SecurityAuditService auditService
    ) {
        this.storeRepository = storeRepository;
        this.storeAssignmentRepository = storeAssignmentRepository;
        this.businessMembershipRepository = businessMembershipRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public StoreCapacityResponse getStoreCapacity(UUID businessId, UUID storeId) {
        Store store = (businessId != null)
            ? storeRepository.findByIdAndBusinessId(storeId, businessId)
                .orElseThrow(() -> new ResourceNotFoundException("Store not found with id: " + storeId))
            : storeRepository.findById(storeId)
                .orElseThrow(() -> new ResourceNotFoundException("Store not found with id: " + storeId));

        long activeUsers = storeAssignmentRepository.countByStoreIdAndStatus(storeId, AssignmentStatus.ACTIVE);
        return new StoreCapacityResponse(
            store.getId(),
            store.getStoreName(),
            store.getStoreCode(),
            store.getMaxUsers(),
            activeUsers,
            activeUsers >= store.getMaxUsers()
        );
    }

    @Transactional
    public StoreCapacityResponse updateStoreCapacity(
        UUID businessId,
        UUID storeId,
        int newMaxUsers,
        UUID actorUserId,
        String ipAddress,
        String userAgent
    ) {
        if (newMaxUsers <= 0) {
            throw new BusinessRuleViolationException(
                "INVALID_STORE_CAPACITY",
                "Store user capacity must be a positive integer (minimum 1)",
                HttpStatus.BAD_REQUEST
            );
        }

        // Lock store row for update to prevent concurrent capacity / assignment modifications
        Store store = (businessId != null)
            ? storeRepository.findByIdAndBusinessIdWithLock(storeId, businessId)
                .orElseThrow(() -> new ResourceNotFoundException("Store not found with id: " + storeId))
            : storeRepository.findByIdWithLock(storeId)
                .orElseThrow(() -> new ResourceNotFoundException("Store not found with id: " + storeId));

        long currentActiveCount = storeAssignmentRepository.countByStoreIdAndStatus(storeId, AssignmentStatus.ACTIVE);
        if (newMaxUsers < currentActiveCount) {
            throw new BusinessRuleViolationException(
                "STORE_USER_LIMIT_BELOW_CURRENT_USAGE",
                "Cannot reduce store user capacity to " + newMaxUsers
                    + " because there are currently " + currentActiveCount
                    + " active user assignments. Please remove or reassign users before reducing capacity.",
                HttpStatus.CONFLICT
            );
        }

        int oldMaxUsers = store.getMaxUsers();
        store.setMaxUsers(newMaxUsers);
        storeRepository.save(store);

        auditService.recordEvent(
            actorUserId,
            store.getBusinessId(),
            null,
            SecurityAuditEventType.STORE_CAPACITY_UPDATED,
            ipAddress,
            userAgent,
            "Store capacity updated for store [" + store.getStoreCode() + "]: old=" + oldMaxUsers + ", new=" + newMaxUsers
        );

        log.info("Store [{}] maxUsers updated: {} -> {} by actor [{}]",
            store.getId(), oldMaxUsers, newMaxUsers, actorUserId);

        return new StoreCapacityResponse(
            store.getId(),
            store.getStoreName(),
            store.getStoreCode(),
            store.getMaxUsers(),
            currentActiveCount,
            currentActiveCount >= store.getMaxUsers()
        );
    }

    @Transactional
    public StoreAssignment assignUserToStore(
        UUID businessId,
        UUID storeId,
        UUID businessMembershipId,
        Role roleOverride,
        boolean isPrimaryStore,
        UUID actorUserId,
        String ipAddress,
        String userAgent
    ) {
        Objects.requireNonNull(storeId, "Store ID cannot be null");
        Objects.requireNonNull(businessMembershipId, "Business Membership ID cannot be null");

        // 1. Lock store row to serialize assignment capacity check against concurrent assigns
        Store store = (businessId != null)
            ? storeRepository.findByIdAndBusinessIdWithLock(storeId, businessId)
                .orElseThrow(() -> new ResourceNotFoundException("Store not found with id: " + storeId))
            : storeRepository.findByIdWithLock(storeId)
                .orElseThrow(() -> new ResourceNotFoundException("Store not found with id: " + storeId));

        // 2. Validate membership exists and belongs to same business
        var membership = businessMembershipRepository.findById(businessMembershipId)
            .orElseThrow(() -> new ResourceNotFoundException("Business membership not found with id: " + businessMembershipId));
        if (!membership.getBusinessId().equals(store.getBusinessId())) {
            throw new BusinessRuleViolationException(
                "CROSS_BUSINESS_ASSIGNMENT_DENIED",
                "Membership does not belong to the same business as the target store",
                HttpStatus.BAD_REQUEST
            );
        }

        // 3. Check if already assigned
        var existingAssignment = storeAssignmentRepository.findByStoreIdAndBusinessMembershipId(storeId, businessMembershipId);
        if (existingAssignment.isPresent()) {
            StoreAssignment existing = existingAssignment.get();
            if (existing.isActive()) {
                throw new BusinessRuleViolationException(
                    "USER_ALREADY_ASSIGNED_TO_STORE",
                    "User is already actively assigned to this store",
                    HttpStatus.CONFLICT
                );
            } else {
                // Re-activate if inactive, but enforce capacity
                long activeCount = storeAssignmentRepository.countByStoreIdAndStatus(storeId, AssignmentStatus.ACTIVE);
                if (activeCount >= store.getMaxUsers()) {
                    throw new BusinessRuleViolationException(
                        "STORE_USER_LIMIT_REACHED",
                        "Store user limit reached. This store allows up to " + store.getMaxUsers() + " active users.",
                        HttpStatus.CONFLICT
                    );
                }
                existing.setStatus(AssignmentStatus.ACTIVE);
                if (roleOverride != null) existing.setRoleOverride(roleOverride);
                if (isPrimaryStore) existing.setPrimaryStore(true);
                return storeAssignmentRepository.save(existing);
            }
        }

        // 4. Enforce store user capacity
        long currentActiveCount = storeAssignmentRepository.countByStoreIdAndStatus(storeId, AssignmentStatus.ACTIVE);
        if (currentActiveCount >= store.getMaxUsers()) {
            throw new BusinessRuleViolationException(
                "STORE_USER_LIMIT_REACHED",
                "Store user limit reached. This store allows up to " + store.getMaxUsers() + " active users.",
                HttpStatus.CONFLICT
            );
        }

        // 5. Handle primary store exclusivity for this membership if needed
        if (isPrimaryStore) {
            storeAssignmentRepository.findByBusinessMembershipIdAndIsPrimaryStoreTrue(businessMembershipId)
                .ifPresent(primary -> {
                    primary.setPrimaryStore(false);
                    storeAssignmentRepository.save(primary);
                });
        }

        // 6. Create new active assignment
        StoreAssignment assignment = StoreAssignment.create(
            store.getBusinessId(),
            storeId,
            businessMembershipId,
            roleOverride,
            isPrimaryStore
        );

        StoreAssignment saved = storeAssignmentRepository.save(assignment);
        log.info("Assigned user membership [{}] to store [{}] (active users: {}/{})",
            businessMembershipId, storeId, currentActiveCount + 1, store.getMaxUsers());
        return saved;
    }
}
