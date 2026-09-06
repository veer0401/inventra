package com.inventra.inventra_backend.ingestion.application.handler;

import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.model.ProductIdentifier;
import com.inventra.inventra_backend.catalog.domain.repository.ProductIdentifierRepository;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.ingestion.application.SpreadsheetFormulaSanitizer;
import com.inventra.inventra_backend.ingestion.application.dto.EntityMatchResult;
import com.inventra.inventra_backend.ingestion.application.dto.ImportTemplateMetadata;
import com.inventra.inventra_backend.ingestion.application.dto.TemplateColumnDefinition;
import com.inventra.inventra_backend.ingestion.domain.model.ImportDomain;
import com.inventra.inventra_backend.ingestion.domain.model.ImportValidationIssue;
import com.inventra.inventra_backend.inventory.domain.model.InventoryBatch;
import com.inventra.inventra_backend.inventory.domain.model.InventoryItem;
import com.inventra.inventra_backend.inventory.domain.model.StockMovement;
import com.inventra.inventra_backend.inventory.domain.model.StockMovementType;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryBatchRepository;
import com.inventra.inventra_backend.inventory.domain.repository.InventoryItemRepository;
import com.inventra.inventra_backend.inventory.domain.repository.StockMovementRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class InventoryStockIntakeImportHandler implements ImportDomainHandler {

    private final ProductRepository productRepository;
    private final ProductIdentifierRepository productIdentifierRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final StockMovementRepository stockMovementRepository;

    public InventoryStockIntakeImportHandler(
        ProductRepository productRepository,
        ProductIdentifierRepository productIdentifierRepository,
        InventoryItemRepository inventoryItemRepository,
        InventoryBatchRepository inventoryBatchRepository,
        StockMovementRepository stockMovementRepository
    ) {
        this.productRepository = productRepository;
        this.productIdentifierRepository = productIdentifierRepository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.inventoryBatchRepository = inventoryBatchRepository;
        this.stockMovementRepository = stockMovementRepository;
    }

    @Override
    public ImportDomain getDomain() {
        return ImportDomain.INVENTORY;
    }

    @Override
    public ImportTemplateMetadata getTemplateMetadata() {
        List<TemplateColumnDefinition> columns = List.of(
            new TemplateColumnDefinition("productIdentifier", "Product Name or Barcode", true, "Exact product name or barcode in master catalog", "STRING", "Dolo 650mg Tablet", null, List.of("product", "product name", "barcode", "item", "medicine")),
            new TemplateColumnDefinition("batchNumber", "Batch Lot Number", true, "Manufacturer physical batch code", "STRING", "BAT-2026-891", null, List.of("batch", "batch number", "batch no", "lot", "lot number")),
            new TemplateColumnDefinition("manufacturingDate", "Manufacturing Date", false, "Date of production (YYYY-MM-DD or YYYY-MM)", "DATE", "2026-01-15", null, List.of("mfg date", "manufacturing date", "mfg")),
            new TemplateColumnDefinition("expiryDate", "Expiration Date", true, "Expiry date (YYYY-MM-DD or YYYY-MM, must be future date)", "DATE", "2028-12-31", null, List.of("exp date", "expiry date", "expiry", "exp")),
            new TemplateColumnDefinition("quantity", "Initial Stock Quantity", true, "Number of base units in stock (positive numeric)", "NUMBER", "100.000", null, List.of("quantity", "qty", "stock", "count", "initial stock")),
            new TemplateColumnDefinition("unitCost", "Purchase Cost per Unit (₹)", true, "Purchase price or landed unit cost", "NUMBER", "24.50", null, List.of("unit cost", "cost price", "purchase price", "cost", "rate")),
            new TemplateColumnDefinition("mrp", "Maximum Retail Price (₹)", true, "Package printed Maximum Retail Price", "NUMBER", "35.00", null, List.of("mrp", "max retail price", "printed price")),
            new TemplateColumnDefinition("sellingPrice", "Selling Price (₹)", true, "Counter retail selling price (<= MRP)", "NUMBER", "32.00", null, List.of("selling price", "sale price", "retail price", "price"))
        );

        String sampleCsv = """
            Product Name or Barcode,Batch Lot Number,Manufacturing Date,Expiration Date,Initial Stock Quantity,Purchase Cost per Unit (₹),Maximum Retail Price (₹),Selling Price (₹)
            8901234567890,DL-2026-01,2026-01-10,2028-12-31,500,24.50,35.00,32.00
            Augmentin 625 Duo,AMX-892,2026-02-01,2027-08-31,120,140.00,201.50,195.00
            Benadryl Cough Syrup 100ml,BND-4411,2026-03-15,2028-05-31,60,78.00,115.00,110.00
            """;

        return new ImportTemplateMetadata(
            ImportDomain.INVENTORY,
            "Initial Stock & Opening Inventory Intake",
            "Bulk intake opening inventory batches, batch lots, expiration dates, unit costs, and retail MRPs",
            columns,
            sampleCsv.strip()
        );
    }

    @Override
    public Map<String, Object> normalizeRow(Map<String, String> rawData) {
        Map<String, Object> normalized = new LinkedHashMap<>();

        String prodIdStr = getFieldCaseInsensitive(rawData, "productIdentifier", "product name or barcode", "product", "product name", "barcode", "item", "medicine");
        String batchNo = getFieldCaseInsensitive(rawData, "batchNumber", "batch lot number", "batch", "batch number", "batch no", "lot", "lot number");
        String mfgDateStr = getFieldCaseInsensitive(rawData, "manufacturingDate", "manufacturing date", "mfg date", "mfg");
        String expDateStr = getFieldCaseInsensitive(rawData, "expiryDate", "expiration date", "exp date", "expiry date", "expiry", "exp");
        String qtyStr = getFieldCaseInsensitive(rawData, "quantity", "initial stock quantity", "quantity", "qty", "stock", "count", "initial stock");
        String costStr = getFieldCaseInsensitive(rawData, "unitCost", "purchase cost per unit (₹)", "unit cost", "cost price", "purchase price", "cost", "rate");
        String mrpStr = getFieldCaseInsensitive(rawData, "mrp", "maximum retail price (₹)", "mrp", "max retail price", "printed price");
        String spStr = getFieldCaseInsensitive(rawData, "sellingPrice", "selling price (₹)", "selling price", "sale price", "retail price", "price");

        normalized.put("productIdentifier", SpreadsheetFormulaSanitizer.sanitize(prodIdStr != null ? prodIdStr.trim() : null));
        normalized.put("batchNumber", SpreadsheetFormulaSanitizer.sanitize(batchNo != null ? batchNo.trim().toUpperCase() : null));

        normalized.put("manufacturingDate", parseFlexibleDate(mfgDateStr));
        if (mfgDateStr != null && !mfgDateStr.isBlank() && normalized.get("manufacturingDate") == null) {
            normalized.put("raw_mfgDate_invalid", mfgDateStr);
        }

        normalized.put("expiryDate", parseFlexibleDate(expDateStr));
        if (expDateStr != null && !expDateStr.isBlank() && normalized.get("expiryDate") == null) {
            normalized.put("raw_expDate_invalid", expDateStr);
        }

        normalized.put("quantity", parseDecimal(qtyStr, "raw_quantity_invalid", normalized));
        normalized.put("unitCost", parseDecimal(costStr, "raw_unitCost_invalid", normalized));
        normalized.put("mrp", parseDecimal(mrpStr, "raw_mrp_invalid", normalized));
        normalized.put("sellingPrice", parseDecimal(spStr, "raw_sellingPrice_invalid", normalized));

        return normalized;
    }

    @Override
    public List<ImportValidationIssue> validateRow(
        UUID importRowId,
        Map<String, Object> normalizedData,
        UUID businessId,
        UUID storeId
    ) {
        List<ImportValidationIssue> issues = new ArrayList<>();

        if (storeId == null) {
            issues.add(ImportValidationIssue.error(importRowId, "storeId", "STORE_CONTEXT_REQUIRED", "Inventory import requires an active store destination context"));
        }

        String prodIdStr = (String) normalizedData.get("productIdentifier");
        if (prodIdStr == null || prodIdStr.isBlank()) {
            issues.add(ImportValidationIssue.error(importRowId, "productIdentifier", "REQUIRED_FIELD_MISSING", "Product name or barcode is mandatory"));
        }

        String batchNo = (String) normalizedData.get("batchNumber");
        if (batchNo == null || batchNo.isBlank()) {
            issues.add(ImportValidationIssue.error(importRowId, "batchNumber", "REQUIRED_FIELD_MISSING", "Batch lot number is mandatory"));
        } else if (batchNo.length() > 60) {
            issues.add(ImportValidationIssue.error(importRowId, "batchNumber", "FIELD_TOO_LONG", "Batch number cannot exceed 60 characters"));
        }

        if (normalizedData.containsKey("raw_expDate_invalid")) {
            issues.add(ImportValidationIssue.error(importRowId, "expiryDate", "INVALID_DATE_FORMAT", "Expiry date must be in YYYY-MM-DD or YYYY-MM format"));
        } else {
            LocalDate expDate = (LocalDate) normalizedData.get("expiryDate");
            if (expDate == null) {
                issues.add(ImportValidationIssue.error(importRowId, "expiryDate", "REQUIRED_FIELD_MISSING", "Expiry date is mandatory"));
            } else if (expDate.isBefore(LocalDate.now())) {
                issues.add(ImportValidationIssue.error(importRowId, "expiryDate", "EXPIRED_DATE", "Batch has already expired on " + expDate));
            }
        }

        if (normalizedData.containsKey("raw_mfgDate_invalid")) {
            issues.add(ImportValidationIssue.warning(importRowId, "manufacturingDate", "INVALID_DATE_FORMAT", "Manufacturing date format should be YYYY-MM-DD or YYYY-MM"));
        }

        BigDecimal qty = (BigDecimal) normalizedData.get("quantity");
        if (normalizedData.containsKey("raw_quantity_invalid")) {
            issues.add(ImportValidationIssue.error(importRowId, "quantity", "INVALID_NUMBER_FORMAT", "Quantity must be a valid positive number"));
        } else if (qty == null) {
            issues.add(ImportValidationIssue.error(importRowId, "quantity", "REQUIRED_FIELD_MISSING", "Quantity is mandatory"));
        } else if (qty.compareTo(BigDecimal.ZERO) <= 0) {
            issues.add(ImportValidationIssue.error(importRowId, "quantity", "NON_POSITIVE_QUANTITY", "Quantity must be strictly greater than zero"));
        }

        BigDecimal unitCost = (BigDecimal) normalizedData.get("unitCost");
        if (normalizedData.containsKey("raw_unitCost_invalid")) {
            issues.add(ImportValidationIssue.error(importRowId, "unitCost", "INVALID_NUMBER_FORMAT", "Unit cost must be a valid number"));
        } else if (unitCost == null) {
            issues.add(ImportValidationIssue.error(importRowId, "unitCost", "REQUIRED_FIELD_MISSING", "Unit cost is mandatory"));
        } else if (unitCost.compareTo(BigDecimal.ZERO) < 0) {
            issues.add(ImportValidationIssue.error(importRowId, "unitCost", "NEGATIVE_COST", "Unit cost cannot be negative"));
        }

        BigDecimal mrp = (BigDecimal) normalizedData.get("mrp");
        if (normalizedData.containsKey("raw_mrp_invalid")) {
            issues.add(ImportValidationIssue.error(importRowId, "mrp", "INVALID_NUMBER_FORMAT", "MRP must be a valid number"));
        } else if (mrp == null) {
            issues.add(ImportValidationIssue.error(importRowId, "mrp", "REQUIRED_FIELD_MISSING", "MRP is mandatory"));
        } else if (mrp.compareTo(BigDecimal.ZERO) <= 0) {
            issues.add(ImportValidationIssue.error(importRowId, "mrp", "NON_POSITIVE_MRP", "MRP must be greater than zero"));
        }

        BigDecimal sp = (BigDecimal) normalizedData.get("sellingPrice");
        if (normalizedData.containsKey("raw_sellingPrice_invalid")) {
            issues.add(ImportValidationIssue.error(importRowId, "sellingPrice", "INVALID_NUMBER_FORMAT", "Selling price must be a valid number"));
        } else if (sp == null) {
            issues.add(ImportValidationIssue.error(importRowId, "sellingPrice", "REQUIRED_FIELD_MISSING", "Selling price is mandatory"));
        } else if (sp.compareTo(BigDecimal.ZERO) < 0) {
            issues.add(ImportValidationIssue.error(importRowId, "sellingPrice", "NEGATIVE_PRICE", "Selling price cannot be negative"));
        }

        if (mrp != null && unitCost != null && mrp.compareTo(unitCost) < 0) {
            issues.add(ImportValidationIssue.error(importRowId, "mrp", "MRP_BELOW_COST", "MRP (₹" + mrp + ") cannot be less than purchase cost (₹" + unitCost + ")"));
        }

        if (mrp != null && sp != null && sp.compareTo(mrp) > 0) {
            issues.add(ImportValidationIssue.error(importRowId, "sellingPrice", "PRICE_EXCEEDS_MRP", "Selling price (₹" + sp + ") cannot exceed maximum retail price (₹" + mrp + ")"));
        }

        return issues;
    }

    @Override
    public EntityMatchResult matchEntity(
        Map<String, Object> normalizedData,
        UUID businessId,
        UUID storeId
    ) {
        String identifier = (String) normalizedData.get("productIdentifier");
        if (identifier == null || identifier.isBlank()) {
            return EntityMatchResult.none();
        }

        // 1. Try matching by barcode
        Optional<ProductIdentifier> barcodeMatch = productIdentifierRepository.findByBusinessIdAndIdentifierValue(businessId, identifier);
        if (barcodeMatch.isPresent()) {
            Optional<Product> prodOpt = productRepository.findByIdAndBusinessId(barcodeMatch.get().getProductId(), businessId);
            if (prodOpt.isPresent()) {
                return EntityMatchResult.exact(
                    prodOpt.get().getId(),
                    "Matched product by barcode " + identifier + " (" + prodOpt.get().getName() + ")"
                );
            }
        }

        // 2. Try matching by exact name
        Optional<Product> nameMatch = productRepository.findByBusinessIdAndNameIgnoreCase(businessId, identifier);
        if (nameMatch.isPresent()) {
            return EntityMatchResult.exact(
                nameMatch.get().getId(),
                "Matched product by exact name (" + nameMatch.get().getName() + ")"
            );
        }

        return EntityMatchResult.none();
    }

    @Override
    public void postRow(
        Map<String, Object> normalizedData,
        UUID matchedEntityId,
        UUID businessId,
        UUID storeId,
        UUID actorUserId
    ) {
        if (matchedEntityId == null) {
            throw new BusinessRuleViolationException(
                "UNMATCHED_PRODUCT_CANNOT_POST",
                "Cannot post inventory batch for unmatched product: " + normalizedData.get("productIdentifier")
            );
        }

        Product product = productRepository.findByIdAndBusinessId(matchedEntityId, businessId)
            .orElseThrow(() -> new BusinessRuleViolationException("PRODUCT_NOT_FOUND", "Product not found"));

        String batchNumber = (String) normalizedData.get("batchNumber");
        LocalDate mfgDate = (LocalDate) normalizedData.get("manufacturingDate");
        LocalDate expDate = (LocalDate) normalizedData.get("expiryDate");
        BigDecimal quantity = (BigDecimal) normalizedData.get("quantity");
        BigDecimal unitCost = (BigDecimal) normalizedData.get("unitCost");
        BigDecimal mrp = (BigDecimal) normalizedData.get("mrp");
        BigDecimal sellingPrice = (BigDecimal) normalizedData.get("sellingPrice");

        // Lock or create InventoryItem at Store
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
                true
            );
            return inventoryItemRepository.save(newItem);
        });

        if (!item.isBatchTracked()) {
            item.updateSettings(null, null, null, null, null, true);
        }

        // Find or create InventoryBatch
        Optional<InventoryBatch> batchOpt = inventoryBatchRepository.findByBusinessIdAndStoreIdAndProductIdAndBatchNumber(
            businessId,
            storeId,
            product.getId(),
            batchNumber
        );

        InventoryBatch batch;
        if (batchOpt.isPresent()) {
            batch = batchOpt.get();
            batch.adjustQuantity(quantity);
            batch = inventoryBatchRepository.save(batch);
        } else {
            batch = new InventoryBatch(
                businessId,
                storeId,
                product.getId(),
                item.getId(),
                batchNumber,
                mfgDate,
                expDate,
                quantity,
                unitCost.setScale(2, java.math.RoundingMode.HALF_UP),
                mrp.setScale(2, java.math.RoundingMode.HALF_UP),
                sellingPrice.setScale(2, java.math.RoundingMode.HALF_UP)
            );
            batch = inventoryBatchRepository.save(batch);
        }

        // Increment InventoryItem Stock
        item.adjustStock(quantity);
        inventoryItemRepository.save(item);

        // Record immutable StockMovement (INITIAL_STOCK)
        StockMovement movement = new StockMovement(
            businessId,
            storeId,
            product.getId(),
            batch.getId(),
            StockMovementType.INITIAL_STOCK,
            quantity,
            unitCost.setScale(2, java.math.RoundingMode.HALF_UP),
            item.getCurrentStock(),
            "IMPORT_JOB",
            null,
            "Initial Stock Intake Batch " + batchNumber,
            actorUserId,
            null,
            Instant.now()
        );
        stockMovementRepository.save(movement);
    }

    private LocalDate parseFlexibleDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        String clean = dateStr.trim();
        try {
            if (clean.matches("^[0-9]{4}-[0-9]{2}-[0-9]{2}$")) {
                return LocalDate.parse(clean, DateTimeFormatter.ISO_LOCAL_DATE);
            } else if (clean.matches("^[0-9]{4}-[0-9]{2}$")) {
                YearMonth ym = YearMonth.parse(clean);
                return ym.atEndOfMonth();
            } else if (clean.matches("^[0-9]{2}/[0-9]{4}$")) {
                DateTimeFormatter dtf = DateTimeFormatter.ofPattern("MM/yyyy");
                YearMonth ym = YearMonth.parse(clean, dtf);
                return ym.atEndOfMonth();
            }
        } catch (Exception ignored) {}
        return null;
    }

    private BigDecimal parseDecimal(String str, String errorKey, Map<String, Object> normalized) {
        if (str == null || str.isBlank()) return null;
        try {
            String clean = str.replace("₹", "").replace(",", "").trim();
            return new BigDecimal(clean).setScale(3, java.math.RoundingMode.HALF_UP);
        } catch (Exception e) {
            normalized.put(errorKey, str);
            return null;
        }
    }

    private String getFieldCaseInsensitive(Map<String, String> map, String... possibleKeys) {
        for (String key : possibleKeys) {
            String cleanTarget = key.replaceAll("[^A-Za-z0-9]", "").toLowerCase();
            for (Map.Entry<String, String> entry : map.entrySet()) {
                String cleanKey = entry.getKey().replaceAll("[^A-Za-z0-9]", "").toLowerCase();
                if (cleanKey.equals(cleanTarget) || (cleanKey.length() >= 3 && cleanTarget.contains(cleanKey)) || (cleanTarget.length() >= 3 && cleanKey.contains(cleanTarget))) {
                    String val = entry.getValue();
                    if (val != null && !val.isBlank()) {
                        return val;
                    }
                }
            }
        }
        return null;
    }
}
