package com.inventra.inventra_backend.catalog.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.catalog.api.dto.AddProductIdentifierRequest;
import com.inventra.inventra_backend.catalog.api.dto.CreateProductRequest;
import com.inventra.inventra_backend.catalog.api.dto.UpdateProductRequest;
import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.IdentifierType;
import com.inventra.inventra_backend.catalog.domain.model.ProductStatus;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.security.JwtTokenProvider;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.math.BigDecimal;
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
class ProductControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private ProductRepository productRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private Business businessA;
    private Business businessB;
    private Store storeA;
    private String ownerToken;
    private String operatorToken;
    private String cashierToken;

    @BeforeEach
    void setUp() {
        businessA = businessRepository.save(Business.create("Prod Business A", "PBA", null, null));
        businessB = businessRepository.save(Business.create("Prod Business B", "PBB", null, null));
        storeA = storeRepository.save(Store.create(businessA.getId(), "PSA", "Prod Store A", true));

        ownerToken = jwtTokenProvider.generateAccessToken(
            UUID.randomUUID(),
            "owner@pba.local",
            businessA.getId(),
            storeA.getId(),
            null,
            "OWNER"
        );

        operatorToken = jwtTokenProvider.generateAccessToken(
            UUID.randomUUID(),
            "operator@pba.local",
            businessA.getId(),
            storeA.getId(),
            null,
            "INVENTORY_OPERATOR"
        );

        cashierToken = jwtTokenProvider.generateAccessToken(
            UUID.randomUUID(),
            "cashier@pba.local",
            businessA.getId(),
            storeA.getId(),
            null,
            "CASHIER"
        );
    }

    @Test
    @Transactional
    @DisplayName("Create, search, update product and manage identifiers")
    void testProductLifecycleAndSearch() throws Exception {
        // 1. Create product with initial barcode
        AddProductIdentifierRequest initialBarcode = new AddProductIdentifierRequest(
            IdentifierType.BARCODE,
            "8901234567890",
            true
        );

        CreateProductRequest createReq = new CreateProductRequest(
            null,
            null,
            "Paracetamol 500mg Tablet",
            "Paracetamol (500mg)",
            "Crocin",
            "GSK",
            DosageForm.TABLET,
            "500mg",
            "TABLET",
            "STRIP",
            10,
            "30049060",
            new BigDecimal("12.00"),
            true,
            false,
            List.of(initialBarcode)
        );

        MvcResult result = mockMvc.perform(post("/api/v1/products")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.name").value("Paracetamol 500mg Tablet"))
            .andExpect(jsonPath("$.data.baseUnit").value("TABLET"))
            .andExpect(jsonPath("$.data.sellingUnit").value("STRIP"))
            .andExpect(jsonPath("$.data.unitsPerSellingUnit").value(10))
            .andExpect(jsonPath("$.data.identifiers[0].identifierValue").value("8901234567890"))
            .andReturn();

        String productId = objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("id").asText();

        // 2. Add an internal SKU identifier
        AddProductIdentifierRequest skuReq = new AddProductIdentifierRequest(
            IdentifierType.SKU,
            "SKU-PARA-500",
            false
        );

        mockMvc.perform(post("/api/v1/products/" + productId + "/identifiers")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(skuReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.identifierType").value("SKU"))
            .andExpect(jsonPath("$.data.identifierValue").value("SKU-PARA-500"));

        // 3. Search product by barcode
        mockMvc.perform(get("/api/v1/products/search?q=8901234567890")
                .header("Authorization", "Bearer " + cashierToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[0].id").value(productId));

        // 4. Search product by generic name
        mockMvc.perform(get("/api/v1/products/search?q=Paracetamol")
                .header("Authorization", "Bearer " + operatorToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[0].id").value(productId));

        // 5. Update product status
        UpdateProductRequest updateReq = new UpdateProductRequest(
            null,
            "Paracetamol 500mg Forte",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            ProductStatus.ACTIVE
        );

        mockMvc.perform(patch("/api/v1/products/" + productId)
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("Paracetamol 500mg Forte"));
    }

    @Test
    @Transactional
    @DisplayName("Role authorization: INVENTORY_OPERATOR and CASHIER cannot create products")
    void testProductRoleAuthorization() throws Exception {
        CreateProductRequest createReq = new CreateProductRequest(
            null,
            null,
            "Vitamin C 500mg",
            null,
            null,
            null,
            DosageForm.TABLET,
            null,
            "TABLET",
            "STRIP",
            10,
            null,
            BigDecimal.ZERO,
            true,
            false,
            null
        );

        // Operator -> 403
        mockMvc.perform(post("/api/v1/products")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        // Cashier -> 403
        mockMvc.perform(post("/api/v1/products")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    @Test
    @Transactional
    @DisplayName("Cross-tenant isolation: Business B cannot access Business A product")
    void testCrossTenantProductIsolation() throws Exception {
        CreateProductRequest createReq = new CreateProductRequest(
            null,
            null,
            "Business A Medicine",
            null,
            null,
            null,
            DosageForm.TABLET,
            null,
            "TABLET",
            "STRIP",
            10,
            null,
            BigDecimal.ZERO,
            true,
            false,
            null
        );

        MvcResult resA = mockMvc.perform(post("/api/v1/products")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isCreated())
            .andReturn();

        String prodIdA = objectMapper.readTree(resA.getResponse().getContentAsString())
            .path("data").path("id").asText();

        String tokenB = jwtTokenProvider.generateAccessToken(
            UUID.randomUUID(),
            "owner@pbb.local",
            businessB.getId(),
            null,
            null,
            "OWNER"
        );

        mockMvc.perform(get("/api/v1/products/" + prodIdA)
                .header("Authorization", "Bearer " + tokenB))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }
}
