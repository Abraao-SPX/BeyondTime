package br.com.beyondtime.hobby.controller;

import br.com.beyondtime.hobby.dto.HobbyCategoryCatalogResponse;
import br.com.beyondtime.hobby.dto.UserHobbySelectionRequest;
import br.com.beyondtime.hobby.dto.UserHobbySelectionResponse;
import br.com.beyondtime.hobby.service.HobbyTaxonomyService;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hobbies")
public class HobbyTaxonomyController {

    private final HobbyTaxonomyService hobbyTaxonomyService;

    public HobbyTaxonomyController(HobbyTaxonomyService hobbyTaxonomyService) {
        this.hobbyTaxonomyService = hobbyTaxonomyService;
    }

    @GetMapping("/catalog")
    public ResponseEntity<List<HobbyCategoryCatalogResponse>> getCatalog() {
        return ResponseEntity.ok(hobbyTaxonomyService.getCatalog());
    }

    @GetMapping("/users/{userId}/selection")
    public ResponseEntity<UserHobbySelectionResponse> getUserSelection(
            @PathVariable UUID userId,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        enforceSameUser(userId, currentUser);
        return ResponseEntity.ok(hobbyTaxonomyService.getUserSelection(userId));
    }

    @PutMapping("/users/{userId}/selection")
    public ResponseEntity<UserHobbySelectionResponse> updateUserSelection(
            @PathVariable UUID userId,
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody UserHobbySelectionRequest request) {
        enforceSameUser(userId, currentUser);
        return ResponseEntity.ok(hobbyTaxonomyService.updateUserSelection(userId, request));
    }

    private void enforceSameUser(UUID targetUserId, AuthenticatedUser currentUser) {
        if (currentUser == null || currentUser.userId() == null) {
            throw new BusinessException(
                    "UNAUTHORIZED",
                    "Autenticação necessária. Faça login novamente para continuar.",
                    HttpStatus.UNAUTHORIZED
            );
        }
        if (!currentUser.userId().equals(targetUserId)) {
            throw new BusinessException(
                    "FORBIDDEN",
                    "Você só pode consultar ou alterar os hobbies da sua própria conta.",
                    HttpStatus.FORBIDDEN
            );
        }
    }
}
