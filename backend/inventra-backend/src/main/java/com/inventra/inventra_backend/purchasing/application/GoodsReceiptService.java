package com.inventra.inventra_backend.purchasing.application;

import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.inventory.domain.model.InventoryBatch;
import com.inventra.inventra_backend.inventory.domain.model.InventoryItem;
import com.inventra.inventra_backend.inventory.domain.model.StockMovement;
import com.inventra.inventra_backend.inventory.domain.model.StockMovementType;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryBatchRepository;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryItemRepository;
import com.inventra.inventra_backend.inventory.domain.repository.StockMovementRepository;
import com.inventra.inventra_backend.purchasing.api.dto.CreateGoodsReceiptLineRequest;
import com.inventra.inventra_backend.purchasing.api.dto.CreateGoodsReceiptRequest;
import com.inventra.inventra_backend.purchasing.api.dto.GoodsReceiptLineResponse;
import com.inventra.inventra_backend.purchasing.api.dto.GoodsReceiptResponse;
import com.inventra.inventra_backend.purchasing.api.dto.GoodsReceiptSummaryResponse;
import com.inventra.inventra_backend.purchasing.api.dto.UpdateGoodsReceiptRequest;
import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceipt;
import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceiptLine;
import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceiptStatus;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrder;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrderLine;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrderStatus;
import com.inventra.inventra_backend.purchasing.domain.model.Supplier;
import com.inventra.inventra_backend.purchasing.domain.repository.GoodsReceiptLineRepository;
import com.inventra.inventra_backend.purchasing.domain.repository.GoodsReceiptRepository;
import com.inventra.inventra_backend.purchasing.domain.repository.PurchaseOrderLineRepository;
import com.inventra.inventra_backend.purchasing.domain.repository.PurchaseOrderRepository;
import com.inventra.inventra_backend.purchasing.domain.repository.SupplierRepository;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GoodsReceiptService {

    private final GoodsReceiptRepository goodsReceiptRepository;
    private final GoodsReceiptLineRepository goodsReceiptLineRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderLineRepository purchaseOrderLineRepository;
    private final SupplierRepository supplierRepository;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final StockMovementRepository stockMovementRepository;

    public GoodsReceiptService(
        GoodsReceiptRepository goodsReceiptRepository,
        GoodsReceiptLineRepository goodsReceiptLineRepository,
        PurchaseOrderRepository purchaseOrderRepository,
        PurchaseOrderLineRepository purchaseOrderLineRepository,
        SupplierRepository supplierRepository,
        StoreRepository storeRepository,
        ProductRepository productRepository,
        InventoryItemRepository inventoryItemRepository,
        InventoryBatchRepository inventoryBatchRepository,
        StockMovementRepository stockMovementRepository
    ) {
        this.goodsReceiptRepository = goodsReceiptRepository;
        this.goodsReceiptLineRepository = goodsReceiptLineRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderLineRepository = purchaseOrderLineRepository;
        this.supplierRepository = supplierRepository;
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.inventoryBatchRepository = inventoryBatchRepository;
        this.stockMovementRepository = stockMovementRepository;
    }

    @Transactional
    public GoodsReceiptResponse createGoodsReceipt(UUID businessId, CreateGoodsReceiptRequest request) {
        // Idempotency check if key is provided
        if (request.idempotencyKey() != null && !request.idempotencyKey().isBlank()) {
            Optional<GoodsReceipt> existing = goodsReceiptRepository.findByBusinessIdAndIdempotencyKey(
                businessId,
                request.idempotencyKey().trim()
            );
            if (existing.isPresent()) {
                return mapToResponse(existing.get());
            }
        }

        Store store = storeRepository.findById(request.storeId())
            .filter(s -> s.getBusinessId().equals(businessId))
            .orElseThrow(() -> ResourceNotFoundException.forResource("Store", request.storeId()));

        Supplier supplier = supplierRepository.findByIdAndBusinessId(request.supplierId(), businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Supplier", request.supplierId()));

        PurchaseOrder po = null;
        if (request.purchaseOrderId() != null) {
            po = purchaseOrderRepository.findByIdAndStoreIdAndBusinessId(
                request.purchaseOrderId(),
                store.getId(),
                businessId
            ).orElseThrow(() -> ResourceNotFoundException.forResource("PurchaseOrder", request.purchaseOrderId()));

            if (po.getStatus() != PurchaseOrderStatus.CONFIRMED && po.getStatus() != PurchaseOrderStatus.PARTIALLY_RECEIVED) {
                throw new BusinessRuleViolationException(
                    "INVALID_PO_STATUS_FOR_RECEIPT",
                    "Cannot receive goods against purchase order in status " + po.getStatus()
                );
            }
        }

        String receiptNumber = generateReceiptNumber(businessId, store.getStoreCode());

        GoodsReceipt gr = new GoodsReceipt(
            businessId,
            store.getId(),
            supplier.getId(),
            po != null ? po.getId() : null,
            receiptNumber,
            request.vendorDeliveryNote(),
            request.receivedDate(),
            request.notes(),
            request.idempotencyKey()
        );

        int lineNum = 1;
        for (CreateGoodsReceiptLineRequest lineReq : request.lines()) {
            Product product = productRepository.findByIdAndBusinessId(lineReq.productId(), businessId)
                .orElseThrow(() -> ResourceNotFoundException.forResource("Product", lineReq.productId()));

            PurchaseOrderLine pol = null;
            if (lineReq.purchaseOrderLineId() != null) {
                pol = purchaseOrderLineRepository.findByIdAndBusinessId(lineReq.purchaseOrderLineId(), businessId)
                    .orElseThrow(() -> ResourceNotFoundException.forResource("PurchaseOrderLine", lineReq.purchaseOrderLineId()));
            }

            GoodsReceiptLine line = new GoodsReceiptLine(
                businessId,
                gr.getId(),
                pol != null ? pol.getId() : null,
                product.getId(),
                lineNum++,
                lineReq.receivedQuantity(),
                lineReq.purchaseUnit(),
                lineReq.conversionFactor(),
                lineReq.rejectedQuantity(),
                lineReq.batchNumber(),
                lineReq.manufacturingDate(),
                lineReq.expiryDate(),
                lineReq.unitCost(),
                lineReq.mrp(),
                lineReq.sellingPrice(),
                lineReq.taxRate() != null ? lineReq.taxRate() : product.getTaxRate()
            );
            gr.addLine(line);
        }

        GoodsReceipt saved = goodsReceiptRepository.save(gr);
        return mapToResponse(saved);
    }

    @Transactional
    public GoodsReceiptResponse updateGoodsReceipt(
        UUID businessId,
        UUID receiptId,
        UpdateGoodsReceiptRequest request
    ) {
        GoodsReceipt gr = goodsReceiptRepository.findByIdAndBusinessId(receiptId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("GoodsReceipt", receiptId));

        if (gr.getStatus() != GoodsReceiptStatus.DRAFT) {
            throw new BusinessRuleViolationException(
                "INVALID_STATUS_FOR_UPDATE",
                "Cannot modify goods receipt in status " + gr.getStatus()
            );
        }

        if (request.lines() != null && !request.lines().isEmpty()) {
            gr.clearLines();
            int lineNum = 1;
            for (CreateGoodsReceiptLineRequest lineReq : request.lines()) {
                Product product = productRepository.findByIdAndBusinessId(lineReq.productId(), businessId)
                    .orElseThrow(() -> ResourceNotFoundException.forResource("Product", lineReq.productId()));

                PurchaseOrderLine pol = null;
                if (lineReq.purchaseOrderLineId() != null) {
                    pol = purchaseOrderLineRepository.findByIdAndBusinessId(lineReq.purchaseOrderLineId(), businessId)
                        .orElseThrow(() -> ResourceNotFoundException.forResource("PurchaseOrderLine", lineReq.purchaseOrderLineId()));
                }

                GoodsReceiptLine line = new GoodsReceiptLine(
                    businessId,
                    gr.getId(),
                    pol != null ? pol.getId() : null,
                    product.getId(),
                    lineNum++,
                    lineReq.receivedQuantity(),
                    lineReq.purchaseUnit(),
                    lineReq.conversionFactor(),
                    lineReq.rejectedQuantity(),
                    lineReq.batchNumber(),
                    lineReq.manufacturingDate(),
                    lineReq.expiryDate(),
                    lineReq.unitCost(),
                    lineReq.mrp(),
                    lineReq.sellingPrice(),
                    lineReq.taxRate() != null ? lineReq.taxRate() : product.getTaxRate()
                );
                gr.addLine(line);
            }
        }

        gr.recalculateTotals();
        GoodsReceipt saved = goodsReceiptRepository.save(gr);
        return mapToResponse(saved);
    }

    @Transactional
    public GoodsReceiptResponse postGoodsReceipt(
        UUID businessId,
        UUID receiptId,
        UUID userId,
        UUID deviceId
    ) {
        GoodsReceipt gr = goodsReceiptRepository.findByIdAndBusinessId(receiptId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("GoodsReceipt", receiptId));

        if (gr.getStatus() == GoodsReceiptStatus.POSTED) {
            return mapToResponse(gr);
        }

        if (gr.getStatus() != GoodsReceiptStatus.DRAFT) {
            throw new BusinessRuleViolationException(
                "INVALID_STATUS_FOR_POSTING",
                "Cannot post goods receipt in status " + gr.getStatus()
            );
        }

        PurchaseOrder po = null;
        if (gr.getPurchaseOrderId() != null) {
            po = purchaseOrderRepository.findByIdAndStoreIdAndBusinessId(
                gr.getPurchaseOrderId(),
                gr.getStoreId(),
                businessId
            ).orElseThrow(() -> ResourceNotFoundException.forResource("PurchaseOrder", gr.getPurchaseOrderId()));
        }

        // Process each line atomically
        for (GoodsReceiptLine line : gr.getLines()) {
            Product product = productRepository.findByIdAndBusinessId(line.getProductId(), businessId)
                .orElseThrow(() -> ResourceNotFoundException.forResource("Product", line.getProductId()));

            // Over-receipt check if linked to PO line
            if (line.getPurchaseOrderLineId() != null) {
                PurchaseOrderLine pol = purchaseOrderLineRepository.findByIdAndBusinessId(line.getPurchaseOrderLineId(), businessId)
                    .orElseThrow(() -> ResourceNotFoundException.forResource("PurchaseOrderLine", line.getPurchaseOrderLineId()));

                BigDecimal newTotalReceived = pol.getReceivedQuantity().add(line.getReceivedQuantity());
                if (newTotalReceived.compareTo(pol.getOrderedQuantity()) > 0) {
                    throw new BusinessRuleViolationException(
                        "OVER_RECEIPT_NOT_PERMITTED",
                        "Received quantity (" + newTotalReceived + ") exceeds ordered quantity (" + pol.getOrderedQuantity() + ") for product " + product.getName()
                    );
                }
                pol.recordReceipt(line.getReceivedQuantity());
                purchaseOrderLineRepository.save(pol);
            }

            // Find or create InventoryItem
            InventoryItem item = inventoryItemRepository.findByStoreIdAndProductIdAndBusinessId(
                gr.getStoreId(),
                product.getId(),
                businessId
            ).orElseGet(() -> {
                boolean isBatch = line.getBatchNumber() != null && !line.getBatchNumber().isBlank();
                InventoryItem newItem = new InventoryItem(
                    businessId,
                    gr.getStoreId(),
                    product.getId(),
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    null,
                    null,
                    isBatch
                );
                return inventoryItemRepository.save(newItem);
            });

            UUID assignedBatchId = null;
            if (item.isBatchTracked() || (line.getBatchNumber() != null && !line.getBatchNumber().isBlank())) {
                if (line.getBatchNumber() == null || line.getBatchNumber().isBlank()) {
                    throw new BusinessRuleViolationException(
                        "BATCH_NUMBER_REQUIRED",
                        "Batch number is required for batch-tracked product " + product.getName()
                    );
                }
                if (line.getExpiryDate() == null) {
                    throw new BusinessRuleViolationException(
                        "EXPIRY_DATE_REQUIRED",
                        "Expiry date is required for batch " + line.getBatchNumber()
                    );
                }
                if (line.getExpiryDate().isBefore(LocalDate.now())) {
                    throw new BusinessRuleViolationException(
                        "BATCH_EXPIRED",
                        "Cannot receive already expired batch " + line.getBatchNumber()
                    );
                }

                // Enable batch tracking on item if not already enabled
                if (!item.isBatchTracked()) {
                    item.updateSettings(null, null, null, null, null, true);
                }

                String normBatchNumber = line.getBatchNumber().trim().toUpperCase();
                Optional<InventoryBatch> existingBatchOpt = inventoryBatchRepository
                    .findByBusinessIdAndStoreIdAndProductIdAndBatchNumber(businessId, gr.getStoreId(), product.getId(), normBatchNumber);

                InventoryBatch batch;
                if (existingBatchOpt.isPresent()) {
                    batch = existingBatchOpt.get();
                    if (!batch.getExpiryDate().equals(line.getExpiryDate())) {
                        throw new BusinessRuleViolationException(
                            "BATCH_EXPIRY_MISMATCH",
                            "Batch " + normBatchNumber + " already exists with a different expiry date (" + batch.getExpiryDate() + ")"
                        );
                    }
                    batch.adjustQuantity(line.getReceivedBaseQuantity());
                    if (line.getBaseUnitCost() != null && line.getMrp() != null) {
                        batch.updatePrices(line.getBaseUnitCost(), line.getMrp(), line.getSellingPrice());
                    }
                } else {
                    batch = new InventoryBatch(
                        businessId,
                        gr.getStoreId(),
                        product.getId(),
                        item.getId(),
                        normBatchNumber,
                        line.getManufacturingDate(),
                        line.getExpiryDate(),
                        line.getReceivedBaseQuantity(),
                        line.getBaseUnitCost(),
                        line.getMrp() != null ? line.getMrp() : BigDecimal.ZERO,
                        line.getSellingPrice() != null ? line.getSellingPrice() : line.getMrp()
                    );
                }
                InventoryBatch savedBatch = inventoryBatchRepository.save(batch);
                assignedBatchId = savedBatch.getId();
                line.assignInventoryBatch(assignedBatchId);
            }

            // Update item stock
            item.adjustStock(line.getReceivedBaseQuantity());
            inventoryItemRepository.save(item);

            // Create StockMovement
            StockMovement movement = new StockMovement(
                businessId,
                gr.getStoreId(),
                product.getId(),
                assignedBatchId,
                StockMovementType.PURCHASE_RECEIPT,
                line.getReceivedBaseQuantity(),
                line.getBaseUnitCost(),
                item.getCurrentStock(),
                "GOODS_RECEIPT",
                gr.getId(),
                "Goods received via GRN " + gr.getReceiptNumber(),
                userId,
                deviceId,
                Instant.now()
            );
            stockMovementRepository.save(movement);
        }

        // Update PO status if attached
        if (po != null) {
            po.updateReceivingStatus();
            purchaseOrderRepository.save(po);
        }

        gr.post(userId);
        GoodsReceipt saved = goodsReceiptRepository.save(gr);
        return mapToResponse(saved);
    }

    @Transactional
    public GoodsReceiptResponse cancelGoodsReceipt(UUID businessId, UUID receiptId) {
        GoodsReceipt gr = goodsReceiptRepository.findByIdAndBusinessId(receiptId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("GoodsReceipt", receiptId));

        try {
            gr.cancel();
        } catch (IllegalStateException e) {
            throw new BusinessRuleViolationException("INVALID_CANCELLATION", e.getMessage());
        }

        GoodsReceipt saved = goodsReceiptRepository.save(gr);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public GoodsReceiptResponse getGoodsReceipt(UUID businessId, UUID receiptId) {
        GoodsReceipt gr = goodsReceiptRepository.findByIdAndBusinessId(receiptId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("GoodsReceipt", receiptId));
        return mapToResponse(gr);
    }

    @Transactional(readOnly = true)
    public Page<GoodsReceiptSummaryResponse> listGoodsReceipts(
        UUID businessId,
        UUID storeId,
        UUID supplierId,
        GoodsReceiptStatus status,
        UUID purchaseOrderId,
        Pageable pageable
    ) {
        return goodsReceiptRepository.findWithFilters(businessId, storeId, supplierId, status, purchaseOrderId, pageable)
            .map(GoodsReceiptSummaryResponse::from);
    }

    private GoodsReceiptResponse mapToResponse(GoodsReceipt gr) {
        List<GoodsReceiptLineResponse> lineResponses = gr.getLines().stream()
            .map(GoodsReceiptLineResponse::from)
            .toList();
        return GoodsReceiptResponse.from(gr, lineResponses);
    }

    private String generateReceiptNumber(UUID businessId, String storeCode) {
        long count = goodsReceiptRepository.countByBusinessIdAndStoreId(businessId, storeRepository.findByBusinessIdAndStoreCode(businessId, storeCode).map(Store::getId).orElse(UUID.randomUUID()));
        String code = "GRN-" + storeCode.toUpperCase() + "-" + String.format("%05d", count + 1);
        if (goodsReceiptRepository.existsByBusinessIdAndReceiptNumberIgnoreCase(businessId, code)) {
            code = "GRN-" + storeCode.toUpperCase() + "-" + System.currentTimeMillis() % 1000000;
        }
        return code;
    }
}
