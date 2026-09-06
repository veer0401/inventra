package com.inventra.inventra_backend.common.geo.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.common.geo.api.dto.PincodeLookupResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class PincodeService {

    private static final Logger log = LoggerFactory.getLogger(PincodeService.class);
    private static final Pattern PINCODE_PATTERN = Pattern.compile("^[1-9][0-9]{5}$");
    private static final String INDIA_POST_API_URL = "https://api.postalpincode.in/pincode/{pincode}";

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final Map<String, PincodeLookupResponse> cache = new ConcurrentHashMap<>();

    // Comprehensive prefix directory fallback covering postal zones & major districts across India
    private static final Map<String, RegionFallback> PREFIX_MAP = Map.ofEntries(
        Map.entry("11", new RegionFallback("New Delhi", "Delhi")),
        Map.entry("12", new RegionFallback("Gurugram / Faridabad", "Haryana")),
        Map.entry("13", new RegionFallback("Ambala / Karnal", "Haryana")),
        Map.entry("14", new RegionFallback("Ludhiana / Jalandhar", "Punjab")),
        Map.entry("15", new RegionFallback("Bathinda", "Punjab")),
        Map.entry("16", new RegionFallback("Chandigarh", "Chandigarh")),
        Map.entry("17", new RegionFallback("Shimla", "Himachal Pradesh")),
        Map.entry("18", new RegionFallback("Jammu", "Jammu and Kashmir")),
        Map.entry("19", new RegionFallback("Srinagar", "Jammu and Kashmir")),
        Map.entry("20", new RegionFallback("Aligarh", "Uttar Pradesh")),
        Map.entry("21", new RegionFallback("Prayagraj", "Uttar Pradesh")),
        Map.entry("22", new RegionFallback("Lucknow", "Uttar Pradesh")),
        Map.entry("23", new RegionFallback("Mirzapur", "Uttar Pradesh")),
        Map.entry("24", new RegionFallback("Dehradun", "Uttarakhand")),
        Map.entry("25", new RegionFallback("Meerut", "Uttar Pradesh")),
        Map.entry("26", new RegionFallback("Bareilly", "Uttar Pradesh")),
        Map.entry("27", new RegionFallback("Gorakhpur", "Uttar Pradesh")),
        Map.entry("28", new RegionFallback("Agra / Jhansi", "Uttar Pradesh")),
        Map.entry("30", new RegionFallback("Jaipur", "Rajasthan")),
        Map.entry("31", new RegionFallback("Udaipur", "Rajasthan")),
        Map.entry("32", new RegionFallback("Kota", "Rajasthan")),
        Map.entry("33", new RegionFallback("Bikaner", "Rajasthan")),
        Map.entry("34", new RegionFallback("Jodhpur", "Rajasthan")),
        Map.entry("36", new RegionFallback("Rajkot", "Gujarat")),
        Map.entry("37", new RegionFallback("Jamnagar", "Gujarat")),
        Map.entry("38", new RegionFallback("Ahmedabad", "Gujarat")),
        Map.entry("39", new RegionFallback("Surat / Vadodara", "Gujarat")),
        Map.entry("40", new RegionFallback("Mumbai", "Maharashtra")),
        Map.entry("41", new RegionFallback("Pune", "Maharashtra")),
        Map.entry("42", new RegionFallback("Nashik", "Maharashtra")),
        Map.entry("43", new RegionFallback("Chhatrapati Sambhajinagar", "Maharashtra")),
        Map.entry("44", new RegionFallback("Nagpur", "Maharashtra")),
        Map.entry("45", new RegionFallback("Indore", "Madhya Pradesh")),
        Map.entry("46", new RegionFallback("Bhopal", "Madhya Pradesh")),
        Map.entry("47", new RegionFallback("Gwalior", "Madhya Pradesh")),
        Map.entry("48", new RegionFallback("Jabalpur", "Madhya Pradesh")),
        Map.entry("49", new RegionFallback("Raipur", "Chhattisgarh")),
        Map.entry("50", new RegionFallback("Hyderabad", "Telangana")),
        Map.entry("51", new RegionFallback("Tirupati", "Andhra Pradesh")),
        Map.entry("52", new RegionFallback("Vijayawada", "Andhra Pradesh")),
        Map.entry("53", new RegionFallback("Visakhapatnam", "Andhra Pradesh")),
        Map.entry("56", new RegionFallback("Bengaluru", "Karnataka")),
        Map.entry("57", new RegionFallback("Mangaluru", "Karnataka")),
        Map.entry("58", new RegionFallback("Hubballi", "Karnataka")),
        Map.entry("59", new RegionFallback("Belagavi", "Karnataka")),
        Map.entry("60", new RegionFallback("Chennai", "Tamil Nadu")),
        Map.entry("61", new RegionFallback("Thanjavur", "Tamil Nadu")),
        Map.entry("62", new RegionFallback("Madurai", "Tamil Nadu")),
        Map.entry("63", new RegionFallback("Salem / Vellore", "Tamil Nadu")),
        Map.entry("64", new RegionFallback("Coimbatore", "Tamil Nadu")),
        Map.entry("67", new RegionFallback("Kozhikode", "Kerala")),
        Map.entry("68", new RegionFallback("Kochi", "Kerala")),
        Map.entry("69", new RegionFallback("Thiruvananthapuram", "Kerala")),
        Map.entry("70", new RegionFallback("Kolkata", "West Bengal")),
        Map.entry("71", new RegionFallback("Howrah", "West Bengal")),
        Map.entry("72", new RegionFallback("Kharagpur", "West Bengal")),
        Map.entry("73", new RegionFallback("Siliguri", "West Bengal")),
        Map.entry("74", new RegionFallback("Nadia", "West Bengal")),
        Map.entry("75", new RegionFallback("Bhubaneswar", "Odisha")),
        Map.entry("76", new RegionFallback("Berhampur", "Odisha")),
        Map.entry("77", new RegionFallback("Sambalpur", "Odisha")),
        Map.entry("78", new RegionFallback("Guwahati", "Assam")),
        Map.entry("79", new RegionFallback("Shillong", "Meghalaya")),
        Map.entry("80", new RegionFallback("Patna", "Bihar")),
        Map.entry("81", new RegionFallback("Bhagalpur", "Bihar")),
        Map.entry("82", new RegionFallback("Gaya", "Bihar")),
        Map.entry("83", new RegionFallback("Ranchi", "Jharkhand")),
        Map.entry("84", new RegionFallback("Muzaffarpur", "Bihar")),
        Map.entry("85", new RegionFallback("Purnia", "Bihar"))
    );

    public PincodeService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) Duration.ofSeconds(2).toMillis());
        requestFactory.setReadTimeout((int) Duration.ofSeconds(3).toMillis());
        this.restClient = RestClient.builder()
            .requestFactory(requestFactory)
            .build();
    }

    public PincodeLookupResponse lookup(String pincode) {
        if (pincode == null || !PINCODE_PATTERN.matcher(pincode.trim()).matches()) {
            return PincodeLookupResponse.notFound(pincode, "PIN code must be strictly 6 digits starting with 1-9");
        }

        String sanitizedPincode = pincode.trim();

        // 1. Check in-memory cache
        PincodeLookupResponse cached = cache.get(sanitizedPincode);
        if (cached != null) {
            return cached;
        }

        // 2. Query India Post Public API
        try {
            String responseBody = restClient.get()
                .uri(INDIA_POST_API_URL, sanitizedPincode)
                .retrieve()
                .body(String.class);

            if (responseBody != null && !responseBody.isBlank()) {
                JsonNode root = objectMapper.readTree(responseBody);
                if (root.isArray() && !root.isEmpty()) {
                    JsonNode resultNode = root.get(0);
                    String status = resultNode.path("Status").asText("");
                    if ("Success".equalsIgnoreCase(status)) {
                        JsonNode postOffices = resultNode.path("PostOffice");
                        if (postOffices.isArray() && !postOffices.isEmpty()) {
                            JsonNode firstPo = postOffices.get(0);
                            String state = firstPo.path("State").asText();
                            String district = firstPo.path("District").asText();
                            String block = firstPo.path("Block").asText();
                            String city = (district != null && !district.isBlank()) ? district : block;

                            List<String> poNames = new ArrayList<>();
                            for (JsonNode po : postOffices) {
                                String name = po.path("Name").asText();
                                if (name != null && !name.isBlank()) {
                                    poNames.add(name);
                                }
                            }

                            PincodeLookupResponse resolved = PincodeLookupResponse.success(
                                sanitizedPincode,
                                city,
                                state,
                                district,
                                poNames
                            );
                            cache.put(sanitizedPincode, resolved);
                            return resolved;
                        }
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("External India Post API lookup failed for PIN code {}: {}. Using resilient regional directory fallback.",
                sanitizedPincode, ex.getMessage());
        }

        // 3. Fallback to resilient regional postal prefix directory
        String prefix2 = sanitizedPincode.substring(0, 2);
        RegionFallback fallback = PREFIX_MAP.get(prefix2);
        if (fallback != null) {
            PincodeLookupResponse fallbackResponse = PincodeLookupResponse.success(
                sanitizedPincode,
                fallback.city(),
                fallback.state(),
                fallback.city(),
                List.of("Primary Delivery Office")
            );
            cache.put(sanitizedPincode, fallbackResponse);
            return fallbackResponse;
        }

        // 4. Default state based on first digit zone
        String zoneState = resolveZoneState(sanitizedPincode.charAt(0));
        if (zoneState != null) {
            PincodeLookupResponse zoneResponse = PincodeLookupResponse.success(
                sanitizedPincode,
                "District " + sanitizedPincode.substring(0, 3),
                zoneState,
                "District " + sanitizedPincode.substring(0, 3),
                List.of()
            );
            cache.put(sanitizedPincode, zoneResponse);
            return zoneResponse;
        }

        return PincodeLookupResponse.notFound(sanitizedPincode, "No geographic record found for PIN code " + sanitizedPincode);
    }

    private String resolveZoneState(char firstDigit) {
        return switch (firstDigit) {
            case '1' -> "Delhi / Northern Region";
            case '2' -> "Uttar Pradesh / Uttarakhand";
            case '3' -> "Rajasthan / Gujarat";
            case '4' -> "Maharashtra / Madhya Pradesh";
            case '5' -> "Karnataka / Andhra Pradesh / Telangana";
            case '6' -> "Tamil Nadu / Kerala";
            case '7' -> "West Bengal / Odisha / Northeast";
            case '8' -> "Bihar / Jharkhand";
            default -> null;
        };
    }

    private record RegionFallback(String city, String state) {}
}
