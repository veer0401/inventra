package com.inventra.inventra_backend.ingestion.application.handler;

import com.inventra.inventra_backend.ingestion.application.SpreadsheetFormulaSanitizer;
import com.inventra.inventra_backend.ingestion.application.dto.EntityMatchResult;
import com.inventra.inventra_backend.ingestion.application.dto.ImportTemplateMetadata;
import com.inventra.inventra_backend.ingestion.application.dto.TemplateColumnDefinition;
import com.inventra.inventra_backend.ingestion.domain.model.ImportDomain;
import com.inventra.inventra_backend.ingestion.domain.model.ImportValidationIssue;
import com.inventra.inventra_backend.purchasing.api.dto.CreateSupplierRequest;
import com.inventra.inventra_backend.purchasing.application.SupplierService;
import com.inventra.inventra_backend.purchasing.domain.model.Supplier;
import com.inventra.inventra_backend.purchasing.domain.model.SupplierType;
import com.inventra.inventra_backend.purchasing.domain.repository.SupplierRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class SupplierImportHandler implements ImportDomainHandler {

    private final SupplierRepository supplierRepository;
    private final SupplierService supplierService;

    public SupplierImportHandler(
        SupplierRepository supplierRepository,
        SupplierService supplierService
    ) {
        this.supplierRepository = supplierRepository;
        this.supplierService = supplierService;
    }

    @Override
    public ImportDomain getDomain() {
        return ImportDomain.SUPPLIERS;
    }

    @Override
    public ImportTemplateMetadata getTemplateMetadata() {
        List<TemplateColumnDefinition> columns = List.of(
            new TemplateColumnDefinition("supplierName", "Supplier / Vendor Name", true, "Legal business or distributor name", "STRING", "Apollo Pharma Distributors Pvt Ltd", null, List.of("supplier name", "vendor name", "name", "distributor")),
            new TemplateColumnDefinition("gstin", "GSTIN", false, "15-character GST identification number", "STRING", "27AABCT3518Q1Z5", null, List.of("gstin", "gst", "gst number")),
            new TemplateColumnDefinition("drugLicenseNumber", "Drug License Number", false, "State drug authority wholesale license number", "STRING", "DL-MH-2024-89712", null, List.of("drug license", "drug license number", "dl", "dl number")),
            new TemplateColumnDefinition("phone", "Contact Phone", false, "10-digit primary phone or landline", "STRING", "9876543210", null, List.of("phone", "mobile", "contact", "phone number")),
            new TemplateColumnDefinition("email", "Email Address", false, "Accounts/Orders email address", "STRING", "orders@apollodist.com", null, List.of("email", "email address", "mail")),
            new TemplateColumnDefinition("creditPeriodDays", "Credit Period (Days)", false, "Payment credit term days", "NUMBER", "30", null, List.of("credit period", "credit days", "payment terms", "credit"))
        );

        String sampleCsv = """
            Supplier / Vendor Name,GSTIN,Drug License Number,Contact Phone,Email Address,Credit Period (Days)
            Apollo Pharma Distributors Pvt Ltd,27AABCT3518Q1Z5,DL-MH-2024-89712,9876543210,orders@apollodist.com,30
            MedPlus Wholesale Agency,29AABCS1429B1ZB,DL-KA-2023-44122,9811223344,info@medpluswholesale.com,45
            Sun Health Distributors,33AABCS9912A1Z1,DL-TN-2024-11099,9844556677,contact@sunhealth.in,15
            """;

        return new ImportTemplateMetadata(
            ImportDomain.SUPPLIERS,
            "Supplier Directory Import",
            "Bulk import pharmaceutical distributors, wholesale vendors, GSTIN credentials, and drug licenses",
            columns,
            sampleCsv.strip()
        );
    }

    @Override
    public Map<String, Object> normalizeRow(Map<String, String> rawData) {
        Map<String, Object> normalized = new LinkedHashMap<>();

        String supplierName = getFieldCaseInsensitive(rawData, "supplierName", "supplier / vendor name", "supplier", "vendor name", "name", "distributor");
        String gstin = getFieldCaseInsensitive(rawData, "gstin", "gst", "gst number");
        String drugLicense = getFieldCaseInsensitive(rawData, "drugLicenseNumber", "drug license", "drug license number", "dl", "dl number");
        String phone = getFieldCaseInsensitive(rawData, "phone", "contact phone", "mobile", "contact", "phone number");
        String email = getFieldCaseInsensitive(rawData, "email", "email address", "mail");
        String creditPeriodStr = getFieldCaseInsensitive(rawData, "creditPeriodDays", "credit period (days)", "credit period", "credit days", "payment terms", "credit");

        normalized.put("supplierName", SpreadsheetFormulaSanitizer.sanitize(supplierName != null ? supplierName.trim() : null));
        normalized.put("gstin", gstin != null && !gstin.isBlank() ? gstin.trim().toUpperCase() : null);
        normalized.put("drugLicenseNumber", drugLicense != null && !drugLicense.isBlank() ? drugLicense.trim().toUpperCase() : null);

        String cleanPhone = null;
        if (phone != null) {
            cleanPhone = phone.replaceAll("[^0-9]", "").trim();
            if (cleanPhone.startsWith("91") && cleanPhone.length() == 12) {
                cleanPhone = cleanPhone.substring(2);
            }
        }
        normalized.put("phone", cleanPhone);
        normalized.put("email", email != null && !email.isBlank() ? email.trim().toLowerCase() : null);

        Integer creditDays = 30;
        if (creditPeriodStr != null && !creditPeriodStr.isBlank()) {
            try {
                creditDays = Integer.parseInt(creditPeriodStr.replaceAll("[^0-9]", "").trim());
            } catch (Exception ignored) {
                normalized.put("raw_creditPeriod_invalid", creditPeriodStr);
            }
        }
        normalized.put("creditPeriodDays", creditDays);

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

        String supplierName = (String) normalizedData.get("supplierName");
        if (supplierName == null || supplierName.isBlank()) {
            issues.add(ImportValidationIssue.error(importRowId, "supplierName", "REQUIRED_FIELD_MISSING", "Supplier name is mandatory"));
        } else if (supplierName.length() > 255) {
            issues.add(ImportValidationIssue.error(importRowId, "supplierName", "FIELD_TOO_LONG", "Supplier name cannot exceed 255 characters"));
        }

        String gstin = (String) normalizedData.get("gstin");
        if (gstin != null && !gstin.isBlank()) {
            if (!gstin.matches("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")) {
                issues.add(ImportValidationIssue.warning(importRowId, "gstin", "INVALID_GSTIN_FORMAT", "GSTIN does not match standard 15-character format"));
            }
        }

        String email = (String) normalizedData.get("email");
        if (email != null && !email.isBlank()) {
            if (!email.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
                issues.add(ImportValidationIssue.error(importRowId, "email", "INVALID_EMAIL_FORMAT", "Email address format is invalid"));
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
        String gstin = (String) normalizedData.get("gstin");
        if (gstin != null && !gstin.isBlank()) {
            Optional<Supplier> supOpt = supplierRepository.findByBusinessIdAndGstin(businessId, gstin);
            if (supOpt.isPresent()) {
                return EntityMatchResult.exact(
                    supOpt.get().getId(),
                    "Matched existing supplier by GSTIN " + gstin + " (" + supOpt.get().getTradeName() + ")"
                );
            }
        }

        String supplierName = (String) normalizedData.get("supplierName");
        if (supplierName != null && !supplierName.isBlank()) {
            Optional<Supplier> supOpt = supplierRepository.findByBusinessIdAndTradeNameIgnoreCase(businessId, supplierName);
            if (supOpt.isPresent()) {
                return EntityMatchResult.exact(
                    supOpt.get().getId(),
                    "Matched existing supplier by trade name (" + supOpt.get().getTradeName() + ")"
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
        if (matchedEntityId != null && supplierRepository.findByIdAndBusinessId(matchedEntityId, businessId).isPresent()) {
            return;
        }

        String supplierName = (String) normalizedData.get("supplierName");
        String gstin = (String) normalizedData.get("gstin");
        String drugLicense = (String) normalizedData.get("drugLicenseNumber");
        String phone = (String) normalizedData.get("phone");
        String email = (String) normalizedData.get("email");
        Integer creditDays = (Integer) normalizedData.get("creditPeriodDays");

        String code = supplierName.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
        if (code.length() > 8) code = code.substring(0, 8);
        if (code.isBlank()) code = "SUP";
        String uniqueCode = code;
        int counter = 1;
        while (supplierRepository.existsByBusinessIdAndSupplierCodeIgnoreCase(businessId, uniqueCode)) {
            uniqueCode = code + counter;
            counter++;
        }

        CreateSupplierRequest request = new CreateSupplierRequest(
            uniqueCode,
            supplierName,
            supplierName,
            SupplierType.DISTRIBUTOR,
            gstin,
            drugLicense,
            null,
            email,
            phone,
            null,
            null,
            null,
            null,
            null,
            null,
            creditDays != null ? creditDays : 30,
            BigDecimal.valueOf(100000),
            "Imported via Universal Ingestion"
        );

        supplierService.createSupplier(businessId, request);
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
