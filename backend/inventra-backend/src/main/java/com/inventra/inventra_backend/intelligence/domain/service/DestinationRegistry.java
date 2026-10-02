package com.inventra.inventra_backend.intelligence.domain.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * Central registry of navigation destinations and their aliases.
 * Prevents hard-coding navigation destinations in NLP regexes or parsing rules.
 */
@Component
public class DestinationRegistry {

    public record DestinationDefinition(
        String destination,
        Set<String> aliases
    ) {}

    private final List<DestinationDefinition> destinations;

    public DestinationRegistry() {
        List<DestinationDefinition> list = new ArrayList<>();
        list.add(new DestinationDefinition("INVENTORY", Set.of("inventory", "stock", "stock levels", "stocks", "store inventory")));
        list.add(new DestinationDefinition("CUSTOMERS", Set.of("customers", "patients", "clients", "customer directory", "customer management")));
        list.add(new DestinationDefinition("PURCHASING", Set.of("purchasing", "purchase orders", "procurement", "po", "goods receipts", "grn")));
        list.add(new DestinationDefinition("SALES", Set.of("sales", "invoices", "receipts", "sales history")));
        list.add(new DestinationDefinition("CATALOG", Set.of("catalog", "catalogue", "products", "medicines", "medicine directory", "drug catalog")));
        list.add(new DestinationDefinition("DASHBOARD", Set.of("dashboard", "home", "overview", "main menu")));
        list.add(new DestinationDefinition("BATCHES", Set.of("batches", "lots", "fefo", "expiry batches", "batch lots")));
        list.add(new DestinationDefinition("SUPPLIERS", Set.of("suppliers", "vendors", "distributors", "supplier directory")));
        list.add(new DestinationDefinition("TRANSFERS", Set.of("transfers", "stock transfers", "inter-store transfers")));
        list.add(new DestinationDefinition("IMPORTS", Set.of("imports", "ingestion", "universal ingestion", "csv upload")));
        list.add(new DestinationDefinition("DEVICES", Set.of("devices", "terminals", "hardware", "workstations")));
        list.add(new DestinationDefinition("SETTINGS", Set.of("settings", "preferences", "config", "shortcuts")));
        list.add(new DestinationDefinition("REPORTS", Set.of("reports", "analytics", "reporting")));
        list.add(new DestinationDefinition("POS", Set.of("pos", "point of sale", "billing", "checkout terminal", "counter")));

        this.destinations = Collections.unmodifiableList(list);
    }

    public List<DestinationDefinition> getRegisteredDestinations() {
        return destinations;
    }

    /**
     * Resolves a destination key from a raw destination phrase or substring.
     */
    public Optional<String> resolveDestination(String phrase) {
        if (phrase == null || phrase.isBlank()) {
            return Optional.empty();
        }
        String cleaned = phrase.trim().toLowerCase(Locale.ROOT);

        // 1. Exact alias match
        for (DestinationDefinition def : destinations) {
            if (def.aliases().contains(cleaned)) {
                return Optional.of(def.destination());
            }
        }

        // 2. Substring matching, checking longer aliases first to avoid substring prefix collisions
        List<Map.Entry<String, String>> aliasMap = new ArrayList<>();
        for (DestinationDefinition def : destinations) {
            for (String alias : def.aliases()) {
                aliasMap.add(Map.entry(alias, def.destination()));
            }
        }
        aliasMap.sort((a, b) -> Integer.compare(b.getKey().length(), a.getKey().length()));

        for (Map.Entry<String, String> entry : aliasMap) {
            // Whole word or direct phrase containment
            if (cleaned.equals(entry.getKey()) || cleaned.matches(".*\\b" + java.util.regex.Pattern.quote(entry.getKey()) + "\\b.*")) {
                return Optional.of(entry.getValue());
            }
        }

        return Optional.empty();
    }
}
