package com.inventra.inventra_backend.identity.application;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.DuplicateResourceException;
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
import com.inventra.inventra_backend.identity.api.dto.RegisterOwnerRequest;
import com.inventra.inventra_backend.identity.api.dto.StoreAssignmentSummaryDto;
import com.inventra.inventra_backend.identity.api.dto.SwitchContextRequest;
import com.inventra.inventra_backend.identity.api.dto.UserSummaryDto;
import com.inventra.inventra_backend.identity.domain.model.AccountStatus;
import com.inventra.inventra_backend.identity.domain.model.PasswordResetToken;
import com.inventra.inventra_backend.identity.domain.model.RefreshToken;
import com.inventra.inventra_backend.identity.domain.model.Role;
import com.inventra.inventra_backend.identity.domain.model.SecurityAuditEventType;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.PasswordResetTokenRepository;
import com.inventra.inventra_backend.identity.domain.repository.RefreshTokenRepository;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.identity.infrastructure.security.LoginRateLimiter;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.BusinessMembership;
import com.inventra.inventra_backend.tenant.domain.model.Device;
import com.inventra.inventra_backend.tenant.domain.model.MembershipStatus;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.model.StoreAssignment;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessMembershipRepository;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.DeviceRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreAssignmentRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
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
        this.rateLimiter = rateLimiter;
    }

    @Transactional
    public AuthResponse registerOwner(RegisterOwnerRequest request, String ipAddress, String userAgent) {
        String normalizedEmail = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new DuplicateResourceException("User with this email already exists", "EMAIL_EXISTS");
        }

        String passwordHash = passwordService.hashPassword(request.password());
        User user = User.create(normalizedEmail, passwordHash, request.fullName(), request.phoneNumber());
        user = userRepository.save(user);

        Business business = Business.create(request.businessName(), null, null, null);
        business = businessRepository.save(business);

        String storeCode = request.storeCode() != null && !request.storeCode().isBlank()
            ? request.storeCode() : "MAIN-01";
        Store store = Store.create(business.getId(), storeCode, request.storeName(), true);
        store = storeRepository.save(store);

        BusinessMembership membership = BusinessMembership.create(business.getId(), user.getId(), Role.OWNER);
        membership = membershipRepository.save(membership);

        StoreAssignment storeAssignment = StoreAssignment.create(
            business.getId(),
            store.getId(),
            membership.getId(),
            null,
            true
        );
        storeAssignmentRepository.save(storeAssignment);

        String accessToken = jwtTokenProvider.generateAccessToken(
            user.getId(),
            user.getEmail(),
            business.getId(),
            store.getId(),
            null,
            Role.OWNER.name()
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
            business.getId(),
            null,
            SecurityAuditEventType.LOGIN_SUCCESS,
            ipAddress,
            userAgent,
            "Owner registered and logged in"
        );

        return buildAuthResponse(user, business, store, Role.OWNER, null, accessToken, rawRefreshToken);
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
            StoreAssignment primary = assignments.stream()
                .filter(StoreAssignment::isPrimaryStore)
                .findFirst()
                .orElse(assignments.get(0));
            activeStore = storeRepository.findById(primary.getStoreId())
                .orElseThrow(() -> ResourceNotFoundException.forResource("Store", primary.getStoreId()));
            if (primary.getRoleOverride().isPresent()) {
                effectiveRole = primary.getRoleOverride().get();
            }
        } else {
            activeStore = storeRepository.findByBusinessIdAndIsHeadquartersTrue(activeBusiness.getId())
                .orElseGet(() -> storeRepository.findByBusinessId(activeBusiness.getId()).get(0));
        }

        String accessToken = jwtTokenProvider.generateAccessToken(
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
            "Refresh token rotated successfully"
        );

        return buildAuthResponse(user, activeBusiness, activeStore, effectiveRole, storedToken.getDeviceId(), accessToken, newRawRefreshToken);
    }

    @Transactional(readOnly = true)
    public AuthResponse switchContext(UUID userId, SwitchContextRequest request, UUID currentDeviceId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("User", userId));

        Business business = businessRepository.findById(request.businessId())
            .orElseThrow(() -> ResourceNotFoundException.forResource("Business", request.businessId()));

        Store store = storeRepository.findById(request.storeId())
            .orElseThrow(() -> ResourceNotFoundException.forResource("Store", request.storeId()));

        if (!store.getBusinessId().equals(business.getId())) {
            throw new BusinessRuleViolationException("INVALID_STORE_CONTEXT", "Store does not belong to the specified business");
        }

        BusinessMembership membership = membershipRepository.findByBusinessIdAndUserId(business.getId(), user.getId())
            .orElseThrow(() -> new TenantAccessDeniedException("User does not belong to this business"));

        if (!membership.isActive()) {
            throw new TenantAccessDeniedException("Membership is not active");
        }

        Role effectiveRole = membership.getRole();
        if (membership.getRole() != Role.OWNER) {
            StoreAssignment assignment = storeAssignmentRepository.findByStoreIdAndBusinessMembershipId(store.getId(), membership.getId())
                .orElseThrow(() -> new TenantAccessDeniedException("User is not assigned to this store branch"));

            if (!assignment.isActive()) {
                throw new TenantAccessDeniedException("Store assignment is not active");
            }
            if (assignment.getRoleOverride().isPresent()) {
                effectiveRole = assignment.getRoleOverride().get();
            }
        }

        String accessToken = jwtTokenProvider.generateAccessToken(
            user.getId(),
            user.getEmail(),
            business.getId(),
            store.getId(),
            currentDeviceId,
            effectiveRole.name()
        );

        return buildAuthResponse(user, business, store, effectiveRole, currentDeviceId, accessToken, null);
    }

    @Transactional
    public void logout(String refreshTokenStr, UUID userId, String ipAddress, String userAgent) {
        if (refreshTokenStr != null && !refreshTokenStr.isBlank()) {
            String tokenHash = jwtTokenProvider.hashToken(refreshTokenStr);
            refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(RefreshToken::revoke);
        }
        auditService.recordEvent(
            userId,
            null,
            null,
            SecurityAuditEventType.LOGOUT,
            ipAddress,
            userAgent,
            "User logged out from session"
        );
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
            "User logged out from all devices"
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

        ActiveContextDto activeContext = new ActiveContextDto(
            activeBusiness.getId(),
            activeBusiness.getLegalName(),
            activeStore.getId(),
            activeStore.getStoreName(),
            activeStore.getStoreCode(),
            activeRole,
            activeDeviceId
        );

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
}
