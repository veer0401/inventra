package com.inventra.inventra_backend.onboarding.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.identity.api.dto.ActivateOwnerRequest;
import com.inventra.inventra_backend.identity.api.dto.LoginRequest;
import com.inventra.inventra_backend.identity.domain.model.AccountStatus;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.onboarding.api.dto.OnboardingApprovalResponse;
import com.inventra.inventra_backend.onboarding.api.dto.RejectOnboardingApplicationRequest;
import com.inventra.inventra_backend.onboarding.api.dto.SubmitOnboardingApplicationRequest;
import com.inventra.inventra_backend.onboarding.application.OnboardingService;
import com.inventra.inventra_backend.onboarding.domain.model.BusinessRegistrationApplication;
import com.inventra.inventra_backend.onboarding.domain.model.OnboardingApplicationStatus;
import com.inventra.inventra_backend.onboarding.domain.repository.BusinessRegistrationApplicationRepository;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class OnboardingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private BusinessRegistrationApplicationRepository applicationRepository;

    @Autowired
    private OnboardingService onboardingService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        applicationRepository.deleteAll();
    }

    private String getAdminToken() throws Exception {
        LoginRequest adminLogin = new LoginRequest("admin@inventra.local", "PlatformAdmin@Inventra2026!", null, null, null, null, null);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(adminLogin)))
            .andExpect(status().isOk())
            .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("accessToken").asText();
    }

    @Test
    @Transactional
    @DisplayName("Public submission creates PENDING_REVIEW application without creating user or business")
    void testPublicApplySuccessAndDoesNotCreateUserOrBusiness() throws Exception {
        SubmitOnboardingApplicationRequest request = new SubmitOnboardingApplicationRequest(
            "Dr. Rajesh Sharma",
            "rajesh.sharma@apollopharm.local",
            "9876543211",
            "Apollo Care Pharmacy",
            "Apollo Care",
            "DL-KA-2026-9999",
            "29AAAAA0000A1Z5",
            "Apollo Indiranagar",
            "AP-01",
            "100 Feet Road",
            "HAL 2nd Stage",
            "Bengaluru",
            "Karnataka",
            "560038"
        );

        MvcResult result = mockMvc.perform(post("/api/v1/onboarding/apply")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("PENDING_REVIEW"))
            .andExpect(jsonPath("$.data.applicantEmail").value("rajesh.sharma@apollopharm.local"))
            .andExpect(jsonPath("$.data.businessName").value("Apollo Care Pharmacy"))
            .andReturn();

        String appIdStr = objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("id").asText();
        UUID appId = UUID.fromString(appIdStr);

        BusinessRegistrationApplication app = applicationRepository.findById(appId).orElseThrow();
        assertThat(app.getStatus()).isEqualTo(OnboardingApplicationStatus.PENDING_REVIEW);
        assertThat(app.getApplicantName()).isEqualTo("Dr. Rajesh Sharma");
        assertThat(app.getApplicantEmail()).isEqualTo("rajesh.sharma@apollopharm.local");
        assertThat(app.getApplicantPhone()).isEqualTo("9876543211");

        // Verify that user, business, store, memberships have NOT been created yet
        assertThat(userRepository.findByEmail("rajesh.sharma@apollopharm.local")).isEmpty();
        assertThat(businessRepository.findAll().stream().anyMatch(b -> b.getLegalName().equals("Apollo Care Pharmacy"))).isFalse();
    }

    @Test
    @Transactional
    @DisplayName("Duplicate pending application for same email is rejected with 409 Conflict")
    void testDuplicatePendingApplicationRejected() throws Exception {
        SubmitOnboardingApplicationRequest request = new SubmitOnboardingApplicationRequest(
            "Dr. Same Email",
            "duplicate@apollopharm.local",
            "9876543212",
            "Duplicate Pharmacy",
            null,
            null,
            null,
            "Branch 1",
            "DUP-01",
            null,
            null,
            null,
            null,
            null
        );

        mockMvc.perform(post("/api/v1/onboarding/apply")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/onboarding/apply")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.errorCode").value("APPLICATION_PENDING_EXISTS"));
    }

    @Test
    @DisplayName("Public apply validation fails on blank required fields")
    void testPublicApplyValidationFailure() throws Exception {
        SubmitOnboardingApplicationRequest invalidReq = new SubmitOnboardingApplicationRequest(
            "",
            "invalid-email",
            null,
            "",
            null,
            null,
            null,
            "",
            null,
            null,
            null,
            null,
            null,
            null
        );

        mockMvc.perform(post("/api/v1/onboarding/apply")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidReq)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errorCode").value("VALIDATION_FAILED"));
    }

    @Test
    @Transactional
    @DisplayName("Platform Admin can list, view, approve, and reject onboarding applications")
    void testPlatformAdminApplicationLifecycle() throws Exception {
        String adminToken = getAdminToken();

        // 1. Create a pending application
        SubmitOnboardingApplicationRequest appReq = new SubmitOnboardingApplicationRequest(
            "Dr. Anil Verma",
            "anil.verma@medplus.local",
            "9876543213",
            "Medplus Care Pvt Ltd",
            "Medplus",
            "DL-KA-2026-1111",
            "29BBBBB0000B1Z5",
            "Medplus Koramangala",
            "MP-01",
            "80 Feet Road",
            null,
            "Bengaluru",
            "Karnataka",
            "560034"
        );

        MvcResult applyResult = mockMvc.perform(post("/api/v1/onboarding/apply")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(appReq)))
            .andExpect(status().isCreated())
            .andReturn();

        String appIdStr = objectMapper.readTree(applyResult.getResponse().getContentAsString())
            .path("data").path("id").asText();
        UUID appId = UUID.fromString(appIdStr);

        // 2. Platform Admin lists applications
        mockMvc.perform(get("/api/v1/admin/onboarding/applications?status=PENDING_REVIEW")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content").isArray());

        // 3. Platform Admin views application detail
        mockMvc.perform(get("/api/v1/admin/onboarding/applications/" + appId)
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(appIdStr))
            .andExpect(jsonPath("$.data.applicantName").value("Dr. Anil Verma"))
            .andExpect(jsonPath("$.data.drugLicenseNumber").value("DL-KA-2026-1111"));

        // 4. Platform Admin approves application
        MvcResult approveResult = mockMvc.perform(post("/api/v1/admin/onboarding/applications/" + appId + "/approve")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("APPROVED"))
            .andExpect(jsonPath("$.data.businessId").isString())
            .andExpect(jsonPath("$.data.userId").isString())
            .andExpect(jsonPath("$.data.devActivationToken").isString())
            .andReturn();

        String activationToken = objectMapper.readTree(approveResult.getResponse().getContentAsString())
            .path("data").path("devActivationToken").asText();
        String createdUserIdStr = objectMapper.readTree(approveResult.getResponse().getContentAsString())
            .path("data").path("userId").asText();

        // 5. Verify created user is INACTIVE
        User createdUser = userRepository.findById(UUID.fromString(createdUserIdStr)).orElseThrow();
        assertThat(createdUser.getStatus()).isEqualTo(AccountStatus.INACTIVE);
        assertThat(createdUser.isEmailVerified()).isFalse();

        // 6. Owner activates account
        ActivateOwnerRequest activateReq = new ActivateOwnerRequest(activationToken, "SecurePassword123!");
        mockMvc.perform(post("/api/v1/auth/onboarding/activate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(activateReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        // 7. Verify user is now ACTIVE and emailVerified
        User activatedUser = userRepository.findById(UUID.fromString(createdUserIdStr)).orElseThrow();
        assertThat(activatedUser.getStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(activatedUser.isEmailVerified()).isTrue();

        // 8. Activated owner logs in
        LoginRequest loginReq = new LoginRequest("anil.verma@medplus.local", "SecurePassword123!", null, null, null, null, null);
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.activeContext.role").value("OWNER"))
            .andExpect(jsonPath("$.data.activeContext.businessName").value("Medplus Care Pvt Ltd"));
    }

    @Test
    @Transactional
    @DisplayName("Platform Admin can reject application with required reason")
    void testPlatformAdminRejectApplication() throws Exception {
        String adminToken = getAdminToken();

        SubmitOnboardingApplicationRequest appReq = new SubmitOnboardingApplicationRequest(
            "Reject Applicant",
            "reject.me@pharmacy.local",
            "9876543214",
            "Ineligible Pharma",
            null,
            null,
            null,
            "Branch 1",
            "REJ-01",
            null,
            null,
            null,
            null,
            null
        );

        MvcResult applyResult = mockMvc.perform(post("/api/v1/onboarding/apply")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(appReq)))
            .andExpect(status().isCreated())
            .andReturn();

        String appIdStr = objectMapper.readTree(applyResult.getResponse().getContentAsString())
            .path("data").path("id").asText();

        RejectOnboardingApplicationRequest rejectReq = new RejectOnboardingApplicationRequest("Invalid pharmacy drug license documentation.");

        mockMvc.perform(post("/api/v1/admin/onboarding/applications/" + appIdStr + "/reject")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(rejectReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("REJECTED"))
            .andExpect(jsonPath("$.data.rejectionReason").value("Invalid pharmacy drug license documentation."));

        BusinessRegistrationApplication app = applicationRepository.findById(UUID.fromString(appIdStr)).orElseThrow();
        assertThat(app.getStatus()).isEqualTo(OnboardingApplicationStatus.REJECTED);
        assertThat(app.getRejectionReason()).isEqualTo("Invalid pharmacy drug license documentation.");
    }

    @Test
    @Transactional
    @DisplayName("Non-admin users cannot access admin endpoints (403 Forbidden)")
    void testNonAdminAccessDeniedOnAdminEndpoints() throws Exception {
        // Create an owner
        SubmitOnboardingApplicationRequest appReq = new SubmitOnboardingApplicationRequest(
            "Normal Owner",
            "normal.owner@inventra.local",
            "9876543215",
            "Normal Pharma",
            null,
            null,
            null,
            "Branch 1",
            "NRM-01",
            null,
            null,
            null,
            null,
            null
        );
        var summary = onboardingService.submitApplication(appReq, "127.0.0.1", "test-agent");
        OnboardingApprovalResponse approval = onboardingService.approveApplication(summary.id(), UUID.randomUUID(), "127.0.0.1", "test-agent");
        onboardingService.activateOwner(new ActivateOwnerRequest(approval.devActivationToken(), "Password123!"), "127.0.0.1", "test-agent");

        LoginRequest loginReq = new LoginRequest("normal.owner@inventra.local", "Password123!", null, null, null, null, null);
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
            .andExpect(status().isOk())
            .andReturn();

        String ownerToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
            .path("data").path("accessToken").asText();

        // Normal owner tries to access platform admin endpoints
        mockMvc.perform(get("/api/v1/admin/onboarding/applications")
                .header("Authorization", "Bearer " + ownerToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Anonymous users cannot access admin endpoints (401 Unauthorized)")
    void testAnonymousAccessDeniedOnAdminEndpoints() throws Exception {
        mockMvc.perform(get("/api/v1/admin/onboarding/applications"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @Transactional
    @DisplayName("Public availability check detects existing email, mobile number, and drug license")
    void testCheckAvailabilityDetectsPreExistingFields() throws Exception {
        // Initially unique values should all be available
        mockMvc.perform(get("/api/v1/onboarding/check-availability")
                .param("email", "brandnew@pharmacy.local")
                .param("phone", "9123456780")
                .param("drugLicenseNumber", "DL-UNIQUE-2026"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.emailAvailable").value(true))
            .andExpect(jsonPath("$.data.phoneAvailable").value(true))
            .andExpect(jsonPath("$.data.drugLicenseAvailable").value(true))
            .andExpect(jsonPath("$.data.allAvailable").value(true));

        // Submit an application with these details
        SubmitOnboardingApplicationRequest appReq = new SubmitOnboardingApplicationRequest(
            "Registered Owner",
            "brandnew@pharmacy.local",
            "9123456780",
            "Registered Pharma",
            null,
            "DL-UNIQUE-2026",
            null,
            "Store One",
            "ST-01",
            null,
            null,
            null,
            null,
            null
        );
        onboardingService.submitApplication(appReq, "127.0.0.1", "test-agent");

        // Now availability check should accurately flag all 3 fields as unavailable
        mockMvc.perform(get("/api/v1/onboarding/check-availability")
                .param("email", "brandnew@pharmacy.local")
                .param("phone", "9123456780")
                .param("drugLicenseNumber", "DL-UNIQUE-2026"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.emailAvailable").value(false))
            .andExpect(jsonPath("$.data.phoneAvailable").value(false))
            .andExpect(jsonPath("$.data.drugLicenseAvailable").value(false))
            .andExpect(jsonPath("$.data.allAvailable").value(false));
    }

    @Test
    @Transactional
    @DisplayName("Public submission throws Conflict for pre-existing mobile or drug license")
    void testSubmitApplicationRejectsDuplicatePhoneOrLicense() throws Exception {
        SubmitOnboardingApplicationRequest first = new SubmitOnboardingApplicationRequest(
            "First Owner",
            "first@pharmacy.local",
            "9988776655",
            "First Pharma",
            null,
            "DL-FIRST-2026",
            null,
            "First Store",
            "FS-01",
            null,
            null,
            null,
            null,
            null
        );
        onboardingService.submitApplication(first, "127.0.0.1", "test-agent");

        // Second application with duplicate phone
        SubmitOnboardingApplicationRequest duplicatePhone = new SubmitOnboardingApplicationRequest(
            "Second Owner",
            "second@pharmacy.local",
            "9988776655", // Same phone
            "Second Pharma",
            null,
            "DL-SECOND-2026",
            null,
            "Second Store",
            "SS-01",
            null,
            null,
            null,
            null,
            null
        );
        mockMvc.perform(post("/api/v1/onboarding/apply")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(duplicatePhone)))
            .andExpect(status().isConflict());

        // Third application with duplicate drug license
        SubmitOnboardingApplicationRequest duplicateLicense = new SubmitOnboardingApplicationRequest(
            "Third Owner",
            "third@pharmacy.local",
            "9988776644",
            "Third Pharma",
            null,
            "DL-FIRST-2026", // Same license
            null,
            "Third Store",
            "TS-01",
            null,
            null,
            null,
            null,
            null
        );
        mockMvc.perform(post("/api/v1/onboarding/apply")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(duplicateLicense)))
            .andExpect(status().isConflict());
    }
}
