package com.inventra.inventra_backend.common.geo;

import static org.assertj.core.api.Assertions.assertThat;

import com.inventra.inventra_backend.common.geo.application.GeoService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class GeoServiceTest {

    private GeoService geoService;

    @BeforeEach
    void setUp() {
        geoService = new GeoService();
    }

    @Test
    @DisplayName("Returns all 36 Indian states and union territories")
    void testGetStates() {
        List<String> states = geoService.getStates();
        assertThat(states).isNotEmpty();
        assertThat(states).contains("Karnataka", "Maharashtra", "Tamil Nadu", "Delhi", "Uttar Pradesh", "Gujarat");
        assertThat(states).hasSizeGreaterThanOrEqualTo(36);
    }

    @Test
    @DisplayName("Returns cities for Karnataka including Bengaluru and Mysuru")
    void testGetKarnatakaCities() {
        List<String> cities = geoService.getCities("Karnataka");
        assertThat(cities).contains("Bengaluru", "Mysuru", "Mangaluru", "Hubballi-Dharwad");
    }

    @Test
    @DisplayName("Returns cities for Maharashtra including Mumbai and Pune")
    void testGetMaharashtraCities() {
        List<String> cities = geoService.getCities("Maharashtra");
        assertThat(cities).contains("Mumbai", "Pune", "Nagpur", "Nashik");
    }

    @Test
    @DisplayName("Returns empty list for unknown state")
    void testUnknownState() {
        assertThat(geoService.getCities("Atlantis")).isEmpty();
        assertThat(geoService.getCities("")).isEmpty();
        assertThat(geoService.getCities(null)).isEmpty();
    }
}
