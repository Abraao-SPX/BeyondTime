package br.com.beyondtime.discovery.controller;

import br.com.beyondtime.discovery.dto.MatchInteractionRequest;
import br.com.beyondtime.discovery.dto.MatchInteractionResponse;
import br.com.beyondtime.discovery.dto.MatchSummaryResponse;
import br.com.beyondtime.discovery.service.DiscoveryService;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/matches")
public class MatchController {

    private final DiscoveryService discoveryService;

    public MatchController(DiscoveryService discoveryService) {
        this.discoveryService = discoveryService;
    }

    @GetMapping
    public ResponseEntity<List<MatchSummaryResponse>> listMyMatches(
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        AuthenticatedUser user = requireAuth(currentUser);
        return ResponseEntity.ok(discoveryService.listMyMatches(user.userId()));
    }

    @PostMapping("/like")
    public ResponseEntity<MatchInteractionResponse> likeProfile(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody MatchInteractionRequest request) {
        AuthenticatedUser user = requireAuth(currentUser);
        return ResponseEntity.ok(discoveryService.likeUser(user.userId(), request));
    }

    @PostMapping("/pass")
    public ResponseEntity<MatchInteractionResponse> passProfile(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody MatchInteractionRequest request) {
        AuthenticatedUser user = requireAuth(currentUser);
        return ResponseEntity.ok(discoveryService.passUser(user.userId(), request));
    }

    private AuthenticatedUser requireAuth(AuthenticatedUser currentUser) {
        if (currentUser == null) {
            throw new BusinessException("UNAUTHORIZED", "Autenticação necessária.", HttpStatus.UNAUTHORIZED);
        }
        return currentUser;
    }
}
