package com.inventra.inventra_backend.sync.domain.repository;

import com.inventra.inventra_backend.sync.domain.model.SyncChangeFeed;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SyncChangeFeedRepository extends JpaRepository<SyncChangeFeed, Long> {

    @Query("SELECT c FROM SyncChangeFeed c WHERE c.businessId = :businessId AND (c.storeId IS NULL OR c.storeId = :storeId) AND c.changeSeq > :cursor ORDER BY c.changeSeq ASC")
    List<SyncChangeFeed> findChangesForDevice(
        @Param("businessId") UUID businessId,
        @Param("storeId") UUID storeId,
        @Param("cursor") Long cursor,
        Pageable pageable
    );
}
