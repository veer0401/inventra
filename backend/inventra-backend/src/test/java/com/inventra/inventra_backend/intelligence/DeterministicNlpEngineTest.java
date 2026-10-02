package com.inventra.inventra_backend.intelligence;

import static org.assertj.core.api.Assertions.assertThat;

import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.ProductQueryCondition;
import com.inventra.inventra_backend.catalog.domain.model.ProductQueryField;
import com.inventra.inventra_backend.catalog.domain.model.QueryOperator;
import com.inventra.inventra_backend.intelligence.domain.model.IntentResult;
import com.inventra.inventra_backend.intelligence.domain.model.IntentType;
import com.inventra.inventra_backend.intelligence.domain.service.DestinationRegistry;
import com.inventra.inventra_backend.intelligence.domain.service.DeterministicNlpEngine;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class DeterministicNlpEngineTest {

    private DeterministicNlpEngine engine;

    @BeforeEach
    void setUp() {
        DestinationRegistry registry = new DestinationRegistry();
        engine = new DeterministicNlpEngine(registry);
    }

    @Test
    @DisplayName("Should recognize NAVIGATE to INVENTORY with high confidence")
    void testNavigateInventory() {
        IntentResult res1 = engine.interpret("open inventory");
        assertThat(res1.intent()).isEqualTo(IntentType.NAVIGATE);
        assertThat(res1.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(res1.entities()).containsEntry("destination", "INVENTORY");
        assertThat(res1.engineVersion()).isEqualTo("1");

        IntentResult res2 = engine.interpret("show inventory");
        assertThat(res2.intent()).isEqualTo(IntentType.NAVIGATE);
        assertThat(res2.entities()).containsEntry("destination", "INVENTORY");

        IntentResult res3 = engine.interpret("go to inventory");
        assertThat(res3.intent()).isEqualTo(IntentType.NAVIGATE);
        assertThat(res3.entities()).containsEntry("destination", "INVENTORY");
    }

    @Test
    @DisplayName("Should recognize NAVIGATE to other registered destinations")
    void testNavigateOtherDestinations() {
        IntentResult customers = engine.interpret("open customers");
        assertThat(customers.intent()).isEqualTo(IntentType.NAVIGATE);
        assertThat(customers.entities()).containsEntry("destination", "CUSTOMERS");

        IntentResult purchasing = engine.interpret("go to purchasing");
        assertThat(purchasing.intent()).isEqualTo(IntentType.NAVIGATE);
        assertThat(purchasing.entities()).containsEntry("destination", "PURCHASING");

        IntentResult sales = engine.interpret("show sales");
        assertThat(sales.intent()).isEqualTo(IntentType.NAVIGATE);
        assertThat(sales.entities()).containsEntry("destination", "SALES");
    }

    @Test
    @DisplayName("Should recognize explicit product search")
    void testSearchProduct() {
        IntentResult res1 = engine.interpret("find paracetamol");
        assertThat(res1.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(res1.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(res1.entities()).containsEntry("query", "paracetamol");

        IntentResult res2 = engine.interpret("search paracetamol");
        assertThat(res2.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(res2.entities()).containsEntry("query", "paracetamol");

        IntentResult res3 = engine.interpret("look for paracetamol");
        assertThat(res3.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(res3.entities()).containsEntry("query", "paracetamol");

        IntentResult res4 = engine.interpret("find medicine amoxicillin");
        assertThat(res4.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(res4.entities()).containsEntry("query", "amoxicillin");
    }

    @Test
    @DisplayName("Should recognize product search with case-insensitivity and natural language prefixes")
    void testProductSearchCaseInsensitivityAndPrefixes() {
        // Case-insensitivity
        for (String input : List.of("find medicine_1", "find Medicine_1", "find MEDICINE_1", "find MeDiCiNe_1")) {
            IntentResult res = engine.interpret(input);
            assertThat(res.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
            assertThat(res.confidence()).isGreaterThanOrEqualTo(0.95);
            assertThat(res.entities()).containsEntry("query", "medicine_1");
        }

        // Natural-language prefixes
        for (String input : List.of("search medicine_1", "search for medicine_1", "look for medicine_1", "find product medicine_1")) {
            IntentResult res = engine.interpret(input);
            assertThat(res.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
            assertThat(res.confidence()).isGreaterThanOrEqualTo(0.95);
            assertThat(res.entities()).containsEntry("query", "medicine_1");
        }

        // Partial matching / category query
        IntentResult resCategory = engine.interpret("find medicine");
        assertThat(resCategory.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(resCategory.entities()).containsEntry("query", "medicine");

        // Identifier preservation: underscores, hyphens, dots, digits must NOT be stripped or replaced with spaces
        IntentResult resUnderscore = engine.interpret("find medicine_1");
        assertThat(resUnderscore.entities().get("query")).isEqualTo("medicine_1");

        IntentResult resHyphen = engine.interpret("find product-123");
        assertThat(resHyphen.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(resHyphen.entities().get("query")).isEqualTo("product-123");
    }

    @Test
    @DisplayName("Plain product search compatibility: find Dolo, find medicine_1, etc.")
    void testPlainProductSearchCompatibility() {
        for (String input : List.of("find medicine_1", "find Medicine_1")) {
            IntentResult res = engine.interpret(input);
            assertThat(res.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
            assertThat(res.confidence()).isGreaterThanOrEqualTo(0.95);
            assertThat(res.entities()).containsEntry("query", "medicine_1");
            assertThat(res.productConditions()).isEmpty();
        }

        IntentResult resMed = engine.interpret("find medicine");
        assertThat(resMed.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(resMed.entities()).containsEntry("query", "medicine");
        assertThat(resMed.productConditions()).isEmpty();

        IntentResult resDolo = engine.interpret("find Dolo");
        assertThat(resDolo.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(resDolo.entities()).containsEntry("query", "dolo");
        assertThat(resDolo.productConditions()).isEmpty();

        IntentResult resSearchMed = engine.interpret("search medicine");
        assertThat(resSearchMed.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(resSearchMed.entities()).containsEntry("query", "medicine");

        IntentResult resSearchFor = engine.interpret("search for medicine_1");
        assertThat(resSearchFor.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(resSearchFor.entities()).containsEntry("query", "medicine_1");
    }

    @Test
    @DisplayName("Structured PRICE conditions: explicit and implicit comparisons")
    void testPriceConditions() {
        // below 100 / under 100 / with price below 100 / where price is below 100
        for (String q : List.of(
            "find medicines below 100",
            "find medicines under 100",
            "find medicines with price below 100",
            "price below 100",
            "Show medicines where price is below 100",
            "Show medicines of price is below 100",
            "Show medicines price below 100"
        )) {
            IntentResult res = engine.interpret(q);
            assertThat(res.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
            assertThat(res.productConditions()).hasSize(1);
            ProductQueryCondition c = res.productConditions().get(0);
            assertThat(c.field()).isEqualTo(ProductQueryField.PRICE);
            assertThat(c.operator()).isEqualTo(QueryOperator.LESS_THAN);
            assertThat(c.value()).isEqualTo("100");
            assertThat(c.secondaryValue()).isNull();
            assertThat(c.unit()).isNull();
            assertThat(res.entities().get("query")).isNull();
        }

        // above 250 / greater than 250 / with price above 250 / price above 250
        for (String q : List.of("find medicines above 250", "find medicines greater than 250", "find medicines with price above 250", "price above 250")) {
            IntentResult res = engine.interpret(q);
            assertThat(res.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
            assertThat(res.productConditions()).hasSize(1);
            ProductQueryCondition c = res.productConditions().get(0);
            assertThat(c.field()).isEqualTo(ProductQueryField.PRICE);
            assertThat(c.operator()).isEqualTo(QueryOperator.GREATER_THAN);
            assertThat(c.value()).isEqualTo("250");
            assertThat(c.secondaryValue()).isNull();
        }

        // between 100 and 500 / with price between 100 and 500 / price between 100 and 500
        for (String q : List.of("find medicines between 100 and 500", "find medicines with price between 100 and 500", "price between 100 and 500")) {
            IntentResult res = engine.interpret(q);
            assertThat(res.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
            assertThat(res.productConditions()).hasSize(1);
            ProductQueryCondition c = res.productConditions().get(0);
            assertThat(c.field()).isEqualTo(ProductQueryField.PRICE);
            assertThat(c.operator()).isEqualTo(QueryOperator.BETWEEN);
            assertThat(c.value()).isEqualTo("100");
            assertThat(c.secondaryValue()).isEqualTo("500");
            assertThat(c.unit()).isNull();
        }

        // at least 250 -> GTE
        IntentResult resGte = engine.interpret("price at least 250");
        assertThat(resGte.productConditions()).hasSize(1);
        assertThat(resGte.productConditions().get(0).operator()).isEqualTo(QueryOperator.GREATER_THAN_OR_EQUAL);
        assertThat(resGte.productConditions().get(0).value()).isEqualTo("250");

        // at most 250 -> LTE
        IntentResult resLte = engine.interpret("price at most 250");
        assertThat(resLte.productConditions()).hasSize(1);
        assertThat(resLte.productConditions().get(0).operator()).isEqualTo(QueryOperator.LESS_THAN_OR_EQUAL);
        assertThat(resLte.productConditions().get(0).value()).isEqualTo("250");

        // equal to 250 / is 250 -> EQUALS
        for (String q : List.of("price equal to 250", "price is 250")) {
            IntentResult res = engine.interpret(q);
            assertThat(res.productConditions()).hasSize(1);
            assertThat(res.productConditions().get(0).operator()).isEqualTo(QueryOperator.EQUALS);
            assertThat(res.productConditions().get(0).value()).isEqualTo("250");
        }
    }

    @Test
    @DisplayName("Structured DOSAGE_FORM conditions: tablets, capsules, etc.")
    void testDosageFormConditions() {
        // tablets / tablet medicines
        for (String q : List.of("find tablets", "find tablet medicines")) {
            IntentResult res = engine.interpret(q);
            assertThat(res.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
            assertThat(res.productConditions()).hasSize(1);
            ProductQueryCondition c = res.productConditions().get(0);
            assertThat(c.field()).isEqualTo(ProductQueryField.DOSAGE_FORM);
            assertThat(c.operator()).isEqualTo(QueryOperator.EQUALS);
            assertThat(c.value()).isEqualTo(DosageForm.TABLET.name());
        }

        // capsules
        IntentResult resCap = engine.interpret("find capsules");
        assertThat(resCap.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(resCap.productConditions()).hasSize(1);
        assertThat(resCap.productConditions().get(0).field()).isEqualTo(ProductQueryField.DOSAGE_FORM);
        assertThat(resCap.productConditions().get(0).operator()).isEqualTo(QueryOperator.EQUALS);
        assertThat(resCap.productConditions().get(0).value()).isEqualTo(DosageForm.CAPSULE.name());
    }

    @Test
    @DisplayName("Structured STRENGTH conditions: above 10 mg, below 20 mg, between 10 mg and 20 mg")
    void testStrengthConditions() {
        // strength above 10 mg
        IntentResult resGt = engine.interpret("find medicines with strength above 10 mg");
        assertThat(resGt.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(resGt.productConditions()).hasSize(1);
        ProductQueryCondition cGt = resGt.productConditions().get(0);
        assertThat(cGt.field()).isEqualTo(ProductQueryField.STRENGTH);
        assertThat(cGt.operator()).isEqualTo(QueryOperator.GREATER_THAN);
        assertThat(cGt.value()).isEqualTo("10");
        assertThat(cGt.unit()).isEqualTo("mg");

        // strength below 20 mg
        IntentResult resLt = engine.interpret("find medicines with strength below 20 mg");
        assertThat(resLt.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(resLt.productConditions()).hasSize(1);
        ProductQueryCondition cLt = resLt.productConditions().get(0);
        assertThat(cLt.field()).isEqualTo(ProductQueryField.STRENGTH);
        assertThat(cLt.operator()).isEqualTo(QueryOperator.LESS_THAN);
        assertThat(cLt.value()).isEqualTo("20");
        assertThat(cLt.unit()).isEqualTo("mg");

        // strength between 10 mg and 20 mg
        IntentResult resBetween = engine.interpret("find medicines with strength between 10 mg and 20 mg");
        assertThat(resBetween.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(resBetween.productConditions()).hasSize(1);
        ProductQueryCondition cBetween = resBetween.productConditions().get(0);
        assertThat(cBetween.field()).isEqualTo(ProductQueryField.STRENGTH);
        assertThat(cBetween.operator()).isEqualTo(QueryOperator.BETWEEN);
        assertThat(cBetween.value()).isEqualTo("10");
        assertThat(cBetween.secondaryValue()).isEqualTo("20");
        assertThat(cBetween.unit()).isEqualTo("mg");

        // strength at least 10 mg
        IntentResult resGte = engine.interpret("strength at least 10 mg");
        assertThat(resGte.productConditions()).hasSize(1);
        assertThat(resGte.productConditions().get(0).operator()).isEqualTo(QueryOperator.GREATER_THAN_OR_EQUAL);
        assertThat(resGte.productConditions().get(0).value()).isEqualTo("10");
        assertThat(resGte.productConditions().get(0).unit()).isEqualTo("mg");

        // strength at most 20 mg
        IntentResult resLte = engine.interpret("strength at most 20 mg");
        assertThat(resLte.productConditions()).hasSize(1);
        assertThat(resLte.productConditions().get(0).operator()).isEqualTo(QueryOperator.LESS_THAN_OR_EQUAL);
        assertThat(resLte.productConditions().get(0).value()).isEqualTo("20");
        assertThat(resLte.productConditions().get(0).unit()).isEqualTo("mg");

        // strength equal to 10 mg
        IntentResult resEq = engine.interpret("strength equal to 10 mg");
        assertThat(resEq.productConditions()).hasSize(1);
        assertThat(resEq.productConditions().get(0).operator()).isEqualTo(QueryOperator.EQUALS);
        assertThat(resEq.productConditions().get(0).value()).isEqualTo("10");
        assertThat(resEq.productConditions().get(0).unit()).isEqualTo("mg");
    }

    @Test
    @DisplayName("Structured NAME conditions: starting with, ending with, containing (casing preserved)")
    void testNameConditions() {
        // starting with DOL
        IntentResult resStart = engine.interpret("find medicines starting with DOL");
        assertThat(resStart.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(resStart.productConditions()).hasSize(1);
        ProductQueryCondition cStart = resStart.productConditions().get(0);
        assertThat(cStart.field()).isEqualTo(ProductQueryField.NAME);
        assertThat(cStart.operator()).isEqualTo(QueryOperator.STARTS_WITH);
        assertThat(cStart.value()).isEqualTo("DOL");

        // ending with D
        IntentResult resEnd = engine.interpret("find medicines ending with D");
        assertThat(resEnd.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(resEnd.productConditions()).hasSize(1);
        ProductQueryCondition cEnd = resEnd.productConditions().get(0);
        assertThat(cEnd.field()).isEqualTo(ProductQueryField.NAME);
        assertThat(cEnd.operator()).isEqualTo(QueryOperator.ENDS_WITH);
        assertThat(cEnd.value()).isEqualTo("D");

        // containing Dolo
        IntentResult resContains = engine.interpret("find medicines containing Dolo");
        assertThat(resContains.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(resContains.productConditions()).hasSize(1);
        ProductQueryCondition cContains = resContains.productConditions().get(0);
        assertThat(cContains.field()).isEqualTo(ProductQueryField.NAME);
        assertThat(cContains.operator()).isEqualTo(QueryOperator.CONTAINS);
        assertThat(cContains.value()).isEqualTo("Dolo");
    }

    @Test
    @DisplayName("Multi-condition queries: exact condition count, types, values, and order")
    void testMultiConditionQueries() {
        // find tablets with price above 250
        IntentResult res2 = engine.interpret("find tablets with price above 250");
        assertThat(res2.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(res2.productConditions()).hasSize(2);
        assertThat(res2.productConditions().get(0).field()).isEqualTo(ProductQueryField.DOSAGE_FORM);
        assertThat(res2.productConditions().get(0).operator()).isEqualTo(QueryOperator.EQUALS);
        assertThat(res2.productConditions().get(0).value()).isEqualTo("TABLET");
        assertThat(res2.productConditions().get(1).field()).isEqualTo(ProductQueryField.PRICE);
        assertThat(res2.productConditions().get(1).operator()).isEqualTo(QueryOperator.GREATER_THAN);
        assertThat(res2.productConditions().get(1).value()).isEqualTo("250");

        // find tablets with price above 250 and strength above 10 mg
        IntentResult res3 = engine.interpret("find tablets with price above 250 and strength above 10 mg");
        assertThat(res3.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(res3.productConditions()).hasSize(3);
        assertThat(res3.productConditions().get(0).field()).isEqualTo(ProductQueryField.DOSAGE_FORM);
        assertThat(res3.productConditions().get(0).value()).isEqualTo("TABLET");
        assertThat(res3.productConditions().get(1).field()).isEqualTo(ProductQueryField.PRICE);
        assertThat(res3.productConditions().get(1).operator()).isEqualTo(QueryOperator.GREATER_THAN);
        assertThat(res3.productConditions().get(1).value()).isEqualTo("250");
        assertThat(res3.productConditions().get(2).field()).isEqualTo(ProductQueryField.STRENGTH);
        assertThat(res3.productConditions().get(2).operator()).isEqualTo(QueryOperator.GREATER_THAN);
        assertThat(res3.productConditions().get(2).value()).isEqualTo("10");
        assertThat(res3.productConditions().get(2).unit()).isEqualTo("mg");

        // find tablets starting with DOL and price above 250
        IntentResult resDol = engine.interpret("find tablets starting with DOL and price above 250");
        assertThat(resDol.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(resDol.productConditions()).hasSize(3);
        assertThat(resDol.productConditions().get(0).field()).isEqualTo(ProductQueryField.DOSAGE_FORM);
        assertThat(resDol.productConditions().get(0).value()).isEqualTo("TABLET");
        assertThat(resDol.productConditions().get(1).field()).isEqualTo(ProductQueryField.NAME);
        assertThat(resDol.productConditions().get(1).operator()).isEqualTo(QueryOperator.STARTS_WITH);
        assertThat(resDol.productConditions().get(1).value()).isEqualTo("DOL");
        assertThat(resDol.productConditions().get(2).field()).isEqualTo(ProductQueryField.PRICE);
        assertThat(resDol.productConditions().get(2).operator()).isEqualTo(QueryOperator.GREATER_THAN);
        assertThat(resDol.productConditions().get(2).value()).isEqualTo("250");
    }

    @Test
    @DisplayName("Mixed structured + free-text queries: preserves remaining query term")
    void testMixedStructuredAndFreeTextQueries() {
        // find dolo tablets with price above 250
        IntentResult resDoloTablets = engine.interpret("find dolo tablets with price above 250");
        assertThat(resDoloTablets.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(resDoloTablets.productConditions()).hasSize(2);
        assertThat(resDoloTablets.productConditions().get(0).field()).isEqualTo(ProductQueryField.DOSAGE_FORM);
        assertThat(resDoloTablets.productConditions().get(0).value()).isEqualTo("TABLET");
        assertThat(resDoloTablets.productConditions().get(1).field()).isEqualTo(ProductQueryField.PRICE);
        assertThat(resDoloTablets.productConditions().get(1).value()).isEqualTo("250");
        assertThat(resDoloTablets.entities()).containsEntry("query", "dolo");

        // find eye drops
        IntentResult resEyeDrops = engine.interpret("find eye drops");
        assertThat(resEyeDrops.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(resEyeDrops.productConditions()).hasSize(1);
        assertThat(resEyeDrops.productConditions().get(0).field()).isEqualTo(ProductQueryField.DOSAGE_FORM);
        assertThat(resEyeDrops.productConditions().get(0).value()).isEqualTo("DROPS");
        assertThat(resEyeDrops.entities()).containsEntry("query", "eye");
    }

    @Test
    @DisplayName("Invalid ranges: price or strength between lower and upper where lower > upper must return UNKNOWN")
    void testInvalidRanges() {
        IntentResult resPrice = engine.interpret("find medicines with price between 500 and 100");
        assertThat(resPrice.intent()).isEqualTo(IntentType.UNKNOWN);
        assertThat(resPrice.confidence()).isLessThan(DeterministicNlpEngine.MINIMUM_CONFIDENCE_THRESHOLD);
        assertThat(resPrice.explanation()).contains("Invalid query condition");

        IntentResult resStrength = engine.interpret("find medicines with strength between 20 mg and 10 mg");
        assertThat(resStrength.intent()).isEqualTo(IntentType.UNKNOWN);
        assertThat(resStrength.confidence()).isLessThan(DeterministicNlpEngine.MINIMUM_CONFIDENCE_THRESHOLD);
        assertThat(resStrength.explanation()).contains("Invalid query condition");
    }

    @Test
    @DisplayName("Clinical symptom and indication queries must return UNKNOWN without hardcoded mappings")
    void testUnsupportedClinicalQueries() {
        for (String query : List.of(
            "find medicines for headache",
            "find medicines for acidity",
            "find painkiller medicines",
            "find eye drops for allergy"
        )) {
            IntentResult res = engine.interpret(query);
            assertThat(res.intent()).isEqualTo(IntentType.UNKNOWN);
            assertThat(res.confidence()).isLessThan(DeterministicNlpEngine.MINIMUM_CONFIDENCE_THRESHOLD);
            assertThat(res.explanation()).contains("Clinical symptom and indication searching");
        }
    }

    @Test
    @DisplayName("Should recognize explicit customer search")
    void testSearchCustomer() {
        IntentResult res1 = engine.interpret("search customer Rahul");
        assertThat(res1.intent()).isEqualTo(IntentType.SEARCH_CUSTOMER);
        assertThat(res1.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(res1.entities()).containsEntry("query", "rahul");

        IntentResult res2 = engine.interpret("find customer Rahul");
        assertThat(res2.intent()).isEqualTo(IntentType.SEARCH_CUSTOMER);
        assertThat(res2.entities()).containsEntry("query", "rahul");

        IntentResult res3 = engine.interpret("show customer Rahul");
        assertThat(res3.intent()).isEqualTo(IntentType.SEARCH_CUSTOMER);
        assertThat(res3.entities()).containsEntry("query", "rahul");

        IntentResult res4 = engine.interpret("search for customer Rahul");
        assertThat(res4.intent()).isEqualTo(IntentType.SEARCH_CUSTOMER);
        assertThat(res4.entities()).containsEntry("query", "rahul");
    }

    @Test
    @DisplayName("Ambiguous queries like 'find Rahul' must NOT guess SEARCH_CUSTOMER and return UNKNOWN with suggestions")
    void testAmbiguousSearchDoesNotGuess() {
        for (String input : List.of("find Rahul", "search Rahul", "search for Rahul", "look for Rahul")) {
            IntentResult res = engine.interpret(input);
            assertThat(res.intent()).isEqualTo(IntentType.UNKNOWN);
            assertThat(res.confidence()).isLessThan(0.70);
            assertThat(res.suggestions()).isNotEmpty();
            assertThat(res.explanation()).contains("Ambiguous search query");
        }
    }

    @Test
    @DisplayName("Should recognize LOW_STOCK queries")
    void testLowStock() {
        IntentResult res1 = engine.interpret("show low stock");
        assertThat(res1.intent()).isEqualTo(IntentType.LOW_STOCK);
        assertThat(res1.confidence()).isGreaterThanOrEqualTo(0.95);

        IntentResult res2 = engine.interpret("show low stock medicines");
        assertThat(res2.intent()).isEqualTo(IntentType.LOW_STOCK);
        assertThat(res2.entities()).containsEntry("itemType", "MEDICINE");

        IntentResult res3 = engine.interpret("which medicines are running low");
        assertThat(res3.intent()).isEqualTo(IntentType.LOW_STOCK);

        IntentResult res4 = engine.interpret("what is low in inventory");
        assertThat(res4.intent()).isEqualTo(IntentType.LOW_STOCK);

        IntentResult res5 = engine.interpret("low stock");
        assertThat(res5.intent()).isEqualTo(IntentType.LOW_STOCK);
        assertThat(res5.confidence()).isGreaterThanOrEqualTo(0.95);

        IntentResult res6 = engine.interpret("what items are running low");
        assertThat(res6.intent()).isEqualTo(IntentType.LOW_STOCK);
        assertThat(res6.entities()).containsEntry("itemType", "ITEM");

        IntentResult res7 = engine.interpret("which products are low on stock");
        assertThat(res7.intent()).isEqualTo(IntentType.LOW_STOCK);
        assertThat(res7.entities()).containsEntry("itemType", "PRODUCT");
    }

    @Test
    @DisplayName("Should recognize EXPIRING_BATCHES queries")
    void testExpiringBatches() {
        // Explicit canonical queries required for Phase 4B
        List<String> canonicalQueries = List.of(
            "show expiring batches",
            "which batches are expiring",
            "show batches expiring soon",
            "what medicines are expiring",
            "which products are expiring",
            "which products are about to expire",
            "show me expiring batches",
            "show expiring medicines",
            "which medicines are expiring"
        );

        for (String query : canonicalQueries) {
            IntentResult res = engine.interpret(query);
            assertThat(res.intent())
                .withFailMessage("Expected EXPIRING_BATCHES for query: %s", query)
                .isEqualTo(IntentType.EXPIRING_BATCHES);
            assertThat(res.confidence())
                .withFailMessage("Expected confidence >= 0.95 for query: %s", query)
                .isGreaterThanOrEqualTo(0.95);
        }

        IntentResult soonRes = engine.interpret("show batches expiring soon");
        assertThat(soonRes.entities()).containsEntry("timeframe", "SOON");

        IntentResult productRes = engine.interpret("which products are expiring");
        assertThat(productRes.entities()).containsEntry("itemType", "PRODUCT");

        IntentResult aboutToRes = engine.interpret("which products are about to expire");
        assertThat(aboutToRes.entities()).containsEntry("timeframe", "SOON");
    }

    @Test
    @DisplayName("Should recognize SALES_SUMMARY queries")
    void testSalesSummary() {
        IntentResult res1 = engine.interpret("show today's sales");
        assertThat(res1.intent()).isEqualTo(IntentType.SALES_SUMMARY);
        assertThat(res1.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(res1.entities()).containsEntry("dateContext", "TODAY");

        IntentResult res2 = engine.interpret("how much did we sell today");
        assertThat(res2.intent()).isEqualTo(IntentType.SALES_SUMMARY);
        assertThat(res2.entities()).containsEntry("dateContext", "TODAY");

        IntentResult res3 = engine.interpret("today's sales");
        assertThat(res3.intent()).isEqualTo(IntentType.SALES_SUMMARY);

        IntentResult res4 = engine.interpret("today sales");
        assertThat(res4.intent()).isEqualTo(IntentType.SALES_SUMMARY);
    }

    @Test
    @DisplayName("Should recognize genuine HELP requests")
    void testHelpIntent() {
        IntentResult res1 = engine.interpret("help");
        assertThat(res1.intent()).isEqualTo(IntentType.HELP);
        assertThat(res1.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(res1.suggestions()).isNotEmpty();

        IntentResult res2 = engine.interpret("what can i do");
        assertThat(res2.intent()).isEqualTo(IntentType.HELP);

        IntentResult res3 = engine.interpret("commands");
        assertThat(res3.intent()).isEqualTo(IntentType.HELP);
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "asdfgh something",
        "xyz random gibberish 123",
        "make me a coffee",
        "delete all databases"
    })
    @DisplayName("Unrecognized or gibberish input should return UNKNOWN with suggestions and confidence < 0.70")
    void testUnknownQueries(String input) {
        IntentResult res = engine.interpret(input);
        assertThat(res.intent()).isEqualTo(IntentType.UNKNOWN);
        assertThat(res.confidence()).isLessThan(DeterministicNlpEngine.MINIMUM_CONFIDENCE_THRESHOLD);
        assertThat(res.suggestions()).isNotEmpty();
    }

    @Test
    @DisplayName("Should normalize input case, extra whitespace, and punctuation")
    void testNormalization() {
        IntentResult res = engine.interpret("   SHOW    LOW   STOCK   MEDICINES???   ");
        assertThat(res.intent()).isEqualTo(IntentType.LOW_STOCK);
        assertThat(res.normalizedText()).isEqualTo("show low stock medicines");
        assertThat(res.confidence()).isGreaterThanOrEqualTo(0.95);
    }

    @Test
    @DisplayName("Final Regression Check: all 31 cases for Step 2A")
    void testAll31RegressionCases() {
        // PLAIN PRODUCT SEARCH
        // 1. find medicine_1
        IntentResult c1 = engine.interpret("find medicine_1");
        assertThat(c1.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c1.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c1.productConditions()).isEmpty();
        assertThat(c1.entities()).containsEntry("query", "medicine_1");

        // 2. find Medicine_1
        IntentResult c2 = engine.interpret("find Medicine_1");
        assertThat(c2.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c2.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c2.productConditions()).isEmpty();
        assertThat(c2.entities()).containsEntry("query", "medicine_1");

        // 3. find medicine
        IntentResult c3 = engine.interpret("find medicine");
        assertThat(c3.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c3.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c3.productConditions()).isEmpty();
        assertThat(c3.entities()).containsEntry("query", "medicine");

        // 4. find Dolo
        IntentResult c4 = engine.interpret("find Dolo");
        assertThat(c4.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c4.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c4.productConditions()).isEmpty();
        assertThat(c4.entities()).containsEntry("query", "dolo");

        // 5. search for medicine_1
        IntentResult c5 = engine.interpret("search for medicine_1");
        assertThat(c5.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c5.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c5.productConditions()).isEmpty();
        assertThat(c5.entities()).containsEntry("query", "medicine_1");

        // DOSAGE FORM
        // 6. find tablets
        IntentResult c6 = engine.interpret("find tablets");
        assertThat(c6.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c6.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c6.productConditions()).hasSize(1);
        assertThat(c6.productConditions().get(0).field()).isEqualTo(ProductQueryField.DOSAGE_FORM);
        assertThat(c6.productConditions().get(0).operator()).isEqualTo(QueryOperator.EQUALS);
        assertThat(c6.productConditions().get(0).value()).isEqualTo("TABLET");
        assertThat(c6.entities().get("query")).isNull();

        // 7. find tablet medicines
        IntentResult c7 = engine.interpret("find tablet medicines");
        assertThat(c7.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c7.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c7.productConditions()).hasSize(1);
        assertThat(c7.productConditions().get(0).field()).isEqualTo(ProductQueryField.DOSAGE_FORM);
        assertThat(c7.productConditions().get(0).operator()).isEqualTo(QueryOperator.EQUALS);
        assertThat(c7.productConditions().get(0).value()).isEqualTo("TABLET");
        assertThat(c7.entities().get("query")).isNull();

        // 8. find capsules
        IntentResult c8 = engine.interpret("find capsules");
        assertThat(c8.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c8.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c8.productConditions()).hasSize(1);
        assertThat(c8.productConditions().get(0).field()).isEqualTo(ProductQueryField.DOSAGE_FORM);
        assertThat(c8.productConditions().get(0).operator()).isEqualTo(QueryOperator.EQUALS);
        assertThat(c8.productConditions().get(0).value()).isEqualTo("CAPSULE");
        assertThat(c8.entities().get("query")).isNull();

        // 9. find syrup
        IntentResult c9 = engine.interpret("find syrup");
        assertThat(c9.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c9.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c9.productConditions()).hasSize(1);
        assertThat(c9.productConditions().get(0).field()).isEqualTo(ProductQueryField.DOSAGE_FORM);
        assertThat(c9.productConditions().get(0).operator()).isEqualTo(QueryOperator.EQUALS);
        assertThat(c9.productConditions().get(0).value()).isEqualTo("SYRUP");
        assertThat(c9.entities().get("query")).isNull();

        // 10. find eye drops
        IntentResult c10 = engine.interpret("find eye drops");
        assertThat(c10.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c10.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c10.productConditions()).hasSize(1);
        assertThat(c10.productConditions().get(0).field()).isEqualTo(ProductQueryField.DOSAGE_FORM);
        assertThat(c10.productConditions().get(0).operator()).isEqualTo(QueryOperator.EQUALS);
        assertThat(c10.productConditions().get(0).value()).isEqualTo("DROPS");
        assertThat(c10.entities().get("query")).isEqualTo("eye");

        // PRICE
        // 11. find medicines below 100
        IntentResult c11 = engine.interpret("find medicines below 100");
        assertThat(c11.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c11.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c11.productConditions()).hasSize(1);
        assertThat(c11.productConditions().get(0).field()).isEqualTo(ProductQueryField.PRICE);
        assertThat(c11.productConditions().get(0).operator()).isEqualTo(QueryOperator.LESS_THAN);
        assertThat(c11.productConditions().get(0).value()).isEqualTo("100");
        assertThat(c11.entities().get("query")).isNull();

        // 12. find medicines under 100
        IntentResult c12 = engine.interpret("find medicines under 100");
        assertThat(c12.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c12.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c12.productConditions()).hasSize(1);
        assertThat(c12.productConditions().get(0).field()).isEqualTo(ProductQueryField.PRICE);
        assertThat(c12.productConditions().get(0).operator()).isEqualTo(QueryOperator.LESS_THAN);
        assertThat(c12.productConditions().get(0).value()).isEqualTo("100");
        assertThat(c12.entities().get("query")).isNull();

        // 13. find medicines above 250
        IntentResult c13 = engine.interpret("find medicines above 250");
        assertThat(c13.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c13.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c13.productConditions()).hasSize(1);
        assertThat(c13.productConditions().get(0).field()).isEqualTo(ProductQueryField.PRICE);
        assertThat(c13.productConditions().get(0).operator()).isEqualTo(QueryOperator.GREATER_THAN);
        assertThat(c13.productConditions().get(0).value()).isEqualTo("250");
        assertThat(c13.entities().get("query")).isNull();

        // 14. find medicines greater than 250
        IntentResult c14 = engine.interpret("find medicines greater than 250");
        assertThat(c14.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c14.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c14.productConditions()).hasSize(1);
        assertThat(c14.productConditions().get(0).field()).isEqualTo(ProductQueryField.PRICE);
        assertThat(c14.productConditions().get(0).operator()).isEqualTo(QueryOperator.GREATER_THAN);
        assertThat(c14.productConditions().get(0).value()).isEqualTo("250");
        assertThat(c14.entities().get("query")).isNull();

        // 15. find medicines with price below 100
        IntentResult c15 = engine.interpret("find medicines with price below 100");
        assertThat(c15.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c15.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c15.productConditions()).hasSize(1);
        assertThat(c15.productConditions().get(0).field()).isEqualTo(ProductQueryField.PRICE);
        assertThat(c15.productConditions().get(0).operator()).isEqualTo(QueryOperator.LESS_THAN);
        assertThat(c15.productConditions().get(0).value()).isEqualTo("100");
        assertThat(c15.entities().get("query")).isNull();

        // 16. find medicines where price is below 100
        IntentResult c16 = engine.interpret("find medicines where price is below 100");
        assertThat(c16.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c16.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c16.productConditions()).hasSize(1);
        assertThat(c16.productConditions().get(0).field()).isEqualTo(ProductQueryField.PRICE);
        assertThat(c16.productConditions().get(0).operator()).isEqualTo(QueryOperator.LESS_THAN);
        assertThat(c16.productConditions().get(0).value()).isEqualTo("100");
        assertThat(c16.entities().get("query")).isNull();

        // 17. find medicines of price is below 100
        IntentResult c17 = engine.interpret("find medicines of price is below 100");
        assertThat(c17.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c17.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c17.productConditions()).hasSize(1);
        assertThat(c17.productConditions().get(0).field()).isEqualTo(ProductQueryField.PRICE);
        assertThat(c17.productConditions().get(0).operator()).isEqualTo(QueryOperator.LESS_THAN);
        assertThat(c17.productConditions().get(0).value()).isEqualTo("100");
        assertThat(c17.entities().get("query")).isNull();

        // 18. find medicines between 100 and 500
        IntentResult c18 = engine.interpret("find medicines between 100 and 500");
        assertThat(c18.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c18.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c18.productConditions()).hasSize(1);
        assertThat(c18.productConditions().get(0).field()).isEqualTo(ProductQueryField.PRICE);
        assertThat(c18.productConditions().get(0).operator()).isEqualTo(QueryOperator.BETWEEN);
        assertThat(c18.productConditions().get(0).value()).isEqualTo("100");
        assertThat(c18.productConditions().get(0).secondaryValue()).isEqualTo("500");
        assertThat(c18.entities().get("query")).isNull();

        // 19. find medicines with price between 100 and 500
        IntentResult c19 = engine.interpret("find medicines with price between 100 and 500");
        assertThat(c19.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c19.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c19.productConditions()).hasSize(1);
        assertThat(c19.productConditions().get(0).field()).isEqualTo(ProductQueryField.PRICE);
        assertThat(c19.productConditions().get(0).operator()).isEqualTo(QueryOperator.BETWEEN);
        assertThat(c19.productConditions().get(0).value()).isEqualTo("100");
        assertThat(c19.productConditions().get(0).secondaryValue()).isEqualTo("500");
        assertThat(c19.entities().get("query")).isNull();

        // STRENGTH
        // 20. find medicines with strength above 10 mg
        IntentResult c20 = engine.interpret("find medicines with strength above 10 mg");
        assertThat(c20.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c20.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c20.productConditions()).hasSize(1);
        assertThat(c20.productConditions().get(0).field()).isEqualTo(ProductQueryField.STRENGTH);
        assertThat(c20.productConditions().get(0).operator()).isEqualTo(QueryOperator.GREATER_THAN);
        assertThat(c20.productConditions().get(0).value()).isEqualTo("10");
        assertThat(c20.productConditions().get(0).unit()).isEqualTo("mg");
        assertThat(c20.entities().get("query")).isNull();

        // 21. find medicines with strength below 20 mg
        IntentResult c21 = engine.interpret("find medicines with strength below 20 mg");
        assertThat(c21.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c21.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c21.productConditions()).hasSize(1);
        assertThat(c21.productConditions().get(0).field()).isEqualTo(ProductQueryField.STRENGTH);
        assertThat(c21.productConditions().get(0).operator()).isEqualTo(QueryOperator.LESS_THAN);
        assertThat(c21.productConditions().get(0).value()).isEqualTo("20");
        assertThat(c21.productConditions().get(0).unit()).isEqualTo("mg");
        assertThat(c21.entities().get("query")).isNull();

        // 22. find medicines with strength between 10 mg and 20 mg
        IntentResult c22 = engine.interpret("find medicines with strength between 10 mg and 20 mg");
        assertThat(c22.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c22.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c22.productConditions()).hasSize(1);
        assertThat(c22.productConditions().get(0).field()).isEqualTo(ProductQueryField.STRENGTH);
        assertThat(c22.productConditions().get(0).operator()).isEqualTo(QueryOperator.BETWEEN);
        assertThat(c22.productConditions().get(0).value()).isEqualTo("10");
        assertThat(c22.productConditions().get(0).secondaryValue()).isEqualTo("20");
        assertThat(c22.productConditions().get(0).unit()).isEqualTo("mg");
        assertThat(c22.entities().get("query")).isNull();

        // COMBINATIONS
        // 23. find tablets with price above 250
        IntentResult c23 = engine.interpret("find tablets with price above 250");
        assertThat(c23.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c23.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c23.productConditions()).hasSize(2);
        assertThat(c23.productConditions().get(0).field()).isEqualTo(ProductQueryField.DOSAGE_FORM);
        assertThat(c23.productConditions().get(0).operator()).isEqualTo(QueryOperator.EQUALS);
        assertThat(c23.productConditions().get(0).value()).isEqualTo("TABLET");
        assertThat(c23.productConditions().get(1).field()).isEqualTo(ProductQueryField.PRICE);
        assertThat(c23.productConditions().get(1).operator()).isEqualTo(QueryOperator.GREATER_THAN);
        assertThat(c23.productConditions().get(1).value()).isEqualTo("250");
        assertThat(c23.entities().get("query")).isNull();

        // 24. find tablets with price above 250 and strength above 10 mg
        IntentResult c24 = engine.interpret("find tablets with price above 250 and strength above 10 mg");
        assertThat(c24.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c24.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c24.productConditions()).hasSize(3);
        assertThat(c24.productConditions().get(0).field()).isEqualTo(ProductQueryField.DOSAGE_FORM);
        assertThat(c24.productConditions().get(0).value()).isEqualTo("TABLET");
        assertThat(c24.productConditions().get(1).field()).isEqualTo(ProductQueryField.PRICE);
        assertThat(c24.productConditions().get(1).operator()).isEqualTo(QueryOperator.GREATER_THAN);
        assertThat(c24.productConditions().get(1).value()).isEqualTo("250");
        assertThat(c24.productConditions().get(2).field()).isEqualTo(ProductQueryField.STRENGTH);
        assertThat(c24.productConditions().get(2).operator()).isEqualTo(QueryOperator.GREATER_THAN);
        assertThat(c24.productConditions().get(2).value()).isEqualTo("10");
        assertThat(c24.productConditions().get(2).unit()).isEqualTo("mg");
        assertThat(c24.entities().get("query")).isNull();

        // 25. find tablets starting with DOL and price above 250
        IntentResult c25 = engine.interpret("find tablets starting with DOL and price above 250");
        assertThat(c25.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c25.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c25.productConditions()).hasSize(3);
        assertThat(c25.productConditions().get(0).field()).isEqualTo(ProductQueryField.DOSAGE_FORM);
        assertThat(c25.productConditions().get(0).value()).isEqualTo("TABLET");
        assertThat(c25.productConditions().get(1).field()).isEqualTo(ProductQueryField.NAME);
        assertThat(c25.productConditions().get(1).operator()).isEqualTo(QueryOperator.STARTS_WITH);
        assertThat(c25.productConditions().get(1).value()).isEqualTo("DOL");
        assertThat(c25.productConditions().get(2).field()).isEqualTo(ProductQueryField.PRICE);
        assertThat(c25.productConditions().get(2).operator()).isEqualTo(QueryOperator.GREATER_THAN);
        assertThat(c25.productConditions().get(2).value()).isEqualTo("250");
        assertThat(c25.entities().get("query")).isNull();

        // 26. find dolo tablets with price above 250
        IntentResult c26 = engine.interpret("find dolo tablets with price above 250");
        assertThat(c26.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c26.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c26.productConditions()).hasSize(2);
        assertThat(c26.productConditions().get(0).field()).isEqualTo(ProductQueryField.DOSAGE_FORM);
        assertThat(c26.productConditions().get(0).value()).isEqualTo("TABLET");
        assertThat(c26.productConditions().get(1).field()).isEqualTo(ProductQueryField.PRICE);
        assertThat(c26.productConditions().get(1).operator()).isEqualTo(QueryOperator.GREATER_THAN);
        assertThat(c26.productConditions().get(1).value()).isEqualTo("250");
        assertThat(c26.entities()).containsEntry("query", "dolo");

        // NAME
        // 27. find medicines starting with DOL
        IntentResult c27 = engine.interpret("find medicines starting with DOL");
        assertThat(c27.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c27.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c27.productConditions()).hasSize(1);
        assertThat(c27.productConditions().get(0).field()).isEqualTo(ProductQueryField.NAME);
        assertThat(c27.productConditions().get(0).operator()).isEqualTo(QueryOperator.STARTS_WITH);
        assertThat(c27.productConditions().get(0).value()).isEqualTo("DOL");
        assertThat(c27.entities().get("query")).isNull();

        // 28. find medicines ending with D
        IntentResult c28 = engine.interpret("find medicines ending with D");
        assertThat(c28.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c28.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c28.productConditions()).hasSize(1);
        assertThat(c28.productConditions().get(0).field()).isEqualTo(ProductQueryField.NAME);
        assertThat(c28.productConditions().get(0).operator()).isEqualTo(QueryOperator.ENDS_WITH);
        assertThat(c28.productConditions().get(0).value()).isEqualTo("D");
        assertThat(c28.entities().get("query")).isNull();

        // 29. find medicines containing Dolo
        IntentResult c29 = engine.interpret("find medicines containing Dolo");
        assertThat(c29.intent()).isEqualTo(IntentType.SEARCH_PRODUCT);
        assertThat(c29.confidence()).isGreaterThanOrEqualTo(0.95);
        assertThat(c29.productConditions()).hasSize(1);
        assertThat(c29.productConditions().get(0).field()).isEqualTo(ProductQueryField.NAME);
        assertThat(c29.productConditions().get(0).operator()).isEqualTo(QueryOperator.CONTAINS);
        assertThat(c29.productConditions().get(0).value()).isEqualTo("Dolo");
        assertThat(c29.entities().get("query")).isNull();

        // AMBIGUITY
        // 30. find Rahul
        IntentResult c30 = engine.interpret("find Rahul");
        assertThat(c30.intent()).isEqualTo(IntentType.UNKNOWN);
        assertThat(c30.confidence()).isLessThan(0.70);
        assertThat(c30.productConditions()).isEmpty();

        // INVALID RANGE
        // 31. find medicines with price between 500 and 100
        IntentResult c31 = engine.interpret("find medicines with price between 500 and 100");
        assertThat(c31.intent()).isEqualTo(IntentType.UNKNOWN);
        assertThat(c31.confidence()).isLessThan(0.70);
        assertThat(c31.productConditions()).isEmpty();
    }
}
