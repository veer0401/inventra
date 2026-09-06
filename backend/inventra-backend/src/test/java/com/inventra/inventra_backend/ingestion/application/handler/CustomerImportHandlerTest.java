package com.inventra.inventra_backend.ingestion.application.handler;

import com.inventra.inventra_backend.customer.application.CustomerService;
import com.inventra.inventra_backend.customer.domain.model.Customer;
import com.inventra.inventra_backend.customer.domain.repository.CustomerRepository;
import com.inventra.inventra_backend.ingestion.application.dto.EntityMatchResult;
import com.inventra.inventra_backend.ingestion.domain.model.ImportDomain;
import com.inventra.inventra_backend.ingestion.domain.model.ImportValidationIssue;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerImportHandlerTest {

    @Mock private CustomerRepository customerRepository;
    @Mock private CustomerService customerService;

    private CustomerImportHandler handler;
    private final UUID businessId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        handler = new CustomerImportHandler(customerRepository, customerService);
    }

    @Test
    @DisplayName("Should return CUSTOMERS domain")
    void shouldReturnCorrectDomain() {
        assertEquals(ImportDomain.CUSTOMERS, handler.getDomain());
        assertNotNull(handler.getTemplateMetadata());
    }

    @Test
    @DisplayName("Should normalize phone numbers and clean prefixes")
    void shouldNormalizePhone() {
        Map<String, String> raw = Map.of(
            "Customer Full Name", "Ramesh Sharma",
            "Mobile Phone Number", "+91 98765 43210",
            "Email Address", "RAMESH@EXAMPLE.COM"
        );

        Map<String, Object> normalized = handler.normalizeRow(raw);

        assertEquals("Ramesh Sharma", normalized.get("fullName"));
        assertEquals("9876543210", normalized.get("phone"));
        assertEquals("ramesh@example.com", normalized.get("email"));
    }

    @Test
    @DisplayName("Should validate phone numbers and reject invalid digits")
    void shouldValidatePhone() {
        UUID rowId = UUID.randomUUID();

        Map<String, Object> validRow = Map.of(
            "fullName", "Ramesh Sharma",
            "phone", "9876543210"
        );
        List<ImportValidationIssue> issues = handler.validateRow(rowId, validRow, businessId, null);
        assertTrue(issues.isEmpty());

        Map<String, Object> invalidPhone = Map.of(
            "fullName", "Ramesh Sharma",
            "phone", "12345"
        );
        List<ImportValidationIssue> invalidIssues = handler.validateRow(rowId, invalidPhone, businessId, null);
        assertEquals(1, invalidIssues.size());
        assertEquals("INVALID_PHONE_FORMAT", invalidIssues.get(0).getErrorCode());
    }

    @Test
    @DisplayName("Should match customer by phone number")
    void shouldMatchCustomerByPhone() {
        UUID customerId = UUID.randomUUID();
        Customer mockCustomer = mock(Customer.class);
        when(mockCustomer.getId()).thenReturn(customerId);
        when(mockCustomer.getFullName()).thenReturn("Ramesh Sharma");

        when(customerRepository.findByBusinessIdAndPhone(businessId, "9876543210"))
            .thenReturn(Optional.of(mockCustomer));

        EntityMatchResult match = handler.matchEntity(Map.of("phone", "9876543210"), businessId, null);

        assertEquals(customerId, match.matchedEntityId());
        assertEquals(new BigDecimal("1.00"), match.matchConfidence());
    }
}
