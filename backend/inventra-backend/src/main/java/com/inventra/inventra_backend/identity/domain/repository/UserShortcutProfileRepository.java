package com.inventra.inventra_backend.identity.domain.repository;

import com.inventra.inventra_backend.identity.domain.model.UserShortcutProfile;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserShortcutProfileRepository extends JpaRepository<UserShortcutProfile, UUID> {

    List<UserShortcutProfile> findByUserIdOrderByCreatedAtAsc(UUID userId);

    Optional<UserShortcutProfile> findByIdAndUserId(UUID id, UUID userId);

    Optional<UserShortcutProfile> findByUserIdAndIsActiveTrue(UUID userId);

    long countByUserId(UUID userId);

    boolean existsByUserIdAndNameIgnoreCase(UUID userId, String name);

    boolean existsByUserIdAndNameIgnoreCaseAndIdNot(UUID userId, String name, UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM UserShortcutProfile p WHERE p.userId = :userId")
    List<UserShortcutProfile> findAllByUserIdWithLock(@Param("userId") UUID userId);
}
