package com.inventra.inventra_backend.intelligence.domain.service;

import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.ProductQueryCondition;
import com.inventra.inventra_backend.catalog.domain.model.ProductQueryField;
import com.inventra.inventra_backend.catalog.domain.model.QueryOperator;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.intelligence.domain.model.IntentResult;
import com.inventra.inventra_backend.intelligence.domain.model.IntentType;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Foundational deterministic NLP and intent recognition engine for Inventra.
 * Strictly local and deterministic: no external LLM or API dependencies.
 */
@Component
public class DeterministicNlpEngine {

    public static final double MINIMUM_CONFIDENCE_THRESHOLD = 0.70;

    private static final List<String> STANDARD_SUGGESTIONS = List.of(
        "Show low stock medicines",
        "Search customer Rahul (e.g. 'search customer Rahul')",
        "Open inventory",
        "Show today's sales",
        "Which medicines are expiring"
    );

    // Common medicine terms used for disambiguating explicit product queries vs arbitrary text
    private static final Set<String> COMMON_MEDICINE_TERMS = Set.of(
        "paracetamol", "amoxicillin", "ibuprofen", "aspirin", "metformin",
        "atorvastatin", "omeprazole", "cetirizine", "azithromycin", "pantoprazole",
        "dolo", "crocin", "augmentin", "combiflam"
    );

    private final DestinationRegistry destinationRegistry;

    public DeterministicNlpEngine(DestinationRegistry destinationRegistry) {
        this.destinationRegistry = destinationRegistry;
    }

    /**
     * Interprets natural language input into a structured IntentResult.
     */
    public IntentResult interpret(String text) {
        if (text == null || text.trim().isEmpty()) {
            return IntentResult.unknown(text, "", "Input text is empty", STANDARD_SUGGESTIONS);
        }

        String originalText = text;
        String normalized = normalize(text);

        if (normalized.isEmpty()) {
            return IntentResult.unknown(originalText, normalized, "Normalized text is empty", STANDARD_SUGGESTIONS);
        }

        // 1. Check for genuine HELP requests
        IntentResult helpResult = checkHelpIntent(originalText, normalized);
        if (helpResult != null) {
            return helpResult;
        }

        // 2. Check for SALES_SUMMARY intent
        IntentResult salesResult = checkSalesSummaryIntent(originalText, normalized);
        if (salesResult != null) {
            return salesResult;
        }

        // 3. Check for LOW_STOCK intent
        IntentResult lowStockResult = checkLowStockIntent(originalText, normalized);
        if (lowStockResult != null) {
            return lowStockResult;
        }

        // 4. Check for EXPIRING_BATCHES intent
        IntentResult expiringResult = checkExpiringBatchesIntent(originalText, normalized);
        if (expiringResult != null) {
            return expiringResult;
        }

        // 5. Check for explicit SEARCH_CUSTOMER intent (must include customer keywords)
        IntentResult customerSearchResult = checkCustomerSearchIntent(originalText, normalized);
        if (customerSearchResult != null) {
            return customerSearchResult;
        }

        // 6. Check for SEARCH_PRODUCT intent
        IntentResult productSearchResult = checkProductSearchIntent(originalText, normalized);
        if (productSearchResult != null) {
            return productSearchResult;
        }

        // 7. Check for ambiguous search (e.g. "find Rahul", "search xyz" without customer/product indicator)
        IntentResult ambiguousResult = checkAmbiguousSearch(originalText, normalized);
        if (ambiguousResult != null) {
            return ambiguousResult;
        }

        // 8. Check for NAVIGATE intent via central DestinationRegistry
        IntentResult navigateResult = checkNavigateIntent(originalText, normalized);
        if (navigateResult != null) {
            return navigateResult;
        }

        // 9. Fallback to UNKNOWN with guidance suggestions
        return IntentResult.unknown(originalText, normalized, "No matching intent rule found", STANDARD_SUGGESTIONS);
    }

    /**
     * Normalizes input text: lowercase, strip punctuation, collapse whitespace.
     */
    public String normalize(String text) {
        if (text == null) return "";
        // Replace smart quotes/apostrophes with standard apostrophe
        String s = text.replace('’', '\'').replace('‘', '\'');
        // Replace punctuation (except dots/underscores/hyphens/slashes in words like 0.5mg or medicine_1)
        s = s.replaceAll("[?!;:\"()\\[\\]{}]", " ");
        // Strip sentence-ending or whitespace-adjacent period, but preserve decimal dots like 0.5mg or A.1
        s = s.replaceAll("\\.(?=\\s|$)", " ");
        // Lowercase
        s = s.toLowerCase(Locale.ROOT);
        // Collapse spaces
        s = s.replaceAll("\\s+", " ").trim();
        return s;
    }

