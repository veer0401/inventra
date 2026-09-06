package com.inventra.inventra_backend.onboarding.domain.repository;

import com.inventra.inventra_backend.onboarding.domain.model.BusinessRegistrationApplication;
import com.inventra.inventra_backend.onboarding.domain.model.OnboardingApplicationStatus;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BusinessRegistrationApplicationRepository extends JpaRepository<BusinessRegistrationApplication, UUID> {

    Page<BusinessRegistrationApplication> findByStatus(OnboardingApplicationStatus status, Pageable pageable);

    Optional<BusinessRegistrationApplication> findByActivationTokenHash(String activationTokenHash);

    boolean existsByApplicantEmailIgnoreCaseAndStatus(String applicantEmail, OnboardingApplicationStatus status);

    boolean existsByApplicantEmailIgnoreCaseAndStatusIn(String applicantEmail, Collection<OnboardingApplicationStatus> statuses);

    boolean existsByApplicantPhoneAndStatusIn(String applicantPhone, Collection<OnboardingApplicationStatus> statuses);

    boolean existsByDrugLicenseNumberIgnoreCaseAndStatusIn(String drugLicenseNumber, Collection<OnboardingApplicationStatus> statuses);
}
