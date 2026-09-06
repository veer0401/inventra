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
import com.inventra.inventra_backend.inventory.domain.model.StockMovementType;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryBatchRepository;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryItemRepository;
import com.inventra.inventra_backend.inventory.domain.repository.StockMovementRepository;
import com.inventra.inventra_backend.sales.domain.repository.SalePaymentRepository;
import com.inventra.inventra_backend.sales.domain.repository.SaleRepository;
import com.inventra.inventra_backend.sync.api.dto.SyncOperationRequest;
import com.inventra.inventra_backend.sync.api.dto.SyncUploadRequest;
import com.inventra.inventra_backend.sync.domain.model.SyncEventType;
import com.inventra.inventra_backend.sync.domain.repository.SyncOperationRepository;
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
class SyncCrashRecoveryIntegrationTest {

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
    private StockMovementRepository stockMovementRepository;

    @Autowired
    private SaleRepository saleRepository;

    @Autowired
    private SalePaymentRepository salePaymentRepository;

    @Autowired
    private SyncOperationRepository syncOperationRepository;

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
        business = businessRepository.save(Business.create("Crash Pharmacy " + suffix, "crash-" + suffix, null, null));
        store = storeRepository.save(Store.create(business.getId(), "CRSH-" + suffix, "Crash Store", false));
        cashier = userRepository.save(User.create("crash." + suffix + "@inventra.com", "hash", "Cashier", null));

        device = deviceRepository.save(Device.create(
            business.getId(),
            cashier.getId(),
            "Crash Terminal",
            "DEV-CRASH-" + suffix,
            DeviceType.DESKTOP,
            "Windows",
            "1.0.0"
        ));

        product = productRepository.save(new Product(
            business.getId(),
            null,
            null,
            "Paracetamol 500mg",
            "Paracetamol",
            "Panadol",
            "GSK",
            DosageForm.TABLET,
            "500mg",
            "TABLET",
            "STRIP",
            10,
            "30049099",
            BigDecimal.ZERO,
            false,
            false
        ));

        // Seed inventory stock & batch
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
        item.adjustStock(new BigDecimal("100.000"));
        item = inventoryItemRepository.save(item);

        InventoryBatch batch = new InventoryBatch(
            business.getId(),
            store.getId(),
            product.getId(),
            item.getId(),
            "PARA-B1",
            LocalDate.now().minusMonths(1),
            LocalDate.now().plusMonths(6),
            new BigDecimal("100.000"),
            new BigDecimal("15.00"),
            new BigDecimal("25.00"),
            new BigDecimal("20.00")
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
    @DisplayName("Mandatory Crash Recovery Test: Retry after simulated lost response returns DUPLICATE and creates zero extra sales/payments/movements")
    void crashRecoveryIdempotencyTest() throws Exception {
        UUID eventId = UuidUtils.newUuid7();
        UUID syncSessionId = UuidUtils.newUuid7();

        String salePayloadJson = String.format("""
            {
              "storeId": "%s",
              "saleDate": "2026-08-25",
              "customerName": "Crash Victim",
              "customerPhone": "9999999999",
              "discountAmount": 0.00,
              "roundOffAmount": 0.00,
              "lines": [
                {
                  "productId": "%s",
                  "quantity": 2.0,
                  "sellingUnit": "STRIP",
                  "unitPrice": 20.00
                }
              ],
              "payments": [
                {
                  "paymentMethod": "CASH",
                  "amount": 40.00,
                  "tenderedAmount": 50.00,
                  "changeAmount": 10.00
                }
              ]
            }
            """, store.getId(), product.getId());

        JsonNode payloadNode = objectMapper.readTree(salePayloadJson);
        String checksum = CanonicalJsonUtils.computeCanonicalChecksum(payloadNode);

        SyncOperationRequest opReq = new SyncOperationRequest(
            eventId,
            SyncEventType.SALE_CREATED,
            1,
            1L,
            Instant.now(),
            checksum,
            payloadNode
        );

        SyncUploadRequest uploadReq = new SyncUploadRequest(
            device.getId(),
            syncSessionId,
            1,
            Instant.now(),
            List.of(opReq)
        );

        // First Upload Attempt (Simulate transaction committing on server)
        String response1 = mockMvc.perform(post("/api/v1/sync/upload")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(uploadReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.results[0].status").value("APPLIED"))
            .andExpect(jsonPath("$.data.results[0].serverEntityId").isNotEmpty())
            .andReturn().getResponse().getContentAsString();

        String createdSaleId = objectMapper.readTree(response1)
            .get("data").get("results").get(0).get("serverEntityId").asText();

        // Baseline assertions after commit
        long saleCountAfterFirstUpload = saleRepository.count();
        long paymentCountAfterFirstUpload = salePaymentRepository.count();
        long stockMovementCountAfterFirstUpload = stockMovementRepository.count();

        // Second Upload Attempt (Simulate client retrying due to dropped network response)
        mockMvc.perform(post("/api/v1/sync/upload")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(uploadReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.results[0].status").value("DUPLICATE"))
            .andExpect(jsonPath("$.data.results[0].serverEntityId").value(createdSaleId));

        // Exact single entity assertions (ZERO duplicates created)
        assertThat(saleRepository.count()).isEqualTo(saleCountAfterFirstUpload);
        assertThat(salePaymentRepository.count()).isEqualTo(paymentCountAfterFirstUpload);
        assertThat(stockMovementRepository.count()).isEqualTo(stockMovementCountAfterFirstUpload);

        // Verify stock movement was recorded with type SALE exactly once for this business
        long saleMovements = stockMovementRepository.findAll().stream()
            .filter(sm -> sm.getMovementType() == StockMovementType.SALE && sm.getBusinessId().equals(business.getId()))
            .count();
        assertThat(saleMovements).isEqualTo(1);
    }

    @Test
    @DisplayName("Payload tampering test: Retry with altered payload returns IDEMPOTENCY_PAYLOAD_MISMATCH")
    void alteredPayloadTamperingDetected() throws Exception {
        UUID eventId = UuidUtils.newUuid7();
        UUID syncSessionId = UuidUtils.newUuid7();

        String salePayloadJson = String.format("""
            {
              "storeId": "%s",
              "saleDate": "2026-08-25",
              "customerName": "Legit Customer",
              "customerPhone": "9999999999",
              "lines": [
                {
                  "productId": "%s",
                  "quantity": 1.0,
                  "sellingUnit": "STRIP",
                  "unitPrice": 20.00
                }
              ],
              "payments": [
                {
                  "paymentMethod": "CASH",
                  "amount": 20.00
                }
              ]
            }
            """, store.getId(), product.getId());

        JsonNode payloadNode = objectMapper.readTree(salePayloadJson);
        String checksum = CanonicalJsonUtils.computeCanonicalChecksum(payloadNode);

        // Alter payload but use old checksum (or altered content)
        String fakeChecksum = "0000000000000000000000000000000000000000000000000000000000000000";

        SyncOperationRequest tamperedOpReq = new SyncOperationRequest(
            eventId,
            SyncEventType.SALE_CREATED,
            1,
            2L,
            Instant.now(),
            fakeChecksum,
            payloadNode
        );

        SyncUploadRequest uploadReq = new SyncUploadRequest(
            device.getId(),
            syncSessionId,
            1,
            Instant.now(),
            List.of(tamperedOpReq)
        );

        mockMvc.perform(post("/api/v1/sync/upload")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(uploadReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.results[0].status").value("REJECTED"))
            .andExpect(jsonPath("$.data.results[0].errorCode").value("IDEMPOTENCY_PAYLOAD_MISMATCH"));
    }
}
