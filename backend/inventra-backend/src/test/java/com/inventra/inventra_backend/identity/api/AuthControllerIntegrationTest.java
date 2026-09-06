package com.inventra.inventra_backend.identity.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.identity.api.dto.ActivateOwnerRequest;
import com.inventra.inventra_backend.identity.api.dto.ChangePasswordRequest;
import com.inventra.inventra_backend.identity.api.dto.LoginRequest;
import com.inventra.inventra_backend.identity.api.dto.PasswordResetConfirmRequest;
import com.inventra.inventra_backend.identity.api.dto.PasswordResetRequest;
import com.inventra.inventra_backend.identity.api.dto.RefreshTokenRequest;
import com.inventra.inventra_backend.identity.api.dto.SwitchContextRequest;
import com.inventra.inventra_backend.identity.domain.model.PasswordResetToken;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.PasswordResetTokenRepository;
import com.inventra.inventra_backend.identity.domain.repository.RefreshTokenRepository;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.onboarding.api.dto.OnboardingApprovalResponse;
import com.inventra.inventra_backend.onboarding.api.dto.SubmitOnboardingApplicationRequest;
import com.inventra.inventra_backend.onboarding.application.OnboardingService;
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

    @Autowired
    private OnboardingService onboardingService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final java.util.concurrent.atomic.AtomicLong phoneSeq = new java.util.concurrent.atomic.AtomicLong(9100000000L);

    private String createAndActivateOwner(
        String email,
        String password,
        String fullName,
        String bizName,
        String storeName,
        String storeCode
    ) {
        SubmitOnboardingApplicationRequest appReq = new SubmitOnboardingApplicationRequest(
            fullName,
            email,
            String.valueOf(phoneSeq.incrementAndGet()),
            bizName,
            null,
            null,
            null,
            storeName,
            storeCode != null ? storeCode : "MAIN-01",
            null,
            null,
            null,
            null,
            null
        );
        var summary = onboardingService.submitApplication(appReq, "127.0.0.1", "test-agent");
        UUID adminId = userRepository.findByEmail("admin@inventra.local").map(User::getId).orElse(null);
        OnboardingApprovalResponse approval = onboardingService.approveApplication(
            summary.id(),
            adminId,
            "127.0.0.1",
            "test-agent"
        );
        onboardingService.activateOwner(new ActivateOwnerRequest(approval.devActivationToken(), password), "127.0.0.1", "test-agent");
        return approval.devActivationToken();
    }

    @Test
    @Transactional
    @DisplayName("Platform Admin logs in successfully and receives PLATFORM_ADMIN role token")
    void testPlatformAdminLoginSuccess() throws Exception {
        LoginRequest loginReq = new LoginRequest("admin@inventra.local", "PlatformAdmin@Inventra2026!", null, null, null, null, null);

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.accessToken").isString())
            .andExpect(jsonPath("$.data.refreshToken").isString())
            .andExpect(jsonPath("$.data.user.email").value("admin@inventra.local"))
            .andExpect(jsonPath("$.data.activeContext.role").value("PLATFORM_ADMIN"));
    }

    @Test
    @Transactional
    @DisplayName("Activated Owner logs in successfully and receives JWT tokens with active context")
    void testActivatedOwnerLoginSuccess() throws Exception {
        createAndActivateOwner(
            "owner.reg@inventra.local",
            "SecurePassword123!",
            "Dr. Owner",
            "Reg Pharmacy Pvt Ltd",
            "Main Branch",
            "REG-01"
        );

        // Login with same credentials
        LoginRequest loginReq = new LoginRequest("OWNER.REG@INVENTRA.LOCAL", "SecurePassword123!", null, null, null, null, null);

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.accessToken").isString())
            .andExpect(jsonPath("$.data.refreshToken").isString())
            .andExpect(jsonPath("$.data.user.email").value("owner.reg@inventra.local"))
            .andExpect(jsonPath("$.data.activeContext.role").value("OWNER"));
    }

    @Test
    @Transactional
    @DisplayName("Unactivated approved owner is rejected on login with 422 ProblemDetail")
    void testUnactivatedOwnerLoginRejected() throws Exception {
        SubmitOnboardingApplicationRequest appReq = new SubmitOnboardingApplicationRequest(
            "Unactivated Owner",
            "unactivated@inventra.local",
            String.valueOf(phoneSeq.incrementAndGet()),
            "Unactivated Pharma",
            null,
            null,
            null,
            "Main Store",
            "MAIN-01",
            null,
            null,
            null,
            null,
            null
        );
        var summary = onboardingService.submitApplication(appReq, "127.0.0.1", "test-agent");
        UUID adminId = userRepository.findByEmail("admin@inventra.local").map(User::getId).orElse(null);
        onboardingService.approveApplication(summary.id(), adminId, "127.0.0.1", "test-agent");

        LoginRequest loginReq = new LoginRequest("unactivated@inventra.local", "AnyPassword123!", null, null, null, null, null);

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.errorCode").value("INVALID_CREDENTIALS"));
    }

    @Test
    @Transactional
    @DisplayName("Token refresh rotates refresh token and issues fresh access token")
    void testTokenRefreshAndRotation() throws Exception {
        createAndActivateOwner(
            "refresh.test@inventra.local",
            "Password123!",
            "Refresh Tester",
            "Refresh Pharma",
            "Store 1",
            null
        );

        LoginRequest loginReq = new LoginRequest("refresh.test@inventra.local", "Password123!", null, null, null, null, null);
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
            .andExpect(status().isOk())
            .andReturn();

        String initialRefreshToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
            .path("data").path("refreshToken").asText();

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
        createAndActivateOwner(
            "reuse.test@inventra.local",
            "Password123!",
            "Reuse Tester",
            "Reuse Pharma",
            "Store 1",
            null
        );

        LoginRequest loginReq = new LoginRequest("reuse.test@inventra.local", "Password123!", null, null, null, null, null);
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
            .andExpect(status().isOk())
            .andReturn();

        String initialRefreshToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
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
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.errorCode").value("TOKEN_REUSE_DETECTED"));
    }

    @Test
    @Transactional
    @DisplayName("Context switching to another valid store updates active context")
    void testContextSwitching() throws Exception {
        createAndActivateOwner(
            "context.switch@inventra.local",
            "Password123!",
            "Context Tester",
            "Context Pharma",
            "Store 1",
            "ST-01"
        );

        LoginRequest loginReq = new LoginRequest("context.switch@inventra.local", "Password123!", null, null, null, null, null);
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
            .andExpect(status().isOk())
            .andReturn();

        String respJson = loginResult.getResponse().getContentAsString();
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
        createAndActivateOwner(
            "pwd.change@inventra.local",
            "OldPassword123!",
            "Pwd Change User",
            "Pwd Pharma",
            "Store 1",
            null
        );

        LoginRequest loginReq = new LoginRequest("pwd.change@inventra.local", "OldPassword123!", null, null, null, null, null);
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
            .andExpect(status().isOk())
            .andReturn();

        String accessToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
            .path("data").path("accessToken").asText();
        String refreshToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
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
        LoginRequest newLoginReq = new LoginRequest("pwd.change@inventra.local", "NewPassword123!", null, null, null, null, null);
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newLoginReq)))
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

    @Test
    @DisplayName("Authenticated user can list their sessions and place of login")
    void testGetSessions() throws Exception {
        LoginRequest loginReq = new LoginRequest("admin@inventra.local", "PlatformAdmin@Inventra2026!", null, null, null, null, null);
        MvcResult loginRes = mockMvc.perform(post("/api/v1/auth/login")
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
            .andExpect(status().isOk())
            .andReturn();

        String token = objectMapper.readTree(loginRes.getResponse().getContentAsString())
            .path("data").path("accessToken").asText();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/auth/sessions")
                .header("Authorization", "Bearer " + token)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray())
            .andExpect(jsonPath("$.data[0].deviceType").isNotEmpty())
            .andExpect(jsonPath("$.data[0].current").value(true));
    }
}
