package com.inventra.inventra_backend.sales.api;

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
import com.inventra.inventra_backend.sales.api.dto.CreateSaleLineRequest;
import com.inventra.inventra_backend.sales.api.dto.CreateSalePaymentRequest;
import com.inventra.inventra_backend.sales.api.dto.CreateSaleRequest;
import com.inventra.inventra_backend.sales.api.dto.VoidSaleRequest;
import com.inventra.inventra_backend.sales.domain.model.PaymentMethod;
import com.inventra.inventra_backend.sales.domain.model.Sale;
import com.inventra.inventra_backend.sales.domain.model.SaleStatus;
import com.inventra.inventra_backend.sales.domain.repository.SaleLineBatchAllocationRepository;
import com.inventra.inventra_backend.sales.domain.repository.SaleRepository;
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
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SaleControllerIntegrationTest {

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
    private SaleRepository saleRepository;

    @Autowired
    private SaleLineBatchAllocationRepository saleLineBatchAllocationRepository;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private UUID businessId;
    private UUID storeId;
    private UUID cashierId;
    private UUID managerId;
    private UUID operatorId;

    private String cashierToken;
    private String managerToken;
    private String operatorToken;

    private Product batchProduct;
    private InventoryItem batchItem;
    private InventoryBatch batchA;
    private InventoryBatch batchB;

    @BeforeEach
    void setUp() {
        Business biz = businessRepository.save(Business.create("Inventra POS Pharmacy", "POS Corp", null, null));
        businessId = biz.getId();

        Store store = storeRepository.save(Store.create(businessId, "CTR-01", "Counter One", true));
        storeId = store.getId();

        User cashier = userRepository.save(User.create("cashier." + UUID.randomUUID() + "@inventra.local", "hashedPassword", "Main Cashier", null));
        cashierId = cashier.getId();
        cashierToken = jwtTokenProvider.generateAccessToken(cashierId, cashier.getEmail(), businessId, storeId, null, "CASHIER");

        User manager = userRepository.save(User.create("manager." + UUID.randomUUID() + "@inventra.local", "hashedPassword", "Store Manager", null));
        managerId = manager.getId();
        managerToken = jwtTokenProvider.generateAccessToken(managerId, manager.getEmail(), businessId, storeId, null, "MANAGER");

        User operator = userRepository.save(User.create("op." + UUID.randomUUID() + "@inventra.local", "hashedPassword", "Inv Operator", null));
        operatorId = operator.getId();
        operatorToken = jwtTokenProvider.generateAccessToken(operatorId, operator.getEmail(), businessId, storeId, null, "INVENTORY_OPERATOR");

        // Batch Tracked Product
        batchProduct = productRepository.save(new Product(
            businessId,
            null, null,
            "Augmentin 625 Duo",
            "Amoxycillin and Potassium Clavulanate",
            "Augmentin",
            "GSK",
            DosageForm.TABLET,
            "625mg",
            "TABLET",
            "STRIP",
            10, // 1 strip = 10 tablets
            "30049099",
            new BigDecimal("12.00"), // 12% tax
            true,
            true
        ));

        batchItem = new InventoryItem(businessId, storeId, batchProduct.getId(), null, null, null, null, null, true);
        batchItem.adjustStock(new BigDecimal("150.000")); // Total 150 tablets (15 strips)
        batchItem = inventoryItemRepository.save(batchItem);

        // Batch A: 50 tablets expiring in 3 months @ sellingPrice 200.00 / strip (20.00 / tab)
        batchA = new InventoryBatch(
            businessId,
            storeId,
            batchProduct.getId(),
            batchItem.getId(),
            "AUG-B1",
            LocalDate.now().minusMonths(1),
            LocalDate.now().plusMonths(3),
            new BigDecimal("50.000"),
            new BigDecimal("15.00"),
            new BigDecimal("22.00"),
            new BigDecimal("20.00")
        );
        batchA = inventoryBatchRepository.save(batchA);

        // Batch B: 100 tablets expiring in 9 months @ sellingPrice 200.00 / strip (20.00 / tab)
        batchB = new InventoryBatch(
            businessId,
            storeId,
            batchProduct.getId(),
            batchItem.getId(),
            "AUG-B2",
            LocalDate.now().minusMonths(1),
            LocalDate.now().plusMonths(9),
            new BigDecimal("100.000"),
            new BigDecimal("15.00"),
            new BigDecimal("22.00"),
            new BigDecimal("20.00")
        );
        batchB = inventoryBatchRepository.save(batchB);
    }

    @Test
    @Transactional
    @DisplayName("Complete POS checkout allocates FEFO multi-batch stock and records payment")
    void testCheckoutMultiBatchFEFO() throws Exception {
        CreateSaleLineRequest lineReq = new CreateSaleLineRequest(
            batchProduct.getId(),
            new BigDecimal("8.000"),
            "STRIP",
            BigDecimal.ZERO,
            null // Automatic FEFO
        );

        CreateSalePaymentRequest payReq = new CreateSalePaymentRequest(
            PaymentMethod.CASH,
            new BigDecimal("179.2000"),
            new BigDecimal("200.0000"),
            null,
            "Exact Cash"
        );

        CreateSaleRequest request = new CreateSaleRequest(
            storeId,
            LocalDate.now(),
            "Alice Smith",
            "9988776655",
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            "SALE-IDEMP-001",
            "First checkout test",
            List.of(lineReq),
            List.of(payReq)
        );

        MvcResult result = mockMvc.perform(post("/api/v1/sales")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("COMPLETED"))
            .andExpect(jsonPath("$.data.subtotal").value(160.0))
            .andExpect(jsonPath("$.data.taxAmount").value(19.2))
            .andExpect(jsonPath("$.data.totalAmount").value(179.2))
            .andExpect(jsonPath("$.data.paidAmount").value(179.2))
            .andExpect(jsonPath("$.data.changeAmount").value(20.8))
            .andExpect(jsonPath("$.data.lines", hasSize(1)))
            .andExpect(jsonPath("$.data.lines[0].batchAllocations", hasSize(2)))
            .andReturn();

        // Verify inventory deductions
        InventoryBatch updatedA = inventoryBatchRepository.findById(batchA.getId()).orElseThrow();
        InventoryBatch updatedB = inventoryBatchRepository.findById(batchB.getId()).orElseThrow();
        InventoryItem updatedItem = inventoryItemRepository.findById(batchItem.getId()).orElseThrow();

        assertThat(updatedA.getQuantity()).isEqualByComparingTo("0.000"); // 50 - 50 = 0
        assertThat(updatedB.getQuantity()).isEqualByComparingTo("70.000"); // 100 - 30 = 70
        assertThat(updatedItem.getCurrentStock()).isEqualByComparingTo("70.000"); // 150 - 80 = 70

        // Verify 2 Stock Movements of type SALE created for this business
        List<StockMovement> movements = stockMovementRepository.findAll().stream()
            .filter(m -> m.getMovementType() == StockMovementType.SALE && m.getBusinessId().equals(businessId))
            .toList();
        assertThat(movements).hasSize(2);
    }

    @Test
    @Transactional
    @DisplayName("Incomplete payment is rejected with 422 PAYMENT_AMOUNT_MISMATCH")
    void testIncompletePaymentRejection() throws Exception {
        CreateSaleLineRequest lineReq = new CreateSaleLineRequest(
            batchProduct.getId(),
            new BigDecimal("1.000"), // 10 tabs * 20 = 20.00 + 2.40 tax = 22.40
            "STRIP",
            BigDecimal.ZERO,
            null
        );

        CreateSalePaymentRequest payReq = new CreateSalePaymentRequest(
            PaymentMethod.UPI,
            new BigDecimal("20.0000"), // Paid 20.00 instead of 22.40
            null,
            "UPI-REF-01",
            null
        );

        CreateSaleRequest request = new CreateSaleRequest(
            storeId,
            LocalDate.now(),
            null, null,
            BigDecimal.ZERO, BigDecimal.ZERO,
            "IDEMP-FAIL-PAY",
            null,
            List.of(lineReq),
            List.of(payReq)
        );

        mockMvc.perform(post("/api/v1/sales")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.errorCode").value("PAYMENT_AMOUNT_MISMATCH"));
    }

    @Test
    @Transactional
    @DisplayName("Idempotency key replay returns existing sale without double deduction")
    void testIdempotencyReplay() throws Exception {
        CreateSaleLineRequest lineReq = new CreateSaleLineRequest(
            batchProduct.getId(),
            new BigDecimal("1.000"),
            "STRIP",
            BigDecimal.ZERO,
            null
        );

        CreateSalePaymentRequest payReq = new CreateSalePaymentRequest(
            PaymentMethod.CASH,
            new BigDecimal("22.4000"),
            new BigDecimal("22.4000"),
            null, null
        );

        CreateSaleRequest request = new CreateSaleRequest(
            storeId,
            LocalDate.now(),
            null, null,
            BigDecimal.ZERO, BigDecimal.ZERO,
            "IDEMP-REPLAY-TEST",
            null,
            List.of(lineReq),
            List.of(payReq)
        );

        // First call
        mockMvc.perform(post("/api/v1/sales")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated());

        InventoryItem afterFirst = inventoryItemRepository.findById(batchItem.getId()).orElseThrow();
        assertThat(afterFirst.getCurrentStock()).isEqualByComparingTo("140.000"); // 150 - 10 = 140

        // Second call with same idempotency key returns created/ok
        mockMvc.perform(post("/api/v1/sales")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated());

        InventoryItem afterSecond = inventoryItemRepository.findById(batchItem.getId()).orElseThrow();
        assertThat(afterSecond.getCurrentStock()).isEqualByComparingTo("140.000"); // Unchanged!
    }

    @Test
    @Transactional
    @DisplayName("Voiding a sale reverses inventory with StockMovement SALE_VOID and requires Manager role")
    void testVoidSaleWorkflow() throws Exception {
        CreateSaleLineRequest lineReq = new CreateSaleLineRequest(
            batchProduct.getId(),
            new BigDecimal("2.000"), // 20 tabs -> 44.80 total
            "STRIP",
            BigDecimal.ZERO,
            null
        );

        CreateSalePaymentRequest payReq = new CreateSalePaymentRequest(
            PaymentMethod.CASH,
            new BigDecimal("44.8000"),
            new BigDecimal("50.0000"),
            null, null
        );

        CreateSaleRequest request = new CreateSaleRequest(
            storeId,
            LocalDate.now(),
            null, null,
            BigDecimal.ZERO, BigDecimal.ZERO,
            "IDEMP-VOID-TEST",
            null,
            List.of(lineReq),
            List.of(payReq)
        );

        MvcResult createResult = mockMvc.perform(post("/api/v1/sales")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andReturn();

        String saleIdStr = objectMapper.readTree(createResult.getResponse().getContentAsString())
            .get("data").get("id").asText();
        UUID saleId = UUID.fromString(saleIdStr);

        // Cashier tries to void -> 403 Forbidden
        VoidSaleRequest voidReq = new VoidSaleRequest("Customer cancelled order immediately");
        mockMvc.perform(post("/api/v1/sales/" + saleId + "/void")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(voidReq)))
            .andExpect(status().isForbidden());

        // Manager voids sale -> 200 OK
        mockMvc.perform(post("/api/v1/sales/" + saleId + "/void")
                .header("Authorization", "Bearer " + managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(voidReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("VOIDED"));

        // Verify stock is fully restored
        InventoryItem restoredItem = inventoryItemRepository.findById(batchItem.getId()).orElseThrow();
        assertThat(restoredItem.getCurrentStock()).isEqualByComparingTo("150.000");

        // Verify SALE_VOID movement
        boolean voidMovementExists = stockMovementRepository.findAll().stream()
            .anyMatch(m -> m.getMovementType() == StockMovementType.SALE_VOID);
        assertThat(voidMovementExists).isTrue();
    }

    @Test
    @Transactional
    @DisplayName("Invoice and Receipt endpoints return formatted commercial documents")
    void testInvoiceAndReceiptEndpoints() throws Exception {
        CreateSaleLineRequest lineReq = new CreateSaleLineRequest(
            batchProduct.getId(),
            new BigDecimal("1.000"),
            "STRIP",
            BigDecimal.ZERO,
            null
        );

        CreateSalePaymentRequest payReq = new CreateSalePaymentRequest(
            PaymentMethod.CASH,
            new BigDecimal("22.4000"),
            new BigDecimal("22.4000"),
            null, null
        );

        CreateSaleRequest request = new CreateSaleRequest(
            storeId,
            LocalDate.now(),
            "Bob Customer",
            "9123456780",
            BigDecimal.ZERO, BigDecimal.ZERO,
            "IDEMP-DOC-TEST",
            null,
            List.of(lineReq),
            List.of(payReq)
        );

        MvcResult createResult = mockMvc.perform(post("/api/v1/sales")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andReturn();

        String saleIdStr = objectMapper.readTree(createResult.getResponse().getContentAsString())
            .get("data").get("id").asText();

        // Get Invoice
        mockMvc.perform(get("/api/v1/sales/" + saleIdStr + "/invoice")
                .header("Authorization", "Bearer " + cashierToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.invoiceNumber").exists())
            .andExpect(jsonPath("$.data.customerName").value("Bob Customer"));

        // Get Receipt
        mockMvc.perform(get("/api/v1/sales/" + saleIdStr + "/receipt")
                .header("Authorization", "Bearer " + cashierToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.receiptNumber").exists())
            .andExpect(jsonPath("$.data.totalAmount").value(22.4));
    }
}
