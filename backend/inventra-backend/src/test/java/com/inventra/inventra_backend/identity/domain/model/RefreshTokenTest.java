package com.inventra.inventra_backend.identity.domain.model;

import com.inventra.inventra_backend.common.util.UuidUtils;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshTokenTest {

    @Test
    @DisplayName("RefreshToken lifecycle: valid, marked used, revoked, expired")
    void testRefreshTokenLifecycle() {
        UUID userId = UuidUtils.newUuid7();
        UUID familyId = UuidUtils.newUuid7();
        Instant future = Instant.now().plus(30, ChronoUnit.DAYS);

        RefreshToken token = RefreshToken.create(userId, null, familyId, "hash123", future);

        assertThat(token.getId()).isNotNull();
        assertThat(token.getId().version()).isEqualTo(7);
        assertThat(token.isValid()).isTrue();
        assertThat(token.isUsed()).isFalse();
        assertThat(token.isRevoked()).isFalse();
        assertThat(token.isExpired()).isFalse();

        token.markUsed();
        assertThat(token.isUsed()).isTrue();
        assertThat(token.isValid()).isFalse();

        RefreshToken token2 = RefreshToken.create(userId, null, familyId, "hash456", future);
        token2.revoke();
        assertThat(token2.isRevoked()).isTrue();
        assertThat(token2.isValid()).isFalse();

        RefreshToken expiredToken = RefreshToken.create(
            userId,
            null,
            familyId,
            "hash789",
            Instant.now().minus(1, ChronoUnit.HOURS)
        );
        assertThat(expiredToken.isExpired()).isTrue();
        assertThat(expiredToken.isValid()).isFalse();
    }
}
