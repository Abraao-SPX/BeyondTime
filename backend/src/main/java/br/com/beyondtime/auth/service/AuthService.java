package br.com.beyondtime.auth.service;

import br.com.beyondtime.auth.domain.OAuthProvider;
import br.com.beyondtime.auth.domain.PasswordResetToken;
import br.com.beyondtime.auth.domain.RefreshToken;
import br.com.beyondtime.auth.domain.User;
import br.com.beyondtime.auth.domain.UserOAuthAccount;
import br.com.beyondtime.auth.dto.AuthResponse;
import br.com.beyondtime.auth.dto.ChangePasswordRequest;
import br.com.beyondtime.auth.dto.ForgotPasswordRequest;
import br.com.beyondtime.auth.dto.ForgotPasswordResponse;
import br.com.beyondtime.auth.dto.GoogleLoginRequest;
import br.com.beyondtime.auth.dto.LoginRequest;
import br.com.beyondtime.auth.dto.LogoutRequest;
import br.com.beyondtime.auth.dto.RefreshTokenRequest;
import br.com.beyondtime.auth.dto.RegisterRequest;
import br.com.beyondtime.auth.dto.ResetPasswordRequest;
import br.com.beyondtime.auth.dto.VerifyResetCodeRequest;
import br.com.beyondtime.auth.dto.VerifyResetCodeResponse;
import br.com.beyondtime.auth.repository.PasswordResetTokenRepository;
import br.com.beyondtime.auth.repository.RefreshTokenRepository;
import br.com.beyondtime.auth.repository.UserOAuthAccountRepository;
import br.com.beyondtime.auth.repository.UserRepository;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.security.JwtService;
import br.com.beyondtime.shared.util.AgeValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
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
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final long passwordResetExpirationMinutes;
    private final boolean exposeDebugResetCode;
    private final String dummyBcryptHash;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            UserRepository userRepository,
            UserOAuthAccountRepository oauthAccountRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            @Value("${beyondtime.security.password-reset.expiration-minutes:15}") long passwordResetExpirationMinutes,
            @Value("${beyondtime.security.password-reset.expose-debug-code:false}") boolean exposeDebugResetCode) {
        this.userRepository = userRepository;
        this.oauthAccountRepository = oauthAccountRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.passwordResetExpirationMinutes = passwordResetExpirationMinutes;
        this.exposeDebugResetCode = exposeDebugResetCode;
        this.dummyBcryptHash = passwordEncoder.encode("BeyondTimeDummyConstantTimePassword2026!");
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // RF02: Bloqueio obrigatório de cadastro para idade < 50 anos
        AgeValidator.enforceMinimumAge50Plus(request.birthDate());

        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new BusinessException(
                    "EMAIL_ALREADY_REGISTERED",
                    "Não foi possível concluir o cadastro com o e-mail informado.",
                    HttpStatus.CONFLICT
            );
        }

        String normalizedPhone = (request.phone() != null && !request.phone().isBlank())
                ? request.phone().trim()
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

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);

        String targetHash = (user != null && user.getPasswordHash() != null)
                ? user.getPasswordHash()
                : dummyBcryptHash;
        boolean passwordMatches = passwordEncoder.matches(request.password(), targetHash);

        if (user == null || user.getPasswordHash() == null || !passwordMatches) {
            throw new BusinessException(
                    "INVALID_CREDENTIALS",
                    "E-mail ou senha inválidos.",
                    HttpStatus.UNAUTHORIZED
            );
        }

        ensureUserIsActive(user);
        return issueTokensForUser(user);
    }

    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        String providerUserId = request.googleUserId().trim();
        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);

        var existingOAuth = oauthAccountRepository.findByProviderAndProviderUserId(OAuthProvider.GOOGLE, providerUserId);
        if (existingOAuth.isPresent()) {
            User user = existingOAuth.get().getUser();
            ensureUserIsActive(user);
            return issueTokensForUser(user);
        }

        User user = userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);
        if (user == null) {
            if (request.birthDate() == null) {
                throw new BusinessException(
                        "BIRTH_DATE_REQUIRED_FOR_NEW_GOOGLE_ACCOUNT",
                        "Para o primeiro acesso com Google, informe sua data de nascimento para validarmos a regra 50+."
                );
            }
            AgeValidator.enforceMinimumAge50Plus(request.birthDate());
            user = userRepository.save(new User(normalizedEmail, null, null, request.birthDate()));
        } else {
            ensureUserIsActive(user);
        }

        if (!oauthAccountRepository.existsByUserIdAndProvider(user.getId(), OAuthProvider.GOOGLE)) {
            oauthAccountRepository.save(new UserOAuthAccount(user, OAuthProvider.GOOGLE, providerUserId));
        }

        return issueTokensForUser(user);
    }

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String tokenHash = jwtService.hashRefreshToken(request.refreshToken().trim());
        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new BusinessException(
                        "INVALID_REFRESH_TOKEN",
                        "Sessão inválida ou expirada. Faça login novamente.",
                        HttpStatus.UNAUTHORIZED
                ));

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
        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
        long expiresInSeconds = passwordResetExpirationMinutes * 60;

        User user = userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);
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
        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
        String cleanCode = normalizeResetCode(request.code());

        findValidResetTokenOrThrow(normalizedEmail, cleanCode);
        return new VerifyResetCodeResponse(true, "Código de recuperação validado com sucesso. Agora escolha sua nova senha.");
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public void resetPassword(ResetPasswordRequest request) {
        validatePasswordConfirmation(request.newPassword(), request.confirmPassword());

        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
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
        userRepository.save(user);

        OffsetDateTime now = OffsetDateTime.now();
        refreshTokenRepository.revokeAllActiveTokensByUserId(user.getId(), now);
        refreshTokenRepository.deleteInactiveTokensByUserId(user.getId(), now);
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

    private String normalizeResetCode(String rawCode) {
        return rawCode.trim().toUpperCase(Locale.ROOT);
    }

    private String hashResetCodeForUser(UUID userId, String normalizedCode) {
        return jwtService.hashRefreshToken(userId + ":" + normalizedCode);
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
