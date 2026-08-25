package com.inventra.inventra_backend.purchasing.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.security.JwtTokenProvider;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.purchasing.api.dto.CancelOrderRequest;
import com.inventra.inventra_backend.purchasing.api.dto.CreatePurchaseOrderLineRequest;
import com.inventra.inventra_backend.purchasing.api.dto.CreatePurchaseOrderRequest;
import com.inventra.inventra_backend.purchasing.api.dto.UpdatePurchaseOrderRequest;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrderStatus;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PurchaseOrderControllerIntegrationTest {

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
    private Product product1;
    private Product product2;
    private String ownerTokenA;
    private String operatorTokenA;
    private String cashierTokenA;
    private String ownerTokenB;

    @BeforeEach
    void setUp() {
        businessA = businessRepository.save(Business.create("PO Test Biz A", "PTBA", null, null));
        businessB = businessRepository.save(Business.create("PO Test Biz B", "PTBB", null, null));
        storeA = storeRepository.save(Store.create(businessA.getId(), "PTSA", "Store A", true));
        storeB = storeRepository.save(Store.create(businessB.getId(), "PTSB", "Store B", true));

        User ownerA = userRepository.save(User.create("owner." + UUID.randomUUID() + "@ptba.local", "hash", "Owner A", null));
        User operatorA = userRepository.save(User.create("operator." + UUID.randomUUID() + "@ptba.local", "hash", "Operator A", null));
        User cashierA = userRepository.save(User.create("cashier." + UUID.randomUUID() + "@ptba.local", "hash", "Cashier A", null));
        User ownerB = userRepository.save(User.create("owner." + UUID.randomUUID() + "@ptbb.local", "hash", "Owner B", null));

        supplierA = supplierRepository.save(new Supplier(
            businessA.getId(),
            "SUP-PO-01",
            "Reliable Pharma Distributors",
            "Reliable",
            SupplierType.DISTRIBUTOR,
            null, null, null, null, null, null, null, null, null, null, null, 30, null, null
        ));

        product1 = productRepository.save(new Product(
            businessA.getId(),
            null, null,
            "Amoxicillin 500mg",
            null, null, null,
            DosageForm.CAPSULE,
            null, "CAPSULE", "STRIP", 10, null,
            new BigDecimal("12.00"),
            true, true
        ));

        product2 = productRepository.save(new Product(
            businessA.getId(),
            null, null,
            "Paracetamol 650mg",
            null, null, null,
            DosageForm.TABLET,
            null, "TABLET", "STRIP", 15, null,
            new BigDecimal("18.00"),
            true, true
        ));

        ownerTokenA = jwtTokenProvider.generateAccessToken(ownerA.getId(), ownerA.getEmail(), businessA.getId(), storeA.getId(), null, "OWNER");
        operatorTokenA = jwtTokenProvider.generateAccessToken(operatorA.getId(), operatorA.getEmail(), businessA.getId(), storeA.getId(), null, "INVENTORY_OPERATOR");
        cashierTokenA = jwtTokenProvider.generateAccessToken(cashierA.getId(), cashierA.getEmail(), businessA.getId(), storeA.getId(), null, "CASHIER");
        ownerTokenB = jwtTokenProvider.generateAccessToken(ownerB.getId(), ownerB.getEmail(), businessB.getId(), storeB.getId(), null, "OWNER");
    }

    @Test
    @Transactional
    @DisplayName("Creates, updates, confirms, and queries purchase orders with role security")
    void testPurchaseOrderLifecycle() throws Exception {
        CreatePurchaseOrderRequest createReq = new CreatePurchaseOrderRequest(
            storeA.getId(),
            supplierA.getId(),
            LocalDate.now(),
            LocalDate.now().plusDays(5),
            new BigDecimal("20.0000"),
            "Urgent monthly order",
            List.of(
                new CreatePurchaseOrderLineRequest(
                    product1.getId(),
                    null,
                    "STRIP",
                    1,
                    new BigDecimal("50.000"),
                    new BigDecimal("40.0000"),
                    BigDecimal.ZERO,
                    new BigDecimal("12.00")
                ),
                new CreatePurchaseOrderLineRequest(
                    product2.getId(),
                    null,
                    "BOX",
                    10,
                    new BigDecimal("5.000"),
                    new BigDecimal("150.0000"),
                    new BigDecimal("5.00"),
                    new BigDecimal("18.00")
                )
            )
        );

        // 1. Create Draft PO
        MvcResult createResult = mockMvc.perform(post("/api/v1/purchase-orders")
                .header("Authorization", "Bearer " + ownerTokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("DRAFT"))
            .andExpect(jsonPath("$.data.lines.length()").value(2))
            .andReturn();

        String poId = objectMapper.readTree(createResult.getResponse().getContentAsString())
            .get("data").get("id").asText();

        // 2. Update Draft PO
        UpdatePurchaseOrderRequest updateReq = new UpdatePurchaseOrderRequest(
            LocalDate.now().plusDays(7),
            new BigDecimal("25.0000"),
            "Updated notes",
            null
        );

        mockMvc.perform(patch("/api/v1/purchase-orders/" + poId)
                .header("Authorization", "Bearer " + ownerTokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.discountAmount").value(25.0000))
            .andExpect(jsonPath("$.data.notes").value("Updated notes"));

        // 3. Confirm PO
        mockMvc.perform(post("/api/v1/purchase-orders/" + poId + "/confirm")
                .header("Authorization", "Bearer " + ownerTokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("CONFIRMED"))
            .andExpect(jsonPath("$.data.confirmedAt").isNotEmpty());

        // 4. Operator can view PO
        mockMvc.perform(get("/api/v1/purchase-orders/" + poId)
                .header("Authorization", "Bearer " + operatorTokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.orderNumber").isNotEmpty());

        // 5. Operator cannot cancel PO (403)
        mockMvc.perform(post("/api/v1/purchase-orders/" + poId + "/cancel")
                .header("Authorization", "Bearer " + operatorTokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new CancelOrderRequest("Price changed"))))
            .andExpect(status().isForbidden());

        // 6. Cashier cannot access POs (403)
        mockMvc.perform(get("/api/v1/purchase-orders")
                .header("Authorization", "Bearer " + cashierTokenA))
            .andExpect(status().isForbidden());

        // 7. Owner B cannot see Biz A PO (404)
        mockMvc.perform(get("/api/v1/purchase-orders/" + poId)
                .header("Authorization", "Bearer " + ownerTokenB))
            .andExpect(status().isNotFound());
    }
}
