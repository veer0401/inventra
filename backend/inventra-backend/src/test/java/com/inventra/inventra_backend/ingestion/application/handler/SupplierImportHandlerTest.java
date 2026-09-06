package com.inventra.inventra_backend.ingestion.application.handler;

import com.inventra.inventra_backend.ingestion.application.dto.EntityMatchResult;
import com.inventra.inventra_backend.ingestion.domain.model.ImportDomain;
import com.inventra.inventra_backend.ingestion.domain.model.ImportValidationIssue;
import com.inventra.inventra_backend.purchasing.application.SupplierService;
import com.inventra.inventra_backend.purchasing.domain.model.Supplier;
import com.inventra.inventra_backend.purchasing.domain.repository.SupplierRepository;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SupplierImportHandlerTest {

    @Mock private SupplierRepository supplierRepository;
    @Mock private SupplierService supplierService;

    private SupplierImportHandler handler;
    private final UUID businessId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        handler = new SupplierImportHandler(supplierRepository, supplierService);
    }

    @Test
    @DisplayName("Should return SUPPLIERS domain")
    void shouldReturnCorrectDomain() {
        assertEquals(ImportDomain.SUPPLIERS, handler.getDomain());
        assertNotNull(handler.getTemplateMetadata());
    }

    @Test
    @DisplayName("Should normalize and validate supplier fields")
    void shouldNormalizeAndValidate() {
        Map<String, String> raw = Map.of(
            "Supplier Name", "Apollo Pharma Distributors",
            "GSTIN", "27AABCT3518Q1Z5",
            "Credit Period (Days)", "45"
        );

        Map<String, Object> normalized = handler.normalizeRow(raw);
        assertEquals("Apollo Pharma Distributors", normalized.get("supplierName"));
        assertEquals("27AABCT3518Q1Z5", normalized.get("gstin"));
        assertEquals(45, normalized.get("creditPeriodDays"));

        UUID rowId = UUID.randomUUID();
        List<ImportValidationIssue> issues = handler.validateRow(rowId, normalized, businessId, null);
        assertTrue(issues.isEmpty());
    }

    @Test
    @DisplayName("Should match supplier by GSTIN")
    void shouldMatchSupplierByGstin() {
        UUID supplierId = UUID.randomUUID();
        Supplier mockSupplier = mock(Supplier.class);
        when(mockSupplier.getId()).thenReturn(supplierId);
        when(mockSupplier.getTradeName()).thenReturn("Apollo Pharma");

        when(supplierRepository.findByBusinessIdAndGstin(businessId, "27AABCT3518Q1Z5"))
            .thenReturn(Optional.of(mockSupplier));

        EntityMatchResult match = handler.matchEntity(Map.of("gstin", "27AABCT3518Q1Z5"), businessId, null);

        assertEquals(supplierId, match.matchedEntityId());
        assertEquals(new BigDecimal("1.00"), match.matchConfidence());
    }
}
