package com.inventra.inventra_backend.tenant.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.common.security.JwtTokenProvider;
import com.inventra.inventra_backend.identity.domain.model.Role;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.tenant.api.dto.AssignStoreUserRequest;
import com.inventra.inventra_backend.tenant.api.dto.UpdateStoreCapacityRequest;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.BusinessMembership;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessMembershipRepository;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreAssignmentRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class StoreCapacityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BusinessMembershipRepository membershipRepository;

    @Autowired
    private StoreAssignmentRepository storeAssignmentRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private Business business;
    private Store store;
    private User ownerUser;
    private User cashierUser;
    private String ownerToken;
    private String cashierToken;
    private List<BusinessMembership> memberships = new ArrayList<>();

    @BeforeEach
    void setUp() {
        business = businessRepository.save(Business.create(
            "Apollo Pharmacy " + UUID.randomUUID().toString().substring(0, 8),
            "Apollo",
            "DL-" + UUID.randomUUID().toString().substring(0, 6),
            "GSTIN" + UUID.randomUUID().toString().substring(0, 8)
        ));

        store = storeRepository.save(Store.create(
            business.getId(),
            "STR-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase(),
            "Koramangala Branch",
            false
        ));

        ownerUser = userRepository.save(User.create(
            "owner." + UUID.randomUUID().toString().substring(0, 8) + "@apollo.local",
            "$2a$10$dummyownerhash",
            "Owner User",
            null
        ));

        cashierUser = userRepository.save(User.create(
            "cashier." + UUID.randomUUID().toString().substring(0, 8) + "@apollo.local",
            "$2a$10$dummycashierhash",
            "Cashier User",
            null
        ));

        var ownerMembership = membershipRepository.save(BusinessMembership.create(
            business.getId(),
            ownerUser.getId(),
            Role.OWNER
        ));

        var cashierMembership = membershipRepository.save(BusinessMembership.create(
            business.getId(),
            cashierUser.getId(),
            Role.CASHIER
        ));

        ownerToken = jwtTokenProvider.generateAccessToken(
            ownerUser.getId(),
            ownerUser.getEmail(),
            business.getId(),
            store.getId(),
            null,
            "OWNER"
        );

        cashierToken = jwtTokenProvider.generateAccessToken(
            cashierUser.getId(),
            cashierUser.getEmail(),
            business.getId(),
            store.getId(),
            null,
            "CASHIER"
        );


        memberships.clear();
        memberships.add(ownerMembership);
        memberships.add(cashierMembership);

        for (int i = 3; i <= 8; i++) {
            User u = userRepository.save(User.create(
                "user" + i + "." + UUID.randomUUID().toString().substring(0, 8) + "@apollo.local",
                "$2a$10$dummyhash",
                "Operator " + i,
                null
            ));
            var m = membershipRepository.save(BusinessMembership.create(
                business.getId(),
                u.getId(),
                Role.INVENTORY_OPERATOR
            ));
            memberships.add(m);
        }
    }

    @Test
    @DisplayName("Store defaults to maxUsers = 5 and enforces capacity on 6th assignment")
    void testStoreCapacityEnforcement() throws Exception {
        // 1. Check default capacity
        mockMvc.perform(get("/api/v1/stores/" + store.getId() + "/capacity")
                .header("Authorization", "Bearer " + ownerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.maxUsers").value(5))
            .andExpect(jsonPath("$.data.currentActiveUsers").value(0))
            .andExpect(jsonPath("$.data.atCapacity").value(false));

        // 2. Assign 5 users -> All succeed
        for (int i = 0; i < 5; i++) {
            var req = new AssignStoreUserRequest(memberships.get(i).getId(), null, i == 0);
            mockMvc.perform(post("/api/v1/stores/" + store.getId() + "/assignments")
                    .header("Authorization", "Bearer " + ownerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());
        }

        // 3. Verify at capacity: 5/5
        mockMvc.perform(get("/api/v1/stores/" + store.getId() + "/capacity")
                .header("Authorization", "Bearer " + ownerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.maxUsers").value(5))
            .andExpect(jsonPath("$.data.currentActiveUsers").value(5))
            .andExpect(jsonPath("$.data.atCapacity").value(true));

        // 4. Attempt 6th assignment -> Must fail with 409 Conflict (STORE_USER_LIMIT_REACHED)
        var req6 = new AssignStoreUserRequest(memberships.get(5).getId(), null, false);
        mockMvc.perform(post("/api/v1/stores/" + store.getId() + "/assignments")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req6)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.errorCode").value("STORE_USER_LIMIT_REACHED"));

        // 5. Update capacity: 5 -> 10
        var updateCapacityReq = new UpdateStoreCapacityRequest(10);
        mockMvc.perform(patch("/api/v1/stores/" + store.getId() + "/capacity")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateCapacityReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.maxUsers").value(10))
            .andExpect(jsonPath("$.data.atCapacity").value(false));

        // 6. Now 6th assignment succeeds
        mockMvc.perform(post("/api/v1/stores/" + store.getId() + "/assignments")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req6)))
            .andExpect(status().isCreated());

        // 7. Attempt to reduce capacity below current usage (current = 6, requested = 5) -> Must fail with 409 Conflict
        var reduceReq = new UpdateStoreCapacityRequest(5);
        mockMvc.perform(patch("/api/v1/stores/" + store.getId() + "/capacity")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reduceReq)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.errorCode").value("STORE_USER_LIMIT_BELOW_CURRENT_USAGE"));
    }

    @Test
    @DisplayName("Unauthorized role (CASHIER) cannot update store capacity -> 403 Forbidden")
    void testUnauthorizedCapacityUpdate() throws Exception {
        var updateCapacityReq = new UpdateStoreCapacityRequest(10);
        mockMvc.perform(patch("/api/v1/stores/" + store.getId() + "/capacity")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateCapacityReq)))
            .andExpect(status().isForbidden());
    }
}
