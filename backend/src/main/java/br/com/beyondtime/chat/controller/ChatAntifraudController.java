package br.com.beyondtime.chat.controller;

import br.com.beyondtime.chat.dto.AntifraudCheckRequest;
import br.com.beyondtime.chat.dto.AntifraudCheckResponse;
import br.com.beyondtime.chat.service.AntifraudProxyService;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/chat/antifraud")
public class ChatAntifraudController {

    private final AntifraudProxyService antifraudProxyService;

    public ChatAntifraudController(AntifraudProxyService antifraudProxyService) {
        this.antifraudProxyService = antifraudProxyService;
    }

    @PostMapping("/check")
    public ResponseEntity<AntifraudCheckResponse> checkMessageStateless(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody AntifraudCheckRequest request) {
        if (currentUser == null) {
            throw new BusinessException("UNAUTHORIZED", "Autenticação necessária.", HttpStatus.UNAUTHORIZED);
        }
        return ResponseEntity.ok(antifraudProxyService.checkStateless(request.text()));
    }
}
