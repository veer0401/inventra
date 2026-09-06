package com.inventra.inventra_backend.catalog.application;

import com.inventra.inventra_backend.catalog.api.dto.CreateGlobalMedicineRequest;
import com.inventra.inventra_backend.catalog.api.dto.CreateProductRequest;
import com.inventra.inventra_backend.catalog.api.dto.GlobalMedicineResponse;
import com.inventra.inventra_backend.catalog.api.dto.GlobalMedicineSuggestionResponse;
import com.inventra.inventra_backend.catalog.api.dto.UpdateGlobalMedicineRequest;
import com.inventra.inventra_backend.catalog.domain.model.GlobalMedicine;
import com.inventra.inventra_backend.catalog.domain.model.GlobalMedicineStatus;
import com.inventra.inventra_backend.catalog.domain.model.GlobalMedicineSuggestion;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.model.SuggestionStatus;
import com.inventra.inventra_backend.catalog.domain.repository.GlobalMedicineRepository;
import com.inventra.inventra_backend.catalog.domain.repository.GlobalMedicineSuggestionRepository;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.catalog.api.dto.GlobalMedicineCsvImportResult;
import com.inventra.inventra_backend.catalog.api.dto.ProductIdentifierResponse;
import com.inventra.inventra_backend.catalog.api.dto.ProductResponse;
import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.IdentifierType;
import com.inventra.inventra_backend.catalog.domain.model.ProductIdentifier;
import com.inventra.inventra_backend.catalog.domain.repository.ProductIdentifierRepository;
import com.inventra.inventra_backend.ingestion.application.StreamingCsvParser;
import com.inventra.inventra_backend.sync.domain.model.SyncChangeOperation;
import com.inventra.inventra_backend.sync.infrastructure.ChangeFeedPublisher;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GlobalMedicineService {

    private static final Logger log = LoggerFactory.getLogger(GlobalMedicineService.class);

    private final GlobalMedicineRepository globalMedicineRepository;
    private final GlobalMedicineSuggestionRepository suggestionRepository;
    private final ProductRepository productRepository;
    private final BusinessRepository businessRepository;
    private final ProductIdentifierRepository productIdentifierRepository;
    private final ChangeFeedPublisher changeFeedPublisher;

    public GlobalMedicineService(
        GlobalMedicineRepository globalMedicineRepository,
        GlobalMedicineSuggestionRepository suggestionRepository,
        ProductRepository productRepository,
        BusinessRepository businessRepository,
        ProductIdentifierRepository productIdentifierRepository,
        ChangeFeedPublisher changeFeedPublisher
    ) {
        this.globalMedicineRepository = globalMedicineRepository;
        this.suggestionRepository = suggestionRepository;
        this.productRepository = productRepository;
        this.businessRepository = businessRepository;
        this.productIdentifierRepository = productIdentifierRepository;
        this.changeFeedPublisher = changeFeedPublisher;
    }

    // =========================================================================
    // Retailer / Tenant-facing methods
    // =========================================================================

    @Transactional(readOnly = true)
    public Page<GlobalMedicineResponse> searchActiveGlobalMedicines(String query, Pageable pageable) {
        return globalMedicineRepository.search(query, GlobalMedicineStatus.ACTIVE, pageable)
            .map(GlobalMedicineResponse::from);
    }

    @Transactional(readOnly = true)
    public GlobalMedicineResponse getGlobalMedicine(UUID id) {
        GlobalMedicine medicine = globalMedicineRepository.findByIdAndStatus(id, GlobalMedicineStatus.ACTIVE)
            .orElseThrow(() -> ResourceNotFoundException.forResource("GlobalMedicine", id));
        return GlobalMedicineResponse.from(medicine);
    }

    /**
     * Silently records a store owner's newly created product into the suggestions queue
     * for Platform Admin evaluation without interrupting product creation.
     */
    @Transactional
    public void recordSilentSuggestion(UUID businessId, UUID productId, CreateProductRequest request) {
        try {
            GlobalMedicineSuggestion suggestion = new GlobalMedicineSuggestion(
                businessId,
                productId,
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
                request.prescriptionRequired()
            );
            suggestionRepository.save(suggestion);
            log.info("Silently queued product suggestion '{}' for business '{}' to Platform Admin queue",
                request.name(), businessId);
        } catch (Exception e) {
            log.warn("Failed to record silent global medicine suggestion for business {}: {}", businessId, e.getMessage());
        }
    }

    // =========================================================================
    // Platform Admin methods
    // =========================================================================

    @Transactional(readOnly = true)
    public Page<GlobalMedicineResponse> searchAllGlobalMedicines(String query, GlobalMedicineStatus status, Pageable pageable) {
        return globalMedicineRepository.search(query, status, pageable)
            .map(GlobalMedicineResponse::from);
    }

    @Transactional(readOnly = true)
    public GlobalMedicineResponse getGlobalMedicineForAdmin(UUID id) {
        GlobalMedicine medicine = globalMedicineRepository.findById(id)
            .orElseThrow(() -> ResourceNotFoundException.forResource("GlobalMedicine", id));
        return GlobalMedicineResponse.from(medicine);
    }

    @Transactional
    public GlobalMedicineResponse createGlobalMedicine(CreateGlobalMedicineRequest request) {
        GlobalMedicine medicine = new GlobalMedicine(
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
            request.prescriptionRequired(),
            request.categoryName(),
            request.barcode(),
            request.description()
        );
        GlobalMedicine saved = globalMedicineRepository.save(medicine);
        return GlobalMedicineResponse.from(saved);
    }

    @Transactional
    public GlobalMedicineResponse updateGlobalMedicine(UUID id, UpdateGlobalMedicineRequest request) {
        GlobalMedicine medicine = globalMedicineRepository.findById(id)
            .orElseThrow(() -> ResourceNotFoundException.forResource("GlobalMedicine", id));

        medicine.update(
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
            request.prescriptionRequired(),
            request.categoryName(),
            request.barcode(),
            request.description(),
            request.status()
        );

        GlobalMedicine saved = globalMedicineRepository.save(medicine);
        return GlobalMedicineResponse.from(saved);
    }

    @Transactional
    public GlobalMedicineResponse updateStatus(UUID id, GlobalMedicineStatus status) {
        GlobalMedicine medicine = globalMedicineRepository.findById(id)
            .orElseThrow(() -> ResourceNotFoundException.forResource("GlobalMedicine", id));
        medicine.setStatus(status);
        GlobalMedicine saved = globalMedicineRepository.save(medicine);
        return GlobalMedicineResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public Page<GlobalMedicineSuggestionResponse> listSuggestions(String query, SuggestionStatus status, Pageable pageable) {
        Page<GlobalMedicineSuggestion> page = suggestionRepository.search(query, status, pageable);
        
        // Lookup business names in bulk
        java.util.Set<UUID> businessIds = page.getContent().stream()
            .map(GlobalMedicineSuggestion::getBusinessId)
            .collect(Collectors.toSet());
        Map<UUID, String> businessNames = businessRepository.findAllById(businessIds).stream()
            .collect(Collectors.toMap(
                Business::getId,
                b -> b.getTradeName() != null && !b.getTradeName().isBlank() ? b.getTradeName() : b.getLegalName()
            ));

        return page.map(s -> GlobalMedicineSuggestionResponse.from(s, businessNames.getOrDefault(s.getBusinessId(), "Store")));
    }

    @Transactional(readOnly = true)
    public long getPendingSuggestionsCount() {
        return suggestionRepository.countByStatus(SuggestionStatus.PENDING);
    }

    @Transactional
    public GlobalMedicineSuggestionResponse approveSuggestion(UUID suggestionId, UUID adminUserId, String adminNotes) {
        GlobalMedicineSuggestion suggestion = suggestionRepository.findById(suggestionId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("GlobalMedicineSuggestion", suggestionId));

        if (suggestion.getStatus() == SuggestionStatus.APPROVED) {
            throw new BusinessRuleViolationException("ALREADY_APPROVED", "Suggestion has already been approved");
        }

        // Create GlobalMedicine entry from suggestion
        String genericName = suggestion.getGenericName() != null && !suggestion.getGenericName().isBlank()
            ? suggestion.getGenericName()
            : suggestion.getName();

        GlobalMedicine globalMedicine = new GlobalMedicine(
            suggestion.getName(),
            genericName,
            suggestion.getBrandName(),
            suggestion.getManufacturer(),
            suggestion.getDosageForm(),
            suggestion.getStrength(),
            suggestion.getBaseUnit(),
            suggestion.getSellingUnit(),
            suggestion.getUnitsPerSellingUnit(),
            suggestion.getHsnCode(),
            suggestion.getTaxRate(),
            suggestion.isPrescriptionRequired(),
            "General / Approved Suggestion",
            null,
            "Approved from store suggestion submitted by business " + suggestion.getBusinessId()
        );
        GlobalMedicine savedGlobal = globalMedicineRepository.save(globalMedicine);

        // Mark suggestion approved
        suggestion.markApproved(savedGlobal.getId(), adminUserId, adminNotes);
        suggestionRepository.save(suggestion);

        // Retroactively link the requesting retailer's product to the newly created GlobalMedicine
        if (suggestion.getProductId() != null) {
            productRepository.findByIdAndBusinessId(suggestion.getProductId(), suggestion.getBusinessId())
                .ifPresent(p -> {
                    p.linkGlobalProduct(savedGlobal.getId());
                    productRepository.save(p);
                    log.info("Linked product '{}' (id: {}) to new global medicine (id: {})",
                        p.getName(), p.getId(), savedGlobal.getId());
                });
        }

        String businessName = businessRepository.findById(suggestion.getBusinessId())
            .map(b -> b.getTradeName() != null && !b.getTradeName().isBlank() ? b.getTradeName() : b.getLegalName())
            .orElse("Store");

        return GlobalMedicineSuggestionResponse.from(suggestion, businessName);
    }

    @Transactional
    public GlobalMedicineSuggestionResponse rejectSuggestion(UUID suggestionId, UUID adminUserId, String reason) {
        GlobalMedicineSuggestion suggestion = suggestionRepository.findById(suggestionId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("GlobalMedicineSuggestion", suggestionId));

        if (suggestion.getStatus() == SuggestionStatus.APPROVED) {
            throw new BusinessRuleViolationException("CANNOT_REJECT", "Cannot reject an already approved suggestion");
        }

        suggestion.markRejected(adminUserId, reason);
        suggestionRepository.save(suggestion);

        String businessName = businessRepository.findById(suggestion.getBusinessId())
            .map(b -> b.getTradeName() != null && !b.getTradeName().isBlank() ? b.getTradeName() : b.getLegalName())
            .orElse("Store");

        return GlobalMedicineSuggestionResponse.from(suggestion, businessName);
    }

    // =========================================================================
    // 1-Click Quick Store Import & Bulk CSV Ingestion
    // =========================================================================

    /**
     * 1-Click Automatic addition of a global medicine directly into a retailer's store catalog.
     * Inherits formulation defaults without prompting with a modal form.
     */
    @Transactional
    public ProductResponse quickImportToStore(UUID businessId, UUID globalMedicineId) {
        GlobalMedicine globalMedicine = globalMedicineRepository.findById(globalMedicineId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("GlobalMedicine", globalMedicineId));

        // 1. Check if store already has a product linked to this global master
        Optional<Product> existingLinked = productRepository.findByBusinessIdAndGlobalProductId(businessId, globalMedicineId);
        if (existingLinked.isPresent()) {
            return ProductResponse.from(existingLinked.get(), List.of());
        }

        // 2. Check if store already has a product by the exact same name
        Optional<Product> existingByName = productRepository.findByBusinessIdAndNameIgnoreCase(businessId, globalMedicine.getName());
        if (existingByName.isPresent()) {
            Product p = existingByName.get();
            p.linkGlobalProduct(globalMedicine.getId());
            Product saved = productRepository.save(p);
            ProductResponse response = ProductResponse.from(saved, List.of());
            changeFeedPublisher.publish(businessId, null, "PRODUCT", saved.getId(), SyncChangeOperation.UPSERT, 1, response);
            return response;
        }

        // 3. Create fresh store product
        Product product = new Product(
            businessId,
            null,
            globalMedicine.getId(),
            globalMedicine.getName(),
            globalMedicine.getGenericName(),
            globalMedicine.getBrandName(),
            globalMedicine.getManufacturer(),
            globalMedicine.getDosageForm(),
            globalMedicine.getStrength(),
            globalMedicine.getBaseUnit(),
            globalMedicine.getSellingUnit(),
            globalMedicine.getUnitsPerSellingUnit(),
            globalMedicine.getHsnCode(),
            globalMedicine.getTaxRate(),
            true,
            globalMedicine.isPrescriptionRequired()
        );
        Product savedProduct = productRepository.save(product);

        List<ProductIdentifierResponse> identifiers = new ArrayList<>();
        if (globalMedicine.getBarcode() != null && !globalMedicine.getBarcode().isBlank()) {
            try {
                ProductIdentifier pi = new ProductIdentifier(
                    businessId,
                    savedProduct.getId(),
                    IdentifierType.BARCODE,
                    globalMedicine.getBarcode().trim(),
                    true
                );
                ProductIdentifier savedPi = productIdentifierRepository.save(pi);
                if (savedPi != null) {
                    identifiers.add(new ProductIdentifierResponse(
                        savedPi.getId(),
                        savedPi.getProductId(),
                        savedPi.getIdentifierType(),
                        savedPi.getIdentifierValue(),
                        savedPi.isPrimary(),
                        savedPi.getCreatedAt()
                    ));
                }
            } catch (Exception e) {
                log.warn("Could not save barcode for quick imported product: {}", e.getMessage());
            }
        }

        ProductResponse response = ProductResponse.from(savedProduct, identifiers);
        changeFeedPublisher.publish(businessId, null, "PRODUCT", savedProduct.getId(), SyncChangeOperation.UPSERT, 1, response);
        log.info("Quick-imported global medicine '{}' (id: {}) to business '{}'",
            globalMedicine.getName(), globalMedicineId, businessId);
        return response;
    }

    @Transactional(readOnly = true)
    public List<UUID> getImportedGlobalMedicineIds(UUID businessId) {
        return productRepository.findImportedGlobalProductIds(businessId);
    }

    /**
     * Parses and bulk imports medicines from CSV into the Global Medicine Database.
     */
    @Transactional
    public GlobalMedicineCsvImportResult importFromCsv(InputStream inputStream) {
        StreamingCsvParser parser = new StreamingCsvParser();
        StreamingCsvParser.ParsedCsvData data = parser.parseStream(inputStream);

        int totalRows = data.rows().size();
        int created = 0;
        int updated = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();

        for (int i = 0; i < totalRows; i++) {
            Map<String, String> row = data.rows().get(i);
            int rowNum = i + 2;
            try {
                String name = getField(row, "name", "medicine name", "product name");
                if (name == null || name.isBlank()) {
                    throw new IllegalArgumentException("Medicine Name is required");
                }

                String genericName = getField(row, "generic name", "generic", "salt");
                if (genericName == null || genericName.isBlank()) {
                    genericName = name;
                }

                String brandName = getField(row, "brand name", "brand");
                String manufacturer = getField(row, "manufacturer", "mfr");
                String dosageStr = getField(row, "dosage form", "dosage", "form");
                DosageForm dosageForm = parseDosageForm(dosageStr);
                String strength = getField(row, "strength");
                String baseUnit = getField(row, "base unit", "unit");
                if (baseUnit == null || baseUnit.isBlank()) baseUnit = "Tablet";
                String sellingUnit = getField(row, "selling unit", "pack");
                if (sellingUnit == null || sellingUnit.isBlank()) sellingUnit = "Unit";
                String unitsPerSellingUnitStr = getField(row, "units per selling unit", "conversion", "units");
                int unitsPerSellingUnit = parseUnits(unitsPerSellingUnitStr);
                String hsnCode = getField(row, "hsn code", "hsn");
                String taxRateStr = getField(row, "tax rate", "gst", "tax");
                BigDecimal taxRate = parseTaxRate(taxRateStr);
                String rxStr = getField(row, "prescription required", "rx", "schedule h");
                boolean rx = "true".equalsIgnoreCase(rxStr) || "yes".equalsIgnoreCase(rxStr) || "1".equals(rxStr);
                String category = getField(row, "category name", "category");
                String barcode = getField(row, "barcode", "gtin", "ean");
                String description = getField(row, "description");

                Optional<GlobalMedicine> existingOpt = globalMedicineRepository.findByNameIgnoreCase(name.trim());
                if (existingOpt.isPresent()) {
                    GlobalMedicine m = existingOpt.get();
                    m.update(
                        name.trim(),
                        genericName.trim(),
                        brandName,
                        manufacturer,
                        dosageForm,
                        strength,
                        baseUnit,
                        sellingUnit,
                        unitsPerSellingUnit,
                        hsnCode,
                        taxRate,
                        rx,
                        category,
                        barcode,
                        description,
                        GlobalMedicineStatus.ACTIVE
                    );
                    globalMedicineRepository.save(m);
                    updated++;
                } else {
                    GlobalMedicine m = new GlobalMedicine(
                        name.trim(),
                        genericName.trim(),
                        brandName,
                        manufacturer,
                        dosageForm,
                        strength,
                        baseUnit,
                        sellingUnit,
                        unitsPerSellingUnit,
                        hsnCode,
                        taxRate,
                        rx,
                        category,
                        barcode,
                        description
                    );
                    globalMedicineRepository.save(m);
                    created++;
                }
            } catch (Exception e) {
                failed++;
                if (errors.size() < 50) {
                    errors.add("Row " + rowNum + ": " + e.getMessage());
                }
            }
        }

        return new GlobalMedicineCsvImportResult(totalRows, created, updated, failed, errors);
    }

    public String generateCsvTemplate() {
        return """
            Name,Generic Name,Brand Name,Manufacturer,Dosage Form,Strength,Base Unit,Selling Unit,Units Per Selling Unit,HSN Code,Tax Rate,Prescription Required,Category Name,Barcode,Description
            Dolo 650 Tablet,Paracetamol,Dolo,Micro Labs Ltd,TABLET,650 mg,Tablet,Strip of 15,15,30049060,12.00,false,Analgesic / Antipyretic,8901148210012,Fast-acting paracetamol for fever and pain
            Augmentin 625 Duo Tablet,Amoxicillin and Potassium Clavulanate,Augmentin,GlaxoSmithKline,TABLET,500 mg + 125 mg,Tablet,Strip of 10,10,30041000,12.00,true,Antibiotic,8901148210036,Broad-spectrum penicillin antibiotic
            Ascoril D Plus Syrup,Dextromethorphan + Chlorpheniramine,Ascoril,Glenmark,SYRUP,100 ml,Bottle,Bottle,1,30049099,12.00,false,Respiratory / Cough,8901148210104,Cough suppressant and decongestant
            """;
    }

    private static String getField(Map<String, String> row, String... aliases) {
        for (Map.Entry<String, String> entry : row.entrySet()) {
            String key = entry.getKey().trim().toLowerCase().replaceAll("[^a-z0-9]", " ");
            for (String alias : aliases) {
                String cleanAlias = alias.toLowerCase().replaceAll("[^a-z0-9]", " ");
                if (key.equals(cleanAlias) || key.startsWith(cleanAlias)) {
                    String val = entry.getValue();
                    return val != null && !val.isBlank() ? val.trim() : null;
                }
            }
        }
        return null;
    }

    private static DosageForm parseDosageForm(String val) {
        if (val == null || val.isBlank()) return DosageForm.TABLET;
        String clean = val.trim().toUpperCase().replaceAll("[^A-Z]", "");
        for (DosageForm form : DosageForm.values()) {
            if (form.name().equals(clean) || clean.contains(form.name())) {
                return form;
            }
        }
        return DosageForm.GENERAL;
    }

    private static int parseUnits(String val) {
        if (val == null || val.isBlank()) return 1;
        try {
            int parsed = Integer.parseInt(val.replaceAll("[^0-9]", ""));
            return parsed >= 1 ? parsed : 1;
        } catch (Exception e) {
            return 1;
        }
    }

    private static BigDecimal parseTaxRate(String val) {
        if (val == null || val.isBlank()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(val.replaceAll("[^0-9.]", ""));
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }
}
