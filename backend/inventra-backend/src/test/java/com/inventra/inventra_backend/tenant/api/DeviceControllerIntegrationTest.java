package com.inventra.inventra_backend.tenant.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.identity.api.dto.ActivateOwnerRequest;
import com.inventra.inventra_backend.identity.api.dto.LoginRequest;
import com.inventra.inventra_backend.onboarding.api.dto.OnboardingApprovalResponse;
import com.inventra.inventra_backend.onboarding.api.dto.SubmitOnboardingApplicationRequest;
import com.inventra.inventra_backend.onboarding.application.OnboardingService;
import com.inventra.inventra_backend.tenant.api.dto.RegisterDeviceRequest;
import com.inventra.inventra_backend.tenant.domain.model.DeviceType;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DeviceControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private OnboardingService onboardingService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @Transactional
    @DisplayName("Device registration, listing, and remote revocation by business owner")
    void testDeviceLifecycleFlow() throws Exception {
        // 1. Submit onboarding application
        SubmitOnboardingApplicationRequest appReq = new SubmitOnboardingApplicationRequest(
            "Device Owner",
            "device.owner@inventra.local",
            null,
            "Device Pharma",
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
        var appSummary = onboardingService.submitApplication(appReq, "127.0.0.1", "test-agent");

        // 2. Approve application
        UUID dummyAdminId = UUID.randomUUID();
        OnboardingApprovalResponse approval = onboardingService.approveApplication(appSummary.id(), dummyAdminId, "127.0.0.1", "test-agent");

        // 3. Activate owner account
        onboardingService.activateOwner(new ActivateOwnerRequest(approval.devActivationToken(), "Password123!"), "127.0.0.1", "test-agent");

        // 4. Log in as activated owner
        LoginRequest loginReq = new LoginRequest("device.owner@inventra.local", "Password123!", null, null, null, null, null);
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
            .andExpect(status().isOk())
            .andReturn();

        String accessToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
            .path("data").path("accessToken").asText();

        // Register a desktop device
        RegisterDeviceRequest deviceReq = new RegisterDeviceRequest(
            "Front Billing Counter 1",
            "POS-01",
            DeviceType.DESKTOP,
            "Windows 11",
            "1.0.0"
        );

        MvcResult result = mockMvc.perform(post("/api/v1/devices/register")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(deviceReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.deviceName").value("Front Billing Counter 1"))
            .andExpect(jsonPath("$.data.deviceCode").value("POS-01"))
            .andExpect(jsonPath("$.data.status").value("ACTIVE"))
            .andReturn();

        String deviceIdStr = objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("id").asText();

        // List devices
        mockMvc.perform(get("/api/v1/devices")
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(1));

        // Revoke device
        mockMvc.perform(post("/api/v1/devices/" + deviceIdStr + "/revoke")
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("REVOKED"));
    }
}
