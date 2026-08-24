package com.inventra.inventra_backend.identity.infrastructure.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Component;

@Component
public class LoginRateLimiter {

    private static final int MAX_ATTEMPTS = 5;
    private static final int LOCKOUT_DURATION_MINUTES = 15;

    private final Cache<String, AtomicInteger> attemptsCache;

    public LoginRateLimiter() {
        this.attemptsCache = Caffeine.newBuilder()
            .expireAfterWrite(LOCKOUT_DURATION_MINUTES, TimeUnit.MINUTES)
            .maximumSize(10_000)
            .build();
    }

    public void recordFailure(String key) {
        if (key == null || key.isBlank()) return;
        AtomicInteger attempts = attemptsCache.get(key, k -> new AtomicInteger(0));
        attempts.incrementAndGet();
    }

    public boolean isBlocked(String key) {
        if (key == null || key.isBlank()) return false;
        AtomicInteger attempts = attemptsCache.getIfPresent(key);
        return attempts != null && attempts.get() >= MAX_ATTEMPTS;
    }

    public void reset(String key) {
        if (key == null || key.isBlank()) return;
        attemptsCache.invalidate(key);
    }
}
