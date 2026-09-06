package com.inventra.inventra_backend.catalog.application;

import com.inventra.inventra_backend.catalog.api.dto.CreateGlobalMedicineRequest;
import com.inventra.inventra_backend.catalog.api.dto.CreateProductRequest;
import com.inventra.inventra_backend.catalog.api.dto.GlobalMedicineResponse;
import com.inventra.inventra_backend.catalog.api.dto.GlobalMedicineSuggestionResponse;
import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.GlobalMedicine;
import com.inventra.inventra_backend.catalog.domain.model.GlobalMedicineStatus;
import com.inventra.inventra_backend.catalog.domain.model.GlobalMedicineSuggestion;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.model.SuggestionStatus;
import com.inventra.inventra_backend.catalog.domain.repository.GlobalMedicineRepository;
import com.inventra.inventra_backend.catalog.domain.repository.GlobalMedicineSuggestionRepository;
import com.inventra.inventra_backend.catalog.domain.repository.ProductRepository;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GlobalMedicineServiceTest {

    @Mock
    private GlobalMedicineRepository globalMedicineRepository;

    @Mock
    private GlobalMedicineSuggestionRepository suggestionRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private BusinessRepository businessRepository;

    @Mock
    private com.inventra.inventra_backend.catalog.domain.repository.ProductIdentifierRepository productIdentifierRepository;

    @Mock
    private com.inventra.inventra_backend.sync.infrastructure.ChangeFeedPublisher changeFeedPublisher;

    private GlobalMedicineService globalMedicineService;

    @BeforeEach
    void setUp() {
        globalMedicineService = new GlobalMedicineService(
            globalMedicineRepository,
            suggestionRepository,
            productRepository,
            businessRepository,
            productIdentifierRepository,
            changeFeedPublisher
        );
    }

    @Test
    @DisplayName("Should create GlobalMedicine successfully")
    void testCreateGlobalMedicine() {
        CreateGlobalMedicineRequest request = new CreateGlobalMedicineRequest(
            "Paracetamol 500mg",
            "Paracetamol",
            "Calpol",
            "GSK",
            DosageForm.TABLET,
            "500mg",
            "Tablet",
            "Strip of 10",
            10,
            "30049060",
            new BigDecimal("12.00"),
            false,
            "Analgesic",
            "123456789",
            "Fever relief"
        );

        when(globalMedicineRepository.save(any(GlobalMedicine.class))).thenAnswer(invocation -> invocation.getArgument(0));

        GlobalMedicineResponse response = globalMedicineService.createGlobalMedicine(request);

        assertThat(response).isNotNull();
        assertThat(response.name()).isEqualTo("Paracetamol 500mg");
        assertThat(response.genericName()).isEqualTo("Paracetamol");
        assertThat(response.status()).isEqualTo(GlobalMedicineStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should silently record product suggestion when owner creates custom product")
    void testRecordSilentSuggestion() {
        UUID businessId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();
        CreateProductRequest request = new CreateProductRequest(
            null,
            null, // globalProductId is null
            "Custom Herbal Tonic",
            "Ayurvedic Herbal Blend",
            "HerbCare",
            "Herbal Labs",
            DosageForm.SYRUP,
            "200ml",
            "Bottle",
            "Bottle",
            1,
            "30049011",
            new BigDecimal("5.00"),
            true,
            false,
            null
        );

        globalMedicineService.recordSilentSuggestion(businessId, productId, request);

        ArgumentCaptor<GlobalMedicineSuggestion> captor = ArgumentCaptor.forClass(GlobalMedicineSuggestion.class);
        verify(suggestionRepository).save(captor.capture());

        GlobalMedicineSuggestion captured = captor.getValue();
        assertThat(captured.getBusinessId()).isEqualTo(businessId);
        assertThat(captured.getProductId()).isEqualTo(productId);
        assertThat(captured.getName()).isEqualTo("Custom Herbal Tonic");
        assertThat(captured.getStatus()).isEqualTo(SuggestionStatus.PENDING);
    }

    @Test
    @DisplayName("Should approve suggestion, create global medicine, and link back store product")
    void testApproveSuggestion() {
        UUID suggestionId = UUID.randomUUID();
        UUID businessId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();

        GlobalMedicineSuggestion suggestion = new GlobalMedicineSuggestion(
            businessId,
            productId,
            "Azithral 250",
            "Azithromycin",
            "Azithral",
            "Alembic",
            DosageForm.TABLET,
            "250mg",
            "Tablet",
            "Strip of 6",
            6,
            "30042099",
            new BigDecimal("12.00"),
            true
        );

        Product storeProduct = new Product(
            businessId,
            null,
            null,
            "Azithral 250",
            "Azithromycin",
            "Azithral",
            "Alembic",
            DosageForm.TABLET,
            "250mg",
            "Tablet",
            "Strip of 6",
            6,
            "30042099",
            new BigDecimal("12.00"),
            true,
            true
        );

        Business business = Business.create("Alembic Store Pvt Ltd", "Alembic Store", "DL-1234", "29ABCDE1234F1Z5");

        when(suggestionRepository.findById(suggestionId)).thenReturn(Optional.of(suggestion));
        when(globalMedicineRepository.save(any(GlobalMedicine.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(suggestionRepository.save(any(GlobalMedicineSuggestion.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(productRepository.findByIdAndBusinessId(productId, businessId)).thenReturn(Optional.of(storeProduct));
        when(businessRepository.findById(businessId)).thenReturn(Optional.of(business));

        GlobalMedicineSuggestionResponse response = globalMedicineService.approveSuggestion(suggestionId, adminId, "Approved for global master");

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo(SuggestionStatus.APPROVED);
        assertThat(storeProduct.getGlobalProductId()).isNotNull();
        verify(productRepository).save(storeProduct);
    }

    @Test
    @DisplayName("Should 1-click quick import global medicine to store catalog")
    void testQuickImportToStore() {
        UUID businessId = UUID.randomUUID();
        UUID globalMedId = UUID.randomUUID();

        GlobalMedicine globalMed = new GlobalMedicine(
            "Dolo 650",
            "Paracetamol",
            "Dolo",
            "Micro Labs",
            DosageForm.TABLET,
            "650mg",
            "Tablet",
            "Strip of 15",
            15,
            "30049060",
            new BigDecimal("12.00"),
            false,
            "Analgesic",
            "8901148210012",
            "Fever and pain"
        );

        when(globalMedicineRepository.findById(globalMedId)).thenReturn(Optional.of(globalMed));
        when(productRepository.findByBusinessIdAndGlobalProductId(businessId, globalMedId)).thenReturn(Optional.empty());
        when(productRepository.findByBusinessIdAndNameIgnoreCase(businessId, "Dolo 650")).thenReturn(Optional.empty());
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.inventra.inventra_backend.catalog.api.dto.ProductResponse response =
            globalMedicineService.quickImportToStore(businessId, globalMedId);

        assertThat(response).isNotNull();
        assertThat(response.name()).isEqualTo("Dolo 650");
        assertThat(response.globalProductId()).isEqualTo(globalMed.getId());
        assertThat(response.taxRate()).isEqualByComparingTo("12.00");
        verify(changeFeedPublisher).publish(any(), any(), any(), any(), any(), any(int.class), any());
    }

    @Test
    @DisplayName("Should parse and bulk import global medicines from CSV")
    void testImportFromCsv() {
        String csv = """
            Name,Generic Name,Brand Name,Manufacturer,Dosage Form,Strength,Base Unit,Selling Unit,Units Per Selling Unit,HSN Code,Tax Rate,Prescription Required
            Cetirizine 10mg,Cetirizine,Cetzine,Dr Reddys,TABLET,10mg,Tablet,Strip of 10,10,30049099,12.00,false
            Amox 500,Amoxicillin,Mox,Ranbaxy,CAPSULE,500mg,Capsule,Strip of 10,10,30041000,12.00,true
            """;

        when(globalMedicineRepository.findByNameIgnoreCase("Cetirizine 10mg")).thenReturn(Optional.empty());
        when(globalMedicineRepository.findByNameIgnoreCase("Amox 500")).thenReturn(Optional.empty());
        when(globalMedicineRepository.save(any(GlobalMedicine.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.inventra.inventra_backend.catalog.api.dto.GlobalMedicineCsvImportResult result =
            globalMedicineService.importFromCsv(new java.io.ByteArrayInputStream(csv.getBytes(java.nio.charset.StandardCharsets.UTF_8)));

        assertThat(result.totalRows()).isEqualTo(2);
        assertThat(result.createdCount()).isEqualTo(2);
        assertThat(result.failedCount()).isEqualTo(0);
    }
}
