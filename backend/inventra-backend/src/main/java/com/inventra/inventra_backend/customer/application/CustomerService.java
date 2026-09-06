package com.inventra.inventra_backend.customer.application;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.customer.api.dto.CreateCustomerRequest;
import com.inventra.inventra_backend.customer.api.dto.CustomerResponse;
import com.inventra.inventra_backend.customer.api.dto.CustomerStatisticsResponse;
import com.inventra.inventra_backend.customer.api.dto.CustomerSummaryResponse;
import com.inventra.inventra_backend.customer.api.dto.UpdateCustomerRequest;
import com.inventra.inventra_backend.customer.domain.model.Customer;
import com.inventra.inventra_backend.customer.domain.model.CustomerStatus;
import com.inventra.inventra_backend.customer.domain.repository.CustomerRepository;
import com.inventra.inventra_backend.identity.application.SecurityAuditService;
import com.inventra.inventra_backend.identity.domain.model.SecurityAuditEventType;
import com.inventra.inventra_backend.sales.api.dto.SaleRefundResponse;
import com.inventra.inventra_backend.sales.api.dto.SaleResponse;
import com.inventra.inventra_backend.sales.api.dto.SaleReturnLineBatchAllocationResponse;
import com.inventra.inventra_backend.sales.api.dto.SaleReturnLineResponse;
import com.inventra.inventra_backend.sales.api.dto.SaleReturnResponse;
import com.inventra.inventra_backend.sales.domain.model.Sale;
import com.inventra.inventra_backend.sales.domain.model.SaleReturn;
import com.inventra.inventra_backend.sales.domain.repository.SaleLineBatchAllocationRepository;
import com.inventra.inventra_backend.sales.domain.repository.SaleLineRepository;
import com.inventra.inventra_backend.sales.domain.repository.SalePaymentRepository;
import com.inventra.inventra_backend.sales.domain.repository.SaleRefundRepository;
import com.inventra.inventra_backend.sales.domain.repository.SaleRepository;
import com.inventra.inventra_backend.sales.domain.repository.SaleReturnLineBatchAllocationRepository;
import com.inventra.inventra_backend.sales.domain.repository.SaleReturnLineRepository;
import com.inventra.inventra_backend.sales.domain.repository.SaleReturnRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import com.inventra.inventra_backend.sync.domain.model.SyncChangeOperation;
import com.inventra.inventra_backend.sync.infrastructure.ChangeFeedPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final SaleRepository saleRepository;
    private final SaleLineRepository saleLineRepository;
    private final SalePaymentRepository salePaymentRepository;
    private final SaleReturnRepository saleReturnRepository;
    private final SaleReturnLineRepository saleReturnLineRepository;
    private final SaleReturnLineBatchAllocationRepository saleReturnLineBatchAllocationRepository;
    private final SaleRefundRepository saleRefundRepository;
    private final SecurityAuditService securityAuditService;
    private final ChangeFeedPublisher changeFeedPublisher;

    public CustomerService(
        CustomerRepository customerRepository,
        SaleRepository saleRepository,
        SaleLineRepository saleLineRepository,
        SalePaymentRepository salePaymentRepository,
        SaleReturnRepository saleReturnRepository,
        SaleReturnLineRepository saleReturnLineRepository,
        SaleReturnLineBatchAllocationRepository saleReturnLineBatchAllocationRepository,
        SaleRefundRepository saleRefundRepository,
        SecurityAuditService securityAuditService,
        ChangeFeedPublisher changeFeedPublisher
    ) {
        this.customerRepository = customerRepository;
        this.saleRepository = saleRepository;
        this.saleLineRepository = saleLineRepository;
        this.salePaymentRepository = salePaymentRepository;
        this.saleReturnRepository = saleReturnRepository;
        this.saleReturnLineRepository = saleReturnLineRepository;
        this.saleReturnLineBatchAllocationRepository = saleReturnLineBatchAllocationRepository;
        this.saleRefundRepository = saleRefundRepository;
        this.securityAuditService = securityAuditService;
        this.changeFeedPublisher = changeFeedPublisher;
    }

    @Transactional
    public CustomerResponse createCustomer(UUID businessId, UUID userId, CreateCustomerRequest request) {
        String code = request.customerCode();
        if (code != null && !code.isBlank()) {
            code = code.trim().toUpperCase();
            if (customerRepository.existsByBusinessIdAndCustomerCodeIgnoreCase(businessId, code)) {
                throw new BusinessRuleViolationException(
                    "CUSTOMER_ALREADY_EXISTS",
                    "Customer with code " + code + " already exists"
                );
            }
        } else {
            long count = customerRepository.countByBusinessId(businessId);
            long candidateIndex = count + 1;
            do {
                code = String.format("CUST-%06d", candidateIndex++);
            } while (customerRepository.existsByBusinessIdAndCustomerCodeIgnoreCase(businessId, code));
        }

        Customer customer = new Customer(
            businessId,
            code,
            request.fullName(),
            request.phone(),
            request.email(),
            request.address(),
            request.gstin(),
            request.notes(),
            userId
        );

        Customer saved = customerRepository.save(customer);

        securityAuditService.recordEvent(
            userId,
            businessId,
            null,
            SecurityAuditEventType.CUSTOMER_CREATED,
            null,
            null,
            "Created customer " + saved.getCustomerCode() + " (" + saved.getFullName() + ")"
        );

        CustomerResponse response = CustomerResponse.from(saved, CustomerStatisticsResponse.empty());
        changeFeedPublisher.publish(businessId, null, "CUSTOMER", saved.getId(), SyncChangeOperation.UPSERT, 1, response);

        return response;
    }

    @Transactional
    public CustomerResponse updateCustomer(UUID businessId, UUID customerId, UUID userId, UpdateCustomerRequest request) {
        Customer customer = customerRepository.findByIdAndBusinessId(customerId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Customer", customerId));

        customer.update(
            request.fullName(),
            request.phone(),
            request.email(),
            request.address(),
            request.gstin(),
            request.notes(),
            request.status()
        );

        Customer saved = customerRepository.save(customer);

        securityAuditService.recordEvent(
            userId,
            businessId,
            null,
            SecurityAuditEventType.CUSTOMER_UPDATED,
            null,
            null,
            "Updated customer " + saved.getCustomerCode() + " (" + saved.getFullName() + ")"
        );

        CustomerStatisticsResponse stats = calculateStatistics(businessId, customerId);
        CustomerResponse response = CustomerResponse.from(saved, stats);
        changeFeedPublisher.publish(businessId, null, "CUSTOMER", saved.getId(), SyncChangeOperation.UPSERT, 1, response);

        return response;
    }

    @Transactional(readOnly = true)
    public CustomerResponse getCustomer(UUID businessId, UUID customerId) {
        Customer customer = customerRepository.findByIdAndBusinessId(customerId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Customer", customerId));

        CustomerStatisticsResponse stats = calculateStatistics(businessId, customerId);
        return CustomerResponse.from(customer, stats);
    }

    @Transactional(readOnly = true)
    public Page<CustomerSummaryResponse> searchCustomers(
        UUID businessId,
        String query,
        CustomerStatus status,
        Pageable pageable
    ) {
        if (query == null || query.isBlank()) {
            return customerRepository.findAllByBusinessIdAndStatus(businessId, status, pageable)
                .map(CustomerSummaryResponse::from);
        }
        return customerRepository.searchCustomers(businessId, query.trim(), status, pageable)
            .map(CustomerSummaryResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<CustomerSummaryResponse> quickSearchActiveCustomers(
        UUID businessId,
        String query,
        Pageable pageable
    ) {
        String normalizedQuery = (query != null && !query.isBlank()) ? query.trim() : "";
        return customerRepository.quickSearchActiveCustomers(businessId, normalizedQuery, pageable)
            .map(CustomerSummaryResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<SaleResponse> getCustomerSales(UUID businessId, UUID customerId, Pageable pageable) {
        if (!customerRepository.existsById(customerId)) {
            throw ResourceNotFoundException.forResource("Customer", customerId);
        }

        Page<Sale> sales = saleRepository.findByBusinessIdAndCustomerId(businessId, customerId, pageable);
        return sales.map(sale -> {
            var lines = saleLineRepository.findBySaleIdAndBusinessIdOrderByLineNumberAsc(sale.getId(), businessId).stream()
                .map(line -> com.inventra.inventra_backend.sales.api.dto.SaleLineResponse.from(line, List.of()))
                .toList();
            var payments = salePaymentRepository.findBySaleIdAndBusinessId(sale.getId(), businessId).stream()
                .map(com.inventra.inventra_backend.sales.api.dto.SalePaymentResponse::from)
                .toList();
            return SaleResponse.from(sale, lines, payments);
        });
    }

    @Transactional(readOnly = true)
    public Page<SaleReturnResponse> getCustomerReturns(UUID businessId, UUID customerId, Pageable pageable) {
        if (!customerRepository.existsById(customerId)) {
            throw ResourceNotFoundException.forResource("Customer", customerId);
        }

        Page<SaleReturn> returns = saleReturnRepository.findByBusinessIdAndCustomerId(businessId, customerId, pageable);
        return returns.map(ret -> buildSaleReturnResponse(businessId, ret));
    }

    private CustomerStatisticsResponse calculateStatistics(UUID businessId, UUID customerId) {
        List<Object[]> saleStats = saleRepository.getCustomerSaleStatistics(businessId, customerId);
        long totalSalesCount = 0L;
        BigDecimal totalSpendAmount = BigDecimal.ZERO;
        LocalDate lastPurchaseDate = null;

        if (saleStats != null && !saleStats.isEmpty() && saleStats.get(0) != null) {
            Object[] row = saleStats.get(0);
            if (row[0] != null) totalSalesCount = ((Number) row[0]).longValue();
            if (row[1] != null) totalSpendAmount = new BigDecimal(row[1].toString());
            if (row[2] != null) lastPurchaseDate = (LocalDate) row[2];
        }

        List<Object[]> returnStats = saleReturnRepository.getCustomerReturnStatistics(businessId, customerId);
        long totalReturnsCount = 0L;
        BigDecimal totalRefundAmount = BigDecimal.ZERO;

        if (returnStats != null && !returnStats.isEmpty() && returnStats.get(0) != null) {
            Object[] row = returnStats.get(0);
            if (row[0] != null) totalReturnsCount = ((Number) row[0]).longValue();
            if (row[1] != null) totalRefundAmount = new BigDecimal(row[1].toString());
        }

        return new CustomerStatisticsResponse(
            totalSalesCount,
            totalSpendAmount,
            totalReturnsCount,
            totalRefundAmount,
            lastPurchaseDate
        );
    }

    private SaleReturnResponse buildSaleReturnResponse(UUID businessId, SaleReturn ret) {
        var lines = saleReturnLineRepository.findBySaleReturnIdAndBusinessIdOrderByLineNumberAsc(ret.getId(), businessId).stream()
            .map(line -> {
                var allocs = saleReturnLineBatchAllocationRepository.findBySaleReturnLineIdAndBusinessId(line.getId(), businessId).stream()
                    .map(SaleReturnLineBatchAllocationResponse::from)
                    .toList();
                return SaleReturnLineResponse.from(line, allocs);
            })
            .toList();

        var refunds = saleRefundRepository.findBySaleReturnIdAndBusinessId(ret.getId(), businessId).stream()
            .map(SaleRefundResponse::from)
            .toList();

        return SaleReturnResponse.from(ret, lines, refunds);
    }
}
