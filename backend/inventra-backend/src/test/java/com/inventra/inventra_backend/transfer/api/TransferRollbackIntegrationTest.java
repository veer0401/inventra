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
import com.inventra.inventra_backend.inventory.domain.repository.InventoryBatchRepository;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryItemRepository;
import com.inventra.inventra_backend.inventory.domain.repository.StockMovementRepository;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import com.inventra.inventra_backend.transfer.api.dto.CreateTransferLineRequest;
import com.inventra.inventra_backend.transfer.api.dto.CreateTransferRequest;
import com.inventra.inventra_backend.transfer.api.dto.ShipTransferBatchAllocationRequest;
import com.inventra.inventra_backend.transfer.api.dto.ShipTransferLineRequest;
import com.inventra.inventra_backend.transfer.api.dto.ShipTransferRequest;
import com.inventra.inventra_backend.transfer.domain.model.TransferStatus;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TransferRollbackIntegrationTest {

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
    private InventoryBatch batchA;
    private String operatorToken;
    private String managerToken;

    @BeforeEach
    void setUp() {
        Business biz = businessRepository.save(Business.create("Transfer Rollback Corp", "TRF RLB", null, null));
        businessId = biz.getId();

        storeA = storeRepository.save(Store.create(businessId, "RLB-WH", "Rollback WH", true));
        storeB = storeRepository.save(Store.create(businessId, "RLB-RT", "Rollback RT", false));

        User op = userRepository.save(User.create("op." + UUID.randomUUID() + "@rlb.local", "hash", "Op RLB", null));
        User mgr = userRepository.save(User.create("mgr." + UUID.randomUUID() + "@rlb.local", "hash", "Mgr RLB", null));

        operatorToken = jwtTokenProvider.generateAccessToken(op.getId(), op.getEmail(), businessId, storeA.getId(), null, "INVENTORY_OPERATOR");
        managerToken = jwtTokenProvider.generateAccessToken(mgr.getId(), mgr.getEmail(), businessId, storeA.getId(), null, "MANAGER");

        product = productRepository.save(new Product(
            businessId,
            null, null,
            "Ciprofloxacin 500mg",
            "Ciprofloxacin",
            "Cifran",
            "Sun Pharma",
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

        itemA = new InventoryItem(businessId, storeA.getId(), product.getId(), null, null, null, null, null, true);
        itemA.adjustStock(new BigDecimal("50.000"));
        itemA = inventoryItemRepository.save(itemA);

        batchA = new InventoryBatch(
            businessId,
            storeA.getId(),
            product.getId(),
            itemA.getId(),
            "CIF-LOT-01",
            LocalDate.now().minusMonths(1),
            LocalDate.now().plusMonths(12),
            new BigDecimal("50.000"),
            new BigDecimal("20.00"),
            new BigDecimal("45.00"),
            new BigDecimal("40.00")
        );
        batchA = inventoryBatchRepository.save(batchA);
    }

    @Test
    @DisplayName("Shipment failure rolls back all stock deductions, batches, stock movements, and transfer state")
    void testShipmentAtomicRollback() throws Exception {
        long initialMovements = stockMovementRepository.count();

        // Create transfer for 30 strips (300 base units), but source only has 50 base units
        CreateTransferLineRequest lineReq = new CreateTransferLineRequest(product.getId(), new BigDecimal("30.000"), "STRIP", null);
        CreateTransferRequest createReq = new CreateTransferRequest(storeA.getId(), storeB.getId(), null, "IDEMP-RLB-SHIP", null, List.of(lineReq));

        MvcResult createResult = mockMvc.perform(post("/api/v1/transfers")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isCreated())
            .andReturn();

        var transferJson = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("data");
        UUID transferId = UUID.fromString(transferJson.get("id").asText());
        UUID transferLineId = UUID.fromString(transferJson.get("lines").get(0).get("id").asText());

        // Approve 300 base units
        mockMvc.perform(post("/api/v1/transfers/" + transferId + "/approve")
                .header("Authorization", "Bearer " + managerToken))
            .andExpect(status().isOk());

        // Attempt shipment with 300 base units -> fails with INSUFFICIENT_BATCH_STOCK
        ShipTransferBatchAllocationRequest shipAlloc = new ShipTransferBatchAllocationRequest(batchA.getId(), new BigDecimal("300.000"));
        ShipTransferLineRequest shipLine = new ShipTransferLineRequest(transferLineId, List.of(shipAlloc));
        ShipTransferRequest shipReq = new ShipTransferRequest("SHIP-FAIL-RLB", null, List.of(shipLine));

        mockMvc.perform(post("/api/v1/transfers/" + transferId + "/ship")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(shipReq)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.errorCode").value("INSUFFICIENT_BATCH_STOCK"));

        // Verify that InventoryItem stock is UNCHANGED
        InventoryItem itemAfter = inventoryItemRepository.findById(itemA.getId()).orElseThrow();
        assertThat(itemAfter.getCurrentStock()).isEqualByComparingTo("50.000");

        // Verify that InventoryBatch quantity is UNCHANGED
        InventoryBatch batchAfter = inventoryBatchRepository.findById(batchA.getId()).orElseThrow();
        assertThat(batchAfter.getQuantity()).isEqualByComparingTo("50.000");

        // Verify zero new StockMovements
        assertThat(stockMovementRepository.count()).isEqualTo(initialMovements);

        // Verify transfer status remained APPROVED (not IN_TRANSIT)
        var transferAfter = transferRepository.findById(transferId).orElseThrow();
        assertThat(transferAfter.getStatus()).isEqualTo(TransferStatus.APPROVED);
    }
}
