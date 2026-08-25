package com.inventra.inventra_backend.purchasing.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.security.JwtTokenProvider;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.purchasing.api.dto.CreateSupplierProductRequest;
import com.inventra.inventra_backend.purchasing.api.dto.CreateSupplierRequest;
import com.inventra.inventra_backend.purchasing.api.dto.UpdateSupplierRequest;
import com.inventra.inventra_backend.purchasing.domain.model.SupplierStatus;
import com.inventra.inventra_backend.purchasing.domain.model.SupplierType;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.math.BigDecimal;
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
class SupplierControllerIntegrationTest {

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

    @Autowired
    private ProductRepository productRepository;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private Business businessA;
    private Business businessB;
    private Store storeA;
    private Store storeB;
    private Product productA;
    private String ownerTokenA;
    private String operatorTokenA;
    private String cashierTokenA;
    private String ownerTokenB;

    @BeforeEach
    void setUp() {
        businessA = businessRepository.save(Business.create("Supplier Test Biz A", "STBA", null, null));
        businessB = businessRepository.save(Business.create("Supplier Test Biz B", "STBB", null, null));
        storeA = storeRepository.save(Store.create(businessA.getId(), "STSA", "Store A", true));
        storeB = storeRepository.save(Store.create(businessB.getId(), "STSB", "Store B", true));

        User ownerA = userRepository.save(User.create("owner." + UUID.randomUUID() + "@stba.local", "hash", "Owner A", null));
        User operatorA = userRepository.save(User.create("operator." + UUID.randomUUID() + "@stba.local", "hash", "Operator A", null));
        User cashierA = userRepository.save(User.create("cashier." + UUID.randomUUID() + "@stba.local", "hash", "Cashier A", null));
        User ownerB = userRepository.save(User.create("owner." + UUID.randomUUID() + "@stbb.local", "hash", "Owner B", null));

        productA = productRepository.save(new Product(
            businessA.getId(),
            null,
            null,
            "Paracetamol 500mg",
            "Paracetamol",
            "Calpol",
            "GSK",
            DosageForm.TABLET,
            "500mg",
            "TABLET",
            "STRIP",
            10,
            "30049099",
            new BigDecimal("12.00"),
            true,
            true
        ));

        ownerTokenA = jwtTokenProvider.generateAccessToken(ownerA.getId(), ownerA.getEmail(), businessA.getId(), storeA.getId(), null, "OWNER");
        operatorTokenA = jwtTokenProvider.generateAccessToken(operatorA.getId(), operatorA.getEmail(), businessA.getId(), storeA.getId(), null, "INVENTORY_OPERATOR");
        cashierTokenA = jwtTokenProvider.generateAccessToken(cashierA.getId(), cashierA.getEmail(), businessA.getId(), storeA.getId(), null, "CASHIER");
        ownerTokenB = jwtTokenProvider.generateAccessToken(ownerB.getId(), ownerB.getEmail(), businessB.getId(), storeB.getId(), null, "OWNER");
    }

    @Test
    @Transactional
    @DisplayName("Creates, searches, updates and isolates supplier within tenant")
    void testSupplierLifecycleAndIsolation() throws Exception {
        CreateSupplierRequest createReq = new CreateSupplierRequest(
            "SUP-001",
            "MedTech Pharma Distributors Ltd",
            "MedTech Pharma",
            SupplierType.DISTRIBUTOR,
            "27AABCM1234A1Z5",
            "DL-554433",
            "AABCM1234A",
            "orders@medtech.com",
            "9876543210",
            "Rajesh Kumar",
            "Unit 102, Pharma Hub",
            "Andheri East",
            "Mumbai",
            "Maharashtra",
            "400069",
            30,
            new BigDecimal("250000.00"),
            "Key distributor"
        );

        // 1. Create Supplier in Biz A
        MvcResult createResult = mockMvc.perform(post("/api/v1/suppliers")
                .header("Authorization", "Bearer " + ownerTokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.supplierCode").value("SUP-001"))
            .andExpect(jsonPath("$.data.legalName").value("MedTech Pharma Distributors Ltd"))
            .andExpect(jsonPath("$.data.paymentTermsDays").value(30))
            .andExpect(jsonPath("$.data.status").value("ACTIVE"))
            .andReturn();

        String supplierId = objectMapper.readTree(createResult.getResponse().getContentAsString())
            .get("data").get("id").asText();

        // 2. Duplicate supplier code in Biz A rejected
        mockMvc.perform(post("/api/v1/suppliers")
                .header("Authorization", "Bearer " + ownerTokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.errorCode").value("DUPLICATE_SUPPLIER_CODE"));

        // 3. Search Supplier in Biz A
        mockMvc.perform(get("/api/v1/suppliers?search=MedTech")
                .header("Authorization", "Bearer " + operatorTokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[0].supplierCode").value("SUP-001"));

        // 4. Update Supplier in Biz A
        UpdateSupplierRequest updateReq = new UpdateSupplierRequest(
            "MedTech Pharma Group Ltd",
            "MedTech",
            SupplierType.WHOLESALER,
            null, null, null, null, null, null, null, null, null, null, null,
            45,
            new BigDecimal("500000.00"),
            SupplierStatus.ACTIVE,
            "Updated credit limit"
        );

        mockMvc.perform(patch("/api/v1/suppliers/" + supplierId)
                .header("Authorization", "Bearer " + ownerTokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.legalName").value("MedTech Pharma Group Ltd"))
            .andExpect(jsonPath("$.data.paymentTermsDays").value(45))
            .andExpect(jsonPath("$.data.creditLimit").value(500000.00));

        // 5. Add Supplier Product Mapping
        CreateSupplierProductRequest spReq = new CreateSupplierProductRequest(
            productA.getId(),
            "VEND-PAR-500",
            "Paracetamol 500mg Box (10x10)",
            "BOX",
            10,
            new BigDecimal("120.00"),
            true,
            new BigDecimal("5.000"),
            2
        );

        mockMvc.perform(post("/api/v1/suppliers/" + supplierId + "/products")
                .header("Authorization", "Bearer " + ownerTokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(spReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.supplierProductCode").value("VEND-PAR-500"))
            .andExpect(jsonPath("$.data.purchaseUnit").value("BOX"))
            .andExpect(jsonPath("$.data.conversionFactor").value(10))
            .andExpect(jsonPath("$.data.lastPurchasePrice").value(120.00));

        // 6. List Supplier Products
        mockMvc.perform(get("/api/v1/suppliers/" + supplierId + "/products")
                .header("Authorization", "Bearer " + operatorTokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].supplierProductCode").value("VEND-PAR-500"));

        // 7. Cross-tenant access rejected (Biz B token cannot see Biz A supplier)
        mockMvc.perform(get("/api/v1/suppliers/" + supplierId)
                .header("Authorization", "Bearer " + ownerTokenB))
            .andExpect(status().isNotFound());

        // 8. Role security checks: Cashier cannot access suppliers (403)
        mockMvc.perform(get("/api/v1/suppliers")
                .header("Authorization", "Bearer " + cashierTokenA))
            .andExpect(status().isForbidden());

        // Operator cannot create supplier (403)
        mockMvc.perform(post("/api/v1/suppliers")
                .header("Authorization", "Bearer " + operatorTokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isForbidden());
    }
}
