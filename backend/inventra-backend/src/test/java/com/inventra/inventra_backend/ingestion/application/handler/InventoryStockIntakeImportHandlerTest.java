package com.inventra.inventra_backend.ingestion.application.handler;

import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.repository.ProductIdentifierRepository;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.ingestion.domain.model.ImportDomain;
import com.inventra.inventra_backend.ingestion.domain.model.ImportValidationIssue;
import com.inventra.inventra_backend.inventory.domain.model.InventoryItem;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryBatchRepository;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryItemRepository;
import com.inventra.inventra_backend.inventory.domain.repository.StockMovementRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
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
class InventoryStockIntakeImportHandlerTest {

    @Mock private ProductRepository productRepository;
    @Mock private ProductIdentifierRepository productIdentifierRepository;
    @Mock private InventoryItemRepository inventoryItemRepository;
    @Mock private InventoryBatchRepository inventoryBatchRepository;
    @Mock private StockMovementRepository stockMovementRepository;

    private InventoryStockIntakeImportHandler handler;
    private final UUID businessId = UUID.randomUUID();
    private final UUID storeId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        handler = new InventoryStockIntakeImportHandler(
            productRepository,
            productIdentifierRepository,
            inventoryItemRepository,
            inventoryBatchRepository,
            stockMovementRepository
        );
    }

    @Test
    @DisplayName("Should return INVENTORY domain")
    void shouldReturnCorrectDomain() {
        assertEquals(ImportDomain.INVENTORY, handler.getDomain());
        assertNotNull(handler.getTemplateMetadata());
    }

    @Test
    @DisplayName("Should normalize inventory row with price and date formats")
    void shouldNormalizeInventoryRow() {
        Map<String, String> raw = Map.of(
            "Product Name or Barcode", "Dolo 650mg",
            "Batch Lot Number", "bat-2026-01",
            "Expiration Date", "2028-12-31",
            "Initial Stock Quantity", "100",
            "Purchase Cost per Unit (₹)", "₹ 24.50",
            "Maximum Retail Price (₹)", "₹ 35.00",
            "Selling Price (₹)", "₹ 32.00"
        );

        Map<String, Object> normalized = handler.normalizeRow(raw);

        assertEquals("Dolo 650mg", normalized.get("productIdentifier"));
        assertEquals("BAT-2026-01", normalized.get("batchNumber"));
        assertEquals(LocalDate.of(2028, 12, 31), normalized.get("expiryDate"));
        assertEquals(new BigDecimal("100.000"), normalized.get("quantity"));
        assertEquals(new BigDecimal("24.500"), normalized.get("unitCost"));
        assertEquals(new BigDecimal("35.000"), normalized.get("mrp"));
        assertEquals(new BigDecimal("32.000"), normalized.get("sellingPrice"));
    }

    @Test
    @DisplayName("Should require store context and validate positive quantities and valid prices")
    void shouldValidateInvariants() {
        UUID rowId = UUID.randomUUID();

        // 1. Missing store context
        Map<String, Object> validRow = Map.of(
            "productIdentifier", "Dolo 650mg",
            "batchNumber", "BAT-01",
            "expiryDate", LocalDate.now().plusYears(1),
            "quantity", new BigDecimal("100"),
            "unitCost", new BigDecimal("20.00"),
            "mrp", new BigDecimal("30.00"),
            "sellingPrice", new BigDecimal("28.00")
        );
        List<ImportValidationIssue> noStoreIssues = handler.validateRow(rowId, validRow, businessId, null);
        assertTrue(noStoreIssues.stream().anyMatch(i -> i.getErrorCode().equals("STORE_CONTEXT_REQUIRED")));

        // 2. Valid with store context
        List<ImportValidationIssue> validIssues = handler.validateRow(rowId, validRow, businessId, storeId);
        assertTrue(validIssues.isEmpty());

        // 3. Selling price exceeds MRP
        Map<String, Object> invalidPrices = Map.of(
            "productIdentifier", "Dolo 650mg",
            "batchNumber", "BAT-01",
            "expiryDate", LocalDate.now().plusYears(1),
            "quantity", new BigDecimal("100"),
            "unitCost", new BigDecimal("20.00"),
            "mrp", new BigDecimal("30.00"),
            "sellingPrice", new BigDecimal("35.00")
        );
        List<ImportValidationIssue> priceIssues = handler.validateRow(rowId, invalidPrices, businessId, storeId);
        assertTrue(priceIssues.stream().anyMatch(i -> i.getErrorCode().equals("PRICE_EXCEEDS_MRP")));

        // 4. Past expiry date
        Map<String, Object> expiredBatch = Map.of(
            "productIdentifier", "Dolo 650mg",
            "batchNumber", "BAT-01",
            "expiryDate", LocalDate.now().minusDays(1),
            "quantity", new BigDecimal("100"),
            "unitCost", new BigDecimal("20.00"),
            "mrp", new BigDecimal("30.00"),
            "sellingPrice", new BigDecimal("25.00")
        );
        List<ImportValidationIssue> expIssues = handler.validateRow(rowId, expiredBatch, businessId, storeId);
        assertTrue(expIssues.stream().anyMatch(i -> i.getErrorCode().equals("EXPIRED_DATE")));
    }
}
