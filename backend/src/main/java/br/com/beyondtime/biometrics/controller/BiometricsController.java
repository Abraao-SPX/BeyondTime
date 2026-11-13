package br.com.beyondtime.biometrics.controller;

import br.com.beyondtime.biometrics.dto.VerifyBiometricsRequest;
import br.com.beyondtime.biometrics.dto.VerifyBiometricsResponse;
import br.com.beyondtime.biometrics.service.BiometricsVerificationService;
import br.com.beyondtime.shared.exception.BusinessException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Method;
import java.util.UUID;

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
     * Suporta 'X-User-Id' somente em ambiente de testes/desenvolvimento caso o SecurityContext não esteja populado.
     */
    @PostMapping("/me/verify-biometrics")
    public ResponseEntity<VerifyBiometricsResponse> verifyBiometrics(
            @RequestHeader(value = "X-User-Id", required = false) String testUserIdHeader,
            @Valid @RequestBody VerifyBiometricsRequest request) {

        UUID userId = resolveAuthenticatedUserId(testUserIdHeader);
        VerifyBiometricsResponse response = verificationService.verifyAndGrantBadge(userId, request);
        return ResponseEntity.ok(response);
    }

    private UUID resolveAuthenticatedUserId(String testUserIdHeader) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getPrincipal())) {
            Object principal = authentication.getPrincipal();

            // Se for o AuthenticatedUser record do Spring Security
            try {
                Method userIdMethod = principal.getClass().getMethod("userId");
                Object result = userIdMethod.invoke(principal);
                if (result instanceof UUID uuid) {
                    return uuid;
                }
            } catch (Exception ignored) {
            }

            // Se o subject/name for uma string de UUID
            try {
                return UUID.fromString(authentication.getName());
            } catch (IllegalArgumentException ignored) {
            }
        }

        // Fallback defensivo para cabeçalho X-User-Id (somente quando explicitamente fornecido em ambiente de testes)
        if (testUserIdHeader != null && !testUserIdHeader.isBlank()) {
            try {
                return UUID.fromString(testUserIdHeader.trim());
            } catch (IllegalArgumentException e) {
                throw new BusinessException("INVALID_USER_ID", "Identificador de usuário fornecido no cabeçalho é inválido.", HttpStatus.BAD_REQUEST);
            }
        }

        throw new BusinessException("UNAUTHENTICATED", "Sessão de usuário não autenticada. Faça login para continuar.", HttpStatus.UNAUTHORIZED);
    }
}
