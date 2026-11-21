package br.com.beyondtime.biometrics.controller;

import br.com.beyondtime.biometrics.dto.VerifyBiometricsRequest;
import br.com.beyondtime.biometrics.dto.VerifyBiometricsResponse;
import br.com.beyondtime.biometrics.service.BiometricsVerificationService;
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
@RequestMapping("/api/v1/profiles")
public class BiometricsController {

    private final BiometricsVerificationService verificationService;

    public BiometricsController(BiometricsVerificationService verificationService) {
        this.verificationService = verificationService;
    }

    /**
     * RF11 — Concessão do Selo de Verificado 50+ mediante validação do token biométrico.
     * Segurança: Extrai a identidade estritamente do SecurityContext autenticado (Bearer JWT).
     */
    @PostMapping("/me/verify-biometrics")
    public ResponseEntity<VerifyBiometricsResponse> verifyBiometrics(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Valid @RequestBody VerifyBiometricsRequest request) {

        if (authenticatedUser == null || authenticatedUser.userId() == null) {
            throw new BusinessException("UNAUTHENTICATED", "Sessão de usuário não autenticada. Faça login para continuar.", HttpStatus.UNAUTHORIZED);
        }

        VerifyBiometricsResponse response = verificationService.verifyAndGrantBadge(authenticatedUser.userId(), request);
        return ResponseEntity.ok(response);
    }
}
