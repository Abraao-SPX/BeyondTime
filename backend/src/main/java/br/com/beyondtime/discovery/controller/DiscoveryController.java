package br.com.beyondtime.discovery.controller;

import br.com.beyondtime.discovery.dto.DiscoveryProfileResponse;
import br.com.beyondtime.discovery.service.DiscoveryService;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/discovery")
public class DiscoveryController {

    private final DiscoveryService discoveryService;

    public DiscoveryController(DiscoveryService discoveryService) {
        this.discoveryService = discoveryService;
    }

    @GetMapping
    public ResponseEntity<List<DiscoveryProfileResponse>> discoverProfiles(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String goal,
            @RequestParam(required = false) List<String> hobbies,
            @RequestParam(required = false) Boolean onlyVerified,
            @RequestParam(required = false) Integer limit) {
        AuthenticatedUser user = requireAuth(currentUser);
        return ResponseEntity.ok(
                discoveryService.discoverProfiles(user.userId(), city, goal, hobbies, onlyVerified, limit)
        );
    }

    private AuthenticatedUser requireAuth(AuthenticatedUser currentUser) {
        if (currentUser == null) {
            throw new BusinessException("UNAUTHORIZED", "Autenticação necessária.", HttpStatus.UNAUTHORIZED);
        }
        return currentUser;
    }
}
