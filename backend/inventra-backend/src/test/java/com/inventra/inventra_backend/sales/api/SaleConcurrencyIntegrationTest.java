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
import com.inventra.inventra_backend.inventory.domain.model.StockMovementType;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryBatchRepository;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryItemRepository;
import com.inventra.inventra_backend.inventory.domain.repository.StockMovementRepository;
import com.inventra.inventra_backend.sales.api.dto.CreateSaleLineRequest;
import com.inventra.inventra_backend.sales.api.dto.CreateSalePaymentRequest;
import com.inventra.inventra_backend.sales.api.dto.CreateSaleRequest;
import com.inventra.inventra_backend.sales.domain.model.PaymentMethod;
import com.inventra.inventra_backend.sales.domain.repository.SaleRepository;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
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

@SpringBootTest
@AutoConfigureMockMvc
class SaleConcurrencyIntegrationTest {

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

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private UUID businessId;
    private UUID storeId;
    private UUID cashier1Id;
    private UUID cashier2Id;
    private String cashier1Token;
    private String cashier2Token;

    private Product product;
    private InventoryItem item;
    private InventoryBatch batch;

    @BeforeEach
    void setUp() {
        Business biz = businessRepository.save(Business.create("Inventra Concurrency Pharmacy", "Concurrency Corp", null, null));
        businessId = biz.getId();

        Store store = storeRepository.save(Store.create(businessId, "CNC-01", "Counter One", true));
        storeId = store.getId();

        User cashier1 = userRepository.save(User.create("cashier1." + UUID.randomUUID() + "@inventra.local", "hashedPassword", "Cashier 1", null));
        cashier1Id = cashier1.getId();
        cashier1Token = jwtTokenProvider.generateAccessToken(cashier1Id, cashier1.getEmail(), businessId, storeId, null, "CASHIER");

        User cashier2 = userRepository.save(User.create("cashier2." + UUID.randomUUID() + "@inventra.local", "hashedPassword", "Cashier 2", null));
        cashier2Id = cashier2.getId();
        cashier2Token = jwtTokenProvider.generateAccessToken(cashier2Id, cashier2.getEmail(), businessId, storeId, null, "CASHIER");

        // Product with base unit = TABLET, selling unit = TABLET, 1 unit = 1 tablet
        product = productRepository.save(new Product(
            businessId,
            null, null,
            "Paracetamol 500mg Single",
            "Paracetamol",
            "Calpol",
            "GSK",
            DosageForm.TABLET,
            "500mg",
            "TABLET",
            "TABLET",
            1,
            "30049099",
            new BigDecimal("12.00"),
            true,
            false
        ));

        // Exactly 1.000 unit of stock available in store
        item = new InventoryItem(businessId, storeId, product.getId(), null, null, null, null, null, true);
        item.adjustStock(new BigDecimal("1.000"));
        item = inventoryItemRepository.save(item);

        batch = new InventoryBatch(
            businessId,
            storeId,
            product.getId(),
            item.getId(),
            "CALP-001",
            LocalDate.now().minusMonths(1),
            LocalDate.now().plusMonths(6),
            new BigDecimal("1.000"),
            new BigDecimal("5.00"),
            new BigDecimal("10.00"),
            new BigDecimal("10.00")
        );
        batch = inventoryBatchRepository.save(batch);
    }

    @Test
    @DisplayName("Simultaneous checkout of last available unit by 2 cashiers: exactly 1 succeeds, 1 gets rejected with no overselling")
    void testConcurrentCheckoutLastUnit() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch startSignal = new CountDownLatch(1);
        CountDownLatch doneSignal = new CountDownLatch(2);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);
        List<String> responseBodies = new ArrayList<>();

        // Cashier 1 request
        CreateSaleLineRequest line1 = new CreateSaleLineRequest(product.getId(), new BigDecimal("1.000"), "TABLET", BigDecimal.ZERO, null);
        CreateSalePaymentRequest pay1 = new CreateSalePaymentRequest(PaymentMethod.CASH, new BigDecimal("11.2000"), new BigDecimal("20.0000"), null, null);
        CreateSaleRequest req1 = new CreateSaleRequest(storeId, LocalDate.now(), null, null, BigDecimal.ZERO, BigDecimal.ZERO, "IDEMP-CASHIER-1", null, List.of(line1), List.of(pay1));

        // Cashier 2 request
        CreateSaleLineRequest line2 = new CreateSaleLineRequest(product.getId(), new BigDecimal("1.000"), "TABLET", BigDecimal.ZERO, null);
        CreateSalePaymentRequest pay2 = new CreateSalePaymentRequest(PaymentMethod.CASH, new BigDecimal("11.2000"), new BigDecimal("20.0000"), null, null);
        CreateSaleRequest req2 = new CreateSaleRequest(storeId, LocalDate.now(), null, null, BigDecimal.ZERO, BigDecimal.ZERO, "IDEMP-CASHIER-2", null, List.of(line2), List.of(pay2));

        Runnable task1 = () -> {
            try {
                startSignal.await();
                MvcResult result = mockMvc.perform(post("/api/v1/sales")
                        .header("Authorization", "Bearer " + cashier1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                    .andReturn();
                int status = result.getResponse().getStatus();
                if (status == 201) {
                    successCount.incrementAndGet();
                } else {
                    conflictCount.incrementAndGet();
                }
                synchronized (responseBodies) {
                    responseBodies.add("Task1 status: " + status + ", body: " + result.getResponse().getContentAsString());
                }
            } catch (Exception e) {
                conflictCount.incrementAndGet();
            } finally {
                doneSignal.countDown();
            }
        };

        Runnable task2 = () -> {
            try {
                startSignal.await();
                MvcResult result = mockMvc.perform(post("/api/v1/sales")
                        .header("Authorization", "Bearer " + cashier2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                    .andReturn();
                int status = result.getResponse().getStatus();
                if (status == 201) {
                    successCount.incrementAndGet();
                } else {
                    conflictCount.incrementAndGet();
                }
                synchronized (responseBodies) {
                    responseBodies.add("Task2 status: " + status + ", body: " + result.getResponse().getContentAsString());
                }
            } catch (Exception e) {
                conflictCount.incrementAndGet();
            } finally {
                doneSignal.countDown();
            }
        };

        executor.submit(task1);
        executor.submit(task2);

        // Release both requests at the exact same moment
        startSignal.countDown();
        boolean completed = doneSignal.await(15, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();

        // Exact concurrency invariant: 1 success, 1 conflict
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(conflictCount.get()).isEqualTo(1);

        // Verify inventory state: exactly 0 remaining, never negative
        InventoryItem finalItem = inventoryItemRepository.findById(item.getId()).orElseThrow();
        InventoryBatch finalBatch = inventoryBatchRepository.findById(batch.getId()).orElseThrow();

        assertThat(finalItem.getCurrentStock()).isEqualByComparingTo("0.000");
        assertThat(finalBatch.getQuantity()).isEqualByComparingTo("0.000");

        // Verify exactly 1 Sale committed
        long salesCount = saleRepository.findAll().stream()
            .filter(s -> s.getBusinessId().equals(businessId) && s.getStoreId().equals(storeId))
            .count();
        assertThat(salesCount).isEqualTo(1);

        // Verify exactly 1 StockMovement recorded
        long movementsCount = stockMovementRepository.findAll().stream()
            .filter(m -> m.getBusinessId().equals(businessId) && m.getMovementType() == StockMovementType.SALE)
            .count();
        assertThat(movementsCount).isEqualTo(1);
    }
}
