package com.inventra.inventra_backend.inventory.application;

import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.inventory.api.dto.BatchAdjustmentDto;
import com.inventra.inventra_backend.inventory.api.dto.InventoryBatchResponse;
import com.inventra.inventra_backend.inventory.api.dto.InventoryItemResponse;
import com.inventra.inventra_backend.inventory.api.dto.StockAdjustmentRequest;
import com.inventra.inventra_backend.inventory.api.dto.StockMovementResponse;
import com.inventra.inventra_backend.inventory.domain.model.InventoryBatch;
import com.inventra.inventra_backend.inventory.domain.model.InventoryItem;
import com.inventra.inventra_backend.inventory.domain.model.StockMovement;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryBatchRepository;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryItemRepository;
import com.inventra.inventra_backend.inventory.domain.repository.StockMovementRepository;
import com.inventra.inventra_backend.sync.domain.model.SyncChangeOperation;
import com.inventra.inventra_backend.sync.infrastructure.ChangeFeedPublisher;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryService {

    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ProductRepository productRepository;
    private final ChangeFeedPublisher changeFeedPublisher;

    public InventoryService(
        InventoryItemRepository inventoryItemRepository,
        InventoryBatchRepository inventoryBatchRepository,
        StockMovementRepository stockMovementRepository,
        ProductRepository productRepository,
        ChangeFeedPublisher changeFeedPublisher
    ) {
        this.inventoryItemRepository = inventoryItemRepository;
        this.inventoryBatchRepository = inventoryBatchRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.productRepository = productRepository;
        this.changeFeedPublisher = changeFeedPublisher;
    }

    @Transactional
    public StockMovementResponse adjustStock(
        UUID businessId,
        UUID storeId,
        UUID userId,
        UUID deviceId,
        StockAdjustmentRequest request
    ) {
        Product product = productRepository.findByIdAndBusinessId(request.productId(), businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Product", request.productId()));

        boolean isBatchAdjustment = request.batchAdjustment() != null;
        InventoryItem item = inventoryItemRepository.findByStoreIdAndProductIdAndBusinessId(
            storeId,
            product.getId(),
            businessId
        ).orElseGet(() -> {
            InventoryItem newItem = new InventoryItem(
                businessId,
                storeId,
                product.getId(),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                null,
                null,
                isBatchAdjustment
            );
            return inventoryItemRepository.save(newItem);
        });

        if (item.isBatchTracked() && !isBatchAdjustment) {
            throw new BusinessRuleViolationException(
                "BATCH_ADJUSTMENT_REQUIRED",
                "Product " + product.getName() + " is batch-tracked. A batch adjustment must be provided."
            );
        }

        if (!item.isBatchTracked() && isBatchAdjustment) {
            // Enable batch tracking on the item if batch adjustment is supplied
            item.updateSettings(null, null, null, null, null, true);
        }

        StockMovement movement;
        if (item.isBatchTracked()) {
            movement = handleBatchAdjustment(businessId, storeId, userId, deviceId, item, product, request);
        } else {
            movement = handleNonBatchAdjustment(businessId, storeId, userId, deviceId, item, product, request);
        }

        changeFeedPublisher.publish(
            businessId,
            storeId,
            "INVENTORY_ITEM",
            item.getId(),
            SyncChangeOperation.UPSERT,
            1,
            InventoryItemResponse.from(item)
        );

        return StockMovementResponse.from(movement);
    }

    private StockMovement handleNonBatchAdjustment(
        UUID businessId,
        UUID storeId,
        UUID userId,
        UUID deviceId,
        InventoryItem item,
        Product product,
        StockAdjustmentRequest request
    ) {
        BigDecimal delta = request.quantityDelta();
        if (delta == null || delta.compareTo(BigDecimal.ZERO) == 0) {
            throw new BusinessRuleViolationException(
                "INVALID_ADJUSTMENT_QUANTITY",
                "Non-batch adjustment requires a non-zero quantityDelta"
            );
        }

        item.adjustStock(delta);
        inventoryItemRepository.save(item);

        StockMovement movement = new StockMovement(
            businessId,
            storeId,
            product.getId(),
            null,
            request.movementType(),
            delta,
            null,
            item.getCurrentStock(),
            request.referenceType(),
            request.referenceId(),
            request.reason(),
            userId,
            deviceId,
            Instant.now()
        );
        return stockMovementRepository.save(movement);
    }

    private StockMovement handleBatchAdjustment(
        UUID businessId,
        UUID storeId,
        UUID userId,
        UUID deviceId,
        InventoryItem item,
        Product product,
        StockAdjustmentRequest request
    ) {
        BatchAdjustmentDto batchDto = request.batchAdjustment();
        BigDecimal delta = batchDto.quantityDelta();
        if (delta == null || delta.compareTo(BigDecimal.ZERO) == 0) {
            throw new BusinessRuleViolationException(
                "INVALID_BATCH_DELTA",
                "Batch adjustment quantity delta must be non-zero"
            );
        }

        InventoryBatch batch;
        if (batchDto.batchId() != null) {
            batch = inventoryBatchRepository.findByIdAndBusinessId(batchDto.batchId(), businessId)
                .orElseThrow(() -> ResourceNotFoundException.forResource("InventoryBatch", batchDto.batchId()));

            if (!batch.getStoreId().equals(storeId) || !batch.getProductId().equals(product.getId())) {
                throw new BusinessRuleViolationException(
                    "BATCH_MISMATCH",
                    "Batch does not belong to the requested store or product"
                );
            }
            batch.adjustQuantity(delta);
        } else {
            if (delta.compareTo(BigDecimal.ZERO) < 0) {
                throw new BusinessRuleViolationException(
                    "INVALID_NEW_BATCH_QUANTITY",
                    "Cannot create a new batch with negative quantity"
                );
            }
            if (batchDto.batchNumber() == null || batchDto.batchNumber().isBlank()) {
                throw new BusinessRuleViolationException("BATCH_NUMBER_REQUIRED", "Batch number is required for new batches");
            }
            if (batchDto.expiryDate() == null) {
                throw new BusinessRuleViolationException("EXPIRY_DATE_REQUIRED", "Expiry date is required for new batches");
            }

            String normalizedBatchNum = batchDto.batchNumber().trim().toUpperCase();
            inventoryBatchRepository.findByBusinessIdAndStoreIdAndProductIdAndBatchNumber(businessId, storeId, product.getId(), normalizedBatchNum)
                .ifPresent(existing -> {
                    throw new BusinessRuleViolationException(
                        "DUPLICATE_BATCH_NUMBER",
                        "Batch number '" + normalizedBatchNum + "' already exists for this product in this store"
                    );
                });

            batch = new InventoryBatch(
                businessId,
                storeId,
                product.getId(),
                item.getId(),
                normalizedBatchNum,
                batchDto.manufacturingDate(),
                batchDto.expiryDate(),
                delta,
                batchDto.purchasePrice(),
                batchDto.mrp(),
                batchDto.sellingPrice()
            );
        }

        inventoryBatchRepository.save(batch);
        item.adjustStock(delta);
        inventoryItemRepository.save(item);

        StockMovement movement = new StockMovement(
            businessId,
            storeId,
            product.getId(),
            batch.getId(),
            request.movementType(),
            delta,
            batch.getPurchasePrice(),
            item.getCurrentStock(),
            request.referenceType(),
            request.referenceId(),
            request.reason(),
            userId,
            deviceId,
            Instant.now()
        );
        return stockMovementRepository.save(movement);
    }

    @Transactional(readOnly = true)
    public Page<InventoryItemResponse> listStoreInventory(UUID businessId, UUID storeId, Pageable pageable) {
        return inventoryItemRepository.findByBusinessIdAndStoreId(businessId, storeId, pageable)
            .map(InventoryItemResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<InventoryItemResponse> listLowStockInventory(UUID businessId, UUID storeId, Pageable pageable) {
        return inventoryItemRepository.findLowStockItems(businessId, storeId, pageable)
            .map(InventoryItemResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<InventoryBatchResponse> listStoreBatches(UUID businessId, UUID storeId, Pageable pageable) {
        return inventoryBatchRepository.findByBusinessIdAndStoreId(businessId, storeId, pageable)
            .map(InventoryBatchResponse::from);
    }

    @Transactional(readOnly = true)
    public List<InventoryBatchResponse> listFefoBatches(UUID businessId, UUID storeId, UUID productId) {
        return inventoryBatchRepository.findFefoBatches(businessId, storeId, productId)
            .stream()
            .map(InventoryBatchResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public Page<InventoryBatchResponse> listNearExpiryBatches(
        UUID businessId,
        UUID storeId,
        int days,
        Pageable pageable
    ) {
        LocalDate today = LocalDate.now();
        LocalDate targetDate = today.plusDays(days);
        return inventoryBatchRepository.findNearExpiryBatches(businessId, storeId, today, targetDate, pageable)
            .map(InventoryBatchResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<InventoryBatchResponse> listExpiredBatches(UUID businessId, UUID storeId, Pageable pageable) {
        LocalDate today = LocalDate.now();
        return inventoryBatchRepository.findExpiredBatches(businessId, storeId, today, pageable)
            .map(InventoryBatchResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<StockMovementResponse> listStockMovements(
        UUID businessId,
        UUID storeId,
        UUID productId,
        UUID batchId,
        Pageable pageable
    ) {
        if (batchId != null) {
            return stockMovementRepository.findByBusinessIdAndStoreIdAndBatchIdOrderByOccurredAtDesc(
                businessId,
                storeId,
                batchId,
                pageable
            ).map(StockMovementResponse::from);
        }
        if (productId != null) {
            return stockMovementRepository.findByBusinessIdAndStoreIdAndProductIdOrderByOccurredAtDesc(
                businessId,
                storeId,
                productId,
                pageable
            ).map(StockMovementResponse::from);
        }
        return stockMovementRepository.findByBusinessIdAndStoreIdOrderByOccurredAtDesc(
            businessId,
            storeId,
            pageable
        ).map(StockMovementResponse::from);
    }
}
