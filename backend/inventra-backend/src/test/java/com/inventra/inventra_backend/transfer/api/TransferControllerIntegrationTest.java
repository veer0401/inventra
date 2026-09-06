package com.inventra.inventra_backend.transfer.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.security.JwtTokenProvider;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.inventory.domain.model.InventoryBatch;
import com.inventra.inventra_backend.inventory.domain.model.InventoryItem;
import com.inventra.inventra_backend.inventory.domain.model.StockMovement;
import com.inventra.inventra_backend.inventory.domain.model.StockMovementType;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryBatchRepository;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryItemRepository;
import com.inventra.inventra_backend.inventory.domain.repository.StockMovementRepository;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import com.inventra.inventra_backend.transfer.api.dto.ApproveTransferRequest;
import com.inventra.inventra_backend.transfer.api.dto.CreateTransferLineRequest;
import com.inventra.inventra_backend.transfer.api.dto.CreateTransferRequest;
import com.inventra.inventra_backend.transfer.api.dto.ReceiveTransferBatchAllocationRequest;
import com.inventra.inventra_backend.transfer.api.dto.ReceiveTransferLineRequest;
import com.inventra.inventra_backend.transfer.api.dto.ReceiveTransferRequest;
import com.inventra.inventra_backend.transfer.api.dto.ShipTransferBatchAllocationRequest;
import com.inventra.inventra_backend.transfer.api.dto.ShipTransferLineRequest;
import com.inventra.inventra_backend.transfer.api.dto.ShipTransferRequest;
import com.inventra.inventra_backend.transfer.domain.repository.InventoryTransferRepository;
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
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TransferControllerIntegrationTest {

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

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private InventoryBatchRepository inventoryBatchRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @Autowired
    private InventoryTransferRepository transferRepository;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private UUID businessId;
    private Store storeA;
    private Store storeB;
    private Product product;
    private InventoryItem itemA;
    private InventoryBatch batchA1;
    private InventoryBatch batchA2;

    private String ownerToken;
    private String managerToken;
    private String operatorToken;
    private String cashierToken;

    @BeforeEach
    void setUp() {
        Business biz = businessRepository.save(Business.create("Transfer Test Corp", "TRF Corp", null, null));
        businessId = biz.getId();

        storeA = storeRepository.save(Store.create(businessId, "WH-01", "Central Warehouse", true));
        storeB = storeRepository.save(Store.create(businessId, "RT-02", "Retail Branch 2", false));

        User owner = userRepository.save(User.create("owner." + UUID.randomUUID() + "@trf.local", "hash", "Owner TRF", null));
        User manager = userRepository.save(User.create("manager." + UUID.randomUUID() + "@trf.local", "hash", "Manager TRF", null));
        User operator = userRepository.save(User.create("op." + UUID.randomUUID() + "@trf.local", "hash", "Operator TRF", null));
        User cashier = userRepository.save(User.create("cashier." + UUID.randomUUID() + "@trf.local", "hash", "Cashier TRF", null));

        ownerToken = jwtTokenProvider.generateAccessToken(owner.getId(), owner.getEmail(), businessId, storeA.getId(), null, "OWNER");
        managerToken = jwtTokenProvider.generateAccessToken(manager.getId(), manager.getEmail(), businessId, storeA.getId(), null, "MANAGER");
        operatorToken = jwtTokenProvider.generateAccessToken(operator.getId(), operator.getEmail(), businessId, storeA.getId(), null, "INVENTORY_OPERATOR");
        cashierToken = jwtTokenProvider.generateAccessToken(cashier.getId(), cashier.getEmail(), businessId, storeA.getId(), null, "CASHIER");

        product = productRepository.save(new Product(
            businessId,
            null, null,
            "Amoxicillin 500mg",
            "Amoxicillin",
            "Mox",
            "Sun Pharma",
            DosageForm.CAPSULE,
            "500mg",
            "CAPSULE",
            "STRIP",
            10, // 1 strip = 10 capsules
            "30049099",
            new BigDecimal("12.00"),
            true,
            true
        ));

        itemA = new InventoryItem(businessId, storeA.getId(), product.getId(), null, null, null, null, null, true);
        itemA.adjustStock(new BigDecimal("200.000")); // 20 strips = 200 capsules
        itemA = inventoryItemRepository.save(itemA);

        batchA1 = new InventoryBatch(
            businessId,
            storeA.getId(),
            product.getId(),
            itemA.getId(),
            "MOX-LOT-01",
            LocalDate.now().minusMonths(1),
            LocalDate.now().plusMonths(12),
            new BigDecimal("100.000"),
            new BigDecimal("10.00"),
            new BigDecimal("25.00"),
            new BigDecimal("20.00")
        );
        batchA1 = inventoryBatchRepository.save(batchA1);

        batchA2 = new InventoryBatch(
            businessId,
            storeA.getId(),
            product.getId(),
            itemA.getId(),
            "MOX-LOT-02",
            LocalDate.now().minusMonths(2),
            LocalDate.now().plusMonths(18),
            new BigDecimal("100.000"),
            new BigDecimal("11.00"),
            new BigDecimal("25.00"),
            new BigDecimal("20.00")
        );
        batchA2 = inventoryBatchRepository.save(batchA2);
    }

    @Test
    @Transactional
    @DisplayName("Complete transfer lifecycle: Request -> Approve -> Ship -> Multi-Tranche Receive")
    void testCompleteTransferLifecycle() throws Exception {
        // 1. Destination requests 15 strips (150 capsules)
        CreateTransferLineRequest lineReq = new CreateTransferLineRequest(
            product.getId(),
            new BigDecimal("15.000"),
            "STRIP",
            "Urgent replenishment"
        );

        CreateTransferRequest createReq = new CreateTransferRequest(
            storeA.getId(),
            storeB.getId(),
            LocalDate.now().plusDays(2),
            "IDEMP-TR-CREATE-01",
            "Weekly transfer",
            List.of(lineReq)
        );

        MvcResult createResult = mockMvc.perform(post("/api/v1/transfers")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("REQUESTED"))
            .andExpect(jsonPath("$.data.lines", hasSize(1)))
            .andReturn();

        var transferJson = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("data");
        UUID transferId = UUID.fromString(transferJson.get("id").asText());
        UUID transferLineId = UUID.fromString(transferJson.get("lines").get(0).get("id").asText());

        // Idempotency check on Create
        mockMvc.perform(post("/api/v1/transfers")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.id").value(transferId.toString()));

        // 2. Manager approves 10 strips (100 capsules)
        ApproveTransferRequest approveReq = new ApproveTransferRequest(
            "Approved 10 strips only due to warehouse stock constraints",
            List.of(new com.inventra.inventra_backend.transfer.api.dto.ApproveTransferLineRequest(transferLineId, new BigDecimal("10.000")))
        );

        mockMvc.perform(post("/api/v1/transfers/" + transferId + "/approve")
                .header("Authorization", "Bearer " + managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(approveReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("APPROVED"))
            .andExpect(jsonPath("$.data.lines[0].approvedQuantity").value(10.0))
            .andExpect(jsonPath("$.data.lines[0].approvedBaseQuantity").value(100.0));

        // 3. Source ships 10 strips (100 capsules) across 2 batches (60 from LOT-01, 40 from LOT-02)
        ShipTransferBatchAllocationRequest shipAlloc1 = new ShipTransferBatchAllocationRequest(batchA1.getId(), new BigDecimal("60.000"));
        ShipTransferBatchAllocationRequest shipAlloc2 = new ShipTransferBatchAllocationRequest(batchA2.getId(), new BigDecimal("40.000"));
        ShipTransferLineRequest shipLine = new ShipTransferLineRequest(transferLineId, List.of(shipAlloc1, shipAlloc2));
        ShipTransferRequest shipReq = new ShipTransferRequest("IDEMP-TR-SHIP-01", "Shipped via van", List.of(shipLine));

        mockMvc.perform(post("/api/v1/transfers/" + transferId + "/ship")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(shipReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("IN_TRANSIT"))
            .andExpect(jsonPath("$.data.batchAllocations", hasSize(2)));

        // Verify source inventory deduction and StockMovement(TRANSFER_OUT)
        InventoryItem itemAAfterShip = inventoryItemRepository.findById(itemA.getId()).orElseThrow();
        InventoryBatch b1AfterShip = inventoryBatchRepository.findById(batchA1.getId()).orElseThrow();
        InventoryBatch b2AfterShip = inventoryBatchRepository.findById(batchA2.getId()).orElseThrow();

        assertThat(itemAAfterShip.getCurrentStock()).isEqualByComparingTo("100.000"); // 200 - 100 = 100
        assertThat(b1AfterShip.getQuantity()).isEqualByComparingTo("40.000"); // 100 - 60 = 40
        assertThat(b2AfterShip.getQuantity()).isEqualByComparingTo("60.000"); // 100 - 40 = 60

        List<StockMovement> outMovements = stockMovementRepository.findAll().stream()
            .filter(m -> m.getMovementType() == StockMovementType.TRANSFER_OUT)
            .toList();
        assertThat(outMovements).hasSize(2);

        // Retrieve transfer allocations
        var shipJson = objectMapper.readTree(
            mockMvc.perform(get("/api/v1/transfers/" + transferId)
                    .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()
        ).get("data");

        UUID allocId1 = UUID.fromString(shipJson.get("batchAllocations").get(0).get("id").asText());
        UUID allocId2 = UUID.fromString(shipJson.get("batchAllocations").get(1).get("id").asText());

        // 4. Tranche 1 Receive: Receive 60 capsules of LOT-01
        ReceiveTransferBatchAllocationRequest recAlloc1 = new ReceiveTransferBatchAllocationRequest(allocId1, new BigDecimal("60.000"));
        ReceiveTransferLineRequest recLine1 = new ReceiveTransferLineRequest(transferLineId, List.of(recAlloc1));
        ReceiveTransferRequest recReq1 = new ReceiveTransferRequest("IDEMP-TR-REC-01", "Van delivered LOT-01 first", List.of(recLine1));

        mockMvc.perform(post("/api/v1/transfers/" + transferId + "/receive")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(recReq1)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true));

        // Transfer status must now be PARTIALLY_RECEIVED
        mockMvc.perform(get("/api/v1/transfers/" + transferId)
                .header("Authorization", "Bearer " + managerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("PARTIALLY_RECEIVED"));

        // Verify destination stock increment
        InventoryItem itemBAfterTranche1 = inventoryItemRepository.findByStoreIdAndProductIdAndBusinessId(storeB.getId(), product.getId(), businessId).orElseThrow();
        assertThat(itemBAfterTranche1.getCurrentStock()).isEqualByComparingTo("60.000");

        // 5. Tranche 2 Receive: Receive remaining 40 capsules of LOT-02
        ReceiveTransferBatchAllocationRequest recAlloc2 = new ReceiveTransferBatchAllocationRequest(allocId2, new BigDecimal("40.000"));
        ReceiveTransferLineRequest recLine2 = new ReceiveTransferLineRequest(transferLineId, List.of(recAlloc2));
        ReceiveTransferRequest recReq2 = new ReceiveTransferRequest("IDEMP-TR-REC-02", "Van delivered LOT-02 balance", List.of(recLine2));

        mockMvc.perform(post("/api/v1/transfers/" + transferId + "/receive")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(recReq2)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true));

        // Transfer status must now be RECEIVED
        mockMvc.perform(get("/api/v1/transfers/" + transferId)
                .header("Authorization", "Bearer " + managerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("RECEIVED"));

        // Destination store stock now 100.000
        InventoryItem itemBFinal = inventoryItemRepository.findByStoreIdAndProductIdAndBusinessId(storeB.getId(), product.getId(), businessId).orElseThrow();
        assertThat(itemBFinal.getCurrentStock()).isEqualByComparingTo("100.000");

        // Verify batch metadata and manufacturing date preservation at destination store
        InventoryBatch destBatch1 = inventoryBatchRepository.findByBusinessIdAndStoreIdAndProductIdAndBatchNumber(businessId, storeB.getId(), product.getId(), "MOX-LOT-01").orElseThrow();
        assertThat(destBatch1.getManufacturingDate()).isEqualTo(batchA1.getManufacturingDate());
        assertThat(destBatch1.getExpiryDate()).isEqualTo(batchA1.getExpiryDate());
        assertThat(destBatch1.getPurchasePrice()).isEqualByComparingTo(batchA1.getPurchasePrice());
        assertThat(destBatch1.getMrp()).isEqualByComparingTo(batchA1.getMrp());
        assertThat(destBatch1.getSellingPrice()).isEqualByComparingTo(batchA1.getSellingPrice());

        // Verify 2 TRANSFER_IN movements created
        List<StockMovement> inMovements = stockMovementRepository.findAll().stream()
            .filter(m -> m.getMovementType() == StockMovementType.TRANSFER_IN)
            .toList();
        assertThat(inMovements).hasSize(2);
    }

    @Test
    @Transactional
    @DisplayName("Shipment must be all-or-nothing and rejects mismatched allocation quantity")
    void testAllOrNothingShipmentRejection() throws Exception {
        CreateTransferLineRequest lineReq = new CreateTransferLineRequest(
            product.getId(),
            new BigDecimal("5.000"), // 5 strips = 50 capsules
            "STRIP",
            null
        );

        CreateTransferRequest createReq = new CreateTransferRequest(
            storeA.getId(),
            storeB.getId(),
            null,
            "IDEMP-MISMATCH-TEST",
            null,
            List.of(lineReq)
        );

        MvcResult createResult = mockMvc.perform(post("/api/v1/transfers")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isCreated())
            .andReturn();

        var transferJson = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("data");
        UUID transferId = UUID.fromString(transferJson.get("id").asText());
        UUID transferLineId = UUID.fromString(transferJson.get("lines").get(0).get("id").asText());

        // Approve 5 strips (50 capsules)
        mockMvc.perform(post("/api/v1/transfers/" + transferId + "/approve")
                .header("Authorization", "Bearer " + managerToken))
            .andExpect(status().isOk());

        // Attempt to ship only 30 capsules -> fails with 422 SHIPMENT_QUANTITY_MISMATCH
        ShipTransferBatchAllocationRequest shipAlloc = new ShipTransferBatchAllocationRequest(batchA1.getId(), new BigDecimal("30.000"));
        ShipTransferLineRequest shipLine = new ShipTransferLineRequest(transferLineId, List.of(shipAlloc));
        ShipTransferRequest shipReq = new ShipTransferRequest("SHIP-FAIL-IDEMP", null, List.of(shipLine));

        mockMvc.perform(post("/api/v1/transfers/" + transferId + "/ship")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(shipReq)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.errorCode").value("SHIPMENT_QUANTITY_MISMATCH"));
    }

    @Test
    @Transactional
    @DisplayName("Role security matrix: Cashier denied 403, Operator denied approve 403")
    void testRoleSecurityMatrix() throws Exception {
        CreateTransferLineRequest lineReq = new CreateTransferLineRequest(
            product.getId(), new BigDecimal("2.000"), "STRIP", null
        );
        CreateTransferRequest createReq = new CreateTransferRequest(
            storeA.getId(), storeB.getId(), null, "IDEMP-SEC-TEST", null, List.of(lineReq)
        );

        // Cashier denied POST /transfers (403)
        mockMvc.perform(post("/api/v1/transfers")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isForbidden());

        // Operator creates transfer
        MvcResult createResult = mockMvc.perform(post("/api/v1/transfers")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isCreated())
            .andReturn();

        UUID transferId = UUID.fromString(objectMapper.readTree(createResult.getResponse().getContentAsString()).get("data").get("id").asText());

        // Operator denied POST /transfers/{id}/approve (403)
        mockMvc.perform(post("/api/v1/transfers/" + transferId + "/approve")
                .header("Authorization", "Bearer " + operatorToken))
            .andExpect(status().isForbidden());

        // Cashier denied GET /transfers (403)
        mockMvc.perform(get("/api/v1/transfers")
                .header("Authorization", "Bearer " + cashierToken))
            .andExpect(status().isForbidden());
    }
}
