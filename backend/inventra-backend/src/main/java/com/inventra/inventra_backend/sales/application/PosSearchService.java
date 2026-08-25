package com.inventra.inventra_backend.sales.application;

import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.repository.ProductIdentifierRepository;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.inventory.domain.model.InventoryBatch;
import com.inventra.inventra_backend.inventory.domain.model.InventoryItem;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryBatchRepository;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryItemRepository;
import com.inventra.inventra_backend.sales.api.dto.PosProductSearchResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PosSearchService {

    private final ProductRepository productRepository;
    private final ProductIdentifierRepository productIdentifierRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryBatchRepository inventoryBatchRepository;

    public PosSearchService(
        ProductRepository productRepository,
        ProductIdentifierRepository productIdentifierRepository,
        InventoryItemRepository inventoryItemRepository,
        InventoryBatchRepository inventoryBatchRepository
    ) {
        this.productRepository = productRepository;
        this.productIdentifierRepository = productIdentifierRepository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.inventoryBatchRepository = inventoryBatchRepository;
    }

    @Transactional(readOnly = true)
    public Page<PosProductSearchResponse> searchPosProducts(
        UUID businessId,
        UUID storeId,
        String query,
        Pageable pageable
    ) {
        if (query == null || query.isBlank()) {
            return Page.empty(pageable);
        }

        String trimmedQuery = query.trim();

        // 1. Check exact barcode / SKU match first
        var identifierOpt = productIdentifierRepository.findByBusinessIdAndIdentifierValue(businessId, trimmedQuery);
        if (identifierOpt.isPresent()) {
            UUID productId = identifierOpt.get().getProductId();
            var productOpt = productRepository.findByIdAndBusinessId(productId, businessId);
            if (productOpt.isPresent()) {
                PosProductSearchResponse itemRes = buildSearchResponse(businessId, storeId, productOpt.get());
                return new PageImpl<>(List.of(itemRes), pageable, 1);
            }
        }

        // 2. Perform text/prefix search by product name or generic composition
        Page<Product> productPage = productRepository.searchProducts(businessId, trimmedQuery, pageable);
        if (productPage.isEmpty()) {
            return Page.empty(pageable);
        }

        List<Product> products = productPage.getContent();
        Set<UUID> productIds = products.stream().map(Product::getId).collect(Collectors.toSet());

        // Batch query inventory items for these products in the given store
        List<InventoryItem> items = inventoryItemRepository.findByBusinessIdAndStoreIdAndProductIdIn(businessId, storeId, productIds);
        Map<UUID, InventoryItem> itemMap = items.stream()
            .collect(Collectors.toMap(InventoryItem::getProductId, it -> it, (a, b) -> a));

        List<PosProductSearchResponse> responses = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (Product product : products) {
            InventoryItem item = itemMap.get(product.getId());
            BigDecimal currentStock = item != null ? item.getCurrentStock() : BigDecimal.ZERO;
            boolean isBatchTracked = item != null && item.isBatchTracked();

            String fefoBatchNumber = null;
            LocalDate fefoExpiryDate = null;
            BigDecimal fefoSellingPrice = null;
            BigDecimal fefoMrp = null;

            if (isBatchTracked) {
                List<InventoryBatch> activeBatches = inventoryBatchRepository.findFefoBatches(businessId, storeId, product.getId());
                if (!activeBatches.isEmpty()) {
                    InventoryBatch fefo = activeBatches.get(0);
                    fefoBatchNumber = fefo.getBatchNumber();
                    fefoExpiryDate = fefo.getExpiryDate();
                    fefoSellingPrice = fefo.getSellingPrice();
                    fefoMrp = fefo.getMrp();
                }
            }

            responses.add(new PosProductSearchResponse(
                product.getId(),
                product.getName(),
                product.getGenericName(),
                product.getBrandName(),
                product.getManufacturer(),
                product.getDosageForm(),
                product.getStrength(),
                product.getBaseUnit(),
                product.getSellingUnit(),
                product.getUnitsPerSellingUnit(),
                product.getTaxRate(),
                product.isTaxInclusive(),
                product.isPrescriptionRequired(),
                currentStock,
                isBatchTracked,
                fefoSellingPrice,
                fefoMrp,
                fefoBatchNumber,
                fefoExpiryDate,
                fefoSellingPrice,
                fefoMrp
            ));
        }

        return new PageImpl<>(responses, pageable, productPage.getTotalElements());
    }

    private PosProductSearchResponse buildSearchResponse(UUID businessId, UUID storeId, Product product) {
        var itemOpt = inventoryItemRepository.findByStoreIdAndProductIdAndBusinessId(storeId, product.getId(), businessId);
        BigDecimal currentStock = itemOpt.map(InventoryItem::getCurrentStock).orElse(BigDecimal.ZERO);
        boolean isBatchTracked = itemOpt.map(InventoryItem::isBatchTracked).orElse(false);

        String fefoBatchNumber = null;
        LocalDate fefoExpiryDate = null;
        BigDecimal fefoSellingPrice = null;
        BigDecimal fefoMrp = null;

        if (isBatchTracked) {
            List<InventoryBatch> activeBatches = inventoryBatchRepository.findFefoBatches(businessId, storeId, product.getId());
            if (!activeBatches.isEmpty()) {
                InventoryBatch fefo = activeBatches.get(0);
                fefoBatchNumber = fefo.getBatchNumber();
                fefoExpiryDate = fefo.getExpiryDate();
                fefoSellingPrice = fefo.getSellingPrice();
                fefoMrp = fefo.getMrp();
            }
        }

        return new PosProductSearchResponse(
            product.getId(),
            product.getName(),
            product.getGenericName(),
            product.getBrandName(),
            product.getManufacturer(),
            product.getDosageForm(),
            product.getStrength(),
            product.getBaseUnit(),
            product.getSellingUnit(),
            product.getUnitsPerSellingUnit(),
            product.getTaxRate(),
            product.isTaxInclusive(),
            product.isPrescriptionRequired(),
            currentStock,
            isBatchTracked,
            fefoSellingPrice,
            fefoMrp,
            fefoBatchNumber,
            fefoExpiryDate,
            fefoSellingPrice,
            fefoMrp
        );
    }
}
