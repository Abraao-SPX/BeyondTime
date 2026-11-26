package br.com.beyondtime.chat.controller;

import br.com.beyondtime.chat.dto.BiometricVaultUnlockResponse;
import br.com.beyondtime.chat.dto.ChatKeyVaultResponse;
import br.com.beyondtime.chat.dto.PublicChatKeyResponse;
import br.com.beyondtime.chat.dto.UnlockBiometricVaultRequest;
import br.com.beyondtime.chat.dto.UpsertBiometricChatVaultRequest;
import br.com.beyondtime.chat.dto.UpsertChatKeyVaultRequest;
import br.com.beyondtime.chat.service.ChatKeyVaultService;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat/keys")
public class ChatKeyController {

    private final ChatKeyVaultService keyVaultService;

    public ChatKeyController(ChatKeyVaultService keyVaultService) {
        this.keyVaultService = keyVaultService;
    }

    @PutMapping("/me")
    public ResponseEntity<ChatKeyVaultResponse> upsertMyKeyVault(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody UpsertChatKeyVaultRequest request) {
        AuthenticatedUser user = requireAuth(currentUser);
        return ResponseEntity.ok(keyVaultService.upsertMyVault(user.userId(), request));
    }

    @PutMapping("/me/biometric")
    public ResponseEntity<ChatKeyVaultResponse> upsertMyBiometricKeyVault(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody UpsertBiometricChatVaultRequest request) {
        AuthenticatedUser user = requireAuth(currentUser);
        return ResponseEntity.ok(keyVaultService.upsertMyBiometricVault(user.userId(), request));
    }

    @PostMapping("/me/unlock-biometric")
    public ResponseEntity<BiometricVaultUnlockResponse> unlockMyKeyVaultWithBiometrics(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody UnlockBiometricVaultRequest request) {
        AuthenticatedUser user = requireAuth(currentUser);
        return ResponseEntity.ok(
                keyVaultService.unlockMyVaultWithBiometrics(user.userId(), request.biometricToken())
        );
    }

    @GetMapping("/me")
    public ResponseEntity<ChatKeyVaultResponse> getMyKeyVault(
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        AuthenticatedUser user = requireAuth(currentUser);
        return keyVaultService.findMyVault(user.userId())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/{userId}")
    public ResponseEntity<PublicChatKeyResponse> getUserPublicKey(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID userId) {
        AuthenticatedUser user = requireAuth(currentUser);
        return ResponseEntity.ok(keyVaultService.getPublicKeyForUser(user.userId(), userId));
    }

    private AuthenticatedUser requireAuth(AuthenticatedUser currentUser) {
        if (currentUser == null) {
            throw new BusinessException("UNAUTHORIZED", "Autenticação necessária.", HttpStatus.UNAUTHORIZED);
        }
        return currentUser;
    }
}
