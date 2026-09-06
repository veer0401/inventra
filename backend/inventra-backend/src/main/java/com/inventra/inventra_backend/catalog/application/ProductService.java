package com.inventra.inventra_backend.catalog.application;

import com.inventra.inventra_backend.catalog.api.dto.AddProductIdentifierRequest;
import com.inventra.inventra_backend.catalog.api.dto.CreateProductRequest;
import com.inventra.inventra_backend.catalog.api.dto.ProductIdentifierResponse;
import com.inventra.inventra_backend.catalog.api.dto.ProductResponse;
import com.inventra.inventra_backend.catalog.api.dto.ProductSummaryResponse;
import com.inventra.inventra_backend.catalog.api.dto.UpdateProductRequest;
import com.inventra.inventra_backend.catalog.domain.model.Category;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.model.ProductIdentifier;
import com.inventra.inventra_backend.catalog.domain.repository.CategoryRepository;
import com.inventra.inventra_backend.catalog.domain.repository.ProductIdentifierRepository;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.sync.domain.model.SyncChangeOperation;
import com.inventra.inventra_backend.sync.infrastructure.ChangeFeedPublisher;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductIdentifierRepository productIdentifierRepository;
    private final ChangeFeedPublisher changeFeedPublisher;
    private final GlobalMedicineService globalMedicineService;

    public ProductService(
        ProductRepository productRepository,
        CategoryRepository categoryRepository,
        ProductIdentifierRepository productIdentifierRepository,
        ChangeFeedPublisher changeFeedPublisher,
        GlobalMedicineService globalMedicineService
    ) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.productIdentifierRepository = productIdentifierRepository;
        this.changeFeedPublisher = changeFeedPublisher;
        this.globalMedicineService = globalMedicineService;
    }

    @Transactional
    public ProductResponse createProduct(UUID businessId, CreateProductRequest request) {
        if (request.categoryId() != null) {
            validateCategory(businessId, request.categoryId());
        }

        Product product = new Product(
            businessId,
            request.categoryId(),
            request.globalProductId(),
            request.name(),
            request.genericName(),
            request.brandName(),
            request.manufacturer(),
            request.dosageForm(),
            request.strength(),
            request.baseUnit(),
            request.sellingUnit(),
            request.unitsPerSellingUnit(),
            request.hsnCode(),
            request.taxRate(),
            request.isTaxInclusive(),
            request.prescriptionRequired()
        );
        Product savedProduct = productRepository.save(product);

        if (request.identifiers() != null && !request.identifiers().isEmpty()) {
            for (AddProductIdentifierRequest idReq : request.identifiers()) {
                addIdentifierInternal(businessId, savedProduct.getId(), idReq);
            }
        }

        // If this product was NOT imported from the Global Medicine Database,
        // silently submit a proposal to the Platform Admin queue for potential inclusion.
        if (request.globalProductId() == null) {
            globalMedicineService.recordSilentSuggestion(businessId, savedProduct.getId(), request);
        }

        List<ProductIdentifierResponse> identifiers = loadIdentifiers(businessId, savedProduct.getId());
        ProductResponse response = ProductResponse.from(savedProduct, identifiers);
        changeFeedPublisher.publish(businessId, null, "PRODUCT", savedProduct.getId(), SyncChangeOperation.UPSERT, 1, response);
        return response;
    }

    @Transactional
    public ProductResponse updateProduct(UUID businessId, UUID productId, UpdateProductRequest request) {
        Product product = productRepository.findByIdAndBusinessId(productId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Product", productId));

        if (request.categoryId() != null) {
            validateCategory(businessId, request.categoryId());
        }

        product.update(
            request.categoryId(),
            request.name(),
            request.genericName(),
            request.brandName(),
            request.manufacturer(),
            request.dosageForm(),
            request.strength(),
            request.baseUnit(),
            request.sellingUnit(),
            request.unitsPerSellingUnit(),
            request.hsnCode(),
            request.taxRate(),
            request.isTaxInclusive(),
            request.prescriptionRequired(),
            request.status()
        );

        Product saved = productRepository.save(product);
        List<ProductIdentifierResponse> identifiers = loadIdentifiers(businessId, saved.getId());
        ProductResponse response = ProductResponse.from(saved, identifiers);
        changeFeedPublisher.publish(businessId, null, "PRODUCT", saved.getId(), SyncChangeOperation.UPSERT, 1, response);
        return response;
    }

    @Transactional(readOnly = true)
    public ProductResponse getProduct(UUID businessId, UUID productId) {
        Product product = productRepository.findByIdAndBusinessId(productId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Product", productId));
        List<ProductIdentifierResponse> identifiers = loadIdentifiers(businessId, productId);
        return ProductResponse.from(product, identifiers);
    }

    @Transactional(readOnly = true)
    public Page<ProductSummaryResponse> listProducts(UUID businessId, Pageable pageable) {
        return productRepository.findByBusinessId(businessId, pageable)
            .map(ProductSummaryResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<ProductSummaryResponse> searchProducts(UUID businessId, String query, Pageable pageable) {
        if (query == null || query.isBlank()) {
            return listProducts(businessId, pageable);
        }
        return productRepository.searchProducts(businessId, query.trim(), pageable)
            .map(ProductSummaryResponse::from);
    }

    @Transactional
    public ProductIdentifierResponse addIdentifier(
        UUID businessId,
        UUID productId,
        AddProductIdentifierRequest request
    ) {
        // Ensure product exists and belongs to business
        productRepository.findByIdAndBusinessId(productId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Product", productId));

        ProductIdentifier identifier = addIdentifierInternal(businessId, productId, request);
        return ProductIdentifierResponse.from(identifier);
    }

    private ProductIdentifier addIdentifierInternal(
        UUID businessId,
        UUID productId,
        AddProductIdentifierRequest request
    ) {
        String normalizedValue = request.identifierValue().trim().toUpperCase();
        if (productIdentifierRepository.existsByBusinessIdAndIdentifierTypeAndIdentifierValue(
            businessId,
            request.identifierType(),
            normalizedValue
        )) {
            throw new BusinessRuleViolationException(
                "DUPLICATE_IDENTIFIER",
                "Identifier " + request.identifierType() + " '" + normalizedValue + "' already exists in this business"
            );
        }

        boolean isPrimary = request.isPrimary() != null && request.isPrimary();
        if (isPrimary) {
            productIdentifierRepository.findByBusinessIdAndProductIdAndIdentifierTypeAndIsPrimaryTrue(
                businessId,
                productId,
                request.identifierType()
            ).ifPresent(existingPrimary -> {
                existingPrimary.setPrimary(false);
                productIdentifierRepository.save(existingPrimary);
            });
        }

        ProductIdentifier identifier = new ProductIdentifier(
            businessId,
            productId,
            request.identifierType(),
            normalizedValue,
            isPrimary
        );
        return productIdentifierRepository.save(identifier);
    }

    private void validateCategory(UUID businessId, UUID categoryId) {
        categoryRepository.findByIdAndBusinessId(categoryId, businessId)
            .orElseThrow(() -> new BusinessRuleViolationException(
                "INVALID_CATEGORY",
                "Category does not exist in the current business context"
            ));
    }

    private List<ProductIdentifierResponse> loadIdentifiers(UUID businessId, UUID productId) {
        return productIdentifierRepository.findByBusinessIdAndProductId(businessId, productId)
            .stream()
            .map(ProductIdentifierResponse::from)
            .toList();
    }
}
