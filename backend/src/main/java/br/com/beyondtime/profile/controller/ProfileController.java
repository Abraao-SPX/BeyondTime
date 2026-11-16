package br.com.beyondtime.profile.controller;

import br.com.beyondtime.profile.dto.HobbyResponse;
import br.com.beyondtime.profile.dto.ProfileResponse;
import br.com.beyondtime.profile.dto.UpsertProfileRequest;
import br.com.beyondtime.profile.service.ProfileService;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/hobbies")
    public ResponseEntity<List<HobbyResponse>> listHobbies() {
        return ResponseEntity.ok(profileService.listAllHobbies());
    }

    @GetMapping("/profiles/me")
    public ResponseEntity<ProfileResponse> getMyProfile(
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        AuthenticatedUser user = requireAuthenticatedUser(currentUser);
        return ResponseEntity.ok(profileService.getProfileByUserId(user.userId()));
    }

    @PutMapping("/profiles/me")
    public ResponseEntity<ProfileResponse> upsertMyProfile(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody UpsertProfileRequest request) {
        AuthenticatedUser user = requireAuthenticatedUser(currentUser);
        return ResponseEntity.ok(profileService.upsertProfile(user.userId(), request));
    }

    private AuthenticatedUser requireAuthenticatedUser(AuthenticatedUser currentUser) {
        if (currentUser == null || currentUser.userId() == null) {
            throw new BusinessException(
                    "UNAUTHORIZED",
                    "Autenticação necessária. Faça login novamente para continuar.",
                    HttpStatus.UNAUTHORIZED
            );
        }
        return currentUser;
    }
}
