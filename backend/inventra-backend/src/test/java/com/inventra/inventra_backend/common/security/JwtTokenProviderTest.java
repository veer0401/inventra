package com.inventra.inventra_backend.common.security;

import io.jsonwebtoken.Claims;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(
            "dGhpc19pc19hX3Zlcnlfc2VjdXJlXzI1NmJpdF9qd3Rfc2VjcmV0X2tleV9mb3JfaW52ZW50cmFfcGhhcm1hY3lfZXJw",
            "https://api.inventra.com",
            "inventra-clients",
            900000L,
            2592000000L
        );
    }

    @Test
    @DisplayName("Generate access token with minimal claims and valid audience parses successfully")
    void testGenerateAndParseAccessToken() {
        UUID userId = UUID.randomUUID();
        UUID businessId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID deviceId = UUID.randomUUID();

        String token = jwtTokenProvider.generateAccessToken(
            userId,
            "doctor@apexpharma.com",
            businessId,
            storeId,
            deviceId,
            "MANAGER"
        );

        assertThat(token).isNotBlank();

        Claims claims = jwtTokenProvider.parseAndValidate(token);
        assertThat(claims.getSubject()).isEqualTo(userId.toString());
        assertThat(claims.getIssuer()).isEqualTo("https://api.inventra.com");
        assertThat(claims.getAudience()).contains("inventra-clients");
        assertThat(claims.get("email", String.class)).isEqualTo("doctor@apexpharma.com");
        assertThat(claims.get("tid", String.class)).isEqualTo(businessId.toString());
        assertThat(claims.get("sid", String.class)).isEqualTo(storeId.toString());
        assertThat(claims.get("did", String.class)).isEqualTo(deviceId.toString());
        assertThat(claims.get("role", String.class)).isEqualTo("MANAGER");
        assertThat(claims.getExpiration()).isNotNull();
    }

    @Test
    @DisplayName("JWT with incorrect audience is rejected")
    void testIncorrectAudienceRejected() {
        JwtTokenProvider wrongAudProvider = new JwtTokenProvider(
            "dGhpc19pc19hX3Zlcnlfc2VjdXJlXzI1NmJpdF9qd3Rfc2VjcmV0X2tleV9mb3JfaW52ZW50cmFfcGhhcm1hY3lfZXJw",
            "https://api.inventra.com",
            "unauthorized-audience",
            900000L,
            2592000000L
        );

        String foreignToken = wrongAudProvider.generateAccessToken(
            UUID.randomUUID(),
            "attacker@foreign.com",
            null,
            null,
            null,
            "OWNER"
        );

        org.junit.jupiter.api.Assertions.assertThrows(
            io.jsonwebtoken.JwtException.class,
            () -> jwtTokenProvider.parseAndValidate(foreignToken)
        );
    }

    @Test
    @DisplayName("Token hashing produces consistent 64-hex-character SHA-256 string")
    void testTokenHashing() {
        String rawToken = jwtTokenProvider.generateRawRefreshToken();
        String hash1 = jwtTokenProvider.hashToken(rawToken);
        String hash2 = jwtTokenProvider.hashToken(rawToken);

        assertThat(rawToken).isNotBlank();
        assertThat(hash1).hasSize(64).isEqualTo(hash2);
    }
}
