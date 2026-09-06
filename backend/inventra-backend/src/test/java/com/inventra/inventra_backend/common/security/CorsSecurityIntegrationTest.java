package com.inventra.inventra_backend.common.security;

import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CorsSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private UserRepository userRepository;

    private String validToken;

    @BeforeEach
    void setUp() {
        Business business = businessRepository.save(Business.create("CORS Test Pharmacy " + UUID.randomUUID().toString().substring(0, 8), null, null, null));
        User user = userRepository.save(User.create("cors." + UUID.randomUUID().toString().substring(0, 8) + "@inventra.com", "hash", "CORS Tester", "9876543210"));

        validToken = jwtTokenProvider.generateAccessToken(
            user.getId(),
            user.getEmail(),
            business.getId(),
            null,
            null,
            "OWNER"
        );
    }

    @Test
    @DisplayName("Preflight OPTIONS request from allowed origin succeeds with CORS headers")
    void preflightOptionsFromAllowedOriginSucceeds() throws Exception {
        mockMvc.perform(options("/api/v1/products")
                .header(HttpHeaders.ORIGIN, "http://localhost:3000")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization,Content-Type,X-Device-Id"))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:3000"))
            .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"))
            .andExpect(header().exists(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS))
            .andExpect(header().exists(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS));
    }

    @Test
    @DisplayName("Preflight OPTIONS request from disallowed origin returns forbidden or no CORS headers")
    void preflightOptionsFromDisallowedOriginRejected() throws Exception {
        mockMvc.perform(options("/api/v1/products")
                .header(HttpHeaders.ORIGIN, "http://malicious-site.com")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization,Content-Type"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Authenticated GET request with allowed origin includes CORS headers and returns 200")
    void authenticatedGetRequestWithAllowedOriginIncludesCorsHeaders() throws Exception {
        mockMvc.perform(get("/api/v1/products")
                .header(HttpHeaders.ORIGIN, "http://localhost:3000")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + validToken))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:3000"))
            .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }

    @Test
    @DisplayName("Unauthenticated request with allowed origin still receives 401 Unauthorized without bypassing security")
    void unauthenticatedRequestWithAllowedOriginStillRequiresAuth() throws Exception {
        mockMvc.perform(get("/api/v1/products")
                .header(HttpHeaders.ORIGIN, "http://localhost:3000"))
            .andExpect(status().isUnauthorized())
            .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:3000"));
    }
}
