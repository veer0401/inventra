package com.inventra.inventra_backend.common.security;

import com.inventra.inventra_backend.common.util.UuidUtils;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Date;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {

    private final String secretKey;
    private final String issuer;
    private final String audience;
    private final long accessTokenExpiry;
    private final long refreshTokenExpiry;
    private final SecureRandom secureRandom = new SecureRandom();

    public JwtTokenProvider(
        @Value("${app.jwt.secret}") String secretKey,
        @Value("${app.jwt.issuer:https://api.inventra.com}") String issuer,
        @Value("${app.jwt.audience:inventra-clients}") String audience,
        @Value("${app.jwt.access-token-expiry:900000}") long accessTokenExpiry,
        @Value("${app.jwt.refresh-token-expiry:2592000000}") long refreshTokenExpiry
    ) {
        this.secretKey = secretKey;
        this.issuer = issuer;
        this.audience = audience;
        this.accessTokenExpiry = accessTokenExpiry;
        this.refreshTokenExpiry = refreshTokenExpiry;
    }

    public String generateAccessToken(
        UUID userId,
        String email,
        UUID businessId,
        UUID storeId,
        UUID deviceId,
        String role
    ) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + accessTokenExpiry);

        var builder = Jwts.builder()
            .issuer(issuer)
            .subject(userId.toString())
            .audience().add(audience).and()
            .id(UuidUtils.newUuid7().toString())
            .issuedAt(now)
            .expiration(expiryDate)
            .claim("email", email)
            .claim("role", role);

        if (businessId != null) {
            builder.claim("tid", businessId.toString());
        }
        if (storeId != null) {
            builder.claim("sid", storeId.toString());
        }
        if (deviceId != null) {
            builder.claim("did", deviceId.toString());
        }

        return builder.signWith(getSigningKey()).compact();
    }

    public String generateRawRefreshToken() {
        byte[] randomBytes = new byte[32]; // 256 bits
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    public String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    public Claims parseAndValidate(String token) {
        return Jwts.parser()
            .verifyWith(getSigningKey())
            .requireIssuer(issuer)
            .requireAudience(audience)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    public String getAudience() {
        return audience;
    }

    public long getAccessTokenExpiry() {
        return accessTokenExpiry;
    }

    public long getRefreshTokenExpiry() {
        return refreshTokenExpiry;
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secretKey);
        } catch (IllegalArgumentException e) {
            keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
