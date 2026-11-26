package br.com.beyondtime.biometrics.service;

import br.com.beyondtime.biometrics.domain.BiometricHandoffSession;
import br.com.beyondtime.biometrics.domain.BiometricHandoffStatus;
import br.com.beyondtime.biometrics.dto.BiometricHandoffSessionInfoResponse;
import br.com.beyondtime.biometrics.dto.BiometricHandoffStatusResponse;
import br.com.beyondtime.biometrics.dto.CreateBiometricHandoffResponse;
import br.com.beyondtime.biometrics.dto.VerifyBiometricsRequest;
import br.com.beyondtime.biometrics.dto.VerifyBiometricsResponse;
import br.com.beyondtime.biometrics.repository.BiometricHandoffSessionRepository;
import br.com.beyondtime.profile.domain.Profile;
import br.com.beyondtime.profile.repository.ProfileRepository;
import br.com.beyondtime.shared.exception.BusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.UUID;

/**
 * RF11 — Gerencia sessões efêmeras de handoff PC -> Navegador do Celular via QR Code.
 *
 * Segurança:
 * - Nunca trafega o Bearer JWT principal na URL do QR Code.
 * - Token aleatório de 256 bits (Base64URL), TTL de 5 minutos e uso único.
 * - A conclusão exige o token biométrico assinado (HMAC-SHA256) pelo microsserviço
 *   reconhecimento-facial correspondendo estritamente ao userId dono da sessão.
 */
@Service
public class BiometricHandoffService {

    public static final long HANDOFF_TTL_SECONDS = 300L; // 5 minutos

    private final BiometricHandoffSessionRepository handoffRepository;
    private final ProfileRepository profileRepository;
    private final BiometricsVerificationService biometricsVerificationService;
    private final SecureRandom secureRandom = new SecureRandom();

    public BiometricHandoffService(
            BiometricHandoffSessionRepository handoffRepository,
            ProfileRepository profileRepository,
            BiometricsVerificationService biometricsVerificationService) {
        this.handoffRepository = handoffRepository;
        this.profileRepository = profileRepository;
        this.biometricsVerificationService = biometricsVerificationService;
    }

    @Transactional
    public CreateBiometricHandoffResponse createHandoff(UUID authenticatedUserId) {
        if (authenticatedUserId == null) {
            throw new BusinessException("UNAUTHENTICATED", "Usuário não autenticado.", HttpStatus.UNAUTHORIZED);
        }

        String firstName = profileRepository.findByUserId(authenticatedUserId)
                .map(Profile::getFirstName)
                .filter(name -> name != null && !name.isBlank())
                .orElse("Usuário");

        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime expiresAt = now.plusSeconds(HANDOFF_TTL_SECONDS);

        BiometricHandoffSession session = new BiometricHandoffSession(
                token,
                authenticatedUserId,
                firstName,
                now,
                expiresAt
        );
        handoffRepository.save(session);

        return new CreateBiometricHandoffResponse(token, expiresAt, HANDOFF_TTL_SECONDS);
    }

    @Transactional
    public BiometricHandoffStatusResponse getStatusForOwner(UUID authenticatedUserId, String token) {
        BiometricHandoffSession session = findSessionOrThrow(token);

        // Anti-IDOR: apenas o titular que abriu o QR Code no PC pode consultar seu status
        if (!session.getUserId().equals(authenticatedUserId)) {
            throw new BusinessException(
                    "HANDOFF_FORBIDDEN",
                    "Você não tem permissão para consultar esta sessão de verificação.",
                    HttpStatus.FORBIDDEN
            );
        }

        OffsetDateTime now = OffsetDateTime.now();
        if (session.getStatus() == BiometricHandoffStatus.PENDING && session.isExpiredAt(now)) {
            session.markExpired();
            handoffRepository.save(session);
        }

        boolean verifiedBadge = profileRepository.findByUserId(authenticatedUserId)
                .map(Profile::isVerifiedBadge50plus)
                .orElse(false);

        return new BiometricHandoffStatusResponse(
                session.getStatus().name(),
                verifiedBadge,
                session.getExpiresAt(),
                session.getCompletedAt()
        );
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public BiometricHandoffSessionInfoResponse getPublicSessionInfo(String token) {
        BiometricHandoffSession session = findSessionOrThrow(token);
        OffsetDateTime now = OffsetDateTime.now();

        if (session.getStatus() == BiometricHandoffStatus.COMPLETED) {
            throw new BusinessException(
                    "HANDOFF_ALREADY_COMPLETED",
                    "Esta verificação facial já foi concluída. Você pode voltar ao computador.",
                    HttpStatus.GONE
            );
        }

        if (session.isExpiredAt(now)) {
            session.markExpired();
            handoffRepository.save(session);
            throw new BusinessException(
                    "HANDOFF_EXPIRED",
                    "Este código QR expirou. Gere um novo código no computador e tente novamente.",
                    HttpStatus.GONE
            );
        }

        return new BiometricHandoffSessionInfoResponse(
                session.getUserId().toString(),
                session.getFirstName(),
                session.getStatus().name(),
                session.getExpiresAt()
        );
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public VerifyBiometricsResponse completeHandoff(String token, VerifyBiometricsRequest request) {
        BiometricHandoffSession session = findSessionOrThrow(token);
        OffsetDateTime now = OffsetDateTime.now();

        if (session.getStatus() == BiometricHandoffStatus.COMPLETED) {
            throw new BusinessException(
                    "HANDOFF_ALREADY_COMPLETED",
                    "Este código QR já foi utilizado. Volte ao computador para continuar.",
                    HttpStatus.GONE
            );
        }

        if (session.isExpiredAt(now)) {
            session.markExpired();
            handoffRepository.save(session);
            throw new BusinessException(
                    "HANDOFF_EXPIRED",
                    "Este código QR expirou. Gere um novo código no computador.",
                    HttpStatus.GONE
            );
        }

        // Valida assinatura HS256, iss, jti anti-replay, exp, verified=true e sub == session.userId
        VerifyBiometricsResponse response = biometricsVerificationService.verifyAndGrantBadge(
                session.getUserId(),
                request
        );

        session.markCompleted(now);
        handoffRepository.save(session);

        return response;
    }

    private BiometricHandoffSession findSessionOrThrow(String token) {
        if (token == null || token.isBlank() || token.length() > 96) {
            throw new BusinessException(
                    "INVALID_HANDOFF_TOKEN",
                    "Código de verificação inválido.",
                    HttpStatus.NOT_FOUND
            );
        }
        return handoffRepository.findById(token.trim())
                .orElseThrow(() -> new BusinessException(
                        "HANDOFF_NOT_FOUND",
                        "Sessão de verificação facial não encontrada ou expirada.",
                        HttpStatus.NOT_FOUND
                ));
    }
}
