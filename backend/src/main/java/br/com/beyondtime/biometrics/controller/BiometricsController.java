package br.com.beyondtime.biometrics.controller;

import br.com.beyondtime.biometrics.dto.BiometricHandoffStatusResponse;
import br.com.beyondtime.biometrics.dto.CreateBiometricHandoffResponse;
import br.com.beyondtime.biometrics.dto.VerifyBiometricsRequest;
import br.com.beyondtime.biometrics.dto.VerifyBiometricsResponse;
import br.com.beyondtime.biometrics.service.BiometricHandoffService;
import br.com.beyondtime.biometrics.service.BiometricsVerificationService;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/profiles")
public class BiometricsController {

    private final BiometricsVerificationService verificationService;
    private final BiometricHandoffService handoffService;

    public BiometricsController(
            BiometricsVerificationService verificationService,
            BiometricHandoffService handoffService) {
        this.verificationService = verificationService;
        this.handoffService = handoffService;
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

    /**
     * RF11 — Cria sessão efêmera de handoff (5 min, uso único) para exibir QR Code no PC
     * e permitir verificação facial pelo navegador do celular sem instalar app.
     */
    @PostMapping("/me/biometrics/handoff")
    public ResponseEntity<CreateBiometricHandoffResponse> createBiometricHandoff(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser) {

        if (authenticatedUser == null || authenticatedUser.userId() == null) {
            throw new BusinessException("UNAUTHENTICATED", "Sessão de usuário não autenticada. Faça login para continuar.", HttpStatus.UNAUTHORIZED);
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(handoffService.createHandoff(authenticatedUser.userId()));
    }

    /**
     * RF11 — Consulta o status do handoff pelo PC (polling leve com proteção anti-IDOR).
     */
    @GetMapping("/me/biometrics/handoff/{token}/status")
    public ResponseEntity<BiometricHandoffStatusResponse> getBiometricHandoffStatus(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable String token) {

        if (authenticatedUser == null || authenticatedUser.userId() == null) {
            throw new BusinessException("UNAUTHENTICATED", "Sessão de usuário não autenticada. Faça login para continuar.", HttpStatus.UNAUTHORIZED);
        }

        return ResponseEntity.ok(handoffService.getStatusForOwner(authenticatedUser.userId(), token));
    }
}
