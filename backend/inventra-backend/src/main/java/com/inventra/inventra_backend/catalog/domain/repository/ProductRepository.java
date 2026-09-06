package com.inventra.inventra_backend.catalog.domain.repository;

import com.inventra.inventra_backend.catalog.domain.model.Product;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {

    Optional<Product> findByIdAndBusinessId(UUID id, UUID businessId);

    Page<Product> findByBusinessId(UUID businessId, Pageable pageable);

    Page<Product> findByBusinessIdAndCategoryId(UUID businessId, UUID categoryId, Pageable pageable);

    Optional<Product> findByBusinessIdAndNameIgnoreCase(UUID businessId, String name);

    Optional<Product> findByBusinessIdAndGlobalProductId(UUID businessId, UUID globalProductId);

    @Query("SELECT p.globalProductId FROM Product p WHERE p.businessId = :businessId AND p.globalProductId IS NOT NULL")
    java.util.List<UUID> findImportedGlobalProductIds(@Param("businessId") UUID businessId);

    @Query("""
        SELECT DISTINCT p FROM Product p
        LEFT JOIN ProductIdentifier pi ON pi.productId = p.id AND pi.businessId = p.businessId
        WHERE p.businessId = :businessId
          AND (
            LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(p.genericName) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(p.brandName) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(pi.identifierValue) = LOWER(:query)
          )
    """)
    Page<Product> searchProducts(
        @Param("businessId") UUID businessId,
        @Param("query") String query,
        Pageable pageable
    );
}
