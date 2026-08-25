package com.inventra.inventra_backend.sales.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.IdentifierType;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.model.ProductIdentifier;
import com.inventra.inventra_backend.catalog.domain.repository.ProductIdentifierRepository;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.security.JwtTokenProvider;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.inventory.domain.model.InventoryBatch;
import com.inventra.inventra_backend.inventory.domain.model.InventoryItem;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryBatchRepository;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryItemRepository;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PosSearchControllerIntegrationTest {

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
    private ProductIdentifierRepository productIdentifierRepository;

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private InventoryBatchRepository inventoryBatchRepository;

    private UUID businessId;
    private UUID storeId;
    private UUID cashierId;
    private String cashierToken;
    private Product testProduct;

    @BeforeEach
    void setUp() {
        Business biz = businessRepository.save(Business.create("POS Search Pharmacy", "POS Search", null, null));
        businessId = biz.getId();

        Store store = storeRepository.save(Store.create(businessId, "POS-01", "Main Counter Store", true));
        storeId = store.getId();

        User cashier = userRepository.save(User.create("cashier." + UUID.randomUUID() + "@pos.local", "hashedPassword", "POS Cashier", null));
        cashierId = cashier.getId();

        cashierToken = jwtTokenProvider.generateAccessToken(cashierId, cashier.getEmail(), businessId, storeId, null, "CASHIER");

        // Create product
        testProduct = productRepository.save(new Product(
            businessId,
            null, null,
            "Crocin 650 Advance",
            "Paracetamol",
            "Crocin",
            "GSK",
            DosageForm.TABLET,
            "650mg",
            "TABLET",
            "STRIP",
            15,
            "30049099",
            new BigDecimal("12.00"),
            true,
            false
        ));

        // Add Barcode
        ProductIdentifier barcode = new ProductIdentifier(businessId, testProduct.getId(), IdentifierType.BARCODE, "8901234567890", true);
        productIdentifierRepository.save(barcode);

        // Setup Inventory Item
        InventoryItem item = new InventoryItem(businessId, storeId, testProduct.getId(), null, null, null, null, null, true);
        item.adjustStock(new BigDecimal("150.000"));
        item = inventoryItemRepository.save(item);

        // Add 2 FEFO Batches
        InventoryBatch batch1 = new InventoryBatch(
            businessId,
            storeId,
            testProduct.getId(),
            item.getId(),
            "BATCH-001",
            LocalDate.now().minusMonths(2),
            LocalDate.now().plusMonths(6),
            new BigDecimal("50.000"),
            new BigDecimal("20.00"),
            new BigDecimal("35.00"),
            new BigDecimal("30.00")
        );
        inventoryBatchRepository.save(batch1);

        InventoryBatch batch2 = new InventoryBatch(
            businessId,
            storeId,
            testProduct.getId(),
            item.getId(),
            "BATCH-002",
            LocalDate.now().minusMonths(1),
            LocalDate.now().plusMonths(12),
            new BigDecimal("100.000"),
            new BigDecimal("22.00"),
            new BigDecimal("35.00"),
            new BigDecimal("30.00")
        );
        inventoryBatchRepository.save(batch2);
    }

    @Test
    @Transactional
    @DisplayName("Search product by exact barcode returns accurate FEFO and stock details")
    void testSearchByBarcode() throws Exception {
        mockMvc.perform(get("/api/v1/pos/products/search")
                .header("Authorization", "Bearer " + cashierToken)
                .param("q", "8901234567890")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content", hasSize(1)))
            .andExpect(jsonPath("$.data.content[0].name").value("Crocin 650 Advance"))
            .andExpect(jsonPath("$.data.content[0].currentStock").value(150.0))
            .andExpect(jsonPath("$.data.content[0].isBatchTracked").value(true))
            .andExpect(jsonPath("$.data.content[0].fefoBatchNumber").value("BATCH-001"))
            .andExpect(jsonPath("$.data.content[0].fefoSellingPrice").value(30.0));
    }

    @Test
    @Transactional
    @DisplayName("Search product by text query returns matching catalog products")
    void testSearchByText() throws Exception {
        mockMvc.perform(get("/api/v1/pos/products/search")
                .header("Authorization", "Bearer " + cashierToken)
                .param("q", "Crocin")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content", hasSize(1)))
            .andExpect(jsonPath("$.data.content[0].name").value("Crocin 650 Advance"));
    }
}
