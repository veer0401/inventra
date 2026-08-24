package com.inventra.inventra_backend.identity.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.identity.api.dto.ChangePasswordRequest;
import com.inventra.inventra_backend.identity.api.dto.LoginRequest;
import com.inventra.inventra_backend.identity.api.dto.PasswordResetConfirmRequest;
import com.inventra.inventra_backend.identity.api.dto.PasswordResetRequest;
import com.inventra.inventra_backend.identity.api.dto.RefreshTokenRequest;
import com.inventra.inventra_backend.identity.api.dto.RegisterOwnerRequest;
import com.inventra.inventra_backend.identity.api.dto.SwitchContextRequest;
import com.inventra.inventra_backend.identity.domain.model.PasswordResetToken;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.PasswordResetTokenRepository;
import com.inventra.inventra_backend.identity.domain.repository.RefreshTokenRepository;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.BusinessMembership;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.model.StoreAssignment;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessMembershipRepository;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreAssignmentRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.util.UUID;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private BusinessMembershipRepository membershipRepository;

    @Autowired
    private StoreAssignmentRepository storeAssignmentRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @Transactional
    @DisplayName("Owner registration followed by login produces valid JWT access and refresh tokens")
    void testRegisterOwnerAndLoginSuccess() throws Exception {
        RegisterOwnerRequest registerReq = new RegisterOwnerRequest(
            "owner.reg@inventra.local",
            "SecurePassword123!",
            "Dr. Owner",
            "9876543210",
            "Reg Pharmacy Pvt Ltd",
            "Main Branch",
            "REG-01"
        );

        mockMvc.perform(post("/api/v1/auth/register-owner")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.accessToken").isString())
            .andExpect(jsonPath("$.data.refreshToken").isString())
            .andExpect(jsonPath("$.data.user.email").value("owner.reg@inventra.local"))
            .andExpect(jsonPath("$.data.activeContext.role").value("OWNER"));

        // Login with same credentials
        LoginRequest loginReq = new LoginRequest("OWNER.REG@INVENTRA.LOCAL", "SecurePassword123!", null, null, null, null, null);

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.accessToken").isString())
            .andExpect(jsonPath("$.data.refreshToken").isString());
    }

    @Test
    @Transactional
    @DisplayName("Token refresh rotates refresh token and issues fresh access token")
    void testTokenRefreshAndRotation() throws Exception {
        RegisterOwnerRequest registerReq = new RegisterOwnerRequest(
            "refresh.test@inventra.local",
            "Password123!",
            "Refresh Tester",
            null,
            "Refresh Pharma",
            "Store 1",
            null
        );

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register-owner")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerReq)))
            .andExpect(status().isCreated())
            .andReturn();

        String respJson = result.getResponse().getContentAsString();
        String initialRefreshToken = objectMapper.readTree(respJson).path("data").path("refreshToken").asText();

        // Perform token refresh
        RefreshTokenRequest refreshReq = new RefreshTokenRequest(initialRefreshToken, null);

        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(refreshReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.accessToken").isString())
            .andExpect(jsonPath("$.data.refreshToken").isString())
            .andReturn();

        String newRefreshToken = objectMapper.readTree(refreshResult.getResponse().getContentAsString())
            .path("data").path("refreshToken").asText();
        assertThat(newRefreshToken).isNotEqualTo(initialRefreshToken);
    }

    @Test
    @Transactional
    @DisplayName("Reusing an already-used refresh token triggers reuse detection and revokes family")
    void testTokenFamilyReuseDetectionRevokesFamily() throws Exception {
        RegisterOwnerRequest registerReq = new RegisterOwnerRequest(
            "reuse.test@inventra.local",
            "Password123!",
            "Reuse Tester",
            null,
            "Reuse Pharma",
            "Store 1",
            null
        );

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register-owner")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerReq)))
            .andExpect(status().isCreated())
            .andReturn();

        String initialRefreshToken = objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("refreshToken").asText();

        // First refresh succeeds and marks initialRefreshToken as used
        RefreshTokenRequest refreshReq = new RefreshTokenRequest(initialRefreshToken, null);
        mockMvc.perform(post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(refreshReq)))
            .andExpect(status().isOk());

        // Replaying initialRefreshToken again triggers reuse detection!
        mockMvc.perform(post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(refreshReq)))
            .andExpect(status().isUnprocessableEntity()) // ProblemDetail 422
            .andExpect(jsonPath("$.errorCode").value("TOKEN_REUSE_DETECTED"));
    }

    @Test
    @Transactional
    @DisplayName("Context switching to another valid store updates active context")
    void testContextSwitching() throws Exception {
        RegisterOwnerRequest registerReq = new RegisterOwnerRequest(
            "context.switch@inventra.local",
            "Password123!",
            "Context Tester",
            null,
            "Context Pharma",
            "Store 1",
            "ST-01"
        );

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register-owner")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerReq)))
            .andExpect(status().isCreated())
            .andReturn();

        String respJson = result.getResponse().getContentAsString();
        String accessToken = objectMapper.readTree(respJson).path("data").path("accessToken").asText();
        String businessIdStr = objectMapper.readTree(respJson).path("data").path("activeContext").path("businessId").asText();

        UUID businessId = UUID.fromString(businessIdStr);

        // Create second store
        Store store2 = Store.create(businessId, "ST-02", "Store 2", false);
        storeRepository.saveAndFlush(store2);

        SwitchContextRequest switchReq = new SwitchContextRequest(businessId, store2.getId());

        mockMvc.perform(post("/api/v1/auth/switch-context")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(switchReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.activeContext.storeId").value(store2.getId().toString()))
            .andExpect(jsonPath("$.data.activeContext.storeCode").value("ST-02"));
    }

    @Test
    @Transactional
    @DisplayName("Password change invalidates prior refresh tokens")
    void testPasswordChangeAndRevokeSessions() throws Exception {
        RegisterOwnerRequest registerReq = new RegisterOwnerRequest(
            "pwd.change@inventra.local",
            "OldPassword123!",
            "Pwd Change User",
            null,
            "Pwd Pharma",
            "Store 1",
            null
        );

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register-owner")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerReq)))
            .andExpect(status().isCreated())
            .andReturn();

        String accessToken = objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("accessToken").asText();
        String refreshToken = objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("refreshToken").asText();

        ChangePasswordRequest changeReq = new ChangePasswordRequest("OldPassword123!", "NewPassword123!");

        mockMvc.perform(post("/api/v1/auth/password/change")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(changeReq)))
            .andExpect(status().isOk());

        // Old refresh token must now be revoked
        RefreshTokenRequest refreshReq = new RefreshTokenRequest(refreshToken, null);
        mockMvc.perform(post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(refreshReq)))
            .andExpect(status().isUnprocessableEntity());

        // Login with new password succeeds
        LoginRequest loginReq = new LoginRequest("pwd.change@inventra.local", "NewPassword123!", null, null, null, null, null);
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Unauthenticated request to password change returns 401 ProblemDetail")
    void testUnauthenticatedPasswordChangeReturns401() throws Exception {
        ChangePasswordRequest changeReq = new ChangePasswordRequest("OldPassword123!", "NewPassword123!");

        mockMvc.perform(post("/api/v1/auth/password/change")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(changeReq)))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"))
            .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("Unauthenticated request to logout-all returns 401 ProblemDetail")
    void testUnauthenticatedLogoutAllReturns401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout-all"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"))
            .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("Unauthenticated request to switch-context returns 401 ProblemDetail")
    void testUnauthenticatedSwitchContextReturns401() throws Exception {
        SwitchContextRequest switchReq = new SwitchContextRequest(UUID.randomUUID(), UUID.randomUUID());

        mockMvc.perform(post("/api/v1/auth/switch-context")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(switchReq)))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"))
            .andExpect(jsonPath("$.status").value(401));
    }
}
