package com.inventra.inventra_backend.identity.infrastructure.security;

import com.inventra.inventra_backend.identity.application.PasswordService;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Local development only seeder for Platform Administrator.
 * ACTIVE ONLY IN LOCAL/TEST/DEV PROFILES.
 */
@Component
@Profile({"local", "test", "dev"})
public class DevPlatformAdminSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevPlatformAdminSeeder.class);

    private static final String DEV_ADMIN_EMAIL = "admin@inventra.local";
    private static final String DEV_ADMIN_PASSWORD = "PlatformAdmin@Inventra2026!";
    private static final String DEV_ADMIN_NAME = "Inventra Platform Administrator";

    private final UserRepository userRepository;
    private final PasswordService passwordService;

    public DevPlatformAdminSeeder(UserRepository userRepository, PasswordService passwordService) {
        this.userRepository = userRepository;
        this.passwordService = passwordService;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!userRepository.existsByEmail(DEV_ADMIN_EMAIL)) {
            String passwordHash = passwordService.hashPassword(DEV_ADMIN_PASSWORD);
            User admin = User.createPlatformAdmin(DEV_ADMIN_EMAIL, passwordHash, DEV_ADMIN_NAME);
            userRepository.save(admin);
            log.info("Local development Platform Administrator initialized: {}", DEV_ADMIN_EMAIL);
        }
    }
}
