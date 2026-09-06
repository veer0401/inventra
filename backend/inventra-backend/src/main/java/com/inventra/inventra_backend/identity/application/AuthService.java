package com.inventra.inventra_backend.identity.application;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.common.domain.exception.TenantAccessDeniedException;
import com.inventra.inventra_backend.common.security.JwtTokenProvider;
import com.inventra.inventra_backend.common.util.UuidUtils;
import com.inventra.inventra_backend.identity.api.dto.ActiveContextDto;
import com.inventra.inventra_backend.identity.api.dto.AuthResponse;
import com.inventra.inventra_backend.identity.api.dto.BusinessMembershipSummaryDto;
import com.inventra.inventra_backend.identity.api.dto.ChangePasswordRequest;
import com.inventra.inventra_backend.identity.api.dto.LoginRequest;
import com.inventra.inventra_backend.identity.api.dto.PasswordResetConfirmRequest;
import com.inventra.inventra_backend.identity.api.dto.PasswordResetRequest;
import com.inventra.inventra_backend.identity.api.dto.RefreshTokenRequest;
import com.inventra.inventra_backend.identity.api.dto.StoreAssignmentSummaryDto;
import com.inventra.inventra_backend.identity.api.dto.SwitchContextRequest;
import com.inventra.inventra_backend.identity.api.dto.UserSummaryDto;
import com.inventra.inventra_backend.identity.api.dto.UserSessionResponse;
import com.inventra.inventra_backend.identity.domain.model.AccountStatus;
import com.inventra.inventra_backend.identity.domain.model.PasswordResetToken;
import com.inventra.inventra_backend.identity.domain.model.RefreshToken;
import com.inventra.inventra_backend.identity.domain.model.Role;
import com.inventra.inventra_backend.identity.domain.model.SecurityAuditEventType;
import com.inventra.inventra_backend.identity.domain.model.SecurityAuditLog;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.PasswordResetTokenRepository;
import com.inventra.inventra_backend.identity.domain.repository.RefreshTokenRepository;
import com.inventra.inventra_backend.identity.domain.repository.SecurityAuditLogRepository;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.identity.infrastructure.security.LoginRateLimiter;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.BusinessMembership;
import com.inventra.inventra_backend.tenant.domain.model.Device;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.model.StoreAssignment;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessMembershipRepository;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.DeviceRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreAssignmentRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final BusinessRepository businessRepository;
    private final StoreRepository storeRepository;
    private final BusinessMembershipRepository membershipRepository;
    private final StoreAssignmentRepository storeAssignmentRepository;
    private final DeviceRepository deviceRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordService passwordService;
    private final JwtTokenProvider jwtTokenProvider;
    private final SecurityAuditService auditService;
    private final SecurityAuditLogRepository auditLogRepository;
    private final LoginRateLimiter rateLimiter;

    public AuthService(
        UserRepository userRepository,
        BusinessRepository businessRepository,
        StoreRepository storeRepository,
        BusinessMembershipRepository membershipRepository,
        StoreAssignmentRepository storeAssignmentRepository,
        DeviceRepository deviceRepository,
        RefreshTokenRepository refreshTokenRepository,
        PasswordResetTokenRepository passwordResetTokenRepository,
        PasswordService passwordService,
        JwtTokenProvider jwtTokenProvider,
        SecurityAuditService auditService,
        SecurityAuditLogRepository auditLogRepository,
        LoginRateLimiter rateLimiter
    ) {
        this.userRepository = userRepository;
        this.businessRepository = businessRepository;
        this.storeRepository = storeRepository;
        this.membershipRepository = membershipRepository;
        this.storeAssignmentRepository = storeAssignmentRepository;
        this.deviceRepository = deviceRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordService = passwordService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.auditService = auditService;
        this.auditLogRepository = auditLogRepository;
        this.rateLimiter = rateLimiter;
    }

    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress, String userAgent) {
        String rateLimitKey = (ipAddress != null ? ipAddress : "unknown") + ":" + request.email().trim().toLowerCase();
        if (rateLimiter.isBlocked(rateLimitKey)) {
            auditService.recordEvent(
                null,
                null,
                null,
                SecurityAuditEventType.ACCOUNT_LOCKED,
                ipAddress,
                userAgent,
                "Login blocked due to rate limiting: " + request.email()
            );
            throw new BusinessRuleViolationException(
                "ACCOUNT_LOCKED",
                "Account is temporarily locked due to excessive failed login attempts. Please try again later."
            );
        }

        String normalizedEmail = request.email().trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);

        if (userOpt.isEmpty() || !passwordService.matches(request.password(), userOpt.get().getPasswordHash())) {
            rateLimiter.recordFailure(rateLimitKey);
            auditService.recordEvent(
                userOpt.map(User::getId).orElse(null),
                null,
                null,
                SecurityAuditEventType.LOGIN_FAILURE,
                ipAddress,
                userAgent,
                "Invalid login attempt for email: " + normalizedEmail
            );
            throw new BusinessRuleViolationException("INVALID_CREDENTIALS", "Invalid email or password");
        }

        User user = userOpt.get();
        if (user.getStatus() != AccountStatus.ACTIVE) {
            throw new BusinessRuleViolationException("ACCOUNT_DISABLED", "Account is " + user.getStatus());
        }

        rateLimiter.reset(rateLimitKey);

        // Platform Admin Login
        if (user.isPlatformAdmin()) {
            String accessToken = jwtTokenProvider.generateAccessToken(
                user.getId(),
                user.getEmail(),
                null,
                null,
                null,
                Role.PLATFORM_ADMIN.name()
            );

            String rawRefreshToken = jwtTokenProvider.generateRawRefreshToken();
            String tokenHash = jwtTokenProvider.hashToken(rawRefreshToken);
            Instant refreshExpiry = Instant.now().plusMillis(jwtTokenProvider.getRefreshTokenExpiry());
            RefreshToken refreshToken = RefreshToken.create(
                user.getId(),
                null,
                UuidUtils.newUuid7(),
                tokenHash,
                refreshExpiry
            );
            refreshTokenRepository.save(refreshToken);

            auditService.recordEvent(
                user.getId(),
                null,
                null,
                SecurityAuditEventType.LOGIN_SUCCESS,
                ipAddress,
                userAgent,
                "Platform Admin logged in: " + user.getEmail()
            );

            return buildAuthResponse(user, null, null, Role.PLATFORM_ADMIN, null, accessToken, rawRefreshToken);
        }

        // Resolve active business and store
        List<BusinessMembership> memberships = membershipRepository.findByUserId(user.getId())
            .stream()
            .filter(BusinessMembership::isActive)
            .toList();

        if (memberships.isEmpty()) {
            throw new TenantAccessDeniedException("User has no active business memberships");
        }

        BusinessMembership activeMembership = memberships.get(0);
        Business activeBusiness = businessRepository.findById(activeMembership.getBusinessId())
            .orElseThrow(() -> ResourceNotFoundException.forResource("Business", activeMembership.getBusinessId()));

        // Resolve Store
        List<StoreAssignment> assignments = storeAssignmentRepository.findByBusinessMembershipId(activeMembership.getId())
            .stream()
            .filter(StoreAssignment::isActive)
            .toList();

        Store activeStore;
        Role effectiveRole = activeMembership.getRole();

        if (!assignments.isEmpty()) {
            StoreAssignment primaryOrFirst = assignments.stream()
                .filter(StoreAssignment::isPrimaryStore)
                .findFirst()
                .orElse(assignments.get(0));

            activeStore = storeRepository.findById(primaryOrFirst.getStoreId())
                .orElseThrow(() -> ResourceNotFoundException.forResource("Store", primaryOrFirst.getStoreId()));

            if (primaryOrFirst.getRoleOverride().isPresent()) {
                effectiveRole = primaryOrFirst.getRoleOverride().get();
            }
        } else {
            // If Owner with no explicit store assignment, find headquarters store
            activeStore = storeRepository.findByBusinessIdAndIsHeadquartersTrue(activeBusiness.getId())
                .orElseGet(() -> {
                    List<Store> allStores = storeRepository.findByBusinessId(activeBusiness.getId());
                    if (allStores.isEmpty()) {
                        throw new ResourceNotFoundException("No stores found for business", "STORE_NOT_FOUND");
                    }
                    return allStores.get(0);
                });
        }

        // Handle Device identification
        UUID deviceId = null;
        if (request.deviceId() != null) {
            Device device = deviceRepository.findById(request.deviceId()).orElse(null);
            if (device != null) {
                if (!device.isActive()) {
                    throw new TenantAccessDeniedException("Device is revoked or suspended", "DEVICE_REVOKED");
                }
                device.recordActivity(ipAddress);
                deviceId = device.getId();
            }
        }

        String accessToken = jwtTokenProvider.generateAccessToken(
            user.getId(),
            user.getEmail(),
            activeBusiness.getId(),
            activeStore.getId(),
            deviceId,
            effectiveRole.name()
        );

        String rawRefreshToken = jwtTokenProvider.generateRawRefreshToken();
        String tokenHash = jwtTokenProvider.hashToken(rawRefreshToken);
        Instant refreshExpiry = Instant.now().plusMillis(jwtTokenProvider.getRefreshTokenExpiry());
        RefreshToken refreshToken = RefreshToken.create(
            user.getId(),
            deviceId,
            UuidUtils.newUuid7(),
            tokenHash,
            refreshExpiry
        );
        refreshTokenRepository.save(refreshToken);

        auditService.recordEvent(
            user.getId(),
            activeBusiness.getId(),
            deviceId,
            SecurityAuditEventType.LOGIN_SUCCESS,
            ipAddress,
            userAgent,
            "User logged in successfully"
        );

        return buildAuthResponse(user, activeBusiness, activeStore, effectiveRole, deviceId, accessToken, rawRefreshToken);
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request, String ipAddress, String userAgent) {
        String tokenHash = jwtTokenProvider.hashToken(request.refreshToken());
        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
            .orElseThrow(() -> new BusinessRuleViolationException("INVALID_TOKEN", "Invalid refresh token"));

        // Reuse detection: If token was already used, revoke all tokens in family!
        if (storedToken.isUsed()) {
            refreshTokenRepository.revokeByFamilyId(storedToken.getFamilyId());
            auditService.recordEvent(
                storedToken.getUserId(),
                null,
                storedToken.getDeviceId(),
                SecurityAuditEventType.TOKEN_REUSE_DETECTED,
                ipAddress,
                userAgent,
                "Refresh token reuse detected! Revoked entire token family: " + storedToken.getFamilyId()
            );
            throw new BusinessRuleViolationException(
                "TOKEN_REUSE_DETECTED",
                "Token reuse detected. All sessions in this family have been revoked for security."
            );
        }

        if (storedToken.isRevoked() || storedToken.isExpired()) {
            throw new BusinessRuleViolationException("TOKEN_EXPIRED", "Refresh token is expired or revoked");
        }

        User user = userRepository.findById(storedToken.getUserId())
            .orElseThrow(() -> ResourceNotFoundException.forResource("User", storedToken.getUserId()));

        if (user.getStatus() != AccountStatus.ACTIVE) {
            throw new BusinessRuleViolationException("ACCOUNT_DISABLED", "Account is " + user.getStatus());
        }

        // Verify device if bound
        if (storedToken.getDeviceId() != null) {
            Device device = deviceRepository.findById(storedToken.getDeviceId()).orElse(null);
            if (device != null && !device.isActive()) {
                throw new TenantAccessDeniedException("Device is revoked or suspended", "DEVICE_REVOKED");
            }
            if (device != null) {
                device.recordActivity(ipAddress);
            }
        }

        // Mark current token used
        storedToken.markUsed();
        refreshTokenRepository.save(storedToken);

        // Issue new token in same family
        String newRawRefreshToken = jwtTokenProvider.generateRawRefreshToken();
        String newTokenHash = jwtTokenProvider.hashToken(newRawRefreshToken);
        Instant refreshExpiry = Instant.now().plusMillis(jwtTokenProvider.getRefreshTokenExpiry());
        RefreshToken newRefreshToken = RefreshToken.create(
            user.getId(),
            storedToken.getDeviceId(),
            storedToken.getFamilyId(),
            newTokenHash,
            refreshExpiry
        );
        refreshTokenRepository.save(newRefreshToken);

        if (user.isPlatformAdmin()) {
            String newAccessToken = jwtTokenProvider.generateAccessToken(
                user.getId(),
                user.getEmail(),
                null,
                null,
                null,
                Role.PLATFORM_ADMIN.name()
            );
            return buildAuthResponse(user, null, null, Role.PLATFORM_ADMIN, null, newAccessToken, newRawRefreshToken);
        }

        // Resolve context
        List<BusinessMembership> memberships = membershipRepository.findByUserId(user.getId())
            .stream()
            .filter(BusinessMembership::isActive)
            .toList();

        if (memberships.isEmpty()) {
            throw new TenantAccessDeniedException("User has no active business memberships");
        }

        BusinessMembership activeMembership = memberships.get(0);
        Business activeBusiness = businessRepository.findById(activeMembership.getBusinessId())
            .orElseThrow(() -> ResourceNotFoundException.forResource("Business", activeMembership.getBusinessId()));

        List<StoreAssignment> assignments = storeAssignmentRepository.findByBusinessMembershipId(activeMembership.getId())
            .stream()
            .filter(StoreAssignment::isActive)
            .toList();

        Store activeStore;
        Role effectiveRole = activeMembership.getRole();
        if (!assignments.isEmpty()) {
            StoreAssignment primaryOrFirst = assignments.stream()
                .filter(StoreAssignment::isPrimaryStore)
                .findFirst()
                .orElse(assignments.get(0));

            activeStore = storeRepository.findById(primaryOrFirst.getStoreId())
                .orElseThrow(() -> ResourceNotFoundException.forResource("Store", primaryOrFirst.getStoreId()));

            if (primaryOrFirst.getRoleOverride().isPresent()) {
                effectiveRole = primaryOrFirst.getRoleOverride().get();
            }
        } else {
            activeStore = storeRepository.findByBusinessIdAndIsHeadquartersTrue(activeBusiness.getId())
                .orElseGet(() -> {
                    List<Store> allStores = storeRepository.findByBusinessId(activeBusiness.getId());
                    if (allStores.isEmpty()) {
                        throw new ResourceNotFoundException("No stores found for business", "STORE_NOT_FOUND");
                    }
                    return allStores.get(0);
                });
        }

        String newAccessToken = jwtTokenProvider.generateAccessToken(
            user.getId(),
            user.getEmail(),
            activeBusiness.getId(),
            activeStore.getId(),
            storedToken.getDeviceId(),
            effectiveRole.name()
        );

        auditService.recordEvent(
            user.getId(),
            activeBusiness.getId(),
            storedToken.getDeviceId(),
            SecurityAuditEventType.TOKEN_REFRESH,
            ipAddress,
            userAgent,
            "Access token refreshed successfully"
        );

        return buildAuthResponse(user, activeBusiness, activeStore, effectiveRole, storedToken.getDeviceId(), newAccessToken, newRawRefreshToken);
    }

    @Transactional
    public AuthResponse switchContext(
        UUID userId,
        SwitchContextRequest request,
        String ipAddress,
        String userAgent
    ) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("User", userId));

        if (user.getStatus() != AccountStatus.ACTIVE) {
            throw new BusinessRuleViolationException("ACCOUNT_DISABLED", "Account is " + user.getStatus());
        }

        List<BusinessMembership> memberships = membershipRepository.findByUserId(userId)
            .stream()
            .filter(BusinessMembership::isActive)
            .toList();

        if (memberships.isEmpty()) {
            throw new TenantAccessDeniedException("User has no active business memberships");
        }

        BusinessMembership targetMembership;
        if (request.businessId() != null) {
            targetMembership = memberships.stream()
                .filter(m -> m.getBusinessId().equals(request.businessId()))
                .findFirst()
                .orElseThrow(() -> new TenantAccessDeniedException("User is not an active member of requested business"));
        } else {
            targetMembership = memberships.get(0);
        }

        Business targetBusiness = businessRepository.findById(targetMembership.getBusinessId())
            .orElseThrow(() -> ResourceNotFoundException.forResource("Business", targetMembership.getBusinessId()));

        List<StoreAssignment> assignments = storeAssignmentRepository.findByBusinessMembershipId(targetMembership.getId())
            .stream()
            .filter(StoreAssignment::isActive)
            .toList();

        Store targetStore;
        Role effectiveRole = targetMembership.getRole();

        if (request.storeId() != null) {
            if (targetMembership.getRole() == Role.OWNER) {
                targetStore = storeRepository.findById(request.storeId())
                    .filter(s -> s.getBusinessId().equals(targetBusiness.getId()))
                    .orElseThrow(() -> new TenantAccessDeniedException("Store does not belong to business"));
            } else {
                StoreAssignment matched = assignments.stream()
                    .filter(sa -> sa.getStoreId().equals(request.storeId()))
                    .findFirst()
                    .orElseThrow(() -> new TenantAccessDeniedException("User is not assigned to requested store"));

                targetStore = storeRepository.findById(matched.getStoreId())
                    .orElseThrow(() -> ResourceNotFoundException.forResource("Store", matched.getStoreId()));

                if (matched.getRoleOverride().isPresent()) {
                    effectiveRole = matched.getRoleOverride().get();
                }
            }
        } else if (!assignments.isEmpty()) {
            StoreAssignment primary = assignments.stream()
                .filter(StoreAssignment::isPrimaryStore)
                .findFirst()
                .orElse(assignments.get(0));

            targetStore = storeRepository.findById(primary.getStoreId())
                .orElseThrow(() -> ResourceNotFoundException.forResource("Store", primary.getStoreId()));

            if (primary.getRoleOverride().isPresent()) {
                effectiveRole = primary.getRoleOverride().get();
            }
        } else {
            targetStore = storeRepository.findByBusinessIdAndIsHeadquartersTrue(targetBusiness.getId())
                .orElseGet(() -> {
                    List<Store> allStores = storeRepository.findByBusinessId(targetBusiness.getId());
                    if (allStores.isEmpty()) {
                        throw new ResourceNotFoundException("No stores found for business", "STORE_NOT_FOUND");
                    }
                    return allStores.get(0);
                });
        }

        String newAccessToken = jwtTokenProvider.generateAccessToken(
            user.getId(),
            user.getEmail(),
            targetBusiness.getId(),
            targetStore.getId(),
            null,
            effectiveRole.name()
        );

        String newRawRefreshToken = jwtTokenProvider.generateRawRefreshToken();
        String newTokenHash = jwtTokenProvider.hashToken(newRawRefreshToken);
        Instant refreshExpiry = Instant.now().plusMillis(jwtTokenProvider.getRefreshTokenExpiry());
        RefreshToken newRefreshToken = RefreshToken.create(
            user.getId(),
            null,
            UuidUtils.newUuid7(),
            newTokenHash,
            refreshExpiry
        );
        refreshTokenRepository.save(newRefreshToken);

        return buildAuthResponse(user, targetBusiness, targetStore, effectiveRole, null, newAccessToken, newRawRefreshToken);
    }

    @Transactional
    public void logout(RefreshTokenRequest request, String ipAddress, String userAgent) {
        String tokenHash = jwtTokenProvider.hashToken(request.refreshToken());
        refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
            token.revoke();
            refreshTokenRepository.save(token);
            auditService.recordEvent(
                token.getUserId(),
                null,
                token.getDeviceId(),
                SecurityAuditEventType.LOGOUT,
                ipAddress,
                userAgent,
                "User logged out; session revoked"
            );
        });
    }

    @Transactional
    public void logoutAll(UUID userId, String ipAddress, String userAgent) {
        refreshTokenRepository.revokeAllByUserId(userId);
        auditService.recordEvent(
            userId,
            null,
            null,
            SecurityAuditEventType.LOGOUT_ALL,
            ipAddress,
            userAgent,
            "All active sessions revoked for user: " + userId
        );
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request, String ipAddress, String userAgent) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("User", userId));

        if (!passwordService.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BusinessRuleViolationException("INVALID_PASSWORD", "Current password does not match");
        }

        String newHash = passwordService.hashPassword(request.newPassword());
        user.setPasswordHash(newHash);
        userRepository.save(user);

        // Invalidate all active refresh tokens upon password change
        refreshTokenRepository.revokeAllByUserId(userId);

        auditService.recordEvent(
            userId,
            null,
            null,
            SecurityAuditEventType.PASSWORD_CHANGED,
            ipAddress,
            userAgent,
            "Password changed successfully; all active sessions revoked"
        );
    }

    @Transactional
    public void requestPasswordReset(PasswordResetRequest request, String ipAddress, String userAgent) {
        String normalizedEmail = request.email().trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            passwordResetTokenRepository.deleteByUserId(user.getId());

            String rawToken = jwtTokenProvider.generateRawRefreshToken();
            String tokenHash = jwtTokenProvider.hashToken(rawToken);
            Instant expiry = Instant.now().plusSeconds(900); // 15 mins

            PasswordResetToken resetToken = PasswordResetToken.create(user.getId(), tokenHash, expiry);
            passwordResetTokenRepository.save(resetToken);

            auditService.recordEvent(
                user.getId(),
                null,
                null,
                SecurityAuditEventType.PASSWORD_RESET_REQUESTED,
                ipAddress,
                userAgent,
                "Password reset token requested"
            );
        }
    }

    @Transactional
    public void confirmPasswordReset(PasswordResetConfirmRequest request, String ipAddress, String userAgent) {
        String tokenHash = jwtTokenProvider.hashToken(request.token());
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(tokenHash)
            .orElseThrow(() -> new BusinessRuleViolationException("INVALID_TOKEN", "Invalid or expired password reset token"));

        if (!resetToken.isValid()) {
            throw new BusinessRuleViolationException("TOKEN_EXPIRED", "Password reset token is expired or already used");
        }

        User user = userRepository.findById(resetToken.getUserId())
            .orElseThrow(() -> ResourceNotFoundException.forResource("User", resetToken.getUserId()));

        String newHash = passwordService.hashPassword(request.newPassword());
        user.setPasswordHash(newHash);
        userRepository.save(user);

        resetToken.markUsed();
        passwordResetTokenRepository.save(resetToken);

        refreshTokenRepository.revokeAllByUserId(user.getId());

        auditService.recordEvent(
            user.getId(),
            null,
            null,
            SecurityAuditEventType.PASSWORD_RESET_COMPLETED,
            ipAddress,
            userAgent,
            "Password reset completed successfully"
        );
    }

    private AuthResponse buildAuthResponse(
        User user,
        Business activeBusiness,
        Store activeStore,
        Role activeRole,
        UUID activeDeviceId,
        String accessToken,
        String refreshToken
    ) {
        UserSummaryDto userDto = new UserSummaryDto(
            user.getId(),
            user.getEmail(),
            user.getFullName(),
            user.getPhoneNumber(),
            user.getStatus(),
            user.isEmailVerified()
        );

        ActiveContextDto activeContext = null;
        if (activeBusiness != null && activeStore != null) {
            activeContext = new ActiveContextDto(
                activeBusiness.getId(),
                activeBusiness.getLegalName(),
                activeStore.getId(),
                activeStore.getStoreName(),
                activeStore.getStoreCode(),
                activeRole,
                activeDeviceId
            );
        } else if (user.isPlatformAdmin()) {
            activeContext = new ActiveContextDto(
                null,
                "Inventra Platform",
                null,
                "Global Console",
                "GLOBAL",
                Role.PLATFORM_ADMIN,
                activeDeviceId
            );
        }

        List<BusinessMembershipSummaryDto> membershipSummaries = new ArrayList<>();
        List<BusinessMembership> memberships = membershipRepository.findByUserId(user.getId())
            .stream()
            .filter(BusinessMembership::isActive)
            .toList();

        for (BusinessMembership m : memberships) {
            businessRepository.findById(m.getBusinessId()).ifPresent(b -> {
                List<StoreAssignmentSummaryDto> storeDtos = new ArrayList<>();
                List<StoreAssignment> assignments = storeAssignmentRepository.findByBusinessMembershipId(m.getId())
                    .stream()
                    .filter(StoreAssignment::isActive)
                    .toList();

                for (StoreAssignment sa : assignments) {
                    storeRepository.findById(sa.getStoreId()).ifPresent(s -> {
                        storeDtos.add(new StoreAssignmentSummaryDto(
                            s.getId(),
                            s.getStoreName(),
                            s.getStoreCode(),
                            sa.getRoleOverride().orElse(null),
                            sa.isPrimaryStore()
                        ));
                    });
                }

                membershipSummaries.add(new BusinessMembershipSummaryDto(
                    b.getId(),
                    b.getLegalName(),
                    m.getRole(),
                    storeDtos
                ));
            });
        }

        return new AuthResponse(
            accessToken,
            refreshToken,
            jwtTokenProvider.getAccessTokenExpiry() / 1000,
            userDto,
            activeContext,
            membershipSummaries
        );
    }

    @Transactional(readOnly = true)
    public List<UserSessionResponse> getUserSessions(UUID userId, String currentIp, String currentUserAgent) {
        String normalizedCurrentIp = normalizeIp(currentIp);
        List<RefreshToken> allTokens = refreshTokenRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<SecurityAuditLog> auditLogs = auditLogRepository.findByUserIdOrderByOccurredAtDesc(userId);

        // Group by distinct client machine / IP endpoint with platform prefix
        // Key: deviceId if present, else platformPrefix + normalizedIp + "|" + browser + "|" + os
        Map<String, UserSessionResponse> distinctSessions = new LinkedHashMap<>();
        boolean foundCurrent = false;

        for (RefreshToken token : allTokens) {
            // Ignore revoked or expired tokens: revoked sessions must not appear in UI
            if (token.isRevoked() || token.isExpired()) {
                continue;
            }

            // Find best matching audit log for this token to get IP and UserAgent
            SecurityAuditLog matchingLog = auditLogs.stream()
                .filter(log -> {
                    if (token.getDeviceId() != null && token.getDeviceId().equals(log.getDeviceId())) {
                        return true;
                    }
                    return log.getOccurredAt() != null &&
                        Math.abs(log.getOccurredAt().toEpochMilli() - token.getCreatedAt().toEpochMilli()) < 300_000L;
                })
                .findFirst()
                .orElse(null);

            if (matchingLog == null && !auditLogs.isEmpty()) {
                matchingLog = auditLogs.get(0);
            }

            String ip = (matchingLog != null && matchingLog.getIpAddress() != null)
                ? normalizeIp(matchingLog.getIpAddress())
                : normalizedCurrentIp;
            String ua = (matchingLog != null && matchingLog.getUserAgent() != null)
                ? matchingLog.getUserAgent()
                : currentUserAgent;

            boolean isSessionDesktop = isSessionDesktop(ua, matchingLog);
            String browser = isSessionDesktop ? "Inventra Desktop" : extractBrowser(ua);
            String os = extractOs(ua);
            String deviceType = isSessionDesktop ? "Desktop Terminal" : extractDeviceType(ua, token.getDeviceId() != null);

            String platformPrefix = isSessionDesktop ? "desktop:" : "web:";
            String clientKey;
            if (token.getDeviceId() != null) {
                clientKey = "dev:" + token.getDeviceId();
            } else {
                clientKey = platformPrefix + ip + "|" + browser + "|" + os;
            }

            boolean isCurrent = false;
            if (!foundCurrent && ip.equals(normalizedCurrentIp) && isUserAgentMatch(ua, currentUserAgent)) {
                isCurrent = true;
                foundCurrent = true;
            }

            if (!distinctSessions.containsKey(clientKey)) {
                distinctSessions.put(clientKey, new UserSessionResponse(
                    token.getId(),
                    deviceType,
                    browser,
                    os,
                    ip,
                    resolveLocation(ip),
                    token.getCreatedAt(),
                    token.getCreatedAt(),
                    isCurrent,
                    true
                ));
            } else if (isCurrent && !distinctSessions.get(clientKey).current()) {
                UserSessionResponse prev = distinctSessions.get(clientKey);
                distinctSessions.put(clientKey, new UserSessionResponse(
                    prev.id(),
                    prev.deviceType(),
                    prev.browser(),
                    prev.operatingSystem(),
                    prev.ipAddress(),
                    prev.location(),
                    prev.createdAt(),
                    token.getCreatedAt().isAfter(prev.lastActiveAt()) ? token.getCreatedAt() : prev.lastActiveAt(),
                    true,
                    true
                ));
            }
        }

        // Always ensure current caller's workstation is present and marked current
        if (distinctSessions.isEmpty() || !foundCurrent) {
            boolean isCurrentDesktop = (currentUserAgent != null && currentUserAgent.toLowerCase().contains("desktop"));
            String browser = isCurrentDesktop ? "Inventra Desktop" : extractBrowser(currentUserAgent);
            String deviceType = isCurrentDesktop ? "Desktop Terminal" : extractDeviceType(currentUserAgent, false);
            String os = extractOs(currentUserAgent);
            String platformPrefix = isCurrentDesktop ? "desktop:" : "web:";
            String currentKey = platformPrefix + normalizedCurrentIp + "|" + browser + "|" + os;

            if (distinctSessions.containsKey(currentKey)) {
                UserSessionResponse prev = distinctSessions.get(currentKey);
                distinctSessions.put(currentKey, new UserSessionResponse(
                    prev.id(),
                    prev.deviceType(),
                    prev.browser(),
                    prev.operatingSystem(),
                    prev.ipAddress(),
                    prev.location(),
                    prev.createdAt(),
                    Instant.now(),
                    true,
                    true
                ));
            } else {
                distinctSessions.put(currentKey, new UserSessionResponse(
                    UuidUtils.newUuid7(),
                    deviceType,
                    browser,
                    os,
                    normalizedCurrentIp,
                    resolveLocation(normalizedCurrentIp),
                    Instant.now(),
                    Instant.now(),
                    true,
                    true
                ));
            }
        }

        List<UserSessionResponse> result = new ArrayList<>(distinctSessions.values());
        result.sort((a, b) -> {
            if (a.current() && !b.current()) return -1;
            if (!a.current() && b.current()) return 1;
            return b.lastActiveAt().compareTo(a.lastActiveAt());
        });

        return result;
    }

    @Transactional
    public void revokeSession(UUID userId, UUID sessionId, String ipAddress, String userAgent) {
        refreshTokenRepository.findById(sessionId).ifPresentOrElse(token -> {
            if (token.getUserId().equals(userId)) {
                refreshTokenRepository.revokeByFamilyId(token.getFamilyId());
                if (token.getDeviceId() != null) {
                    refreshTokenRepository.revokeAllByDeviceId(token.getDeviceId());
                }
                token.revoke();
                refreshTokenRepository.save(token);
                auditService.recordEvent(
                    userId,
                    null,
                    token.getDeviceId(),
                    SecurityAuditEventType.LOGOUT,
                    ipAddress,
                    userAgent,
                    "Session family revoked by user: " + sessionId
                );
            }
        }, () -> {
            auditService.recordEvent(
                userId,
                null,
                null,
                SecurityAuditEventType.LOGOUT,
                ipAddress,
                userAgent,
                "Session revocation requested: " + sessionId
            );
        });
    }

    @Transactional
    public void revokeOtherSessions(UUID userId, String currentIp, String currentUserAgent) {
        List<UserSessionResponse> sessions = getUserSessions(userId, currentIp, currentUserAgent);
        for (UserSessionResponse s : sessions) {
            if (!s.current()) {
                refreshTokenRepository.findById(s.id()).ifPresent(token -> {
                    refreshTokenRepository.revokeByFamilyId(token.getFamilyId());
                    if (token.getDeviceId() != null) {
                        refreshTokenRepository.revokeAllByDeviceId(token.getDeviceId());
                    }
                    token.revoke();
                    refreshTokenRepository.save(token);
                });
            }
        }
        auditService.recordEvent(
            userId,
            null,
            null,
            SecurityAuditEventType.LOGOUT,
            currentIp,
            currentUserAgent,
            "All other remote sessions revoked by user"
        );
    }

    private boolean isSessionDesktop(String ua, SecurityAuditLog log) {
        if (ua != null) {
            String lower = ua.toLowerCase();
            if (lower.contains("desktop") || lower.contains("tauri") || lower.contains("inventra-desktop")) {
                return true;
            }
        }
        if (log != null && log.getDetail() != null) {
            String lower = log.getDetail().toLowerCase();
            if (lower.contains("desktop")) {
                return true;
            }
        }
        return false;
    }

    private boolean isUserAgentMatch(String ua1, String ua2) {
        if (ua1 == null || ua2 == null) return true;
        boolean d1 = ua1.toLowerCase().contains("desktop") || ua1.toLowerCase().contains("tauri");
        boolean d2 = ua2.toLowerCase().contains("desktop") || ua2.toLowerCase().contains("tauri");
        if (d1 != d2) {
            return false;
        }
        return extractBrowser(ua1).equalsIgnoreCase(extractBrowser(ua2)) &&
               extractOs(ua1).equalsIgnoreCase(extractOs(ua2));
    }

    private String normalizeIp(String ip) {
        if (ip == null || ip.isBlank() || ip.equals("0:0:0:0:0:0:0:1") || ip.equals("::1")) {
            return "127.0.0.1";
        }
        return ip.trim();
    }

    private String extractDeviceType(String userAgent, boolean hasDevice) {
        if (hasDevice) return "Workstation Terminal";
        if (userAgent == null) return "Web Workstation";
        String ua = userAgent.toLowerCase();
        if (ua.contains("desktop") || ua.contains("tauri") || ua.contains("inventra-desktop")) return "Desktop App";
        if (ua.contains("mobile") || ua.contains("android") || ua.contains("iphone")) return "Mobile Device";
        if (ua.contains("ipad") || ua.contains("tablet")) return "Tablet";
        return "Web Workstation";
    }

    private String extractBrowser(String userAgent) {
        if (userAgent == null) return "Google Chrome";
        String ua = userAgent.toLowerCase();
        if (ua.contains("desktop") || ua.contains("tauri") || ua.contains("inventra")) return "Inventra Desktop";
        if (ua.contains("edg/")) return "Microsoft Edge";
        if (ua.contains("chrome/") && !ua.contains("edg/")) return "Google Chrome";
        if (ua.contains("safari/") && !ua.contains("chrome/")) return "Apple Safari";
        if (ua.contains("firefox/")) return "Mozilla Firefox";
        return "Web Browser";
    }

    private String extractOs(String userAgent) {
        if (userAgent == null) return "Windows 11/10";
        String ua = userAgent.toLowerCase();
        if (ua.contains("windows nt 10.0") || ua.contains("windows nt 11.0") || ua.contains("windows")) return "Windows 11/10";
        if (ua.contains("macintosh") || ua.contains("mac os x")) return "macOS";
        if (ua.contains("android")) return "Android";
        if (ua.contains("iphone") || ua.contains("ipad") || ua.contains("ios")) return "iOS";
        if (ua.contains("linux")) return "Linux";
        return "Workstation OS";
    }

    private String resolveLocation(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) return "Local Network";
        if (ipAddress.equals("127.0.0.1") || ipAddress.equals("0:0:0:0:0:0:0:1") ||
            ipAddress.startsWith("192.168.") || ipAddress.startsWith("10.") || ipAddress.startsWith("172.16.")) {
            return "Local Workstation / Intranet";
        }
        return "Registered Network";
    }
}
