package com.inventra.inventra_backend.purchasing.application;

import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.purchasing.api.dto.CreateSupplierProductRequest;
import com.inventra.inventra_backend.purchasing.api.dto.CreateSupplierRequest;
import com.inventra.inventra_backend.purchasing.api.dto.SupplierProductResponse;
import com.inventra.inventra_backend.purchasing.api.dto.SupplierResponse;
import com.inventra.inventra_backend.purchasing.api.dto.UpdateSupplierRequest;
import com.inventra.inventra_backend.purchasing.domain.model.Supplier;
import com.inventra.inventra_backend.purchasing.domain.model.SupplierProduct;
import com.inventra.inventra_backend.purchasing.domain.model.SupplierProductStatus;
import com.inventra.inventra_backend.purchasing.domain.repository.SupplierProductRepository;
import com.inventra.inventra_backend.purchasing.domain.repository.SupplierRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final SupplierProductRepository supplierProductRepository;
    private final ProductRepository productRepository;

    public SupplierService(
        SupplierRepository supplierRepository,
        SupplierProductRepository supplierProductRepository,
        ProductRepository productRepository
    ) {
        this.supplierRepository = supplierRepository;
        this.supplierProductRepository = supplierProductRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    public SupplierResponse createSupplier(UUID businessId, CreateSupplierRequest request) {
        String normalizedCode = request.supplierCode().trim().toUpperCase();
        if (supplierRepository.existsByBusinessIdAndSupplierCodeIgnoreCase(businessId, normalizedCode)) {
            throw new BusinessRuleViolationException(
                "DUPLICATE_SUPPLIER_CODE",
                "Supplier code '" + normalizedCode + "' already exists in this business"
            );
        }

        Supplier supplier = new Supplier(
            businessId,
            normalizedCode,
            request.legalName(),
            request.tradeName(),
            request.supplierType(),
            request.gstin(),
            request.drugLicenseNumber(),
            request.pan(),
            request.email(),
            request.phoneNumber(),
            request.contactPersonName(),
            request.addressLine1(),
            request.addressLine2(),
            request.city(),
            request.state(),
            request.postalCode(),
            request.paymentTermsDays(),
            request.creditLimit(),
            request.notes()
        );

        Supplier saved = supplierRepository.save(supplier);
        return SupplierResponse.from(saved);
    }

    @Transactional
    public SupplierResponse updateSupplier(UUID businessId, UUID supplierId, UpdateSupplierRequest request) {
        Supplier supplier = supplierRepository.findByIdAndBusinessId(supplierId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Supplier", supplierId));

        supplier.update(
            request.legalName(),
            request.tradeName(),
            request.supplierType(),
            request.gstin(),
            request.drugLicenseNumber(),
            request.pan(),
            request.email(),
            request.phoneNumber(),
            request.contactPersonName(),
            request.addressLine1(),
            request.addressLine2(),
            request.city(),
            request.state(),
            request.postalCode(),
            request.paymentTermsDays(),
            request.creditLimit(),
            request.status(),
            request.notes()
        );

        Supplier saved = supplierRepository.save(supplier);
        return SupplierResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public SupplierResponse getSupplier(UUID businessId, UUID supplierId) {
        Supplier supplier = supplierRepository.findByIdAndBusinessId(supplierId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Supplier", supplierId));
        return SupplierResponse.from(supplier);
    }

    @Transactional(readOnly = true)
    public Page<SupplierResponse> listSuppliers(UUID businessId, Pageable pageable) {
        return supplierRepository.findByBusinessId(businessId, pageable)
            .map(SupplierResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<SupplierResponse> searchSuppliers(UUID businessId, String query, Pageable pageable) {
        if (query == null || query.isBlank()) {
            return listSuppliers(businessId, pageable);
        }
        return supplierRepository.searchSuppliers(businessId, query.trim(), pageable)
            .map(SupplierResponse::from);
    }

    @Transactional
    public SupplierProductResponse addOrUpdateSupplierProduct(
        UUID businessId,
        UUID supplierId,
        CreateSupplierProductRequest request
    ) {
        Supplier supplier = supplierRepository.findByIdAndBusinessId(supplierId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Supplier", supplierId));

        Product product = productRepository.findByIdAndBusinessId(request.productId(), businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Product", request.productId()));

        SupplierProduct sp = supplierProductRepository
            .findByBusinessIdAndSupplierIdAndProductId(businessId, supplier.getId(), product.getId())
            .map(existing -> {
                existing.update(
                    request.supplierProductCode(),
                    request.supplierProductName(),
                    request.purchaseUnit(),
                    request.conversionFactor(),
                    request.lastPurchasePrice(),
                    request.isPreferred(),
                    request.minOrderQuantity(),
                    request.leadTimeDays(),
                    SupplierProductStatus.ACTIVE
                );
                return existing;
            })
            .orElseGet(() -> new SupplierProduct(
                businessId,
                supplier.getId(),
                product.getId(),
                request.supplierProductCode(),
                request.supplierProductName(),
                request.purchaseUnit(),
                request.conversionFactor(),
                request.lastPurchasePrice(),
                request.isPreferred(),
                request.minOrderQuantity(),
                request.leadTimeDays()
            ));

        SupplierProduct saved = supplierProductRepository.save(sp);
        return SupplierProductResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<SupplierProductResponse> listSupplierProducts(UUID businessId, UUID supplierId) {
        // Ensure supplier belongs to business
        supplierRepository.findByIdAndBusinessId(supplierId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Supplier", supplierId));

        return supplierProductRepository.findByBusinessIdAndSupplierId(businessId, supplierId)
            .stream()
            .map(SupplierProductResponse::from)
            .toList();
    }
}
