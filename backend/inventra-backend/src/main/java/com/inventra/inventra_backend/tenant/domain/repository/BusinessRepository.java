package com.inventra.inventra_backend.tenant.domain.repository;

import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.BusinessStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BusinessRepository extends JpaRepository<Business, UUID> {

    List<Business> findByStatus(BusinessStatus status);

    boolean existsByDrugLicenseNumberIgnoreCase(String drugLicenseNumber);

    Page<Business> findByLegalNameContainingIgnoreCaseOrGstinContainingIgnoreCase(
        String legalName,
        String gstin,
        Pageable pageable
    );
}
