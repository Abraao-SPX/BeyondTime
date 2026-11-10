package br.com.beyondtime.auth.service;

import br.com.beyondtime.auth.domain.OAuthProvider;
import br.com.beyondtime.auth.domain.RefreshToken;
import br.com.beyondtime.auth.domain.User;
import br.com.beyondtime.auth.domain.UserOAuthAccount;
import br.com.beyondtime.auth.dto.AuthResponse;
import br.com.beyondtime.auth.dto.GoogleLoginRequest;
import br.com.beyondtime.auth.dto.LoginRequest;
import br.com.beyondtime.auth.dto.LogoutRequest;
import br.com.beyondtime.auth.dto.RefreshTokenRequest;
import br.com.beyondtime.auth.dto.RegisterRequest;
import br.com.beyondtime.auth.repository.RefreshTokenRepository;
import br.com.beyondtime.auth.repository.UserOAuthAccountRepository;
import br.com.beyondtime.auth.repository.UserRepository;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.security.JwtService;
import br.com.beyondtime.shared.util.AgeValidator;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final UserOAuthAccountRepository oauthAccountRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            UserOAuthAccountRepository oauthAccountRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.userRepository = userRepository;
        this.oauthAccountRepository = oauthAccountRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // RF02 — Regra Crítica: Bloqueio automático de cadastro para idade < 50 anos
        AgeValidator.enforceMinimumAge50Plus(request.birthDate());

        String normalizedEmail = request.email().trim().toLowerCase();
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
        String normalizedEmail = request.email().trim().toLowerCase();
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new BusinessException(
                        "INVALID_CREDENTIALS",
                        "E-mail ou senha inválidos.",
                        HttpStatus.UNAUTHORIZED
                ));

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
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
        String normalizedEmail = request.email().trim().toLowerCase();

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

        // Rotação segura de Refresh Token (revoga o atual e emite um novo par)
        storedToken.revoke();
        refreshTokenRepository.save(storedToken);

        return issueTokensForUser(user);
    }

    @Transactional
    public void logout(UUID authenticatedUserId, LogoutRequest request) {
        if (request != null && request.refreshToken() != null && !request.refreshToken().isBlank()) {
            String tokenHash = jwtService.hashRefreshToken(request.refreshToken().trim());
            refreshTokenRepository.findByTokenHash(tokenHash)
                    .filter(rt -> rt.getUser().getId().equals(authenticatedUserId))
                    .ifPresent(rt -> {
                        rt.revoke();
                        refreshTokenRepository.save(rt);
                    });
        } else {
            refreshTokenRepository.revokeAllActiveTokensByUserId(authenticatedUserId, OffsetDateTime.now());
        }
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

        return AuthResponse.of(user, accessToken, rawRefreshToken, jwtService.getAccessTokenExpirationSeconds());
    }
}
