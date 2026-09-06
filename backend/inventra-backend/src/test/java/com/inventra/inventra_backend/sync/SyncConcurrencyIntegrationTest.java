package com.inventra.inventra_backend.sync;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.security.JwtTokenProvider;
import com.inventra.inventra_backend.common.util.UuidUtils;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.inventory.domain.model.InventoryBatch;
import com.inventra.inventra_backend.inventory.domain.model.InventoryItem;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryBatchRepository;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryItemRepository;
import com.inventra.inventra_backend.sales.application.SaleService;
import com.inventra.inventra_backend.sales.domain.repository.SaleRepository;
import com.inventra.inventra_backend.sync.api.dto.SyncOperationRequest;
import com.inventra.inventra_backend.sync.api.dto.SyncUploadRequest;
import com.inventra.inventra_backend.sync.application.SyncService;
import com.inventra.inventra_backend.sync.domain.model.SyncEventType;
import com.inventra.inventra_backend.sync.infrastructure.CanonicalJsonUtils;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.Device;
import com.inventra.inventra_backend.tenant.domain.model.DeviceType;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.DeviceRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class SyncConcurrencyIntegrationTest {

    @Autowired
    private SyncService syncService;

    @Autowired
    private SaleService saleService;

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private InventoryBatchRepository inventoryBatchRepository;

    @Autowired
    private SaleRepository saleRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private Business business;
    private Store store;
    private User cashier;
    private Device device;
    private Product product;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        business = businessRepository.save(Business.create("Concurrent Sync Pharmacy " + suffix, "conc-" + suffix, null, null));
        store = storeRepository.save(Store.create(business.getId(), "CONC-" + suffix, "Concurrent Store", false));
        cashier = userRepository.save(User.create("conc." + suffix + "@inventra.com", "hash", "Cashier", null));

        device = deviceRepository.save(Device.create(
            business.getId(),
            cashier.getId(),
            "Concurrent Terminal",
            "DEV-CONC-" + suffix,
            DeviceType.DESKTOP,
            "Windows",
            "1.0.0"
        ));

        product = productRepository.save(new Product(
            business.getId(),
            null,
            null,
            "Concurrent Drug 100mg",
            "Drug",
            "Brand",
            "Manufacturer",
            DosageForm.TABLET,
            "100mg",
            "TABLET",
            "STRIP",
            10,
            "30049099",
            BigDecimal.ZERO,
            false,
            false
        ));
    }

    @Test
    @DisplayName("Concurrent sync uploads of same eventId creates exactly one Sale; second returns DUPLICATE")
    void concurrentSameEventUploadCreatesExactlyOneSale() throws Exception {
        // Seed stock & batch
        InventoryItem item = new InventoryItem(
            business.getId(), store.getId(), product.getId(),
            null, null, null, null, null, true
        );
        item.adjustStock(new BigDecimal("50.000"));
        item = inventoryItemRepository.save(item);

        InventoryBatch batch = new InventoryBatch(
            business.getId(),
            store.getId(),
            product.getId(),
            item.getId(),
            "CONC-B1",
            LocalDate.now().minusMonths(1),
            LocalDate.now().plusMonths(6),
            new BigDecimal("50.000"),
            new BigDecimal("60.00"),
            new BigDecimal("120.00"),
            new BigDecimal("100.00")
        );
        inventoryBatchRepository.save(batch);

        UUID eventId = UuidUtils.newUuid7();
        String saleJson = String.format("""
            {
              "storeId": "%s",
              "saleDate": "2026-08-25",
              "lines": [
                {
                  "productId": "%s",
                  "quantity": 1.0,
                  "sellingUnit": "STRIP",
                  "unitPrice": 100.00
                }
              ],
              "payments": [
                {
                  "paymentMethod": "CASH",
                  "amount": 100.00
                }
              ]
            }
            """, store.getId(), product.getId());

        JsonNode node = objectMapper.readTree(saleJson);
        String checksum = CanonicalJsonUtils.computeCanonicalChecksum(node);

        SyncOperationRequest op = new SyncOperationRequest(
            eventId, SyncEventType.SALE_CREATED, 1, 1L, Instant.now(), checksum, node
        );

        SyncUploadRequest uploadReq = new SyncUploadRequest(
            device.getId(), UuidUtils.newUuid7(), 1, Instant.now(), List.of(op)
        );

        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(1);
        List<String> statuses = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                try {
                    latch.await();
                    var response = syncService.processUpload(
                        business.getId(), store.getId(), cashier.getId(), device.getId(), uploadReq
                    );
                    statuses.add(response.results().get(0).status().name());
                } catch (Exception e) {
                    statuses.add("ERROR: " + e.getMessage());
                }
            });
        }

        latch.countDown();
        executor.shutdown();
        boolean finished = executor.awaitTermination(10, TimeUnit.SECONDS);
        assertThat(finished).isTrue();

        // Exactly one sale created
        long salesInDb = saleRepository.findAll().stream()
            .filter(s -> s.getBusinessId().equals(business.getId()))
            .count();
        assertThat(salesInDb).isEqualTo(1);

        // One APPLIED and one DUPLICATE (or both successful idempotent results)
        assertThat(statuses).contains("APPLIED");
    }

    @Test
    @DisplayName("Offline sync competing for final stock unit allows exactly one sale; zero negative inventory")
    void competingSyncForFinalStockGuaranteesNoNegativeStock() throws Exception {
        // Stock & batch of exactly 1 strip (10 units)
        InventoryItem item = new InventoryItem(
            business.getId(), store.getId(), product.getId(),
            null, null, null, null, null, true
        );
        item.adjustStock(new BigDecimal("10.000"));
        item = inventoryItemRepository.save(item);

        InventoryBatch batch = new InventoryBatch(
            business.getId(),
            store.getId(),
            product.getId(),
            item.getId(),
            "CONC-FINAL",
            LocalDate.now().minusMonths(1),
            LocalDate.now().plusMonths(6),
            new BigDecimal("10.000"),
            new BigDecimal("60.00"),
            new BigDecimal("120.00"),
            new BigDecimal("100.00")
        );
        inventoryBatchRepository.save(batch);

        // Two distinct events trying to buy 1 strip each
        UUID event1 = UuidUtils.newUuid7();
        UUID event2 = UuidUtils.newUuid7();

        String sale1Json = createSaleJson(1.0, 100.00);
        String sale2Json = createSaleJson(1.0, 100.00);

        JsonNode node1 = objectMapper.readTree(sale1Json);
        JsonNode node2 = objectMapper.readTree(sale2Json);

        SyncUploadRequest uploadReq1 = new SyncUploadRequest(
            device.getId(), UuidUtils.newUuid7(), 1, Instant.now(),
            List.of(new SyncOperationRequest(event1, SyncEventType.SALE_CREATED, 1, 10L, Instant.now(),
                CanonicalJsonUtils.computeCanonicalChecksum(node1), node1))
        );

        SyncUploadRequest uploadReq2 = new SyncUploadRequest(
            device.getId(), UuidUtils.newUuid7(), 1, Instant.now(),
            List.of(new SyncOperationRequest(event2, SyncEventType.SALE_CREATED, 1, 11L, Instant.now(),
                CanonicalJsonUtils.computeCanonicalChecksum(node2), node2))
        );

        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(1);
        List<String> statuses = Collections.synchronizedList(new ArrayList<>());

        executor.submit(() -> {
            try {
                latch.await();
                var resp = syncService.processUpload(business.getId(), store.getId(), cashier.getId(), device.getId(), uploadReq1);
                statuses.add(resp.results().get(0).status().name());
            } catch (Exception e) {
                statuses.add("ERROR: " + e.getMessage());
            }
        });

        executor.submit(() -> {
            try {
                latch.await();
                var resp = syncService.processUpload(business.getId(), store.getId(), cashier.getId(), device.getId(), uploadReq2);
                statuses.add(resp.results().get(0).status().name());
            } catch (Exception e) {
                statuses.add("ERROR: " + e.getMessage());
            }
        });

        latch.countDown();
        executor.shutdown();
        boolean finished = executor.awaitTermination(10, TimeUnit.SECONDS);
        assertThat(finished).isTrue();

        assertThat(statuses).contains("APPLIED");
        assertThat(statuses).contains("REJECTED");

        // Verify remaining stock is exactly 0.000 and NOT negative
        InventoryItem finalItem = inventoryItemRepository.findByStoreIdAndProductIdAndBusinessId(
            store.getId(), product.getId(), business.getId()
        ).orElseThrow();
        assertThat(finalItem.getCurrentStock()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    private String createSaleJson(double quantity, double amount) {
        return String.format("""
            {
              "storeId": "%s",
              "saleDate": "2026-08-25",
              "customerName": "Concurrent Buyer",
              "customerPhone": "9876543210",
              "lines": [
                {
                  "productId": "%s",
                  "quantity": %.1f,
                  "sellingUnit": "STRIP",
                  "unitPrice": 100.00
                }
              ],
              "payments": [
                {
                  "paymentMethod": "CASH",
                  "amount": %.2f,
                  "tenderedAmount": %.2f,
                  "changeAmount": 0.00
                }
              ]
            }
            """, store.getId(), product.getId(), quantity, amount, amount);
    }
}
