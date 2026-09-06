package com.inventra.inventra_backend.customer.domain.repository;

import com.inventra.inventra_backend.customer.domain.model.Customer;
import com.inventra.inventra_backend.customer.domain.model.CustomerStatus;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerRepository extends JpaRepository<Customer, UUID> {

    Optional<Customer> findByIdAndBusinessId(UUID id, UUID businessId);

    Optional<Customer> findByBusinessIdAndCustomerCodeIgnoreCase(UUID businessId, String customerCode);

    Optional<Customer> findByBusinessIdAndPhone(UUID businessId, String phone);

    Optional<Customer> findByBusinessIdAndEmailIgnoreCase(UUID businessId, String email);

    boolean existsByBusinessIdAndCustomerCodeIgnoreCase(UUID businessId, String customerCode);

    long countByBusinessId(UUID businessId);

    @Query("""
        SELECT c FROM Customer c
        WHERE c.businessId = :businessId
        AND (:status IS NULL OR c.status = :status)
        ORDER BY c.fullName ASC
    """)
    Page<Customer> findAllByBusinessIdAndStatus(
        @Param("businessId") UUID businessId,
        @Param("status") CustomerStatus status,
        Pageable pageable
    );

    @Query("""
        SELECT c FROM Customer c
        WHERE c.businessId = :businessId
        AND (:status IS NULL OR c.status = :status)
        AND (
            LOWER(c.fullName) LIKE LOWER(CONCAT('%', :query, '%'))
            OR c.phone LIKE CONCAT('%', :query, '%')
            OR LOWER(c.customerCode) LIKE LOWER(CONCAT('%', :query, '%'))
        )
        ORDER BY c.fullName ASC
    """)
    Page<Customer> searchCustomers(
        @Param("businessId") UUID businessId,
        @Param("query") String query,
        @Param("status") CustomerStatus status,
        Pageable pageable
    );

    @Query("""
        SELECT c FROM Customer c
        WHERE c.businessId = :businessId
        AND c.status = 'ACTIVE'
        AND (
            LOWER(c.fullName) LIKE LOWER(CONCAT('%', :query, '%'))
            OR c.phone LIKE CONCAT('%', :query, '%')
            OR LOWER(c.customerCode) LIKE LOWER(CONCAT('%', :query, '%'))
        )
        ORDER BY c.fullName ASC
    """)
    Page<Customer> quickSearchActiveCustomers(
        @Param("businessId") UUID businessId,
        @Param("query") String query,
        Pageable pageable
    );
}
