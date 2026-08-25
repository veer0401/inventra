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
import com.inventra.inventra_backend.inventory.domain.repository.InventoryBatchRepository;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryItemRepository;
import com.inventra.inventra_backend.inventory.domain.repository.StockMovementRepository;
import com.inventra.inventra_backend.sales.api.dto.CreateSaleLineRequest;
import com.inventra.inventra_backend.sales.api.dto.CreateSalePaymentRequest;
import com.inventra.inventra_backend.sales.api.dto.CreateSaleRequest;
import com.inventra.inventra_backend.sales.domain.model.PaymentMethod;
import com.inventra.inventra_backend.sales.domain.repository.SalePaymentRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SaleRollbackIntegrationTest {

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
    private SalePaymentRepository salePaymentRepository;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private UUID businessId;
    private UUID storeId;
    private UUID cashierId;
    private String cashierToken;

    private Product product;
    private InventoryItem item;
    private InventoryBatch batch;

    @BeforeEach
    void setUp() {
        Business biz = businessRepository.save(Business.create("Inventra Rollback Pharmacy", "Rollback Corp", null, null));
        businessId = biz.getId();

        Store store = storeRepository.save(Store.create(businessId, "RLB-STR", "Rollback Store", true));
        storeId = store.getId();

        User cashier = userRepository.save(User.create("cashier." + UUID.randomUUID() + "@rollback.local", "hashedPassword", "Rollback Cashier", null));
        cashierId = cashier.getId();
        cashierToken = jwtTokenProvider.generateAccessToken(cashierId, cashier.getEmail(), businessId, storeId, null, "CASHIER");

        product = productRepository.save(new Product(
            businessId,
            null, null,
            "Azithromycin 500mg",
            "Azithromycin",
            "Azee",
            "Cipla",
            DosageForm.TABLET,
            "500mg",
            "TABLET",
            "STRIP",
            5,
            "30049099",
            new BigDecimal("12.00"),
            true,
            true
        ));

        item = new InventoryItem(businessId, storeId, product.getId(), null, null, null, null, null, true);
        item.adjustStock(new BigDecimal("100.000"));
        item = inventoryItemRepository.save(item);

        batch = new InventoryBatch(
            businessId,
            storeId,
            product.getId(),
            item.getId(),
            "AZEE-B1",
            LocalDate.now().minusMonths(1),
            LocalDate.now().plusMonths(6),
            new BigDecimal("100.000"),
            new BigDecimal("50.00"),
            new BigDecimal("100.00"),
            new BigDecimal("80.00")
        );
        batch = inventoryBatchRepository.save(batch);
    }

    @Test
    @DisplayName("Midway checkout failure rolls back all inventory, batches, movements, sales, and payments completely")
    void testCheckoutAtomicRollback() throws Exception {
        long initialMovementsCount = stockMovementRepository.count();
        long initialSalesCount = saleRepository.count();
        long initialPaymentsCount = salePaymentRepository.count();

        // 1 strip = 5 tablets @ 80.00/strip + 12% tax (9.60) = 89.60
        CreateSaleLineRequest lineReq = new CreateSaleLineRequest(product.getId(), new BigDecimal("1.000"), "STRIP", BigDecimal.ZERO, null);
        
        // Pass corrupted/mismatched payment amount to trigger midway failure in SaleService
        CreateSalePaymentRequest badPayReq = new CreateSalePaymentRequest(PaymentMethod.CASH, new BigDecimal("50.0000"), new BigDecimal("50.0000"), null, null);

        CreateSaleRequest request = new CreateSaleRequest(
            storeId,
            LocalDate.now(),
            "Rollback Customer",
            null,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            "IDEMP-ROLLBACK",
            null,
            List.of(lineReq),
            List.of(badPayReq)
        );

        mockMvc.perform(post("/api/v1/sales")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.errorCode").value("PAYMENT_AMOUNT_MISMATCH"));

        // Verify that InventoryItem stock did not change
        InventoryItem itemAfter = inventoryItemRepository.findById(item.getId()).orElseThrow();
        assertThat(itemAfter.getCurrentStock()).isEqualByComparingTo("100.000");

        // Verify that InventoryBatch quantity did not change
        InventoryBatch batchAfter = inventoryBatchRepository.findById(batch.getId()).orElseThrow();
        assertThat(batchAfter.getQuantity()).isEqualByComparingTo("100.000");

        // Verify zero new StockMovements
        assertThat(stockMovementRepository.count()).isEqualTo(initialMovementsCount);

        // Verify zero new Sales
        assertThat(saleRepository.count()).isEqualTo(initialSalesCount);

        // Verify zero new SalePayments
        assertThat(salePaymentRepository.count()).isEqualTo(initialPaymentsCount);
    }
}
