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
import com.inventra.inventra_backend.sales.api.dto.CreateSaleRefundRequest;
import com.inventra.inventra_backend.sales.api.dto.CreateSaleRequest;
import com.inventra.inventra_backend.sales.api.dto.CreateSaleReturnBatchAllocationRequest;
import com.inventra.inventra_backend.sales.api.dto.CreateSaleReturnLineRequest;
import com.inventra.inventra_backend.sales.api.dto.CreateSaleReturnRequest;
import com.inventra.inventra_backend.sales.api.dto.VoidSaleRequest;
import com.inventra.inventra_backend.sales.domain.model.PaymentMethod;
import com.inventra.inventra_backend.sales.domain.model.RefundMethod;
import com.inventra.inventra_backend.sales.domain.model.Sale;
import com.inventra.inventra_backend.sales.domain.model.SaleStatus;
import com.inventra.inventra_backend.sales.domain.model.StockCondition;
import com.inventra.inventra_backend.sales.domain.repository.SaleLineBatchAllocationRepository;
import com.inventra.inventra_backend.sales.domain.repository.SaleLineRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SaleReturnControllerIntegrationTest {

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
    private SaleLineRepository saleLineRepository;

    @Autowired
    private SaleLineBatchAllocationRepository saleLineBatchAllocationRepository;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private UUID businessId;
    private UUID storeId;
    private UUID cashierId;
    private UUID managerId;

    private String cashierToken;
    private String managerToken;

    private Product product;
    private InventoryItem item;
    private InventoryBatch batch;

    @BeforeEach
    void setUp() {
        Business biz = businessRepository.save(Business.create("Inventra Return Pharmacy", "Return Corp", null, null));
        businessId = biz.getId();

        Store store = storeRepository.save(Store.create(businessId, "RET-STR", "Return Branch", true));
        storeId = store.getId();

        User cashier = userRepository.save(User.create("cashier." + UUID.randomUUID() + "@returns.local", "hashedPassword", "Returns Cashier", null));
        cashierId = cashier.getId();
        cashierToken = jwtTokenProvider.generateAccessToken(cashierId, cashier.getEmail(), businessId, storeId, null, "CASHIER");

        User manager = userRepository.save(User.create("manager." + UUID.randomUUID() + "@returns.local", "hashedPassword", "Returns Manager", null));
        managerId = manager.getId();
        managerToken = jwtTokenProvider.generateAccessToken(managerId, manager.getEmail(), businessId, storeId, null, "MANAGER");

        product = productRepository.save(new Product(
            businessId,
            null, null,
            "Dolo 650",
            "Paracetamol",
            "Dolo",
            "Micro Labs",
            DosageForm.TABLET,
            "650mg",
            "TABLET",
            "STRIP",
            15, // 1 strip = 15 tablets
            "30049099",
            new BigDecimal("12.00"),
            true,
            false
        ));

        item = new InventoryItem(businessId, storeId, product.getId(), null, null, null, null, null, true);
        item.adjustStock(new BigDecimal("150.000")); // 10 strips
        item = inventoryItemRepository.save(item);

        batch = new InventoryBatch(
            businessId,
            storeId,
            product.getId(),
            item.getId(),
            "DOLO-B1",
            LocalDate.now().minusMonths(1),
            LocalDate.now().plusMonths(12),
            new BigDecimal("150.000"),
            new BigDecimal("15.00"),
            new BigDecimal("30.00"),
            new BigDecimal("30.00") // 30.00 per strip
        );
        batch = inventoryBatchRepository.save(batch);
    }

    @Test
    @Transactional
    @DisplayName("Process restockable sale return restores batch stock and creates SALE_RETURN movement")
    void testRestockableReturnWorkflow() throws Exception {
        // 1. Checkout Sale: 4 strips (60 tablets) -> 4 * 30.00 = 120.00 + 12% tax (14.40) = 134.40
        CreateSaleLineRequest lineReq = new CreateSaleLineRequest(product.getId(), new BigDecimal("4.000"), "STRIP", BigDecimal.ZERO, null);
        CreateSalePaymentRequest payReq = new CreateSalePaymentRequest(PaymentMethod.CASH, new BigDecimal("134.4000"), new BigDecimal("134.4000"), null, null);
        CreateSaleRequest saleReq = new CreateSaleRequest(storeId, LocalDate.now(), "Customer R", null, BigDecimal.ZERO, BigDecimal.ZERO, "RET-SALE-01", null, List.of(lineReq), List.of(payReq));

        MvcResult saleResult = mockMvc.perform(post("/api/v1/sales")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(saleReq)))
            .andExpect(status().isCreated())
            .andReturn();

        var saleJson = objectMapper.readTree(saleResult.getResponse().getContentAsString()).get("data");
        UUID saleId = UUID.fromString(saleJson.get("id").asText());
        UUID saleLineId = UUID.fromString(saleJson.get("lines").get(0).get("id").asText());
        UUID allocId = UUID.fromString(saleJson.get("lines").get(0).get("batchAllocations").get(0).get("id").asText());

        // 2. Return 2 strips (30 tablets)
        // Unit refund price = 30.00, Tax (12%) = 7.20 -> Total refund = 67.20
        CreateSaleReturnBatchAllocationRequest retAllocReq = new CreateSaleReturnBatchAllocationRequest(
            allocId,
            new BigDecimal("30.000"),
            StockCondition.RESTOCKABLE
        );

        CreateSaleReturnLineRequest retLineReq = new CreateSaleReturnLineRequest(
            saleLineId,
            new BigDecimal("2.000"),
            List.of(retAllocReq)
        );

        CreateSaleRefundRequest refundReq = new CreateSaleRefundRequest(
            RefundMethod.CASH,
            new BigDecimal("67.2000"),
            null,
            "Customer returned sealed strips"
        );

        CreateSaleReturnRequest returnReq = new CreateSaleReturnRequest(
            LocalDate.now(),
            "Sealed excess strips",
            "RET-IDEMP-01",
            List.of(retLineReq),
            List.of(refundReq)
        );

        mockMvc.perform(post("/api/v1/sales/" + saleId + "/returns")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(returnReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("COMPLETED"))
            .andExpect(jsonPath("$.data.totalRefundAmount").value(67.2));

        // Verify stock is restored
        InventoryItem updatedItem = inventoryItemRepository.findById(item.getId()).orElseThrow();
        InventoryBatch updatedBatch = inventoryBatchRepository.findById(batch.getId()).orElseThrow();

        assertThat(updatedItem.getCurrentStock()).isEqualByComparingTo("120.000"); // 150 - 60 + 30 = 120
        assertThat(updatedBatch.getQuantity()).isEqualByComparingTo("120.000");

        // Verify SALE_RETURN stock movement
        boolean retMovementExists = stockMovementRepository.findAll().stream()
            .anyMatch(m -> m.getMovementType() == StockMovementType.SALE_RETURN);
        assertThat(retMovementExists).isTrue();

        // Verify sale status is PARTIALLY_RETURNED
        Sale updatedSale = saleRepository.findById(saleId).orElseThrow();
        assertThat(updatedSale.getStatus()).isEqualTo(SaleStatus.PARTIALLY_RETURNED);

        // Attempting to void sale with returns must fail with CANNOT_VOID_SALE_WITH_RETURNS
        VoidSaleRequest voidReq = new VoidSaleRequest("Try voiding partially returned sale");
        mockMvc.perform(post("/api/v1/sales/" + saleId + "/void")
                .header("Authorization", "Bearer " + managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(voidReq)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.errorCode").value("CANNOT_VOID_SALE_WITH_RETURNS"));
    }

    @Test
    @Transactional
    @DisplayName("Damaged return does not increase sellable inventory and creates DAMAGE_WRITE_OFF movement")
    void testDamagedReturnWorkflow() throws Exception {
        CreateSaleLineRequest lineReq = new CreateSaleLineRequest(product.getId(), new BigDecimal("2.000"), "STRIP", BigDecimal.ZERO, null);
        CreateSalePaymentRequest payReq = new CreateSalePaymentRequest(PaymentMethod.CASH, new BigDecimal("67.2000"), new BigDecimal("67.2000"), null, null);
        CreateSaleRequest saleReq = new CreateSaleRequest(storeId, LocalDate.now(), "Customer D", null, BigDecimal.ZERO, BigDecimal.ZERO, "RET-SALE-02", null, List.of(lineReq), List.of(payReq));

        MvcResult saleResult = mockMvc.perform(post("/api/v1/sales")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(saleReq)))
            .andExpect(status().isCreated())
            .andReturn();

        var saleJson = objectMapper.readTree(saleResult.getResponse().getContentAsString()).get("data");
        UUID saleId = UUID.fromString(saleJson.get("id").asText());
        UUID saleLineId = UUID.fromString(saleJson.get("lines").get(0).get("id").asText());
        UUID allocId = UUID.fromString(saleJson.get("lines").get(0).get("batchAllocations").get(0).get("id").asText());

        // Return 1 strip as DAMAGED
        CreateSaleReturnBatchAllocationRequest retAllocReq = new CreateSaleReturnBatchAllocationRequest(
            allocId,
            new BigDecimal("15.000"),
            StockCondition.DAMAGED
        );

        CreateSaleReturnLineRequest retLineReq = new CreateSaleReturnLineRequest(
            saleLineId,
            new BigDecimal("1.000"),
            List.of(retAllocReq)
        );

        CreateSaleRefundRequest refundReq = new CreateSaleRefundRequest(
            RefundMethod.CASH,
            new BigDecimal("33.6000"),
            null,
            "Broken foil pack returned"
        );

        CreateSaleReturnRequest returnReq = new CreateSaleReturnRequest(
            LocalDate.now(),
            "Broken packaging on purchase",
            "RET-IDEMP-02",
            List.of(retLineReq),
            List.of(refundReq)
        );

        mockMvc.perform(post("/api/v1/sales/" + saleId + "/returns")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(returnReq)))
            .andExpect(status().isCreated());

        // Verify sellable stock DID NOT INCREASE
        InventoryItem updatedItem = inventoryItemRepository.findById(item.getId()).orElseThrow();
        assertThat(updatedItem.getCurrentStock()).isEqualByComparingTo("120.000"); // 150 - 30 = 120 (no addition for damaged)

        // Verify DAMAGE_WRITE_OFF stock movement exists
        boolean dmgMovementExists = stockMovementRepository.findAll().stream()
            .anyMatch(m -> m.getMovementType() == StockMovementType.DAMAGE_WRITE_OFF);
        assertThat(dmgMovementExists).isTrue();
    }
}
