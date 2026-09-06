package com.inventra.inventra_backend.onboarding.application;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.DuplicateResourceException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.common.security.JwtTokenProvider;
import com.inventra.inventra_backend.identity.api.dto.ActivateOwnerRequest;
import com.inventra.inventra_backend.identity.application.PasswordService;
import com.inventra.inventra_backend.identity.application.SecurityAuditService;
import com.inventra.inventra_backend.identity.domain.model.AccountStatus;
import com.inventra.inventra_backend.identity.domain.model.Role;
import com.inventra.inventra_backend.identity.domain.model.SecurityAuditEventType;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.onboarding.api.dto.OnboardingApplicationDetailResponse;
import com.inventra.inventra_backend.onboarding.api.dto.OnboardingApplicationSummaryResponse;
import com.inventra.inventra_backend.onboarding.api.dto.OnboardingApprovalResponse;
import com.inventra.inventra_backend.onboarding.api.dto.OnboardingAvailabilityResponse;
import com.inventra.inventra_backend.onboarding.api.dto.RejectOnboardingApplicationRequest;
import com.inventra.inventra_backend.onboarding.api.dto.SubmitOnboardingApplicationRequest;
import com.inventra.inventra_backend.onboarding.domain.model.BusinessRegistrationApplication;
import com.inventra.inventra_backend.onboarding.domain.model.OnboardingApplicationStatus;
import com.inventra.inventra_backend.onboarding.domain.repository.BusinessRegistrationApplicationRepository;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.model.BusinessMembership;
import com.inventra.inventra_backend.tenant.domain.model.Store;
import com.inventra.inventra_backend.tenant.domain.model.StoreAssignment;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessMembershipRepository;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreAssignmentRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OnboardingService {

    private final BusinessRegistrationApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final BusinessRepository businessRepository;
    private final StoreRepository storeRepository;
    private final BusinessMembershipRepository membershipRepository;
    private final StoreAssignmentRepository storeAssignmentRepository;
    private final PasswordService passwordService;
    private final JwtTokenProvider jwtTokenProvider;
    private final SecurityAuditService auditService;
    private final boolean exposeDevToken;
    private final String activationBaseUrl;

    public OnboardingService(
        BusinessRegistrationApplicationRepository applicationRepository,
        UserRepository userRepository,
        BusinessRepository businessRepository,
        StoreRepository storeRepository,
        BusinessMembershipRepository membershipRepository,
        StoreAssignmentRepository storeAssignmentRepository,
        PasswordService passwordService,
        JwtTokenProvider jwtTokenProvider,
        SecurityAuditService auditService,
        @Value("${app.onboarding.expose-dev-token:true}") boolean exposeDevToken,
        @Value("${app.onboarding.activation-base-url:http://localhost:3000/activate}") String activationBaseUrl
    ) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.businessRepository = businessRepository;
        this.storeRepository = storeRepository;
        this.membershipRepository = membershipRepository;
        this.storeAssignmentRepository = storeAssignmentRepository;
        this.passwordService = passwordService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.auditService = auditService;
        this.exposeDevToken = exposeDevToken;
        this.activationBaseUrl = activationBaseUrl;
    }

    @Transactional(readOnly = true)
    public OnboardingAvailabilityResponse checkAvailability(String email, String phone, String drugLicenseNumber) {
        boolean emailAvailable = true;
        String emailMessage = null;

        if (email != null && !email.trim().isBlank()) {
            String normalizedEmail = email.trim().toLowerCase();
            if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
                emailAvailable = false;
                emailMessage = "An account with this email address already exists. Please sign in or use a different email.";
            } else if (applicationRepository.existsByApplicantEmailIgnoreCaseAndStatusIn(
                normalizedEmail,
                List.of(OnboardingApplicationStatus.PENDING_REVIEW, OnboardingApplicationStatus.APPROVED)
            )) {
                emailAvailable = false;
                emailMessage = "An onboarding application for this email is already pending review or approved.";
            }
        }

        boolean phoneAvailable = true;
        String phoneMessage = null;

        if (phone != null && !phone.trim().isBlank()) {
            String normalizedPhone = phone.trim().replaceAll("\\D", "");
            if (userRepository.existsByPhoneNumber(normalizedPhone)) {
                phoneAvailable = false;
                phoneMessage = "An account with this mobile number is already registered.";
            } else if (applicationRepository.existsByApplicantPhoneAndStatusIn(
                normalizedPhone,
                List.of(OnboardingApplicationStatus.PENDING_REVIEW, OnboardingApplicationStatus.APPROVED)
            )) {
                phoneAvailable = false;
                phoneMessage = "An onboarding application with this mobile number is already pending review or approved.";
            }
        }

        boolean drugLicenseAvailable = true;
        String drugLicenseMessage = null;

        if (drugLicenseNumber != null && !drugLicenseNumber.trim().isBlank()) {
            String normalizedLicense = drugLicenseNumber.trim();
            if (businessRepository.existsByDrugLicenseNumberIgnoreCase(normalizedLicense)) {
                drugLicenseAvailable = false;
                drugLicenseMessage = "This Drug License Number is already registered under an existing pharmacy business.";
            } else if (applicationRepository.existsByDrugLicenseNumberIgnoreCaseAndStatusIn(
                normalizedLicense,
                List.of(OnboardingApplicationStatus.PENDING_REVIEW, OnboardingApplicationStatus.APPROVED)
            )) {
                drugLicenseAvailable = false;
                drugLicenseMessage = "An onboarding application with this Drug License Number is already pending review or approved.";
            }
        }

        boolean allAvailable = emailAvailable && phoneAvailable && drugLicenseAvailable;

        return new OnboardingAvailabilityResponse(
            emailAvailable,
            emailMessage,
            phoneAvailable,
            phoneMessage,
            drugLicenseAvailable,
            drugLicenseMessage,
            allAvailable
        );
    }

    @Transactional
    public OnboardingApplicationSummaryResponse submitApplication(
        SubmitOnboardingApplicationRequest request,
        String ipAddress,
        String userAgent
    ) {
        String normalizedEmail = request.applicantEmail().trim().toLowerCase();
        String normalizedPhone = request.applicantPhone() != null ? request.applicantPhone().trim().replaceAll("\\D", "") : null;
        String normalizedLicense = request.drugLicenseNumber() != null ? request.drugLicenseNumber().trim() : null;

        // 1. Validate email uniqueness against registered users and active applications
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new DuplicateResourceException(
                "EMAIL_ALREADY_REGISTERED",
                "An account with this email address already exists. Please sign in or use a different email."
            );
        }
        if (applicationRepository.existsByApplicantEmailIgnoreCaseAndStatusIn(
            normalizedEmail,
            List.of(OnboardingApplicationStatus.PENDING_REVIEW, OnboardingApplicationStatus.APPROVED)
        )) {
            throw new DuplicateResourceException(
                "APPLICATION_PENDING_EXISTS",
                "An onboarding application for this email is already pending review or approved."
            );
        }

        // 2. Validate mobile phone uniqueness against registered users and active applications
        if (normalizedPhone != null && !normalizedPhone.isBlank()) {
            if (userRepository.existsByPhoneNumber(normalizedPhone)) {
                throw new DuplicateResourceException(
                    "PHONE_ALREADY_REGISTERED",
                    "An account with this mobile number is already registered."
                );
            }
            if (applicationRepository.existsByApplicantPhoneAndStatusIn(
                normalizedPhone,
                List.of(OnboardingApplicationStatus.PENDING_REVIEW, OnboardingApplicationStatus.APPROVED)
            )) {
                throw new DuplicateResourceException(
                    "APPLICATION_PHONE_EXISTS",
                    "An onboarding application with this mobile number is already pending review or approved."
                );
            }
        }

        // 3. Validate Drug License uniqueness against registered businesses and active applications
        if (normalizedLicense != null && !normalizedLicense.isBlank()) {
            if (businessRepository.existsByDrugLicenseNumberIgnoreCase(normalizedLicense)) {
                throw new DuplicateResourceException(
                    "DRUG_LICENSE_ALREADY_REGISTERED",
                    "This Drug License Number is already registered under an existing pharmacy business."
                );
            }
            if (applicationRepository.existsByDrugLicenseNumberIgnoreCaseAndStatusIn(
                normalizedLicense,
                List.of(OnboardingApplicationStatus.PENDING_REVIEW, OnboardingApplicationStatus.APPROVED)
            )) {
                throw new DuplicateResourceException(
                    "APPLICATION_DRUG_LICENSE_EXISTS",
                    "An onboarding application with this Drug License Number is already pending review or approved."
                );
            }
        }

        BusinessRegistrationApplication application = BusinessRegistrationApplication.create(
            request.applicantName(),
            normalizedEmail,
            request.applicantPhone(),
            request.businessName(),
            request.tradeName(),
            request.drugLicenseNumber(),
            request.gstin(),
            request.storeName(),
            request.storeCode(),
            request.addressLine1(),
            request.addressLine2(),
            request.city(),
            request.state(),
            request.postalCode()
        );

        application = applicationRepository.save(application);

        auditService.recordEvent(
            null,
            null,
            null,
            SecurityAuditEventType.APPLICATION_SUBMITTED,
            ipAddress,
            userAgent,
            "Onboarding application submitted for: " + normalizedEmail + " (App ID: " + application.getId() + ")"
        );

        return OnboardingApplicationSummaryResponse.from(application);
    }

    @Transactional(readOnly = true)
    public Page<OnboardingApplicationSummaryResponse> listApplications(
        OnboardingApplicationStatus status,
        Pageable pageable
    ) {
        Page<BusinessRegistrationApplication> page;
        if (status != null) {
            page = applicationRepository.findByStatus(status, pageable);
        } else {
            page = applicationRepository.findAll(pageable);
        }
        return page.map(OnboardingApplicationSummaryResponse::from);
    }

    @Transactional(readOnly = true)
    public OnboardingApplicationDetailResponse getApplication(UUID id) {
        BusinessRegistrationApplication app = applicationRepository.findById(id)
            .orElseThrow(() -> ResourceNotFoundException.forResource("BusinessRegistrationApplication", id));
        return OnboardingApplicationDetailResponse.from(app);
    }

    @Transactional
    public OnboardingApprovalResponse approveApplication(
        UUID id,
        UUID adminUserId,
        String ipAddress,
        String userAgent
    ) {
        BusinessRegistrationApplication application = applicationRepository.findById(id)
            .orElseThrow(() -> ResourceNotFoundException.forResource("BusinessRegistrationApplication", id));

        // 1. Create Business
        Business business = Business.create(
            application.getBusinessName(),
            application.getTradeName(),
            application.getDrugLicenseNumber(),
            application.getGstin()
        );
        business = businessRepository.save(business);

        // 2. Create Initial Store
        String storeCode = application.getStoreCode() != null && !application.getStoreCode().isBlank()
            ? application.getStoreCode() : "MAIN-01";
        Store store = Store.create(business.getId(), storeCode, application.getStoreName(), true);
        store.setAddressLine1(application.getAddressLine1());
        store.setAddressLine2(application.getAddressLine2());
        store.setCity(application.getCity());
        store.setState(application.getState());
        store.setPostalCode(application.getPostalCode());
        store.setPhoneNumber(application.getApplicantPhone());
        store.setEmail(application.getApplicantEmail());
        store = storeRepository.save(store);

        // 3. Create Inactive User Account (with random unmatchable password until activated)
        String tempHash = passwordService.hashPassword(UUID.randomUUID().toString());
        User user = User.create(
            application.getApplicantEmail(),
            tempHash,
            application.getApplicantName(),
            application.getApplicantPhone()
        );
        user.setStatus(AccountStatus.INACTIVE);
        user = userRepository.save(user);

        // 4. Create BusinessMembership (OWNER)
        BusinessMembership membership = BusinessMembership.create(business.getId(), user.getId(), Role.OWNER);
        membership = membershipRepository.save(membership);

        // 5. Create StoreAssignment (Primary)
        StoreAssignment storeAssignment = StoreAssignment.create(
            business.getId(),
            store.getId(),
            membership.getId(),
            null,
            true
        );
        storeAssignmentRepository.save(storeAssignment);

        // 6. Generate Single-Use Activation Token
        String rawToken = jwtTokenProvider.generateRawRefreshToken();
        String tokenHash = jwtTokenProvider.hashToken(rawToken);
        Instant expiresAt = Instant.now().plus(Duration.ofDays(7));

        UUID validAuditUserId = (adminUserId != null && userRepository.existsById(adminUserId)) ? adminUserId : null;

        application.approve(validAuditUserId, business.getId(), user.getId(), tokenHash, expiresAt);
        applicationRepository.save(application);

        auditService.recordEvent(
            validAuditUserId,
            business.getId(),
            null,
            SecurityAuditEventType.APPLICATION_APPROVED,
            ipAddress,
            userAgent,
            "Onboarding application approved for: " + application.getApplicantEmail() + " (Business: " + business.getId() + ")"
        );

        String devToken = exposeDevToken ? rawToken : null;
        String devUrl = exposeDevToken ? activationBaseUrl + "?token=" + rawToken : null;

        return new OnboardingApprovalResponse(
            application.getId(),
            business.getId(),
            user.getId(),
            application.getStatus(),
            application.getReviewedAt(),
            devToken,
            devUrl
        );
    }

    @Transactional
    public OnboardingApplicationDetailResponse rejectApplication(
        UUID id,
        UUID adminUserId,
        RejectOnboardingApplicationRequest request,
        String ipAddress,
        String userAgent
    ) {
        BusinessRegistrationApplication application = applicationRepository.findById(id)
            .orElseThrow(() -> ResourceNotFoundException.forResource("BusinessRegistrationApplication", id));

        UUID validAuditUserId = (adminUserId != null && userRepository.existsById(adminUserId)) ? adminUserId : null;

        application.reject(validAuditUserId, request.rejectionReason());
        applicationRepository.save(application);

        auditService.recordEvent(
            validAuditUserId,
            null,
            null,
            SecurityAuditEventType.APPLICATION_REJECTED,
            ipAddress,
            userAgent,
            "Onboarding application rejected for: " + application.getApplicantEmail() + " (Reason: " + request.rejectionReason() + ")"
        );

        return OnboardingApplicationDetailResponse.from(application);
    }

    @Transactional
    public void activateOwner(
        ActivateOwnerRequest request,
        String ipAddress,
        String userAgent
    ) {
        String tokenHash = jwtTokenProvider.hashToken(request.token().trim());
        BusinessRegistrationApplication application = applicationRepository.findByActivationTokenHash(tokenHash)
            .orElseThrow(() -> new BusinessRuleViolationException(
                "INVALID_ACTIVATION_TOKEN",
                "Activation token is invalid, expired, or has already been used"
            ));

        application.completeActivation();
        applicationRepository.save(application);

        UUID userId = application.getCreatedUserId();
        if (userId == null) {
            throw new ResourceNotFoundException("Associated user not found for application", "USER_NOT_FOUND");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("User", userId));

        user.setPasswordHash(passwordService.hashPassword(request.newPassword()));
        user.setStatus(AccountStatus.ACTIVE);
        user.setEmailVerified(true);
        userRepository.save(user);

        auditService.recordEvent(
            user.getId(),
            application.getCreatedBusinessId(),
            null,
            SecurityAuditEventType.OWNER_ACTIVATED,
            ipAddress,
            userAgent,
            "Owner account activated for: " + user.getEmail()
        );
    }
}
