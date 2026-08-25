package com.inventra.inventra_backend.transfer.application;

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
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import com.inventra.inventra_backend.transfer.api.dto.ApproveTransferLineRequest;
import com.inventra.inventra_backend.transfer.api.dto.ApproveTransferRequest;
import com.inventra.inventra_backend.transfer.api.dto.CancelTransferRequest;
import com.inventra.inventra_backend.transfer.api.dto.CreateTransferLineRequest;
import com.inventra.inventra_backend.transfer.api.dto.CreateTransferRequest;
import com.inventra.inventra_backend.transfer.api.dto.ReceiveTransferBatchAllocationRequest;
import com.inventra.inventra_backend.transfer.api.dto.ReceiveTransferLineRequest;
import com.inventra.inventra_backend.transfer.api.dto.ReceiveTransferRequest;
import com.inventra.inventra_backend.transfer.api.dto.RejectTransferRequest;
import com.inventra.inventra_backend.transfer.api.dto.ShipTransferBatchAllocationRequest;
import com.inventra.inventra_backend.transfer.api.dto.ShipTransferLineRequest;
import com.inventra.inventra_backend.transfer.api.dto.ShipTransferRequest;
import com.inventra.inventra_backend.transfer.api.dto.TransferLineBatchAllocationResponse;
import com.inventra.inventra_backend.transfer.api.dto.TransferLineResponse;
import com.inventra.inventra_backend.transfer.api.dto.TransferReceiptLineResponse;
import com.inventra.inventra_backend.transfer.api.dto.TransferReceiptResponse;
import com.inventra.inventra_backend.transfer.api.dto.TransferResponse;
import com.inventra.inventra_backend.transfer.domain.model.InventoryTransfer;
import com.inventra.inventra_backend.transfer.domain.model.InventoryTransferLine;
import com.inventra.inventra_backend.transfer.domain.model.InventoryTransferReceipt;
import com.inventra.inventra_backend.transfer.domain.model.InventoryTransferReceiptLine;
import com.inventra.inventra_backend.transfer.domain.model.TransferLineBatchAllocation;
import com.inventra.inventra_backend.transfer.domain.model.TransferStatus;
import com.inventra.inventra_backend.transfer.domain.repository.InventoryTransferLineRepository;
import com.inventra.inventra_backend.transfer.domain.repository.InventoryTransferReceiptLineRepository;
import com.inventra.inventra_backend.transfer.domain.repository.InventoryTransferReceiptRepository;
import com.inventra.inventra_backend.transfer.domain.repository.InventoryTransferRepository;
import com.inventra.inventra_backend.transfer.domain.repository.TransferLineBatchAllocationRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TransferService {

    private final InventoryTransferRepository transferRepository;
    private final InventoryTransferLineRepository transferLineRepository;
    private final TransferLineBatchAllocationRepository batchAllocationRepository;
    private final InventoryTransferReceiptRepository receiptRepository;
    private final InventoryTransferReceiptLineRepository receiptLineRepository;
    private final ProductRepository productRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final StockMovementRepository stockMovementRepository;
    private final StoreRepository storeRepository;

    public TransferService(
        InventoryTransferRepository transferRepository,
        InventoryTransferLineRepository transferLineRepository,
        TransferLineBatchAllocationRepository batchAllocationRepository,
        InventoryTransferReceiptRepository receiptRepository,
        InventoryTransferReceiptLineRepository receiptLineRepository,
        ProductRepository productRepository,
        InventoryItemRepository inventoryItemRepository,
        InventoryBatchRepository inventoryBatchRepository,
        StockMovementRepository stockMovementRepository,
        StoreRepository storeRepository
    ) {
        this.transferRepository = transferRepository;
        this.transferLineRepository = transferLineRepository;
        this.batchAllocationRepository = batchAllocationRepository;
        this.receiptRepository = receiptRepository;
        this.receiptLineRepository = receiptLineRepository;
        this.productRepository = productRepository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.inventoryBatchRepository = inventoryBatchRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.storeRepository = storeRepository;
    }

    @Transactional
    public TransferResponse createTransfer(
        UUID businessId,
        UUID userId,
        UUID deviceId,
        CreateTransferRequest request
    ) {
        if (request.idempotencyKey() != null && !request.idempotencyKey().isBlank()) {
            Optional<InventoryTransfer> existing = transferRepository.findByBusinessIdAndCreateIdempotencyKey(
                businessId,
                request.idempotencyKey().trim()
            );
            if (existing.isPresent()) {
                return buildTransferResponse(businessId, existing.get());
            }
        }

        Store sourceStore = storeRepository.findByIdAndBusinessId(request.sourceStoreId(), businessId)
            .orElseThrow(() -> new BusinessRuleViolationException("STORE_NOT_FOUND", "Source store not found or does not belong to business"));

        Store destStore = storeRepository.findByIdAndBusinessId(request.destinationStoreId(), businessId)
            .orElseThrow(() -> new BusinessRuleViolationException("STORE_NOT_FOUND", "Destination store not found or does not belong to business"));

        if (sourceStore.getId().equals(destStore.getId())) {
            throw new BusinessRuleViolationException("SAME_STORE_TRANSFER_NOT_ALLOWED", "Source and destination store cannot be the same");
        }

        long count = transferRepository.countByBusinessIdAndSourceStoreId(businessId, sourceStore.getId());
        String transferNumber = String.format("TR-%s-%06d", sourceStore.getStoreCode(), count + 1);

        InventoryTransfer transfer = new InventoryTransfer(
            businessId,
            sourceStore.getId(),
            destStore.getId(),
            transferNumber,
            userId,
            request.expectedDeliveryDate(),
            deviceId,
            request.idempotencyKey(),
            request.notes()
        );

        List<UUID> productIds = request.lines().stream().map(CreateTransferLineRequest::productId).toList();
        List<Product> products = productRepository.findAllById(productIds);
        Map<UUID, Product> productMap = products.stream()
            .filter(p -> p.getBusinessId().equals(businessId))
            .collect(Collectors.toMap(Product::getId, p -> p));

        int lineNum = 1;
        for (CreateTransferLineRequest lineReq : request.lines()) {
            Product product = productMap.get(lineReq.productId());
            if (product == null) {
                throw new BusinessRuleViolationException("PRODUCT_NOT_FOUND", "Product " + lineReq.productId() + " not found under business");
            }

            InventoryTransferLine line = new InventoryTransferLine(
                businessId,
                transfer.getId(),
                product.getId(),
                lineNum++,
                product.getName(),
                lineReq.sellingUnit(),
                product.getUnitsPerSellingUnit(),
                lineReq.requestedQuantity(),
                BigDecimal.ZERO,
                lineReq.notes()
            );
            transfer.addLine(line);
        }

        InventoryTransfer saved = transferRepository.save(transfer);
        return buildTransferResponse(businessId, saved);
    }

    @Transactional
    public TransferResponse approveTransfer(
        UUID businessId,
        UUID transferId,
        UUID userId,
        ApproveTransferRequest request
    ) {
        InventoryTransfer transfer = transferRepository.findByIdAndBusinessId(transferId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Transfer", transferId));

        if (transfer.getStatus() == TransferStatus.APPROVED) {
            return buildTransferResponse(businessId, transfer);
        }

        transfer.approve(userId);

        if (request != null && request.lines() != null && !request.lines().isEmpty()) {
            List<InventoryTransferLine> lines = transferLineRepository.findByTransferIdAndBusinessIdOrderByLineNumberAsc(transferId, businessId);
            Map<UUID, InventoryTransferLine> lineMap = lines.stream().collect(Collectors.toMap(InventoryTransferLine::getId, l -> l));

            for (ApproveTransferLineRequest appLine : request.lines()) {
                InventoryTransferLine line = lineMap.get(appLine.transferLineId());
                if (line != null) {
                    line.setApprovedQuantity(appLine.approvedQuantity());
                    transferLineRepository.save(line);
                }
            }
        }

        InventoryTransfer saved = transferRepository.save(transfer);
        return buildTransferResponse(businessId, saved);
    }

    @Transactional
    public TransferResponse rejectTransfer(
        UUID businessId,
        UUID transferId,
        UUID userId,
        RejectTransferRequest request
    ) {
        InventoryTransfer transfer = transferRepository.findByIdAndBusinessId(transferId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Transfer", transferId));

        if (transfer.getStatus() == TransferStatus.REJECTED) {
            return buildTransferResponse(businessId, transfer);
        }

        transfer.reject(userId, request.reason());
        InventoryTransfer saved = transferRepository.save(transfer);
        return buildTransferResponse(businessId, saved);
    }

    @Transactional
    public TransferResponse cancelTransfer(
        UUID businessId,
        UUID transferId,
        UUID userId,
        CancelTransferRequest request
    ) {
        InventoryTransfer transfer = transferRepository.findByIdAndBusinessId(transferId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Transfer", transferId));

        if (transfer.getStatus() == TransferStatus.CANCELLED) {
            return buildTransferResponse(businessId, transfer);
        }

        transfer.cancel(userId, request != null ? request.reason() : null);
        InventoryTransfer saved = transferRepository.save(transfer);
        return buildTransferResponse(businessId, saved);
    }

    @Transactional
    public TransferResponse shipTransfer(
        UUID businessId,
        UUID transferId,
        UUID userId,
        UUID deviceId,
        ShipTransferRequest request
    ) {
        if (request.shipIdempotencyKey() != null && !request.shipIdempotencyKey().isBlank()) {
            Optional<InventoryTransfer> existing = transferRepository.findByBusinessIdAndShipIdempotencyKey(
                businessId,
                request.shipIdempotencyKey().trim()
            );
            if (existing.isPresent()) {
                return buildTransferResponse(businessId, existing.get());
            }
        }

        InventoryTransfer transfer = transferRepository.findByIdAndBusinessId(transferId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Transfer", transferId));

        if (transfer.getStatus() == TransferStatus.REQUESTED) {
            transfer.approve(userId);
        }

        if (transfer.getStatus() != TransferStatus.APPROVED) {
            throw new BusinessRuleViolationException("CANNOT_SHIP_TRANSFER", "Transfer cannot be shipped in status " + transfer.getStatus());
        }

        List<InventoryTransferLine> lines = transferLineRepository.findByTransferIdAndBusinessIdOrderByLineNumberAsc(transferId, businessId);
        Map<UUID, InventoryTransferLine> lineMap = lines.stream().collect(Collectors.toMap(InventoryTransferLine::getId, l -> l));

        Map<UUID, ShipTransferLineRequest> shipMap = request.lines().stream()
            .collect(Collectors.toMap(ShipTransferLineRequest::transferLineId, l -> l));

        // Deterministic Lock Ordering on Batch IDs and Product IDs
        List<UUID> allBatchIds = request.lines().stream()
            .flatMap(l -> l.batchAllocations().stream().map(ShipTransferBatchAllocationRequest::sourceBatchId))
            .distinct()
            .sorted()
            .toList();

        List<InventoryBatch> sourceBatches = inventoryBatchRepository.findAllById(allBatchIds);
        Map<UUID, InventoryBatch> batchMap = sourceBatches.stream()
            .filter(b -> b.getBusinessId().equals(businessId) && b.getStoreId().equals(transfer.getSourceStoreId()))
            .collect(Collectors.toMap(InventoryBatch::getId, b -> b));

        List<UUID> productIds = lines.stream().map(InventoryTransferLine::getProductId).distinct().sorted().toList();
        List<InventoryItem> sourceItems = inventoryItemRepository.findByBusinessIdAndStoreIdAndProductIdIn(
            businessId,
            transfer.getSourceStoreId(),
            productIds
        );
        Map<UUID, InventoryItem> itemMap = sourceItems.stream()
            .collect(Collectors.toMap(InventoryItem::getProductId, i -> i));

        List<TransferLineBatchAllocation> newAllocations = new ArrayList<>();

        for (InventoryTransferLine line : lines) {
            ShipTransferLineRequest shipLineReq = shipMap.get(line.getId());
            if (shipLineReq == null || shipLineReq.batchAllocations().isEmpty()) {
                throw new BusinessRuleViolationException(
                    "LINE_SHIPMENT_MISSING",
                    "Shipment batch allocations missing for line " + line.getLineNumber()
                );
            }

            BigDecimal sumAllocatedBase = shipLineReq.batchAllocations().stream()
                .map(ShipTransferBatchAllocationRequest::shippedBaseQuantity)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            if (sumAllocatedBase.compareTo(line.getApprovedBaseQuantity()) != 0) {
                throw new BusinessRuleViolationException(
                    "SHIPMENT_QUANTITY_MISMATCH",
                    String.format(
                        "Line %d: Shipped base quantity (%.3f) must exactly equal approved base quantity (%.3f)",
                        line.getLineNumber(),
                        sumAllocatedBase,
                        line.getApprovedBaseQuantity()
                    )
                );
            }

            InventoryItem item = itemMap.get(line.getProductId());
            if (item == null) {
                throw new BusinessRuleViolationException("INVENTORY_ITEM_NOT_FOUND", "Inventory item not found at source store for product " + line.getProductId());
            }

            BigDecimal lineUnitCost = BigDecimal.ZERO;

            for (ShipTransferBatchAllocationRequest allocReq : shipLineReq.batchAllocations()) {
                InventoryBatch batch = batchMap.get(allocReq.sourceBatchId());
                if (batch == null) {
                    throw new BusinessRuleViolationException(
                        "BATCH_NOT_FOUND",
                        "Source batch " + allocReq.sourceBatchId() + " not found in source store"
                    );
                }

                if (batch.getExpiryDate().isBefore(LocalDate.now())) {
                    throw new BusinessRuleViolationException(
                        "EXPIRED_BATCH_CANNOT_SHIP",
                        "Batch " + batch.getBatchNumber() + " has expired on " + batch.getExpiryDate() + " and cannot be shipped"
                    );
                }

                if (batch.getQuantity().compareTo(allocReq.shippedBaseQuantity()) < 0) {
                    throw new BusinessRuleViolationException(
                        "INSUFFICIENT_BATCH_STOCK",
                        String.format(
                            "Batch %s has insufficient stock (available: %.3f, requested: %.3f)",
                            batch.getBatchNumber(),
                            batch.getQuantity(),
                            allocReq.shippedBaseQuantity()
                        )
                    );
                }

                // Decrement source batch and item
                batch.adjustQuantity(allocReq.shippedBaseQuantity().negate());
                item.adjustStock(allocReq.shippedBaseQuantity().negate());

                inventoryBatchRepository.save(batch);
                inventoryItemRepository.save(item);

                lineUnitCost = batch.getPurchasePrice();

                // Append TRANSFER_OUT stock movement
                StockMovement movement = new StockMovement(
                    businessId,
                    transfer.getSourceStoreId(),
                    line.getProductId(),
                    batch.getId(),
                    StockMovementType.TRANSFER_OUT,
                    allocReq.shippedBaseQuantity().negate(),
                    batch.getPurchasePrice(),
                    item.getCurrentStock(),
                    "INVENTORY_TRANSFER",
                    transfer.getId(),
                    "Transfer Dispatch " + transfer.getTransferNumber(),
                    userId,
                    deviceId,
                    Instant.now()
                );
                stockMovementRepository.save(movement);

                TransferLineBatchAllocation allocation = new TransferLineBatchAllocation(
                    businessId,
                    transfer.getSourceStoreId(),
                    transfer.getDestinationStoreId(),
                    transfer.getId(),
                    line.getId(),
                    batch.getId(),
                    line.getProductId(),
                    batch.getBatchNumber(),
                    batch.getManufacturingDate(),
                    batch.getExpiryDate(),
                    allocReq.shippedBaseQuantity(),
                    batch.getPurchasePrice(),
                    batch.getMrp(),
                    batch.getSellingPrice()
                );
                newAllocations.add(allocation);
            }

            line.recordShipment(line.getApprovedQuantity(), lineUnitCost);
            transferLineRepository.save(line);
        }

        for (TransferLineBatchAllocation alloc : newAllocations) {
            batchAllocationRepository.save(alloc);
        }

        transfer.markShipped(userId, request.shipIdempotencyKey());
        InventoryTransfer saved = transferRepository.save(transfer);

        return buildTransferResponse(businessId, saved);
    }

    @Transactional
    public TransferReceiptResponse receiveTransfer(
        UUID businessId,
        UUID transferId,
        UUID userId,
        UUID deviceId,
        ReceiveTransferRequest request
    ) {
        if (request.idempotencyKey() != null && !request.idempotencyKey().isBlank()) {
            Optional<InventoryTransferReceipt> existing = receiptRepository.findByBusinessIdAndIdempotencyKey(
                businessId,
                request.idempotencyKey().trim()
            );
            if (existing.isPresent()) {
                return buildReceiptResponse(businessId, existing.get());
            }
        }

        InventoryTransfer transfer = transferRepository.findByIdAndBusinessId(transferId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Transfer", transferId));

        if (transfer.getStatus() != TransferStatus.IN_TRANSIT && transfer.getStatus() != TransferStatus.PARTIALLY_RECEIVED) {
            throw new BusinessRuleViolationException(
                "CANNOT_RECEIVE_TRANSFER",
                "Transfer cannot be received in status " + transfer.getStatus()
            );
        }

        Store destStore = storeRepository.findByIdAndBusinessId(transfer.getDestinationStoreId(), businessId)
            .orElseThrow(() -> new BusinessRuleViolationException("STORE_NOT_FOUND", "Destination store not found"));

        long receiptCount = receiptRepository.countByBusinessIdAndStoreId(businessId, destStore.getId());
        String receiptNumber = String.format("TR-REC-%s-%06d", destStore.getStoreCode(), receiptCount + 1);

        InventoryTransferReceipt receipt = new InventoryTransferReceipt(
            businessId,
            destStore.getId(),
            transfer.getId(),
            receiptNumber,
            LocalDate.now(),
            userId,
            request.idempotencyKey(),
            request.notes()
        );

        List<InventoryTransferLine> lines = transferLineRepository.findByTransferIdAndBusinessIdOrderByLineNumberAsc(transferId, businessId);
        Map<UUID, InventoryTransferLine> lineMap = lines.stream().collect(Collectors.toMap(InventoryTransferLine::getId, l -> l));

        List<TransferLineBatchAllocation> allocations = batchAllocationRepository.findByTransferIdAndBusinessId(transferId, businessId);
        Map<UUID, TransferLineBatchAllocation> allocMap = allocations.stream().collect(Collectors.toMap(TransferLineBatchAllocation::getId, a -> a));

        List<InventoryTransferReceiptLine> receiptLines = new ArrayList<>();

        for (ReceiveTransferLineRequest lineReq : request.lines()) {
            InventoryTransferLine line = lineMap.get(lineReq.transferLineId());
            if (line == null) {
                throw new BusinessRuleViolationException("LINE_NOT_FOUND", "Transfer line " + lineReq.transferLineId() + " not found");
            }

            // Lock or create destination InventoryItem
            InventoryItem destItem = inventoryItemRepository.findByStoreIdAndProductIdAndBusinessId(
                destStore.getId(),
                line.getProductId(),
                businessId
            ).orElseGet(() -> {
                InventoryItem newItem = new InventoryItem(
                    businessId,
                    destStore.getId(),
                    line.getProductId(),
                    null, null, null, null, null,
                    true
                );
                return inventoryItemRepository.save(newItem);
            });

            for (ReceiveTransferBatchAllocationRequest allocReq : lineReq.batchAllocations()) {
                TransferLineBatchAllocation alloc = allocMap.get(allocReq.transferLineBatchAllocationId());
                if (alloc == null) {
                    throw new BusinessRuleViolationException(
                        "ALLOCATION_NOT_FOUND",
                        "Batch allocation " + allocReq.transferLineBatchAllocationId() + " not found"
                    );
                }

                BigDecimal remainingShipped = alloc.getShippedBaseQuantity().subtract(alloc.getReceivedBaseQuantity());
                if (allocReq.receivedBaseQuantity().compareTo(remainingShipped) > 0) {
                    throw new BusinessRuleViolationException(
                        "RECEIVED_BATCH_QUANTITY_EXCEEDS_SHIPPED",
                        String.format(
                            "Received quantity (%.3f) exceeds remaining unreceived balance (%.3f) for batch %s",
                            allocReq.receivedBaseQuantity(),
                            remainingShipped,
                            alloc.getBatchNumber()
                        )
                    );
                }

                // Deterministic destination batch lookup using (store_id, product_id, batch_number)
                Optional<InventoryBatch> destBatchOpt = inventoryBatchRepository.findByStoreIdAndProductIdAndBatchNumber(
                    destStore.getId(),
                    alloc.getProductId(),
                    alloc.getBatchNumber()
                );

                InventoryBatch destBatch;
                if (destBatchOpt.isPresent()) {
                    destBatch = destBatchOpt.get();
                    if (!destBatch.getExpiryDate().equals(alloc.getExpiryDate())) {
                        throw new BusinessRuleViolationException(
                            "BATCH_METADATA_MISMATCH",
                            String.format(
                                "Destination batch %s has expiry date %s, but transferred batch has expiry date %s",
                                alloc.getBatchNumber(),
                                destBatch.getExpiryDate(),
                                alloc.getExpiryDate()
                            )
                        );
                    }
                    destBatch.adjustQuantity(allocReq.receivedBaseQuantity());
                } else {
                    destBatch = new InventoryBatch(
                        businessId,
                        destStore.getId(),
                        alloc.getProductId(),
                        destItem.getId(),
                        alloc.getBatchNumber(),
                        alloc.getManufacturingDate(),
                        alloc.getExpiryDate(),
                        allocReq.receivedBaseQuantity(),
                        alloc.getUnitCost().setScale(2, java.math.RoundingMode.HALF_UP),
                        alloc.getMrp().setScale(2, java.math.RoundingMode.HALF_UP),
                        alloc.getSellingPrice().setScale(2, java.math.RoundingMode.HALF_UP)
                    );
                }
                destBatch = inventoryBatchRepository.save(destBatch);

                // Increment destination item stock
                destItem.adjustStock(allocReq.receivedBaseQuantity());
                destItem = inventoryItemRepository.save(destItem);

                // Append TRANSFER_IN stock movement
                StockMovement movement = new StockMovement(
                    businessId,
                    destStore.getId(),
                    alloc.getProductId(),
                    destBatch.getId(),
                    StockMovementType.TRANSFER_IN,
                    allocReq.receivedBaseQuantity(),
                    alloc.getUnitCost().setScale(2, java.math.RoundingMode.HALF_UP),
                    destItem.getCurrentStock(),
                    "INVENTORY_TRANSFER",
                    transfer.getId(),
                    "Transfer Receipt " + receiptNumber,
                    userId,
                    deviceId,
                    Instant.now()
                );
                stockMovementRepository.save(movement);

                alloc.recordReceipt(allocReq.receivedBaseQuantity(), destBatch.getId());
                batchAllocationRepository.save(alloc);

                line.recordReceipt(allocReq.receivedBaseQuantity());
                transferLineRepository.save(line);

                InventoryTransferReceiptLine receiptLine = new InventoryTransferReceiptLine(
                    businessId,
                    receipt.getId(),
                    line.getId(),
                    alloc.getId(),
                    destBatch.getId(),
                    alloc.getProductId(),
                    allocReq.receivedBaseQuantity()
                );
                receipt.addLine(receiptLine);
            }
        }

        receipt = receiptRepository.save(receipt);

        transfer.recordReceiptProgress(userId);
        transferRepository.save(transfer);

        return buildReceiptResponse(businessId, receipt);
    }

    @Transactional(readOnly = true)
    public TransferResponse getTransferById(UUID businessId, UUID transferId) {
        InventoryTransfer transfer = transferRepository.findByIdAndBusinessId(transferId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Transfer", transferId));
        return buildTransferResponse(businessId, transfer);
    }

    @Transactional(readOnly = true)
    public Page<TransferResponse> searchTransfers(
        UUID businessId,
        UUID storeId,
        TransferStatus status,
        Pageable pageable
    ) {
        Page<InventoryTransfer> page = transferRepository.searchTransfers(businessId, storeId, status, pageable);
        return page.map(t -> buildTransferResponse(businessId, t));
    }

    private TransferResponse buildTransferResponse(UUID businessId, InventoryTransfer transfer) {
        List<InventoryTransferLine> lines = transferLineRepository.findByTransferIdAndBusinessIdOrderByLineNumberAsc(transfer.getId(), businessId);
        List<TransferLineBatchAllocation> allocations = batchAllocationRepository.findByTransferIdAndBusinessId(transfer.getId(), businessId);
        List<InventoryTransferReceipt> receipts = receiptRepository.findByTransferIdAndBusinessIdOrderByReceivedAtAsc(transfer.getId(), businessId);

        List<TransferLineResponse> lineResponses = lines.stream()
            .map(l -> new TransferLineResponse(
                l.getId(),
                l.getProductId(),
                l.getLineNumber(),
                l.getProductName(),
                l.getSellingUnit(),
                l.getConversionFactor(),
                l.getRequestedQuantity(),
                l.getRequestedBaseQuantity(),
                l.getApprovedQuantity(),
                l.getApprovedBaseQuantity(),
                l.getShippedQuantity(),
                l.getShippedBaseQuantity(),
                l.getReceivedQuantity(),
                l.getReceivedBaseQuantity(),
                l.getUnitCost(),
                l.getNotes()
            ))
            .toList();

        List<TransferLineBatchAllocationResponse> allocResponses = allocations.stream()
            .map(a -> new TransferLineBatchAllocationResponse(
                a.getId(),
                a.getTransferLineId(),
                a.getSourceBatchId(),
                a.getDestinationBatchId(),
                a.getProductId(),
                a.getBatchNumber(),
                a.getManufacturingDate(),
                a.getExpiryDate(),
                a.getShippedBaseQuantity(),
                a.getReceivedBaseQuantity(),
                a.getUnitCost(),
                a.getMrp(),
                a.getSellingPrice()
            ))
            .toList();

        List<TransferReceiptResponse> receiptResponses = receipts.stream()
            .map(r -> buildReceiptResponse(businessId, r))
            .toList();

        return new TransferResponse(
            transfer.getId(),
            transfer.getBusinessId(),
            transfer.getSourceStoreId(),
            transfer.getDestinationStoreId(),
            transfer.getTransferNumber(),
            transfer.getStatus(),
            transfer.getRequestedBy(),
            transfer.getRequestedAt(),
            transfer.getApprovedBy(),
            transfer.getApprovedAt(),
            transfer.getShippedBy(),
            transfer.getShippedAt(),
            transfer.getReceivedBy(),
            transfer.getReceivedAt(),
            transfer.getCancelledBy(),
            transfer.getCancelledAt(),
            transfer.getCancellationReason(),
            transfer.getRejectionReason(),
            transfer.getExpectedDeliveryDate(),
            transfer.getNotes(),
            lineResponses,
            allocResponses,
            receiptResponses
        );
    }

    private TransferReceiptResponse buildReceiptResponse(UUID businessId, InventoryTransferReceipt receipt) {
        List<InventoryTransferReceiptLine> lines = (receipt.getLines() != null && !receipt.getLines().isEmpty())
            ? receipt.getLines()
            : receiptLineRepository.findByTransferReceiptIdAndBusinessId(receipt.getId(), businessId);
        List<TransferReceiptLineResponse> lineResponses = lines.stream()
            .map(l -> new TransferReceiptLineResponse(
                l.getId(),
                l.getTransferLineId(),
                l.getTransferLineBatchAllocationId(),
                l.getDestinationBatchId(),
                l.getProductId(),
                l.getReceivedBaseQuantity()
            ))
            .toList();

        return new TransferReceiptResponse(
            receipt.getId(),
            receipt.getStoreId(),
            receipt.getTransferId(),
            receipt.getReceiptNumber(),
            receipt.getReceiptDate(),
            receipt.getReceivedBy(),
            receipt.getReceivedAt(),
            receipt.getNotes(),
            lineResponses
        );
    }
}
