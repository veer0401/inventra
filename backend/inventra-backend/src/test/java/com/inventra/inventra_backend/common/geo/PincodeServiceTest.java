package com.inventra.inventra_backend.common.geo;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.common.geo.api.dto.PincodeLookupResponse;
import com.inventra.inventra_backend.common.geo.application.PincodeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class PincodeServiceTest {

    private PincodeService pincodeService;

    @BeforeEach
    void setUp() {
        pincodeService = new PincodeService(new ObjectMapper());
    }

    @Test
    @DisplayName("Invalid PIN code format returns notFound")
    void testInvalidPincodes() {
        assertThat(pincodeService.lookup("123").found()).isFalse();
        assertThat(pincodeService.lookup("012345").found()).isFalse();
        assertThat(pincodeService.lookup("abcdef").found()).isFalse();
        assertThat(pincodeService.lookup("").found()).isFalse();
        assertThat(pincodeService.lookup(null).found()).isFalse();
    }

    @Test
    @DisplayName("Valid Bengaluru PIN code (560038) resolves to Karnataka and Bengaluru")
    void testBengaluruPincode() {
        PincodeLookupResponse response = pincodeService.lookup("560038");
        assertThat(response.found()).isTrue();
        assertThat(response.state()).containsIgnoringCase("Karnataka");
        assertThat(response.city()).containsIgnoringCase("Bengaluru");
    }

    @Test
    @DisplayName("Valid Mumbai PIN code (400001) resolves to Maharashtra and Mumbai")
    void testMumbaiPincode() {
        PincodeLookupResponse response = pincodeService.lookup("400001");
        assertThat(response.found()).isTrue();
        assertThat(response.state()).containsIgnoringCase("Maharashtra");
        assertThat(response.city()).containsIgnoringCase("Mumbai");
    }

    @Test
    @DisplayName("Valid Delhi PIN code (110001) resolves to Delhi and New Delhi")
    void testDelhiPincode() {
        PincodeLookupResponse response = pincodeService.lookup("110001");
        assertThat(response.found()).isTrue();
        assertThat(response.state()).containsIgnoringCase("Delhi");
    }
}
