package com.inventra.inventra_backend.identity.application;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.common.security.JwtTokenProvider;
import com.inventra.inventra_backend.common.util.UuidUtils;
import com.inventra.inventra_backend.identity.api.dto.ActivateInvitedUserRequest;
import com.inventra.inventra_backend.identity.api.dto.InviteUserRequest;
import com.inventra.inventra_backend.identity.api.dto.StaffMemberDto;
import com.inventra.inventra_backend.identity.api.dto.UserInvitationResponse;
import com.inventra.inventra_backend.identity.api.dto.VerifyInvitationResponse;
import com.inventra.inventra_backend.identity.domain.model.AccountStatus;
import com.inventra.inventra_backend.identity.domain.model.InvitationStatus;
import com.inventra.inventra_backend.identity.domain.model.Role;
import com.inventra.inventra_backend.identity.domain.model.SecurityAuditEventType;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.model.UserInvitation;
import com.inventra.inventra_backend.identity.domain.repository.UserInvitationRepository;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.notification.application.NotificationService;
import com.inventra.inventra_backend.tenant.application.StoreCapacityService;
import com.inventra.inventra_backend.tenant.domain.model.AssignmentStatus;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.BusinessMembership;
import com.inventra.inventra_backend.tenant.domain.model.MembershipStatus;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.model.StoreAssignment;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessMembershipRepository;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreAssignmentRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserManagementService {

    private final UserInvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final BusinessRepository businessRepository;
    private final BusinessMembershipRepository membershipRepository;
    private final StoreRepository storeRepository;
    private final StoreAssignmentRepository storeAssignmentRepository;
    private final StoreCapacityService storeCapacityService;
    private final NotificationService notificationService;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordService passwordService;
    private final SecurityAuditService auditService;
    private final String activationBaseUrl;
    private final boolean exposeDevToken;

    public UserManagementService(
        UserInvitationRepository invitationRepository,
        UserRepository userRepository,
        BusinessRepository businessRepository,
        BusinessMembershipRepository membershipRepository,
        StoreRepository storeRepository,
        StoreAssignmentRepository storeAssignmentRepository,
        StoreCapacityService storeCapacityService,
        NotificationService notificationService,
        JwtTokenProvider jwtTokenProvider,
        PasswordService passwordService,
        SecurityAuditService auditService,
        @Value("${app.onboarding.activation-base-url:http://localhost:5173/activate}") String activationBaseUrl,
        @Value("${app.onboarding.expose-dev-token:true}") boolean exposeDevToken
    ) {
        this.invitationRepository = invitationRepository;
        this.userRepository = userRepository;
        this.businessRepository = businessRepository;
        this.membershipRepository = membershipRepository;
        this.storeRepository = storeRepository;
        this.storeAssignmentRepository = storeAssignmentRepository;
        this.storeCapacityService = storeCapacityService;
        this.notificationService = notificationService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordService = passwordService;
        this.auditService = auditService;
        this.activationBaseUrl = activationBaseUrl;
        this.exposeDevToken = exposeDevToken;
    }

    @Transactional
    public UserInvitationResponse inviteUser(
        UUID businessId,
        UUID actorUserId,
        InviteUserRequest request,
        String ipAddress,
        String userAgent
    ) {
        Objects.requireNonNull(businessId, "businessId cannot be null");
        Objects.requireNonNull(actorUserId, "actorUserId cannot be null");
        Objects.requireNonNull(request, "request cannot be null");

        Business business = businessRepository.findById(businessId)
            .orElseThrow(() -> new ResourceNotFoundException("Business not found with id: " + businessId));

        String email = request.email().toLowerCase().trim();

        // Check if user already exists and is active in this business
        Optional<User> existingUser = userRepository.findByEmail(email);
        if (existingUser.isPresent()) {
            Optional<BusinessMembership> existingMembership = membershipRepository
                .findByBusinessIdAndUserId(businessId, existingUser.get().getId());
            if (existingMembership.isPresent() && existingMembership.get().isActive()) {
                throw new BusinessRuleViolationException(
                    "USER_ALREADY_MEMBER",
                    "User with email " + email + " is already an active member of this business.",
                    HttpStatus.CONFLICT
                );
            }
        }

        // Validate store if specified
        if (request.storeId() != null) {
            storeRepository.findByIdAndBusinessId(request.storeId(), businessId)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Store not found with id: " + request.storeId() + " in this business"
                ));
        }

        // Parse role safely
        String roleStr = request.role().toUpperCase().trim();
        try {
            Role.valueOf(roleStr);
        } catch (IllegalArgumentException e) {
            throw new BusinessRuleViolationException("INVALID_ROLE", "Invalid staff role: " + roleStr, HttpStatus.BAD_REQUEST);
        }

        // Revoke any previous pending invitations for this email in this business
        List<UserInvitation> existingPending = invitationRepository
            .findAllByBusinessIdAndStatus(businessId, InvitationStatus.PENDING);
        for (UserInvitation inv : existingPending) {
            if (inv.getEmail().equalsIgnoreCase(email)) {
                inv.revoke();
                invitationRepository.save(inv);
            }
        }

        // Generate secure activation token
        String rawToken = jwtTokenProvider.generateRawRefreshToken();
        String tokenHash = jwtTokenProvider.hashToken(rawToken);
        Instant expiresAt = Instant.now().plus(Duration.ofDays(7));

        UserInvitation invitation = new UserInvitation(
            UuidUtils.newUuid7(),
            businessId,
            email,
            roleStr,
            request.storeId(),
            tokenHash,
            expiresAt,
            actorUserId
        );
        invitation = invitationRepository.save(invitation);

        auditService.recordEvent(
            actorUserId,
            businessId,
            null,
            SecurityAuditEventType.USER_INVITED,
            ipAddress,
            userAgent,
            "Invited user " + email + " with role " + roleStr
        );

        String fullActivationUrl = activationBaseUrl + "?token=" + rawToken;
        String devToken = exposeDevToken ? rawToken : null;
        String devUrl = exposeDevToken ? fullActivationUrl : null;

        // Asynchronously dispatch themed email and persist in-app notification
        String businessName = business.getLegalName();
        String storeName = "Primary Workstation";
        if (request.storeId() != null) {
            Store store = storeRepository.findById(request.storeId()).orElse(null);
            if (store != null) {
                storeName = store.getStoreName();
            }
        }

        notificationService.notifyStaffInvitation(
            businessId,
            request.storeId(),
            actorUserId,
            email,
            businessName,
            roleStr,
            storeName,
            fullActivationUrl,
            7
        );

        return new UserInvitationResponse(
            invitation.getId(),
            invitation.getBusinessId(),
            invitation.getEmail(),
            invitation.getRole(),
            invitation.getTargetStoreId(),
            invitation.getStatus(),
            invitation.getTokenExpiresAt(),
            devToken,
            devUrl
        );
    }

    @Transactional(readOnly = true)
    public List<StaffMemberDto> listBusinessStaff(UUID businessId) {
        Objects.requireNonNull(businessId, "businessId cannot be null");

        // 1. Fetch stores in business for naming
        List<Store> stores = storeRepository.findByBusinessId(businessId);
        Map<UUID, String> storeNames = new HashMap<>();
        for (Store s : stores) {
            storeNames.put(s.getId(), s.getStoreName());
        }

        // 2. Fetch memberships
        List<BusinessMembership> memberships = membershipRepository.findByBusinessId(businessId);
        List<StaffMemberDto> result = new ArrayList<>();

        for (BusinessMembership m : memberships) {
            User user = userRepository.findById(m.getUserId()).orElse(null);
            if (user == null) continue;

            // Fetch primary store assignment if any
            Optional<StoreAssignment> primaryAssignment = storeAssignmentRepository
                .findByBusinessMembershipIdAndIsPrimaryStoreTrue(m.getId());

            UUID storeId = null;
            String storeName = null;
            boolean isPrimary = false;

            if (primaryAssignment.isPresent() && primaryAssignment.get().isActive()) {
                storeId = primaryAssignment.get().getStoreId();
                storeName = storeNames.getOrDefault(storeId, "Assigned Branch");
                isPrimary = true;
            } else {
                List<StoreAssignment> allAssigns = storeAssignmentRepository
                    .findByBusinessMembershipId(m.getId());
                for (StoreAssignment sa : allAssigns) {
                    if (sa.isActive()) {
                        storeId = sa.getStoreId();
                        storeName = storeNames.getOrDefault(storeId, "Assigned Branch");
                        break;
                    }
                }
            }

            result.add(new StaffMemberDto(
                m.getId(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getPhoneNumber(),
                m.getRole().name(),
                m.getStatus().name(),
                storeId,
                storeName,
                isPrimary,
                false,
                null,
                null,
                m.getCreatedAt()
            ));
        }

        // 3. Include pending invitations
        List<UserInvitation> invitations = invitationRepository
            .findAllByBusinessIdOrderByCreatedAtDesc(businessId);

        for (UserInvitation inv : invitations) {
            if (inv.getStatus() == InvitationStatus.PENDING && !inv.isExpired()) {
                UUID storeId = inv.getTargetStoreId();
                String storeName = storeId != null ? storeNames.getOrDefault(storeId, "Branch Pending") : null;

                result.add(new StaffMemberDto(
                    inv.getId(),
                    null,
                    inv.getEmail(),
                    "(Pending Activation)",
                    "—",
                    inv.getRole(),
                    "PENDING_ACTIVATION",
                    storeId,
                    storeName,
                    false,
                    true,
                    null,
                    null,
                    inv.getCreatedAt()
                ));
            }
        }

        return result;
    }

    @Transactional(readOnly = true)
    public VerifyInvitationResponse verifyInvitation(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new BusinessRuleViolationException(
                "INVALID_INVITATION_TOKEN",
                "Token is missing or blank",
                HttpStatus.BAD_REQUEST
            );
        }

        String tokenHash = jwtTokenProvider.hashToken(rawToken.trim());
        UserInvitation invitation = invitationRepository.findByTokenHash(tokenHash)
            .orElseThrow(() -> new BusinessRuleViolationException(
                "INVALID_INVITATION_TOKEN",
                "Invitation token is invalid, expired, or has already been used",
                HttpStatus.BAD_REQUEST
            ));

        if (!invitation.isPending()) {
            throw new BusinessRuleViolationException(
                "INVALID_INVITATION_TOKEN",
                "This invitation has expired or has already been completed",
                HttpStatus.BAD_REQUEST
            );
        }

        Business business = businessRepository.findById(invitation.getBusinessId())
            .orElseThrow(() -> new ResourceNotFoundException("Business not found for invitation"));

        String storeName = null;
        if (invitation.getTargetStoreId() != null) {
            storeName = storeRepository.findById(invitation.getTargetStoreId())
                .map(Store::getStoreName)
                .orElse(null);
        }

        return new VerifyInvitationResponse(
            true,
            invitation.getId(),
            invitation.getEmail(),
            invitation.getRole(),
            business.getId(),
            business.getLegalName(),
            invitation.getTargetStoreId(),
            storeName,
            invitation.getTokenExpiresAt()
        );
    }

    @Transactional
    public void activateInvitedUser(
        ActivateInvitedUserRequest request,
        String ipAddress,
        String userAgent
    ) {
        Objects.requireNonNull(request, "request cannot be null");

        // Verify strictly 10-digit Indian phone number starting with 6-9
        String phone = request.phoneNumber().trim();
        if (!phone.matches("^[6-9]\\d{9}$")) {
            throw new BusinessRuleViolationException(
                "INVALID_PHONE_NUMBER",
                "Phone number must be strictly 10 digits starting with 6, 7, 8, or 9",
                HttpStatus.BAD_REQUEST
            );
        }

        String tokenHash = jwtTokenProvider.hashToken(request.token().trim());
        UserInvitation invitation = invitationRepository.findByTokenHash(tokenHash)
            .orElseThrow(() -> new BusinessRuleViolationException(
                "INVALID_INVITATION_TOKEN",
                "Invitation token is invalid, expired, or has already been used",
                HttpStatus.BAD_REQUEST
            ));

        if (!invitation.isPending()) {
            throw new BusinessRuleViolationException(
                "INVALID_INVITATION_TOKEN",
                "This invitation has expired or has already been completed",
                HttpStatus.BAD_REQUEST
            );
        }

        // Find or create User
        String email = invitation.getEmail().toLowerCase().trim();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            user = new User(
                UuidUtils.newUuid7(),
                email,
                passwordService.hashPassword(request.password()),
                request.fullName().trim(),
                phone
            );
            user.setStatus(AccountStatus.ACTIVE);
            user.setEmailVerified(true);
        } else {
            user.setFullName(request.fullName().trim());
            user.setPhoneNumber(phone);
            user.setPasswordHash(passwordService.hashPassword(request.password()));
            user.setStatus(AccountStatus.ACTIVE);
            user.setEmailVerified(true);
        }
        user = userRepository.save(user);

        // Find or create BusinessMembership
        Role role;
        try {
            role = Role.valueOf(invitation.getRole().toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            role = Role.PHARMACIST;
        }

        Optional<BusinessMembership> existingMembership = membershipRepository
            .findByBusinessIdAndUserId(invitation.getBusinessId(), user.getId());

        BusinessMembership membership;
        if (existingMembership.isPresent()) {
            membership = existingMembership.get();
            membership.setRole(role);
            membership.setStatus(MembershipStatus.ACTIVE);
        } else {
            membership = new BusinessMembership(
                UuidUtils.newUuid7(),
                invitation.getBusinessId(),
                user.getId(),
                role
            );
        }
        membership = membershipRepository.save(membership);

        // If a target store is assigned, register or activate store assignment
        if (invitation.getTargetStoreId() != null) {
            try {
                storeCapacityService.assignUserToStore(
                    invitation.getBusinessId(),
                    invitation.getTargetStoreId(),
                    membership.getId(),
                    role,
                    true,
                    user.getId(),
                    ipAddress,
                    userAgent
                );
            } catch (Exception e) {
                // If store assignment fails due to capacity, log warning but keep account active
                // so user can still log in and be assigned later by admin
            }
        }

        // Mark invitation as accepted
        invitation.accept();
        invitationRepository.save(invitation);

        auditService.recordEvent(
            user.getId(),
            invitation.getBusinessId(),
            null,
            SecurityAuditEventType.USER_INVITATION_ACTIVATED,
            ipAddress,
            userAgent,
            "Staff user account activated for: " + user.getEmail() + " with role " + role.name()
        );

        // Asynchronously notify user that profile is active
        Business business = businessRepository.findById(invitation.getBusinessId()).orElse(null);
        String businessName = business != null ? business.getLegalName() : "Inventra Partner Pharmacy";
        String loginUrl = activationBaseUrl.replace("/activate", "/login");

        notificationService.notifyAccountActivated(
            invitation.getBusinessId(),
            invitation.getTargetStoreId(),
            user.getId(),
            user.getEmail(),
            user.getFullName(),
            businessName,
            loginUrl
        );
    }
}
