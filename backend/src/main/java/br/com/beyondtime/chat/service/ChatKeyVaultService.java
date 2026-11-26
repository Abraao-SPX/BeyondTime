package br.com.beyondtime.chat.service;

import br.com.beyondtime.biometrics.repository.VerificationAttemptRepository;
import br.com.beyondtime.chat.domain.UsedBiometricUnlockJti;
import br.com.beyondtime.chat.domain.UserChatKey;
import br.com.beyondtime.chat.dto.BiometricVaultUnlockResponse;
import br.com.beyondtime.chat.dto.ChatKeyVaultResponse;
import br.com.beyondtime.chat.dto.PublicChatKeyResponse;
import br.com.beyondtime.chat.dto.UpsertBiometricChatVaultRequest;
import br.com.beyondtime.chat.dto.UpsertChatKeyVaultRequest;
import br.com.beyondtime.chat.repository.ChatUserBlockRepository;
import br.com.beyondtime.chat.repository.UsedBiometricUnlockJtiRepository;
import br.com.beyondtime.chat.repository.UserChatKeyRepository;
import br.com.beyondtime.chat.service.ChatBiometricTokenVerifier.VerifiedBiometricClaims;
import br.com.beyondtime.chat.service.ChatVaultEnvelopeCrypto.SealedEnvelope;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.exception.ResourceNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class ChatKeyVaultService {

    private final UserChatKeyRepository userChatKeyRepository;
    private final UsedBiometricUnlockJtiRepository usedJtiRepository;
    private final VerificationAttemptRepository verificationAttemptRepository;
    private final ChatUserBlockRepository chatUserBlockRepository;
    private final ChatVaultEnvelopeCrypto envelopeCrypto;
    private final ChatBiometricTokenVerifier biometricTokenVerifier;

    public ChatKeyVaultService(
            UserChatKeyRepository userChatKeyRepository,
            UsedBiometricUnlockJtiRepository usedJtiRepository,
            VerificationAttemptRepository verificationAttemptRepository,
            ChatUserBlockRepository chatUserBlockRepository,
            ChatVaultEnvelopeCrypto envelopeCrypto,
            ChatBiometricTokenVerifier biometricTokenVerifier) {
        this.userChatKeyRepository = userChatKeyRepository;
        this.usedJtiRepository = usedJtiRepository;
        this.verificationAttemptRepository = verificationAttemptRepository;
        this.chatUserBlockRepository = chatUserBlockRepository;
        this.envelopeCrypto = envelopeCrypto;
        this.biometricTokenVerifier = biometricTokenVerifier;
    }

    @Transactional
    public ChatKeyVaultResponse upsertMyVault(UUID userId, UpsertChatKeyVaultRequest request) {
        String algorithm = (request.keyAlgorithm() == null || request.keyAlgorithm().isBlank())
                ? "ECDH-P256"
                : request.keyAlgorithm().trim();

        UserChatKey entity = userChatKeyRepository.findById(userId)
                .map(existing -> {
                    existing.rotateVault(
                            request.publicKeyJwk().trim(),
                            request.encryptedPrivateKey().trim(),
                            request.kdfSalt().trim(),
                            request.kdfIv().trim(),
                            request.kdfIterations(),
                            algorithm
                    );
                    return existing;
                })
                .orElseGet(() -> new UserChatKey(
                        userId,
                        request.publicKeyJwk().trim(),
                        request.encryptedPrivateKey().trim(),
                        request.kdfSalt().trim(),
                        request.kdfIv().trim(),
                        request.kdfIterations(),
                        algorithm
                ));

        UserChatKey saved = userChatKeyRepository.save(entity);
        return toVaultResponse(saved);
    }

    @Transactional
    public ChatKeyVaultResponse upsertMyBiometricVault(UUID userId, UpsertBiometricChatVaultRequest request) {
        String algorithm = (request.keyAlgorithm() == null || request.keyAlgorithm().isBlank())
                ? "ECDH-P256"
                : request.keyAlgorithm().trim();

        SealedEnvelope sealed = envelopeCrypto.seal(request.vaultSecret().trim());

        UserChatKey entity = userChatKeyRepository.findById(userId)
                .map(existing -> {
                    existing.rotateBiometricVault(
                            request.publicKeyJwk().trim(),
                            request.encryptedPrivateKey().trim(),
                            request.kdfSalt().trim(),
                            request.kdfIv().trim(),
                            request.kdfIterations(),
                            algorithm,
                            sealed.sealedCiphertext(),
                            sealed.sealedIv()
                    );
                    return existing;
                })
                .orElseGet(() -> UserChatKey.createBiometric(
                        userId,
                        request.publicKeyJwk().trim(),
                        request.encryptedPrivateKey().trim(),
                        request.kdfSalt().trim(),
                        request.kdfIv().trim(),
                        request.kdfIterations(),
                        algorithm,
                        sealed.sealedCiphertext(),
                        sealed.sealedIv()
                ));

        UserChatKey saved = userChatKeyRepository.save(entity);
        return toVaultResponse(saved);
    }

    @Transactional
    public BiometricVaultUnlockResponse unlockMyVaultWithBiometrics(UUID userId, String biometricToken) {
        VerifiedBiometricClaims claims = biometricTokenVerifier.validateFailClosed(biometricToken);

        // Anti-IDOR: o rosto validado precisa pertencer ao mesmo usuário autenticado
        if (!userId.toString().equalsIgnoreCase(claims.sub())) {
            throw new BusinessException(
                    "BIOMETRIC_USER_MISMATCH",
                    "A validação facial não corresponde ao titular desta conta.",
                    HttpStatus.FORBIDDEN
            );
        }

        String jti = claims.jti().trim();
        // Anti-replay (incluindo anti-replay cruzado com selo RF-11 — SEC-MED-02): cada JWT biométrico só pode ser usado 1 única vez
        if (usedJtiRepository.existsById(jti)
                || verificationAttemptRepository.existsByBiometricServiceJwtId(jti)) {
            throw new BusinessException(
                    "BIOMETRIC_TOKEN_REPLAY",
                    "Este comprovante de leitura facial já foi utilizado. Faça uma nova validação facial.",
                    HttpStatus.CONFLICT
            );
        }

        UserChatKey entity = userChatKeyRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cofre E2EE", userId));

        if (!"BIOMETRIC".equalsIgnoreCase(entity.getUnlockMode())
                || entity.getSealedVaultSecret() == null
                || entity.getSealedVaultIv() == null) {
            throw new BusinessException(
                    "VAULT_NOT_BIOMETRIC",
                    "Este cofre foi configurado com PIN de privacidade. Use seu PIN ou redefina o cofre.",
                    HttpStatus.CONFLICT
            );
        }

        usedJtiRepository.saveAndFlush(new UsedBiometricUnlockJti(jti, userId));

        String vaultSecret = envelopeCrypto.unseal(entity.getSealedVaultSecret(), entity.getSealedVaultIv());

        return new BiometricVaultUnlockResponse(
                entity.getUserId(),
                entity.getPublicKeyJwk(),
                entity.getEncryptedPrivateKey(),
                entity.getKdfSalt(),
                entity.getKdfIv(),
                entity.getKdfIterations(),
                entity.getKeyAlgorithm(),
                entity.getKeyVersion(),
                entity.getUnlockMode(),
                vaultSecret,
                entity.getUpdatedAt()
        );
    }

    @Transactional(readOnly = true)
    public Optional<ChatKeyVaultResponse> findMyVault(UUID userId) {
        return userChatKeyRepository.findById(userId).map(this::toVaultResponse);
    }

    @Transactional(readOnly = true)
    public PublicChatKeyResponse getPublicKeyForUser(UUID requesterUserId, UUID targetUserId) {
        if (requesterUserId != null
                && !requesterUserId.equals(targetUserId)
                && chatUserBlockRepository.existsBlockBetween(requesterUserId, targetUserId)) {
            throw new BusinessException(
                    "CONTACT_BLOCKED",
                    "Chave pública indisponível devido a bloqueio ativo entre os usuários.",
                    HttpStatus.FORBIDDEN
            );
        }
        return getPublicKey(targetUserId);
    }

    @Transactional(readOnly = true)
    public PublicChatKeyResponse getPublicKey(UUID targetUserId) {
        UserChatKey entity = userChatKeyRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Chave pública E2EE", targetUserId));
        return new PublicChatKeyResponse(
                entity.getUserId(),
                entity.getPublicKeyJwk(),
                entity.getKeyAlgorithm(),
                entity.getKeyVersion()
        );
    }

    private ChatKeyVaultResponse toVaultResponse(UserChatKey entity) {
        return new ChatKeyVaultResponse(
                entity.getUserId(),
                entity.getPublicKeyJwk(),
                entity.getEncryptedPrivateKey(),
                entity.getKdfSalt(),
                entity.getKdfIv(),
                entity.getKdfIterations(),
                entity.getKeyAlgorithm(),
                entity.getKeyVersion(),
                entity.getUnlockMode(),
                entity.getUpdatedAt()
        );
    }
}
