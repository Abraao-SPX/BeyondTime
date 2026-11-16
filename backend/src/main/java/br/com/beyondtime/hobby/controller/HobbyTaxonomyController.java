package br.com.beyondtime.hobby.controller;

import br.com.beyondtime.hobby.dto.HobbyCategoryCatalogResponse;
import br.com.beyondtime.hobby.dto.UserHobbySelectionRequest;
import br.com.beyondtime.hobby.dto.UserHobbySelectionResponse;
import br.com.beyondtime.hobby.service.HobbyTaxonomyService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
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
@CrossOrigin(origins = "*")
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
    public ResponseEntity<UserHobbySelectionResponse> getUserSelection(@PathVariable UUID userId) {
        return ResponseEntity.ok(hobbyTaxonomyService.getUserSelection(userId));
    }

    @PutMapping("/users/{userId}/selection")
    public ResponseEntity<UserHobbySelectionResponse> updateUserSelection(
            @PathVariable UUID userId,
            @Valid @RequestBody UserHobbySelectionRequest request) {
        return ResponseEntity.ok(hobbyTaxonomyService.updateUserSelection(userId, request));
    }
}
