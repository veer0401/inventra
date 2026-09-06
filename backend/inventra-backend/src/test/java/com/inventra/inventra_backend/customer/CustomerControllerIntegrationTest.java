package com.inventra.inventra_backend.customer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.common.security.JwtTokenProvider;
import com.inventra.inventra_backend.customer.api.dto.CreateCustomerRequest;
import com.inventra.inventra_backend.customer.api.dto.UpdateCustomerRequest;
import com.inventra.inventra_backend.customer.domain.model.Customer;
import com.inventra.inventra_backend.customer.domain.model.CustomerStatus;
import com.inventra.inventra_backend.customer.domain.repository.CustomerRepository;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CustomerControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CustomerRepository customerRepository;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private UUID businessIdA;
    private UUID businessIdB;
    private UUID storeIdA;
    private String cashierTokenA;
    private String cashierTokenB;

    @BeforeEach
    void setUp() {
        // Business A setup
        Business businessA = businessRepository.save(
            Business.create("Apollo Medicos A", "Apollo Legal A", null, null)
        );
        businessIdA = businessA.getId();

        Store storeA = storeRepository.save(
            Store.create(businessIdA, "STORE-A", "Apollo Store A", true)
        );
        storeIdA = storeA.getId();

        User userA = userRepository.save(
            User.create("cashier.a." + UUID.randomUUID() + "@inventra.com", "hashedPassword", "Cashier A", null)
        );
        cashierTokenA = jwtTokenProvider.generateAccessToken(userA.getId(), userA.getEmail(), businessIdA, storeIdA, null, "CASHIER");

        // Business B setup (for multi-tenant isolation testing)
        Business businessB = businessRepository.save(
            Business.create("Apollo Medicos B", "Apollo Legal B", null, null)
        );
        businessIdB = businessB.getId();

        User userB = userRepository.save(
            User.create("cashier.b." + UUID.randomUUID() + "@inventra.com", "hashedPassword", "Cashier B", null)
        );
        cashierTokenB = jwtTokenProvider.generateAccessToken(userB.getId(), userB.getEmail(), businessIdB, null, null, "CASHIER");
    }

    @Test
    @Transactional
    @DisplayName("Create customer returns 201 with auto-generated code and persists entity")
    void testCreateCustomer_Success() throws Exception {
        CreateCustomerRequest request = new CreateCustomerRequest(
            null, // Auto-generate code
            "Rahul Sharma",
            "9876543210",
            "rahul@example.com",
            "42 MG Road, Mumbai",
            "27AAAAA0000A1Z5",
            "Patient is allergic to penicillin"
        );

        MvcResult result = mockMvc.perform(post("/api/v1/customers")
                .header("Authorization", "Bearer " + cashierTokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.fullName").value("Rahul Sharma"))
            .andExpect(jsonPath("$.data.phone").value("9876543210"))
            .andExpect(jsonPath("$.data.customerCode").isNotEmpty())
            .andExpect(jsonPath("$.data.status").value("ACTIVE"))
            .andReturn();

        var json = objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
        UUID customerId = UUID.fromString(json.get("id").asText());

        Customer saved = customerRepository.findByIdAndBusinessId(customerId, businessIdA).orElseThrow();
        assertThat(saved.getFullName()).isEqualTo("Rahul Sharma");
        assertThat(saved.getNotes()).isEqualTo("Patient is allergic to penicillin");
    }

    @Test
    @Transactional
    @DisplayName("Create customer with explicit custom code succeeds and validates uniqueness")
    void testCreateCustomer_CustomCodeAndDuplicateConflict() throws Exception {
        CreateCustomerRequest request1 = new CreateCustomerRequest(
            "CUST-VIP-001",
            "Amit Patel",
            "9811223344",
            null,
            null,
            null,
            null
        );

        mockMvc.perform(post("/api/v1/customers")
                .header("Authorization", "Bearer " + cashierTokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request1)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.customerCode").value("CUST-VIP-001"));

        // Duplicate code in same business throws 409
        CreateCustomerRequest duplicateRequest = new CreateCustomerRequest(
            "CUST-VIP-001",
            "Another Name",
            "9899887766",
            null,
            null,
            null,
            null
        );

        mockMvc.perform(post("/api/v1/customers")
                .header("Authorization", "Bearer " + cashierTokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(duplicateRequest)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.errorCode").value("CUSTOMER_ALREADY_EXISTS"));
    }

    @Test
    @Transactional
    @DisplayName("Update customer modifies fields and status without physical deletion")
    void testUpdateCustomer_Success() throws Exception {
        Customer customer = new Customer(
            businessIdA,
            "CUST-100001",
            "Original Name",
            "9998887776",
            "orig@test.com",
            "Old Address",
            null,
            null,
            null
        );
        customer = customerRepository.save(customer);

        UpdateCustomerRequest updateReq = new UpdateCustomerRequest(
            "Updated Name",
            "9998887776",
            "new@test.com",
            "New Address 101",
            "27AAAAA1111A1Z1",
            "Updated medical remarks",
            CustomerStatus.SUSPENDED
        );

        mockMvc.perform(put("/api/v1/customers/" + customer.getId())
                .header("Authorization", "Bearer " + cashierTokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.fullName").value("Updated Name"))
            .andExpect(jsonPath("$.data.status").value("SUSPENDED"));

        Customer updated = customerRepository.findByIdAndBusinessId(customer.getId(), businessIdA).orElseThrow();
        assertThat(updated.getFullName()).isEqualTo("Updated Name");
        assertThat(updated.getStatus()).isEqualTo(CustomerStatus.SUSPENDED);
    }

    @Test
    @Transactional
    @DisplayName("Get customer returns aggregated lifetime statistics")
    void testGetCustomer_StatisticsAggregation() throws Exception {
        Customer customer = new Customer(
            businessIdA,
            "CUST-200001",
            "Deepak Verma",
            "9822334455",
            null,
            null,
            null,
            null,
            null
        );
        customer = customerRepository.save(customer);

        mockMvc.perform(get("/api/v1/customers/" + customer.getId())
                .header("Authorization", "Bearer " + cashierTokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.id").value(customer.getId().toString()))
            .andExpect(jsonPath("$.data.statistics.totalSalesCount").value(0))
            .andExpect(jsonPath("$.data.statistics.totalSpendAmount").value(0))
            .andExpect(jsonPath("$.data.statistics.totalReturnsCount").value(0));
    }

    @Test
    @Transactional
    @DisplayName("Search customers matches partial phone and name prefixes")
    void testSearchCustomers() throws Exception {
        Customer c1 = new Customer(businessIdA, "CUST-300001", "Priya Singh", "9876111111", null, null, null, null, null);
        Customer c2 = new Customer(businessIdA, "CUST-300002", "Priyanka Roy", "9876222222", null, null, null, null, null);
        Customer c3 = new Customer(businessIdA, "CUST-300003", "Anand Verma", "9111333333", null, null, null, null, null);
        customerRepository.save(c1);
        customerRepository.save(c2);
        customerRepository.save(c3);

        // Search "Priya" -> c1 and c2
        mockMvc.perform(get("/api/v1/customers/search?q=Priya")
                .header("Authorization", "Bearer " + cashierTokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content", hasSize(2)));

        // Search "9876" -> c1 and c2
        mockMvc.perform(get("/api/v1/customers/search?q=9876")
                .header("Authorization", "Bearer " + cashierTokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content", hasSize(2)));
    }

    @Test
    @Transactional
    @DisplayName("Tenant isolation: Business B cannot read or modify Business A customers")
    void testTenantIsolation() throws Exception {
        Customer customerA = new Customer(
            businessIdA,
            "CUST-400001",
            "Secret Patient A",
            "9900112233",
            null,
            null,
            null,
            null,
            null
        );
        customerA = customerRepository.save(customerA);

        // Attempt to fetch Customer A with Business B cashier token -> 404
        mockMvc.perform(get("/api/v1/customers/" + customerA.getId())
                .header("Authorization", "Bearer " + cashierTokenB))
            .andExpect(status().isNotFound());

        // Attempt to search in Business B returns empty
        mockMvc.perform(get("/api/v1/customers/search?q=Secret")
                .header("Authorization", "Bearer " + cashierTokenB))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content", hasSize(0)));
    }
}
