package br.com.beyondtime.biometrics.service;

import br.com.beyondtime.biometrics.domain.Profile;
import br.com.beyondtime.biometrics.domain.VerificationAttempt;
import br.com.beyondtime.biometrics.domain.VerificationStatus;
import br.com.beyondtime.biometrics.domain.VerificationType;
import br.com.beyondtime.biometrics.dto.VerifyBiometricsRequest;
import br.com.beyondtime.biometrics.dto.VerifyBiometricsResponse;
import br.com.beyondtime.biometrics.repository.ProfileRepository;
import br.com.beyondtime.biometrics.repository.VerificationAttemptRepository;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Service
public class BiometricsVerificationService {

    private static final Logger log = LoggerFactory.getLogger(BiometricsVerificationService.class);

    private final BiometricTokenValidator tokenValidator;
    private final ProfileRepository profileRepository;
    private final VerificationAttemptRepository verificationAttemptRepository;

    public BiometricsVerificationService(
            BiometricTokenValidator tokenValidator,
            ProfileRepository profileRepository,
            VerificationAttemptRepository verificationAttemptRepository) {
        this.tokenValidator = tokenValidator;
        this.profileRepository = profileRepository;
        this.verificationAttemptRepository = verificationAttemptRepository;
    }

    @Transactional
    public VerifyBiometricsResponse verifyAndGrantBadge(UUID authenticatedUserId, VerifyBiometricsRequest request) {
        if (authenticatedUserId == null) {
            throw new BusinessException("UNAUTHENTICATED", "Usuário não autenticado.", HttpStatus.UNAUTHORIZED);
        }

        // 1. Valida o token gerado pelo microserviço Python de reconhecimento facial
        BiometricTokenValidator.BiometricClaims claims = tokenValidator.validateAndParse(request.biometricToken());

        // 2. Confirma se o subject do token corresponde ao usuário autenticado (ou ao seu alias UUID)
        UUID claimedUserId;
        try {
            claimedUserId = UUID.fromString(claims.sub());
        } catch (IllegalArgumentException e) {
            log.warn("Subject do token biométrico não é UUID padrão: {}", claims.sub());
            // Se o sub não for UUID, mas igual a string do id autenticado
            if (!claims.sub().equalsIgnoreCase(authenticatedUserId.toString())) {
                throw new BusinessException(
                        "BIOMETRIC_IDENTITY_MISMATCH",
                        "O token biométrico apresentado não pertence ao usuário autenticado.",
                        HttpStatus.FORBIDDEN
                );
            }
            claimedUserId = authenticatedUserId;
        }

        if (!authenticatedUserId.equals(claimedUserId)) {
            throw new BusinessException(
                    "BIOMETRIC_IDENTITY_MISMATCH",
                    "O token biométrico apresentado pertence a outro usuário.",
                    HttpStatus.FORBIDDEN
            );
        }

        // 3. Busca o perfil do usuário
        Profile profile = profileRepository.findByUserId(authenticatedUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Perfil do usuário", authenticatedUserId));

        // 4. Converte a distância euclidiana/cosseno para persistência
        BigDecimal distance = null;
        if (claims.distance() != null) {
            distance = BigDecimal.valueOf(claims.distance()).setScale(4, RoundingMode.HALF_UP);
        }

        // 5. Registra a tentativa de verificação para fins de auditoria (RF11 / LGPD)
        String jwtIdentifier = (claims.jti() != null && !claims.jti().isBlank())
                ? claims.jti()
                : claims.sub() + ":" + System.currentTimeMillis();

        VerificationAttempt attempt = new VerificationAttempt(
                authenticatedUserId,
                VerificationType.FACIAL_LIVENESS_YUNET_SFACE,
                VerificationStatus.VERIFIED,
                true,
                distance,
                jwtIdentifier
        );
        verificationAttemptRepository.save(attempt);

        // 6. Concede o Selo de Verificado 50+ e atualiza status do perfil
        profile.grantVerifiedBadge50Plus();
        profileRepository.save(profile);

        log.info("Selo de Verificado 50+ concedido com sucesso para o usuário {} (perfil {})", authenticatedUserId, profile.getId());

        return new VerifyBiometricsResponse(
                true,
                "Selo de Verificado 50+ concedido com sucesso após prova de vida e validação facial.",
                profile.getId(),
                authenticatedUserId,
                profile.isVerifiedBadge50plus(),
                profile.getVerificationStatus(),
                profile.getVerifiedAt(),
                distance,
                true
        );
    }
}
