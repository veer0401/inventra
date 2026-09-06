package com.inventra.inventra_backend.sales.application;

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
import com.inventra.inventra_backend.sales.api.dto.CreateSaleRefundRequest;
import com.inventra.inventra_backend.sales.api.dto.CreateSaleReturnBatchAllocationRequest;
import com.inventra.inventra_backend.sales.api.dto.CreateSaleReturnLineRequest;
import com.inventra.inventra_backend.sales.api.dto.CreateSaleReturnRequest;
import com.inventra.inventra_backend.sales.api.dto.SaleRefundResponse;
import com.inventra.inventra_backend.sales.api.dto.SaleReturnLineBatchAllocationResponse;
import com.inventra.inventra_backend.sales.api.dto.SaleReturnLineResponse;
import com.inventra.inventra_backend.sales.api.dto.SaleReturnResponse;
import com.inventra.inventra_backend.sales.domain.model.Sale;
import com.inventra.inventra_backend.sales.domain.model.SaleLine;
import com.inventra.inventra_backend.sales.domain.model.SaleLineBatchAllocation;
import com.inventra.inventra_backend.sales.domain.model.SaleRefund;
import com.inventra.inventra_backend.sales.domain.model.SaleReturn;
import com.inventra.inventra_backend.sales.domain.model.SaleReturnLine;
import com.inventra.inventra_backend.sales.domain.model.SaleReturnLineBatchAllocation;
import com.inventra.inventra_backend.sales.domain.model.SaleStatus;
import com.inventra.inventra_backend.sales.domain.model.StockCondition;
import com.inventra.inventra_backend.identity.application.SecurityAuditService;
import com.inventra.inventra_backend.sales.domain.repository.SaleLineBatchAllocationRepository;
import com.inventra.inventra_backend.sales.domain.repository.SaleLineRepository;
import com.inventra.inventra_backend.sales.domain.repository.SaleRefundRepository;
import com.inventra.inventra_backend.sales.domain.repository.SaleRepository;
import com.inventra.inventra_backend.sales.domain.repository.SaleReturnLineBatchAllocationRepository;
import com.inventra.inventra_backend.sales.domain.repository.SaleReturnLineRepository;
import com.inventra.inventra_backend.sales.domain.repository.SaleReturnRepository;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SaleReturnService {

    private final SaleRepository saleRepository;
    private final SaleLineRepository saleLineRepository;
    private final SaleLineBatchAllocationRepository saleLineBatchAllocationRepository;
    private final SaleReturnRepository saleReturnRepository;
    private final SaleReturnLineRepository saleReturnLineRepository;
    private final SaleReturnLineBatchAllocationRepository saleReturnLineBatchAllocationRepository;
    private final SaleRefundRepository saleRefundRepository;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final StockMovementRepository stockMovementRepository;
    private final SecurityAuditService securityAuditService;

    public SaleReturnService(
        SaleRepository saleRepository,
        SaleLineRepository saleLineRepository,
        SaleLineBatchAllocationRepository saleLineBatchAllocationRepository,
        SaleReturnRepository saleReturnRepository,
        SaleReturnLineRepository saleReturnLineRepository,
        SaleReturnLineBatchAllocationRepository saleReturnLineBatchAllocationRepository,
        SaleRefundRepository saleRefundRepository,
        StoreRepository storeRepository,
        ProductRepository productRepository,
        InventoryItemRepository inventoryItemRepository,
        InventoryBatchRepository inventoryBatchRepository,
        StockMovementRepository stockMovementRepository,
        SecurityAuditService securityAuditService
    ) {
        this.saleRepository = saleRepository;
        this.saleLineRepository = saleLineRepository;
        this.saleLineBatchAllocationRepository = saleLineBatchAllocationRepository;
        this.saleReturnRepository = saleReturnRepository;
        this.saleReturnLineRepository = saleReturnLineRepository;
        this.saleReturnLineBatchAllocationRepository = saleReturnLineBatchAllocationRepository;
        this.saleRefundRepository = saleRefundRepository;
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.inventoryBatchRepository = inventoryBatchRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.securityAuditService = securityAuditService;
    }

    @Transactional
    public SaleReturnResponse processReturn(
        UUID businessId,
        UUID saleId,
        UUID returnedBy,
        UUID deviceId,
        CreateSaleReturnRequest request
    ) {
        // Step 1: Idempotency check
        if (request.idempotencyKey() != null && !request.idempotencyKey().isBlank()) {
            var existingOpt = saleReturnRepository.findByBusinessIdAndIdempotencyKey(businessId, request.idempotencyKey().trim());
            if (existingOpt.isPresent()) {
                return buildSaleReturnResponse(businessId, existingOpt.get());
            }
        }

        // Step 2: Load Sale with pessimistic lock & validate return eligibility
        Sale sale = saleRepository.findByIdAndBusinessIdForUpdate(saleId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Sale", saleId));

        if (sale.getStatus() != SaleStatus.COMPLETED && sale.getStatus() != SaleStatus.PARTIALLY_RETURNED) {
            throw new BusinessRuleViolationException(
                "CANNOT_RETURN_SALE",
                "Cannot return items for sale in status " + sale.getStatus()
            );
        }

        Store store = storeRepository.findByIdAndBusinessId(sale.getStoreId(), businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Store", sale.getStoreId()));

        if (request.lines() == null || request.lines().isEmpty()) {
            throw new BusinessRuleViolationException("EMPTY_RETURN_LINES", "Return must contain at least one line item");
        }
        if (request.refunds() == null || request.refunds().isEmpty()) {
            throw new BusinessRuleViolationException("EMPTY_RETURN_REFUNDS", "Return must contain at least one refund record");
        }

        // Step 3: Generate sequential return number
        long count = saleReturnRepository.countByBusinessIdAndStoreId(businessId, store.getId()) + 1;
        String returnNumber = String.format("RET-%s-%06d", store.getStoreCode(), count);

        // Step 4: Create SaleReturn entity
        SaleReturn saleReturn = new SaleReturn(
            businessId,
            store.getId(),
            sale.getId(),
            returnNumber,
            request.returnDate() != null ? request.returnDate() : LocalDate.now(),
            request.reason(),
            returnedBy,
            deviceId,
            request.idempotencyKey()
        );

        List<SaleReturnLine> returnLines = new ArrayList<>();
        List<SaleReturnLineBatchAllocation> returnAllocations = new ArrayList<>();
        int lineNum = 1;

        // Step 5: Process lines
        for (CreateSaleReturnLineRequest lineReq : request.lines()) {
            SaleLine saleLine = saleLineRepository.findByIdAndSaleIdAndBusinessId(lineReq.saleLineId(), sale.getId(), businessId)
                .orElseThrow(() -> ResourceNotFoundException.forResource("SaleLine", lineReq.saleLineId()));

            BigDecimal requestedReturnQty = lineReq.quantity().setScale(3, RoundingMode.HALF_UP);
            if (requestedReturnQty.compareTo(saleLine.getRemainingReturnableQuantity()) > 0) {
                throw new BusinessRuleViolationException(
                    "RETURN_QUANTITY_EXCEEDS_ELIGIBLE",
                    "Return quantity " + requestedReturnQty + " exceeds remaining eligible quantity " + saleLine.getRemainingReturnableQuantity()
                );
            }

            int conversionFactor = saleLine.getConversionFactor() >= 1 ? saleLine.getConversionFactor() : 1;
            BigDecimal baseQuantity = requestedReturnQty.multiply(BigDecimal.valueOf(conversionFactor))
                .setScale(3, RoundingMode.HALF_UP);

            SaleReturnLine returnLine = new SaleReturnLine(
                businessId,
                saleReturn.getId(),
                saleLine.getId(),
                saleLine.getProductId(),
                lineNum++,
                requestedReturnQty,
                baseQuantity,
                saleLine.getUnitPrice(),
                saleLine.getTaxRate()
            );
            returnLines.add(returnLine);
            saleReturn.addLine(returnLine);

            // Process Batch Allocations for Return
            if (lineReq.batchAllocations() != null && !lineReq.batchAllocations().isEmpty()) {
                BigDecimal sumBatchQty = BigDecimal.ZERO;
                for (CreateSaleReturnBatchAllocationRequest allocReq : lineReq.batchAllocations()) {
                    SaleLineBatchAllocation originalAlloc = saleLineBatchAllocationRepository
                        .findByIdAndSaleLineIdAndBusinessId(allocReq.saleLineBatchAllocationId(), saleLine.getId(), businessId)
                        .orElseThrow(() -> ResourceNotFoundException.forResource("SaleLineBatchAllocation", allocReq.saleLineBatchAllocationId()));

                    BigDecimal retBaseQty = allocReq.returnedBaseQuantity().setScale(3, RoundingMode.HALF_UP);
                    if (retBaseQty.compareTo(originalAlloc.getRemainingReturnableBaseQuantity()) > 0) {
                        throw new BusinessRuleViolationException(
                            "RETURN_BATCH_QUANTITY_EXCEEDS_ALLOCATED",
                            "Returned batch quantity (" + retBaseQty + ") exceeds remaining allocated quantity (" + originalAlloc.getRemainingReturnableBaseQuantity() + ")"
                        );
                    }

                    StockCondition condition = allocReq.stockCondition() != null ? allocReq.stockCondition() : StockCondition.RESTOCKABLE;

                    SaleReturnLineBatchAllocation retAlloc = new SaleReturnLineBatchAllocation(
                        businessId,
                        store.getId(),
                        saleReturn.getId(),
                        returnLine.getId(),
                        originalAlloc.getId(),
                        originalAlloc.getBatchId(),
                        originalAlloc.getProductId(),
                        retBaseQty,
                        condition
                    );
                    returnAllocations.add(retAlloc);
                    returnLine.addBatchAllocation(retAlloc);

                    originalAlloc.addReturnedBaseQuantity(retBaseQty);
                    saleLineBatchAllocationRepository.save(originalAlloc);

                    sumBatchQty = sumBatchQty.add(retBaseQty);

                    // Inventory & Stock Movement adjustments based on condition
                    InventoryItem item = inventoryItemRepository.findByStoreIdAndProductIdAndBusinessId(
                        store.getId(),
                        originalAlloc.getProductId(),
                        businessId
                    ).orElseThrow();

                    if (condition == StockCondition.RESTOCKABLE) {
                        InventoryBatch batch = inventoryBatchRepository.findByIdAndBusinessId(originalAlloc.getBatchId(), businessId)
                            .orElseThrow();
                        batch.adjustQuantity(retBaseQty);
                        inventoryBatchRepository.save(batch);

                        item.adjustStock(retBaseQty);
                        inventoryItemRepository.save(item);

                        StockMovement movement = new StockMovement(
                            businessId,
                            store.getId(),
                            originalAlloc.getProductId(),
                            originalAlloc.getBatchId(),
                            StockMovementType.SALE_RETURN,
                            retBaseQty,
                            originalAlloc.getUnitCost(),
                            item.getCurrentStock(),
                            "SALE_RETURN",
                            saleReturn.getId(),
                            "Customer Return " + returnNumber,
                            returnedBy,
                            deviceId,
                            Instant.now()
                        );
                        stockMovementRepository.save(movement);
                    } else if (condition == StockCondition.DAMAGED) {
                        StockMovement movement = new StockMovement(
                            businessId,
                            store.getId(),
                            originalAlloc.getProductId(),
                            originalAlloc.getBatchId(),
                            StockMovementType.DAMAGE_WRITE_OFF,
                            retBaseQty.negate(),
                            originalAlloc.getUnitCost(),
                            item.getCurrentStock(),
                            "SALE_RETURN",
                            saleReturn.getId(),
                            "Damaged Return Write-off " + returnNumber,
                            returnedBy,
                            deviceId,
                            Instant.now()
                        );
                        stockMovementRepository.save(movement);
                    } else if (condition == StockCondition.EXPIRED) {
                        StockMovement movement = new StockMovement(
                            businessId,
                            store.getId(),
                            originalAlloc.getProductId(),
                            originalAlloc.getBatchId(),
                            StockMovementType.EXPIRY_WRITE_OFF,
                            retBaseQty.negate(),
                            originalAlloc.getUnitCost(),
                            item.getCurrentStock(),
                            "SALE_RETURN",
                            saleReturn.getId(),
                            "Expired Return Write-off " + returnNumber,
                            returnedBy,
                            deviceId,
                            Instant.now()
                        );
                        stockMovementRepository.save(movement);
                    }
                }

                if (sumBatchQty.compareTo(baseQuantity) != 0) {
                    throw new BusinessRuleViolationException(
                        "RETURN_BATCH_QUANTITY_MISMATCH",
                        "Sum of batch allocations (" + sumBatchQty + ") must match line base quantity (" + baseQuantity + ")"
                    );
                }

            } else {
                // Non-batch return
                InventoryItem item = inventoryItemRepository.findByStoreIdAndProductIdAndBusinessId(
                    store.getId(),
                    saleLine.getProductId(),
                    businessId
                ).orElseThrow();

                item.adjustStock(baseQuantity);
                inventoryItemRepository.save(item);

                StockMovement movement = new StockMovement(
                    businessId,
                    store.getId(),
                    saleLine.getProductId(),
                    null,
                    StockMovementType.SALE_RETURN,
                    baseQuantity,
                    null,
                    item.getCurrentStock(),
                    "SALE_RETURN",
                    saleReturn.getId(),
                    "Customer Return " + returnNumber,
                    returnedBy,
                    deviceId,
                    Instant.now()
                );
                stockMovementRepository.save(movement);
            }

            saleLine.addReturnedQuantity(requestedReturnQty);
            saleLineRepository.save(saleLine);
        }

        // Step 6: Process Refunds
        for (CreateSaleRefundRequest refundReq : request.refunds()) {
            SaleRefund refund = new SaleRefund(
                businessId,
                store.getId(),
                saleReturn.getId(),
                refundReq.refundMethod(),
                refundReq.amount(),
                refundReq.transactionReference(),
                returnedBy,
                refundReq.notes()
            );
            saleReturn.addRefund(refund);
        }

        saleReturn.recalculateTotals();

        // Step 7: Update Sale status
        sale.markReturnProcessed();
        saleRepository.save(sale);

        // Step 8: Save SaleReturn and child records
        SaleReturn savedReturn = saleReturnRepository.save(saleReturn);
        for (SaleReturnLine rl : returnLines) {
            saleReturnLineRepository.save(rl);
        }
        for (SaleReturnLineBatchAllocation rba : returnAllocations) {
            saleReturnLineBatchAllocationRepository.save(rba);
        }
        for (SaleRefund rf : saleReturn.getRefunds()) {
            saleRefundRepository.save(rf);
        }

        securityAuditService.recordEvent(
            returnedBy,
            businessId,
            deviceId,
            com.inventra.inventra_backend.identity.domain.model.SecurityAuditEventType.SALE_RETURN_PROCESSED,
            null,
            null,
            "Processed sale return " + savedReturn.getReturnNumber() + " for sale " + sale.getSaleNumber() + " (refund: " + savedReturn.getTotalRefundAmount() + ")"
        );

        return buildSaleReturnResponse(businessId, savedReturn);
    }

    @Transactional(readOnly = true)
    public SaleReturnResponse getSaleReturn(UUID businessId, UUID returnId) {
        SaleReturn ret = saleReturnRepository.findByIdAndBusinessId(returnId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("SaleReturn", returnId));
        return buildSaleReturnResponse(businessId, ret);
    }

    @Transactional(readOnly = true)
    public Page<SaleReturnResponse> searchReturns(
        UUID businessId,
        UUID storeId,
        UUID saleId,
        LocalDate startDate,
        LocalDate endDate,
        Pageable pageable
    ) {
        return saleReturnRepository.searchReturns(businessId, storeId, saleId, startDate, endDate, pageable)
            .map(r -> buildSaleReturnResponse(businessId, r));
    }

    private SaleReturnResponse buildSaleReturnResponse(UUID businessId, SaleReturn ret) {
        List<SaleReturnLine> lines = saleReturnLineRepository.findBySaleReturnIdAndBusinessIdOrderByLineNumberAsc(ret.getId(), businessId);
        List<SaleReturnLineBatchAllocation> allAllocations = saleReturnLineBatchAllocationRepository.findBySaleReturnIdAndBusinessId(ret.getId(), businessId);
        List<SaleRefund> refunds = saleRefundRepository.findBySaleReturnIdAndBusinessId(ret.getId(), businessId);

        Map<UUID, List<SaleReturnLineBatchAllocation>> allocMap = allAllocations.stream()
            .collect(Collectors.groupingBy(SaleReturnLineBatchAllocation::getSaleReturnLineId));

        List<SaleReturnLineResponse> lineResponses = lines.stream()
            .map(l -> {
                List<SaleReturnLineBatchAllocationResponse> allocResponses = allocMap.getOrDefault(l.getId(), List.of())
                    .stream()
                    .map(SaleReturnLineBatchAllocationResponse::from)
                    .toList();
                return SaleReturnLineResponse.from(l, allocResponses);
            })
            .toList();

        List<SaleRefundResponse> refundResponses = refunds.stream()
            .map(SaleRefundResponse::from)
            .toList();

        return SaleReturnResponse.from(ret, lineResponses, refundResponses);
    }
}
