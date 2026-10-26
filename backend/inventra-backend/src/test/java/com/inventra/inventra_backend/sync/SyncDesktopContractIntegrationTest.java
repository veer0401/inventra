package com.inventra.inventra_backend.sync;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.security.JwtTokenProvider;
import com.inventra.inventra_backend.common.util.UuidUtils;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.inventory.domain.model.InventoryBatch;
import com.inventra.inventra_backend.inventory.domain.model.InventoryItem;
import com.inventra.inventra_backend.inventory.domain.model.StockMovement;
import com.inventra.inventra_backend.inventory.domain.model.StockMovementType;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryBatchRepository;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryItemRepository;
import com.inventra.inventra_backend.inventory.domain.repository.StockMovementRepository;
import com.inventra.inventra_backend.purchasing.api.dto.CreateSupplierRequest;
import com.inventra.inventra_backend.purchasing.api.dto.CreateGoodsReceiptRequest;
import com.inventra.inventra_backend.purchasing.api.dto.GoodsReceiptResponse;
import com.inventra.inventra_backend.purchasing.application.GoodsReceiptService;
import com.inventra.inventra_backend.purchasing.application.SupplierService;
import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceipt;
import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceiptStatus;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrder;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrderStatus;
import com.inventra.inventra_backend.purchasing.domain.repository.GoodsReceiptRepository;
import com.inventra.inventra_backend.purchasing.domain.repository.PurchaseOrderRepository;
import com.inventra.inventra_backend.purchasing.domain.model.SupplierType;
import com.inventra.inventra_backend.purchasing.domain.repository.SupplierRepository;
import com.inventra.inventra_backend.sales.domain.model.PaymentMethod;
import com.inventra.inventra_backend.sales.domain.model.Sale;
import com.inventra.inventra_backend.sales.domain.model.SalePayment;
import com.inventra.inventra_backend.sales.domain.repository.SalePaymentRepository;
import com.inventra.inventra_backend.sales.domain.repository.SaleRepository;
import com.inventra.inventra_backend.sync.api.dto.SyncOperationRequest;
import com.inventra.inventra_backend.sync.application.SyncOperationRecorder;
import com.inventra.inventra_backend.sync.domain.model.SyncChangeFeed;
import com.inventra.inventra_backend.sync.domain.model.SyncChangeOperation;
import com.inventra.inventra_backend.sync.domain.model.SyncEventType;
import com.inventra.inventra_backend.sync.domain.repository.SyncChangeFeedRepository;
import com.inventra.inventra_backend.sync.domain.repository.SyncOperationRepository;
import com.inventra.inventra_backend.sync.infrastructure.CanonicalJsonUtils;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.Device;
import com.inventra.inventra_backend.tenant.domain.model.DeviceType;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.DeviceRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Posts the exact JSON the native desktop produces (fixtures owned by
 * apps/desktop-native/tests/Inventra.Desktop.Tests/Fixtures) to the live sync endpoints and verifies the
 * resulting server state. Real server responses are written to target/contract-fixtures so the desktop
 * tests can deserialize genuine output.
 */
@SpringBootTest
@AutoConfigureMockMvc
class SyncDesktopContractIntegrationTest {

    // Placeholder ids used inside the desktop fixtures; replaced by the ids of the entities created below.
    private static final String STORE_PH = "00000000-0000-0000-0000-0000000000a1";
    private static final String PRODUCT_PH = "00000000-0000-0000-0000-0000000000a2";
    private static final String BATCH_PH = "00000000-0000-0000-0000-0000000000a3";
    private static final String SUPPLIER_PH = "00000000-0000-0000-0000-0000000000a4";
    // The desktop uses the receipt id as the operation id, so REST ("GRN-" + id) and sync dedupe on the server.
    private static final UUID RECEIPT_EVENT_ID = UUID.fromString("77777777-7777-7777-7777-777777777777");

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtTokenProvider jwtTokenProvider;
    @Autowired private BusinessRepository businessRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private DeviceRepository deviceRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private InventoryItemRepository inventoryItemRepository;
    @Autowired private InventoryBatchRepository inventoryBatchRepository;
    @Autowired private StockMovementRepository stockMovementRepository;
    @Autowired private SaleRepository saleRepository;
    @Autowired private SalePaymentRepository salePaymentRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private SupplierService supplierService;
    @Autowired private GoodsReceiptService goodsReceiptService;
    @Autowired private GoodsReceiptRepository goodsReceiptRepository;
    @Autowired private PurchaseOrderRepository purchaseOrderRepository;
    @Autowired private SyncChangeFeedRepository changeFeedRepository;
    @Autowired private SyncOperationRepository syncOperationRepository;
    @Autowired private SyncOperationRecorder syncOperationRecorder;

