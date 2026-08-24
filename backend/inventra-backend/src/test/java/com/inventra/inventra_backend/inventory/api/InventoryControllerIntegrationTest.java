package com.inventra.inventra_backend.inventory.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.security.JwtTokenProvider;
import com.inventra.inventra_backend.inventory.api.dto.BatchAdjustmentDto;
import com.inventra.inventra_backend.inventory.api.dto.StockAdjustmentRequest;
import com.inventra.inventra_backend.inventory.domain.model.InventoryBatch;
import com.inventra.inventra_backend.inventory.domain.model.InventoryItem;
import com.inventra.inventra_backend.inventory.domain.model.StockMovementType;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryBatchRepository;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryItemRepository;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class InventoryControllerIntegrationTest {

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

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private InventoryBatchRepository inventoryBatchRepository;

    @Autowired
    private com.inventra.inventra_backend.identity.domain.repository.UserRepository userRepository;

    private final ObjectMapper objectMapper = org.springframework.http.converter.json.Jackson2ObjectMapperBuilder.json().build();

    private Business businessA;
    private Business businessB;
    private Store storeA;
    private Product productNonBatch;
    private Product productBatch;
    private String ownerToken;
    private String operatorToken;
    private String cashierToken;

    @BeforeEach
    void setUp() {
        businessA = businessRepository.save(Business.create("Inv Business A", "IBA", null, null));
        businessB = businessRepository.save(Business.create("Inv Business B", "IBB", null, null));
        storeA = storeRepository.save(Store.create(businessA.getId(), "ISA", "Inv Store A", true));

        var ownerUser = userRepository.save(com.inventra.inventra_backend.identity.domain.model.User.create(
            "owner." + UUID.randomUUID() + "@iba.local",
            "hash",
            "Owner User",
            null
        ));
        var operatorUser = userRepository.save(com.inventra.inventra_backend.identity.domain.model.User.create(
            "operator." + UUID.randomUUID() + "@iba.local",
            "hash",
            "Operator User",
            null
        ));
        var cashierUser = userRepository.save(com.inventra.inventra_backend.identity.domain.model.User.create(
            "cashier." + UUID.randomUUID() + "@iba.local",
            "hash",
            "Cashier User",
            null
        ));

        productNonBatch = productRepository.save(new Product(
            businessA.getId(),
            null,
            null,
            "Surgical Mask",
            null,
            null,
            null,
            DosageForm.DEVICE,
            null,
            "PIECE",
            "PACK",
            50,
            null,
            BigDecimal.ZERO,
            true,
            false
        ));

        productBatch = productRepository.save(new Product(
            businessA.getId(),
            null,
            null,
            "Amoxicillin 500mg",
            "Amoxicillin",
            "Mox",
            "Ranbaxy",
            DosageForm.CAPSULE,
            "500mg",
            "CAPSULE",
            "STRIP",
            10,
            "30041010",
            new BigDecimal("12.00"),
            true,
            true
        ));

        ownerToken = jwtTokenProvider.generateAccessToken(
            ownerUser.getId(),
            ownerUser.getEmail(),
            businessA.getId(),
            storeA.getId(),
            null,
            "OWNER"
        );

        operatorToken = jwtTokenProvider.generateAccessToken(
            operatorUser.getId(),
            operatorUser.getEmail(),
            businessA.getId(),
            storeA.getId(),
            null,
            "INVENTORY_OPERATOR"
        );

        cashierToken = jwtTokenProvider.generateAccessToken(
            cashierUser.getId(),
            cashierUser.getEmail(),
            businessA.getId(),
            storeA.getId(),
            null,
            "CASHIER"
        );
    }

    @Test
    @Transactional
    @DisplayName("Non-batch stock adjustment and ledger movement")
    void testNonBatchStockAdjustment() throws Exception {
        // Initial stock entry: +100
        StockAdjustmentRequest initialReq = new StockAdjustmentRequest(
            productNonBatch.getId(),
            StockMovementType.INITIAL_STOCK,
            new BigDecimal("100.000"),
            null,
            "Initial setup",
            null,
            null
        );

        mockMvc.perform(post("/api/v1/inventory/adjustments")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(initialReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.quantityDelta").value(100.0))
            .andExpect(jsonPath("$.data.balanceAfter").value(100.0));

        // Adjust stock down: -15
        StockAdjustmentRequest adjustReq = new StockAdjustmentRequest(
            productNonBatch.getId(),
            StockMovementType.ADJUSTMENT_OUT,
            new BigDecimal("-15.000"),
            null,
            "Damaged items found",
            null,
            null
        );

        mockMvc.perform(post("/api/v1/inventory/adjustments")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(adjustReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.quantityDelta").value(-15.0))
            .andExpect(jsonPath("$.data.balanceAfter").value(85.0));

        // Verify inventory list
        mockMvc.perform(get("/api/v1/inventory")
                .header("Authorization", "Bearer " + cashierToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[0].currentStock").value(85.0));
    }

    @Test
    @Transactional
    @DisplayName("Batch stock adjustment, FEFO queries, and balance reconciliation invariant")
    void testBatchStockAdjustmentAndFefo() throws Exception {
        // Batch 1: Expiring in 6 months
        LocalDate exp1 = LocalDate.now().plusMonths(6);
        LocalDate mfg1 = LocalDate.now().minusMonths(1);
        String json1 = """
            {
              "productId": "%s",
              "movementType": "INITIAL_STOCK",
              "batchAdjustment": {
                "batchNumber": "MOX-001",
                "manufacturingDate": "%s",
                "expiryDate": "%s",
                "purchasePrice": 5.00,
                "mrp": 10.00,
                "sellingPrice": 9.50,
                "quantityDelta": 50.000
              },
              "reason": "Initial batch 1"
            }
        """.formatted(productBatch.getId(), mfg1, exp1);

        mockMvc.perform(post("/api/v1/inventory/adjustments")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json1))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.quantityDelta").value(50.0))
            .andExpect(jsonPath("$.data.balanceAfter").value(50.0));

        // Batch 2: Expiring in 18 months
        LocalDate exp2 = LocalDate.now().plusMonths(18);
        LocalDate mfg2 = LocalDate.now();
        String json2 = """
            {
              "productId": "%s",
              "movementType": "INITIAL_STOCK",
              "batchAdjustment": {
                "batchNumber": "MOX-002",
                "manufacturingDate": "%s",
                "expiryDate": "%s",
                "purchasePrice": 5.20,
                "mrp": 10.00,
                "sellingPrice": 9.80,
                "quantityDelta": 100.000
              },
              "reason": "Initial batch 2"
            }
        """.formatted(productBatch.getId(), mfg2, exp2);

        mockMvc.perform(post("/api/v1/inventory/adjustments")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json2))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.quantityDelta").value(100.0))
            .andExpect(jsonPath("$.data.balanceAfter").value(150.0));

        // Verify Invariant: current_stock == SUM(active batch quantities) == 150
        InventoryItem item = inventoryItemRepository.findByStoreIdAndProductIdAndBusinessId(
            storeA.getId(),
            productBatch.getId(),
            businessA.getId()
        ).orElseThrow();
        BigDecimal totalBatchStock = inventoryBatchRepository.sumActiveBatchQuantityByProduct(
            businessA.getId(),
            storeA.getId(),
            productBatch.getId()
        );
        assertThat(item.getCurrentStock()).isEqualByComparingTo("150.000");
        assertThat(item.getCurrentStock()).isEqualByComparingTo(totalBatchStock);

        // FEFO order: MOX-001 (expires in 6 months) must come before MOX-002 (expires in 18 months)
        mockMvc.perform(get("/api/v1/inventory/batches/fefo?productId=" + productBatch.getId())
                .header("Authorization", "Bearer " + cashierToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].batchNumber").value("MOX-001"))
            .andExpect(jsonPath("$.data[1].batchNumber").value("MOX-002"));

        // Near-expiry check (e.g. within 200 days includes batch 1 only)
        mockMvc.perform(get("/api/v1/inventory/batches?expiringWithinDays=200")
                .header("Authorization", "Bearer " + operatorToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(1))
            .andExpect(jsonPath("$.data.content[0].batchNumber").value("MOX-001"));
    }

    @Test
    @Transactional
    @DisplayName("Role authorization: CASHIER is denied stock adjustments and movement ledger")
    void testInventoryRoleAuthorization() throws Exception {
        StockAdjustmentRequest req = new StockAdjustmentRequest(
            productNonBatch.getId(),
            StockMovementType.INITIAL_STOCK,
            new BigDecimal("10.000"),
            null,
            "Unauthorized adjustment",
            null,
            null
        );

        // CASHIER adjustment -> 403 Forbidden
        mockMvc.perform(post("/api/v1/inventory/adjustments")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        // CASHIER movement ledger -> 403 Forbidden
        mockMvc.perform(get("/api/v1/inventory/movements")
                .header("Authorization", "Bearer " + cashierToken))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }
}
