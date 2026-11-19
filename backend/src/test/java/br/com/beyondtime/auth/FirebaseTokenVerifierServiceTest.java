package br.com.beyondtime.auth;

import br.com.beyondtime.auth.domain.OAuthProvider;
import br.com.beyondtime.auth.dto.FirebaseTokenClaims;
import br.com.beyondtime.auth.service.FirebaseTokenVerifierService;
import br.com.beyondtime.shared.exception.BusinessException;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.Date;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FirebaseTokenVerifierServiceTest {

    private static final String PROJECT_ID = "beyindtime";

    @Mock
    private ConfigurableJWTProcessor<SecurityContext> jwtProcessor;

    private FirebaseTokenVerifierService verifierService;

    @BeforeEach
    void setUp() {
        verifierService = new FirebaseTokenVerifierService(PROJECT_ID, jwtProcessor);
    }

    @Test
    void shouldThrowWhenTokenIsBlankOrNull() {
        assertThatThrownBy(() -> verifierService.verify(null))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getCode()).isEqualTo("INVALID_FIREBASE_TOKEN");
                    assertThat(be.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                });

        assertThatThrownBy(() -> verifierService.verify("   "))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void shouldThrowWhenProjectIdNotConfigured() {
        FirebaseTokenVerifierService unconfigured = new FirebaseTokenVerifierService("", jwtProcessor);
        assertThatThrownBy(() -> unconfigured.verify("some-token"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getCode()).isEqualTo("INVALID_FIREBASE_TOKEN");
                });
    }

    @Test
    void shouldThrowWhenTokenIsExpired() throws Exception {
        JWTClaimsSet expiredClaims = new JWTClaimsSet.Builder()
                .subject("firebase-uid-123")
                .issuer("https://securetoken.google.com/" + PROJECT_ID)
                .audience(PROJECT_ID)
                .expirationTime(new Date(System.currentTimeMillis() - 10000))
                .claim("email", "expired@beyondtime.com.br")
                .claim("firebase", Map.of("sign_in_provider", "google.com"))
                .build();

        when(jwtProcessor.process(eq("expired-token"), any())).thenReturn(expiredClaims);

        assertThatThrownBy(() -> verifierService.verify("expired-token"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("INVALID_FIREBASE_TOKEN"));
    }

    @Test
    void shouldThrowWhenIssuerMismatch() throws Exception {
        JWTClaimsSet badIssuerClaims = new JWTClaimsSet.Builder()
                .subject("firebase-uid-123")
                .issuer("https://securetoken.google.com/wrong-project")
                .audience(PROJECT_ID)
                .expirationTime(new Date(System.currentTimeMillis() + 60000))
                .claim("email", "test@beyondtime.com.br")
                .claim("firebase", Map.of("sign_in_provider", "google.com"))
                .build();

        when(jwtProcessor.process(eq("bad-issuer-token"), any())).thenReturn(badIssuerClaims);

        assertThatThrownBy(() -> verifierService.verify("bad-issuer-token"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("INVALID_FIREBASE_TOKEN"));
    }

    @Test
    void shouldThrowWhenAudienceMismatch() throws Exception {
        JWTClaimsSet badAudienceClaims = new JWTClaimsSet.Builder()
                .subject("firebase-uid-123")
                .issuer("https://securetoken.google.com/" + PROJECT_ID)
                .audience("wrong-audience")
                .expirationTime(new Date(System.currentTimeMillis() + 60000))
                .claim("email", "test@beyondtime.com.br")
                .claim("firebase", Map.of("sign_in_provider", "google.com"))
                .build();

        when(jwtProcessor.process(eq("bad-aud-token"), any())).thenReturn(badAudienceClaims);

        assertThatThrownBy(() -> verifierService.verify("bad-aud-token"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("INVALID_FIREBASE_TOKEN"));
    }

    @Test
    void shouldThrowWhenProviderUnsupported() throws Exception {
        JWTClaimsSet unsupportedProviderClaims = new JWTClaimsSet.Builder()
                .subject("firebase-uid-123")
                .issuer("https://securetoken.google.com/" + PROJECT_ID)
                .audience(PROJECT_ID)
                .expirationTime(new Date(System.currentTimeMillis() + 60000))
                .claim("email", "test@beyondtime.com.br")
                .claim("firebase", Map.of("sign_in_provider", "twitter.com"))
                .build();

        when(jwtProcessor.process(eq("unsupported-token"), any())).thenReturn(unsupportedProviderClaims);

        assertThatThrownBy(() -> verifierService.verify("unsupported-token"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("INVALID_FIREBASE_TOKEN"));
    }

    @Test
    void shouldVerifyGoogleTokenSuccessfully() throws Exception {
        JWTClaimsSet googleClaims = new JWTClaimsSet.Builder()
                .subject("google-sub-789")
                .issuer("https://securetoken.google.com/" + PROJECT_ID)
                .audience(List.of(PROJECT_ID))
                .expirationTime(new Date(System.currentTimeMillis() + 60000))
                .claim("email", "maria.silva@beyondtime.com.br")
                .claim("email_verified", true)
                .claim("name", "Maria Silva")
                .claim("firebase", Map.of("sign_in_provider", "google.com"))
                .build();

        when(jwtProcessor.process(eq("valid-google-token"), any())).thenReturn(googleClaims);

        FirebaseTokenClaims claims = verifierService.verify("valid-google-token");

        assertThat(claims.uid()).isEqualTo("google-sub-789");
        assertThat(claims.email()).isEqualTo("maria.silva@beyondtime.com.br");
        assertThat(claims.name()).isEqualTo("Maria Silva");
        assertThat(claims.emailVerified()).isTrue();
        assertThat(claims.provider()).isEqualTo(OAuthProvider.GOOGLE);
    }

    @Test
    void shouldVerifyFacebookTokenSuccessfully() throws Exception {
        JWTClaimsSet facebookClaims = new JWTClaimsSet.Builder()
                .subject("fb-sub-456")
                .issuer("https://securetoken.google.com/" + PROJECT_ID)
                .audience(List.of(PROJECT_ID))
                .expirationTime(new Date(System.currentTimeMillis() + 60000))
                .claim("email", "carlos.fb@beyondtime.com.br")
                .claim("email_verified", true)
                .claim("name", "Carlos FB")
                .claim("firebase", Map.of("sign_in_provider", "facebook.com"))
                .build();

        when(jwtProcessor.process(eq("valid-fb-token"), any())).thenReturn(facebookClaims);

        FirebaseTokenClaims claims = verifierService.verify("valid-fb-token");

        assertThat(claims.uid()).isEqualTo("fb-sub-456");
        assertThat(claims.email()).isEqualTo("carlos.fb@beyondtime.com.br");
        assertThat(claims.provider()).isEqualTo(OAuthProvider.FACEBOOK);
    }
}
