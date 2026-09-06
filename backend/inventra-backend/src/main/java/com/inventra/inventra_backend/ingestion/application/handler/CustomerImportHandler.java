package com.inventra.inventra_backend.ingestion.application.handler;

import com.inventra.inventra_backend.customer.api.dto.CreateCustomerRequest;
import com.inventra.inventra_backend.customer.application.CustomerService;
import com.inventra.inventra_backend.customer.domain.model.Customer;
import com.inventra.inventra_backend.customer.domain.repository.CustomerRepository;
import com.inventra.inventra_backend.ingestion.application.SpreadsheetFormulaSanitizer;
import com.inventra.inventra_backend.ingestion.application.dto.EntityMatchResult;
import com.inventra.inventra_backend.ingestion.application.dto.ImportTemplateMetadata;
import com.inventra.inventra_backend.ingestion.application.dto.TemplateColumnDefinition;
import com.inventra.inventra_backend.ingestion.domain.model.ImportDomain;
import com.inventra.inventra_backend.ingestion.domain.model.ImportValidationIssue;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class CustomerImportHandler implements ImportDomainHandler {

    private final CustomerRepository customerRepository;
    private final CustomerService customerService;

    public CustomerImportHandler(
        CustomerRepository customerRepository,
        CustomerService customerService
    ) {
        this.customerRepository = customerRepository;
        this.customerService = customerService;
    }

    @Override
    public ImportDomain getDomain() {
        return ImportDomain.CUSTOMERS;
    }

    @Override
    public ImportTemplateMetadata getTemplateMetadata() {
        List<TemplateColumnDefinition> columns = List.of(
            new TemplateColumnDefinition("fullName", "Customer Full Name", true, "Patient or customer name", "STRING", "Ramesh Kumar Sharma", null, List.of("full name", "customer name", "name", "patient name")),
            new TemplateColumnDefinition("phone", "Mobile Phone Number", true, "10-digit mobile number for SMS & billing", "STRING", "9876543210", null, List.of("phone", "mobile", "contact", "phone number", "mobile number")),
            new TemplateColumnDefinition("email", "Email Address", false, "Email address for e-invoices", "STRING", "ramesh.sharma@example.com", null, List.of("email", "email address", "mail")),
            new TemplateColumnDefinition("gstin", "GSTIN", false, "15-digit GST identification number for B2B billing", "STRING", "27AABCT3518Q1Z5", null, List.of("gstin", "gst", "gst number")),
            new TemplateColumnDefinition("address", "Address / City", false, "Primary residential or dispensary address", "STRING", "Flat 402, Green Glen, Mumbai", null, List.of("address", "street", "city", "location"))
        );

        String sampleCsv = """
            Customer Full Name,Mobile Phone Number,Email Address,GSTIN,Address / City
            Ramesh Kumar Sharma,9876543210,ramesh.sharma@example.com,27AABCT3518Q1Z5,Andheri East, Mumbai
            Priya Patel,9823456789,priya.patel@example.com,,Navrangpura, Ahmedabad
            Dr. Suresh Rao,9811223344,dr.suresh@clinic.org,29AABCS1429B1ZB,Indiranagar, Bangalore
            """;

        return new ImportTemplateMetadata(
            ImportDomain.CUSTOMERS,
            "Customer Directory Import",
            "Bulk import retail customers, patients, phone contacts, GSTIN numbers, and addresses",
            columns,
            sampleCsv.strip()
        );
    }

    @Override
    public Map<String, Object> normalizeRow(Map<String, String> rawData) {
        Map<String, Object> normalized = new LinkedHashMap<>();

        String fullName = getFieldCaseInsensitive(rawData, "fullName", "full name", "customer name", "name", "patient name");
        String phone = getFieldCaseInsensitive(rawData, "phone", "mobile", "contact", "phone number", "mobile number");
        String email = getFieldCaseInsensitive(rawData, "email", "email address", "mail");
        String gstin = getFieldCaseInsensitive(rawData, "gstin", "gst", "gst number");
        String address = getFieldCaseInsensitive(rawData, "address", "street", "city", "location");

        normalized.put("fullName", SpreadsheetFormulaSanitizer.sanitize(fullName != null ? fullName.trim() : null));

        String cleanPhone = null;
        if (phone != null) {
            cleanPhone = phone.replaceAll("[^0-9]", "").trim();
            if (cleanPhone.startsWith("91") && cleanPhone.length() == 12) {
                cleanPhone = cleanPhone.substring(2);
            }
        }
        normalized.put("phone", cleanPhone);

        normalized.put("email", email != null && !email.isBlank() ? email.trim().toLowerCase() : null);
        normalized.put("gstin", gstin != null && !gstin.isBlank() ? gstin.trim().toUpperCase() : null);
        normalized.put("address", SpreadsheetFormulaSanitizer.sanitize(address != null ? address.trim() : null));

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

        String fullName = (String) normalizedData.get("fullName");
        if (fullName == null || fullName.isBlank()) {
            issues.add(ImportValidationIssue.error(importRowId, "fullName", "REQUIRED_FIELD_MISSING", "Customer full name is mandatory"));
        } else if (fullName.length() > 255) {
            issues.add(ImportValidationIssue.error(importRowId, "fullName", "FIELD_TOO_LONG", "Customer full name cannot exceed 255 characters"));
        }

        String phone = (String) normalizedData.get("phone");
        if (phone == null || phone.isBlank()) {
            issues.add(ImportValidationIssue.error(importRowId, "phone", "REQUIRED_FIELD_MISSING", "Mobile phone number is mandatory"));
        } else if (!phone.matches("^[6-9][0-9]{9}$")) {
            issues.add(ImportValidationIssue.error(
                importRowId,
                "phone",
                "INVALID_PHONE_FORMAT",
                "Phone number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9"
            ));
        }

        String email = (String) normalizedData.get("email");
        if (email != null && !email.isBlank()) {
            if (!email.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
                issues.add(ImportValidationIssue.error(importRowId, "email", "INVALID_EMAIL_FORMAT", "Email address format is invalid"));
            }
        }

        String gstin = (String) normalizedData.get("gstin");
        if (gstin != null && !gstin.isBlank()) {
            if (!gstin.matches("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")) {
                issues.add(ImportValidationIssue.warning(importRowId, "gstin", "INVALID_GSTIN_FORMAT", "GSTIN does not match standard 15-character format"));
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
        String phone = (String) normalizedData.get("phone");
        if (phone != null && !phone.isBlank()) {
            Optional<Customer> custOpt = customerRepository.findByBusinessIdAndPhone(businessId, phone);
            if (custOpt.isPresent()) {
                return EntityMatchResult.exact(
                    custOpt.get().getId(),
                    "Matched existing customer by phone number " + phone + " (" + custOpt.get().getFullName() + ")"
                );
            }
        }

        String email = (String) normalizedData.get("email");
        if (email != null && !email.isBlank()) {
            Optional<Customer> custOpt = customerRepository.findByBusinessIdAndEmailIgnoreCase(businessId, email);
            if (custOpt.isPresent()) {
                return EntityMatchResult.exact(
                    custOpt.get().getId(),
                    "Matched existing customer by email " + email + " (" + custOpt.get().getFullName() + ")"
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
        if (matchedEntityId != null && customerRepository.findByIdAndBusinessId(matchedEntityId, businessId).isPresent()) {
            // Existing customer matched - no duplicate creation
            return;
        }

        String fullName = (String) normalizedData.get("fullName");
        String phone = (String) normalizedData.get("phone");
        String email = (String) normalizedData.get("email");
        String gstin = (String) normalizedData.get("gstin");
        String address = (String) normalizedData.get("address");

        CreateCustomerRequest request = new CreateCustomerRequest(
            null,
            fullName,
            phone,
            email,
            address,
            gstin,
            "Imported via Universal Ingestion"
        );

        customerService.createCustomer(businessId, actorUserId, request);
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
