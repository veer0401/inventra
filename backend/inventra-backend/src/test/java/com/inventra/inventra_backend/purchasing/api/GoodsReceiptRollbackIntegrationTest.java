package com.inventra.inventra_backend.purchasing.api;

import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.inventory.domain.model.InventoryItem;
import com.inventra.inventra_backend.inventory.domain.model.StockMovement;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryBatchRepository;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryItemRepository;
import com.inventra.inventra_backend.inventory.domain.repository.StockMovementRepository;
import com.inventra.inventra_backend.purchasing.api.dto.CreateGoodsReceiptLineRequest;
import com.inventra.inventra_backend.purchasing.api.dto.CreateGoodsReceiptRequest;
import com.inventra.inventra_backend.purchasing.api.dto.CreatePurchaseOrderLineRequest;
import com.inventra.inventra_backend.purchasing.api.dto.CreatePurchaseOrderRequest;
import com.inventra.inventra_backend.purchasing.application.GoodsReceiptService;
import com.inventra.inventra_backend.purchasing.application.PurchaseOrderService;
import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceipt;
import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceiptStatus;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrder;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrderLine;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrderStatus;
import com.inventra.inventra_backend.purchasing.domain.model.Supplier;
import com.inventra.inventra_backend.purchasing.domain.model.SupplierType;
import com.inventra.inventra_backend.purchasing.domain.repository.GoodsReceiptRepository;
import com.inventra.inventra_backend.purchasing.domain.repository.PurchaseOrderRepository;
import com.inventra.inventra_backend.purchasing.domain.repository.SupplierRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class GoodsReceiptRollbackIntegrationTest {

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private com.inventra.inventra_backend.purchasing.domain.repository.PurchaseOrderLineRepository purchaseOrderLineRepository;

    @Autowired
    private PurchaseOrderService purchaseOrderService;

    @Autowired
    private GoodsReceiptRepository goodsReceiptRepository;

    @Autowired
    private GoodsReceiptService goodsReceiptService;

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private InventoryBatchRepository inventoryBatchRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    private Business business;
    private Store store;
    private Supplier supplier;
    private Product product1;
    private Product product2;
    private User user;

    @BeforeEach
    void setUp() {
        business = businessRepository.save(Business.create("Rollback Test Biz", "RTB", null, null));
        store = storeRepository.save(Store.create(business.getId(), "RTS", "Store R", true));
        user = userRepository.save(User.create("user." + UUID.randomUUID() + "@rtb.local", "hash", "User R", null));

        supplier = supplierRepository.save(new Supplier(
            business.getId(),
            "SUP-RB-01",
            "Rollback Test Supplier",
            "RTS",
            SupplierType.DISTRIBUTOR,
            null, null, null, null, null, null, null, null, null, null, null, 30, null, null
        ));

        product1 = productRepository.save(new Product(
            business.getId(),
            null, null,
            "Product Rollback 1",
            null, null, null,
            DosageForm.TABLET,
            "100mg", "TABLET", "STRIP", 10, null,
            new BigDecimal("12.00"),
            true, true
        ));

        product2 = productRepository.save(new Product(
            business.getId(),
            null, null,
            "Product Rollback 2",
            null, null, null,
            DosageForm.SYRUP,
            "100ml", "BOTTLE", "BOTTLE", 1, null,
            new BigDecimal("50.00"),
            true, true
        ));
    }

    @Test
    @DisplayName("Failing line in multi-line GoodsReceipt completely rolls back all inventory, batch, stock movement and PO mutations")
    void testAtomicGoodsReceiptRollbackOnLineFailure() {
        // Step 1: Create and confirm a PO for Product 1 (50 units) and Product 2 (10 units)
        var poResponse = purchaseOrderService.createPurchaseOrder(business.getId(), new CreatePurchaseOrderRequest(
            store.getId(),
            supplier.getId(),
            LocalDate.now(),
            LocalDate.now().plusDays(5),
            BigDecimal.ZERO,
            "PO for rollback testing",
            List.of(
                new CreatePurchaseOrderLineRequest(
                    product1.getId(),
                    null,
                    "STRIP",
                    1,
                    new BigDecimal("50.000"),
                    new BigDecimal("10.0000"),
                    BigDecimal.ZERO,
                    BigDecimal.ZERO
                ),
                new CreatePurchaseOrderLineRequest(
                    product2.getId(),
                    null,
                    "BOTTLE",
                    1,
                    new BigDecimal("10.000"),
                    new BigDecimal("50.0000"),
                    BigDecimal.ZERO,
                    BigDecimal.ZERO
                )
            )
        ));

        var confirmedPo = purchaseOrderService.confirmPurchaseOrder(business.getId(), poResponse.id(), user.getId());
        UUID poLine1Id = confirmedPo.lines().get(0).id();
        UUID poLine2Id = confirmedPo.lines().get(1).id();

        // Step 2: Create a GoodsReceipt where Line 1 is VALID, but Line 2 is INVALID (expired batch)
        var grResponse = goodsReceiptService.createGoodsReceipt(business.getId(), new CreateGoodsReceiptRequest(
            store.getId(),
            supplier.getId(),
            confirmedPo.id(),
            "DC-RB-FAIL",
            LocalDate.now(),
            "Will fail on line 2",
            null,
            List.of(
                new CreateGoodsReceiptLineRequest(
                    poLine1Id,
                    product1.getId(),
                    new BigDecimal("20.000"), // Valid line: 20 units
                    "STRIP",
                    1,
                    BigDecimal.ZERO,
                    "BATCH-P1-VALID",
                    LocalDate.now().minusMonths(1),
                    LocalDate.now().plusMonths(12), // Valid future expiry
                    new BigDecimal("10.0000"),
                    new BigDecimal("15.00"),
                    new BigDecimal("12.00"),
                    BigDecimal.ZERO
                ),
                new CreateGoodsReceiptLineRequest(
                    poLine2Id,
                    product2.getId(),
                    new BigDecimal("5.000"),
                    "BOTTLE",
                    1,
                    BigDecimal.ZERO,
                    "BATCH-P2-EXPIRED",
                    LocalDate.now().minusYears(2),
                    LocalDate.now().minusDays(1), // EXPIRED DATE! Must cause BATCH_EXPIRED exception
                    new BigDecimal("50.0000"),
                    new BigDecimal("70.00"),
                    new BigDecimal("65.00"),
                    BigDecimal.ZERO
                )
            )
        ));

        // Step 3: Attempt to post the Goods Receipt -> must fail with BusinessRuleViolationException
        assertThatThrownBy(() -> goodsReceiptService.postGoodsReceipt(
            business.getId(),
            grResponse.id(),
            user.getId(),
            null
        )).isInstanceOf(BusinessRuleViolationException.class);

        // Step 4: Verify that Product 1 was NOT modified in InventoryItem
        Optional<InventoryItem> item1 = inventoryItemRepository.findByStoreIdAndProductIdAndBusinessId(
            store.getId(),
            product1.getId(),
            business.getId()
        );
        assertThat(item1).satisfies(opt -> {
            if (opt.isPresent()) {
                assertThat(opt.get().getCurrentStock()).isEqualByComparingTo(BigDecimal.ZERO);
            }
        });

        // Step 5: Verify that BATCH-P1-VALID does NOT exist
        assertThat(inventoryBatchRepository.findByBusinessIdAndStoreIdAndProductIdAndBatchNumber(
            business.getId(),
            store.getId(),
            product1.getId(),
            "BATCH-P1-VALID"
        )).isEmpty();

        // Step 6: Verify no StockMovement exists referencing this Goods Receipt
        List<StockMovement> movements = stockMovementRepository.findAll().stream()
            .filter(m -> grResponse.id().equals(m.getReferenceId()))
            .toList();
        assertThat(movements).isEmpty();


        // Step 7: Verify PO lines received quantities are still ZERO
        PurchaseOrder po = purchaseOrderRepository.findById(confirmedPo.id()).orElseThrow();
        assertThat(po.getStatus()).isEqualTo(PurchaseOrderStatus.CONFIRMED);
        List<PurchaseOrderLine> lines = purchaseOrderLineRepository.findByPurchaseOrderIdAndBusinessId(po.getId(), business.getId());
        for (PurchaseOrderLine line : lines) {
            assertThat(line.getReceivedQuantity()).isEqualByComparingTo(BigDecimal.ZERO);
        }

        // Step 8: Verify Goods Receipt status remains DRAFT
        GoodsReceipt gr = goodsReceiptRepository.findById(grResponse.id()).orElseThrow();
        assertThat(gr.getStatus()).isEqualTo(GoodsReceiptStatus.DRAFT);
    }
}
