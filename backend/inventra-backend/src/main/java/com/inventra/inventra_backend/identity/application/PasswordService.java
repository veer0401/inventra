package com.inventra.inventra_backend.identity.application;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class PasswordService {

    private final PasswordEncoder passwordEncoder;

    public PasswordService(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    public String hashPassword(String rawPassword) {
        validatePasswordStrength(rawPassword);
        return passwordEncoder.encode(rawPassword);
    }

    public boolean matches(String rawPassword, String encodedHash) {
        if (rawPassword == null || encodedHash == null) {
            return false;
        }
        return passwordEncoder.matches(rawPassword, encodedHash);
    }

    public void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8) {
            throw new BusinessRuleViolationException(
                "PASSWORD_TOO_SHORT",
                "Password must be at least 8 characters long"
            );
        }
        if (password.length() > 128) {
            throw new BusinessRuleViolationException(
                "PASSWORD_TOO_LONG",
                "Password must not exceed 128 characters"
            );
        }
    }
}
