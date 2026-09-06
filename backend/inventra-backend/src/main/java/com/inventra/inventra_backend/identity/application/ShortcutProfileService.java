package com.inventra.inventra_backend.identity.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.identity.api.dto.CreateShortcutProfileRequest;
import com.inventra.inventra_backend.identity.api.dto.ShortcutProfileResponse;
import com.inventra.inventra_backend.identity.api.dto.UpdateShortcutProfileRequest;
import com.inventra.inventra_backend.identity.domain.model.UserShortcutProfile;
import com.inventra.inventra_backend.identity.domain.repository.UserShortcutProfileRepository;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShortcutProfileService {

    private static final Logger log = LoggerFactory.getLogger(ShortcutProfileService.class);
    private static final int MAX_PROFILES_PER_USER = 3;

    private final UserShortcutProfileRepository profileRepository;
    private final ObjectMapper objectMapper;

    public ShortcutProfileService(
        UserShortcutProfileRepository profileRepository,
        ObjectMapper objectMapper
    ) {
        this.profileRepository = profileRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<ShortcutProfileResponse> listProfiles(UUID userId) {
        Objects.requireNonNull(userId, "User ID cannot be null");
        return profileRepository.findByUserIdOrderByCreatedAtAsc(userId)
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public ShortcutProfileResponse getProfile(UUID userId, UUID profileId) {
        Objects.requireNonNull(userId, "User ID cannot be null");
        Objects.requireNonNull(profileId, "Profile ID cannot be null");

        UserShortcutProfile profile = profileRepository.findByIdAndUserId(profileId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Shortcut profile not found with id: " + profileId));
        return toResponse(profile);
    }

    @Transactional
    public ShortcutProfileResponse createProfile(UUID userId, CreateShortcutProfileRequest request) {
        Objects.requireNonNull(userId, "User ID cannot be null");
        Objects.requireNonNull(request, "Request cannot be null");

        // 1. Lock user profile set to prevent race conditions during concurrent profile creation
        List<UserShortcutProfile> existingProfiles = profileRepository.findAllByUserIdWithLock(userId);

        if (existingProfiles.size() >= MAX_PROFILES_PER_USER) {
            throw new BusinessRuleViolationException(
                "USER_SHORTCUT_PROFILE_LIMIT_REACHED",
                "You can save up to " + MAX_PROFILES_PER_USER + " shortcut profiles. Please delete an existing profile before creating a new one.",
                HttpStatus.CONFLICT
            );
        }

        String normalizedName = request.name().trim();
        boolean nameExists = existingProfiles.stream()
            .anyMatch(p -> p.getName().equalsIgnoreCase(normalizedName));
        if (nameExists) {
            throw new BusinessRuleViolationException(
                "DUPLICATE_SHORTCUT_PROFILE_NAME",
                "A shortcut profile with the name '" + normalizedName + "' already exists.",
                HttpStatus.CONFLICT
            );
        }

        boolean makeActive = request.isActive() || existingProfiles.isEmpty();
        if (makeActive) {
            for (UserShortcutProfile p : existingProfiles) {
                if (p.isActive()) {
                    p.setActive(false);
                    profileRepository.save(p);
                }
            }
        }

        String shortcutsJson = serializeShortcuts(request.shortcuts());
        UserShortcutProfile newProfile = UserShortcutProfile.create(
            userId,
            normalizedName,
            request.description(),
            makeActive,
            shortcutsJson
        );

        UserShortcutProfile saved = profileRepository.save(newProfile);
        log.info("Created shortcut profile [{}] for user [{}] (active={}, total={})",
            saved.getId(), userId, saved.isActive(), existingProfiles.size() + 1);

        return toResponse(saved);
    }

    @Transactional
    public ShortcutProfileResponse updateProfile(UUID userId, UUID profileId, UpdateShortcutProfileRequest request) {
        Objects.requireNonNull(userId, "User ID cannot be null");
        Objects.requireNonNull(profileId, "Profile ID cannot be null");

        UserShortcutProfile profile = profileRepository.findByIdAndUserId(profileId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Shortcut profile not found with id: " + profileId));

        if (request.name() != null && !request.name().trim().isEmpty()) {
            String newName = request.name().trim();
            if (!newName.equalsIgnoreCase(profile.getName())) {
                if (profileRepository.existsByUserIdAndNameIgnoreCaseAndIdNot(userId, newName, profileId)) {
                    throw new BusinessRuleViolationException(
                        "DUPLICATE_SHORTCUT_PROFILE_NAME",
                        "A shortcut profile with the name '" + newName + "' already exists.",
                        HttpStatus.CONFLICT
                    );
                }
                profile.setName(newName);
            }
        }

        if (request.description() != null) {
            profile.setDescription(request.description());
        }

        if (request.shortcuts() != null) {
            profile.setShortcutsJson(serializeShortcuts(request.shortcuts()));
        }

        if (Boolean.TRUE.equals(request.isActive()) && !profile.isActive()) {
            List<UserShortcutProfile> userProfiles = profileRepository.findByUserIdOrderByCreatedAtAsc(userId);
            for (UserShortcutProfile p : userProfiles) {
                if (p.isActive() && !p.getId().equals(profileId)) {
                    p.setActive(false);
                    profileRepository.save(p);
                }
            }
            profile.setActive(true);
        }

        UserShortcutProfile saved = profileRepository.save(profile);
        log.info("Updated shortcut profile [{}] for user [{}]", saved.getId(), userId);
        return toResponse(saved);
    }

    @Transactional
    public ShortcutProfileResponse activateProfile(UUID userId, UUID profileId) {
        Objects.requireNonNull(userId, "User ID cannot be null");
        Objects.requireNonNull(profileId, "Profile ID cannot be null");

        UserShortcutProfile target = profileRepository.findByIdAndUserId(profileId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Shortcut profile not found with id: " + profileId));

        List<UserShortcutProfile> userProfiles = profileRepository.findByUserIdOrderByCreatedAtAsc(userId);
        for (UserShortcutProfile p : userProfiles) {
            if (p.isActive() && !p.getId().equals(profileId)) {
                p.setActive(false);
                profileRepository.save(p);
            }
        }

        target.setActive(true);
        UserShortcutProfile saved = profileRepository.save(target);
        log.info("Activated shortcut profile [{}] for user [{}]", saved.getId(), userId);
        return toResponse(saved);
    }

    @Transactional
    public void deleteProfile(UUID userId, UUID profileId) {
        Objects.requireNonNull(userId, "User ID cannot be null");
        Objects.requireNonNull(profileId, "Profile ID cannot be null");

        UserShortcutProfile target = profileRepository.findByIdAndUserId(profileId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Shortcut profile not found with id: " + profileId));

        boolean wasActive = target.isActive();
        profileRepository.delete(target);
        log.info("Deleted shortcut profile [{}] for user [{}]", profileId, userId);

        // If the active profile was deleted, fallback to another existing profile
        if (wasActive) {
            List<UserShortcutProfile> remaining = profileRepository.findByUserIdOrderByCreatedAtAsc(userId);
            if (!remaining.isEmpty()) {
                UserShortcutProfile nextActive = remaining.get(0);
                nextActive.setActive(true);
                profileRepository.save(nextActive);
                log.info("Fell back active profile to [{}] for user [{}]", nextActive.getId(), userId);
            }
        }
    }

    @Transactional
    public ShortcutProfileResponse resetProfile(UUID userId, UUID profileId) {
        Objects.requireNonNull(userId, "User ID cannot be null");
        Objects.requireNonNull(profileId, "Profile ID cannot be null");

        UserShortcutProfile target = profileRepository.findByIdAndUserId(profileId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Shortcut profile not found with id: " + profileId));

        target.setShortcutsJson("{}");
        UserShortcutProfile saved = profileRepository.save(target);
        log.info("Reset shortcut profile [{}] overrides to defaults for user [{}]", profileId, userId);
        return toResponse(saved);
    }

    private ShortcutProfileResponse toResponse(UserShortcutProfile profile) {
        Map<String, String> shortcutsMap = deserializeShortcuts(profile.getShortcutsJson());
        return new ShortcutProfileResponse(
            profile.getId(),
            profile.getUserId(),
            profile.getName(),
            profile.getDescription(),
            profile.isActive(),
            shortcutsMap,
            profile.getCreatedAt(),
            profile.getUpdatedAt()
        );
    }

    private String serializeShortcuts(Map<String, String> shortcuts) {
        if (shortcuts == null || shortcuts.isEmpty()) {
            return "{}";
        }
        try {
            return objectMapper.writeValueAsString(shortcuts);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize shortcuts map: {}", e.getMessage());
            return "{}";
        }
    }

    private Map<String, String> deserializeShortcuts(String json) {
        if (json == null || json.trim().isEmpty() || json.equals("{}")) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, String>>() {});
        } catch (JsonProcessingException e) {
            log.warn("Failed to deserialize shortcuts json: {}", json);
            return Collections.emptyMap();
        }
    }
}
