package com.inventra.inventra_backend.catalog.domain.repository;

import com.inventra.inventra_backend.catalog.domain.model.GlobalMedicineSuggestion;
import com.inventra.inventra_backend.catalog.domain.model.SuggestionStatus;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface GlobalMedicineSuggestionRepository extends JpaRepository<GlobalMedicineSuggestion, UUID> {

    Page<GlobalMedicineSuggestion> findByStatus(SuggestionStatus status, Pageable pageable);

    long countByStatus(SuggestionStatus status);

    @Query("""
        SELECT s FROM GlobalMedicineSuggestion s
        WHERE (:status IS NULL OR s.status = :status)
          AND (
            :query IS NULL OR :query = ''
            OR LOWER(s.name) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(s.genericName) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(s.brandName) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(s.manufacturer) LIKE LOWER(CONCAT('%', :query, '%'))
          )
    """)
    Page<GlobalMedicineSuggestion> search(
        @Param("query") String query,
        @Param("status") SuggestionStatus status,
        Pageable pageable
    );
}
