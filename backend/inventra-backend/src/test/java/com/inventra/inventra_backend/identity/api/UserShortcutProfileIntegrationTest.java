package com.inventra.inventra_backend.identity.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.common.security.JwtTokenProvider;
import com.inventra.inventra_backend.identity.api.dto.CreateShortcutProfileRequest;
import com.inventra.inventra_backend.identity.api.dto.UpdateShortcutProfileRequest;
import com.inventra.inventra_backend.identity.domain.model.User;
import com.inventra.inventra_backend.identity.domain.repository.UserRepository;
import com.inventra.inventra_backend.identity.domain.repository.UserShortcutProfileRepository;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserShortcutProfileIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserShortcutProfileRepository profileRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private User userA;
    private User userB;
    private String tokenA;
    private String tokenB;

    @BeforeEach
    void setUp() {
        profileRepository.deleteAll();

        userA = userRepository.save(User.create(
            "user.a." + UUID.randomUUID().toString().substring(0, 8) + "@example.com",
            "$2a$10$dummyhashfortestpasswordA",
            "User A",
            null
        ));

        userB = userRepository.save(User.create(
            "user.b." + UUID.randomUUID().toString().substring(0, 8) + "@example.com",
            "$2a$10$dummyhashfortestpasswordB",
            "User B",
            null
        ));

        tokenA = jwtTokenProvider.generateAccessToken(
            userA.getId(),
            userA.getEmail(),
            null,
            null,
            null,
            "OWNER"
        );

        tokenB = jwtTokenProvider.generateAccessToken(
            userB.getId(),
            userB.getEmail(),
            null,
            null,
            null,
            "OWNER"
        );
    }


    @Test
    @DisplayName("User can create up to 3 shortcut profiles; 4th profile is rejected with 409 Conflict")
    void testMaxThreeProfilesEnforced() throws Exception {
        // Profile 1
        var req1 = new CreateShortcutProfileRequest("Default Profile", "Primary profile", true, Map.of("OPEN_COMMAND_PALETTE", "Ctrl+K"));
        mockMvc.perform(post("/api/v1/users/me/shortcut-profiles")
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req1)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.name").value("Default Profile"))
            .andExpect(jsonPath("$.data.isActive").value(true));

        // Profile 2
        var req2 = new CreateShortcutProfileRequest("POS Fast Mode", "Fast checkout shortcuts", false, Map.of("POS_SEARCH", "F2", "POS_PAYMENT", "F8"));
        mockMvc.perform(post("/api/v1/users/me/shortcut-profiles")
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req2)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.name").value("POS Fast Mode"))
            .andExpect(jsonPath("$.data.isActive").value(false));

        // Profile 3
        var req3 = new CreateShortcutProfileRequest("Warehouse Mode", "Stock taking shortcuts", false, Map.of("INVENTORY_ADJUSTMENT", "A S"));
        mockMvc.perform(post("/api/v1/users/me/shortcut-profiles")
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req3)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.name").value("Warehouse Mode"));

        assertThat(profileRepository.countByUserId(userA.getId())).isEqualTo(3);

        // Profile 4 -> Must be rejected with 409 Conflict
        var req4 = new CreateShortcutProfileRequest("Fourth Profile", "Extra profile", false, Map.of());
        mockMvc.perform(post("/api/v1/users/me/shortcut-profiles")
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req4)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.errorCode").value("USER_SHORTCUT_PROFILE_LIMIT_REACHED"));

        assertThat(profileRepository.countByUserId(userA.getId())).isEqualTo(3);
    }

    @Test
    @DisplayName("Duplicate profile name for the same user is rejected with 409 Conflict")
    void testDuplicateProfileNameRejected() throws Exception {
        var req1 = new CreateShortcutProfileRequest("Standard", "My profile", true, Map.of());
        mockMvc.perform(post("/api/v1/users/me/shortcut-profiles")
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req1)))
            .andExpect(status().isCreated());

        var req2 = new CreateShortcutProfileRequest("standard", "Duplicate case insensitive", false, Map.of());
        mockMvc.perform(post("/api/v1/users/me/shortcut-profiles")
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req2)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.errorCode").value("DUPLICATE_SHORTCUT_PROFILE_NAME"));
    }

    @Test
    @DisplayName("Activating a profile deactivates other profiles for that user")
    void testActivateProfile() throws Exception {
        var p1 = profileRepository.save(com.inventra.inventra_backend.identity.domain.model.UserShortcutProfile.create(
            userA.getId(), "Profile 1", null, true, "{}"
        ));
        var p2 = profileRepository.save(com.inventra.inventra_backend.identity.domain.model.UserShortcutProfile.create(
            userA.getId(), "Profile 2", null, false, "{}"
        ));

        mockMvc.perform(post("/api/v1/users/me/shortcut-profiles/" + p2.getId() + "/activate")
                .header("Authorization", "Bearer " + tokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(p2.getId().toString()))
            .andExpect(jsonPath("$.data.isActive").value(true));

        var updatedP1 = profileRepository.findById(p1.getId()).orElseThrow();
        var updatedP2 = profileRepository.findById(p2.getId()).orElseThrow();

        assertThat(updatedP1.isActive()).isFalse();
        assertThat(updatedP2.isActive()).isTrue();
    }

    @Test
    @DisplayName("Resetting profile clears override shortcuts")
    void testResetProfile() throws Exception {
        var p1 = profileRepository.save(com.inventra.inventra_backend.identity.domain.model.UserShortcutProfile.create(
            userA.getId(), "Custom Profile", null, true, "{\"NEW_PRODUCT\":\"Ctrl+Alt+P\"}"
        ));

        mockMvc.perform(post("/api/v1/users/me/shortcut-profiles/" + p1.getId() + "/reset")
                .header("Authorization", "Bearer " + tokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.shortcuts").isEmpty());

        var updated = profileRepository.findById(p1.getId()).orElseThrow();
        assertThat(updated.getShortcutsJson()).isEqualTo("{}");
    }

    @Test
    @DisplayName("Deleting active profile automatically activates another remaining profile")
    void testDeleteActiveProfileFallback() throws Exception {
        var p1 = profileRepository.save(com.inventra.inventra_backend.identity.domain.model.UserShortcutProfile.create(
            userA.getId(), "Profile 1", null, true, "{}"
        ));
        var p2 = profileRepository.save(com.inventra.inventra_backend.identity.domain.model.UserShortcutProfile.create(
            userA.getId(), "Profile 2", null, false, "{}"
        ));

        mockMvc.perform(delete("/api/v1/users/me/shortcut-profiles/" + p1.getId())
                .header("Authorization", "Bearer " + tokenA))
            .andExpect(status().isOk());

        assertThat(profileRepository.findById(p1.getId())).isEmpty();
        var updatedP2 = profileRepository.findById(p2.getId()).orElseThrow();
        assertThat(updatedP2.isActive()).isTrue();
    }

    @Test
    @DisplayName("User B cannot access or modify User A's shortcut profiles")
    void testUserIsolation() throws Exception {
        var p1 = profileRepository.save(com.inventra.inventra_backend.identity.domain.model.UserShortcutProfile.create(
            userA.getId(), "User A Profile", null, true, "{}"
        ));

        // User B tries to get User A's profile -> 404 Not Found
        mockMvc.perform(get("/api/v1/users/me/shortcut-profiles/" + p1.getId())
                .header("Authorization", "Bearer " + tokenB))
            .andExpect(status().isNotFound());

        // User B tries to update User A's profile -> 404 Not Found
        var updateReq = new UpdateShortcutProfileRequest("Hacked", null, null, null);
        mockMvc.perform(patch("/api/v1/users/me/shortcut-profiles/" + p1.getId())
                .header("Authorization", "Bearer " + tokenB)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq)))
            .andExpect(status().isNotFound());

        // User B tries to delete User A's profile -> 404 Not Found
        mockMvc.perform(delete("/api/v1/users/me/shortcut-profiles/" + p1.getId())
                .header("Authorization", "Bearer " + tokenB))
            .andExpect(status().isNotFound());
    }
}