    // --- Intent Matchers ---

    private IntentResult checkHelpIntent(String original, String norm) {
        if (norm.equals("help") ||
            norm.equals("what can i do") ||
            norm.equals("what can you do") ||
            norm.equals("how to use") ||
            norm.equals("commands") ||
            norm.equals("show commands") ||
            norm.equals("available commands")) {
            return new IntentResult(
                IntentType.HELP,
                0.99,
                Collections.emptyMap(),
                original,
                norm,
                "Matched genuine help request",
                STANDARD_SUGGESTIONS,
                IntentResult.CURRENT_ENGINE_VERSION
            );
        }
        return null;
    }

    private IntentResult checkSalesSummaryIntent(String original, String norm) {
        boolean isToday = norm.contains("today") || norm.contains("today's") || norm.contains("todays");
        boolean isSales = norm.contains("sale") || norm.contains("sales") || norm.contains("sell") || norm.contains("revenue");

        if (isToday && isSales) {
            double conf = (norm.equals("show today's sales") || norm.equals("show todays sales") ||
                           norm.equals("today's sales") || norm.equals("todays sales") ||
                           norm.equals("how much did we sell today") || norm.equals("sales today")) ? 0.98 : 0.92;

            Map<String, Object> entities = Map.of("dateContext", "TODAY");
            return new IntentResult(
                IntentType.SALES_SUMMARY,
                conf,
                entities,
                original,
                norm,
                "Matched sales summary rule for date context TODAY",
                Collections.emptyList(),
                IntentResult.CURRENT_ENGINE_VERSION
            );
        }
        return null;
    }

    private IntentResult checkLowStockIntent(String original, String norm) {
        // e.g. "show low stock", "low stock", "show low stock medicines", "which medicines are running low", "which products are low on stock", "what items are running low"
        Pattern p1 = Pattern.compile("^(?:show|display|get|list|tell\\s+me)?\\s*(?:me)?\\s*low\\s*stock(?:\\s+(medicines|products|items))?$");
        Pattern p2 = Pattern.compile("^(?:which|what)\\s+(medicines|products|items)?\\s*(?:are|is)?\\s*(?:running\\s+low|low\\s+(?:in|on)?\\s*stock|low\\s+in\\s+inventory).*$");
        Pattern p3 = Pattern.compile("^what\\s+(?:items|products|medicines)?\\s*(?:are|is)?\\s*low\\s+in\\s+(?:inventory|stock).*$");

        Matcher m1 = p1.matcher(norm);
        Matcher m2 = p2.matcher(norm);
        Matcher m3 = p3.matcher(norm);

        if (m1.matches() || m2.matches() || m3.matches() || norm.contains("low stock") || norm.contains("low on stock") || norm.contains("running low")) {
            String itemType = "MEDICINE";
            if (norm.contains("product")) {
                itemType = "PRODUCT";
            } else if (norm.contains("item")) {
                itemType = "ITEM";
            }

            double conf = 0.95;
            if (norm.equals("show low stock") || norm.equals("low stock") || norm.equals("show low stock medicines") ||
                norm.equals("which medicines are running low") || norm.equals("which products are low on stock") ||
                norm.equals("what items are running low") || norm.equals("what is low in inventory")) {
                conf = 0.98;
            }

            Map<String, Object> entities = Map.of("itemType", itemType);
            return new IntentResult(
                IntentType.LOW_STOCK,
                conf,
                entities,
                original,
                norm,
                "Matched low stock inventory rule",
                Collections.emptyList(),
                IntentResult.CURRENT_ENGINE_VERSION
            );
        }
        return null;
    }

    private IntentResult checkExpiringBatchesIntent(String original, String norm) {
        // e.g. "show expiring batches", "which batches are expiring", "show batches expiring soon", "what medicines are expiring", "which products are about to expire"
        boolean hasExpiring = norm.contains("expir") || norm.contains("expiry");
        boolean hasBatchesOrMed = norm.contains("batch") || norm.contains("medicine") || norm.contains("item") || norm.contains("product");

        if (hasExpiring && (hasBatchesOrMed || norm.contains("soon"))) {
            Map<String, Object> entities = new LinkedHashMap<>();
            String itemType = "BATCH";
            if (norm.contains("medicine")) {
                itemType = "MEDICINE";
            } else if (norm.contains("product")) {
                itemType = "PRODUCT";
            } else if (norm.contains("item")) {
                itemType = "ITEM";
            }
            entities.put("itemType", itemType);
            if (norm.contains("soon") || norm.contains("about to")) {
                entities.put("timeframe", "SOON");
            }

            double conf = 0.95;
            if (norm.equals("show expiring batches") || norm.equals("which batches are expiring") ||
                norm.equals("what medicines are expiring") || norm.equals("show batches expiring soon") ||
                norm.equals("which products are about to expire") || norm.equals("which products are expiring") ||
                norm.equals("show me expiring batches") || norm.equals("expiring batches") ||
                norm.equals("show expiring medicines") || norm.equals("which medicines are expiring")) {
                conf = 0.98;
            }

            return new IntentResult(
                IntentType.EXPIRING_BATCHES,
                conf,
                entities,
                original,
                norm,
                "Matched expiring batches/medicines rule",
                Collections.emptyList(),
                IntentResult.CURRENT_ENGINE_VERSION
            );
        }
        return null;
    }