    private Business business;
    private Store store;
    private Device device;
    private User cashier;
    private Product product;
    private InventoryBatch batch;
    private UUID supplierId;
    private String token;
    private String managerToken; // reading a purchase order back needs a manager; a cashier token gets 403

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        business = businessRepository.save(Business.create("Contract Pharmacy " + suffix, "contract-" + suffix, null, null));
        store = storeRepository.save(Store.create(business.getId(), "CT-" + suffix, "Contract Counter", false));
        cashier = userRepository.save(User.create("contract." + suffix + "@inventra.com", "hash", "Contract Cashier", null));
        device = deviceRepository.save(Device.create(
            business.getId(), cashier.getId(), "Desktop POS", "DEV-CT-" + suffix, DeviceType.DESKTOP, "Windows", "1.0.0"));

        product = newProduct(business, "Amoxicillin 500mg");
        InventoryItem item = new InventoryItem(business.getId(), store.getId(), product.getId(), null, null, null, null, null, true);
        item.adjustStock(new BigDecimal("50.000"));
        item = inventoryItemRepository.save(item);

        // 50 base units; one selling unit (strip) = 10 base units; selling price 55.00 per strip.
        batch = inventoryBatchRepository.save(new InventoryBatch(
            business.getId(), store.getId(), product.getId(), item.getId(), "AMOX-B1",
            LocalDate.now().minusMonths(1), LocalDate.now().plusMonths(6),
            new BigDecimal("50.000"), new BigDecimal("30.00"), new BigDecimal("60.00"), new BigDecimal("55.00")));

        token = jwtTokenProvider.generateAccessToken(
            cashier.getId(), cashier.getEmail(), business.getId(), store.getId(), device.getId(), "CASHIER");

        managerToken = jwtTokenProvider.generateAccessToken(
            cashier.getId(), cashier.getEmail(), business.getId(), store.getId(), device.getId(), "MANAGER");

