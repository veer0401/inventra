package com.inventra.inventra_backend.catalog.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.catalog.api.dto.CreateCategoryRequest;
import com.inventra.inventra_backend.catalog.api.dto.UpdateCategoryRequest;
import com.inventra.inventra_backend.catalog.domain.model.CategoryStatus;
import com.inventra.inventra_backend.catalog.domain.repository.CategoryRepository;
import com.inventra.inventra_backend.common.security.JwtTokenProvider;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CategoryControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private Business businessA;
    private Business businessB;
    private Store storeA;
    private UUID userOwnerId;
    private UUID userOperatorId;
    private UUID userCashierId;
    private String ownerToken;
    private String operatorToken;
    private String cashierToken;

    @BeforeEach
    void setUp() {
        businessA = businessRepository.save(Business.create("Cat Pharma A", "CP-A", null, null));
        businessB = businessRepository.save(Business.create("Cat Pharma B", "CP-B", null, null));
        storeA = storeRepository.save(Store.create(businessA.getId(), "STR-A", "Main Store A", true));

        userOwnerId = UUID.randomUUID();
        userOperatorId = UUID.randomUUID();
        userCashierId = UUID.randomUUID();

        ownerToken = jwtTokenProvider.generateAccessToken(
            userOwnerId,
            "owner@cata.local",
            businessA.getId(),
            storeA.getId(),
            null,
            "OWNER"
        );

        operatorToken = jwtTokenProvider.generateAccessToken(
            userOperatorId,
            "operator@cata.local",
            businessA.getId(),
            storeA.getId(),
            null,
            "INVENTORY_OPERATOR"
        );

        cashierToken = jwtTokenProvider.generateAccessToken(
            userCashierId,
            "cashier@cata.local",
            businessA.getId(),
            storeA.getId(),
            null,
            "CASHIER"
        );
    }

    @Test
    @Transactional
    @DisplayName("Category CRUD and 2-level hierarchy management by OWNER")
    void testCategoryCrudAndHierarchy() throws Exception {
        // 1. Create root category
        CreateCategoryRequest rootReq = new CreateCategoryRequest(
            null,
            "Medicines",
            "MED",
            "Prescription and OTC medicines"
        );

        MvcResult rootResult = mockMvc.perform(post("/api/v1/categories")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(rootReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.name").value("Medicines"))
            .andExpect(jsonPath("$.data.code").value("MED"))
            .andExpect(jsonPath("$.data.parentId").doesNotExist())
            .andReturn();

        String rootId = objectMapper.readTree(rootResult.getResponse().getContentAsString())
            .path("data").path("id").asText();

        // 2. Create child category (level 2)
        CreateCategoryRequest childReq = new CreateCategoryRequest(
            UUID.fromString(rootId),
            "Analgesics",
            "ANALGESIC",
            "Pain relief medicines"
        );

        MvcResult childResult = mockMvc.perform(post("/api/v1/categories")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(childReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.name").value("Analgesics"))
            .andExpect(jsonPath("$.data.parentId").value(rootId))
            .andReturn();

        String childId = objectMapper.readTree(childResult.getResponse().getContentAsString())
            .path("data").path("id").asText();

        // 3. Attempt level 3 category (should be rejected)
        CreateCategoryRequest level3Req = new CreateCategoryRequest(
            UUID.fromString(childId),
            "Paracetamol Sub",
            "PARA_SUB",
            "Third level child"
        );

        mockMvc.perform(post("/api/v1/categories")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(level3Req)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.errorCode").value("CATEGORY_HIERARCHY_EXCEEDED"));

        // 4. Update category
        UpdateCategoryRequest updateReq = new UpdateCategoryRequest(
            "Pain Relievers",
            "Updated description",
            CategoryStatus.ACTIVE
        );

        mockMvc.perform(patch("/api/v1/categories/" + childId)
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("Pain Relievers"));

        // 5. List categories
        mockMvc.perform(get("/api/v1/categories")
                .header("Authorization", "Bearer " + ownerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @Transactional
    @DisplayName("Role authorization: INVENTORY_OPERATOR and CASHIER cannot create categories")
    void testCategoryRoleAuthorization() throws Exception {
        CreateCategoryRequest req = new CreateCategoryRequest(
            null,
            "Supplements",
            "SUPP",
            "Health supplements"
        );

        // INVENTORY_OPERATOR -> 403
        mockMvc.perform(post("/api/v1/categories")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        // CASHIER -> 403
        mockMvc.perform(post("/api/v1/categories")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    @Test
    @Transactional
    @DisplayName("Tenant isolation: Business B token cannot see or modify Business A categories")
    void testCrossTenantCategoryIsolation() throws Exception {
        // Create category in Business A
        CreateCategoryRequest reqA = new CreateCategoryRequest(null, "Pharma A Only", "PAO", null);
        MvcResult resA = mockMvc.perform(post("/api/v1/categories")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqA)))
            .andExpect(status().isCreated())
            .andReturn();

        String catIdA = objectMapper.readTree(resA.getResponse().getContentAsString())
            .path("data").path("id").asText();

        // Token for Business B
        String tokenB = jwtTokenProvider.generateAccessToken(
            UUID.randomUUID(),
            "owner@catb.local",
            businessB.getId(),
            null,
            null,
            "OWNER"
        );

        // Business B attempts to get Business A category -> 404 NOT_FOUND
        mockMvc.perform(get("/api/v1/categories/" + catIdA)
                .header("Authorization", "Bearer " + tokenB))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }
}
