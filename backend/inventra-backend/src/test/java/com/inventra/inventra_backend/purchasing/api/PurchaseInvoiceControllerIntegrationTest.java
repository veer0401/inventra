package com.inventra.inventra_backend.purchasing.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.security.JwtTokenProvider;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.purchasing.api.dto.CreatePurchaseInvoiceLineRequest;
import com.inventra.inventra_backend.purchasing.api.dto.CreatePurchaseInvoiceRequest;
import com.inventra.inventra_backend.purchasing.domain.model.Supplier;
import com.inventra.inventra_backend.purchasing.domain.model.SupplierType;
import com.inventra.inventra_backend.purchasing.domain.repository.SupplierRepository;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PurchaseInvoiceControllerIntegrationTest {

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
    private SupplierRepository supplierRepository;

    @Autowired
    private ProductRepository productRepository;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private Business businessA;
    private Business businessB;
    private Store storeA;
    private Store storeB;
    private Supplier supplierA;
    private Product productA;
    private String ownerTokenA;
    private String operatorTokenA;
    private String cashierTokenA;
    private String ownerTokenB;

    @BeforeEach
    void setUp() {
        businessA = businessRepository.save(Business.create("PI Test Biz A", "PITBA", null, null));
        businessB = businessRepository.save(Business.create("PI Test Biz B", "PITBB", null, null));
        storeA = storeRepository.save(Store.create(businessA.getId(), "PITSA", "Store A", true));
        storeB = storeRepository.save(Store.create(businessB.getId(), "PITSB", "Store B", true));

        User ownerA = userRepository.save(User.create("owner." + UUID.randomUUID() + "@pitba.local", "hash", "Owner A", null));
        User operatorA = userRepository.save(User.create("operator." + UUID.randomUUID() + "@pitba.local", "hash", "Operator A", null));
        User cashierA = userRepository.save(User.create("cashier." + UUID.randomUUID() + "@pitba.local", "hash", "Cashier A", null));
        User ownerB = userRepository.save(User.create("owner." + UUID.randomUUID() + "@pitbb.local", "hash", "Owner B", null));

        supplierA = supplierRepository.save(new Supplier(
            businessA.getId(),
            "SUP-PI-01",
            "Prime Pharma Distributors",
            "Prime",
            SupplierType.DISTRIBUTOR,
            null, null, null, null, null, null, null, null, null, null, null, 30, null, null
        ));

        productA = productRepository.save(new Product(
            businessA.getId(),
            null, null,
            "Azithromycin 500mg",
            null, null, null,
            DosageForm.TABLET,
            null, "TABLET", "STRIP", 3, null,
            new BigDecimal("12.00"),
            true, true
        ));

        ownerTokenA = jwtTokenProvider.generateAccessToken(ownerA.getId(), ownerA.getEmail(), businessA.getId(), storeA.getId(), null, "OWNER");
        operatorTokenA = jwtTokenProvider.generateAccessToken(operatorA.getId(), operatorA.getEmail(), businessA.getId(), storeA.getId(), null, "INVENTORY_OPERATOR");
        cashierTokenA = jwtTokenProvider.generateAccessToken(cashierA.getId(), cashierA.getEmail(), businessA.getId(), storeA.getId(), null, "CASHIER");
        ownerTokenB = jwtTokenProvider.generateAccessToken(ownerB.getId(), ownerB.getEmail(), businessB.getId(), storeB.getId(), null, "OWNER");
    }

    @Test
    @Transactional
    @DisplayName("Creates, posts, cancels purchase invoices and enforces authorization matrix")
    void testPurchaseInvoiceLifecycle() throws Exception {
        CreatePurchaseInvoiceRequest createReq = new CreatePurchaseInvoiceRequest(
            storeA.getId(),
            supplierA.getId(),
            null,
            null,
            "INV-SUP-998811",
            LocalDate.now(),
            LocalDate.now().plusDays(30),
            new BigDecimal("10.0000"),
            new BigDecimal("0.25"),
            "Monthly stock invoice",
            List.of(new CreatePurchaseInvoiceLineRequest(
                null,
                productA.getId(),
                new BigDecimal("20.000"),
                new BigDecimal("50.0000"),
                new BigDecimal("5.0000"),
                new BigDecimal("12.00")
            ))
        );

        // 1. Create Draft Purchase Invoice as Owner
        MvcResult createResult = mockMvc.perform(post("/api/v1/purchase-invoices")
                .header("Authorization", "Bearer " + ownerTokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.status").value("DRAFT"))
            .andExpect(jsonPath("$.data.supplierInvoiceNumber").value("INV-SUP-998811"))
            .andReturn();

        String piId = objectMapper.readTree(createResult.getResponse().getContentAsString())
            .get("data").get("id").asText();

        // 2. Duplicate invoice number for same supplier rejected with 422
        mockMvc.perform(post("/api/v1/purchase-invoices")
                .header("Authorization", "Bearer " + ownerTokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.errorCode").value("DUPLICATE_SUPPLIER_INVOICE_NUMBER"));

        // 3. Post Purchase Invoice
        mockMvc.perform(post("/api/v1/purchase-invoices/" + piId + "/post")
                .header("Authorization", "Bearer " + ownerTokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("POSTED"))
            .andExpect(jsonPath("$.data.postedAt").isNotEmpty());

        // 4. Cancel Purchase Invoice
        mockMvc.perform(post("/api/v1/purchase-invoices/" + piId + "/cancel")
                .header("Authorization", "Bearer " + ownerTokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("CANCELLED"));

        // 5. Cross-tenant access rejected (Biz B cannot see Biz A invoice)
        mockMvc.perform(get("/api/v1/purchase-invoices/" + piId)
                .header("Authorization", "Bearer " + ownerTokenB))
            .andExpect(status().isNotFound());

        // 6. Operator cannot access purchase invoices (403)
        mockMvc.perform(get("/api/v1/purchase-invoices")
                .header("Authorization", "Bearer " + operatorTokenA))
            .andExpect(status().isForbidden());

        // 7. Cashier cannot access purchase invoices (403)
        mockMvc.perform(get("/api/v1/purchase-invoices")
                .header("Authorization", "Bearer " + cashierTokenA))
            .andExpect(status().isForbidden());
    }
}
