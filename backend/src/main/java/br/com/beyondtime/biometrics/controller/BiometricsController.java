package br.com.beyondtime.biometrics.controller;

import br.com.beyondtime.biometrics.dto.BiometricHandoffStatusResponse;
import br.com.beyondtime.biometrics.dto.CreateBiometricHandoffResponse;
import br.com.beyondtime.biometrics.dto.VerifyBiometricsRequest;
import br.com.beyondtime.biometrics.dto.VerifyBiometricsResponse;
import br.com.beyondtime.biometrics.service.BiometricHandoffService;
import br.com.beyondtime.biometrics.service.BiometricServiceClient;
import br.com.beyondtime.biometrics.service.BiometricsVerificationService;
import br.com.beyondtime.profile.domain.Profile;
import br.com.beyondtime.profile.repository.ProfileRepository;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/profiles")
public class BiometricsController {

    private final BiometricsVerificationService verificationService;
    private final BiometricHandoffService handoffService;
    private final BiometricServiceClient biometricServiceClient;
    private final ProfileRepository profileRepository;

    public BiometricsController(
            BiometricsVerificationService verificationService,
            BiometricHandoffService handoffService,
            BiometricServiceClient biometricServiceClient,
            ProfileRepository profileRepository) {
        this.verificationService = verificationService;
        this.handoffService = handoffService;
        this.biometricServiceClient = biometricServiceClient;
        this.profileRepository = profileRepository;
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

    /**
     * SEC-CRIT-01 — Consulta autenticada de status biométrico para fluxo direto no navegador do celular.
     */
    @GetMapping("/me/biometrics/enrollment-status")
    public ResponseEntity<Map<String, Boolean>> getMyBiometricEnrollmentStatus(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        if (authenticatedUser == null || authenticatedUser.userId() == null) {
            throw new BusinessException("UNAUTHENTICATED", "Sessão de usuário não autenticada. Faça login para continuar.", HttpStatus.UNAUTHORIZED);
        }
        return ResponseEntity.ok(Map.of("enrolled", biometricServiceClient.isUserEnrolled(authenticatedUser.userId())));
    }

    /**
     * SEC-CRIT-01 — Proxy autenticado para envio do vídeo biométrico direto pelo navegador do celular
     * usando o userId extraído estritamente do Bearer JWT.
     */
    @PostMapping(value = "/me/biometrics/submit-video", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<VerifyBiometricsResponse> submitMyBiometricVideo(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @RequestParam("video") MultipartFile video,
            @RequestParam("expected_colors") String expectedColors,
            @RequestParam("session_token") String sessionToken) throws IOException {
        if (authenticatedUser == null || authenticatedUser.userId() == null) {
            throw new BusinessException("UNAUTHENTICATED", "Sessão de usuário não autenticada. Faça login para continuar.", HttpStatus.UNAUTHORIZED);
        }

        String firstName = profileRepository.findByUserId(authenticatedUser.userId())
                .map(Profile::getFirstName)
                .filter(name -> name != null && !name.isBlank())
                .orElse("Usuário");

        boolean alreadyEnrolled = biometricServiceClient.isUserEnrolled(authenticatedUser.userId());
        String biometricJwt = biometricServiceClient.submitLivenessVideo(
                authenticatedUser.userId(),
                firstName,
                video.getBytes(),
                video.getOriginalFilename(),
                video.getContentType(),
                expectedColors,
                sessionToken,
                alreadyEnrolled
        );

        return ResponseEntity.ok(
                verificationService.verifyAndGrantBadge(
                        authenticatedUser.userId(),
                        new VerifyBiometricsRequest(biometricJwt)
                )
        );
    }
}