    private IntentResult checkCustomerSearchIntent(String original, String norm) {
        // Must explicitly indicate a customer search (e.g. "search customer Rahul", "search for customer Rahul", "find customer Rahul", "show customer Rahul")
        Pattern p = Pattern.compile("^(?:search\\s+for|search|find|show|lookup|look\\s+for|get)\\s+(?:the\\s+)?(?:customer|customers|patient|patients|client|clients)\\s+(.+)$");
        Matcher m = p.matcher(norm);
        if (m.matches()) {
            String query = m.group(1).trim();
            if (!query.isEmpty()) {
                Map<String, Object> entities = Map.of("query", query);
                return new IntentResult(
                    IntentType.SEARCH_CUSTOMER,
                    0.97,
                    entities,
                    original,
                    norm,
                    "Matched explicit customer search rule",
                    Collections.emptyList(),
                    IntentResult.CURRENT_ENGINE_VERSION
                );
            }
        }
        return null;
    }

    private static final Pattern UNSUPPORTED_CLINICAL_PATTERN = Pattern.compile(
        "\\b(?:for\\s+(?:headache|acidity|fever|cough|cold|pain|allergy|allergies|infection|diabetes|hypertension|blood\\s+pressure)|painkiller|painkillers|pain\\s+killer)\\b",
        Pattern.CASE_INSENSITIVE
    );

    private static final Pattern DOSAGE_FORM_PATTERN = Pattern.compile(
        "\\b(?:in\\s+)?(tablet|tablets|capsule|capsules|syrup|syrups|injection|injections|ointment|ointments|drop|drops|powder|powders|device|devices)(?:\\s+form)?\\b",
        Pattern.CASE_INSENSITIVE
    );

