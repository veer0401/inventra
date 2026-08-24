package com.inventra.inventra_backend.tenant.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.identity.api.dto.RegisterOwnerRequest;
import com.inventra.inventra_backend.tenant.api.dto.RegisterDeviceRequest;
import com.inventra.inventra_backend.tenant.domain.model.DeviceType;
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

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @Transactional
    @DisplayName("Device registration, listing, and remote revocation by business owner")
    void testDeviceLifecycleFlow() throws Exception {
        // Register owner
        RegisterOwnerRequest registerReq = new RegisterOwnerRequest(
            "device.owner@inventra.local",
            "Password123!",
            "Device Owner",
            null,
            "Device Pharma",
            "Main Store",
            null
        );

        MvcResult regResult = mockMvc.perform(post("/api/v1/auth/register-owner")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerReq)))
            .andExpect(status().isCreated())
            .andReturn();

        String accessToken = objectMapper.readTree(regResult.getResponse().getContentAsString())
            .path("data").path("accessToken").asText();

        // Register a desktop device
        RegisterDeviceRequest deviceReq = new RegisterDeviceRequest(
            "Front Billing Counter 1",
            "POS-01",
            DeviceType.DESKTOP,
            "Windows 11",
            "1.0.0"
        );

        MvcResult devResult = mockMvc.perform(post("/api/v1/devices/register")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(deviceReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.deviceCode").value("POS-01"))
            .andExpect(jsonPath("$.data.status").value("ACTIVE"))
            .andReturn();

        String deviceId = objectMapper.readTree(devResult.getResponse().getContentAsString())
            .path("data").path("id").asText();

        // List devices
        mockMvc.perform(get("/api/v1/devices")
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].deviceCode").value("POS-01"));

        // Revoke device
        mockMvc.perform(post("/api/v1/devices/" + deviceId + "/revoke")
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("REVOKED"));
    }

    @Test
    @DisplayName("Unauthenticated request to device endpoints returns 401 ProblemDetail")
    void testUnauthenticatedDeviceAccessRejected() throws Exception {
        mockMvc.perform(get("/api/v1/devices"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }
}
