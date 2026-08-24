package com.inventra.inventra_backend.tenant.domain.repository;

import com.inventra.inventra_backend.tenant.domain.model.BusinessMembership;
import com.inventra.inventra_backend.tenant.domain.model.MembershipStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BusinessMembershipRepository extends JpaRepository<BusinessMembership, UUID> {

    List<BusinessMembership> findByUserId(UUID userId);

    List<BusinessMembership> findByBusinessId(UUID businessId);

    Optional<BusinessMembership> findByBusinessIdAndUserId(UUID businessId, UUID userId);

    List<BusinessMembership> findByBusinessIdAndStatus(UUID businessId, MembershipStatus status);
}
