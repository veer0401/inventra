package com.inventra.inventra_backend.ingestion.application.handler;

import com.inventra.inventra_backend.catalog.application.CategoryService;
import com.inventra.inventra_backend.catalog.application.ProductService;
import com.inventra.inventra_backend.catalog.domain.model.Category;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.model.ProductIdentifier;
import com.inventra.inventra_backend.catalog.domain.repository.CategoryRepository;
import com.inventra.inventra_backend.catalog.domain.repository.ProductIdentifierRepository;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.ingestion.application.dto.EntityMatchResult;
import com.inventra.inventra_backend.ingestion.domain.model.ImportDomain;
import com.inventra.inventra_backend.ingestion.domain.model.ImportValidationIssue;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductCatalogImportHandlerTest {

    @Mock private ProductRepository productRepository;
    @Mock private ProductIdentifierRepository productIdentifierRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private ProductService productService;
    @Mock private CategoryService categoryService;

    private ProductCatalogImportHandler handler;
    private final UUID businessId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        handler = new ProductCatalogImportHandler(
            productRepository,
            productIdentifierRepository,
            categoryRepository,
            productService,
            categoryService
        );
    }

    @Test
    @DisplayName("Should return PRODUCT_CATALOG domain")
    void shouldReturnCorrectDomain() {
        assertEquals(ImportDomain.PRODUCT_CATALOG, handler.getDomain());
        assertNotNull(handler.getTemplateMetadata());
        assertEquals(10, handler.getTemplateMetadata().columns().size());
    }

    @Test
    @DisplayName("Should normalize raw fields and sanitize formulas")
    void shouldNormalizeRawFields() {
        Map<String, String> raw = Map.of(
            "Product Name", "=CMD(\"calc\")",
            "Category", "Analgesics",
            "Dosage Form", "tablet",
            "GST Rate", "12%",
            "Prescription Required", "YES",
            "Barcode / GTIN", "8901234567890"
        );

        Map<String, Object> normalized = handler.normalizeRow(raw);

        assertEquals("'=CMD(\"calc\")", normalized.get("name"));
        assertEquals("Analgesics", normalized.get("categoryName"));
        assertEquals("TABLET", normalized.get("dosageForm"));
        assertEquals(new BigDecimal("12.00"), normalized.get("gstRate"));
        assertEquals(true, normalized.get("prescriptionRequired"));
        assertEquals("8901234567890", normalized.get("barcode"));
    }

    @Test
    @DisplayName("Should validate required fields and reject invalid GST rates")
    void shouldValidateFields() {
        UUID rowId = UUID.randomUUID();

        // Valid row
        Map<String, Object> validRow = Map.of(
            "name", "Dolo 650mg",
            "categoryName", "Analgesics",
            "dosageForm", "TABLET",
            "gstRate", new BigDecimal("12.00")
        );
        List<ImportValidationIssue> issues = handler.validateRow(rowId, validRow, businessId, null);
        assertTrue(issues.isEmpty());

        // Invalid row missing name and invalid GST rate
        Map<String, Object> invalidRow = Map.of(
            "name", "",
            "categoryName", "Analgesics",
            "dosageForm", "INVALID_FORM",
            "gstRate", new BigDecimal("7.00")
        );
        List<ImportValidationIssue> invalidIssues = handler.validateRow(rowId, invalidRow, businessId, null);
        assertEquals(3, invalidIssues.size());
    }

    @Test
    @DisplayName("Should match existing product by barcode")
    void shouldMatchProductByBarcode() {
        UUID productId = UUID.randomUUID();
        Product mockProduct = mock(Product.class);
        when(mockProduct.getId()).thenReturn(productId);
        when(mockProduct.getName()).thenReturn("Dolo 650mg");

        ProductIdentifier mockPi = mock(ProductIdentifier.class);
        when(mockPi.getProductId()).thenReturn(productId);

        when(productIdentifierRepository.findByBusinessIdAndIdentifierValue(businessId, "8901234567890"))
            .thenReturn(Optional.of(mockPi));
        when(productRepository.findByIdAndBusinessId(productId, businessId))
            .thenReturn(Optional.of(mockProduct));

        EntityMatchResult match = handler.matchEntity(Map.of("barcode", "8901234567890"), businessId, null);

        assertEquals(productId, match.matchedEntityId());
        assertEquals(new BigDecimal("1.00"), match.matchConfidence());
    }
}
