package com.inventra.inventra_backend.identity.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.common.security.JwtTokenProvider;
import com.inventra.inventra_backend.identity.api.dto.ActivateInvitedUserRequest;
import com.inventra.inventra_backend.identity.api.dto.InviteUserRequest;
import com.inventra.inventra_backend.identity.api.dto.LoginRequest;
import com.inventra.inventra_backend.identity.domain.model.Role;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.BusinessMembership;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessMembershipRepository;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserInvitationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private BusinessMembershipRepository membershipRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private User ownerUser;
    private Business business;
    private Store store;
    private String ownerToken;

    @BeforeEach
    void setUp() {
        ownerUser = userRepository.save(User.create(
            "owner." + UUID.randomUUID().toString().substring(0, 8) + "@example.com",
            "$2a$10$hashedpassword1234567890",
            "Owner Test",
            "9876543210"
        ));

        business = businessRepository.save(new Business(
            UUID.randomUUID(),
            "LifeCare Pharmacy Private Limited",
            "LifeCare Medicos",
            "DL-TEST-9999",
            "29ABCDE1234F1Z5"
        ));

        store = storeRepository.save(new Store(
            UUID.randomUUID(),
            business.getId(),
            "MAIN-01",
            "LifeCare Indiranagar Branch",
            true
        ));

        BusinessMembership ownerMembership = membershipRepository.save(
            BusinessMembership.create(business.getId(), ownerUser.getId(), Role.OWNER)
        );

        ownerToken = jwtTokenProvider.generateAccessToken(
            ownerUser.getId(),
            ownerUser.getEmail(),
            business.getId(),
            store.getId(),
            null,
            "OWNER"
        );
    }

    @Test
    @DisplayName("Complete Staff Invitation, Token Verification, Profile Activation, and Login Flow")
    void testCompleteInvitationAndActivationFlow() throws Exception {
        String staffEmail = "pharmacist." + UUID.randomUUID().toString().substring(0, 8) + "@example.com";

        // 1. Owner invites staff member with role PHARMACIST and branch store
        InviteUserRequest inviteReq = new InviteUserRequest(staffEmail, "PHARMACIST", store.getId());

        MvcResult inviteResult = mockMvc.perform(post("/api/v1/users/invite")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(inviteReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.email").value(staffEmail))
            .andExpect(jsonPath("$.data.role").value("PHARMACIST"))
            .andExpect(jsonPath("$.data.activationToken").isNotEmpty())
            .andReturn();

        String json = inviteResult.getResponse().getContentAsString();
        String activationToken = objectMapper.readTree(json).path("data").path("activationToken").asText();
        assertThat(activationToken).isNotEmpty();

        // 2. Verify invitation token publicly
        mockMvc.perform(get("/api/v1/auth/invite/verify")
                .param("token", activationToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.valid").value(true))
            .andExpect(jsonPath("$.data.email").value(staffEmail))
            .andExpect(jsonPath("$.data.role").value("PHARMACIST"))
            .andExpect(jsonPath("$.data.businessName").value("LifeCare Pharmacy Private Limited"))
            .andExpect(jsonPath("$.data.storeName").value("LifeCare Indiranagar Branch"));

        // 3. Complete profile and activate account with strictly 10-digit phone
        ActivateInvitedUserRequest activateReq = new ActivateInvitedUserRequest(
            activationToken,
            "Pharmacist Rajesh Sharma",
            "9876543211",
            "Pharmacist@Secret123"
        );

        mockMvc.perform(post("/api/v1/auth/invite/activate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(activateReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.message").exists());

        // 4. Test newly activated staff member can log in
        LoginRequest loginReq = new LoginRequest(staffEmail, "Pharmacist@Secret123", null, null, null, null, null);

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.data.user.email").value(staffEmail))
            .andExpect(jsonPath("$.data.user.fullName").value("Pharmacist Rajesh Sharma"))
            .andExpect(jsonPath("$.data.user.phoneNumber").value("9876543211"));

        // 5. Verify staff appears in business staff list
        mockMvc.perform(get("/api/v1/users")
                .header("Authorization", "Bearer " + ownerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray())
            .andExpect(jsonPath("$.data[?(@.email == '" + staffEmail + "')].role").value("PHARMACIST"))
            .andExpect(jsonPath("$.data[?(@.email == '" + staffEmail + "')].fullName").value("Pharmacist Rajesh Sharma"));
    }
}