    private static final Pattern NAME_STARTS_WITH_PATTERN = Pattern.compile(
        "\\b(?:(?:name|product|products|medicine|medicines|drug|drugs)\\s+)?(?:starting\\s+with|starts\\s+with)\\s+([a-zA-Z0-9_\\-\\.\\/]+)\\b",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern NAME_ENDS_WITH_PATTERN = Pattern.compile(
        "\\b(?:(?:name|product|products|medicine|medicines|drug|drugs)\\s+)?(?:ending\\s+with|ends\\s+with)\\s+([a-zA-Z0-9_\\-\\.\\/]+)\\b",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern NAME_CONTAINS_PATTERN = Pattern.compile(
        "\\b(?:(?:name|product|products|medicine|medicines|drug|drugs)\\s+)?(?:containing|contains)\\s+([a-zA-Z0-9_\\-\\.\\/]+)\\b",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern NAME_EQUALS_PATTERN = Pattern.compile(
        "\\bname\\s*(?:is|=|equal(?:s|\\s+to)?)\\s+([a-zA-Z0-9_\\-\\.\\/]+)\\b",
        Pattern.CASE_INSENSITIVE
    );

    private static final String PRICE_PREFIX = "(?:(?:where|whose|with|of)?\\s*(?:price|cost|rate)\\s*(?:is|of|to|being|=|:)?\\s*)?";
    private static final String STRENGTH_PREFIX = "(?:(?:where|whose|with|of)?\\s*strength\\s*(?:is|of|to|being|=|:)?\\s*)?";

    private static final Pattern STRENGTH_BETWEEN_PATTERN = Pattern.compile(
        "\\b" + STRENGTH_PREFIX + "between\\s+(\\d+(?:\\.\\d+)?)\\s*(?:mg|ml|mcg|g|%)?\\s*(?:and|-)\\s*(\\d+(?:\\.\\d+)?)\\s*(mg|ml|mcg|g|%)\\b",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern STRENGTH_GTE_PATTERN = Pattern.compile(
        "\\b" + STRENGTH_PREFIX + "(?:at\\s+least|greater\\s+than\\s+or\\s+equal\\s+to|>=)\\s*(\\d+(?:\\.\\d+)?)\\s*(mg|ml|mcg|g|%)\\b",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern STRENGTH_LTE_PATTERN = Pattern.compile(
        "\\b" + STRENGTH_PREFIX + "(?:at\\s+most|less\\s+than\\s+or\\s+equal\\s+to|<=)\\s*(\\d+(?:\\.\\d+)?)\\s*(mg|ml|mcg|g|%)\\b",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern STRENGTH_GT_PATTERN = Pattern.compile(
        "\\b" + STRENGTH_PREFIX + "(?:above|over|greater\\s+than|>)\\s*(\\d+(?:\\.\\d+)?)\\s*(mg|ml|mcg|g|%)\\b",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern STRENGTH_LT_PATTERN = Pattern.compile(
        "\\b" + STRENGTH_PREFIX + "(?:below|under|less\\s+than|<)\\s*(\\d+(?:\\.\\d+)?)\\s*(mg|ml|mcg|g|%)\\b",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern STRENGTH_EQ_PATTERN = Pattern.compile(
        "\\b(?:(?:where|whose|with|of)?\\s*)?strength\\s*(?:is|=|equal(?:s|\\s+to)?|\\s+)\\s*(\\d+(?:\\.\\d+)?)\\s*(mg|ml|mcg|g|%)\\b",
        Pattern.CASE_INSENSITIVE
    );

    private static final Pattern PRICE_BETWEEN_PATTERN = Pattern.compile(
        "\\b" + PRICE_PREFIX + "between\\s+(\\d+(?:\\.\\d+)?)\\s+(?:and|-)\\s+(\\d+(?:\\.\\d+)?)(?!\\s*(?:mg|ml|mcg|g|%|iu|\\bmg\\b|\\bml\\b))\\b",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern PRICE_GTE_PATTERN = Pattern.compile(
        "\\b" + PRICE_PREFIX + "(?:at\\s+least|greater\\s+than\\s+or\\s+equal\\s+to|>=)\\s*(\\d+(?:\\.\\d+)?)(?!\\s*(?:mg|ml|mcg|g|%|iu|\\bmg\\b|\\bml\\b))\\b",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern PRICE_LTE_PATTERN = Pattern.compile(
        "\\b" + PRICE_PREFIX + "(?:at\\s+most|less\\s+than\\s+or\\s+equal\\s+to|<=)\\s*(\\d+(?:\\.\\d+)?)(?!\\s*(?:mg|ml|mcg|g|%|iu|\\bmg\\b|\\bml\\b))\\b",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern PRICE_GT_PATTERN = Pattern.compile(
        "\\b" + PRICE_PREFIX + "(?:above|over|greater\\s+than|>)\\s*(\\d+(?:\\.\\d+)?)(?!\\s*(?:mg|ml|mcg|g|%|iu|\\bmg\\b|\\bml\\b))\\b",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern PRICE_LT_PATTERN = Pattern.compile(
        "\\b" + PRICE_PREFIX + "(?:below|under|less\\s+than|<)\\s*(\\d+(?:\\.\\d+)?)(?!\\s*(?:mg|ml|mcg|g|%|iu|\\bmg\\b|\\bml\\b))\\b",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern PRICE_EQ_PATTERN = Pattern.compile(
        "\\b(?:(?:where|whose|with|of)?\\s*)?(?:price|cost|rate)\\s*(?:is|=|equal(?:s|\\s+to)?|\\s+)\\s*(\\d+(?:\\.\\d+)?)(?!\\s*(?:mg|ml|mcg|g|%|iu|\\bmg\\b|\\bml\\b))\\b",
        Pattern.CASE_INSENSITIVE
    );

    private static final Set<String> SEARCH_NOISE_WORDS = Set.of(
        "find", "search", "lookup", "look", "for", "get", "show", "list", "filter",
        "the", "a", "an", "all", "with", "and", "having", "where", "whose", "which", "that",
        "have", "has", "had", "in", "of", "is", "are", "was", "were", "be", "being",
        "form", "medicine", "medicines", "product", "products", "drug", "drugs", "item", "items",
        "price", "cost", "rate", "strength", "quantity", "stock"
    );

    private record ConditionSpan(
        int start,
        int end,
        ProductQueryCondition condition,
        int priority
    ) {}

    private IntentResult checkProductSearchIntent(String original, String norm) {
        // 1. Clinical / symptom search guard
        if (UNSUPPORTED_CLINICAL_PATTERN.matcher(norm).find()) {
            return IntentResult.unknown(
                original,
                norm,
                "Clinical symptom and indication searching (e.g. for headache, painkiller, acidity, allergy) is not supported by the current product catalog.",
                STANDARD_SUGGESTIONS
            );
        }

        // 2. Structured query conditions
        IntentResult structuredResult = parseStructuredProductQuery(original, norm);
        if (structuredResult != null) {
            return structuredResult;
        }

        // 3. Explicit product category prefixes (e.g. "find medicine paracetamol", "search product medicine_1", "find product amoxicillin", "search for medicine crocin")
        Pattern explicitProductPattern = Pattern.compile("^(?:search\\s+for|search|find|lookup|look\\s+for|get|show)\\s+(?:the\\s+)?(?:medicine|medicines|product|products|drug|drugs|item|items|tablet|tablets)\\s+(.+)$");
        Matcher explicitMatcher = explicitProductPattern.matcher(norm);
        if (explicitMatcher.matches()) {
            String query = explicitMatcher.group(1).trim();
            if (!query.isEmpty()) {
                Map<String, Object> entities = Map.of("query", query);
                return new IntentResult(
                    IntentType.SEARCH_PRODUCT,
                    0.97,
                    entities,
                    original,
                    norm,
                    "Matched explicit medicine/product search rule",
                    Collections.emptyList(),
                    IntentResult.CURRENT_ENGINE_VERSION
                );
            }
        }

        // 4. Direct pattern with recognized product term or identifier
        // e.g. "find medicine_1", "search medicine_1", "look for medicine_1", "search for medicine_1", "find medicine", "find paracetamol", "find dolo"
        Pattern directPattern = Pattern.compile("^(?:search\\s+for|search|find|lookup|look\\s+for|get)\\s+(.+)$");
        Matcher directMatcher = directPattern.matcher(norm);
        if (directMatcher.matches()) {
            String candidate = directMatcher.group(1).trim();
            if (isRecognizedProductTerm(candidate)) {
                Map<String, Object> entities = Map.of("query", candidate);
                return new IntentResult(
                    IntentType.SEARCH_PRODUCT,
                    0.96,
                    entities,
                    original,
                    norm,
                    "Matched product search rule for recognized product term or identifier",
                    Collections.emptyList(),
                    IntentResult.CURRENT_ENGINE_VERSION
                );
            }
        }

        return null;
    }

    private IntentResult parseStructuredProductQuery(String original, String norm) {
        List<ConditionSpan> candidateSpans = new ArrayList<>();

        try {
            // Strength Between
            Matcher m = STRENGTH_BETWEEN_PATTERN.matcher(original);
            while (m.find()) {
                String val = m.group(1);
                String secVal = m.group(2);
                String unit = m.group(3).toLowerCase(Locale.ROOT);
                ProductQueryCondition cond = new ProductQueryCondition(
                    ProductQueryField.STRENGTH, QueryOperator.BETWEEN, val, secVal, unit
                );
                candidateSpans.add(new ConditionSpan(m.start(), m.end(), cond, 3));
            }

            // Strength GTE
            m = STRENGTH_GTE_PATTERN.matcher(original);
            while (m.find()) {
                String val = m.group(1);
                String unit = m.group(2).toLowerCase(Locale.ROOT);
                ProductQueryCondition cond = new ProductQueryCondition(
                    ProductQueryField.STRENGTH, QueryOperator.GREATER_THAN_OR_EQUAL, val, null, unit
                );
                candidateSpans.add(new ConditionSpan(m.start(), m.end(), cond, 2));
            }

            // Strength LTE
            m = STRENGTH_LTE_PATTERN.matcher(original);
            while (m.find()) {
                String val = m.group(1);
                String unit = m.group(2).toLowerCase(Locale.ROOT);
                ProductQueryCondition cond = new ProductQueryCondition(
                    ProductQueryField.STRENGTH, QueryOperator.LESS_THAN_OR_EQUAL, val, null, unit
                );
                candidateSpans.add(new ConditionSpan(m.start(), m.end(), cond, 2));
            }

            // Strength GT
            m = STRENGTH_GT_PATTERN.matcher(original);
            while (m.find()) {
                String val = m.group(1);
                String unit = m.group(2).toLowerCase(Locale.ROOT);
                ProductQueryCondition cond = new ProductQueryCondition(
                    ProductQueryField.STRENGTH, QueryOperator.GREATER_THAN, val, null, unit
                );
                candidateSpans.add(new ConditionSpan(m.start(), m.end(), cond, 1));
            }

            // Strength LT
            m = STRENGTH_LT_PATTERN.matcher(original);
            while (m.find()) {
                String val = m.group(1);
                String unit = m.group(2).toLowerCase(Locale.ROOT);
                ProductQueryCondition cond = new ProductQueryCondition(
                    ProductQueryField.STRENGTH, QueryOperator.LESS_THAN, val, null, unit
                );
                candidateSpans.add(new ConditionSpan(m.start(), m.end(), cond, 1));
            }

            // Strength EQ
            m = STRENGTH_EQ_PATTERN.matcher(original);
            while (m.find()) {
                String val = m.group(1);
                String unit = m.group(2).toLowerCase(Locale.ROOT);
                ProductQueryCondition cond = new ProductQueryCondition(
                    ProductQueryField.STRENGTH, QueryOperator.EQUALS, val, null, unit
                );
                candidateSpans.add(new ConditionSpan(m.start(), m.end(), cond, 2));
            }

            // Price Between
            m = PRICE_BETWEEN_PATTERN.matcher(original);
            while (m.find()) {
                String val = m.group(1);
                String secVal = m.group(2);
                ProductQueryCondition cond = new ProductQueryCondition(
                    ProductQueryField.PRICE, QueryOperator.BETWEEN, val, secVal, null
                );
                candidateSpans.add(new ConditionSpan(m.start(), m.end(), cond, 3));
            }

            // Price GTE
            m = PRICE_GTE_PATTERN.matcher(original);
            while (m.find()) {
                String val = m.group(1);
                ProductQueryCondition cond = new ProductQueryCondition(
                    ProductQueryField.PRICE, QueryOperator.GREATER_THAN_OR_EQUAL, val, null, null
                );
                candidateSpans.add(new ConditionSpan(m.start(), m.end(), cond, 2));
            }

            // Price LTE
            m = PRICE_LTE_PATTERN.matcher(original);
            while (m.find()) {
                String val = m.group(1);
                ProductQueryCondition cond = new ProductQueryCondition(
                    ProductQueryField.PRICE, QueryOperator.LESS_THAN_OR_EQUAL, val, null, null
                );
                candidateSpans.add(new ConditionSpan(m.start(), m.end(), cond, 2));
            }

            // Price GT
            m = PRICE_GT_PATTERN.matcher(original);
            while (m.find()) {
                String val = m.group(1);
                ProductQueryCondition cond = new ProductQueryCondition(
                    ProductQueryField.PRICE, QueryOperator.GREATER_THAN, val, null, null
                );
                candidateSpans.add(new ConditionSpan(m.start(), m.end(), cond, 1));
            }

            // Price LT
            m = PRICE_LT_PATTERN.matcher(original);
            while (m.find()) {
                String val = m.group(1);
                ProductQueryCondition cond = new ProductQueryCondition(
                    ProductQueryField.PRICE, QueryOperator.LESS_THAN, val, null, null
                );
                candidateSpans.add(new ConditionSpan(m.start(), m.end(), cond, 1));
            }

            // Price EQ
            m = PRICE_EQ_PATTERN.matcher(original);
            while (m.find()) {
                String val = m.group(1);
                ProductQueryCondition cond = new ProductQueryCondition(
                    ProductQueryField.PRICE, QueryOperator.EQUALS, val, null, null
                );
                candidateSpans.add(new ConditionSpan(m.start(), m.end(), cond, 2));
            }

            // Dosage Form
            m = DOSAGE_FORM_PATTERN.matcher(original);
            while (m.find()) {
                DosageForm form = mapDosageForm(m.group(1));
                if (form != null) {
                    ProductQueryCondition cond = new ProductQueryCondition(
                        ProductQueryField.DOSAGE_FORM, QueryOperator.EQUALS, form.name(), null, null
                    );
                    candidateSpans.add(new ConditionSpan(m.start(), m.end(), cond, 1));
                }
            }

            // Name Starts With
            m = NAME_STARTS_WITH_PATTERN.matcher(original);
            while (m.find()) {
                String val = m.group(1);
                ProductQueryCondition cond = new ProductQueryCondition(
                    ProductQueryField.NAME, QueryOperator.STARTS_WITH, val, null, null
                );
                candidateSpans.add(new ConditionSpan(m.start(), m.end(), cond, 2));
            }

            // Name Ends With
            m = NAME_ENDS_WITH_PATTERN.matcher(original);
            while (m.find()) {
                String val = m.group(1);
                ProductQueryCondition cond = new ProductQueryCondition(
                    ProductQueryField.NAME, QueryOperator.ENDS_WITH, val, null, null
                );
                candidateSpans.add(new ConditionSpan(m.start(), m.end(), cond, 2));
            }

            // Name Contains
            m = NAME_CONTAINS_PATTERN.matcher(original);
            while (m.find()) {
                String val = m.group(1);
                ProductQueryCondition cond = new ProductQueryCondition(
                    ProductQueryField.NAME, QueryOperator.CONTAINS, val, null, null
                );
                candidateSpans.add(new ConditionSpan(m.start(), m.end(), cond, 2));
            }

            // Name Equals
            m = NAME_EQUALS_PATTERN.matcher(original);
            while (m.find()) {
                String val = m.group(1);
                ProductQueryCondition cond = new ProductQueryCondition(
                    ProductQueryField.NAME, QueryOperator.EQUALS, val, null, null
                );
                candidateSpans.add(new ConditionSpan(m.start(), m.end(), cond, 2));
            }

        } catch (BusinessRuleViolationException ex) {
            return IntentResult.unknown(
                original,
                norm,
                "Invalid query condition: " + ex.getMessage(),
                STANDARD_SUGGESTIONS
            );
        }

        if (candidateSpans.isEmpty()) {
            return null;
        }

        List<ConditionSpan> acceptedSpans = resolveConditionSpanList(candidateSpans);
        if (acceptedSpans.isEmpty()) {
            return null;
        }

        List<ProductQueryCondition> conditions = acceptedSpans.stream()
            .map(ConditionSpan::condition)
            .toList();

        String remainingQuery = extractRemainingSearchTerm(original, acceptedSpans);

        Map<String, Object> entities = new LinkedHashMap<>();
        entities.put("conditions", conditions);
        if (remainingQuery != null && !remainingQuery.isBlank()) {
            entities.put("query", remainingQuery);
        }

        return new IntentResult(
            IntentType.SEARCH_PRODUCT,
            0.98,
            entities,
            original,
            norm,
            "Matched structured product query with " + conditions.size() + " condition(s)",
            Collections.emptyList(),
            IntentResult.CURRENT_ENGINE_VERSION
        );
    }

    private List<ConditionSpan> resolveConditionSpanList(List<ConditionSpan> candidates) {
        if (candidates.isEmpty()) {
            return Collections.emptyList();
        }
        List<ConditionSpan> sorted = new ArrayList<>(candidates);
        sorted.sort((a, b) -> {
            int lenA = a.end() - a.start();
            int lenB = b.end() - b.start();
            if (lenA != lenB) {
                return Integer.compare(lenB, lenA);
            }
            if (a.priority() != b.priority()) {
                return Integer.compare(b.priority(), a.priority());
            }
            return Integer.compare(a.start(), b.start());
        });

        List<ConditionSpan> accepted = new ArrayList<>();
        for (ConditionSpan candidate : sorted) {
            boolean overlaps = false;
            for (ConditionSpan existing : accepted) {
                if (candidate.start() < existing.end() && existing.start() < candidate.end()) {
                    overlaps = true;
                    break;
                }
            }
            if (!overlaps) {
                accepted.add(candidate);
            }
        }

        accepted.sort(Comparator.comparingInt(ConditionSpan::start));
        return accepted;
    }

    private String extractRemainingSearchTerm(String text, List<ConditionSpan> spans) {
        if (text == null || text.isBlank()) {
            return null;
        }
        char[] chars = text.toCharArray();
        for (ConditionSpan span : spans) {
            int s = Math.max(0, span.start());
            int e = Math.min(chars.length, span.end());
            for (int i = s; i < e; i++) {
                chars[i] = ' ';
            }
        }
        String masked = new String(chars);
        masked = masked.replaceAll("[?!;:\"()\\[\\]{}]", " ");
        String[] tokens = masked.trim().split("\\s+");
        List<String> remainingTokens = new ArrayList<>();
        for (String token : tokens) {
            String clean = token.trim();
            if (!clean.isEmpty() && !SEARCH_NOISE_WORDS.contains(clean.toLowerCase(Locale.ROOT))) {
                remainingTokens.add(clean.toLowerCase(Locale.ROOT));
            }
        }
        if (remainingTokens.isEmpty()) {
            return null;
        }
        return String.join(" ", remainingTokens);
    }

    private static DosageForm mapDosageForm(String text) {
        if (text == null) return null;
        String lower = text.toLowerCase(Locale.ROOT);
        return switch (lower) {
            case "tablet", "tablets" -> DosageForm.TABLET;
            case "capsule", "capsules" -> DosageForm.CAPSULE;
            case "syrup", "syrups" -> DosageForm.SYRUP;
            case "injection", "injections" -> DosageForm.INJECTION;
            case "ointment", "ointments" -> DosageForm.OINTMENT;
            case "drop", "drops" -> DosageForm.DROPS;
            case "powder", "powders" -> DosageForm.POWDER;
            case "device", "devices" -> DosageForm.DEVICE;
            default -> null;
        };
    }

    private boolean isRecognizedProductTerm(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String lower = text.toLowerCase(Locale.ROOT).trim();

        // Exact match with product generic nouns (e.g. "find medicine", "find product", "search tablets")
        if (lower.equals("medicine") || lower.equals("medicines") ||
            lower.equals("product") || lower.equals("products") ||
            lower.equals("drug") || lower.equals("drugs") ||
            lower.equals("tablet") || lower.equals("tablets") ||
            lower.equals("capsule") || lower.equals("capsules") ||
            lower.equals("item") || lower.equals("items")) {
            return true;
        }

        // Starts with product keyword followed by non-alphanumeric separator, digit, or space
        // E.g. "medicine_1", "Medicine_1", "product-10", "item_4", "medicine 1", "medicine plus"
        if (lower.matches("^(?:medicine|medicines|product|products|drug|drugs|tablet|tablets|capsule|capsules|item|items)[_\\-\\.\\/\\d\\s].*$")) {
            return true;
        }

        // Known common medicine terms (exact or contained)
        for (String term : COMMON_MEDICINE_TERMS) {
            if (lower.equals(term) || lower.contains(term)) {
                return true;
            }
        }

        // Common pharmaceutical dosage forms or dosage indicators
        // e.g. "500mg", "100ml", "10mcg", "5%"
        if (lower.matches(".*\\b\\d+\\s*(?:mg|ml|mcg|g|iu|%)\\b.*")) {
            return true;
        }

        // Dosage form words (e.g. "syrup", "capsule", "ointment", "drops", "inhaler", "injection", "suspension", "gel")
        if (lower.matches(".*\\b(?:syrup|capsule|capsules|ointment|drops|inhaler|injection|suspension|cream|lotion|gel)\\b.*")) {
            return true;
        }

        // Common pharmaceutical suffixes / chemical stems (at least 4-5 chars long)
        if (lower.matches(".*(?:cillin|mycin|azole|statin|profen|prazole|sartan|olol|dipine|floxacin|gliptin|tidine)\\b.*")) {
            return true;
        }

        // Product SKU / barcode / catalog identifier patterns (e.g. "MED-001", "SKU-1234", "PROD_99", "12345678")
        if (lower.matches("^(?:sku|med|prod|pr|code)[-_]\\w+$") || lower.matches("^\\d{6,}$")) {
            return true;
        }

        return false;
    }

    private IntentResult checkAmbiguousSearch(String original, String norm) {
        // e.g. "find Rahul", "search Rahul", "look for Rahul", "search for Rahul"
        // Without "customer" or "medicine/product" keyword, this is ambiguous between customer and product.
        // We strictly do NOT guess, and return UNKNOWN with disambiguation guidance.
        Pattern p = Pattern.compile("^(?:search\\s+for|search|find|lookup|look\\s+for|show|get)\\s+(.+)$");
        Matcher m = p.matcher(norm);
        if (m.matches()) {
            String candidate = m.group(1).trim();
            // Ensure this is not a navigation phrase like "inventory" or "customers"
            Optional<String> dest = destinationRegistry.resolveDestination(candidate);
            if (dest.isEmpty()) {
                return IntentResult.unknown(
                    original,
                    norm,
                    "Ambiguous search query: '" + candidate + "'. Please specify 'search customer " + candidate + "' or 'find medicine " + candidate + "'.",
                    List.of(
                        "Search customer: 'search customer " + candidate + "'",
                        "Search product: 'find medicine " + candidate + "'",
                        "Show low stock medicines",
                        "Open inventory"
                    )
                );
            }
        }
        return null;
    }

    private IntentResult checkNavigateIntent(String original, String norm) {
        // e.g. "open inventory", "go to inventory", "show inventory", "navigate to purchasing"
        Pattern p = Pattern.compile("^(?:open|go\\s+to|navigate\\s+to|show|view|switch\\s+to)\\s+(.+)$");
        Matcher m = p.matcher(norm);

        if (m.matches()) {
            String phrase = m.group(1).trim();
            Optional<String> destination = destinationRegistry.resolveDestination(phrase);
            if (destination.isPresent()) {
                double conf = 0.95;
                if (norm.startsWith("open ") || norm.startsWith("go to ") || norm.startsWith("show ")) {
                    conf = 0.99;
                }
                Map<String, Object> entities = Map.of("destination", destination.get());
                return new IntentResult(
                    IntentType.NAVIGATE,
                    conf,
                    entities,
                    original,
                    norm,
                    "Matched navigation intent to registered destination: " + destination.get(),
                    Collections.emptyList(),
                    IntentResult.CURRENT_ENGINE_VERSION
                );
            }
        } else {
            // Direct alias query (e.g. user just types "inventory" or "customers")
            Optional<String> directDest = destinationRegistry.resolveDestination(norm);
            if (directDest.isPresent()) {
                Map<String, Object> entities = Map.of("destination", directDest.get());
                return new IntentResult(
                    IntentType.NAVIGATE,
                    0.90,
                    entities,
                    original,
                    norm,
                    "Matched direct destination alias: " + directDest.get(),
                    Collections.emptyList(),
                    IntentResult.CURRENT_ENGINE_VERSION
                );
            }
        }

        return null;
    }
}
