package com.inventra.inventra_backend.purchasing.application;

import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.purchasing.api.dto.CreatePurchaseInvoiceLineRequest;
import com.inventra.inventra_backend.purchasing.api.dto.CreatePurchaseInvoiceRequest;
import com.inventra.inventra_backend.purchasing.api.dto.PurchaseInvoiceLineResponse;
import com.inventra.inventra_backend.purchasing.api.dto.PurchaseInvoiceResponse;
import com.inventra.inventra_backend.purchasing.api.dto.PurchaseInvoiceSummaryResponse;
import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceipt;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseInvoice;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseInvoiceLine;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseInvoiceStatus;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrder;
import com.inventra.inventra_backend.purchasing.domain.model.Supplier;
import com.inventra.inventra_backend.purchasing.domain.repository.GoodsReceiptRepository;
import com.inventra.inventra_backend.purchasing.domain.repository.PurchaseInvoiceLineRepository;
import com.inventra.inventra_backend.purchasing.domain.repository.PurchaseInvoiceRepository;
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
public class PurchaseInvoiceService {

    private final PurchaseInvoiceRepository purchaseInvoiceRepository;
    private final PurchaseInvoiceLineRepository purchaseInvoiceLineRepository;
    private final SupplierRepository supplierRepository;
    private final StoreRepository storeRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final GoodsReceiptRepository goodsReceiptRepository;
    private final ProductRepository productRepository;

    public PurchaseInvoiceService(
        PurchaseInvoiceRepository purchaseInvoiceRepository,
        PurchaseInvoiceLineRepository purchaseInvoiceLineRepository,
        SupplierRepository supplierRepository,
        StoreRepository storeRepository,
        PurchaseOrderRepository purchaseOrderRepository,
        GoodsReceiptRepository goodsReceiptRepository,
        ProductRepository productRepository
    ) {
        this.purchaseInvoiceRepository = purchaseInvoiceRepository;
        this.purchaseInvoiceLineRepository = purchaseInvoiceLineRepository;
        this.supplierRepository = supplierRepository;
        this.storeRepository = storeRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.goodsReceiptRepository = goodsReceiptRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    public PurchaseInvoiceResponse createPurchaseInvoice(UUID businessId, CreatePurchaseInvoiceRequest request) {
        Store store = storeRepository.findById(request.storeId())
            .filter(s -> s.getBusinessId().equals(businessId))
            .orElseThrow(() -> ResourceNotFoundException.forResource("Store", request.storeId()));

        Supplier supplier = supplierRepository.findByIdAndBusinessId(request.supplierId(), businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Supplier", request.supplierId()));

        String invoiceNum = request.supplierInvoiceNumber().trim();
        if (purchaseInvoiceRepository.existsByBusinessIdAndSupplierIdAndSupplierInvoiceNumberIgnoreCase(
            businessId,
            supplier.getId(),
            invoiceNum
        )) {
            throw new BusinessRuleViolationException(
                "DUPLICATE_SUPPLIER_INVOICE_NUMBER",
                "Invoice number '" + invoiceNum + "' already recorded for supplier " + supplier.getLegalName()
            );
        }

        PurchaseOrder po = null;
        if (request.purchaseOrderId() != null) {
            po = purchaseOrderRepository.findByIdAndStoreIdAndBusinessId(
                request.purchaseOrderId(),
                store.getId(),
                businessId
            ).orElseThrow(() -> ResourceNotFoundException.forResource("PurchaseOrder", request.purchaseOrderId()));
        }

        GoodsReceipt gr = null;
        if (request.goodsReceiptId() != null) {
            gr = goodsReceiptRepository.findByIdAndStoreIdAndBusinessId(
                request.goodsReceiptId(),
                store.getId(),
                businessId
            ).orElseThrow(() -> ResourceNotFoundException.forResource("GoodsReceipt", request.goodsReceiptId()));
        }

        PurchaseInvoice invoice = new PurchaseInvoice(
            businessId,
            store.getId(),
            supplier.getId(),
            po != null ? po.getId() : null,
            gr != null ? gr.getId() : null,
            invoiceNum,
            request.invoiceDate(),
            request.dueDate(),
            request.discountAmount(),
            request.roundOffAmount(),
            request.notes()
        );

        int lineNum = 1;
        for (CreatePurchaseInvoiceLineRequest lineReq : request.lines()) {
            Product product = productRepository.findByIdAndBusinessId(lineReq.productId(), businessId)
                .orElseThrow(() -> ResourceNotFoundException.forResource("Product", lineReq.productId()));

            PurchaseInvoiceLine line = new PurchaseInvoiceLine(
                businessId,
                invoice.getId(),
                lineReq.goodsReceiptLineId(),
                product.getId(),
                lineNum++,
                lineReq.invoicedQuantity(),
                lineReq.unitCost(),
                lineReq.discountAmount(),
                lineReq.taxRate() != null ? lineReq.taxRate() : product.getTaxRate()
            );
            invoice.addLine(line);
        }

        PurchaseInvoice saved = purchaseInvoiceRepository.save(invoice);
        return mapToResponse(saved);
    }

    @Transactional
    public PurchaseInvoiceResponse postPurchaseInvoice(UUID businessId, UUID invoiceId, UUID userId) {
        PurchaseInvoice pi = purchaseInvoiceRepository.findByIdAndBusinessId(invoiceId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("PurchaseInvoice", invoiceId));

        try {
            pi.post(userId);
        } catch (IllegalStateException e) {
            throw new BusinessRuleViolationException("INVALID_STATUS_FOR_POSTING", e.getMessage());
        }

        PurchaseInvoice saved = purchaseInvoiceRepository.save(pi);
        return mapToResponse(saved);
    }

    @Transactional
    public PurchaseInvoiceResponse cancelPurchaseInvoice(UUID businessId, UUID invoiceId) {
        PurchaseInvoice pi = purchaseInvoiceRepository.findByIdAndBusinessId(invoiceId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("PurchaseInvoice", invoiceId));

        try {
            pi.cancel();
        } catch (IllegalStateException e) {
            throw new BusinessRuleViolationException("INVALID_CANCELLATION", e.getMessage());
        }

        PurchaseInvoice saved = purchaseInvoiceRepository.save(pi);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public PurchaseInvoiceResponse getPurchaseInvoice(UUID businessId, UUID invoiceId) {
        PurchaseInvoice pi = purchaseInvoiceRepository.findByIdAndBusinessId(invoiceId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("PurchaseInvoice", invoiceId));
        return mapToResponse(pi);
    }

    @Transactional(readOnly = true)
    public Page<PurchaseInvoiceSummaryResponse> listPurchaseInvoices(
        UUID businessId,
        UUID storeId,
        UUID supplierId,
        PurchaseInvoiceStatus status,
        LocalDate dueDateBefore,
        Pageable pageable
    ) {
        return purchaseInvoiceRepository.findWithFilters(businessId, storeId, supplierId, status, dueDateBefore, pageable)
            .map(PurchaseInvoiceSummaryResponse::from);
    }

    private PurchaseInvoiceResponse mapToResponse(PurchaseInvoice pi) {
        List<PurchaseInvoiceLineResponse> lineResponses = pi.getLines().stream()
            .map(PurchaseInvoiceLineResponse::from)
            .toList();
        return PurchaseInvoiceResponse.from(pi, lineResponses);
    }
}
