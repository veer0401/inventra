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
import com.inventra.inventra_backend.sales.domain.repository.SaleRepository;
import com.inventra.inventra_backend.sync.api.dto.SyncOperationRequest;
import com.inventra.inventra_backend.sync.api.dto.SyncUploadRequest;
import com.inventra.inventra_backend.sync.domain.model.SyncEventType;
import com.inventra.inventra_backend.sync.infrastructure.CanonicalJsonUtils;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.Device;
import com.inventra.inventra_backend.tenant.domain.model.DeviceStatus;
import com.inventra.inventra_backend.tenant.domain.model.DeviceType;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.DeviceRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.math.BigDecimal;
import java.time.Instant;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SyncControllerIntegrationTest {

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
    private String token;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        business = businessRepository.save(Business.create("Sync Pharmacy " + suffix, "sync-" + suffix, null, null));
        store = storeRepository.save(Store.create(business.getId(), "SYNC-" + suffix, "Main Counter Store", false));
        cashier = userRepository.save(User.create("sync." + suffix + "@inventra.com", "hash", "Sync Cashier", null));

        device = deviceRepository.save(Device.create(
            business.getId(),
            cashier.getId(),
            "Main POS Counter",
            "DEV-SYNC-" + suffix,
            DeviceType.DESKTOP,
            "Windows",
            "1.0.0"
        ));

        product = productRepository.save(new Product(
            business.getId(),
            null,
            null,
            "Amoxicillin 500mg",
            "Amoxicillin",
            "Amoxil",
            "GSK",
            DosageForm.CAPSULE,
            "500mg",
            "CAPSULE",
            "STRIP",
            10,
            "30049099",
            BigDecimal.ZERO,
            false,
            false
        ));

        InventoryItem item = new InventoryItem(
            business.getId(),
            store.getId(),
            product.getId(),
            null,
            null,
            null,
            null,
            null,
            true
        );
        item.adjustStock(new BigDecimal("50.000")); // 50 units in stock
        item = inventoryItemRepository.save(item);

        InventoryBatch batch = new InventoryBatch(
            business.getId(),
            store.getId(),
            product.getId(),
            item.getId(),
            "AMOX-B1",
            LocalDate.now().minusMonths(1),
            LocalDate.now().plusMonths(6),
            new BigDecimal("50.000"),
            new BigDecimal("30.00"),
            new BigDecimal("55.00"),
            new BigDecimal("50.00")
        );
        inventoryBatchRepository.save(batch);

        token = jwtTokenProvider.generateAccessToken(
            cashier.getId(),
            cashier.getEmail(),
            business.getId(),
            store.getId(),
            device.getId(),
            "CASHIER"
        );
    }

    @Test
    @DisplayName("Partial batch failure: Sale 1 APPLIED, Sale 2 REJECTED (INSUFFICIENT_STOCK), Sale 3 APPLIED")
    void partialBatchFailureWithNoNegativeStock() throws Exception {
        // Sale 1: buys 2 strips (20 units). Stock: 50 -> 30
        String sale1Json = createSaleJson(2.0, 100.00);
        JsonNode node1 = objectMapper.readTree(sale1Json);
        SyncOperationRequest op1 = new SyncOperationRequest(
            UuidUtils.newUuid7(), SyncEventType.SALE_CREATED, 1, 1L, Instant.now(),
            CanonicalJsonUtils.computeCanonicalChecksum(node1), node1
        );

        // Sale 2: tries to buy 5 strips (50 units), but only 30 available -> REJECTED
        String sale2Json = createSaleJson(5.0, 250.00);
        JsonNode node2 = objectMapper.readTree(sale2Json);
        SyncOperationRequest op2 = new SyncOperationRequest(
            UuidUtils.newUuid7(), SyncEventType.SALE_CREATED, 1, 2L, Instant.now(),
            CanonicalJsonUtils.computeCanonicalChecksum(node2), node2
        );

        // Sale 3: buys 1 strip (10 units). Stock: 30 -> 20. Succeeds!
        String sale3Json = createSaleJson(1.0, 50.00);
        JsonNode node3 = objectMapper.readTree(sale3Json);
        SyncOperationRequest op3 = new SyncOperationRequest(
            UuidUtils.newUuid7(), SyncEventType.SALE_CREATED, 1, 3L, Instant.now(),
            CanonicalJsonUtils.computeCanonicalChecksum(node3), node3
        );

        SyncUploadRequest batchReq = new SyncUploadRequest(
            device.getId(),
            UuidUtils.newUuid7(),
            1,
            Instant.now(),
            List.of(op1, op2, op3)
        );

        mockMvc.perform(post("/api/v1/sync/upload")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(batchReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.processedCount").value(3))
            .andExpect(jsonPath("$.data.results[0].status").value("APPLIED"))
            .andExpect(jsonPath("$.data.results[1].status").value("REJECTED"))
            .andExpect(jsonPath("$.data.results[1].errorCode").value("INSUFFICIENT_STOCK"))
            .andExpect(jsonPath("$.data.results[2].status").value("APPLIED"));

        // Verify remaining stock is exactly 20 (never negative)
        InventoryItem updatedItem = inventoryItemRepository.findByStoreIdAndProductIdAndBusinessId(
            store.getId(), product.getId(), business.getId()
        ).orElseThrow();
        assertThat(updatedItem.getCurrentStock()).isEqualByComparingTo(new BigDecimal("20.000"));
    }

    @Test
    @DisplayName("Price security: Fabricated unitPrice is rejected with PRICE_SNAPSHOT_INVALID")
    void fabricatedUnitPriceRejected() throws Exception {
        // Product authorized selling price is 50.00, client tries to sell at 1.00
        String fabricatedSaleJson = String.format("""
            {
              "storeId": "%s",
              "lines": [
                {
                  "productId": "%s",
                  "quantity": 1.0,
                  "sellingUnit": "STRIP",
                  "unitPrice": 1.00
                }
              ],
              "payments": [
                {
                  "paymentMethod": "CASH",
                  "amount": 1.00
                }
              ]
            }
            """, store.getId(), product.getId());

        JsonNode node = objectMapper.readTree(fabricatedSaleJson);
        SyncOperationRequest op = new SyncOperationRequest(
            UuidUtils.newUuid7(), SyncEventType.SALE_CREATED, 1, 10L, Instant.now(),
            CanonicalJsonUtils.computeCanonicalChecksum(node), node
        );

        SyncUploadRequest uploadReq = new SyncUploadRequest(
            device.getId(), UuidUtils.newUuid7(), 1, Instant.now(), List.of(op)
        );

        mockMvc.perform(post("/api/v1/sync/upload")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(uploadReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.results[0].status").value("REJECTED"))
            .andExpect(jsonPath("$.data.results[0].errorCode").value("PRICE_SNAPSHOT_INVALID"));
    }

    @Test
    @DisplayName("Device security: Revoked device sync attempt is rejected with 403 DEVICE_REVOKED")
    void revokedDeviceRejected() throws Exception {
        device.revoke();
        deviceRepository.save(device);

        String saleJson = createSaleJson(1.0, 50.00);
        JsonNode node = objectMapper.readTree(saleJson);
        SyncOperationRequest op = new SyncOperationRequest(
            UuidUtils.newUuid7(), SyncEventType.SALE_CREATED, 1, 1L, Instant.now(),
            CanonicalJsonUtils.computeCanonicalChecksum(node), node
        );
        SyncUploadRequest uploadReq = new SyncUploadRequest(
            device.getId(), UuidUtils.newUuid7(), 1, Instant.now(), List.of(op)
        );

        mockMvc.perform(post("/api/v1/sync/upload")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(uploadReq)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.errorCode").value("DEVICE_REVOKED"));
    }

    @Test
    @DisplayName("Download API: Incremental change feed with cursor pagination")
    void downloadChangeFeedIncremental() throws Exception {
        mockMvc.perform(get("/api/v1/sync/download")
                .header("Authorization", "Bearer " + token)
                .param("cursor", "0")
                .param("limit", "10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.currentCursor").value(0))
            .andExpect(jsonPath("$.data.nextCursor").isNumber())
            .andExpect(jsonPath("$.data.changes").isArray());
    }

    private String createSaleJson(double quantity, double amount) {
        return String.format("""
            {
              "storeId": "%s",
              "saleDate": "2026-08-25",
              "customerName": "Test Customer",
              "customerPhone": "9876543210",
              "lines": [
                {
                  "productId": "%s",
                  "quantity": %.1f,
                  "sellingUnit": "STRIP",
                  "unitPrice": 50.00
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
