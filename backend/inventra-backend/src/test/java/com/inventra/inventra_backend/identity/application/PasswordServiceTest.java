package com.inventra.inventra_backend.identity.application;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PasswordServiceTest {

    private PasswordService passwordService;

    @BeforeEach
    void setUp() {
        passwordService = new PasswordService(new BCryptPasswordEncoder(12));
    }

    @Test
    @DisplayName("Hash password produces valid BCrypt hash and verifies correctly")
    void testHashAndMatch() {
        String rawPassword = "StrongPassword123!";
        String hash = passwordService.hashPassword(rawPassword);

        assertThat(hash).isNotNull().startsWith("$2a$12$");
        assertThat(passwordService.matches(rawPassword, hash)).isTrue();
        assertThat(passwordService.matches("WrongPassword", hash)).isFalse();
    }

    @Test
    @DisplayName("Password strength validation rejects passwords shorter than 8 characters")
    void testShortPassword() {
        assertThatThrownBy(() -> passwordService.hashPassword("short"))
            .isInstanceOf(BusinessRuleViolationException.class)
            .hasMessageContaining("at least 8 characters");
    }
}
