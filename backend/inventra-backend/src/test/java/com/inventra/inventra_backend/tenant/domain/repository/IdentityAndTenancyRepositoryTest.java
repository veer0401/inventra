package com.inventra.inventra_backend.tenant.domain.repository;

import com.inventra.inventra_backend.identity.domain.model.Role;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.BusinessMembership;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.model.StoreAssignment;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class IdentityAndTenancyRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private BusinessMembershipRepository businessMembershipRepository;

    @Autowired
    private StoreAssignmentRepository storeAssignmentRepository;

    @Test
    @Transactional
    @DisplayName("Persist and query full identity and tenancy hierarchy")
    void testSaveAndRetrieveFullHierarchy() {
        User user = User.create("pharmacist.john@inventra.local", "hashed_pass_123", "John Doe", "9876543210");
        userRepository.saveAndFlush(user);

        Business business = Business.create("Apex Health Pharma", "Apex Meds", "DL-9999", "27AAAAA1234A1Z1");
        businessRepository.saveAndFlush(business);

        Store store = Store.create(business.getId(), "MAIN-01", "Apex Flagship Store", true);
        storeRepository.saveAndFlush(store);

        BusinessMembership membership = BusinessMembership.create(business.getId(), user.getId(), Role.OWNER);
        businessMembershipRepository.saveAndFlush(membership);

        StoreAssignment assignment = StoreAssignment.create(
            business.getId(),
            store.getId(),
            membership.getId(),
            null,
            true
        );
        storeAssignmentRepository.saveAndFlush(assignment);

        assertThat(userRepository.findByEmail("pharmacist.john@inventra.local")).isPresent();
        assertThat(businessRepository.findById(business.getId())).isPresent();
        assertThat(storeRepository.findByBusinessIdAndStoreCode(business.getId(), "MAIN-01")).isPresent();
        assertThat(storeRepository.findByBusinessIdAndIsHeadquartersTrue(business.getId())).isPresent();
        assertThat(businessMembershipRepository.findByBusinessIdAndUserId(business.getId(), user.getId())).isPresent();
        assertThat(storeAssignmentRepository.findByBusinessMembershipIdAndIsPrimaryStoreTrue(membership.getId())).isPresent();
    }

    @Test
    @Transactional
    @DisplayName("Database enforces unique email constraint (case-insensitive)")
    void testUniqueEmailConstraint() {
        User user1 = User.create("unique.test@inventra.local", "hash1", "User One", null);
        userRepository.saveAndFlush(user1);

        User user2 = User.create("UNIQUE.TEST@inventra.local", "hash2", "User Two", null);
        assertThatThrownBy(() -> userRepository.saveAndFlush(user2))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @Transactional
    @DisplayName("Database enforces unique (business_id, user_id) membership constraint")
    void testUniqueBusinessMembershipConstraint() {
        User user = User.create("member.user@inventra.local", "hash", "Member", null);
        userRepository.saveAndFlush(user);

        Business business = Business.create("Care Pharmacy", null, null, null);
        businessRepository.saveAndFlush(business);

        BusinessMembership m1 = BusinessMembership.create(business.getId(), user.getId(), Role.CASHIER);
        businessMembershipRepository.saveAndFlush(m1);

        BusinessMembership m2 = BusinessMembership.create(business.getId(), user.getId(), Role.MANAGER);
        assertThatThrownBy(() -> businessMembershipRepository.saveAndFlush(m2))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @Transactional
    @DisplayName("Database enforces partial unique index: at most one headquarters store per business")
    void testSingleHeadquartersConstraint() {
        Business business = Business.create("HQ Test Pharmacy", null, null, null);
        businessRepository.saveAndFlush(business);

        Store store1 = Store.create(business.getId(), "HQ-01", "HQ Store", true);
        storeRepository.saveAndFlush(store1);

        Store store2 = Store.create(business.getId(), "BRANCH-02", "Branch 2", true);
        assertThatThrownBy(() -> storeRepository.saveAndFlush(store2))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @Transactional
    @DisplayName("Database enforces partial unique index: at most one primary store per membership")
    void testSinglePrimaryStorePerMembershipConstraint() {
        User user = User.create("primary.store.user@inventra.local", "hash", "Primary User", null);
        userRepository.saveAndFlush(user);

        Business business = Business.create("Primary Store Pharma", null, null, null);
        businessRepository.saveAndFlush(business);

        Store store1 = Store.create(business.getId(), "ST-01", "Store 1", false);
        Store store2 = Store.create(business.getId(), "ST-02", "Store 2", false);
        storeRepository.saveAndFlush(store1);
        storeRepository.saveAndFlush(store2);

        BusinessMembership membership = BusinessMembership.create(business.getId(), user.getId(), Role.CASHIER);
        businessMembershipRepository.saveAndFlush(membership);

        StoreAssignment a1 = StoreAssignment.create(business.getId(), store1.getId(), membership.getId(), null, true);
        storeAssignmentRepository.saveAndFlush(a1);

        StoreAssignment a2 = StoreAssignment.create(business.getId(), store2.getId(), membership.getId(), null, true);
        assertThatThrownBy(() -> storeAssignmentRepository.saveAndFlush(a2))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @Transactional
    @DisplayName("Composite foreign keys prevent cross-business store assignments at database level")
    void testCrossBusinessStoreAssignmentPrevented() {
        // Business A with Store A
        Business businessA = Business.create("Business A Pharma", null, null, null);
        businessRepository.saveAndFlush(businessA);

        Store storeA = Store.create(businessA.getId(), "STORE-A", "Store A", false);
        storeRepository.saveAndFlush(storeA);

        // Business B with User B & Membership B
        Business businessB = Business.create("Business B Pharma", null, null, null);
        businessRepository.saveAndFlush(businessB);

        User userB = User.create("user.b@inventra.local", "hash", "User B", null);
        userRepository.saveAndFlush(userB);

        BusinessMembership membershipB = BusinessMembership.create(businessB.getId(), userB.getId(), Role.CASHIER);
        businessMembershipRepository.saveAndFlush(membershipB);

        // Attempt to create StoreAssignment under Business B pointing to Store A (which belongs to Business A)
        StoreAssignment crossAssignment = StoreAssignment.create(
            businessB.getId(),
            storeA.getId(),
            membershipB.getId(),
            null,
            false
        );

        assertThatThrownBy(() -> storeAssignmentRepository.saveAndFlush(crossAssignment))
            .isInstanceOf(DataIntegrityViolationException.class);
    }
}
