package com.inventra.inventra_backend.sales.application;

import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.identity.application.SecurityAuditService;
import com.inventra.inventra_backend.identity.domain.model.SecurityAuditEventType;
import com.inventra.inventra_backend.inventory.domain.model.InventoryBatch;
import com.inventra.inventra_backend.inventory.domain.model.InventoryItem;
import com.inventra.inventra_backend.inventory.domain.model.StockMovement;
import com.inventra.inventra_backend.inventory.domain.model.StockMovementType;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryBatchRepository;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryItemRepository;
import com.inventra.inventra_backend.inventory.domain.repository.StockMovementRepository;
import com.inventra.inventra_backend.sales.api.dto.CreateSaleLineRequest;
import com.inventra.inventra_backend.sales.api.dto.CreateSalePaymentRequest;
import com.inventra.inventra_backend.sales.api.dto.CreateSaleRequest;
import com.inventra.inventra_backend.sales.api.dto.InvoiceResponse;
import com.inventra.inventra_backend.sales.api.dto.ReceiptResponse;
import com.inventra.inventra_backend.sales.api.dto.SaleLineBatchAllocationResponse;
import com.inventra.inventra_backend.sales.api.dto.SaleLineResponse;
import com.inventra.inventra_backend.sales.api.dto.SalePaymentResponse;
import com.inventra.inventra_backend.sales.api.dto.SaleResponse;
import com.inventra.inventra_backend.sales.api.dto.VoidSaleRequest;
import com.inventra.inventra_backend.sales.domain.model.PaymentStatus;
import com.inventra.inventra_backend.sales.domain.model.Sale;
import com.inventra.inventra_backend.sales.domain.model.SaleLine;
import com.inventra.inventra_backend.sales.domain.model.SaleLineBatchAllocation;
import com.inventra.inventra_backend.sales.domain.model.SalePayment;
import com.inventra.inventra_backend.sales.domain.model.SaleStatus;
import com.inventra.inventra_backend.sales.domain.repository.SaleLineBatchAllocationRepository;
import com.inventra.inventra_backend.sales.domain.repository.SaleLineRepository;
import com.inventra.inventra_backend.sales.domain.repository.SalePaymentRepository;
import com.inventra.inventra_backend.sales.domain.repository.SaleRepository;
import com.inventra.inventra_backend.sales.domain.repository.SaleReturnRepository;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SaleService {

    private final SaleRepository saleRepository;
    private final SaleLineRepository saleLineRepository;
    private final SaleLineBatchAllocationRepository saleLineBatchAllocationRepository;
    private final SalePaymentRepository salePaymentRepository;
    private final SaleReturnRepository saleReturnRepository;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final StockMovementRepository stockMovementRepository;
    private final SecurityAuditService securityAuditService;
    private final com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository businessRepository;

    public SaleService(
        SaleRepository saleRepository,
        SaleLineRepository saleLineRepository,
        SaleLineBatchAllocationRepository saleLineBatchAllocationRepository,
        SalePaymentRepository salePaymentRepository,
        SaleReturnRepository saleReturnRepository,
        StoreRepository storeRepository,
        ProductRepository productRepository,
        InventoryItemRepository inventoryItemRepository,
        InventoryBatchRepository inventoryBatchRepository,
        StockMovementRepository stockMovementRepository,
        SecurityAuditService securityAuditService,
        com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository businessRepository
    ) {
        this.saleRepository = saleRepository;
        this.saleLineRepository = saleLineRepository;
        this.saleLineBatchAllocationRepository = saleLineBatchAllocationRepository;
        this.salePaymentRepository = salePaymentRepository;
        this.saleReturnRepository = saleReturnRepository;
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.inventoryBatchRepository = inventoryBatchRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.securityAuditService = securityAuditService;
        this.businessRepository = businessRepository;
    }

    @Transactional
    public SaleResponse checkoutSale(
        UUID businessId,
        UUID cashierId,
        UUID deviceId,
        CreateSaleRequest request
    ) {
        // Step 1: Idempotency check
        if (request.idempotencyKey() != null && !request.idempotencyKey().isBlank()) {
            var existingOpt = saleRepository.findByBusinessIdAndIdempotencyKey(businessId, request.idempotencyKey().trim());
            if (existingOpt.isPresent()) {
                return buildSaleResponse(businessId, existingOpt.get());
            }
        }

        // Step 2: Validate Store
        Store store = storeRepository.findByIdAndBusinessId(request.storeId(), businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Store", request.storeId()));

        if (request.lines() == null || request.lines().isEmpty()) {
            throw new BusinessRuleViolationException("EMPTY_SALE_LINES", "Sale must contain at least one line item");
        }
        if (request.payments() == null || request.payments().isEmpty()) {
            throw new BusinessRuleViolationException("EMPTY_SALE_PAYMENTS", "Sale must contain at least one payment");
        }

        // Step 3: Generate sequential numbers
        long count = saleRepository.countByBusinessIdAndStoreId(businessId, store.getId()) + 1;
        String saleNumber = String.format("SALE-%s-%06d", store.getStoreCode(), count);
        String invoiceNumber = String.format("INV-%s-%06d", store.getStoreCode(), count);

        // Step 4: Create Sale entity
        Sale sale = new Sale(
            businessId,
            store.getId(),
            saleNumber,
            invoiceNumber,
            request.saleDate() != null ? request.saleDate() : LocalDate.now(),
            request.customerName(),
            request.customerPhone(),
            false,
            request.discountAmount(),
            request.roundOffAmount(),
            cashierId,
            deviceId,
            request.idempotencyKey(),
            request.notes()
        );
        if (request.customerId() != null) {
            sale.setCustomerId(request.customerId());
        }

        List<SaleLine> saleLines = new ArrayList<>();
        List<SaleLineBatchAllocation> allAllocations = new ArrayList<>();
        boolean prescriptionRequiredOverall = false;
        int lineNum = 1;

        // Sort line requests deterministically by productId to prevent lock ordering deadlocks
        List<CreateSaleLineRequest> sortedLineReqs = request.lines().stream()
            .sorted(Comparator.comparing(CreateSaleLineRequest::productId))
            .toList();

        // Step 5: Process lines & allocate inventory with pessimistic write locks
        for (CreateSaleLineRequest lineReq : sortedLineReqs) {
            Product product = productRepository.findByIdAndBusinessId(lineReq.productId(), businessId)
                .orElseThrow(() -> ResourceNotFoundException.forResource("Product", lineReq.productId()));

            if (product.isPrescriptionRequired()) {
                prescriptionRequiredOverall = true;
            }

            // Pessimistic write lock on InventoryItem
            InventoryItem item = inventoryItemRepository.findByStoreIdAndProductIdAndBusinessIdForUpdate(
                store.getId(),
                product.getId(),
                businessId
            ).orElseThrow(() -> new BusinessRuleViolationException(
                "INVENTORY_ITEM_NOT_FOUND",
                "Product " + product.getName() + " has no inventory record in store " + store.getStoreName()
            ));

            boolean isBaseUnitSale = false;
            int unitsPerSellingUnit = product.getUnitsPerSellingUnit() >= 1 ? product.getUnitsPerSellingUnit() : 1;

            if (lineReq.sellingUnit() != null && !lineReq.sellingUnit().isBlank()) {
                String reqUnit = lineReq.sellingUnit().trim().toLowerCase();
                String baseUnit = product.getBaseUnit() != null ? product.getBaseUnit().trim().toLowerCase() : "";
                String sellingUnit = product.getSellingUnit() != null ? product.getSellingUnit().trim().toLowerCase() : "";

                if (reqUnit.equalsIgnoreCase(baseUnit)
                    || reqUnit.startsWith(baseUnit)
                    || "loose".equals(reqUnit)
                    || "unit".equals(reqUnit)
                    || "base_unit".equals(reqUnit)) {
                    isBaseUnitSale = true;
                } else if (unitsPerSellingUnit > 1 && !reqUnit.equalsIgnoreCase(sellingUnit)) {
                    isBaseUnitSale = true;
                }
            }

            int conversionFactor = isBaseUnitSale ? 1 : unitsPerSellingUnit;
            BigDecimal baseQuantity = lineReq.quantity().multiply(BigDecimal.valueOf(conversionFactor))
                .setScale(3, RoundingMode.HALF_UP);

            if (item.getCurrentStock().compareTo(baseQuantity) < 0) {
                throw new BusinessRuleViolationException(
                    "INSUFFICIENT_STOCK",
                    "Insufficient stock for " + product.getName() + ". Available: " + item.getCurrentStock() + ", Requested: " + baseQuantity
                );
            }

            BigDecimal lineUnitPrice;

            // Handle Batch vs Non-Batch Allocation
            if (item.isBatchTracked()) {
                List<SaleLineBatchAllocation> lineAllocations = new ArrayList<>();
                BigDecimal remainingBaseQty = baseQuantity;

                if (lineReq.batchId() != null) {
                    // Explicit manual batch selection with pessimistic write lock
                    InventoryBatch batch = inventoryBatchRepository.findByIdAndBusinessIdForUpdate(lineReq.batchId(), businessId)
                        .orElseThrow(() -> ResourceNotFoundException.forResource("InventoryBatch", lineReq.batchId()));

                    if (!batch.getStoreId().equals(store.getId()) || !batch.getProductId().equals(product.getId())) {
                        throw new BusinessRuleViolationException("BATCH_MISMATCH", "Selected batch does not match store or product");
                    }
                    if (batch.getExpiryDate().isBefore(LocalDate.now())) {
                        throw new BusinessRuleViolationException("BATCH_EXPIRED", "Selected batch " + batch.getBatchNumber() + " is already expired");
                    }
                    if (batch.getQuantity().compareTo(baseQuantity) < 0) {
                        throw new BusinessRuleViolationException(
                            "INSUFFICIENT_BATCH_STOCK",
                            "Batch " + batch.getBatchNumber() + " only has " + batch.getQuantity() + " units available"
                        );
                    }

                    BigDecimal fullSellingPrice = batch.getSellingPrice();
                    lineUnitPrice = (isBaseUnitSale && unitsPerSellingUnit > 1)
                        ? fullSellingPrice.divide(BigDecimal.valueOf(unitsPerSellingUnit), 2, RoundingMode.HALF_UP)
                        : fullSellingPrice;

                    BigDecimal allocSellingPrice = (isBaseUnitSale && unitsPerSellingUnit > 1)
                        ? batch.getSellingPrice().divide(BigDecimal.valueOf(unitsPerSellingUnit), 2, RoundingMode.HALF_UP)
                        : batch.getSellingPrice();
                    BigDecimal allocMrp = (isBaseUnitSale && unitsPerSellingUnit > 1)
                        ? batch.getMrp().divide(BigDecimal.valueOf(unitsPerSellingUnit), 2, RoundingMode.HALF_UP)
                        : batch.getMrp();
                    BigDecimal allocUnitCost = (isBaseUnitSale && unitsPerSellingUnit > 1)
                        ? batch.getPurchasePrice().divide(BigDecimal.valueOf(unitsPerSellingUnit), 2, RoundingMode.HALF_UP)
                        : batch.getPurchasePrice();

                    batch.adjustQuantity(baseQuantity.negate());
                    inventoryBatchRepository.save(batch);

                    SaleLineBatchAllocation alloc = new SaleLineBatchAllocation(
                        businessId,
                        store.getId(),
                        sale.getId(),
                        UUID.randomUUID(), // Will link to line below
                        batch.getId(),
                        product.getId(),
                        batch.getBatchNumber(),
                        batch.getExpiryDate(),
                        baseQuantity,
                        allocUnitCost,
                        allocMrp,
                        allocSellingPrice
                    );
                    lineAllocations.add(alloc);
                    allAllocations.add(alloc);

                } else {
                    // Automated FEFO Allocation with pessimistic write lock
                    List<InventoryBatch> fefoBatches = inventoryBatchRepository.findFefoBatchesForUpdate(businessId, store.getId(), product.getId());
                    List<InventoryBatch> validBatches = fefoBatches.stream()
                        .filter(b -> !b.getExpiryDate().isBefore(LocalDate.now()))
                        .toList();

                    BigDecimal totalBatchAvailable = validBatches.stream()
                        .map(InventoryBatch::getQuantity)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                    if (totalBatchAvailable.compareTo(baseQuantity) < 0) {
                        throw new BusinessRuleViolationException(
                            "INSUFFICIENT_BATCH_STOCK",
                            "Product " + product.getName() + " has insufficient non-expired batch stock"
                        );
                    }

                    // Sourced price from primary/first FEFO batch
                    BigDecimal fullSellingPrice = validBatches.get(0).getSellingPrice();
                    lineUnitPrice = (isBaseUnitSale && unitsPerSellingUnit > 1)
                        ? fullSellingPrice.divide(BigDecimal.valueOf(unitsPerSellingUnit), 2, RoundingMode.HALF_UP)
                        : fullSellingPrice;

                    for (InventoryBatch batch : validBatches) {
                        if (remainingBaseQty.compareTo(BigDecimal.ZERO) <= 0) {
                            break;
                        }
                        BigDecimal allocQty = remainingBaseQty.min(batch.getQuantity());
                        batch.adjustQuantity(allocQty.negate());
                        inventoryBatchRepository.save(batch);

                        BigDecimal allocSellingPrice = (isBaseUnitSale && unitsPerSellingUnit > 1)
                            ? batch.getSellingPrice().divide(BigDecimal.valueOf(unitsPerSellingUnit), 2, RoundingMode.HALF_UP)
                            : batch.getSellingPrice();
                        BigDecimal allocMrp = (isBaseUnitSale && unitsPerSellingUnit > 1)
                            ? batch.getMrp().divide(BigDecimal.valueOf(unitsPerSellingUnit), 2, RoundingMode.HALF_UP)
                            : batch.getMrp();
                        BigDecimal allocUnitCost = (isBaseUnitSale && unitsPerSellingUnit > 1)
                            ? batch.getPurchasePrice().divide(BigDecimal.valueOf(unitsPerSellingUnit), 2, RoundingMode.HALF_UP)
                            : batch.getPurchasePrice();

                        SaleLineBatchAllocation alloc = new SaleLineBatchAllocation(
                            businessId,
                            store.getId(),
                            sale.getId(),
                            UUID.randomUUID(), // Linked to line below
                            batch.getId(),
                            product.getId(),
                            batch.getBatchNumber(),
                            batch.getExpiryDate(),
                            allocQty,
                            allocUnitCost,
                            allocMrp,
                            allocSellingPrice
                        );
                        lineAllocations.add(alloc);
                        allAllocations.add(alloc);

                        remainingBaseQty = remainingBaseQty.subtract(allocQty);
                    }
                }

                // Deduct item current stock
                item.adjustStock(baseQuantity.negate());
                inventoryItemRepository.save(item);

                // Create SaleLine
                String actualSellingUnit = lineReq.sellingUnit() != null && !lineReq.sellingUnit().isBlank()
                    ? lineReq.sellingUnit().trim()
                    : (isBaseUnitSale ? product.getBaseUnit() : product.getSellingUnit());

                SaleLine line = new SaleLine(
                    businessId,
                    sale.getId(),
                    product.getId(),
                    lineNum++,
                    product.getName(),
                    product.getGenericName(),
                    product.getDosageForm() != null ? product.getDosageForm().name() : null,
                    product.getStrength(),
                    actualSellingUnit,
                    conversionFactor,
                    lineReq.quantity(),
                    lineUnitPrice,
                    lineReq.discountPercentage(),
                    product.getTaxRate()
                );
                saleLines.add(line);
                sale.addLine(line);

                // Link allocations to this line and create StockMovements per batch
                for (SaleLineBatchAllocation alloc : lineAllocations) {
                    // Update alloc line ID
                    SaleLineBatchAllocation updatedAlloc = new SaleLineBatchAllocation(
                        alloc.getBusinessId(),
                        alloc.getStoreId(),
                        alloc.getSaleId(),
                        line.getId(),
                        alloc.getBatchId(),
                        alloc.getProductId(),
                        alloc.getBatchNumber(),
                        alloc.getExpiryDate(),
                        alloc.getAllocatedBaseQuantity(),
                        alloc.getUnitCost(),
                        alloc.getMrp(),
                        alloc.getSellingPrice()
                    );
                    allAllocations.remove(alloc);
                    allAllocations.add(updatedAlloc);

                    StockMovement movement = new StockMovement(
                        businessId,
                        store.getId(),
                        product.getId(),
                        alloc.getBatchId(),
                        StockMovementType.SALE,
                        alloc.getAllocatedBaseQuantity().negate(),
                        alloc.getUnitCost(),
                        item.getCurrentStock(),
                        "SALE",
                        sale.getId(),
                        "POS Sale " + saleNumber,
                        cashierId,
                        deviceId,
                        Instant.now()
                    );
                    stockMovementRepository.save(movement);
                }

            } else {
                // Non-batch product
                BigDecimal baseNonBatchPrice = BigDecimal.valueOf(10.00); // Default non-batch price if none configured
                lineUnitPrice = (isBaseUnitSale && unitsPerSellingUnit > 1)
                    ? baseNonBatchPrice.divide(BigDecimal.valueOf(unitsPerSellingUnit), 2, RoundingMode.HALF_UP)
                    : baseNonBatchPrice;

                item.adjustStock(baseQuantity.negate());
                inventoryItemRepository.save(item);

                String actualSellingUnit = lineReq.sellingUnit() != null && !lineReq.sellingUnit().isBlank()
                    ? lineReq.sellingUnit().trim()
                    : (isBaseUnitSale ? product.getBaseUnit() : product.getSellingUnit());

                SaleLine line = new SaleLine(
                    businessId,
                    sale.getId(),
                    product.getId(),
                    lineNum++,
                    product.getName(),
                    product.getGenericName(),
                    product.getDosageForm() != null ? product.getDosageForm().name() : null,
                    product.getStrength(),
                    actualSellingUnit,
                    conversionFactor,
                    lineReq.quantity(),
                    lineUnitPrice,
                    lineReq.discountPercentage(),
                    product.getTaxRate()
                );
                saleLines.add(line);
                sale.addLine(line);

                StockMovement movement = new StockMovement(
                    businessId,
                    store.getId(),
                    product.getId(),
                    null,
                    StockMovementType.SALE,
                    baseQuantity.negate(),
                    null,
                    item.getCurrentStock(),
                    "SALE",
                    sale.getId(),
                    "POS Sale " + saleNumber,
                    cashierId,
                    deviceId,
                    Instant.now()
                );
                stockMovementRepository.save(movement);
            }
        }

        // Step 6: Recalculate Sale totals and bill-discount allocations
        sale.recalculateTotals();

        // Step 7: Process payments & validate reconciliation
        BigDecimal sumSuccessPayments = BigDecimal.ZERO;
        for (CreateSalePaymentRequest pReq : request.payments()) {
            BigDecimal change = BigDecimal.ZERO;
            if (pReq.tenderedAmount() != null && pReq.tenderedAmount().compareTo(pReq.amount()) > 0) {
                change = pReq.tenderedAmount().subtract(pReq.amount()).setScale(4, RoundingMode.HALF_UP);
            }

            SalePayment payment = new SalePayment(
                businessId,
                store.getId(),
                sale.getId(),
                pReq.paymentMethod(),
                pReq.amount(),
                pReq.tenderedAmount(),
                change,
                pReq.transactionReference(),
                PaymentStatus.SUCCESS,
                pReq.notes()
            );
            sale.addPayment(payment);
            sumSuccessPayments = sumSuccessPayments.add(payment.getAmount());
        }

        // Invariant: SUM(SUCCESS payments) == totalAmount
        if (sumSuccessPayments.compareTo(sale.getTotalAmount()) != 0) {
            BigDecimal diff = sumSuccessPayments.subtract(sale.getTotalAmount()).abs();
            if (diff.compareTo(new BigDecimal("0.05")) <= 0 && !sale.getLines().isEmpty()) {
                BigDecimal adjustment = sumSuccessPayments.subtract(sale.getTotalAmount());
                sale.setRoundOffAmount(sale.getRoundOffAmount().add(adjustment));
                sale.recalculateTotals();
            } else {
                throw new BusinessRuleViolationException(
                    "PAYMENT_AMOUNT_MISMATCH",
                    "Total payments (" + sumSuccessPayments + ") do not match sale total amount (" + sale.getTotalAmount() + ")"
                );
            }
        }

        sale.recalculateTotals();

        // Step 8: Save Sale, lines, allocations, and payments
        Sale savedSale = saleRepository.save(sale);
        for (SaleLine line : saleLines) {
            saleLineRepository.save(line);
        }
        for (SaleLineBatchAllocation alloc : allAllocations) {
            saleLineBatchAllocationRepository.save(alloc);
        }
        for (SalePayment p : sale.getPayments()) {
            salePaymentRepository.save(p);
        }

        securityAuditService.recordEvent(
            cashierId,
            businessId,
            deviceId,
            SecurityAuditEventType.SALE_COMPLETED,
            null,
            null,
            "Sale completed: " + saleNumber + ", total: " + sale.getTotalAmount()
        );

        return buildSaleResponse(businessId, savedSale);
    }

    @Transactional
    public SaleResponse voidSale(
        UUID businessId,
        UUID saleId,
        UUID userId,
        VoidSaleRequest request
    ) {
        Sale sale = saleRepository.findByIdAndBusinessId(saleId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Sale", saleId));

        var returns = saleReturnRepository.findBySaleIdAndBusinessId(saleId, businessId);
        if (!returns.isEmpty() || sale.getStatus() == SaleStatus.PARTIALLY_RETURNED || sale.getStatus() == SaleStatus.FULLY_RETURNED) {
            throw new BusinessRuleViolationException("CANNOT_VOID_SALE_WITH_RETURNS", "Cannot void a sale that has processed returns");
        }

        if (sale.getStatus() != SaleStatus.COMPLETED) {
            throw new BusinessRuleViolationException("CANNOT_VOID_SALE", "Cannot void sale in status " + sale.getStatus());
        }

        List<SaleLineBatchAllocation> allocations = saleLineBatchAllocationRepository.findBySaleIdAndBusinessId(saleId, businessId);
        List<SaleLine> lines = saleLineRepository.findBySaleIdAndBusinessIdOrderByLineNumberAsc(saleId, businessId);

        if (!allocations.isEmpty()) {
            for (SaleLineBatchAllocation alloc : allocations) {
                InventoryBatch batch = inventoryBatchRepository.findByIdAndBusinessId(alloc.getBatchId(), businessId)
                    .orElseThrow(() -> ResourceNotFoundException.forResource("InventoryBatch", alloc.getBatchId()));
                batch.adjustQuantity(alloc.getAllocatedBaseQuantity());
                inventoryBatchRepository.save(batch);

                InventoryItem item = inventoryItemRepository.findByStoreIdAndProductIdAndBusinessId(
                    sale.getStoreId(),
                    alloc.getProductId(),
                    businessId
                ).orElseThrow();
                item.adjustStock(alloc.getAllocatedBaseQuantity());
                inventoryItemRepository.save(item);

                StockMovement movement = new StockMovement(
                    businessId,
                    sale.getStoreId(),
                    alloc.getProductId(),
                    alloc.getBatchId(),
                    StockMovementType.SALE_VOID,
                    alloc.getAllocatedBaseQuantity(),
                    alloc.getUnitCost(),
                    item.getCurrentStock(),
                    "SALE_VOID",
                    sale.getId(),
                    "Void Sale: " + request.reason(),
                    userId,
                    null,
                    Instant.now()
                );
                stockMovementRepository.save(movement);
            }
        } else {
            for (SaleLine line : lines) {
                InventoryItem item = inventoryItemRepository.findByStoreIdAndProductIdAndBusinessId(
                    sale.getStoreId(),
                    line.getProductId(),
                    businessId
                ).orElseThrow();
                item.adjustStock(line.getBaseQuantity());
                inventoryItemRepository.save(item);

                StockMovement movement = new StockMovement(
                    businessId,
                    sale.getStoreId(),
                    line.getProductId(),
                    null,
                    StockMovementType.SALE_VOID,
                    line.getBaseQuantity(),
                    null,
                    item.getCurrentStock(),
                    "SALE_VOID",
                    sale.getId(),
                    "Void Sale: " + request.reason(),
                    userId,
                    null,
                    Instant.now()
                );
                stockMovementRepository.save(movement);
            }
        }

        sale.voidSale(userId, request.reason());
        Sale saved = saleRepository.save(sale);

        securityAuditService.recordEvent(
            userId,
            businessId,
            null,
            SecurityAuditEventType.SALE_VOIDED,
            null,
            null,
            "Sale voided: " + sale.getSaleNumber() + ", reason: " + request.reason()
        );

        return buildSaleResponse(businessId, saved);
    }

    @Transactional(readOnly = true)
    public SaleResponse getSale(UUID businessId, UUID saleId) {
        Sale sale = saleRepository.findByIdAndBusinessId(saleId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Sale", saleId));
        return buildSaleResponse(businessId, sale);
    }

    @Transactional(readOnly = true)
    public InvoiceResponse getInvoice(UUID businessId, UUID saleId) {
        Sale sale = saleRepository.findByIdAndBusinessId(saleId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Sale", saleId));
        SaleResponse saleRes = buildSaleResponse(businessId, sale);
        return InvoiceResponse.from(sale, saleRes.lines(), saleRes.payments());
    }

    @Transactional(readOnly = true)
    public ReceiptResponse getReceipt(UUID businessId, UUID saleId) {
        Sale sale = saleRepository.findByIdAndBusinessId(saleId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Sale", saleId));
        SaleResponse saleRes = buildSaleResponse(businessId, sale);
        var store = storeRepository.findByIdAndBusinessId(sale.getStoreId(), businessId).orElse(null);
        var business = businessRepository.findById(businessId).orElse(null);
        return ReceiptResponse.from(sale, saleRes.lines(), saleRes.payments(), store, business);
    }

    @Transactional(readOnly = true)
    public Page<SaleResponse> searchSales(
        UUID businessId,
        UUID storeId,
        SaleStatus status,
        LocalDate startDate,
        LocalDate endDate,
        Pageable pageable
    ) {
        return saleRepository.searchSales(businessId, storeId, status, startDate, endDate, pageable)
            .map(s -> buildSaleResponse(businessId, s));
    }

    private SaleResponse buildSaleResponse(UUID businessId, Sale sale) {
        List<SaleLine> lines = saleLineRepository.findBySaleIdAndBusinessIdOrderByLineNumberAsc(sale.getId(), businessId);
        List<SaleLineBatchAllocation> allAllocations = saleLineBatchAllocationRepository.findBySaleIdAndBusinessId(sale.getId(), businessId);
        List<SalePayment> payments = salePaymentRepository.findBySaleIdAndBusinessId(sale.getId(), businessId);

        Map<UUID, List<SaleLineBatchAllocation>> allocMap = allAllocations.stream()
            .collect(Collectors.groupingBy(SaleLineBatchAllocation::getSaleLineId));

        List<SaleLineResponse> lineResponses = lines.stream()
            .map(l -> {
                List<SaleLineBatchAllocationResponse> allocResponses = allocMap.getOrDefault(l.getId(), List.of())
                    .stream()
                    .map(SaleLineBatchAllocationResponse::from)
                    .toList();
                return SaleLineResponse.from(l, allocResponses);
            })
            .toList();

        List<SalePaymentResponse> paymentResponses = payments.stream()
            .map(SalePaymentResponse::from)
            .toList();

        return SaleResponse.from(sale, lineResponses, paymentResponses);
    }
}
