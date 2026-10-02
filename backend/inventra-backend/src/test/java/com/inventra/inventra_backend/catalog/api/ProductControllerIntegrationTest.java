package com.inventra.inventra_backend.catalog.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.catalog.api.dto.AddProductIdentifierRequest;
import com.inventra.inventra_backend.catalog.api.dto.CreateProductRequest;
import com.inventra.inventra_backend.catalog.api.dto.UpdateProductRequest;
import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.IdentifierType;
import com.inventra.inventra_backend.catalog.domain.model.ProductStatus;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.security.JwtTokenProvider;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.math.BigDecimal;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.inventra.inventra_backend.catalog.api.dto.ProductSearchRequest;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.model.ProductQueryCondition;
import com.inventra.inventra_backend.catalog.domain.model.ProductQueryField;
import com.inventra.inventra_backend.catalog.domain.model.QueryOperator;
import com.inventra.inventra_backend.inventory.domain.model.InventoryBatch;
import com.inventra.inventra_backend.inventory.domain.model.InventoryItem;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryBatchRepository;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryItemRepository;
import java.time.LocalDate;

@SpringBootTest
@AutoConfigureMockMvc
class ProductControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private InventoryBatchRepository inventoryBatchRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private Business businessA;
    private Business businessB;
    private Store storeA;
    private Store storeB;
    private String ownerToken;
    private String operatorToken;
    private String cashierToken;

    @BeforeEach
    void setUp() {
        businessA = businessRepository.save(Business.create("Prod Business A", "PBA", null, null));
        businessB = businessRepository.save(Business.create("Prod Business B", "PBB", null, null));
        storeA = storeRepository.save(Store.create(businessA.getId(), "PSA", "Prod Store A", true));
        storeB = storeRepository.save(Store.create(businessA.getId(), "PSB", "Prod Store B", false));

        ownerToken = jwtTokenProvider.generateAccessToken(
            UUID.randomUUID(),
            "owner@pba.local",
            businessA.getId(),
            storeA.getId(),
            null,
            "OWNER"
        );

        operatorToken = jwtTokenProvider.generateAccessToken(
            UUID.randomUUID(),
            "operator@pba.local",
            businessA.getId(),
            storeA.getId(),
            null,
            "INVENTORY_OPERATOR"
        );

        cashierToken = jwtTokenProvider.generateAccessToken(
            UUID.randomUUID(),
            "cashier@pba.local",
            businessA.getId(),
            storeA.getId(),
            null,
            "CASHIER"
        );
    }

    @Test
    @Transactional
    @DisplayName("Create, search, update product and manage identifiers")
    void testProductLifecycleAndSearch() throws Exception {
        // 1. Create product with initial barcode
        AddProductIdentifierRequest initialBarcode = new AddProductIdentifierRequest(
            IdentifierType.BARCODE,
            "8901234567890",
            true
        );

        CreateProductRequest createReq = new CreateProductRequest(
            null,
            null,
            "Paracetamol 500mg Tablet",
            "Paracetamol (500mg)",
            "Crocin",
            "GSK",
            DosageForm.TABLET,
            "500mg",
            "TABLET",
            "STRIP",
            10,
            "30049060",
            new BigDecimal("12.00"),
            true,
            false,
            List.of(initialBarcode)
        );

        MvcResult result = mockMvc.perform(post("/api/v1/products")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.name").value("Paracetamol 500mg Tablet"))
            .andExpect(jsonPath("$.data.baseUnit").value("TABLET"))
            .andExpect(jsonPath("$.data.sellingUnit").value("STRIP"))
            .andExpect(jsonPath("$.data.unitsPerSellingUnit").value(10))
            .andExpect(jsonPath("$.data.identifiers[0].identifierValue").value("8901234567890"))
            .andReturn();

        String productId = objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("id").asText();

        // 2. Add an internal SKU identifier
        AddProductIdentifierRequest skuReq = new AddProductIdentifierRequest(
            IdentifierType.SKU,
            "SKU-PARA-500",
            false
        );

        mockMvc.perform(post("/api/v1/products/" + productId + "/identifiers")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(skuReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.identifierType").value("SKU"))
            .andExpect(jsonPath("$.data.identifierValue").value("SKU-PARA-500"));

        // 3. Search product by barcode
        mockMvc.perform(get("/api/v1/products/search?q=8901234567890")
                .header("Authorization", "Bearer " + cashierToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[0].id").value(productId));

        // 4. Search product by generic name
        mockMvc.perform(get("/api/v1/products/search?q=Paracetamol")
                .header("Authorization", "Bearer " + operatorToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[0].id").value(productId));

        // 5. Update product status
        UpdateProductRequest updateReq = new UpdateProductRequest(
            null,
            "Paracetamol 500mg Forte",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            ProductStatus.ACTIVE
        );

        mockMvc.perform(patch("/api/v1/products/" + productId)
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("Paracetamol 500mg Forte"));
    }

    @Test
    @Transactional
    @DisplayName("Role authorization: INVENTORY_OPERATOR and CASHIER cannot create products")
    void testProductRoleAuthorization() throws Exception {
        CreateProductRequest createReq = new CreateProductRequest(
            null,
            null,
            "Vitamin C 500mg",
            null,
            null,
            null,
            DosageForm.TABLET,
            null,
            "TABLET",
            "STRIP",
            10,
            null,
            BigDecimal.ZERO,
            true,
            false,
            null
        );

        // Operator -> 403
        mockMvc.perform(post("/api/v1/products")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        // Cashier -> 403
        mockMvc.perform(post("/api/v1/products")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    @Test
    @Transactional
    @DisplayName("Cross-tenant isolation: Business B cannot access Business A product")
    void testCrossTenantProductIsolation() throws Exception {
        CreateProductRequest createReq = new CreateProductRequest(
            null,
            null,
            "Business A Medicine",
            null,
            null,
            null,
            DosageForm.TABLET,
            null,
            "TABLET",
            "STRIP",
            10,
            null,
            BigDecimal.ZERO,
            true,
            false,
            null
        );

        MvcResult resA = mockMvc.perform(post("/api/v1/products")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isCreated())
            .andReturn();

        String prodIdA = objectMapper.readTree(resA.getResponse().getContentAsString())
            .path("data").path("id").asText();

        String tokenB = jwtTokenProvider.generateAccessToken(
            UUID.randomUUID(),
            "owner@pbb.local",
            businessB.getId(),
            null,
            null,
            "OWNER"
        );

        mockMvc.perform(get("/api/v1/products/" + prodIdA)
                .header("Authorization", "Bearer " + tokenB))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @Transactional
    @DisplayName("Product search: case-insensitive, partial/contains matching, and tenant isolation")
    void testSearchProductsCaseInsensitiveAndPartial() throws Exception {
        CreateProductRequest createReq = new CreateProductRequest(
            null,
            null,
            "Medicine_1",
            "Generic Med One",
            "Brand Alpha",
            "PharmaCorp",
            DosageForm.TABLET,
            "500mg",
            "TABLET",
            "STRIP",
            10,
            null,
            BigDecimal.valueOf(100),
            true,
            false,
            null
        );

        mockMvc.perform(post("/api/v1/products")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isCreated());

        // 1. Lowercase search: "medicine_1" -> matches "Medicine_1"
        mockMvc.perform(get("/api/v1/products/search")
                .param("q", "medicine_1")
                .header("Authorization", "Bearer " + ownerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[0].name").value("Medicine_1"));

        // 2. Uppercase search: "MEDICINE_1" -> matches "Medicine_1"
        mockMvc.perform(get("/api/v1/products/search")
                .param("q", "MEDICINE_1")
                .header("Authorization", "Bearer " + ownerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[0].name").value("Medicine_1"));

        // 3. Mixed case search: "MeDiCiNe_1" -> matches "Medicine_1"
        mockMvc.perform(get("/api/v1/products/search")
                .param("q", "MeDiCiNe_1")
                .header("Authorization", "Bearer " + ownerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[0].name").value("Medicine_1"));

        // 4. Partial search: "medicine" -> matches "Medicine_1"
        mockMvc.perform(get("/api/v1/products/search")
                .param("q", "medicine")
                .header("Authorization", "Bearer " + ownerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[0].name").value("Medicine_1"));

        // 5. Tenant isolation: Business B searches for "medicine" and gets 0 results
        String tokenB = jwtTokenProvider.generateAccessToken(
            UUID.randomUUID(),
            "owner@pbb.local",
            businessB.getId(),
            null,
            null,
            "OWNER"
        );
        mockMvc.perform(get("/api/v1/products/search")
                .param("q", "medicine")
                .header("Authorization", "Bearer " + tokenB))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content").isEmpty());
    }

    private void seedStructuredTestCatalog() {
        // Product 1: Dolo 650 (TABLET, 650 mg, Micro Labs, sellingPrice=300, stock=50, reorderLevel=10)
        Product p1 = productRepository.save(new Product(
            businessA.getId(), null, null, "Dolo 650", "Paracetamol", "Micro Labs", "Micro Labs Ltd",
            DosageForm.TABLET, "650 mg", "TABLET", "STRIP", 10, null, BigDecimal.TEN, true, false
        ));
        InventoryItem item1 = inventoryItemRepository.save(new InventoryItem(
            businessA.getId(), storeA.getId(), p1.getId(), BigDecimal.valueOf(10), BigDecimal.valueOf(10), BigDecimal.ZERO, null, "R1", true
        ));
        item1.adjustStock(BigDecimal.valueOf(50));
        inventoryItemRepository.save(item1);
        inventoryBatchRepository.save(new InventoryBatch(
            businessA.getId(), storeA.getId(), p1.getId(), item1.getId(), "BAT-DOLO-1",
            LocalDate.now().minusMonths(2), LocalDate.now().plusYears(1), BigDecimal.valueOf(50),
            BigDecimal.valueOf(100), BigDecimal.valueOf(350), BigDecimal.valueOf(300)
        ));

        // In storeB, Dolo 650 has sellingPrice = 90
        InventoryItem item1B = inventoryItemRepository.save(new InventoryItem(
            businessA.getId(), storeB.getId(), p1.getId(), BigDecimal.valueOf(5), BigDecimal.valueOf(5), BigDecimal.ZERO, null, "R1", true
        ));
        item1B.adjustStock(BigDecimal.valueOf(20));
        inventoryItemRepository.save(item1B);
        inventoryBatchRepository.save(new InventoryBatch(
            businessA.getId(), storeB.getId(), p1.getId(), item1B.getId(), "BAT-DOLO-1B",
            LocalDate.now().minusMonths(2), LocalDate.now().plusYears(1), BigDecimal.valueOf(20),
            BigDecimal.valueOf(50), BigDecimal.valueOf(100), BigDecimal.valueOf(90)
        ));

        // Product 2: Dolo Cold (TABLET, 500 mg, Micro Labs, sellingPrice=150, stock=5, reorderLevel=20)
        Product p2 = productRepository.save(new Product(
            businessA.getId(), null, null, "Dolo Cold", "Paracetamol Phenylephrine", "Micro Labs", "Micro Labs Ltd",
            DosageForm.TABLET, "500 mg", "TABLET", "STRIP", 10, null, BigDecimal.TEN, true, false
        ));
        InventoryItem item2 = inventoryItemRepository.save(new InventoryItem(
            businessA.getId(), storeA.getId(), p2.getId(), BigDecimal.valueOf(20), BigDecimal.valueOf(10), BigDecimal.ZERO, null, "R2", true
        ));
        item2.adjustStock(BigDecimal.valueOf(5));
        inventoryItemRepository.save(item2);
        inventoryBatchRepository.save(new InventoryBatch(
            businessA.getId(), storeA.getId(), p2.getId(), item2.getId(), "BAT-DOLO-COLD",
            LocalDate.now().minusMonths(2), LocalDate.now().plusYears(1), BigDecimal.valueOf(5),
            BigDecimal.valueOf(80), BigDecimal.valueOf(160), BigDecimal.valueOf(150)
        ));

        // Product 3: Benadryl Cough (SYRUP, 100 ml, J&J, sellingPrice=260, stock=100, reorderLevel=15)
        Product p3 = productRepository.save(new Product(
            businessA.getId(), null, null, "Benadryl Cough", "Diphenhydramine", "J&J", "Johnson & Johnson",
            DosageForm.SYRUP, "100 ml", "BOTTLE", "BOTTLE", 1, null, BigDecimal.TEN, true, false
        ));
        InventoryItem item3 = inventoryItemRepository.save(new InventoryItem(
            businessA.getId(), storeA.getId(), p3.getId(), BigDecimal.valueOf(15), BigDecimal.valueOf(10), BigDecimal.ZERO, null, "R3", true
        ));
        item3.adjustStock(BigDecimal.valueOf(100));
        inventoryItemRepository.save(item3);
        inventoryBatchRepository.save(new InventoryBatch(
            businessA.getId(), storeA.getId(), p3.getId(), item3.getId(), "BAT-BEN-1",
            LocalDate.now().minusMonths(2), LocalDate.now().plusYears(1), BigDecimal.valueOf(100),
            BigDecimal.valueOf(150), BigDecimal.valueOf(280), BigDecimal.valueOf(260)
        ));

        // Product 4: Paracetamol D (TABLET, 500 mg, Apex, sellingPrice=80, stock=0, reorderLevel=5)
        Product p4 = productRepository.save(new Product(
            businessA.getId(), null, null, "Paracetamol D", "Paracetamol", "Apex", "Apex Laboratories",
            DosageForm.TABLET, "500 mg", "TABLET", "STRIP", 10, null, BigDecimal.TEN, true, false
        ));
        InventoryItem item4 = inventoryItemRepository.save(new InventoryItem(
            businessA.getId(), storeA.getId(), p4.getId(), BigDecimal.valueOf(5), BigDecimal.valueOf(10), BigDecimal.ZERO, null, "R4", true
        ));
        inventoryBatchRepository.save(new InventoryBatch(
            businessA.getId(), storeA.getId(), p4.getId(), item4.getId(), "BAT-PARA-D",
            LocalDate.now().minusMonths(2), LocalDate.now().plusYears(1), BigDecimal.valueOf(10),
            BigDecimal.valueOf(40), BigDecimal.valueOf(100), BigDecimal.valueOf(80)
        ));

        // Product 5: Medicine_1 (TABLET, 10 mg, Brand Alpha, sellingPrice=50, stock=10, reorderLevel=5)
        Product p5 = productRepository.save(new Product(
            businessA.getId(), null, null, "Medicine_1", "Generic Med One", "Brand Alpha", "PharmaCorp",
            DosageForm.TABLET, "10 mg", "TABLET", "STRIP", 10, null, BigDecimal.TEN, true, false
        ));
        InventoryItem item5 = inventoryItemRepository.save(new InventoryItem(
            businessA.getId(), storeA.getId(), p5.getId(), BigDecimal.valueOf(5), BigDecimal.valueOf(10), BigDecimal.ZERO, null, "R5", true
        ));
        item5.adjustStock(BigDecimal.valueOf(10));
        inventoryItemRepository.save(item5);
        inventoryBatchRepository.save(new InventoryBatch(
            businessA.getId(), storeA.getId(), p5.getId(), item5.getId(), "BAT-MED-1",
            LocalDate.now().minusMonths(2), LocalDate.now().plusYears(1), BigDecimal.valueOf(10),
            BigDecimal.valueOf(25), BigDecimal.valueOf(60), BigDecimal.valueOf(50)
        ));

        // Business B product: Dolo 650
        productRepository.save(new Product(
            businessB.getId(), null, null, "Dolo 650", "Paracetamol", "Micro Labs", "Micro Labs Ltd",
            DosageForm.TABLET, "650 mg", "TABLET", "STRIP", 10, null, BigDecimal.TEN, true, false
        ));
    }

    @Test
    @Transactional
    @DisplayName("Structured query: NAME CONTAINS and case-insensitivity")
    void testStructuredSearchNameContainsAndCaseInsensitive() throws Exception {
        seedStructuredTestCatalog();

        // 1. NAME CONTAINS "medicine" -> matches Medicine_1
        ProductSearchRequest req1 = new ProductSearchRequest(
            List.of(new ProductQueryCondition(ProductQueryField.NAME, QueryOperator.CONTAINS, "medicine", null, null)),
            storeA.getId()
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req1)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(1))
            .andExpect(jsonPath("$.data.content[0].name").value("Medicine_1"));

        // 2. Case variations: "medicine_1", "Medicine_1", "MEDICINE_1"
        for (String val : List.of("medicine_1", "Medicine_1", "MEDICINE_1")) {
            ProductSearchRequest reqCase = new ProductSearchRequest(
                List.of(new ProductQueryCondition(ProductQueryField.NAME, QueryOperator.CONTAINS, val, null, null)),
                storeA.getId()
            );
            mockMvc.perform(post("/api/v1/products/search")
                    .header("Authorization", "Bearer " + ownerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(reqCase)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].name").value("Medicine_1"));
        }
    }

    @Test
    @Transactional
    @DisplayName("Structured query: NAME STARTS_WITH, ENDS_WITH, and EQUALS")
    void testStructuredSearchNamePrefixAndSuffix() throws Exception {
        seedStructuredTestCatalog();

        // STARTS_WITH "DOL" -> Dolo 650, Dolo Cold
        ProductSearchRequest reqStart = new ProductSearchRequest(
            List.of(new ProductQueryCondition(ProductQueryField.NAME, QueryOperator.STARTS_WITH, "DOL", null, null)),
            storeA.getId()
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqStart)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(2));

        // ENDS_WITH "D" -> Paracetamol D, Dolo Cold
        ProductSearchRequest reqEnd = new ProductSearchRequest(
            List.of(new ProductQueryCondition(ProductQueryField.NAME, QueryOperator.ENDS_WITH, "D", null, null)),
            storeA.getId()
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqEnd)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(2));
    }

    @Test
    @Transactional
    @DisplayName("Structured query: DOSAGE_FORM EQUALS TABLET excludes other forms")
    void testStructuredSearchDosageForm() throws Exception {
        seedStructuredTestCatalog();

        ProductSearchRequest req = new ProductSearchRequest(
            List.of(new ProductQueryCondition(ProductQueryField.DOSAGE_FORM, QueryOperator.EQUALS, "TABLET", null, null)),
            storeA.getId()
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(4));
    }

    @Test
    @Transactional
    @DisplayName("Structured query: PRICE numeric comparisons and BETWEEN")
    void testStructuredSearchPriceComparisons() throws Exception {
        seedStructuredTestCatalog();

        // GREATER_THAN 250 -> Dolo 650 (300), Benadryl Cough (260)
        ProductSearchRequest reqGt = new ProductSearchRequest(
            List.of(new ProductQueryCondition(ProductQueryField.PRICE, QueryOperator.GREATER_THAN, "250", null, null)),
            storeA.getId()
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqGt)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(2));

        // LESS_THAN 100 -> Paracetamol D (80), Medicine_1 (50)
        ProductSearchRequest reqLt = new ProductSearchRequest(
            List.of(new ProductQueryCondition(ProductQueryField.PRICE, QueryOperator.LESS_THAN, "100", null, null)),
            storeA.getId()
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqLt)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(2));

        // GREATER_THAN_OR_EQUAL 260 -> Dolo 650 (300), Benadryl Cough (260)
        ProductSearchRequest reqGte = new ProductSearchRequest(
            List.of(new ProductQueryCondition(ProductQueryField.PRICE, QueryOperator.GREATER_THAN_OR_EQUAL, "260", null, null)),
            storeA.getId()
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqGte)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(2));

        // LESS_THAN_OR_EQUAL 80 -> Paracetamol D (80), Medicine_1 (50)
        ProductSearchRequest reqLte = new ProductSearchRequest(
            List.of(new ProductQueryCondition(ProductQueryField.PRICE, QueryOperator.LESS_THAN_OR_EQUAL, "80", null, null)),
            storeA.getId()
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqLte)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(2));

        // BETWEEN 100 AND 300 -> Dolo Cold (150), Benadryl Cough (260), Dolo 650 (300)
        ProductSearchRequest reqBetween = new ProductSearchRequest(
            List.of(new ProductQueryCondition(ProductQueryField.PRICE, QueryOperator.BETWEEN, "100", "300", null)),
            storeA.getId()
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqBetween)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(3));
    }

    @Test
    @Transactional
    @DisplayName("Structured query: STRENGTH numeric comparison with unit")
    void testStructuredSearchStrengthComparison() throws Exception {
        seedStructuredTestCatalog();

        // STRENGTH > 100 unit=mg -> Dolo 650 (650 mg), Dolo Cold (500 mg), Paracetamol D (500 mg)
        // Excludes Medicine_1 (10 mg) and Benadryl Cough (100 ml)
        ProductSearchRequest req = new ProductSearchRequest(
            List.of(new ProductQueryCondition(ProductQueryField.STRENGTH, QueryOperator.GREATER_THAN, "100", null, "mg")),
            storeA.getId()
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(3));
    }

    @Test
    @Transactional
    @DisplayName("Structured query: STOCK and REORDER_LEVEL comparisons")
    void testStructuredSearchStockAndReorderLevel() throws Exception {
        seedStructuredTestCatalog();

        // STOCK < 10 -> Paracetamol D (0), Dolo Cold (5)
        ProductSearchRequest reqStock = new ProductSearchRequest(
            List.of(new ProductQueryCondition(ProductQueryField.STOCK, QueryOperator.LESS_THAN, "10", null, null)),
            storeA.getId()
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqStock)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(2));

        // REORDER_LEVEL > 15 -> Dolo Cold (20)
        ProductSearchRequest reqReorder = new ProductSearchRequest(
            List.of(new ProductQueryCondition(ProductQueryField.REORDER_LEVEL, QueryOperator.GREATER_THAN, "15", null, null)),
            storeA.getId()
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqReorder)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(1))
            .andExpect(jsonPath("$.data.content[0].name").value("Dolo Cold"));
    }

    @Test
    @Transactional
    @DisplayName("Structured query: Multi-condition AND (TABLET + PRICE > 250) and Three-condition AND")
    void testStructuredSearchMultiConditionAnd() throws Exception {
        seedStructuredTestCatalog();

        // Multi-condition AND: DOSAGE_FORM = TABLET + PRICE > 250 -> only Dolo 650 (300)
        // Benadryl Cough is excluded (SYRUP), Dolo Cold is excluded (150)
        ProductSearchRequest reqTwo = new ProductSearchRequest(
            List.of(
                new ProductQueryCondition(ProductQueryField.DOSAGE_FORM, QueryOperator.EQUALS, "TABLET", null, null),
                new ProductQueryCondition(ProductQueryField.PRICE, QueryOperator.GREATER_THAN, "250", null, null)
            ),
            storeA.getId()
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqTwo)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(1))
            .andExpect(jsonPath("$.data.content[0].name").value("Dolo 650"));

        // Three-condition AND: DOSAGE_FORM = TABLET + NAME STARTS_WITH "DOL" + PRICE > 250 -> Dolo 650
        ProductSearchRequest reqThree = new ProductSearchRequest(
            List.of(
                new ProductQueryCondition(ProductQueryField.DOSAGE_FORM, QueryOperator.EQUALS, "TABLET", null, null),
                new ProductQueryCondition(ProductQueryField.NAME, QueryOperator.STARTS_WITH, "DOL", null, null),
                new ProductQueryCondition(ProductQueryField.PRICE, QueryOperator.GREATER_THAN, "250", null, null)
            ),
            storeA.getId()
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqThree)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(1))
            .andExpect(jsonPath("$.data.content[0].name").value("Dolo 650"));

        // No result condition
        ProductSearchRequest reqEmpty = new ProductSearchRequest(
            List.of(new ProductQueryCondition(ProductQueryField.NAME, QueryOperator.CONTAINS, "NON_EXISTENT_XYZ", null, null)),
            storeA.getId()
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqEmpty)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content").isEmpty());
    }

    @Test
    @Transactional
    @DisplayName("Structured query: Tenant and store isolation")
    void testStructuredSearchTenantAndStoreIsolation() throws Exception {
        seedStructuredTestCatalog();

        // 1. Tenant Isolation: Business B token searching for Dolo returns Business B product only
        String tokenB = jwtTokenProvider.generateAccessToken(
            UUID.randomUUID(),
            "owner@pbb.local",
            businessB.getId(),
            null,
            null,
            "OWNER"
        );
        ProductSearchRequest reqB = new ProductSearchRequest(
            List.of(new ProductQueryCondition(ProductQueryField.NAME, QueryOperator.CONTAINS, "Dolo", null, null))
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + tokenB)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqB)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(1));

        // 2. Store Isolation: In storeB, Dolo 650 price is 90. Searching PRICE > 250 in storeB yields 0
        ProductSearchRequest reqStoreB = new ProductSearchRequest(
            List.of(new ProductQueryCondition(ProductQueryField.PRICE, QueryOperator.GREATER_THAN, "250", null, null)),
            storeB.getId()
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqStoreB)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content").isEmpty());

        // 3. Store isolation: Searching PRICE < 100 in storeB yields Dolo 650
        ProductSearchRequest reqStoreBPrice = new ProductSearchRequest(
            List.of(new ProductQueryCondition(ProductQueryField.PRICE, QueryOperator.LESS_THAN, "100", null, null)),
            storeB.getId()
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqStoreBPrice)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(1))
            .andExpect(jsonPath("$.data.content[0].name").value("Dolo 650"));
    }

    @Test
    @Transactional
    @DisplayName("Structured query: Missing store context and validations")
    void testStructuredSearchValidationsAndErrors() throws Exception {
        // 1. Missing store context when token has no storeId and request has no storeId
        String tokenNoStore = jwtTokenProvider.generateAccessToken(
            UUID.randomUUID(),
            "owner@pba.local",
            businessA.getId(),
            null,
            null,
            "OWNER"
        );
        String bodyMissingStore = """
            {
              "conditions": [
                {
                  "field": "PRICE",
                  "operator": "GREATER_THAN",
                  "value": "250"
                }
              ]
            }
        """;
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + tokenNoStore)
                .contentType(MediaType.APPLICATION_JSON)
                .content(bodyMissingStore))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.errorCode").value("STORE_CONTEXT_REQUIRED"));

        // 2. Invalid numeric value
        String bodyInvalidNum = """
            {
              "conditions": [
                {
                  "field": "PRICE",
                  "operator": "GREATER_THAN",
                  "value": "not_a_number"
                }
              ],
              "storeId": "%s"
            }
        """.formatted(storeA.getId());
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(bodyInvalidNum))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.errorCode").value("INVALID_NUMERIC_VALUE"));

        // 3. Invalid BETWEEN range (lower > upper)
        String bodyInvalidBetween = """
            {
              "conditions": [
                {
                  "field": "PRICE",
                  "operator": "BETWEEN",
                  "value": "500",
                  "secondaryValue": "100"
                }
              ],
              "storeId": "%s"
            }
        """.formatted(storeA.getId());
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(bodyInvalidBetween))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.errorCode").value("INVALID_BETWEEN_RANGE"));

        // 4. Store access denied: Cashier (locked to storeA) attempting to query storeB
        String bodyStoreB = """
            {
              "conditions": [
                {
                  "field": "NAME",
                  "operator": "CONTAINS",
                  "value": "Dolo"
                }
              ],
              "storeId": "%s"
            }
        """.formatted(storeB.getId());
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + cashierToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(bodyStoreB))
            .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    @DisplayName("Structured query: returns store-specific inventoryItemId and preserves multi-store isolation")
    void testStructuredSearchStoreInventoryIsolation() throws Exception {
        // Create Product X in Business A
        Product productX = productRepository.save(new Product(
            businessA.getId(), null, null, "MultiStore Med X", "Generic X", "Brand X", "Manufacturer X",
            DosageForm.TABLET, "500 mg", "TABLET", "STRIP", 10, null, BigDecimal.TEN, true, false
        ));

        // Create InventoryItem in Store A
        InventoryItem itemStoreA = new InventoryItem(
            businessA.getId(), storeA.getId(), productX.getId(), BigDecimal.valueOf(20), BigDecimal.valueOf(10), BigDecimal.ZERO, null, "RACK-A", true
        );
        itemStoreA.setStock(BigDecimal.valueOf(100));
        itemStoreA = inventoryItemRepository.save(itemStoreA);

        // Create InventoryItem in Store B
        InventoryItem itemStoreB = new InventoryItem(
            businessA.getId(), storeB.getId(), productX.getId(), BigDecimal.valueOf(10), BigDecimal.valueOf(5), BigDecimal.ZERO, null, "RACK-B", true
        );
        itemStoreB.setStock(BigDecimal.valueOf(45));
        itemStoreB = inventoryItemRepository.save(itemStoreB);

        // Search scoped to Store A -> must return itemStoreA.id and stock 100
        ProductSearchRequest reqStoreA = new ProductSearchRequest(
            "MultiStore Med X",
            List.of(new ProductQueryCondition(ProductQueryField.DOSAGE_FORM, QueryOperator.EQUALS, "TABLET", null, null)),
            storeA.getId()
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqStoreA)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(1))
            .andExpect(jsonPath("$.data.content[0].id").value(productX.getId().toString()))
            .andExpect(jsonPath("$.data.content[0].inventoryItemId").value(itemStoreA.getId().toString()))
            .andExpect(jsonPath("$.data.content[0].currentStock").value(100.0));

        // Search scoped to Store B -> must return itemStoreB.id and stock 45, NOT itemStoreA
        ProductSearchRequest reqStoreB = new ProductSearchRequest(
            "MultiStore Med X",
            List.of(new ProductQueryCondition(ProductQueryField.DOSAGE_FORM, QueryOperator.EQUALS, "TABLET", null, null)),
            storeB.getId()
        );
        mockMvc.perform(post("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqStoreB)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(1))
            .andExpect(jsonPath("$.data.content[0].id").value(productX.getId().toString()))
            .andExpect(jsonPath("$.data.content[0].inventoryItemId").value(itemStoreB.getId().toString()))
            .andExpect(jsonPath("$.data.content[0].currentStock").value(45.0));

        // Legacy GET catalog search -> leaves inventoryItemId as null
        mockMvc.perform(get("/api/v1/products/search")
                .header("Authorization", "Bearer " + ownerToken)
                .param("q", "MultiStore Med X"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(1))
            .andExpect(jsonPath("$.data.content[0].inventoryItemId").doesNotExist());
    }
}
