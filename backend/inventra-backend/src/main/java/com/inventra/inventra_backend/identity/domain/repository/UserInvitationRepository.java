package com.inventra.inventra_backend.identity.domain.repository;

import com.inventra.inventra_backend.identity.domain.model.InvitationStatus;
import com.inventra.inventra_backend.identity.domain.model.UserInvitation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserInvitationRepository extends JpaRepository<UserInvitation, UUID> {

    Optional<UserInvitation> findByTokenHash(String tokenHash);

    List<UserInvitation> findAllByBusinessIdOrderByCreatedAtDesc(UUID businessId);

    List<UserInvitation> findAllByBusinessIdAndStatus(UUID businessId, InvitationStatus status);

    Optional<UserInvitation> findByBusinessIdAndEmailAndStatus(UUID businessId, String email, InvitationStatus status);
}
