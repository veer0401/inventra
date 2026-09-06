package com.inventra.inventra_backend.catalog.domain.repository;

import com.inventra.inventra_backend.catalog.domain.model.Category;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CategoryRepository extends JpaRepository<Category, UUID> {

    Optional<Category> findByIdAndBusinessId(UUID id, UUID businessId);

    List<Category> findByBusinessId(UUID businessId);

    List<Category> findByBusinessIdAndParentIdIsNull(UUID businessId);

    List<Category> findByBusinessIdAndParentId(UUID businessId, UUID parentId);

    Optional<Category> findByBusinessIdAndNameIgnoreCase(UUID businessId, String name);

    boolean existsByBusinessIdAndCode(UUID businessId, String code);

    boolean existsByBusinessIdAndParentIdAndNameIgnoreCase(UUID businessId, UUID parentId, String name);
}
