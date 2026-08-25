package com.inventra.inventra_backend.purchasing.api;

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
import com.inventra.inventra_backend.purchasing.api.dto.CreateGoodsReceiptLineRequest;
import com.inventra.inventra_backend.purchasing.api.dto.CreateGoodsReceiptRequest;
import com.inventra.inventra_backend.purchasing.api.dto.CreatePurchaseOrderLineRequest;
import com.inventra.inventra_backend.purchasing.api.dto.CreatePurchaseOrderRequest;
import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceipt;
import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceiptStatus;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrder;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrderStatus;
import com.inventra.inventra_backend.purchasing.domain.model.Supplier;
import com.inventra.inventra_backend.purchasing.domain.model.SupplierType;
import com.inventra.inventra_backend.purchasing.domain.repository.GoodsReceiptRepository;
import com.inventra.inventra_backend.purchasing.domain.repository.PurchaseOrderRepository;
import com.inventra.inventra_backend.purchasing.domain.repository.SupplierRepository;
import com.inventra.inventra_backend.purchasing.application.PurchaseOrderService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class GoodsReceiptControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository businessRepository;

    @Autowired
    private com.inventra.inventra_backend.tenant.domain.repository.StoreRepository storeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private PurchaseOrderService purchaseOrderService;

    @Autowired
    private GoodsReceiptRepository goodsReceiptRepository;

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private InventoryBatchRepository inventoryBatchRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private com.inventra.inventra_backend.tenant.domain.model.Business businessA;
    private com.inventra.inventra_backend.tenant.domain.model.Store storeA;
    private Supplier supplierA;
    private Product productBatch;
    private Product productNonBatch;
    private User ownerA;
    private String ownerTokenA;
    private String operatorTokenA;
    private String cashierTokenA;

    @BeforeEach
    void setUp() {
        businessA = businessRepository.save(com.inventra.inventra_backend.tenant.domain.model.Business.create("GR Test Biz", "GRTB", null, null));
        storeA = storeRepository.save(com.inventra.inventra_backend.tenant.domain.model.Store.create(businessA.getId(), "GRTS", "Store A", true));

        ownerA = userRepository.save(User.create("owner." + UUID.randomUUID() + "@grtb.local", "hash", "Owner A", null));
        User operatorA = userRepository.save(User.create("operator." + UUID.randomUUID() + "@grtb.local", "hash", "Operator A", null));
        User cashierA = userRepository.save(User.create("cashier." + UUID.randomUUID() + "@grtb.local", "hash", "Cashier A", null));

        supplierA = supplierRepository.save(new Supplier(
            businessA.getId(),
            "SUP-GR-01",
            "Apex Healthcare Supply",
            "Apex",
            SupplierType.DISTRIBUTOR,
            null, null, null, null, null, null, null, null, null, null, null, 30, null, null
        ));

        productBatch = productRepository.save(new Product(
            businessA.getId(),
            null, null,
            "Ciprofloxacin 500mg",
            "Ciprofloxacin", null, null,
            DosageForm.TABLET,
            "500mg", "TABLET", "STRIP", 10, null,
            new BigDecimal("12.00"),
            true, true
        ));

        productNonBatch = productRepository.save(new Product(
            businessA.getId(),
            null, null,
            "Cotton Bandage 10cm",
            null, null, null,
            DosageForm.DEVICE,
            null, "ROLL", "PACK", 10, null,
            BigDecimal.ZERO,
            true, false
        ));

        ownerTokenA = jwtTokenProvider.generateAccessToken(ownerA.getId(), ownerA.getEmail(), businessA.getId(), storeA.getId(), null, "OWNER");
        operatorTokenA = jwtTokenProvider.generateAccessToken(operatorA.getId(), operatorA.getEmail(), businessA.getId(), storeA.getId(), null, "INVENTORY_OPERATOR");
        cashierTokenA = jwtTokenProvider.generateAccessToken(cashierA.getId(), cashierA.getEmail(), businessA.getId(), storeA.getId(), null, "CASHIER");
    }

    @Test
    @Transactional
    @DisplayName("Posts GoodsReceipt: updates inventory stock, batch quantity, creates stock movement ledger, updates PO status")
    void testGoodsReceiptPostingAndInventoryIntegration() throws Exception {
        // Step 1: Create and Confirm a Purchase Order for productBatch (10 boxes = 100 tablets)
        var poResponse = purchaseOrderService.createPurchaseOrder(businessA.getId(), new CreatePurchaseOrderRequest(
            storeA.getId(),
            supplierA.getId(),
            LocalDate.now(),
            LocalDate.now().plusDays(5),
            BigDecimal.ZERO,
            "Monthly PO",
            List.of(new CreatePurchaseOrderLineRequest(
                productBatch.getId(),
                null,
                "BOX",
                10,
                new BigDecimal("10.000"), // 10 boxes
                new BigDecimal("100.0000"),
                BigDecimal.ZERO,
                new BigDecimal("12.00")
            ))
        ));

        var confirmedPo = purchaseOrderService.confirmPurchaseOrder(
            businessA.getId(),
            poResponse.id(),
            ownerA.getId()
        );
        UUID poLineId = confirmedPo.lines().get(0).id();

        // Step 2: Post Goods Receipt for 6 boxes against PO line
        CreateGoodsReceiptRequest grReq = new CreateGoodsReceiptRequest(
            storeA.getId(),
            supplierA.getId(),
            confirmedPo.id(),
            "DC-9988",
            LocalDate.now(),
            "Partial receipt",
            "IDEMP-KEY-001",
            List.of(new CreateGoodsReceiptLineRequest(
                poLineId,
                productBatch.getId(),
                new BigDecimal("6.000"), // 6 boxes = 60 base tablets
                "BOX",
                10,
                BigDecimal.ZERO,
                "BATCH-CIPRO-1",
                LocalDate.now().minusMonths(1),
                LocalDate.now().plusMonths(24),
                new BigDecimal("100.0000"),
                new BigDecimal("15.00"),
                new BigDecimal("14.00"),
                new BigDecimal("12.00")
            ))
        );

        MvcResult grResult = mockMvc.perform(post("/api/v1/goods-receipts")
                .header("Authorization", "Bearer " + operatorTokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(grReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.status").value("DRAFT"))
            .andReturn();

        String grId = objectMapper.readTree(grResult.getResponse().getContentAsString())
            .get("data").get("id").asText();

        // Step 3: Post the GRN as Operator
        mockMvc.perform(post("/api/v1/goods-receipts/" + grId + "/post")
                .header("Authorization", "Bearer " + operatorTokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("POSTED"));

        // Step 4: Verify Inventory Item Stock is now 60.000
        InventoryItem item = inventoryItemRepository.findByStoreIdAndProductIdAndBusinessId(
            storeA.getId(),
            productBatch.getId(),
            businessA.getId()
        ).orElseThrow();
        assertThat(item.getCurrentStock()).isEqualByComparingTo("60.000");

        // Step 5: Verify Batch is created with 60.000 quantity
        InventoryBatch batch = inventoryBatchRepository.findByStoreIdAndProductIdAndBatchNumber(
            storeA.getId(),
            productBatch.getId(),
            "BATCH-CIPRO-1"
        ).orElseThrow();
        assertThat(batch.getQuantity()).isEqualByComparingTo("60.000");

        // Step 6: Verify Stock Movement is created with type PURCHASE_RECEIPT and reference GOODS_RECEIPT
        List<StockMovement> movements = stockMovementRepository.findAll();
        StockMovement sm = movements.stream()
            .filter(m -> m.getReferenceId().equals(UUID.fromString(grId)))
            .findFirst()
            .orElseThrow();
        assertThat(sm.getMovementType()).isEqualTo(StockMovementType.PURCHASE_RECEIPT);
        assertThat(sm.getQuantityDelta()).isEqualByComparingTo("60.000");
        assertThat(sm.getBalanceAfter()).isEqualByComparingTo("60.000");

        // Step 7: Verify PO is now PARTIALLY_RECEIVED
        PurchaseOrder po = purchaseOrderRepository.findById(confirmedPo.id()).orElseThrow();
        assertThat(po.getStatus()).isEqualTo(PurchaseOrderStatus.PARTIALLY_RECEIVED);

        // Step 8: Over-receipt rejected: attempting to receive 5 boxes when only 4 remain on PO line (6 + 5 = 11 > 10)
        CreateGoodsReceiptRequest grReqOver = new CreateGoodsReceiptRequest(
            storeA.getId(),
            supplierA.getId(),
            confirmedPo.id(),
            "DC-9990",
            LocalDate.now(),
            "Over-receipt attempt",
            null,
            List.of(new CreateGoodsReceiptLineRequest(
                poLineId,
                productBatch.getId(),
                new BigDecimal("5.000"), // 5 boxes when only 4 remain
                "BOX",
                10,
                BigDecimal.ZERO,
                "BATCH-CIPRO-1",
                LocalDate.now().minusMonths(1),
                LocalDate.now().plusMonths(24),
                new BigDecimal("100.0000"),
                new BigDecimal("15.00"),
                new BigDecimal("14.00"),
                new BigDecimal("12.00")
            ))
        );

        MvcResult grResultOver = mockMvc.perform(post("/api/v1/goods-receipts")
                .header("Authorization", "Bearer " + operatorTokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(grReqOver)))
            .andExpect(status().isCreated())
            .andReturn();

        String grIdOver = objectMapper.readTree(grResultOver.getResponse().getContentAsString())
            .get("data").get("id").asText();

        mockMvc.perform(post("/api/v1/goods-receipts/" + grIdOver + "/post")
                .header("Authorization", "Bearer " + operatorTokenA))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.errorCode").value("OVER_RECEIPT_NOT_PERMITTED"));

        // Step 9: Receive the remaining valid batch quantity (4 boxes) -> batch quantity increases to 100
        CreateGoodsReceiptRequest grReq2 = new CreateGoodsReceiptRequest(
            storeA.getId(),
            supplierA.getId(),
            confirmedPo.id(),
            "DC-9989",
            LocalDate.now(),
            "Final receipt",
            "IDEMP-KEY-002",
            List.of(new CreateGoodsReceiptLineRequest(
                poLineId,
                productBatch.getId(),
                new BigDecimal("4.000"), // 4 boxes = 40 base units
                "BOX",
                10,
                BigDecimal.ZERO,
                "BATCH-CIPRO-1",
                LocalDate.now().minusMonths(1),
                LocalDate.now().plusMonths(24),
                new BigDecimal("100.0000"),
                new BigDecimal("15.00"),
                new BigDecimal("14.00"),
                new BigDecimal("12.00")
            ))
        );

        MvcResult grResult2 = mockMvc.perform(post("/api/v1/goods-receipts")
                .header("Authorization", "Bearer " + operatorTokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(grReq2)))
            .andExpect(status().isCreated())
            .andReturn();

        String grId2 = objectMapper.readTree(grResult2.getResponse().getContentAsString())
            .get("data").get("id").asText();

        mockMvc.perform(post("/api/v1/goods-receipts/" + grId2 + "/post")
                .header("Authorization", "Bearer " + operatorTokenA))
            .andExpect(status().isOk());

        // Batch quantity should now be 60 + 40 = 100.000
        batch = inventoryBatchRepository.findByStoreIdAndProductIdAndBatchNumber(
            storeA.getId(),
            productBatch.getId(),
            "BATCH-CIPRO-1"
        ).orElseThrow();
        assertThat(batch.getQuantity()).isEqualByComparingTo("100.000");

        // PO status should now be FULLY_RECEIVED
        po = purchaseOrderRepository.findById(confirmedPo.id()).orElseThrow();
        assertThat(po.getStatus()).isEqualTo(PurchaseOrderStatus.FULLY_RECEIVED);

        // Step 10: Incompatible batch expiry mismatch rejected
        CreateGoodsReceiptRequest grReqMismatch = new CreateGoodsReceiptRequest(
            storeA.getId(),
            supplierA.getId(),
            null,
            "DC-MISMATCH",
            LocalDate.now(),
            "Expiry mismatch test",
            null,
            List.of(new CreateGoodsReceiptLineRequest(
                null,
                productBatch.getId(),
                new BigDecimal("2.000"),
                "BOX",
                10,
                BigDecimal.ZERO,
                "BATCH-CIPRO-1", // Same batch number
                LocalDate.now(),
                LocalDate.now().plusMonths(36), // DIFFERENT expiry date!
                new BigDecimal("100.0000"),
                new BigDecimal("15.00"),
                new BigDecimal("14.00"),
                new BigDecimal("12.00")
            ))
        );

        MvcResult grMismatchRes = mockMvc.perform(post("/api/v1/goods-receipts")
                .header("Authorization", "Bearer " + operatorTokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(grReqMismatch)))
            .andExpect(status().isCreated())
            .andReturn();

        String grIdMismatch = objectMapper.readTree(grMismatchRes.getResponse().getContentAsString())
            .get("data").get("id").asText();

        mockMvc.perform(post("/api/v1/goods-receipts/" + grIdMismatch + "/post")
                .header("Authorization", "Bearer " + operatorTokenA))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.errorCode").value("BATCH_EXPIRY_MISMATCH"));

        // Step 11: Idempotency test: Re-posting with IDEMP-KEY-001 returns existing without duplicate stock
        mockMvc.perform(post("/api/v1/goods-receipts")
                .header("Authorization", "Bearer " + operatorTokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(grReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.id").value(grId));

        // Step 12: Cashier role is 403 Forbidden
        mockMvc.perform(get("/api/v1/goods-receipts")
                .header("Authorization", "Bearer " + cashierTokenA))
            .andExpect(status().isForbidden());
    }
}
