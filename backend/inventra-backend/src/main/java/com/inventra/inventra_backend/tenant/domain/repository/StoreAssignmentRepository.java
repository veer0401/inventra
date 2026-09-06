package com.inventra.inventra_backend.tenant.domain.repository;

import com.inventra.inventra_backend.tenant.domain.model.AssignmentStatus;
import com.inventra.inventra_backend.tenant.domain.model.StoreAssignment;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StoreAssignmentRepository extends JpaRepository<StoreAssignment, UUID> {

    List<StoreAssignment> findByBusinessMembershipId(UUID businessMembershipId);

    List<StoreAssignment> findByStoreId(UUID storeId);

    Optional<StoreAssignment> findByStoreIdAndBusinessMembershipId(UUID storeId, UUID businessMembershipId);

    Optional<StoreAssignment> findByBusinessMembershipIdAndIsPrimaryStoreTrue(UUID businessMembershipId);

    List<StoreAssignment> findByBusinessIdAndStatus(UUID businessId, AssignmentStatus status);

    long countByStoreIdAndStatus(UUID storeId, AssignmentStatus status);

    long countByStoreId(UUID storeId);
}


