package br.com.beyondtime.profile.controller;

import br.com.beyondtime.profile.dto.AvatarUploadResponse;
import br.com.beyondtime.profile.dto.HobbyResponse;
import br.com.beyondtime.profile.dto.ProfileResponse;
import br.com.beyondtime.profile.dto.UpsertProfileRequest;
import br.com.beyondtime.profile.service.AvatarService;
import br.com.beyondtime.profile.service.ProfileService;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class ProfileController {

    private final ProfileService profileService;
    private final AvatarService avatarService;

    public ProfileController(ProfileService profileService, AvatarService avatarService) {
        this.profileService = profileService;
        this.avatarService = avatarService;
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

    @PostMapping(value = "/profiles/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AvatarUploadResponse> uploadMyAvatar(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam("file") MultipartFile file) {
        AuthenticatedUser user = requireAuthenticatedUser(currentUser);
        return ResponseEntity.ok(profileService.updateMyAvatar(user.userId(), file));
    }

    @GetMapping("/profiles/avatars/{filename}")
    public ResponseEntity<byte[]> getAvatar(@PathVariable("filename") String filename) {
        byte[] bytes = avatarService.loadAvatarBytes(filename);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("image/webp"))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePublic().immutable())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(bytes);
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
