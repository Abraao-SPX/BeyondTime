package br.com.beyondtime.auth.service;

import br.com.beyondtime.auth.domain.LgpdDataRequest;
import br.com.beyondtime.auth.domain.OAuthProvider;
import br.com.beyondtime.auth.domain.PasswordResetToken;
import br.com.beyondtime.auth.domain.RefreshToken;
import br.com.beyondtime.auth.domain.User;
import br.com.beyondtime.auth.domain.UserOAuthAccount;
import br.com.beyondtime.auth.dto.AuthResponse;
import br.com.beyondtime.auth.dto.ChangePasswordRequest;
import br.com.beyondtime.auth.dto.DeleteAccountRequest;
import br.com.beyondtime.auth.dto.ForgotPasswordRequest;
import br.com.beyondtime.auth.dto.ForgotPasswordResponse;
import br.com.beyondtime.auth.dto.LoginRequest;
import br.com.beyondtime.auth.dto.LogoutRequest;
import br.com.beyondtime.auth.dto.RefreshTokenRequest;
import br.com.beyondtime.auth.dto.RegisterRequest;
import br.com.beyondtime.auth.dto.ResetPasswordRequest;
import br.com.beyondtime.auth.dto.SocialLoginRequest;
import br.com.beyondtime.auth.dto.VerifyResetCodeRequest;
import br.com.beyondtime.auth.dto.VerifyResetCodeResponse;
import br.com.beyondtime.auth.dto.FirebaseTokenClaims;
import br.com.beyondtime.auth.repository.LgpdDataRequestRepository;
import br.com.beyondtime.auth.repository.PasswordResetTokenRepository;
import br.com.beyondtime.auth.repository.RefreshTokenRepository;
import br.com.beyondtime.auth.repository.UserOAuthAccountRepository;
import br.com.beyondtime.auth.repository.UserRepository;
import br.com.beyondtime.biometrics.service.BiometricServiceClient;
import br.com.beyondtime.chat.service.ChatMediaService;
import br.com.beyondtime.profile.repository.ProfilePhotoRepository;
import br.com.beyondtime.profile.repository.ProfileRepository;
import br.com.beyondtime.profile.service.AvatarService;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.security.JwtService;
import br.com.beyondtime.shared.util.AgeValidator;
import br.com.beyondtime.shared.util.XssSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final String FORGOT_PASSWORD_SAFE_MESSAGE =
            "Se o e-mail informado estiver cadastrado e ativo, você receberá um código de 6 caracteres válido por 15 minutos.";
    private static final String UNIFIED_INVALID_RESET_CODE_MESSAGE =
            "Código de recuperação inválido, expirado ou já utilizado. Solicite um novo código.";
    private static final String RESET_CODE_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final int RESET_CODE_LENGTH = 6;
    private static final int MAX_FAILED_RESET_ATTEMPTS = 5;

    private final UserRepository userRepository;
    private final UserOAuthAccountRepository oauthAccountRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final LgpdDataRequestRepository lgpdDataRequestRepository;
    private final ProfileRepository profileRepository;
    private final ProfilePhotoRepository profilePhotoRepository;
    private final AvatarService avatarService;
    private final BiometricServiceClient biometricServiceClient;
    private final ChatMediaService chatMediaService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final PasswordResetMailService passwordResetMailService;
    private final FirebaseTokenVerifierService firebaseTokenVerifierService;
    private final JdbcTemplate jdbcTemplate;
    private final long passwordResetExpirationMinutes;
    private final boolean exposeDebugResetCode;
    private final int maxFailedLoginAttempts;
    private final long loginLockMinutes;
    private final String dummyBcryptHash;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            UserRepository userRepository,
            UserOAuthAccountRepository oauthAccountRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            LgpdDataRequestRepository lgpdDataRequestRepository,
            ProfileRepository profileRepository,
            ProfilePhotoRepository profilePhotoRepository,
            AvatarService avatarService,
            BiometricServiceClient biometricServiceClient,
            ChatMediaService chatMediaService,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            PasswordResetMailService passwordResetMailService,
            FirebaseTokenVerifierService firebaseTokenVerifierService,
            JdbcTemplate jdbcTemplate,
            Environment environment,
            @Value("${beyondtime.security.password-reset.expiration-minutes:15}") long passwordResetExpirationMinutes,
            @Value("${beyondtime.security.password-reset.expose-debug-code:false}") boolean exposeDebugResetCode,
            @Value("${beyondtime.security.login.max-failed-attempts:5}") int maxFailedLoginAttempts,
            @Value("${beyondtime.security.login.lock-minutes:15}") long loginLockMinutes) {
        this.userRepository = userRepository;
        this.oauthAccountRepository = oauthAccountRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.lgpdDataRequestRepository = lgpdDataRequestRepository;
        this.profileRepository = profileRepository;
        this.profilePhotoRepository = profilePhotoRepository;
        this.avatarService = avatarService;
        this.biometricServiceClient = biometricServiceClient;
        this.chatMediaService = chatMediaService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.passwordResetMailService = passwordResetMailService;
        this.firebaseTokenVerifierService = firebaseTokenVerifierService;
        this.jdbcTemplate = jdbcTemplate;
        this.passwordResetExpirationMinutes = passwordResetExpirationMinutes;
        this.exposeDebugResetCode = exposeDebugResetCode && environment != null && environment.acceptsProfiles(Profiles.of("test"));
        this.maxFailedLoginAttempts = maxFailedLoginAttempts;
        this.loginLockMinutes = loginLockMinutes;
        this.dummyBcryptHash = passwordEncoder.encode("BeyondTimeDummyConstantTimePassword2026!");
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // RF02: Bloqueio obrigatório de cadastro para idade < 50 anos
        AgeValidator.enforceMinimumAge50Plus(request.birthDate());

        if (XssSanitizer.containsMaliciousScript(request.email())
                || XssSanitizer.containsMaliciousScript(request.phone())) {
            throw new BusinessException(
                    "XSS_PAYLOAD_DETECTED",
                    "Conteúdo não permitido detectado nos dados de cadastro.",
                    HttpStatus.BAD_REQUEST
            );
        }

        String normalizedEmail = normalizeEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new BusinessException(
                    "EMAIL_ALREADY_REGISTERED",
                    "Não foi possível concluir o cadastro com o e-mail informado.",
                    HttpStatus.CONFLICT
            );
        }

        String normalizedPhone = (request.phone() != null && !request.phone().isBlank())
                ? XssSanitizer.sanitizeSingleLine(request.phone())
                : null;
        if (normalizedPhone != null && userRepository.existsByPhone(normalizedPhone)) {
            throw new BusinessException(
                    "PHONE_ALREADY_REGISTERED",
                    "Não foi possível concluir o cadastro com o telefone informado.",
                    HttpStatus.CONFLICT
            );
        }

        String passwordHash = passwordEncoder.encode(request.password());
        User user = new User(normalizedEmail, normalizedPhone, passwordHash, request.birthDate());
        user = userRepository.save(user);

        return issueTokensForUser(user);
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        User user = userRepository.findByEmailIgnoreCaseForUpdate(normalizedEmail).orElse(null);
        OffsetDateTime now = OffsetDateTime.now();

        if (user != null && user.isCurrentlyLocked(now)) {
            long remainingSeconds = Math.max(1, Duration.between(now, user.getLockedUntil()).getSeconds());
            long remainingMinutes = Math.max(1, (remainingSeconds + 59) / 60);
            throw new BusinessException(
                    "TOO_MANY_LOGIN_ATTEMPTS",
                    "Muitas tentativas de login sem sucesso. Por segurança, sua conta foi bloqueada temporariamente por "
                            + remainingMinutes + " minuto(s). Você também pode redefinir sua senha em 'Esqueceu a senha?'.",
                    HttpStatus.TOO_MANY_REQUESTS
            );
        }

        String targetHash = (user != null && user.getPasswordHash() != null)
                ? user.getPasswordHash()
                : dummyBcryptHash;
        boolean passwordMatches = passwordEncoder.matches(request.password(), targetHash);

        if (user == null || user.getPasswordHash() == null || !passwordMatches) {
            if (user != null && user.isActive()) {
                int attempts = user.recordFailedLoginAttempt(maxFailedLoginAttempts, loginLockMinutes, now);
                userRepository.saveAndFlush(user);
                if (attempts >= maxFailedLoginAttempts) {
                    throw new BusinessException(
                            "TOO_MANY_LOGIN_ATTEMPTS",
                            "Você excedeu o limite de " + maxFailedLoginAttempts
                                    + " tentativas de login. Por segurança, o acesso foi bloqueado por "
                                    + loginLockMinutes + " minutos.",
                            HttpStatus.TOO_MANY_REQUESTS
                    );
                }
            }
            throw new BusinessException(
                    "INVALID_CREDENTIALS",
                    "E-mail ou senha inválidos.",
                    HttpStatus.UNAUTHORIZED
            );
        }

        ensureUserIsActive(user);
        if (user.getFailedLoginAttempts() > 0 || user.getLockedUntil() != null) {
            user.resetLoginAttempts();
            userRepository.save(user);
        }
        return issueTokensForUser(user);
    }

    @Transactional
    public AuthResponse loginWithSocialProvider(SocialLoginRequest request) {
        FirebaseTokenClaims claims = firebaseTokenVerifierService.verify(request.idToken());

        OAuthProvider provider = claims.provider();
        String providerUserId = claims.uid();
        String normalizedEmail = claims.email().trim().toLowerCase(Locale.ROOT);

        var existingOAuth = oauthAccountRepository.findByProviderAndProviderUserId(provider, providerUserId);
        if (existingOAuth.isPresent()) {
            User user = existingOAuth.get().getUser();
            ensureUserIsActive(user);
            return issueTokensForUser(user);
        }

        User user = userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);
        if (user == null) {
            if (request.birthDate() == null) {
                throw new BusinessException(
                        "BIRTH_DATE_REQUIRED_FOR_NEW_OAUTH_ACCOUNT",
                        "Para concluir seu primeiro acesso com Google ou Facebook, informe sua data de nascimento para validarmos a regra 50+.",
                        HttpStatus.PRECONDITION_REQUIRED
                );
            }
            AgeValidator.enforceMinimumAge50Plus(request.birthDate());
            user = userRepository.save(new User(normalizedEmail, null, null, request.birthDate()));
            oauthAccountRepository.save(new UserOAuthAccount(user, provider, providerUserId));
            return issueTokensForUser(user);
        }

        ensureUserIsActive(user);

        if (!claims.emailVerified()) {
            throw new BusinessException(
                    "EMAIL_NOT_VERIFIED_BY_PROVIDER",
                    "O e-mail da sua conta social não foi verificado pelo provedor. Verifique seu e-mail no Google ou Facebook.",
                    HttpStatus.FORBIDDEN
            );
        }

        if (oauthAccountRepository.existsByUserIdAndProvider(user.getId(), provider)) {
            throw new BusinessException(
                    "OAUTH_ACCOUNT_CONFLICT",
                    "Esta conta já está vinculada a outro identificador deste provedor social.",
                    HttpStatus.CONFLICT
            );
        }

        oauthAccountRepository.save(new UserOAuthAccount(user, provider, providerUserId));

        return issueTokensForUser(user);
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String tokenHash = jwtService.hashRefreshToken(request.refreshToken().trim());
        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new BusinessException(
                        "INVALID_REFRESH_TOKEN",
                        "Sessão inválida ou expirada. Faça login novamente.",
                        HttpStatus.UNAUTHORIZED
                ));

        if (storedToken.getRevokedAt() != null) {
            refreshTokenRepository.revokeAllActiveTokensByUserId(
                    storedToken.getUser().getId(),
                    OffsetDateTime.now()
            );
            log.warn("[BeyondTime Auth] Reuso de refresh token revogado detectado para userId={}. Todas as sessões ativas foram revogadas.",
                    storedToken.getUser().getId());
            throw new BusinessException(
                    "EXPIRED_OR_REVOKED_REFRESH_TOKEN",
                    "Sessão expirada ou revogada. Faça login novamente.",
                    HttpStatus.UNAUTHORIZED
            );
        }

        if (!storedToken.isValid()) {
            throw new BusinessException(
                    "EXPIRED_OR_REVOKED_REFRESH_TOKEN",
                    "Sessão expirada ou revogada. Faça login novamente.",
                    HttpStatus.UNAUTHORIZED
            );
        }

        User user = storedToken.getUser();
        ensureUserIsActive(user);

        storedToken.revoke();
        refreshTokenRepository.save(storedToken);

        return issueTokensForUser(user);
    }

    @Transactional
    public void logout(UUID authenticatedUserId, LogoutRequest request) {
        OffsetDateTime now = OffsetDateTime.now();
        if (request != null && request.refreshToken() != null && !request.refreshToken().isBlank()) {
            String tokenHash = jwtService.hashRefreshToken(request.refreshToken().trim());
            refreshTokenRepository.findByTokenHash(tokenHash)
                    .filter(rt -> rt.getUser().getId().equals(authenticatedUserId))
                    .ifPresent(rt -> {
                        rt.revoke();
                        refreshTokenRepository.save(rt);
                    });
        } else {
            refreshTokenRepository.revokeAllActiveTokensByUserId(authenticatedUserId, now);
        }
        refreshTokenRepository.deleteInactiveTokensByUserId(authenticatedUserId, now);
    }

    @Transactional
    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        long expiresInSeconds = passwordResetExpirationMinutes * 60;

        User user = userRepository.findByEmailIgnoreCaseForUpdate(normalizedEmail).orElse(null);
        if (user == null || !user.isActive()) {
            hashResetCodeForUser(UUID.randomUUID(), "000000");
            return ForgotPasswordResponse.of(FORGOT_PASSWORD_SAFE_MESSAGE, expiresInSeconds, null);
        }

        OffsetDateTime now = OffsetDateTime.now();
        passwordResetTokenRepository.deleteAllByUserId(user.getId());

        String assortedResetCode = generateAssortedResetCode();
        String tokenHash = hashResetCodeForUser(user.getId(), assortedResetCode);
        OffsetDateTime expiresAt = now.plusMinutes(passwordResetExpirationMinutes);

        passwordResetTokenRepository.save(new PasswordResetToken(user, tokenHash, expiresAt));
        passwordResetMailService.sendResetCode(normalizedEmail, assortedResetCode, passwordResetExpirationMinutes);
        log.info("[BeyondTime Auth] Solicitação de recuperação de senha registrada para userId={} (expira em {} min).",
                user.getId(), passwordResetExpirationMinutes);

        return ForgotPasswordResponse.of(
                FORGOT_PASSWORD_SAFE_MESSAGE,
                expiresInSeconds,
                exposeDebugResetCode ? assortedResetCode : null
        );
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public VerifyResetCodeResponse verifyResetCode(VerifyResetCodeRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        String cleanCode = normalizeResetCode(request.code());

        findValidResetTokenOrThrow(normalizedEmail, cleanCode);
        return new VerifyResetCodeResponse(true, "Código de recuperação validado com sucesso. Agora escolha sua nova senha.");
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public void resetPassword(ResetPasswordRequest request) {
        validatePasswordConfirmation(request.newPassword(), request.confirmPassword());

        String normalizedEmail = normalizeEmail(request.email());
        String cleanCode = normalizeResetCode(request.code());

        PasswordResetToken resetToken = findValidResetTokenOrThrow(normalizedEmail, cleanCode);
        User user = resetToken.getUser();

        if (user.getPasswordHash() != null && passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new BusinessException(
                    "SAME_AS_OLD_PASSWORD",
                    "A nova senha deve ser diferente da senha anterior."
            );
        }

        resetToken.markAsUsed();
        passwordResetTokenRepository.save(resetToken);

        user.changePassword(passwordEncoder.encode(request.newPassword()));
        user.resetLoginAttempts();
        userRepository.save(user);

        OffsetDateTime now = OffsetDateTime.now();
        refreshTokenRepository.revokeAllActiveTokensByUserId(user.getId(), now);
        refreshTokenRepository.deleteInactiveTokensByUserId(user.getId(), now);
    }

    @Transactional
    public void changePassword(UUID authenticatedUserId, ChangePasswordRequest request) {
        validatePasswordConfirmation(request.newPassword(), request.confirmPassword());

        User user = userRepository.findById(authenticatedUserId)
                .orElseThrow(() -> new BusinessException(
                        "USER_NOT_FOUND",
                        "Usuário não encontrado.",
                        HttpStatus.NOT_FOUND
                ));

        ensureUserIsActive(user);

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BusinessException(
                    "INVALID_CURRENT_PASSWORD",
                    "A senha atual informada está incorreta.",
                    HttpStatus.UNAUTHORIZED
            );
        }

        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new BusinessException(
                    "SAME_AS_OLD_PASSWORD",
                    "A nova senha deve ser diferente da senha atual."
            );
        }

        user.changePassword(passwordEncoder.encode(request.newPassword()));
        user.resetLoginAttempts();
        userRepository.save(user);

        OffsetDateTime now = OffsetDateTime.now();
        refreshTokenRepository.revokeAllActiveTokensByUserId(user.getId(), now);
        refreshTokenRepository.deleteInactiveTokensByUserId(user.getId(), now);
    }

    /**
     * RF14 — Exclusão Definitiva de Conta e Dados Pessoais (LGPD).
     * Exige confirmação via modal defensivo (RF06) e validação de senha quando a conta possui senha local.
     */
    @Transactional
    public void deleteAccount(UUID authenticatedUserId, DeleteAccountRequest request) {
        User user = userRepository.findById(authenticatedUserId)
                .orElseThrow(() -> new BusinessException(
                        "USER_NOT_FOUND",
                        "Usuário não encontrado.",
                        HttpStatus.NOT_FOUND
                ));

        ensureUserIsActive(user);

        if (request == null || !Boolean.TRUE.equals(request.confirmedViaDefensiveModal())) {
            throw new BusinessException(
                    "DEFENSIVE_CONFIRMATION_REQUIRED",
                    "Confirme a exclusão da conta no modal de segurança (RF-06) para prosseguir.",
                    HttpStatus.BAD_REQUEST
            );
        }

        if (user.getPasswordHash() != null) {
            String rawPassword = request.password() != null ? request.password() : "";
            if (rawPassword.isBlank() || !passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
                throw new BusinessException(
                        "INVALID_PASSWORD_FOR_DELETION",
                        "Para excluir sua conta definitivamente, confirme sua senha atual corretamente.",
                        HttpStatus.UNAUTHORIZED
                );
            }
        }

        OffsetDateTime now = OffsetDateTime.now();

        // Limpeza de tokens e credenciais
        refreshTokenRepository.deleteAllByUserId(user.getId());
        passwordResetTokenRepository.deleteAllByUserId(user.getId());
        oauthAccountRepository.deleteAllByUserId(user.getId());

        // Coleta arquivos físicos (avatares e mídias cifradas .enc das conversas do usuário) para remoção após commit
        List<String> avatarKeysToDelete = new ArrayList<>();
        List<String> encryptedMediaFilesToDelete = new ArrayList<>();
        if (jdbcTemplate != null) {
            encryptedMediaFilesToDelete.addAll(jdbcTemplate.queryForList(
                    "SELECT DISTINCT m.storage_filename FROM encrypted_chat_media m " +
                            "LEFT JOIN conversations c ON c.id = m.conversation_id " +
                            "LEFT JOIN matches mt ON mt.id = c.match_id " +
                            "WHERE m.uploader_user_id = ? OR mt.user_a_id = ? OR mt.user_b_id = ?",
                    String.class,
                    user.getId(), user.getId(), user.getId()
            ));
        }

        // Limpeza de registros de perfil e dependências diretas (SEC-MED-07 / RF14)
        profileRepository.findByUserId(user.getId()).ifPresent(profile -> {
            profilePhotoRepository.findAllByProfileIdOrderByPositionAsc(profile.getId())
                    .forEach(photo -> avatarKeysToDelete.add(photo.getObjectKey()));
            executeDelete("DELETE FROM profile_hobbies WHERE profile_id = ?", profile.getId());
            executeDelete("DELETE FROM profile_intents WHERE profile_id = ?", profile.getId());
            executeDelete("DELETE FROM profile_photos WHERE profile_id = ?", profile.getId());
            profileRepository.delete(profile);
        });
        profileRepository.deleteByUserId(user.getId());

        // Limpeza de configurações de acessibilidade e preferências de descoberta
        executeDelete("DELETE FROM accessibility_preferences WHERE user_id = ?", user.getId());
        executeDelete("DELETE FROM discovery_preference_intents WHERE user_id = ?", user.getId());
        executeDelete("DELETE FROM discovery_preferences WHERE user_id = ?", user.getId());

        // Limpeza de hobbies associativos 3FN (RF03 / RF04)
        executeDelete("DELETE FROM user_hobbies WHERE user_id = ?", user.getId());

        // Limpeza explícita de cofre E2EE e JTIs biométricos (soft-delete em users não dispara ON DELETE CASCADE — AUD-011)
        executeDelete("DELETE FROM used_biometric_unlock_jtis WHERE user_id = ?", user.getId());
        executeDelete("DELETE FROM user_chat_keys WHERE user_id = ?", user.getId());

        // Encerramento e limpeza consistente de matches e interações (RF05 — cascateia conversations, encrypted_messages e encrypted_chat_media)
        executeDelete("DELETE FROM profile_interactions WHERE from_user_id = ? OR to_user_id = ?", user.getId(), user.getId());
        executeDelete("DELETE FROM matches WHERE user_a_id = ? OR user_b_id = ?", user.getId(), user.getId());
        executeDelete("DELETE FROM user_blocks WHERE blocker_user_id = ? OR blocked_user_id = ?", user.getId(), user.getId());

        // Exclusão de tentativas de verificação biométrica e sessões temporárias de handoff (LGPD / RF14 / SEC-ALTA-02)
        executeDelete("DELETE FROM verification_attempts WHERE user_id = ?", user.getId());
        executeDelete("DELETE FROM biometric_handoff_sessions WHERE user_id = ?", user.getId());

        LgpdDataRequest deletionRequest = lgpdDataRequestRepository.save(
                biometricServiceClient != null
                        ? LgpdDataRequest.createProcessingAccountDeletion(user.getId(), true, now)
                        : LgpdDataRequest.createCompletedAccountDeletion(user.getId(), true, now)
        );
        UUID deletionRequestId = deletionRequest.getId();

        user.anonymizeAndMarkDeleted(now);
        userRepository.saveAndFlush(user);

        Runnable cleanupFilesOnDisk = () -> {
            avatarKeysToDelete.forEach(avatarService::deleteAvatarQuietly);
            if (chatMediaService != null) {
                chatMediaService.deleteEncryptedMediaFilesQuietly(encryptedMediaFilesToDelete);
            }
            if (biometricServiceClient != null) {
                boolean biometricDeleted = biometricServiceClient.deleteUserBiometrics(user.getId());
                if (biometricDeleted && deletionRequestId != null) {
                    lgpdDataRequestRepository.findById(deletionRequestId).ifPresent(req -> {
                        req.markCompleted(OffsetDateTime.now());
                        lgpdDataRequestRepository.save(req);
                    });
                }
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    cleanupFilesOnDisk.run();
                }
            });
        } else {
            cleanupFilesOnDisk.run();
        }

        log.info("[BeyondTime LGPD RF-14] Conta userId={} excluída e anonimizada definitivamente com trilha de auditoria LGPD.",
                authenticatedUserId);
    }

    private void executeDelete(String sql, Object... params) {
        if (jdbcTemplate != null) {
            jdbcTemplate.update(sql, params);
        }
    }

    private PasswordResetToken findValidResetTokenOrThrow(String normalizedEmail, String normalizedCode) {
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);

        if (user == null || !user.isActive()) {
            hashResetCodeForUser(UUID.randomUUID(), normalizedCode);
            throw new BusinessException("INVALID_OR_EXPIRED_RESET_CODE", UNIFIED_INVALID_RESET_CODE_MESSAGE);
        }

        PasswordResetToken activeToken = passwordResetTokenRepository
                .findActiveTokenByUserIdForUpdate(user.getId())
                .orElseThrow(() -> new BusinessException("INVALID_OR_EXPIRED_RESET_CODE", UNIFIED_INVALID_RESET_CODE_MESSAGE));

        if (!activeToken.isValid()) {
            activeToken.markAsUsed();
            passwordResetTokenRepository.save(activeToken);
            throw new BusinessException("INVALID_OR_EXPIRED_RESET_CODE", UNIFIED_INVALID_RESET_CODE_MESSAGE);
        }

        String candidateHash = hashResetCodeForUser(user.getId(), normalizedCode);
        boolean hashesMatch = MessageDigest.isEqual(
                candidateHash.getBytes(StandardCharsets.UTF_8),
                activeToken.getTokenHash().getBytes(StandardCharsets.UTF_8)
        );

        if (!hashesMatch) {
            int attempts = activeToken.incrementFailedAttempts();
            if (attempts >= MAX_FAILED_RESET_ATTEMPTS) {
                activeToken.markAsUsed();
                passwordResetTokenRepository.save(activeToken);
                throw new BusinessException(
                        "TOO_MANY_RESET_CODE_ATTEMPTS",
                        "Você excedeu o limite de 5 tentativas para este código. Por segurança, solicite um novo código de recuperação.",
                        HttpStatus.TOO_MANY_REQUESTS
                );
            }
            passwordResetTokenRepository.save(activeToken);
            throw new BusinessException("INVALID_OR_EXPIRED_RESET_CODE", UNIFIED_INVALID_RESET_CODE_MESSAGE);
        }

        return activeToken;
    }

    private void validatePasswordConfirmation(String newPassword, String confirmPassword) {
        if (!newPassword.equals(confirmPassword)) {
            throw new BusinessException(
                    "PASSWORD_CONFIRMATION_MISMATCH",
                    "A confirmação de senha não confere com a nova senha digitada."
            );
        }
    }

    private String generateAssortedResetCode() {
        StringBuilder sb = new StringBuilder(RESET_CODE_LENGTH);
        for (int i = 0; i < RESET_CODE_LENGTH; i++) {
            int randomIndex = secureRandom.nextInt(RESET_CODE_ALPHABET.length());
            sb.append(RESET_CODE_ALPHABET.charAt(randomIndex));
        }
        return sb.toString();
    }

    private String normalizeEmail(String rawEmail) {
        return XssSanitizer.sanitizeSingleLine(rawEmail).toLowerCase(Locale.ROOT);
    }

    private String normalizeResetCode(String rawCode) {
        return rawCode.trim().toUpperCase(Locale.ROOT);
    }

    private String hashResetCodeForUser(UUID userId, String normalizedCode) {
        return jwtService.hashWithSecretPepper(userId + ":" + normalizedCode);
    }

    private void ensureUserIsActive(User user) {
        if (!user.isActive()) {
            throw new BusinessException(
                    "ACCOUNT_NOT_ACTIVE",
                    "Esta conta não está ativa no momento (" + user.getStatus().name() + ").",
                    HttpStatus.FORBIDDEN
            );
        }
    }

    private AuthResponse issueTokensForUser(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        String rawRefreshToken = jwtService.generateRawRefreshToken();
        String refreshTokenHash = jwtService.hashRefreshToken(rawRefreshToken);

        OffsetDateTime expiresAt = OffsetDateTime.now().plusDays(jwtService.getRefreshTokenExpirationDays());
        refreshTokenRepository.save(new RefreshToken(user, refreshTokenHash, expiresAt));

        return AuthResponse.of(
                user,
                accessToken,
                rawRefreshToken,
                jwtService.getAccessTokenExpirationSeconds(),
                jwtService.getRefreshTokenExpirationSeconds()
        );
    }
}
