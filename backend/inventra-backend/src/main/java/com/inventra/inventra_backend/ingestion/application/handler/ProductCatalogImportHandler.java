package com.inventra.inventra_backend.ingestion.application.handler;

import com.inventra.inventra_backend.catalog.api.dto.AddProductIdentifierRequest;
import com.inventra.inventra_backend.catalog.api.dto.CreateCategoryRequest;
import com.inventra.inventra_backend.catalog.api.dto.CreateProductRequest;
import com.inventra.inventra_backend.catalog.application.CategoryService;
import com.inventra.inventra_backend.catalog.application.ProductService;
import com.inventra.inventra_backend.catalog.domain.model.Category;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.model.ProductIdentifier;
import com.inventra.inventra_backend.catalog.domain.repository.CategoryRepository;
import com.inventra.inventra_backend.catalog.domain.repository.ProductIdentifierRepository;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.ingestion.application.SpreadsheetFormulaSanitizer;
import com.inventra.inventra_backend.ingestion.application.dto.EntityMatchResult;
import com.inventra.inventra_backend.ingestion.application.dto.ImportTemplateMetadata;
import com.inventra.inventra_backend.ingestion.application.dto.TemplateColumnDefinition;
import com.inventra.inventra_backend.ingestion.domain.model.ImportDomain;
import com.inventra.inventra_backend.ingestion.domain.model.ImportValidationIssue;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class ProductCatalogImportHandler implements ImportDomainHandler {

    private static final Set<String> VALID_DOSAGE_FORMS = Set.of(
        "TABLET", "CAPSULE", "SYRUP", "INJECTION", "OINTMENT", "DROPS", "INHALER", "POWDER", "OTHER"
    );

    private static final Set<BigDecimal> VALID_GST_RATES = Set.of(
        BigDecimal.ZERO,
        new BigDecimal("5.00"),
        new BigDecimal("12.00"),
        new BigDecimal("18.00"),
        new BigDecimal("28.00")
    );

    private final ProductRepository productRepository;
    private final ProductIdentifierRepository productIdentifierRepository;
    private final CategoryRepository categoryRepository;
    private final ProductService productService;
    private final CategoryService categoryService;

    public ProductCatalogImportHandler(
        ProductRepository productRepository,
        ProductIdentifierRepository productIdentifierRepository,
        CategoryRepository categoryRepository,
        ProductService productService,
        CategoryService categoryService
    ) {
        this.productRepository = productRepository;
        this.productIdentifierRepository = productIdentifierRepository;
        this.categoryRepository = categoryRepository;
        this.productService = productService;
        this.categoryService = categoryService;
    }

    @Override
    public ImportDomain getDomain() {
        return ImportDomain.PRODUCT_CATALOG;
    }

    @Override
    public ImportTemplateMetadata getTemplateMetadata() {
        List<TemplateColumnDefinition> columns = List.of(
            new TemplateColumnDefinition("name", "Product Name", true, "Brand or clinical medicine name", "STRING", "Dolo 650mg Tablet", null, List.of("product name", "medicine name", "item name", "product")),
            new TemplateColumnDefinition("genericName", "Generic / Salt Name", false, "Active pharmaceutical ingredient (API)", "STRING", "Paracetamol", null, List.of("generic name", "generic", "salt name", "composition")),
            new TemplateColumnDefinition("categoryName", "Category", true, "Therapeutic category", "STRING", "Analgesics & Antipyretics", null, List.of("category", "category name", "department")),
            new TemplateColumnDefinition("brandName", "Brand / Manufacturer", false, "Pharmaceutical manufacturer or marketing company", "STRING", "Micro Labs", null, List.of("brand", "brand name", "manufacturer", "mfg")),
            new TemplateColumnDefinition("dosageForm", "Dosage Form", true, "Formulation dosage type", "STRING", "TABLET", List.of("TABLET", "CAPSULE", "SYRUP", "INJECTION", "OINTMENT", "DROPS", "INHALER", "POWDER", "OTHER"), List.of("dosage form", "form", "type")),
            new TemplateColumnDefinition("strength", "Strength", false, "Strength / concentration", "STRING", "650mg", null, List.of("strength", "dose", "concentration")),
            new TemplateColumnDefinition("hsnCode", "HSN Code", false, "Harmonized System of Nomenclature code", "STRING", "30049099", null, List.of("hsn", "hsn code", "hsn/sac")),
            new TemplateColumnDefinition("gstRate", "GST Tax Rate (%)", true, "Applicable GST tax percentage (0, 5, 12, 18, 28)", "NUMBER", "12", List.of("0", "5", "12", "18", "28"), List.of("gst", "gst rate", "tax rate", "gst %")),
            new TemplateColumnDefinition("prescriptionRequired", "Prescription Required", false, "Schedule H / H1 prescription mandate", "BOOLEAN", "FALSE", List.of("TRUE", "FALSE", "YES", "NO", "1", "0"), List.of("prescription required", "rx required", "schedule drug", "rx")),
            new TemplateColumnDefinition("barcode", "Barcode / GTIN", false, "EAN-13, UPC, or primary POS barcode", "STRING", "8901234567890", null, List.of("barcode", "ean", "gtin", "upc", "sku"))
        );

        String sampleCsv = """
            Product Name,Generic / Salt Name,Category,Brand / Manufacturer,Dosage Form,Strength,HSN Code,GST Tax Rate (%),Prescription Required,Barcode / GTIN
            Dolo 650mg Tablet,Paracetamol,Analgesics,Micro Labs,TABLET,650mg,30049099,12,FALSE,8901234567890
            Augmentin 625 Duo,Amoxicillin + Clavulanic Acid,Antibiotics,GSK,TABLET,625mg,30041000,12,TRUE,8901234567891
            Benadryl Cough Syrup 100ml,Diphenhydramine HCl,Cough Preparations,J&J,SYRUP,100ml,30049099,18,FALSE,8901234567892
            """;

        return new ImportTemplateMetadata(
            ImportDomain.PRODUCT_CATALOG,
            "Product Master Catalog Import",
            "Import medicines, pharmaceuticals, clinical details, GST tax rates, and barcodes",
            columns,
            sampleCsv.strip()
        );
    }

    @Override
    public Map<String, Object> normalizeRow(Map<String, String> rawData) {
        Map<String, Object> normalized = new LinkedHashMap<>();

        String name = getFieldCaseInsensitive(rawData, "name", "product name", "medicine name", "item name", "product");
        String genericName = getFieldCaseInsensitive(rawData, "genericName", "generic name", "generic", "salt name", "composition");
        String categoryName = getFieldCaseInsensitive(rawData, "categoryName", "category", "category name", "department");
        String brandName = getFieldCaseInsensitive(rawData, "brandName", "brand", "brand name", "manufacturer", "mfg");
        String dosageForm = getFieldCaseInsensitive(rawData, "dosageForm", "dosage form", "form", "type");
        String strength = getFieldCaseInsensitive(rawData, "strength", "dose", "concentration");
        String hsnCode = getFieldCaseInsensitive(rawData, "hsnCode", "hsn", "hsn code", "hsn/sac");
        String gstRateStr = getFieldCaseInsensitive(rawData, "gstRate", "gst", "gst rate", "tax rate", "gst %");
        String rxReqStr = getFieldCaseInsensitive(rawData, "prescriptionRequired", "prescription required", "rx required", "schedule drug", "rx");
        String barcode = getFieldCaseInsensitive(rawData, "barcode", "ean", "gtin", "upc", "sku");

        normalized.put("name", SpreadsheetFormulaSanitizer.sanitize(name != null ? name.trim() : null));
        normalized.put("genericName", SpreadsheetFormulaSanitizer.sanitize(genericName != null ? genericName.trim() : null));
        normalized.put("categoryName", SpreadsheetFormulaSanitizer.sanitize(categoryName != null ? categoryName.trim() : null));
        normalized.put("brandName", SpreadsheetFormulaSanitizer.sanitize(brandName != null ? brandName.trim() : null));
        normalized.put("dosageForm", dosageForm != null ? dosageForm.trim().toUpperCase() : null);
        normalized.put("strength", strength != null ? strength.trim() : null);
        normalized.put("hsnCode", hsnCode != null ? hsnCode.trim() : null);

        BigDecimal gstRate = null;
        if (gstRateStr != null && !gstRateStr.isBlank()) {
            try {
                String clean = gstRateStr.replace("%", "").trim();
                gstRate = new BigDecimal(clean).setScale(2, java.math.RoundingMode.HALF_UP);
            } catch (Exception ignored) {
                normalized.put("raw_gstRate_invalid", gstRateStr);
            }
        }
        normalized.put("gstRate", gstRate);

        boolean prescriptionRequired = false;
        if (rxReqStr != null && !rxReqStr.isBlank()) {
            String cleanRx = rxReqStr.trim().toLowerCase();
            prescriptionRequired = cleanRx.equals("true") || cleanRx.equals("yes") || cleanRx.equals("1") || cleanRx.equals("y");
        }
        normalized.put("prescriptionRequired", prescriptionRequired);
        normalized.put("barcode", barcode != null ? barcode.trim() : null);

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

        String name = (String) normalizedData.get("name");
        if (name == null || name.isBlank()) {
            issues.add(ImportValidationIssue.error(importRowId, "name", "REQUIRED_FIELD_MISSING", "Product name is mandatory"));
        } else if (name.length() > 255) {
            issues.add(ImportValidationIssue.error(importRowId, "name", "FIELD_TOO_LONG", "Product name cannot exceed 255 characters"));
        }

        String categoryName = (String) normalizedData.get("categoryName");
        if (categoryName == null || categoryName.isBlank()) {
            issues.add(ImportValidationIssue.error(importRowId, "categoryName", "REQUIRED_FIELD_MISSING", "Category name is mandatory"));
        }

        String dosageForm = (String) normalizedData.get("dosageForm");
        if (dosageForm == null || dosageForm.isBlank()) {
            issues.add(ImportValidationIssue.error(importRowId, "dosageForm", "REQUIRED_FIELD_MISSING", "Dosage form is mandatory"));
        } else if (!VALID_DOSAGE_FORMS.contains(dosageForm)) {
            issues.add(ImportValidationIssue.error(
                importRowId,
                "dosageForm",
                "INVALID_DOSAGE_FORM",
                "Dosage form must be one of: " + String.join(", ", VALID_DOSAGE_FORMS)
            ));
        }

        BigDecimal gstRate = (BigDecimal) normalizedData.get("gstRate");
        if (normalizedData.containsKey("raw_gstRate_invalid")) {
            issues.add(ImportValidationIssue.error(importRowId, "gstRate", "INVALID_NUMBER_FORMAT", "GST rate must be a valid number"));
        } else if (gstRate == null) {
            issues.add(ImportValidationIssue.error(importRowId, "gstRate", "REQUIRED_FIELD_MISSING", "GST rate is mandatory"));
        } else {
            boolean validRate = VALID_GST_RATES.stream().anyMatch(r -> r.compareTo(gstRate) == 0);
            if (!validRate) {
                issues.add(ImportValidationIssue.error(
                    importRowId,
                    "gstRate",
                    "INVALID_GST_RATE",
                    "GST rate must be 0%, 5%, 12%, 18%, or 28%"
                ));
            }
        }

        String hsnCode = (String) normalizedData.get("hsnCode");
        if (hsnCode != null && !hsnCode.isBlank()) {
            if (!hsnCode.matches("^[0-9]{4,8}$")) {
                issues.add(ImportValidationIssue.warning(importRowId, "hsnCode", "INVALID_HSN_FORMAT", "HSN code should normally be 4 to 8 digits"));
            }
        }

        return issues;
    }

    @Override
    public EntityMatchResult matchEntity(
        Map<String, Object> normalizedData,
        UUID businessId,
        UUID storeId
    ) {
        String barcode = (String) normalizedData.get("barcode");
        if (barcode != null && !barcode.isBlank()) {
            Optional<ProductIdentifier> idOpt = productIdentifierRepository.findByBusinessIdAndIdentifierValue(businessId, barcode);
            if (idOpt.isPresent()) {
                Optional<Product> prodOpt = productRepository.findByIdAndBusinessId(idOpt.get().getProductId(), businessId);
                if (prodOpt.isPresent()) {
                    return EntityMatchResult.exact(
                        prodOpt.get().getId(),
                        "Matched existing product by barcode " + barcode + " (" + prodOpt.get().getName() + ")"
                    );
                }
            }
        }

        String name = (String) normalizedData.get("name");
        if (name != null && !name.isBlank()) {
            Optional<Product> prodOpt = productRepository.findByBusinessIdAndNameIgnoreCase(businessId, name);
            if (prodOpt.isPresent()) {
                return EntityMatchResult.exact(
                    prodOpt.get().getId(),
                    "Matched existing product by exact name (" + prodOpt.get().getName() + ")"
                );
            }
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
        String name = (String) normalizedData.get("name");
        String genericName = (String) normalizedData.get("genericName");
        String categoryName = (String) normalizedData.get("categoryName");
        String brandName = (String) normalizedData.get("brandName");
        String dosageForm = (String) normalizedData.get("dosageForm");
        String strength = (String) normalizedData.get("strength");
        String hsnCode = (String) normalizedData.get("hsnCode");
        BigDecimal gstRate = (BigDecimal) normalizedData.get("gstRate");
        boolean rxRequired = Boolean.TRUE.equals(normalizedData.get("prescriptionRequired"));
        String barcode = (String) normalizedData.get("barcode");

        // 1. Resolve or Create Category within Business
        Category category = resolveOrCreateCategory(businessId, categoryName);

        // 2. If matchedEntityId exists, product already exists in business catalog
        if (matchedEntityId != null && productRepository.findByIdAndBusinessId(matchedEntityId, businessId).isPresent()) {
            // Already in catalog - ensure barcode identifier is present if supplied
            if (barcode != null && !barcode.isBlank()) {
                if (!productIdentifierRepository.existsByBusinessIdAndIdentifierTypeAndIdentifierValue(businessId, com.inventra.inventra_backend.catalog.domain.model.IdentifierType.BARCODE, barcode)) {
                    productIdentifierRepository.save(new ProductIdentifier(
                        businessId,
                        matchedEntityId,
                        com.inventra.inventra_backend.catalog.domain.model.IdentifierType.BARCODE,
                        barcode,
                        true
                    ));
                }
            }
            return;
        }

        // 3. Create Product using ProductService
        List<AddProductIdentifierRequest> idRequests = new ArrayList<>();
        if (barcode != null && !barcode.isBlank()) {
            idRequests.add(new AddProductIdentifierRequest(com.inventra.inventra_backend.catalog.domain.model.IdentifierType.BARCODE, barcode, true));
        }

        com.inventra.inventra_backend.catalog.domain.model.DosageForm df;
        try {
            df = com.inventra.inventra_backend.catalog.domain.model.DosageForm.valueOf(dosageForm);
        } catch (Exception e) {
            df = com.inventra.inventra_backend.catalog.domain.model.DosageForm.GENERAL;
        }

        CreateProductRequest createReq = new CreateProductRequest(
            category.getId(),
            null,
            name,
            genericName,
            brandName,
            brandName,
            df,
            strength,
            "UNIT",
            "STRIP",
            10,
            hsnCode,
            gstRate != null ? gstRate : BigDecimal.ZERO,
            true,
            rxRequired,
            idRequests
        );

        productService.createProduct(businessId, createReq);
    }

    private Category resolveOrCreateCategory(UUID businessId, String categoryName) {
        String cleanName = categoryName != null && !categoryName.isBlank() ? categoryName.trim() : "General";
        Optional<Category> existing = categoryRepository.findByBusinessIdAndNameIgnoreCase(businessId, cleanName);
        if (existing.isPresent()) {
            return existing.get();
        }

        // Generate normalized category code
        String code = cleanName.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
        if (code.length() > 10) code = code.substring(0, 10);
        if (code.isBlank()) code = "CAT";
        String uniqueCode = code;
        int counter = 1;
        while (categoryRepository.existsByBusinessIdAndCode(businessId, uniqueCode)) {
            uniqueCode = code + counter;
            counter++;
        }

        return categoryService.createCategory(
            businessId,
            new CreateCategoryRequest(null, cleanName, uniqueCode, "Imported category: " + cleanName)
        );
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
