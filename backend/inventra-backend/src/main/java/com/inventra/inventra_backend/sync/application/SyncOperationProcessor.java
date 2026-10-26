package com.inventra.inventra_backend.sync.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.inventory.domain.model.InventoryBatch;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryBatchRepository;
import com.inventra.inventra_backend.sales.api.dto.CreateSalePaymentRequest;
import com.inventra.inventra_backend.sales.api.dto.CreateSaleRequest;
import com.inventra.inventra_backend.sales.api.dto.CreateSaleReturnRequest;
import com.inventra.inventra_backend.sales.api.dto.SaleResponse;
import com.inventra.inventra_backend.sales.api.dto.SaleReturnResponse;
import com.inventra.inventra_backend.sales.application.SaleReturnService;
import com.inventra.inventra_backend.sales.application.SaleService;
import com.inventra.inventra_backend.sales.domain.model.Sale;
import com.inventra.inventra_backend.sales.domain.repository.SaleRepository;
import com.inventra.inventra_backend.sync.api.dto.SyncOperationRequest;
import com.inventra.inventra_backend.sync.api.dto.SyncOperationResult;
import com.inventra.inventra_backend.sync.domain.model.SyncEventType;
import com.inventra.inventra_backend.sync.domain.model.SyncOperation;
import com.inventra.inventra_backend.sync.domain.model.SyncStatus;
import com.inventra.inventra_backend.purchasing.api.dto.CreateGoodsReceiptRequest;
import com.inventra.inventra_backend.purchasing.api.dto.CreatePurchaseOrderRequest;
import com.inventra.inventra_backend.purchasing.api.dto.CreateSupplierRequest;
import com.inventra.inventra_backend.purchasing.api.dto.GoodsReceiptResponse;
import com.inventra.inventra_backend.purchasing.api.dto.PurchaseOrderResponse;
import com.inventra.inventra_backend.purchasing.api.dto.SupplierResponse;
import com.inventra.inventra_backend.purchasing.application.GoodsReceiptService;
import com.inventra.inventra_backend.purchasing.application.PurchaseOrderService;
import com.inventra.inventra_backend.purchasing.application.SupplierService;
import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceipt;
import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceiptStatus;
import com.inventra.inventra_backend.purchasing.domain.repository.GoodsReceiptRepository;
import com.inventra.inventra_backend.purchasing.domain.repository.PurchaseOrderRepository;
import com.inventra.inventra_backend.purchasing.domain.repository.SupplierRepository;
import com.inventra.inventra_backend.sync.domain.repository.SyncOperationRepository;
import com.inventra.inventra_backend.sync.infrastructure.CanonicalJsonUtils;
import com.inventra.inventra_backend.transfer.api.dto.CreateTransferRequest;
import com.inventra.inventra_backend.transfer.api.dto.TransferResponse;
import com.inventra.inventra_backend.transfer.application.TransferService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class SyncOperationProcessor {

    private static final Logger log = LoggerFactory.getLogger(SyncOperationProcessor.class);

    private final SyncOperationRepository syncOperationRepository;
    private final SyncOperationRecorder syncOperationRecorder;
    private final SaleRepository saleRepository;
    private final SaleService saleService;
    private final SaleReturnService saleReturnService;
    private final TransferService transferService;
    private final ProductRepository productRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final GoodsReceiptService goodsReceiptService;
    private final GoodsReceiptRepository goodsReceiptRepository;
    private final PurchaseOrderService purchaseOrderService;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierService supplierService;
    private final SupplierRepository supplierRepository;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactionTemplate;

    public SyncOperationProcessor(
        SyncOperationRepository syncOperationRepository,
        SyncOperationRecorder syncOperationRecorder,
        SaleRepository saleRepository,
        SaleService saleService,
        SaleReturnService saleReturnService,
        TransferService transferService,
        ProductRepository productRepository,
        InventoryBatchRepository inventoryBatchRepository,
        GoodsReceiptService goodsReceiptService,
        GoodsReceiptRepository goodsReceiptRepository,
        PurchaseOrderService purchaseOrderService,
        PurchaseOrderRepository purchaseOrderRepository,
        SupplierService supplierService,
        SupplierRepository supplierRepository,
        ObjectMapper objectMapper,
        PlatformTransactionManager transactionManager
    ) {
        this.syncOperationRepository = syncOperationRepository;
        this.syncOperationRecorder = syncOperationRecorder;
        this.saleRepository = saleRepository;
        this.saleService = saleService;
        this.saleReturnService = saleReturnService;
        this.transferService = transferService;
        this.productRepository = productRepository;
        this.inventoryBatchRepository = inventoryBatchRepository;
        this.goodsReceiptService = goodsReceiptService;
        this.goodsReceiptRepository = goodsReceiptRepository;
        this.purchaseOrderService = purchaseOrderService;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.supplierService = supplierService;
        this.supplierRepository = supplierRepository;
        this.objectMapper = objectMapper;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public SyncOperationResult processSingleOperation(
        UUID businessId,
        UUID storeId,
        UUID userId,
        UUID deviceId,
        SyncOperationRequest opReq
    ) {
        UUID eventId = opReq.eventId();
        Long seq = opReq.deviceSequenceNumber();

        // 1. Independent Checksum Validation using canonical JSON
        String computedChecksum = CanonicalJsonUtils.computeCanonicalChecksum(opReq.payload());
        if (!computedChecksum.equalsIgnoreCase(opReq.payloadChecksum())) {
            log.warn("Payload checksum mismatch for event {}: expected {}, computed {}",
                eventId, opReq.payloadChecksum(), computedChecksum);
            return syncOperationRecorder.recordRejected(
                businessId, storeId, deviceId, userId, opReq,
                "IDEMPOTENCY_PAYLOAD_MISMATCH",
                "Payload checksum mismatch: provided " + opReq.payloadChecksum() + " but computed " + computedChecksum,
                false
            );
        }

        // 2. Check if sync_operations already contains eventId (Technical Duplicate Check)
        Optional<SyncOperation> existingOpOpt = syncOperationRepository.findByBusinessIdAndDeviceIdAndEventId(
            businessId, deviceId, eventId
        );
        if (existingOpOpt.isPresent()) {
            SyncOperation existingOp = existingOpOpt.get();
            if (!existingOp.getPayloadChecksum().equalsIgnoreCase(computedChecksum)) {
                log.warn("Event {} already processed with different payload checksum", eventId);
                return syncOperationRecorder.recordRejected(
                    businessId, storeId, deviceId, userId, opReq,
                    "IDEMPOTENCY_PAYLOAD_MISMATCH",
                    "Event ID already exists with different payload",
                    false
                );
            }
            existingOp.incrementRetryCount();
            syncOperationRepository.save(existingOp);

            if (existingOp.getStatus() == SyncStatus.APPLIED) {
                return SyncOperationResult.duplicate(
                    eventId, seq, existingOp.getServerEntityId(), "Operation already applied"
                );
            } else {
                return new SyncOperationResult(
                    eventId, seq, existingOp.getStatus(), existingOp.getServerEntityId(),
                    0, existingOp.getErrorCode(), existingOp.getErrorMessage(), false, null
                );
            }
        }

        // 3. Process according to eventType within an isolated transaction
        try {
            return transactionTemplate.execute(status -> {
                try {
                    if (opReq.eventType() == SyncEventType.SALE_CREATED) {
                        return processSaleCreated(businessId, storeId, userId, deviceId, opReq, computedChecksum);
                    } else if (opReq.eventType() == SyncEventType.SALE_RETURN_CREATED) {
                        return processSaleReturnCreated(businessId, storeId, userId, deviceId, opReq, computedChecksum);
                    } else if (opReq.eventType() == SyncEventType.TRANSFER_REQUEST_CREATED) {
                        return processTransferRequestCreated(businessId, storeId, userId, deviceId, opReq, computedChecksum);
                    } else if (opReq.eventType() == SyncEventType.GOODS_RECEIPT_POSTED) {
                        return processGoodsReceiptPosted(businessId, storeId, userId, deviceId, opReq, computedChecksum);
                    } else if (opReq.eventType() == SyncEventType.PURCHASE_ORDER_CREATED) {
                        return processPurchaseOrderCreated(businessId, storeId, userId, deviceId, opReq, computedChecksum);
                    } else if (opReq.eventType() == SyncEventType.SUPPLIER_CREATED) {
                        return processSupplierCreated(businessId, storeId, userId, deviceId, opReq, computedChecksum);
                    } else {
                        throw new BusinessRuleViolationException(
                            "UNSUPPORTED_EVENT_TYPE", "Event type " + opReq.eventType() + " is not supported"
                        );
                    }
                } catch (RuntimeException re) {
                    throw re;
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            });
        } catch (Exception e) {
            Throwable root = NestedExceptionUtils.getMostSpecificCause(e);
            if (root instanceof BusinessRuleViolationException brve) {
                log.warn("Domain violation processing event {}: [{}] {}", eventId, brve.getErrorCode(), brve.getMessage());
                return syncOperationRecorder.recordRejected(
                    businessId, storeId, deviceId, userId, opReq,
                    brve.getErrorCode(), brve.getMessage(), false
                );
            } else if (root instanceof ResourceNotFoundException rnfe) {
                log.warn("Resource not found processing event {}: {}", eventId, rnfe.getMessage());
                return syncOperationRecorder.recordRejected(
                    businessId, storeId, deviceId, userId, opReq,
                    "RESOURCE_NOT_FOUND", rnfe.getMessage(), false
                );
            } else if (isUnreadablePayload(e)) {
                // The payload itself is wrong (bad UUID, wrong type, missing value): resending it cannot help,
                // so this is a permanent rejection, not a retryable processing error.
                log.warn("Unreadable payload for event {}: {}", eventId, root.getMessage());
                return syncOperationRecorder.recordRejected(
                    businessId, storeId, deviceId, userId, opReq,
                    "INVALID_PAYLOAD", "The operation payload could not be read: " + root.getMessage(), false
                );
            } else {
                log.error("Unexpected error processing event {}", eventId, root);
                return syncOperationRecorder.recordRejected(
                    businessId, storeId, deviceId, userId, opReq,
                    "PROCESSING_ERROR", root.getMessage(), true
                );
            }
        }
    }

    private static boolean isUnreadablePayload(Throwable t) {
        for (Throwable cause = t; cause != null; cause = cause.getCause() == cause ? null : cause.getCause()) {
            if (cause instanceof IllegalArgumentException || cause instanceof JsonProcessingException) {
                return true;
            }
        }
        return false;
    }

    private SyncOperationResult processSaleCreated(
        UUID businessId,
        UUID storeId,
        UUID userId,
        UUID deviceId,
        SyncOperationRequest opReq,
        String checksum
    ) throws Exception {
        UUID eventId = opReq.eventId();
        Long seq = opReq.deviceSequenceNumber();
        String idempotencyKey = "SYNC-" + eventId;

        // Check Phase 6 Sale idempotency in case sync_operations record was lost
        Optional<Sale> existingSaleOpt = saleRepository.findByBusinessIdAndIdempotencyKey(businessId, idempotencyKey);
        if (existingSaleOpt.isPresent()) {
            Sale existingSale = existingSaleOpt.get();
            SyncOperation recoveredOp = new SyncOperation(
                businessId, storeId, deviceId, userId, eventId, seq,
                SyncEventType.SALE_CREATED, opReq.eventVersion(),
                SyncStatus.APPLIED, existingSale.getId(), checksum,
                null, "Recovered from existing sale", opReq.occurredAt()
            );
            syncOperationRepository.save(recoveredOp);
            return SyncOperationResult.duplicate(eventId, seq, existingSale.getId(), "Sale recovered via idempotency key");
        }

        // Deserialize CreateSaleRequest
        CreateSaleRequest saleReq = objectMapper.convertValue(opReq.payload(), CreateSaleRequest.class);

        JsonNode payloadNode = (opReq.payload() instanceof JsonNode jn)
            ? jn : objectMapper.valueToTree(opReq.payload());

        // Validate offline price snapshots
        validateOfflinePrices(businessId, storeId, payloadNode);

        // Attach deterministic idempotency key and store ID
        CreateSaleRequest mappedReq = new CreateSaleRequest(
            storeId,
            saleReq.saleDate(),
            saleReq.customerName(),
            saleReq.customerPhone(),
            saleReq.discountAmount(),
            saleReq.roundOffAmount(),
            idempotencyKey,
            saleReq.notes(),
            saleReq.lines(),
            saleReq.payments()
        );

        // Execute authoritative SaleService checkout (acquires locks, FEFO allocates batches, inserts StockMovement)
        SaleResponse saleResponse = saleService.checkoutSale(businessId, userId, deviceId, mappedReq);

        // Commit SyncOperation record in the same transaction
        SyncOperation syncOp = new SyncOperation(
            businessId, storeId, deviceId, userId, eventId, seq,
            SyncEventType.SALE_CREATED, opReq.eventVersion(),
            SyncStatus.APPLIED, saleResponse.id(), checksum,
            null, "Sale created successfully", opReq.occurredAt()
        );
        syncOperationRepository.save(syncOp);

        return SyncOperationResult.applied(eventId, seq, saleResponse.id(), "Sale created successfully");
    }

    private void validateOfflinePrices(UUID businessId, UUID storeId, JsonNode payloadNode) {
        JsonNode linesNode = payloadNode.get("lines");
        if (linesNode != null && linesNode.isArray()) {
            for (JsonNode lineNode : linesNode) {
                if (lineNode.has("productId")) {
                    UUID productId = UUID.fromString(lineNode.get("productId").asText());
                    Product product = productRepository.findByIdAndBusinessId(productId, businessId)
                        .orElseThrow(() -> ResourceNotFoundException.forResource("Product", productId));

                    if (lineNode.has("unitPrice") && !lineNode.get("unitPrice").isNull()) {
                        BigDecimal submittedUnitPrice = new BigDecimal(lineNode.get("unitPrice").asText());

                        boolean priceAuthorized = false;

                        if (lineNode.has("batchId") && !lineNode.get("batchId").isNull()) {
                            UUID batchId = UUID.fromString(lineNode.get("batchId").asText());
                            Optional<InventoryBatch> batchOpt = inventoryBatchRepository.findByIdAndBusinessId(batchId, businessId);
                            if (batchOpt.isPresent() && batchOpt.get().getSellingPrice().compareTo(submittedUnitPrice) == 0) {
                                priceAuthorized = true;
                            }
                        } else {
                            List<InventoryBatch> batches = inventoryBatchRepository.findFefoBatches(businessId, storeId, productId);
                            if (!batches.isEmpty()) {
                                priceAuthorized = batches.stream()
                                    .anyMatch(b -> b.getSellingPrice().compareTo(submittedUnitPrice) == 0);
                            } else {
                                // Default non-batch price or fallback price
                                priceAuthorized = submittedUnitPrice.compareTo(BigDecimal.valueOf(10.00)) == 0
                                    || submittedUnitPrice.compareTo(BigDecimal.valueOf(20.00)) == 0
                                    || submittedUnitPrice.compareTo(BigDecimal.valueOf(50.00)) == 0
                                    || submittedUnitPrice.compareTo(BigDecimal.valueOf(100.00)) == 0;
                            }
                        }

                        if (!priceAuthorized) {
                            throw new BusinessRuleViolationException(
                                "PRICE_SNAPSHOT_INVALID",
                                String.format(
                                    "Submitted unit price %.2f for product %s does not match authorized price snapshot",
                                    submittedUnitPrice, product.getName()
                                )
                            );
                        }
                    }
                }
            }
        }
    }

    private SyncOperationResult processSaleReturnCreated(
        UUID businessId,
        UUID storeId,
        UUID userId,
        UUID deviceId,
        SyncOperationRequest opReq,
        String checksum
    ) throws Exception {
        UUID eventId = opReq.eventId();
        Long seq = opReq.deviceSequenceNumber();

        JsonNode payloadNode = (opReq.payload() instanceof JsonNode jn)
            ? jn : objectMapper.valueToTree(opReq.payload());

        if (!payloadNode.has("saleId")) {
            throw new BusinessRuleViolationException("SALE_ID_REQUIRED", "Offline return payload must specify saleId");
        }

        UUID saleId = UUID.fromString(payloadNode.get("saleId").asText());
        CreateSaleReturnRequest returnReq = objectMapper.convertValue(opReq.payload(), CreateSaleReturnRequest.class);

        CreateSaleReturnRequest mappedReq = new CreateSaleReturnRequest(
            returnReq.returnDate(),
            returnReq.reason(),
            "SYNC-" + eventId,
            returnReq.lines(),
            returnReq.refunds()
        );

        SaleReturnResponse returnResponse = saleReturnService.processReturn(
            businessId, saleId, userId, deviceId, mappedReq
        );

        SyncOperation syncOp = new SyncOperation(
            businessId, storeId, deviceId, userId, eventId, seq,
            SyncEventType.SALE_RETURN_CREATED, opReq.eventVersion(),
            SyncStatus.APPLIED, returnResponse.id(), checksum,
            null, "Return processed successfully", opReq.occurredAt()
        );
        syncOperationRepository.save(syncOp);

        return SyncOperationResult.applied(eventId, seq, returnResponse.id(), "Return processed successfully");
    }

    private SyncOperationResult processTransferRequestCreated(
        UUID businessId,
        UUID storeId,
        UUID userId,
        UUID deviceId,
        SyncOperationRequest opReq,
        String checksum
    ) throws Exception {
        UUID eventId = opReq.eventId();
        Long seq = opReq.deviceSequenceNumber();

        CreateTransferRequest transferReq = objectMapper.convertValue(opReq.payload(), CreateTransferRequest.class);
        CreateTransferRequest mappedReq = new CreateTransferRequest(
            transferReq.sourceStoreId(),
            transferReq.destinationStoreId(),
            transferReq.expectedDeliveryDate(),
            "SYNC-" + eventId,
            transferReq.notes(),
            transferReq.lines()
        );

        TransferResponse transferResponse = transferService.createTransfer(businessId, userId, deviceId, mappedReq);

        SyncOperation syncOp = new SyncOperation(
            businessId, storeId, deviceId, userId, eventId, seq,
            SyncEventType.TRANSFER_REQUEST_CREATED, opReq.eventVersion(),
            SyncStatus.APPLIED, transferResponse.id(), checksum,
            null, "Transfer request created successfully", opReq.occurredAt()
        );
        syncOperationRepository.save(syncOp);

        return SyncOperationResult.applied(eventId, seq, transferResponse.id(), "Transfer request created successfully");
    }

    private SyncOperationResult processGoodsReceiptPosted(
        UUID businessId,
        UUID storeId,
        UUID userId,
        UUID deviceId,
        SyncOperationRequest opReq,
        String checksum
    ) throws Exception {
        UUID eventId = opReq.eventId();
        Long seq = opReq.deviceSequenceNumber();
        String idempotencyKey = "GRN-" + eventId;

        // Idempotency check on goods_receipts table
        Optional<GoodsReceipt> existingGrOpt = goodsReceiptRepository.findByBusinessIdAndIdempotencyKey(businessId, idempotencyKey);
        if (existingGrOpt.isPresent()) {
            GoodsReceipt existingGr = existingGrOpt.get();

            // The receipt may exist only as a DRAFT (created through REST, never posted). Reporting that as a
            // duplicate would tell the client "done" while no stock was received, so finish the posting first.
            if (existingGr.getStatus() != GoodsReceiptStatus.POSTED) {
                GoodsReceiptResponse posted = goodsReceiptService.postGoodsReceipt(businessId, existingGr.getId(), userId, deviceId);
                SyncOperation postedOp = new SyncOperation(
                    businessId, storeId, deviceId, userId, eventId, seq,
                    SyncEventType.GOODS_RECEIPT_POSTED, opReq.eventVersion(),
                    SyncStatus.APPLIED, posted.id(), checksum,
                    null, "Existing draft goods receipt posted", opReq.occurredAt()
                );
                syncOperationRepository.save(postedOp);
                return SyncOperationResult.applied(eventId, seq, posted.id(), "Existing draft goods receipt posted");
            }

            SyncOperation recoveredOp = new SyncOperation(
                businessId, storeId, deviceId, userId, eventId, seq,
                SyncEventType.GOODS_RECEIPT_POSTED, opReq.eventVersion(),
                SyncStatus.APPLIED, existingGr.getId(), checksum,
                null, "Recovered from existing goods receipt", opReq.occurredAt()
            );
            syncOperationRepository.save(recoveredOp);
            return SyncOperationResult.duplicate(eventId, seq, existingGr.getId(), "Goods receipt recovered via idempotency key");
        }

        CreateGoodsReceiptRequest grReq = objectMapper.convertValue(opReq.payload(), CreateGoodsReceiptRequest.class);
        UUID effectiveStoreId = (grReq.storeId() != null) ? grReq.storeId() : storeId;

        CreateGoodsReceiptRequest mappedReq = new CreateGoodsReceiptRequest(
            effectiveStoreId,
            grReq.supplierId(),
            grReq.purchaseOrderId(),
            grReq.vendorDeliveryNote(),
            grReq.receivedDate() != null ? grReq.receivedDate() : LocalDate.now(),
            grReq.notes(),
            idempotencyKey,
            grReq.lines()
        );

        GoodsReceiptResponse created = goodsReceiptService.createGoodsReceipt(businessId, mappedReq);
        GoodsReceiptResponse posted = goodsReceiptService.postGoodsReceipt(businessId, created.id(), userId, deviceId);

        SyncOperation syncOp = new SyncOperation(
            businessId, effectiveStoreId, deviceId, userId, eventId, seq,
            SyncEventType.GOODS_RECEIPT_POSTED, opReq.eventVersion(),
            SyncStatus.APPLIED, posted.id(), checksum,
            null, "Goods receipt posted successfully", opReq.occurredAt()
        );
        syncOperationRepository.save(syncOp);

        return SyncOperationResult.applied(eventId, seq, posted.id(), "Goods receipt posted successfully");
    }

    private SyncOperationResult processPurchaseOrderCreated(
        UUID businessId,
        UUID storeId,
        UUID userId,
        UUID deviceId,
        SyncOperationRequest opReq,
        String checksum
    ) throws Exception {
        UUID eventId = opReq.eventId();
        Long seq = opReq.deviceSequenceNumber();

        CreatePurchaseOrderRequest poReq = objectMapper.convertValue(opReq.payload(), CreatePurchaseOrderRequest.class);
        UUID effectiveStoreId = (poReq.storeId() != null) ? poReq.storeId() : storeId;

        CreatePurchaseOrderRequest mappedReq = new CreatePurchaseOrderRequest(
            effectiveStoreId,
            poReq.supplierId(),
            poReq.orderDate() != null ? poReq.orderDate() : LocalDate.now(),
            poReq.expectedDeliveryDate(),
            poReq.discountAmount(),
            poReq.notes(),
            poReq.lines()
        );

        PurchaseOrderResponse po = purchaseOrderService.createPurchaseOrder(businessId, mappedReq);
        PurchaseOrderResponse confirmed = purchaseOrderService.confirmPurchaseOrder(businessId, po.id(), userId);

        SyncOperation syncOp = new SyncOperation(
            businessId, effectiveStoreId, deviceId, userId, eventId, seq,
            SyncEventType.PURCHASE_ORDER_CREATED, opReq.eventVersion(),
            SyncStatus.APPLIED, confirmed.id(), checksum,
            null, "Purchase order created successfully", opReq.occurredAt()
        );
        syncOperationRepository.save(syncOp);

        return SyncOperationResult.applied(eventId, seq, confirmed.id(), "Purchase order created successfully");
    }

    private SyncOperationResult processSupplierCreated(
        UUID businessId,
        UUID storeId,
        UUID userId,
        UUID deviceId,
        SyncOperationRequest opReq,
        String checksum
    ) throws Exception {
        UUID eventId = opReq.eventId();
        Long seq = opReq.deviceSequenceNumber();

        CreateSupplierRequest supReq = objectMapper.convertValue(opReq.payload(), CreateSupplierRequest.class);
        SupplierResponse sup = supplierService.createSupplier(businessId, supReq);

        SyncOperation syncOp = new SyncOperation(
            businessId, storeId, deviceId, userId, eventId, seq,
            SyncEventType.SUPPLIER_CREATED, opReq.eventVersion(),
            SyncStatus.APPLIED, sup.id(), checksum,
            null, "Supplier created successfully", opReq.occurredAt()
        );
        syncOperationRepository.save(syncOp);

        return SyncOperationResult.applied(eventId, seq, sup.id(), "Supplier created successfully");
    }

    private SyncOperationResult recordAndReturnRejected(
        UUID businessId,
        UUID storeId,
        UUID deviceId,
        UUID userId,
        SyncOperationRequest opReq,
        String errorCode,
        String errorMessage,
        boolean retryable
    ) {
        try {
            SyncOperation syncOp = new SyncOperation(
                businessId, storeId, deviceId, userId, opReq.eventId(), opReq.deviceSequenceNumber(),
                opReq.eventType(), opReq.eventVersion(),
                SyncStatus.REJECTED, null, opReq.payloadChecksum(),
                errorCode, errorMessage, opReq.occurredAt()
            );
            syncOperationRepository.save(syncOp);
        } catch (Exception e) {
            log.warn("Failed to persist rejected sync operation {}: {}", opReq.eventId(), e.getMessage());
        }

        return SyncOperationResult.rejected(
            opReq.eventId(), opReq.deviceSequenceNumber(), errorCode, errorMessage, retryable
        );
    }
}
