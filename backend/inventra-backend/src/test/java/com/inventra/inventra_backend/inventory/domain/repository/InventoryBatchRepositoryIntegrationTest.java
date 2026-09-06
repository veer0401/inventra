package com.inventra.inventra_backend.inventory.domain.repository;

import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.inventory.domain.model.InventoryBatch;
import com.inventra.inventra_backend.inventory.domain.model.InventoryItem;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class InventoryBatchRepositoryIntegrationTest {

    @Autowired
    private InventoryBatchRepository inventoryBatchRepository;

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private StoreRepository storeRepository;

    private Business businessA;
    private Business businessB;
    private Store storeA;
    private Product productA1;
    private Product productA2;
    private InventoryItem itemA1;
    private InventoryItem itemA2;

    @BeforeEach
    void setUp() {
        businessA = businessRepository.save(Business.create("Pharmacy Alpha " + UUID.randomUUID().toString().substring(0, 8), null, null, null));
        businessB = businessRepository.save(Business.create("Pharmacy Beta " + UUID.randomUUID().toString().substring(0, 8), null, null, null));

        storeA = storeRepository.save(Store.create(businessA.getId(), "ST-A-" + UUID.randomUUID().toString().substring(0, 6), "Store A", true));

        productA1 = productRepository.save(new Product(
            businessA.getId(), null, null, "Amoxicillin 500mg", "Amoxicillin", "Amoxil", "GSK",
            DosageForm.CAPSULE, "500mg", "CAPSULE", "STRIP", 10, "30041000", new BigDecimal("12.00"), true, true
        ));

        productA2 = productRepository.save(new Product(
            businessA.getId(), null, null, "Azithromycin 250mg", "Azithromycin", "Zithromax", "Pfizer",
            DosageForm.TABLET, "250mg", "TABLET", "STRIP", 6, "30042000", new BigDecimal("12.00"), true, true
        ));

        itemA1 = inventoryItemRepository.save(new InventoryItem(businessA.getId(), storeA.getId(), productA1.getId(), null, null, null, null, null, true));
        itemA2 = inventoryItemRepository.save(new InventoryItem(businessA.getId(), storeA.getId(), productA2.getId(), null, null, null, null, null, true));
    }

    @Test
    @DisplayName("Bulk FEFO query fetches candidate batches for multiple products in a single call while excluding expired ones")
    void testFindFefoBatchesForProducts() {
        // Product 1: Batches
        InventoryBatch b1Expired = inventoryBatchRepository.save(new InventoryBatch(
            businessA.getId(), storeA.getId(), productA1.getId(), itemA1.getId(), "AMOX-EXP",
            LocalDate.now().minusMonths(6), LocalDate.now().minusDays(1),
            new BigDecimal("10.000"), new BigDecimal("5.00"), new BigDecimal("10.00"), new BigDecimal("8.00")
        ));

        InventoryBatch b1Earliest = inventoryBatchRepository.save(new InventoryBatch(
            businessA.getId(), storeA.getId(), productA1.getId(), itemA1.getId(), "AMOX-FEFO-1",
            LocalDate.now().minusMonths(2), LocalDate.now().plusMonths(3),
            new BigDecimal("20.000"), new BigDecimal("5.00"), new BigDecimal("10.00"), new BigDecimal("8.00")
        ));

        InventoryBatch b1Later = inventoryBatchRepository.save(new InventoryBatch(
            businessA.getId(), storeA.getId(), productA1.getId(), itemA1.getId(), "AMOX-FEFO-2",
            LocalDate.now().minusMonths(1), LocalDate.now().plusMonths(9),
            new BigDecimal("30.000"), new BigDecimal("5.00"), new BigDecimal("10.00"), new BigDecimal("8.00")
        ));

        // Product 2: Batches
        InventoryBatch b2Valid = inventoryBatchRepository.save(new InventoryBatch(
            businessA.getId(), storeA.getId(), productA2.getId(), itemA2.getId(), "AZITH-FEFO-1",
            LocalDate.now().minusMonths(1), LocalDate.now().plusMonths(6),
            new BigDecimal("15.000"), new BigDecimal("10.00"), new BigDecimal("20.00"), new BigDecimal("18.00")
        ));

        List<InventoryBatch> results = inventoryBatchRepository.findFefoBatchesForProducts(
            businessA.getId(),
            storeA.getId(),
            List.of(productA1.getId(), productA2.getId()),
            LocalDate.now()
        );

        // Expired batch should NOT be in results
        assertThat(results).extracting(InventoryBatch::getBatchNumber)
            .doesNotContain("AMOX-EXP")
            .contains("AMOX-FEFO-1", "AMOX-FEFO-2", "AZITH-FEFO-1");

        // AMOX-FEFO-1 should appear before AMOX-FEFO-2 due to earlier expiry
        int idx1 = -1, idx2 = -1;
        for (int i = 0; i < results.size(); i++) {
            if ("AMOX-FEFO-1".equals(results.get(i).getBatchNumber())) idx1 = i;
            if ("AMOX-FEFO-2".equals(results.get(i).getBatchNumber())) idx2 = i;
        }
        assertThat(idx1).isLessThan(idx2);
    }

    @Test
    @DisplayName("findByBusinessIdAndStoreIdAndProductIdAndBatchNumber enforces strict tenant isolation")
    void testTenantIsolationOnBatchLookup() {
        inventoryBatchRepository.save(new InventoryBatch(
            businessA.getId(), storeA.getId(), productA1.getId(), itemA1.getId(), "AMOX-TENANT-01",
            LocalDate.now().minusMonths(2), LocalDate.now().plusMonths(6),
            new BigDecimal("25.000"), new BigDecimal("5.00"), new BigDecimal("10.00"), new BigDecimal("8.00")
        ));

        // Matching business A should find the batch
        Optional<InventoryBatch> found = inventoryBatchRepository.findByBusinessIdAndStoreIdAndProductIdAndBatchNumber(
            businessA.getId(), storeA.getId(), productA1.getId(), "AMOX-TENANT-01"
        );
        assertThat(found).isPresent();

        // Non-matching business B MUST return empty (strict tenant barrier)
        Optional<InventoryBatch> crossTenantLookup = inventoryBatchRepository.findByBusinessIdAndStoreIdAndProductIdAndBatchNumber(
            businessB.getId(), storeA.getId(), productA1.getId(), "AMOX-TENANT-01"
        );
        assertThat(crossTenantLookup).isEmpty();
    }
}
