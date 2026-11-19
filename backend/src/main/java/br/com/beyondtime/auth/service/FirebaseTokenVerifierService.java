package br.com.beyondtime.auth.service;

import br.com.beyondtime.auth.domain.OAuthProvider;
import br.com.beyondtime.auth.dto.FirebaseTokenClaims;
import br.com.beyondtime.shared.exception.BusinessException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.RemoteJWKSet;
import com.nimbusds.jose.proc.JWSKeySelector;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URL;
import java.util.Date;
import java.util.Map;

@Service
public class FirebaseTokenVerifierService {

    private static final Logger log = LoggerFactory.getLogger(FirebaseTokenVerifierService.class);
    private static final String FIREBASE_JWK_URL =
            "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

    private final String firebaseProjectId;
    private final ConfigurableJWTProcessor<SecurityContext> jwtProcessor;

    @org.springframework.beans.factory.annotation.Autowired
    public FirebaseTokenVerifierService(
            @Value("${beyondtime.security.firebase.project-id:}") String firebaseProjectId) {
        this(firebaseProjectId, createDefaultJwtProcessor());
    }

    public FirebaseTokenVerifierService(
            String firebaseProjectId,
            ConfigurableJWTProcessor<SecurityContext> jwtProcessor) {
        this.firebaseProjectId = firebaseProjectId != null ? firebaseProjectId.trim() : "";
        this.jwtProcessor = jwtProcessor;
    }

    public FirebaseTokenClaims verify(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new BusinessException(
                    "INVALID_FIREBASE_TOKEN",
                    "Token de autenticação social ausente.",
                    HttpStatus.UNAUTHORIZED
            );
        }

        if (firebaseProjectId.isBlank()) {
            log.error("[FirebaseTokenVerifier] beyondtime.security.firebase.project-id não configurado no servidor.");
            throw new BusinessException(
                    "INVALID_FIREBASE_TOKEN",
                    "Não foi possível validar sua autenticação social. Tente novamente.",
                    HttpStatus.UNAUTHORIZED
            );
        }

        try {
            JWTClaimsSet claimsSet = jwtProcessor.process(idToken.trim(), null);

            Date now = new Date();
            Date expirationTime = claimsSet.getExpirationTime();
            if (expirationTime == null || expirationTime.before(now)) {
                log.warn("[FirebaseTokenVerifier] idToken expirado. exp={}, now={}", expirationTime, now);
                throw new BusinessException(
                        "INVALID_FIREBASE_TOKEN",
                        "Não foi possível validar sua autenticação social. Tente novamente.",
                        HttpStatus.UNAUTHORIZED
                );
            }

            String expectedIssuer = "https://securetoken.google.com/" + firebaseProjectId;
            if (!expectedIssuer.equals(claimsSet.getIssuer())) {
                log.warn("[FirebaseTokenVerifier] Emissor inválido: esperado {}, recebido {}", expectedIssuer, claimsSet.getIssuer());
                throw new BusinessException(
                        "INVALID_FIREBASE_TOKEN",
                        "Não foi possível validar sua autenticação social. Tente novamente.",
                        HttpStatus.UNAUTHORIZED
                );
            }

            if (claimsSet.getAudience() == null || !claimsSet.getAudience().contains(firebaseProjectId)) {
                log.warn("[FirebaseTokenVerifier] Audiência inválida para o projeto {}: {}", firebaseProjectId, claimsSet.getAudience());
                throw new BusinessException(
                        "INVALID_FIREBASE_TOKEN",
                        "Não foi possível validar sua autenticação social. Tente novamente.",
                        HttpStatus.UNAUTHORIZED
                );
            }

            String sub = claimsSet.getSubject();
            if (sub == null || sub.isBlank()) {
                log.warn("[FirebaseTokenVerifier] Subject (sub) ausente no idToken.");
                throw new BusinessException(
                        "INVALID_FIREBASE_TOKEN",
                        "Não foi possível validar sua autenticação social. Tente novamente.",
                        HttpStatus.UNAUTHORIZED
                );
            }

            Map<String, Object> firebaseClaim = claimsSet.getJSONObjectClaim("firebase");
            if (firebaseClaim == null) {
                log.warn("[FirebaseTokenVerifier] Claim 'firebase' ausente no token.");
                throw new BusinessException(
                        "INVALID_FIREBASE_TOKEN",
                        "Não foi possível validar sua autenticação social. Tente novamente.",
                        HttpStatus.UNAUTHORIZED
                );
            }

            String signInProvider = (String) firebaseClaim.get("sign_in_provider");
            OAuthProvider provider;
            if ("google.com".equalsIgnoreCase(signInProvider)) {
                provider = OAuthProvider.GOOGLE;
            } else if ("facebook.com".equalsIgnoreCase(signInProvider)) {
                provider = OAuthProvider.FACEBOOK;
            } else {
                log.warn("[FirebaseTokenVerifier] Provedor social não suportado: {}", signInProvider);
                throw new BusinessException(
                        "INVALID_FIREBASE_TOKEN",
                        "Não foi possível validar sua autenticação social. Tente novamente.",
                        HttpStatus.UNAUTHORIZED
                );
            }

            String email = claimsSet.getStringClaim("email");
            if (email == null || email.isBlank()) {
                log.warn("[FirebaseTokenVerifier] E-mail não encontrado no idToken do provedor {}", provider);
                throw new BusinessException(
                        "INVALID_FIREBASE_TOKEN",
                        "Não foi possível validar sua autenticação social. Tente novamente.",
                        HttpStatus.UNAUTHORIZED
                );
            }

            Boolean emailVerifiedClaim = claimsSet.getBooleanClaim("email_verified");
            boolean emailVerified = Boolean.TRUE.equals(emailVerifiedClaim);
            String name = claimsSet.getStringClaim("name");

            return new FirebaseTokenClaims(sub.trim(), email.trim(), emailVerified, name, provider);
        } catch (BusinessException be) {
            throw be;
        } catch (Exception ex) {
            log.warn("[FirebaseTokenVerifier] Erro ao validar assinatura do idToken do Firebase: {}", ex.getMessage());
            throw new BusinessException(
                    "INVALID_FIREBASE_TOKEN",
                    "Não foi possível validar sua autenticação social. Tente novamente.",
                    HttpStatus.UNAUTHORIZED
            );
        }
    }

    private static ConfigurableJWTProcessor<SecurityContext> createDefaultJwtProcessor() {
        try {
            URL jwkUrl = URI.create(FIREBASE_JWK_URL).toURL();
            JWKSource<SecurityContext> keySource = new RemoteJWKSet<>(jwkUrl);
            JWSKeySelector<SecurityContext> keySelector =
                    new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, keySource);
            ConfigurableJWTProcessor<SecurityContext> processor = new DefaultJWTProcessor<>();
            processor.setJWSKeySelector(keySelector);
            return processor;
        } catch (Exception ex) {
            log.error("[FirebaseTokenVerifier] Erro ao instanciar RemoteJWKSet do Firebase", ex);
            return new DefaultJWTProcessor<>();
        }
    }
}