        supplierId = supplierService.createSupplier(business.getId(), supplierRequest("GRN-SUP")).id();
    }

    private Product newProduct(Business owner, String name) {
        return productRepository.save(new Product(
            owner.getId(), null, null, name, "Amoxicillin", "Amoxil", "GSK", DosageForm.CAPSULE, "500mg",
            "CAPSULE", "STRIP", 10, "30049099", BigDecimal.ZERO, false, false));
    }

    // ------------------------------------------------------------------ sales

    @Test
    @DisplayName("The desktop checksum for its sale payload equals the server's canonical checksum")
    void desktopChecksumMatchesServerCanonicalChecksum() throws Exception {
        JsonNode op = objectMapper.readTree(fixture("sync-upload-request-sale.json")).get("operations").get(0);
        assertThat(op.get("payloadChecksum").asText())
            .isEqualTo(CanonicalJsonUtils.computeCanonicalChecksum(op.get("payload")));
    }

    @Test
    @DisplayName("A desktop sale is APPLIED and produces the correct sale, payment, batch deduction and stock movement")
    void desktopSaleProducesCorrectServerState() throws Exception {
        UUID eventId = UuidUtils.newUuid7();
        String response = upload(saleEnvelope(eventId, 1L, bound("sale-created-payload.json")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.results[0].status").value("APPLIED"))
            .andExpect(jsonPath("$.data.results[0].serverEntityId").isNotEmpty())
            .andReturn().getResponse().getContentAsString();
        capture("server-upload-response-applied.json", response);

        UUID saleId = UUID.fromString(objectMapper.readTree(response).at("/data/results/0/serverEntityId").asText());
        Sale sale = saleRepository.findByIdAndBusinessId(saleId, business.getId()).orElseThrow();

        assertThat(sale.getStoreId()).isEqualTo(store.getId());
        assertThat(sale.getIdempotencyKey()).isEqualTo("SYNC-" + eventId);
        assertThat(sale.getSaleDate()).isEqualTo(LocalDate.of(2026, 10, 26));
        assertThat(sale.getCustomerName()).isEqualTo("Asha Rao");
        assertThat(sale.getInvoiceNumber()).startsWith("INV-CT-"); // the server numbers invoices
        assertThat(sale.getNotes()).contains("Offline invoice STR-20261026-0001"); // local receipt number is kept
        assertThat(sale.getTotalAmount()).isEqualByComparingTo("110.00"); // 2 strips x 55.00, 0% GST

        List<SalePayment> payments = salePaymentRepository.findBySaleIdAndBusinessId(saleId, business.getId());
        assertThat(payments).hasSize(1);
        assertThat(payments.get(0).getPaymentMethod()).isEqualTo(PaymentMethod.UPI);
        assertThat(payments.get(0).getAmount()).isEqualByComparingTo("110.00");

        // 2 strips x 10 units = 20 base units leave the batch and the item.
        assertThat(inventoryBatchRepository.findById(batch.getId()).orElseThrow().getQuantity()).isEqualByComparingTo("30.000");
        assertThat(currentStock()).isEqualByComparingTo("30.000");

        List<StockMovement> movements = saleMovements();
        assertThat(movements).hasSize(1);
        assertThat(movements.get(0).getBatchId()).isEqualTo(batch.getId());
        assertThat(movements.get(0).getQuantityDelta().abs()).isEqualByComparingTo("20");
        assertThat(movements.get(0).getReferenceId()).isEqualTo(saleId);
    }

    @Test
    @DisplayName("Re-sending the same desktop sale is DUPLICATE and changes no sale, payment, movement or stock")
    void resendingTheSameSaleIsIdempotent() throws Exception {
        ObjectNode envelope = saleEnvelope(UuidUtils.newUuid7(), 1L, bound("sale-created-payload.json"));

        String first = upload(envelope).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.results[0].status").value("APPLIED"))
            .andReturn().getResponse().getContentAsString();
        String saleId = objectMapper.readTree(first).at("/data/results/0/serverEntityId").asText();
        long sales = saleRepository.count();
        long payments = salePaymentRepository.count();
        long movements = stockMovementRepository.count();

        String second = upload(envelope).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.results[0].status").value("DUPLICATE"))
            .andExpect(jsonPath("$.data.results[0].serverEntityId").value(saleId))
            .andReturn().getResponse().getContentAsString();
        capture("server-upload-response-duplicate.json", second);

        assertThat(saleRepository.count()).isEqualTo(sales);
        assertThat(salePaymentRepository.count()).isEqualTo(payments);
        assertThat(stockMovementRepository.count()).isEqualTo(movements);
        assertThat(currentStock()).isEqualByComparingTo("30.000");
    }

    @Test
    @DisplayName("A stale price is rejected permanently and nothing changes")
    void stalePriceIsRejectedPermanently() throws Exception {
        ObjectNode payload = (ObjectNode) objectMapper.readTree(bound("sale-created-payload.json"));
        ((ObjectNode) payload.get("lines").get(0)).put("unitPrice", 1.00);

        String response = upload(saleEnvelope(UuidUtils.newUuid7(), 1L, payload.toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.results[0].status").value("REJECTED"))
            .andExpect(jsonPath("$.data.results[0].errorCode").value("PRICE_SNAPSHOT_INVALID"))
            .andExpect(jsonPath("$.data.results[0].retryable").value(false))
            .andReturn().getResponse().getContentAsString();
        capture("server-upload-response-rejected.json", response);

        assertThat(currentStock()).isEqualByComparingTo("50.000");
        assertThat(saleMovements()).isEmpty();
    }

    @Test
    @DisplayName("A sale larger than the stock is rejected by the server's stock validation, not forced through")
    void oversoldQuantityIsRejected() throws Exception {
        ObjectNode payload = (ObjectNode) objectMapper.readTree(bound("sale-created-payload.json"));
        ((ObjectNode) payload.get("lines").get(0)).put("quantity", 100);
        ((ObjectNode) payload.get("payments").get(0)).put("amount", 5500.00);

        upload(saleEnvelope(UuidUtils.newUuid7(), 1L, payload.toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.results[0].status").value("REJECTED"))
            .andExpect(jsonPath("$.data.results[0].errorCode").value("INSUFFICIENT_STOCK"))
            .andExpect(jsonPath("$.data.results[0].retryable").value(false));

        assertThat(currentStock()).isEqualByComparingTo("50.000");
        assertThat(saleMovements()).isEmpty();
    }

    @Test
    @DisplayName("Payments that do not add up to the server's total are rejected")
    void paymentMismatchIsRejected() throws Exception {
        ObjectNode payload = (ObjectNode) objectMapper.readTree(bound("sale-created-payload.json"));
        ((ObjectNode) payload.get("payments").get(0)).put("amount", 50.00);

        upload(saleEnvelope(UuidUtils.newUuid7(), 1L, payload.toString()))
            .andExpect(jsonPath("$.data.results[0].status").value("REJECTED"))
            .andExpect(jsonPath("$.data.results[0].errorCode").value("PAYMENT_AMOUNT_MISMATCH"));

        assertThat(currentStock()).isEqualByComparingTo("50.000");
    }

    @Test
    @DisplayName("Tenant isolation: another business's product is not found, and the payload cannot redirect the sale to another store")
    void tenantIsolationHolds() throws Exception {
        Business other = businessRepository.save(Business.create("Other " + UUID.randomUUID(), "other-" + UUID.randomUUID().toString().substring(0, 8), null, null));
        Store otherStore = storeRepository.save(Store.create(other.getId(), "OT-" + UUID.randomUUID().toString().substring(0, 6), "Other Store", false));
        Product foreign = newProduct(other, "Foreign Product");

        // 1. A product that belongs to another business is invisible to this device's business.
        ObjectNode foreignLine = (ObjectNode) objectMapper.readTree(bound("sale-created-payload.json"));
        ((ObjectNode) foreignLine.get("lines").get(0)).put("productId", foreign.getId().toString());
        ((ObjectNode) foreignLine.get("lines").get(0)).putNull("batchId");
        upload(saleEnvelope(UuidUtils.newUuid7(), 1L, foreignLine.toString()))
            .andExpect(jsonPath("$.data.results[0].status").value("REJECTED"))
            .andExpect(jsonPath("$.data.results[0].errorCode").value("RESOURCE_NOT_FOUND"));

        // 2. The storeId in the payload is ignored: the token decides, so a sale cannot land in another tenant's store.
        ObjectNode redirected = (ObjectNode) objectMapper.readTree(bound("sale-created-payload.json"));
        redirected.put("storeId", otherStore.getId().toString());
        String response = upload(saleEnvelope(UuidUtils.newUuid7(), 2L, redirected.toString()))
            .andExpect(jsonPath("$.data.results[0].status").value("APPLIED"))
            .andReturn().getResponse().getContentAsString();
        UUID saleId = UUID.fromString(objectMapper.readTree(response).at("/data/results/0/serverEntityId").asText());
        assertThat(saleRepository.findByIdAndBusinessId(saleId, business.getId()).orElseThrow().getStoreId()).isEqualTo(store.getId());
        assertThat(saleRepository.findByIdAndBusinessId(saleId, other.getId())).isEmpty();
    }

    @Test
    @DisplayName("An unreadable payload is a permanent INVALID_PAYLOAD rejection, not a retryable processing error")
    void unreadablePayloadIsPermanent() throws Exception {
        ObjectNode payload = (ObjectNode) objectMapper.readTree(bound("sale-created-payload.json"));
        ((ObjectNode) payload.get("lines").get(0)).put("productId", "not-a-uuid");

        upload(saleEnvelope(UuidUtils.newUuid7(), 1L, payload.toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.results[0].status").value("REJECTED"))
            .andExpect(jsonPath("$.data.results[0].errorCode").value("INVALID_PAYLOAD"))
            .andExpect(jsonPath("$.data.results[0].retryable").value(false));
    }

    // -------------------------------------------------------- envelope rules

    @Test
    @DisplayName("The old desktop envelope (deviceId + operations only) is refused with HTTP 400")
    void incompleteEnvelopeIsRefused() throws Exception {
        ObjectNode legacy = objectMapper.createObjectNode();
        legacy.put("deviceId", device.getId().toString());
        legacy.set("operations", saleEnvelope(UuidUtils.newUuid7(), 1L, bound("sale-created-payload.json")).get("operations"));

        String body = mockMvc.perform(post("/api/v1/sync/upload")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(legacy.toString()))
            .andExpect(status().isBadRequest())
            .andReturn().getResponse().getContentAsString();
        capture("server-upload-response-envelope-400.json", body);
        assertThat(saleMovements()).isEmpty();
    }

    @Test
    @DisplayName("An event type the server does not know fails the WHOLE request with HTTP 400, so clients must pre-filter")
    void unknownEventTypeFailsTheWholeRequest() throws Exception {
        ObjectNode envelope = saleEnvelope(UuidUtils.newUuid7(), 1L, bound("sale-created-payload.json"));
        ((ObjectNode) envelope.get("operations").get(0)).put("eventType", "SALE_COMPLETED");

        String body = mockMvc.perform(post("/api/v1/sync/upload")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(envelope.toString()))
            .andExpect(status().isBadRequest())
            .andReturn().getResponse().getContentAsString();
        capture("server-upload-response-400.json", body);
        assertThat(saleMovements()).isEmpty();
    }

    // --------------------------------------------- retryable vs permanent rows

    @Test
    @DisplayName("Only permanent rejections are stored; a retryable failure leaves the event id free to be retried")
    void retryableRejectionsAreNotPersisted() {
        SyncOperationRequest permanent = dummyRequest(10L);
        SyncOperationRequest transientFailure = dummyRequest(11L);

        syncOperationRecorder.recordRejected(business.getId(), store.getId(), device.getId(), cashier.getId(), permanent,
            "SOME_RULE", "permanent failure", false);
        syncOperationRecorder.recordRejected(business.getId(), store.getId(), device.getId(), cashier.getId(), transientFailure,
            "PROCESSING_ERROR", "temporary failure", true);

        assertThat(syncOperationRepository.findByBusinessIdAndDeviceIdAndEventId(business.getId(), device.getId(), permanent.eventId())).isPresent();
        assertThat(syncOperationRepository.findByBusinessIdAndDeviceIdAndEventId(business.getId(), device.getId(), transientFailure.eventId())).isEmpty();
    }

    // ----------------------------------------------------------- goods receipts

    @Test
    @DisplayName("A desktop goods receipt is APPLIED, the receipt is POSTED and the batch carries the desktop's values")
    void desktopGoodsReceiptIsAppliedAndCreatesTheBatch() throws Exception {
        BigDecimal before = currentStock();

        String response = upload(envelopeFor("GOODS_RECEIPT_POSTED", objectMapper.readTree(bound("grn-posted-payload.json")), RECEIPT_EVENT_ID, 1L))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.results[0].status").value("APPLIED"))
            .andReturn().getResponse().getContentAsString();
        capture("server-upload-response-grn-applied.json", response);

        GoodsReceipt receipt = goodsReceiptRepository.findByBusinessIdAndIdempotencyKey(business.getId(), "GRN-" + RECEIPT_EVENT_ID).orElseThrow();
        assertThat(receipt.getStatus()).isEqualTo(GoodsReceiptStatus.POSTED);
        assertThat(receipt.getSupplierId()).isEqualTo(supplierId);

        InventoryBatch created = inventoryBatchRepository.findAll().stream()
            .filter(b -> b.getBusinessId().equals(business.getId()) && "GRN-B1".equals(b.getBatchNumber()))
            .findFirst().orElseThrow();
        assertThat(created.getExpiryDate()).isEqualTo(LocalDate.of(2028, 4, 1));
        assertThat(created.getMrp()).isEqualByComparingTo("60.00");
        assertThat(created.getSellingPrice()).isEqualByComparingTo("55.00");

        // 6 strips x 10 capsules per strip: the server stores BASE units. (The desktop used to send
        // conversionFactor 1, which stored 6.)
        assertThat(created.getQuantity()).isEqualByComparingTo("60.000");
        assertThat(currentStock().subtract(before)).as("stock received").isEqualByComparingTo("60.000");
        // The server keeps the batch cost per base unit: 30.00 per strip / 10 = 3.00 per capsule.
        assertThat(created.getPurchasePrice()).isEqualByComparingTo("3.00");
    }

    @Test
    @DisplayName("A receipt posted through REST and then synced with the same id receives stock only once")
    void restThenSyncOfTheSameReceiptReceivesStockOnce() throws Exception {
        JsonNode payload = objectMapper.readTree(bound("grn-posted-payload.json"));
        GoodsReceiptResponse viaRest = createAndPostThroughRest(payload, true);
        BigDecimal afterRest = currentStock();
        long receipts = goodsReceiptRepository.count();

        upload(envelopeFor("GOODS_RECEIPT_POSTED", payload, RECEIPT_EVENT_ID, 1L))
            .andExpect(jsonPath("$.data.results[0].status").value("DUPLICATE"))
            .andExpect(jsonPath("$.data.results[0].serverEntityId").value(viaRest.id().toString()));

        assertThat(currentStock()).isEqualByComparingTo(afterRest);
        assertThat(goodsReceiptRepository.count()).isEqualTo(receipts);
    }

    @Test
    @DisplayName("A draft receipt left by REST is finished by the sync operation instead of being reported as a duplicate")
    void draftReceiptIsPostedBySync() throws Exception {
        JsonNode payload = objectMapper.readTree(bound("grn-posted-payload.json"));
        GoodsReceiptResponse draft = createAndPostThroughRest(payload, false);
        BigDecimal beforeSync = currentStock();
        assertThat(goodsReceiptRepository.findById(draft.id()).orElseThrow().getStatus()).isEqualTo(GoodsReceiptStatus.DRAFT);

        upload(envelopeFor("GOODS_RECEIPT_POSTED", payload, RECEIPT_EVENT_ID, 1L))
            .andExpect(jsonPath("$.data.results[0].status").value("APPLIED"))
            .andExpect(jsonPath("$.data.results[0].serverEntityId").value(draft.id().toString()));

        assertThat(goodsReceiptRepository.findById(draft.id()).orElseThrow().getStatus()).isEqualTo(GoodsReceiptStatus.POSTED);
        assertThat(currentStock()).isGreaterThan(beforeSync);

        // and a second send is now a genuine duplicate
        BigDecimal posted = currentStock();
        upload(envelopeFor("GOODS_RECEIPT_POSTED", payload, RECEIPT_EVENT_ID, 1L))
            .andExpect(jsonPath("$.data.results[0].status").value("DUPLICATE"));
        assertThat(currentStock()).isEqualByComparingTo(posted);
    }

    // ------------------------------------------------------- purchase orders

    @Test
    @DisplayName("A desktop purchase order is APPLIED and confirmed, keeps the pack conversion, and is idempotent on resend")
    void desktopPurchaseOrderIsAppliedAndConfirmed() throws Exception {
        UUID eventId = UuidUtils.newUuid7();
        ObjectNode envelope = envelopeFor("PURCHASE_ORDER_CREATED", objectMapper.readTree(bound("po-created-payload.json")), eventId, 1L);

        String response = upload(envelope).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.results[0].status").value("APPLIED"))
            .andReturn().getResponse().getContentAsString();
        capture("server-upload-response-po-applied.json", response);
        UUID poId = UUID.fromString(objectMapper.readTree(response).at("/data/results/0/serverEntityId").asText());

        PurchaseOrder po = purchaseOrderRepository.findByIdAndBusinessId(poId, business.getId()).orElseThrow();
        assertThat(po.getStatus()).isEqualTo(PurchaseOrderStatus.CONFIRMED);
        assertThat(po.getSupplierId()).isEqualTo(supplierId);
        assertThat(po.getStoreId()).isEqualTo(store.getId());

        String body = mockMvc.perform(get("/api/v1/purchase-orders/" + poId).header("Authorization", "Bearer " + managerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.lines[0].conversionFactor").value(10))
            .andExpect(jsonPath("$.data.lines[0].purchaseUnit").value("STRIP"))
            .andReturn().getResponse().getContentAsString();
        capture("server-purchase-order.json", body);

        // Documented limitation: a cashier token cannot read the order back, so only a manager/owner login can
        // finish the id remap on the desktop (the operation stays pending until then).
        mockMvc.perform(get("/api/v1/purchase-orders/" + poId).header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());

        long orders = purchaseOrderRepository.count();
        upload(envelope).andExpect(jsonPath("$.data.results[0].status").value("DUPLICATE"))
            .andExpect(jsonPath("$.data.results[0].serverEntityId").value(poId.toString()));
        assertThat(purchaseOrderRepository.count()).isEqualTo(orders);
    }

    @Test
    @DisplayName("A receipt that uses the SERVER order and line ids is accepted, and over-receipt is judged in purchase units")
    void receiptAgainstTheSyncedPurchaseOrderUsesServerIds() throws Exception {
        String poResponse = upload(envelopeFor("PURCHASE_ORDER_CREATED", objectMapper.readTree(bound("po-created-payload.json")), UuidUtils.newUuid7(), 1L))
            .andReturn().getResponse().getContentAsString();
        String poId = objectMapper.readTree(poResponse).at("/data/results/0/serverEntityId").asText();
        String lineId = objectMapper.readTree(mockMvc.perform(get("/api/v1/purchase-orders/" + poId).header("Authorization", "Bearer " + managerToken))
            .andReturn().getResponse().getContentAsString()).at("/data/lines/0/id").asText();

        // The desktop remaps its local ids to these after the order syncs. 6 of the 10 ordered strips arrive.
        ObjectNode receipt = (ObjectNode) objectMapper.readTree(bound("grn-posted-payload.json"));
        receipt.put("purchaseOrderId", poId);
        ((ObjectNode) receipt.get("lines").get(0)).put("purchaseOrderLineId", lineId);
        upload(envelopeFor("GOODS_RECEIPT_POSTED", receipt, UuidUtils.newUuid7(), 2L))
            .andExpect(jsonPath("$.data.results[0].status").value("APPLIED"));

        // 6 more would make 12 strips against 10 ordered: rejected, in strips, not in capsules (120 vs 100).
        ObjectNode second = receipt.deepCopy();
        ((ObjectNode) second.get("lines").get(0)).put("batchNumber", "GRN-B2");
        upload(envelopeFor("GOODS_RECEIPT_POSTED", second, UuidUtils.newUuid7(), 3L))
            .andExpect(jsonPath("$.data.results[0].status").value("REJECTED"))
            .andExpect(jsonPath("$.data.results[0].errorCode").value("OVER_RECEIPT_NOT_PERMITTED"));
    }

    /** What the Purchases screen does when online: REST create with key "GRN-" + receipt id, then post. */
    private GoodsReceiptResponse createAndPostThroughRest(JsonNode payload, boolean post) {
        CreateGoodsReceiptRequest base = objectMapper.convertValue(payload, CreateGoodsReceiptRequest.class);
        CreateGoodsReceiptRequest rest = new CreateGoodsReceiptRequest(
            base.storeId(), base.supplierId(), base.purchaseOrderId(), base.vendorDeliveryNote(), base.receivedDate(),
            base.notes(), "GRN-" + RECEIPT_EVENT_ID, base.lines());
        GoodsReceiptResponse created = goodsReceiptService.createGoodsReceipt(business.getId(), rest);
        return post ? goodsReceiptService.postGoodsReceipt(business.getId(), created.id(), cashier.getId(), device.getId()) : created;
    }

    // ---------------------------------------------------- suppliers + download

    @Test
    @DisplayName("A desktop supplier is APPLIED once, is idempotent on retry, and appears in this business's change feed")
    void desktopSupplierSyncsAndIsDownloadable() throws Exception {
        UUID eventId = UuidUtils.newUuid7();
        ObjectNode envelope = envelopeFor("SUPPLIER_CREATED", objectMapper.readTree(fixture("supplier-created-payload.json")), eventId, 1L);

        String first = upload(envelope).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.results[0].status").value("APPLIED"))
            .andReturn().getResponse().getContentAsString();
        capture("server-upload-response-supplier-applied.json", first);
        UUID supplierId = UUID.fromString(objectMapper.readTree(first).at("/data/results/0/serverEntityId").asText());

        assertThat(supplierRepository.findByIdAndBusinessId(supplierId, business.getId())).isPresent();

        upload(envelope).andExpect(jsonPath("$.data.results[0].status").value("DUPLICATE"))
            .andExpect(jsonPath("$.data.results[0].serverEntityId").value(supplierId.toString()));
        assertThat(supplierRepository.findAll().stream()
            .filter(s -> s.getBusinessId().equals(business.getId()) && s.getSupplierCode().equals("SUP-2610-123")).count()).isEqualTo(1);

        String download = mockMvc.perform(get("/api/v1/sync/download").header("Authorization", "Bearer " + token)
                .param("cursor", "0").param("limit", "100"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        capture("server-download-response-supplier.json", download);

        JsonNode changes = objectMapper.readTree(download).at("/data/changes");
        JsonNode supplierChange = null;
        for (JsonNode c : changes) {
            if ("SUPPLIER".equals(c.get("entityType").asText()) && supplierId.toString().equals(c.get("entityId").asText())) supplierChange = c;
        }
        assertThat(supplierChange).as("supplier change in feed").isNotNull();
        assertThat(supplierChange.get("operation").asText()).isEqualTo("UPSERT");
        assertThat(supplierChange.at("/payload/legalName").asText()).isEqualTo("Acme Distributors");
    }

    @Test
    @DisplayName("Download pages by cursor without gaps or repeats, and is scoped to this business and store")
    void downloadPagingAndScoping() throws Exception {
        Business other = businessRepository.save(Business.create("Feed Other " + UUID.randomUUID(), "feed-" + UUID.randomUUID().toString().substring(0, 8), null, null));
        Store secondStore = storeRepository.save(Store.create(business.getId(), "S2-" + UUID.randomUUID().toString().substring(0, 6), "Second Store", false));

        Set<UUID> mine = new HashSet<>();
        for (int i = 1; i <= 3; i++) mine.add(supplierService.createSupplier(business.getId(), supplierRequest("PAGE-" + i)).id());
        mine.add(supplierId); // created in setUp, so it is also in this business's feed
        UUID foreignSupplier = supplierService.createSupplier(other.getId(), supplierRequest("FOREIGN-1")).id();
        // A change scoped to a different store of the same business must not reach this device either.
        changeFeedRepository.save(new SyncChangeFeed(business.getId(), secondStore.getId(), "INVENTORY_ITEM", UUID.randomUUID(), SyncChangeOperation.UPSERT, 1, "{}"));
        UUID ownStoreEntity = UUID.randomUUID();
        changeFeedRepository.save(new SyncChangeFeed(business.getId(), store.getId(), "INVENTORY_ITEM", ownStoreEntity, SyncChangeOperation.UPSERT, 1, "{}"));

        List<Long> seqs = new ArrayList<>();
        Set<String> seenEntities = new HashSet<>();
        long cursor = 0;
        for (int page = 0; page < 20; page++) {
            JsonNode data = objectMapper.readTree(mockMvc.perform(get("/api/v1/sync/download").header("Authorization", "Bearer " + token)
                    .param("cursor", String.valueOf(cursor)).param("limit", "2"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("data");
            assertThat(data.get("currentCursor").asLong()).isEqualTo(cursor);
            for (JsonNode c : data.get("changes")) {
                seqs.add(c.get("changeSeq").asLong());
                seenEntities.add(c.get("entityId").asText());
            }
            assertThat(data.get("nextCursor").asLong()).isGreaterThanOrEqualTo(cursor);
            cursor = data.get("nextCursor").asLong();
            if (!data.get("hasMore").asBoolean()) break;
        }

        assertThat(seqs).isSorted().doesNotHaveDuplicates();
        mine.forEach(id -> assertThat(seenEntities).contains(id.toString()));
        assertThat(seenEntities).contains(ownStoreEntity.toString());
        assertThat(seenEntities).doesNotContain(foreignSupplier.toString());
        assertThat(seqs).hasSize(mine.size() + 1);
    }

    // ---------------------------------------------------------------- helpers

    private CreateSupplierRequest supplierRequest(String code) {
        return new CreateSupplierRequest(code, "Supplier " + code, null, SupplierType.DISTRIBUTOR, null, null, null,
            null, null, null, null, null, null, null, null, 30, null, null);
    }

    private SyncOperationRequest dummyRequest(long seq) {
        return new SyncOperationRequest(UuidUtils.newUuid7(), SyncEventType.SALE_CREATED, 1, seq, Instant.now(), "checksum", objectMapper.createObjectNode());
    }

    private ResultActions upload(ObjectNode envelope) throws Exception {
        return mockMvc.perform(post("/api/v1/sync/upload")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(envelope.toString()));
    }

    private ObjectNode saleEnvelope(UUID eventId, long seq, String payloadJson) throws IOException {
        return envelopeFor("SALE_CREATED", objectMapper.readTree(payloadJson), eventId, seq);
    }

    /** Starts from the desktop's own upload request fixture so every envelope field name and shape comes from the C# code. */
    private ObjectNode envelopeFor(String eventType, JsonNode payload, UUID eventId, long seq) throws IOException {
        ObjectNode envelope = (ObjectNode) objectMapper.readTree(fixture("sync-upload-request-sale.json"));
        envelope.put("deviceId", device.getId().toString());
        envelope.put("syncSessionId", UuidUtils.newUuid7().toString());
        ObjectNode op = (ObjectNode) envelope.get("operations").get(0);
        op.put("eventId", eventId.toString());
        op.put("eventType", eventType);
        op.put("deviceSequenceNumber", seq);
        op.set("payload", payload);
        op.put("payloadChecksum", CanonicalJsonUtils.computeCanonicalChecksum(payload));
        return envelope;
    }

    private BigDecimal currentStock() {
        return inventoryItemRepository.findByStoreIdAndProductIdAndBusinessId(store.getId(), product.getId(), business.getId())
            .orElseThrow().getCurrentStock();
    }

    private List<StockMovement> saleMovements() {
        return stockMovementRepository.findAll().stream()
            .filter(m -> m.getBusinessId().equals(business.getId()) && m.getMovementType() == StockMovementType.SALE)
            .toList();
    }

    private String bound(String fixtureName) throws IOException {
        return fixture(fixtureName)
            .replace(STORE_PH, store.getId().toString())
            .replace(PRODUCT_PH, product.getId().toString())
            .replace(BATCH_PH, batch.getId().toString())
            .replace(SUPPLIER_PH, supplierId.toString());
    }

    private static Path fixtureDir() {
        return Path.of(System.getProperty("user.dir")).resolve("../../apps/desktop-native/tests/Inventra.Desktop.Tests/Fixtures").normalize();
    }

    private static String fixture(String name) throws IOException {
        return Files.readString(fixtureDir().resolve(name));
    }

    private static void capture(String name, String json) throws IOException {
        Path dir = Path.of(System.getProperty("user.dir"), "target", "contract-fixtures");
        Files.createDirectories(dir);
        Files.writeString(dir.resolve(name), json);
    }
}
