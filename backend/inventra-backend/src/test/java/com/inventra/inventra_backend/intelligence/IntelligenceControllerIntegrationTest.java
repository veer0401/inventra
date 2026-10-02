package com.inventra.inventra_backend.intelligence;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.common.security.JwtTokenProvider;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.intelligence.api.dto.InterpretRequest;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.Store;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class IntelligenceControllerIntegrationTest {

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

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private String validToken;

    @BeforeEach
    void setUp() {
        Business business = businessRepository.save(
            Business.create("HealthPlus Pharma", "HealthPlus Ltd", null, null)
        );
        Store store = storeRepository.save(
            Store.create(business.getId(), "HP-01", "HealthPlus Main Branch", true)
        );
        User user = userRepository.save(
            User.create("pharmacist." + UUID.randomUUID() + "@inventra.com", "hashedPassword", "Pharmacist", null)
        );
        validToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail(), business.getId(), store.getId(), null, "PHARMACIST");
    }

    @Test
    @DisplayName("Authenticated request should successfully interpret command")
    void testAuthenticatedInterpretation() throws Exception {
        InterpretRequest request = new InterpretRequest("show low stock medicines");

        mockMvc.perform(post("/api/v1/intelligence/interpret")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.intent").value("LOW_STOCK"))
            .andExpect(jsonPath("$.data.confidence").isNumber())
            .andExpect(jsonPath("$.data.entities.itemType").value("MEDICINE"))
            .andExpect(jsonPath("$.data.engineVersion").value("1"));
    }

    @Test
    @DisplayName("Unauthenticated request should return 401 Unauthorized")
    void testUnauthenticatedRequest() throws Exception {
        InterpretRequest request = new InterpretRequest("open inventory");

        mockMvc.perform(post("/api/v1/intelligence/interpret")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Blank text should fail validation with 400 Bad Request")
    void testBlankRequest() throws Exception {
        InterpretRequest request = new InterpretRequest("   ");

        mockMvc.perform(post("/api/v1/intelligence/interpret")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Product search queries with natural language prefixes and mixed casing should return SEARCH_PRODUCT with preserved identifier")
    void testProductSearchQueries() throws Exception {
        // find medicine_1
        mockMvc.perform(post("/api/v1/intelligence/interpret")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new InterpretRequest("find medicine_1"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.intent").value("SEARCH_PRODUCT"))
            .andExpect(jsonPath("$.data.entities.query").value("medicine_1"));

        // find Medicine_1
        mockMvc.perform(post("/api/v1/intelligence/interpret")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new InterpretRequest("find Medicine_1"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.intent").value("SEARCH_PRODUCT"))
            .andExpect(jsonPath("$.data.entities.query").value("medicine_1"));

        // search for medicine_1
        mockMvc.perform(post("/api/v1/intelligence/interpret")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new InterpretRequest("search for medicine_1"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.intent").value("SEARCH_PRODUCT"))
            .andExpect(jsonPath("$.data.entities.query").value("medicine_1"));

        // find medicine
        mockMvc.perform(post("/api/v1/intelligence/interpret")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new InterpretRequest("find medicine"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.intent").value("SEARCH_PRODUCT"))
            .andExpect(jsonPath("$.data.entities.query").value("medicine"));

        // Ambiguous query 'find Rahul' must NOT guess SEARCH_PRODUCT
        mockMvc.perform(post("/api/v1/intelligence/interpret")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new InterpretRequest("find Rahul"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.intent").value("UNKNOWN"))
            .andExpect(jsonPath("$.data.confidence").value(0.1));
    }
}
