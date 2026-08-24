package com.inventra.inventra_backend.identity.domain.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserTest {

    @Test
    @DisplayName("User creation normalizes email to lowercase and sets default status to ACTIVE")
    void testUserCreation() {
        User user = User.create("Doctor.Smith@Pharmacy.COM", "hashed_pwd_123", "Dr. John Smith", "9876543210");

        assertThat(user.getId()).isNotNull();
        assertThat(user.getId().version()).isEqualTo(7);
        assertThat(user.getEmail()).isEqualTo("doctor.smith@pharmacy.com");
        assertThat(user.getFullName()).isEqualTo("Dr. John Smith");
        assertThat(user.getPhoneNumber()).isEqualTo("9876543210");
        assertThat(user.getStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(user.isEmailVerified()).isFalse();
        assertThat(user.isActive()).isTrue();
    }

    @Test
    @DisplayName("User creation rejects invalid or blank email")
    void testInvalidEmail() {
        assertThatThrownBy(() -> User.create(null, "hash", "Name", "123"))
            .isInstanceOf(NullPointerException.class);

        assertThatThrownBy(() -> User.create("invalid-email-no-at", "hash", "Name", "123"))
            .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> User.create("   ", "hash", "Name", "123"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("User creation rejects blank full name or password hash")
    void testBlankNameOrPassword() {
        assertThatThrownBy(() -> User.create("test@example.com", "  ", "Name", "123"))
            .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> User.create("test@example.com", "hash", "   ", "123"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("User status transitions")
    void testStatusTransitions() {
        User user = User.create("test@example.com", "hash", "Name", null);
        assertThat(user.isActive()).isTrue();

        user.setStatus(AccountStatus.LOCKED);
        assertThat(user.getStatus()).isEqualTo(AccountStatus.LOCKED);
        assertThat(user.isActive()).isFalse();

        user.setStatus(AccountStatus.SUSPENDED);
        assertThat(user.getStatus()).isEqualTo(AccountStatus.SUSPENDED);
        assertThat(user.isActive()).isFalse();
    }
}
