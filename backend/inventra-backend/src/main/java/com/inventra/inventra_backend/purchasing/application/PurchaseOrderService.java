package com.inventra.inventra_backend.purchasing.application;

import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.purchasing.api.dto.CreatePurchaseOrderLineRequest;
import com.inventra.inventra_backend.purchasing.api.dto.CreatePurchaseOrderRequest;
import com.inventra.inventra_backend.purchasing.api.dto.PurchaseOrderLineResponse;
import com.inventra.inventra_backend.purchasing.api.dto.PurchaseOrderResponse;
import com.inventra.inventra_backend.purchasing.api.dto.PurchaseOrderSummaryResponse;
import com.inventra.inventra_backend.purchasing.api.dto.UpdatePurchaseOrderRequest;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrder;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrderLine;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrderStatus;
import com.inventra.inventra_backend.purchasing.domain.model.Supplier;
import com.inventra.inventra_backend.purchasing.domain.repository.PurchaseOrderLineRepository;
import com.inventra.inventra_backend.purchasing.domain.repository.PurchaseOrderRepository;
import com.inventra.inventra_backend.purchasing.domain.repository.SupplierRepository;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderLineRepository purchaseOrderLineRepository;
    private final SupplierRepository supplierRepository;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;

    public PurchaseOrderService(
        PurchaseOrderRepository purchaseOrderRepository,
        PurchaseOrderLineRepository purchaseOrderLineRepository,
        SupplierRepository supplierRepository,
        StoreRepository storeRepository,
        ProductRepository productRepository
    ) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderLineRepository = purchaseOrderLineRepository;
        this.supplierRepository = supplierRepository;
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    public PurchaseOrderResponse createPurchaseOrder(UUID businessId, CreatePurchaseOrderRequest request) {
        Store store = storeRepository.findById(request.storeId())
            .filter(s -> s.getBusinessId().equals(businessId))
            .orElseThrow(() -> ResourceNotFoundException.forResource("Store", request.storeId()));

        Supplier supplier = supplierRepository.findByIdAndBusinessId(request.supplierId(), businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Supplier", request.supplierId()));

        if (!supplier.isActive()) {
            throw new BusinessRuleViolationException("SUPPLIER_INACTIVE", "Cannot create purchase order for inactive supplier");
        }

        String orderNumber = generateOrderNumber(businessId, store.getStoreCode());

        PurchaseOrder po = new PurchaseOrder(
            businessId,
            store.getId(),
            supplier.getId(),
            orderNumber,
            request.orderDate(),
            request.expectedDeliveryDate(),
            request.discountAmount(),
            request.notes()
        );

        int lineNum = 1;
        for (CreatePurchaseOrderLineRequest lineReq : request.lines()) {
            Product product = productRepository.findByIdAndBusinessId(lineReq.productId(), businessId)
                .orElseThrow(() -> ResourceNotFoundException.forResource("Product", lineReq.productId()));

            PurchaseOrderLine line = new PurchaseOrderLine(
                businessId,
                po.getId(),
                product.getId(),
                lineReq.supplierProductId(),
                lineNum++,
                lineReq.purchaseUnit(),
                lineReq.conversionFactor(),
                lineReq.orderedQuantity(),
                lineReq.unitCost(),
                lineReq.discountPercentage(),
                lineReq.taxRate() != null ? lineReq.taxRate() : product.getTaxRate()
            );
            po.addLine(line);
        }

        PurchaseOrder saved = purchaseOrderRepository.save(po);
        List<PurchaseOrderLineResponse> lineResponses = saved.getLines().stream()
            .map(PurchaseOrderLineResponse::from)
            .toList();

        return PurchaseOrderResponse.from(saved, lineResponses);
    }

    @Transactional
    public PurchaseOrderResponse updatePurchaseOrder(
        UUID businessId,
        UUID orderId,
        UpdatePurchaseOrderRequest request
    ) {
        PurchaseOrder po = purchaseOrderRepository.findByIdAndBusinessId(orderId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("PurchaseOrder", orderId));

        if (po.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new BusinessRuleViolationException(
                "INVALID_STATUS_FOR_UPDATE",
                "Cannot modify purchase order in status " + po.getStatus()
            );
        }

        po.updateHeader(request.expectedDeliveryDate(), request.discountAmount(), request.notes());

        if (request.lines() != null && !request.lines().isEmpty()) {
            po.clearLines();
            int lineNum = 1;
            for (CreatePurchaseOrderLineRequest lineReq : request.lines()) {
                Product product = productRepository.findByIdAndBusinessId(lineReq.productId(), businessId)
                    .orElseThrow(() -> ResourceNotFoundException.forResource("Product", lineReq.productId()));

                PurchaseOrderLine line = new PurchaseOrderLine(
                    businessId,
                    po.getId(),
                    product.getId(),
                    lineReq.supplierProductId(),
                    lineNum++,
                    lineReq.purchaseUnit(),
                    lineReq.conversionFactor(),
                    lineReq.orderedQuantity(),
                    lineReq.unitCost(),
                    lineReq.discountPercentage(),
                    lineReq.taxRate() != null ? lineReq.taxRate() : product.getTaxRate()
                );
                po.addLine(line);
            }
        }

        po.recalculateTotals();
        PurchaseOrder saved = purchaseOrderRepository.save(po);
        List<PurchaseOrderLineResponse> lineResponses = saved.getLines().stream()
            .map(PurchaseOrderLineResponse::from)
            .toList();

        return PurchaseOrderResponse.from(saved, lineResponses);
    }

    @Transactional
    public PurchaseOrderResponse confirmPurchaseOrder(UUID businessId, UUID orderId, UUID userId) {
        PurchaseOrder po = purchaseOrderRepository.findByIdAndBusinessId(orderId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("PurchaseOrder", orderId));

        try {
            po.confirm(userId);
        } catch (IllegalStateException e) {
            throw new BusinessRuleViolationException("INVALID_CONFIRMATION", e.getMessage());
        }

        PurchaseOrder saved = purchaseOrderRepository.save(po);
        List<PurchaseOrderLineResponse> lineResponses = saved.getLines().stream()
            .map(PurchaseOrderLineResponse::from)
            .toList();

        return PurchaseOrderResponse.from(saved, lineResponses);
    }

    @Transactional
    public PurchaseOrderResponse cancelPurchaseOrder(UUID businessId, UUID orderId, UUID userId, String reason) {
        PurchaseOrder po = purchaseOrderRepository.findByIdAndBusinessId(orderId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("PurchaseOrder", orderId));

        try {
            po.cancel(userId, reason);
        } catch (IllegalStateException e) {
            throw new BusinessRuleViolationException("INVALID_CANCELLATION", e.getMessage());
        }

        PurchaseOrder saved = purchaseOrderRepository.save(po);
        List<PurchaseOrderLineResponse> lineResponses = saved.getLines().stream()
            .map(PurchaseOrderLineResponse::from)
            .toList();

        return PurchaseOrderResponse.from(saved, lineResponses);
    }

    @Transactional
    public PurchaseOrderResponse closePurchaseOrder(UUID businessId, UUID orderId) {
        PurchaseOrder po = purchaseOrderRepository.findByIdAndBusinessId(orderId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("PurchaseOrder", orderId));

        try {
            po.close();
        } catch (IllegalStateException e) {
            throw new BusinessRuleViolationException("INVALID_CLOSE", e.getMessage());
        }

        PurchaseOrder saved = purchaseOrderRepository.save(po);
        List<PurchaseOrderLineResponse> lineResponses = saved.getLines().stream()
            .map(PurchaseOrderLineResponse::from)
            .toList();

        return PurchaseOrderResponse.from(saved, lineResponses);
    }

    @Transactional(readOnly = true)
    public PurchaseOrderResponse getPurchaseOrder(UUID businessId, UUID orderId) {
        PurchaseOrder po = purchaseOrderRepository.findByIdAndBusinessId(orderId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("PurchaseOrder", orderId));

        List<PurchaseOrderLineResponse> lineResponses = po.getLines().stream()
            .map(PurchaseOrderLineResponse::from)
            .toList();

        return PurchaseOrderResponse.from(po, lineResponses);
    }

    @Transactional(readOnly = true)
    public Page<PurchaseOrderSummaryResponse> listPurchaseOrders(
        UUID businessId,
        UUID storeId,
        UUID supplierId,
        PurchaseOrderStatus status,
        LocalDate fromDate,
        LocalDate toDate,
        Pageable pageable
    ) {
        return purchaseOrderRepository.findWithFilters(businessId, storeId, supplierId, status, fromDate, toDate, pageable)
            .map(PurchaseOrderSummaryResponse::from);
    }

    private String generateOrderNumber(UUID businessId, String storeCode) {
        long count = purchaseOrderRepository.countByBusinessIdAndStoreId(businessId, storeRepository.findByBusinessIdAndStoreCode(businessId, storeCode).map(Store::getId).orElse(UUID.randomUUID()));
        String code = "PO-" + storeCode.toUpperCase() + "-" + String.format("%05d", count + 1);
        if (purchaseOrderRepository.existsByBusinessIdAndOrderNumberIgnoreCase(businessId, code)) {
            code = "PO-" + storeCode.toUpperCase() + "-" + System.currentTimeMillis() % 1000000;
        }
        return code;
    }
}
