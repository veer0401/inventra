package com.inventra.inventra_backend.identity.infrastructure.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LoginRateLimiterTest {

    private LoginRateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        rateLimiter = new LoginRateLimiter();
    }

    @Test
    @DisplayName("Block key after 5 failed login attempts")
    void testLockoutAfterFiveAttempts() {
        String key = "127.0.0.1:test@example.com";

        for (int i = 0; i < 4; i++) {
            rateLimiter.recordFailure(key);
            assertThat(rateLimiter.isBlocked(key)).isFalse();
        }

        rateLimiter.recordFailure(key); // 5th attempt
        assertThat(rateLimiter.isBlocked(key)).isTrue();

        rateLimiter.reset(key);
        assertThat(rateLimiter.isBlocked(key)).isFalse();
    }
}
