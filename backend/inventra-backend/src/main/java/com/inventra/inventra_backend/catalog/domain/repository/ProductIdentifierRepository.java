package com.inventra.inventra_backend.catalog.domain.repository;

import com.inventra.inventra_backend.catalog.domain.model.IdentifierType;
import com.inventra.inventra_backend.catalog.domain.model.ProductIdentifier;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductIdentifierRepository extends JpaRepository<ProductIdentifier, UUID> {

    List<ProductIdentifier> findByBusinessIdAndProductId(UUID businessId, UUID productId);

    Optional<ProductIdentifier> findByBusinessIdAndIdentifierTypeAndIdentifierValue(
        UUID businessId,
        IdentifierType identifierType,
        String identifierValue
    );

    Optional<ProductIdentifier> findByBusinessIdAndProductIdAndIdentifierTypeAndIsPrimaryTrue(
        UUID businessId,
        UUID productId,
        IdentifierType identifierType
    );

    boolean existsByBusinessIdAndIdentifierTypeAndIdentifierValue(
        UUID businessId,
        IdentifierType identifierType,
        String identifierValue
    );

    Optional<ProductIdentifier> findByBusinessIdAndIdentifierValue(UUID businessId, String identifierValue);
}
